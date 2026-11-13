import React, { useState, useMemo, useDeferredValue } from "react";
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
  User,
  FolderArchive,
  RotateCcw,
  KeyRound,
} from "lucide-react";
import { getStoredEmisorFiscal, verifyAdminPin } from "../mockDb";
import { openInvoicesFolder, downloadTodayInvoicesZip, downloadInvoiceTicketTxt } from "../services/invoiceStorageService";
import {
  useResizableColumns,
  ColumnResizeHandle,
  ColumnConfiguratorToolbar,
  ColumnDef,
} from "./ColumnResizer";
import { usePagination, TablePagination } from "./TablePagination";

interface SalesBookViewProps {
  sales: Venta[];
  bcvRate: number;
  onClearSales?: () => void;
  onVoidSale?: (saleId: number, motivo: string, autorizador?: string) => void;
  showToast?: (msg: string) => void;
  currentUser?: SystemUser;
}

export const SalesBookView: React.FC<SalesBookViewProps> = ({
  sales,
  bcvRate,
  onClearSales,
  onVoidSale,
  showToast,
  currentUser,
}) => {
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const [filterPayment, setFilterPayment] = useState<string>("TODOS");
  const [selectedSale, setSelectedSale] = useState<Venta | null>(null);
  const [isClearConfirmOpen, setIsClearConfirmOpen] = useState(false);
  const [justExported, setJustExported] = useState(false);

  // Estados para Módulo de Devoluciones / Notas de Crédito / Anulación (Punto 4)
  const [saleToVoid, setSaleToVoid] = useState<Venta | null>(null);
  const [voidReason, setVoidReason] = useState<string>("Devolución de mercancía por el cliente");
  const [voidAdminPin, setVoidAdminPin] = useState<string>("");
  const [voidError, setVoidError] = useState<string>("");

  const isAdmin = currentUser ? currentUser.rol === "ADMIN" : false;
  const canAuthorizeDirect = currentUser
    ? currentUser.rol === "ADMIN" || currentUser.rol === "SUPERVISOR"
    : false;

  const salesBookColumns = useMemo<ColumnDef[]>(
    () => [
      { key: "fecha", label: "Fecha / Hora / Operador", defaultWidth: 145, minWidth: 95, maxWidth: 280 },
      { key: "factura", label: "N° Factura / Estado", defaultWidth: 145, minWidth: 95, maxWidth: 280 },
      { key: "control", label: "N° Control", defaultWidth: 120, minWidth: 80, maxWidth: 240 },
      { key: "cliente", label: "Cliente / RIF", defaultWidth: 220, minWidth: 120, maxWidth: 480 },
      { key: "base", label: "Base Imponible", defaultWidth: 125, minWidth: 85, maxWidth: 240 },
      { key: "iva", label: "IVA (16%)", defaultWidth: 115, minWidth: 80, maxWidth: 220 },
      { key: "igtf", label: "IGTF (3%)", defaultWidth: 105, minWidth: 75, maxWidth: 220 },
      { key: "total", label: "Total Facturado", defaultWidth: 135, minWidth: 95, maxWidth: 260 },
      { key: "pago", label: "Pago / Desglose", defaultWidth: 185, minWidth: 115, maxWidth: 380 },
      { key: "acciones", label: "Acciones", defaultWidth: 135, minWidth: 95, maxWidth: 240 },
    ],
    []
  );

  const colResizer = useResizableColumns("sales_book", salesBookColumns);

  const filteredSales = useMemo(() => {
    const q = deferredSearch.trim().toLowerCase();
    return sales.filter((s) => {
      const matchesPayment =
        filterPayment === "TODOS" ||
        (filterPayment === "ANULADAS" ? s.estado === "ANULADA" : s.metodo_pago === filterPayment);
      const matchesSearch =
        !q ||
        s.numero_factura.toLowerCase().includes(q) ||
        s.numero_control.toLowerCase().includes(q) ||
        s.cliente_nombre.toLowerCase().includes(q) ||
        s.cliente_rif.toLowerCase().includes(q) ||
        (s.nota_credito && s.nota_credito.toLowerCase().includes(q));

      return matchesPayment && matchesSearch;
    });
  }, [sales, filterPayment, deferredSearch]);

  const pagination = usePagination(filteredSales, 50, "sales_book");

  // Totales netos acumulados del libro (excluyendo facturas anuladas con Nota de Crédito)
  const totals = useMemo(() => {
    return filteredSales.reduce(
      (acc, s) => {
        if (s.estado === "ANULADA") {
          acc.voidedCount += 1;
          acc.voidedVes += s.total_ves || 0;
          acc.voidedUsd += s.total_usd || 0;
          return acc;
        }
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
        voidedCount: 0,
        voidedVes: 0,
        voidedUsd: 0,
      }
    );
  }, [filteredSales]);

  const handleOpenVoidModal = (sale: Venta) => {
    setSaleToVoid(sale);
    setVoidReason("Devolución de mercancía por el cliente");
    setVoidAdminPin("");
    setVoidError("");
  };

  const handleConfirmVoidSale = (e: React.FormEvent) => {
    e.preventDefault();
    if (!saleToVoid || !onVoidSale) return;

    if (!voidReason.trim()) {
      setVoidError("Debe indicar el motivo fiscal de la Nota de Crédito / devolución.");
      return;
    }

    // Si es cajero regular, exigir PIN de Administrador
    if (!canAuthorizeDirect) {
      if (!voidAdminPin.trim()) {
        setVoidError("Ingrese el PIN de Administrador o Supervisor para autorizar la devolución.");
        return;
      }
      if (!verifyAdminPin(voidAdminPin.trim())) {
        setVoidError("❌ PIN de autorización incorrecto.");
        return;
      }
    }

    onVoidSale(
      saleToVoid.id,
      voidReason.trim(),
      canAuthorizeDirect
        ? `${currentUser?.nombre_completo} (${currentUser?.rol})`
        : "Autorizado con PIN Admin"
    );

    // Si estaba abierto el modal de detalle de esa misma venta, actualizarlo o cerrarlo
    if (selectedSale && selectedSale.id === saleToVoid.id) {
      setSelectedSale(null);
    }
    setSaleToVoid(null);
    setVoidAdminPin("");
    setVoidError("");
  };

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
      "Estado_Fiscal",
      "Nota_Credito_Asociada",
      "Usuario_Operador",
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

    const rows = filteredSales.map((s, idx) => {
      const sign = s.estado === "ANULADA" ? -1 : 1;
      return [
        idx + 1,
        s.fecha,
        `"${s.numero_factura}"`,
        `"${s.numero_control}"`,
        `"${s.estado || "ACTIVA"}"`,
        `"${s.nota_credito || ""}"`,
        `"${s.usuario || "Caja Principal"}"`,
        `"${s.cliente_rif}"`,
        `"${(s.cliente_nombre || "Consumidor Final").replace(/"/g, '""')}"`,
        ((s.total_ves ?? 0) * sign).toFixed(2),
        ((s.base_exenta_ves ?? 0) * sign).toFixed(2),
        ((s.base_imponible_ves ?? 0) * sign).toFixed(2),
        ((s.iva_ves ?? 0) * sign).toFixed(2),
        ((s.igtf_ves ?? 0) * sign).toFixed(2),
        ((s.total_usd ?? 0) * sign).toFixed(2),
        (s.tasa_bcv_aplicada ?? bcvRate ?? 36.5).toFixed(2),
        `"${s.metodo_pago}"`,
        `"${s.pos_referencia || ""}"`,
        `"${s.pos_lote || ""}"`,
      ];
    });

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
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <FileText className="w-5 h-5 text-blue-400" />
              Libro de Ventas Fiscal Digital (SENIAT Providencia SNAT/00071)
            </h2>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
              {sales.length} Facturas Registradas
            </span>
            {totals.voidedCount > 0 && (
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-rose-500/15 text-rose-400 border border-rose-500/30">
                {totals.voidedCount} Notas de Crédito / Anuladas
              </span>
            )}
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Registro cronológico con base imponible (16% IVA), percepciones IGTF (3%), multipagos y Notas de Crédito con reintegro de stock.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {isAdmin ? (
            <>
              <button
                type="button"
                onClick={async () => {
                  const opened = await openInvoicesFolder();
                  if (!opened) {
                    downloadTodayInvoicesZip();
                    showToast?.("📥 Descargando archivo ZIP con las facturas emitidas...");
                  } else {
                    showToast?.("📂 Carpeta 'facturas_emitidas' abierta en el sistema.");
                  }
                }}
                className="px-3.5 py-2 rounded-xl bg-amber-600/20 hover:bg-amber-600/30 border border-amber-500/40 text-amber-300 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors shadow-sm cursor-pointer"
                title="Abrir carpeta local en disco con las facturas guardadas por fecha y hora o descargar ZIP"
              >
                <FolderArchive className="w-4 h-4 text-amber-400" />
                <span>Facturas Guardadas (Carpeta)</span>
              </button>

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
          <div className="text-[11px] text-slate-400 font-medium">Ventas Netas Activas (Bs.)</div>
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
          <div className="text-[10px] text-slate-400 mt-0.5">Cobro en Divisas / Mixto</div>
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
            placeholder="Buscar Factura, Control, Nota de Crédito, RIF o Cliente..."
            className="w-full bg-[#0e1017] border border-slate-700 rounded-lg pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:border-blue-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <span className="text-xs text-slate-400 font-medium">Filtrar por:</span>
          <select
            value={filterPayment}
            onChange={(e) => setFilterPayment(e.target.value)}
            className="bg-[#0e1017] border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white focus:border-blue-500"
          >
            <option value="TODOS">Todas las facturas</option>
            <option value="Pago Mixto ($ + Bs)">Pago Mixto ($ + Bs)</option>
            <option value="Punto de Venta">Punto de Venta (SmartPOS)</option>
            <option value="Pago Móvil">Pago Móvil</option>
            <option value="Divisas en Efectivo">Divisas en Efectivo</option>
            <option value="Transferencia Bs">Transferencia Bs</option>
            <option value="Criptoactivos">Criptoactivos</option>
            <option value="ANULADAS">Notas de Crédito / Anuladas</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-[#12141a] border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <ColumnConfiguratorToolbar
          controller={colResizer}
          title="Configurar Tamaño de Columnas • Libro de Ventas Fiscal"
        />
        <div className="overflow-x-auto max-h-[500px]">
          <table
            data-resizable-table={colResizer.tableId}
            className="w-full text-left text-xs border-collapse"
          >
            <thead className="bg-[#181b24] text-slate-400 uppercase text-[10px] tracking-wider sticky top-0 z-10 border-b border-slate-800">
              <tr>
                <th data-col="fecha" className="px-3.5 py-3 relative">
                  <span className="pr-2">Fecha / Hora</span>
                  <ColumnResizeHandle
                    colKey="fecha"
                    resizingCol={colResizer.resizingCol}
                    onStartResize={colResizer.startResize}
                  />
                </th>
                <th data-col="factura" className="px-3.5 py-3 relative">
                  <span className="pr-2">N° Factura / Estado</span>
                  <ColumnResizeHandle
                    colKey="factura"
                    resizingCol={colResizer.resizingCol}
                    onStartResize={colResizer.startResize}
                  />
                </th>
                <th data-col="control" className="px-3.5 py-3 relative">
                  <span className="pr-2">N° Control</span>
                  <ColumnResizeHandle
                    colKey="control"
                    resizingCol={colResizer.resizingCol}
                    onStartResize={colResizer.startResize}
                  />
                </th>
                <th data-col="cliente" className="px-3.5 py-3 relative">
                  <span className="pr-2">Cliente / RIF</span>
                  <ColumnResizeHandle
                    colKey="cliente"
                    resizingCol={colResizer.resizingCol}
                    onStartResize={colResizer.startResize}
                  />
                </th>
                <th data-col="base" className="px-3.5 py-3 text-right relative">
                  <span className="pr-2">Base Imponible</span>
                  <ColumnResizeHandle
                    colKey="base"
                    resizingCol={colResizer.resizingCol}
                    onStartResize={colResizer.startResize}
                  />
                </th>
                <th data-col="iva" className="px-3.5 py-3 text-right relative">
                  <span className="pr-2">IVA (16%)</span>
                  <ColumnResizeHandle
                    colKey="iva"
                    resizingCol={colResizer.resizingCol}
                    onStartResize={colResizer.startResize}
                  />
                </th>
                <th data-col="igtf" className="px-3.5 py-3 text-right relative">
                  <span className="pr-2">IGTF (3%)</span>
                  <ColumnResizeHandle
                    colKey="igtf"
                    resizingCol={colResizer.resizingCol}
                    onStartResize={colResizer.startResize}
                  />
                </th>
                <th data-col="total" className="px-3.5 py-3 text-right relative">
                  <span className="pr-2">Total Facturado</span>
                  <ColumnResizeHandle
                    colKey="total"
                    resizingCol={colResizer.resizingCol}
                    onStartResize={colResizer.startResize}
                  />
                </th>
                <th data-col="pago" className="px-3.5 py-3 text-center relative">
                  <span className="pr-2">Pago / Desglose</span>
                  <ColumnResizeHandle
                    colKey="pago"
                    resizingCol={colResizer.resizingCol}
                    onStartResize={colResizer.startResize}
                  />
                </th>
                <th data-col="acciones" className="px-3.5 py-3 text-center relative">
                  <span className="pr-2">Acciones</span>
                  <ColumnResizeHandle
                    colKey="acciones"
                    resizingCol={colResizer.resizingCol}
                    onStartResize={colResizer.startResize}
                  />
                </th>
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
                pagination.paginatedItems.map((s) => {
                  const isVoided = s.estado === "ANULADA";
                  return (
                    <tr
                      key={s.id}
                      className={`transition-colors ${
                        isVoided
                          ? "bg-rose-950/15 hover:bg-rose-950/25 opacity-80"
                          : "hover:bg-slate-800/40"
                      }`}
                    >
                      <td data-col="fecha" className="px-3.5 py-2.5 text-slate-400 whitespace-nowrap truncate">
                        <div>{s.fecha}</div>
                        {s.usuario && (
                          <div className="text-[10px] text-blue-400/90 font-sans flex items-center gap-1 mt-0.5 truncate">
                            <User className="w-3 h-3 text-blue-400 shrink-0" />
                            <span className="truncate">{s.usuario}</span>
                          </div>
                        )}
                      </td>
                      <td data-col="factura" className="px-3.5 py-2.5 whitespace-nowrap truncate">
                        <div className={`font-bold ${isVoided ? "text-rose-400 line-through" : "text-white"}`}>
                          {s.numero_factura}
                        </div>
                        {isVoided ? (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold bg-rose-950/90 text-rose-300 border border-rose-700/60 mt-0.5">
                            ANULADA • {s.nota_credito}
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-sans font-semibold bg-emerald-950/60 text-emerald-400 border border-emerald-800/40 mt-0.5">
                            ACTIVA
                          </span>
                        )}
                      </td>
                      <td data-col="control" className="px-3.5 py-2.5 text-slate-300 whitespace-nowrap truncate">
                        {s.numero_control}
                      </td>
                      <td data-col="cliente" className="px-3.5 py-2.5 font-sans whitespace-nowrap truncate">
                        <div className="font-bold text-slate-200 truncate">{s.cliente_nombre}</div>
                        <div className="text-[10px] text-slate-400 font-mono truncate">{s.cliente_rif}</div>
                      </td>
                      <td data-col="base" className={`px-3.5 py-2.5 text-right ${isVoided ? "text-slate-500 line-through" : "text-slate-300"}`}>
                        Bs. {(s.base_imponible_ves || 0).toFixed(2)}
                      </td>
                      <td data-col="iva" className={`px-3.5 py-2.5 text-right ${isVoided ? "text-slate-500 line-through" : "text-purple-300"}`}>
                        Bs. {(s.iva_ves || 0).toFixed(2)}
                      </td>
                      <td data-col="igtf" className={`px-3.5 py-2.5 text-right ${isVoided ? "text-slate-500 line-through" : "text-amber-300"}`}>
                        {s.igtf_ves && s.igtf_ves > 0 ? `Bs. ${s.igtf_ves.toFixed(2)}` : "-"}
                      </td>
                      <td data-col="total" className="px-3.5 py-2.5 text-right font-bold">
                        <div className={isVoided ? "text-rose-400 line-through" : "text-emerald-400"}>
                          Bs. {(s.total_ves || 0).toFixed(2)}
                        </div>
                        <div className="text-[10px] text-slate-400 font-normal">
                          ${(s.total_usd || 0).toFixed(2)}
                        </div>
                      </td>
                      <td data-col="pago" className="px-3.5 py-2.5 text-center font-sans whitespace-nowrap truncate">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${
                            s.metodo_pago === "Pago Mixto ($ + Bs)"
                              ? "bg-emerald-950/70 text-emerald-300 border-emerald-700/60"
                              : "bg-blue-950/60 text-blue-300 border-blue-800/60"
                          }`}
                        >
                          {s.metodo_pago}
                        </span>
                        {s.pagos_mixtos && s.pagos_mixtos.length > 0 && (
                          <div className="text-[9px] text-emerald-300/90 font-mono mt-1 space-y-0.5">
                            {s.pagos_mixtos.map((pm, idx) => (
                              <div key={idx} className="truncate">
                                {pm.moneda === "USD"
                                  ? `$${pm.monto_usd.toFixed(2)} (${pm.metodo})`
                                  : `Bs.${pm.monto_ves.toFixed(2)} (${pm.metodo})`}
                              </div>
                            ))}
                          </div>
                        )}
                        {s.pos_referencia && (
                          <div className="text-[9px] text-slate-400 font-mono mt-0.5 truncate">
                            Ref: {s.pos_referencia}
                          </div>
                        )}
                      </td>
                      <td data-col="acciones" className="px-3.5 py-2.5 text-center font-sans">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => setSelectedSale(s)}
                            className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                            title="Ver Comprobante Fiscal Completo"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Ver</span>
                          </button>

                          {!isVoided && onVoidSale && (
                            <button
                              type="button"
                              onClick={() => handleOpenVoidModal(s)}
                              className="px-2 py-1 rounded-lg bg-rose-950/60 hover:bg-rose-900/80 border border-rose-700/50 text-rose-300 text-[11px] font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                              title="Emitir Nota de Crédito / Devolución y reintegrar stock al inventario"
                            >
                              <RotateCcw className="w-3 h-3 text-rose-400" />
                              <span>N.C.</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        <TablePagination
          currentPage={pagination.currentPage}
          pageSize={pagination.pageSize}
          totalPages={pagination.totalPages}
          totalItems={pagination.totalItems}
          startIndex={pagination.startIndex}
          endIndex={pagination.endIndex}
          onPageChange={pagination.setCurrentPage}
          onPageSizeChange={pagination.setPageSize}
          itemLabel="facturas"
        />
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
              {/* Si la factura está ANULADA, mostrar banner de Nota de Crédito */}
              {selectedSale.estado === "ANULADA" && (
                <div className="bg-rose-950/80 border border-rose-500/60 rounded-xl p-3 text-xs font-sans text-rose-200 space-y-1">
                  <div className="font-bold text-rose-300 flex items-center gap-1.5">
                    <RotateCcw className="w-4 h-4 text-rose-400" />
                    <span>FACTURA ANULADA • NOTA DE CRÉDITO {selectedSale.nota_credito}</span>
                  </div>
                  <div className="text-[11px]">
                    <strong>Motivo:</strong> {selectedSale.motivo_anulacion || "Devolución de mercancía"}
                  </div>
                  <div className="text-[10px] text-rose-300/80 flex justify-between">
                    <span>Autorizado por: {selectedSale.usuario_anulacion}</span>
                    <span>Fecha: {selectedSale.fecha_anulacion}</span>
                  </div>
                </div>
              )}

              {/* Tarjeta de Auditoría: Usuario / Operador responsable */}
              <div className="bg-[#181d27] border border-blue-900/60 rounded-xl p-3 flex items-center justify-between text-xs font-sans shadow-sm">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center shrink-0 border border-blue-500/30">
                    <User className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block uppercase font-semibold tracking-wider">
                      Operador / Usuario
                    </span>
                    <span className="text-white font-bold font-mono text-xs">
                      {selectedSale.usuario || "Caja Principal (admin)"}
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-slate-400 block uppercase font-semibold tracking-wider">
                    Fecha y Hora
                  </span>
                  <span className="text-slate-300 font-mono text-[11px]">
                    {selectedSale.fecha_hora || selectedSale.fecha}
                  </span>
                </div>
              </div>

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

                {selectedSale.estado === "ANULADA" && (
                  <div className="bg-red-100 border border-red-400 text-red-900 p-1.5 rounded text-center font-bold text-[10px] my-1">
                    DOCUMENTO ANULADO POR NOTA DE CRÉDITO: {selectedSale.nota_credito}
                  </div>
                )}

                <div className="flex justify-between font-bold pt-1">
                  <span>FACTURA: {selectedSale.numero_factura}</span>
                  <span>CONTROL: {selectedSale.numero_control}</span>
                </div>
                <div className="flex justify-between text-[10px] text-gray-700">
                  <span>Fecha: {selectedSale.fecha_hora || selectedSale.fecha}</span>
                  <span>Cajero: <strong>{selectedSale.usuario || "Caja Principal"}</strong></span>
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

                {/* Forma de Pago, Multipago, ECR y Cajero Responsable */}
                <div className="border-t pt-1 text-[10px] text-gray-800">
                  <div className="flex justify-between">
                    <span>FORMA DE PAGO: {selectedSale.metodo_pago}</span>
                    <span>OPERADOR: <strong>{selectedSale.usuario || "Caja Principal"}</strong></span>
                  </div>
                  {selectedSale.pagos_mixtos && selectedSale.pagos_mixtos.length > 0 && (
                    <div className="bg-gray-100 border border-gray-300 rounded p-1.5 my-1 space-y-0.5 text-[9.5px]">
                      <div className="font-bold">DESGLOSE DE PAGO MIXTO:</div>
                      {selectedSale.pagos_mixtos.map((pm, idx) => (
                        <div key={idx} className="flex justify-between">
                          <span>
                            • {pm.metodo} {pm.referencia ? `(Ref: ${pm.referencia})` : ""}:
                          </span>
                          <span className="font-bold">
                            ${pm.monto_usd.toFixed(2)} / Bs. {pm.monto_ves.toFixed(2)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                  {selectedSale.pos_referencia && (
                    <div className="text-[9px] text-gray-600 font-mono mt-0.5">
                      Ref: {selectedSale.pos_referencia} {selectedSale.pos_lote ? `| Lote: ${selectedSale.pos_lote}` : ""}
                    </div>
                  )}
                </div>

                <div className="text-center text-[9px] text-gray-500 pt-2 border-t mt-2">
                  <div>*** COMPROBANTE FISCAL CONFORME A DERECHO ***</div>
                  <div className="text-[8px] text-gray-400 mt-0.5">
                    📁 Archivado automáticamente en disco en carpeta con fecha y hora local
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-[#181b24] px-4 py-3 border-t border-slate-800 flex items-center justify-between flex-wrap gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setSelectedSale(null)}
                className="px-4 py-1.5 rounded-lg bg-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-700 cursor-pointer"
              >
                Cerrar
              </button>

              <div className="flex items-center gap-2 flex-wrap">
                {selectedSale.estado !== "ANULADA" && onVoidSale && (
                  <button
                    type="button"
                    onClick={() => handleOpenVoidModal(selectedSale)}
                    className="px-3 py-1.5 rounded-lg bg-rose-950/70 hover:bg-rose-900 border border-rose-600/50 text-rose-300 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                    title="Emitir Nota de Crédito y devolver stock al inventario"
                  >
                    <RotateCcw className="w-3.5 h-3.5 text-rose-400" />
                    <span>Anular / Nota de Crédito</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => {
                    downloadInvoiceTicketTxt(selectedSale);
                    showToast?.("📄 Descargando copia del ticket en formato .TXT...");
                  }}
                  className="px-3 py-1.5 rounded-lg bg-slate-700/80 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                  title="Descargar copia del ticket en formato de texto (.txt)"
                >
                  <Download className="w-3.5 h-3.5 text-slate-400" />
                  <span>Ticket (.TXT)</span>
                </button>

                <button
                  type="button"
                  onClick={async () => {
                    const opened = await openInvoicesFolder();
                    if (!opened) {
                      showToast?.("📂 Carpeta 'facturas_emitidas' en el servidor local.");
                    } else {
                      showToast?.("📂 Carpeta de facturas abierta en tu explorador.");
                    }
                  }}
                  className="px-3 py-1.5 rounded-lg bg-amber-600/20 hover:bg-amber-600/30 border border-amber-500/40 text-amber-300 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                  title="Abrir carpeta local 'facturas_emitidas' en el Explorador de Windows"
                >
                  <FolderArchive className="w-3.5 h-3.5 text-amber-400" />
                  <span>Carpeta Local</span>
                </button>

                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center gap-1.5 shadow cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Imprimir Comprobante</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL DE EMISIÓN DE NOTA DE CRÉDITO / ANULACIÓN (PUNTO 4) */}
      {/* ========================================================= */}
      {saleToVoid && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn overflow-y-auto">
          <div className="bg-[#12141c] border border-rose-500/50 rounded-3xl max-w-md w-full overflow-hidden shadow-2xl p-6 space-y-4 my-auto max-h-[92vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-3 text-rose-400">
                <div className="p-2.5 rounded-2xl bg-rose-500/15 border border-rose-500/40 shrink-0">
                  <RotateCcw className="w-6 h-6 text-rose-400" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white tracking-tight">
                    Emitir Nota de Crédito / Devolución
                  </h3>
                  <p className="text-[11px] text-rose-300/80 font-mono">
                    Factura Original N° {saleToVoid.numero_factura}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSaleToVoid(null)}
                className="text-slate-400 hover:text-white text-xs font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleConfirmVoidSale} className="space-y-3.5 text-xs overflow-y-auto pr-1">
              <div className="bg-[#161822] border border-slate-800 rounded-2xl p-3.5 space-y-2">
                <div className="flex justify-between text-slate-300">
                  <span>Cliente:</span>
                  <strong className="text-white">{saleToVoid.cliente_nombre}</strong>
                </div>
                <div className="flex justify-between text-slate-300">
                  <span>Monto a Reversar:</span>
                  <strong className="text-rose-400 font-mono">
                    Bs. {(saleToVoid.total_ves || 0).toFixed(2)} (${(saleToVoid.total_usd || 0).toFixed(2)})
                  </strong>
                </div>
                <div className="border-t border-slate-800 pt-2 mt-1">
                  <div className="text-[10px] font-bold text-emerald-400 uppercase mb-1">
                    📦 Productos que reingresarán automáticamente al Stock y Kardex:
                  </div>
                  <div className="max-h-24 overflow-y-auto space-y-1 text-[11px] text-slate-300 font-mono">
                    {saleToVoid.items.map((it, idx) => (
                      <div key={idx} className="flex justify-between">
                        <span>• {it.nombre}</span>
                        <span className="text-emerald-400 font-bold">+{it.cantidad} und</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1.5">
                  Motivo Fiscal de la Nota de Crédito / Devolución:
                </label>
                <div className="grid grid-cols-2 gap-1.5 mb-2">
                  {[
                    "Devolución de mercancía por el cliente",
                    "Error en digitación de factura",
                    "Cambio de método de pago",
                    "Producto con defecto / garantía",
                  ].map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setVoidReason(m)}
                      className={`p-1.5 rounded-lg border text-[10px] text-left font-medium transition-colors cursor-pointer ${
                        voidReason === m
                          ? "bg-rose-950/80 border-rose-500 text-rose-200"
                          : "bg-[#161822] border-slate-800 text-slate-400 hover:text-white"
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
                <input
                  type="text"
                  required
                  value={voidReason}
                  onChange={(e) => setVoidReason(e.target.value)}
                  placeholder="Especifique el motivo de la anulación..."
                  className="w-full bg-[#161822] border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-rose-500"
                />
              </div>

              {!canAuthorizeDirect && (
                <div className="p-3 rounded-xl bg-amber-950/30 border border-amber-500/40 space-y-2">
                  <label className="block text-amber-300 font-semibold flex items-center gap-1.5">
                    <KeyRound className="w-3.5 h-3.5 text-amber-400" />
                    <span>PIN de Autorización (Administrador / Supervisor):</span>
                  </label>
                  <input
                    type="password"
                    value={voidAdminPin}
                    onChange={(e) => {
                      setVoidAdminPin(e.target.value);
                      setVoidError("");
                    }}
                    placeholder="Ingrese PIN de Administrador..."
                    className="w-full bg-[#0e1017] border border-amber-500/50 rounded-xl px-3 py-2 text-white font-mono text-center tracking-widest focus:outline-none focus:border-amber-400"
                  />
                </div>
              )}

              {voidError && (
                <div className="p-2.5 rounded-xl bg-rose-950/60 border border-rose-500/50 text-rose-300 text-[11px] font-medium">
                  {voidError}
                </div>
              )}

              <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setSaleToVoid(null)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-rose-950/50 cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Confirmar Nota de Crédito y Reintegrar Stock</span>
                </button>
              </div>
            </form>
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
