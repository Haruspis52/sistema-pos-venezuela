import React, { useState } from "react";
import {
  Server,
  Terminal,
  Wifi,
  CheckCircle2,
  Copy,
  Check,
  X,
  Laptop,
  Smartphone,
  ExternalLink,
  ShieldCheck,
  Sparkles,
  Layers,
  Monitor,
} from "lucide-react";

interface NodeJsSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  showToast?: (msg: string) => void;
}

export const NodeJsSetupModal: React.FC<NodeJsSetupModalProps> = ({
  isOpen,
  onClose,
  showToast,
}) => {
  const [activeTab, setActiveTab] = useState<"quickstart" | "multicaja" | "commands" | "pwa">("quickstart");
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(id);
    setTimeout(() => setCopiedKey(null), 2000);
    showToast?.("Comando copiado al portapapeles.");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200 overflow-y-auto">
      <div className="bg-[#12141c] border border-emerald-500/40 rounded-2xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] my-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#141b18] via-[#16201b] to-[#141b18] p-5 sm:p-6 border-b border-emerald-900/40 relative shrink-0">
          <button
            onClick={onClose}
            className="absolute right-4 top-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shadow-lg shadow-emerald-950/40 shrink-0">
              <Server className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-xl font-bold text-white tracking-tight">
                  Instalación y Despliegue con Node.js
                </h2>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-700/60 uppercase">
                  Modo Cliente Producción
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Guía completa para instalar, iniciar y compartir el sistema en red local en el negocio usando Node.js.
              </p>
            </div>
          </div>

          {/* Navigation Sub-Tabs */}
          <div className="flex items-center gap-2 mt-4 pt-3 border-t border-slate-800/80 overflow-x-auto text-xs shrink-0">
            <button
              onClick={() => setActiveTab("quickstart")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition-all shrink-0 ${
                activeTab === "quickstart"
                  ? "bg-emerald-500 text-slate-950 font-bold shadow-md shadow-emerald-950/40"
                  : "bg-slate-900/60 text-slate-300 hover:bg-slate-800"
              }`}
            >
              <Terminal className="w-3.5 h-3.5" />
              <span>1. Inicio Rápido (1 Clic)</span>
            </button>

            <button
              onClick={() => setActiveTab("multicaja")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition-all shrink-0 ${
                activeTab === "multicaja"
                  ? "bg-emerald-500 text-slate-950 font-bold shadow-md shadow-emerald-950/40"
                  : "bg-slate-900/60 text-slate-300 hover:bg-slate-800"
              }`}
            >
              <Wifi className="w-3.5 h-3.5" />
              <span>2. Red Local y Multicaja</span>
            </button>

            <button
              onClick={() => setActiveTab("pwa")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition-all shrink-0 ${
                activeTab === "pwa"
                  ? "bg-emerald-500 text-slate-950 font-bold shadow-md shadow-emerald-950/40"
                  : "bg-slate-900/60 text-slate-300 hover:bg-slate-800"
              }`}
            >
              <Monitor className="w-3.5 h-3.5" />
              <span>3. Acceso Directo de Escritorio</span>
            </button>

            <button
              onClick={() => setActiveTab("commands")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition-all shrink-0 ${
                activeTab === "commands"
                  ? "bg-emerald-500 text-slate-950 font-bold shadow-md shadow-emerald-950/40"
                  : "bg-slate-900/60 text-slate-300 hover:bg-slate-800"
              }`}
            >
              <Terminal className="w-3.5 h-3.5" />
              <span>4. Comandos de Consola</span>
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5 text-xs text-slate-300 leading-relaxed flex-1 min-h-0">
          {/* TAB 1: QUICKSTART */}
          {activeTab === "quickstart" && (
            <div className="space-y-4">
              <div className="bg-emerald-950/30 border border-emerald-800/40 rounded-xl p-4 flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-bold text-emerald-300">
                    Instalación Automática sin complicaciones
                  </h4>
                  <p className="text-xs text-slate-300 mt-1">
                    El sistema incluye scripts ejecutables para Windows (.bat) que se encargan de comprobar Node.js, instalar dependencias con <code className="text-emerald-300 font-mono">npm</code> y abrir el navegador en segundos.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Paso 1 */}
                <div className="bg-[#161922] border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
                  <div>
                    <div className="w-7 h-7 rounded-lg bg-blue-500/20 text-blue-400 font-bold flex items-center justify-center font-mono mb-2">
                      1
                    </div>
                    <h5 className="font-bold text-white text-sm">Instalar Node.js</h5>
                    <p className="text-slate-400 mt-1">
                      Si el equipo aún no tiene Node.js, descargue la versión LTS oficial recomendada:
                    </p>
                  </div>
                  <a
                    href="https://nodejs.org/"
                    target="_blank"
                    rel="noreferrer"
                    className="mt-3 inline-flex items-center gap-1.5 text-blue-400 hover:text-blue-300 font-semibold underline"
                  >
                    <span>Descargar Node.js LTS</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>

                {/* Paso 2 */}
                <div className="bg-[#161922] border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
                  <div>
                    <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 font-bold flex items-center justify-center font-mono mb-2">
                      2
                    </div>
                    <h5 className="font-bold text-white text-sm">Ejecutar Instalador</h5>
                    <p className="text-slate-400 mt-1">
                      Haga doble clic en el archivo:
                    </p>
                    <div className="mt-2 p-2 bg-slate-950 rounded border border-slate-800 font-mono text-[11px] text-emerald-300 font-bold flex items-center justify-between">
                      <span>INSTALAR_CLIENTE_NODEJS.bat</span>
                      <button
                        onClick={() => handleCopy("INSTALAR_CLIENTE_NODEJS.bat", "bat1")}
                        className="text-slate-400 hover:text-white"
                        title="Copiar nombre"
                      >
                        {copiedKey === "bat1" ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                  <p className="text-[10px] text-slate-500 mt-2">
                    Instala librerías y dependencias automáticamente.
                  </p>
                </div>

                {/* Paso 3 */}
                <div className="bg-[#161922] border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
                  <div>
                    <div className="w-7 h-7 rounded-lg bg-amber-500/20 text-amber-400 font-bold flex items-center justify-center font-mono mb-2">
                      3
                    </div>
                    <h5 className="font-bold text-white text-sm">Abrir el Sistema POS</h5>
                    <p className="text-slate-400 mt-1">
                      Para iniciar la caja diariamente, haga doble clic en:
                    </p>
                    <div className="mt-2 p-2 bg-slate-950 rounded border border-slate-800 font-mono text-[11px] text-amber-300 font-bold flex items-center justify-between">
                      <span>INICIAR_SISTEMA_NODEJS.bat</span>
                      <button
                        onClick={() => handleCopy("INICIAR_SISTEMA_NODEJS.bat", "bat2")}
                        className="text-slate-400 hover:text-white"
                        title="Copiar nombre"
                      >
                        {copiedKey === "bat2" ? <Check className="w-3.5 h-3.5 text-amber-400" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                  <p className="text-[10px] text-emerald-400 font-semibold mt-2">
                    ¡Abre el navegador en http://localhost:3000 de inmediato!
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: MULTICAJA Y RED LOCAL */}
          {activeTab === "multicaja" && (
            <div className="space-y-4">
              <div className="bg-[#161922] border border-slate-800 rounded-xl p-4 space-y-3">
                <div className="flex items-center gap-2 text-sm font-bold text-white">
                  <Wifi className="w-4 h-4 text-emerald-400" />
                  <span>¿Cómo conectar múltiples cajas, teléfonos o tablets en el negocio?</span>
                </div>
                <p className="text-slate-300 leading-relaxed">
                  Gracias a que este sistema corre sobre <strong>Node.js y Express</strong>, no necesita instalar el software en cada dispositivo. Solo ejecútelo en la computadora principal (Servidor) y todas las demás cajas podrán acceder conectadas al mismo WiFi.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                  <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                    <div className="flex items-center gap-2 font-bold text-slate-200 mb-1">
                      <Laptop className="w-4 h-4 text-blue-400" />
                      <span>Caja Principal / Servidor</span>
                    </div>
                    <p className="text-[11px] text-slate-400 mb-2">
                      Abra la terminal en Windows y ejecute <code className="text-blue-300 font-mono">ipconfig</code> para ver la IP local:
                    </p>
                    <div className="p-2 bg-[#0c0e14] rounded border border-slate-800 font-mono text-[11px] text-amber-300">
                      http://localhost:3000
                    </div>
                  </div>

                  <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                    <div className="flex items-center gap-2 font-bold text-slate-200 mb-1">
                      <Smartphone className="w-4 h-4 text-emerald-400" />
                      <span>Caja 2 / Teléfonos / Tablets</span>
                    </div>
                    <p className="text-[11px] text-slate-400 mb-2">
                      Conectados a la misma red WiFi, ingresen desde el navegador a la IP de la PC principal:
                    </p>
                    <div className="p-2 bg-[#0c0e14] rounded border border-slate-800 font-mono text-[11px] text-emerald-300">
                      http://192.168.1.XX:3000
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-3 bg-amber-950/30 border border-amber-800/40 rounded-xl text-slate-300 text-xs">
                <strong className="text-amber-300">Nota de Red:</strong> Si otra computadora no puede conectar, asegúrese de que en el Firewall de Windows se permita el acceso a Node.js en redes privadas o abra el puerto 3000 TCP.
              </div>
            </div>
          )}

          {/* TAB 3: ACCESO DIRECTO DE ESCRITORIO */}
          {activeTab === "pwa" && (
            <div className="space-y-4">
              <div className="bg-[#161922] border border-slate-800 rounded-xl p-4 space-y-3">
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  <Monitor className="w-4 h-4 text-blue-400" />
                  <span>Convertir en Aplicación de Escritorio (Sin barra de navegador)</span>
                </h4>
                <p className="text-slate-300">
                  Puede ejecutar el sistema en pantalla completa o como una app nativa de Windows con su propio ícono en el escritorio:
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                  <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
                    <h5 className="font-bold text-slate-200 text-xs flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                      <span>Opción A: Instalación PWA (Chrome o Edge)</span>
                    </h5>
                    <ol className="list-decimal list-inside space-y-1 text-[11px] text-slate-400">
                      <li>Abra <code className="text-blue-300">http://localhost:3000</code> en Google Chrome o Microsoft Edge.</li>
                      <li>Haga clic en el ícono de los 3 puntos (⋮) en la esquina superior derecha.</li>
                      <li>Haga clic en <strong>"Instalar página como aplicación"</strong> o <strong>"Aplicaciones → Instalar Sistema POS"</strong>.</li>
                      <li>Se creará una ventana independiente con el ícono del sistema listo para usar.</li>
                    </ol>
                  </div>

                  <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
                    <h5 className="font-bold text-slate-200 text-xs flex items-center gap-1.5">
                      <Laptop className="w-3.5 h-3.5 text-blue-400" />
                      <span>Opción B: Acceso Directo de Windows</span>
                    </h5>
                    <ol className="list-decimal list-inside space-y-1 text-[11px] text-slate-400">
                      <li>Haga clic derecho en su escritorio de Windows → <strong>Nuevo → Acceso directo</strong>.</li>
                      <li>En la ubicación, escriba: <code className="text-amber-300 font-mono">http://localhost:3000</code></li>
                      <li>Asígnele el nombre <strong>"Punto de Venta POS"</strong>.</li>
                      <li>Haga clic derecho en el acceso directo → Propiedades → Cambiar icono → seleccione el archivo <code className="text-emerald-300">app_icon.ico</code>.</li>
                    </ol>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: COMANDOS DE CONSOLA */}
          {activeTab === "commands" && (
            <div className="space-y-4">
              <div className="bg-[#161922] border border-slate-800 rounded-xl p-4 space-y-3">
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-emerald-400" />
                  <span>Comandos estándar para desarrolladores y administradores de sistemas</span>
                </h4>
                <p className="text-slate-400 text-xs">
                  Si prefiere manejar el servidor manualmente desde PowerShell, CMD o una terminal de Linux:
                </p>

                <div className="space-y-3">
                  <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[11px] font-bold text-slate-300">1. Instalar dependencias:</span>
                      <button
                        onClick={() => handleCopy("npm install", "cmd1")}
                        className="text-xs text-blue-400 hover:text-white flex items-center gap-1"
                      >
                        {copiedKey === "cmd1" ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                        <span>{copiedKey === "cmd1" ? "Copiado" : "Copiar"}</span>
                      </button>
                    </div>
                    <code className="text-emerald-300 font-mono text-[11px]">npm install</code>
                  </div>

                  <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[11px] font-bold text-slate-300">2. Iniciar servidor de desarrollo (Con recarga ágil):</span>
                      <button
                        onClick={() => handleCopy("npm run dev", "cmd2")}
                        className="text-xs text-blue-400 hover:text-white flex items-center gap-1"
                      >
                        {copiedKey === "cmd2" ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                        <span>{copiedKey === "cmd2" ? "Copiado" : "Copiar"}</span>
                      </button>
                    </div>
                    <code className="text-emerald-300 font-mono text-[11px]">npm run dev</code>
                  </div>

                  <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[11px] font-bold text-slate-300">3. Compilar y ejecutar en producción optimizada:</span>
                      <button
                        onClick={() => handleCopy("npm run build && npm start", "cmd3")}
                        className="text-xs text-blue-400 hover:text-white flex items-center gap-1"
                      >
                        {copiedKey === "cmd3" ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                        <span>{copiedKey === "cmd3" ? "Copiado" : "Copiar"}</span>
                      </button>
                    </div>
                    <code className="text-emerald-300 font-mono text-[11px]">npm run build && npm start</code>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-[#0f1118] border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400 shrink-0">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>Servidor Node.js activo en puerto 3000</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white font-semibold rounded-xl transition"
          >
            Cerrar Guía
          </button>
        </div>
      </div>
    </div>
  );
};
