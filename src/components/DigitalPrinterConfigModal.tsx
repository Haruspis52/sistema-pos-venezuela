import React, { useState, useEffect } from "react";
import { DigitalPrinterConfig, ImprentaDigitalProviderVE } from "../types";
import {
  getDigitalPrinterConfig,
  saveDigitalPrinterConfig,
  IMPRENTAS_AUTORIZADAS_PRESETS,
  requestDigitalPrinterControlNumber,
} from "../services/digitalPrinterService";
import { getStoredEmisorFiscal } from "../mockDb";
import {
  Building2,
  ShieldCheck,
  KeyRound,
  Globe,
  CheckCircle2,
  X,
  Zap,
  FileCheck2,
  RefreshCw,
  Info,
  Lock,
  Server,
} from "lucide-react";

interface DigitalPrinterConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved?: (config: DigitalPrinterConfig) => void;
}

export const DigitalPrinterConfigModal: React.FC<DigitalPrinterConfigModalProps> = ({
  isOpen,
  onClose,
  onSaved,
}) => {
  const [config, setConfig] = useState<DigitalPrinterConfig>(() => getDigitalPrinterConfig());
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    ok: boolean;
    msg: string;
    sampleControl?: string;
    sampleHash?: string;
  } | null>(null);

  useEffect(() => {
    if (isOpen) {
      setConfig(getDigitalPrinterConfig());
      setTestResult(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSelectProvider = (prov: ImprentaDigitalProviderVE) => {
    const preset = IMPRENTAS_AUTORIZADAS_PRESETS[prov];
    setConfig((prev) => ({
      ...prev,
      proveedor: prov,
      nombreImprenta: preset.nombre,
      rifImprenta: preset.rif,
      providenciaAutorizacion: preset.autorizacion,
      apiEndpointUrl: preset.defaultEndpoint,
      modoSimulacion: prov === "MODO_DEMO_SENIAT" ? true : prev.modoSimulacion,
    }));
    setTestResult(null);
  };

  const handleTestConnection = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const emisor = getStoredEmisorFiscal();
      const res = await requestDigitalPrinterControlNumber(
        {
          emisorRif: emisor.rif,
          emisorRazonSocial: emisor.razon_social,
          clienteRif: "V-00000000-0",
          clienteNombre: "PRUEBA DE CONEXIÓN IMPRENTA DIGITAL",
          clienteDireccion: "Caracas, Venezuela",
          numeroFactura: "00-000001",
          correlativoControlBase: 1,
          tasaBcv: 45.0,
          baseExentaVes: 0,
          baseImponibleVes: 100,
          ivaVes: 16,
          igtfVes: 0,
          totalVes: 116,
          totalUsd: 2.58,
          items: [
            {
              descripcion: "TIMBRE DE PRUEBA SNAT/2024/000102",
              cantidad: 1,
              precioUnitarioVes: 100,
              alicuotaIva: 16,
              subtotalVes: 100,
            },
          ],
        },
        config
      );

      setTestResult({
        ok: res.exito,
        msg: res.mensaje,
        sampleControl: res.numeroControlAsignado,
        sampleHash: res.firmaDigitalHash,
      });
    } catch (e: any) {
      setTestResult({
        ok: false,
        msg: e?.message || "Error al conectar con el servidor de la Imprenta Digital.",
      });
    } finally {
      setTesting(false);
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    saveDigitalPrinterConfig(config);
    if (onSaved) onSaved(config);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-3 sm:p-4 overflow-y-auto">
      <div className="bg-[#12141c] border border-slate-700/80 rounded-2xl w-full max-w-2xl shadow-2xl text-slate-100 overflow-hidden my-auto flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-950/80 via-[#161924] to-blue-950/60 px-5 py-4 border-b border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
              <FileCheck2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-sm sm:text-base font-bold text-white">
                  Conector de Imprenta Digital Autorizada SENIAT
                </h2>
                <span className="text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-700/60">
                  Prov. SNAT/2024/000102
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Asignación telemática de Números de Control y trazabilidad fiscal (Sin requisito de homologación tras SNAT/2026/00084)
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSave} className="p-5 overflow-y-auto space-y-4 text-xs flex-1 min-h-0">
          {/* Legal Context Banner */}
          <div className="bg-blue-950/30 border border-blue-500/30 rounded-xl p-3.5 flex items-start gap-3">
            <Info className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
            <div className="space-y-1 text-[11px] text-slate-300 leading-relaxed">
              <p className="font-bold text-blue-300">
                Marco Legal Vigente (SNAT/2024/000102 + Derogatoria SNAT/2026/00084):
              </p>
              <p>
                La Providencia <strong>SNAT/2026/00084</strong> (Gaceta Oficial N° 43.435 del 12/08/2026) derogó la Providencia 000121, eliminando la obligación de homologar el software administrativo ante el SENIAT. Si el contribuyente realiza ventas por medios electrónicos o está autorizado para <strong>Facturación Digital (SNAT/2024/000102)</strong>, este conector solicita el <strong>Número de Control</strong> en tiempo real a su Imprenta Digital Autorizada.
              </p>
            </div>
          </div>

          {/* Enable Toggle */}
          <div className="bg-[#181b26] border border-slate-800 rounded-xl p-3.5 flex items-center justify-between">
            <div>
              <span className="font-bold text-white text-xs block">
                Activar Emisión por Imprenta Digital Autorizada (SNAT/2024/000102)
              </span>
              <span className="text-[11px] text-slate-400">
                Al facturar en el POS Fiscal, el sistema sellará el documento con Número de Control y Hash de la Imprenta Digital.
              </span>
            </div>
            <label className="relative inline-flex items-center cursor-pointer shrink-0 ml-3">
              <input
                type="checkbox"
                checked={config.enabled}
                onChange={(e) => setConfig({ ...config, enabled: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
            </label>
          </div>

          {/* Provider Selection */}
          <div className="space-y-2">
            <label className="block font-bold text-slate-300 uppercase tracking-wider text-[11px]">
              1. Seleccionar Proveedor de Imprenta Digital Autorizada SENIAT:
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {(Object.keys(IMPRENTAS_AUTORIZADAS_PRESETS) as ImprentaDigitalProviderVE[]).map(
                (key) => {
                  const item = IMPRENTAS_AUTORIZADAS_PRESETS[key];
                  const active = config.proveedor === key;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => handleSelectProvider(key)}
                      className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                        active
                          ? "bg-emerald-950/40 border-emerald-500/70 text-white shadow-md"
                          : "bg-[#161922] border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs text-white">{item.nombre}</span>
                        {active && <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />}
                      </div>
                      <div className="text-[10px] font-mono text-emerald-400 mt-0.5">
                        RIF: {item.rif} • {item.autorizacion}
                      </div>
                      <p className="text-[10px] text-slate-400 mt-1 line-clamp-1">
                        {item.descripcion}
                      </p>
                    </button>
                  );
                }
              )}
            </div>
          </div>

          {/* Imprenta Details */}
          <div className="bg-[#161922] border border-slate-800 rounded-xl p-4 space-y-3">
            <h3 className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5" /> Datos Fiscales de la Imprenta Autorizada (Pie de Factura Art. 14)
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <label className="block text-[10px] text-slate-400 uppercase font-semibold mb-1">
                  Razón Social de la Imprenta Digital:
                </label>
                <input
                  type="text"
                  value={config.nombreImprenta}
                  onChange={(e) => setConfig({ ...config, nombreImprenta: e.target.value })}
                  className="w-full bg-[#0e1017] border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-[10px] text-slate-400 uppercase font-semibold mb-1">
                  RIF Imprenta Digital:
                </label>
                <input
                  type="text"
                  value={config.rifImprenta}
                  onChange={(e) =>
                    setConfig({ ...config, rifImprenta: e.target.value.toUpperCase() })
                  }
                  className="w-full bg-[#0e1017] border border-slate-700 rounded-lg px-3 py-1.5 text-xs font-mono text-amber-300 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-[10px] text-slate-400 uppercase font-semibold mb-1">
                  N° Providencia / Autorización SENIAT de la Imprenta:
                </label>
                <input
                  type="text"
                  value={config.providenciaAutorizacion}
                  onChange={(e) =>
                    setConfig({ ...config, providenciaAutorizacion: e.target.value })
                  }
                  className="w-full bg-[#0e1017] border border-slate-700 rounded-lg px-3 py-1.5 text-xs font-mono text-emerald-300 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-[10px] text-slate-400 uppercase font-semibold mb-1">
                  Prefijo / Serie N° Control:
                </label>
                <input
                  type="text"
                  value={config.serieControlPrefix}
                  onChange={(e) =>
                    setConfig({ ...config, serieControlPrefix: e.target.value.toUpperCase() })
                  }
                  placeholder="00"
                  className="w-full bg-[#0e1017] border border-slate-700 rounded-lg px-3 py-1.5 text-xs font-mono text-blue-300 focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>
          </div>

          {/* API Connection Credentials */}
          <div className="bg-[#161922] border border-slate-800 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-[11px] font-bold text-blue-400 uppercase tracking-wider flex items-center gap-1.5">
                <Server className="w-3.5 h-3.5" /> Endpoint API REST & Token de Timbrado
              </h3>
              <label className="flex items-center gap-1.5 text-[11px] text-amber-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.modoSimulacion}
                  onChange={(e) => setConfig({ ...config, modoSimulacion: e.target.checked })}
                  className="rounded border-slate-700 bg-slate-800 text-amber-500"
                />
                <span>Modo Homologación / Pruebas Locales</span>
              </label>
            </div>

            <div className="space-y-2.5">
              <div>
                <label className="block text-[10px] text-slate-400 uppercase font-semibold mb-1 flex items-center gap-1">
                  <Globe className="w-3 h-3 text-slate-400" /> URL del Endpoint de Asignación de Control:
                </label>
                <input
                  type="text"
                  value={config.apiEndpointUrl}
                  onChange={(e) => setConfig({ ...config, apiEndpointUrl: e.target.value })}
                  className="w-full bg-[#0e1017] border border-slate-700 rounded-lg px-3 py-1.5 text-xs font-mono text-slate-200 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-[10px] text-slate-400 uppercase font-semibold mb-1 flex items-center gap-1">
                  <KeyRound className="w-3 h-3 text-slate-400" /> API Token / Llave Criptográfica del Contribuyente:
                </label>
                <input
                  type="password"
                  value={config.apiTokenKey}
                  onChange={(e) => setConfig({ ...config, apiTokenKey: e.target.value })}
                  placeholder={
                    config.modoSimulacion
                      ? "Opcional en Modo Homologación / Sandbox"
                      : "Pegue aquí el Bearer Token provisto por su Imprenta Digital"
                  }
                  className="w-full bg-[#0e1017] border border-slate-700 rounded-lg px-3 py-1.5 text-xs font-mono text-white focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            {/* Test Button & Feedback */}
            <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-t border-slate-800/80">
              <button
                type="button"
                onClick={handleTestConnection}
                disabled={testing}
                className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-emerald-300 border border-emerald-700/50 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${testing ? "animate-spin" : ""}`} />
                <span>
                  {testing ? "Solicitando N° Control..." : "Probar Asignación de N° de Control"}
                </span>
              </button>

              {testResult && (
                <div
                  className={`flex-1 p-2.5 rounded-xl border text-[11px] ${
                    testResult.ok
                      ? "bg-emerald-950/40 border-emerald-600/50 text-emerald-200"
                      : "bg-rose-950/40 border-rose-600/50 text-rose-200"
                  }`}
                >
                  <div className="font-bold flex items-center justify-between">
                    <span>{testResult.msg}</span>
                    {testResult.sampleControl && (
                      <span className="font-mono text-emerald-400">
                        Control: {testResult.sampleControl}
                      </span>
                    )}
                  </div>
                  {testResult.sampleHash && (
                    <div className="font-mono text-[10px] text-slate-400 mt-0.5 truncate">
                      Sello: {testResult.sampleHash}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Footer Buttons */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold text-xs transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-lg shadow-emerald-950/50 transition-all cursor-pointer"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Guardar Conector Imprenta Digital</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
