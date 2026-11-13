import { db } from "../firebase";
import { doc, getDocFromServer, getDoc, setDoc } from "firebase/firestore";
import { RemoteClientLicense } from "../types";
import { APP_VERSION } from "../version";
import {
  getStoredRegisteredLicenses,
  getDefault30DaysExpiry,
  parseContractedEdition,
  getCuotaMensualPorEdicion,
} from "../mockDb";

export interface FirestoreLicenseDoc {
  cliente_id: string;
  nombre_negocio: string;
  rif_cedula?: string;
  telefono_contacto?: string;
  edicion_contratada: "bodega" | "fiscal" | "ambas";
  cuota_mensual_usd: number;
  monto_instalacion_usd?: number;
  fecha_instalacion?: string;
  fecha_vencimiento_actual: string;
  estado_remoto: "ACTIVO" | "SUSPENDIDO";
  ultimo_contacto?: string;
  version_instalada?: string;
  motivo_bloqueo?: string;
  observaciones?: string;
}

const PLACEHOLDER_BUSINESS_NAMES = [
  "negocio registrado",
  "nuevo negocio",
  "comercio demostración",
  "comercio demostracion",
  "mi negocio comercial, c.a.",
  "mi comercio y víveres",
  "mi comercio y viveres",
];

const PLACEHOLDER_BUSINESS_RIFS = [
  "j-00000000-0",
  "v-00000000-0",
  "00000000",
  "j-40918274-1",
];

const PLACEHOLDER_BUSINESS_PHONES = [
  "+58 412-5551234",
  "0412-5551234",
];

/**
 * Verifica si una licencia ya tiene todos los datos del comercio inscritos (nombre, RIF y teléfono).
 */
export function hasLicenseCompleteBusinessData(data: {
  nombre_negocio?: string;
  nombre?: string;
  rif_cedula?: string;
  rif?: string;
  telefono_contacto?: string;
  telefono?: string;
}): boolean {
  const rawNombre = String(data.nombre_negocio ?? data.nombre ?? "").trim();
  const rawRif = String(data.rif_cedula ?? data.rif ?? "").trim();
  const rawTelefono = String(data.telefono_contacto ?? data.telefono ?? "").trim();

  const validNombre =
    rawNombre.length > 0 &&
    !PLACEHOLDER_BUSINESS_NAMES.includes(rawNombre.toLowerCase());
  const validRif =
    rawRif.length > 0 &&
    !PLACEHOLDER_BUSINESS_RIFS.includes(rawRif.toLowerCase());
  const validTelefono =
    rawTelefono.length > 0 &&
    !PLACEHOLDER_BUSINESS_PHONES.includes(rawTelefono.toLowerCase());

  return validNombre && validRif && validTelefono;
}

/**
 * Consulta la licencia del cliente directamente en Firebase Firestore en tiempo real (bypasseando caché).
 * Tiempo de respuesta típico: < 50ms.
 */
export async function fetchRemoteLicenseFromFirestore(
  clienteId: string
): Promise<{
  success: boolean;
  found: boolean;
  license?: RemoteClientLicense;
  datosInscritos?: boolean;
  error?: string;
}> {
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

      let rawEdicion =
        data.edicion_contratada ??
        data.edicion ??
        data.ediciones ??
        data.version ??
        "bodega";
      if (data.tiene_bodega === true && data.tiene_fiscal === true) {
        rawEdicion = "ambas";
      }
      const edicionContratada = parseContractedEdition(rawEdicion);

      const datosInscritos = hasLicenseCompleteBusinessData(data);

      const remoteLicense: RemoteClientLicense = {
        cliente_id: targetDocId,
        nombre_negocio: data.nombre_negocio || data.nombre || "Negocio Registrado",
        rif_cedula: data.rif_cedula || data.rif || "J-00000000-0",
        telefono_contacto: data.telefono_contacto || data.telefono || "",
        edicion_contratada: edicionContratada,
        cuota_mensual_usd: Number(
          data.cuota_mensual_usd ?? data.cuota ?? getCuotaMensualPorEdicion(edicionContratada)
        ),
        monto_instalacion_usd: Number(data.monto_instalacion_usd ?? data.instalacion ?? 50),
        fecha_instalacion: data.fecha_instalacion || "2026-01-01",
        fecha_vencimiento_actual: fechaVencimiento,
        estado_remoto: estadoRemoto,
        dias_gracia_offline_max: 30,
        ultimo_contacto_servidor: new Date().toISOString(),
        version_instalada: APP_VERSION,
        motivo_bloqueo: data.motivo_bloqueo || (isSuspended ? "Suscripción suspendida administrativamente en Firebase." : ""),
        observaciones: data.observaciones || "Sincronizado vía Firebase Firestore",
      };

      // Sincronizar automáticamente último contacto y versión instalada en segundo plano
      try {
        setDoc(
          licenseRef,
          {
            ultimo_contacto: new Date().toISOString(),
            version_instalada: APP_VERSION,
          },
          { merge: true }
        ).catch(() => {});
      } catch {}

      return { success: true, found: true, license: remoteLicense, datosInscritos };
    }

    return { success: true, found: false };
  } catch (err: any) {
    return { success: false, found: false, error: err?.message };
  }
}

