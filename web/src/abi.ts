// ABI del contrato PozoSB (generado al compilar). Si cambias el contrato, hay que regenerarlo.
export const pozoAbi = [
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "_admin",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "_cuota",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "_maxMiembros",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "_duracionRonda",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "_reservaBps",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "_compensacion",
        "type": "uint256"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "constructor"
  },
  {
    "inputs": [],
    "name": "AdminNoPuedeSerMiembro",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "EstadoIncorrecto",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "FalloEnvio",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "InundacionInexistente",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "MontoIncorrecto",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "NadaQueRecuperar",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "NoEsMiembro",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "ParametrosInvalidos",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "Reentrada",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "ReservaVacia",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "RondaCerrada",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "SectorInvalido",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "SectorNoAfectado",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "SoloAdmin",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "TodaviaNoSePuedeCobrar",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "YaEsMiembro",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "YaPago",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "YaReclamo",
    "type": "error"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "id",
        "type": "uint256"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "miembro",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "monto",
        "type": "uint256"
      }
    ],
    "name": "CompensacionPagada",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "ronda",
        "type": "uint256"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "miembro",
        "type": "address"
      }
    ],
    "name": "CuotaPagada",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "miembro",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "monto",
        "type": "uint256"
      }
    ],
    "name": "GarantiaRecuperada",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "ronda",
        "type": "uint256"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "miembro",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "monto",
        "type": "uint256"
      }
    ],
    "name": "GarantiaUsada",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "id",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "string",
        "name": "sector",
        "type": "string"
      }
    ],
    "name": "InundacionDeclarada",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "miembro",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "string",
        "name": "sector",
        "type": "string"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "posicion",
        "type": "uint256"
      }
    ],
    "name": "MiembroSeUnio",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "reservaRestante",
        "type": "uint256"
      }
    ],
    "name": "PozoFinalizado",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "ronda",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "inicio",
        "type": "uint256"
      }
    ],
    "name": "RondaIniciada",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "ronda",
        "type": "uint256"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "beneficiario",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "monto",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "aporteReserva",
        "type": "uint256"
      }
    ],
    "name": "TurnoCobrado",
    "type": "event"
  },
  {
    "inputs": [],
    "name": "admin",
    "outputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "beneficiarioActual",
    "outputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "cantidadInundaciones",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "cantidadMiembros",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "cobrarTurno",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "compensacion",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "cuota",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "string",
        "name": "sector",
        "type": "string"
      }
    ],
    "name": "declararInundacion",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "duracionRonda",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "name": "esMiembro",
    "outputs": [
      {
        "internalType": "bool",
        "name": "",
        "type": "bool"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "estado",
    "outputs": [
      {
        "internalType": "enum PozoSB.Estado",
        "name": "",
        "type": "uint8"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "name": "garantia",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "inicioRondaActual",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "id",
        "type": "uint256"
      }
    ],
    "name": "inundacion",
    "outputs": [
      {
        "internalType": "string",
        "name": "sector",
        "type": "string"
      },
      {
        "internalType": "uint64",
        "name": "fecha",
        "type": "uint64"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "maxMiembros",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "miembros",
    "outputs": [
      {
        "internalType": "address[]",
        "name": "",
        "type": "address[]"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "pagarCuota",
    "outputs": [],
    "stateMutability": "payable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      },
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "name": "pagoRonda",
    "outputs": [
      {
        "internalType": "bool",
        "name": "",
        "type": "bool"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "name": "pagosRonda",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "id",
        "type": "uint256"
      }
    ],
    "name": "reclamarCompensacion",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      },
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "name": "reclamoCompensacion",
    "outputs": [
      {
        "internalType": "bool",
        "name": "",
        "type": "bool"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "recuperarGarantia",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "name": "recuperoGarantia",
    "outputs": [
      {
        "internalType": "bool",
        "name": "",
        "type": "bool"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "reserva",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "reservaAlCierre",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "reservaBps",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "resumen",
    "outputs": [
      {
        "internalType": "enum PozoSB.Estado",
        "name": "_estado",
        "type": "uint8"
      },
      {
        "internalType": "uint256",
        "name": "_rondaActual",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "_inicioRondaActual",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "_miembrosActuales",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "_reserva",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "_saldoContrato",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "rondaActual",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "name": "sectorDe",
    "outputs": [
      {
        "internalType": "string",
        "name": "",
        "type": "string"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "string",
        "name": "sector",
        "type": "string"
      }
    ],
    "name": "unirse",
    "outputs": [],
    "stateMutability": "payable",
    "type": "function"
  }
] as const;
