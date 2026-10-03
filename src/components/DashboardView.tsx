import React, { useMemo, useState } from "react";
import { Producto, Venta, SystemUser } from "../types";
import { ROLE_PERMISSIONS } from "../mockDb";
import { DateRangePicker, DateRangeValue } from "./DateRangePicker";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import {
  TrendingUp,
  DollarSign,
  Package,
  Percent,
  Calendar,
  Layers,
  ArrowUpRight,
  Sparkles,
  ShoppingBag,
  ShieldCheck,
  Award,
  AlertCircle,
  HelpCircle,
  Lock,
} from "lucide-react";

interface DashboardViewProps {
  sales: Venta[];
  products: Producto[];
  bcvRate: number;
  currentUser?: SystemUser;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  sales,
  products,
  bcvRate,
  currentUser,
}) => {
  const [currencyMode, setCurrencyMode] = useState<"VES" | "USD">("USD");
  const [dateRange, setDateRange] = useState<DateRangeValue>({
    preset: "all",
    startDate: "",
    endDate: "",
  });

  const permissions = useMemo(() => {
    const role = currentUser?.rol || "CAJERO";
    return ROLE_PERMISSIONS[role] || ROLE_PERMISSIONS.CAJERO;
  }, [currentUser]);

  // Lookup map for products by ID
  const productMap = useMemo(() => {
    const map = new Map<number, Producto>();
    products.forEach((p) => map.set(p.id, p));
    return map;
  }, [products]);

  // Filter sales by date range interval
  const filteredSales = useMemo(() => {
    if (dateRange.preset === "all" && !dateRange.startDate && !dateRange.endDate) {
      return sales;
    }

    return sales.filter((s) => {
      // Obtain sale date string (YYYY-MM-DD)
      const rawDateStr = s.fecha || (s.fecha_hora ? s.fecha_hora.split(" ")[0] : "");
      if (!rawDateStr) return true;

      // Clean date string to standard YYYY-MM-DD
      const saleDateClean = rawDateStr.length >= 10 ? rawDateStr.slice(0, 10) : rawDateStr;

      if (dateRange.startDate && saleDateClean < dateRange.startDate) {
        return false;
      }
      if (dateRange.endDate && saleDateClean > dateRange.endDate) {
        return false;
      }
      return true;
    });
  }, [sales, dateRange]);

  // Daily Sales Volume Data (VES / USD)
  const dailySalesData = useMemo(() => {
    const map = new Map<
      string,
      { fecha: string; totalUsd: number; totalVes: number; count: number }
    >();

    filteredSales.forEach((sale) => {
      const rawDate = sale.fecha || (sale.fecha_hora ? sale.fecha_hora.split(" ")[0] : "S/F");
      const existing = map.get(rawDate) || {
        fecha: rawDate,
        totalUsd: 0,
        totalVes: 0,
        count: 0,
      };

      const usd = sale.total_usd || sale.total || 0;
      const ves = sale.total_ves || (usd * (sale.tasa_bcv || bcvRate));

      existing.totalUsd += usd;
      existing.totalVes += ves;
      existing.count += 1;
      map.set(rawDate, existing);
    });

    return Array.from(map.values())
      .sort((a, b) => a.fecha.localeCompare(b.fecha))
      .map((d) => ({
        ...d,
        displayDate: d.fecha.length >= 10 ? d.fecha.slice(5) : d.fecha,
        totalUsd: parseFloat(d.totalUsd.toFixed(2)),
        totalVes: parseFloat(d.totalVes.toFixed(2)),
      }));
  }, [filteredSales, bcvRate]);

  // Top 5 Most Sold Products
  const topProductsData = useMemo(() => {
    const itemMap = new Map<
      string,
      {
        nombre: string;
        producto_id: number;
        unidadesVendidas: number;
        ingresoUsd: number;
        ingresoVes: number;
        pmpCostoUnitario: number;
        costoTotalUsd: number;
      }
    >();

    filteredSales.forEach((sale) => {
      const rate = sale.tasa_bcv || bcvRate;
      sale.items.forEach((item) => {
        const key = item.nombre || `Producto ${item.producto_id}`;
        const existing = itemMap.get(key) || {
          nombre: key,
          producto_id: item.producto_id,
          unidadesVendidas: 0,
          ingresoUsd: 0,
          ingresoVes: 0,
          pmpCostoUnitario: 0,
          costoTotalUsd: 0,
        };

        const prod = productMap.get(item.producto_id);
        const pmp = prod?.costo_promedio || prod?.costo_promedio_ponderado || prod?.precio_costo || (item.precio_unitario * 0.7);

        const subtotalUsd = item.subtotal || item.cantidad * item.precio_unitario;
        existing.unidadesVendidas += item.cantidad;
        existing.ingresoUsd += subtotalUsd;
        existing.ingresoVes += subtotalUsd * rate;
        existing.pmpCostoUnitario = pmp;
        existing.costoTotalUsd += item.cantidad * pmp;

        itemMap.set(key, existing);
      });
    });

    const sorted = Array.from(itemMap.values())
      .sort((a, b) => b.unidadesVendidas - a.unidadesVendidas)
      .slice(0, 5);

    return sorted.map((item) => {
      const margenMonto = item.ingresoUsd - item.costoTotalUsd;
      const margenPorcentaje =
        item.ingresoUsd > 0
          ? ((item.ingresoUsd - item.costoTotalUsd) / item.ingresoUsd) * 100
          : 0;

      return {
        ...item,
        nombreCorto: item.nombre.length > 22 ? item.nombre.slice(0, 20) + "..." : item.nombre,
        ingresoUsd: parseFloat(item.ingresoUsd.toFixed(2)),
        ingresoVes: parseFloat(item.ingresoVes.toFixed(2)),
        margenMontoUsd: parseFloat(margenMonto.toFixed(2)),
        margenMontoVes: parseFloat((margenMonto * bcvRate).toFixed(2)),
        margenPorcentaje: parseFloat(margenPorcentaje.toFixed(1)),
      };
    });
  }, [filteredSales, productMap, bcvRate]);

  // Global Margin Metrics (Calculated using PMP Art. 177 LISLR)
  const marginMetrics = useMemo(() => {
    let totalIngresosUsd = 0;
    let totalCostoPmpUsd = 0;
    let totalUnidadesVendidas = 0;

    filteredSales.forEach((sale) => {
      sale.items.forEach((item) => {
        const prod = productMap.get(item.producto_id);
        const pmp = prod?.costo_promedio || prod?.costo_promedio_ponderado || prod?.precio_costo || (item.precio_unitario * 0.7);
        const subtotal = item.subtotal || item.cantidad * item.precio_unitario;

        totalIngresosUsd += subtotal;
        totalCostoPmpUsd += item.cantidad * pmp;
        totalUnidadesVendidas += item.cantidad;
      });
    });

    const gananciaBrutaUsd = totalIngresosUsd - totalCostoPmpUsd;
    const margenBrutoPorcentaje =
      totalIngresosUsd > 0 ? (gananciaBrutaUsd / totalIngresosUsd) * 100 : 0;
    const markupSobrePmp =
      totalCostoPmpUsd > 0 ? (gananciaBrutaUsd / totalCostoPmpUsd) * 100 : 0;

    return {
      totalIngresosUsd: parseFloat(totalIngresosUsd.toFixed(2)),
      totalIngresosVes: parseFloat((totalIngresosUsd * bcvRate).toFixed(2)),
      totalCostoPmpUsd: parseFloat(totalCostoPmpUsd.toFixed(2)),
      totalCostoPmpVes: parseFloat((totalCostoPmpUsd * bcvRate).toFixed(2)),
      gananciaBrutaUsd: parseFloat(gananciaBrutaUsd.toFixed(2)),
      gananciaBrutaVes: parseFloat((gananciaBrutaUsd * bcvRate).toFixed(2)),
      margenBrutoPorcentaje: parseFloat(margenBrutoPorcentaje.toFixed(1)),
      markupSobrePmp: parseFloat(markupSobrePmp.toFixed(1)),
      totalUnidadesVendidas,
    };
  }, [filteredSales, productMap, bcvRate]);

  // Margin distribution data by product for visualization
  const marginByProductData = useMemo(() => {
    return topProductsData.map((p) => ({
      nombre: p.nombreCorto,
      nombreCompleto: p.nombre,
      margen: p.margenPorcentaje,
      costoPmp: p.pmpCostoUnitario,
      ingreso: currencyMode === "USD" ? p.ingresoUsd : p.ingresoVes,
      ganancia: currencyMode === "USD" ? p.margenMontoUsd : p.margenMontoVes,
    }));
  }, [topProductsData, currencyMode]);

  const barColors = ["#3b82f6", "#10b981", "#f59e0b", "#8b5cf6", "#ec4899"];

  return (
    <div className="space-y-5" id="dashboard-view-root">
      {/* Header & Controls Bar */}
      <div className="bg-[#1a1d24] border border-slate-800 rounded-2xl p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
              <TrendingUp className="w-5 h-5" />
            </span>
            <div>
              <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
                <span>Dashboard de Rendimiento Comercial</span>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                  PMP Art. 177 LISLR
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Métricas financieras consolidadas, volumen en dualidad monetaria (Bs./$) y análisis de rentabilidad sobre Costo Promedio Ponderado.
                {dateRange.preset !== "all" && (
                  <span className="ml-1.5 inline-flex items-center gap-1 font-semibold text-blue-400">
                    • Filtro activo: {dateRange.startDate && dateRange.endDate ? `${dateRange.startDate} al ${dateRange.endDate}` : dateRange.preset}
                  </span>
                )}
              </p>
            </div>
          </div>
        </div>

        {/* Currency & Date Interval Picker Controls */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Custom & Preset Date Range Picker Component */}
          <DateRangePicker
            value={dateRange}
            onChange={setDateRange}
          />

          {/* Currency Toggle (USD / VES) */}
          <div className="flex items-center bg-[#12141a] p-1 rounded-xl border border-slate-800 text-xs font-mono font-bold">
            <button
              onClick={() => setCurrencyMode("USD")}
              id="dashboard-currency-usd"
              className={`flex items-center gap-1 px-3 py-1.5 rounded-lg transition-all ${
                currencyMode === "USD"
                  ? "bg-emerald-600 text-white shadow-md shadow-emerald-950/50"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <DollarSign className="w-3.5 h-3.5" />
              <span>USD ($)</span>
            </button>
            <button
              onClick={() => setCurrencyMode("VES")}
              id="dashboard-currency-ves"
              className={`flex items-center gap-1 px-3 py-1.5 rounded-lg transition-all ${
                currencyMode === "VES"
                  ? "bg-blue-600 text-white shadow-md shadow-blue-950/50"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <span>VES (Bs.)</span>
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards: Revenue, Cost PMP, Margin & Items Sold */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Card 1: Ingreso Total */}
        <div className="bg-[#1a1d24] border border-slate-800 rounded-xl p-4 flex flex-col justify-between shadow-sm">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-2">
            <span className="font-semibold uppercase tracking-wider text-[11px]">Volumen Total de Ventas</span>
            <span className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <DollarSign className="w-4 h-4" />
            </span>
          </div>
          <div>
            <div className="text-2xl font-black font-mono text-white">
              {currencyMode === "USD" ? (
                <span>${marginMetrics.totalIngresosUsd.toLocaleString("es-VE", { minimumFractionDigits: 2 })}</span>
              ) : (
                <span>Bs. {marginMetrics.totalIngresosVes.toLocaleString("es-VE", { minimumFractionDigits: 2 })}</span>
              )}
            </div>
            <div className="text-xs text-slate-400 font-mono mt-1 flex items-center justify-between">
              <span>Equivalente:</span>
              <span className="text-slate-300 font-bold">
                {currencyMode === "USD"
                  ? `Bs. ${marginMetrics.totalIngresosVes.toLocaleString("es-VE", { minimumFractionDigits: 2 })}`
                  : `$${marginMetrics.totalIngresosUsd.toFixed(2)}`}
              </span>
            </div>
          </div>
          <div className="mt-3 pt-2 border-t border-slate-800/80 text-[11px] text-slate-400 flex items-center justify-between">
            <span>{filteredSales.length} transacciones</span>
            <span className="text-slate-300 font-mono font-medium">{marginMetrics.totalUnidadesVendidas} unidades</span>
          </div>
        </div>

        {/* Card 2: Costo PMP (LISLR) */}
        <div className="bg-[#1a1d24] border border-slate-800 rounded-xl p-4 flex flex-col justify-between shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-2">
            <span className="font-semibold uppercase tracking-wider text-[11px] flex items-center gap-1">
              <span>Costo PMP Total</span>
              <span title="Costo Promedio Ponderado según Art. 177 LISLR">
                <HelpCircle className="w-3 h-3 text-slate-500 inline" />
              </span>
            </span>
            <span className="p-1.5 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20">
              <Layers className="w-4 h-4" />
            </span>
          </div>
          {permissions.puedeVerCostosYMargenes ? (
            <>
              <div>
                <div className="text-2xl font-black font-mono text-slate-200">
                  {currencyMode === "USD" ? (
                    <span>${marginMetrics.totalCostoPmpUsd.toLocaleString("es-VE", { minimumFractionDigits: 2 })}</span>
                  ) : (
                    <span>Bs. {marginMetrics.totalCostoPmpVes.toLocaleString("es-VE", { minimumFractionDigits: 2 })}</span>
                  )}
                </div>
                <div className="text-xs text-slate-400 font-mono mt-1 flex items-center justify-between">
                  <span>Equivalente:</span>
                  <span className="text-slate-300 font-bold">
                    {currencyMode === "USD"
                      ? `Bs. ${marginMetrics.totalCostoPmpVes.toLocaleString("es-VE", { minimumFractionDigits: 2 })}`
                      : `$${marginMetrics.totalCostoPmpUsd.toFixed(2)}`}
                  </span>
                </div>
              </div>
              <div className="mt-3 pt-2 border-t border-slate-800/80 text-[11px] text-slate-400 flex items-center justify-between">
                <span>Método de Valuación:</span>
                <span className="text-blue-400 font-semibold">Art. 177 LISLR</span>
              </div>
            </>
          ) : (
            <div className="py-3 flex flex-col items-center justify-center text-center">
              <Lock className="w-5 h-5 text-slate-500 mb-1" />
              <span className="text-xs font-semibold text-slate-400">Protegido por Rol</span>
              <span className="text-[10px] text-slate-500">Solo Administrador/Supervisor</span>
            </div>
          )}
        </div>

        {/* Card 3: Ganancia Bruta Real */}
        <div className="bg-[#1a1d24] border border-slate-800 rounded-xl p-4 flex flex-col justify-between shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-2">
            <span className="font-semibold uppercase tracking-wider text-[11px]">Utilidad Bruta Calculada</span>
            <span className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <TrendingUp className="w-4 h-4" />
            </span>
          </div>
          {permissions.puedeVerCostosYMargenes ? (
            <>
              <div>
                <div className="text-2xl font-black font-mono text-emerald-400">
                  {currencyMode === "USD" ? (
                    <span>+${marginMetrics.gananciaBrutaUsd.toLocaleString("es-VE", { minimumFractionDigits: 2 })}</span>
                  ) : (
                    <span>+Bs. {marginMetrics.gananciaBrutaVes.toLocaleString("es-VE", { minimumFractionDigits: 2 })}</span>
                  )}
                </div>
                <div className="text-xs text-slate-400 font-mono mt-1 flex items-center justify-between">
                  <span>Equivalente:</span>
                  <span className="text-emerald-300 font-bold">
                    {currencyMode === "USD"
                      ? `Bs. ${marginMetrics.gananciaBrutaVes.toLocaleString("es-VE", { minimumFractionDigits: 2 })}`
                      : `$${marginMetrics.gananciaBrutaUsd.toFixed(2)}`}
                  </span>
                </div>
              </div>
              <div className="mt-3 pt-2 border-t border-slate-800/80 text-[11px] text-slate-400 flex items-center justify-between">
                <span>Fórmula:</span>
                <span className="text-slate-300 font-mono">Ingresos - Costo PMP</span>
              </div>
            </>
          ) : (
            <div className="py-3 flex flex-col items-center justify-center text-center">
              <Lock className="w-5 h-5 text-slate-500 mb-1" />
              <span className="text-xs font-semibold text-slate-400">Protegido por Rol</span>
              <span className="text-[10px] text-slate-500">Solo Administrador/Supervisor</span>
            </div>
          )}
        </div>

        {/* Card 4: Margen % sobre Ventas */}
        <div className="bg-[#1a1d24] border border-slate-800 rounded-xl p-4 flex flex-col justify-between shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-2">
            <span className="font-semibold uppercase tracking-wider text-[11px]">Margen de Ganancia Promedio</span>
            <span className="p-1.5 rounded-lg bg-purple-500/10 text-purple-400 border border-purple-500/20">
              <Percent className="w-4 h-4" />
            </span>
          </div>
          {permissions.puedeVerCostosYMargenes ? (
            <>
              <div>
                <div className="text-2xl font-black font-mono text-purple-300 flex items-baseline gap-1.5">
                  <span>{marginMetrics.margenBrutoPorcentaje}%</span>
                  <span className="text-xs font-normal text-slate-400 font-sans">margen comercial</span>
                </div>
                <div className="text-xs text-slate-400 font-mono mt-1 flex items-center justify-between">
                  <span>Markup s/ PMP:</span>
                  <span className="text-purple-400 font-bold">+{marginMetrics.markupSobrePmp}%</span>
                </div>
              </div>
              <div className="mt-3 pt-2 border-t border-slate-800/80 text-[11px] text-slate-400 flex items-center justify-between">
                <span>Tasa BCV Aplicada:</span>
                <span className="text-slate-200 font-mono font-bold">Bs. {bcvRate.toFixed(2)}</span>
              </div>
            </>
          ) : (
            <div className="py-3 flex flex-col items-center justify-center text-center">
              <Lock className="w-5 h-5 text-slate-500 mb-1" />
              <span className="text-xs font-semibold text-slate-400">Protegido por Rol</span>
              <span className="text-[10px] text-slate-500">Confidencial para Cajero</span>
            </div>
          )}
        </div>
      </div>

      {/* Main Charts Grid: Daily Volume (Bar/Line) & Margin per Top Product */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left Chart (7 cols): Volumen Diario de Ventas en VES y USD */}
        <div className="lg:col-span-7 bg-[#1a1d24] border border-slate-800 rounded-2xl p-4 sm:p-5 flex flex-col shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3 mb-4">
            <div>
              <h3 className="font-bold text-white text-sm flex items-center gap-2">
                <Calendar className="w-4 h-4 text-blue-400" />
                <span>Volumen Diario de Ventas ({currencyMode === "USD" ? "USD $" : "VES Bs."})</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Comportamiento diario de la facturación comercial en moneda seleccionada.
              </p>
            </div>
            <div className="flex items-center gap-3 text-xs font-mono">
              <span className="flex items-center gap-1.5 text-blue-400">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span>
                <span>{currencyMode === "USD" ? "Ventas ($)" : "Ventas (Bs.)"}</span>
              </span>
              <span className="text-slate-400">
                {dailySalesData.length} {dailySalesData.length === 1 ? "día registrado" : "días registrados"}
              </span>
            </div>
          </div>

          {/* Recharts Container */}
          <div className="h-[280px] w-full">
            {dailySalesData.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-500 text-xs">
                <ShoppingBag className="w-8 h-8 mb-2 opacity-40" />
                <p>No hay ventas registradas en el período seleccionado.</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={dailySalesData}
                  margin={{ top: 10, right: 10, left: -10, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#262a36" vertical={false} />
                  <XAxis
                    dataKey="displayDate"
                    stroke="#64748b"
                    fontSize={11}
                    tickLine={false}
                  />
                  <YAxis
                    stroke="#64748b"
                    fontSize={11}
                    tickLine={false}
                    tickFormatter={(val) =>
                      currencyMode === "USD" ? `$${val}` : `${(val / 1000).toFixed(0)}k`
                    }
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#12141a",
                      borderColor: "#334155",
                      borderRadius: "0.75rem",
                      fontSize: "12px",
                      color: "#f8fafc",
                      boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.5)",
                    }}
                    formatter={(val: any) => [
                      currencyMode === "USD"
                        ? `$${Number(val).toFixed(2)} USD`
                        : `Bs. ${Number(val).toLocaleString("es-VE", { minimumFractionDigits: 2 })} VES`,
                      "Volumen Facturado",
                    ]}
                    labelFormatter={(label) => `Fecha: ${label}`}
                  />
                  <Bar
                    dataKey={currencyMode === "USD" ? "totalUsd" : "totalVes"}
                    fill="#3b82f6"
                    radius={[6, 6, 0, 0]}
                    maxBarSize={48}
                  >
                    {dailySalesData.map((_, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={index === dailySalesData.length - 1 ? "#3b82f6" : "#2563eb"}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Mini dual summary footer */}
          <div className="mt-3 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400 font-mono">
            <span className="flex items-center gap-2">
              <span>Tasa de cambio aplicada:</span>
              <strong className="text-slate-200">Bs. {bcvRate.toFixed(2)}/USD</strong>
            </span>
            <span>
              Total período:{" "}
              <strong className="text-white">
                {currencyMode === "USD"
                  ? `$${marginMetrics.totalIngresosUsd.toFixed(2)}`
                  : `Bs. ${marginMetrics.totalIngresosVes.toLocaleString("es-VE", { minimumFractionDigits: 2 })}`}
              </strong>
            </span>
          </div>
        </div>

        {/* Right Chart (5 cols): Margen de Ganancia Calculado sobre PMP */}
        <div className="lg:col-span-5 bg-[#1a1d24] border border-slate-800 rounded-2xl p-4 sm:p-5 flex flex-col shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
            <div>
              <h3 className="font-bold text-white text-sm flex items-center gap-2">
                <Percent className="w-4 h-4 text-purple-400" />
                <span>Margen de Ganancia sobre PMP (%)</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Porcentaje de utilidad bruta por producto respecto al Costo Promedio (LISLR).
              </p>
            </div>
          </div>

          {/* Margins Bar Chart Horizontal or Bars */}
          <div className="h-[280px] w-full">
            {!permissions.puedeVerCostosYMargenes ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-500 text-xs">
                <Lock className="w-8 h-8 mb-2 text-slate-600" />
                <p className="font-semibold text-slate-400">Acceso a Márgenes Restringido</p>
                <p className="text-[11px] text-slate-500">Métricas reservadas para Administrador y Supervisor.</p>
              </div>
            ) : marginByProductData.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-500 text-xs">
                <AlertCircle className="w-8 h-8 mb-2 opacity-40" />
                <p>No hay artículos vendidos para calcular márgenes.</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  layout="vertical"
                  data={marginByProductData}
                  margin={{ top: 5, right: 25, left: 10, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#262a36" horizontal={false} />
                  <XAxis
                    type="number"
                    stroke="#64748b"
                    fontSize={11}
                    tickLine={false}
                    domain={[0, "auto"]}
                    tickFormatter={(v) => `${v}%`}
                  />
                  <YAxis
                    dataKey="nombre"
                    type="category"
                    stroke="#94a3b8"
                    fontSize={11}
                    tickLine={false}
                    width={100}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#12141a",
                      borderColor: "#334155",
                      borderRadius: "0.75rem",
                      fontSize: "12px",
                      color: "#f8fafc",
                    }}
                    formatter={(val: any, name: string, props: any) => [
                      `${val}% (${currencyMode === "USD" ? `$${props.payload.ganancia.toFixed(2)}` : `Bs. ${props.payload.ganancia.toFixed(2)}`} utilidad)`,
                      "Margen sobre Venta",
                    ]}
                    labelFormatter={(_, payload) =>
                      payload[0]?.payload?.nombreCompleto || "Producto"
                    }
                  />
                  <Bar dataKey="margen" radius={[0, 6, 6, 0]} maxBarSize={24}>
                    {marginByProductData.map((_, index) => (
                      <Cell
                        key={`margin-cell-${index}`}
                        fill={barColors[index % barColors.length]}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="mt-3 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
              <span>Cálculo según Art. 177 LISLR</span>
            </span>
            {permissions.puedeVerCostosYMargenes ? (
              <span className="font-mono text-purple-300 font-bold">
                Promedio: {marginMetrics.margenBrutoPorcentaje}%
              </span>
            ) : (
              <span className="text-[11px] text-slate-500 font-mono flex items-center gap-1">
                <Lock className="w-3 h-3" /> Protegido
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Top 5 de Productos Más Vendidos (Detailed Ranking Table & Cards) */}
      <div className="bg-[#1a1d24] border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3.5 mb-4">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Award className="w-4 h-4" />
            </span>
            <div>
              <h3 className="font-bold text-white text-sm">
                Top 5 Productos Más Vendidos
              </h3>
              <p className="text-xs text-slate-400">
                Productos líderes en rotación de inventario con desglose de unidades y facturación.
              </p>
            </div>
          </div>
          <span className="text-xs font-mono text-slate-400">
            Actualizado en tiempo real
          </span>
        </div>

        {topProductsData.length === 0 ? (
          <div className="text-center py-10 text-slate-500 text-xs">
            <Package className="w-10 h-10 mx-auto mb-2 opacity-40" />
            <p>Aún no se registran ventas para generar el ranking.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
                  <th className="py-2.5 px-3 text-center w-12">#</th>
                  <th className="py-2.5 px-3">Producto</th>
                  <th className="py-2.5 px-3 text-center">Unidades</th>
                  <th className="py-2.5 px-3 text-right">Facturación</th>
                  {permissions.puedeVerCostosYMargenes && (
                    <>
                      <th className="py-2.5 px-3 text-right">Costo PMP Unit.</th>
                      <th className="py-2.5 px-3 text-right">Margen (%)</th>
                      <th className="py-2.5 px-3 text-right">Ganancia Total</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {topProductsData.map((item, idx) => {
                  const medalColors = [
                    "text-amber-400 bg-amber-500/20 border-amber-500/40",
                    "text-slate-200 bg-slate-400/20 border-slate-400/40",
                    "text-amber-600 bg-amber-700/20 border-amber-700/40",
                    "text-blue-400 bg-blue-500/20 border-blue-500/40",
                    "text-purple-400 bg-purple-500/20 border-purple-500/40",
                  ];

                  return (
                    <tr
                      key={item.producto_id || idx}
                      className="hover:bg-slate-800/40 transition-colors group"
                    >
                      <td className="py-3 px-3 text-center">
                        <span
                          className={`w-6 h-6 inline-flex items-center justify-center rounded-full text-xs font-bold border ${
                            medalColors[idx] || "text-slate-400 bg-slate-800"
                          }`}
                        >
                          {idx + 1}
                        </span>
                      </td>
                      <td className="py-3 px-3 font-sans">
                        <p className="font-bold text-white text-xs group-hover:text-blue-300 transition-colors">
                          {item.nombre}
                        </p>
                        <p className="text-[10px] text-slate-500 font-mono">
                          ID: #{item.producto_id}
                        </p>
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span className="px-2.5 py-1 rounded-md bg-slate-800 text-slate-200 font-bold text-xs">
                          {item.unidadesVendidas}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right font-bold text-white">
                        {currencyMode === "USD" ? (
                          <span>${item.ingresoUsd.toFixed(2)}</span>
                        ) : (
                          <span>Bs. {item.ingresoVes.toLocaleString("es-VE", { minimumFractionDigits: 2 })}</span>
                        )}
                      </td>
                      {permissions.puedeVerCostosYMargenes && (
                        <>
                          <td className="py-3 px-3 text-right text-slate-300">
                            ${item.pmpCostoUnitario.toFixed(2)}
                          </td>
                          <td className="py-3 px-3 text-right">
                            <span
                              className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                                item.margenPorcentaje >= 30
                                  ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                                  : item.margenPorcentaje >= 15
                                  ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                                  : "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                              }`}
                            >
                              {item.margenPorcentaje}%
                            </span>
                          </td>
                          <td className="py-3 px-3 text-right font-bold text-emerald-400">
                            {currencyMode === "USD" ? (
                              <span>+${item.margenMontoUsd.toFixed(2)}</span>
                            ) : (
                              <span>+Bs. {item.margenMontoVes.toLocaleString("es-VE", { minimumFractionDigits: 2 })}</span>
                            )}
                          </td>
                        </>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
