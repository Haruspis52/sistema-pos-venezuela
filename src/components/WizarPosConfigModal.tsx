import React, { useState, useEffect } from "react";
import { WizarPosConfig, SmartPosModelVE, SmartPosSwitchVE } from "../types";
import {
  Smartphone,
  Wifi,
  Radio,
  CheckCircle2,
  X,
  Info,
  Save,
  RotateCcw,
  HelpCircle,
  Building2,
  Cpu,
  CreditCard,
  Network,
  ShieldCheck,
  ArrowLeft,
} from "lucide-react";

interface WizarPosConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved?: (config: WizarPosConfig) => void;
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

// Modelos de SmartPOS habituales y homologados en Venezuela
const SMARTPOS_MODELS_VE: {
  id: SmartPosModelVE;
  name: string;
  brand: string;
  desc: string;
  bancosHabituales: string;
}[] = [
  {
    id: "PAX_A920",
    name: "PAX A920 / A920 Pro",
    brand: "PAX Technology",
    desc: "El SmartPOS más distribuido en Venezuela",
    bancosHabituales: "Banesco, BDV, Bancamiga, Mercantil, Provincial",
  },
  {
    id: "PAX_A930",
    name: "PAX A930",
    brand: "PAX Technology",
    desc: "Terminal Android de alta velocidad 4G/Wi-Fi",
    bancosHabituales: "Bancamiga, Banesco, Credicard",
  },
  {
    id: "WIZARPOS_Q2",
    name: "WizarPOS Q2",
    brand: "WizarPOS",
    desc: "Terminal portátil táctil con impresora térmica integrada",
    bancosHabituales: "Bancamiga, 100% Banco, Fintechs",
  },
  {
    id: "WIZARPOS_Q3",
    name: "WizarPOS Q3 / Q3 Pro",
    brand: "WizarPOS",
    desc: "Nueva generación Smart Android WizarPOS",
    bancosHabituales: "Fintechs y adquirentes independientes",
  },
  {
    id: "SUNMI_P2",
    name: "Sunmi P2 / P2 Pro",
    brand: "Sunmi",
    desc: "Terminal móvil robusto con lector NFC y chip",
    bancosHabituales: "Mega Soft, Disglobal, VPOS",
  },
  {
    id: "SUNMI_V2",
    name: "Sunmi V2 / V2s",
    brand: "Sunmi",
    desc: "Equipo de mano compacto Android",
    bancosHabituales: "Cajas rápidas y delivery",
  },
  {
    id: "VERIFONE_X990",
    name: "Verifone X990 Android",
    brand: "Verifone",
    desc: "SmartPOS bancario de gama empresarial",
    bancosHabituales: "Bancaribe, BDV, Bancamiga",
  },
  {
    id: "INGENICO_APOS_A8",
    name: "Ingenico APOS A8 / DX8000",
    brand: "Ingenico",
    desc: "Terminal Android de la red Ingenico / Platco",
    bancosHabituales: "Banesco, Platco, Mercantil",
  },
  {
    id: "GENERIC_SMARTPOS",
    name: "SmartPOS Genérico / Otro Modelo",
    brand: "Universal",
    desc: "Cualquier datáfono Android con protocolo ECR LAN",
    bancosHabituales: "Compatible con todos los bancos",
  },
];

// Switches y pasarelas de enlace en Venezuela
const SWITCHES_VE: {
  id: SmartPosSwitchVE;
  name: string;
  desc: string;
  puertoDefault: number;
}[] = [
  {
    id: "MEGASOFT",
    name: "Mega Soft (VPMS / VPOS ECR / Crecash)",
    desc: "La red de integración ECR más usada en Venezuela (>70% comercios)",
    puertoDefault: 8080,
  },
  {
    id: "CREDICARD",
    name: "Red Credicard ECR Link",
    desc: "Protocolo para bancos afiliados al consorcio Credicard",
    puertoDefault: 9000,
  },
  {
    id: "BANCAMIGA",
    name: "Bancamiga SmartPOS Link (API Directa)",
    desc: "Enlace directo Wi-Fi para terminales PAX y WizarPOS Bancamiga",
    puertoDefault: 8080,
  },
  {
    id: "PLATCO",
    name: "Red Platco / Banesco ECR",
    desc: "Para terminales homologados por Platco",
    puertoDefault: 7000,
  },
  {
    id: "ECR_JSON",
    name: "ECR Universal TCP/IP (JSON Socket)",
    desc: "Estándar nativo para WizarPOS, Sunmi y PAX Cloud",
    puertoDefault: 8080,
  },
  {
    id: "SIMULADO",
    name: "Modo Simulado / Demostración",
    desc: "Pruebas directas de caja sin terminal físico conectado",
    puertoDefault: 8080,
  },
];

