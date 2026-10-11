import packageJson from "../package.json";

export const APP_VERSION = packageJson.version || "2.5.4";
export const RELEASE_DATE = "2026-10-11";
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
    "Auto-ejecución transparente de 'npm install' en Actualizar_POS.bat y en el actualizador para descargar automáticamente nuevas dependencias.",
    "Integración en tiempo real con Google Firebase Firestore (<50ms) para validación de licencias y suscripciones.",
    "Bypass de caché local con getDocFromServer para suspensión y activación remota inmediata de clientes.",
    "Compatibilidad con terminal SmartPOS Android WizarPOS Q2 conectado por USB (RNDIS / ECR).",
    "Botón de Restablecimiento Total de Fábrica en 'Datos de Mi Negocio' protegido por PIN de Administrador.",
    "Motor dual de actualizaciones automáticas desde GitHub (descarga ZIP directa sin requerir Git en Windows).",
  ],
};
