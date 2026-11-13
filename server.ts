import express from "express";
import path from "path";
import fs from "fs";
import https from "https";
import { exec } from "child_process";
import { fileURLToPath } from "url";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import JSZip from "jszip";
import { GoogleGenAI, Type } from "@google/genai";
import { APP_VERSION, RELEASE_DATE, CURRENT_VERSION_INFO, DEFAULT_GITHUB_REPO } from "./src/version.ts";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 3000;

function fetchBcvOfficialDirect(): Promise<{
  success: boolean;
  source: string;
  usd: number;
  eur: number | null;
  fechaValor: string;
  updatedAt: string;
}> {
  return new Promise((resolve, reject) => {
    const agent = new https.Agent({ rejectUnauthorized: false });
    const req = https.get(
      "https://www.bcv.org.ve",
      {
        agent,
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "Accept-Language": "es-VE,es;q=0.9,en;q=0.8",
          "Cache-Control": "no-cache",
        },
        timeout: 9000,
      },
      (res) => {
        let html = "";
        res.on("data", (chunk) => (html += chunk));
        res.on("end", () => {
          try {
            const dolarMatch = html.match(/id="dolar"[\s\S]*?<strong[^>]*>([\s\S]*?)<\/strong>/i);
            const euroMatch = html.match(/id="euro"[\s\S]*?<strong[^>]*>([\s\S]*?)<\/strong>/i);
            const fechaMatch = html.match(/Fecha Valor:[\s\S]*?<span[^>]*>([\s\S]*?)<\/span>/i);

            if (!dolarMatch) {
              return reject(new Error("No se encontro selector id=dolar en bcv.org.ve"));
            }

            const parseNum = (str: string | null) => {
              if (!str) return null;
              const cleaned = str.replace(/<[^>]*>/g, "").trim().replace(/\./g, "").replace(",", ".");
              const num = parseFloat(cleaned);
              return isNaN(num) ? null : num;
            };

            const usd = parseNum(dolarMatch[1]);
            const eur = euroMatch ? parseNum(euroMatch[1]) : null;
            const fechaValor = fechaMatch ? fechaMatch[1].replace(/<[^>]*>/g, "").trim().replace(/\s+/g, " ") : "";

            if (!usd || usd <= 0) {
              return reject(new Error("Monto USD invalido en bcv.org.ve"));
            }

            resolve({
              success: true,
              source: "BCV Oficial Directo (bcv.org.ve)",
              usd,
              eur,
              fechaValor,
              updatedAt: new Date().toISOString(),
            });
          } catch (e) {
            reject(e);
          }
        });
      }
    );

    req.on("timeout", () => {
      req.destroy();
      reject(new Error("Timeout al conectar con bcv.org.ve"));
    });

    req.on("error", reject);
  });
}

