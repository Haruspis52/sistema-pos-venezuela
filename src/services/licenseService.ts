import { db } from "../firebase";
import { doc, getDocFromServer, getDoc, setDoc, updateDoc } from "firebase/firestore";
import { RemoteClientLicense } from "../types";

export interface FirestoreLicenseDoc {
  cliente_id: string;
  nombre_negocio: string;
  rif_cedula?: string;
  telefono_contacto?: string;
  edicion_contratada: "bodega" | "fiscal";
  cuota_mensual_usd: number;
  monto_instalacion_usd?: number;
  fecha_instalacion?: string;
  fecha_vencimiento_actual: string;
  estado_remoto: "ACTIVO" | "SUSPENDIDO";
  ultimo_contacto?: string;
  motivo_bloqueo?: string;
  observaciones?: string;
}

/**
 * Consulta la licencia del cliente directamente en Firebase Firestore en tiempo real (bypasseando caché).
 * Tiempo de respuesta típico: < 50ms.
 */
export async function fetchRemoteLicenseFromFirestore(
  clienteId: string
): Promise<{ success: boolean; found: boolean; license?: RemoteClientLicense; error?: string }> {
  try {
    const cleanId = clienteId.trim();
    if (!cleanId) return { success: false, found: false, error: "ID de cliente vacío" };

    const licenseRef = doc(db, "licenses", cleanId);
    
    // Priorizar consulta directa al servidor de Firebase para evitar lecturas de caché desactualizadas
    let snap;
    try {
      snap = await getDocFromServer(licenseRef);
    } catch {
      snap = await getDoc(licenseRef);
    }

    if (snap.exists()) {
      const data = snap.data() as any;

      // Normalizar nombre de campo y mayúsculas/minúsculas (acepta estado_remoto, estado o status)
      const rawEstado = data.estado_remoto ?? data.estado ?? data.status ?? "ACTIVO";
      const isSuspended = String(rawEstado).trim().toUpperCase().includes("SUSPEND");
      const estadoRemoto: "ACTIVO" | "SUSPENDIDO" = isSuspended ? "SUSPENDIDO" : "ACTIVO";

      const fechaVencimiento =
        data.fecha_vencimiento_actual ||
        data.fecha_vencimiento ||
        data.fecha ||
        data.vencimiento ||
        "2026-11-15";

      const remoteLicense: RemoteClientLicense = {
        cliente_id: cleanId,
        nombre_negocio: data.nombre_negocio || data.nombre || "Negocio Registrado",
        rif_cedula: data.rif_cedula || data.rif || "J-00000000-0",
        telefono_contacto: data.telefono_contacto || data.telefono || "",
        edicion_contratada: String(data.edicion_contratada || data.edicion || "bodega").toLowerCase().includes("fiscal") ? "fiscal" : "bodega",
        cuota_mensual_usd: Number(data.cuota_mensual_usd ?? data.cuota ?? 15),
        monto_instalacion_usd: Number(data.monto_instalacion_usd ?? data.instalacion ?? 50),
        fecha_instalacion: data.fecha_instalacion || "2026-01-01",
        fecha_vencimiento_actual: fechaVencimiento,
        estado_remoto: estadoRemoto,
        dias_gracia_offline_max: 30,
        ultimo_contacto_servidor: new Date().toISOString(),
        motivo_bloqueo: data.motivo_bloqueo || (isSuspended ? "Suscripción suspendida administrativamente en Firebase." : ""),
        observaciones: data.observaciones || "Sincronizado vía Firebase Firestore",
      };

      // Actualizar último contacto en segundo plano
      try {
        updateDoc(licenseRef, { ultimo_contacto: new Date().toISOString() }).catch(() => {});
      } catch {}

      return { success: true, found: true, license: remoteLicense };
    }

    return { success: true, found: false };
  } catch (err: any) {
    return { success: false, found: false, error: err?.message };
  }
}

/**
 * Guarda o actualiza una licencia en Firestore (usado por el administrador del sistema)
 */
export async function saveLicenseToFirestore(
  license: RemoteClientLicense
): Promise<boolean> {
  try {
    const cleanId = license.cliente_id.trim();
    const licenseRef = doc(db, "licenses", cleanId);
    await setDoc(
      licenseRef,
      {
        cliente_id: cleanId,
        nombre_negocio: license.nombre_negocio,
        rif_cedula: license.rif_cedula,
        telefono_contacto: license.telefono_contacto,
        edicion_contratada: license.edicion_contratada,
        cuota_mensual_usd: license.cuota_mensual_usd,
        monto_instalacion_usd: license.monto_instalacion_usd,
        fecha_instalacion: license.fecha_instalacion,
        fecha_vencimiento_actual: license.fecha_vencimiento_actual,
        estado_remoto: license.estado_remoto,
        ultimo_contacto: new Date().toISOString(),
        observaciones: license.observaciones || "",
      },
      { merge: true }
    );
    return true;
  } catch (err) {
    console.error("[Firebase] Error al guardar licencia:", err);
    return false;
  }
}