/**
 * Guarda o actualiza una licencia en Firestore
 */
export async function saveLicenseToFirestore(
  license: RemoteClientLicense
): Promise<boolean> {
  try {
    const cleanRaw = license.cliente_id.trim();
    if (!cleanRaw) return false;

    let targetDocId = cleanRaw;
    let licenseRef = doc(db, "licenses", targetDocId);
    let docExists = false;

    try {
      const snap = await getDocFromServer(licenseRef).catch(() => getDoc(licenseRef));
      if (snap.exists()) {
        docExists = true;
      } else if (targetDocId !== targetDocId.toUpperCase()) {
        const upperId = targetDocId.toUpperCase();
        const upperRef = doc(db, "licenses", upperId);
        const upperSnap = await getDocFromServer(upperRef).catch(() => getDoc(upperRef));
        if (upperSnap.exists()) {
          targetDocId = upperId;
          licenseRef = upperRef;
          docExists = true;
        }
      }
    } catch {}

    if (docExists) {
      // Si el documento ya existe en Firestore, actualizar únicamente edición, versión instalada y metadatos del comercio
      // sin sobrescribir fecha_vencimiento_actual ni estado_remoto configurados en la consola
      await setDoc(
        licenseRef,
        {
          cliente_id: targetDocId,
          nombre_negocio: license.nombre_negocio,
          rif_cedula: license.rif_cedula,
          telefono_contacto: license.telefono_contacto,
          edicion_contratada: license.edicion_contratada,
          cuota_mensual_usd: license.cuota_mensual_usd,
          version_instalada: license.version_instalada || APP_VERSION,
          ultimo_contacto: new Date().toISOString(),
          observaciones: license.observaciones || "",
        },
        { merge: true }
      );
    } else {
      await setDoc(
        licenseRef,
        {
          cliente_id: targetDocId,
          nombre_negocio: license.nombre_negocio,
          rif_cedula: license.rif_cedula,
          telefono_contacto: license.telefono_contacto,
          edicion_contratada: license.edicion_contratada,
          cuota_mensual_usd: license.cuota_mensual_usd,
          monto_instalacion_usd: license.monto_instalacion_usd,
          fecha_instalacion: license.fecha_instalacion,
          fecha_vencimiento_actual: license.fecha_vencimiento_actual,
          estado_remoto: license.estado_remoto,
          version_instalada: license.version_instalada || APP_VERSION,
          ultimo_contacto: new Date().toISOString(),
          observaciones: license.observaciones || "",
        },
        { merge: true }
      );
    }
    return true;
  } catch (err) {
    console.warn("[Firebase] No se pudo guardar licencia en Firestore:", err);
    return false;
  }
}

/**
 * Devuelve la fecha actual en formato YYYY-MM-DD (según hora local del equipo).
 */
