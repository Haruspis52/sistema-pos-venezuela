import React, { useState, useMemo } from "react";
import { Venta, SystemUser } from "../types";
import {
  FileText,
  Search,
  Download,
  Printer,
  Calendar,
  DollarSign,
  CreditCard,
  Building2,
  ExternalLink,
  ShieldCheck,
  Filter,
  Eye,
  CheckCircle2,
  Receipt,
  Trash2,
  AlertTriangle,
  Sparkles,
  RefreshCw,
  X,
  Lock,
} from "lucide-react";
import { EMISOR_FISCAL_DEFAULT, getStoredEmisorFiscal } from "../mockDb";

interface SalesBookViewProps {
  sales: Venta[];
  bcvRate: number;
  onClearSales?: () => void;
  showToast?: (msg: string) => void;
  currentUser?: SystemUser;
}

export const SalesBookView: React.FC<SalesBookViewProps> = ({
  sales,
  bcvRate,
  onClearSales,
  showToast,
  currentUser,
}) => {
  const [search, setSearch] = useState("");
  const [filterPayment, setFilterPayment] = useState<string>("TODOS");
  const [selectedSale, setSelectedSale] = useState<Venta | null>(null);
  const [isClearConfirmOpen, setIsClearConfirmOpen] = useState(false);
  const [justExported, setJustExported] = useState(false);

  const isAdmin = currentUser ? currentUser.rol === "ADMIN" : false;

  const filteredSales = useMemo(() => {
    return sales.filter((s) => {
      const matchesPayment =
        filterPayment === "TODOS" || s.metodo_pago === filterPayment;
      const q = search.toLowerCase();
      const matchesSearch =
        !search ||
        s.numero_factura.toLowerCase().includes(q) ||
        s.numero_control.toLowerCase().includes(q) ||
        s.cliente_nombre.toLowerCase().includes(q) ||
        s.cliente_rif.toLowerCase().includes(q);

      return matchesPayment && matchesSearch;
    });
  }, [sales, filterPayment, search]);

  // Totales acumulados del libro
  const totals = useMemo(() => {
    return filteredSales.reduce(
      (acc, s) => {
        acc.baseExentaVes += s.base_exenta_ves || 0;
        acc.baseImponibleVes += s.base_imponible_ves || 0;
        acc.ivaVes += s.iva_ves || 0;
        acc.igtfVes += s.igtf_ves || 0;
        acc.totalVes += s.total_ves || 0;
        acc.totalUsd += s.total_usd || 0;
        return acc;
      },
      {
        baseExentaVes: 0,
        baseImponibleVes: 0,
        ivaVes: 0,
        igtfVes: 0,
        totalVes: 0,
        totalUsd: 0,
      }
    );
  }, [filteredSales]);

  // Exportar Libro de Ventas en CSV reglamentario SENIAT
  const handleExportCsv = () => {
    if (!isAdmin) {
      if (showToast) {
        showToast("🔒 Solo los usuarios con rol Administrador tienen permiso para exportar el Libro de Ventas.");
      }
      return;
    }

    if (sales.length === 0) return;

    const headers = [
      "Operacion_Nro",
      "Fecha",
      "Nro_Factura",
      "Nro_Control",
      "RIF_Cliente",
      "Nombre_Cliente",
      "Total_Ventas_Incluyendo_IVA_VES",
      "Ventas_Exentas_VES",
      "Base_Imponible_16_VES",
      "Impuesto_IVA_16_VES",
      "Percepcion_IGTF_3_VES",
      "Total_USD",
      "Tasa_BCV",
      "Forma_Pago",
      "SmartPOS_Ref",
      "SmartPOS_Lote",
    ];

    const rows = filteredSales.map((s, idx) => [
      idx + 1,
      s.fecha,
      `"${s.numero_factura}"`,
      `"${s.numero_control}"`,
      `"${s.cliente_rif}"`,
      `"${(s.cliente_nombre || "Consumidor Final").replace(/"/g, '""')}"`,
      (s.total_ves ?? 0).toFixed(2),
      (s.base_exenta_ves ?? 0).toFixed(2),
      (s.base_imponible_ves ?? 0).toFixed(2),
      (s.iva_ves ?? 0).toFixed(2),
      (s.igtf_ves ?? 0).toFixed(2),
      (s.total_usd ?? 0).toFixed(2),
      (s.tasa_bcv_aplicada ?? bcvRate ?? 36.5).toFixed(2),
      `"${s.metodo_pago}"`,
      `"${s.pos_referencia || ""}"`,
      `"${s.pos_lote || ""}"`,
    ]);

    const csvContent =
      "\uFEFF" + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute(
      "download",
      `libro_ventas_fiscal_seniat_${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setJustExported(true);
    if (showToast) {
      showToast("📥 Libro de ventas exportado con éxito a Excel/CSV.");
    }
  };

  const handleExecuteClear = () => {
    if (!isAdmin) {
      if (showToast) {
        showToast("🔒 Solo los usuarios con rol Administrador tienen permiso para vaciar el Libro de Ventas.");
      }
      return;
    }

    if (onClearSales) {
      onClearSales();
    }
    setIsClearConfirmOpen(false);
    setJustExported(false);
    if (showToast) {
      showToast("🗑️ Libro de ventas vaciado correctamente para el nuevo período.");
    }
  };

  return (
    <div className="space-y-4">
      {/* Top Banner SENIAT */}
      <div className="bg-[#12141a] border border-slate-800 rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <FileText className="w-5 h-5 text-blue-400" />
              Libro de Ventas Fiscal Digital (SENIAT Providencia SNAT/00071)
            </h2>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
              {sales.length} Facturas Registradas
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Registro cronológico con base imponible (16% IVA), percepciones IGTF (3%) y auditoría ECR SmartPOS.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {isAdmin ? (
            <>
              <button
                type="button"
                onClick={handleExportCsv}
                disabled={sales.length === 0}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:hover:bg-emerald-600 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-colors shadow-md shadow-emerald-950/40 cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Exportar a Excel/CSV (SENIAT)</span>
              </button>

              <button
                type="button"
                onClick={() => setIsClearConfirmOpen(true)}
                disabled={sales.length === 0}
                className="px-3.5 py-2 rounded-xl bg-rose-950/60 hover:bg-rose-900/80 border border-rose-600/50 text-rose-300 disabled:opacity-30 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                title="Limpiar todas las ventas registradas del período actual"
              >
                <Trash2 className="w-4 h-4 text-rose-400" />
                <span>Limpiar Libro</span>
              </button>
            </>
          ) : (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900/80 border border-slate-800 text-slate-400 text-xs font-mono">
              <Lock className="w-3.5 h-3.5 text-amber-400" />
              <span>Exportación y limpieza reservadas al Administrador</span>
            </div>
          )}
        </div>
      </div>

      {/* Banner de Sugerencia Tras Exportar (Solo Admin) */}
      {isAdmin && justExported && sales.length > 0 && (
        <div className="bg-gradient-to-r from-emerald-950/80 via-[#18261e] to-[#121a15] border border-emerald-500/50 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xl animate-fadeIn">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 shrink-0">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-emerald-200">
                ¡Libro de Ventas descargado con éxito!
              </h4>
              <p className="text-[11px] text-emerald-300/80 mt-0.5">
                Ya tienes tu copia de seguridad. ¿Deseas vaciar el registro del libro para comenzar el nuevo mes/período en cero?
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setJustExported(false)}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold cursor-pointer"
            >
              Mantener Ventas
            </button>
            <button
              type="button"
              onClick={() => setIsClearConfirmOpen(true)}
              className="px-4 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-rose-950/40 cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Sí, Limpiar Ahora</span>
            </button>
          </div>
        </div>
      )}

      {/* Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-[#14161f] border border-slate-800 p-3.5 rounded-xl">
          <div className="text-[11px] text-slate-400 font-medium">Ventas Totales (Bs.)</div>
          <div className="text-base font-bold text-white font-mono mt-0.5">
            Bs. {(totals?.totalVes ?? 0).toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">
            ≈ ${(totals?.totalUsd ?? 0).toFixed(2)} USD
          </div>
        </div>

        <div className="bg-[#14161f] border border-slate-800 p-3.5 rounded-xl">
          <div className="text-[11px] text-slate-400 font-medium">Base Imponible (16%)</div>
          <div className="text-base font-bold text-blue-300 font-mono mt-0.5">
            Bs. {(totals?.baseImponibleVes ?? 0).toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">Gravado al 16%</div>
        </div>

        <div className="bg-[#14161f] border border-slate-800 p-3.5 rounded-xl">
          <div className="text-[11px] text-slate-400 font-medium">Total IVA Débito Fiscal</div>
          <div className="text-base font-bold text-purple-300 font-mono mt-0.5">
            Bs. {(totals?.ivaVes ?? 0).toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">Para Declaración SENIAT</div>
        </div>

        <div className="bg-[#14161f] border border-slate-800 p-3.5 rounded-xl">
          <div className="text-[11px] text-slate-400 font-medium">Percepciones IGTF (3%)</div>
          <div className="text-base font-bold text-amber-300 font-mono mt-0.5">
            Bs. {(totals?.igtfVes ?? 0).toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">Cobro en Divisas / Cripto</div>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="bg-[#14161f] border border-slate-800 p-3 rounded-xl flex flex-col sm:flex-row items-center gap-3 justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por N° Factura, Control, RIF o Cliente..."
            className="w-full bg-[#0e1017] border border-slate-700 rounded-lg pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:border-blue-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <span className="text-xs text-slate-400 font-medium">Forma de Pago:</span>
          <select
            value={filterPayment}
            onChange={(e) => setFilterPayment(e.target.value)}
            className="bg-[#0e1017] border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white focus:border-blue-500"
          >
            <option value="TODOS">Todas las formas</option>
            <option value="Punto de Venta">Punto de Venta (SmartPOS)</option>
            <option value="Pago Móvil">Pago Móvil</option>
            <option value="Divisas en Efectivo">Divisas en Efectivo</option>
            <option value="Bolívares en Efectivo">Bolívares en Efectivo</option>
            <option value="Transferencia Bancaria">Transferencia Bancaria</option>
            <option value="Criptoactivos">Criptoactivos</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-[#12141a] border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto max-h-[500px]">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-[#181b24] text-slate-400 uppercase text-[10px] tracking-wider sticky top-0 z-10 border-b border-slate-800">
              <tr>
                <th className="px-3.5 py-3">Fecha / Hora</th>
                <th className="px-3.5 py-3">N° Factura</th>
                <th className="px-3.5 py-3">N° Control</th>
                <th className="px-3.5 py-3">Cliente / RIF</th>
                <th className="px-3.5 py-3 text-right">Base Imponible</th>
                <th className="px-3.5 py-3 text-right">IVA (16%)</th>
                <th className="px-3.5 py-3 text-right">IGTF (3%)</th>
                <th className="px-3.5 py-3 text-right">Total Facturado</th>
                <th className="px-3.5 py-3 text-center">Pago / SmartPOS</th>
                <th className="px-3.5 py-3 text-center">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {filteredSales.length === 0 ? (
                <tr>
                  <td colSpan={10} className="text-center py-12 text-slate-500 font-sans">
                    <Receipt className="w-8 h-8 mx-auto mb-2 opacity-40 text-slate-400" />
                    No hay facturas registradas en este período o filtro.
                  </td>
                </tr>
              ) : (
                filteredSales.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="px-3.5 py-2.5 text-slate-400 whitespace-nowrap">
                      {s.fecha}
                    </td>
                    <td className="px-3.5 py-2.5 font-bold text-white whitespace-nowrap">
                      {s.numero_factura}
                    </td>
                    <td className="px-3.5 py-2.5 text-slate-300 whitespace-nowrap">
                      {s.numero_control}
                    </td>
                    <td className="px-3.5 py-2.5 font-sans whitespace-nowrap">
                      <div className="font-bold text-slate-200">{s.cliente_nombre}</div>
                      <div className="text-[10px] text-slate-400 font-mono">{s.cliente_rif}</div>
                    </td>
                    <td className="px-3.5 py-2.5 text-right text-slate-300">
                      Bs. {(s.base_imponible_ves || 0).toFixed(2)}
                    </td>
                    <td className="px-3.5 py-2.5 text-right text-purple-300">
                      Bs. {(s.iva_ves || 0).toFixed(2)}
                    </td>
                    <td className="px-3.5 py-2.5 text-right text-amber-300">
                      {s.igtf_ves && s.igtf_ves > 0 ? `Bs. ${s.igtf_ves.toFixed(2)}` : "-"}
                    </td>
                    <td className="px-3.5 py-2.5 text-right font-bold text-emerald-400">
                      <div>Bs. {(s.total_ves || 0).toFixed(2)}</div>
                      <div className="text-[10px] text-slate-400 font-normal">
                        ${(s.total_usd || 0).toFixed(2)}
                      </div>
                    </td>
                    <td className="px-3.5 py-2.5 text-center font-sans whitespace-nowrap">
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-950/60 text-blue-300 border border-blue-800/60">
                        {s.metodo_pago}
                      </span>
                      {s.pos_referencia && (
                        <div className="text-[9px] text-slate-400 font-mono mt-0.5">
                          Ref: {s.pos_referencia}
                        </div>
                      )}
                    </td>
                    <td className="px-3.5 py-2.5 text-center font-sans">
                      <button
                        type="button"
                        onClick={() => setSelectedSale(s)}
                        className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1 mx-auto transition-colors"
                        title="Ver Comprobante Fiscal Completo"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Ver</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Ver / Imprimir Factura */}
      {selectedSale && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[#12141a] border border-slate-700 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh] my-auto">
            <div className="bg-[#181b24] px-4 py-3 border-b border-slate-800 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2 text-white font-bold text-sm">
                <Receipt className="w-4 h-4 text-blue-400" />
                <span>Comprobante Fiscal Digital • {selectedSale.numero_factura}</span>
              </div>
              <button
                onClick={() => setSelectedSale(null)}
                className="text-slate-400 hover:text-white p-1"
              >
                ✕
              </button>
            </div>

            <div className="p-4 overflow-y-auto space-y-3 font-mono text-xs text-slate-200 flex-1 min-h-0">
              <div className="bg-white text-black p-4 rounded-xl shadow font-mono text-[11px] space-y-1.5 leading-tight">
                <div className="text-center font-bold text-xs uppercase border-b pb-1">
                  {getStoredEmisorFiscal().razon_social}
                </div>
                <div className="text-center text-[10px]">
                  RIF: {getStoredEmisorFiscal().rif} • Providencia SNAT/00071
                </div>
                <div className="text-center text-[9px] text-gray-700">
                  {getStoredEmisorFiscal().direccion_fiscal}
                </div>
                <div className="text-center text-[9px] text-gray-700 border-b pb-1">
                  Teléfono: {getStoredEmisorFiscal().telefono}
                </div>

                <div className="flex justify-between font-bold pt-1">
                  <span>FACTURA: {selectedSale.numero_factura}</span>
                  <span>CONTROL: {selectedSale.numero_control}</span>
                </div>
                <div className="text-[10px] text-gray-700">
                  Fecha: {selectedSale.fecha}
                </div>

                <div className="border-t border-b py-1 my-1">
                  <div>CLIENTE: {selectedSale.cliente_nombre}</div>
                  <div>RIF/C.I.: {selectedSale.cliente_rif}</div>
                  <div>DIR: {selectedSale.cliente_direccion || "Caracas, Venezuela"}</div>
                </div>

                {/* Items */}
                <div className="space-y-0.5 py-1">
                  <div className="flex justify-between font-bold text-[10px] border-b pb-0.5">
                    <span>DESCRIPCIÓN</span>
                    <span>TOTAL (Bs)</span>
                  </div>
                  {selectedSale.items?.map((it, idx) => {
                    const rateToUse = selectedSale.tasa_bcv_aplicada ?? bcvRate ?? 36.5;
                    const subtotalItem = it.subtotal ?? 0;
                    return (
                      <div key={idx} className="flex justify-between text-[10px]">
                        <span>
                          {it.cantidad ?? 1}x {it.nombre} {(it.alicuota_iva ?? 16) > 0 ? "(G)" : "(E)"}
                        </span>
                        <span>
                          Bs. {(subtotalItem * rateToUse).toFixed(2)}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {/* Totals */}
                <div className="border-t pt-1 space-y-0.5 text-right font-bold">
                  {(selectedSale.base_exenta_ves ?? 0) > 0 && (
                    <div className="flex justify-between text-gray-700 font-normal">
                      <span>BASE EXENTA (E):</span>
                      <span>Bs. {(selectedSale.base_exenta_ves ?? 0).toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-gray-700 font-normal">
                    <span>BASE IMPONIBLE (G 16%):</span>
                    <span>Bs. {(selectedSale.base_imponible_ves ?? 0).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-gray-700 font-normal">
                    <span>IVA (16%):</span>
                    <span>Bs. {(selectedSale.iva_ves ?? 0).toFixed(2)}</span>
                  </div>
                  {selectedSale.igtf_ves && selectedSale.igtf_ves > 0 ? (
                    <div className="flex justify-between text-amber-800 font-normal">
                      <span>PERCEPCIÓN IGTF (3%):</span>
                      <span>Bs. {(selectedSale.igtf_ves ?? 0).toFixed(2)}</span>
                    </div>
                  ) : null}

                  <div className="flex justify-between font-bold text-xs pt-1 border-t text-black">
                    <span>TOTAL FACTURA:</span>
                    <span>Bs. {(selectedSale.total_ves ?? 0).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-[10px] text-gray-600 font-normal">
                    <span>TOTAL EQUIVALENTE USD:</span>
                    <span>${(selectedSale.total_usd ?? 0).toFixed(2)}</span>
                  </div>
                  <div className="text-[9px] text-gray-500 font-normal">
                    Tasa Oficial BCV: Bs. {(selectedSale.tasa_bcv_aplicada ?? bcvRate ?? 36.5).toFixed(2)}
                  </div>
                </div>

                {/* Forma de Pago & ECR */}
                <div className="border-t pt-1 text-[10px] text-gray-800">
                  <div>FORMA DE PAGO: {selectedSale.metodo_pago}</div>
                  {selectedSale.pos_referencia && (
                    <div className="text-[9px] text-gray-600 font-mono">
                      SmartPOS Ref: {selectedSale.pos_referencia} | Lote: {selectedSale.pos_lote || "001"} | Aprob: {selectedSale.pos_aprobacion || "OK"}
                    </div>
                  )}
                </div>

                <div className="text-center text-[9px] text-gray-500 pt-2 border-t mt-2">
                  *** COMPROBANTE FISCAL CONFORME A DERECHO ***
                </div>
              </div>
            </div>

            <div className="bg-[#181b24] px-4 py-3 border-t border-slate-800 flex items-center justify-between shrink-0">
              <button
                type="button"
                onClick={() => setSelectedSale(null)}
                className="px-4 py-1.5 rounded-lg bg-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-700"
              >
                Cerrar
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center gap-1.5 shadow"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Imprimir Comprobante</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL DE CONFIRMACIÓN: LIMPIAR LIBRO DE VENTAS */}
      {/* ========================================================= */}
      {isClearConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn overflow-y-auto">
          <div className="bg-[#12141c] border border-rose-500/50 rounded-3xl max-w-md w-full overflow-hidden shadow-2xl p-6 space-y-4 my-auto max-h-[90vh] flex flex-col">
            <div className="flex items-center gap-3.5 text-rose-400">
              <div className="p-3 rounded-2xl bg-rose-500/15 border border-rose-500/40 shrink-0">
                <Trash2 className="w-7 h-7 text-rose-400" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white tracking-tight">
                  ¿Vaciar el Libro de Ventas?
                </h3>
                <p className="text-xs text-rose-300/80">
                  Limpieza de registros para nuevo período fiscal
                </p>
              </div>
            </div>

            <div className="space-y-2 text-xs text-slate-300 bg-[#161822] p-4 rounded-2xl border border-slate-800">
              <p className="leading-relaxed">
                Esta acción eliminará los <strong>{sales.length} registros de facturas</strong> almacenados actualmente en el Libro de Ventas local.
              </p>
              <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-[11px] flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
                <span>
                  <strong>Recomendación:</strong> Asegúrate de haber descargado el archivo en Excel/CSV previamente para tus archivos contables.
                </span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setIsClearConfirmOpen(false)}
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold cursor-pointer transition-colors"
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={handleExecuteClear}
                className="px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-rose-950/50 cursor-pointer transition-all active:scale-[0.98]"
              >
                <Trash2 className="w-4 h-4" />
                <span>Sí, Vaciar Libro</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
