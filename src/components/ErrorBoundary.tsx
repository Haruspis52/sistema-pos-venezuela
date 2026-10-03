import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertOctagon, RefreshCw, Copy, RotateCcw } from "lucide-react";
import { logger } from "../services/logger";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  copied: boolean;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      copied: false,
    };
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null, copied: false };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ errorInfo });
    logger.critical("React ErrorBoundary", error.message || "Error fatal en vista de React", {
      name: error.name,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
    });
  }

  private handleCopyDetails = () => {
    const { error, errorInfo } = this.state;
    const text = [
      `=== REPORTE DE CRASH (ERROR FATAL) ===`,
      `Fecha: ${new Date().toLocaleString("es-VE")}`,
      `Error: ${error?.name}: ${error?.message}`,
      `Stack Trace:`,
      error?.stack || "N/A",
      `Component Stack:`,
      errorInfo?.componentStack || "N/A",
    ].join("\n");

    if (navigator?.clipboard) {
      navigator.clipboard.writeText(text);
      this.setState({ copied: true });
      setTimeout(() => this.setState({ copied: false }), 2500);
    }
  };

  private handleResetEmergency = () => {
    if (window.confirm("¿Deseas restablecer el estado temporal para recuperar la pantalla? No se perderán tus productos.")) {
      try {
        localStorage.removeItem("pos_active_ctk_tab");
      } catch {}
      window.location.reload();
    }
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen bg-[#0d0f17] text-slate-100 flex items-center justify-center p-4">
          <div className="bg-[#141824] border-2 border-rose-500/50 rounded-3xl p-6 sm:p-8 max-w-xl w-full shadow-2xl shadow-rose-950/50 space-y-6 animate-in fade-in duration-200">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-rose-600/20 border-2 border-rose-500/50 flex items-center justify-center text-rose-400 shrink-0 shadow-lg shadow-rose-950/60">
                <AlertOctagon className="w-8 h-8" />
              </div>
              <div>
                <h1 className="text-xl font-black text-white tracking-tight">
                  Se ha detectado una anomalía inesperada
                </h1>
                <p className="text-xs text-rose-300 font-mono mt-0.5">
                  El incidente ha sido guardado automáticamente en el registro de logs del sistema.
                </p>
              </div>
            </div>

            <div className="bg-[#090b10] border border-rose-500/30 rounded-2xl p-4 font-mono text-xs text-rose-200 overflow-x-auto space-y-2 max-h-48 overflow-y-auto">
              <div className="font-bold text-rose-400">
                {this.state.error?.name || "Error"}: {this.state.error?.message || "Error desconocido"}
              </div>
              {this.state.error?.stack && (
                <pre className="text-[10px] text-slate-400 whitespace-pre-wrap leading-relaxed">
                  {this.state.error.stack}
                </pre>
              )}
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-lg shadow-blue-950/50 cursor-pointer transition-all active:scale-[0.98]"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Recargar Aplicación</span>
              </button>

              <button
                type="button"
                onClick={this.handleCopyDetails}
                className="py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center justify-center gap-2 border border-slate-700 cursor-pointer transition-all active:scale-[0.98]"
              >
                <Copy className="w-4 h-4 text-slate-400" />
                <span>{this.state.copied ? "¡Copiado!" : "Copiar Reporte"}</span>
              </button>

              <button
                type="button"
                onClick={this.handleResetEmergency}
                className="py-3 px-4 rounded-xl bg-rose-950/50 hover:bg-rose-900/60 text-rose-300 text-xs font-semibold flex items-center justify-center gap-2 border border-rose-500/30 cursor-pointer transition-all"
                title="Restablecer pestaña activa y recargar"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Modo Seguro</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
