import React, { useState, useEffect, useMemo } from "react";
import {
  Terminal,
  Bug,
  AlertCircle,
  AlertTriangle,
  Info,
  CheckCircle2,
  Download,
  Copy,
  Trash2,
  Search,
  ChevronDown,
  ChevronRight,
  X,
  Sparkles,
  ShieldCheck,
} from "lucide-react";
import { SystemLogEntry, LogLevel } from "../types";
import { logger } from "../services/logger";

interface SystemLogsModalProps {
  isOpen: boolean;
  onClose: () => void;
  showToast?: (msg: string) => void;
}

export const SystemLogsModal: React.FC<SystemLogsModalProps> = ({
  isOpen,
  onClose,
  showToast,
}) => {
  const [logs, setLogs] = useState<SystemLogEntry[]>([]);
  const [search, setSearch] = useState("");
  const [levelFilter, setLevelFilter] = useState<"ALL" | "ERROR" | "WARN" | "INFO">("ALL");
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);
  const [isCopied, setIsCopied] = useState(false);

  // Subscribe to logger events
  useEffect(() => {
    if (isOpen) {
      setLogs(logger.getLogs());
      const unsubscribe = logger.subscribe((updated) => {
        setLogs(updated);
      });
      return () => unsubscribe();
    }
  }, [isOpen]);

  // Statistics
  const stats = useMemo(() => {
    let errors = 0;
    let warns = 0;
    let infos = 0;
    logs.forEach((l) => {
      if (l.level === "ERROR" || l.level === "CRITICAL") errors++;
      else if (l.level === "WARN") warns++;
      else infos++;
    });
    return { total: logs.length, errors, warns, infos };
  }, [logs]);

  // Filtered logs
  const filteredLogs = useMemo(() => {
    const q = search.trim().toLowerCase();
    return logs.filter((log) => {
      // Filter by level
      if (levelFilter === "ERROR" && log.level !== "ERROR" && log.level !== "CRITICAL") return false;
      if (levelFilter === "WARN" && log.level !== "WARN") return false;
      if (levelFilter === "INFO" && log.level !== "INFO") return false;

      // Filter by query
      if (q) {
        const inMessage = log.mensaje?.toLowerCase().includes(q);
        const inModule = log.modulo?.toLowerCase().includes(q);
        const inDetails = log.detalles?.toLowerCase().includes(q);
        const inUser = log.usuario?.toLowerCase().includes(q);
        if (!inMessage && !inModule && !inDetails && !inUser) return false;
      }

      return true;
    });
  }, [logs, search, levelFilter]);

  if (!isOpen) return null;

  const handleCopyReport = () => {
    const report = logger.exportAsText();
    if (navigator?.clipboard) {
      navigator.clipboard.writeText(report);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2500);
      if (showToast) {
        showToast("📋 Reporte de diagnóstico copiado al portapapeles para soporte.");
      }
    }
  };

  const handleDownloadLogs = (format: "txt" | "json") => {
    const content = format === "json" ? logger.exportAsJson() : logger.exportAsText();
    const mime = format === "json" ? "application/json" : "text/plain";
    const ext = format === "json" ? "json" : "txt";
    const filename = `pos_logs_diagnostico_${new Date().toISOString().slice(0, 10)}.${ext}`;

    const blob = new Blob([content], { type: `${mime};charset=utf-8` });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    if (showToast) {
      showToast(`📥 Archivo de logs (${format.toUpperCase()}) descargado.`);
    }
  };

  const handleClearLogs = () => {
    if (window.confirm("¿Seguro que deseas vaciar el historial de eventos y logs?")) {
      logger.clearLogs();
      setLogs([]);
      if (showToast) {
        showToast("🗑️ Registro de logs vaciado.");
      }
    }
  };

  const handleSimulateTestError = () => {
    logger.warn("Simulador Diagnóstico", "Prueba manual de advertencia generada por el usuario", {
      accion: "Prueba de captura de advertencia",
      hora: new Date().toLocaleTimeString(),
    });
    logger.error("Simulador Diagnóstico", "Error simulado de verificación de auditoría", {
      motivo: "Validación de pipeline de registro de bugs",
      componente: "SystemLogsModal",
      ambiente: "Navegador Web",
    });
    if (showToast) {
      showToast("🧪 Se han generado 2 eventos de prueba (WARN y ERROR).");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-[#12151e] border-2 border-slate-700/80 rounded-3xl w-full max-w-4xl shadow-2xl shadow-black/90 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-[#161a25] to-[#12151e] p-5 sm:p-6 border-b border-slate-800 flex items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border-2 border-amber-500/30 flex items-center justify-center text-amber-400 shadow-lg shadow-amber-950/40 shrink-0">
              <Bug className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg sm:text-xl font-black text-white tracking-tight">
                  Registro de Eventos &amp; Diagnóstico de Bugs
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-blue-500/10 text-blue-400 border border-blue-500/30">
                  Logs del Sistema
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Captura en tiempo real de excepciones, advertencias operativas y fallos no controlados para soporte técnico.
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

        {/* Barra de Estadísticas & Acciones Rápidas */}
        <div className="bg-[#0f1118] px-5 py-3 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 shrink-0">
          {/* Métricas */}
          <div className="flex items-center gap-2 flex-wrap text-xs font-mono">
            <div className="px-2.5 py-1 rounded-lg bg-slate-800/80 border border-slate-700 text-slate-300 flex items-center gap-1.5">
              <Terminal className="w-3.5 h-3.5 text-slate-400" />
              <span>Total: <strong>{stats.total}</strong></span>
            </div>

            <div className={`px-2.5 py-1 rounded-lg border flex items-center gap-1.5 ${
              stats.errors > 0
                ? "bg-rose-950/50 border-rose-500/50 text-rose-300"
                : "bg-slate-800/50 border-slate-700/50 text-slate-400"
            }`}>
              <AlertCircle className="w-3.5 h-3.5 text-rose-400" />
              <span>Errores: <strong>{stats.errors}</strong></span>
            </div>

            <div className={`px-2.5 py-1 rounded-lg border flex items-center gap-1.5 ${
              stats.warns > 0
                ? "bg-amber-950/50 border-amber-500/50 text-amber-300"
                : "bg-slate-800/50 border-slate-700/50 text-slate-400"
            }`}>
              <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
              <span>Alertas: <strong>{stats.warns}</strong></span>
            </div>

            <div className="px-2.5 py-1 rounded-lg bg-blue-950/40 border border-blue-500/40 text-blue-300 flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5 text-blue-400" />
              <span>Info: <strong>{stats.infos}</strong></span>
            </div>
          </div>

          {/* Botones de Acción */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={handleCopyReport}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 border border-slate-700 transition-colors cursor-pointer"
              title="Copiar reporte formateado para WhatsApp o soporte técnico"
            >
              <Copy className="w-3.5 h-3.5 text-slate-400" />
              <span>{isCopied ? "¡Copiado!" : "Copiar Reporte"}</span>
            </button>

            <button
              type="button"
              onClick={() => handleDownloadLogs("txt")}
              className="px-3 py-1.5 rounded-xl bg-emerald-950/50 hover:bg-emerald-900/60 text-emerald-300 text-xs font-semibold flex items-center gap-1.5 border border-emerald-500/40 transition-colors cursor-pointer"
              title="Descargar registro en archivo .txt"
            >
              <Download className="w-3.5 h-3.5 text-emerald-400" />
              <span>Descargar .txt</span>
            </button>

            <button
              type="button"
              onClick={handleSimulateTestError}
              className="px-2.5 py-1.5 rounded-xl bg-indigo-950/40 hover:bg-indigo-900/50 text-indigo-300 text-xs font-semibold flex items-center gap-1.5 border border-indigo-500/40 transition-colors cursor-pointer"
              title="Generar un evento de prueba para verificar captura"
            >
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
              <span className="hidden sm:inline">Probar Captura</span>
            </button>

            {logs.length > 0 && (
              <button
                type="button"
                onClick={handleClearLogs}
                className="px-2.5 py-1.5 rounded-xl bg-rose-950/40 hover:bg-rose-900/50 text-rose-300 text-xs font-semibold flex items-center gap-1.5 border border-rose-500/30 transition-colors cursor-pointer"
                title="Limpiar todos los logs registrados"
              >
                <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                <span className="hidden sm:inline">Limpiar</span>
              </button>
            )}
          </div>
        </div>

        {/* Filtros y Búsqueda */}
        <div className="p-4 bg-[#141722] border-b border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por mensaje, módulo o archivo..."
              className="w-full bg-[#0b0d13] border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
              >
                ✕
              </button>
            )}
          </div>

          <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
            <button
              type="button"
              onClick={() => setLevelFilter("ALL")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                levelFilter === "ALL"
                  ? "bg-slate-700 text-white shadow"
                  : "bg-slate-800/60 text-slate-400 hover:text-white"
              }`}
            >
              Todos ({stats.total})
            </button>

            <button
              type="button"
              onClick={() => setLevelFilter("ERROR")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                levelFilter === "ERROR"
                  ? "bg-rose-600 text-white shadow-md shadow-rose-950/50"
                  : "bg-rose-950/40 text-rose-300 hover:bg-rose-900/50"
              }`}
            >
              <AlertCircle className="w-3.5 h-3.5" />
              <span>Errores ({stats.errors})</span>
            </button>

            <button
              type="button"
              onClick={() => setLevelFilter("WARN")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                levelFilter === "WARN"
                  ? "bg-amber-600 text-white shadow-md shadow-amber-950/50"
                  : "bg-amber-950/40 text-amber-300 hover:bg-amber-900/50"
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Alertas ({stats.warns})</span>
            </button>

            <button
              type="button"
              onClick={() => setLevelFilter("INFO")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                levelFilter === "INFO"
                  ? "bg-blue-600 text-white shadow-md shadow-blue-950/50"
                  : "bg-blue-950/40 text-blue-300 hover:bg-blue-900/50"
              }`}
            >
              <Info className="w-3.5 h-3.5" />
              <span>Info ({stats.infos})</span>
            </button>
          </div>
        </div>

        {/* Lista de Registros de Logs */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-2.5 flex-1 min-h-0 bg-[#0c0e15]">
          {filteredLogs.length === 0 ? (
            <div className="py-16 text-center space-y-3">
              <div className="w-14 h-14 rounded-2xl bg-slate-800/40 border border-slate-700/60 mx-auto flex items-center justify-center text-slate-500">
                <ShieldCheck className="w-7 h-7 text-emerald-400" />
              </div>
              <h3 className="text-sm font-bold text-slate-300">
                {logs.length === 0
                  ? "No hay incidentes ni errores registrados"
                  : "No se encontraron logs con el filtro actual"}
              </h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                {logs.length === 0
                  ? "El sistema está funcionando con normalidad. Cualquier anomalía o excepción no controlada aparecerá registrada aquí automáticamente."
                  : "Prueba ajustando los términos de búsqueda o selecciona 'Todos' para ver el historial completo."}
              </p>
            </div>
          ) : (
            filteredLogs.map((log) => {
              const isExpanded = expandedLogId === log.id;
              const isError = log.level === "ERROR" || log.level === "CRITICAL";
              const isWarn = log.level === "WARN";

              return (
                <div
                  key={log.id}
                  className={`rounded-2xl border transition-all text-xs overflow-hidden ${
                    isError
                      ? "bg-rose-950/20 border-rose-500/40 hover:border-rose-400/60"
                      : isWarn
                      ? "bg-amber-950/20 border-amber-500/40 hover:border-amber-400/60"
                      : "bg-[#141722] border-slate-800 hover:border-slate-700"
                  }`}
                >
                  {/* Fila Principal */}
                  <div
                    onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                    className="p-3.5 flex items-start gap-3 cursor-pointer select-none"
                  >
                    {/* Badge de Nivel */}
                    <div className="pt-0.5 shrink-0">
                      {isError ? (
                        <div className="px-2 py-0.5 rounded-md bg-rose-500/20 text-rose-300 border border-rose-500/50 font-mono font-bold text-[10px] flex items-center gap-1">
                          <AlertCircle className="w-3 h-3 text-rose-400" />
                          <span>{log.level}</span>
                        </div>
                      ) : isWarn ? (
                        <div className="px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/50 font-mono font-bold text-[10px] flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3 text-amber-400" />
                          <span>ALERTA</span>
                        </div>
                      ) : (
                        <div className="px-2 py-0.5 rounded-md bg-blue-500/20 text-blue-300 border border-blue-500/50 font-mono font-bold text-[10px] flex items-center gap-1">
                          <Info className="w-3 h-3 text-blue-400" />
                          <span>INFO</span>
                        </div>
                      )}
                    </div>

                    {/* Mensaje & Metadatos */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="font-mono text-[10px] text-slate-400 font-semibold">
                          {new Date(log.timestamp).toLocaleTimeString("es-VE", {
                            hour: "2-digit",
                            minute: "2-digit",
                            second: "2-digit",
                          })}
                        </span>

                        <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 text-[10px] font-mono font-bold border border-slate-700">
                          {log.modulo}
                        </span>

                        {log.usuario && (
                          <span className="text-[10px] font-mono text-slate-400">
                            @{log.usuario}
                          </span>
                        )}

                        {log.ruta && (
                          <span className="text-[10px] font-mono text-slate-500">
                            [{log.ruta}]
                          </span>
                        )}
                      </div>

                      <div className="font-semibold text-slate-200 leading-snug break-words">
                        {log.mensaje}
                      </div>
                    </div>

                    {/* Botón Expansión */}
                    {log.detalles && (
                      <button
                        type="button"
                        className="text-slate-400 hover:text-white p-1 shrink-0"
                        title={isExpanded ? "Ocultar detalles" : "Ver detalles técnicos"}
                      >
                        {isExpanded ? (
                          <ChevronDown className="w-4 h-4" />
                        ) : (
                          <ChevronRight className="w-4 h-4" />
                        )}
                      </button>
                    )}
                  </div>

                  {/* Panel Desplegable de Detalles Técnicos */}
                  {isExpanded && log.detalles && (
                    <div className="px-4 pb-4 pt-1 bg-[#090b10] border-t border-slate-800/80 animate-in fade-in duration-150 space-y-2">
                      <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 pt-1">
                        <span>Detalles Técnicos &amp; Stack Trace:</span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (navigator?.clipboard) {
                              navigator.clipboard.writeText(log.detalles || "");
                              if (showToast) showToast("Detalle copiado.");
                            }
                          }}
                          className="text-blue-400 hover:text-blue-300 flex items-center gap-1 cursor-pointer"
                        >
                          <Copy className="w-3 h-3" />
                          <span>Copiar</span>
                        </button>
                      </div>

                      <pre className="p-3 rounded-xl bg-[#05070a] border border-slate-800 text-[11px] font-mono text-slate-300 overflow-x-auto whitespace-pre-wrap leading-relaxed max-h-60 overflow-y-auto selection:bg-blue-600">
                        {log.detalles}
                      </pre>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="bg-[#0c0e14] px-6 py-3 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] text-slate-400 font-mono shrink-0">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Monitor activo de excepciones y anomalías (localStorage / memoria)</span>
          </div>
          <div>
            Retención automática: últimos 250 eventos
          </div>
        </div>
      </div>
    </div>
  );
};
