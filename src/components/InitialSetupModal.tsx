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
  MessageCircle,
  Lock,
  Eye,
  EyeOff,
  KeyRound,
  Key,
  Loader2,
  AlertTriangle,
  Wifi,
  BadgeCheck,
  Calendar,
  Layers,
} from "lucide-react";
import { NegocioClienteConfig, PosOperationalMode, RubroNegocio, RemoteClientLicense } from "../types";
import {
  saveStoredNegocioConfig,
  saveAppEdition,
  savePosOperationalMode,
  saveRemoteLicense,
  getRemoteLicense,
  getStoredUsers,
  saveStoredUsers,
  saveStoredCurrentUser,
  unlockFiscalEdition,
  revokeFiscalEdition,
  parseContractedEdition,
  getCuotaMensualPorEdicion,
  prepararSistemaParaNuevoCliente,
} from "../mockDb";
import {
  verifyLicenseOnline,
  autoRegisterBusinessInFirestore,
  getTodayDateStr,
  getOneMonthExpiryFromToday,
} from "../services/licenseService";

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
  // Pasos: 1: Licencia (Client ID), 2: Versión (Bodega/Fiscal), 3: Datos Negocio, 4: Modo Cobro, 5: PIN Admin
  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5>(1);
  const [selectedEdition, setSelectedEdition] = useState<"bodega" | "fiscal">(initialEdition);
  const [selectedPosMode, setSelectedPosMode] = useState<PosOperationalMode>(initialPosMode);
  const [unlockedWithMasterCode, setUnlockedWithMasterCode] = useState<boolean>(false);

  // Estado del Client ID y Validación de Licencia Remota (inicia vacío por defecto)
  const [clienteId, setClienteId] = useState<string>("");
  const [isCheckingLicense, setIsCheckingLicense] = useState<boolean>(false);
  const [licenseResult, setLicenseResult] = useState<{
    valid: boolean;
    message: string;
    license?: RemoteClientLicense;
    datosInscritos?: boolean;
  } | null>(null);
  const [isLicenseValidated, setIsLicenseValidated] = useState<boolean>(false);

  // Estado de Seguridad y PIN
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
  const [targetSetupEdition, setTargetSetupEdition] = useState<"bodega" | "fiscal">("fiscal");
  const [fiscalCodeInput, setFiscalCodeInput] = useState<string>("");

  // Estado de Datos del Negocio (vacío por defecto en primera instalación)
  const [config, setConfig] = useState<NegocioClienteConfig>({
    ...initialConfig,
    nombreComercial: initialConfig.nombreComercial || "",
    razonSocial: initialConfig.razonSocial || "",
    rif: initialConfig.rif || "",
    direccion: initialConfig.direccion || "",
    telefono: initialConfig.telefono || "",
    whatsappCobros: initialConfig.whatsappCobros || "",
    pieTicket: initialConfig.pieTicket || "¡Gracias por su compra! Conserve este comprobante.",
  });

  if (!isOpen) return null;

  // Manejo de Validación en Vivo del Client ID
  const handleValidateClientLicense = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const clean = clienteId.trim().toUpperCase();
    if (!clean) {
      showToast("❌ Por favor ingrese el Client ID proporcionado por su proveedor.");
      return;
    }

    setIsCheckingLicense(true);
    setLicenseResult(null);

    try {
      const res = await verifyLicenseOnline(clean);
      if (res.valid && res.license) {
        const contracted = parseContractedEdition(res.license.edicion_contratada);
        const normalizedLic: RemoteClientLicense = {
          ...res.license,
          edicion_contratada: contracted,
        };
        const yaInscritos = Boolean(res.datosInscritos);

        setIsLicenseValidated(true);
        setLicenseResult({
          valid: true,
          message: res.message,
          license: normalizedLic,
          datosInscritos: yaInscritos,
        });
        saveRemoteLicense(normalizedLic);
        setUnlockedWithMasterCode(false);
        if (contracted === "bodega") {
          revokeFiscalEdition();
          setSelectedEdition("bodega");
        } else if (contracted === "fiscal") {
          setSelectedEdition("fiscal");
        }

        // Si la licencia ya tiene todos los datos del comercio inscritos en el sistema, cargarlos automáticamente
        if (yaInscritos) {
          const loadedConfig: NegocioClienteConfig = {
            ...config,
            nombreComercial: normalizedLic.nombre_negocio || config.nombreComercial,
            razonSocial: normalizedLic.nombre_negocio || config.razonSocial,
            rif: normalizedLic.rif_cedula || config.rif,
            telefono: normalizedLic.telefono_contacto || config.telefono,
            whatsappCobros: normalizedLic.telefono_contacto || config.whatsappCobros,
          };
          setConfig(loadedConfig);
          saveStoredNegocioConfig(loadedConfig);
          showToast("✅ ¡Licencia verificada y datos del comercio cargados automáticamente!");
        } else {
          showToast("✅ ¡Licencia validada exitosamente!");
        }
      } else {
        setIsLicenseValidated(false);
        setLicenseResult({
          valid: false,
          message: res.message || "Licencia no válida o inactiva.",
          license: res.license,
          datosInscritos: false,
        });
        showToast("❌ " + (res.message || "Código de licencia no válido."));
      }
    } catch {
      setIsLicenseValidated(false);
      setLicenseResult({
        valid: false,
        message: "Error de red al consultar el servidor. Verifique su conexión a internet.",
      });
      showToast("❌ Error al conectar con el servidor de licencias.");
    } finally {
      setIsCheckingLicense(false);
    }
  };

  const handleSelectBodegaEdition = () => {
    const contractedEdition = parseContractedEdition(
      licenseResult?.license?.edicion_contratada || getRemoteLicense().edicion_contratada
    );
    if (
      contractedEdition === "bodega" ||
      contractedEdition === "ambas" ||
      unlockedWithMasterCode
    ) {
      setSelectedEdition("bodega");
    } else {
      setTargetSetupEdition("bodega");
      setShowFiscalCodePrompt(true);
      setFiscalCodeInput("");
    }
  };

  const handleSelectFiscalEdition = () => {
    const contractedEdition = parseContractedEdition(
      licenseResult?.license?.edicion_contratada || getRemoteLicense().edicion_contratada
    );
    if (
      contractedEdition === "fiscal" ||
      contractedEdition === "ambas" ||
      unlockedWithMasterCode
    ) {
      setSelectedEdition("fiscal");
    } else {
      revokeFiscalEdition();
      setTargetSetupEdition("fiscal");
      setShowFiscalCodePrompt(true);
      setFiscalCodeInput("");
    }
  };

  const handleValidateFiscalCodeInSetup = () => {
    const clean = fiscalCodeInput.trim();
    if (!clean) {
      showToast(
        targetSetupEdition === "fiscal"
          ? "❌ Introduzca el Código de activación para la Edición Fiscal"
          : "❌ Introduzca el Código de activación para la Edición Bodega"
      );
      return;
    }
    const res = unlockFiscalEdition(clean, targetSetupEdition);
    if (res.success) {
      setUnlockedWithMasterCode(true);
      setSelectedEdition(targetSetupEdition);
      setShowFiscalCodePrompt(false);
      setFiscalCodeInput("");
      showToast(
        targetSetupEdition === "fiscal"
          ? "✅ Edición Fiscal SENIAT activada."
          : "✅ Edición Bodega y Mostrador activada."
      );
    } else {
      showToast("❌ Código incorrecto. Verifique el código de activación.");
      setFiscalCodeInput("");
    }
  };

  // Guardado Final y Puesta en Marcha con sincronización de datos a Firebase
  const handleFinishSetup = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (!isLicenseValidated) {
      showToast("❌ Debe validar un Client ID válido antes de continuar.");
      setStep(1);
      return;
    }

    if (!config.nombreComercial.trim()) {
      showToast("❌ Por favor ingrese el nombre comercial del negocio.");
      setStep(3);
      return;
    }
    if (!config.rif.trim()) {
      showToast("❌ Por favor ingrese el RIF o Cédula fiscal.");
      setStep(3);
      return;
    }

    const cleanPin = adminPin.trim();
    if (cleanPin.length < 4) {
      showToast("❌ El PIN de Administrador debe tener al menos 4 dígitos.");
      setStep(5);
      return;
    }
    if (cleanPin !== confirmAdminPin.trim()) {
      showToast("❌ La confirmación del PIN no coincide.");
      setStep(5);
      return;
    }

    const currentLic = getRemoteLicense();
    const finalClienteId = (currentLic?.cliente_id || clienteId).trim() || "CLI-001";
    const contractedEdition = parseContractedEdition(
      licenseResult?.license?.edicion_contratada || currentLic.edicion_contratada || "bodega"
    );

    // Determinar la edición activa inicial según la licencia en Firebase
    let finalActiveEdition: "bodega" | "fiscal" = selectedEdition;
    if (!unlockedWithMasterCode && contractedEdition !== "ambas") {
      finalActiveEdition = contractedEdition;
    }

    const finalContractedEdition =
      unlockedWithMasterCode || contractedEdition === "ambas"
        ? "ambas"
        : finalActiveEdition;

    // 1. Preparar base de datos limpia (0 artículos, 0 ventas, 0 movimientos, 0 fiados, 0 cierres) y guardar configuración
    prepararSistemaParaNuevoCliente("LIMPIO", config.rubro || "bodega", config);
    saveStoredNegocioConfig(config);
    saveAppEdition(finalActiveEdition);
    savePosOperationalMode(selectedPosMode);

    // 2. Actualizar credenciales del usuario Administrador
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

    // 3. Calcular fecha de instalación (hoy), fecha de vencimiento (1 mes) y cuota mensual ($15 Bodega / $25 Fiscal / $35 Ambas)
    const fechaInstalacionHoy = getTodayDateStr();
    const fechaVencimientoUnMes = getOneMonthExpiryFromToday();
    const cuotaMensualUsd = getCuotaMensualPorEdicion(finalContractedEdition);

    saveRemoteLicense({
      ...currentLic,
      cliente_id: finalClienteId,
      nombre_negocio: config.nombreComercial,
      rif_cedula: config.rif,
      telefono_contacto: config.telefono,
      edicion_contratada: finalContractedEdition,
      cuota_mensual_usd: cuotaMensualUsd,
      fecha_instalacion: fechaInstalacionHoy,
      fecha_vencimiento_actual: fechaVencimientoUnMes,
    });

    // 4. Registrar automáticamente los datos del negocio, cuota_mensual_usd y fecha_vencimiento_actual en Firebase Firestore
    // Nota: Excluye expresamente 'direccion_fiscal' por requerimiento.
    try {
      const fbRes = await autoRegisterBusinessInFirestore({
        clienteId: finalClienteId,
        nombreNegocio: config.nombreComercial,
        rifCedula: config.rif,
        telefonoContacto: config.telefono,
        edicionContratada: finalContractedEdition,
        cuotaMensualUsd,
        fechaInstalacion: fechaInstalacionHoy,
        fechaVencimientoActual: fechaVencimientoUnMes,
        forceEditionUpgrade: unlockedWithMasterCode,
      });
      if (fbRes.success) {
        console.log("[InitialSetup] Datos comerciales, cuota_mensual_usd y fecha_vencimiento_actual registrados en Firebase Firestore.");
      }
    } catch (err) {
      console.warn("[InitialSetup] Error registrando datos en Firebase:", err);
    }

    onComplete(config, finalActiveEdition, selectedPosMode);
    showToast(
      `✅ ¡Configuración guardada para "${config.nombreComercial}"! Vigencia activa hasta ${fechaVencimientoUnMes}.`
    );
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
                    Bienvenido a FaradayPOS
                  </h2>
                  <span className="text-[10px] uppercase font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-600/50">
                    Activación & Configuración
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  Active su licencia con su Client ID y personalice los datos de su negocio en 5 sencillos pasos.
                </p>
              </div>
            </div>
          </div>

          {/* Stepper Navigation */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mt-5 pt-3 border-t border-slate-800/80 text-xs font-semibold">
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
              <span className="truncate">1. Licencia</span>
            </button>

            <button
              type="button"
              onClick={() => {
                if (!isLicenseValidated) {
                  showToast("⚠️ Debe validar su Client ID antes de avanzar.");
                  return;
                }
                setStep(2);
              }}
              className={`flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg border transition-all cursor-pointer ${
                step === 2
                  ? "bg-blue-600 text-white border-blue-500 shadow-md shadow-blue-900/30"
                  : "bg-slate-900/60 text-slate-400 border-slate-800 hover:text-slate-200"
              }`}
            >
              <span className="w-4 h-4 rounded-full bg-white/20 flex items-center justify-center text-[10px] font-bold">2</span>
              <span className="truncate">2. Versión</span>
            </button>

            <button
              type="button"
              onClick={() => {
                if (!isLicenseValidated) {
                  showToast("⚠️ Debe validar su Client ID antes de avanzar.");
                  return;
                }
                setStep(3);
              }}
              className={`flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg border transition-all cursor-pointer ${
                step === 3
                  ? "bg-blue-600 text-white border-blue-500 shadow-md shadow-blue-900/30"
                  : "bg-slate-900/60 text-slate-400 border-slate-800 hover:text-slate-200"
              }`}
            >
              <span className="w-4 h-4 rounded-full bg-white/20 flex items-center justify-center text-[10px] font-bold">3</span>
              <span className="truncate">3. Negocio</span>
            </button>

            <button
              type="button"
              onClick={() => {
                if (!isLicenseValidated) {
                  showToast("⚠️ Debe validar su Client ID antes de avanzar.");
                  return;
                }
                setStep(4);
              }}
              className={`flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg border transition-all cursor-pointer ${
                step === 4
                  ? "bg-blue-600 text-white border-blue-500 shadow-md shadow-blue-900/30"
                  : "bg-slate-900/60 text-slate-400 border-slate-800 hover:text-slate-200"
              }`}
            >
              <span className="w-4 h-4 rounded-full bg-white/20 flex items-center justify-center text-[10px] font-bold">4</span>
              <span className="truncate">4. Modo Cobro</span>
            </button>

            <button
              type="button"
              onClick={() => {
                if (!isLicenseValidated) {
                  showToast("⚠️ Debe validar su Client ID antes de avanzar.");
                  return;
                }
                setStep(5);
              }}
              className={`flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg border transition-all cursor-pointer ${
                step === 5
                  ? "bg-amber-500 text-slate-950 font-extrabold border-amber-400 shadow-md shadow-amber-950/40"
                  : "bg-slate-900/60 text-slate-400 border-slate-800 hover:text-slate-200"
              }`}
            >
              <span className="w-4 h-4 rounded-full bg-black/20 flex items-center justify-center text-[10px] font-bold">5</span>
              <span className="truncate">5. PIN Admin</span>
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-6">
          {/* ============================================================= */}
          {/* PASO 1: ACTIVACIÓN DE LICENCIA (CLIENT ID) */}
          {/* ============================================================= */}
          {step === 1 && (
            <div className="space-y-5 animate-in fade-in duration-150 max-w-2xl mx-auto py-2">
              <div className="text-center space-y-1.5">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-blue-500/10 border border-blue-500/30 text-blue-400 mb-1">
                  <Key className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-extrabold text-white">
                  Paso 1: Activación de Licencia de Uso
                </h3>
                <p className="text-xs text-slate-400 max-w-md mx-auto">
                  Ingrese el código de licencia (<strong>Client ID</strong>) proporcionado por su proveedor para habilitar y activar este equipo.
                </p>
              </div>

              {/* Formulario de Validación de Client ID */}
              <form onSubmit={handleValidateClientLicense} className="space-y-4">
                <div className="bg-[#181b24] p-5 rounded-2xl border border-slate-800 shadow-lg space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      Código de Licencia (Client ID) *:
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                        <Key className="w-4 h-4" />
                      </div>
                      <input
                        type="text"
                        required
                        value={clienteId}
                        onChange={(e) => {
                          setClienteId(e.target.value.toUpperCase());
                          if (isLicenseValidated) setIsLicenseValidated(false);
                          setLicenseResult(null);
                        }}
                        placeholder="Ej: CLI-1001 o CLI-BODEGA"
                        className="w-full pl-10 pr-4 py-3 bg-[#0d1017] border border-slate-700 rounded-xl text-white font-mono text-base font-bold tracking-wider placeholder:text-slate-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 uppercase transition-all"
                      />
                    </div>
                    <span className="text-[11px] text-slate-400 mt-1 block">
                      Este código enlaza su equipo con el plan contratado proporcionado por su proveedor.
                    </span>
                  </div>

                  <button
                    type="submit"
                    disabled={isCheckingLicense || !clienteId.trim()}
                    className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-lg shadow-blue-900/40 transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {isCheckingLicense ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin text-white" />
                        <span>Consultando Servidor de Licencias...</span>
                      </>
                    ) : (
                      <>
                        <Wifi className="w-4 h-4 text-blue-200" />
                        <span>Verificar y Activar Licencia</span>
                      </>
                    )}
                  </button>
                </div>
              </form>

              {/* Resultado de la Validación */}
              {licenseResult && (
                <div
                  className={`p-4 rounded-2xl border text-xs animate-in zoom-in-95 duration-150 ${
                    licenseResult.valid
                      ? "bg-emerald-950/40 border-emerald-500/50 text-emerald-200"
                      : "bg-rose-950/40 border-rose-500/50 text-rose-200"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {licenseResult.valid ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                    ) : (
                      <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                    )}
                    <div className="space-y-1.5 flex-1">
                      <div className="font-bold text-sm">
                        {licenseResult.valid ? "¡Licencia Verificada y Lista para Usar!" : "No se pudo activar la licencia"}
                      </div>
                      <p className="text-[11px] text-slate-300 leading-relaxed">
                        {licenseResult.message}
                      </p>

                      {licenseResult.valid && licenseResult.license && (
                        <div className="space-y-2 pt-2 border-t border-emerald-800/40 font-mono text-[11px]">
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <span className="text-slate-400">Client ID: </span>
                              <strong className="text-white">{licenseResult.license.cliente_id}</strong>
                            </div>
                            <div>
                              <span className="text-slate-400">Estado: </span>
                              <span className="text-emerald-400 font-bold">🟢 ACTIVO</span>
                            </div>
                            <div>
                              <span className="text-slate-400">Válida hasta: </span>
                              <strong className="text-amber-300">{licenseResult.license.fecha_vencimiento_actual}</strong>
                            </div>
                            <div>
                              <span className="text-slate-400">Edición: </span>
                              <strong className="text-blue-300 uppercase">
                                {licenseResult.license.edicion_contratada === "ambas"
                                  ? "Bodega + Fiscal (Ambas)"
                                  : licenseResult.license.edicion_contratada === "fiscal"
                                  ? "Fiscal SENIAT"
                                  : "Bodega & Mostrador"}
                              </strong>
                            </div>
                          </div>

                          {licenseResult.datosInscritos && (
                            <div className="p-2.5 rounded-xl bg-emerald-900/30 border border-emerald-500/40 space-y-1">
                              <div className="text-[11px] font-bold text-emerald-300 flex items-center gap-1.5 font-sans">
                                <BadgeCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                                <span>Datos del comercio ya inscritos en el sistema:</span>
                              </div>
                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5 text-[11px]">
                                <div>
                                  <span className="text-slate-400">Comercio: </span>
                                  <strong className="text-white">{licenseResult.license.nombre_negocio}</strong>
                                </div>
                                <div>
                                  <span className="text-slate-400">RIF: </span>
                                  <strong className="text-amber-300">{licenseResult.license.rif_cedula}</strong>
                                </div>
                                <div>
                                  <span className="text-slate-400">Teléfono: </span>
                                  <strong className="text-slate-200">{licenseResult.license.telefono_contacto}</strong>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {licenseResult.valid && (
                    <div className="mt-3 pt-2.5 border-t border-emerald-800/40 flex flex-wrap items-center justify-end gap-2">
                      {licenseResult.datosInscritos ? (
                        <>
                          <button
                            type="button"
                            onClick={() => setStep(2)}
                            className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs rounded-lg transition-all cursor-pointer border border-slate-700"
                          >
                            Revisar Pasos
                          </button>
                          <button
                            type="button"
                            onClick={() => handleFinishSetup()}
                            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-lg transition-all flex items-center gap-1.5 cursor-pointer shadow"
                          >
                            <span>Cargar Datos Inscritos e Iniciar</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        </>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setStep(2)}
                          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-lg transition-all flex items-center gap-1.5 cursor-pointer shadow"
                        >
                          <span>Continuar a Selección de Versión</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Tarjeta Informativa de Asistencia */}
              <div className="p-3.5 bg-[#10131a] border border-slate-800/80 rounded-xl text-xs text-slate-400 space-y-1">
                <span className="font-semibold text-slate-300">💡 ¿No posee un Client ID?</span>
                <p className="text-[11px] leading-relaxed">
                  Comuníquese con el proveedor de su sistema para recibir el código de activación asignado a su comercio.
                </p>
              </div>
            </div>
          )}

          {/* ============================================================= */}
          {/* PASO 2: SELECCIONAR LA VERSIÓN / EDICIÓN */}
          {/* ============================================================= */}
          {step === 2 && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="text-center sm:text-left">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  <span>Paso 2: ¿Qué tipo de negocio tiene? Elija su versión:</span>
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  El sistema verifica la edición contratada en Firebase. Si posee ambas ediciones o activa la segunda con su código, podrá alternar libremente entre ellas.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
                {/* Opción A: Bodega & Abasto */}
                <div
                  onClick={handleSelectBodegaEdition}
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
                    {targetSetupEdition === "fiscal"
                      ? "Introduzca el Código de activación para la Edición Fiscal"
                      : "Introduzca el Código de activación para la Edición Bodega"}
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
          {/* PASO 3: DATOS DEL NEGOCIO (EL CLIENTE LOS INTRODUCE DIRECTAMENTE) */}
          {/* ============================================================= */}
          {step === 3 && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-in fade-in duration-150">
              {/* Formulario */}
              <div className="lg:col-span-7 space-y-4">
                <div className="bg-[#181b24] p-4 rounded-xl border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold text-blue-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Building2 className="w-4 h-4" /> Datos de Identificación del Comercio
                    </h3>
                    <span className="text-[11px] font-mono text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/40">
                      ID: {clienteId || "CLI-001"}
                    </span>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1">
                        Nombre Comercial (Letrero / Tienda) *:
                      </label>
                      <input
                        type="text"
                        required
                        value={config.nombreComercial}
                        onChange={(e) => setConfig({ ...config, nombreComercial: e.target.value })}
                        placeholder="Ej: Bodega La Bendición, C.A."
                        className="w-full bg-[#11131a] border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500 font-semibold"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-slate-300 mb-1">
                          RIF o Cédula Fiscal *:
                        </label>
                        <input
                          type="text"
                          required
                          value={config.rif}
                          onChange={(e) => setConfig({ ...config, rif: e.target.value.toUpperCase() })}
                          placeholder="J-12345678-0 o V-12345678"
                          className="w-full bg-[#11131a] border border-slate-700 rounded-lg px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-blue-500 uppercase"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-slate-300 mb-1">
                          Rubro del Comercio:
                        </label>
                        <select
                          value={config.rubro || "bodega"}
                          onChange={(e) => setConfig({ ...config, rubro: e.target.value as RubroNegocio })}
                          className="w-full bg-[#11131a] border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                        >
                          <option value="bodega">Bodega / Minimarket / Abasto</option>
                          <option value="farmacia">Farmacia / Droguería</option>
                          <option value="charcuteria">Charcutería / Carnicería</option>
                          <option value="ferreteria">Ferretería / Materiales</option>
                          <option value="repuestos">Venta de Repuestos / Taller</option>
                          <option value="ropa_calzado">Tienda de Ropa y Calzado</option>
                          <option value="restaurante">Restaurante / Comida Rápida</option>
                          <option value="panaderia">Panadería y Pastelería</option>
                          <option value="general">Comercio General</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1">
                        Razón Social (Para Facturas Fiscales):
                      </label>
                      <input
                        type="text"
                        value={config.razonSocial}
                        onChange={(e) => setConfig({ ...config, razonSocial: e.target.value })}
                        placeholder="Ej: DISTRIBUIDORA Y VÍVERES CARACAS, C.A."
                        className="w-full bg-[#11131a] border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>
                </div>

                <div className="bg-[#181b24] p-4 rounded-xl border border-slate-800 space-y-3">
                  <h3 className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Phone className="w-4 h-4" /> Ubicación y Canales de Contacto
                  </h3>

                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1">
                        Dirección Fiscal o Ubicación del Local:
                      </label>
                      <input
                        type="text"
                        value={config.direccion}
                        onChange={(e) => setConfig({ ...config, direccion: e.target.value })}
                        placeholder="Calle o Av., Centro Comercial, Ciudad, Estado"
                        className="w-full bg-[#11131a] border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-slate-300 mb-1">
                          Teléfono de Contacto:
                        </label>
                        <input
                          type="text"
                          value={config.telefono}
                          onChange={(e) => setConfig({ ...config, telefono: e.target.value })}
                          placeholder="0212-5551234 o 0414-1234567"
                          className="w-full bg-[#11131a] border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-slate-300 mb-1">
                          WhatsApp para Enviar Comprobantes:
                        </label>
                        <input
                          type="text"
                          value={config.whatsappCobros}
                          onChange={(e) => setConfig({ ...config, whatsappCobros: e.target.value })}
                          placeholder="+58 412 1234567"
                          className="w-full bg-[#11131a] border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1">
                        Pie del Comprobante / Ticket de Venta:
                      </label>
                      <input
                        type="text"
                        value={config.pieTicket}
                        onChange={(e) => setConfig({ ...config, pieTicket: e.target.value })}
                        placeholder="¡Gracias por su compra! Conserve este comprobante."
                        className="w-full bg-[#11131a] border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Vista Previa del Ticket Impreso */}
              <div className="lg:col-span-5 flex flex-col items-center justify-start space-y-3">
                <div className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5 self-start">
                  <Receipt className="w-4 h-4 text-emerald-400" />
                  <span>Vista Previa del Ticket / Factura</span>
                </div>

                <div className="w-full max-w-xs bg-white text-slate-900 p-5 rounded-2xl shadow-xl font-mono text-[11px] leading-tight space-y-2 border border-slate-200">
                  <div className="text-center border-b border-dashed border-slate-400 pb-2.5">
                    <p className="font-extrabold text-sm uppercase tracking-tight">
                      {config.nombreComercial || "NOMBRE COMERCIAL"}
                    </p>
                    <p className="text-[10px] text-slate-700 uppercase">
                      {config.razonSocial || "RAZÓN SOCIAL"}
                    </p>
                    <p className="text-[10px] font-bold text-slate-800">
                      RIF: {config.rif || "J-00000000-0"}
                    </p>
                    <p className="text-[9.5px] text-slate-600 mt-1">
                      {config.direccion || "Dirección del comercio"}
                    </p>
                    <p className="text-[9.5px] text-slate-600">
                      TELF: {config.telefono || "+58 412-0000000"}
                    </p>
                  </div>

                  <div className="py-1 text-[10px] space-y-0.5 text-slate-700">
                    <div className="flex justify-between">
                      <span>FACTURA FISCAL:</span>
                      <span className="font-bold"># 00000452</span>
                    </div>
                    <div className="flex justify-between">
                      <span>N° CONTROL:</span>
                      <span className="font-bold">00-00001890</span>
                    </div>
                    <div className="flex justify-between">
                      <span>FECHA / HORA:</span>
                      <span>{new Date().toLocaleString("es-VE")}</span>
                    </div>
                    <div className="flex justify-between font-bold text-blue-900">
                      <span>TASA OFICIAL BCV:</span>
                      <span>Bs. {bcvRate.toFixed(2)}</span>
                    </div>
                  </div>

                  <div className="border-t border-b border-dashed border-slate-400 py-2 space-y-1 text-[10.5px]">
                    <div className="flex justify-between">
                      <span>1x Harina PAN Blanca 1kg</span>
                      <span className="font-bold">$1.40</span>
                    </div>
                    <div className="flex justify-between">
                      <span>1x Arroz Blanco 1kg</span>
                      <span className="font-bold">$1.55</span>
                    </div>
                  </div>

                  <div className="pt-1 text-right space-y-1 text-xs">
                    <div className="flex justify-between font-bold text-sm">
                      <span>TOTAL PAGADO:</span>
                      <span>$2.95 USD</span>
                    </div>
                    <div className="text-[11px] font-extrabold text-blue-700">
                      ≈ Bs. {(2.95 * bcvRate).toFixed(2)}
                    </div>
                  </div>

                  <div className="text-center pt-3 border-t border-dashed border-slate-400 text-[10px] text-slate-600 italic">
                    {config.pieTicket || "¡Gracias por su compra!"}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ============================================================= */}
          {/* PASO 4: MODO OPERATIVO DE COBRO POS */}
          {/* ============================================================= */}
          {step === 4 && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="text-center sm:text-left">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Smartphone className="w-4 h-4 text-blue-400" />
                  <span>Paso 4: ¿Cómo desea cobrar en el Punto de Venta?</span>
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
          {/* PASO 5: SEGURIDAD Y PIN DE ADMINISTRADOR */}
          {/* ============================================================= */}
          {step === 5 && (
            <div className="space-y-4 animate-in fade-in duration-150 max-w-lg mx-auto py-2">
              <div className="text-center space-y-1">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 mb-1">
                  <Lock className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold text-white">
                  Paso 5: Seguridad y Clave del Administrador
                </h3>
                <p className="text-xs text-slate-400">
                  Defina el PIN numérico secreto con el que usted (propietario) accederá a ver ganancias, reportes y configurar el sistema.
                </p>
              </div>

              <div className="bg-[#181b24] p-5 rounded-2xl border border-slate-800 shadow-lg space-y-4">
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      Nuevo PIN de Administrador (Mínimo 4 dígitos) *:
                    </label>
                    <div className="relative">
                      <input
                        type={showPinText ? "text" : "password"}
                        inputMode="numeric"
                        maxLength={8}
                        value={adminPin}
                        onChange={(e) => setAdminPin(e.target.value.replace(/\D/g, ""))}
                        placeholder="Ej: 1234"
                        className="w-full bg-[#11131a] border border-slate-700 rounded-xl px-4 py-2.5 text-center text-lg font-mono font-bold tracking-widest text-white focus:outline-none focus:border-amber-500"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPinText(!showPinText)}
                        className="absolute right-3 top-3 text-slate-400 hover:text-white"
                      >
                        {showPinText ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      Confirmar PIN de Administrador *:
                    </label>
                    <div className="relative">
                      <input
                        type={showPinText ? "text" : "password"}
                        inputMode="numeric"
                        maxLength={8}
                        value={confirmAdminPin}
                        onChange={(e) => setConfirmAdminPin(e.target.value.replace(/\D/g, ""))}
                        placeholder="Repita el PIN"
                        className="w-full bg-[#11131a] border border-slate-700 rounded-xl px-4 py-2.5 text-center text-lg font-mono font-bold tracking-widest text-white focus:outline-none focus:border-amber-500"
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
              <span className="text-xs text-slate-500 font-mono">Paso 1 de 5: Activación de Licencia</span>
            )}
          </div>

          <div className="flex items-center gap-3">
            {step === 1 && (
              isLicenseValidated ? (
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-lg transition flex items-center gap-2 cursor-pointer"
                >
                  <span>Continuar al Paso 2</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => handleValidateClientLicense()}
                  disabled={isCheckingLicense || !clienteId.trim()}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-lg transition flex items-center gap-2 cursor-pointer"
                >
                  {isCheckingLicense ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Validando...</span>
                    </>
                  ) : (
                    <>
                      <Key className="w-4 h-4 text-amber-300" />
                      <span>Verificar y Activar Licencia</span>
                    </>
                  )}
                </button>
              )
            )}

            {step > 1 && step < 5 && (
              <button
                type="button"
                onClick={() => {
                  if (step === 3) {
                    if (!config.nombreComercial.trim()) {
                      showToast("❌ Ingrese el nombre comercial del negocio.");
                      return;
                    }
                    if (!config.rif.trim()) {
                      showToast("❌ Ingrese el RIF o Cédula fiscal.");
                      return;
                    }
                    // Sincronizar inmediatamente a Firebase al completar los datos del negocio
                    const licId = (getRemoteLicense()?.cliente_id || clienteId).trim();
                    if (licId) {
                      const contractedEd = parseContractedEdition(
                        licenseResult?.license?.edicion_contratada || getRemoteLicense().edicion_contratada
                      );
                      const edToSave =
                        unlockedWithMasterCode || contractedEd === "ambas"
                          ? "ambas"
                          : selectedEdition;
                      autoRegisterBusinessInFirestore({
                        clienteId: licId,
                        nombreNegocio: config.nombreComercial,
                        rifCedula: config.rif,
                        telefonoContacto: config.telefono,
                        edicionContratada: edToSave,
                        cuotaMensualUsd: getCuotaMensualPorEdicion(edToSave),
                        forceEditionUpgrade: unlockedWithMasterCode,
                      }).then((res) => {
                        if (res.success) {
                          showToast("☁️ Datos del negocio respaldados en la nube.");
                        }
                      }).catch(() => {});
                    }
                  }
                  setStep((prev) => (prev + 1) as any);
                }}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-blue-900/40 transition flex items-center gap-2 cursor-pointer"
              >
                <span>Continuar al Paso {step + 1}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}

            {step === 5 && (
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
