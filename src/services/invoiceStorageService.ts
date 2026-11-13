import { Venta, PosOperationalMode } from "../types";
import { getStoredEmisorFiscal } from "../mockDb";

export interface SaveInvoiceLocalResult {
  success: boolean;
  filename?: string;
  htmlFilename?: string;
  jsonFilename?: string;
  folder?: string;
  folderPath?: string;
  savedAt?: string;
  error?: string;
}

/**
 * Guarda automáticamente una factura en el disco duro local en una carpeta con la fecha y hora de la operación
 * (facturas_emitidas/YYYY-MM-DD_HH-mm-ss_FAC-XXX/) cuando el sistema se encuentra en modo 'Sin Datáfono'.
 */
export async function saveInvoiceLocally(
  sale: Venta,
  posMode: PosOperationalMode = "inventory_only"
): Promise<SaveInvoiceLocalResult> {
  // Solo se ejecuta si estamos en modo sin datáfono (o por configuración)
  if (posMode !== "inventory_only") {
    return { success: false, error: "Modo datáfono activo, no requiere guardado manual." };
  }

  try {
    const emisor = getStoredEmisorFiscal();
    const res = await fetch("/api/invoices/save-local", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sale, emisor }),
    });

    if (res.ok) {
      const data = await res.json();
      return {
        success: true,
        filename: data.filename,
        htmlFilename: data.htmlFilename,
        jsonFilename: data.jsonFilename,
        folder: data.folder,
        folderPath: data.folderPath,
        savedAt: data.savedAt,
      };
    } else {
      console.warn("Fallo al guardar factura en servidor local:", res.status);
      return { success: false, error: `Error ${res.status}` };
    }
  } catch (err: any) {
    console.warn("No se pudo conectar con el servidor local para guardar la factura:", err?.message || err);
    return { success: false, error: err?.message };
  }
}

/**
 * Solicita al servidor abrir la carpeta 'facturas_emitidas' o una subcarpeta específica en el Explorador de archivos.
 */
export async function openInvoicesFolder(subfolder?: string): Promise<boolean> {
  try {
    const res = await fetch("/api/invoices/open-folder", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subfolder }),
    });
    if (res.ok) {
      const data = await res.json();
      return data.success;
    }
  } catch (err) {
    console.warn("Error al intentar abrir la carpeta en el explorador:", err);
  }
  return false;
}

/**
 * Descarga las facturas emitidas el día de hoy en un archivo ZIP.
 */
export function downloadTodayInvoicesZip(): void {
  const link = document.createElement("a");
  link.href = "/api/invoices/download-today-zip";
  link.download = `facturas_${new Date().toISOString().slice(0, 10)}.zip`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Descarga directa desde el navegador del ticket fiscal en formato TXT (útil como respaldo inmediato).
 */
export function downloadInvoiceTicketTxt(sale: Venta): void {
  const safeNum = String(sale.numero_factura || "FAC-0000").replace(/[^a-zA-Z0-9_-]/g, "_");
  const emisor = getStoredEmisorFiscal();
  const dateStr = sale.fecha_hora || sale.fecha || new Date().toLocaleString();

  const lines = [
    "================================================================================",
    "                    SENIAT - COMPROBANTE FISCAL DIGITAL",
    "================================================================================",
    `EMISOR:        ${emisor?.razon_social || "SISTEMA POS & FACTURACIÓN VENEZUELA"}`,
    `RIF:           ${emisor?.rif || "J-00000000-0"}`,
    `DIRECCIÓN:     ${emisor?.direccion_fiscal || "Caracas, Venezuela"}`,
    "--------------------------------------------------------------------------------",
    `FACTURA N°:    ${sale.numero_factura || "N/A"}`,
    `CONTROL N°:    ${sale.numero_control || "N/A"}`,
    `FECHA/HORA:    ${dateStr}`,
    `OPERADOR:      ${sale.usuario || "Caja Principal"}`,
    "MODALIDAD:     SIN DATÁFONO (OPERACIÓN MANUAL / AUTÓNOMA)",
    "--------------------------------------------------------------------------------",
    `CLIENTE:       ${sale.cliente_nombre || "CONSUMIDOR FINAL"}`,
    `RIF / C.I.:    ${sale.cliente_rif || "V-00000000-0"}`,
    "================================================================================",
    "CANT  DESCRIPCIÓN                                ALIC            TOTAL (Bs)",
    "--------------------------------------------------------------------------------",
    ...(sale.items || []).map((it) => {
      const qty = String(it.cantidad || 1).padEnd(5);
      const desc = String(it.nombre || "Artículo").slice(0, 40).padEnd(42);
      const alic = (it.alicuota_iva || 16) > 0 ? "(G 16%)" : "(E 0%) ";
      const totalBs = `Bs. ${(it.subtotal * (sale.tasa_bcv || 36.5)).toFixed(2)}`.padStart(16);
      return `${qty} ${desc} ${alic} ${totalBs}`;
    }),
    "================================================================================",
    `TOTAL FACTURA (VES):                              Bs. ${(sale.total_ves || 0).toFixed(2)}`,
    `TOTAL EQUIVALENTE USD:                            $ ${(sale.total_usd || 0).toFixed(2)}`,
    `TASA OFICIAL BCV:                                 Bs. ${(sale.tasa_bcv_aplicada || sale.tasa_bcv || 36.5).toFixed(2)}`,
    `FORMA DE PAGO:                                    ${sale.metodo_pago || "Efectivo"}`,
    "================================================================================",
    "              *** COMPROBANTE FISCAL CONFORME A DERECHO ***",
    "================================================================================",
  ].join("\n");

  const blob = new Blob([lines], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `Factura_${safeNum}_${new Date().toISOString().slice(0, 10)}.txt`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
