import packageJson from "../package.json";

export const APP_VERSION = packageJson.version || "2.5.2";
export const RELEASE_DATE = "2026-10-03";
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
    "Botón de Restablecimiento Total de Fábrica en 'Datos de Mi Negocio' protegido por PIN de Administrador.",
    "Nuevo motor dual de actualizaciones automáticas desde GitHub (descarga ZIP directa sin requerir Git en Windows).",
    "Sistema de Diagnóstico y Registro de Logs & Bugs en tiempo real (Alt + L / F11).",
    "Scripts automáticos para Windows: Iniciar_POS.bat y Actualizar_POS.bat.",
    "Protección de edición fiscal SENIAT reforzada con código de activación.",
    "Optimizaciones de velocidad de cobro y atajos de teclado.",
  ],
};
