import React, { useState } from "react";
import {
  Store,
  ShieldCheck,
  Building2,
  Receipt,
  Phone,
  MapPin,
  FileText,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  ShoppingCart,
  Smartphone,
  Save,
  MessageCircle,
  Lock,
  Eye,
  EyeOff,
  KeyRound,
} from "lucide-react";
import { NegocioClienteConfig, PosOperationalMode, RubroNegocio } from "../types";
import {
  saveStoredNegocioConfig,
  saveAppEdition,
  savePosOperationalMode,
  saveRemoteLicense,
  getRemoteLicense,
  getStoredUsers,
  saveStoredUsers,
  saveStoredCurrentUser,
  isFiscalEditionUnlocked,
  unlockFiscalEdition,
} from "../mockDb";

interface InitialSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialConfig: NegocioClienteConfig;
  initialEdition: "bodega" | "fiscal";
  initialPosMode: PosOperationalMode;
  bcvRate: number;
  onComplete: (
    config: NegocioClienteConfig,
    edition: "bodega" | "fiscal",
    posMode: PosOperationalMode
  ) => void;
  showToast: (msg: string) => void;
}

export const InitialSetupModal: React.FC<InitialSetupModalProps> = ({
  isOpen,
  onClose,
  initialConfig,
  initialEdition,
  initialPosMode,
  bcvRate,
  onComplete,
  showToast,
}) => {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [selectedEdition, setSelectedEdition] = useState<"bodega" | "fiscal">(initialEdition);
  const [selectedPosMode, setSelectedPosMode] = useState<PosOperationalMode>(initialPosMode);
  const [clienteId, setClienteId] = useState<string>(() => {
    const lic = getRemoteLicense();
    return lic.cliente_id || "CLI-001";
  });
  const [adminPin, setAdminPin] = useState<string>(() => {
    const users = getStoredUsers();
    const admin = users.find((u) => u.rol === "ADMIN");
    return admin?.pin || "1234";
  });
  const [confirmAdminPin, setConfirmAdminPin] = useState<string>(() => {
    const users = getStoredUsers();
    const admin = users.find((u) => u.rol === "ADMIN");
    return admin?.pin || "1234";
  });
  const [showPinText, setShowPinText] = useState<boolean>(false);
  const [showFiscalCodePrompt, setShowFiscalCodePrompt] = useState<boolean>(false);
  const [fiscalCodeInput, setFiscalCodeInput] = useState<string>("");

  const handleSelectFiscalEdition = () => {
    if (isFiscalEditionUnlocked()) {
      setSelectedEdition("fiscal");
    } else {
      setShowFiscalCodePrompt(true);
      setFiscalCodeInput("");
    }
  };

  const handleValidateFiscalCodeInSetup = () => {
    const clean = fiscalCodeInput.trim();
    if (!clean) {
      showToast("❌ Ingrese el código de activación fiscal.");
      return;
    }
    const res = unlockFiscalEdition(clean);
    if (res.success) {
      setSelectedEdition("fiscal");
      setShowFiscalCodePrompt(false);
      setFiscalCodeInput("");
      showToast("✅ Edición Fiscal SENIAT activada con código maestro.");
    } else {
      showToast("❌ Código incorrecto. Ingrese el código de administración autorizado.");
      setFiscalCodeInput("");
    }
  };

  const [config, setConfig] = useState<NegocioClienteConfig>({
    ...initialConfig,
    nombreComercial: initialConfig.nombreComercial || "Mi Comercio y Víveres",
    razonSocial: initialConfig.razonSocial || "INVERSIONES Y COMERCIO, C.A.",
    rif: initialConfig.rif || "J-40918274-1",
    direccion: initialConfig.direccion || "Av. Principal, Local N° 1, Casco Central",
    telefono: initialConfig.telefono || "+58 412-5551234",
    whatsappCobros: initialConfig.whatsappCobros || "+58 412-5551234",
    pieTicket: initialConfig.pieTicket || "¡Gracias por su compra! Conserve este comprobante.",
  });

  if (!isOpen) return null;

  const handleFinishSetup = (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (!config.nombreComercial.trim()) {
      showToast("❌ Por favor ingrese el nombre comercial del negocio.");
      setStep(2);
      return;
    }
    if (!config.rif.trim()) {
      showToast("❌ Por favor ingrese el RIF o Cédula fiscal.");
      setStep(2);
      return;
    }

    const cleanPin = adminPin.trim();
    if (cleanPin.length < 4) {
      showToast("❌ El PIN de Administrador debe tener al menos 4 dígitos.");
      setStep(4);
      return;
    }
    if (cleanPin !== confirmAdminPin.trim()) {
      showToast("❌ La confirmación del PIN no coincide.");
      setStep(4);
      return;
    }

    const finalClienteId = clienteId.trim().toUpperCase() || "CLI-001";

    // Save all initial preferences
    saveStoredNegocioConfig(config);
    saveAppEdition(selectedEdition);
    savePosOperationalMode(selectedPosMode);

    // Update Admin User PIN in SQLite/LocalStorage
    const users = getStoredUsers();
    const adminIdx = users.findIndex((u) => u.rol === "ADMIN" || u.id === "usr-admin-1");
    if (adminIdx >= 0) {
      users[adminIdx] = {
        ...users[adminIdx],
        pin: cleanPin,
      };
      saveStoredUsers(users);
      saveStoredCurrentUser(users[adminIdx]);
    }

    // Sync license name & cliente_id for Google Sheets
    const currentLic = getRemoteLicense();
    saveRemoteLicense({
      ...currentLic,
      cliente_id: finalClienteId,
      nombre_negocio: config.nombreComercial,
      rif_cedula: config.rif,
      edicion_contratada: selectedEdition,
    });

    onComplete(config, selectedEdition, selectedPosMode);
    showToast(`✅ ¡Configuración inicial guardada para "${config.nombreComercial}"!`);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-[#12151d] border border-slate-700/80 rounded-2xl w-full max-w-4xl shadow-2xl text-slate-100 overflow-hidden my-6 flex flex-col max-h-[92vh]">
        {/* Header con Indicador de Pasos */}
        <div className="bg-gradient-to-r from-blue-950 via-[#161a24] to-indigo-950 p-5 sm:p-6 border-b border-slate-800 shrink-0">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500 via-blue-600 to-indigo-600 flex items-center justify-center text-2xl shadow-lg shadow-blue-900/30 shrink-0">
                🇻🇪
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-lg sm:text-xl font-extrabold text-white tracking-tight">
                    Bienvenido a su Sistema POS Venezuela
                  </h2>
                  <span className="text-[10px] uppercase font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-600/50">
                    Configuración Inicial
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  Configure los datos de su negocio, elija la versión y defina su PIN de Administrador en 4 sencillos pasos.
                </p>
              </div>
            </div>
          </div>

          {/* Stepper Navigation */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-5 pt-3 border-t border-slate-800/80 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setStep(1)}
              className={`flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg border transition-all cursor-pointer ${
                step === 1
                  ? "bg-blue-600 text-white border-blue-500 shadow-md shadow-blue-900/30"
                  : "bg-slate-900/60 text-slate-400 border-slate-800 hover:text-slate-200"
              }`}
            >
              <span className="w-4 h-4 rounded-full bg-white/20 flex items-center justify-center text-[10px] font-bold">1</span>
              <span className="truncate">1. Versión</span>
            </button>

            <button
              type="button"
              onClick={() => setStep(2)}
              className={`flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg border transition-all cursor-pointer ${
                step === 2
                  ? "bg-blue-600 text-white border-blue-500 shadow-md shadow-blue-900/30"
                  : "bg-slate-900/60 text-slate-400 border-slate-800 hover:text-slate-200"
              }`}
            >
              <span className="w-4 h-4 rounded-full bg-white/20 flex items-center justify-center text-[10px] font-bold">2</span>
              <span className="truncate">2. Datos Negocio</span>
            </button>

            <button
              type="button"
              onClick={() => setStep(3)}
              className={`flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg border transition-all cursor-pointer ${
                step === 3
                  ? "bg-blue-600 text-white border-blue-500 shadow-md shadow-blue-900/30"
                  : "bg-slate-900/60 text-slate-400 border-slate-800 hover:text-slate-200"
              }`}
            >
              <span className="w-4 h-4 rounded-full bg-white/20 flex items-center justify-center text-[10px] font-bold">3</span>
              <span className="truncate">3. Modo Cobro</span>
            </button>

            <button
              type="button"
              onClick={() => setStep(4)}
              className={`flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg border transition-all cursor-pointer ${
                step === 4
                  ? "bg-amber-500 text-slate-950 font-extrabold border-amber-400 shadow-md shadow-amber-950/40"
                  : "bg-slate-900/60 text-slate-400 border-slate-800 hover:text-slate-200"
              }`}
            >
              <span className="w-4 h-4 rounded-full bg-black/20 flex items-center justify-center text-[10px] font-bold">4</span>
              <span className="truncate">4. PIN Admin</span>
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-6">
          {/* ============================================================= */}
          {/* PASO 1: SELECCIONAR LA VERSIÓN / EDICIÓN */}
          {/* ============================================================= */}
          {step === 1 && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="text-center sm:text-left">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  <span>Paso 1: ¿Qué tipo de negocio tiene? Elija su versión:</span>
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Ambas ediciones están habilitadas y puede alternar entre ellas en cualquier momento desde la barra superior.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
                {/* Opción A: Bodega & Abasto */}
                <div
                  onClick={() => setSelectedEdition("bodega")}
                  className={`p-5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between relative group ${
                    selectedEdition === "bodega"
                      ? "bg-gradient-to-b from-amber-950/40 via-[#181615] to-[#12141c] border-amber-500 shadow-xl shadow-amber-950/40 ring-2 ring-amber-500/20"
                      : "bg-[#161822] border-slate-800 hover:border-amber-500/40 hover:bg-[#191c28]"
                  }`}
                >
                  {selectedEdition === "bodega" && (
                    <div className="absolute -top-3 right-4 px-2.5 py-0.5 rounded-full bg-amber-500 text-slate-950 text-[10px] font-black uppercase tracking-wider flex items-center gap-1 shadow-md">
                      <CheckCircle2 className="w-3 h-3 stroke-[3]" />
                      Seleccionada
                    </div>
                  )}

                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
                        <Store className="w-5 h-5" />
                      </div>
                      <span className="text-[11px] font-mono font-bold text-amber-300 bg-amber-950/60 px-2 py-0.5 rounded border border-amber-800/40">
                        Edición Bodega
                      </span>
                    </div>

                    <h4 className="text-base font-bold text-white group-hover:text-amber-300 transition-colors">
                      🏪 Edición Bodega y Mostrador
                    </h4>
                    <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                      Diseñada para bodegas, abastos, minimarkets y charcuterías con atención rápida y libreta de fiados comunitaria.
                    </p>

                    <div className="mt-4 space-y-2 text-xs border-t border-slate-800/80 pt-3 text-slate-300">
                      <div className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
                        <span><strong>Calculadora de Vuelto Dual:</strong> Vuelto en Bs. y en $ instantáneo.</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
                        <span><strong>Libreta de Fiados:</strong> Saldos por cliente y cobro WhatsApp.</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
                        <span><strong>Cierre de Caja Rápido:</strong> Cuadre de efectivo $ y Pago Móvil.</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 pt-3 border-t border-slate-800">
                    <span className="text-xs text-amber-400 font-semibold flex items-center justify-between">
                      <span>{selectedEdition === "bodega" ? "✓ Opción Seleccionada" : "Haga clic para elegir Bodega"}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </div>

                {/* Opción B: Fiscal SENIAT */}
                <div
                  onClick={handleSelectFiscalEdition}
                  className={`p-5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between relative group ${
                    selectedEdition === "fiscal"
                      ? "bg-gradient-to-b from-blue-950/40 via-[#131722] to-[#12141c] border-blue-500 shadow-xl shadow-blue-950/40 ring-2 ring-blue-500/20"
                      : "bg-[#161822] border-slate-800 hover:border-blue-500/40 hover:bg-[#191c28]"
                  }`}
                >
                  {selectedEdition === "fiscal" && (
                    <div className="absolute -top-3 right-4 px-2.5 py-0.5 rounded-full bg-blue-500 text-white text-[10px] font-black uppercase tracking-wider flex items-center gap-1 shadow-md">
                      <CheckCircle2 className="w-3 h-3 stroke-[3]" />
                      Seleccionada
                    </div>
                  )}

                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div className="w-10 h-10 rounded-xl bg-blue-500/20 border border-blue-500/40 flex items-center justify-center text-blue-400">
                        <ShieldCheck className="w-5 h-5" />
                      </div>
                      <span className="text-[11px] font-mono font-bold text-blue-300 bg-blue-950/60 px-2 py-0.5 rounded border border-blue-800/40">
                        Edición Fiscal SENIAT
                      </span>
                    </div>

                    <h4 className="text-base font-bold text-white group-hover:text-blue-300 transition-colors">
                      🏢 Edición Fiscal SENIAT (Prov. 00071)
                    </h4>
                    <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                      Para empresas comerciales, distribuidoras y comercios formales obligados por el SENIAT.
                    </p>

                    <div className="mt-4 space-y-2 text-xs border-t border-slate-800/80 pt-3 text-slate-300">
                      <div className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0" />
                        <span><strong>Libro de Ventas Fiscal:</strong> Providencia SNAT/00071 oficial.</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0" />
                        <span><strong>Cálculo Automático IGTF 3%:</strong> Pagos en divisas y efectivo.</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0" />
                        <span><strong>Kardex Valorado PMP:</strong> Cumplimiento LISLR Art. 177.</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 pt-3 border-t border-slate-800">
                    <span className="text-xs text-blue-400 font-semibold flex items-center justify-between">
                      <span>{selectedEdition === "fiscal" ? "✓ Opción Seleccionada" : "Haga clic para elegir Fiscal"}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </div>
              </div>

              {showFiscalCodePrompt && (
                <div className="mt-4 p-4 bg-[#0e1017] border-2 border-blue-500/60 rounded-2xl space-y-3 animate-in fade-in duration-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 font-bold text-blue-300 text-xs">
                      <KeyRound className="w-4 h-4 text-blue-400" />
                      <span>Código de Activación Requerido</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowFiscalCodePrompt(false)}
                      className="text-slate-400 hover:text-white text-xs p-1"
                    >
                      ✕
                    </button>
                  </div>

                  <p className="text-xs text-slate-300">
                    Ingrese el código de administración para desbloquear la Edición Fiscal SENIAT:
                  </p>

                  <div className="flex items-center gap-2">
                    <input
                      type="password"
                      value={fiscalCodeInput}
                      onChange={(e) => setFiscalCodeInput(e.target.value)}
                      placeholder=""
                      autoFocus
                      autoComplete="off"
                      className="flex-1 bg-[#06080d] border border-blue-500/60 rounded-xl px-3 py-2 text-xs font-mono font-bold tracking-widest text-amber-300 text-center focus:outline-none focus:border-blue-400"
                    />
                    <button
                      type="button"
                      onClick={handleValidateFiscalCodeInSetup}
                      className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer"
                    >
                      Validar
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ============================================================= */}
          {/* PASO 2: DATOS DEL NEGOCIO (TICKETS & FACTURAS) */}
          {/* ============================================================= */}
          {step === 2 && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-in fade-in duration-150">
              {/* Formulario */}
              <div className="lg:col-span-7 space-y-4">
                <div className="bg-[#181b24] p-4 rounded-xl border border-slate-800 space-y-3">
                  <h3 className="text-xs font-bold text-blue-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Building2 className="w-4 h-4" /> Datos de Identificación del Comercio
                  </h3>

                  <div className="space-y-3">
                    {/* ID de Cliente / Código de Licencia para Google Sheets */}
                    <div className="p-3 rounded-xl bg-blue-950/40 border border-blue-500/40 space-y-1">
                      <div className="flex items-center justify-between">
                        <label className="block text-[11px] font-bold text-blue-300">
                          ID de Cliente / Código en Google Sheets *
                        </label>
                        <span className="text-[10px] text-blue-400 font-mono">
                          Para suscripción y fechas
                        </span>
                      </div>
                      <input
                        type="text"
                        value={clienteId}
                        onChange={(e) => setClienteId(e.target.value.toUpperCase())}
                        placeholder="Ej. CLI-001 / CLI-1002 / J-40918274-1"
                        className="w-full bg-[#0d0f14] border border-blue-500/60 rounded-lg px-3 py-2 text-xs text-white font-mono font-bold tracking-wider placeholder-slate-500 focus:outline-none focus:border-blue-400 uppercase"
                        required
                      />
                      <p className="text-[10px] text-slate-400">
                        Este es el código que el sistema buscará en la columna <strong>ID_CLIENTE</strong> de su Google Sheet para validar el pago y días de corte.
                      </p>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                        Nombre Comercial del Negocio (Encabezado del Ticket) *
                      </label>
                      <input
                        type="text"
                        value={config.nombreComercial}
                        onChange={(e) => setConfig({ ...config, nombreComercial: e.target.value })}
                        placeholder="Ej. Bodega y Víveres Don Pedro"
                        className="w-full bg-[#0d0f14] border border-slate-700 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 font-bold"
                        required
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                          Razón Social Legal *
                        </label>
                        <input
                          type="text"
                          value={config.razonSocial}
                          onChange={(e) => setConfig({ ...config, razonSocial: e.target.value })}
                          placeholder="Ej. INVERSIONES DON PEDRO, C.A."
                          className="w-full bg-[#0d0f14] border border-slate-700 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
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
                          onChange={(e) => setConfig({ ...config, rif: e.target.value.toUpperCase() })}
                          placeholder="Ej. J-40918274-1 / V-18940214-0"
                          className="w-full bg-[#0d0f14] border border-slate-700 rounded-lg px-3 py-2 text-xs text-white font-mono placeholder-slate-500 focus:outline-none focus:border-blue-500"
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                        Dirección del Establecimiento / Ciudad
                      </label>
                      <input
                        type="text"
                        value={config.direccion}
                        onChange={(e) => setConfig({ ...config, direccion: e.target.value })}
                        placeholder="Ej. Av. Bolívar, Local 12, Frente a la Plaza, Caracas"
                        className="w-full bg-[#0d0f14] border border-slate-700 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                          Teléfono de Contacto
                        </label>
                        <input
                          type="text"
                          value={config.telefono}
                          onChange={(e) => setConfig({ ...config, telefono: e.target.value })}
                          placeholder="Ej. 0212-5551234 / 0412-5551234"
                          className="w-full bg-[#0d0f14] border border-slate-700 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                          WhatsApp de Cobros (Para fiados)
                        </label>
                        <input
                          type="text"
                          value={config.whatsappCobros}
                          onChange={(e) => setConfig({ ...config, whatsappCobros: e.target.value })}
                          placeholder="Ej. +58 412 5551234"
                          className="w-full bg-[#0d0f14] border border-slate-700 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                        Mensaje de Pie de Ticket
                      </label>
                      <input
                        type="text"
                        value={config.pieTicket}
                        onChange={(e) => setConfig({ ...config, pieTicket: e.target.value })}
                        placeholder="Ej. ¡Gracias por su compra! Vuelva pronto."
                        className="w-full bg-[#0d0f14] border border-slate-700 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Live Thermal Ticket Preview */}
              <div className="lg:col-span-5 flex flex-col">
                <div className="bg-[#181b24] p-4 rounded-xl border border-slate-800 flex-1 flex flex-col justify-between">
                  <div>
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5 mb-3">
                      <Receipt className="w-4 h-4 text-emerald-400" /> Vista Previa del Ticket Térmico
                    </h3>

                    <div className="bg-white text-slate-900 p-4 rounded-lg shadow-inner font-mono text-[11px] leading-tight space-y-1.5 border border-slate-300">
                      <div className="text-center pb-1 border-b border-dashed border-slate-400">
                        <div className="font-extrabold text-xs uppercase tracking-tight">
                          {config.nombreComercial || "NOMBRE DEL COMERCIO"}
                        </div>
                        <div className="text-[10px] text-slate-600">
                          {config.razonSocial || "RAZÓN SOCIAL, C.A."}
                        </div>
                        <div className="text-[10px] font-bold">
                          RIF: {config.rif || "J-00000000-0"}
                        </div>
                        <div className="text-[9px] text-slate-600 truncate">
                          {config.direccion || "Dirección del Establecimiento"}
                        </div>
                        <div className="text-[9px] text-slate-600">
                          TELF: {config.telefono || "+58 412-0000000"}
                        </div>
                      </div>

                      <div className="py-1 text-[10px] space-y-0.5 border-b border-dashed border-slate-400">
                        <div className="flex justify-between">
                          <span>FACTURA: 000452</span>
                          <span>FECHA: {new Date().toLocaleDateString()}</span>
                        </div>
                        <div className="flex justify-between text-slate-600">
                          <span>TASA OFICIAL BCV:</span>
                          <span className="font-bold">Bs. {bcvRate.toFixed(2)}</span>
                        </div>
                      </div>

                      <div className="py-1 text-[10px] space-y-1 border-b border-dashed border-slate-400">
                        <div className="flex justify-between">
                          <span>1x Harina PAN 1kg (E)</span>
                          <span>$1.40</span>
                        </div>
                        <div className="flex justify-between">
                          <span>1x Arroz Blanco 1kg (E)</span>
                          <span>$1.55</span>
                        </div>
                      </div>

                      <div className="pt-1 text-[11px] font-bold space-y-0.5">
                        <div className="flex justify-between text-base font-extrabold">
                          <span>TOTAL A PAGAR:</span>
                          <span>$ 2.95</span>
                        </div>
                        <div className="flex justify-between text-emerald-800 text-xs">
                          <span>TOTAL EN BS. BCV:</span>
                          <span>Bs. {(2.95 * bcvRate).toFixed(2)}</span>
                        </div>
                      </div>

                      <div className="text-center pt-2 text-[9px] text-slate-600 border-t border-dashed border-slate-400 italic">
                        {config.pieTicket || "¡Gracias por su compra!"}
                      </div>
                    </div>
                  </div>

                  <p className="text-[10px] text-slate-500 text-center mt-3">
                    Este encabezado se imprimirá en sus recibos de 58mm y 80mm.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* ============================================================= */}
          {/* PASO 3: MODO OPERATIVO DE COBRO POS */}
          {/* ============================================================= */}
          {step === 3 && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="text-center sm:text-left">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Smartphone className="w-4 h-4 text-blue-400" />
                  <span>Paso 3: ¿Cómo desea cobrar en el Punto de Venta?</span>
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Elija si operará totalizando en pantalla o integrando un terminal bancario SmartPOS.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
                {/* Modo Solo Inventario */}
                <div
                  onClick={() => setSelectedPosMode("inventory_only")}
                  className={`p-5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between relative group ${
                    selectedPosMode === "inventory_only"
                      ? "bg-gradient-to-b from-amber-950/40 via-[#181615] to-[#12141c] border-amber-500 shadow-xl shadow-amber-950/40 ring-2 ring-amber-500/20"
                      : "bg-[#161822] border-slate-800 hover:border-amber-500/40 hover:bg-[#191c28]"
                  }`}
                >
                  {selectedPosMode === "inventory_only" && (
                    <div className="absolute -top-3 right-4 px-2.5 py-0.5 rounded-full bg-amber-500 text-slate-950 text-[10px] font-black uppercase tracking-wider flex items-center gap-1 shadow-md">
                      <CheckCircle2 className="w-3 h-3 stroke-[3]" />
                      Recomendado
                    </div>
                  )}

                  <div>
                    <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 mb-3">
                      <ShoppingCart className="w-5 h-5" />
                    </div>

                    <h4 className="text-base font-bold text-white group-hover:text-amber-300 transition-colors">
                      🛒 Solo Inventario & Total (Sin Datáfono)
                    </h4>
                    <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                      La forma más ágil: totaliza las ventas, calcula vueltos en $ y Bs., descuenta inventario y emite tickets sin necesidad de enlazar un datáfono físico.
                    </p>

                    <div className="mt-4 space-y-1.5 text-xs text-slate-300 border-t border-slate-800/80 pt-3">
                      <div>✓ Ideal para cobros con Pago Móvil, efectivo $ y bolívares.</div>
                      <div>✓ 0 configuraciones de red o cables adicionales.</div>
                    </div>
                  </div>

                  <div className="mt-5 pt-3 border-t border-slate-800">
                    <span className="text-xs text-amber-400 font-semibold">
                      {selectedPosMode === "inventory_only" ? "✓ Modo Seleccionado" : "Clic para seleccionar"}
                    </span>
                  </div>
                </div>

                {/* Modo SmartPOS */}
                <div
                  onClick={() => setSelectedPosMode("smartpos")}
                  className={`p-5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between relative group ${
                    selectedPosMode === "smartpos"
                      ? "bg-gradient-to-b from-blue-950/40 via-[#131722] to-[#12141c] border-blue-500 shadow-xl shadow-blue-950/40 ring-2 ring-blue-500/20"
                      : "bg-[#161822] border-slate-800 hover:border-blue-500/40 hover:bg-[#191c28]"
                  }`}
                >
                  {selectedPosMode === "smartpos" && (
                    <div className="absolute -top-3 right-4 px-2.5 py-0.5 rounded-full bg-blue-500 text-white text-[10px] font-black uppercase tracking-wider flex items-center gap-1 shadow-md">
                      <CheckCircle2 className="w-3 h-3 stroke-[3]" />
                      Seleccionado
                    </div>
                  )}

                  <div>
                    <div className="w-10 h-10 rounded-xl bg-blue-500/20 border border-blue-500/40 flex items-center justify-center text-blue-400 mb-3">
                      <Smartphone className="w-5 h-5" />
                    </div>

                    <h4 className="text-base font-bold text-white group-hover:text-blue-300 transition-colors">
                      📲 Terminal SmartPOS Integrado (Datáfono)
                    </h4>
                    <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                      Envía automáticamente el monto de cada venta en Bs. al terminal SmartPOS bancario (WizarPOS, PAX, MegaSoft, Bancamiga, Credicard).
                    </p>

                    <div className="mt-4 space-y-1.5 text-xs text-slate-300 border-t border-slate-800/80 pt-3">
                      <div>✓ Envío de monto por red local TCP/IP o Bluetooth.</div>
                      <div>✓ Registro de número de lote y aprobación bancaria.</div>
                    </div>
                  </div>

                  <div className="mt-5 pt-3 border-t border-slate-800">
                    <span className="text-xs text-blue-400 font-semibold">
                      {selectedPosMode === "smartpos" ? "✓ Modo Seleccionado" : "Clic para seleccionar"}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ============================================================= */}
          {/* PASO 4: DEFINIR PIN DE SEGURIDAD DEL ADMINISTRADOR */}
          {/* ============================================================= */}
          {step === 4 && (
            <div className="space-y-5 animate-in fade-in duration-150">
              <div className="text-center sm:text-left">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Lock className="w-5 h-5 text-amber-400" />
                  <span>Paso 4: Definir PIN de Seguridad para el Administrador</span>
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Este PIN protegerá el acceso a las funciones de dueño del negocio, cierres de caja, anulaciones, inventario y configuración.
                </p>
              </div>

              <div className="bg-[#181b24] p-5 sm:p-6 rounded-2xl border border-slate-800 space-y-5">
                <div className="flex items-center gap-3 p-3.5 bg-amber-950/30 border border-amber-500/40 rounded-xl text-xs text-amber-200">
                  <KeyRound className="w-5 h-5 text-amber-400 shrink-0" />
                  <div>
                    <span className="font-bold text-amber-300 block">Acceso Principal de Propietario (ADMIN)</span>
                    <span>Por defecto el PIN es <strong>1234</strong>. Ingrese su nuevo código secreto numérico de 4 a 6 dígitos.</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Campo PIN Principal */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-200">
                      PIN de Administrador (4 a 6 dígitos) *
                    </label>
                    <div className="relative">
                      <input
                        type={showPinText ? "text" : "password"}
                        maxLength={6}
                        value={adminPin}
                        onChange={(e) => setAdminPin(e.target.value.replace(/[^0-9a-zA-Z]/g, ""))}
                        placeholder="Ej. 1234, 2580"
                        className="w-full bg-[#0d0f14] border border-amber-500/60 focus:border-amber-400 rounded-xl px-4 py-3 text-lg font-mono font-extrabold text-amber-300 tracking-widest text-center focus:outline-none"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPinText(!showPinText)}
                        className="absolute right-3 top-3.5 text-slate-400 hover:text-white cursor-pointer"
                        title={showPinText ? "Ocultar PIN" : "Mostrar PIN"}
                      >
                        {showPinText ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Campo Confirmación PIN */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-200">
                      Confirmar PIN de Administrador *
                    </label>
                    <div className="relative">
                      <input
                        type={showPinText ? "text" : "password"}
                        maxLength={6}
                        value={confirmAdminPin}
                        onChange={(e) => setConfirmAdminPin(e.target.value.replace(/[^0-9a-zA-Z]/g, ""))}
                        placeholder="Repita el PIN"
                        className={`w-full bg-[#0d0f14] border rounded-xl px-4 py-3 text-lg font-mono font-extrabold tracking-widest text-center focus:outline-none ${
                          confirmAdminPin && adminPin !== confirmAdminPin
                            ? "border-rose-500 text-rose-400"
                            : "border-slate-700 text-emerald-300 focus:border-emerald-400"
                        }`}
                        required
                      />
                    </div>
                    {confirmAdminPin && adminPin !== confirmAdminPin && (
                      <p className="text-[11px] text-rose-400 font-semibold mt-1">
                        ⚠️ Los PIN no coinciden.
                      </p>
                    )}
                    {confirmAdminPin && adminPin === confirmAdminPin && adminPin.length >= 4 && (
                      <p className="text-[11px] text-emerald-400 font-semibold mt-1 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> PIN Válido y Confirmado.
                      </p>
                    )}
                  </div>
                </div>

                <div className="bg-[#11131a] p-3.5 rounded-xl border border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
                  <span>Usuario Administrador: <strong className="text-white">Propietario (admin)</strong></span>
                  <span className="font-mono text-amber-400 font-bold">Rol: SUPERADMIN</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer Controls */}
        <div className="p-4 bg-[#0e1017] border-t border-slate-800 flex items-center justify-between shrink-0">
          <div>
            {step > 1 ? (
              <button
                type="button"
                onClick={() => setStep((prev) => (prev - 1) as any)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl transition cursor-pointer"
              >
                ← Volver al Paso {step - 1}
              </button>
            ) : (
              <span className="text-xs text-slate-500">Paso 1 de 4: Selección de Versión</span>
            )}
          </div>

          <div className="flex items-center gap-3">
            {step < 4 ? (
              <button
                type="button"
                onClick={() => {
                  if (step === 2) {
                    if (!config.nombreComercial.trim()) {
                      showToast("❌ Ingrese el nombre comercial del negocio.");
                      return;
                    }
                    if (!config.rif.trim()) {
                      showToast("❌ Ingrese el RIF o Cédula fiscal.");
                      return;
                    }
                  }
                  setStep((prev) => (prev + 1) as any);
                }}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-blue-900/40 transition flex items-center gap-2 cursor-pointer"
              >
                <span>Continuar al Paso {step + 1}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => handleFinishSetup()}
                className="px-6 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-extrabold rounded-xl shadow-lg shadow-emerald-950/60 transition flex items-center gap-2 cursor-pointer hover:scale-105 active:scale-95"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>¡Guardar y Empezar a Facturar!</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
