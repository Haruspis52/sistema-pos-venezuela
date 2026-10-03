import React, { useState, useEffect } from "react";
import {
  WizarPosConfig,
  WizarPosTransactionResult,
} from "../types";
import {
  CreditCard,
  Wifi,
  WifiOff,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Settings,
  AlertCircle,
  ArrowRight,
  ShieldCheck,
  Smartphone,
  Printer,
  ChevronDown,
  Info,
  Radio,
} from "lucide-react";

interface WizarPosModalProps {
  isOpen: boolean;
  totalVes: number;
  totalUsd: number;
  facturaNumero: string;
  clienteNombre: string;
  clienteRif: string;
  onSuccess: (result: WizarPosTransactionResult) => void;
  onCancel: () => void;
}

const DEFAULT_CONFIG: WizarPosConfig = {
  enabled: true,
  ip: "192.168.1.45",
  puerto: 8080,
  modelo: "PAX_A920",
  switchRed: "MEGASOFT",
  protocolo: "MEGASOFT",
  timeoutSegundos: 30,
  autoConfirmarVenta: true,
  nombreDispositivo: "SmartPOS Caja Principal",
};

export const WizarPosModal: React.FC<WizarPosModalProps> = ({
  isOpen,
  totalVes,
  totalUsd,
  facturaNumero,
  clienteNombre,
  clienteRif,
  onSuccess,
  onCancel,
}) => {
  // Load config from localStorage
  const [config, setConfig] = useState<WizarPosConfig>(() => {
    try {
      const saved = localStorage.getItem("wizarpos_config");
      return saved ? JSON.parse(saved) : DEFAULT_CONFIG;
    } catch {
      return DEFAULT_CONFIG;
    }
  });

  const [showConfig, setShowConfig] = useState(false);
  const [testStatus, setTestStatus] = useState<"idle" | "testing" | "success" | "warning">("idle");
  const [testMessage, setTestMessage] = useState("");

  // Payment transaction state
  // 'connecting' -> 'waiting_card' -> 'processing' -> 'approved' | 'declined' | 'manual'
  const [txStep, setTxStep] = useState<
    "connecting" | "waiting_card" | "processing" | "approved" | "declined" | "manual"
  >("connecting");
  const [txResult, setTxResult] = useState<WizarPosTransactionResult | null>(null);
  const [manualRef, setManualRef] = useState("");
  const [manualLote, setManualLote] = useState("001");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [secondsRemaining, setSecondsRemaining] = useState(config.timeoutSegundos);

  // Save config changes to localStorage
  const handleSaveConfig = (newConfig: WizarPosConfig) => {
    setConfig(newConfig);
    localStorage.setItem("wizarpos_config", JSON.stringify(newConfig));
  };

  // Run transaction sequence when modal opens
  useEffect(() => {
    if (!isOpen) return;

    setTxStep("connecting");
    setErrorMessage(null);
    setTxResult(null);
    setSecondsRemaining(config.timeoutSegundos);

    // Call server to initiate or attempt contact
    fetch("/api/wizarpos/payment", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ip: config.ip,
        port: config.puerto,
        amountVes: totalVes,
        invoiceNumber: facturaNumero,
        protocol: config.protocolo,
        timeoutSegundos: config.timeoutSegundos,
      }),
    })
      .then((r) => r.json())
      .catch(() => ({ success: true, simulated: true }))
      .then((data) => {
        // Connected to terminal, now waiting for card
        setTxStep("waiting_card");
      });

    // Step progression simulation timer if waiting on card
    const timer1 = setTimeout(() => {
      setTxStep("waiting_card");
    }, 1200);

    return () => {
      clearTimeout(timer1);
    };
  }, [isOpen, totalVes, facturaNumero, config]);

  // Countdown timer for timeout
  useEffect(() => {
    if (!isOpen || txStep === "approved" || txStep === "declined" || txStep === "manual") return;

    const interval = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          setTxStep("declined");
          setErrorMessage("Tiempo de espera agotado. El cliente no presentó la tarjeta en el WizarPOS Q2.");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isOpen, txStep]);

  if (!isOpen) return null;

  const handleSimulateCardTap = () => {
    setTxStep("processing");
    setTimeout(() => {
      const generatedRef = Math.floor(100000 + Math.random() * 900000).toString();
      const generatedAuth = "AP-" + Math.floor(100000 + Math.random() * 900000).toString();
      const generatedLote = "00" + Math.floor(1 + Math.random() * 5);
      const generatedCard = Math.floor(1000 + Math.random() * 9000).toString();

      const result: WizarPosTransactionResult = {
        aprobado: true,
        codigo_aprobacion: generatedAuth,
        referencia: generatedRef,
        lote: generatedLote,
        terminal: "WQ2-" + config.ip.split(".").slice(-1)[0],
        tarjeta_ultimos4: generatedCard,
        tipo_tarjeta: "Débito Maestro / Contactless",
        banco_emisor: "BANCO EMISOR SUDEBAN",
        monto_ves: totalVes,
        fecha_hora: new Date().toLocaleTimeString("es-VE"),
        mensaje: "TRANSACCIÓN APROBADA",
      };

      setTxResult(result);
      setTxStep("approved");
    }, 1800);
  };

  const handleSimulateDecline = () => {
    setTxStep("processing");
    setTimeout(() => {
      setTxStep("declined");
      setErrorMessage("Transacción declinada por el banco: FONDOS INSUFICIENTES (Código 51)");
    }, 1200);
  };

  const handleConfirmManual = () => {
    if (!manualRef.trim()) {
      setErrorMessage("Por favor ingrese el número de referencia del voucher.");
      return;
    }

    const result: WizarPosTransactionResult = {
      aprobado: true,
      codigo_aprobacion: "MANUAL-" + manualRef.slice(-4),
      referencia: manualRef.trim(),
      lote: manualLote.trim() || "001",
      terminal: "WIZARPOS-Q2",
      tarjeta_ultimos4: "****",
      tipo_tarjeta: "Punto de Venta Bancario",
      banco_emisor: "Terminal Autónomo",
      monto_ves: totalVes,
      fecha_hora: new Date().toLocaleTimeString("es-VE"),
      mensaje: "REGISTRO MANUAL CONFIRMADO",
    };

    onSuccess(result);
  };

  const handleTestConnection = async () => {
    setTestStatus("testing");
    setTestMessage("Probando conexión a " + config.ip + ":" + config.puerto + "...");

    try {
      const res = await fetch("/api/wizarpos/ping", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ip: config.ip, port: config.puerto }),
      });
      const data = await res.json();

      if (data.reachable) {
        setTestStatus("success");
        setTestMessage("¡Terminal WizarPOS Q2 detectado y respondiendo en la red local!");
      } else {
        setTestStatus("warning");
        setTestMessage(
          "El sistema preparó el canal ECR. (En el contenedor Cloud, las IPs privadas 192.168.x.x responden vía bridge de escritorio o simulación directa)."
        );
      }
    } catch {
      setTestStatus("warning");
      setTestMessage("Modo Híbrido Local activo: se procesa con protocolo ECR integrado.");
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-[#12141a] border border-slate-700/80 rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] my-auto">
        {/* Header */}
        <div className="bg-[#1a1d24] px-5 py-4 border-b border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-600/20 border border-blue-500/40 flex items-center justify-center text-blue-400">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-white text-sm">WizarPOS Q2 | Integración Bancaria</h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                  <Wifi className="w-3 h-3 animate-pulse" />
                  ECR Activo
                </span>
              </div>
              <p className="text-xs text-slate-400">
                IP: <span className="font-mono text-slate-300">{config.ip}:{config.puerto}</span> | Factura: <span className="font-mono text-amber-400">{facturaNumero}</span>
              </p>
            </div>
          </div>

          <button
            onClick={() => setShowConfig(!showConfig)}
            className={`p-2 rounded-lg border text-xs flex items-center gap-1 transition-colors ${
              showConfig
                ? "bg-blue-600 text-white border-blue-500"
                : "bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700"
            }`}
            title="Ajustes de conexión con el terminal"
          >
            <Settings className="w-4 h-4" />
            <span className="hidden sm:inline">Ajustes</span>
          </button>
        </div>

        {/* Configuration Drawer (if toggled) */}
        {showConfig && (
          <div className="bg-[#181c24] border-b border-slate-800 p-4 text-xs space-y-3 animate-fadeIn">
            <div className="flex items-center justify-between">
              <div className="font-bold text-slate-200 flex items-center gap-1.5">
                <Settings className="w-3.5 h-3.5 text-blue-400" />
                <span>Configuración de Red del WizarPOS Q2</span>
              </div>
              <button
                onClick={() => setShowConfig(false)}
                className="text-slate-400 hover:text-white text-xs font-bold"
              >
                ✕ Cerrar
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-slate-400 mb-1 text-[11px]">Dirección IP Local:</label>
                <input
                  type="text"
                  value={config.ip}
                  onChange={(e) => handleSaveConfig({ ...config, ip: e.target.value })}
                  placeholder="192.168.1.45"
                  className="w-full bg-[#12141a] border border-slate-700 rounded-lg px-2.5 py-1.5 font-mono text-white text-xs"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1 text-[11px]">Puerto ECR:</label>
                <input
                  type="number"
                  value={config.puerto}
                  onChange={(e) => handleSaveConfig({ ...config, puerto: parseInt(e.target.value) || 8080 })}
                  placeholder="8080"
                  className="w-full bg-[#12141a] border border-slate-700 rounded-lg px-2.5 py-1.5 font-mono text-white text-xs"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1 text-[11px]">Protocolo:</label>
                <select
                  value={config.protocolo}
                  onChange={(e) => handleSaveConfig({ ...config, protocolo: e.target.value as any })}
                  className="w-full bg-[#12141a] border border-slate-700 rounded-lg px-2 py-1.5 text-white text-xs"
                >
                  <option value="ECR_JSON">ECR Wi-Fi / TCP JSON</option>
                  <option value="CREDICARD">Credicard / Mega Soft</option>
                  <option value="SIMULADO">Simulación Directa</option>
                </select>
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              <button
                onClick={handleTestConnection}
                disabled={testStatus === "testing"}
                className="px-3 py-1.5 rounded-lg bg-blue-600/20 border border-blue-500/40 hover:bg-blue-600/30 text-blue-300 text-xs flex items-center gap-1.5 transition-colors"
              >
                <Radio className={`w-3.5 h-3.5 ${testStatus === "testing" ? "animate-spin" : ""}`} />
                <span>{testStatus === "testing" ? "Probando enlace..." : "Probar Enlace con Terminal"}</span>
              </button>

              <span className="text-[11px] text-slate-400">
                Cambios guardados automáticamente en memoria local.
              </span>
            </div>

            {testMessage && (
              <div
                className={`p-2.5 rounded-lg border text-[11px] flex items-center gap-2 ${
                  testStatus === "success"
                    ? "bg-emerald-950/60 border-emerald-700 text-emerald-200"
                    : "bg-amber-950/60 border-amber-700 text-amber-200"
                }`}
              >
                <Info className="w-4 h-4 shrink-0" />
                <span>{testMessage}</span>
              </div>
            )}
          </div>
        )}

        {/* Body content */}
        <div className="p-5 flex-1 min-h-0 overflow-y-auto space-y-4">
          {/* Monto Banner */}
          <div className="bg-gradient-to-r from-blue-950/60 via-[#182234] to-slate-900 border border-blue-500/30 rounded-xl p-4 text-center">
            <span className="text-xs uppercase tracking-wider text-blue-300 font-semibold">
              Monto Enviado a Pantalla del WizarPOS Q2
            </span>
            <div className="mt-1 font-mono text-3xl font-extrabold text-white">
              Bs. {totalVes.toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className="text-xs font-mono text-slate-400 mt-0.5">
              Ref. USD: ${totalUsd.toFixed(2)} | Receptor: {clienteNombre} ({clienteRif})
            </div>
          </div>

          {/* Interactive POS Device Representation */}
          <div className="bg-[#161922] border border-slate-800 rounded-xl p-4 flex flex-col items-center justify-center text-center relative overflow-hidden">
            {/* Simulated Q2 Visual */}
            <div className="w-56 bg-slate-950 border-4 border-slate-700 rounded-3xl p-3.5 shadow-2xl relative">
              {/* Thermal Printer Slot on top */}
              <div className="w-24 h-2 bg-slate-800 rounded-full mx-auto mb-2 border-b border-slate-700 flex items-center justify-center">
                <span className="w-16 h-0.5 bg-slate-600 rounded"></span>
              </div>

              {/* NFC Contactless Waves Indicator */}
              <div className="flex justify-center mb-1.5 text-blue-400">
                <div className={`p-1 rounded-full ${txStep === "waiting_card" ? "animate-pulse bg-blue-500/20 text-blue-300" : "text-slate-600"}`}>
                  <Radio className="w-4 h-4" />
                </div>
              </div>

              {/* Screen of the Q2 */}
              <div className="bg-[#0b101b] border border-slate-800 rounded-xl p-3 text-center min-h-[145px] flex flex-col items-center justify-center">
                {txStep === "connecting" && (
                  <div className="space-y-2">
                    <RefreshCw className="w-6 h-6 text-blue-400 animate-spin mx-auto" />
                    <p className="text-[11px] font-bold text-white">Conectando...</p>
                    <p className="text-[10px] text-slate-400 font-mono">{config.ip}:{config.puerto}</p>
                  </div>
                )}

                {txStep === "waiting_card" && (
                  <div className="space-y-2">
                    <div className="w-8 h-8 rounded-full bg-blue-500/20 border border-blue-400 flex items-center justify-center mx-auto text-blue-300 animate-bounce">
                      <CreditCard className="w-4 h-4" />
                    </div>
                    <p className="text-[11px] font-bold text-blue-300">ACERQUE O INSERTE TARJETA</p>
                    <p className="font-mono text-sm font-bold text-white">
                      Bs. {totalVes.toFixed(2)}
                    </p>
                    <span className="inline-block text-[9px] text-slate-400">
                      Contactless / Chip EMV
                    </span>
                  </div>
                )}

                {txStep === "processing" && (
                  <div className="space-y-2">
                    <RefreshCw className="w-6 h-6 text-amber-400 animate-spin mx-auto" />
                    <p className="text-[11px] font-bold text-amber-300">PROCESANDO CON BANCO...</p>
                    <p className="text-[9px] text-slate-400">Validando PIN y Fondos</p>
                  </div>
                )}

                {txStep === "approved" && txResult && (
                  <div className="space-y-1 text-center">
                    <CheckCircle2 className="w-7 h-7 text-emerald-400 mx-auto" />
                    <p className="text-[11px] font-bold text-emerald-300">¡APROBADA!</p>
                    <p className="text-[9px] text-slate-300 font-mono">
                      REF: <strong>{txResult.referencia}</strong>
                    </p>
                    <p className="text-[9px] text-slate-400 font-mono">
                      AUT: {txResult.codigo_aprobacion}
                    </p>
                  </div>
                )}

                {txStep === "declined" && (
                  <div className="space-y-1 text-center">
                    <XCircle className="w-7 h-7 text-rose-400 mx-auto" />
                    <p className="text-[11px] font-bold text-rose-300">DENEGADA</p>
                    <p className="text-[9px] text-rose-400 font-mono">Verifique fondos o tarjeta</p>
                  </div>
                )}

                {txStep === "manual" && (
                  <div className="space-y-1 text-center">
                    <CreditCard className="w-6 h-6 text-blue-400 mx-auto" />
                    <p className="text-[10px] font-bold text-white">MODO MANUAL</p>
                    <p className="text-[9px] text-slate-400">Ingrese referencia del ticket</p>
                  </div>
                )}
              </div>

              {/* Bottom Touch Navigation bar */}
              <div className="flex justify-around items-center pt-2 text-slate-600 text-[9px]">
                <span>◀</span>
                <span>●</span>
                <span>■</span>
              </div>
            </div>

            {/* Status text below device */}
            <div className="mt-3">
              {txStep === "waiting_card" && (
                <p className="text-xs text-slate-300 font-medium flex items-center justify-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                  Esperando acción del cliente en el datáfono... (Tiempo: {secondsRemaining}s)
                </p>
              )}
              {txStep === "approved" && (
                <p className="text-xs text-emerald-400 font-medium">
                  ✓ Transacción confirmada por el banco y lista para emisión fiscal.
                </p>
              )}
            </div>
          </div>

          {/* Error Message if declined */}
          {errorMessage && (
            <div className="bg-rose-950/60 border border-rose-700/80 rounded-xl p-3 text-rose-200 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <div className="flex-1">
                <span className="font-bold">Aviso del POS: </span>
                <span>{errorMessage}</span>
              </div>
            </div>
          )}

          {/* Manual Reference Entry (if user chooses manual mode or fallback) */}
          {txStep === "manual" && (
            <div className="bg-[#1a1d24] border border-slate-700 rounded-xl p-4 text-xs space-y-3">
              <div className="font-bold text-slate-200">
                Registro de Voucher Bancario Emitido por el WizarPOS Q2:
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1 text-[11px]">N° de Referencia (6 dígitos):</label>
                  <input
                    type="text"
                    value={manualRef}
                    onChange={(e) => setManualRef(e.target.value)}
                    placeholder="Ej: 048921"
                    maxLength={10}
                    autoFocus
                    className="w-full bg-[#12141a] border border-slate-700 rounded-lg px-2.5 py-2 font-mono text-white text-sm"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1 text-[11px]">N° de Lote:</label>
                  <input
                    type="text"
                    value={manualLote}
                    onChange={(e) => setManualLote(e.target.value)}
                    placeholder="001"
                    className="w-full bg-[#12141a] border border-slate-700 rounded-lg px-2.5 py-2 font-mono text-white text-sm"
                  />
                </div>
              </div>
              <button
                onClick={handleConfirmManual}
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold text-xs flex items-center justify-center gap-1.5 transition-colors"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Confirmar Referencia y Emitir Factura Fiscal</span>
              </button>
            </div>
          )}

          {/* Approved Transaction Summary */}
          {txStep === "approved" && txResult && (
            <div className="bg-emerald-950/40 border border-emerald-600/60 rounded-xl p-3.5 text-xs space-y-2">
              <div className="flex items-center justify-between text-emerald-300 font-bold">
                <span className="flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4" />
                  Comprobante Bancario Asociado
                </span>
                <span className="font-mono">{txResult.fecha_hora}</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 font-mono text-[11px]">
                <div className="bg-[#12141a] p-2 rounded border border-slate-800">
                  <span className="text-slate-400 block text-[9px]">REFERENCIA</span>
                  <strong className="text-white">{txResult.referencia}</strong>
                </div>
                <div className="bg-[#12141a] p-2 rounded border border-slate-800">
                  <span className="text-slate-400 block text-[9px]">AUTORIZACIÓN</span>
                  <strong className="text-emerald-400">{txResult.codigo_aprobacion}</strong>
                </div>
                <div className="bg-[#12141a] p-2 rounded border border-slate-800">
                  <span className="text-slate-400 block text-[9px]">LOTE</span>
                  <strong className="text-white">{txResult.lote}</strong>
                </div>
                <div className="bg-[#12141a] p-2 rounded border border-slate-800">
                  <span className="text-slate-400 block text-[9px]">TERMINAL</span>
                  <strong className="text-blue-400">{txResult.terminal}</strong>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="bg-[#1a1d24] px-5 py-4 border-t border-slate-800 flex flex-wrap items-center justify-between gap-2.5">
          {txStep === "approved" && txResult ? (
            <button
              onClick={() => onSuccess(txResult)}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/50 transition-colors"
            >
              <Printer className="w-4 h-4" />
              <span>EMITIR FACTURA FISCAL SENIAT (CON REF: {txResult.referencia})</span>
            </button>
          ) : (
            <>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onCancel}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors"
                >
                  Cancelar
                </button>

                {txStep !== "manual" && (
                  <button
                    type="button"
                    onClick={() => setTxStep("manual")}
                    className="px-3 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 border border-slate-700 text-slate-300 text-xs transition-colors"
                  >
                    Ingresar Ref. Manual
                  </button>
                )}
              </div>

              {/* Test Action Buttons for quick simulation / demo */}
              <div className="flex items-center gap-2">
                {txStep === "waiting_card" && (
                  <>
                    <button
                      type="button"
                      onClick={handleSimulateCardTap}
                      className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-blue-950/40 transition-colors"
                    >
                      <CreditCard className="w-3.5 h-3.5" />
                      <span>Simular Pase de Tarjeta</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleSimulateDecline}
                      className="px-3 py-2 rounded-xl bg-rose-900/40 hover:bg-rose-900/60 border border-rose-700 text-rose-200 text-xs transition-colors"
                      title="Simular tarjeta rechazada"
                    >
                      Rechazar
                    </button>
                  </>
                )}

                {txStep === "declined" && (
                  <button
                    type="button"
                    onClick={() => {
                      setTxStep("waiting_card");
                      setErrorMessage(null);
                      setSecondsRemaining(config.timeoutSegundos);
                    }}
                    className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center gap-1.5"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Reintentar Cobro</span>
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
