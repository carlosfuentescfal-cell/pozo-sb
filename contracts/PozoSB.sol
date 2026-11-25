// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title Pozo SB
/// @notice Ahorro rotativo (pandero) para comerciantes de San Bernardo, con una
///         reserva solidaria que compensa a quienes se ven afectados por una inundación.
/// @dev Prototipo para el hackathon de Avalanche Fuji (IN3863). No auditado: no usar con dinero real.
///      Los miembros deben ser cuentas normales (wallets), no contratos.
///
/// Reglas (quedan fijas al desplegar el contrato; nadie puede cambiarlas después):
///  - Hay `maxMiembros` participantes. El orden de cobro es el orden en que se unieron.
///  - Al unirse se pagan 2 cuotas: una es la garantía y la otra es la cuota de la ronda 1.
///  - En cada ronda todos pagan una cuota. Una parte (`reservaBps`) de cada cuota va a la reserva
///    solidaria y el resto forma el pozo que cobra el beneficiario de la ronda.
///  - Si alguien no paga a tiempo, su garantía cubre la cuota que falta (una sola vez).
///  - Al terminar, cada participante recupera lo que le quede de garantía y una parte
///    igual de lo que no se usó de la reserva.
///  - El administrador solo puede declarar inundaciones por sector. No participa en el pozo
///    y no puede mover dinero.
contract PozoSB {
    // ───────────────────────── Tipos y estado ─────────────────────────

    enum Estado {
        Abierto, // esperando que se unan los miembros
        Activo, // rondas en curso
        Finalizado // todas las rondas cobradas
    }

    struct Inundacion {
        bytes32 sectorHash;
        string sector;
        uint64 fecha;
    }

    uint256 private constant BPS = 10_000;

    address public immutable admin;
    uint256 public immutable cuota; // en wei
    uint256 public immutable maxMiembros;
    uint256 public immutable duracionRonda; // en segundos
    uint256 public immutable reservaBps; // % de cada cuota que va a la reserva (10_000 = 100%)
    uint256 public immutable compensacion; // pago fijo por inundación, en wei

    Estado public estado;
    uint256 public rondaActual; // parte en 0
    uint256 public inicioRondaActual;
    uint256 public reserva; // saldo disponible de la reserva solidaria
    uint256 public reservaAlCierre; // reserva al terminar, para repartir

    address[] private _miembros;
    mapping(address => bool) public esMiembro;
    mapping(address => string) public sectorDe;
    mapping(address => bytes32) private _sectorHash;
    mapping(address => uint256) public garantia;
    mapping(address => bool) public recuperoGarantia;

    mapping(uint256 => mapping(address => bool)) public pagoRonda;
    mapping(uint256 => uint256) public pagosRonda;

    Inundacion[] private _inundaciones;
    mapping(uint256 => mapping(address => bool)) public reclamoCompensacion;

    uint256 private _lock = 1;

    // ───────────────────────────── Eventos ─────────────────────────────

    event MiembroSeUnio(address indexed miembro, string sector, uint256 posicion);
    event RondaIniciada(uint256 indexed ronda, uint256 inicio);
    event CuotaPagada(uint256 indexed ronda, address indexed miembro);
    event GarantiaUsada(uint256 indexed ronda, address indexed miembro, uint256 monto);
    event TurnoCobrado(uint256 indexed ronda, address indexed beneficiario, uint256 monto, uint256 aporteReserva);
    event InundacionDeclarada(uint256 indexed id, string sector);
    event CompensacionPagada(uint256 indexed id, address indexed miembro, uint256 monto);
    event GarantiaRecuperada(address indexed miembro, uint256 monto);
    event PozoFinalizado(uint256 reservaRestante);

    // ───────────────────────────── Errores ─────────────────────────────

    error SoloAdmin();
    error EstadoIncorrecto();
    error YaEsMiembro();
    error NoEsMiembro();
    error AdminNoPuedeSerMiembro();
    error MontoIncorrecto();
    error SectorInvalido();
    error YaPago();
    error RondaCerrada();
    error TodaviaNoSePuedeCobrar();
    error InundacionInexistente();
    error SectorNoAfectado();
    error YaReclamo();
    error ReservaVacia();
    error NadaQueRecuperar();
    error FalloEnvio();
    error Reentrada();
    error ParametrosInvalidos();

    // ─────────────────────────── Modificadores ───────────────────────────

    modifier soloAdmin() {
        if (msg.sender != admin) revert SoloAdmin();
        _;
    }

    modifier noReentrante() {
        if (_lock != 1) revert Reentrada();
        _lock = 2;
        _;
        _lock = 1;
    }

    // ──────────────────────────── Constructor ────────────────────────────

    constructor(
        address _admin,
        uint256 _cuota,
        uint256 _maxMiembros,
        uint256 _duracionRonda,
        uint256 _reservaBps,
        uint256 _compensacion
    ) {
        if (_admin == address(0) || _cuota == 0 || _maxMiembros < 2 || _duracionRonda == 0 || _reservaBps >= BPS) {
            revert ParametrosInvalidos();
        }
        admin = _admin;
        cuota = _cuota;
        maxMiembros = _maxMiembros;
        duracionRonda = _duracionRonda;
        reservaBps = _reservaBps;
        compensacion = _compensacion;
    }

    // ───────────────────────── Funciones principales ─────────────────────────

    /// @notice Unirse al pozo. Se deben enviar exactamente 2 cuotas (garantía + cuota de la ronda 1).
    /// @param sector Sector del comerciante (ej: "Av. Colón"). Es el que se usa para las inundaciones.
    function unirse(string calldata sector) external payable {
        if (estado != Estado.Abierto) revert EstadoIncorrecto();
        if (esMiembro[msg.sender]) revert YaEsMiembro();
        if (msg.sender == admin) revert AdminNoPuedeSerMiembro();
        if (msg.value != 2 * cuota) revert MontoIncorrecto();
        uint256 largo = bytes(sector).length;
        if (largo == 0 || largo > 64) revert SectorInvalido();

        uint256 posicion = _miembros.length;
        _miembros.push(msg.sender);
        esMiembro[msg.sender] = true;
        sectorDe[msg.sender] = sector;
        _sectorHash[msg.sender] = keccak256(bytes(sector));
        garantia[msg.sender] = cuota;

        // La segunda cuota enviada es el pago de la ronda 1.
        pagoRonda[0][msg.sender] = true;
        pagosRonda[0] += 1;

        emit MiembroSeUnio(msg.sender, sector, posicion);
        emit CuotaPagada(0, msg.sender);

        if (_miembros.length == maxMiembros) {
            estado = Estado.Activo;
            inicioRondaActual = block.timestamp;
            emit RondaIniciada(0, block.timestamp);
        }
    }

    /// @notice Pagar la cuota de la ronda actual. Hay que enviar exactamente una cuota.
    function pagarCuota() external payable {
        if (estado != Estado.Activo) revert EstadoIncorrecto();
        if (!esMiembro[msg.sender]) revert NoEsMiembro();
        if (msg.value != cuota) revert MontoIncorrecto();
        uint256 r = rondaActual;
        if (pagoRonda[r][msg.sender]) revert YaPago();
        if (block.timestamp > inicioRondaActual + duracionRonda) revert RondaCerrada();

        pagoRonda[r][msg.sender] = true;
        pagosRonda[r] += 1;
        emit CuotaPagada(r, msg.sender);
    }

    /// @notice Entrega el pozo de la ronda al beneficiario. Puede llamarla cualquiera, pero solo
    ///         cuando todos pagaron o cuando venció el plazo de la ronda.
    function cobrarTurno() external noReentrante {
        if (estado != Estado.Activo) revert EstadoIncorrecto();
        uint256 r = rondaActual;
        bool todosPagaron = pagosRonda[r] == maxMiembros;
        if (!todosPagaron && block.timestamp <= inicioRondaActual + duracionRonda) {
            revert TodaviaNoSePuedeCobrar();
        }

        address beneficiario = _miembros[r];
        uint256 cuotasValidas = pagosRonda[r];

        // Quien no pagó queda cubierto por su garantía (una sola vez).
        if (!todosPagaron) {
            for (uint256 i = 0; i < _miembros.length; i++) {
                address m = _miembros[i];
                if (!pagoRonda[r][m] && garantia[m] >= cuota) {
                    garantia[m] -= cuota;
                    cuotasValidas += 1;
                    emit GarantiaUsada(r, m, cuota);
                }
            }
        }

        uint256 reservaPorCuota = (cuota * reservaBps) / BPS;
        uint256 aporte = cuotasValidas * reservaPorCuota;
        uint256 pozo = cuotasValidas * (cuota - reservaPorCuota);
        reserva += aporte;

        // Efectos antes de enviar dinero.
        rondaActual = r + 1;
        if (rondaActual == maxMiembros) {
            estado = Estado.Finalizado;
            reservaAlCierre = reserva;
            emit PozoFinalizado(reserva);
        } else {
            inicioRondaActual = block.timestamp;
            emit RondaIniciada(rondaActual, block.timestamp);
        }
        emit TurnoCobrado(r, beneficiario, pozo, aporte);

        _enviar(beneficiario, pozo);
    }

    /// @notice El administrador declara una inundación en un sector (texto igual al que usaron al unirse).
    function declararInundacion(string calldata sector) external soloAdmin {
        if (estado != Estado.Activo) revert EstadoIncorrecto();
        uint256 largo = bytes(sector).length;
        if (largo == 0 || largo > 64) revert SectorInvalido();

        _inundaciones.push(Inundacion({sectorHash: keccak256(bytes(sector)), sector: sector, fecha: uint64(block.timestamp)}));
        emit InundacionDeclarada(_inundaciones.length - 1, sector);
    }

    /// @notice Un miembro del sector afectado reclama su compensación (una vez por inundación).
    ///         Se paga el monto fijo, o lo que quede en la reserva si es menos.
    function reclamarCompensacion(uint256 id) external noReentrante {
        if (estado != Estado.Activo) revert EstadoIncorrecto();
        if (!esMiembro[msg.sender]) revert NoEsMiembro();
        if (id >= _inundaciones.length) revert InundacionInexistente();
        if (_sectorHash[msg.sender] != _inundaciones[id].sectorHash) revert SectorNoAfectado();
        if (reclamoCompensacion[id][msg.sender]) revert YaReclamo();
        if (reserva == 0) revert ReservaVacia();

        uint256 monto = compensacion < reserva ? compensacion : reserva;
        reclamoCompensacion[id][msg.sender] = true;
        reserva -= monto;
        emit CompensacionPagada(id, msg.sender, monto);

        _enviar(msg.sender, monto);
    }

    /// @notice Al terminar el pozo, cada miembro recupera su garantía restante y una parte
    ///         igual de la reserva que no se usó.
    function recuperarGarantia() external noReentrante {
        if (estado != Estado.Finalizado) revert EstadoIncorrecto();
        if (!esMiembro[msg.sender]) revert NoEsMiembro();
        if (recuperoGarantia[msg.sender]) revert YaPago();

        uint256 monto = garantia[msg.sender] + reservaAlCierre / maxMiembros;
        if (monto == 0) revert NadaQueRecuperar();

        recuperoGarantia[msg.sender] = true;
        garantia[msg.sender] = 0;
        emit GarantiaRecuperada(msg.sender, monto);

        _enviar(msg.sender, monto);
    }

    // ─────────────────────────── Funciones de lectura ───────────────────────────

    function miembros() external view returns (address[] memory) {
        return _miembros;
    }

    function cantidadMiembros() external view returns (uint256) {
        return _miembros.length;
    }

    /// @notice Quién cobra en la ronda actual (address(0) si el pozo aún no parte o ya terminó).
    function beneficiarioActual() external view returns (address) {
        if (estado != Estado.Activo) return address(0);
        return _miembros[rondaActual];
    }

    function cantidadInundaciones() external view returns (uint256) {
        return _inundaciones.length;
    }

    function inundacion(uint256 id) external view returns (string memory sector, uint64 fecha) {
        if (id >= _inundaciones.length) revert InundacionInexistente();
        Inundacion storage i = _inundaciones[id];
        return (i.sector, i.fecha);
    }

    /// @notice Datos básicos para mostrar en la web.
    function resumen()
        external
        view
        returns (
            Estado _estado,
            uint256 _rondaActual,
            uint256 _inicioRondaActual,
            uint256 _miembrosActuales,
            uint256 _reserva,
            uint256 _saldoContrato
        )
    {
        return (estado, rondaActual, inicioRondaActual, _miembros.length, reserva, address(this).balance);
    }

    // ───────────────────────────── Internas ─────────────────────────────

    function _enviar(address a, uint256 monto) private {
        if (monto == 0) return;
        (bool ok, ) = a.call{value: monto}("");
        if (!ok) revert FalloEnvio();
    }
}
