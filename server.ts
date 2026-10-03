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
          exec("git pull origin main && npm run build", { timeout: 15000 }, (error, stdout, stderr) => {
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

  // WizarPOS Q2 ECR Ping / Test Enlace
  app.post("/api/wizarpos/ping", async (req, res) => {
    const { ip, port = 8080 } = req.body;
    if (!ip) {
      return res.status(400).json({ reachable: false, error: "IP requerida" });
    }

    try {
      const net = await import("net");
      const socket = new net.Socket();
      let isReachable = false;
      let finished = false;

      const finish = (reachable: boolean) => {
        if (finished) return;
        finished = true;
        socket.destroy();
        return res.json({
          reachable,
          ip,
          port,
          timestamp: new Date().toISOString(),
        });
      };

      const timer = setTimeout(() => {
        finish(false);
      }, 1500);

      socket.connect(Number(port), ip, () => {
        clearTimeout(timer);
        finish(true);
      });

      socket.on("error", () => {
        clearTimeout(timer);
        finish(false);
      });
    } catch {
      return res.json({
        reachable: false,
        ip,
        port,
        timestamp: new Date().toISOString(),
      });
    }
  });

  // WizarPOS Q2 ECR Send Payment
  app.post("/api/wizarpos/payment", async (req, res) => {
    const { ip, port = 8080, amountVes, invoiceNumber, protocol = "ECR_JSON" } = req.body;

    console.log(`[WizarPOS Q2 ECR] Solicitud de cobro: Bs. ${amountVes} a ${ip}:${port} para factura ${invoiceNumber}`);

    return res.json({
      success: true,
      status: "waiting_card",
      terminal: "WizarPOS Q2",
      amountVes,
      invoiceNumber,
      ip,
      port,
      protocol,
      timestamp: new Date().toISOString(),
    });
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
