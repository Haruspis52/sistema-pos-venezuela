import packageJson from "../package.json";

export const APP_VERSION = packageJson.version || "3.0.0";
export const RELEASE_DATE = "2026-11-21";
export const DEFAULT_GITHUB_REPO = "Haruspis52/sistema-pos-venezuela";

export interface VersionInfo {
  version: string;
  releaseDate: string;
  changelog: string[];
}

export const CURRENT_VERSION_INFO: VersionInfo = {
  version: APP_VERSION,
  releaseDate: RELEASE_DATE,
  changelog: [
    "Rediseño visual integral con estética Glassmorphism Arena Cálido, contraste optimizado en modales, tarjetas y formularios, e incremento global de tipografía (+3%) para máxima legibilidad.",
    "Mostrador más ágil y limpio: selector de categorías integrado como menú desplegable junto a orden y avance, soporte panorámico fluido y barra de herramientas sin desbordamientos.",
    "Carga instantánea del Libro de Ventas eliminando bloqueos de lazy-loading, con precarga en segundo plano de vistas secundarias y optimización de cabecera fija.",
    "Botón de apagado seguro del servidor local ('Apagar'), carrito sticky al hacer scroll y estado guiado para catálogos vacíos.",
    "Sincronización automática de la versión instalada ('version_instalada'), cuota mensual y vigencia en Firebase Firestore junto a blindaje SHA-256 para licencias.",
  ],
};
