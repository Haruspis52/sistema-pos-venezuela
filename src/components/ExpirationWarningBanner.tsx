import React, { useState } from "react";
import {
  AlertTriangle,
  Calendar,
  Smartphone,
  Copy,
  Check,
  Building2,
  Phone,
  CreditCard,
  MessageCircle,
  X,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { RemoteClientLicense, LicenseCheckResult } from "../types";
import { SOPORTE_WHATSAPP, PAGO_MOVIL_COBRO } from "../mockDb";

interface ExpirationWarningBannerProps {
  license: RemoteClientLicense;
  checkResult: LicenseCheckResult;
  bcvRate: number;
}

export const ExpirationWarningBanner: React.FC<ExpirationWarningBannerProps> = ({
  license,
  checkResult,
  bcvRate,
}) => {
  const [isDismissed, setIsDismissed] = useState(false);
  const [showDetails, setShowDetails] = useState(true);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Solo mostrar si está en estado POR_VENCER (≤ 5 días) o vencimiento próximo y no está bloqueante
  if (checkResult.bloqueante || isDismissed) return null;
  if (checkResult.diasRestantes > 5 && checkResult.status !== "POR_VENCER") return null;

  const cuotaUsd = license.cuota_mensual_usd;
  const cuotaVes = cuotaUsd * bcvRate;

  const copyToClipboard = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const whatsappMessage = encodeURIComponent(
    `Hola! Saludos de *${license.nombre_negocio}* (ID: ${license.cliente_id}). Adjunto comprobante de Pago Móvil Banesco por Bs. ${cuotaVes.toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ($${cuotaUsd} USD) para renovar la mensualidad antes de la fecha de corte. Muchas gracias.`
  );

  return (
    <div className="mb-4 rounded-2xl border-2 border-amber-500/80 bg-gradient-to-r from-amber-950/70 via-[#1f1a14] to-amber-950/70 p-4 shadow-xl shadow-amber-950/30 text-amber-100 animate-in fade-in duration-300">
      {/* Encabezado del Aviso */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/50 flex items-center justify-center text-amber-400 shrink-0 animate-pulse">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2 py-0.5 rounded-full bg-amber-500 text-slate-950 text-[10px] font-black uppercase font-mono tracking-wider">
                Próxima Fecha de Corte
              </span>
              <span className="text-xs font-bold text-amber-300 font-mono">
                {checkResult.diasRestantes === 0
                  ? "¡VENCE HOY!"
                  : checkResult.diasRestantes === 1
                  ? "¡Vence Mañana!"
                  : `Quedan ${checkResult.diasRestantes} días de servicio`}
              </span>
            </div>
            <p className="text-xs text-slate-200 mt-0.5">
              Su mensualidad de <strong>${cuotaUsd} USD</strong> (≈ Bs. {cuotaVes.toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}) vence el <strong>{license.fecha_vencimiento_actual}</strong>. Realice su Pago Móvil para evitar la suspensión automática.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="px-2.5 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 text-xs font-bold transition-all flex items-center gap-1"
            title="Ver/Ocultar datos de pago"
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{showDetails ? "Ocultar Datos" : "Ver Datos Pago Móvil"}</span>
            {showDetails ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>

          <button
            onClick={() => setIsDismissed(true)}
            className="p-1.5 rounded-lg text-amber-400/70 hover:text-white hover:bg-amber-900/40 transition-colors"
            title="Cerrar aviso temporalmente"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Tarjeta Desplegable con Datos de Pago Móvil Banesco */}
      {showDetails && (
        <div className="mt-3 pt-3 border-t border-amber-500/30 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            {/* Banco */}
            <div
              onClick={() => copyToClipboard(PAGO_MOVIL_COBRO.banco, "banco")}
              className="bg-[#12141c] hover:bg-[#161922] border border-amber-500/30 hover:border-amber-400 p-2.5 rounded-xl cursor-pointer transition-all flex flex-col justify-between group"
            >
              <div className="flex items-center justify-between text-[10px] text-amber-300/80 font-mono uppercase">
                <span className="flex items-center gap-1">
                  <Building2 className="w-3 h-3 text-amber-400" />
                  Banco
                </span>
                {copiedField === "banco" ? (
                  <span className="text-emerald-400 font-bold flex items-center gap-0.5">
                    <Check className="w-3 h-3" /> Copiado
                  </span>
                ) : (
                  <Copy className="w-3 h-3 text-slate-500 group-hover:text-amber-400" />
                )}
              </div>
              <div className="text-xs font-bold text-white mt-1 font-mono">
                {PAGO_MOVIL_COBRO.banco}
              </div>
            </div>

            {/* Teléfono */}
            <div
              onClick={() => copyToClipboard(PAGO_MOVIL_COBRO.telefono, "telefono")}
              className="bg-[#12141c] hover:bg-[#161922] border border-amber-500/30 hover:border-amber-400 p-2.5 rounded-xl cursor-pointer transition-all flex flex-col justify-between group"
            >
              <div className="flex items-center justify-between text-[10px] text-amber-300/80 font-mono uppercase">
                <span className="flex items-center gap-1">
                  <Phone className="w-3 h-3 text-amber-400" />
                  Teléfono
                </span>
                {copiedField === "telefono" ? (
                  <span className="text-emerald-400 font-bold flex items-center gap-0.5">
                    <Check className="w-3 h-3" /> Copiado
                  </span>
                ) : (
                  <Copy className="w-3 h-3 text-slate-500 group-hover:text-amber-400" />
                )}
              </div>
              <div className="text-xs font-bold text-amber-300 mt-1 font-mono">
                {PAGO_MOVIL_COBRO.telefono}
              </div>
            </div>

            {/* Cédula */}
            <div
              onClick={() => copyToClipboard(PAGO_MOVIL_COBRO.cedulaNum, "cedula")}
              className="bg-[#12141c] hover:bg-[#161922] border border-amber-500/30 hover:border-amber-400 p-2.5 rounded-xl cursor-pointer transition-all flex flex-col justify-between group"
            >
              <div className="flex items-center justify-between text-[10px] text-amber-300/80 font-mono uppercase">
                <span className="flex items-center gap-1">
                  <CreditCard className="w-3 h-3 text-amber-400" />
                  C.I. / RIF
                </span>
                {copiedField === "cedula" ? (
                  <span className="text-emerald-400 font-bold flex items-center gap-0.5">
                    <Check className="w-3 h-3" /> Copiado
                  </span>
                ) : (
                  <Copy className="w-3 h-3 text-slate-500 group-hover:text-amber-400" />
                )}
              </div>
              <div className="text-xs font-bold text-white mt-1 font-mono">
                {PAGO_MOVIL_COBRO.cedula}
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-2 pt-1 text-xs">
            <div className="text-slate-300 text-[11px]">
              Monto a transferir: <strong className="text-amber-300 font-mono">${cuotaUsd} USD</strong> (Bs. {cuotaVes.toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}) a tasa BCV Bs. {bcvRate.toFixed(2)}
            </div>
            <a
              href={`https://wa.me/${SOPORTE_WHATSAPP.replace(/[^0-9]/g, "")}?text=${whatsappMessage}`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 shadow-md"
            >
              <MessageCircle className="w-3.5 h-3.5" />
              <span>Notificar Pago por WhatsApp</span>
            </a>
          </div>
        </div>
      )}
    </div>
  );
};