export function getTodayDateStr(): string {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

/**
 * Calcula la fecha de vencimiento exactamente a 1 mes calendario a partir del día de instalación (YYYY-MM-DD).
 */
export function getOneMonthExpiryFromToday(): string {
  const now = new Date();
  const targetYear = now.getFullYear();
  const targetMonth = now.getMonth() + 1;
  const day = now.getDate();

  const lastDayOfTargetMonth = new Date(targetYear, targetMonth + 1, 0).getDate();
  const finalDate = new Date(
    targetYear,
    targetMonth,
    Math.min(day, lastDayOfTargetMonth)
  );

  const yyyy = finalDate.getFullYear();
  const mm = String(finalDate.getMonth() + 1).padStart(2, "0");
  const dd = String(finalDate.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

/**
 * Auto-registra los datos del negocio del cliente en Firebase durante la instalación inicial.
 * Envía también 'fecha_instalacion', 'fecha_vencimiento_actual' (1 mes exacto) y 'version_instalada'.
 * NOTA: Por requerimiento explícito, no se incluye dirección fiscal.
 */
export async function autoRegisterBusinessInFirestore(params: {
  clienteId: string;
  nombreNegocio: string;
  rifCedula: string;
  telefonoContacto?: string;
  edicionContratada: "bodega" | "fiscal" | "ambas";
  cuotaMensualUsd?: number;
  fechaVencimientoActual?: string;
  fechaInstalacion?: string;
  forceEditionUpgrade?: boolean;
}): Promise<{ success: boolean; fechaVencimientoActual?: string; cuotaMensualUsd?: number; error?: string }> {
  try {
    const cleanRaw = params.clienteId.trim();
    if (!cleanRaw) return { success: false, error: "ID de cliente inválido" };

    let targetDocId = cleanRaw.toUpperCase();
    let licenseRef = doc(db, "licenses", targetDocId);
    let existingEdition: string | undefined;

    // Si el documento existía en Firestore con la versión original (p. ej. minúsculas), respetarla y leer su edicion_contratada
    try {
      const snapUpper = await getDocFromServer(licenseRef).catch(() => getDoc(licenseRef));
      if (snapUpper.exists()) {
        const d = snapUpper.data() as any;
        existingEdition = d.edicion_contratada || d.edicion;
      } else if (cleanRaw !== targetDocId) {
        const rawRef = doc(db, "licenses", cleanRaw);
        const snapRaw = await getDocFromServer(rawRef).catch(() => getDoc(rawRef));
        if (snapRaw.exists()) {
          targetDocId = cleanRaw;
          licenseRef = rawRef;
          const d = snapRaw.data() as any;
          existingEdition = d.edicion_contratada || d.edicion;
        }
      }
    } catch {}

    // Respetar la edición configurada en Firebase a menos que el documento sea nuevo o se haya usado el código maestro
    const finalEdition =
      existingEdition && !params.forceEditionUpgrade
        ? parseContractedEdition(existingEdition)
        : params.edicionContratada;

    const cuotaMensualUsd = getCuotaMensualPorEdicion(finalEdition);
    const fechaInstalacion = params.fechaInstalacion || getTodayDateStr();
    const fechaVencimientoActual = params.fechaVencimientoActual || getOneMonthExpiryFromToday();

    // Cargar datos a registrar al terminar la instalación (incluyendo cuota_mensual_usd, fecha_vencimiento_actual y version_instalada)
    const payload: Record<string, any> = {
      cliente_id: targetDocId,
      nombre_negocio: params.nombreNegocio.trim(),
      rif_cedula: params.rifCedula.trim().toUpperCase(),
      telefono_contacto: (params.telefonoContacto || "").trim(),
      edicion_contratada: finalEdition,
      cuota_mensual_usd: cuotaMensualUsd,
      fecha_instalacion: fechaInstalacion,
      fecha_vencimiento_actual: fechaVencimientoActual,
      version_instalada: APP_VERSION,
      ultimo_contacto: new Date().toISOString(),
    };

    // Usar setDoc con merge: true para registrar los datos, cuota mensual y fecha de vencimiento en Firebase
    await setDoc(licenseRef, payload, { merge: true });
    console.log(`[Firebase] Auto-registro exitoso para '${targetDocId}':`, payload);

    return { success: true, fechaVencimientoActual, cuotaMensualUsd };
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
  datosInscritos?: boolean;
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
          datosInscritos: Boolean(fsRes.datosInscritos),
          message: "Esta licencia se encuentra suspendida administrativamente en el servidor remoto.",
        };
      }
      return {
        success: true,
        valid: true,
        license: lic,
        datosInscritos: Boolean(fsRes.datosInscritos),
        message: fsRes.datosInscritos
          ? `Licencia validada en la nube con todos los datos del comercio inscritos (${lic.nombre_negocio} • RIF: ${lic.rif_cedula}). Válida hasta ${lic.fecha_vencimiento_actual}.`
          : `Licencia validada en servidor en la nube. Válida hasta ${lic.fecha_vencimiento_actual}.`,
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
          rif_cedula: data.rif || "J-00000000-0",
          telefono_contacto: data.telefono || "",
          edicion_contratada: parseContractedEdition(data.edicion),
          cuota_mensual_usd: Number(data.cuotaUsd || 15),
          monto_instalacion_usd: 50,
          fecha_instalacion: data.fechaInstalacion || "2026-01-01",
          fecha_vencimiento_actual: data.fechaVencimiento || getDefault30DaysExpiry(),
          estado_remoto: isSuspended ? "SUSPENDIDO" : "ACTIVO",
          dias_gracia_offline_max: 30,
          ultimo_contacto_servidor: new Date().toISOString(),
          motivo_bloqueo: data.motivo || "",
        };
        const datosInscritos = hasLicenseCompleteBusinessData({
          nombre_negocio: data.nombreNegocio,
          rif_cedula: data.rif,
          telefono_contacto: data.telefono,
        });

        if (isSuspended) {
          return {
            success: true,
            valid: false,
            license: lic,
            datosInscritos,
            message: "Esta licencia se encuentra suspendida en Google Sheets.",
          };
        }

        return {
          success: true,
          valid: true,
          license: lic,
          datosInscritos,
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
      cuota_mensual_usd: isFiscal ? 25 : 15,
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
