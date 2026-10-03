import React, { useState, useEffect } from "react";
import {
  GitBranch,
  RefreshCw,
  Download,
  CheckCircle2,
  AlertCircle,
  Terminal,
  ExternalLink,
  Copy,
  FileCode,
  Sparkles,
  X,
  ShieldCheck,
  FolderGit2,
} from "lucide-react";
import { APP_VERSION, RELEASE_DATE, CURRENT_VERSION_INFO, DEFAULT_GITHUB_REPO } from "../version";

interface SystemUpdateModalProps {
  isOpen: boolean;
  onClose: () => void;
  showToast?: (msg: string) => void;
}

export const SystemUpdateModal: React.FC<SystemUpdateModalProps> = ({
  isOpen,
  onClose,
  showToast,
}) => {
  const [githubRepo, setGithubRepo] = useState<string>(() => {
    try {
      return localStorage.getItem("pos_custom_github_repo") || DEFAULT_GITHUB_REPO;
    } catch {
      return DEFAULT_GITHUB_REPO;
    }
  });

  const [isChecking, setIsChecking] = useState(false);
  const [checkResult, setCheckResult] = useState<{
    checked: boolean;
    success: boolean;
    hasUpdate: boolean;
    remoteVersion?: string;
    message?: string;
    releaseNotes?: string;
  } | null>(null);

  const [isApplyingUpdate, setIsApplyingUpdate] = useState(false);
  const [updateLog, setUpdateLog] = useState<string | null>(null);
  const [copiedScript, setCopiedScript] = useState<string | null>(null);

  const handleSaveRepo = (val: string) => {
    setGithubRepo(val);
    try {
      localStorage.setItem("pos_custom_github_repo", val);
    } catch {}
  };

  const handleCheckUpdate = async () => {
    setIsChecking(true);
    setCheckResult(null);
    setUpdateLog(null);

    try {
      const res = await fetch(`/api/system/check-github-update?repo=${encodeURIComponent(githubRepo.trim())}`);
      if (res.ok) {
        const data = await res.json();
        setCheckResult({
          checked: true,
          success: data.success,
          hasUpdate: data.hasUpdate,
          remoteVersion: data.remoteVersion,
          message: data.message,
          releaseNotes: data.releaseNotes,
        });
      } else {
        setCheckResult({
          checked: true,
          success: false,
          hasUpdate: false,
          message: `Error al contactar con el servidor local (HTTP ${res.status}).`,
        });
      }
    } catch (e: any) {
      setCheckResult({
        checked: true,
        success: false,
        hasUpdate: false,
        message: `Fallo al verificar actualización: ${e?.message || "Sin conexión"}`,
      });
    } finally {
      setIsChecking(false);
    }
  };

  const handleApplyUpdate = async () => {
    setIsApplyingUpdate(true);
    setUpdateLog("Ejecutando 'git pull origin main' y compilando la aplicación en la máquina local...");

    try {
      const res = await fetch("/api/system/apply-git-update", { method: "POST" });
      const data = await res.json();

      if (data.success) {
        setUpdateLog(`[ÉXITO] ${data.message}\n\nDetalles del proceso:\n${data.output || "Sin salida adicional."}`);
        if (showToast) {
          showToast("🎉 ¡Sistema actualizado con éxito! Recargando en 3 segundos...");
        }
        setTimeout(() => {
          window.location.reload();
        }, 3500);
      } else {
        setUpdateLog(
          `[AVISO] ${data.message || "No se pudo actualizar vía Git en este entorno."}\n\n` +
          `Motivo: ${data.error || "Repositorio de desarrollo"}\n\n` +
          `Instrucción alternativa para la computadora del cliente:\n${data.manualInstruction || "Ejecuta: scripts\\actualizar_sistema.bat"}`
        );
      }
    } catch (e: any) {
      setUpdateLog(`[ERROR] Fallo de llamada al servidor: ${e?.message}`);
    } finally {
      setIsApplyingUpdate(false);
    }
  };

  const copyBatScript = (type: "actualizar" | "iniciar") => {
    const text =
      type === "actualizar"
        ? `@echo off\nchcp 65001 > nul\ntitle Actualizador POS\ncolor 0A\necho Descargando actualizaciones de GitHub...\ngit pull origin main\necho Compilando aplicacion...\ncall npm run build\necho Actualizacion completada.\npause`
        : `@echo off\nchcp 65001 > nul\ntitle Sistema POS\ncolor 0B\ncd /d "%~dp0.."\nstart "" cmd /c "timeout /t 3 >nul && start http://localhost:3000"\nnpm run dev`;

    if (navigator?.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedScript(type);
      setTimeout(() => setCopiedScript(null), 2500);
      if (showToast) {
        showToast(`📋 Contenido de ${type === "actualizar" ? "Actualizar_POS.bat" : "Iniciar_POS.bat"} copiado.`);
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-[#12151e] border-2 border-slate-700/80 rounded-3xl w-full max-w-3xl shadow-2xl shadow-black/90 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-[#161a25] to-[#12151e] p-5 sm:p-6 border-b border-slate-800 flex items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border-2 border-indigo-500/30 flex items-center justify-center text-indigo-400 shadow-lg shadow-indigo-950/40 shrink-0">
              <GitBranch className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg sm:text-xl font-black text-white tracking-tight">
                  Actualizaciones del Sistema (GitHub)
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-indigo-500/10 text-indigo-300 border border-indigo-500/30">
                  Node.js Local
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Sincroniza y actualiza la versión del punto de venta directamente desde tu repositorio de GitHub.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer shrink-0"
            title="Cerrar ventana"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5 flex-1 min-h-0 bg-[#0c0e15]">
          {/* Tarjeta de Versión Actual */}
          <div className="bg-[#141722] border border-slate-800 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider">
                Versión Local Instalada
              </span>
              <div className="flex items-center gap-3 mt-1">
                <span className="text-2xl font-black text-white font-mono tracking-tight">
                  v{APP_VERSION}
                </span>
                <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 text-xs font-mono font-bold border border-emerald-500/40">
                  Activa
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Fecha de compilación: <strong>{RELEASE_DATE}</strong>
              </p>
            </div>

            <button
              type="button"
              onClick={handleCheckUpdate}
              disabled={isChecking}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-50 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-lg shadow-blue-950/50 cursor-pointer transition-all active:scale-[0.98]"
            >
              <RefreshCw className={`w-4 h-4 ${isChecking ? "animate-spin" : ""}`} />
              <span>{isChecking ? "Consultando GitHub..." : "Buscar Actualizaciones Ahora"}</span>
            </button>
          </div>

          {/* Configuración de Repositorio GitHub */}
          <div className="bg-[#141722] border border-slate-800 rounded-2xl p-4 space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-300 flex items-center gap-2">
                <FolderGit2 className="w-4 h-4 text-indigo-400" />
                <span>Repositorio GitHub de Origen:</span>
              </label>
              <a
                href={`https://github.com/${githubRepo}`}
                target="_blank"
                rel="noreferrer"
                className="text-[11px] text-blue-400 hover:underline flex items-center gap-1 font-mono"
              >
                <span>Ver en GitHub</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>

            <input
              type="text"
              value={githubRepo}
              onChange={(e) => handleSaveRepo(e.target.value)}
              placeholder="usuario/nombre-repositorio (ej: brayangp2435/pos-bodega-fiscal)"
              className="w-full bg-[#0a0c12] border border-slate-700 rounded-xl px-3.5 py-2 text-xs font-mono text-amber-300 focus:outline-none focus:border-indigo-500"
            />
            <p className="text-[11px] text-slate-400">
              El sistema consulta el archivo <code className="text-slate-300 font-mono">package.json</code> de este repositorio público en GitHub para comparar números de versión.
            </p>
          </div>

          {/* Resultados de la Comprobación */}
          {checkResult && (
            <div className="animate-in fade-in duration-200">
              {checkResult.hasUpdate ? (
                <div className="bg-gradient-to-r from-amber-950/60 via-[#241a12] to-[#1a1410] border-2 border-amber-500/60 rounded-2xl p-5 space-y-4 shadow-xl shadow-amber-950/40">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/40 shrink-0">
                        <Sparkles className="w-6 h-6" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-white">
                          ¡Nueva versión disponible en GitHub: <span className="text-amber-300 font-mono">v{checkResult.remoteVersion}</span>!
                        </h4>
                        <p className="text-xs text-amber-200/80 mt-0.5">
                          Hay mejoras y correcciones listas para descargar en este equipo.
                        </p>
                      </div>
                    </div>
                  </div>

                  {checkResult.releaseNotes && (
                    <div className="bg-[#0e0e15] border border-amber-500/30 rounded-xl p-3.5 text-xs text-slate-300 font-mono whitespace-pre-wrap leading-relaxed max-h-36 overflow-y-auto">
                      {checkResult.releaseNotes}
                    </div>
                  )}

                  <div className="flex flex-col sm:flex-row gap-3 pt-1">
                    <button
                      type="button"
                      onClick={handleApplyUpdate}
                      disabled={isApplyingUpdate}
                      className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-50 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/60 cursor-pointer transition-all active:scale-[0.98]"
                    >
                      <Download className={`w-4 h-4 ${isApplyingUpdate ? "animate-bounce" : ""}`} />
                      <span>{isApplyingUpdate ? "Instalando Actualización..." : "Instalar Actualización Automática"}</span>
                    </button>
                  </div>
                </div>
              ) : checkResult.success ? (
                <div className="bg-[#141d18] border border-emerald-500/40 rounded-2xl p-4 flex items-center gap-3 text-xs text-emerald-200">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                  <div>
                    <span className="font-bold text-emerald-300">¡Tu sistema está al día!</span> Tienes instalada la versión más reciente (v{APP_VERSION}). No se requieren acciones.
                  </div>
                </div>
              ) : (
                <div className="bg-[#1e1315] border border-rose-500/40 rounded-2xl p-4 flex items-start gap-3 text-xs text-rose-200">
                  <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-rose-300">Aviso:</span> {checkResult.message}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Registro en vivo de la actualización */}
          {updateLog && (
            <div className="bg-[#090b10] border border-slate-700 rounded-2xl p-4 space-y-2 animate-in fade-in duration-150">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-300 font-mono">
                <Terminal className="w-4 h-4 text-emerald-400" />
                <span>Consola de Actualización:</span>
              </div>
              <pre className="text-[11px] font-mono text-slate-300 whitespace-pre-wrap leading-relaxed max-h-40 overflow-y-auto bg-black/60 p-3 rounded-xl border border-slate-800">
                {updateLog}
              </pre>
            </div>
          )}

          {/* Novedades de la versión actual */}
          <div className="bg-[#141722] border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-200">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Novedades y Registro de Cambios (v{APP_VERSION}):</span>
            </div>

            <ul className="space-y-1.5 text-xs text-slate-300 pl-2">
              {CURRENT_VERSION_INFO.changelog.map((c, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-emerald-400 font-bold shrink-0">•</span>
                  <span>{c}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Guía y Scripts para Windows (.bat) */}
          <div className="bg-[#141722] border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-200">
                <FileCode className="w-4 h-4 text-amber-400" />
                <span>Archivos Batch para el Comercio (Escritorio de Windows)</span>
              </div>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              En la carpeta <code className="text-slate-200 font-mono">scripts\</code> del proyecto ya tienes generados los archivos listos para que el cliente los use con doble clic:
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div className="bg-[#0b0d13] border border-slate-700/80 rounded-xl p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white font-mono">Actualizar_POS.bat</span>
                  <button
                    type="button"
                    onClick={() => copyBatScript("actualizar")}
                    className="text-[10px] text-blue-400 hover:text-blue-300 flex items-center gap-1 cursor-pointer"
                  >
                    <Copy className="w-3 h-3" />
                    <span>{copiedScript === "actualizar" ? "Copiado" : "Copiar"}</span>
                  </button>
                </div>
                <p className="text-[11px] text-slate-400">
                  Ejecuta <code className="text-amber-300">git pull</code> y compila la última versión sin tocar los datos.
                </p>
              </div>

              <div className="bg-[#0b0d13] border border-slate-700/80 rounded-xl p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white font-mono">Iniciar_POS.bat</span>
                  <button
                    type="button"
                    onClick={() => copyBatScript("iniciar")}
                    className="text-[10px] text-blue-400 hover:text-blue-300 flex items-center gap-1 cursor-pointer"
                  >
                    <Copy className="w-3 h-3" />
                    <span>{copiedScript === "iniciar" ? "Copiado" : "Copiar"}</span>
                  </button>
                </div>
                <p className="text-[11px] text-slate-400">
                  Inicia el servidor Node.js y abre automáticamente <code className="text-emerald-300">http://localhost:3000</code>.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-[#0c0e14] px-6 py-3.5 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] text-slate-400 font-mono shrink-0">
          <span>Actualización transparente: Los datos de clientes, ventas e inventario no se modifican.</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs cursor-pointer transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
