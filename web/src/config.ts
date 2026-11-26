// Dirección del contrato PozoSB desplegado en Avalanche Fuji (testnet).
// Si redespliegas el contrato, cambia esta línea (o define VITE_CONTRACT_ADDRESS).
const DIRECCION_POR_DEFECTO = "0x8f4837c107c2Bb62A2892933CB29f4e5D9E76590";

export const CONTRACT_ADDRESS = (import.meta.env.VITE_CONTRACT_ADDRESS || DIRECCION_POR_DEFECTO) as `0x${string}`;

export const EXPLORADOR = "https://testnet.snowtrace.io";

// Sectores disponibles. El mismo texto se usa al unirse y al declarar una inundación.
export const SECTORES = ["Av. Colón", "La Divisa", "Centro"];
