import React, { useState, useEffect } from "react";
import {
  Download,
  Upload,
  Database,
  FileJson,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  HardDrive,
  ShieldCheck,
  X,
  Layers,
  FileSpreadsheet,
  ArrowRight,
  Sparkles,
  FolderDown,
  FolderOpen,
  Clock,
} from "lucide-react";
import { DatabaseBackupPayload, Producto, Venta, Movimiento, FiadoCliente, CierreCajaRecord, SystemUser } from "../types";
import { generateFullDatabaseBackup, restoreDatabaseFromBackup } from "../mockDb";

interface BackupRestoreModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRestoreComplete: () => void;
  showToast: (msg: string) => void;
  onOpenPrivacyPolicy?: () => void;
  currentUser?: SystemUser;
}

export const BackupRestoreModal: React.FC<BackupRestoreModalProps> = ({
  isOpen,
  onClose,
  onRestoreComplete,
  showToast,
  onOpenPrivacyPolicy,
  currentUser,
}) => {
  const isCashier = currentUser?.rol === "CAJERO";
  const [activeTab, setActiveTab] = useState<"export" | "import" | "auto">("export");
  const [exportType, setExportType] = useState<"COMPLETA" | "SOLO_INVENTARIO" | "SOLO_VENTAS">("COMPLETA");
  const [importMode, setImportMode] = useState<"REEMPLAZAR" | "FUSIONAR">("REEMPLAZAR");
  const [uploadedBackup, setUploadedBackup] = useState<DatabaseBackupPayload | null>(null);
  const [fileName, setFileName] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [restoreSummary, setRestoreSummary] = useState<{
    productos: number;
    ventas: number;
    movimientos: number;
    fiados: number;
    cierres: number;
    usuarios: number;
  } | null>(null);

  const [serverFolderBackups, setServerFolderBackups] = useState<
    Array<{ fileName: string; sizeKb: string; createdAt: string }>
  >([]);
  const [folderPath, setFolderPath] = useState<string>("./backups");
  const [isLoadingFolderBackups, setIsLoadingFolderBackups] = useState(false);
  const [saveToFolderResult, setSaveToFolderResult] = useState<{
    success: boolean;
    message: string;
    fileName?: string;
  } | null>(null);

  const fetchServerBackups = async () => {
    setIsLoadingFolderBackups(true);
    try {
      const res = await fetch("/api/backup/list");
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setServerFolderBackups(data.backups || []);
          if (data.folderPath) setFolderPath(data.folderPath);
        }
      }
    } catch (e) {
      console.warn("Error fetching server backups:", e);
    } finally {
      setIsLoadingFolderBackups(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      if (isCashier) {
        setActiveTab("export");
      }
      fetchServerBackups();
    }
  }, [isOpen, activeTab, isCashier]);

  if (!isOpen) return null;

  const handleSaveToFolder = async () => {
    setIsProcessing(true);
    setSaveToFolderResult(null);
    try {
      const backup = generateFullDatabaseBackup(exportType);
      const res = await fetch("/api/backup/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(backup),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSaveToFolderResult({
          success: true,
          message: data.message || "Copia guardada con éxito en la carpeta local de respaldos.",
          fileName: data.fileName,
        });
        showToast("✅ Copia de seguridad guardada en carpeta local /backups/");
        fetchServerBackups();
      } else {
        setSaveToFolderResult({
          success: false,
          message: data.error || "No se pudo escribir el archivo en la carpeta local.",
        });
        showToast("❌ Error al guardar en carpeta local.");
      }
    } catch (err: any) {
      setSaveToFolderResult({
        success: false,
        message: err.message || "Error al conectar con el servidor local.",
      });
      showToast("❌ Error de red al guardar en carpeta local.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRestoreFromServerFile = async (fileToRestore: string) => {
    setIsProcessing(true);
    try {
      const res = await fetch(`/api/backup/get/${encodeURIComponent(fileToRestore)}`);
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.backup) {
          const result = restoreDatabaseFromBackup(data.backup, "REEMPLAZAR");
          if (result.success) {
            setRestoreSummary(result.detalles);
            showToast(`✅ Base de datos restaurada desde '${fileToRestore}'.`);
            onRestoreComplete();
          } else {
            showToast(`❌ Error: ${result.message}`);
          }
        } else {
          showToast(`❌ No se pudo obtener la copia '${fileToRestore}'.`);
        }
      }
    } catch (err: any) {
      showToast(`❌ Error al restaurar respaldo local: ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleExportDownload = () => {
    setIsProcessing(true);
    try {
      const backup = generateFullDatabaseBackup(exportType);
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(backup, null, 2));
      const downloadAnchor = document.createElement("a");
      const dateStr = new Date().toISOString().slice(0, 10);
      const typeSuffix = exportType === "COMPLETA" ? "FULL" : exportType;
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", `RESPALDO_${backup.nombre_negocio.replace(/\s+/g, "_")}_${typeSuffix}_${dateStr}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();

      showToast(`✅ Respaldo ${exportType} generado y descargado correctamente.`);
    } catch (err: any) {
      showToast(`❌ Error al exportar base de datos: ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const content = evt.target?.result as string;
        const parsed = JSON.parse(content) as DatabaseBackupPayload;

        if (!parsed.data || !parsed.checksum) {
          throw new Error("El archivo no contiene un formato de respaldo válido para este sistema.");
        }

        setUploadedBackup(parsed);
      } catch (err: any) {
        showToast(`❌ Archivo inválido: ${err.message}`);
        setUploadedBackup(null);
      }
    };
    reader.readAsText(file);
  };

  const handleExecuteRestore = () => {
    if (!uploadedBackup) return;

    setIsProcessing(true);
    setTimeout(() => {
      const result = restoreDatabaseFromBackup(uploadedBackup, importMode);
      if (result.success) {
        setRestoreSummary(result.detalles);
        showToast("✅ Base de datos restaurada correctamente.");
        onRestoreComplete();
      } else {
        showToast(`❌ Error: ${result.message}`);
      }
      setIsProcessing(false);
    }, 400);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200 overflow-y-auto"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-[#12141c] border border-slate-700/80 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh] my-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-950/60 via-[#181a24] to-[#12141c] p-5 border-b border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-blue-900/30 shrink-0">
              <HardDrive className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white tracking-tight">
                  Centro de Respaldo & Restauración de Datos
                </h2>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-blue-950 text-blue-300 border border-blue-700/60 font-mono">
                  SQLite / JSON
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Protege la información del negocio con copias de seguridad portátiles y restauración segura.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-800 bg-[#0e1017] px-5 pt-3 gap-3 shrink-0">
          <button
            onClick={() => setActiveTab("export")}
            className={`pb-3 text-xs font-bold flex items-center gap-2 border-b-2 transition-all ${
              activeTab === "export"
                ? "border-blue-500 text-blue-400"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <Download className="w-4 h-4" />
            <span>Exportar Copia de Seguridad</span>
          </button>

          {!isCashier && (
            <>
              <button
                onClick={() => setActiveTab("import")}
                className={`pb-3 text-xs font-bold flex items-center gap-2 border-b-2 transition-all ${
                  activeTab === "import"
                    ? "border-amber-500 text-amber-400"
                    : "border-transparent text-slate-400 hover:text-slate-200"
                }`}
              >
                <Upload className="w-4 h-4" />
                <span>Restaurar / Importar</span>
              </button>

              <button
                onClick={() => setActiveTab("auto")}
                className={`pb-3 text-xs font-bold flex items-center gap-2 border-b-2 transition-all ${
                  activeTab === "auto"
                    ? "border-emerald-500 text-emerald-400"
                    : "border-transparent text-slate-400 hover:text-slate-200"
                }`}
              >
                <FolderDown className="w-4 h-4 text-emerald-400" />
                <span>Respaldo en Carpeta Local</span>
              </button>
            </>
          )}
        </div>

        {/* Modal Content */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1 min-h-0">
          {/* TAB 1: EXPORT */}
          {activeTab === "export" && (
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-2">
                  Selecciona el alcance de la copia de seguridad:
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div
                    onClick={() => setExportType("COMPLETA")}
                    className={`cursor-pointer p-3.5 rounded-2xl border transition-all ${
                      exportType === "COMPLETA"
                        ? "bg-blue-950/40 border-blue-500 ring-2 ring-blue-500/20"
                        : "bg-[#161822] border-slate-800 hover:border-slate-700"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-bold text-white">Copia Total</span>
                      {exportType === "COMPLETA" && <CheckCircle2 className="w-4 h-4 text-blue-400" />}
                    </div>
                    <p className="text-[11px] text-slate-400 leading-snug">
                      Todo el sistema: Productos, Ventas, Kardex, Fiados, Cierres y Usuarios.
                    </p>
                  </div>

                  <div
                    onClick={() => setExportType("SOLO_INVENTARIO")}
                    className={`cursor-pointer p-3.5 rounded-2xl border transition-all ${
                      exportType === "SOLO_INVENTARIO"
                        ? "bg-blue-950/40 border-blue-500 ring-2 ring-blue-500/20"
                        : "bg-[#161822] border-slate-800 hover:border-slate-700"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-bold text-white">Solo Catálogo</span>
                      {exportType === "SOLO_INVENTARIO" && <CheckCircle2 className="w-4 h-4 text-blue-400" />}
                    </div>
                    <p className="text-[11px] text-slate-400 leading-snug">
                      Productos, categorías, precios y stock actual para migrar a otra caja.
                    </p>
                  </div>

                  <div
                    onClick={() => setExportType("SOLO_VENTAS")}
                    className={`cursor-pointer p-3.5 rounded-2xl border transition-all ${
                      exportType === "SOLO_VENTAS"
                        ? "bg-blue-950/40 border-blue-500 ring-2 ring-blue-500/20"
                        : "bg-[#161822] border-slate-800 hover:border-slate-700"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-bold text-white">Solo Historial</span>
                      {exportType === "SOLO_VENTAS" && <CheckCircle2 className="w-4 h-4 text-blue-400" />}
                    </div>
                    <p className="text-[11px] text-slate-400 leading-snug">
                      Facturas fiscales, libro de ventas y cierres de caja para contabilidad.
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-[#161822] border border-slate-800 rounded-2xl p-4 space-y-2 text-xs text-slate-300">
                <div className="flex items-center gap-2 text-blue-400 font-bold">
                  <Database className="w-4 h-4" />
                  <span>Compatibilidad Total & Almacenamiento Local:</span>
                </div>
                <p className="text-slate-400 leading-relaxed text-[11px]">
                  El archivo generado en formato JSON estructurado contiene marcas de tiempo ISO, verificación de integridad (Checksum) y es 100% compatible con la carpeta local del servidor (<code>/backups/</code>).
                </p>
              </div>

              {saveToFolderResult && (
                <div
                  className={`p-3.5 rounded-2xl border text-xs flex items-start gap-2.5 transition-all ${
                    saveToFolderResult.success
                      ? "bg-emerald-950/60 border-emerald-500/60 text-emerald-200"
                      : "bg-rose-950/60 border-rose-500/60 text-rose-200"
                  }`}
                >
                  <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold block">{saveToFolderResult.message}</span>
                    {saveToFolderResult.fileName && (
                      <span className="text-[10px] font-mono text-slate-300 block mt-0.5">
                        Archivo: {saveToFolderResult.fileName}
                      </span>
                    )}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={handleSaveToFolder}
                  disabled={isProcessing}
                  className="py-3 px-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-emerald-950/40 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <FolderDown className="w-4 h-4" />
                  <span>Guardar en Carpeta Local (/backups/)</span>
                </button>

                <button
                  type="button"
                  onClick={handleExportDownload}
                  disabled={isProcessing}
                  className="py-3 px-4 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs rounded-xl border border-slate-700 hover:border-slate-600 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <Download className="w-4 h-4 text-blue-400" />
                  <span>Descargar Archivo (.json)</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: IMPORT / RESTORE */}
          {activeTab === "import" && (
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-2">
                  1. Cargar archivo de copia de seguridad:
                </label>
                <label className="border-2 border-dashed border-slate-700 hover:border-amber-500/60 rounded-2xl p-6 flex flex-col items-center justify-center cursor-pointer bg-[#161822]/60 hover:bg-[#161822] transition-all">
                  <FileJson className="w-8 h-8 text-amber-400 mb-2" />
                  <span className="text-xs font-bold text-slate-200">
                    {fileName ? fileName : "Haz clic o arrastra aquí tu archivo .json"}
                  </span>
                  <span className="text-[11px] text-slate-500 mt-1">
                    Archivos de respaldo generados por este sistema
                  </span>
                  <input
                    type="file"
                    accept=".json"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>
              </div>

              {uploadedBackup && (
                <div className="bg-[#181a24] border border-amber-500/30 rounded-2xl p-4 space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <span className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      Archivo Válido Detectado
                    </span>
                    <span className="text-[10px] font-mono text-slate-400">
                      Fecha: {new Date(uploadedBackup.fecha_respaldo).toLocaleString()}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
                    <div className="bg-[#10121a] p-2 rounded-lg">
                      <div className="font-bold text-white">{uploadedBackup.data.productos?.length || 0}</div>
                      <div className="text-[10px] text-slate-400">Productos</div>
                    </div>
                    <div className="bg-[#10121a] p-2 rounded-lg">
                      <div className="font-bold text-white">{uploadedBackup.data.ventas?.length || 0}</div>
                      <div className="text-[10px] text-slate-400">Ventas</div>
                    </div>
                    <div className="bg-[#10121a] p-2 rounded-lg">
                      <div className="font-bold text-white">{uploadedBackup.data.fiados?.length || 0}</div>
                      <div className="text-[10px] text-slate-400">Clientes Fiados</div>
                    </div>
                    <div className="bg-[#10121a] p-2 rounded-lg">
                      <div className="font-bold text-white">{uploadedBackup.data.cierres_caja?.length || 0}</div>
                      <div className="text-[10px] text-slate-400">Cierres Caja</div>
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-300 block mb-1.5">
                      2. Método de Restauración:
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setImportMode("REEMPLAZAR")}
                        className={`p-2.5 rounded-xl border text-left transition-all ${
                          importMode === "REEMPLAZAR"
                            ? "bg-amber-950/40 border-amber-500 text-white font-bold"
                            : "bg-[#10121a] border-slate-800 text-slate-400"
                        }`}
                      >
                        <div className="text-xs">Sustitución Total</div>
                        <div className="text-[10px] text-slate-400">Sobrescribe todos los registros actuales.</div>
                      </button>

                      <button
                        type="button"
                        onClick={() => setImportMode("FUSIONAR")}
                        className={`p-2.5 rounded-xl border text-left transition-all ${
                          importMode === "FUSIONAR"
                            ? "bg-blue-950/40 border-blue-500 text-white font-bold"
                            : "bg-[#10121a] border-slate-800 text-slate-400"
                        }`}
                      >
                        <div className="text-xs">Fusión Incremental</div>
                        <div className="text-[10px] text-slate-400">Combina y actualiza sin borrar ventas previas.</div>
                      </button>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleExecuteRestore}
                    disabled={isProcessing}
                    className="w-full mt-2 py-3 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-extrabold text-xs rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Upload className="w-4 h-4" />
                    <span>Ejecutar Restauración de Datos</span>
                  </button>
                </div>
              )}

              {restoreSummary && (
                <div className="bg-emerald-950/40 border border-emerald-500/50 rounded-2xl p-4 space-y-2">
                  <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>¡Restauración Finalizada con Éxito!</span>
                  </div>
                  <p className="text-[11px] text-slate-300">
                    Se han cargado {restoreSummary.productos} productos y {restoreSummary.ventas} ventas en el sistema.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: AUTO & LOCAL FOLDER BACKUP INFO */}
          {activeTab === "auto" && (
            <div className="space-y-4 text-xs text-slate-300">
              {/* Tarjeta Informativa de Carpeta Local */}
              <div className="bg-[#161822] border border-slate-800 rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-emerald-400 font-bold">
                    <FolderOpen className="w-4 h-4" />
                    <span>Carpeta Local de Respaldos</span>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800">
                    Almacenamiento Local Directo
                  </span>
                </div>

                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Las copias de seguridad se guardan automáticamente en la carpeta local <code>{folderPath}</code> de este equipo. No requieres de un pendrive USB externo.
                </p>

                <button
                  type="button"
                  onClick={handleSaveToFolder}
                  disabled={isProcessing}
                  className="w-full py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold text-xs rounded-xl shadow-lg shadow-emerald-950/40 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <FolderDown className="w-4 h-4" />
                  <span>Crear Nueva Copia Instantánea en Carpeta Local</span>
                </button>
              </div>

              {/* Lista de Copias Guardadas en la Carpeta Local */}
              <div className="bg-[#161822] border border-slate-800 rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <span className="text-xs font-bold text-white flex items-center gap-2">
                    <HardDrive className="w-4 h-4 text-blue-400" />
                    <span>Historial de Respaldos en Carpeta ({serverFolderBackups.length})</span>
                  </span>
                  <button
                    type="button"
                    onClick={fetchServerBackups}
                    disabled={isLoadingFolderBackups}
                    className="text-[10px] font-bold text-blue-400 hover:text-blue-300 flex items-center gap-1 cursor-pointer"
                  >
                    <RefreshCw className={`w-3 h-3 ${isLoadingFolderBackups ? "animate-spin" : ""}`} />
                    <span>Actualizar</span>
                  </button>
                </div>

                {serverFolderBackups.length === 0 ? (
                  <div className="text-center py-6 text-slate-500 text-xs">
                    <p>Aún no hay copias de seguridad guardadas en la carpeta local.</p>
                    <p className="text-[10px] mt-1 text-slate-600">
                      Haz clic en "Crear Nueva Copia Instantánea" arriba para generar la primera.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                    {serverFolderBackups.map((item) => (
                      <div
                        key={item.fileName}
                        className="bg-[#10121a] hover:bg-[#141724] border border-slate-800 hover:border-slate-700 p-3 rounded-xl flex items-center justify-between gap-3 transition-colors"
                      >
                        <div className="min-w-0 flex-1">
                          <span className="font-mono text-xs font-bold text-white block truncate">
                            {item.fileName}
                          </span>
                          <div className="flex items-center gap-3 text-[10px] text-slate-400 font-mono mt-0.5">
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3 text-slate-500" />
                              {new Date(item.createdAt).toLocaleString("es-VE")}
                            </span>
                            <span>•</span>
                            <span>{item.sizeKb} KB</span>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleRestoreFromServerFile(item.fileName)}
                          disabled={isProcessing}
                          className="shrink-0 px-3 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                          title="Restaurar el sistema con los datos de esta copia"
                        >
                          <Upload className="w-3 h-3 text-amber-400" />
                          <span>Restaurar</span>
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {restoreSummary && (
                <div className="bg-emerald-950/40 border border-emerald-500/50 rounded-2xl p-4 space-y-2">
                  <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>¡Restauración Finalizada con Éxito desde Carpeta Local!</span>
                  </div>
                  <p className="text-[11px] text-slate-300">
                    Se han cargado {restoreSummary.productos} productos y {restoreSummary.ventas} ventas en el sistema.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-[#161822] px-6 py-3.5 border-t border-slate-800 flex items-center justify-between shrink-0">
          <div className="text-[11px] text-slate-400">
            {onOpenPrivacyPolicy && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenPrivacyPolicy();
                }}
                className="hover:text-slate-200 underline cursor-pointer"
              >
                Privacidad de Datos y Términos Legales
              </button>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl transition-all cursor-pointer"
          >
            Cerrar Ventana
          </button>
        </div>
      </div>
    </div>
  );
};
