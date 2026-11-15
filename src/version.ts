import packageJson from "../package.json";

export const APP_VERSION = packageJson.version || "2.9.0";
export const RELEASE_DATE = "2026-11-15";
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
    "Instalación limpia de fábrica: inicio sin productos, ventas, movimientos, fiados ni cierres por defecto (correlativos desde N° 1 y arqueo de turno en $0.00).",
    "Corrección de diseño responsivo y alineación en el encabezado (Tasa BCV) y barra de búsqueda del Mostrador para evitar superposiciones.",
    "Sincronización automática de la versión instalada ('version_instalada'), cuota mensual ('cuota_mensual_usd': $15 Bodega / $25 Fiscal / $35 Ambas) y fecha de vencimiento a 1 mes en Firebase Firestore.",
    "Blindaje criptográfico SHA-256 con Salt para los códigos de activación de ediciones sin exponer claves en texto plano.",
    "Detección inteligente en el asistente de instalación de licencias con datos comerciales ya inscritos en el sistema.",
    "Nueva identidad visual de marca: FaradayPOS con ícono minimalista en colores pastel del sistema y animación de bienvenida fluida de 3 segundos.",
  ],
};
