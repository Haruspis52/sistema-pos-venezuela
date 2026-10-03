import React, { useState, useEffect } from "react";
import {
  NegocioClienteConfig,
  RubroNegocio,
  TipoAlicuotaIva,
} from "../types";
import {
  getStoredNegocioConfig,
  saveStoredNegocioConfig,
  verifyAdminPin,
  resetEntireApplication,
} from "../mockDb";
import {
  Building2,
  Store,
  Receipt,
  Phone,
  MapPin,
  FileText,
  DollarSign,
  Printer,
  CheckCircle2,
  X,
  Sparkles,
  Save,
  MessageCircle,
  Trash2,
  AlertTriangle,
  ShieldAlert,
  KeyRound,
  Lock,
} from "lucide-react";

interface ClientConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: (config: NegocioClienteConfig) => void;
  showToast: (msg: string) => void;
  bcvRate: number;
}

export const ClientConfigModal: React.FC<ClientConfigModalProps> = ({
  isOpen,
  onClose,
  onSaved,
  showToast,
  bcvRate,
}) => {
  const [config, setConfig] = useState<NegocioClienteConfig>(() =>
    getStoredNegocioConfig()
  );
  const [showResetDialog, setShowResetDialog] = useState(false);
  const [adminPinInput, setAdminPinInput] = useState("");
  const [resetError, setResetError] = useState("");
  const [isResetting, setIsResetting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setConfig(getStoredNegocioConfig());
      setShowResetDialog(false);
      setAdminPinInput("");
      setResetError("");
      setIsResetting(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleConfirmReset = (e: React.FormEvent) => {
    e.preventDefault();
    setResetError("");

    if (!adminPinInput.trim()) {
      setResetError("Por favor ingrese el PIN de Administrador.");
      return;
    }

    const isValid = verifyAdminPin(adminPinInput.trim());
    if (!isValid) {
      setResetError("❌ PIN de Administrador incorrecto. Operación rechazada.");
      return;
    }

    setIsResetting(true);
    showToast("🧹 Limpiando aplicación y restableciendo datos a estado de fábrica...");

    setTimeout(() => {
      resetEntireApplication();
      window.location.reload();
    }, 1200);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!config.nombreComercial.trim()) {
      showToast("❌ El nombre comercial del negocio es obligatorio.");
      return;
    }
    if (!config.rif.trim()) {
      showToast("❌ El RIF o Cédula del negocio es obligatorio para tickets fiscales.");
      return;
    }

    saveStoredNegocioConfig(config);
    onSaved(config);
    showToast(`✅ Datos del negocio "${config.nombreComercial}" guardados correctamente.`);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-[#12141a] border border-slate-700/80 rounded-2xl w-full max-w-4xl shadow-2xl text-slate-100 overflow-hidden my-auto flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-900/60 via-slate-800 to-indigo-900/40 p-4 border-b border-slate-700/70 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600/30 border border-blue-500/40 flex items-center justify-center text-blue-300 shrink-0">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                Datos del Negocio / Perfil del Comercio
                <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-emerald-950 border border-emerald-500/40 text-emerald-300">
                  Para Tickets y Facturas
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Personaliza el nombre, RIF, dirección, pie de ticket y configuración fiscal para tu cliente.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body + Live Preview */}
        <div className="p-6 overflow-y-auto grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1 min-h-0">
          {/* Columna Izquierda: Formulario (7 cols) */}
          <form onSubmit={handleSubmit} className="lg:col-span-7 space-y-4">
            <div className="bg-[#181b24] p-4 rounded-xl border border-slate-800 space-y-3">
              <h3 className="text-xs font-bold text-blue-400 uppercase tracking-wider flex items-center gap-1.5">
                <Store className="w-3.5 h-3.5" /> Identificación del Establecimiento
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                    Nombre Comercial (Aparece en grande en el Ticket) *
                  </label>
                  <input
                    type="text"
                    value={config.nombreComercial}
                    onChange={(e) =>
                      setConfig({ ...config, nombreComercial: e.target.value })
                    }
                    placeholder="Ej. Bodega y Víveres Don Pedro"
                    className="w-full bg-[#0e1015] border border-slate-700 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                    Razón Social Legal *
                  </label>
                  <input
                    type="text"
                    value={config.razonSocial}
                    onChange={(e) =>
                      setConfig({ ...config, razonSocial: e.target.value })
                    }
                    placeholder="Ej. INVERSIONES DON PEDRO, C.A."
                    className="w-full bg-[#0e1015] border border-slate-700 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                    RIF o Cédula Fiscal *
                  </label>
                  <input
                    type="text"
                    value={config.rif}
                    onChange={(e) =>
                      setConfig({ ...config, rif: e.target.value.toUpperCase() })
                    }
                    placeholder="Ej. J-40918274-1 o V-18492041-0"
                    className="w-full bg-[#0e1015] border border-slate-700 rounded-lg px-3 py-2 text-xs text-white font-mono placeholder-slate-500 focus:outline-none focus:border-blue-500"
                    required
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                    Dirección Física del Local *
                  </label>
                  <input
                    type="text"
                    value={config.direccion}
                    onChange={(e) =>
                      setConfig({ ...config, direccion: e.target.value })
                    }
                    placeholder="Ej. Av. Principal con Calle 4, Local 12, Maracay"
                    className="w-full bg-[#0e1015] border border-slate-700 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1 flex items-center gap-1">
                    <Phone className="w-3 h-3 text-slate-400" /> Teléfono Local / Móvil
                  </label>
                  <input
                    type="text"
                    value={config.telefono}
                    onChange={(e) =>
                      setConfig({ ...config, telefono: e.target.value })
                    }
                    placeholder="Ej. 0412-5551234"
                    className="w-full bg-[#0e1015] border border-slate-700 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1 flex items-center gap-1">
                    <MessageCircle className="w-3 h-3 text-emerald-400" /> WhatsApp para Cobros
                  </label>
                  <input
                    type="text"
                    value={config.whatsappCobros}
                    onChange={(e) =>
                      setConfig({ ...config, whatsappCobros: e.target.value })
                    }
                    placeholder="Ej. +58 412 5551234"
                    className="w-full bg-[#0e1015] border border-slate-700 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>
            </div>

            <div className="bg-[#181b24] p-4 rounded-xl border border-slate-800 space-y-3">
              <h3 className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                <Receipt className="w-3.5 h-3.5" /> Opciones de Ticket Térmico y Mostrador
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                    Rubro Comercial
                  </label>
                  <select
                    value={config.rubro}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        rubro: e.target.value as RubroNegocio,
                      })
                    }
                    className="w-full bg-[#0e1015] border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="bodega">🏪 Bodega / Minimarket / Víveres</option>
                    <option value="farmacia">💊 Farmacia / Droguería</option>
                    <option value="panaderia">🥖 Panadería / Charcutería</option>
                    <option value="ferreteria">🔧 Ferretería / Materiales</option>
                    <option value="general">🏢 Comercio General</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                    Nombre de Caja / Terminal
                  </label>
                  <input
                    type="text"
                    value={config.nombreCaja}
                    onChange={(e) =>
                      setConfig({ ...config, nombreCaja: e.target.value })
                    }
                    placeholder="Ej. Caja Principal 01"
                    className="w-full bg-[#0e1015] border border-slate-700 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                    Mensaje al Pie del Ticket (Garantía o Saludo)
                  </label>
                  <textarea
                    rows={2}
                    value={config.pieTicket}
                    onChange={(e) =>
                      setConfig({ ...config, pieTicket: e.target.value })
                    }
                    placeholder="Ej. ¡Gracias por su preferencia! Conserve este comprobante para cualquier cambio en 48h."
                    className="w-full bg-[#0e1015] border border-slate-700 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 resize-none"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="auto-print"
                    checked={config.autoImprimirTicket}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        autoImprimirTicket: e.target.checked,
                      })
                    }
                    className="w-4 h-4 rounded text-blue-600 bg-slate-900 border-slate-700"
                  />
                  <label htmlFor="auto-print" className="text-xs text-slate-300 select-none">
                    Mostrar diálogo de impresión tras cada venta
                  </label>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                    Moneda de Despliegue Predilecta
                  </label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setConfig({ ...config, monedaDefecto: "USD" })}
                      className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold border transition-all ${
                        config.monedaDefecto === "USD"
                          ? "bg-emerald-600 text-white border-emerald-400"
                          : "bg-slate-900 text-slate-400 border-slate-700"
                      }`}
                    >
                      Dólares (USD $)
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfig({ ...config, monedaDefecto: "VES" })}
                      className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold border transition-all ${
                        config.monedaDefecto === "VES"
                          ? "bg-amber-600 text-white border-amber-400"
                          : "bg-slate-900 text-slate-400 border-slate-700"
                      }`}
                    >
                      Bolívares (Bs.)
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Zona de Mantenimiento y Peligro: Restablecer / Limpiar App */}
            <div className="p-3.5 rounded-xl bg-rose-950/20 border border-rose-900/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-start gap-2.5">
                <div className="p-2 rounded-lg bg-rose-500/10 text-rose-400 mt-0.5 shrink-0">
                  <AlertTriangle className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-rose-300 flex items-center gap-1.5">
                    <span>Restablecimiento Total de Fábrica</span>
                    <span className="text-[10px] bg-rose-900/60 text-rose-300 px-1.5 py-0.5 rounded border border-rose-700/50 font-mono">
                      Requiere PIN Admin
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-400 leading-tight mt-0.5">
                    Borra todas las ventas, productos, fiados y configuraciones locales para reiniciar la app a cero.
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowResetDialog(true);
                  setAdminPinInput("");
                  setResetError("");
                }}
                className="px-3.5 py-2 rounded-xl text-xs font-bold bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-700/60 hover:border-rose-500 flex items-center justify-center gap-1.5 transition-all shrink-0 cursor-pointer shadow-sm hover:shadow-rose-950/50"
              >
                <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                <span>Limpiar App por Completo</span>
              </button>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-5 py-2.5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/30 flex items-center gap-2 transition-all"
              >
                <Save className="w-4 h-4" />
                <span>Guardar y Aplicar a Tickets</span>
              </button>
            </div>
          </form>

          {/* Columna Derecha: Vista previa en vivo del Ticket Térmico (5 cols) */}
          <div className="lg:col-span-5 flex flex-col">
            <div className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2 flex items-center gap-2">
              <Printer className="w-3.5 h-3.5 text-blue-400" />
              <span>Vista Previa del Ticket Impreso</span>
            </div>

            <div className="bg-[#fffef7] text-[#111] font-mono text-[10px] p-4 rounded-xl shadow-lg border border-amber-200/80 leading-tight space-y-1.5 flex-1 select-none">
              <div className="text-center font-bold text-xs uppercase tracking-tight">
                {config.nombreComercial || "NOMBRE DEL NEGOCIO"}
              </div>
              <div className="text-center text-[9px] font-semibold text-gray-700">
                {config.razonSocial || "RAZÓN SOCIAL"}
              </div>
              <div className="text-center font-bold text-[10px]">
                RIF: {config.rif || "J-00000000-0"}
              </div>
              <div className="text-center text-[9px] text-gray-600">
                {config.direccion || "Dirección del establecimiento"}
              </div>
              <div className="text-center text-[9px] text-gray-600">
                Tel: {config.telefono || "0412-0000000"}
              </div>
              <div className="text-center text-[8.5px] font-bold text-gray-800">
                SENIAT • Prov. SNAT/00071
              </div>

              <div className="border-b border-dashed border-gray-400 my-1.5"></div>

              <div className="flex justify-between font-bold text-[10px]">
                <span>TICKET FACTURA N°:</span>
                <span>00-000453</span>
              </div>
              <div className="flex justify-between text-[9px]">
                <span>FECHA: {new Date().toLocaleDateString("es-VE")}</span>
                <span>HORA: {new Date().toLocaleTimeString("es-VE", { hour: "2-digit", minute: "2-digit" })}</span>
              </div>
              <div className="flex justify-between text-[9px]">
                <span>CAJA: {config.nombreCaja}</span>
                <span>TASA BCV: Bs. {bcvRate.toFixed(2)}</span>
              </div>

              <div className="border-b border-dashed border-gray-400 my-1.5"></div>

              <div className="space-y-1 text-[9px]">
                <div className="flex justify-between font-bold">
                  <span>CANT / DESCRIPCION</span>
                  <span>TOTAL</span>
                </div>
                <div className="flex justify-between">
                  <span>1x Harina PAN 1kg (E)</span>
                  <span>$1.40 (Bs. {(1.40 * bcvRate).toFixed(2)})</span>
                </div>
                <div className="flex justify-between">
                  <span>1x Queso Blanco 500g (E)</span>
                  <span>$2.80 (Bs. {(2.80 * bcvRate).toFixed(2)})</span>
                </div>
                <div className="flex justify-between">
                  <span>1x Refresco 1.5L (G)</span>
                  <span>$2.00 (Bs. {(2.00 * bcvRate).toFixed(2)})</span>
                </div>
              </div>

              <div className="border-b border-dashed border-gray-400 my-1.5"></div>

              <div className="space-y-0.5 text-[9px]">
                <div className="flex justify-between">
                  <span>Subtotal Exento (E):</span>
                  <span>$4.20</span>
                </div>
                <div className="flex justify-between">
                  <span>Base Imponible (G 16%):</span>
                  <span>$1.72</span>
                </div>
                <div className="flex justify-between">
                  <span>IVA 16%:</span>
                  <span>$0.28</span>
                </div>
                <div className="flex justify-between font-bold text-[11px] pt-1 border-t border-gray-800">
                  <span>TOTAL USD:</span>
                  <span>$6.20</span>
                </div>
                <div className="flex justify-between font-bold text-[11px] text-blue-900">
                  <span>TOTAL BS. (BCV):</span>
                  <span>Bs. {(6.20 * bcvRate).toFixed(2)}</span>
                </div>
              </div>

              <div className="border-b border-dashed border-gray-400 my-1.5"></div>

              <div className="text-center text-[8.5px] italic text-gray-700 pt-1">
                "{config.pieTicket || "¡Gracias por su preferencia!"}"
              </div>
              <div className="text-center text-[8px] text-gray-500 font-sans">
                Sistema POS Dual Venezuela
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* DIÁLOGO DE SEGURIDAD PARA LIMPIEZA TOTAL CON PIN ADMIN */}
      {showResetDialog && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="bg-[#15171e] border-2 border-rose-600/70 rounded-2xl w-full max-w-md shadow-2xl p-6 text-slate-100 relative overflow-hidden">
            {/* Cabecera de advertencia */}
            <div className="flex items-start gap-3 mb-4">
              <div className="p-3 rounded-xl bg-rose-600/20 text-rose-400 border border-rose-500/30 shrink-0">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <span>¿Limpiar Aplicación por Completo?</span>
                </h3>
                <p className="text-xs text-rose-300/90 font-medium mt-0.5">
                  Esta acción es irreversible y restablecerá la app a estado de fábrica.
                </p>
              </div>
            </div>

            {/* Lista de advertencia */}
            <div className="bg-rose-950/30 rounded-xl p-3 border border-rose-900/40 text-[11.5px] text-slate-300 space-y-1 mb-4">
              <div className="flex items-center gap-1.5 text-rose-300 font-semibold text-xs mb-1">
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>Se eliminarán permanentemente de este equipo:</span>
              </div>
              <p>• Catálogo completo de productos e inventario</p>
              <p>• Historial de ventas, facturas emitidas y tickets</p>
              <p>• Libreta de fiados y clientes</p>
              <p>• Reportes de cierre de caja (Z y X)</p>
              <p>• Nombre comercial y personalización del negocio</p>
              <div className="pt-1.5 text-[11px] text-slate-400 italic border-t border-rose-900/30">
                Al terminar, el sistema volverá al asistente inicial de bienvenida como recién instalado.
              </div>
            </div>

            {/* Formulario de PIN del Administrador */}
            <form onSubmit={handleConfirmReset} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <KeyRound className="w-3.5 h-3.5 text-rose-400" />
                    <span>PIN de Administrador Requerido:</span>
                  </span>
                  <span className="text-[10px] text-slate-500 font-normal">
                    (PIN del dueño / admin)
                  </span>
                </label>
                <div className="relative">
                  <input
                    type="password"
                    autoFocus
                    maxLength={16}
                    value={adminPinInput}
                    onChange={(e) => {
                      setAdminPinInput(e.target.value);
                      setResetError("");
                    }}
                    placeholder="Ingrese su PIN de Admin (ej. 1234)"
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 focus:border-rose-500 focus:ring-1 focus:ring-rose-500 text-white text-sm tracking-widest font-mono text-center outline-none transition-all placeholder:tracking-normal placeholder:font-sans placeholder:text-slate-500"
                    disabled={isResetting}
                  />
                  <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-3 pointer-events-none" />
                </div>
                {resetError && (
                  <p className="text-xs text-rose-400 font-medium mt-1.5 text-center">
                    {resetError}
                  </p>
                )}
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowResetDialog(false)}
                  disabled={isResetting}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isResetting || !adminPinInput.trim()}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-600/30 flex items-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>{isResetting ? "Limpiando..." : "Confirmar y Limpiar Todo"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
