import React, { useState, useMemo } from "react";
import { Producto, Categoria, SystemUser, TipoAlicuotaIva } from "../types";
import { calcularPMP, ROLE_PERMISSIONS } from "../mockDb";
import {
  Search,
  Plus,
  SlidersHorizontal,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Edit,
  Trash2,
  ArrowUpDown,
  ShieldCheck,
  DollarSign,
  Info,
  Lock,
  X,
} from "lucide-react";

interface InventoryViewProps {
  products: Producto[];
  categories: Categoria[];
  bcvRate: number;
  onAddProduct: (prod: Omit<Producto, "id">) => void;
  onUpdateProduct: (prod: Producto) => void;
  onDeleteProduct: (id: number) => void;
  onQuickStockAdjustment: (
    prodId: number,
    tipo: "ENTRADA" | "SALIDA" | "AJUSTE",
    cantidad: number,
    motivo: string,
    costoCompra?: number
  ) => void;
  currentUser?: SystemUser;
}

export const InventoryView: React.FC<InventoryViewProps> = ({
  products,
  categories,
  bcvRate,
  onAddProduct,
  onUpdateProduct,
  onDeleteProduct,
  onQuickStockAdjustment,
  currentUser,
}) => {
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [showProductModal, setShowProductModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Producto | null>(null);
  const [showStockModal, setShowStockModal] = useState(false);
  const [stockModalProduct, setStockModalProduct] = useState<Producto | null>(null);
  const [productToDelete, setProductToDelete] = useState<Producto | null>(null);

  // User permissions from active role
  const permissions = useMemo(() => {
    const role = currentUser?.rol || "CAJERO";
    return ROLE_PERMISSIONS[role] || ROLE_PERMISSIONS.CAJERO;
  }, [currentUser]);

  // Form states for Product Modal
  const [formCode, setFormCode] = useState("");
  const [formName, setFormName] = useState("");
  const [formCatId, setFormCatId] = useState<number>(categories[0]?.id || 1);
  const [formCost, setFormCost] = useState<string>("");
  const [formPrice, setFormPrice] = useState<string>("");
  const [formStock, setFormStock] = useState<string>("");
  const [formMinStock, setFormMinStock] = useState<string>("5");
  const [formUnit, setFormUnit] = useState<string>("Pza");
  const [formAlicuotaIva, setFormAlicuotaIva] = useState<TipoAlicuotaIva>(16);

  // Stock Adjustment Form states
  const [adjType, setAdjType] = useState<"ENTRADA" | "SALIDA" | "AJUSTE">("ENTRADA");
  const [adjQuantity, setAdjQuantity] = useState<string>("");
  const [adjCost, setAdjCost] = useState<string>("");
  const [adjReason, setAdjReason] = useState<string>("");
  const [adjError, setAdjError] = useState<string | null>(null);

  // Filtering
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchesSearch =
        p.nombre.toLowerCase().includes(search.toLowerCase()) ||
        p.codigo_barras.toLowerCase().includes(search.toLowerCase());
      const matchesCat =
        selectedCategory === "ALL" || p.categoria_id.toString() === selectedCategory;
      return matchesSearch && matchesCat;
    });
  }, [products, search, selectedCategory]);

  // Fiscal Statistics & Valuations (LISLR Art. 177 - PMP)
  const stats = useMemo(() => {
    let lowStock = 0;
    let outOfStock = 0;
    let totalCostUsd = 0;
    let totalSaleUsd = 0;

    products.forEach((p) => {
      if (p.stock_actual <= 0) outOfStock++;
      else if (p.stock_actual <= p.stock_minimo) lowStock++;

      const costToUse = p.costo_promedio_ponderado || p.precio_costo;
      totalCostUsd += p.stock_actual * costToUse;
      totalSaleUsd += p.stock_actual * p.precio_venta;
    });

    const totalCostVes = totalCostUsd * bcvRate;
    const totalSaleVes = totalSaleUsd * bcvRate;

    return {
      total: products.length,
      lowStock,
      outOfStock,
      totalCostUsd,
      totalSaleUsd,
      totalCostVes,
      totalSaleVes,
    };
  }, [products, bcvRate]);

  const openNewModal = () => {
    setEditingProduct(null);
    setFormCode("");
    setFormName("");
    setFormCatId(categories[0]?.id || 1);
    setFormCost("");
    setFormPrice("");
    setFormStock("10");
    setFormMinStock("5");
    setFormUnit("Pza");
    setFormAlicuotaIva(16);
    setShowProductModal(true);
  };

  const openEditModal = (p: Producto) => {
    setEditingProduct(p);
    setFormCode(p.codigo_barras || "");
    setFormName(p.nombre);
    setFormCatId(p.categoria_id);
    setFormCost(p.precio_costo.toString());
    setFormPrice(p.precio_venta.toString());
    setFormStock(p.stock_actual.toString());
    setFormMinStock(p.stock_minimo.toString());
    setFormUnit(p.unidad_medida || "Pza");
    setFormAlicuotaIva((p.alicuota_iva === 0 ? 0 : 16) as TipoAlicuotaIva);
    setShowProductModal(true);
  };

  const handleSaveProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) return;

    const costNum = parseFloat(formCost) || 0;
    const priceNum = parseFloat(formPrice) || 0;
    const stockNum = parseFloat(formStock) || 0;
    const minNum = parseFloat(formMinStock) || 5;

    const catObj = categories.find((c) => c.id === formCatId);

    if (editingProduct) {
      onUpdateProduct({
        ...editingProduct,
        codigo_barras: formCode.trim() || `SKU-${Date.now().toString().slice(-6)}`,
        nombre: formName.trim(),
        categoria_id: formCatId,
        categoria_nombre: catObj?.nombre || "General",
        precio_costo: costNum,
        costo_promedio_ponderado: editingProduct.costo_promedio_ponderado || costNum,
        precio_venta: priceNum,
        stock_actual: stockNum,
        stock_minimo: minNum,
        unidad_medida: formUnit,
        alicuota_iva: formAlicuotaIva,
      });
    } else {
      onAddProduct({
        codigo_barras: formCode.trim() || `750${Math.floor(100000000 + Math.random() * 900000000)}`,
        nombre: formName.trim(),
        categoria_id: formCatId,
        categoria_nombre: catObj?.nombre || "General",
        precio_costo: costNum,
        costo_promedio_ponderado: costNum,
        precio_venta: priceNum,
        stock_actual: stockNum,
        stock_minimo: minNum,
        unidad_medida: formUnit,
        alicuota_iva: formAlicuotaIva,
        fecha_registro: new Date().toISOString().slice(0, 19).replace("T", " "),
      });
    }

    setShowProductModal(false);
  };

  const openStockAdjustment = (p: Producto) => {
    setStockModalProduct(p);
    setAdjType("ENTRADA");
    setAdjQuantity("");
    setAdjCost(p.precio_costo.toString());
    setAdjReason("");
    setAdjError(null);
    setShowStockModal(true);
  };

  // Preview of New PMP on purchase entry (LISLR Art. 177)
  const previewNewPMP = useMemo(() => {
    if (!stockModalProduct || adjType !== "ENTRADA") return null;
    const qty = parseFloat(adjQuantity) || 0;
    const cost = parseFloat(adjCost) || stockModalProduct.precio_costo;
    if (qty <= 0) return null;

    const currentPMP = stockModalProduct.costo_promedio_ponderado || stockModalProduct.precio_costo;
    return calcularPMP(stockModalProduct.stock_actual, currentPMP, qty, cost);
  }, [stockModalProduct, adjType, adjQuantity, adjCost]);

  const handleApplyAdjustment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!stockModalProduct) return;
    const qty = parseFloat(adjQuantity);
    if (!qty || qty <= 0) return;

    // Regla de Oro Art. 177 LISLR: Prohibición de existencias negativas
    if (adjType === "SALIDA" && qty > stockModalProduct.stock_actual) {
      setAdjError(
        `❌ Infracción Art. 177 Reglamento LISLR: Prohibición de existencias negativas. No se puede egresar ${qty} ${stockModalProduct.unidad_medida} (Stock disponible: ${stockModalProduct.stock_actual}).`
      );
      return;
    }

    if (adjType === "AJUSTE" && qty < 0) {
      setAdjError("El stock resultante no puede ser negativo según la normativa fiscal.");
      return;
    }

    const costNum = parseFloat(adjCost) || stockModalProduct.precio_costo;

    onQuickStockAdjustment(
      stockModalProduct.id,
      adjType,
      qty,
      adjReason.trim() || `Ajuste manual de ${adjType.toLowerCase()}`,
      adjType === "ENTRADA" ? costNum : undefined
    );

    setShowStockModal(false);
  };

  return (
    <div className="space-y-4">
      {/* Fiscal Banner LISLR Art. 177 */}
      <div className="bg-[#151921] border border-blue-900/60 rounded-xl p-3 flex items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0" />
          <div>
            <span className="font-bold text-slate-200">
              Control Tributario SENIAT / LISLR Art. 177:
            </span>{" "}
            <span className="text-slate-400 text-[11px]">
              Valuación obligatoria por <strong>Costo Promedio Ponderado (PMP)</strong> con prohibición
              expresa de saldos o existencias negativas.
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2 font-mono text-[11px] shrink-0">
          <span className="px-2 py-0.5 rounded bg-blue-950 text-blue-300 border border-blue-800">
            Tasa BCV: Bs. {bcvRate.toFixed(2)}
          </span>
        </div>
      </div>

      {/* Top Metrics Cards with Dual Currency Valuation */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-[#1a1d24] border border-slate-800 rounded-xl p-3.5">
          <p className="text-xs text-slate-400 font-medium">Total Productos</p>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-2xl font-bold text-white">{stats.total}</span>
            <span className="text-[11px] text-blue-400 font-mono">SQLite Activo</span>
          </div>
        </div>

        <div className="bg-[#1a1d24] border border-slate-800 rounded-xl p-3.5">
          <p className="text-xs text-slate-400 font-medium">Alertas de Stock</p>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-bold text-amber-400">{stats.lowStock}</span>
            <span className="text-xs text-slate-400">bajos /</span>
            <span className="text-lg font-bold text-rose-400">{stats.outOfStock}</span>
            <span className="text-xs text-slate-400">agotados</span>
          </div>
        </div>

        {/* Valuación Costo PMP (Art. 177) */}
        <div className="bg-[#1a1d24] border border-slate-800 rounded-xl p-3.5 flex flex-col justify-between">
          <p className="text-xs text-slate-400 font-medium flex items-center justify-between">
            <span>Valuación Costo PMP (Art. 177)</span>
            {permissions.puedeVerCostosYMargenes && (
              <span className="text-[10px] text-blue-400 font-mono">PMP</span>
            )}
          </p>
          {permissions.puedeVerCostosYMargenes ? (
            <>
              <p className="text-xl font-bold text-slate-200 mt-1 font-mono">
                ${stats.totalCostUsd.toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
              <p className="text-[11px] font-mono text-amber-400">
                Bs. {stats.totalCostVes.toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </>
          ) : (
            <div className="mt-2 py-1.5 flex items-center gap-2 text-slate-400">
              <Lock className="w-4 h-4 text-amber-400 shrink-0" />
              <div>
                <span className="text-xs font-semibold text-slate-300 block">Bloqueado para Cajero</span>
                <span className="text-[10px] text-slate-500">Solo Admin / Supervisor</span>
              </div>
            </div>
          )}
        </div>

        {/* Valuación a Venta */}
        <div className="bg-[#1a1d24] border border-slate-800 rounded-xl p-3.5 flex flex-col justify-between">
          <p className="text-xs text-slate-400 font-medium">Valuación a Venta</p>
          {permissions.puedeVerCostosYMargenes ? (
            <>
              <p className="text-xl font-bold text-emerald-400 mt-1 font-mono">
                ${stats.totalSaleUsd.toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
              <p className="text-[11px] font-mono text-amber-400">
                Bs. {stats.totalSaleVes.toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </>
          ) : (
            <div className="mt-2 py-1.5 flex items-center gap-2 text-slate-400">
              <Lock className="w-4 h-4 text-amber-400 shrink-0" />
              <div>
                <span className="text-xs font-semibold text-slate-300 block">Bloqueado para Cajero</span>
                <span className="text-[10px] text-slate-500">Solo Admin / Supervisor</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Control Bar: Search, Category Filter, and Actions */}
      <div className="bg-[#1a1d24] border border-slate-800 rounded-xl p-3 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 w-full sm:w-auto flex-1">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar por descripción o código de barras..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-[#12141a] border border-slate-700/80 rounded-lg pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors font-mono"
            />
          </div>

          <div className="flex items-center gap-1.5">
            <SlidersHorizontal className="w-3.5 h-3.5 text-slate-400 hidden sm:inline" />
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="bg-[#12141a] border border-slate-700/80 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
            >
              <option value="ALL">Todas las Categorías</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id.toString()}>
                  {c.nombre}
                </option>
              ))}
            </select>
          </div>
        </div>

        {permissions.puedeModificarPrecios && (
          <button
            onClick={openNewModal}
            id="btn-new-product"
            className="w-full sm:w-auto flex items-center justify-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs px-4 py-2 rounded-lg shadow-sm transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Nuevo Producto</span>
          </button>
        )}
      </div>

      {/* Products Table with Fiscal Fields */}
      <div className="bg-[#1a1d24] border border-slate-800 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-[#13151b] text-slate-400 border-b border-slate-800 uppercase font-mono text-[11px]">
              <tr>
                <th className="py-3 px-3">Cód. Barras</th>
                <th className="py-3 px-3">Descripción</th>
                <th className="py-3 px-3">Categoría</th>
                <th className="py-3 px-3 text-center">Stock</th>
                <th className="py-3 px-3 text-center">Alícuota</th>
                {permissions.puedeVerCostosYMargenes && (
                  <th className="py-3 px-3 text-right">Costo PMP ($/Bs)</th>
                )}
                <th className="py-3 px-3 text-right">P. Venta ($/Bs)</th>
                {permissions.puedeVerCostosYMargenes && (
                  <th className="py-3 px-3 text-center">Margen</th>
                )}
                <th className="py-3 px-3 text-center">Estado</th>
                <th className="py-3 px-3 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-sans">
              {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={permissions.puedeVerCostosYMargenes ? 10 : 8} className="py-12 text-center text-slate-500">
                    No se encontraron productos que coincidan con la búsqueda.
                  </td>
                </tr>
              ) : (
                filteredProducts.map((p) => {
                  const isOutOfStock = p.stock_actual <= 0;
                  const isLowStock = !isOutOfStock && p.stock_actual <= p.stock_minimo;
                  const currentPmp = p.costo_promedio_ponderado || p.precio_costo;
                  const marginPercent =
                    currentPmp > 0
                      ? Math.round(((p.precio_venta - currentPmp) / currentPmp) * 100)
                      : 0;

                  const costVes = currentPmp * bcvRate;
                  const saleVes = p.precio_venta * bcvRate;

                  return (
                    <tr key={p.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 px-3 font-mono text-slate-400 select-all text-[11px]">
                        {p.codigo_barras || "N/A"}
                      </td>
                      <td className="py-3 px-3 font-medium text-white max-w-xs truncate">
                        {p.nombre}
                      </td>
                      <td className="py-3 px-3">
                        <span className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 text-[11px] border border-slate-700/60">
                          {p.categoria_nombre || "General"}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span
                          className={`font-mono font-bold text-sm ${
                            isOutOfStock
                              ? "text-rose-400"
                              : isLowStock
                              ? "text-amber-400"
                              : "text-emerald-400"
                          }`}
                        >
                          {p.stock_actual}
                        </span>
                        <span className="text-[10px] text-slate-500 ml-1">{p.unidad_medida}</span>
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span
                          className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold ${
                            p.alicuota_iva === 0
                              ? "bg-blue-950 text-blue-300 border border-blue-800"
                              : "bg-purple-950 text-purple-300 border border-purple-800"
                          }`}
                        >
                          {p.alicuota_iva === 0 ? "EXENTO (E)" : "IVA 16% (G)"}
                        </span>
                      </td>
                      {permissions.puedeVerCostosYMargenes && (
                        <td className="py-3 px-3 text-right font-mono">
                          <div className="text-slate-300">${currentPmp.toFixed(2)}</div>
                          <div className="text-[10px] text-slate-500">Bs. {costVes.toFixed(2)}</div>
                        </td>
                      )}
                      <td className="py-3 px-3 text-right font-mono font-bold">
                        <div className="text-white">${p.precio_venta.toFixed(2)}</div>
                        <div className="text-[10px] text-amber-400">Bs. {saleVes.toFixed(2)}</div>
                      </td>
                      {permissions.puedeVerCostosYMargenes && (
                        <td className="py-3 px-3 text-center font-mono text-blue-400 font-semibold">
                          {marginPercent}%
                        </td>
                      )}
                      <td className="py-3 px-3 text-center">
                        {isOutOfStock ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-rose-950/60 text-rose-400 border border-rose-800/60">
                            <XCircle className="w-3 h-3" /> Agotado
                          </span>
                        ) : isLowStock ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-950/60 text-amber-400 border border-amber-800/60">
                            <AlertTriangle className="w-3 h-3" /> Bajo Stock
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-950/60 text-emerald-400 border border-emerald-800/60">
                            <CheckCircle2 className="w-3 h-3" /> Óptimo
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          {permissions.puedeAjustarStockManual && (
                            <button
                              title="Ajustar Stock / Entrada Compra PMP"
                              onClick={() => openStockAdjustment(p)}
                              className="p-1.5 text-blue-400 hover:text-white hover:bg-blue-600/30 rounded-lg transition-colors cursor-pointer"
                            >
                              <ArrowUpDown className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {permissions.puedeModificarPrecios && (
                            <button
                              title="Editar Producto"
                              onClick={() => openEditModal(p)}
                              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700/50 rounded-lg transition-colors cursor-pointer"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {permissions.puedeEliminarProductos && (
                            <button
                              title="Eliminar de inventario"
                              onClick={() => setProductToDelete(p)}
                              className="p-1.5 text-rose-400 hover:text-rose-200 hover:bg-rose-950/50 rounded-lg transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {!permissions.puedeAjustarStockManual && !permissions.puedeModificarPrecios && !permissions.puedeEliminarProductos && (
                            <span className="text-[10px] text-slate-500 italic">Solo consulta</span>
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
      </div>

      {/* Modal: New / Edit Product with Venezuelan Fiscal Attributes */}
      {showProductModal && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[#181a20] border border-slate-800 rounded-2xl max-w-md w-full p-5 shadow-2xl space-y-4 animate-in fade-in zoom-in duration-150 my-auto max-h-[92vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2.5 shrink-0">
              <h3 className="font-bold text-white text-sm flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-blue-400" />
                <span>{editingProduct ? "Editar Ficha de Producto" : "Registrar Nuevo Producto Fiscal"}</span>
              </h3>
              <button
                onClick={() => setShowProductModal(false)}
                className="text-slate-400 hover:text-white text-xs font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="space-y-3 text-xs overflow-y-auto flex-1 min-h-0 pr-1">
              <div>
                <label className="block text-slate-300 font-medium mb-1">
                  Código de Barras / SKU:
                </label>
                <input
                  type="text"
                  placeholder="Ej: 750100012345"
                  value={formCode}
                  onChange={(e) => setFormCode(e.target.value)}
                  className="w-full bg-[#111317] border border-slate-700 rounded-lg px-3 py-2 text-white font-mono focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">
                  Descripción del Artículo *:
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Harina de Maíz Precocida 1kg"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full bg-[#111317] border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Categoría:</label>
                  <select
                    value={formCatId}
                    onChange={(e) => setFormCatId(Number(e.target.value))}
                    className="w-full bg-[#111317] border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.nombre}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Unidad de Medida:</label>
                  <input
                    type="text"
                    value={formUnit}
                    onChange={(e) => setFormUnit(e.target.value)}
                    placeholder="Pza, Kg, Lt, Bulto..."
                    className="w-full bg-[#111317] border border-slate-700 rounded-lg px-3 py-2 text-white"
                  />
                </div>
              </div>

              {/* Tratamiento Tributario IVA SENIAT */}
              <div>
                <label className="block text-slate-300 font-medium mb-1">
                  Tratamiento IVA (Providencia SNAT/00071):
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setFormAlicuotaIva(16)}
                    className={`py-2 px-3 rounded-lg border text-xs font-semibold flex items-center justify-between transition-all ${
                      formAlicuotaIva === 16
                        ? "bg-purple-950/80 border-purple-500 text-purple-300"
                        : "bg-[#111317] border-slate-700 text-slate-400 hover:text-white"
                    }`}
                  >
                    <span>Gravable (G)</span>
                    <span className="font-mono font-bold">16% IVA</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFormAlicuotaIva(0)}
                    className={`py-2 px-3 rounded-lg border text-xs font-semibold flex items-center justify-between transition-all ${
                      formAlicuotaIva === 0
                        ? "bg-blue-950/80 border-blue-500 text-blue-300"
                        : "bg-[#111317] border-slate-700 text-slate-400 hover:text-white"
                    }`}
                  >
                    <span>Exento (E)</span>
                    <span className="font-mono font-bold">0% IVA</span>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">
                    Costo Inicial PMP ($):
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={formCost}
                    onChange={(e) => setFormCost(e.target.value)}
                    className="w-full bg-[#111317] border border-slate-700 rounded-lg px-3 py-2 text-white font-mono focus:outline-none focus:border-blue-500"
                  />
                  {parseFloat(formCost) > 0 && (
                    <span className="text-[10px] text-amber-400 font-mono mt-0.5 block">
                      ≈ Bs. {(parseFloat(formCost) * bcvRate).toFixed(2)}
                    </span>
                  )}
                </div>
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Precio Venta ($) *:</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="0.00"
                    value={formPrice}
                    onChange={(e) => setFormPrice(e.target.value)}
                    className="w-full bg-[#111317] border border-slate-700 rounded-lg px-3 py-2 text-white font-mono focus:outline-none focus:border-blue-500"
                  />
                  {parseFloat(formPrice) > 0 && (
                    <span className="text-[10px] text-amber-400 font-mono mt-0.5 block">
                      ≈ Bs. {(parseFloat(formPrice) * bcvRate).toFixed(2)}
                    </span>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Stock Inicial:</label>
                  <input
                    type="number"
                    step="1"
                    min="0"
                    value={formStock}
                    onChange={(e) => setFormStock(e.target.value)}
                    className="w-full bg-[#111317] border border-slate-700 rounded-lg px-3 py-2 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Stock Mínimo (Alerta):</label>
                  <input
                    type="number"
                    step="1"
                    min="0"
                    value={formMinStock}
                    onChange={(e) => setFormMinStock(e.target.value)}
                    className="w-full bg-[#111317] border border-slate-700 rounded-lg px-3 py-2 text-white font-mono"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2.5 border-t border-slate-800 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowProductModal(false)}
                  className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold"
                >
                  Guardar en SQLite
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Quick Stock Adjustment & PMP Calculator (LISLR Art. 177) */}
      {showStockModal && stockModalProduct && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[#181a20] border border-slate-800 rounded-2xl max-w-md w-full p-5 shadow-2xl space-y-4 animate-in fade-in zoom-in duration-150 my-auto max-h-[92vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2.5 shrink-0">
              <h3 className="font-bold text-white text-sm flex items-center gap-2">
                <ArrowUpDown className="w-4 h-4 text-blue-400" />
                <span>Movimiento de Kardex (LISLR Art. 177)</span>
              </h3>
              <button
                onClick={() => setShowStockModal(false)}
                className="text-slate-400 hover:text-white text-xs font-bold"
              >
                ✕
              </button>
            </div>

            {/* Info Box */}
            <div className="bg-[#12141a] p-3 rounded-xl border border-slate-800 space-y-1 shrink-0">
              <p className="text-[11px] text-slate-400">Artículo seleccionado:</p>
              <p className="font-semibold text-white text-xs">{stockModalProduct.nombre}</p>
              <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-800/80">
                <span className="text-slate-400">
                  Stock actual:{" "}
                  <strong className="text-emerald-400 font-mono">
                    {stockModalProduct.stock_actual} {stockModalProduct.unidad_medida}
                  </strong>
                </span>
                <span className="text-slate-400">
                  Costo PMP:{" "}
                  <strong className="text-amber-300 font-mono">
                    ${(stockModalProduct.costo_promedio_ponderado || stockModalProduct.precio_costo).toFixed(2)}
                  </strong>
                </span>
              </div>
            </div>

            {adjError && (
              <div className="p-2.5 bg-rose-950/80 border border-rose-700 rounded-lg text-rose-200 text-xs flex items-start gap-2 shrink-0">
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <span className="text-[11px] leading-tight">{adjError}</span>
              </div>
            )}

            <form onSubmit={handleApplyAdjustment} className="space-y-3 text-xs overflow-y-auto flex-1 min-h-0 pr-1">
              <div>
                <label className="block text-slate-300 font-medium mb-1">Tipo de Movimiento:</label>
                <div className="grid grid-cols-3 gap-1.5">
                  {(["ENTRADA", "SALIDA", "AJUSTE"] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => {
                        setAdjType(t);
                        setAdjError(null);
                      }}
                      className={`py-1.5 text-center font-semibold rounded-lg border text-xs transition-all ${
                        adjType === t
                          ? "bg-blue-600 border-blue-500 text-white shadow"
                          : "bg-[#12141a] border-slate-700 text-slate-300 hover:bg-slate-700"
                      }`}
                    >
                      {t === "ENTRADA" ? "ENTRADA (Compra)" : t === "SALIDA" ? "SALIDA (Baja)" : "AJUSTE FÍSICO"}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">
                  Cantidad a {adjType === "AJUSTE" ? "fijar como existencia total" : adjType.toLowerCase()} *:
                </label>
                <input
                  type="number"
                  step="1"
                  required
                  min="1"
                  placeholder="0"
                  value={adjQuantity}
                  onChange={(e) => {
                    setAdjQuantity(e.target.value);
                    setAdjError(null);
                  }}
                  className="w-full bg-[#111317] border border-slate-700 rounded-lg px-3 py-2 text-white font-mono text-sm focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Si es ENTRADA de compra: solicitar costo de compra y calcular PMP Art. 177 */}
              {adjType === "ENTRADA" && (
                <div className="p-3 bg-blue-950/30 border border-blue-800/60 rounded-xl space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="text-blue-300 font-semibold text-[11px] flex items-center gap-1">
                      <DollarSign className="w-3.5 h-3.5" />
                      <span>Costo Unitario de Compra ($):</span>
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={adjCost}
                      onChange={(e) => setAdjCost(e.target.value)}
                      className="w-24 bg-[#111317] border border-slate-700 rounded px-2 py-1 text-right text-white font-mono text-xs font-bold"
                    />
                  </div>

                  {previewNewPMP !== null && (
                    <div className="pt-2 border-t border-blue-800/40 text-[11px] space-y-1">
                      <div className="flex justify-between text-slate-400">
                        <span>PMP Actual:</span>
                        <span className="font-mono text-slate-300">
                          ${(stockModalProduct.costo_promedio_ponderado || stockModalProduct.precio_costo).toFixed(2)}
                        </span>
                      </div>
                      <div className="flex justify-between font-bold text-emerald-300">
                        <span>Nuevo PMP Calculado (Art. 177):</span>
                        <span className="font-mono">${previewNewPMP.toFixed(4)}</span>
                      </div>
                      <p className="text-[9.5px] text-slate-400 leading-tight italic">
                        Fórmula: ((Stock_Actual * Costo_Actual) + (Cant_Entrada * Costo_Compra)) / (Stock_Actual + Cant_Entrada)
                      </p>
                    </div>
                  )}
                </div>
              )}

              <div>
                <label className="block text-slate-300 font-medium mb-1">
                  Motivo / Justificación / N° Factura Proveedor:
                </label>
                <input
                  type="text"
                  placeholder="Ej: Factura Proveedor #1092, Merma autorizada, Conteo físico"
                  value={adjReason}
                  onChange={(e) => setAdjReason(e.target.value)}
                  className="w-full bg-[#111317] border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowStockModal(false)}
                  className="px-3.5 py-1.5 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 font-medium cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold cursor-pointer"
                >
                  Asentar en Kardex
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Confirmación de Eliminación de Producto */}
      {productToDelete && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[#181a20] border border-rose-900/60 rounded-2xl max-w-md w-full p-5 shadow-2xl space-y-4 animate-in fade-in zoom-in duration-150 my-auto max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 shrink-0">
              <div className="flex items-center gap-2 text-rose-400 font-bold text-sm">
                <div className="p-1.5 rounded-lg bg-rose-500/10 border border-rose-500/20">
                  <Trash2 className="w-5 h-5 text-rose-400" />
                </div>
                <span>Eliminar Producto del Inventario</span>
              </div>
              <button
                onClick={() => setProductToDelete(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-300 overflow-y-auto flex-1 min-h-0 pr-1">
              <p>
                ¿Estás seguro de que deseas eliminar permanentemente el siguiente artículo de la base de datos de inventario?
              </p>

              <div className="bg-[#101216] border border-slate-800 rounded-xl p-3 space-y-1.5 font-mono">
                <div className="text-white font-bold text-sm font-sans">{productToDelete.nombre}</div>
                <div className="flex justify-between text-[11px] text-slate-400">
                  <span>Código / SKU:</span>
                  <span className="text-slate-200">{productToDelete.codigo_barras || "N/A"}</span>
                </div>
                <div className="flex justify-between text-[11px] text-slate-400">
                  <span>Stock Actual:</span>
                  <span className="text-amber-400 font-bold">{productToDelete.stock_actual} {productToDelete.unidad_medida}</span>
                </div>
                <div className="flex justify-between text-[11px] text-slate-400">
                  <span>Precio de Venta:</span>
                  <span className="text-emerald-400 font-bold">${productToDelete.precio_venta.toFixed(2)} (Bs. {(productToDelete.precio_venta * bcvRate).toFixed(2)})</span>
                </div>
              </div>

              <div className="flex items-start gap-2 p-2.5 rounded-xl bg-amber-950/40 border border-amber-500/30 text-amber-300 text-[11px]">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>
                  Esta acción no se puede deshacer. Los registros históricos de ventas previas se mantendrán intactos en los reportes contables.
                </span>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800 shrink-0">
              <button
                type="button"
                onClick={() => setProductToDelete(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 font-medium text-xs cursor-pointer transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  if (productToDelete) {
                    onDeleteProduct(productToDelete.id);
                    setProductToDelete(null);
                  }
                }}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-lg shadow-rose-950/40 cursor-pointer transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                <span>Confirmar y Eliminar</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
