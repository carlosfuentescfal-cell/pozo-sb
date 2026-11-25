import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

// Parámetros de la demo (ver PARAMETROS_DESPLIEGUE.md).
// La cuenta Administrador es la que declara inundaciones y NO participa en el pozo.
export default buildModule("PozoSBModule", (m) => {
  const admin = m.getParameter("admin", "0x28c2E6371aC3d9270Cc6f2C497d9e3Aaeec46395");
  const cuota = m.getParameter("cuota", 10n ** 16n); // 0,01 AVAX en wei
  const maxMiembros = m.getParameter("maxMiembros", 3n);
  const duracionRonda = m.getParameter("duracionRonda", 120n); // segundos (solo para la demo)
  const reservaBps = m.getParameter("reservaBps", 1000n); // 10% de cada cuota
  const compensacion = m.getParameter("compensacion", 2n * 10n ** 15n); // 0,002 AVAX en wei

  const pozo = m.contract("PozoSB", [admin, cuota, maxMiembros, duracionRonda, reservaBps, compensacion]);

  return { pozo };
});
