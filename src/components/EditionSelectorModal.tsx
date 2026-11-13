import React, { useState, useEffect } from "react";
import {
  Store,
  ShieldCheck,
  Sparkles,
  Check,
  ArrowRight,
  X,
  KeyRound,
  Lock,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { RemoteClientLicense, ContractedEdition } from "../types";
import {
  unlockFiscalEdition,
  revokeFiscalEdition,
  getRemoteLicense,
  saveRemoteLicense,
  parseContractedEdition,
} from "../mockDb";
import { fetchRemoteLicenseFromFirestore } from "../services/licenseService";

interface EditionSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentEdition: "bodega" | "fiscal";
  onSelectEdition: (edition: "bodega" | "fiscal", unlockedWithMasterCode?: boolean) => void;
  isFirstRun?: boolean;
  clientLicense?: RemoteClientLicense;
  onUpdateLicense?: (license: RemoteClientLicense) => void;
}

export const EditionSelectorModal: React.FC<EditionSelectorModalProps> = ({
  isOpen,
  onClose,
  currentEdition,
  onSelectEdition,
  isFirstRun = false,
  clientLicense,
  onUpdateLicense,
}) => {
  const [showCodePrompt, setShowCodePrompt] = useState(false);
  const [targetPromptEdition, setTargetPromptEdition] = useState<"bodega" | "fiscal">("fiscal");
  const [codeInput, setCodeInput] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isCheckingFirebase, setIsCheckingFirebase] = useState(false);
  const [syncedEdition, setSyncedEdition] = useState<ContractedEdition>(
    parseContractedEdition(
      clientLicense?.edicion_contratada || getRemoteLicense().edicion_contratada || "bodega"
    )
  );

  useEffect(() => {
    if (isOpen) {
      setShowCodePrompt(false);
      setCodeInput("");
      setErrorMsg(null);
      const lic = clientLicense || getRemoteLicense();
      setSyncedEdition(parseContractedEdition(lic.edicion_contratada));

      // Consultar en segundo plano el estado real en Firebase al abrir el modal
      if (lic.cliente_id) {
        fetchRemoteLicenseFromFirestore(lic.cliente_id)
          .then((res) => {
            if (res.success && res.found && res.license) {
              const remoteEd = parseContractedEdition(res.license.edicion_contratada);
              const updated: RemoteClientLicense = {
                ...lic,
                ...res.license,
                edicion_contratada: remoteEd,
                ultimo_contacto_servidor: new Date().toISOString(),
              };
              saveRemoteLicense(updated);
              if (onUpdateLicense) onUpdateLicense(updated);
              setSyncedEdition(remoteEd);
              if (remoteEd === "bodega") {
                revokeFiscalEdition();
              }
            }
          })
          .catch(() => {});
      }
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const verifyAndSelectEdition = async (targetEdition: "bodega" | "fiscal") => {
    setErrorMsg(null);
    const lic = clientLicense || getRemoteLicense();

    // 1. Verificar en tiempo real contra Firebase Firestore
    if (lic.cliente_id) {
      setIsCheckingFirebase(true);
      try {
        const fbRes = await fetchRemoteLicenseFromFirestore(lic.cliente_id);
        if (fbRes.success && fbRes.found && fbRes.license) {
          const remoteEdition = parseContractedEdition(fbRes.license.edicion_contratada);
          const updated: RemoteClientLicense = {
            ...lic,
            ...fbRes.license,
            edicion_contratada: remoteEdition,
            ultimo_contacto_servidor: new Date().toISOString(),
          };
          saveRemoteLicense(updated);
          if (onUpdateLicense) onUpdateLicense(updated);
          setSyncedEdition(remoteEdition);
          setIsCheckingFirebase(false);

          const isAuthorized =
            remoteEdition === "ambas" || remoteEdition === targetEdition;

          if (isAuthorized) {
            onSelectEdition(targetEdition, false);
            onClose();
            return;
          } else {
            if (remoteEdition === "bodega") {
              revokeFiscalEdition();
            }
            setTargetPromptEdition(targetEdition);
            setShowCodePrompt(true);
            setCodeInput("");
            setErrorMsg(
              targetEdition === "fiscal"
                ? "Introduzca el Código de activación para la Edición Fiscal"
                : "Introduzca el Código de activación para la Edición Bodega"
            );
            return;
          }
        }
      } catch {
        // Fallback a licencia local si no hay conexión
      } finally {
        setIsCheckingFirebase(false);
      }
    }

    // 2. Fallback offline con la licencia local sincronizada
    const isAuthorizedLocal =
      syncedEdition === "ambas" || syncedEdition === targetEdition;

    if (isAuthorizedLocal) {
      onSelectEdition(targetEdition, false);
      onClose();
    } else {
      if (syncedEdition === "bodega") {
        revokeFiscalEdition();
      }
      setTargetPromptEdition(targetEdition);
      setShowCodePrompt(true);
      setCodeInput("");
      setErrorMsg(
        targetEdition === "fiscal"
          ? "Introduzca el Código de activación para la Edición Fiscal"
          : "Introduzca el Código de activación para la Edición Bodega"
      );
    }
  };

  const handleSelectBodega = () => {
    verifyAndSelectEdition("bodega");
  };

  const handleSelectFiscal = () => {
    verifyAndSelectEdition("fiscal");
  };

  const handleValidateActivationCode = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const clean = codeInput.trim();
    if (!clean) {
      setErrorMsg(
        targetPromptEdition === "fiscal"
          ? "Introduzca el Código de activación para la Edición Fiscal"
          : "Introduzca el Código de activación para la Edición Bodega"
      );
      return;
    }

    const res = unlockFiscalEdition(clean, targetPromptEdition);
    if (res.success) {
      onSelectEdition(targetPromptEdition, true);
      setShowCodePrompt(false);
      setCodeInput("");
      setErrorMsg(null);
      onClose();
    } else {
      setErrorMsg(
        targetPromptEdition === "fiscal"
          ? "Código incorrecto. Introduzca el Código de activación para la Edición Fiscal."
          : "Código incorrecto. Introduzca el Código de activación para la Edición Bodega."
      );
      setCodeInput("");
    }
  };

  const isBodegaAuthorizedInFirebase =
    syncedEdition === "bodega" || syncedEdition === "ambas";
  const isFiscalAuthorizedInFirebase =
    syncedEdition === "fiscal" || syncedEdition === "ambas";

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
                  {isFirstRun ? "¡Bienvenido a FaradayPOS!" : "Modalidad de Operación — FaradayPOS"}
                </h2>
                <span
                  className={`text-[10px] uppercase font-bold tracking-wider px-2.5 py-0.5 rounded-full border font-mono ${
                    syncedEdition === "ambas"
                      ? "bg-emerald-950 text-emerald-300 border-emerald-700/60"
                      : syncedEdition === "fiscal"
                      ? "bg-blue-950 text-blue-300 border-blue-700/60"
                      : "bg-amber-950 text-amber-300 border-amber-700/60"
                  }`}
                >
                  {syncedEdition === "ambas"
                    ? "Plan en Firebase: Ambas Ediciones Habilitadas"
                    : syncedEdition === "fiscal"
                    ? "Plan en Firebase: Solo Edición Fiscal ($30/mes)"
                    : "Plan en Firebase: Solo Edición Bodega ($15/mes)"}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                {syncedEdition === "ambas"
                  ? "Su licencia en Firebase tiene habilitadas tanto la Edición Bodega como la Edición Fiscal SENIAT."
                  : syncedEdition === "fiscal"
                  ? "Su licencia en Firebase está registrada exclusivamente para la Edición Fiscal SENIAT."
                  : "Su licencia en Firebase está registrada exclusivamente para la Edición Bodega y Mostrador."}
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
                  {isBodegaAuthorizedInFirebase ? (
                    <span className="text-[11px] font-bold text-amber-300 bg-amber-950/60 px-2 py-0.5 rounded-md border border-amber-800/50 font-mono flex items-center gap-1">
                      <Check className="w-3 h-3 text-emerald-400" />
                      <span>Autorizada en Firebase ($15/mes)</span>
                    </span>
                  ) : (
                    <span className="text-[11px] font-bold text-rose-300 bg-rose-950/60 px-2 py-0.5 rounded-md border border-rose-800/50 font-mono flex items-center gap-1">
                      <Lock className="w-3 h-3 text-rose-400" />
                      <span>Bloqueada (Solo Plan Fiscal)</span>
                    </span>
                  )}
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
                disabled={isCheckingFirebase}
                className={`mt-5 w-full py-2.5 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                  currentEdition === "bodega"
                    ? "bg-amber-500 text-slate-950 hover:bg-amber-400 shadow-md"
                    : isBodegaAuthorizedInFirebase
                    ? "bg-slate-800 text-slate-200 hover:bg-amber-500 hover:text-slate-950"
                    : "bg-slate-900 border border-slate-700 text-slate-300 hover:border-amber-500 hover:text-white"
                }`}
              >
                {isCheckingFirebase ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Verificando licencia en Firebase...</span>
                  </>
                ) : currentEdition === "bodega" ? (
                  <>
                    <span>Continuar en Modo Bodega</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                ) : isBodegaAuthorizedInFirebase ? (
                  <>
                    <span>Activar Edición Bodega</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                ) : (
                  <>
                    <Lock className="w-3.5 h-3.5 text-amber-400" />
                    <span>Desbloquear Edición Bodega</span>
                  </>
                )}
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

                  {isFiscalAuthorizedInFirebase ? (
                    <span className="text-[11px] font-bold text-emerald-300 bg-emerald-950/60 px-2 py-0.5 rounded-md border border-emerald-800/50 font-mono flex items-center gap-1">
                      <Check className="w-3 h-3 text-emerald-400" />
                      <span>Autorizada en Firebase ($30/mes)</span>
                    </span>
                  ) : (
                    <span className="text-[11px] font-bold text-rose-300 bg-rose-950/60 px-2 py-0.5 rounded-md border border-rose-800/50 font-mono flex items-center gap-1">
                      <Lock className="w-3 h-3 text-rose-400" />
                      <span>Bloqueada (Solo Plan Bodega)</span>
                    </span>
                  )}
                </div>

                <h3 className="text-base font-bold text-white group-hover:text-blue-300 transition-colors flex items-center gap-2">
                  <span>🏢 Edición Fiscal SENIAT</span>
                </h3>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  Para comercios que emiten facturas formales (Prov. 00071 / Imprenta Digital SNAT/2024/000102), Libro de Ventas y Kardex Art. 177.
                </p>

                <div className="mt-4 space-y-2 border-t border-slate-800/80 pt-3 text-xs">
                  <div className="flex items-center gap-2 text-slate-300">
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                    <span><strong>Prov. 00071 & 000102:</strong> N° Factura, Control e Imprenta Digital.</span>
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
                disabled={isCheckingFirebase}
                className={`mt-5 w-full py-2.5 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                  currentEdition === "fiscal"
                    ? "bg-blue-600 text-white hover:bg-blue-500 shadow-md"
                    : isFiscalAuthorizedInFirebase
                    ? "bg-slate-800 text-slate-200 hover:bg-blue-600 hover:text-white"
                    : "bg-slate-900 border border-slate-700 text-slate-300 hover:border-blue-500 hover:text-white"
                }`}
              >
                {isCheckingFirebase ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Verificando licencia en Firebase...</span>
                  </>
                ) : currentEdition === "fiscal" ? (
                  <>
                    <span>Continuar en Modo Fiscal</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                ) : isFiscalAuthorizedInFirebase ? (
                  <>
                    <span>Activar Edición Fiscal</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                ) : (
                  <>
                    <Lock className="w-3.5 h-3.5 text-amber-400" />
                    <span>Desbloquear Edición Fiscal ($30/mes)</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Formulario de Código de Activación */}
        {showCodePrompt && (
          <div className="px-6 pb-6 animate-in fade-in duration-200">
            <form onSubmit={handleValidateActivationCode} className="max-w-lg mx-auto space-y-3 bg-[#0d0f17] border-2 border-blue-500/60 p-4 rounded-2xl shadow-2xl shadow-blue-950/60">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 font-bold text-blue-300 text-xs">
                  <KeyRound className="w-4 h-4 text-blue-400" />
                  <span>
                    {targetPromptEdition === "fiscal"
                      ? "Activación de Edición Fiscal"
                      : "Activación de Edición Bodega"}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowCodePrompt(false)}
                  className="text-slate-400 hover:text-white text-xs p-1"
                >
                  ✕
                </button>
              </div>

              {errorMsg ? (
                <div className="p-2.5 rounded-xl bg-amber-950/70 border border-amber-500/60 text-amber-200 text-[11px] flex items-start gap-2 leading-relaxed">
                  <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <span>{errorMsg}</span>
                </div>
              ) : (
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  {targetPromptEdition === "fiscal"
                    ? "Introduzca el Código de activación para la Edición Fiscal"
                    : "Introduzca el Código de activación para la Edición Bodega"}
                </p>
              )}

              <div className="space-y-2">
                <input
                  type="password"
                  value={codeInput}
                  onChange={(e) => {
                    setCodeInput(e.target.value);
                  }}
                  placeholder="Ingrese código de activación"
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
            <span>Sincronizado en tiempo real con Firebase Firestore.</span>
          </div>
          <div className="text-slate-400 font-mono">
            Edición activa: <strong className="text-white">{currentEdition === "bodega" ? "Bodega y Mostrador" : "Fiscal SENIAT"}</strong>
          </div>
        </div>
      </div>
    </div>
  );
};

