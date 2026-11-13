import packageJson from "../package.json";

export const APP_VERSION = packageJson.version || "2.8.0";
export const RELEASE_DATE = "2026-11-13";
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
    "Sincronización automática de la versión instalada ('version_instalada'), cuota mensual ('cuota_mensual_usd': $15 Bodega / $25 Fiscal / $35 Ambas) y fecha de vencimiento a 1 mes en Firebase Firestore.",
    "Blindaje criptográfico SHA-256 con Salt para los códigos de activación de ediciones sin exponer claves en texto plano.",
    "Detección inteligente en el asistente de instalación de licencias con datos comerciales ya inscritos en el sistema.",
    "Nueva identidad visual de marca: FaradayPOS con ícono minimalista en colores pastel del sistema y animación de bienvenida fluida de 3 segundos.",
    "Verificación independiente de ediciones contratadas en Firebase Firestore ('bodega', 'fiscal' y 'ambas') con actualización remota.",
    "Exportación detallada de existencias e inventario a Excel/CSV con valuación de costos protegida por PIN y hoja formal de auditoría física.",
  ],
};
