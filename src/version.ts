import packageJson from "../package.json";

export const APP_VERSION = packageJson.version || "2.9.2";
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
    "Botón de apagado seguro del servidor local ('Apagar') en el encabezado con cierre limpio de procesos Node.js y consola en Windows.",
    "Optimización visual del Punto de Venta: encabezado compacto en Edición Bodega, carrito de cobro fijo (sticky) al hacer scroll, estado inicial guiado cuando el catálogo está vacío y reubicación de 'F7 Atajos' al menú Herramientas.",
    "Actualización integral de Términos y Condiciones, Política de Privacidad y Certificado Legal (tarifas vigentes $15/$25/$35, cláusula de privacidad para Firebase Firestore y respaldos locales).",
    "Corrección de pantalla en blanco tras actualizar en local: escritura atómica de archivos, pre-compilación del grafo de módulos Vite antes de recargar y auto-recuperación ante caché desactualizada.",
    "Sincronización automática de la versión instalada ('version_instalada'), cuota mensual ('cuota_mensual_usd') y fecha de vencimiento a 1 mes en Firebase Firestore.",
    "Blindaje criptográfico SHA-256 con Salt para los códigos de activación de ediciones sin exponer claves en texto plano.",
  ],
};
