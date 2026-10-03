import React, { useState, useEffect } from "react";
import { PosOperationalMode } from "../types";
import {
  ShoppingCart,
  Smartphone,
  Check,
  ArrowRight,
  X,
  Wifi,
  Package,
  Calculator,
  ShieldCheck,
  Zap,
  CreditCard,
  Banknote,
  DollarSign,
  HelpCircle,
  Layers,
} from "lucide-react";

interface InitialPosModeModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentMode: PosOperationalMode;
  onSelectMode: (mode: PosOperationalMode) => void;
  isFirstRun?: boolean;
}

export const InitialPosModeModal: React.FC<InitialPosModeModalProps> = ({
  isOpen,
  onClose,
  currentMode,
  onSelectMode,
  isFirstRun = false,
}) => {
  const [selectedMode, setSelectedMode] = useState<PosOperationalMode>(currentMode);

  useEffect(() => {
    if (isOpen) {
      setSelectedMode(currentMode);
    }
  }, [isOpen, currentMode]);

  useEffect(() => {
    if (!isOpen || isFirstRun) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, isFirstRun, onClose]);

  if (!isOpen) return null;

  const handleChoose = (mode: PosOperationalMode) => {
    setSelectedMode(mode);
    onSelectMode(mode);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200 overflow-y-auto"
      onClick={(e) => {
        if (!isFirstRun && e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        className="bg-[#12141c] border border-slate-700/90 rounded-2xl w-full max-w-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-[#171a24] via-[#1a1e2b] to-[#171a24] p-5 sm:p-6 border-b border-slate-800 relative shrink-0">
          {!isFirstRun && (
            <button
              onClick={onClose}
              className="absolute right-4 top-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
              title="Cerrar ventana"
            >
              <X className="w-5 h-5" />
            </button>
          )}

          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500 via-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-blue-900/30 shrink-0">
              <Layers className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight">
                  {isFirstRun
                    ? "Selecciona el Modo de Operación de tu Negocio"
                    : "Cambiar Modo de Operación del Punto de Venta"}
                </h2>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2.5 py-0.5 rounded-full bg-blue-950 text-blue-300 border border-blue-700/60 font-mono">
                  {isFirstRun ? "Configuración Inicial" : "Ajuste Rápido"}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Elige cómo deseas facturar y cobrar. Puedes alternar este modo cuando quieras con un solo clic.
              </p>
            </div>
          </div>
        </div>

        {/* Body Cards */}
        <div className="p-5 sm:p-6 space-y-4 overflow-y-auto custom-scrollbar flex-1 min-h-0">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Opción 1: Solo Inventario & Cálculo de Total */}
            <div
              onClick={() => handleChoose("inventory_only")}
              className={`cursor-pointer rounded-2xl p-5 border transition-all flex flex-col justify-between relative group ${
                selectedMode === "inventory_only"
                  ? "bg-gradient-to-b from-amber-950/40 via-[#181615] to-[#12141c] border-amber-500 shadow-xl shadow-amber-950/40 ring-2 ring-amber-500/30"
                  : "bg-[#151720] border-slate-800 hover:border-amber-500/50 hover:bg-[#181b26]"
              }`}
            >
              {selectedMode === "inventory_only" && (
                <div className="absolute -top-3 right-4 px-2.5 py-0.5 rounded-full bg-amber-500 text-slate-950 text-[10px] font-black uppercase tracking-wider flex items-center gap-1 shadow-md">
                  <Check className="w-3 h-3 stroke-[3]" />
                  Modo Activo
                </div>
              )}

              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="w-11 h-11 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
                    <ShoppingCart className="w-5 h-5" />
                  </div>
                  <span className="text-[11px] font-bold text-amber-300 bg-amber-950/60 px-2 py-0.5 rounded-md border border-amber-800/50 font-mono flex items-center gap-1">
                    <Zap className="w-3 h-3 text-amber-400" />
                    <span>Sin Datáfono Físico</span>
                  </span>
                </div>

                <h3 className="text-base font-bold text-white group-hover:text-amber-300 transition-colors flex items-center gap-1.5">
                  <span>🛒 Solo Inventario & Total</span>
                </h3>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  Ideal si <strong>NO tienes datáfono conectado por Wi-Fi</strong> o si solo deseas totalizar en <strong>$ y Bs. BCV</strong> y descontar el inventario de inmediato.
                </p>

                <div className="mt-4 space-y-2 border-t border-slate-800/80 pt-3 text-xs">
                  <div className="flex items-start gap-2 text-slate-300">
                    <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <span><strong>Totalizador en Tiempo Real:</strong> $ y Bs. a Tasa Oficial BCV.</span>
                  </div>
                  <div className="flex items-start gap-2 text-slate-300">
                    <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <span><strong>Descuento Inmediato:</strong> Rebaja existencias automáticamente.</span>
                  </div>
                  <div className="flex items-start gap-2 text-slate-300">
                    <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <span><strong>Cobro Manual Ágil:</strong> Efectivo $, Bs., Pago Móvil, Zelle y Tarjetas manuales.</span>
                  </div>
                  <div className="flex items-start gap-2 text-slate-300">
                    <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <span><strong>Sin Mensajes de IP ni Red:</strong> Operación 100% libre de terminales.</span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleChoose("inventory_only");
                }}
                className={`mt-5 w-full py-2.5 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  selectedMode === "inventory_only"
                    ? "bg-amber-500 text-slate-950 hover:bg-amber-400 shadow-md font-extrabold"
                    : "bg-slate-800 text-slate-200 hover:bg-amber-500 hover:text-slate-950"
                }`}
              >
                <span>
                  {selectedMode === "inventory_only"
                    ? "✓ Usar Modo Solo Inventario & Total"
                    : "Seleccionar Solo Inventario & Total"}
                </span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Opción 2: Conexión con SmartPOS Integrado */}
            <div
              onClick={() => handleChoose("smartpos")}
              className={`cursor-pointer rounded-2xl p-5 border transition-all flex flex-col justify-between relative group ${
                selectedMode === "smartpos"
                  ? "bg-gradient-to-b from-blue-950/40 via-[#151824] to-[#12141c] border-blue-500 shadow-xl shadow-blue-950/40 ring-2 ring-blue-500/30"
                  : "bg-[#151720] border-slate-800 hover:border-blue-500/50 hover:bg-[#181b26]"
              }`}
            >
              {selectedMode === "smartpos" && (
                <div className="absolute -top-3 right-4 px-2.5 py-0.5 rounded-full bg-blue-500 text-white text-[10px] font-black uppercase tracking-wider flex items-center gap-1 shadow-md">
                  <Check className="w-3 h-3 stroke-[3]" />
                  Modo Activo
                </div>
              )}

              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="w-11 h-11 rounded-xl bg-blue-500/20 border border-blue-500/40 flex items-center justify-center text-blue-400">
                    <Smartphone className="w-5 h-5" />
                  </div>
                  <span className="text-[11px] font-bold text-blue-300 bg-blue-950/60 px-2 py-0.5 rounded-md border border-blue-800/50 font-mono flex items-center gap-1">
                    <Wifi className="w-3 h-3 text-cyan-400" />
                    <span>Conexión Wi-Fi / IP</span>
                  </span>
                </div>

                <h3 className="text-base font-bold text-white group-hover:text-blue-300 transition-colors flex items-center gap-1.5">
                  <span>📲 SmartPOS Integrado</span>
                </h3>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  Para negocios con <strong>datáfono SmartPOS Android</strong> (WizarPOS Q2, PAX A920, Sunmi P2, etc.) conectado a la red local.
                </p>

                <div className="mt-4 space-y-2 border-t border-slate-800/80 pt-3 text-xs">
                  <div className="flex items-start gap-2 text-slate-300">
                    <Check className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                    <span><strong>Envío Directo:</strong> El monto en Bs. viaja a la pantalla del datáfono.</span>
                  </div>
                  <div className="flex items-start gap-2 text-slate-300">
                    <Check className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                    <span><strong>Cobro con Tarjeta:</strong> Chip, Contactless/NFC y PIN bancario en el terminal.</span>
                  </div>
                  <div className="flex items-start gap-2 text-slate-300">
                    <Check className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                    <span><strong>Lotes y Referencias:</strong> Registro automático de auditoría bancaria.</span>
                  </div>
                  <div className="flex items-start gap-2 text-slate-300">
                    <Check className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                    <span><strong>Descuento de Stock:</strong> Actualiza existencias tras aprobarse la transacción.</span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleChoose("smartpos");
                }}
                className={`mt-5 w-full py-2.5 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  selectedMode === "smartpos"
                    ? "bg-blue-600 text-white hover:bg-blue-500 shadow-md shadow-blue-900/40 font-extrabold"
                    : "bg-slate-800 text-slate-200 hover:bg-blue-600 hover:text-white"
                }`}
              >
                <span>
                  {selectedMode === "smartpos"
                    ? "✓ Usar Modo SmartPOS Integrado"
                    : "Seleccionar SmartPOS Integrado"}
                </span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Bottom Info note */}
          <div className="bg-[#181b24] border border-slate-800 rounded-xl p-3 flex items-center justify-between text-xs text-slate-400">
            <div className="flex items-center gap-2">
              <HelpCircle className="w-4 h-4 text-amber-400 shrink-0" />
              <span>
                💡 Puedes cambiar de modo cuando desees con el botón <strong>"Modo Operativo"</strong> en la cabecera superior.
              </span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-[#181b24] px-6 py-3.5 border-t border-slate-800 flex items-center justify-between shrink-0">
          <span className="text-xs text-slate-400 font-mono">
            Modo seleccionado: <strong className={selectedMode === "inventory_only" ? "text-amber-400" : "text-blue-400"}>
              {selectedMode === "inventory_only" ? "Solo Inventario & Total" : "SmartPOS Integrado"}
            </strong>
          </span>
          <button
            type="button"
            onClick={() => handleChoose(selectedMode)}
            className={`px-5 py-2 font-bold text-xs rounded-xl shadow-lg transition-all flex items-center gap-2 cursor-pointer ${
              selectedMode === "inventory_only"
                ? "bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 shadow-amber-950/40"
                : "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-blue-900/30"
            }`}
          >
            <span>Confirmar y Entrar al Sistema</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

