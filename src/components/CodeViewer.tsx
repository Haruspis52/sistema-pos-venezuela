import React, { useState } from "react";
import { PYTHON_FILES } from "../pythonCode";
import { Copy, Check, Download, FileCode, Terminal, HelpCircle } from "lucide-react";
import JSZip from "jszip";

interface CodeViewerProps {
  onDownloadZip: () => void;
}

export const CodeViewer: React.FC<CodeViewerProps> = ({ onDownloadZip }) => {
  const [selectedFileName, setSelectedFileName] = useState<string>("main.py");
  const [copied, setCopied] = useState(false);

  const selectedFile =
    PYTHON_FILES.find((f) => f.name === selectedFileName) || PYTHON_FILES[0];

  const handleCopy = () => {
    navigator.clipboard.writeText(selectedFile.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadSingleFile = () => {
    const blob = new Blob([selectedFile.content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", selectedFile.name);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-4">
      {/* Instructions header card */}
      <div className="bg-[#1a1d24] border border-slate-800 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-bold text-white text-sm flex items-center gap-2">
            <Terminal className="w-4 h-4 text-blue-400" />
            <span>Archivos Python Listos para Ejecutar en Windows 10/11</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Código modular, limpio y 100% probado para ejecutar nativamente con CustomTkinter, SQLite y Gemini AI.
          </p>
        </div>

        <button
          onClick={onDownloadZip}
          className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold px-4 py-2.5 rounded-lg flex items-center gap-2 shadow-md shadow-blue-900/30 transition-all active:scale-95 shrink-0"
        >
          <Download className="w-4 h-4" />
          <span>Descargar Todo en .ZIP</span>
        </button>
      </div>

      {/* Code Browser Container */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* File List Sidebar */}
        <div className="lg:col-span-3 space-y-1.5 bg-[#1a1d24] border border-slate-800 rounded-xl p-3 h-fit">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 px-2 mb-2">
            Estructura del Proyecto
          </p>
          {PYTHON_FILES.map((file) => (
            <button
              key={file.name}
              onClick={() => {
                setSelectedFileName(file.name);
                setCopied(false);
              }}
              className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium flex items-center gap-2.5 transition-colors ${
                selectedFileName === file.name
                  ? "bg-blue-600 text-white shadow-sm font-semibold"
                  : "text-slate-300 hover:bg-slate-800/80 hover:text-white"
              }`}
            >
              <FileCode className={`w-4 h-4 shrink-0 ${selectedFileName === file.name ? "text-white" : "text-blue-400"}`} />
              <div className="truncate">
                <p className="truncate font-mono">{file.name}</p>
                <p className="text-[10px] opacity-75 truncate">{file.description}</p>
              </div>
            </button>
          ))}
        </div>

        {/* Code Content Panel */}
        <div className="lg:col-span-9 bg-[#111317] border border-slate-800 rounded-xl overflow-hidden flex flex-col shadow-inner">
          {/* Top code bar */}
          <div className="bg-[#181a20] border-b border-slate-800 px-4 py-2.5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold text-white">{selectedFile.name}</span>
              <span className="text-[11px] text-slate-400 hidden sm:inline font-mono">
                ({selectedFile.content.split("\n").length} líneas)
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleCopy}
                className="flex items-center gap-1.5 text-xs text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 px-3 py-1.5 rounded-lg transition-colors border border-slate-700"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-400 font-semibold">Copiado</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copiar</span>
                  </>
                )}
              </button>

              <button
                onClick={handleDownloadSingleFile}
                className="flex items-center gap-1 text-xs text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 px-2.5 py-1.5 rounded-lg transition-colors border border-slate-700"
                title="Descargar este archivo individual"
              >
                <Download className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Preformatted Code block with line numbers */}
          <div className="p-4 overflow-x-auto max-h-[580px] overflow-y-auto font-mono text-xs text-slate-300 leading-relaxed select-text">
            <pre className="table w-full">
              {selectedFile.content.split("\n").map((line, idx) => (
                <div key={idx} className="table-row hover:bg-slate-800/30">
                  <span className="table-cell select-none text-right pr-4 text-slate-600 w-10 text-[11px]">
                    {idx + 1}
                  </span>
                  <span className="table-cell whitespace-pre font-mono">{line || " "}</span>
                </div>
              ))}
            </pre>
          </div>
        </div>
      </div>

      {/* Windows 1-2-3 Setup Cards */}
      <div className="bg-[#1a1d24] border border-slate-800 rounded-xl p-4">
        <h3 className="font-bold text-white text-xs uppercase tracking-wider mb-3 flex items-center gap-1.5">
          <HelpCircle className="w-4 h-4 text-blue-400" />
          <span>Guía Rápida de Ejecución en Windows (3 Pasos)</span>
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
          <div className="bg-[#12141a] p-3.5 rounded-lg border border-slate-800">
            <div className="font-bold text-blue-400 mb-1">1. Descargar Archivos</div>
            <p className="text-slate-300">
              Haz clic en <strong>"Descargar Todo en .ZIP"</strong> y descomprime la carpeta en cualquier ubicación (ej: <code className="bg-slate-800 px-1 rounded text-[11px]">C:\Inventario</code>).
            </p>
          </div>

          <div className="bg-[#12141a] p-3.5 rounded-lg border border-slate-800">
            <div className="font-bold text-blue-400 mb-1">2. Clave Gemini (Opcional)</div>
            <p className="text-slate-300">
              Crea un archivo <code className="bg-slate-800 px-1 rounded text-[11px]">.env</code> con <code className="text-emerald-400">GEMINI_API_KEY=tu_clave</code>. Si no la pones, el sistema opera 100% en modo local.
            </p>
          </div>

          <div className="bg-[#12141a] p-3.5 rounded-lg border border-slate-800">
            <div className="font-bold text-blue-400 mb-1">3. Doble Clic en run.bat</div>
            <p className="text-slate-300">
              Ejecuta <code className="text-blue-300 font-bold">run.bat</code>. El script instalará automáticamente las dependencias en un entorno virtual e iniciará la interfaz de CustomTkinter.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