async function startServer() {
  const app = express();

  // Increase payload limit for base64 invoice images
  app.use(express.json({ limit: "25mb" }));
  app.use(express.urlencoded({ extended: true, limit: "25mb" }));

  // API Status & Health
  app.get("/api/health", (_req, res) => {
    res.json({
      status: "ok",
      hasGeminiKey: Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== "MY_GEMINI_API_KEY"),
      timestamp: new Date().toISOString(),
    });
  });

  // System Version & Environment Info
  app.get("/api/system/version", (_req, res) => {
    res.json({
      version: APP_VERSION,
      releaseDate: RELEASE_DATE,
      changelog: CURRENT_VERSION_INFO.changelog,
      defaultRepo: DEFAULT_GITHUB_REPO,
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch,
      uptimeSeconds: Math.floor(process.uptime()),
    });
  });

  // Check for updates on GitHub repository
  app.get("/api/system/check-github-update", async (req, res) => {
    const repo = (req.query.repo as string) || DEFAULT_GITHUB_REPO;

    try {
      // 1. Consultar package.json en raw.githubusercontent.com
      const rawPkgUrl = `https://raw.githubusercontent.com/${repo}/main/package.json`;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);

      const pkgRes = await fetch(rawPkgUrl, {
        headers: {
          "User-Agent": "POS-System-Updater",
          "Cache-Control": "no-cache",
        },
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (!pkgRes.ok) {
        return res.json({
          success: false,
          hasUpdate: false,
          currentVersion: APP_VERSION,
          remoteVersion: null,
          message: `No se pudo consultar el repositorio '${repo}'. Verifica que sea público o que exista. (HTTP ${pkgRes.status})`,
        });
      }

      const pkgData = await pkgRes.json();
      const remoteVersion = pkgData.version || "1.0.0";

      // Comparar versiones semánticas (ej. "2.5.1" > "2.5.0")
      const parseSemver = (v: string) => v.replace(/^v/i, "").split(".").map((n) => parseInt(n, 10) || 0);
      const [cMajor, cMinor, cPatch] = parseSemver(APP_VERSION);
      const [rMajor, rMinor, rPatch] = parseSemver(remoteVersion);

      let hasUpdate = false;
      if (rMajor > cMajor) hasUpdate = true;
      else if (rMajor === cMajor && rMinor > cMinor) hasUpdate = true;
      else if (rMajor === cMajor && rMinor === cMinor && rPatch > cPatch) hasUpdate = true;

      // Consultar últimos cambios en GitHub Releases si están disponibles
      let releaseNotes = "";
      try {
        const relRes = await fetch(`https://api.github.com/repos/${repo}/releases/latest`, {
          headers: { "User-Agent": "POS-System-Updater" },
        });
        if (relRes.ok) {
          const relData = await relRes.json();
          releaseNotes = relData.body || "";
        }
      } catch {}

      return res.json({
        success: true,
        hasUpdate,
        currentVersion: APP_VERSION,
        remoteVersion,
        releaseDate: new Date().toISOString().slice(0, 10),
        releaseNotes: releaseNotes || (hasUpdate ? "Nueva versión con correcciones y mejoras de rendimiento." : "El sistema ya está al día."),
        repo,
      });
    } catch (err: any) {
      console.warn("Fallo al consultar GitHub:", err?.message || err);
      return res.json({
        success: false,
        hasUpdate: false,
        currentVersion: APP_VERSION,
        remoteVersion: null,
        message: `Fallo de conexión con GitHub (${err?.message || "Timeout"}). Verifica tu conexión a internet.`,
      });
    }
  });

  // Apply update on host machine (Dual engine: Git if available, or direct GitHub ZIP extraction if Git is not installed)
  app.post("/api/system/apply-git-update", async (req, res) => {
    let rawRepo = (req.body?.repo as string) || (req.query?.repo as string) || DEFAULT_GITHUB_REPO;
    if (!rawRepo || rawRepo.includes("brayangp2435")) {
      rawRepo = "Haruspis52/sistema-pos-venezuela";
    }
    const cleanRepo = rawRepo.trim().replace(/^https?:\/\/github\.com\//i, "").replace(/\.git$/i, "").replace(/^\/+|\/+$/g, "") || "Haruspis52/sistema-pos-venezuela";

    // 1. Si git está instalado y funcional en el sistema operativo
    const hasGitCommand = await new Promise<boolean>((resolve) => {
      exec("git --version", { timeout: 2000 }, (err) => resolve(!err));
    });

    const hasGitFolder = fs.existsSync(path.join(process.cwd(), ".git"));

    if (hasGitCommand && hasGitFolder) {
      try {
        const gitResult = await new Promise<{ success: boolean; output: string }>((resolve) => {
          exec("git pull origin main && npm install --no-audit --no-fund && npm run build", { timeout: 60000 }, (error, stdout, stderr) => {
            if (error) {
              resolve({ success: false, output: stderr || stdout });
            } else {
              resolve({ success: true, output: stdout });
            }
          });
        });

        if (gitResult.success) {
          return res.json({
            success: true,
            method: "git",
            message: "¡Actualización descargada y compilada con éxito usando Git!",
            output: gitResult.output,
          });
        }
        console.warn("Git pull falló. Pasando a descarga directa ZIP desde GitHub...");
      } catch (err: any) {
        console.warn("Error ejecutando Git:", err?.message);
      }
    }

    // 2. Método Universal: Descarga directa del ZIP desde GitHub (No requiere tener Git instalado)
    try {
      const candidateUrls = [
        `https://codeload.github.com/${cleanRepo}/zip/refs/heads/main`,
        `https://github.com/${cleanRepo}/archive/refs/heads/main.zip`,
        `https://codeload.github.com/${cleanRepo}/zip/refs/heads/master`,
        `https://github.com/${cleanRepo}/archive/refs/heads/master.zip`,
      ];

      let zipRes: Response | null = null;
      let usedUrl = "";

      for (const url of candidateUrls) {
        try {
          console.log(`Intentando descargar paquete de actualización: ${url}`);
          const r = await fetch(url, {
            headers: {
              "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) POS-Updater",
              "Accept": "application/zip, application/octet-stream, */*",
            },
            redirect: "follow",
          });
          if (r.ok) {
            zipRes = r;
            usedUrl = url;
            break;
          }
        } catch (fetchErr: any) {
          console.warn(`Intento con ${url} falló:`, fetchErr?.message);
        }
      }

      if (!zipRes || !zipRes.ok) {
        return res.json({
          success: false,
          message: `No se pudo descargar el paquete ZIP desde GitHub para '${cleanRepo}'.`,
          manualInstruction: `Descarga el ZIP manualmente desde: https://github.com/${cleanRepo}`,
        });
      }

      const arrayBuffer = await zipRes.arrayBuffer();
      const zip = await JSZip.loadAsync(Buffer.from(arrayBuffer));

      // En los ZIPs de GitHub, los archivos vienen dentro de una carpeta raíz (ej: "sistema-pos-venezuela-main/")
      const rootFolder = Object.keys(zip.files).find((f) => f.endsWith("/") && f.split("/").length === 2) || "";
      const basePrefix = rootFolder;

      let extractedCount = 0;
      const cwd = process.cwd();

      for (const [relativePath, zipEntry] of Object.entries(zip.files)) {
        if (zipEntry.dir) continue;

        // Quitar el prefijo de la carpeta raíz de GitHub
        let targetRelative = relativePath;
        if (basePrefix && targetRelative.startsWith(basePrefix)) {
          targetRelative = targetRelative.slice(basePrefix.length);
        }
        if (!targetRelative) continue;

        // Omitir archivos sensibles o de datos del cliente o el propio script de server
        if (
          targetRelative.startsWith(".git") ||
          targetRelative.startsWith(".env") ||
          targetRelative.startsWith("node_modules") ||
          targetRelative === "server.ts" ||
          targetRelative.endsWith(".sqlite") ||
          targetRelative.endsWith(".db")
        ) {
          continue;
        }

        const targetFullPath = path.join(cwd, targetRelative);
        const targetDir = path.dirname(targetFullPath);

        if (!fs.existsSync(targetDir)) {
          fs.mkdirSync(targetDir, { recursive: true });
        }

        const fileData = await zipEntry.async("nodebuffer");
        fs.writeFileSync(targetFullPath, fileData);
        extractedCount++;
      }

      // Asegurar que cualquier dependencia nueva añadida en package.json (como firebase) se instale
      try {
        await new Promise<void>((resolve) => {
          exec("npm install --no-audit --no-fund", { timeout: 45000 }, () => resolve());
        });
      } catch (npmErr) {
        console.warn("npm install tras actualización ZIP:", npmErr);
      }

      return res.json({
        success: true,
        method: "direct_zip",
        message: `¡Actualización aplicada con éxito desde GitHub! (${extractedCount} archivos actualizados sin requerir Git).`,
        output: `Se actualizaron ${extractedCount} archivos del sistema directamente desde ${cleanRepo}/main (vía ${usedUrl || "GitHub ZIP"}).`,
      });
    } catch (zipError: any) {
      console.error("Error al procesar actualización directa ZIP:", zipError);
      return res.json({
        success: false,
        message: "Fallo al procesar la actualización directa ZIP.",
        error: zipError?.message,
        manualInstruction: "Puedes descargar los archivos directamente desde GitHub y reemplazarlos en la carpeta.",
      });
    }
  });

  // Real-time BCV exchange rates endpoint
  app.get("/api/bcv", async (_req, res) => {
    // 1. Prioridad: Consulta directa a la web oficial del Banco Central de Venezuela
    try {
      const bcvData = await fetchBcvOfficialDirect();
      return res.json(bcvData);
    } catch (directErr) {
      console.warn("Fallo consulta directa bcv.org.ve, intentando DolarApi...", directErr);
    }

    // 2. Respaldo: DolarApi
    try {
      const [usdRes, eurRes] = await Promise.all([
        fetch("https://ve.dolarapi.com/v1/dolares/oficial", { cache: "no-store" }),
        fetch("https://ve.dolarapi.com/v1/euros/oficial", { cache: "no-store" }),
      ]);

      if (usdRes.ok) {
        const usdData = (await usdRes.json()) as any;
        const eurData = eurRes.ok ? ((await eurRes.json()) as any) : null;

        return res.json({
          success: true,
          source: "BCV Oficial (ve.dolarapi.com)",
          usd: usdData.promedio,
          eur: eurData?.promedio || null,
          fechaValor: usdData.fechaActualizacion || "",
          updatedAt: usdData.fechaActualizacion || new Date().toISOString(),
        });
      }
    } catch (dolarApiErr) {
      console.warn("Fallo respaldo DolarApi, intentando Open Exchange...", dolarApiErr);
    }

    // 3. Respaldo secundario: Open Exchange Rates
    try {
      const fallbackRes = await fetch("https://open.er-api.com/v6/latest/USD");
      const fallbackData = (await fallbackRes.json()) as any;
      return res.json({
        success: true,
        source: "Open Exchange Rates (BCV)",
        usd: fallbackData.rates?.VES,
        eur: null,
        fechaValor: "",
        updatedAt: fallbackData.time_last_update_utc || new Date().toISOString(),
      });
    } catch (fallbackErr) {
      return res.status(502).json({
        error: "No se pudo obtener la cotizacion del BCV en ninguna fuente.",
      });
    }
  });

  // SmartPOS ECR Ping / Diagnóstico de Enlace LAN (TCP Socket + Latencia)
  app.post("/api/wizarpos/ping", async (req, res) => {
    const { ip, port = 8080, modelo = "PAX_A920", switchRed = "MEGASOFT" } = req.body;
    const cleanIp = String(ip || "").trim();
    const cleanPort = Number(port) || 8080;

    if (!cleanIp) {
      return res.status(400).json({ reachable: false, error: "Dirección IP requerida" });
    }

    const startTime = Date.now();

    try {
      const net = await import("net");
      const socket = new net.Socket();
      let finished = false;

      const finish = (reachable: boolean, detail?: string) => {
        if (finished) return;
        finished = true;
        socket.destroy();
        const latencyMs = Date.now() - startTime;
        return res.json({
          reachable,
          ip: cleanIp,
          port: cleanPort,
          modelo,
          switchRed,
          latencyMs: reachable ? latencyMs : null,
          detail: detail || (reachable ? `Puerto TCP ${cleanPort} abierto y aceptando tramas ECR` : `Sin respuesta TCP en ${cleanIp}:${cleanPort}`),
          timestamp: new Date().toISOString(),
        });
      };

      const timer = setTimeout(() => {
        finish(false, `Tiempo de espera agotado (1.8s) intentando contactar ${cleanIp}:${cleanPort}`);
      }, 1800);

      socket.connect(cleanPort, cleanIp, () => {
        clearTimeout(timer);
        finish(true);
      });

      socket.on("error", (err: any) => {
        clearTimeout(timer);
        finish(false, err?.code ? `Error de red (${err.code})` : "Conexión rechazada o host inalcanzable");
      });
    } catch (err: any) {
      return res.json({
        reachable: false,
        ip: cleanIp,
        port: cleanPort,
        modelo,
        switchRed,
        detail: err?.message || "Error al inicializar socket TCP",
        timestamp: new Date().toISOString(),
      });
    }
  });

  // SmartPOS ECR Send Payment (Transmisión Híbrida HTTP REST / Raw TCP Socket ECR)
  app.post("/api/wizarpos/payment", async (req, res) => {
    const {
      ip,
      port = 8080,
      amountVes,
      invoiceNumber,
      clienteRif = "V000000000",
      clienteNombre = "CONSUMIDOR FINAL",
      protocol = "MEGASOFT",
      modelo = "PAX_A920",
      switchRed = "MEGASOFT",
    } = req.body;

    const cleanIp = String(ip || "").trim();
    const cleanPort = Number(port) || 8080;
    const numericAmount = Number(amountVes) || 0;
    const amountCents = Math.round(numericAmount * 100);

    // Construir trama estándar ECR venezolana (Mega Soft / Credicard / Bancamiga / JSON ECR)
    const ecrPayload = {
      command: "SALE",
      transType: "01", // Compra / Venta
      protocol: switchRed || protocol,
      terminalModel: modelo,
      amount: Number(numericAmount.toFixed(2)),
      amountCents,
      amountFormatted: String(amountCents).padStart(12, "0"),
      currency: "VES",
      currencyCode: "928",
      invoiceNumber: String(invoiceNumber || "000001"),
      customerId: String(clienteRif || "V000000000").replace(/[^a-zA-Z0-9]/g, ""),
      customerName: String(clienteNombre || "CONSUMIDOR FINAL").slice(0, 40),
      timestamp: new Date().toISOString(),
    };

    console.log(
      `[SmartPOS ECR] Orden de cobro: Bs. ${numericAmount.toFixed(2)} (${amountCents} céntimos) -> ${cleanIp}:${cleanPort} [${modelo} / ${switchRed || protocol}] Factura: ${invoiceNumber}`
    );

    if (protocol === "SIMULADO" || switchRed === "SIMULADO" || !cleanIp) {
      return res.json({
        success: true,
        reachable: false,
        connectionMode: "SIMULADO",
        status: "waiting_card",
        terminal: modelo,
        amountVes: numericAmount,
        invoiceNumber,
        ip: cleanIp,
        port: cleanPort,
        protocol: switchRed || protocol,
        ecrPayload,
        timestamp: new Date().toISOString(),
      });
    }

    // 1. Verificar alcance TCP rápido a la IP del datáfono y transmitir trama ECR
    try {
      const net = await import("net");
      const tcpResult = await new Promise<{
        reachable: boolean;
        rawResponse?: string;
        errorCode?: string;
      }>((resolve) => {
        const socket = new net.Socket();
        let resolved = false;
        let responseBuffer = "";

        const done = (result: { reachable: boolean; rawResponse?: string; errorCode?: string }) => {
          if (resolved) return;
          resolved = true;
          socket.destroy();
          resolve(result);
        };

        const connectTimer = setTimeout(() => {
          done({ reachable: false, errorCode: "TIMEOUT" });
        }, 1600);

        socket.connect(cleanPort, cleanIp, () => {
          clearTimeout(connectTimer);
          // Enviar trama JSON ECR por el socket TCP abierto
          const serialized = JSON.stringify(ecrPayload) + "\n";
          socket.write(serialized, "utf-8");

          // Esperar brevemente por un ACK o respuesta inmediata del terminal (hasta 900ms)
          const readTimer = setTimeout(() => {
            done({ reachable: true, rawResponse: responseBuffer || undefined });
          }, 900);

          socket.on("data", (chunk) => {
            responseBuffer += chunk.toString("utf-8");
            if (responseBuffer.includes("\n") || responseBuffer.includes("}")) {
              clearTimeout(readTimer);
              done({ reachable: true, rawResponse: responseBuffer.trim() });
            }
          });
        });

        socket.on("error", (err: any) => {
          clearTimeout(connectTimer);
          done({ reachable: false, errorCode: err?.code || "UNREACHABLE" });
        });
      });

      // Si el terminal respondió un JSON de aprobación inmediata por el socket/HTTP
      let parsedTerminalResult: any = null;
      if (tcpResult.rawResponse) {
        try {
          const jsonStart = tcpResult.rawResponse.indexOf("{");
          const jsonEnd = tcpResult.rawResponse.lastIndexOf("}");
          if (jsonStart >= 0 && jsonEnd > jsonStart) {
            const parsed = JSON.parse(tcpResult.rawResponse.slice(jsonStart, jsonEnd + 1));
            if (parsed && (parsed.aprobado || parsed.approved || parsed.respCode === "00" || parsed.status === "APPROVED")) {
              parsedTerminalResult = {
                aprobado: true,
                codigo_aprobacion: parsed.codigo_aprobacion || parsed.authCode || parsed.autorizacion || "AP-0001",
                referencia: parsed.referencia || parsed.reference || parsed.numRef || String(Math.floor(100000 + Math.random() * 900000)),
                lote: parsed.lote || parsed.batch || "001",
                terminal: parsed.terminal || `${modelo}-${cleanIp.split(".").slice(-1)[0]}`,
                tarjeta_ultimos4: parsed.tarjeta_ultimos4 || parsed.last4 || parsed.pan?.slice(-4) || "0000",
                tipo_tarjeta: parsed.tipo_tarjeta || parsed.cardType || "Tarjeta Bancaria EMV",
                banco_emisor: parsed.banco_emisor || parsed.bankName || switchRed,
                monto_ves: numericAmount,
                fecha_hora: new Date().toLocaleTimeString("es-VE"),
                mensaje: parsed.mensaje || parsed.message || "TRANSACCIÓN APROBADA EN TERMINAL",
              };
            }
          }
        } catch {
          // Respuesta binaria o ACK simple del socket
        }
      }

      return res.json({
        success: true,
        reachable: tcpResult.reachable,
        connectionMode: tcpResult.reachable ? "LAN_TCP_ACTIVE" : "FALLBACK_SIMULATION",
        status: parsedTerminalResult ? "approved" : "waiting_card",
        transactionResult: parsedTerminalResult,
        terminal: modelo,
        amountVes: numericAmount,
        invoiceNumber,
        ip: cleanIp,
        port: cleanPort,
        protocol: switchRed || protocol,
        ecrPayload,
        errorCode: tcpResult.errorCode,
        timestamp: new Date().toISOString(),
      });
    } catch (err: any) {
      return res.json({
        success: true,
        reachable: false,
        connectionMode: "FALLBACK_SIMULATION",
        status: "waiting_card",
        terminal: modelo,
        amountVes: numericAmount,
        invoiceNumber,
        ip: cleanIp,
        port: cleanPort,
        protocol: switchRed || protocol,
        ecrPayload,
        error: err?.message,
        timestamp: new Date().toISOString(),
      });
    }
  });

  // Gemini API Key Check & Status Endpoint
  app.post("/api/gemini/verify-key", async (req, res) => {
    const customKey = (req.body?.apiKey || "").trim();
    const resolvedKey = customKey || process.env.GEMINI_API_KEY || "";

    if (!resolvedKey || resolvedKey === "MY_GEMINI_API_KEY") {
      return res.json({
        configured: false,
        valid: false,
        source: "none",
        message: "No hay ninguna API Key de Gemini configurada.",
      });
    }

    try {
      const ai = new GoogleGenAI({
        apiKey: resolvedKey,
        httpOptions: {
          headers: {
            "User-Agent": "aistudio-build",
          },
        },
      });

      // Try active models with fallback
      const modelsToTest = ["gemini-3.8-flash", "gemini-flash-latest"];
      let testRes: any = null;
      let lastTestErr: any = null;

      for (const m of modelsToTest) {
        try {
          testRes = await ai.models.generateContent({
            model: m,
            contents: "Responde únicamente 'OK'",
          });
          if (testRes && testRes.text) break;
        } catch (err: any) {
          lastTestErr = err;
          await new Promise((r) => setTimeout(r, 400));
        }
      }

      if (testRes && testRes.text) {
        return res.json({
          configured: true,
          valid: true,
          source: customKey ? "custom" : "env",
          maskedKey: `${resolvedKey.slice(0, 6)}...${resolvedKey.slice(-4)}`,
          message: "API Key de Gemini válida y conectada correctamente.",
        });
      }

      throw lastTestErr || new Error("La clave no devolvió una respuesta válida.");
    } catch (err: any) {
      console.warn("Fallo al verificar clave de Gemini:", err?.message || err);
      let userFriendlyError = err?.message || "La API Key ingresada no es válida o fue rechazada por Google Gemini.";
      try {
        const parsed = JSON.parse(err?.message);
        if (parsed?.error?.message) {
          userFriendlyError = parsed.error.message;
        }
      } catch {
        // Keep userFriendlyError
      }
      return res.json({
        configured: true,
        valid: false,
        source: customKey ? "custom" : "env",
        error: userFriendlyError,
      });
    }
  });

  // Google Sheets License Sync endpoint
  app.get("/api/license/sync", async (req, res) => {
    const clienteId = ((req.query.clienteId as string) || "").trim();
    const sheetId = "1mR0Me2ulMjOwmI3meUPtrhFYPUvvlYADTQBDauG2sFE";
    const csvUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv`;

    try {
      const response = await fetch(csvUrl, {
        cache: "no-store",
        headers: { "User-Agent": "POS-Venezuela-Licensing/1.0" },
      });

      if (!response.ok) {
        return res.status(502).json({
          success: false,
          error: "No se pudo acceder a Google Sheets. Verifique permisos de la hoja.",
        });
      }

      const csvText = await response.text();
      const lines = csvText.split(/\r?\n/).filter((line) => line.trim().length > 0);

      if (lines.length < 2) {
        return res.json({
          success: true,
          found: false,
          message: "La hoja de cálculo está vacía o solo contiene encabezados.",
        });
      }

      const headers = lines[0].split(",").map((h) => h.trim().replace(/^"|"$/g, "").toLowerCase());
      const idIdx = headers.findIndex((h) => h.includes("cliente_id") || h.includes("id") || h.includes("codigo"));
      const estadoIdx = headers.findIndex((h) => h.includes("estado") || h.includes("status"));
      const fechaIdx = headers.findIndex((h) => h.includes("fecha") || h.includes("vencimiento"));
      const negocioIdx = headers.findIndex((h) => h.includes("negocio") || h.includes("nombre") || h.includes("cliente"));
      const cuotaIdx = headers.findIndex((h) => h.includes("cuota") || h.includes("monto") || h.includes("usd"));
      const edicionIdx = headers.findIndex((h) => h.includes("edicion") || h.includes("modo") || h.includes("tipo") || h.includes("plan"));
      const motivoIdx = headers.findIndex((h) => h.includes("motivo"));

      for (let i = 1; i < lines.length; i++) {
        const row = lines[i].split(",").map((c) => c.trim().replace(/^"|"$/g, ""));
        const rowId = (row[idIdx >= 0 ? idIdx : 0] || "").trim();

        if (clienteId && rowId.toLowerCase() === clienteId.toLowerCase()) {
          const estado = (row[estadoIdx >= 0 ? estadoIdx : 5] || "ACTIVO").trim().toUpperCase();
          const fechaVencimiento = (row[fechaIdx >= 0 ? fechaIdx : 4] || "").trim();
          const nombreNegocio = (row[negocioIdx >= 0 ? negocioIdx : 1] || "").trim();
          const cuotaUsd = parseFloat(row[cuotaIdx >= 0 ? cuotaIdx : 3]) || 15.0;
          const rawEdicion = edicionIdx >= 0 ? (row[edicionIdx] || "").trim().toLowerCase() : "";
          const edicion = rawEdicion.includes("fiscal") ? "fiscal" : rawEdicion.includes("bodega") ? "bodega" : undefined;
          const motivo = motivoIdx >= 0 ? row[motivoIdx] : "";

          return res.json({
            success: true,
            found: true,
            clienteId: rowId,
            estado,
            fechaVencimiento,
            nombreNegocio,
            cuotaUsd,
            edicion,
            motivo,
            syncedAt: new Date().toISOString(),
          });
        }
      }

      return res.json({
        success: true,
        found: false,
        message: `ID de cliente '${clienteId}' no fue encontrado en la hoja de Google Sheets.`,
      });
    } catch (err: any) {
      console.warn("Fallo al sincronizar licencia con Google Sheets:", err);
      return res.status(500).json({
        success: false,
        error: err?.message || "Error al conectar con Google Sheets",
      });
    }
  });

  // Local Folder Backup Endpoints
  const backupsDir = path.join(process.cwd(), "backups");

  // Save backup to local folder
  app.post("/api/backup/save", (req, res) => {
    try {
      const payload = req.body;
      if (!payload || !payload.data) {
        return res.status(400).json({ success: false, error: "Estructura de respaldo inválida." });
      }

      if (!fs.existsSync(backupsDir)) {
        fs.mkdirSync(backupsDir, { recursive: true });
      }

      const dateStr = new Date().toISOString().slice(0, 10);
      const timeStr = new Date().toTimeString().slice(0, 8).replace(/:/g, "-");
      const negocioName = (payload.nombre_negocio || "Negocio").replace(/[^a-zA-Z0-9_-]/g, "_");
      const fileName = `RESPALDO_${negocioName}_${dateStr}_${timeStr}.json`;
      const filePath = path.join(backupsDir, fileName);

      fs.writeFileSync(filePath, JSON.stringify(payload, null, 2), "utf-8");

      return res.json({
        success: true,
        fileName,
        filePath,
        folderPath: backupsDir,
        savedAt: new Date().toISOString(),
        message: `¡Copia de seguridad guardada con éxito en la carpeta local '${backupsDir}'!`,
      });
    } catch (err: any) {
      console.error("Error al guardar respaldo local:", err);
      return res.status(500).json({ success: false, error: err.message || "Error al escribir en disco" });
    }
  });

  // List backups in local folder
  app.get("/api/backup/list", (_req, res) => {
    try {
      if (!fs.existsSync(backupsDir)) {
        fs.mkdirSync(backupsDir, { recursive: true });
        return res.json({ success: true, folderPath: backupsDir, backups: [] });
      }

      const files = fs.readdirSync(backupsDir);
      const jsonFiles = files.filter((f) => f.endsWith(".json"));

      const backups = jsonFiles
        .map((fileName) => {
          const fullPath = path.join(backupsDir, fileName);
          const stat = fs.statSync(fullPath);
          return {
            fileName,
            sizeKb: (stat.size / 1024).toFixed(1),
            createdAt: stat.mtime.toISOString(),
          };
        })
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      return res.json({
        success: true,
        folderPath: backupsDir,
        backups,
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message || "Error al listar carpeta" });
    }
  });

  // Get backup content to restore
  app.get("/api/backup/get/:filename", (req, res) => {
    try {
      const fileName = path.basename(req.params.filename);
      const filePath = path.join(backupsDir, fileName);

      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ success: false, error: "Archivo de respaldo no encontrado." });
      }

      const content = fs.readFileSync(filePath, "utf-8");
      const parsed = JSON.parse(content);
      return res.json({ success: true, backup: parsed });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message || "Error al leer respaldo" });
    }
  });

  // Extract Invoice API using Google GenAI SDK (gemini-3.8-flash)
  app.post("/api/gemini/extract-invoice", async (req, res) => {
    try {
      const customKey = (req.body?.customApiKey || "").trim();
      const apiKey = customKey || process.env.GEMINI_API_KEY;
      if (!apiKey || apiKey === "MY_GEMINI_API_KEY") {
        return res.status(503).json({
          error: "API Key de Gemini no configurada",
          offline: true,
          message: "El sistema opera en modo Híbrido Local sin conexión a Gemini. Puede ingresar los productos manualmente o ingresar su API Key desde el botón 'Configurar API Key'.",
        });
      }

      const { imageBase64, mimeType = "image/jpeg" } = req.body;
      if (!imageBase64) {
        return res.status(400).json({ error: "No se proporcionó la imagen de la factura." });
      }

      const isSvg =
        (typeof mimeType === "string" && mimeType.includes("svg")) ||
        imageBase64.includes("image/svg+xml") ||
        imageBase64.trim().startsWith("<svg");

      const parts: any[] = [];

      if (isSvg) {
        let rawSvg = "";
        try {
          if (imageBase64.includes(";utf8,")) {
            rawSvg = decodeURIComponent(imageBase64.split(";utf8,")[1]);
          } else if (imageBase64.includes(";base64,")) {
            const b64 = imageBase64.split(";base64,")[1].trim();
            rawSvg = Buffer.from(b64, "base64").toString("utf-8");
          } else if (imageBase64.startsWith("data:image/svg+xml,")) {
            rawSvg = decodeURIComponent(imageBase64.replace(/^data:image\/svg\+xml,/, ""));
          } else if (imageBase64.includes("data:image/svg+xml;")) {
            const commaIndex = imageBase64.indexOf(",");
            rawSvg = decodeURIComponent(imageBase64.slice(commaIndex + 1));
          } else {
            rawSvg = imageBase64;
          }
        } catch (e) {
          rawSvg = imageBase64;
        }

        parts.push({
          text: `Factura o recibo en formato vectorial SVG estructurado:\n\`\`\`xml\n${rawSvg}\n\`\`\``,
        });
      } else {
        // Standard raster image (PNG, JPEG, WebP, etc.)
        let cleanBase64 = imageBase64;
        let resolvedMime = mimeType || "image/jpeg";

        if (imageBase64.includes(";base64,")) {
          const [header, data] = imageBase64.split(";base64,");
          cleanBase64 = data.replace(/\s+/g, "");
          const mimeMatch = header.match(/^data:([^;]+)/);
          if (mimeMatch) {
            resolvedMime = mimeMatch[1];
          }
        } else if (imageBase64.startsWith("data:")) {
          const commaIndex = imageBase64.indexOf(",");
          cleanBase64 = imageBase64.slice(commaIndex + 1).replace(/\s+/g, "");
        } else {
          cleanBase64 = cleanBase64.replace(/\s+/g, "");
        }

        // Validate MIME type
        const validMimes = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"];
        if (!validMimes.includes(resolvedMime)) {
          resolvedMime = "image/jpeg";
        }

        parts.push({
          inlineData: {
            mimeType: resolvedMime,
            data: cleanBase64,
          },
        });
      }

      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            "User-Agent": "aistudio-build",
          },
        },
      });

      const prompt = `Analiza esta foto o imagen de factura o recibo de proveedor de mercancía.
Extrae todos los datos estructurados en formato JSON exacto:
- proveedor: Nombre o razón social del proveedor
- numero_factura: Número o folio de factura/ticket
- fecha: Fecha en formato AAAA-MM-DD (o aproximada si está ilegible)
- total_factura: Monto total numérico
- items: Lista de productos adquiridos con:
  * codigo_barras: Código de barras o código de referencia si aparece (si no, genera uno sugerido tipo '750' seguido de 6 dígitos numéricos)
  * nombre: Descripción clara y limpia del producto
  * categoria: Categoría adecuada (ej: 'Abarrotes', 'Bebidas', 'Lácteos', 'Limpieza', 'Ferretería', 'Electrónica', 'Farmacia', 'General')
  * cantidad: Cantidad numérica comprada (mínimo 1)
  * precio_costo: Precio de costo unitario
  * precio_venta: Precio sugerido de venta al público (por ejemplo con 30-40% de margen sobre el costo)
  * unidad_medida: Unidad (Pza, Kg, Lt, Paquete, Caja)
Sé riguroso y preciso con los números y descripciones.`;

      parts.push({
        text: prompt,
      });

      const genConfig = {
        systemInstruction: "Eres un experto en digitalización y extracción de datos contables y facturas para sistemas de inventario y punto de venta POS.",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            proveedor: { type: Type.STRING, description: "Nombre del proveedor o emisor" },
            numero_factura: { type: Type.STRING, description: "Número de factura o folio" },
            fecha: { type: Type.STRING, description: "Fecha de expedición (YYYY-MM-DD)" },
            total_factura: { type: Type.NUMBER, description: "Importe total de la factura" },
            moneda: { type: Type.STRING, description: "Moneda (MXN, USD, EUR, etc.)" },
            items: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  codigo_barras: { type: Type.STRING, description: "Código de barras o SKU del producto" },
                  nombre: { type: Type.STRING, description: "Nombre del producto" },
                  categoria: { type: Type.STRING, description: "Categoría de producto" },
                  cantidad: { type: Type.NUMBER, description: "Cantidad adquirida" },
                  precio_costo: { type: Type.NUMBER, description: "Precio de costo unitario" },
                  precio_venta: { type: Type.NUMBER, description: "Precio de venta sugerido al público" },
                  unidad_medida: { type: Type.STRING, description: "Unidad de medida (Pza, Kg, etc.)" },
                },
                required: ["nombre", "cantidad", "precio_costo", "precio_venta"],
              },
            },
          },
          required: ["proveedor", "numero_factura", "items"],
        },
      };

      let response: any = null;
      const modelsToTry = ["gemini-3.8-flash", "gemini-flash-latest"];
      let lastErr: any = null;

      for (const modelName of modelsToTry) {
        try {
          response = await ai.models.generateContent({
            model: modelName,
            contents: {
              parts,
            },
            config: genConfig,
          });
          if (response && response.text) {
            break;
          }
        } catch (err: any) {
          lastErr = err;
          console.warn(`Intento con modelo ${modelName} falló:`, err?.message || err);
          await new Promise((r) => setTimeout(r, 600));
        }
      }

      if (!response || !response.text) {
        throw lastErr || new Error("No se pudo obtener respuesta del modelo Gemini");
      }

      const responseText = response.text || "{}";
      const parsedData = JSON.parse(responseText);

      return res.json({
        success: true,
        data: parsedData,
      });
    } catch (error: any) {
      console.error("Error al procesar factura con Gemini:", error);
      return res.status(500).json({
        error: "Error al analizar la factura",
        details: error?.message || "Ocurrió un error inesperado al contactar a la API de Gemini.",
      });
    }
  });

  // =========================================================================
  // Guardado Automático de Facturas en Carpeta Local (Modo Sin Datáfono)
  // Cada factura se guarda en una carpeta con la fecha y hora de la operación
  // =========================================================================
  app.post("/api/invoices/save-local", async (req, res) => {
    try {
      const { sale, emisor } = req.body;
      if (!sale) {
        return res.status(400).json({ success: false, error: "Datos de venta requeridos" });
      }

      // 1. Determinar fecha y hora formateadas para la carpeta y los archivos
      const rawDateStr = sale.fecha_hora || sale.fecha || new Date().toISOString();
      const saleDate = new Date(rawDateStr.replace(" ", "T"));
      const validDate = !isNaN(saleDate.getTime()) ? saleDate : new Date();

      const year = validDate.getFullYear();
      const month = String(validDate.getMonth() + 1).padStart(2, "0");
      const day = String(validDate.getDate()).padStart(2, "0");
      const dateFolder = `${year}-${month}-${day}`;

      const hours = String(validDate.getHours()).padStart(2, "0");
      const minutes = String(validDate.getMinutes()).padStart(2, "0");
      const seconds = String(validDate.getSeconds()).padStart(2, "0");
      const timeStr = `${hours}-${minutes}-${seconds}`;

      const safeInvoiceNum = String(sale.numero_factura || "FAC-000000").replace(/[^a-zA-Z0-9_-]/g, "_");
      
      // Nombre de la carpeta con la FECHA y HORA de la operación
      const folderName = `${dateFolder}_${timeStr}_${safeInvoiceNum}`;
      const targetDir = path.join(process.cwd(), "facturas_emitidas", folderName);

      if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
      }

      const emisorRazon = emisor?.razon_social || "SISTEMA POS & FACTURACIÓN VENEZUELA";
      const emisorRif = emisor?.rif || "J-00000000-0";
      const emisorDir = emisor?.direccion_fiscal || "Caracas, Venezuela";
      const emisorTel = emisor?.telefono || "(0212) 000-0000";

      // 2. Generar contenido legible tipo Ticket Térmico (.txt)
      const itemsLines = (sale.items || [])
        .map((it: any) => {
          const qty = String(it.cantidad || 1).padEnd(5);
          const desc = String(it.nombre || "Artículo").slice(0, 36).padEnd(38);
          const alic = (it.alicuota_iva || 16) > 0 ? "(G 16%)" : "(E 0%) ";
          const totalBs = `Bs. ${(it.subtotal * (sale.tasa_bcv || 36.5)).toFixed(2)}`.padStart(16);
          return `${qty} ${desc} ${alic} ${totalBs}`;
        })
        .join("\n");

      const ticketContent = `================================================================================
                    SENIAT - COMPROBANTE FISCAL DIGITAL
================================================================================
EMISOR:        ${emisorRazon}
RIF:           ${emisorRif} • Providencia SNAT/00071
DIRECCIÓN:     ${emisorDir}
TELÉFONO:      ${emisorTel}
--------------------------------------------------------------------------------
FACTURA N°:    ${sale.numero_factura || "N/A"}
CONTROL N°:    ${sale.numero_control || "N/A"}
FECHA / HORA:  ${sale.fecha_hora || `${dateFolder} ${hours}:${minutes}:${seconds}`}
CAJERO/OPER:   ${sale.usuario || "Caja Principal"}
MODALIDAD:     SIN DATÁFONO (OPERACIÓN AUTÓNOMA)
--------------------------------------------------------------------------------
CLIENTE:       ${sale.cliente_nombre || "CONSUMIDOR FINAL"}
RIF / C.I.:    ${sale.cliente_rif || "V-00000000-0"}
DIRECCIÓN:     ${sale.cliente_direccion || "Caracas, Venezuela"}
================================================================================
CANT  DESCRIPCIÓN                            ALIC            TOTAL (Bs)
--------------------------------------------------------------------------------
${itemsLines || "1     Artículos Varios                       (G 16%)        Bs. " + (sale.total_ves || 0).toFixed(2)}
================================================================================
${(sale.base_exenta_ves || 0) > 0 ? `BASE EXENTA (E):                                 Bs. ${(sale.base_exenta_ves || 0).toFixed(2)}\n` : ""}BASE IMPONIBLE (G 16%):                           Bs. ${(sale.base_imponible_ves || 0).toFixed(2)}
IVA (16%):                                        Bs. ${(sale.iva_ves || 0).toFixed(2)}
${(sale.igtf_ves || 0) > 0 ? `PERCEPCIÓN IGTF (3%):                             Bs. ${(sale.igtf_ves || 0).toFixed(2)}\n` : ""}--------------------------------------------------------------------------------
TOTAL FACTURA (VES):                              Bs. ${(sale.total_ves || 0).toFixed(2)}
TOTAL EQUIVALENTE USD:                            $ ${(sale.total_usd || 0).toFixed(2)}
TASA OFICIAL BCV:                                 Bs. ${(sale.tasa_bcv_aplicada || sale.tasa_bcv || 36.5).toFixed(2)}
FORMA DE PAGO:                                    ${sale.metodo_pago || "Efectivo"}
================================================================================
              *** COMPROBANTE FISCAL CONFORME A DERECHO ***
          Guardado automático en carpeta con fecha y hora local
================================================================================
`;

      // 3. Generar comprobante visual en HTML (.html) listo para abrir con doble clic o imprimir
      const itemsHtml = (sale.items || [])
        .map((it: any) => {
          const qty = it.cantidad || 1;
          const desc = it.nombre || "Artículo";
          const alic = (it.alicuota_iva || 16) > 0 ? "G (16%)" : "E (0%)";
          const subtotalBs = (it.subtotal * (sale.tasa_bcv || 36.5)).toFixed(2);
          const subtotalUsd = (it.subtotal || 0).toFixed(2);
          return `
            <tr>
              <td style="padding: 6px 8px; border-bottom: 1px solid #e2e8f0; text-align: center;">${qty}</td>
              <td style="padding: 6px 8px; border-bottom: 1px solid #e2e8f0;"><strong>${desc}</strong></td>
              <td style="padding: 6px 8px; border-bottom: 1px solid #e2e8f0; text-align: center;"><span style="font-size: 11px; background: #f1f5f9; padding: 2px 6px; border-radius: 4px;">${alic}</span></td>
              <td style="padding: 6px 8px; border-bottom: 1px solid #e2e8f0; text-align: right;">$ ${subtotalUsd}</td>
              <td style="padding: 6px 8px; border-bottom: 1px solid #e2e8f0; text-align: right; font-weight: bold;">Bs. ${subtotalBs}</td>
            </tr>`;
        })
        .join("");

      const htmlContent = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Factura Fiscal ${sale.numero_factura || ""} - ${dateFolder} ${timeStr}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; margin: 0; padding: 24px; background: #f8fafc; color: #1e293b; }
    .ticket-container { max-width: 650px; margin: 0 auto; background: #ffffff; border: 1px solid #cbd5e1; border-radius: 12px; padding: 28px; box-shadow: 0 4px 12px rgba(0,0,0,0.06); }
    .header { text-align: center; border-bottom: 2px dashed #94a3b8; padding-bottom: 16px; margin-bottom: 16px; }
    .title { font-size: 18px; font-weight: bold; letter-spacing: 0.5px; color: #0f172a; margin-bottom: 4px; }
    .meta-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; margin-bottom: 16px; font-size: 13px; line-height: 1.6; }
    .meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
    table { width: 100%; border-collapse: collapse; font-size: 13px; margin: 16px 0; }
    th { background: #0f172a; color: #ffffff; padding: 8px; text-align: left; font-size: 12px; }
    .totals { border-top: 2px dashed #94a3b8; padding-top: 14px; margin-top: 14px; font-size: 14px; line-height: 1.8; }
    .totals-row { display: flex; justify-content: space-between; }
    .grand-total { font-size: 18px; font-weight: bold; color: #0f172a; border-top: 2px solid #0f172a; padding-top: 8px; margin-top: 6px; }
    .badge { display: inline-block; padding: 3px 8px; border-radius: 6px; font-size: 11px; font-weight: bold; background: #dbeafe; color: #1e40af; }
    .footer { text-align: center; font-size: 11px; color: #64748b; margin-top: 24px; border-top: 1px solid #e2e8f0; padding-top: 14px; }
    .no-print { margin-bottom: 20px; display: flex; justify-content: space-between; align-items: center; }
    .btn { background: #2563eb; color: #ffffff; border: none; padding: 10px 18px; border-radius: 8px; cursor: pointer; font-weight: bold; font-size: 13px; text-decoration: none; display: inline-flex; align-items: center; gap: 6px; }
    .btn:hover { background: #1d4ed8; }
    @media print {
      body { background: #ffffff; padding: 0; }
      .ticket-container { box-shadow: none; border: none; padding: 0; max-width: 100%; }
      .no-print { display: none !important; }
    }
  </style>
</head>
<body>
  <div class="ticket-container">
    <div class="no-print">
      <div style="font-size: 12px; color: #64748b;">
        📁 Guardado en: <strong>facturas_emitidas/${folderName}</strong>
      </div>
      <button class="btn" onclick="window.print()">
        🖨️ Imprimir Factura / Guardar PDF
      </button>
    </div>

    <div class="header">
      <div style="font-size: 11px; font-weight: bold; color: #64748b; text-transform: uppercase;">República Bolivariana de Venezuela • SENIAT</div>
      <div class="title">${emisorRazon}</div>
      <div style="font-size: 13px; font-weight: bold;">RIF: ${emisorRif}</div>
      <div style="font-size: 12px; color: #475569;">${emisorDir}</div>
      <div style="font-size: 12px; color: #475569;">Tel: ${emisorTel}</div>
    </div>

    <div class="meta-box">
      <div class="meta-grid">
        <div><strong>FACTURA FISCAL N°:</strong> ${sale.numero_factura || "N/A"}</div>
        <div><strong>N° DE CONTROL:</strong> ${sale.numero_control || "N/A"}</div>
        <div><strong>FECHA / HORA:</strong> ${sale.fecha_hora || `${dateFolder} ${hours}:${minutes}:${seconds}`}</div>
        <div><strong>OPERADOR / CAJA:</strong> ${sale.usuario || "Caja Principal"}</div>
        <div><strong>MODALIDAD:</strong> <span class="badge">SIN DATÁFONO</span></div>
        <div><strong>FORMA DE PAGO:</strong> ${sale.metodo_pago || "Efectivo"}</div>
      </div>
      <div style="border-top: 1px dashed #cbd5e1; margin-top: 8px; padding-top: 8px;">
        <div><strong>CLIENTE:</strong> ${sale.cliente_nombre || "CONSUMIDOR FINAL"}</div>
        <div><strong>C.I. / RIF:</strong> ${sale.cliente_rif || "V-00000000-0"}</div>
        <div><strong>DIRECCIÓN:</strong> ${sale.cliente_direccion || "Caracas, Venezuela"}</div>
      </div>
    </div>

    <table>
      <thead>
        <tr>
          <th style="width: 50px; text-align: center;">CANT</th>
          <th>DESCRIPCIÓN</th>
          <th style="width: 80px; text-align: center;">ALÍC.</th>
          <th style="width: 90px; text-align: right;">TOTAL ($)</th>
          <th style="width: 120px; text-align: right;">TOTAL (Bs.)</th>
        </tr>
      </thead>
      <tbody>
        ${itemsHtml || `<tr><td colspan="5" style="text-align: center; padding: 12px;">Artículos Varios - Bs. ${(sale.total_ves || 0).toFixed(2)}</td></tr>`}
      </tbody>
    </table>

    <div class="totals">
      ${(sale.base_exenta_ves || 0) > 0 ? `<div class="totals-row"><span>BASE EXENTA (E):</span><span>Bs. ${(sale.base_exenta_ves || 0).toFixed(2)}</span></div>` : ""}
      <div class="totals-row"><span>BASE IMPONIBLE (G 16%):</span><span>Bs. ${(sale.base_imponible_ves || 0).toFixed(2)}</span></div>
      <div class="totals-row"><span>IVA (16%):</span><span>Bs. ${(sale.iva_ves || 0).toFixed(2)}</span></div>
      ${(sale.igtf_ves || 0) > 0 ? `<div class="totals-row" style="color: #b45309;"><span>PERCEPCIÓN IGTF (3%):</span><span>Bs. ${(sale.igtf_ves || 0).toFixed(2)}</span></div>` : ""}
      <div class="totals-row grand-total">
        <span>TOTAL FACTURA (VES):</span>
        <span>Bs. ${(sale.total_ves || 0).toFixed(2)}</span>
      </div>
      <div class="totals-row" style="font-weight: bold; color: #475569; font-size: 15px; margin-top: 4px;">
        <span>TOTAL EN DIVISAS (USD):</span>
        <span>$ ${(sale.total_usd || 0).toFixed(2)}</span>
      </div>
      <div class="totals-row" style="font-size: 12px; color: #64748b; margin-top: 4px;">
        <span>Tasa Oficial BCV Aplicada:</span>
        <span>Bs. ${(sale.tasa_bcv_aplicada || sale.tasa_bcv || 36.5).toFixed(2)} / USD</span>
      </div>
    </div>

    <div class="footer">
      <div>*** COMPROBANTE FISCAL EMITIDO CONFORME A DERECHO ***</div>
      <div style="margin-top: 4px;">Archivado automáticamente en disco en carpeta con fecha y hora de la operación</div>
      <div style="margin-top: 2px; font-family: monospace;">UUID: ${folderName}</div>
    </div>
  </div>
</body>
</html>`;

      // 4. Escribir los 3 archivos en la carpeta de la operación
      const txtPath = path.join(targetDir, `Factura_${safeInvoiceNum}.txt`);
      const jsonPath = path.join(targetDir, `Datos_${safeInvoiceNum}.json`);
      const htmlPath = path.join(targetDir, `Factura_${safeInvoiceNum}.html`);

      fs.writeFileSync(txtPath, ticketContent, "utf8");
      fs.writeFileSync(jsonPath, JSON.stringify(sale, null, 2), "utf8");
      fs.writeFileSync(htmlPath, htmlContent, "utf8");

      return res.json({
        success: true,
        folder: folderName,
        folderPath: `facturas_emitidas/${folderName}`,
        filename: `Factura_${safeInvoiceNum}.txt`,
        htmlFilename: `Factura_${safeInvoiceNum}.html`,
        jsonFilename: `Datos_${safeInvoiceNum}.json`,
        savedAt: `${dateFolder} ${timeStr}`,
      });
    } catch (err: any) {
      console.error("Error al guardar factura localmente:", err);
      return res.status(500).json({ success: false, error: err?.message || "Error al escribir archivo" });
    }
  });

  // Abrir carpeta de facturas en el Explorador de Windows o SO del cliente
  app.post("/api/invoices/open-folder", (req, res) => {
    try {
      const { subfolder } = req.body || {};
      const targetDir = subfolder
        ? path.join(process.cwd(), "facturas_emitidas", String(subfolder).replace(/\.\./g, ""))
        : path.join(process.cwd(), "facturas_emitidas");

      if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
      }

      if (process.platform === "win32") {
        exec(`explorer.exe "${targetDir}"`);
      } else if (process.platform === "darwin") {
        exec(`open "${targetDir}"`);
      } else {
        exec(`xdg-open "${targetDir}"`);
      }

      return res.json({ success: true, folder: targetDir });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err?.message });
    }
  });

  // Descargar ZIP de facturas del día (incluyendo subcarpetas por fecha y hora)
  app.get("/api/invoices/download-today-zip", async (_req, res) => {
    try {
      const today = new Date().toISOString().slice(0, 10);
      const rootInvoicesDir = path.join(process.cwd(), "facturas_emitidas");

      const zip = new JSZip();
      let filesCount = 0;

      if (fs.existsSync(rootInvoicesDir)) {
        const entries = fs.readdirSync(rootInvoicesDir, { withFileTypes: true });
        for (const entry of entries) {
          if (entry.isDirectory() && entry.name.startsWith(today)) {
            const folderPath = path.join(rootInvoicesDir, entry.name);
            const files = fs.readdirSync(folderPath);
            for (const file of files) {
              const filePath = path.join(folderPath, file);
              if (fs.statSync(filePath).isFile()) {
                zip.file(`${entry.name}/${file}`, fs.readFileSync(filePath));
                filesCount++;
              }
            }
          } else if (entry.isFile() && entry.name.includes(today)) {
            const filePath = path.join(rootInvoicesDir, entry.name);
            zip.file(entry.name, fs.readFileSync(filePath));
            filesCount++;
          }
        }
      }

      if (filesCount === 0) {
        zip.file("LEEME.txt", `No se encontraron facturas emitidas para hoy (${today}).`);
      }

      const zipBuffer = await zip.generateAsync({ type: "nodebuffer" });
      res.setHeader("Content-Type", "application/zip");
      res.setHeader("Content-Disposition", `attachment; filename="facturas_${today}.zip"`);
      return res.send(zipBuffer);
    } catch (err: any) {
      console.error("Error al generar ZIP de facturas:", err);
      return res.status(500).json({ success: false, error: err?.message });
    }
  });

  // Vite middleware for development vs static build for production
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Servidor de inventario corriendo en http://0.0.0.0:${PORT}`);
  });
}

startServer();
