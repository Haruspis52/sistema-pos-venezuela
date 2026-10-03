import React, { useState } from "react";
import {
  CreditCard,
  Store,
  ShieldCheck,
  Calendar,
  CheckCircle2,
  X,
  MessageCircle,
  ExternalLink,
  RefreshCw,
  Phone,
  FileSpreadsheet,
  Copy,
  Check,
  Smartphone,
  DollarSign,
  AlertCircle,
  Clock,
} from "lucide-react";
import { RemoteClientLicense, LicenseCheckResult } from "../types";
import {
  checkClientLicenseStatus,
  saveRemoteLicense,
  getRemoteLicense,
  parseFlexibleDate,
} from "../mockDb";

interface SubscriptionInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
  clientLicense: RemoteClientLicense;
  onUpdateLicense: (license: RemoteClientLicense) => void;
  showToast: (msg: string) => void;
  currentEdition: "bodega" | "fiscal";
  bcvRate?: number;
}

export const SubscriptionInfoModal: React.FC<SubscriptionInfoModalProps> = ({
  isOpen,
  onClose,
  clientLicense,
  onUpdateLicense,
  showToast,
  currentEdition,
  bcvRate = 36.5,
}) => {
  const [isSyncing, setIsSyncing] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [syncResult, setSyncResult] = useState<{
    success: boolean;
    message: string;
    timestamp?: string;
  } | null>(null);

  if (!isOpen) return null;

  const licenseStatus: LicenseCheckResult = checkClientLicenseStatus(clientLicense);
  const diasRestantes = licenseStatus.diasRestantes;

  // Montos de suscripción según la edición
  const montoUsd = currentEdition === "bodega" ? 15 : 30;
  const montoVes = montoUsd * bcvRate;

  // Datos de Pago Móvil requeridos
  const PAGO_MOVIL = {
    cedula: "30988249",
    telefono: "04129264885",
    banco: "Banesco (0134)",
    numeroReporte: "04129264885",
  };

  const handleCopy = (text: string, fieldId: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldId);
    setTimeout(() => setCopiedField(null), 2000);
    showToast(`✅ ${label} copiado: ${text}`);
  };

  // Format date in Spanish
  const formatDateES = (dateStr: string) => {
    try {
      const d = parseFlexibleDate(dateStr);
      if (d) {
        return d.toLocaleDateString("es-VE", {
          year: "numeric",
          month: "long",
          day: "numeric",
        });
      }
    } catch {
      // Fallback
    }
    return dateStr;
  };

  // Google Sheets Online Sync Handler
  const handleSyncWithGoogleSheets = async () => {
    setIsSyncing(true);
    setSyncResult(null);

    try {
      const res = await fetch(
        `/api/license/sync?clienteId=${encodeURIComponent(clientLicense.cliente_id)}`
      );

      if (res.ok) {
        const data = await res.json();
        if (data.found) {
          const updated: RemoteClientLicense = {
            ...clientLicense,
            estado_remoto: data.estado || clientLicense.estado_remoto,
            fecha_vencimiento_actual:
              data.fechaVencimiento || clientLicense.fecha_vencimiento_actual,
            nombre_negocio: data.nombreNegocio || clientLicense.nombre_negocio,
            cuota_mensual_usd: data.cuotaUsd || clientLicense.cuota_mensual_usd,
            edicion_contratada: data.edicion || clientLicense.edicion_contratada,
            motivo_bloqueo: data.motivo || "",
            ultimo_contacto_servidor: new Date().toISOString(),
          };

          onUpdateLicense(updated);
          saveRemoteLicense(updated);

          const newCheck = checkClientLicenseStatus(updated);
          setSyncResult({
            success: true,
            message: `¡Estado sincronizado con Google Sheets! Quedan ${newCheck.diasRestantes} días de vigencia (Hasta: ${formatDateES(
              updated.fecha_vencimiento_actual
            )}).`,
            timestamp: new Date().toLocaleTimeString(),
          });
          showToast(
            `✅ ¡Licencia sincronizada con Google Sheets! ${newCheck.diasRestantes} días restantes.`
          );
        } else {
          setSyncResult({
            success: false,
            message:
              data.message ||
              `El ID de cliente '${clientLicense.cliente_id}' no fue encontrado en la hoja de Google Sheets.`,
            timestamp: new Date().toLocaleTimeString(),
          });
          showToast(`⚠️ No se encontró el ID en Google Sheets.`);
        }
      } else {
        const currentStored = getRemoteLicense();
        const check = checkClientLicenseStatus(currentStored);
        setSyncResult({
          success: true,
          message: `Suscripción verificada en caché local: ${check.diasRestantes} días de vigencia activos.`,
          timestamp: new Date().toLocaleTimeString(),
        });
        showToast("ℹ️ Suscripción activa en servidor local.");
      }
    } catch (err: any) {
      const currentStored = getRemoteLicense();
      const check = checkClientLicenseStatus(currentStored);
      setSyncResult({
        success: true,
        message: `Suscripción validada localmente: ${check.diasRestantes} días de vigencia activos.`,
        timestamp: new Date().toLocaleTimeString(),
      });
      showToast("ℹ️ Suscripción activa en servidor local.");
    } finally {
      setIsSyncing(false);
    }
  };

  const whatsappLink = `https://wa.me/584129264885?text=${encodeURIComponent(
    `Hola, adjunto el comprobante de Pago Móvil de la suscripción del Sistema POS:\n\n• Negocio: ${clientLicense.nombre_negocio || "Comercio"}\n• RIF: ${clientLicense.rif_cedula || "N/A"}\n• Edición: ${currentEdition === "bodega" ? "Bodega y Mostrador" : "Fiscal SENIAT"}\n• Monto Pagado: $${montoUsd} USD (Bs. ${montoVes.toFixed(2)})\n• ID Licencia: ${clientLicense.cliente_id}\n\nPor favor registrar la acreditación en el sistema. ¡Gracias!`
  )}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-[#12151d] border border-slate-700/80 rounded-2xl w-full max-w-2xl shadow-2xl text-slate-100 overflow-hidden my-auto flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-950 via-[#151c20] to-[#12151d] p-5 sm:p-6 border-b border-emerald-900/40 relative shrink-0">
          <button
            onClick={onClose}
            className="absolute right-4 top-4 text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
            aria-label="Cerrar modal"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shadow-lg shadow-emerald-950/50 shrink-0">
              <CreditCard className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg sm:text-xl font-extrabold text-white tracking-tight">
                  Información de Suscripción & Licencia
                </h2>
                <span className="text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-500/50 uppercase flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  {licenseStatus.status}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Estado de la licencia, tarifas por edición y datos oficiales de Pago Móvil.
              </p>
            </div>
          </div>
        </div>

        {/* Modal Body: Las 3 Tarjetas Requeridas */}
        <div className="p-5 sm:p-6 space-y-4 overflow-y-auto flex-1 min-h-0 text-xs text-slate-300">
          {/* ================================================================= */}
          {/* TARJETA 1: Edición del Cliente, Días Restantes y Fecha de Corte */}
          {/* ================================================================= */}
          <div className="bg-gradient-to-br from-[#161a24] to-[#11131a] p-4 sm:p-5 rounded-2xl border border-slate-800 shadow-inner space-y-4">
            <div className="flex items-center justify-between gap-2 pb-2 border-b border-slate-800/80">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-emerald-400" />
                1. Estado de la Licencia & Vigencia
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950/80 border border-emerald-700/50 text-emerald-300 font-bold">
                ✓ Activa
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Edición que posee */}
              <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800">
                <span className="text-[10px] uppercase font-bold text-slate-500 block mb-1">
                  Edición que Posee
                </span>
                <div className="font-bold text-white text-xs flex items-center gap-1.5">
                  {currentEdition === "bodega" ? (
                    <>
                      <Store className="w-4 h-4 text-amber-400 shrink-0" />
                      <span className="text-amber-300">Edición Bodega</span>
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="w-4 h-4 text-blue-400 shrink-0" />
                      <span className="text-blue-300">Edición Fiscal SENIAT</span>
                    </>
                  )}
                </div>
                <div className="text-[10px] text-slate-400 mt-1">
                  {currentEdition === "bodega" ? "Mostrador & Fiados" : "Prov. 00071 & Kardex"}
                </div>
              </div>

              {/* Días Restantes */}
              <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800 flex flex-col justify-between">
                <span className="text-[10px] uppercase font-bold text-slate-500 block mb-1">
                  Días Restantes
                </span>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-2xl font-black text-emerald-400 font-mono tabular-nums leading-none">
                    {diasRestantes}
                  </span>
                  <span className="text-[11px] font-semibold text-slate-300">
                    {diasRestantes === 1 ? "día" : "días"}
                  </span>
                </div>
                <div className="text-[10px] text-emerald-400/80 font-medium mt-1">
                  Vigencia en curso
                </div>
              </div>

              {/* Fecha de Corte */}
              <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800 flex flex-col justify-between">
                <span className="text-[10px] uppercase font-bold text-slate-500 block mb-1">
                  Fecha de Corte
                </span>
                <div className="font-bold text-white text-xs font-mono">
                  {formatDateES(clientLicense.fecha_vencimiento_actual)}
                </div>
                <div className="text-[10px] text-slate-400 mt-1">
                  Próxima renovación
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
              <span>Comercio: <strong>{clientLicense.nombre_negocio || "Mi Negocio"}</strong></span>
              <span className="font-mono">RIF: {clientLicense.rif_cedula || "J-00000000-0"}</span>
            </div>
          </div>

          {/* ================================================================= */}
          {/* TARJETA 2: Datos de Pago Móvil y Tarifa Mensual (USD + Tasa BCV) */}
          {/* ================================================================= */}
          <div className="bg-[#151922] p-4 sm:p-5 rounded-2xl border border-slate-800 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-800/80">
              <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <Smartphone className="w-3.5 h-3.5 text-blue-400" />
                2. Datos Oficiales para Pago Móvil
              </span>

              {/* Monto de la suscripción según edición */}
              <div className="flex items-center gap-2 bg-blue-950/60 border border-blue-700/50 px-2.5 py-1 rounded-lg">
                <span className="text-[10px] text-slate-300 font-semibold">
                  Monto Mensual ({currentEdition === "bodega" ? "Bodega" : "Fiscal"}):
                </span>
                <span className="font-extrabold text-blue-300 font-mono text-xs">
                  ${montoUsd} USD
                </span>
                <span className="text-slate-500">·</span>
                <span className="font-bold text-amber-300 font-mono text-xs">
                  Bs. {montoVes.toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            <p className="text-[11px] text-slate-400">
              Tarifa fijada: <strong>15$ Edición Bodega</strong> / <strong>30$ Edición Fiscal</strong> calculada a la Tasa Oficial BCV del día (<strong>Bs. {bcvRate.toFixed(2)}</strong>).
            </p>

            {/* Grid de 3 campos copiables */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Cédula */}
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">Cédula</span>
                  <span className="font-mono text-xs font-bold text-white tracking-wide">
                    {PAGO_MOVIL.cedula}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => handleCopy(PAGO_MOVIL.cedula, "cedula", "Cédula")}
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
                  title="Copiar Cédula"
                >
                  {copiedField === "cedula" ? (
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>

              {/* Teléfono */}
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">Teléfono</span>
                  <span className="font-mono text-xs font-bold text-white tracking-wide">
                    {PAGO_MOVIL.telefono}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => handleCopy(PAGO_MOVIL.telefono, "telefono", "Teléfono")}
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
                  title="Copiar Teléfono"
                >
                  {copiedField === "telefono" ? (
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>

              {/* Banco */}
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">Banco</span>
                  <span className="font-mono text-xs font-bold text-white tracking-wide">
                    {PAGO_MOVIL.banco}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => handleCopy("0134", "banco", "Código de Banco Banesco")}
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
                  title="Copiar Código 0134"
                >
                  {copiedField === "banco" ? (
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* ================================================================= */}
          {/* TARJETA 3: Reporte de Pago (04129264885) & Sincronización Sheets */}
          {/* ================================================================= */}
          <div className="bg-[#141720] p-4 sm:p-5 rounded-2xl border border-slate-800 space-y-4">
            <div className="flex items-center justify-between gap-2 pb-2 border-b border-slate-800/80">
              <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <MessageCircle className="w-3.5 h-3.5 text-emerald-400" />
                3. Reporte de Pago & Comprobación
              </span>
              <span className="text-[11px] font-mono text-emerald-400 font-bold">
                WhatsApp: {PAGO_MOVIL.numeroReporte}
              </span>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div className="space-y-0.5">
                <p className="text-xs text-white font-semibold">
                  Notificar al WhatsApp oficial ({PAGO_MOVIL.numeroReporte}):
                </p>
                <p className="text-[11px] text-slate-400">
                  Envíe su captura de Pago Móvil para que el administrador actualice la fecha en Google Sheets.
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <a
                  href={whatsappLink}
                  target="_blank"
                  rel="noreferrer"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs transition flex items-center justify-center gap-1.5 shadow-md shadow-emerald-950/50 cursor-pointer"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>Notificar Pago</span>
                  <ExternalLink className="w-3 h-3" />
                </a>

                <button
                  type="button"
                  onClick={handleSyncWithGoogleSheets}
                  disabled={isSyncing}
                  className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-200 hover:text-white font-semibold rounded-xl text-xs transition flex items-center gap-1.5 border border-slate-700 cursor-pointer"
                  title="Comprobar si el administrador ya actualizó la fecha de la licencia"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? "animate-spin text-emerald-400" : ""}`} />
                  <span>{isSyncing ? "Comprobando..." : "Comprobar Licencia"}</span>
                </button>
              </div>
            </div>

            {syncResult && (
              <div
                className={`p-3 rounded-xl border text-xs flex items-start gap-2 animate-in fade-in duration-150 ${
                  syncResult.success
                    ? "bg-emerald-950/40 border-emerald-700/60 text-emerald-200"
                    : "bg-amber-950/40 border-amber-700/60 text-amber-200"
                }`}
              >
                {syncResult.success ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                )}
                <div>
                  <div>{syncResult.message}</div>
                  {syncResult.timestamp && (
                    <div className="text-[10px] opacity-75 mt-0.5">
                      Hora de comprobación: {syncResult.timestamp}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-[#0f1118] border-t border-slate-800 flex items-center justify-between text-xs text-slate-400 shrink-0">
          <div className="flex items-center gap-2 font-mono text-[11px]">
            <span>ID de Licencia:</span>
            <span className="px-2 py-0.5 rounded bg-blue-950/80 border border-blue-500/40 text-blue-300 font-bold font-mono">
              {clientLicense.cliente_id}
            </span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white font-semibold rounded-xl transition cursor-pointer"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
