import React, { useState, useMemo } from "react";
import { Producto, Categoria, RolePermissions } from "../types";
import { getStoredNegocioConfig, getRemoteLicense, verifyAdminPin } from "../mockDb";
import {
  X,
  FileDown,
  Download,
  Copy,
  Printer,
  Check,
  Lock,
  KeyRound,
  ShieldCheck,
  AlertTriangle,
  Package,
  Layers,
  FileSpreadsheet,
  Info,
  ChevronRight,
  Eye,
  EyeOff,
} from "lucide-react";

interface StockExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: Producto[];
  filteredProducts: Producto[];
  categories: Categoria[];
  bcvRate: number;
  isValuationUnlocked: boolean;
  onUnlockValuation: () => void;
  permissions: RolePermissions;
  showToast?: (msg: string) => void;
  currentSearchTerm?: string;
  currentCategoryName?: string;
}

export type ExportScope = "ALL" | "FILTERED" | "IN_STOCK" | "LOW_OR_OUT";

export const StockExportModal: React.FC<StockExportModalProps> = ({
  isOpen,
  onClose,
  products,
  filteredProducts,
  categories,
  bcvRate,
  isValuationUnlocked,
  onUnlockValuation,
  permissions,
  showToast,
  currentSearchTerm,
  currentCategoryName,
}) => {
  if (!isOpen) return null;

  const negocio = getStoredNegocioConfig();
  const licencia = getRemoteLicense();

  // Estados de configuración de exportación
  const [scope, setScope] = useState<ExportScope>(
    filteredProducts.length !== products.length ? "FILTERED" : "ALL"
  );
  const [includeCosts, setIncludeCosts] = useState<boolean>(
    isValuationUnlocked && permissions.puedeVerCostosYMargenes
  );

  // Estados para desbloqueo de PIN de administrador dentro del modal
  const [showPinPrompt, setShowPinPrompt] = useState<boolean>(false);
  const [adminPinInput, setAdminPinInput] = useState<string>("");
  const [pinError, setPinError] = useState<string>("");
  const [copiedTsv, setCopiedTsv] = useState<boolean>(false);
  const [isPrintPreview, setIsPrintPreview] = useState<boolean>(false);

  // Categorías mapa para nombres rápidos
  const categoryMap = useMemo(() => {
    const map = new Map<number | string, string>();
    categories.forEach((c) => map.set(c.id, c.nombre));
    return map;
  }, [categories]);

  // Selección de productos según el alcance seleccionado
  const selectedProducts = useMemo(() => {
    switch (scope) {
      case "FILTERED":
        return filteredProducts;
      case "IN_STOCK":
        return products.filter((p) => (p.stock_actual || 0) > 0);
      case "LOW_OR_OUT":
        return products.filter(
          (p) => (p.stock_actual || 0) <= (p.stock_minimo || 5) || (p.stock_actual || 0) <= 0
        );
      case "ALL":
      default:
        return products;
    }
  }, [scope, products, filteredProducts]);

  // Estadísticas del conjunto a exportar
  const exportStats = useMemo(() => {
    let totalStock = 0;
    let totalCostUsd = 0;
    let totalSaleUsd = 0;
    let itemsInStock = 0;
    let itemsLowStock = 0;
    let itemsOutOfStock = 0;

    selectedProducts.forEach((p) => {
      const stock = p.stock_actual || 0;
      const pmp = p.costo_promedio_ponderado || p.precio_costo || 0;
      const price = p.precio_venta || 0;

      totalStock += stock;
      if (stock > 0) {
        itemsInStock++;
        totalCostUsd += stock * pmp;
        totalSaleUsd += stock * price;
      } else {
        itemsOutOfStock++;
      }

      if (stock > 0 && stock <= (p.stock_minimo || 5)) {
        itemsLowStock++;
      }
    });

    return {
      totalProducts: selectedProducts.length,
      totalPhysicalUnits: totalStock,
      totalCostUsd,
      totalCostVes: totalCostUsd * bcvRate,
      totalSaleUsd,
      totalSaleVes: totalSaleUsd * bcvRate,
      itemsInStock,
      itemsLowStock,
      itemsOutOfStock,
    };
  }, [selectedProducts, bcvRate]);

  // Manejo de verificación de PIN inline
  const handleVerifyPinInline = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const clean = adminPinInput.trim();
    if (!clean) {
      setPinError("Por favor ingrese el PIN de Administrador.");
      return;
    }

    if (!verifyAdminPin(clean)) {
      setPinError("❌ PIN de Administrador incorrecto.");
      return;
    }

    onUnlockValuation();
    setIncludeCosts(true);
    setShowPinPrompt(false);
    setAdminPinInput("");
    setPinError("");
    if (showToast) {
      showToast("🔓 Costos y valuaciones PMP desbloqueados para el reporte.");
    }
  };

  // Helper para escapar valores CSV
  const escapeCsv = (val: any): string => {
    if (val === null || val === undefined) return '""';
    const s = String(val).replace(/"/g, '""');
    return `"${s}"`;
  };

  // Generación y descarga del archivo CSV (compatible con Excel / UTF-8 con BOM)
  const handleDownloadCsv = () => {
    if (selectedProducts.length === 0) {
      if (showToast) showToast("⚠️ No hay productos para exportar en el rango seleccionado.");
      return;
    }

    const allowCosts = includeCosts && (isValuationUnlocked || permissions.puedeVerCostosYMargenes);

    // Cabeceras de columnas
    const headers = [
      "Codigo_Barras",
      "Descripcion_Producto",
      "Categoria",
      "Unidad_Medida",
      "Stock_Fisico_Actual",
      "Stock_Minimo",
      "Estatus_Existencia",
      "Alicuota_IVA",
      "Precio_Venta_USD",
      `Precio_Venta_VES_Tasa_${bcvRate.toFixed(2)}`,
    ];

    if (allowCosts) {
      headers.push(
        "Costo_PMP_USD",
        "Costo_PMP_VES",
        "Margen_Ganancia_Porc",
        "Valuacion_Total_Costo_USD",
        "Valuacion_Total_Costo_VES",
        "Valuacion_Total_Venta_USD",
        "Valuacion_Total_Venta_VES"
      );
    }

    const rows = selectedProducts.map((p) => {
      const stock = p.stock_actual || 0;
      const minStock = p.stock_minimo || 5;
      const catName = p.categoria_nombre || categoryMap.get(p.categoria_id) || "General";
      const priceUsd = p.precio_venta || 0;
      const priceVes = priceUsd * bcvRate;
      const alicuota =
        p.alicuota_iva === 0
          ? "EXENTO (0%)"
          : "GENERAL (16%)";

      let estatus = "OPTIMO";
      if (stock <= 0) estatus = "AGOTADO";
      else if (stock <= minStock) estatus = "STOCK BAJO";

      // Usamos formato ="codigo" para que Excel nunca convierta códigos de barras numéricos a notación científica (7.59E+12)
      const rawBarcode = p.codigo_barras || "";
      const formattedBarcode = rawBarcode ? `="${rawBarcode}"` : '""';

      const baseRow = [
        formattedBarcode,
        escapeCsv(p.nombre),
        escapeCsv(catName),
        escapeCsv(p.unidad_medida || "Pza"),
        stock,
        minStock,
        escapeCsv(estatus),
        escapeCsv(alicuota),
        priceUsd.toFixed(2),
        priceVes.toFixed(2),
      ];

      if (allowCosts) {
        const pmpUsd = p.costo_promedio_ponderado || p.precio_costo || 0;
        const pmpVes = pmpUsd * bcvRate;
        const marginPct = pmpUsd > 0 ? (((priceUsd - pmpUsd) / pmpUsd) * 100).toFixed(1) + "%" : "0.0%";
        const totalCostProdUsd = stock > 0 ? (stock * pmpUsd).toFixed(2) : "0.00";
        const totalCostProdVes = stock > 0 ? (stock * pmpVes).toFixed(2) : "0.00";
        const totalSaleProdUsd = stock > 0 ? (stock * priceUsd).toFixed(2) : "0.00";
        const totalSaleProdVes = stock > 0 ? (stock * priceVes).toFixed(2) : "0.00";

        baseRow.push(
          pmpUsd.toFixed(4),
          pmpVes.toFixed(2),
          escapeCsv(marginPct),
          totalCostProdUsd,
          totalCostProdVes,
          totalSaleProdUsd,
          totalSaleProdVes
        );
      }

      return baseRow.join(",");
    });

    // Fila de Totales al final
    const totalRow = [
      '"TOTALES"',
      `"Total: ${selectedProducts.length} productos"`,
      '""',
      '""',
      exportStats.totalPhysicalUnits,
      '""',
      '""',
      '""',
      '""',
      '""',
    ];

    if (allowCosts) {
      totalRow.push(
        '""',
        '""',
        '""',
        exportStats.totalCostUsd.toFixed(2),
        exportStats.totalCostVes.toFixed(2),
        exportStats.totalSaleUsd.toFixed(2),
        exportStats.totalSaleVes.toFixed(2)
      );
    }
    rows.push(totalRow.join(","));

    // Contenido CSV con BOM (\uFEFF) para visualización correcta de acentos en Microsoft Excel
    const csvContent = "\uFEFF" + [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    const dateStamp = new Date().toISOString().slice(0, 10);
    const cleanBiz = (negocio.nombreComercial || "stock").toLowerCase().replace(/[^a-z0-9]/g, "_");
    link.href = url;
    link.setAttribute("download", `reporte_stock_${cleanBiz}_${dateStamp}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    if (showToast) {
      showToast(`✅ Se exportaron exitosamente ${selectedProducts.length} productos a Excel (CSV).`);
    }
    onClose();
  };

  // Copiar datos en formato TSV (para pegar directamente en Excel con Ctrl+V)
  const handleCopyTsv = () => {
    if (selectedProducts.length === 0) return;
    const allowCosts = includeCosts && (isValuationUnlocked || permissions.puedeVerCostosYMargenes);

    const headers = [
      "Código de Barras",
      "Descripción",
      "Categoría",
      "Unidad",
      "Stock Actual",
      "Stock Mínimo",
      "Estatus",
      "IVA",
      "PVP USD",
      "PVP VES",
    ];

    if (allowCosts) {
      headers.push(
        "Costo PMP USD",
        "Costo PMP VES",
        "Margen %",
        "Valuación Costo USD",
        "Valuación Costo VES",
        "Valuación Venta USD",
        "Valuación Venta VES"
      );
    }

    const lines = [headers.join("\t")];

    selectedProducts.forEach((p) => {
      const stock = p.stock_actual || 0;
      const minStock = p.stock_minimo || 5;
      const catName = p.categoria_nombre || categoryMap.get(p.categoria_id) || "General";
      const priceUsd = p.precio_venta || 0;
      const priceVes = priceUsd * bcvRate;

      let estatus = "ÓPTIMO";
      if (stock <= 0) estatus = "AGOTADO";
      else if (stock <= minStock) estatus = "STOCK BAJO";

      const line = [
        p.codigo_barras || "",
        p.nombre,
        catName,
        p.unidad_medida || "Pza",
        stock,
        minStock,
        estatus,
        p.alicuota_iva === 0 ? "Exento" : `${p.alicuota_iva}%`,
        `$${priceUsd.toFixed(2)}`,
        `Bs. ${priceVes.toFixed(2)}`,
      ];

      if (allowCosts) {
        const pmpUsd = p.costo_promedio_ponderado || p.precio_costo || 0;
        const pmpVes = pmpUsd * bcvRate;
        const marginPct = pmpUsd > 0 ? (((priceUsd - pmpUsd) / pmpUsd) * 100).toFixed(1) + "%" : "0.0%";
        line.push(
          `$${pmpUsd.toFixed(2)}`,
          `Bs. ${pmpVes.toFixed(2)}`,
          marginPct,
          `$${(stock * pmpUsd).toFixed(2)}`,
          `Bs. ${(stock * pmpVes).toFixed(2)}`,
          `$${(stock * priceUsd).toFixed(2)}`,
          `Bs. ${(stock * priceVes).toFixed(2)}`
        );
      }

      lines.push(line.join("\t"));
    });

    navigator.clipboard.writeText(lines.join("\n"));
    setCopiedTsv(true);
    if (showToast) {
      showToast("📋 Datos copiados al portapapeles. ¡Pégalos en Excel o Google Sheets con Ctrl+V!");
    }
    setTimeout(() => setCopiedTsv(false), 2500);
  };

  // Manejador para imprimir el reporte de Toma Física / Auditoría
  const handlePrintDocument = () => {
    window.print();
  };

  const allowCosts = includeCosts && (isValuationUnlocked || permissions.puedeVerCostosYMargenes);

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-[#151821] border border-slate-700/80 rounded-2xl w-full max-w-3xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header Modal */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-gradient-to-r from-blue-950/40 via-[#181c26] to-slate-900/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-500/40 flex items-center justify-center text-blue-400">
              <FileDown className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                <span>Exportar Inventario & Stock Detallado</span>
                <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30">
                  Excel & Auditoría
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                {negocio.nombreComercial || "Mi Negocio Comercial"} • RIF: {negocio.rif || licencia.rif_cedula || "N/A"}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            title="Cerrar ventana"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body Content */}
        <div className="p-4 sm:p-5 space-y-4 overflow-y-auto flex-1 text-xs">
          {/* Vista previa de impresión si está activa */}
          {isPrintPreview ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between bg-blue-950/40 border border-blue-800/60 rounded-xl p-3">
                <div className="flex items-center gap-2 text-blue-300">
                  <Printer className="w-4 h-4 text-blue-400" />
                  <span className="font-semibold text-xs">Vista previa de formato de Auditoría y Conteo Físico</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsPrintPreview(false)}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold cursor-pointer"
                  >
                    Volver a Opciones
                  </button>
                  <button
                    type="button"
                    onClick={handlePrintDocument}
                    className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-md"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>Imprimir / Guardar PDF</span>
                  </button>
                </div>
              </div>

              {/* Contenedor imprimible formal */}
              <div id="printable-stock-report" className="bg-white text-slate-900 rounded-xl p-6 shadow-md font-sans">
                {/* Membrete Oficial */}
                <div className="border-b pb-4 mb-4 flex justify-between items-start">
                  <div>
                    <h1 className="text-base font-bold uppercase tracking-tight text-slate-900">
                      {negocio.razonSocial || negocio.nombreComercial || "INVERSIONES COMERCIALES"}
                    </h1>
                    <p className="text-xs text-slate-600">
                      <strong>RIF:</strong> {negocio.rif || licencia.rif_cedula || "J-00000000-0"}
                    </p>
                    <p className="text-xs text-slate-600">
                      <strong>Dirección:</strong> {negocio.direccion || "Venezuela"}
                    </p>
                    <p className="text-xs text-slate-600">
                      <strong>Teléfono:</strong> {negocio.telefono || "+58 412-0000000"}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="inline-block px-2.5 py-1 bg-slate-100 border border-slate-300 text-slate-800 font-bold text-xs uppercase rounded">
                      Corte Físico de Existencias
                    </span>
                    <p className="text-[11px] text-slate-600 mt-1 font-mono">
                      <strong>Fecha:</strong> {new Date().toLocaleString("es-VE")}
                    </p>
                    <p className="text-[11px] text-slate-600 font-mono">
                      <strong>Tasa Oficial BCV:</strong> Bs. {bcvRate.toFixed(2)} / USD
                    </p>
                  </div>
                </div>

                {/* Resumen Totales Imprimible */}
                <div className="grid grid-cols-4 gap-2 mb-4 text-center">
                  <div className="p-2 border rounded bg-slate-50">
                    <div className="text-[10px] text-slate-500 uppercase">Productos</div>
                    <div className="text-base font-bold text-slate-900">{selectedProducts.length}</div>
                  </div>
                  <div className="p-2 border rounded bg-slate-50">
                    <div className="text-[10px] text-slate-500 uppercase">Unidades Físicas</div>
                    <div className="text-base font-bold text-slate-900">{exportStats.totalPhysicalUnits}</div>
                  </div>
                  <div className="p-2 border rounded bg-slate-50">
                    <div className="text-[10px] text-slate-500 uppercase">Valuación PVP (USD)</div>
                    <div className="text-base font-bold text-emerald-700">${exportStats.totalSaleUsd.toFixed(2)}</div>
                  </div>
                  <div className="p-2 border rounded bg-slate-50">
                    <div className="text-[10px] text-slate-500 uppercase">
                      {allowCosts ? "Valuación PMP (USD)" : "Costo PMP"}
                    </div>
                    <div className="text-base font-bold text-blue-700">
                      {allowCosts ? `$${exportStats.totalCostUsd.toFixed(2)}` : "Confidencial"}
                    </div>
                  </div>
                </div>

                {/* Tabla Imprimible */}
                <div className="overflow-x-auto max-h-[350px] overflow-y-auto border border-slate-200 rounded">
                  <table className="w-full text-left text-[11px] border-collapse">
                    <thead className="bg-slate-100 text-slate-700 border-b border-slate-300 sticky top-0">
                      <tr>
                        <th className="p-1.5 border-r">Cód. Barras</th>
                        <th className="p-1.5 border-r">Descripción</th>
                        <th className="p-1.5 border-r">Categoría</th>
                        <th className="p-1.5 border-r text-center">Und</th>
                        <th className="p-1.5 border-r text-right">Stock</th>
                        <th className="p-1.5 border-r text-right">PVP ($)</th>
                        <th className="p-1.5 border-r text-right">PVP (Bs.)</th>
                        {allowCosts && <th className="p-1.5 border-r text-right">PMP ($)</th>}
                        <th className="p-1.5 text-center">Conteo Físico</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {selectedProducts.map((p, idx) => (
                        <tr key={`print-row-${p.id}-${idx}`} className={idx % 2 === 0 ? "bg-white" : "bg-slate-50/50"}>
                          <td className="p-1.5 font-mono border-r">{p.codigo_barras || "-"}</td>
                          <td className="p-1.5 font-medium border-r">{p.nombre}</td>
                          <td className="p-1.5 border-r text-slate-600">
                            {p.categoria_nombre || categoryMap.get(p.categoria_id) || "General"}
                          </td>
                          <td className="p-1.5 border-r text-center font-mono">{p.unidad_medida || "Pza"}</td>
                          <td className="p-1.5 border-r text-right font-bold font-mono">
                            {p.stock_actual}
                          </td>
                          <td className="p-1.5 border-r text-right font-mono">${(p.precio_venta || 0).toFixed(2)}</td>
                          <td className="p-1.5 border-r text-right font-mono">
                            Bs. {((p.precio_venta || 0) * bcvRate).toFixed(2)}
                          </td>
                          {allowCosts && (
                            <td className="p-1.5 border-r text-right font-mono font-semibold text-blue-800">
                              ${(p.costo_promedio_ponderado || p.precio_costo || 0).toFixed(2)}
                            </td>
                          )}
                          <td className="p-1.5 border-b border-dashed border-slate-300 text-center font-mono text-slate-300">
                            [ &nbsp; &nbsp; &nbsp; &nbsp; ]
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Firmas de Auditoría */}
                <div className="grid grid-cols-2 gap-12 pt-8 mt-6 border-t border-slate-300 text-center text-xs">
                  <div>
                    <div className="border-t border-slate-400 w-3/4 mx-auto pt-1 font-semibold text-slate-800">
                      Responsable de Conteo / Almacén
                    </div>
                    <div className="text-[10px] text-slate-500">Firma y Cédula</div>
                  </div>
                  <div>
                    <div className="border-t border-slate-400 w-3/4 mx-auto pt-1 font-semibold text-slate-800">
                      Administrador / Gerencia
                    </div>
                    <div className="text-[10px] text-slate-500">Aprobación y Visto Bueno</div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <>
              {/* Selector de Alcance (Scope) */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-200 block uppercase tracking-wide">
                  1. Alcance de los Productos a Exportar
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setScope("ALL")}
                    className={`p-3 rounded-xl border text-left transition-all flex items-start justify-between cursor-pointer ${
                      scope === "ALL"
                        ? "bg-blue-600/15 border-blue-500 text-white shadow-sm"
                        : "bg-[#1a1d26] border-slate-800 text-slate-300 hover:border-slate-700"
                    }`}
                  >
                    <div>
                      <div className="font-bold flex items-center gap-1.5">
                        <Package className="w-4 h-4 text-blue-400" />
                        <span>Todo el Catálogo</span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Todos los productos registrados en la base de datos
                      </p>
                    </div>
                    <span className="font-mono font-bold text-xs px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 shrink-0">
                      {products.length}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setScope("FILTERED")}
                    className={`p-3 rounded-xl border text-left transition-all flex items-start justify-between cursor-pointer ${
                      scope === "FILTERED"
                        ? "bg-blue-600/15 border-blue-500 text-white shadow-sm"
                        : "bg-[#1a1d26] border-slate-800 text-slate-300 hover:border-slate-700"
                    }`}
                  >
                    <div>
                      <div className="font-bold flex items-center gap-1.5">
                        <Layers className="w-4 h-4 text-emerald-400" />
                        <span>Filtrados Actuales</span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        {currentSearchTerm || currentCategoryName
                          ? `Filtro activo: "${currentSearchTerm || currentCategoryName}"`
                          : "Según la búsqueda o categoría seleccionada"}
                      </p>
                    </div>
                    <span className="font-mono font-bold text-xs px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 shrink-0">
                      {filteredProducts.length}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setScope("IN_STOCK")}
                    className={`p-3 rounded-xl border text-left transition-all flex items-start justify-between cursor-pointer ${
                      scope === "IN_STOCK"
                        ? "bg-blue-600/15 border-blue-500 text-white shadow-sm"
                        : "bg-[#1a1d26] border-slate-800 text-slate-300 hover:border-slate-700"
                    }`}
                  >
                    <div>
                      <div className="font-bold flex items-center gap-1.5">
                        <ShieldCheck className="w-4 h-4 text-emerald-400" />
                        <span>Solo con Existencia Físca</span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Excluye automáticamente productos en cero (Art. 177 LISLR)
                      </p>
                    </div>
                    <span className="font-mono font-bold text-xs px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 shrink-0">
                      {products.filter((p) => (p.stock_actual || 0) > 0).length}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setScope("LOW_OR_OUT")}
                    className={`p-3 rounded-xl border text-left transition-all flex items-start justify-between cursor-pointer ${
                      scope === "LOW_OR_OUT"
                        ? "bg-blue-600/15 border-blue-500 text-white shadow-sm"
                        : "bg-[#1a1d26] border-slate-800 text-slate-300 hover:border-slate-700"
                    }`}
                  >
                    <div>
                      <div className="font-bold flex items-center gap-1.5">
                        <AlertTriangle className="w-4 h-4 text-amber-400" />
                        <span>Alertas (Bajos o Agotados)</span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Para reposición con proveedores y listas de compra
                      </p>
                    </div>
                    <span className="font-mono font-bold text-xs px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 shrink-0">
                      {
                        products.filter(
                          (p) => (p.stock_actual || 0) <= (p.stock_minimo || 5) || (p.stock_actual || 0) <= 0
                        ).length
                      }
                    </span>
                  </button>
                </div>
              </div>

              {/* 2. Confidencialidad & Costos PMP (Protegido por PIN) */}
              <div className="bg-[#1a1d26] border border-slate-800 rounded-xl p-3.5 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-blue-400" />
                    <span className="font-bold text-slate-200">
                      2. Nivel de Detalle y Confidencialidad (Costos PMP)
                    </span>
                  </div>
                  {isValuationUnlocked ? (
                    <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded flex items-center gap-1">
                      <Check className="w-3 h-3" />
                      <span>PIN Admin Verificado</span>
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold text-amber-400 bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 rounded flex items-center gap-1">
                      <Lock className="w-3 h-3" />
                      <span>Costos Protegidos</span>
                    </span>
                  )}
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1 border-t border-slate-800">
                  <label className="flex items-start gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={includeCosts}
                      onChange={(e) => {
                        if (e.target.checked && !isValuationUnlocked) {
                          setShowPinPrompt(true);
                        } else {
                          setIncludeCosts(e.target.checked);
                        }
                      }}
                      className="mt-0.5 rounded border-slate-700 bg-slate-900 text-blue-600 focus:ring-0"
                    />
                    <div>
                      <span className="text-xs font-semibold text-slate-200">
                        Incluir Costos Promedio PMP, Márgenes % y Valuación Total ($ y Bs.)
                      </span>
                      <p className="text-[11px] text-slate-400">
                        Ideal para el Contador, Auditoría SENIAT (Art. 177 LISLR) o Gerencia.
                      </p>
                    </div>
                  </label>

                  {!isValuationUnlocked && (
                    <button
                      type="button"
                      onClick={() => setShowPinPrompt((prev) => !prev)}
                      className="px-2.5 py-1 rounded bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer self-start sm:self-auto"
                    >
                      <KeyRound className="w-3.5 h-3.5" />
                      <span>{showPinPrompt ? "Ocultar PIN" : "Desbloquear con PIN"}</span>
                    </button>
                  )}
                </div>

                {/* Subformulario de PIN inline si fue solicitado */}
                {showPinPrompt && !isValuationUnlocked && (
                  <form
                    onSubmit={handleVerifyPinInline}
                    className="mt-2 p-3 bg-[#13151b] border border-amber-500/40 rounded-xl space-y-2 animate-in fade-in"
                  >
                    <div className="flex items-center gap-1.5 text-amber-300 text-xs font-bold">
                      <KeyRound className="w-4 h-4 text-amber-400" />
                      <span>Ingrese el PIN de Administrador para autorizar exportación valorada:</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="password"
                        placeholder="PIN de Admin..."
                        value={adminPinInput}
                        onChange={(e) => {
                          setAdminPinInput(e.target.value);
                          if (pinError) setPinError("");
                        }}
                        className="bg-[#181a22] border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 font-mono flex-1"
                        autoFocus
                      />
                      <button
                        type="submit"
                        className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-lg transition cursor-pointer"
                      >
                        Validar
                      </button>
                    </div>
                    {pinError && <p className="text-[11px] text-rose-400 font-semibold">{pinError}</p>}
                  </form>
                )}
              </div>

              {/* 3. Resumen de lo que se va a generar */}
              <div className="bg-[#13151b] border border-slate-800/80 rounded-xl p-3.5 space-y-2">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                  3. Resumen del Reporte a Descargar
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
                  <div className="p-2 bg-[#181a22] border border-slate-800 rounded-lg">
                    <span className="text-[10px] text-slate-400 block">Ítems Seleccionados</span>
                    <span className="text-base font-bold text-white font-mono">{selectedProducts.length}</span>
                  </div>
                  <div className="p-2 bg-[#181a22] border border-slate-800 rounded-lg">
                    <span className="text-[10px] text-slate-400 block">Total Unidades Físicas</span>
                    <span className="text-base font-bold text-emerald-400 font-mono">
                      {exportStats.totalPhysicalUnits}
                    </span>
                  </div>
                  <div className="p-2 bg-[#181a22] border border-slate-800 rounded-lg">
                    <span className="text-[10px] text-slate-400 block">Valuación a Venta (PVP)</span>
                    <span className="text-sm font-bold text-emerald-300 font-mono block">
                      ${exportStats.totalSaleUsd.toFixed(2)}
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono">
                      Bs. {exportStats.totalSaleVes.toFixed(2)}
                    </span>
                  </div>
                  <div className="p-2 bg-[#181a22] border border-slate-800 rounded-lg">
                    <span className="text-[10px] text-slate-400 block">Valuación Costo PMP</span>
                    {allowCosts ? (
                      <>
                        <span className="text-sm font-bold text-blue-300 font-mono block">
                          ${exportStats.totalCostUsd.toFixed(2)}
                        </span>
                        <span className="text-[10px] text-slate-500 font-mono">
                          Bs. {exportStats.totalCostVes.toFixed(2)}
                        </span>
                      </>
                    ) : (
                      <span className="text-xs font-mono text-slate-500 block pt-1">
                        Protegido (PIN)
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 font-mono">
                  <span>Tasa Oficial BCV: Bs. {bcvRate.toFixed(2)}</span>
                  <span>Formato CSV: UTF-8 con BOM (Compatible 100% Excel / Sheets)</span>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 sm:p-5 border-t border-slate-800 bg-[#12141a] flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={handleCopyTsv}
              disabled={selectedProducts.length === 0}
              className="flex-1 sm:flex-none px-3.5 py-2.5 rounded-xl border border-slate-700 bg-slate-800/80 hover:bg-slate-700 text-slate-300 font-semibold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer disabled:opacity-50"
              title="Copiar datos al portapapeles para pegar en Excel con Ctrl+V"
            >
              {copiedTsv ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-slate-400" />}
              <span>{copiedTsv ? "¡Copiado!" : "Copiar Tabla (Ctrl+V)"}</span>
            </button>

            <button
              type="button"
              onClick={() => setIsPrintPreview((prev) => !prev)}
              disabled={selectedProducts.length === 0}
              className="flex-1 sm:flex-none px-3.5 py-2.5 rounded-xl border border-slate-700 bg-slate-800/80 hover:bg-slate-700 text-slate-300 font-semibold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer disabled:opacity-50"
              title="Vista previa de reporte formal imprimible de Toma Física de Inventario"
            >
              <Printer className="w-4 h-4 text-slate-400" />
              <span>{isPrintPreview ? "Opciones" : "Formato Impreso"}</span>
            </button>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs transition cursor-pointer"
            >
              Cerrar
            </button>

            <button
              type="button"
              onClick={handleDownloadCsv}
              disabled={selectedProducts.length === 0}
              className="flex-1 sm:flex-none px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-50 text-white font-bold text-xs shadow-lg shadow-blue-900/40 transition-all flex items-center justify-center gap-2 cursor-pointer hover:scale-[1.02] active:scale-95"
            >
              <Download className="w-4 h-4" />
              <span>Descargar Excel (CSV)</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
