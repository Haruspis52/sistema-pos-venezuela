export const APP_VERSION = "2.5.0";
export const RELEASE_DATE = "2026-10-02";
export const DEFAULT_GITHUB_REPO = "brayangp2435/pos-bodega-fiscal";

export interface VersionInfo {
  version: string;
  releaseDate: string;
  changelog: string[];
}

export const CURRENT_VERSION_INFO: VersionInfo = {
  version: APP_VERSION,
  releaseDate: RELEASE_DATE,
  changelog: [
    "Sistema de Diagnóstico y Registro de Logs & Bugs en tiempo real (Alt + L / F11).",
    "Módulo de Actualización desde GitHub para instalaciones locales con Node.js.",
    "Scripts automáticos para Windows: Iniciar_POS.bat y Actualizar_POS.bat.",
    "Protección de edición fiscal SENIAT reforzada con código de activación.",
    "Optimizaciones de velocidad de cobro y atajos de teclado.",
  ],
};
