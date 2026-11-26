import {
  BaseError,
  ContractFunctionRevertedError,
  createPublicClient,
  createWalletClient,
  custom,
  formatEther,
  getAddress,
  http,
  type Address,
} from "viem";
import { avalancheFuji } from "viem/chains";
import { pozoAbi } from "./abi";
import { CONTRACT_ADDRESS, EXPLORADOR, SECTORES } from "./config";
import "./style.css";

// ───────────────────────── Tipos y estado ─────────────────────────

declare global {
  interface Window {
    ethereum?: any;
  }
}

type Miembro = { direccion: Address; sector: string; garantia: bigint; pagoRondaActual: boolean };
type Inundacion = { id: number; sector: string; fecha: number; yaReclamo: boolean };

type Datos = {
  estado: number;
  rondaActual: number;
  inicioRonda: number;
  reserva: bigint;
  saldo: bigint;
  admin: Address;
  cuota: bigint;
  maxMiembros: number;
  duracionRonda: number;
  reservaBps: bigint;
  compensacion: bigint;
  miembros: Miembro[];
  beneficiario: Address | null;
  inundaciones: Inundacion[];
  // Datos de la cuenta conectada
  esMiembro: boolean;
  sectorPropio: string;
  recuperoGarantia: boolean;
};

type Mensaje = { tipo: "ok" | "error" | "info"; html: string };

const ESTADOS = ["Abierto (esperando integrantes)", "Activo", "Finalizado"];

let cuenta: Address | null = null;
let datos: Datos | null = null;
let mensaje: Mensaje | null = null;
let ocupado = false;
let errorCarga: string | null = null;

const publicClient = createPublicClient({ chain: avalancheFuji, transport: http() });
const walletClient = window.ethereum
  ? createWalletClient({ chain: avalancheFuji, transport: custom(window.ethereum) })
  : null;

// ───────────────────────── Utilidades ─────────────────────────

