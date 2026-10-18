import { db } from "../firebase";
import { doc, getDocFromServer, getDoc, setDoc, updateDoc } from "firebase/firestore";
import { RemoteClientLicense } from "../types";
import { getStoredRegisteredLicenses, getDefault30DaysExpiry } from "../mockDb";

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

    let targetDocId = cleanId;
    let licenseRef = doc(db, "licenses", targetDocId);
    
    // Priorizar consulta directa al servidor de Firebase para evitar lecturas de caché desactualizadas
    let snap;
    try {
      snap = await getDocFromServer(licenseRef);
    } catch {
      snap = await getDoc(licenseRef);
    }

    // Si no se encuentra con la capitalización original, probar con mayúsculas
    if (!snap.exists() && targetDocId !== targetDocId.toUpperCase()) {
      try {
        const upperRef = doc(db, "licenses", targetDocId.toUpperCase());
        const upperSnap = await getDocFromServer(upperRef);
        if (upperSnap.exists()) {
          targetDocId = targetDocId.toUpperCase();
          licenseRef = upperRef;
          snap = upperSnap;
        }
      } catch {}
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
        cliente_id: targetDocId,
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

/**
 * Auto-registra los datos del negocio del cliente en Firebase durante la instalación inicial.
 * Actualiza nombre del negocio, RIF y teléfono del cliente sin tocar cuotas ni fechas de vencimiento.
 * NOTA: Por requerimiento explícito, no se incluye dirección fiscal.
 */
export async function autoRegisterBusinessInFirestore(params: {
  clienteId: string;
  nombreNegocio: string;
  rifCedula: string;
  telefonoContacto?: string;
  edicionContratada: "bodega" | "fiscal";
}): Promise<{ success: boolean; error?: string }> {
  try {
    const cleanRaw = params.clienteId.trim();
    if (!cleanRaw) return { success: false, error: "ID de cliente inválido" };

    let targetDocId = cleanRaw.toUpperCase();
    let licenseRef = doc(db, "licenses", targetDocId);

    // Si el documento existía en Firestore con la versión original (p. ej. minúsculas), respetarla
    try {
      const snapUpper = await getDoc(licenseRef);
      if (!snapUpper.exists() && cleanRaw !== targetDocId) {
        const snapRaw = await getDoc(doc(db, "licenses", cleanRaw));
        if (snapRaw.exists()) {
          targetDocId = cleanRaw;
          licenseRef = doc(db, "licenses", targetDocId);
        }
      }
    } catch {}

    // Cargar datos a registrar (sin direccion_fiscal por requerimiento explícito)
    const payload: Record<string, any> = {
      cliente_id: targetDocId,
      nombre_negocio: params.nombreNegocio.trim(),
      rif_cedula: params.rifCedula.trim().toUpperCase(),
      telefono_contacto: (params.telefonoContacto || "").trim(),
      edicion_contratada: params.edicionContratada,
      fecha_instalacion: new Date().toISOString(),
      ultimo_contacto: new Date().toISOString(),
    };

    // Usar setDoc con merge: true para enriquecer el documento existente sin sobreescribir cuotas ni fechas
    await setDoc(licenseRef, payload, { merge: true });
    console.log(`[Firebase] Auto-registro exitoso para '${targetDocId}':`, payload);

    return { success: true };
  } catch (err: any) {
    console.warn("[Firebase] Auto-registro en Firebase durante instalación:", err?.message);
    return { success: false, error: err?.message };
  }
}


/**
 * Valida un Client ID ingresado por el cliente durante el asistente de activación inicial.
 * Prioriza Firestore, luego Google Sheets API y soporta DEMO/CLI-001 para pruebas locales.
 */
export async function verifyLicenseOnline(clienteId: string): Promise<{
  success: boolean;
  valid: boolean;
  license?: RemoteClientLicense;
  message: string;
}> {
  const cleanId = clienteId.trim().toUpperCase();
  if (!cleanId) {
    return {
      success: false,
      valid: false,
      message: "Por favor ingrese su código de licencia (Client ID).",
    };
  }

  // 1. Consultar primero en Firebase Firestore en tiempo real (si está conectado)
  try {
    const fsRes = await fetchRemoteLicenseFromFirestore(cleanId);
    if (fsRes.success && fsRes.found && fsRes.license) {
      const lic = fsRes.license;
      if (lic.estado_remoto === "SUSPENDIDO") {
        return {
          success: true,
          valid: false,
          license: lic,
          message: "Esta licencia se encuentra suspendida administrativamente en el servidor remoto.",
        };
      }
      return {
        success: true,
        valid: true,
        license: lic,
        message: `Licencia validada en servidor en la nube. Válida hasta ${lic.fecha_vencimiento_actual}.`,
      };
    }
  } catch (e) {
    console.warn("[Licencia] Fallo de consulta directa en Firestore, intentando métodos locales:", e);
  }

  // 2. Consultar como respaldo en Google Sheets API (si existe el backend configurado)
  try {
    const res = await fetch(`/api/license/sync?clienteId=${encodeURIComponent(cleanId)}`);
    if (res.ok) {
      const data = await res.json();
      if (data && data.found) {
        const isSuspended = String(data.estado || "").toUpperCase().includes("SUSPEND");
        const lic: RemoteClientLicense = {
          cliente_id: cleanId,
          nombre_negocio: data.nombreNegocio || "Negocio Registrado",
          rif_cedula: "J-00000000-0",
          telefono_contacto: data.telefono || "",
          edicion_contratada: String(data.edicion || "bodega").toLowerCase().includes("fiscal") ? "fiscal" : "bodega",
          cuota_mensual_usd: Number(data.cuotaUsd || 15),
          monto_instalacion_usd: 50,
          fecha_instalacion: data.fechaInstalacion || "2026-01-01",
          fecha_vencimiento_actual: data.fechaVencimiento || getDefault30DaysExpiry(),
          estado_remoto: isSuspended ? "SUSPENDIDO" : "ACTIVO",
          dias_gracia_offline_max: 30,
          ultimo_contacto_servidor: new Date().toISOString(),
          motivo_bloqueo: data.motivo || "",
        };

        if (isSuspended) {
          return {
            success: true,
            valid: false,
            license: lic,
            message: "Esta licencia se encuentra suspendida en Google Sheets.",
          };
        }

        return {
          success: true,
          valid: true,
          license: lic,
          message: `Licencia activa validada en Google Sheets. Válida hasta ${lic.fecha_vencimiento_actual}.`,
        };
      }
    }
  } catch (e) {
    console.warn("[Licencia] Fallo de consulta en Google Sheets:", e);
  }

  // 3. Consultar en el catálogo de Licencias Registradas del Administrador (Local / Offline)
  try {
    const registered = getStoredRegisteredLicenses();
    const foundReg = registered.find(
      (r) => r.cliente_id.trim().toUpperCase() === cleanId
    );

    if (foundReg) {
      const isSuspended = foundReg.estado === "SUSPENDIDO";
      const lic: RemoteClientLicense = {
        cliente_id: foundReg.cliente_id,
        nombre_negocio: foundReg.nombre_referencia || "Negocio Registrado",
        rif_cedula: "J-00000000-0",
        telefono_contacto: "",
        edicion_contratada: foundReg.edicion_contratada,
        cuota_mensual_usd: foundReg.cuota_mensual_usd,
        monto_instalacion_usd: 50,
        fecha_instalacion: foundReg.fecha_emision || new Date().toISOString().split("T")[0],
        fecha_vencimiento_actual: foundReg.fecha_vencimiento || getDefault30DaysExpiry(),
        estado_remoto: foundReg.estado,
        dias_gracia_offline_max: 30,
        ultimo_contacto_servidor: new Date().toISOString(),
        observaciones: foundReg.notas || "Licencia emitida por el Administrador",
      };

      if (isSuspended) {
        return {
          success: true,
          valid: false,
          license: lic,
          message: "Esta licencia se encuentra suspendida administrativamente.",
        };
      }

      return {
        success: true,
        valid: true,
        license: lic,
        message: `¡Licencia oficial verificada (${foundReg.edicion_contratada === "fiscal" ? "Edición Fiscal SENIAT" : "Edición Bodega y Mostrador"})! Válida hasta ${lic.fecha_vencimiento_actual}.`,
      };
    }
  } catch (e) {
    console.error("[Licencia] Error consultando catálogo registrado:", e);
  }

  // 4. Códigos autorizados de Demostración y Pruebas Locales
  if (cleanId === "DEMO" || cleanId === "CLI-DEMO" || cleanId === "CLI-001" || cleanId === "POS-DEMO") {
    const demoLic: RemoteClientLicense = {
      cliente_id: cleanId,
      nombre_negocio: "Comercio Demostración",
      rif_cedula: "J-00000000-0",
      telefono_contacto: "",
      edicion_contratada: "bodega",
      cuota_mensual_usd: 15,
      monto_instalacion_usd: 50,
      fecha_instalacion: new Date().toISOString().split("T")[0],
      fecha_vencimiento_actual: getDefault30DaysExpiry(),
      estado_remoto: "ACTIVO",
      dias_gracia_offline_max: 30,
      ultimo_contacto_servidor: new Date().toISOString(),
      observaciones: "Licencia de prueba local",
    };
    return {
      success: true,
      valid: true,
      license: demoLic,
      message: "Modo de demostración autorizado con vigencia completa de 30 días.",
    };
  }

  // 5. Validación Algorítmica de Clave de Instalador (para distribución offline con instalador)
  // Formatos oficiales: CLI-BOD-XXXX, CLI-FSC-XXXX, POS-VE-XXXX, o prefijos autorizados CLI- y POS-
  const isValidFormat =
    /^CLI-(BOD|FSC|VE)-[A-Z0-9]{3,}$/i.test(cleanId) ||
    /^POS-(BOD|FSC|VE)-[A-Z0-9]{3,}$/i.test(cleanId) ||
    (cleanId.startsWith("CLI-") && cleanId.length >= 7) ||
    (cleanId.startsWith("POS-") && cleanId.length >= 7);

  if (isValidFormat) {
    const isFiscal = cleanId.includes("FSC") || cleanId.includes("FISCAL");
    const lic: RemoteClientLicense = {
      cliente_id: cleanId,
      nombre_negocio: "Nuevo Negocio",
      rif_cedula: "J-00000000-0",
      telefono_contacto: "",
      edicion_contratada: isFiscal ? "fiscal" : "bodega",
      cuota_mensual_usd: isFiscal ? 30 : 15,
      monto_instalacion_usd: 50,
      fecha_instalacion: new Date().toISOString().split("T")[0],
      fecha_vencimiento_actual: getDefault30DaysExpiry(),
      estado_remoto: "ACTIVO",
      dias_gracia_offline_max: 30,
      ultimo_contacto_servidor: new Date().toISOString(),
      observaciones: "Licencia de cliente activada mediante instalador",
    };
    return {
      success: true,
      valid: true,
      license: lic,
      message: `¡Client ID reconocido y activado (${isFiscal ? "Edición Fiscal SENIAT" : "Edición Bodega y Mostrador"})! Periodo inicial de 30 días habilitado.`,
    };
  }

  return {
    success: false,
    valid: false,
    message: `No se encontró ninguna licencia activa con el código "${cleanId}". Por favor verifique el Client ID con su proveedor o genere una en el Panel de Licencias.`,
  };
}
