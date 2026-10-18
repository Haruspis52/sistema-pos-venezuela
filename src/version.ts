import packageJson from "../package.json";

export const APP_VERSION = packageJson.version || "2.6.0";
export const RELEASE_DATE = "2026-10-18";
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
    "Exportación detallada de existencias e inventario a Excel/CSV con valuación de costos protegida por PIN y hoja formal de auditoría física.",
    "Diseño adaptable y responsivo en barra de herramientas del Catálogo de Productos con soporte multirresolución.",
    "Lanzadores de instalación y arranque automático de 1 clic para clientes (INICIAR_SISTEMA_NODEJS.bat y CONFIGURAR_INICIO_AUTOMATICO.bat).",
    "Depuración y optimización de código fuente: eliminación de archivos redundantes y aligeramiento del paquete en ~700 KB.",
    "Auto-ejecución transparente de 'npm install' en lanzadores para descargar automáticamente nuevas dependencias.",
    "Integración en tiempo real con Google Firebase Firestore (<50ms) para validación de licencias y suscripciones.",
    "Bypass de caché local con getDocFromServer para suspensión y activación remota inmediata de clientes.",
    "Compatibilidad con terminal SmartPOS Android WizarPOS Q2 conectado por USB (RNDIS / ECR).",
  ],
};
