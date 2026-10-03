import React, { useState, useEffect } from "react";
import { KeyRound, CheckCircle2, AlertTriangle, Eye, EyeOff, ExternalLink, Trash2, X, RefreshCw, Sparkles, ShieldCheck } from "lucide-react";
import { getStoredGeminiApiKey, saveStoredGeminiApiKey } from "../mockDb";

interface GeminiApiKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onKeyUpdated: (key: string) => void;
  showToast?: (msg: string) => void;
}

export const GeminiApiKeyModal: React.FC<GeminiApiKeyModalProps> = ({
  isOpen,
  onClose,
  onKeyUpdated,
  showToast,
}) => {
  const [apiKeyInput, setApiKeyInput] = useState("");
  const [showKeyText, setShowKeyText] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationResult, setVerificationResult] = useState<{
    success: boolean;
    message: string;
    source?: string;
  } | null>(null);

  // Load existing key on open
  useEffect(() => {
    if (isOpen) {
      const stored = getStoredGeminiApiKey();
      setApiKeyInput(stored);
      setVerificationResult(null);
      // Auto check status if key exists
      if (stored) {
        verifyKey(stored);
      }
    }
  }, [isOpen]);

  const verifyKey = async (keyToTest: string) => {
    setIsVerifying(true);
    setVerificationResult(null);
    try {
      const res = await fetch("/api/gemini/verify-key", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey: keyToTest.trim() }),
      });
      const data = await res.json();
      if (data.valid) {
        setVerificationResult({
          success: true,
          message: data.message || "¡API Key válida! Conexión exitosa con Google Gemini AI.",
          source: data.source,
        });
      } else {
        setVerificationResult({
          success: false,
          message: data.error || data.message || "La clave de API no es válida o fue rechazada.",
          source: data.source,
        });
      }
    } catch {
      setVerificationResult({
        success: false,
        message: "No se pudo contactar al servidor para verificar la clave.",
      });
    } finally {
      setIsVerifying(false);
    }
  };

  const handleSave = () => {
    const clean = apiKeyInput.trim();
    saveStoredGeminiApiKey(clean);
    onKeyUpdated(clean);
    if (showToast) {
      showToast(clean ? "✅ API Key de Google Gemini guardada correctamente." : "🗑️ API Key de Gemini eliminada.");
    }
    onClose();
  };

  const handleClear = () => {
    setApiKeyInput("");
    saveStoredGeminiApiKey("");
    onKeyUpdated("");
    setVerificationResult(null);
    if (showToast) {
      showToast("🗑️ API Key de Gemini eliminada del almacenamiento local.");
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-[#141720] border border-slate-700/80 rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-[#1a1e29] px-5 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-600/20 border border-blue-500/40 flex items-center justify-center text-blue-400">
              <KeyRound className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                <span>Configurar Google Gemini API Key</span>
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              </h3>
              <p className="text-[11px] text-slate-400">
                Para escanear facturas de proveedores con IA
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4 overflow-y-auto">
          {/* Information box */}
          <div className="bg-[#0f1117] p-3.5 rounded-xl border border-slate-800 text-xs text-slate-300 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-white flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                ¿Cómo obtener tu clave de Gemini?
              </span>
              <a
                href="https://aistudio.google.com/app/apikey"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-[11px] text-blue-400 hover:text-blue-300 font-semibold underline"
              >
                <span>Obtener en Google AI Studio</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              1. Inicia sesión con tu cuenta de Google en AI Studio.<br />
              2. Presiona <strong>"Create API key"</strong> y copia el código generado (empieza por <code className="text-amber-300 bg-amber-950/40 px-1 py-0.5 rounded">AIzaSy...</code>).<br />
              3. Pégalo en el campo inferior para que el sistema lea fotos de facturas físicas al instante.
            </p>
          </div>

          {/* Input field */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
              <span>Tu API Key de Google Gemini:</span>
              {apiKeyInput && (
                <button
                  type="button"
                  onClick={handleClear}
                  className="text-[10px] text-rose-400 hover:text-rose-300 flex items-center gap-1"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>Borrar clave</span>
                </button>
              )}
            </label>

            <div className="relative">
              <input
                type={showKeyText ? "text" : "password"}
                value={apiKeyInput}
                onChange={(e) => {
                  setApiKeyInput(e.target.value);
                  setVerificationResult(null);
                }}
                placeholder="AIzaSyBxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                className="w-full bg-[#0c0e14] border border-slate-700 rounded-xl px-3.5 py-2.5 pr-20 text-xs text-white placeholder-slate-500 font-mono focus:border-blue-500 focus:outline-none"
              />
              <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setShowKeyText(!showKeyText)}
                  className="text-slate-400 hover:text-white p-1 rounded"
                  title={showKeyText ? "Ocultar" : "Mostrar"}
                >
                  {showKeyText ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
          </div>

          {/* Verification Status Banner */}
          {verificationResult && (
            <div
              className={`p-3 rounded-xl border text-xs flex items-start gap-2.5 ${
                verificationResult.success
                  ? "bg-emerald-950/40 border-emerald-500/40 text-emerald-300"
                  : "bg-rose-950/40 border-rose-500/40 text-rose-300"
              }`}
            >
              {verificationResult.success ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              )}
              <div className="space-y-0.5 flex-1">
                <p className="font-bold">
                  {verificationResult.success ? "Clave Operativa" : "Error en Validación"}
                </p>
                <p className="text-[11px] leading-relaxed opacity-90">
                  {verificationResult.message}
                </p>
              </div>
            </div>
          )}

          {/* Test button */}
          <div className="flex items-center justify-between pt-1">
            <button
              type="button"
              disabled={isVerifying || !apiKeyInput.trim()}
              onClick={() => verifyKey(apiKeyInput)}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isVerifying ? "animate-spin text-blue-400" : ""}`} />
              <span>{isVerifying ? "Verificando con Gemini..." : "Probar Conexión"}</span>
            </button>

            <span className="text-[10px] text-slate-500">
              Almacenamiento seguro en navegador local
            </span>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-[#1a1e29] px-5 py-3 border-t border-slate-800 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-5 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold shadow-lg shadow-blue-950/40 flex items-center gap-1.5"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Guardar API Key</span>
          </button>
        </div>
      </div>
    </div>
  );
};
