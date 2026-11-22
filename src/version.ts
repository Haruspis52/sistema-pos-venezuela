import packageJson from "../package.json";

export const APP_VERSION = packageJson.version || "3.2.0";
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
    "Cuentas en Espera ('Pausar Venta'): permite atender múltiples clientes en mostrador guardando carritos temporales en pestañas rápidas y retomándolos en 1 clic.",
    "Calculadora rápida de Vuelto Mixto (USD + Bs.) con botones de billetes rápidos ($1, $5, $10, $20, $50, Exacto) y edición directa de cantidad o peso (Kg/g) en la canasta.",
    "Indicadores visuales tipo semáforo de stock (saludable, mínimo y agotado), paleta de comandos rápidos (Ctrl + K o F2) y mini-barra de resumen en vivo con botón de privacidad.",
    "Feedback auditivo opcional mediante tonos sutiles de confirmación, alerta de stock y sonido de caja registradora al facturar (activable/desactivable desde el encabezado).",
    "Unificación de la estética Glassmorphism Arena Cálido y paleta Ámbar Dorado (#E09F3E / #9A6310), optimización de lectura y carga instantánea del Libro de Ventas.",
    "Sincronización automática de versión instalada, cuota mensual y vigencia en Firebase Firestore junto a blindaje SHA-256 para licencias.",
  ],
};