export const WizarPosConfigModal: React.FC<WizarPosConfigModalProps> = ({
  isOpen,
  onClose,
  onSaved,
}) => {
  const [config, setConfig] = useState<WizarPosConfig>(() => {
    try {
      const saved = localStorage.getItem("wizarpos_config");
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          ...DEFAULT_CONFIG,
          ...parsed,
          modelo: parsed.modelo || "PAX_A920",
          switchRed: parsed.switchRed || "MEGASOFT",
        };
      }
      return DEFAULT_CONFIG;
    } catch {
      return DEFAULT_CONFIG;
    }
  });

  const [testStatus, setTestStatus] = useState<"idle" | "testing" | "success" | "warning">("idle");
  const [testMessage, setTestMessage] = useState("");
  const [activeTab, setActiveTab] = useState<"conexion" | "modelos" | "guia" | "avanzado">("conexion");
  const [saveNotification, setSaveNotification] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSave = () => {
    localStorage.setItem("wizarpos_config", JSON.stringify(config));
    if (onSaved) onSaved(config);
    setSaveNotification(true);
    setTimeout(() => {
      setSaveNotification(false);
      onClose();
    }, 800);
  };

  const handleResetDefaults = () => {
    setConfig(DEFAULT_CONFIG);
    localStorage.setItem("wizarpos_config", JSON.stringify(DEFAULT_CONFIG));
    setTestMessage("");
    setTestStatus("idle");
  };

  const handleSelectSwitch = (sw: typeof SWITCHES_VE[0]) => {
    setConfig({
      ...config,
      switchRed: sw.id,
      protocolo: sw.id as any,
      puerto: sw.puertoDefault,
    });
  };

  const handleTestConnection = async () => {
    setTestStatus("testing");
    const currentModel = SMARTPOS_MODELS_VE.find((m) => m.id === config.modelo)?.name || "SmartPOS";
    setTestMessage(`Probando enlace ECR con ${currentModel} en ${config.ip}:${config.puerto}...`);

    try {
      const res = await fetch("/api/wizarpos/ping", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ip: config.ip,
          port: config.puerto,
          modelo: config.modelo,
          switchRed: config.switchRed,
        }),
      });
      const data = await res.json();

      if (data.reachable) {
        setTestStatus("success");
        setTestMessage(
          `¡Enlace exitoso! Terminal ${currentModel} respondiendo activamente en ${config.ip}:${config.puerto}.`
        );
      } else {
        setTestStatus("warning");
        setTestMessage(
          `Canal ECR configurado para ${currentModel} en ${config.ip}:${config.puerto}. En ejecución local en Windows, el sistema enviará la orden por la red LAN Wi-Fi del negocio.`
        );
      }
    } catch {
      setTestStatus("warning");
      setTestMessage(
        `Puerto ${config.puerto} preparado. Al cobrar se transmitirá la orden de cobro a ${config.ip}.`
      );
    }
  };

  const selectedModelInfo = SMARTPOS_MODELS_VE.find((m) => m.id === config.modelo) || SMARTPOS_MODELS_VE[0];

  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        className="bg-[#12141a] border border-slate-700/90 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-[#181b24] px-5 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-500/40 flex items-center justify-center text-blue-400">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-white text-base">
                  Configuración IP del SmartPOS (Venezuela)
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                  <Wifi className="w-3 h-3" />
                  ECR Multi-Banco
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Compatible con PAX (A920/A930), WizarPOS (Q2/Q3), Sunmi, Verifone e Ingenico
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="bg-[#14161f] border-b border-slate-800 px-5 flex gap-1.5 pt-2 overflow-x-auto">
          <button
            onClick={() => setActiveTab("conexion")}
            className={`px-3 py-2 text-xs font-semibold rounded-t-lg transition-all border-t border-x shrink-0 ${
              activeTab === "conexion"
                ? "bg-[#12141a] text-blue-400 border-slate-700"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            Ajustes de Red & IP
          </button>
          <button
            onClick={() => setActiveTab("modelos")}
            className={`px-3 py-2 text-xs font-semibold rounded-t-lg transition-all border-t border-x shrink-0 ${
              activeTab === "modelos"
                ? "bg-[#12141a] text-blue-400 border-slate-700"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            Modelos en Venezuela ({SMARTPOS_MODELS_VE.length})
          </button>
          <button
            onClick={() => setActiveTab("guia")}
            className={`px-3 py-2 text-xs font-semibold rounded-t-lg transition-all border-t border-x shrink-0 ${
              activeTab === "guia"
                ? "bg-[#12141a] text-blue-400 border-slate-700"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            ¿Cómo ver la IP según marca?
          </button>
          <button
            onClick={() => setActiveTab("avanzado")}
            className={`px-3 py-2 text-xs font-semibold rounded-t-lg transition-all border-t border-x shrink-0 ${
              activeTab === "avanzado"
                ? "bg-[#12141a] text-blue-400 border-slate-700"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            Protocolo & Opciones
          </button>
        </div>

        {/* Body */}
        <div className="p-5 flex-1 overflow-y-auto space-y-4">
          {activeTab === "conexion" && (
            <div className="space-y-4">
              {/* Active Terminal Summary Banner */}
              <div className="bg-blue-950/40 border border-blue-800/60 rounded-xl p-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <Cpu className="w-5 h-5 text-blue-400 shrink-0" />
                  <div>
                    <div className="text-xs font-bold text-white">
                      {selectedModelInfo.name} ({selectedModelInfo.brand})
                    </div>
                    <div className="text-[11px] text-blue-200">
                      Bancos: <span className="text-slate-300">{selectedModelInfo.bancosHabituales}</span>
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab("modelos")}
                  className="px-2.5 py-1 rounded bg-blue-600/80 hover:bg-blue-600 text-white text-[10px] font-bold shrink-0 transition-colors"
                >
                  Cambiar Modelo
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* IP Address */}
                <div className="bg-[#161922] p-3.5 rounded-xl border border-slate-800 space-y-1.5">
                  <label className="block text-xs font-bold text-slate-300">
                    Dirección IP del SmartPOS en Wi-Fi:
                  </label>
                  <input
                    type="text"
                    value={config.ip}
                    onChange={(e) => setConfig({ ...config, ip: e.target.value })}
                    placeholder="192.168.1.45"
                    className="w-full bg-[#0e1017] border border-slate-700 focus:border-blue-500 rounded-lg px-3 py-2 font-mono text-sm text-white font-bold"
                  />
                  <p className="text-[11px] text-slate-400">
                    El datáfono debe estar conectado a la misma red Wi-Fi que la computadora.
                  </p>
                </div>

                {/* Port */}
                <div className="bg-[#161922] p-3.5 rounded-xl border border-slate-800 space-y-1.5">
                  <label className="block text-xs font-bold text-slate-300">
                    Puerto de Escucha ECR:
                  </label>
                  <input
                    type="number"
                    value={config.puerto}
                    onChange={(e) =>
                      setConfig({ ...config, puerto: parseInt(e.target.value) || 8080 })
                    }
                    placeholder="8080"
                    className="w-full bg-[#0e1017] border border-slate-700 focus:border-blue-500 rounded-lg px-3 py-2 font-mono text-sm text-white font-bold"
                  />
                  <p className="text-[11px] text-slate-400">
                    Por defecto <code className="text-blue-400">8080</code> (Mega Soft/WizarPOS), <code className="text-blue-400">9000</code> (Credicard) o <code className="text-blue-400">7000</code> (Platco).
                  </p>
                </div>
              </div>

              {/* Red Adquirente / Switch Selector */}
              <div className="bg-[#161922] p-3.5 rounded-xl border border-slate-800 space-y-2">
                <label className="block text-xs font-bold text-slate-300 flex items-center justify-between">
                  <span>Pasarela / Switch Bancario en Venezuela:</span>
                  <span className="text-[10px] text-blue-400 font-normal">
                    Seleccione la red del datáfono
                  </span>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {SWITCHES_VE.map((sw) => {
                    const isSelected = config.switchRed === sw.id;
                    return (
                      <button
                        key={sw.id}
                        type="button"
                        onClick={() => handleSelectSwitch(sw)}
                        className={`p-2.5 rounded-lg text-left border transition-all ${
                          isSelected
                            ? "bg-blue-600/20 border-blue-500 text-white"
                            : "bg-[#0e1017] border-slate-800 text-slate-400 hover:border-slate-700"
                        }`}
                      >
                        <div className="font-bold text-xs text-white flex items-center justify-between">
                          <span>{sw.name}</span>
                          {isSelected && (
                            <CheckCircle2 className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                          )}
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5">{sw.desc}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Test Action */}
              <div className="bg-[#161922] p-3.5 rounded-xl border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
                <div>
                  <div className="text-xs font-bold text-slate-200">
                    Diagnóstico de Enlace con el Terminal
                  </div>
                  <div className="text-[11px] text-slate-400">
                    Envía un pulso de prueba al SmartPOS ({config.ip}:{config.puerto})
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleTestConnection}
                  disabled={testStatus === "testing"}
                  className="w-full sm:w-auto px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-colors shadow-md shadow-blue-950/40"
                >
                  <Radio className={`w-3.5 h-3.5 ${testStatus === "testing" ? "animate-spin" : ""}`} />
                  <span>{testStatus === "testing" ? "Probando..." : "Probar Conexión Ahora"}</span>
                </button>
              </div>

              {testMessage && (
                <div
                  className={`p-3 rounded-xl border text-xs flex items-start gap-2 ${
                    testStatus === "success"
                      ? "bg-emerald-950/60 border-emerald-700 text-emerald-200"
                      : "bg-amber-950/60 border-amber-700 text-amber-200"
                  }`}
                >
                  <Info className="w-4 h-4 shrink-0 mt-0.5" />
                  <div className="leading-relaxed">{testMessage}</div>
                </div>
              )}
            </div>
          )}

          {/* Model Selection Tab */}
          {activeTab === "modelos" && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="text-xs text-slate-300">
                  Seleccione el modelo exacto de terminal SmartPOS que tiene en su negocio:
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab("conexion")}
                  className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1 transition-colors"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Volver a IP</span>
                </button>
              </div>

              <div className="grid grid-cols-1 gap-2">
                {SMARTPOS_MODELS_VE.map((m) => {
                  const isSelected = config.modelo === m.id;
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => {
                        setConfig({ ...config, modelo: m.id });
                        setActiveTab("conexion");
                      }}
                      className={`p-3 rounded-xl text-left border transition-all flex items-center justify-between ${
                        isSelected
                          ? "bg-blue-600/20 border-blue-500 text-white"
                          : "bg-[#161922] border-slate-800 text-slate-300 hover:border-slate-700"
                      }`}
                    >
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-xs text-white">{m.name}</span>
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 font-mono">
                            {m.brand}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400">{m.desc}</p>
                        <p className="text-[10px] text-blue-300 font-medium">
                          Bancos habituales: {m.bancosHabituales}
                        </p>
                      </div>

                      {isSelected && (
                        <div className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center text-white shrink-0 ml-2">
                          <CheckCircle2 className="w-4 h-4" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Guide Tab */}
          {activeTab === "guia" && (
            <div className="space-y-3 text-xs text-slate-300">
              {/* PAX guide */}
              <div className="bg-[#161922] p-4 rounded-xl border border-slate-800 space-y-2">
                <div className="font-bold text-white text-sm flex items-center gap-2">
                  <Smartphone className="w-4 h-4 text-blue-400" />
                  Para terminales PAX (A920, A930, A910):
                </div>
                <ol className="list-decimal list-inside space-y-1.5 text-slate-300 leading-relaxed">
                  <li>Encienda el PAX y desbloquee la pantalla táctil.</li>
                  <li>
                    Deslice el dedo desde el borde superior hacia abajo para ver la barra de estado y toque el icono de{" "}
                    <strong className="text-white">Ajustes (Engranaje ⚙️)</strong>.
                  </li>
                  <li>
                    Seleccione <strong className="text-white">Wi-Fi</strong>.
                  </li>
                  <li>
                    Toque sobre la red conectada ➔ <strong className="text-white">Opciones Avanzadas</strong>.
                  </li>
                  <li>
                    Copie la <strong className="text-blue-400">Dirección IP</strong> (ej: <code className="text-amber-300">192.168.1.50</code>).
                  </li>
                </ol>
              </div>

              {/* WizarPOS guide */}
              <div className="bg-[#161922] p-4 rounded-xl border border-slate-800 space-y-2">
                <div className="font-bold text-white text-sm flex items-center gap-2">
                  <Smartphone className="w-4 h-4 text-emerald-400" />
                  Para terminales WizarPOS (Q2, Q3):
                </div>
                <ol className="list-decimal list-inside space-y-1.5 text-slate-300 leading-relaxed">
                  <li>Encienda el WizarPOS y entre a <strong className="text-white">Ajustes del Sistema</strong>.</li>
                  <li>
                    Vaya a <strong className="text-white">Red e Internet ➔ Wi-Fi</strong>.
                  </li>
                  <li>
                    Haga clic en la red conectada para ver los detalles de enlace.
                  </li>
                  <li>Copie la <strong className="text-emerald-400">Dirección IP</strong> mostrada.</li>
                </ol>
              </div>

              {/* Sunmi guide */}
              <div className="bg-[#161922] p-4 rounded-xl border border-slate-800 space-y-2">
                <div className="font-bold text-white text-sm flex items-center gap-2">
                  <Smartphone className="w-4 h-4 text-amber-400" />
                  Para terminales Sunmi (P2, V2) y Verifone (X990):
                </div>
                <ol className="list-decimal list-inside space-y-1.5 text-slate-300 leading-relaxed">
                  <li>Abra la app de <strong className="text-white">Ajustes de Android</strong>.</li>
                  <li>Entre en <strong className="text-white">Información del Teléfono / Estado</strong> o en <strong className="text-white">Wi-Fi</strong>.</li>
                  <li>Ubique la línea <strong className="text-amber-400">Dirección IP</strong>.</li>
                </ol>
              </div>

              <div className="bg-blue-950/40 border border-blue-700/60 p-3.5 rounded-xl text-blue-200 flex items-start gap-2.5">
                <HelpCircle className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                <div className="text-[11px] leading-relaxed">
                  <strong className="block text-white mb-0.5">Recomendación para Negocios en Venezuela:</strong>
                  En su router (Cantv, Fibra Óptica, Inter, Netuno, etc.), configure una <em>IP estática reservada por MAC</em> para el datáfono. Así nunca cambiará de número IP aunque se apague o reinicie.
                </div>
              </div>
            </div>
          )}

          {/* Advanced Tab */}
          {activeTab === "avanzado" && (
            <div className="space-y-3">
              <div className="bg-[#161922] p-3.5 rounded-xl border border-slate-800 space-y-2">
                <label className="block text-xs font-bold text-slate-300">
                  Tiempo Límite de Espera de Tarjeta (Segundos):
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min="15"
                    max="60"
                    step="5"
                    value={config.timeoutSegundos}
                    onChange={(e) =>
                      setConfig({ ...config, timeoutSegundos: parseInt(e.target.value) })
                    }
                    className="flex-1 accent-blue-500"
                  />
                  <span className="font-mono text-sm font-bold text-white w-12 text-right">
                    {config.timeoutSegundos}s
                  </span>
                </div>
                <p className="text-[11px] text-slate-400">
                  Tiempo máximo que el sistema esperará a que el cliente pase la tarjeta en el POS antes de cancelar la orden.
                </p>
              </div>

              <div className="bg-[#161922] p-3.5 rounded-xl border border-slate-800 space-y-2">
                <label className="flex items-center gap-2 text-xs font-bold text-slate-200 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.autoConfirmarVenta}
                    onChange={(e) =>
                      setConfig({ ...config, autoConfirmarVenta: e.target.checked })
                    }
                    className="rounded border-slate-700 text-blue-600 focus:ring-blue-500 bg-slate-800"
                  />
                  <span>Emitir Factura Fiscal automáticamente al aprobar el pago</span>
                </label>
                <p className="text-[11px] text-slate-400 pl-5">
                  Al recibir la aprobación del banco con número de referencia, se genera y emite de inmediato la factura SENIAT con los datos de auditoría.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-[#181b24] px-5 py-3.5 border-t border-slate-800 flex items-center justify-between">
          <button
            type="button"
            onClick={handleResetDefaults}
            className="text-xs text-slate-400 hover:text-slate-200 flex items-center gap-1.5 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Restablecer Valores</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-emerald-950/40 transition-colors"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{saveNotification ? "¡Guardado!" : "Guardar Configuración"}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
