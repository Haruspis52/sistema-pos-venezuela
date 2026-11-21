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

  // Filter sales by date range interval (excluding voided / Credit Note invoices)
  const filteredSales = useMemo(() => {
    const activeSales = sales.filter((s) => s.estado !== "ANULADA");
    if (dateRange.preset === "all" && !dateRange.startDate && !dateRange.endDate) {
      return activeSales;
    }

    return activeSales.filter((s) => {
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

  // Productos vencidos o próximos a vencer en <= 15 días (Punto 6)
  const expiringProducts = useMemo(() => {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);

    const list: Array<{
      product: Producto;
      daysRemaining: number;
      formattedDate: string;
      status: "EXPIRED" | "SOON";
    }> = [];

    products.forEach((p) => {
      if (!p.fecha_vencimiento || !p.fecha_vencimiento.trim()) return;
      const clean = p.fecha_vencimiento.trim().slice(0, 10);
      const parts = clean.split("-");
      if (parts.length !== 3) return;
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      const expDate = new Date(year, month, day, 23, 59, 59, 999);
      if (isNaN(expDate.getTime())) return;

      const diffMs = expDate.getTime() - todayStart.getTime();
      const daysRemaining = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      if (daysRemaining <= 15) {
        list.push({
          product: p,
          daysRemaining,
          formattedDate: `${parts[2]}/${parts[1]}/${parts[0]}`,
          status: daysRemaining < 0 ? "EXPIRED" : "SOON",
        });
      }
    });

    return list.sort((a, b) => a.daysRemaining - b.daysRemaining);
  }, [products]);

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

  const barColors = ["#248F78", "#7B61C9", "#E09F3E", "#68B8A6", "#A592DC"];

  return (
    <div className="space-y-3" id="dashboard-view-root">
      {/* Header & Controls Bar */}
      <div className="faraday-glass-panel rounded-2xl px-3.5 py-2.5 flex flex-col md:flex-row md:items-center justify-between gap-2.5 shadow-sm">
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="p-2 rounded-xl bg-[#7B61C9]/15 text-[#7B61C9] border border-[#7B61C9]/25 shrink-0">
            <TrendingUp className="w-4 h-4" />
          </span>
          <div className="min-w-0">
            <h2 className="text-sm sm:text-base font-extrabold text-[#222629] tracking-tight flex flex-wrap items-center gap-2">
              <span>Dashboard de Rendimiento Comercial</span>
              <span className="text-[10.5px] font-mono font-bold px-2 py-0.5 rounded-md bg-[#248F78]/15 text-[#1D7A66] border border-[#248F78]/30">
                PMP Art. 177 LISLR
              </span>
            </h2>
            <p className="text-[11px] text-[#5C646D] truncate">
              Métricas en dualidad monetaria (Bs./$) y rentabilidad sobre Costo Promedio Ponderado.
              {dateRange.preset !== "all" && (
                <span className="ml-1.5 inline-flex items-center gap-1 font-semibold text-[#7B61C9]">
                  • Filtro: {dateRange.startDate && dateRange.endDate ? `${dateRange.startDate} al ${dateRange.endDate}` : dateRange.preset}
                </span>
              )}
            </p>
          </div>
        </div>

        {/* Currency & Date Interval Picker Controls */}
        <div className="flex items-center gap-2 flex-wrap shrink-0">
          <DateRangePicker
            value={dateRange}
            onChange={setDateRange}
          />

          {/* Currency Toggle (USD / VES) */}
          <div className="flex items-center bg-white/60 p-1 rounded-xl border border-white/75 text-xs font-mono font-bold shadow-xs">
            <button
              type="button"
              onClick={() => setCurrencyMode("USD")}
              id="dashboard-currency-usd"
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                currencyMode === "USD"
                  ? "bg-[#248F78] text-white faraday-keep-white shadow-sm"
                  : "text-[#5C646D] hover:text-[#222629]"
              }`}
            >
              <DollarSign className="w-3.5 h-3.5" />
              <span>USD ($)</span>
            </button>
            <button
              type="button"
              onClick={() => setCurrencyMode("VES")}
              id="dashboard-currency-ves"
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                currencyMode === "VES"
                  ? "bg-[#7B61C9] text-white faraday-keep-white shadow-sm"
                  : "text-[#5C646D] hover:text-[#222629]"
              }`}
            >
              <span>VES (Bs.)</span>
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards: Revenue, Cost PMP, Margin & Items Sold */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Card 1: Ingreso Total */}
        <div className="faraday-glass-card rounded-2xl p-3.5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-[#5C646D] text-xs mb-1.5">
            <span className="font-bold uppercase tracking-wider text-[10.5px]">Volumen Total de Ventas</span>
            <span className="p-1.5 rounded-lg bg-[#248F78]/15 text-[#248F78] border border-[#248F78]/25">
              <DollarSign className="w-3.5 h-3.5" />
            </span>
          </div>
          <div>
            <div className="text-xl sm:text-2xl font-black font-mono text-[#222629] leading-tight">
              {currencyMode === "USD" ? (
                <span>${marginMetrics.totalIngresosUsd.toLocaleString("es-VE", { minimumFractionDigits: 2 })}</span>
              ) : (
                <span>Bs. {marginMetrics.totalIngresosVes.toLocaleString("es-VE", { minimumFractionDigits: 2 })}</span>
              )}
            </div>
            <div className="text-[11px] text-[#5C646D] font-mono mt-0.5 flex items-center justify-between">
              <span>Equivalente:</span>
              <span className="text-[#222629] font-bold">
                {currencyMode === "USD"
                  ? `Bs. ${marginMetrics.totalIngresosVes.toLocaleString("es-VE", { minimumFractionDigits: 2 })}`
                  : `$${marginMetrics.totalIngresosUsd.toFixed(2)}`}
              </span>
            </div>
          </div>
          <div className="mt-2 pt-2 border-t border-[#222629]/10 text-[11px] text-[#5C646D] flex items-center justify-between">
            <span>{filteredSales.length} {filteredSales.length === 1 ? "transacción" : "transacciones"}</span>
            <span className="text-[#222629] font-mono font-bold">{marginMetrics.totalUnidadesVendidas} uds.</span>
          </div>
        </div>

        {/* Card 2: Costo PMP (LISLR) */}
        <div className="faraday-glass-card rounded-2xl p-3.5 flex flex-col justify-between relative overflow-hidden">
          <div className="flex items-center justify-between text-[#5C646D] text-xs mb-1.5">
            <span className="font-bold uppercase tracking-wider text-[10.5px] flex items-center gap-1">
              <span>Costo PMP Total</span>
              <span title="Costo Promedio Ponderado según Art. 177 LISLR">
                <HelpCircle className="w-3 h-3 text-[#5C646D] inline" />
              </span>
            </span>
            <span className="p-1.5 rounded-lg bg-[#7B61C9]/15 text-[#7B61C9] border border-[#7B61C9]/25">
              <Layers className="w-3.5 h-3.5" />
            </span>
          </div>
          {permissions.puedeVerCostosYMargenes ? (
            <>
              <div>
                <div className="text-xl sm:text-2xl font-black font-mono text-[#222629] leading-tight">
                  {currencyMode === "USD" ? (
                    <span>${marginMetrics.totalCostoPmpUsd.toLocaleString("es-VE", { minimumFractionDigits: 2 })}</span>
                  ) : (
                    <span>Bs. {marginMetrics.totalCostoPmpVes.toLocaleString("es-VE", { minimumFractionDigits: 2 })}</span>
                  )}
                </div>
                <div className="text-[11px] text-[#5C646D] font-mono mt-0.5 flex items-center justify-between">
                  <span>Equivalente:</span>
                  <span className="text-[#222629] font-bold">
                    {currencyMode === "USD"
                      ? `Bs. ${marginMetrics.totalCostoPmpVes.toLocaleString("es-VE", { minimumFractionDigits: 2 })}`
                      : `$${marginMetrics.totalCostoPmpUsd.toFixed(2)}`}
                  </span>
                </div>
              </div>
              <div className="mt-2 pt-2 border-t border-[#222629]/10 text-[11px] text-[#5C646D] flex items-center justify-between">
                <span>Valuación:</span>
                <span className="text-[#5B43AB] font-bold">Art. 177 LISLR</span>
              </div>
            </>
          ) : (
            <div className="py-2 flex flex-col items-center justify-center text-center">
              <Lock className="w-4 h-4 text-[#5C646D] mb-1" />
              <span className="text-xs font-semibold text-[#222629]">Protegido por Rol</span>
              <span className="text-[10px] text-[#5C646D]">Solo Administrador/Supervisor</span>
            </div>
          )}
        </div>

        {/* Card 3: Ganancia Bruta Real */}
        <div className="faraday-glass-card rounded-2xl p-3.5 flex flex-col justify-between relative overflow-hidden">
          <div className="flex items-center justify-between text-[#5C646D] text-xs mb-1.5">
            <span className="font-bold uppercase tracking-wider text-[10.5px]">Utilidad Bruta Calculada</span>
            <span className="p-1.5 rounded-lg bg-[#E09F3E]/18 text-[#9A6310] border border-[#E09F3E]/40">
              <TrendingUp className="w-3.5 h-3.5" />
            </span>
          </div>
          {permissions.puedeVerCostosYMargenes ? (
            <>
              <div>
                <div className="text-xl sm:text-2xl font-black font-mono text-[#1D7A66] leading-tight">
                  {currencyMode === "USD" ? (
                    <span>+${marginMetrics.gananciaBrutaUsd.toLocaleString("es-VE", { minimumFractionDigits: 2 })}</span>
                  ) : (
                    <span>+Bs. {marginMetrics.gananciaBrutaVes.toLocaleString("es-VE", { minimumFractionDigits: 2 })}</span>
                  )}
                </div>
                <div className="text-[11px] text-[#5C646D] font-mono mt-0.5 flex items-center justify-between">
                  <span>Equivalente:</span>
                  <span className="text-[#1D7A66] font-bold">
                    {currencyMode === "USD"
                      ? `Bs. ${marginMetrics.gananciaBrutaVes.toLocaleString("es-VE", { minimumFractionDigits: 2 })}`
                      : `$${marginMetrics.gananciaBrutaUsd.toFixed(2)}`}
                  </span>
                </div>
              </div>
              <div className="mt-2 pt-2 border-t border-[#222629]/10 text-[11px] text-[#5C646D] flex items-center justify-between">
                <span>Fórmula:</span>
                <span className="text-[#222629] font-mono font-semibold">Ingresos - Costo PMP</span>
              </div>
            </>
          ) : (
            <div className="py-2 flex flex-col items-center justify-center text-center">
              <Lock className="w-4 h-4 text-[#5C646D] mb-1" />
              <span className="text-xs font-semibold text-[#222629]">Protegido por Rol</span>
              <span className="text-[10px] text-[#5C646D]">Solo Administrador/Supervisor</span>
            </div>
          )}
        </div>

        {/* Card 4: Margen % sobre Ventas */}
        <div className="faraday-glass-card rounded-2xl p-3.5 flex flex-col justify-between relative overflow-hidden">
          <div className="flex items-center justify-between text-[#5C646D] text-xs mb-1.5">
            <span className="font-bold uppercase tracking-wider text-[10.5px]">Margen de Ganancia</span>
            <span className="p-1.5 rounded-lg bg-[#7B61C9]/15 text-[#7B61C9] border border-[#7B61C9]/25">
              <Percent className="w-3.5 h-3.5" />
            </span>
          </div>
          {permissions.puedeVerCostosYMargenes ? (
            <>
              <div>
                <div className="text-xl sm:text-2xl font-black font-mono text-[#5B43AB] flex items-baseline gap-1.5 leading-tight">
                  <span>{marginMetrics.margenBrutoPorcentaje}%</span>
                  <span className="text-[11px] font-medium text-[#5C646D] font-sans">margen comercial</span>
                </div>
                <div className="text-[11px] text-[#5C646D] font-mono mt-0.5 flex items-center justify-between">
                  <span>Markup s/ PMP:</span>
                  <span className="text-[#7B61C9] font-bold">+{marginMetrics.markupSobrePmp}%</span>
                </div>
              </div>
              <div className="mt-2 pt-2 border-t border-[#222629]/10 text-[11px] text-[#5C646D] flex items-center justify-between">
                <span>Tasa BCV:</span>
                <span className="text-[#222629] font-mono font-bold">Bs. {bcvRate.toFixed(2)}/USD</span>
              </div>
            </>
          ) : (
            <div className="py-2 flex flex-col items-center justify-center text-center">
              <Lock className="w-4 h-4 text-[#5C646D] mb-1" />
              <span className="text-xs font-semibold text-[#222629]">Protegido por Rol</span>
              <span className="text-[10px] text-[#5C646D]">Confidencial para Cajero</span>
            </div>
          )}
        </div>
      </div>

      {/* Main Charts Grid: Daily Volume & Margin per Top Product */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
        {/* Left Chart (7 cols): Volumen Diario de Ventas */}
        <div className="lg:col-span-7 faraday-glass-card rounded-2xl p-3.5 flex flex-col">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#222629]/10 pb-2 mb-2.5">
            <div className="flex items-center gap-2 min-w-0">
              <span className="p-1.5 rounded-lg bg-[#248F78]/15 text-[#248F78] border border-[#248F78]/25 shrink-0">
                <Calendar className="w-3.5 h-3.5" />
              </span>
              <div className="min-w-0">
                <h3 className="font-bold text-[#222629] text-xs sm:text-sm leading-tight truncate">
                  Volumen Diario de Ventas ({currencyMode === "USD" ? "USD $" : "VES Bs."})
                </h3>
                <p className="text-[11px] text-[#5C646D] truncate">
                  Facturación diaria en {currencyMode === "USD" ? "dólares" : "bolívares"} • {dailySalesData.length} {dailySalesData.length === 1 ? "día" : "días"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-[11px] font-mono shrink-0">
              <span className="px-2 py-0.5 rounded-md bg-white/70 border border-white/80 text-[#222629] font-bold">
                Total:{" "}
                <span className="text-[#1D7A66]">
                  {currencyMode === "USD"
                    ? `$${marginMetrics.totalIngresosUsd.toFixed(2)}`
                    : `Bs. ${marginMetrics.totalIngresosVes.toLocaleString("es-VE", { minimumFractionDigits: 2 })}`}
                </span>
              </span>
            </div>
          </div>

          {/* Recharts Container (Compact height 195px) */}
          <div className="h-[195px] w-full">
            {dailySalesData.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-[#5C646D] text-xs">
                <ShoppingBag className="w-7 h-7 mb-1.5 opacity-45" />
                <p>No hay ventas registradas en el período seleccionado.</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={dailySalesData}
                  margin={{ top: 6, right: 8, left: -14, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(34, 38, 41, 0.10)" vertical={false} />
                  <XAxis
                    dataKey="displayDate"
                    stroke="#5C646D"
                    fontSize={11}
                    tickLine={false}
                    axisLine={{ stroke: "rgba(34, 38, 41, 0.15)" }}
                  />
                  <YAxis
                    stroke="#5C646D"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(val) =>
                      currencyMode === "USD" ? `$${val}` : `${(val / 1000).toFixed(0)}k`
                    }
                  />
                  <Tooltip
                    cursor={{ fill: "rgba(36, 143, 120, 0.08)" }}
                    contentStyle={{
                      backgroundColor: "rgba(255, 255, 255, 0.96)",
                      borderColor: "rgba(34, 38, 41, 0.12)",
                      borderRadius: "0.75rem",
                      fontSize: "12px",
                      color: "#222629",
                      boxShadow: "0 10px 25px -5px rgba(34, 38, 41, 0.14)",
                    }}
                    labelStyle={{ color: "#5C646D", fontWeight: 700, marginBottom: 2 }}
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
                    fill="#248F78"
                    radius={[6, 6, 0, 0]}
                    maxBarSize={42}
                  >
                    {dailySalesData.map((_, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={index === dailySalesData.length - 1 ? "#248F78" : "#68B8A6"}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Right Chart (5 cols): Margen de Ganancia Calculado sobre PMP */}
        <div className="lg:col-span-5 faraday-glass-card rounded-2xl p-3.5 flex flex-col">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#222629]/10 pb-2 mb-2.5">
            <div className="flex items-center gap-2 min-w-0">
              <span className="p-1.5 rounded-lg bg-[#7B61C9]/15 text-[#7B61C9] border border-[#7B61C9]/25 shrink-0">
                <Percent className="w-3.5 h-3.5" />
              </span>
              <div className="min-w-0">
                <h3 className="font-bold text-[#222629] text-xs sm:text-sm leading-tight truncate">
                  Margen sobre PMP (%)
                </h3>
                <p className="text-[11px] text-[#5C646D] truncate">
                  Utilidad bruta por artículo (Art. 177 LISLR)
                </p>
              </div>
            </div>
            {permissions.puedeVerCostosYMargenes ? (
              <span className="px-2 py-0.5 rounded-md bg-[#7B61C9]/15 border border-[#7B61C9]/30 text-[#5B43AB] text-[11px] font-mono font-bold shrink-0">
                Prom: {marginMetrics.margenBrutoPorcentaje}%
              </span>
            ) : (
              <span className="text-[11px] text-[#5C646D] font-mono flex items-center gap-1 shrink-0">
                <Lock className="w-3 h-3" /> Protegido
              </span>
            )}
          </div>

          {/* Margins Horizontal Bar Chart (Compact height 195px) */}
          <div className="h-[195px] w-full">
            {!permissions.puedeVerCostosYMargenes ? (
              <div className="h-full flex flex-col items-center justify-center text-[#5C646D] text-xs">
                <Lock className="w-7 h-7 mb-1.5 opacity-60" />
                <p className="font-semibold text-[#222629]">Acceso a Márgenes Restringido</p>
                <p className="text-[11px] text-[#5C646D]">Reservado para Administrador y Supervisor.</p>
              </div>
            ) : marginByProductData.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-[#5C646D] text-xs">
                <AlertCircle className="w-7 h-7 mb-1.5 opacity-45" />
                <p>No hay artículos vendidos para calcular márgenes.</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  layout="vertical"
                  data={marginByProductData}
                  margin={{ top: 4, right: 16, left: 0, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(34, 38, 41, 0.10)" horizontal={false} />
                  <XAxis
                    type="number"
                    stroke="#5C646D"
                    fontSize={11}
                    tickLine={false}
                    axisLine={{ stroke: "rgba(34, 38, 41, 0.15)" }}
                    domain={[0, "auto"]}
                    tickFormatter={(v) => `${v}%`}
                  />
                  <YAxis
                    dataKey="nombre"
                    type="category"
                    stroke="#222629"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    width={92}
                  />
                  <Tooltip
                    cursor={{ fill: "rgba(123, 97, 201, 0.08)" }}
                    contentStyle={{
                      backgroundColor: "rgba(255, 255, 255, 0.96)",
                      borderColor: "rgba(34, 38, 41, 0.12)",
                      borderRadius: "0.75rem",
                      fontSize: "12px",
                      color: "#222629",
                      boxShadow: "0 10px 25px -5px rgba(34, 38, 41, 0.14)",
                    }}
                    labelStyle={{ color: "#5C646D", fontWeight: 700, marginBottom: 2 }}
                    formatter={(val: any, _name: string, props: any) => [
                      `${val}% (${currencyMode === "USD" ? `$${props.payload.ganancia.toFixed(2)}` : `Bs. ${props.payload.ganancia.toFixed(2)}`} utilidad)`,
                      "Margen sobre Venta",
                    ]}
                    labelFormatter={(_, payload) =>
                      payload[0]?.payload?.nombreCompleto || "Producto"
                    }
                  />
                  <Bar dataKey="margen" radius={[0, 6, 6, 0]} maxBarSize={22}>
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
        </div>
      </div>

      {/* Bottom Row: Top 5 Products (8 cols) + Batch Expiration Alerts (4 cols) side-by-side */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-stretch">
        {/* Top 5 Productos Más Vendidos (8 cols) */}
        <div className="lg:col-span-8 faraday-glass-card rounded-2xl p-3.5 flex flex-col">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#222629]/10 pb-2 mb-2">
            <div className="flex items-center gap-2 min-w-0">
              <span className="p-1.5 rounded-lg bg-[#E09F3E]/18 text-[#9A6310] border border-[#E09F3E]/40 shrink-0">
                <Award className="w-3.5 h-3.5" />
              </span>
              <div className="min-w-0">
                <h3 className="font-bold text-[#222629] text-xs sm:text-sm leading-tight">
                  Top 5 Productos Más Vendidos
                </h3>
                <p className="text-[11px] text-[#5C646D] truncate">
                  Líderes en rotación con desglose de unidades y rentabilidad
                </p>
              </div>
            </div>
            <span className="text-[10.5px] font-mono text-[#1D7A66] bg-[#248F78]/12 px-2 py-0.5 rounded-md border border-[#248F78]/25 font-semibold shrink-0">
              En tiempo real
            </span>
          </div>

          {topProductsData.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center py-6 text-[#5C646D] text-xs">
              <Package className="w-8 h-8 mb-1.5 opacity-45" />
              <p>Aún no se registran ventas para generar el ranking.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[#222629]/10 text-[#5C646D] font-bold uppercase tracking-wider text-[10px]">
                    <th className="py-1.5 px-2 text-center w-9">#</th>
                    <th className="py-1.5 px-2">Producto</th>
                    <th className="py-1.5 px-2 text-center">Uds.</th>
                    <th className="py-1.5 px-2 text-right">Facturación</th>
                    {permissions.puedeVerCostosYMargenes && (
                      <>
                        <th className="py-1.5 px-2 text-right">Costo PMP</th>
                        <th className="py-1.5 px-2 text-right">Margen</th>
                        <th className="py-1.5 px-2 text-right">Ganancia</th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#222629]/8 font-mono">
                  {topProductsData.map((item, idx) => {
                    const medalColors = [
                      "text-[#9A6310] bg-[#E09F3E]/22 border-[#E09F3E]/50",
                      "text-[#222629] bg-white/80 border-[#5C646D]/30",
                      "text-[#5B43AB] bg-[#7B61C9]/15 border-[#7B61C9]/35",
                      "text-[#1D7A66] bg-[#248F78]/15 border-[#248F78]/35",
                      "text-[#5C646D] bg-white/60 border-white/80",
                    ];

                    return (
                      <tr
                        key={item.producto_id || idx}
                        className="hover:bg-white/55 transition-colors group"
                      >
                        <td className="py-2 px-2 text-center">
                          <span
                            className={`w-5 h-5 inline-flex items-center justify-center rounded-full text-[11px] font-bold border ${
                              medalColors[idx] || "text-[#5C646D] bg-white/60 border-white/80"
                            }`}
                          >
                            {idx + 1}
                          </span>
                        </td>
                        <td className="py-2 px-2 font-sans">
                          <p className="font-bold text-[#222629] text-xs leading-tight group-hover:text-[#7B61C9] transition-colors">
                            {item.nombre}
                          </p>
                          <p className="text-[10px] text-[#5C646D] font-mono">
                            ID: #{item.producto_id}
                          </p>
                        </td>
                        <td className="py-2 px-2 text-center">
                          <span className="px-2 py-0.5 rounded-md bg-white/75 border border-white/80 text-[#222629] font-bold text-xs">
                            {item.unidadesVendidas}
                          </span>
                        </td>
                        <td className="py-2 px-2 text-right font-bold text-[#222629]">
                          {currencyMode === "USD" ? (
                            <span>${item.ingresoUsd.toFixed(2)}</span>
                          ) : (
                            <span>Bs. {item.ingresoVes.toLocaleString("es-VE", { minimumFractionDigits: 2 })}</span>
                          )}
                        </td>
                        {permissions.puedeVerCostosYMargenes && (
                          <>
                            <td className="py-2 px-2 text-right text-[#5C646D]">
                              ${item.pmpCostoUnitario.toFixed(2)}
                            </td>
                            <td className="py-2 px-2 text-right">
                              <span
                                className={`px-1.5 py-0.5 rounded text-[10.5px] font-bold ${
                                  item.margenPorcentaje >= 30
                                    ? "bg-[#248F78]/15 text-[#1D7A66] border border-[#248F78]/30"
                                    : item.margenPorcentaje >= 15
                                    ? "bg-[#E09F3E]/18 text-[#9A6310] border border-[#E09F3E]/40"
                                    : "bg-rose-500/15 text-[#B42E46] border border-rose-500/30"
                                }`}
                              >
                                {item.margenPorcentaje}%
                              </span>
                            </td>
                            <td className="py-2 px-2 text-right font-bold text-[#1D7A66]">
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

        {/* Control de Lotes y Alertas de Vencimiento (4 cols) */}
        <div className="lg:col-span-4 faraday-glass-card rounded-2xl p-3.5 flex flex-col">
          <div className="flex items-center justify-between gap-2 border-b border-[#222629]/10 pb-2 mb-2.5">
            <div className="flex items-center gap-2 min-w-0">
              <span
                className={`p-1.5 rounded-lg border shrink-0 ${
                  expiringProducts.some((x) => x.status === "EXPIRED")
                    ? "bg-rose-500/15 text-[#B42E46] border-rose-500/30"
                    : expiringProducts.length > 0
                    ? "bg-[#E09F3E]/18 text-[#9A6310] border-[#E09F3E]/40"
                    : "bg-[#248F78]/15 text-[#248F78] border-[#248F78]/25"
                }`}
              >
                <AlertCircle className="w-3.5 h-3.5" />
              </span>
              <div className="min-w-0">
                <h3 className="font-bold text-[#222629] text-xs sm:text-sm leading-tight truncate">
                  Control de Lotes (≤ 15 días)
                </h3>
                <p className="text-[11px] text-[#5C646D] truncate">
                  Vencimientos de perecederos
                </p>
              </div>
            </div>
            <span
              className={`text-[10.5px] font-mono font-bold px-2 py-0.5 rounded-md border shrink-0 ${
                expiringProducts.length === 0
                  ? "bg-[#248F78]/15 text-[#1D7A66] border-[#248F78]/30"
                  : expiringProducts.some((x) => x.status === "EXPIRED")
                  ? "bg-rose-500/15 text-[#B42E46] border-rose-500/35"
                  : "bg-[#E09F3E]/18 text-[#9A6310] border-[#E09F3E]/45"
              }`}
            >
              {expiringProducts.length} {expiringProducts.length === 1 ? "alerta" : "alertas"}
            </span>
          </div>

          {expiringProducts.length === 0 ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="w-full rounded-xl bg-[#248F78]/10 border border-[#248F78]/25 p-3.5 flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#248F78]/15 border border-[#248F78]/30 flex items-center justify-center shrink-0">
                  <ShieldCheck className="w-5 h-5 text-[#248F78]" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-[#222629] leading-snug">
                    Todos los lotes vigentes
                  </p>
                  <p className="text-[11px] text-[#5C646D] leading-snug mt-0.5">
                    Sin artículos vencidos ni próximos a caducar en los próximos 15 días.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-2 max-h-[240px] overflow-y-auto pr-1 flex-1">
              {expiringProducts.map(({ product, daysRemaining, formattedDate, status }) => (
                <div
                  key={`exp-alert-${product.id}`}
                  className={`p-2.5 rounded-xl border flex flex-col justify-between gap-1.5 ${
                    status === "EXPIRED"
                      ? "bg-rose-500/10 border-rose-500/35"
                      : "bg-[#E09F3E]/12 border-[#E09F3E]/45"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-bold text-[#222629] text-xs leading-snug truncate">{product.nombre}</p>
                      <p className="text-[10px] text-[#5C646D] font-mono truncate">
                        Cód: {product.codigo_barras || "S/C"} {product.lote ? `• Lote: ${product.lote}` : ""}
                      </p>
                    </div>
                    <span
                      className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold shrink-0 ${
                        status === "EXPIRED"
                          ? "bg-rose-600 text-white faraday-keep-white"
                          : "bg-[#E09F3E] text-[#222629]"
                      }`}
                    >
                      {status === "EXPIRED"
                        ? `VENCIDO (${Math.abs(daysRemaining)}d)`
                        : daysRemaining === 0
                        ? "VENCE HOY"
                        : `En ${daysRemaining}d`}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[10.5px] font-mono pt-1 border-t border-[#222629]/10">
                    <span className="text-[#5C646D]">
                      Stock: <strong className="text-[#222629]">{product.stock_actual} {product.unidad_medida}</strong>
                    </span>
                    <span className={status === "EXPIRED" ? "text-[#B42E46] font-bold" : "text-[#9A6310] font-bold"}>
                      Vence: {formattedDate}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
