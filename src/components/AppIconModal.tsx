import React, { useState } from "react";
import {
  X,
  Download,
  Copy,
  Check,
  Sparkles,
  Monitor,
  Laptop,
  Layers,
  Terminal,
} from "lucide-react";

interface AppIconModalProps {
  isOpen: boolean;
  onClose: () => void;
  showToast?: (msg: string) => void;
}

export const AppIconModal: React.FC<AppIconModalProps> = ({
  isOpen,
  onClose,
  showToast,
}) => {
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [previewBg, setPreviewBg] = useState<"dark" | "light" | "glass">("dark");

  if (!isOpen) return null;

  const iconUrl = "/app_icon.jpg";

  const handleDownload = (filename: string) => {
    const link = document.createElement("a");
    link.href = iconUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast?.(`Descargando ${filename}...`);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2000);
    showToast?.("Ruta del ícono copiada.");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-2xl bg-[#16191f] border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800/80 bg-slate-900/60">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl overflow-hidden border border-blue-500/40 shadow-md shadow-blue-500/20 flex-shrink-0">
              <img
                src={iconUrl}
                alt="Ícono del Programa"
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                Ícono Oficial del Sistema POS
                <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30">
                  Render 3D HD
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Identidad gráfica para escritorio Windows, acceso directo de navegador y aplicaciones móviles
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-6 overflow-y-auto">
          {/* Preview Canvas */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6 p-6 rounded-2xl bg-slate-950/70 border border-slate-800/60">
            <div className="flex items-center gap-6">
              {/* Large Icon Preview */}
              <div
                className={`w-28 h-28 rounded-2xl p-2.5 flex items-center justify-center transition-all shadow-2xl ${
                  previewBg === "dark"
                    ? "bg-[#0c0e12] border border-slate-800"
                    : previewBg === "light"
                    ? "bg-slate-200 border border-slate-300"
                    : "bg-gradient-to-br from-blue-900/40 via-purple-900/20 to-slate-900/80 border border-blue-500/30 backdrop-blur-md"
                }`}
              >
                <img
                  src={iconUrl}
                  alt="POS 3D Icon"
                  className="w-full h-full object-cover rounded-xl shadow-lg"
                  referrerPolicy="no-referrer"
                />
              </div>

              {/* Smaller Scale Previews */}
              <div className="space-y-3">
                <div className="text-xs font-semibold text-slate-400">Escalas de visualización:</div>
                <div className="flex items-center gap-4">
                  <div className="flex flex-col items-center gap-1">
                    <div className="w-12 h-12 rounded-xl overflow-hidden border border-slate-700 shadow-md">
                      <img src={iconUrl} alt="48px" className="w-full h-full object-cover" />
                    </div>
                    <span className="text-[10px] text-slate-500 font-mono">48px</span>
                  </div>
                  <div className="flex flex-col items-center gap-1">
                    <div className="w-8 h-8 rounded-lg overflow-hidden border border-slate-700 shadow-sm">
                      <img src={iconUrl} alt="32px" className="w-full h-full object-cover" />
                    </div>
                    <span className="text-[10px] text-slate-500 font-mono">32px</span>
                  </div>
                  <div className="flex flex-col items-center gap-1">
                    <div className="w-5 h-5 rounded-md overflow-hidden border border-slate-700 shadow-sm">
                      <img src={iconUrl} alt="16px" className="w-full h-full object-cover" />
                    </div>
                    <span className="text-[10px] text-slate-500 font-mono">16px</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Background Selector */}
            <div className="flex flex-col items-end gap-2">
              <span className="text-xs text-slate-400">Fondo de prueba:</span>
              <div className="flex gap-1.5 p-1 bg-slate-900 rounded-xl border border-slate-800">
                <button
                  onClick={() => setPreviewBg("dark")}
                  className={`px-2.5 py-1 text-xs rounded-lg transition ${
                    previewBg === "dark"
                      ? "bg-slate-800 text-white font-semibold"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  Oscuro
                </button>
                <button
                  onClick={() => setPreviewBg("light")}
                  className={`px-2.5 py-1 text-xs rounded-lg transition ${
                    previewBg === "light"
                      ? "bg-slate-200 text-slate-900 font-semibold"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  Claro
                </button>
                <button
                  onClick={() => setPreviewBg("glass")}
                  className={`px-2.5 py-1 text-xs rounded-lg transition ${
                    previewBg === "glass"
                      ? "bg-blue-600 text-white font-semibold"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  Gradiente
                </button>
              </div>
            </div>
          </div>

          {/* Action Download Buttons */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <Download className="w-4 h-4 text-emerald-400" />
              Descargar Archivos de Ícono:
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <button
                onClick={() => handleDownload("app_icon.ico")}
                className="flex items-center justify-center gap-2 p-3 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-blue-500/50 text-white text-xs font-semibold transition group shadow-sm"
              >
                <Monitor className="w-4 h-4 text-blue-400 group-hover:scale-110 transition-transform" />
                <span>Formato .ICO (Windows)</span>
              </button>

              <button
                onClick={() => handleDownload("app_icon.jpg")}
                className="flex items-center justify-center gap-2 p-3 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-emerald-500/50 text-white text-xs font-semibold transition group shadow-sm"
              >
                <Download className="w-4 h-4 text-emerald-400 group-hover:scale-110 transition-transform" />
                <span>Formato .JPG (HD 1024x1024)</span>
              </button>

              <button
                onClick={() => copyToClipboard("/app_icon.jpg")}
                className="flex items-center justify-center gap-2 p-3 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-amber-500/50 text-white text-xs font-semibold transition group shadow-sm"
              >
                {copiedUrl ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-400" />
                    <span>¡Copiada!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 text-slate-400 group-hover:scale-110 transition-transform" />
                    <span>Copiar Ruta Web</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Windows Desktop Shortcut Instructions */}
          <div className="space-y-2 p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs">
            <h4 className="font-semibold text-slate-200 flex items-center gap-1.5">
              <Laptop className="w-4 h-4 text-blue-400" />
              <span>Cómo colocar el ícono en el Escritorio de Windows (Node.js):</span>
            </h4>
            <ol className="list-decimal list-inside space-y-1.5 text-slate-400 text-[11px] pt-1">
              <li>Descargue el archivo <strong>app_icon.ico</strong> usando el botón superior.</li>
              <li>Haga clic derecho en su escritorio → <strong>Nuevo → Acceso directo</strong>.</li>
              <li>Escriba la dirección del servidor: <code className="text-amber-300 font-mono">http://localhost:3000</code></li>
              <li>Nombre el acceso directo como <strong>"Punto de Venta POS"</strong>.</li>
              <li>Haga clic derecho en el acceso directo creado → <strong>Propiedades → Cambiar icono...</strong></li>
              <li>Seleccione el archivo <code className="text-emerald-300 font-mono">app_icon.ico</code> descargado y haga clic en Aceptar.</li>
            </ol>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-800/80 bg-slate-900/60 flex items-center justify-between">
          <p className="text-xs text-slate-400">
            El ícono ya está integrado automáticamente como favicon del sistema web Node.js.
          </p>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold transition"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
