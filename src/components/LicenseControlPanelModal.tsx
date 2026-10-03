import React, { useState } from "react";
import {
  ShieldAlert,
  Calendar,
  DollarSign,
  Cloud,
  RefreshCw,
  Sliders,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  ExternalLink,
  Laptop,
  HelpCircle,
  User,
  Phone,
  FileSpreadsheet,
} from "lucide-react";
import {
  RemoteClientLicense,
  LicenseCheckResult,
} from "../types";
import { MASTER_UNLOCK_CODE, SOPORTE_WHATSAPP } from "../mockDb";

interface LicenseControlPanelModalProps {
  isOpen: boolean;
  onClose: () => void;
  license: RemoteClientLicense;
  bcvRate: number;
  onUpdateLicense: (updated: RemoteClientLicense) => void;
  onRenewMonthly: (days: number) => void;
  showToast: (msg: string, type: "success" | "error" | "info") => void;
}

export const LicenseControlPanelModal: React.FC<LicenseControlPanelModalProps> = ({
  isOpen,
  onClose,
  license,
  bcvRate,
  onUpdateLicense,
  onRenewMonthly,
  showToast,
}) => {
  const [nombreNegocio, setNombreNegocio] = useState(license.nombre_negocio);
  const [fechaVencimiento, setFechaVencimiento] = useState(license.fecha_vencimiento_actual);
  const [estadoRemoto, setEstadoRemoto] = useState<'ACTIVO' | 'SUSPENDIDO'>(license.estado_remoto);
  const [cuotaMensual, setCuotaMensual] = useState(license.cuota_mensual_usd);
  const [motivoBloqueo, setMotivoBloqueo] = useState(license.motivo_bloqueo || "");
  const [activeTab, setActiveTab] = useState<'status' | 'sheet_simulator' | 'config'>('status');

  if (!isOpen) return null;

  const handleSaveConfig = (e: React.FormEvent) => {
    e.preventDefault();
    const updated: RemoteClientLicense = {
      ...license,
      nombre_negocio: nombreNegocio,
      fecha_vencimiento_actual: fechaVencimiento,
      estado_remoto: estadoRemoto,
      cuota_mensual_usd: Number(cuotaMensual),
      motivo_bloqueo: motivoBloqueo,
      ultimo_contacto_servidor: new Date().toISOString(),
    };
    onUpdateLicense(updated);
    showToast("¡Configuración de Licencia actualizada correctamente!", "success");
    onClose();
  };

  // Acciones rápidas de demostración
  const handleQuickExpire = () => {
    // Poner fecha de ayer para simular vencimiento
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const dateStr = yesterday.toISOString().split("T")[0];
    setFechaVencimiento(dateStr);
    
    const updated: RemoteClientLicense = {
      ...license,
      fecha_vencimiento_actual: dateStr,
      estado_remoto: "ACTIVO",
    };
    onUpdateLicense(updated);
    showToast("Simulación: Mensualidad vencida aplicada.", "error");
  };

  const handleQuickWarnNearExpire = () => {
    // Poner fecha en 2 días para simular aviso preventivo de corte
    const soon = new Date();
    soon.setDate(soon.getDate() + 2);
    const dateStr = soon.toISOString().split("T")[0];
    setFechaVencimiento(dateStr);
    
    const updated: RemoteClientLicense = {
      ...license,
      fecha_vencimiento_actual: dateStr,
      estado_remoto: "ACTIVO",
    };
    onUpdateLicense(updated);
    showToast("Simulación: Aviso preventivo de corte activado (vence en 2 días).", "info");
  };

  const handleQuickSuspend = () => {
    setEstadoRemoto("SUSPENDIDO");
    const updated: RemoteClientLicense = {
      ...license,
      estado_remoto: "SUSPENDIDO",
      motivo_bloqueo: "Servicio suspendido por mora de pago. Contacte a soporte.",
    };
    onUpdateLicense(updated);
    showToast("Simulación: Cliente suspendido remotamente desde la nube.", "error");
  };

  const handleQuickActivate = () => {
    const nextMonth = new Date();
    nextMonth.setDate(nextMonth.getDate() + 30);
    const dateStr = nextMonth.toISOString().split("T")[0];
    setFechaVencimiento(dateStr);
    setEstadoRemoto("ACTIVO");

    const updated: RemoteClientLicense = {
      ...license,
      fecha_vencimiento_actual: dateStr,
      estado_remoto: "ACTIVO",
    };
    onUpdateLicense(updated);
    showToast("¡Licencia renovada por 30 días!", "success");
  };

  const cuotaVes = cuotaMensual * bcvRate;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200 overflow-y-auto">
      <div className="bg-[#12141c] border border-slate-700/80 rounded-2xl w-full max-w-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] my-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#171a24] via-[#1a1e2b] to-[#171a24] p-5 border-b border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-600 to-blue-700 flex items-center justify-center text-white shadow-lg shadow-indigo-950/40 shrink-0">
              <Cloud className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white tracking-tight">
                  Panel de Control de Cobro &amp; Licenciamiento Remoto (Método 1)
                </h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-blue-950 text-blue-300 border border-blue-800 font-bold">
                  Cloud Admin
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Modelo de Cobro: $50 Instalación • ${license.edicion_contratada === "bodega" ? "15" : "30"}/mes • Bloqueo Automático por Mora
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 shrink-0"
          >
            ✕
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="bg-[#151720] px-6 pt-3 border-b border-slate-800 flex items-center gap-2 shrink-0">
          <button
            onClick={() => setActiveTab("status")}
            className={`px-3 py-2 rounded-t-xl text-xs font-semibold transition-colors flex items-center gap-1.5 ${
              activeTab === "status"
                ? "bg-[#12141c] text-blue-400 border-t border-x border-slate-700"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Estado Actual & Acciones Rápidas</span>
          </button>

          <button
            onClick={() => setActiveTab("sheet_simulator")}
            className={`px-3 py-2 rounded-t-xl text-xs font-semibold transition-colors flex items-center gap-1.5 ${
              activeTab === "sheet_simulator"
                ? "bg-[#12141c] text-emerald-400 border-t border-x border-slate-700"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
            <span>Simulador de Tu Panel Remoto (Google Sheets)</span>
          </button>

          <button
            onClick={() => setActiveTab("config")}
            className={`px-3 py-2 rounded-t-xl text-xs font-semibold transition-colors flex items-center gap-1.5 ${
              activeTab === "config"
                ? "bg-[#12141c] text-amber-400 border-t border-x border-slate-700"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Parámetros del Cliente</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 min-h-0">
          {/* TAB 1: STATUS & QUICK TESTING */}
          {activeTab === "status" && (
            <div className="space-y-5">
              {/* Tarjeta de Resumen Actual */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-[#171a24] p-4 rounded-xl border border-slate-700/80">
                  <span className="text-[10px] text-slate-400 uppercase font-mono tracking-wider block font-bold">
                    Estado Remoto en Nube
                  </span>
                  <div className="flex items-center gap-2 mt-1.5">
                    {license.estado_remoto === "ACTIVO" ? (
                      <span className="px-2.5 py-1 rounded-lg bg-emerald-950 text-emerald-300 border border-emerald-700/60 text-xs font-bold font-mono flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        ACTIVO (Al Día)
                      </span>
                    ) : (
                      <span className="px-2.5 py-1 rounded-lg bg-rose-950 text-rose-300 border border-rose-700/60 text-xs font-bold font-mono flex items-center gap-1.5">
                        <XCircle className="w-3.5 h-3.5" />
                        SUSPENDIDO (Mora)
                      </span>
                    )}
                  </div>
                </div>

                <div className="bg-[#171a24] p-4 rounded-xl border border-slate-700/80">
                  <span className="text-[10px] text-slate-400 uppercase font-mono tracking-wider block font-bold">
                    Fecha de Corte / Vencimiento
                  </span>
                  <div className="text-sm font-bold text-white font-mono mt-1.5 flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-amber-400" />
                    <span>{license.fecha_vencimiento_actual}</span>
                  </div>
                </div>

                <div className="bg-[#171a24] p-4 rounded-xl border border-slate-700/80">
                  <span className="text-[10px] text-slate-400 uppercase font-mono tracking-wider block font-bold">
                    Tarifa Mensual
                  </span>
                  <div className="text-sm font-bold text-amber-400 font-mono mt-1.5">
                    ${license.cuota_mensual_usd}.00 USD{" "}
                    <span className="text-xs text-slate-400 font-normal">
                      (Bs. {(license.cuota_mensual_usd * bcvRate).toFixed(2)})
                    </span>
                  </div>
                </div>
              </div>

              {/* Botones de Prueba en Vivo (Simulación de Casos de Cobro) */}
              <div className="bg-[#181a24] p-5 rounded-2xl border border-slate-800 space-y-3">
                <div className="flex items-center gap-2 text-white font-bold text-xs uppercase tracking-wider font-mono">
                  <Sliders className="w-4 h-4 text-blue-400" />
                  <span>Pruebas de Demostración de Bloqueo / Desbloqueo</span>
                </div>
                <p className="text-xs text-slate-400">
                  Haz clic en estos botones para ver instantáneamente cómo reacciona el sistema cuando un cliente no paga o cuando reporta su mensualidad:
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={handleQuickSuspend}
                    className="p-3 rounded-xl bg-rose-950/60 hover:bg-rose-900/60 border border-rose-700/60 text-rose-200 text-xs font-bold transition-all flex flex-col items-center justify-center gap-1 text-center"
                  >
                    <ShieldAlert className="w-4 h-4 text-rose-400" />
                    <span>1. Suspensión Inmediata</span>
                    <span className="text-[10px] text-rose-300 font-normal">(Bloqueo Total Pantalla)</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleQuickExpire}
                    className="p-3 rounded-xl bg-rose-950/40 hover:bg-rose-900/40 border border-rose-800/60 text-rose-200 text-xs font-bold transition-all flex flex-col items-center justify-center gap-1 text-center"
                  >
                    <Clock className="w-4 h-4 text-rose-400" />
                    <span>2. Fecha Vencida (Ayer)</span>
                    <span className="text-[10px] text-rose-300 font-normal">(Mora por Calendario)</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleQuickWarnNearExpire}
                    className="p-3 rounded-xl bg-amber-950/60 hover:bg-amber-900/60 border border-amber-700/60 text-amber-200 text-xs font-bold transition-all flex flex-col items-center justify-center gap-1 text-center"
                  >
                    <AlertTriangle className="w-4 h-4 text-amber-400" />
                    <span>3. Vence Pronto (2 días)</span>
                    <span className="text-[10px] text-amber-300 font-normal">(Aviso con Pago Móvil)</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleQuickActivate}
                    className="p-3 rounded-xl bg-emerald-950/60 hover:bg-emerald-900/60 border border-emerald-700/60 text-emerald-200 text-xs font-bold transition-all flex flex-col items-center justify-center gap-1 text-center"
                  >
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>4. Pago (+30 Días)</span>
                    <span className="text-[10px] text-emerald-300 font-normal">(Reactivar Normal)</span>
                  </button>
                </div>
              </div>

              {/* Información del Modelo de Negocio */}
              <div className="bg-[#141620] p-4 rounded-xl border border-slate-800 text-xs space-y-2 text-slate-300">
                <div className="font-bold text-white flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-emerald-400" />
                  <span>Estructura de Precios Configurada:</span>
                </div>
                <ul className="list-disc pl-5 space-y-1 text-slate-400">
                  <li><strong>Cobro Inicial de Instalación:</strong> $50 USD (incluye configuración de base de datos SQLite y puesta a punto).</li>
                  <li><strong>Mensualidad Edición Bodega:</strong> $15 USD / mes (atención rápida, tasa BCV y libreta de fiados).</li>
                  <li><strong>Mensualidad Edición Fiscal:</strong> $30 USD / mes (Libro de Ventas SENIAT, Providencia 00071 e IGTF).</li>
                </ul>
              </div>
            </div>
          )}

          {/* TAB 2: GOOGLE SHEETS / CLOUD SIMULATOR */}
          {activeTab === "sheet_simulator" && (
            <div className="space-y-4">
              {/* Enlace a la Hoja Real del Usuario */}
              <div className="bg-emerald-950/40 border border-emerald-500/40 p-4 rounded-xl text-xs text-emerald-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                    <p className="font-bold text-emerald-300">
                      Tu Hoja de Google Sheets Conectada
                    </p>
                    <span className="text-[10px] bg-emerald-900/80 text-emerald-200 px-2 py-0.5 rounded font-mono">
                      ID: 1mR0Me2u...sFE
                    </span>
                  </div>
                  <p className="text-slate-300 text-[11px]">
                    El archivo <code className="text-emerald-300 bg-black/40 px-1 py-0.5 rounded">license_manager.py</code> ya está configurado con tu endpoint CSV directo.
                  </p>
                </div>
                <a
                  href="https://docs.google.com/spreadsheets/d/1mR0Me2ulMjOwmI3meUPtrhFYPUvvlYADTQBDauG2sFE/edit?usp=sharing"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 shadow-md"
                >
                  <span>Abrir Mi Google Sheet</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>

              <div className="bg-[#151824] border border-slate-700/80 p-3.5 rounded-xl text-xs space-y-1.5 text-slate-300">
                <p className="font-semibold text-white">
                  💡 ¿Cómo funciona la sincronización con tu hoja?
                </p>
                <p className="text-slate-400 text-[11px]">
                  Cada fila de tu Google Sheet corresponde a un cliente con las columnas: <code className="text-amber-300">cliente_id</code>, <code className="text-amber-300">nombre_negocio</code>, <code className="text-amber-300">edicion</code>, <code className="text-amber-300">cuota_usd</code>, <code className="text-amber-300">fecha_vencimiento</code>, <code className="text-amber-300">estado</code>. Al cambiar el estado a <strong>SUSPENDIDO</strong> o cambiar la fecha, el POS de ese negocio se actualiza al iniciar.
                </p>
              </div>

              {/* Simulación visual de Google Sheet */}
              <div className="border border-slate-700 rounded-xl overflow-x-auto bg-[#0f1118]">
                <table className="w-full text-xs text-left">
                  <thead className="bg-[#171a24] text-slate-300 uppercase font-mono text-[10px] border-b border-slate-700">
                    <tr>
                      <th className="p-3">ID Cliente</th>
                      <th className="p-3">Negocio / Cliente</th>
                      <th className="p-3">Edición</th>
                      <th className="p-3">Mensualidad</th>
                      <th className="p-3">Vence</th>
                      <th className="p-3 text-center">Estado Remoto</th>
                      <th className="p-3 text-right">Acción</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 font-mono">
                    <tr className="bg-blue-950/20">
                      <td className="p-3 font-bold text-blue-300">{license.cliente_id}</td>
                      <td className="p-3 font-semibold text-white">{license.nombre_negocio}</td>
                      <td className="p-3 uppercase text-amber-300">{license.edicion_contratada}</td>
                      <td className="p-3 text-emerald-400">${license.cuota_mensual_usd} USD</td>
                      <td className="p-3 text-slate-300">{license.fecha_vencimiento_actual}</td>
                      <td className="p-3 text-center">
                        <button
                          onClick={() => {
                            const newStatus = license.estado_remoto === "ACTIVO" ? "SUSPENDIDO" : "ACTIVO";
                            setEstadoRemoto(newStatus);
                            onUpdateLicense({ ...license, estado_remoto: newStatus });
                            showToast(`Cliente cambiado a ${newStatus}`, newStatus === "ACTIVO" ? "success" : "error");
                          }}
                          className={`px-2.5 py-1 rounded-md text-[10px] font-bold border transition-colors ${
                            license.estado_remoto === "ACTIVO"
                              ? "bg-emerald-950 text-emerald-300 border-emerald-700 hover:bg-emerald-900"
                              : "bg-rose-950 text-rose-300 border-rose-700 hover:bg-rose-900"
                          }`}
                        >
                          {license.estado_remoto} ▾
                        </button>
                      </td>
                      <td className="p-3 text-right">
                        <button
                          onClick={handleQuickActivate}
                          className="px-2 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded text-[10px] font-bold"
                        >
                          +30 Días
                        </button>
                      </td>
                    </tr>

                    <tr className="opacity-60 text-slate-400">
                      <td className="p-3">FSC-2026-8812</td>
                      <td className="p-3">Abasto y Charcutería San José</td>
                      <td className="p-3 uppercase">Fiscal</td>
                      <td className="p-3">$30 USD</td>
                      <td className="p-3">2026-10-30</td>
                      <td className="p-3 text-center">
                        <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 text-[10px]">
                          ACTIVO
                        </span>
                      </td>
                      <td className="p-3 text-right">-</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 3: FORM CONFIG */}
          {activeTab === "config" && (
            <form onSubmit={handleSaveConfig} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-400 block mb-1">
                    Nombre del Negocio / Cliente:
                  </label>
                  <input
                    type="text"
                    value={nombreNegocio}
                    onChange={(e) => setNombreNegocio(e.target.value)}
                    className="w-full bg-[#0d0e14] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-400 block mb-1">
                    Fecha de Próximo Vencimiento:
                  </label>
                  <input
                    type="date"
                    value={fechaVencimiento}
                    onChange={(e) => setFechaVencimiento(e.target.value)}
                    className="w-full bg-[#0d0e14] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-400 block mb-1">
                    Cuota Mensual (USD):
                  </label>
                  <input
                    type="number"
                    value={cuotaMensual}
                    onChange={(e) => setCuotaMensual(Number(e.target.value))}
                    className="w-full bg-[#0d0e14] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-400 block mb-1">
                    Estado Remoto:
                  </label>
                  <select
                    value={estadoRemoto}
                    onChange={(e) => setEstadoRemoto(e.target.value as 'ACTIVO' | 'SUSPENDIDO')}
                    className="w-full bg-[#0d0e14] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="ACTIVO">ACTIVO (Permitir Acceso)</option>
                    <option value="SUSPENDIDO">SUSPENDIDO (Bloquear por Mora)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-400 block mb-1">
                  Motivo de Bloqueo a mostrar al Cliente:
                </label>
                <textarea
                  value={motivoBloqueo}
                  onChange={(e) => setMotivoBloqueo(e.target.value)}
                  rows={2}
                  className="w-full bg-[#0d0e14] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-900/40"
                >
                  Guardar Cambios
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Footer */}
        <div className="bg-[#0f1118] px-6 py-3 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-500 font-mono shrink-0">
          <span>Clave Maestra para Emergencias: <strong>{MASTER_UNLOCK_CODE}</strong></span>
          <span>WhatsApp Soporte: {SOPORTE_WHATSAPP}</span>
        </div>
      </div>
    </div>
  );
};