function esc(texto: string): string {
  return texto
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function corta(dir: string): string {
  return dir.slice(0, 6) + "…" + dir.slice(-4);
}

function avax(valor: bigint): string {
  const n = Number(formatEther(valor));
  return n.toLocaleString("es-CL", { maximumFractionDigits: 6 }) + " AVAX";
}

function igual(a?: string | null, b?: string | null): boolean {
  return !!a && !!b && a.toLowerCase() === b.toLowerCase();
}

function ahora(): number {
  return Math.floor(Date.now() / 1000);
}

function setMensaje(tipo: Mensaje["tipo"], html: string) {
  mensaje = { tipo, html };
}

const ERRORES: Record<string, string> = {
  SoloAdmin: "Solo la cuenta Administrador puede hacer esto.",
  EstadoIncorrecto: "El pozo no está en el estado correcto para esta acción.",
  YaEsMiembro: "Esta cuenta ya forma parte del pozo.",
  NoEsMiembro: "Esta cuenta no forma parte del pozo.",
  AdminNoPuedeSerMiembro: "La cuenta Administrador no puede unirse al pozo. Usa una cuenta de comerciante.",
  MontoIncorrecto: "El monto enviado no es el correcto.",
  SectorInvalido: "El sector no es válido.",
  YaPago: "Ya hiciste esta acción.",
  RondaCerrada: "El plazo de esta ronda ya venció. La cuota faltante se cubre con la garantía.",
  TodaviaNoSePuedeCobrar: "Todavía no se puede cobrar: faltan pagos y el plazo de la ronda no ha vencido.",
  InundacionInexistente: "Esa inundación no existe.",
  SectorNoAfectado: "Tu sector no fue afectado por esa inundación.",
  YaReclamo: "Ya reclamaste la compensación de esa inundación.",
  ReservaVacia: "La reserva solidaria está vacía.",
  NadaQueRecuperar: "No tienes nada que recuperar.",
  FalloEnvio: "Falló el envío de fondos.",
  Reentrada: "Operación repetida, intenta de nuevo.",
  ParametrosInvalidos: "Parámetros inválidos.",
};

function textoError(e: unknown): string {
  if (e instanceof BaseError) {
    const rev = e.walk((x) => x instanceof ContractFunctionRevertedError);
    if (rev instanceof ContractFunctionRevertedError) {
      const nombre = rev.data?.errorName;
      if (nombre && ERRORES[nombre]) return ERRORES[nombre];
      if (nombre) return "El contrato rechazó la operación: " + nombre;
    }
    const msg = e.shortMessage || e.message;
    if (/user rejected|denied|rechaz/i.test(msg)) return "Cancelaste la operación en MetaMask.";
    if (/insufficient funds/i.test(msg)) return "No tienes suficiente AVAX de prueba en esta cuenta.";
    return msg;
  }
  return e instanceof Error ? e.message : String(e);
}

// ───────────────────────── Lectura del contrato ─────────────────────────

async function leerDatos(): Promise<Datos> {
  const base = { address: CONTRACT_ADDRESS, abi: pozoAbi } as const;
  const leer = (functionName: string, args: unknown[] = []): Promise<any> =>
    publicClient.readContract({ ...base, functionName, args } as any);

  const [resumen, admin, cuota, maxMiembros, duracionRonda, reservaBps, compensacion, direcciones, beneficiario, nInund] =
    await Promise.all([
      leer("resumen"),
      leer("admin"),
      leer("cuota"),
      leer("maxMiembros"),
      leer("duracionRonda"),
      leer("reservaBps"),
      leer("compensacion"),
      leer("miembros"),
      leer("beneficiarioActual"),
      leer("cantidadInundaciones"),
    ]);

  const estado = Number(resumen[0]);
  const rondaActual = Number(resumen[1]);
  const rondaConsulta = estado === 2 ? Math.max(rondaActual - 1, 0) : rondaActual;

  const miembros: Miembro[] = await Promise.all(
    (direcciones as Address[]).map(async (direccion) => {
      const [sector, garantia, pago] = await Promise.all([
        leer("sectorDe", [direccion]),
        leer("garantia", [direccion]),
        leer("pagoRonda", [BigInt(rondaConsulta), direccion]),
      ]);
      return { direccion, sector, garantia, pagoRondaActual: pago } as Miembro;
    }),
  );

  const inundaciones: Inundacion[] = await Promise.all(
    Array.from({ length: Number(nInund) }, async (_, id) => {
      const [sector, fecha] = await leer("inundacion", [BigInt(id)]);
      const yaReclamo = cuenta ? await leer("reclamoCompensacion", [BigInt(id), cuenta]) : false;
      return { id, sector, fecha: Number(fecha), yaReclamo } as Inundacion;
    }),
  );

  let esMiembro = false;
  let sectorPropio = "";
  let recuperoGarantia = false;
  if (cuenta) {
    esMiembro = await leer("esMiembro", [cuenta]);
    if (esMiembro) {
      sectorPropio = await leer("sectorDe", [cuenta]);
      recuperoGarantia = await leer("recuperoGarantia", [cuenta]);
    }
  }

  return {
    estado,
    rondaActual,
    inicioRonda: Number(resumen[2]),
    reserva: resumen[4],
    saldo: resumen[5],
    admin,
    cuota,
    maxMiembros: Number(maxMiembros),
    duracionRonda: Number(duracionRonda),
    reservaBps,
    compensacion,
    miembros,
    beneficiario: beneficiario === "0x0000000000000000000000000000000000000000" ? null : beneficiario,
    inundaciones,
    esMiembro,
    sectorPropio,
    recuperoGarantia,
  };
}

async function recargar() {
  try {
    datos = await leerDatos();
    errorCarga = null;
  } catch (e) {
    errorCarga = "No se pudo leer el contrato. Revisa tu conexión y la dirección configurada. " + textoError(e);
  }
  render();
}

// ───────────────────────── Wallet y transacciones ─────────────────────────

async function asegurarRed() {
  if (!walletClient) return;
  const id = await walletClient.getChainId();
  if (id === avalancheFuji.id) return;
  try {
    await walletClient.switchChain({ id: avalancheFuji.id });
  } catch {
    await walletClient.addChain({ chain: avalancheFuji });
    await walletClient.switchChain({ id: avalancheFuji.id });
  }
}

async function conectar() {
  if (!walletClient) {
    setMensaje("error", "No se encontró MetaMask en este navegador. Instala la extensión y recarga la página.");
    render();
    return;
  }
  try {
    const [direccion] = await walletClient.requestAddresses();
    cuenta = getAddress(direccion);
    await asegurarRed();
    setMensaje("ok", "Cuenta conectada: " + corta(cuenta));
    await recargar();
  } catch (e) {
    setMensaje("error", esc(textoError(e)));
    render();
  }
}

async function enviar(functionName: string, args: unknown[] = [], value?: bigint, etiqueta?: string) {
  if (!cuenta || !walletClient || ocupado) return;
  ocupado = true;
  setMensaje("info", "Confirma la operación en MetaMask…");
  render();
  try {
    await asegurarRed();
    const { request } = await publicClient.simulateContract({
      address: CONTRACT_ADDRESS,
      abi: pozoAbi,
      functionName,
      args,
      value,
      account: cuenta,
    } as any);
    const hash = await walletClient.writeContract(request as any);
    const enlace = `<a href="${EXPLORADOR}/tx/${hash}" target="_blank" rel="noopener">Ver en Snowtrace</a>`;
    setMensaje("info", `Transacción enviada. Esperando confirmación… ${enlace}`);
    render();
    const recibo = await publicClient.waitForTransactionReceipt({ hash });
    if (recibo.status === "success") {
      setMensaje("ok", `${esc(etiqueta ?? "Listo")}: confirmado. ${enlace}`);
    } else {
      setMensaje("error", `La transacción falló. ${enlace}`);
    }
  } catch (e) {
    setMensaje("error", esc(textoError(e)));
  } finally {
    ocupado = false;
    await recargar();
  }
}

// ───────────────────────── Interfaz ─────────────────────────

function plazoRestante(d: Datos): string {
  if (d.estado !== 1) return "—";
  const restante = d.inicioRonda + d.duracionRonda - ahora();
  if (restante <= 0) return "Vencido";
  const m = Math.floor(restante / 60);
  const s = restante % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function opcionesSector(): string {
  return SECTORES.map((s) => `<option value="${esc(s)}">${esc(s)}</option>`).join("");
}

function panelAcciones(d: Datos): string {
  if (!cuenta) {
    return `<p class="muted">Conecta tu MetaMask para participar.</p>`;
  }
  const plazoVencido = d.estado === 1 && ahora() > d.inicioRonda + d.duracionRonda;
  const pagaron = d.miembros.filter((m) => m.pagoRondaActual).length;
  const todosPagaron = d.miembros.length > 0 && pagaron === d.maxMiembros;
  const yo = d.miembros.find((m) => igual(m.direccion, cuenta));
  const off = ocupado ? "disabled" : "";
  const partes: string[] = [];

  if (igual(cuenta, d.admin)) {
    partes.push(`<p><span class="tag">Administrador</span> Puedes declarar inundaciones. No participas en el pozo ni puedes mover dinero.</p>`);
    if (d.estado === 1) {
      partes.push(`
        <div class="row">
          <select id="sector-inundacion">${opcionesSector()}</select>
          <button data-accion="declarar" ${off}>Declarar inundación en este sector</button>
        </div>`);
    } else {
      partes.push(`<p class="hint">Solo se pueden declarar inundaciones mientras el pozo está activo.</p>`);
    }
  } else if (d.estado === 0 && !d.esMiembro) {
    partes.push(`
      <p>Para unirte envías <strong>${avax(2n * d.cuota)}</strong>: una cuota de garantía (se te devuelve al final) y la cuota de la primera ronda.</p>
      <div class="row">
        <select id="sector-union">${opcionesSector()}</select>
        <button data-accion="unirse" ${off}>Unirme al pozo</button>
      </div>`);
  } else if (d.esMiembro) {
    partes.push(`<p><span class="tag ok">Integrante</span> Sector: <strong>${esc(d.sectorPropio)}</strong></p>`);

    if (d.estado === 0) {
      partes.push(`<p class="hint">Ya estás dentro. El pozo parte cuando se unan los ${d.maxMiembros} integrantes (faltan ${d.maxMiembros - d.miembros.length}).</p>`);
    }
    if (d.estado === 1) {
      const yaPague = yo?.pagoRondaActual ?? false;
      partes.push(`
        <div class="row">
          <button data-accion="pagar" ${off || yaPague || plazoVencido ? "disabled" : ""}>
            ${yaPague ? "Ya pagaste esta ronda" : `Pagar cuota (${avax(d.cuota)})`}
          </button>
          <button class="sec" data-accion="cobrar" ${off || !(todosPagaron || plazoVencido) ? "disabled" : ""}>Cobrar turno de la ronda</button>
        </div>
        <p class="hint">El pozo se puede cobrar cuando todos pagaron o cuando venció el plazo (en ese caso, la garantía de quien no pagó cubre su cuota). Lo recibe quien tiene el turno.</p>`);

      const reclamables = d.inundaciones.filter((f) => f.sector === d.sectorPropio && !f.yaReclamo);
      if (reclamables.length > 0) {
        partes.push(
          `<div class="row">` +
            reclamables
              .map(
                (f) =>
                  `<button data-accion="reclamar" data-id="${f.id}" ${off}>Reclamar compensación (inundación #${f.id + 1} en ${esc(f.sector)})</button>`,
              )
              .join("") +
            `</div>`,
        );
      }
    }
    if (d.estado === 2) {
      partes.push(`
        <div class="row">
          <button data-accion="recuperar" ${off || d.recuperoGarantia ? "disabled" : ""}>
            ${d.recuperoGarantia ? "Ya recuperaste tu garantía" : "Recuperar garantía y parte de la reserva"}
          </button>
        </div>`);
    }
  } else {
    partes.push(`<p class="muted">Esta cuenta no participa en este pozo (${ESTADOS[d.estado].toLowerCase()}).</p>`);
  }
  return partes.join("");
}

function render() {
  const app = document.getElementById("app")!;
  const d = datos;

  const cabecera = `
    <header>
      <div>
        <h1>💰 Pozo SB</h1>
      </div>
      <div class="row" style="margin:0">
        ${
          cuenta
            ? `<span class="tag ok mono">${corta(cuenta)}</span>`
            : `<button data-accion="conectar">Conectar MetaMask</button>`
        }
      </div>
    </header>
    <p class="sub">Ahorro rotativo (pandero) para comerciantes de San Bernardo, sin administrador y con una reserva solidaria que compensa a quienes sufren una inundación. Prototipo en la red de pruebas Avalanche Fuji: usa AVAX de prueba, sin valor real.</p>
    ${mensaje ? `<div class="msg ${mensaje.tipo}">${mensaje.html}</div>` : ""}
    ${errorCarga ? `<div class="msg error">${esc(errorCarga)}</div>` : ""}`;

  if (!d) {
    app.innerHTML = `<div class="wrap">${cabecera}<div class="card">Cargando datos del contrato…</div></div>`;
    return;
  }

  const rondaTexto = d.estado === 0 ? "—" : d.estado === 2 ? `${d.maxMiembros} de ${d.maxMiembros}` : `${d.rondaActual + 1} de ${d.maxMiembros}`;
  const beneficiario = d.beneficiario
    ? `${corta(d.beneficiario)}${igual(d.beneficiario, cuenta) ? " (tú)" : ""}`
    : "—";
  const reservaPct = Number(d.reservaBps) / 100;

  const stats = `
    <div class="grid">
      <div class="stat"><div class="k">Estado</div><div class="v">${ESTADOS[d.estado]}</div><div class="s">${d.miembros.length} de ${d.maxMiembros} integrantes</div></div>
      <div class="stat"><div class="k">Ronda</div><div class="v">${rondaTexto}</div><div class="s">Cobra ahora: ${beneficiario}</div></div>
      <div class="stat"><div class="k">Plazo de la ronda</div><div class="v" id="plazo">${plazoRestante(d)}</div><div class="s">Dura ${Math.round(d.duracionRonda / 60)} min (demo)</div></div>
      <div class="stat"><div class="k">Cuota</div><div class="v">${avax(d.cuota)}</div><div class="s">${reservaPct}% va a la reserva</div></div>
      <div class="stat"><div class="k">Reserva solidaria</div><div class="v">${avax(d.reserva)}</div><div class="s">Compensación: ${avax(d.compensacion)}</div></div>
      <div class="stat"><div class="k">Fondos en el contrato</div><div class="v">${avax(d.saldo)}</div><div class="s">Garantías + reserva + pagos</div></div>
    </div>`;

  const filas = d.miembros.length
    ? d.miembros
        .map(
          (m, i) => `
        <tr>
          <td>${i + 1}</td>
          <td class="mono">${corta(m.direccion)}${igual(m.direccion, cuenta) ? " (tú)" : ""}</td>
          <td>${esc(m.sector)}</td>
          <td>${d.estado === 0 ? '<span class="tag ok">Pagó al unirse</span>' : m.pagoRondaActual ? '<span class="tag ok">Pagó</span>' : '<span class="tag no">Falta</span>'}</td>
          <td>${avax(m.garantia)}</td>
        </tr>`,
        )
        .join("")
    : `<tr><td colspan="5" class="muted">Todavía no se une nadie.</td></tr>`;

  const tabla = `
    <div class="card">
      <h2>Integrantes (el orden es el orden de cobro)</h2>
      <div class="table-scroll">
        <table>
          <thead><tr><th>Turno</th><th>Cuenta</th><th>Sector</th><th>Ronda actual</th><th>Garantía</th></tr></thead>
          <tbody>${filas}</tbody>
        </table>
      </div>
    </div>`;

  const inundaciones = `
    <div class="card">
      <h2>Inundaciones declaradas</h2>
      ${
        d.inundaciones.length
          ? `<ul>${d.inundaciones
              .map((f) => `<li>#${f.id + 1} · ${esc(f.sector)} · ${new Date(f.fecha * 1000).toLocaleString("es-CL")}</li>`)
              .join("")}</ul>`
          : `<p class="muted">Ninguna por ahora. Cuando el Administrador declara una, los integrantes de ese sector reclaman su compensación desde la reserva.</p>`
      }
    </div>`;

  app.innerHTML = `
    <div class="wrap">
      ${cabecera}
      ${stats}
      <div class="card"><h2>Tu cuenta</h2>${panelAcciones(d)}</div>
      ${tabla}
      ${inundaciones}
      <footer>
        Contrato: <a class="mono" href="${EXPLORADOR}/address/${CONTRACT_ADDRESS}" target="_blank" rel="noopener">${CONTRACT_ADDRESS}</a>
        · Red: Avalanche Fuji (Chain ID 43113) · Prototipo sin auditar.
      </footer>
    </div>`;
}

// ───────────────────────── Eventos ─────────────────────────

document.addEventListener("click", (ev) => {
  const el = (ev.target as HTMLElement).closest("[data-accion]") as HTMLElement | null;
  if (!el || !datos && el.dataset.accion !== "conectar") return;
  const d = datos!;
  switch (el.dataset.accion) {
    case "conectar":
      void conectar();
      break;
    case "unirse": {
      const sector = (document.getElementById("sector-union") as HTMLSelectElement).value;
      void enviar("unirse", [sector], 2n * d.cuota, "Te uniste al pozo");
      break;
    }
    case "pagar":
      void enviar("pagarCuota", [], d.cuota, "Cuota pagada");
      break;
    case "cobrar":
      void enviar("cobrarTurno", [], undefined, "Turno cobrado");
      break;
    case "declarar": {
      const sector = (document.getElementById("sector-inundacion") as HTMLSelectElement).value;
      void enviar("declararInundacion", [sector], undefined, "Inundación declarada");
      break;
    }
    case "reclamar":
      void enviar("reclamarCompensacion", [BigInt(el.dataset.id ?? "0")], undefined, "Compensación recibida");
      break;
    case "recuperar":
      void enviar("recuperarGarantia", [], undefined, "Garantía recuperada");
      break;
  }
});

if (window.ethereum?.on) {
  window.ethereum.on("accountsChanged", (cuentas: string[]) => {
    cuenta = cuentas.length ? getAddress(cuentas[0]) : null;
    void recargar();
  });
  window.ethereum.on("chainChanged", () => void recargar());
}

// Cuenta regresiva y actualización automática
setInterval(() => {
  const el = document.getElementById("plazo");
  if (el && datos) el.textContent = plazoRestante(datos);
}, 1000);
setInterval(() => {
  if (!ocupado) void recargar();
}, 10000);

// Reconectar sin pedir permiso si MetaMask ya autorizó este sitio
async function iniciar() {
  render();
  if (walletClient) {
    try {
      const cuentas = await walletClient.getAddresses();
      if (cuentas.length) cuenta = getAddress(cuentas[0]);
    } catch {
      /* sin cuenta conectada */
    }
  }
  await recargar();
}
void iniciar();
