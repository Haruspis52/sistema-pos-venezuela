import React, { useState, useEffect } from "react";
import {
  Store,
  ShieldCheck,
  Sparkles,
  Check,
  ArrowRight,
  X,
  Building2,
  Receipt,
  Users,
  Calculator,
  KeyRound,
  Lock,
  AlertCircle,
} from "lucide-react";
import { isFiscalEditionUnlocked, unlockFiscalEdition } from "../mockDb";

interface EditionSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentEdition: "bodega" | "fiscal";
  onSelectEdition: (edition: "bodega" | "fiscal") => void;
  isFirstRun?: boolean;
}

export const EditionSelectorModal: React.FC<EditionSelectorModalProps> = ({
  isOpen,
  onClose,
  currentEdition,
  onSelectEdition,
  isFirstRun = false,
}) => {
  const [showCodePrompt, setShowCodePrompt] = useState(false);
  const [codeInput, setCodeInput] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setShowCodePrompt(false);
      setCodeInput("");
      setErrorMsg(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSelectBodega = () => {
    onSelectEdition("bodega");
    onClose();
  };

  const handleSelectFiscal = () => {
    if (isFiscalEditionUnlocked()) {
      onSelectEdition("fiscal");
      onClose();
    } else {
      setShowCodePrompt(true);
      setCodeInput("");
      setErrorMsg(null);
    }
  };

  const handleValidateFiscalCode = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const clean = codeInput.trim();
    if (!clean) {
      setErrorMsg("Ingrese el código de activación fiscal.");
      return;
    }

    const res = unlockFiscalEdition(clean);
    if (res.success) {
      onSelectEdition("fiscal");
      setShowCodePrompt(false);
      setCodeInput("");
      setErrorMsg(null);
      onClose();
    } else {
      setErrorMsg("Código incorrecto. Debe ingresar el código de administración para activar la Edición Fiscal.");
      setCodeInput("");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-[#12141c] border border-slate-700/80 rounded-2xl w-full max-w-3xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#171a24] via-[#1a1e2b] to-[#171a24] p-6 border-b border-slate-800 relative">
          {!isFirstRun && (
            <button
              onClick={onClose}
              className="absolute right-4 top-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          )}

          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500 via-blue-600 to-indigo-600 flex items-center justify-center text-2xl shadow-lg shadow-blue-900/30">
              🇻🇪
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-xl font-bold text-white tracking-tight">
                  {isFirstRun ? "¡Bienvenido a su Sistema POS!" : "Modalidad de Operación del Comercio"}
                </h2>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-700/60 font-mono">
                  Ambas Ediciones Habilitadas
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Seleccione el modo de trabajo adecuado para su negocio. Puede alternar entre ambas modalidades en cualquier momento.
              </p>
            </div>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6">
          {/* Two Options Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Card 1: Bodega Edition */}
            <div
              onClick={handleSelectBodega}
              className={`cursor-pointer rounded-2xl p-5 border transition-all flex flex-col justify-between relative group ${
                currentEdition === "bodega"
                  ? "bg-gradient-to-b from-amber-950/40 via-[#181615] to-[#12141c] border-amber-500 shadow-xl shadow-amber-950/30 ring-2 ring-amber-500/20"
                  : "bg-[#151720] border-slate-800 hover:border-amber-500/50 hover:bg-[#181b26]"
              }`}
            >
              {currentEdition === "bodega" && (
                <div className="absolute -top-3 right-4 px-2.5 py-0.5 rounded-full bg-amber-500 text-slate-950 text-[10px] font-black uppercase tracking-wider flex items-center gap-1 shadow-md">
                  <Check className="w-3 h-3 stroke-[3]" />
                  Edición en Uso
                </div>
              )}

              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
                    <Store className="w-5 h-5" />
                  </div>
                  <span className="text-[11px] font-bold text-amber-300 bg-amber-950/60 px-2 py-0.5 rounded-md border border-amber-800/50 font-mono flex items-center gap-1">
                    <Check className="w-3 h-3 text-emerald-400" />
                    <span>Activo & Disponible</span>
                  </span>
                </div>

                <h3 className="text-base font-bold text-white group-hover:text-amber-300 transition-colors">
                  🏪 Edición Bodega y Mostrador
                </h3>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  Ideal para atención rápida en caja, cobros rápidos en divisas y bolívares, y control de libreta de fiados comunitaria.
                </p>

                <div className="mt-4 space-y-2 border-t border-slate-800/80 pt-3 text-xs">
                  <div className="flex items-center gap-2 text-slate-300">
                    <div className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                    <span><strong>Calculadora de Vuelto Dual:</strong> Vuelto en Bs. y en $ al instante.</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-300">
                    <div className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                    <span><strong>Libreta de Fiados:</strong> Registro por cliente y pagos vía WhatsApp.</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-300">
                    <div className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                    <span><strong>Cierre de Caja Rápido:</strong> Conteo de billetes $ y Pago Móvil.</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-300">
                    <div className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                    <span><strong>Facturas de Proveedor:</strong> Carga de inventario automática.</span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                className={`mt-5 w-full py-2.5 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                  currentEdition === "bodega"
                    ? "bg-amber-500 text-slate-950 hover:bg-amber-400 shadow-md"
                    : "bg-slate-800 text-slate-200 hover:bg-amber-500 hover:text-slate-950"
                }`}
              >
                <span>{currentEdition === "bodega" ? "Continuar en Modo Bodega" : "Activar Edición Bodega"}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Card 2: Fiscal SENIAT Edition */}
            <div
              onClick={handleSelectFiscal}
              className={`cursor-pointer rounded-2xl p-5 border transition-all flex flex-col justify-between relative group ${
                currentEdition === "fiscal"
                  ? "bg-gradient-to-b from-blue-950/40 via-[#151824] to-[#12141c] border-blue-500 shadow-xl shadow-blue-950/30 ring-2 ring-blue-500/20"
                  : "bg-[#151720] border-slate-800 hover:border-blue-500/50 hover:bg-[#181b26]"
              }`}
            >
              {currentEdition === "fiscal" && (
                <div className="absolute -top-3 right-4 px-2.5 py-0.5 rounded-full bg-blue-500 text-white text-[10px] font-black uppercase tracking-wider flex items-center gap-1 shadow-md">
                  <Check className="w-3 h-3 stroke-[3]" />
                  Edición en Uso
                </div>
              )}

              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-500/20 border border-blue-500/40 flex items-center justify-center text-blue-400">
                    <ShieldCheck className="w-5 h-5" />
                  </div>

                  <span className="text-[11px] font-bold text-emerald-300 bg-emerald-950/60 px-2 py-0.5 rounded-md border border-emerald-800/50 font-mono flex items-center gap-1">
                    <Check className="w-3 h-3 text-emerald-400" />
                    <span>Cumplimiento Legal Total</span>
                  </span>
                </div>

                <h3 className="text-base font-bold text-white group-hover:text-blue-300 transition-colors flex items-center gap-2">
                  <span>🏢 Edición Fiscal SENIAT</span>
                </h3>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  Para comercios que emiten facturas formales (Prov. 00071), llevan Libro de Ventas mensual y Kardex PMP Art. 177.
                </p>

                <div className="mt-4 space-y-2 border-t border-slate-800/80 pt-3 text-xs">
                  <div className="flex items-center gap-2 text-slate-300">
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                    <span><strong>Providencia SNAT/00071:</strong> N° Factura, Control y RIF cliente.</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-300">
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                    <span><strong>Libro de Ventas Fiscal:</strong> Reporte mensual exportable en Excel/PDF.</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-300">
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                    <span><strong>Kardex Art. 177 LISLR:</strong> Costo Promedio Ponderado (PMP).</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-300">
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                    <span><strong>Percepción IGTF 3%:</strong> Discriminación de IVA 16% y exentos.</span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                className={`mt-5 w-full py-2.5 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                  currentEdition === "fiscal"
                    ? "bg-blue-600 text-white hover:bg-blue-500 shadow-md"
                    : "bg-slate-800 text-slate-200 hover:bg-blue-600 hover:text-white"
                }`}
              >
                <span>{currentEdition === "fiscal" ? "Continuar en Modo Fiscal" : "Activar Edición Fiscal"}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Formulario de Código de Activación Fiscal */}
        {showCodePrompt && (
          <div className="px-6 pb-6 animate-in fade-in duration-200">
            <form onSubmit={handleValidateFiscalCode} className="max-w-md mx-auto space-y-3 bg-[#0d0f17] border-2 border-blue-500/60 p-4 rounded-2xl shadow-2xl shadow-blue-950/60">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 font-bold text-blue-300 text-xs">
                  <KeyRound className="w-4 h-4 text-blue-400" />
                  <span>Se requiere Código de Activación Fiscal</span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowCodePrompt(false)}
                  className="text-slate-400 hover:text-white text-xs p-1"
                >
                  ✕
                </button>
              </div>

              <p className="text-[11px] text-slate-300 leading-relaxed">
                Para activar la <strong>Edición Fiscal SENIAT</strong> ingrese el código de administración correspondiente:
              </p>

              {errorMsg && (
                <div className="p-2.5 rounded-xl bg-rose-950/80 border border-rose-500 text-rose-200 text-xs flex items-center gap-2 font-mono">
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <div className="space-y-2">
                <input
                  type="password"
                  value={codeInput}
                  onChange={(e) => {
                    setCodeInput(e.target.value);
                    setErrorMsg(null);
                  }}
                  placeholder=""
                  autoFocus
                  autoComplete="off"
                  className="w-full bg-[#06080d] border border-blue-500/60 rounded-xl px-3 py-2 text-xs font-mono font-bold tracking-widest text-amber-300 text-center focus:outline-none focus:border-blue-400"
                />

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setShowCodePrompt(false)}
                    className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl transition-all cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={!codeInput.trim()}
                    className="flex-1 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Validar y Activar
                  </button>
                </div>
              </div>
            </form>
          </div>
        )}

        {/* Footer info */}
        <div className="bg-[#0f1118] px-6 py-3.5 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] text-slate-400">
          <div className="flex items-center gap-2 font-mono">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Configuración guardada localmente en su servidor Node.js.</span>
          </div>
          <div className="text-slate-400 font-mono">
            Edición actual: <strong className="text-white">{currentEdition === "bodega" ? "Bodega y Mostrador" : "Fiscal SENIAT"}</strong>
          </div>
        </div>
      </div>
    </div>
  );
};
