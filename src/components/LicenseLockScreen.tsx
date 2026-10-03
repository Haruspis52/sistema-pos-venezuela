import React, { useState } from "react";
import {
  ShieldAlert,
  AlertOctagon,
  Phone,
  MessageCircle,
  Calendar,
  Lock,
  CheckCircle2,
  Copy,
  Check,
  Smartphone,
  CreditCard,
  Building2,
  DollarSign,
  RefreshCw,
  AlertCircle,
} from "lucide-react";
import {
  RemoteClientLicense,
  LicenseCheckResult,
} from "../types";
import { SOPORTE_WHATSAPP, PAGO_MOVIL_COBRO } from "../mockDb";

interface LicenseLockScreenProps {
  license: RemoteClientLicense;
  checkResult: LicenseCheckResult;
  bcvRate: number;
  onSimulatePayment: () => void;
  onRetryVerification?: () => Promise<{ success: boolean; message: string }>;
}

export const LicenseLockScreen: React.FC<LicenseLockScreenProps> = ({
  license,
  checkResult,
  bcvRate,
  onSimulatePayment,
  onRetryVerification,
}) => {
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState<boolean>(false);
  const [verifyFeedback, setVerifyFeedback] = useState<{
    type: "success" | "error" | "info";
    text: string;
  } | null>(null);

  const isSuspended = license.estado_remoto === "SUSPENDIDO";
  const cuotaUsd = license.cuota_mensual_usd;
  const cuotaVes = cuotaUsd * bcvRate;

  const copyToClipboard = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleRunVerification = async () => {
    if (!onRetryVerification) {
      return;
    }
    setIsVerifying(true);
    setVerifyFeedback({
      type: "info",
      text: "Consultando estado en tu base de datos remota en Google Sheets...",
    });

    try {
      const result = await onRetryVerification();
      if (result.success) {
        setVerifyFeedback({
          type: "success",
          text: result.message || "¡Pago verificado y validado! Desbloqueando sistema...",
        });
      } else {
        setVerifyFeedback({
          type: "error",
          text: result.message || "Aún figura como pendiente/suspendido en el servidor.",
        });
      }
    } catch (e: any) {
      setVerifyFeedback({
        type: "error",
        text: e?.message || "No se pudo contactar a la base de datos remota.",
      });
    } finally {
      setIsVerifying(false);
    }
  };

  const whatsappMessage = encodeURIComponent(
    `Hola! Saludos de *${license.nombre_negocio}* (ID: ${license.cliente_id}). Adjunto comprobante de Pago Móvil Banesco por Bs. ${cuotaVes.toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ($${cuotaUsd} USD) para la mensualidad del sistema POS. Por favor reactivar el servicio.`
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-lg animate-in fade-in duration-300 select-none">
      <div className="bg-[#12141c] border-2 border-rose-600/80 rounded-3xl w-full max-w-2xl shadow-2xl shadow-rose-950/50 overflow-hidden flex flex-col max-h-[95vh] overflow-y-auto">
        {/* Banner Superior Rojo de Alerta */}
        <div className="bg-gradient-to-r from-rose-950 via-rose-900 to-rose-950 p-6 border-b border-rose-800/80 text-white relative shrink-0">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-rose-600/30 border-2 border-rose-500/80 flex items-center justify-center text-rose-300 shadow-xl shrink-0">
              {isSuspended ? (
                <ShieldAlert className="w-8 h-8 text-rose-400 animate-pulse" />
              ) : (
                <AlertOctagon className="w-8 h-8 text-rose-400 animate-bounce" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2.5 py-0.5 rounded-full bg-rose-500 text-slate-950 font-black text-xs uppercase tracking-wider font-mono">
                  {isSuspended ? "SUSPENSIÓN ADMINISTRATIVA" : "MENSUALIDAD VENCIDA"}
                </span>
                <span className="text-xs font-mono text-rose-200">
                  ID: <strong>{license.cliente_id}</strong>
                </span>
              </div>
              <h2 className="text-xl font-bold text-white mt-1 tracking-tight">
                Acceso al Sistema Temporalmente Inhabilitado
              </h2>
              <p className="text-xs text-rose-200/90 mt-0.5">
                {license.nombre_negocio} ({license.rif_cedula})
              </p>
            </div>
          </div>
        </div>

        {/* Cuerpo Principal del Bloqueo */}
        <div className="p-6 space-y-5 bg-[#141620]">
          {/* Tarjeta de Resumen de la Deuda */}
          <div className="bg-[#1b1e2c] border border-slate-700/80 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="space-y-1 text-center sm:text-left">
              <span className="text-[11px] text-slate-400 uppercase font-mono tracking-wider font-bold">
                Monto de la Mensualidad ({license.edicion_contratada === "bodega" ? "Edición Bodega" : "Edición Fiscal"})
              </span>
              <div className="flex items-baseline gap-2 justify-center sm:justify-start">
                <span className="text-2xl font-black text-amber-400">
                  ${cuotaUsd.toFixed(2)} USD
                </span>
                <span className="text-base font-bold text-emerald-400 font-mono">
                  ≈ Bs. {cuotaVes.toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Tasa Oficial BCV: Bs. {bcvRate.toFixed(2)} / USD
              </p>
            </div>

            <div className="text-center sm:text-right bg-rose-950/50 border border-rose-800/60 px-4 py-2.5 rounded-xl">
              <span className="text-[10px] text-rose-300 font-mono uppercase tracking-wider block">
                Fecha de Corte Expirada
              </span>
              <span className="text-sm font-bold text-white font-mono flex items-center gap-1.5 justify-center sm:justify-end mt-0.5">
                <Calendar className="w-3.5 h-3.5 text-rose-400" />
                {license.fecha_vencimiento_actual}
              </span>
            </div>
          </div>

          {/* DATOS DE PAGO MÓVIL BANESCO DESTACADOS */}
          <div className="bg-gradient-to-br from-[#181d2c] via-[#1a1f30] to-[#151824] border-2 border-emerald-500/50 rounded-2xl p-4 shadow-xl">
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-700/80">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
                  <Smartphone className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider font-mono flex items-center gap-2">
                    <span>Datos para Pago Móvil</span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 font-normal">
                      Reactivación Inmediata
                    </span>
                  </h4>
                  <p className="text-[11px] text-slate-400">Realice el pago en Bolívares a la tasa BCV del día:</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {/* Banco */}
              <div
                onClick={() => copyToClipboard(PAGO_MOVIL_COBRO.banco, "banco")}
                className="bg-[#0f1118] hover:bg-[#131722] border border-slate-700/80 hover:border-emerald-500/50 p-3 rounded-xl cursor-pointer transition-all flex flex-col justify-between group"
              >
                <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono uppercase">
                  <span className="flex items-center gap-1">
                    <Building2 className="w-3 h-3 text-emerald-400" />
                    Banco
                  </span>
                  {copiedField === "banco" ? (
                    <span className="text-emerald-400 font-bold flex items-center gap-0.5">
                      <Check className="w-3 h-3" /> Copiado
                    </span>
                  ) : (
                    <Copy className="w-3 h-3 text-slate-500 group-hover:text-emerald-400" />
                  )}
                </div>
                <div className="text-xs font-bold text-white mt-1 font-mono">
                  {PAGO_MOVIL_COBRO.banco}
                </div>
              </div>

              {/* Teléfono */}
              <div
                onClick={() => copyToClipboard(PAGO_MOVIL_COBRO.telefono, "telefono")}
                className="bg-[#0f1118] hover:bg-[#131722] border border-slate-700/80 hover:border-emerald-500/50 p-3 rounded-xl cursor-pointer transition-all flex flex-col justify-between group"
              >
                <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono uppercase">
                  <span className="flex items-center gap-1">
                    <Phone className="w-3 h-3 text-emerald-400" />
                    Teléfono
                  </span>
                  {copiedField === "telefono" ? (
                    <span className="text-emerald-400 font-bold flex items-center gap-0.5">
                      <Check className="w-3 h-3" /> Copiado
                    </span>
                  ) : (
                    <Copy className="w-3 h-3 text-slate-500 group-hover:text-emerald-400" />
                  )}
                </div>
                <div className="text-xs font-bold text-emerald-300 mt-1 font-mono">
                  {PAGO_MOVIL_COBRO.telefono}
                </div>
              </div>

              {/* Cédula */}
              <div
                onClick={() => copyToClipboard(PAGO_MOVIL_COBRO.cedulaNum, "cedula")}
                className="bg-[#0f1118] hover:bg-[#131722] border border-slate-700/80 hover:border-emerald-500/50 p-3 rounded-xl cursor-pointer transition-all flex flex-col justify-between group"
              >
                <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono uppercase">
                  <span className="flex items-center gap-1">
                    <CreditCard className="w-3 h-3 text-emerald-400" />
                    C.I. / RIF
                  </span>
                  {copiedField === "cedula" ? (
                    <span className="text-emerald-400 font-bold flex items-center gap-0.5">
                      <Check className="w-3 h-3" /> Copiado
                    </span>
                  ) : (
                    <Copy className="w-3 h-3 text-slate-500 group-hover:text-emerald-400" />
                  )}
                </div>
                <div className="text-xs font-bold text-white mt-1 font-mono">
                  {PAGO_MOVIL_COBRO.cedula}
                </div>
              </div>
            </div>
          </div>

          {/* Mensaje Informativo de Seguridad */}
          <div className="bg-amber-950/30 border border-amber-500/30 rounded-2xl p-3.5 text-xs text-amber-200/90 leading-relaxed flex items-start gap-3">
            <Lock className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-amber-300">
                Sus datos e inventario se encuentran completamente resguardados.
              </p>
              <p className="text-slate-300 text-[11px] mt-0.5">
                Una vez realizado el Pago Móvil, el administrador activará el servicio en la base de datos central. No es necesario reiniciar la computadora.
              </p>
            </div>
          </div>

          {/* Feedback de Verificación en Vivo */}
          {verifyFeedback && (
            <div
              className={`p-3.5 rounded-xl border text-xs flex items-start gap-2.5 transition-all animate-in fade-in duration-200 ${
                verifyFeedback.type === "success"
                  ? "bg-emerald-950/80 border-emerald-500 text-emerald-200"
                  : verifyFeedback.type === "error"
                  ? "bg-rose-950/80 border-rose-500 text-rose-200"
                  : "bg-blue-950/80 border-blue-500 text-blue-200"
              }`}
            >
              {verifyFeedback.type === "success" ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              ) : verifyFeedback.type === "error" ? (
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              ) : (
                <RefreshCw className="w-4 h-4 text-blue-400 shrink-0 mt-0.5 animate-spin" />
              )}
              <div className="flex-1 font-mono text-[11px] leading-relaxed">
                {verifyFeedback.text}
              </div>
            </div>
          )}

          {/* BOTÓN PRINCIPAL: OPCIÓN 1 - REINTENTAR VERIFICACIÓN SIN CERRAR EL PROGRAMA */}
          <div className="space-y-2.5 pt-1">
            <button
              onClick={handleRunVerification}
              disabled={isVerifying}
              className="w-full py-4 px-6 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-500 hover:to-indigo-600 active:scale-[0.99] text-white rounded-2xl text-sm font-black transition-all flex items-center justify-center gap-3 shadow-xl shadow-blue-950/60 border border-blue-400/40 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed group"
            >
              <RefreshCw
                className={`w-5 h-5 text-blue-200 transition-transform duration-500 ${
                  isVerifying ? "animate-spin" : "group-hover:rotate-180"
                }`}
              />
              <div className="text-left sm:text-center">
                <span className="block text-sm">
                  {isVerifying ? "Consultando Base de Datos..." : "Reintentar Verificación Ahora"}
                </span>
                <span className="block text-[10px] font-normal text-blue-200/90 font-sans">
                  Consulta tu Google Sheets al instante sin necesidad de cerrar el programa
                </span>
              </div>
            </button>

            {/* Botón secundario: WhatsApp */}
            <div className="w-full">
              <a
                href={`https://wa.me/${SOPORTE_WHATSAPP.replace(/[^0-9]/g, "")}?text=${whatsappMessage}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-3.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-md shadow-emerald-950/40"
              >
                <MessageCircle className="w-4 h-4 shrink-0" />
                <span>Enviar Comprobante por WhatsApp</span>
              </a>
            </div>
          </div>
        </div>

        {/* Footer con info de soporte */}
        <div className="bg-[#0e1017] px-6 py-3.5 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] text-slate-400 font-mono shrink-0">
          <div className="flex items-center gap-2">
            <Phone className="w-3.5 h-3.5 text-emerald-400" />
            <span>Soporte &amp; Cobranzas: <strong className="text-white">{PAGO_MOVIL_COBRO.telefono}</strong> (Banesco C.I. {PAGO_MOVIL_COBRO.cedulaNum})</span>
          </div>
          <div className="text-slate-500 text-[10px]">
            Reactivación remota al validar comprobante
          </div>
        </div>
      </div>
    </div>
  );
};
