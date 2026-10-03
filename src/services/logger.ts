import { SystemLogEntry, LogLevel } from "../types";

const STORAGE_KEY_LOGS = "pos_system_event_logs";
const MAX_LOGS = 250;

class SystemLogger {
  private logs: SystemLogEntry[] = [];
  private listeners: Array<(logs: SystemLogEntry[]) => void> = [];
  private currentUser: string = "anonimo";
  private currentRoute: string = "inicio";
  private isCapturing: boolean = false;
  private isInitialized: boolean = false;

  constructor() {
    this.loadFromStorage();
  }

  private loadFromStorage(): void {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_LOGS);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          this.logs = parsed.slice(-MAX_LOGS);
        }
      }
    } catch (e) {
      console.warn("No se pudieron cargar los logs de localStorage", e);
      this.logs = [];
    }
  }

  private saveToStorage(): void {
    try {
      localStorage.setItem(STORAGE_KEY_LOGS, JSON.stringify(this.logs));
    } catch (e) {
      // Si se excede la cuota de localStorage, recortar a la mitad
      if (this.logs.length > 50) {
        this.logs = this.logs.slice(-50);
        try {
          localStorage.setItem(STORAGE_KEY_LOGS, JSON.stringify(this.logs));
        } catch {}
      }
    }
  }

  private notify(): void {
    this.listeners.forEach((fn) => {
      try {
        fn(this.getLogs());
      } catch (e) {
        console.error("Error en listener de logs:", e);
      }
    });
  }

  public initGlobalHandlers(): void {
    if (this.isInitialized || typeof window === "undefined") return;
    this.isInitialized = true;

    // 1. Captura de errores no controlados en window
    window.addEventListener("error", (event: ErrorEvent) => {
      // Ignorar errores benignos de HMR o extensiones
      if (event.message && (
        event.message.includes("ResizeObserver loop") ||
        event.message.includes("Extension context")
      )) {
        return;
      }

      this.addLog(
        "ERROR",
        "Window Global Error",
        event.message || "Error no especificado en navegador",
        {
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno,
          stack: event.error?.stack || null,
        }
      );
    });

    // 2. Captura de promesas no manejadas (unhandledrejection)
    window.addEventListener("unhandledrejection", (event: PromiseRejectionEvent) => {
      const reason = event.reason;
      let msg = "Promesa rechazada no controlada";
      let details: any = null;

      if (reason instanceof Error) {
        msg = reason.message;
        details = { stack: reason.stack, name: reason.name };
      } else if (typeof reason === "string") {
        msg = reason;
      } else if (reason) {
        try {
          details = JSON.stringify(reason);
        } catch {
          details = String(reason);
        }
      }

      this.addLog("ERROR", "Unhandled Promise", msg, details);
    });

    // 3. Interceptar console.error de forma segura
    const originalConsoleError = console.error;
    console.error = (...args: any[]) => {
      originalConsoleError.apply(console, args);
      if (this.isCapturing) return; // Evitar recursión infinita

      try {
        this.isCapturing = true;
        const msg = args
          .map((a) => (typeof a === "object" ? (a?.message || JSON.stringify(a)) : String(a)))
          .join(" ");

        // Evitar loguear advertencias o mensajes internos de React repetitivos
        if (
          !msg.includes("Download the React DevTools") &&
          !msg.includes("WebSocket connection")
        ) {
          this.addLog("ERROR", "Console Error", msg.slice(0, 500));
        }
      } catch {
        // En silencio para no romper la consola
      } finally {
        this.isCapturing = false;
      }
    };

    // Log inicial de sistema arrancado
    this.info("Sistema", "Registrador de eventos y diagnóstico inicializado correctamente");
  }

  public setContext(user?: string, route?: string): void {
    if (user) this.currentUser = user;
    if (route) this.currentRoute = route;
  }

  public addLog(
    level: LogLevel,
    modulo: string,
    mensaje: string,
    detalles?: string | any
  ): SystemLogEntry {
    let formattedDetails: string | undefined = undefined;

    if (detalles) {
      if (typeof detalles === "string") {
        formattedDetails = detalles;
      } else if (detalles instanceof Error) {
        formattedDetails = `${detalles.name}: ${detalles.message}\n${detalles.stack || ""}`;
      } else {
        try {
          formattedDetails = JSON.stringify(detalles, null, 2);
        } catch {
          formattedDetails = String(detalles);
        }
      }
    }

    const entry: SystemLogEntry = {
      id: `log-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      timestamp: new Date().toISOString(),
      level,
      modulo: modulo || "General",
      mensaje: mensaje || "(Sin mensaje)",
      detalles: formattedDetails,
      usuario: this.currentUser,
      ruta: this.currentRoute,
    };

    this.logs.push(entry);

    if (this.logs.length > MAX_LOGS) {
      this.logs = this.logs.slice(-MAX_LOGS);
    }

    this.saveToStorage();
    this.notify();
    return entry;
  }

  public info(modulo: string, mensaje: string, detalles?: any): SystemLogEntry {
    return this.addLog("INFO", modulo, mensaje, detalles);
  }

  public warn(modulo: string, mensaje: string, detalles?: any): SystemLogEntry {
    return this.addLog("WARN", modulo, mensaje, detalles);
  }

  public error(modulo: string, mensaje: string, detalles?: any): SystemLogEntry {
    return this.addLog("ERROR", modulo, mensaje, detalles);
  }

  public critical(modulo: string, mensaje: string, detalles?: any): SystemLogEntry {
    return this.addLog("CRITICAL", modulo, mensaje, detalles);
  }

  public getLogs(): SystemLogEntry[] {
    return [...this.logs].reverse(); // Más recientes primero
  }

  public clearLogs(): void {
    this.logs = [];
    this.saveToStorage();
    this.notify();
  }

  public subscribe(listener: (logs: SystemLogEntry[]) => void): () => void {
    this.listeners.push(listener);
    listener(this.getLogs());
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  public exportAsJson(): string {
    return JSON.stringify(
      {
        exportedAt: new Date().toISOString(),
        userAgent: typeof navigator !== "undefined" ? navigator.userAgent : "N/A",
        screen: typeof window !== "undefined" ? `${window.innerWidth}x${window.innerHeight}` : "N/A",
        totalLogs: this.logs.length,
        logs: this.logs,
      },
      null,
      2
    );
  }

  public exportAsText(): string {
    const lines = [
      `=== REPORTE DE DIAGNÓSTICO Y LOGS DEL SISTEMA POS ===`,
      `Fecha de exportación: ${new Date().toLocaleString("es-VE")}`,
      `Navegador: ${typeof navigator !== "undefined" ? navigator.userAgent : "N/A"}`,
      `Total de eventos registrados: ${this.logs.length}`,
      `-------------------------------------------------------`,
      ``,
    ];

    [...this.logs].reverse().forEach((log, index) => {
      lines.push(
        `[#${this.logs.length - index}] ${new Date(log.timestamp).toLocaleString("es-VE")} | ${log.level} | MÓDULO: ${log.modulo} | USUARIO: @${log.usuario || "N/A"}`
      );
      lines.push(`MENSAJE: ${log.mensaje}`);
      if (log.detalles) {
        lines.push(`DETALLES TÉCNICOS:\n${log.detalles}`);
      }
      lines.push(`-------------------------------------------------------`);
    });

    return lines.join("\n");
  }
}

export const logger = new SystemLogger();
