import packageJson from "../package.json";

export const APP_VERSION = packageJson.version || "2.5.3";
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
    "Integración en tiempo real con Google Firebase Firestore (<50ms) para validación de licencias y suscripciones.",
    "Bypass de caché local con getDocFromServer para suspensión y activación remota inmediata de clientes.",
    "Compatibilidad con terminal SmartPOS Android WizarPOS Q2 conectado por USB (RNDIS / ECR).",
    "Botón de Restablecimiento Total de Fábrica en 'Datos de Mi Negocio' protegido por PIN de Administrador.",
    "Motor dual de actualizaciones automáticas desde GitHub (descarga ZIP directa sin requerir Git en Windows).",
    "Sistema de Diagnóstico y Registro de Logs & Bugs en tiempo real (Alt + L / F11).",
  ],
};
