import React, { useState, useMemo, useDeferredValue, Suspense } from "react";
import { Producto, Categoria, SystemUser, TipoAlicuotaIva } from "../types";
import { calcularPMP, ROLE_PERMISSIONS, verifyAdminPin } from "../mockDb";
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
  ArrowUp,
  ArrowDown,
  ShieldCheck,
  DollarSign,
  Info,
  Lock,
  X,
  FileSpreadsheet,
  Eye,
  EyeOff,
  ChevronDown,
  ChevronUp,
  Copy,
  Check,
  KeyRound,
  FileDown,
} from "lucide-react";
import {
  useResizableColumns,
  ColumnResizeHandle,
  ColumnConfiguratorToolbar,
  ColumnDef,
} from "./ColumnResizer";
import { usePagination, TablePagination } from "./TablePagination";

const UniversalCatalogImportModal = React.lazy(() =>
  import("./UniversalCatalogImportModal").then((m) => ({
    default: m.UniversalCatalogImportModal,
  }))
);
const StockExportModal = React.lazy(() =>
  import("./StockExportModal").then((m) => ({
    default: m.StockExportModal,
  }))
);

interface InventoryViewProps {
  products: Producto[];
  categories: Categoria[];
  bcvRate: number;
  onAddProduct: (prod: Omit<Producto, "id">) => void;
  onUpdateProduct: (
    prod: Producto,
    originalBarcode?: string,
    originalId?: number | string
  ) => void;
  onDeleteProduct: (id: number | string, codigoBarras?: string) => void;
  onQuickStockAdjustment: (
    prodId: number | string,
    tipo: "ENTRADA" | "SALIDA" | "AJUSTE",
    cantidad: number,
    motivo: string,
    costoCompra?: number,
    codigoBarras?: string
  ) => void;
  currentUser?: SystemUser;
  onBatchImportProducts?: (updatedProducts: Producto[], updatedCategories?: Categoria[]) => void;
  showToast?: (msg: string) => void;
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
  onBatchImportProducts,
  showToast,
}) => {
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [showProductModal, setShowProductModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Producto | null>(null);
  const [showStockModal, setShowStockModal] = useState(false);
  const [stockModalProduct, setStockModalProduct] = useState<Producto | null>(null);
  const [productToDelete, setProductToDelete] = useState<Producto | null>(null);

  // Estados para visualización de nombres completos en el catálogo
  const [showFullNames, setShowFullNames] = useState<boolean>(false);
  const [expandedProductIds, setExpandedProductIds] = useState<Record<string | number, boolean>>({});
  const [inspectProduct, setInspectProduct] = useState<Producto | null>(null);
  const [copiedInspectText, setCopiedInspectText] = useState<string | null>(null);

  const toggleExpandProductName = (id: string | number) => {
    setExpandedProductIds((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const handleCopyInspect = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedInspectText(label);
    if (showToast) {
      showToast(`✅ ${label} copiado al portapapeles.`);
    }
    setTimeout(() => setCopiedInspectText(null), 2000);
  };

  // Estados para protección y desbloqueo de las tarjetas de Valuación (Costo PMP y Venta) con PIN de Administrador
  const [isValuationUnlocked, setIsValuationUnlocked] = useState<boolean>(false);
  const [showPinModal, setShowPinModal] = useState<boolean>(false);
  const [adminPinInput, setAdminPinInput] = useState<string>("");
  const [pinError, setPinError] = useState<string>("");
  const [showPinPassword, setShowPinPassword] = useState<boolean>(false);

  const handleVerifyPin = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const clean = adminPinInput.trim();
    if (!clean) {
      setPinError("Por favor ingrese el PIN de Administrador.");
      return;
    }

    const isValid = verifyAdminPin(clean);
    if (!isValid) {
      setPinError("❌ PIN de Administrador incorrecto. Operación rechazada.");
      return;
    }

    setIsValuationUnlocked(true);
    setShowPinModal(false);
    setAdminPinInput("");
    setPinError("");
    if (showToast) {
      showToast("🔓 Tarjetas de Valuación Costo PMP y Venta desbloqueadas correctamente.");
    }
  };

  const handleAppendPinDigit = (digit: string) => {
    if (adminPinInput.length < 12) {
      setAdminPinInput((prev) => prev + digit);
      if (pinError) setPinError("");
    }
  };

  const handleBackspacePin = () => {
    setAdminPinInput((prev) => prev.slice(0, -1));
    if (pinError) setPinError("");
  };

  const handleClearPin = () => {
    setAdminPinInput("");
    if (pinError) setPinError("");
  };

  // User permissions from active role
  const permissions = useMemo(() => {
    const role = currentUser?.rol || "CAJERO";
    return ROLE_PERMISSIONS[role] || ROLE_PERMISSIONS.CAJERO;
  }, [currentUser]);

  const inventoryColumns = useMemo<ColumnDef[]>(() => {
    const cols: ColumnDef[] = [
      { key: "codigo", label: "Cód. Barras / Lote", defaultWidth: 135, minWidth: 80, maxWidth: 320 },
      { key: "nombre", label: "Descripción del Producto", defaultWidth: 280, minWidth: 140, maxWidth: 650 },
      { key: "categoria", label: "Categoría", defaultWidth: 130, minWidth: 80, maxWidth: 300 },
      { key: "stock", label: "Stock", defaultWidth: 105, minWidth: 70, maxWidth: 220 },
      { key: "alicuota", label: "Alícuota IVA", defaultWidth: 110, minWidth: 75, maxWidth: 220 },
    ];
    if (permissions.puedeVerCostosYMargenes) {
      cols.push({ key: "costo", label: "Costo PMP ($/Bs)", defaultWidth: 130, minWidth: 85, maxWidth: 260 });
    }
    cols.push({ key: "precio", label: "P. Venta ($/Bs)", defaultWidth: 130, minWidth: 85, maxWidth: 260 });
    if (permissions.puedeVerCostosYMargenes) {
      cols.push({ key: "margen", label: "Margen (%)", defaultWidth: 95, minWidth: 65, maxWidth: 200 });
    }
    cols.push(
      { key: "estado", label: "Estado / Vence", defaultWidth: 155, minWidth: 95, maxWidth: 320 },
      { key: "acciones", label: "Acciones", defaultWidth: 115, minWidth: 80, maxWidth: 220 }
    );
    return cols;
  }, [permissions.puedeVerCostosYMargenes]);

  const colResizer = useResizableColumns("inventory_catalog", inventoryColumns);

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
  const [formExpirationDate, setFormExpirationDate] = useState<string>("");
  const [formBatch, setFormBatch] = useState<string>("");

  // Filtro por estado de vencimiento (Punto 6)
  const [expirationFilter, setExpirationFilter] = useState<"ALL" | "EXPIRED" | "SOON" | "EXPIRED_OR_SOON">("ALL");

  // Helper para evaluar días restantes de vencimiento (Punto 6)
  const getProductExpiryInfo = (fechaVencimiento?: string): {
    status: "EXPIRED" | "SOON" | "OK" | "NONE";
    daysRemaining: number | null;
    formattedDate: string;
  } => {
    if (!fechaVencimiento || !fechaVencimiento.trim()) {
      return { status: "NONE", daysRemaining: null, formattedDate: "" };
    }
    const clean = fechaVencimiento.trim().slice(0, 10);
    const parts = clean.split("-");
    if (parts.length !== 3) {
      return { status: "NONE", daysRemaining: null, formattedDate: clean };
    }
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    const expDate = new Date(year, month, day, 23, 59, 59, 999);
    if (isNaN(expDate.getTime())) {
      return { status: "NONE", daysRemaining: null, formattedDate: clean };
    }

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const diffMs = expDate.getTime() - todayStart.getTime();
    const daysRemaining = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const formattedDate = `${parts[2]}/${parts[1]}/${parts[0]}`;

    if (daysRemaining < 0) {
      return { status: "EXPIRED", daysRemaining, formattedDate };
    }
    if (daysRemaining <= 15) {
      return { status: "SOON", daysRemaining, formattedDate };
    }
    return { status: "OK", daysRemaining, formattedDate };
  };

  // Stock Adjustment Form states
  const [adjType, setAdjType] = useState<"ENTRADA" | "SALIDA" | "AJUSTE">("ENTRADA");
  const [adjQuantity, setAdjQuantity] = useState<string>("");
  const [adjCost, setAdjCost] = useState<string>("");
  const [adjReason, setAdjReason] = useState<string>("");
  const [adjError, setAdjError] = useState<string | null>(null);

  // Criterios de ordenamiento
  const [sortBy, setSortBy] = useState<
    | "nombre_asc"
    | "nombre_desc"
    | "stock_desc"
    | "stock_asc"
    | "codigo_asc"
    | "codigo_desc"
    | "precio_desc"
    | "precio_asc"
    | "margen_desc"
    | "margen_asc"
    | "vencimiento_asc"
    | "recientes"
  >("nombre_asc");

  const handleToggleSortColumn = (field: "codigo" | "nombre" | "stock" | "precio" | "margen" | "vencimiento") => {
    if (field === "codigo") {
      setSortBy(sortBy === "codigo_asc" ? "codigo_desc" : "codigo_asc");
    } else if (field === "nombre") {
      setSortBy(sortBy === "nombre_asc" ? "nombre_desc" : "nombre_asc");
    } else if (field === "stock") {
      setSortBy(sortBy === "stock_desc" ? "stock_asc" : "stock_desc");
    } else if (field === "precio") {
      setSortBy(sortBy === "precio_desc" ? "precio_asc" : "precio_desc");
    } else if (field === "margen") {
      setSortBy(sortBy === "margen_desc" ? "margen_asc" : "margen_desc");
    } else if (field === "vencimiento") {
      setSortBy(sortBy === "vencimiento_asc" ? "nombre_asc" : "vencimiento_asc");
    }
  };

  // Filtering & Sorting (usando deferredSearch para no bloquear el hilo UI al teclear)
  const filteredProducts = useMemo(() => {
    const q = deferredSearch.trim().toLowerCase();
    const list = products.filter((p) => {
      const matchesSearch =
        !q ||
        p.nombre.toLowerCase().includes(q) ||
        p.codigo_barras.toLowerCase().includes(q) ||
        (p.lote && p.lote.toLowerCase().includes(q));
      const matchesCat =
        selectedCategory === "ALL" || p.categoria_id.toString() === selectedCategory;

      if (!matchesSearch || !matchesCat) return false;

      if (expirationFilter !== "ALL") {
        const expInfo = getProductExpiryInfo(p.fecha_vencimiento);
        if (expirationFilter === "EXPIRED" && expInfo.status !== "EXPIRED") return false;
        if (expirationFilter === "SOON" && expInfo.status !== "SOON") return false;
        if (expirationFilter === "EXPIRED_OR_SOON" && expInfo.status !== "EXPIRED" && expInfo.status !== "SOON") {
          return false;
        }
      }

      return true;
    });

    const getMarginVal = (p: Producto) => {
      const pmp = p.costo_promedio_ponderado || p.precio_costo || 0;
      return pmp > 0 ? ((p.precio_venta - pmp) / pmp) * 100 : 0;
    };

    return [...list].sort((a, b) => {
      switch (sortBy) {
        case "nombre_asc":
          return a.nombre.localeCompare(b.nombre, "es", { sensitivity: "base" });
        case "nombre_desc":
          return b.nombre.localeCompare(a.nombre, "es", { sensitivity: "base" });
        case "stock_desc":
          return b.stock_actual - a.stock_actual;
        case "stock_asc":
          return a.stock_actual - b.stock_actual;
        case "codigo_asc":
          return (a.codigo_barras || "").localeCompare(b.codigo_barras || "", "es", { numeric: true });
        case "codigo_desc":
          return (b.codigo_barras || "").localeCompare(a.codigo_barras || "", "es", { numeric: true });
        case "precio_desc":
          return b.precio_venta - a.precio_venta;
        case "precio_asc":
          return a.precio_venta - b.precio_venta;
        case "margen_desc":
          return getMarginVal(b) - getMarginVal(a);
        case "margen_asc":
          return getMarginVal(a) - getMarginVal(b);
        case "vencimiento_asc": {
          const expA = a.fecha_vencimiento || "9999-12-31";
          const expB = b.fecha_vencimiento || "9999-12-31";
          return expA.localeCompare(expB);
        }
        case "recientes":
          return (b.id || 0) - (a.id || 0);
        default:
          return 0;
      }
    });
  }, [products, deferredSearch, selectedCategory, sortBy, expirationFilter]);

  const pagination = usePagination(filteredProducts, 50, "inventory_catalog");

  // Fiscal Statistics & Valuations (LISLR Art. 177 - PMP)
  // Regla estricta: Solo contabilizar productos con stock activo (> 0). Productos sin stock quedan excluidos de la valuación.
  const stats = useMemo(() => {
    let lowStock = 0;
    let outOfStock = 0;
    let productsWithStock = 0;
    let totalCostUsd = 0;
    let totalSaleUsd = 0;
    let expiredCount = 0;
    let expiringSoonCount = 0;

    products.forEach((p) => {
      const stock = typeof p.stock_actual === "number" ? p.stock_actual : 0;

      const expInfo = getProductExpiryInfo(p.fecha_vencimiento);
      if (expInfo.status === "EXPIRED") expiredCount++;
      else if (expInfo.status === "SOON") expiringSoonCount++;

      // Si no tiene stock (<= 0), no contabilizar en la valuación de inventario
      if (stock <= 0) {
        outOfStock++;
        return;
      }

      productsWithStock++;

      if (stock <= (p.stock_minimo || 0)) {
        lowStock++;
      }

      const costToUse = p.costo_promedio_ponderado || p.costo_promedio || p.precio_costo || 0;
      const saleToUse = p.precio_venta || 0;

      totalCostUsd += stock * Math.max(0, costToUse);
      totalSaleUsd += stock * Math.max(0, saleToUse);
    });

    const totalCostVes = totalCostUsd * bcvRate;
    const totalSaleVes = totalSaleUsd * bcvRate;

    return {
      total: products.length,
      productsWithStock,
      lowStock,
      outOfStock,
      totalCostUsd,
      totalSaleUsd,
      totalCostVes,
      totalSaleVes,
      expiredCount,
      expiringSoonCount,
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
    setFormExpirationDate("");
    setFormBatch("");
    setShowProductModal(true);
  };

  const openEditModal = (p: Producto) => {
    setEditingProduct(p);
    setFormCode(p.codigo_barras || "");
    setFormName(p.nombre || "");
    setFormCatId(p.categoria_id || categories[0]?.id || 1);
    setFormCost((p.costo_promedio_ponderado ?? p.precio_costo ?? 0).toString());
    setFormPrice((p.precio_venta ?? 0).toString());
    setFormStock((p.stock_actual ?? 0).toString());
    setFormMinStock((p.stock_minimo ?? 5).toString());
    setFormUnit(p.unidad_medida || "Pza");
    setFormAlicuotaIva((p.alicuota_iva === 0 ? 0 : 16) as TipoAlicuotaIva);
    setFormExpirationDate(p.fecha_vencimiento || "");
    setFormBatch(p.lote || "");
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
      onUpdateProduct(
        {
          ...editingProduct,
          codigo_barras: formCode.trim() || `SKU-${Date.now().toString().slice(-6)}`,
          nombre: formName.trim(),
          categoria_id: formCatId,
          categoria_nombre: catObj?.nombre || "General",
          precio_costo: costNum,
          costo_promedio: costNum,
          costo_promedio_ponderado: costNum,
          precio_venta: priceNum,
          stock_actual: stockNum,
          stock_minimo: minNum,
          unidad_medida: formUnit,
          alicuota_iva: formAlicuotaIva,
          fecha_vencimiento: formExpirationDate.trim() || undefined,
          lote: formBatch.trim() || undefined,
        },
        editingProduct.codigo_barras,
        editingProduct.id
      );
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
        fecha_vencimiento: formExpirationDate.trim() || undefined,
        lote: formBatch.trim() || undefined,
      });
    }

    setShowProductModal(false);
  };

  const openStockAdjustment = (p: Producto) => {
    setStockModalProduct(p);
    setAdjType("ENTRADA");
    setAdjQuantity("");
    setAdjCost((p.precio_costo ?? 0).toString());
    setAdjReason("");
    setAdjError(null);
    setShowStockModal(true);
  };

  // Preview of New PMP on purchase entry (LISLR Art. 177)
  const previewNewPMP = useMemo(() => {
    if (!stockModalProduct || adjType !== "ENTRADA") return null;
    const qty = parseFloat(adjQuantity) || 0;
    const cost = parseFloat(adjCost) || stockModalProduct.precio_costo || 0;
    if (qty <= 0) return null;

    const currentPMP = stockModalProduct.costo_promedio_ponderado || stockModalProduct.precio_costo || 0;
    return calcularPMP(stockModalProduct.stock_actual || 0, currentPMP, qty, cost);
  }, [stockModalProduct, adjType, adjQuantity, adjCost]);

  const handleApplyAdjustment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!stockModalProduct) return;
    const qty = parseFloat(adjQuantity);
    if (isNaN(qty)) {
      setAdjError("Por favor ingrese una cantidad numérica válida.");
      return;
    }

    if (adjType === "AJUSTE" && qty < 0) {
      setAdjError("El stock resultante no puede ser negativo según la normativa fiscal (Art. 177 LISLR).");
      return;
    }

    if (adjType !== "AJUSTE" && qty <= 0) {
      setAdjError("La cantidad debe ser mayor a 0.");
      return;
    }

    // Regla de Oro Art. 177 LISLR: Prohibición de existencias negativas
    if (adjType === "SALIDA" && qty > (stockModalProduct.stock_actual || 0)) {
      setAdjError(
        `❌ Infracción Art. 177 Reglamento LISLR: Prohibición de existencias negativas. No se puede egresar ${qty} ${stockModalProduct.unidad_medida || "Pza"} (Stock disponible: ${stockModalProduct.stock_actual || 0}).`
      );
      return;
    }

    const costNum = parseFloat(adjCost) || stockModalProduct.precio_costo || 0;

    onQuickStockAdjustment(
      stockModalProduct.id,
      adjType,
      qty,
      adjReason.trim() || `Ajuste manual de ${adjType.toLowerCase()}`,
      adjType === "ENTRADA" ? costNum : undefined,
      stockModalProduct.codigo_barras
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
        <div className="bg-[#1a1d24] border border-slate-800 rounded-xl p-3.5 flex flex-col justify-between">
          <p className="text-xs text-slate-400 font-medium">Catálogo & Stock</p>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-2xl font-bold text-white">{stats.total}</span>
            <span className="text-[11px] text-emerald-400 font-mono font-bold">
              {stats.productsWithStock} con stock
            </span>
          </div>
          <p className="text-[10px] text-slate-500 font-mono mt-1">
            {stats.outOfStock > 0 ? `(${stats.outOfStock} sin stock excluidos)` : "100% con existencia"}
          </p>
        </div>

        <div className="bg-[#1a1d24] border border-slate-800 rounded-xl p-3.5 flex flex-col justify-between">
          <p className="text-xs text-slate-400 font-medium">Alertas de Stock</p>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-bold text-amber-400">{stats.lowStock}</span>
            <span className="text-xs text-slate-400">bajos /</span>
            <span className="text-lg font-bold text-rose-400">{stats.outOfStock}</span>
            <span className="text-xs text-slate-400">agotados</span>
          </div>
          <p className="text-[10px] text-slate-500 font-mono mt-1">
            Umbral mínimo configurado
          </p>
        </div>

        {/* Valuación Costo PMP (Art. 177) */}
        <div className="bg-[#1a1d24] border border-slate-800 rounded-xl p-3.5 flex flex-col justify-between relative overflow-hidden group">
          <div className="text-xs text-slate-400 font-medium flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <span>Valuación Costo PMP (Art. 177)</span>
              {permissions.puedeVerCostosYMargenes && !isValuationUnlocked && (
                <Lock className="w-3 h-3 text-blue-400 shrink-0" />
              )}
            </span>
            {permissions.puedeVerCostosYMargenes && isValuationUnlocked ? (
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] text-blue-400 font-mono font-bold">PMP</span>
                <button
                  type="button"
                  onClick={() => setIsValuationUnlocked(false)}
                  className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
                  title="Bloquear y ocultar montos de valuación"
                >
                  <EyeOff className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <span className="text-[10px] text-blue-400/80 font-mono font-bold">
                {isValuationUnlocked ? "PMP" : "PIN REQUERIDO"}
              </span>
            )}
          </div>
          {permissions.puedeVerCostosYMargenes ? (
            isValuationUnlocked ? (
              <>
                <p className="text-xl font-bold text-slate-200 mt-1 font-mono">
                  ${stats.totalCostUsd.toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
                <div className="flex items-center justify-between text-[11px] font-mono mt-0.5">
                  <span className="text-amber-400">
                    Bs. {stats.totalCostVes.toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                  <span className="text-[10px] text-slate-500 font-sans" title="Solo productos con stock mayor a cero">
                    ({stats.productsWithStock} prod.)
                  </span>
                </div>
              </>
            ) : (
              <div className="mt-1.5 flex flex-col justify-between flex-1">
                <div className="flex items-center justify-between">
                  <span className="text-lg font-mono font-bold text-slate-500 tracking-widest select-none">
                    $ ••••••••
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setPinError("");
                      setAdminPinInput("");
                      setShowPinModal(true);
                    }}
                    className="px-2.5 py-1 bg-blue-500/10 hover:bg-blue-500/20 text-blue-300 border border-blue-500/30 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm hover:scale-[1.02]"
                    title="Ingresar PIN de Administrador para desbloquear valuaciones"
                  >
                    <KeyRound className="w-3.5 h-3.5 text-blue-400" />
                    <span>PIN Admin</span>
                  </button>
                </div>
                <div className="flex items-center justify-between text-[11px] font-mono mt-1 text-slate-500">
                  <span className="tracking-widest select-none">Bs. ••••••••</span>
                  <span className="text-[10px] text-slate-500 font-sans">Protegido con PIN</span>
                </div>
              </div>
            )
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
        <div className="bg-[#1a1d24] border border-slate-800 rounded-xl p-3.5 flex flex-col justify-between relative overflow-hidden group">
          <div className="text-xs text-slate-400 font-medium flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <span>Valuación a Venta</span>
              {permissions.puedeVerCostosYMargenes && !isValuationUnlocked && (
                <Lock className="w-3 h-3 text-emerald-400 shrink-0" />
              )}
            </span>
            {permissions.puedeVerCostosYMargenes && isValuationUnlocked ? (
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] text-emerald-400 font-mono font-bold">PVP</span>
                <button
                  type="button"
                  onClick={() => setIsValuationUnlocked(false)}
                  className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
                  title="Bloquear y ocultar montos de valuación"
                >
                  <EyeOff className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <span className="text-[10px] text-emerald-400/80 font-mono font-bold">
                {isValuationUnlocked ? "PVP" : "PIN REQUERIDO"}
              </span>
            )}
          </div>
          {permissions.puedeVerCostosYMargenes ? (
            isValuationUnlocked ? (
              <>
                <p className="text-xl font-bold text-emerald-400 mt-1 font-mono">
                  ${stats.totalSaleUsd.toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
                <div className="flex items-center justify-between text-[11px] font-mono mt-0.5">
                  <span className="text-amber-400">
                    Bs. {stats.totalSaleVes.toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                  <span className="text-[10px] text-slate-500 font-sans" title="Solo productos con stock mayor a cero">
                    ({stats.productsWithStock} prod.)
                  </span>
                </div>
              </>
            ) : (
              <div className="mt-1.5 flex flex-col justify-between flex-1">
                <div className="flex items-center justify-between">
                  <span className="text-lg font-mono font-bold text-slate-500 tracking-widest select-none">
                    $ ••••••••
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setPinError("");
                      setAdminPinInput("");
                      setShowPinModal(true);
                    }}
                    className="px-2.5 py-1 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm hover:scale-[1.02]"
                    title="Ingresar PIN de Administrador para desbloquear valuaciones"
                  >
                    <KeyRound className="w-3.5 h-3.5 text-emerald-400" />
                    <span>PIN Admin</span>
                  </button>
                </div>
                <div className="flex items-center justify-between text-[11px] font-mono mt-1 text-slate-500">
                  <span className="tracking-widest select-none">Bs. ••••••••</span>
                  <span className="text-[10px] text-slate-500 font-sans">Protegido con PIN</span>
                </div>
              </div>
            )
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

      {/* Banner de Alertas de Vencimiento y Lotes (Punto 6) */}
      {(stats.expiredCount > 0 || stats.expiringSoonCount > 0 || expirationFilter !== "ALL") && (
        <div
          className={`rounded-xl p-3 border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs transition-all ${
            stats.expiredCount > 0
              ? "bg-rose-950/30 border-rose-500/40 text-rose-200"
              : "bg-amber-950/30 border-amber-500/40 text-amber-200"
          }`}
        >
          <div className="flex items-center gap-2.5">
            <AlertTriangle
              className={`w-5 h-5 shrink-0 ${
                stats.expiredCount > 0 ? "text-rose-400 animate-pulse" : "text-amber-400"
              }`}
            />
            <div>
              <span className="font-bold block sm:inline">
                Control de Lotes y Fechas de Vencimiento:
              </span>{" "}
              <span className="text-slate-300">
                {stats.expiredCount > 0 && (
                  <strong className="text-rose-400 mr-2">
                    • {stats.expiredCount} {stats.expiredCount === 1 ? "producto VENCIDO" : "productos VENCIDOS"}
                  </strong>
                )}
                {stats.expiringSoonCount > 0 && (
                  <strong className="text-amber-300">
                    • {stats.expiringSoonCount}{" "}
                    {stats.expiringSoonCount === 1
                      ? "producto próximo a vencer (≤ 15 días)"
                      : "productos próximos a vencer (≤ 15 días)"}
                  </strong>
                )}
                {stats.expiredCount === 0 && stats.expiringSoonCount === 0 && (
                  <span>Filtro de vencimiento activo</span>
                )}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap shrink-0">
            <button
              type="button"
              onClick={() => {
                setExpirationFilter(expirationFilter === "EXPIRED" ? "ALL" : "EXPIRED");
                setSortBy("vencimiento_asc");
              }}
              className={`px-2.5 py-1 rounded-lg font-mono font-bold text-[11px] border transition-all cursor-pointer ${
                expirationFilter === "EXPIRED"
                  ? "bg-rose-600 text-white border-rose-400 shadow"
                  : "bg-rose-950/60 text-rose-300 border-rose-800/60 hover:bg-rose-900/50"
              }`}
            >
              Vencidos ({stats.expiredCount})
            </button>
            <button
              type="button"
              onClick={() => {
                setExpirationFilter(expirationFilter === "SOON" ? "ALL" : "SOON");
                setSortBy("vencimiento_asc");
              }}
              className={`px-2.5 py-1 rounded-lg font-mono font-bold text-[11px] border transition-all cursor-pointer ${
                expirationFilter === "SOON"
                  ? "bg-amber-500 text-slate-950 border-amber-300 shadow"
                  : "bg-amber-950/60 text-amber-300 border-amber-800/60 hover:bg-amber-900/50"
              }`}
            >
              Por Vencer ≤15d ({stats.expiringSoonCount})
            </button>
            {expirationFilter !== "ALL" && (
              <button
                type="button"
                onClick={() => setExpirationFilter("ALL")}
                className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-semibold cursor-pointer"
              >
                Ver Todos
              </button>
            )}
          </div>
        </div>
      )}

      {/* Control Bar: Search, Category Filter, and Actions */}
      <div className="bg-[#1a1d24] border border-slate-800 rounded-xl p-3 flex flex-col xl:flex-row items-stretch xl:items-center justify-between gap-3">
        {/* Filtros de búsqueda, categoría, orden y vista */}
        <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-0">
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Buscar por descripción, código o lote..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-[#12141a] border border-slate-700/80 rounded-lg pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors font-mono"
            />
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <SlidersHorizontal className="w-3.5 h-3.5 text-slate-400 hidden sm:inline" />
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="bg-[#12141a] border border-slate-700/80 rounded-lg px-2.5 py-2 text-xs text-slate-200 focus:outline-none focus:border-blue-500 cursor-pointer"
            >
              <option value="ALL">Todas las Categorías</option>
              {categories.map((c, idx) => (
                <option key={`cat-filter-${c.id}-${idx}`} value={c.id.toString()}>
                  {c.nombre}
                </option>
              ))}
            </select>
          </div>

          {/* Selector de Orden */}
          <div className="flex items-center gap-1.5 shrink-0">
            <ArrowUpDown className="w-3.5 h-3.5 text-amber-400 hidden sm:inline" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-[#12141a] border border-slate-700/80 rounded-lg px-2.5 py-2 text-xs text-slate-200 focus:outline-none focus:border-amber-500 font-semibold cursor-pointer"
              title="Criterio de ordenamiento"
            >
              <option value="nombre_asc">🔤 Nombre: A ➔ Z</option>
              <option value="nombre_desc">🔤 Nombre: Z ➔ A</option>
              <option value="stock_desc">📦 Stock: Mayor a Menor</option>
              <option value="stock_asc">⚠️ Stock: Menor a Mayor (Agotados)</option>
              <option value="vencimiento_asc">📅 Vencimiento: Más Próximos Primero</option>
              <option value="codigo_asc">🏷️ Cód. Barras: 0 ➔ 9</option>
              <option value="codigo_desc">🏷️ Cód. Barras: 9 ➔ 0</option>
              <option value="precio_desc">💰 Precio: Mayor a Menor</option>
              <option value="precio_asc">💵 Precio: Menor a Mayor</option>
              <option value="margen_desc">📈 Margen: Mayor a Menor</option>
              <option value="margen_asc">📉 Margen: Menor a Mayor</option>
              <option value="recientes">⏱️ Más Recientes (Últimos)</option>
            </select>
          </div>

          {/* Botón para alternar visualización de Nombres Completos vs Compactos */}
          <button
            type="button"
            onClick={() => setShowFullNames((prev) => !prev)}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg border transition-all cursor-pointer whitespace-nowrap select-none shrink-0 ${
              showFullNames
                ? "bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-sm shadow-amber-950/40 hover:bg-amber-500/30"
                : "bg-[#12141a] text-slate-400 hover:text-slate-200 border-slate-700/80 hover:border-slate-600"
            }`}
            title="Alternar entre ver nombres largos completos o compactos de una sola línea"
          >
            {showFullNames ? (
              <>
                <Eye className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span>Nombres: <strong className="text-amber-200">Completos</strong></span>
              </>
            ) : (
              <>
                <EyeOff className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span>Nombres: <strong>Compactos</strong></span>
              </>
            )}
          </button>
        </div>

        {/* Acciones principales: Exportar, Importar y Nuevo Producto */}
        <div className="flex flex-wrap items-center gap-2 shrink-0 justify-start sm:justify-end">
          {/* Botón de Exportar Stock con Información Detallada */}
          <button
            type="button"
            onClick={() => setShowExportModal(true)}
            id="btn-export-stock"
            className="flex items-center justify-center gap-1.5 bg-sky-600/20 hover:bg-sky-600/30 text-sky-300 border border-sky-500/50 hover:border-sky-400 font-semibold text-xs px-3.5 py-2 rounded-lg shadow-sm transition-all cursor-pointer whitespace-nowrap hover:scale-[1.02] active:scale-95"
            title="Exportar inventario y existencias detalladas a Excel (CSV) o formato de Auditoría"
          >
            <FileDown className="w-4 h-4 text-sky-400 shrink-0" />
            <span>Exportar Stock</span>
          </button>

          {permissions.puedeModificarPrecios && (
            <>
              <button
                type="button"
                onClick={() => setShowImportModal(true)}
                className="flex items-center justify-center gap-1.5 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/50 hover:border-emerald-400 font-semibold text-xs px-3.5 py-2 rounded-lg shadow-sm transition-all cursor-pointer whitespace-nowrap hover:scale-[1.02] active:scale-95"
                title="Importar catálogo masivo desde Excel, Saint, A2, Stellar o Valery"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Importar Excel / CSV</span>
              </button>

              <button
                onClick={openNewModal}
                id="btn-new-product"
                className="flex items-center justify-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs px-4 py-2 rounded-lg shadow-sm transition-all cursor-pointer whitespace-nowrap hover:scale-[1.02] active:scale-95"
                title="Crear un nuevo producto en el inventario"
              >
                <Plus className="w-4 h-4 shrink-0" />
                <span>Nuevo Producto</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Products Table with Fiscal Fields */}
      <div className="bg-[#1a1d24] border border-slate-800 rounded-xl overflow-hidden shadow-sm">
        <ColumnConfiguratorToolbar
          controller={colResizer}
          title="Configurar Tamaño de Columnas • Catálogo de Inventario"
        />
        <div className="overflow-x-auto max-h-[calc(100vh-250px)] min-h-[380px] overflow-y-auto overscroll-auto">
          <table
            data-resizable-table={colResizer.tableId}
            className="w-full text-left text-xs text-slate-300"
          >
            <thead className="bg-[#13151b] text-slate-400 border-b border-slate-800 uppercase font-mono text-[11px] sticky top-0 z-10 shadow-md">
              <tr>
                <th
                  data-col="codigo"
                  onClick={() => handleToggleSortColumn("codigo")}
                  className="py-2 px-2.5 cursor-pointer hover:text-white select-none transition-colors relative"
                  title="Clic para alternar orden por Código de Barras"
                >
                  <div className="flex items-center gap-1 pr-2">
                    <span>Cód. Barras</span>
                    {sortBy === "codigo_asc" && <ArrowUp className="w-3 h-3 text-amber-400" />}
                    {sortBy === "codigo_desc" && <ArrowDown className="w-3 h-3 text-amber-400" />}
                  </div>
                  <ColumnResizeHandle
                    colKey="codigo"
                    resizingCol={colResizer.resizingCol}
                    onStartResize={colResizer.startResize}
                  />
                </th>
                <th data-col="nombre" className="py-2 px-2.5 relative">
                  <div className="flex items-center justify-between gap-1 pr-2">
                    <div
                      onClick={() => handleToggleSortColumn("nombre")}
                      className="flex items-center gap-1 cursor-pointer hover:text-white select-none transition-colors"
                      title="Clic para alternar orden Alfabético"
                    >
                      <span>Descripción</span>
                      {sortBy === "nombre_asc" && <ArrowUp className="w-3 h-3 text-amber-400" />}
                      {sortBy === "nombre_desc" && <ArrowDown className="w-3 h-3 text-amber-400" />}
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowFullNames((prev) => !prev);
                      }}
                      className={`px-1.5 py-0.5 rounded text-[10px] font-sans font-bold flex items-center gap-1 transition-all cursor-pointer ${
                        showFullNames
                          ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                          : "bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-700/60"
                      }`}
                      title={showFullNames ? "Cambiar a nombres compactos de 1 línea" : "Expandir todos los nombres completos"}
                    >
                      {showFullNames ? <Eye className="w-3 h-3 text-amber-400" /> : <EyeOff className="w-3 h-3 text-slate-400" />}
                      <span>{showFullNames ? "Completo" : "Expandir"}</span>
                    </button>
                  </div>
                  <ColumnResizeHandle
                    colKey="nombre"
                    resizingCol={colResizer.resizingCol}
                    onStartResize={colResizer.startResize}
                  />
                </th>
                <th data-col="categoria" className="py-2 px-2.5 relative">
                  <span className="pr-2">Categoría</span>
                  <ColumnResizeHandle
                    colKey="categoria"
                    resizingCol={colResizer.resizingCol}
                    onStartResize={colResizer.startResize}
                  />
                </th>
                <th
                  data-col="stock"
                  onClick={() => handleToggleSortColumn("stock")}
                  className="py-2 px-2.5 text-center cursor-pointer hover:text-white select-none transition-colors relative"
                  title="Clic para alternar orden por Stock"
                >
                  <div className="flex items-center justify-center gap-1 pr-2">
                    <span>Stock</span>
                    {sortBy === "stock_desc" && <ArrowDown className="w-3 h-3 text-amber-400" />}
                    {sortBy === "stock_asc" && <ArrowUp className="w-3 h-3 text-amber-400" />}
                  </div>
                  <ColumnResizeHandle
                    colKey="stock"
                    resizingCol={colResizer.resizingCol}
                    onStartResize={colResizer.startResize}
                  />
                </th>
                <th data-col="alicuota" className="py-2 px-2.5 text-center relative">
                  <span className="pr-2">Alícuota</span>
                  <ColumnResizeHandle
                    colKey="alicuota"
                    resizingCol={colResizer.resizingCol}
                    onStartResize={colResizer.startResize}
                  />
                </th>
                {permissions.puedeVerCostosYMargenes && (
                  <th data-col="costo" className="py-2 px-2.5 text-right relative">
                    <span className="pr-2">Costo PMP ($/Bs)</span>
                    <ColumnResizeHandle
                      colKey="costo"
                      resizingCol={colResizer.resizingCol}
                      onStartResize={colResizer.startResize}
                    />
                  </th>
                )}
                <th
                  data-col="precio"
                  onClick={() => handleToggleSortColumn("precio")}
                  className="py-2 px-2.5 text-right cursor-pointer hover:text-white select-none transition-colors relative"
                  title="Clic para alternar orden por Precio de Venta"
                >
                  <div className="flex items-center justify-end gap-1 pr-2">
                    <span>P. Venta ($/Bs)</span>
                    {sortBy === "precio_desc" && <ArrowDown className="w-3 h-3 text-amber-400" />}
                    {sortBy === "precio_asc" && <ArrowUp className="w-3 h-3 text-amber-400" />}
                  </div>
                  <ColumnResizeHandle
                    colKey="precio"
                    resizingCol={colResizer.resizingCol}
                    onStartResize={colResizer.startResize}
                  />
                </th>
                {permissions.puedeVerCostosYMargenes && (
                  <th
                    data-col="margen"
                    onClick={() => handleToggleSortColumn("margen")}
                    className="py-2 px-2.5 text-center cursor-pointer hover:text-white select-none transition-colors relative"
                    title="Clic para alternar orden por Margen"
                  >
                    <div className="flex items-center justify-center gap-1 pr-2">
                      <span>Margen</span>
                      {sortBy === "margen_desc" && <ArrowDown className="w-3 h-3 text-amber-400" />}
                      {sortBy === "margen_asc" && <ArrowUp className="w-3 h-3 text-amber-400" />}
                    </div>
                    <ColumnResizeHandle
                      colKey="margen"
                      resizingCol={colResizer.resizingCol}
                      onStartResize={colResizer.startResize}
                    />
                  </th>
                )}
                <th
                  data-col="estado"
                  onClick={() => handleToggleSortColumn("vencimiento")}
                  className="py-2 px-2.5 text-center cursor-pointer hover:text-white select-none transition-colors relative"
                  title="Clic para ordenar por Fecha de Vencimiento más próxima"
                >
                  <div className="flex items-center justify-center gap-1 pr-2">
                    <span>Estado / Vence</span>
                    {sortBy === "vencimiento_asc" && <ArrowUp className="w-3 h-3 text-amber-400" />}
                  </div>
                  <ColumnResizeHandle
                    colKey="estado"
                    resizingCol={colResizer.resizingCol}
                    onStartResize={colResizer.startResize}
                  />
                </th>
                <th data-col="acciones" className="py-2 px-2.5 text-center relative">
                  <span className="pr-2">Acciones</span>
                  <ColumnResizeHandle
                    colKey="acciones"
                    resizingCol={colResizer.resizingCol}
                    onStartResize={colResizer.startResize}
                  />
                </th>
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
                pagination.paginatedItems.map((p) => {
                  const isOutOfStock = p.stock_actual <= 0;
                  const isLowStock = !isOutOfStock && p.stock_actual <= p.stock_minimo;
                  const currentPmp = p.costo_promedio_ponderado || p.precio_costo;
                  const marginPercent =
                    currentPmp > 0
                      ? Math.round(((p.precio_venta - currentPmp) / currentPmp) * 100)
                      : 0;

                  const costVes = currentPmp * bcvRate;
                  const saleVes = p.precio_venta * bcvRate;
                  const expInfo = getProductExpiryInfo(p.fecha_vencimiento);

                  return (
                    <tr key={`prod-row-${p.id}-${p.codigo_barras || ""}`} className="hover:bg-slate-800/40 transition-colors">
                      <td data-col="codigo" className="py-2 px-2.5 font-mono text-slate-400 select-all text-[11px] truncate">
                        <div className="truncate">{p.codigo_barras || "N/A"}</div>
                        {p.lote && (
                          <span className="inline-block mt-0.5 px-1.5 py-0.2 rounded bg-slate-800/90 text-slate-300 border border-slate-700 text-[9.5px] font-mono">
                            Lote: {p.lote}
                          </span>
                        )}
                      </td>
                      {/* Descripción con soporte para ver nombres largos completos */}
                      {(() => {
                        const isExpanded = showFullNames || colResizer.wrapText || !!expandedProductIds[p.id];
                        const isLongName = (p.nombre || "").length > 25;

                        return (
                          <td
                            data-col="nombre"
                            className={`py-2 px-2.5 transition-all ${
                              isExpanded
                                ? "whitespace-normal break-words"
                                : "truncate"
                            }`}
                          >
                            <div className="flex items-start justify-between gap-1.5 group">
                              <span
                                onClick={() => {
                                  if (isLongName) toggleExpandProductName(p.id);
                                }}
                                className={`font-medium text-white transition-colors ${
                                  isExpanded
                                    ? "leading-snug select-text"
                                    : "truncate cursor-pointer hover:text-amber-200"
                                }`}
                                title={
                                  isLongName
                                    ? isExpanded
                                      ? "Clic para contraer nombre"
                                      : `${p.nombre} (Clic para expandir nombre completo)`
                                    : p.nombre
                                }
                              >
                                {p.nombre}
                              </span>

                              <div className="flex items-center gap-1 shrink-0 ml-1">
                                {isLongName && !showFullNames && !colResizer.wrapText && (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      toggleExpandProductName(p.id);
                                    }}
                                    className={`p-1 rounded transition-colors cursor-pointer ${
                                      isExpanded
                                        ? "text-amber-400 bg-amber-500/10 hover:bg-amber-500/20"
                                        : "text-slate-400 hover:text-amber-300 hover:bg-slate-800"
                                    }`}
                                    title={isExpanded ? "Contraer a una línea" : "Ver nombre completo"}
                                  >
                                    {isExpanded ? (
                                      <ChevronUp className="w-3.5 h-3.5" />
                                    ) : (
                                      <ChevronDown className="w-3.5 h-3.5" />
                                    )}
                                  </button>
                                )}

                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setInspectProduct(p);
                                  }}
                                  className="opacity-0 group-hover:opacity-100 p-1 rounded text-slate-500 hover:text-white hover:bg-slate-800 transition-all cursor-pointer"
                                  title="Inspeccionar nombre completo y detalles técnicos"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          </td>
                        );
                      })()}
                      <td data-col="categoria" className="py-2 px-2.5 truncate">
                        <span className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 text-[11px] border border-slate-700/60">
                          {p.categoria_nombre || "General"}
                        </span>
                      </td>
                      <td data-col="stock" className="py-2 px-2.5 text-center">
                        <button
                          type="button"
                          onClick={() => {
                            if (permissions.puedeAjustarStockManual) {
                              openStockAdjustment(p);
                            } else if (permissions.puedeModificarPrecios) {
                              openEditModal(p);
                            }
                          }}
                          title="Haga clic para ajustar existencia / Kardex"
                          className="group inline-flex items-center justify-center gap-1.5 px-2.5 py-1 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
                        >
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
                          <span className="text-[10px] text-slate-500">{p.unidad_medida}</span>
                          {permissions.puedeAjustarStockManual && (
                            <ArrowUpDown className="w-3 h-3 text-slate-600 group-hover:text-blue-400 transition-colors" />
                          )}
                        </button>
                      </td>
                      <td data-col="alicuota" className="py-2 px-2.5 text-center">
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
                        <td data-col="costo" className="py-2 px-2.5 text-right font-mono">
                          <div className="text-slate-300">${currentPmp.toFixed(2)}</div>
                          <div className="text-[10px] text-slate-500">Bs. {costVes.toFixed(2)}</div>
                        </td>
                      )}
                      <td data-col="precio" className="py-2 px-2.5 text-right font-mono font-bold">
                        <div className="text-white">${p.precio_venta.toFixed(2)}</div>
                        <div className="text-[10px] text-amber-400">Bs. {saleVes.toFixed(2)}</div>
                      </td>
                      {permissions.puedeVerCostosYMargenes && (
                        <td data-col="margen" className="py-2 px-2.5 text-center font-mono text-blue-400 font-semibold">
                          {marginPercent}%
                        </td>
                      )}
                      <td data-col="estado" className="py-2 px-2.5 text-center">
                        <div className="flex flex-col items-center justify-center gap-1">
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

                          {expInfo.status === "EXPIRED" && (
                            <span
                              className="inline-flex items-center gap-1 text-[9.5px] font-mono font-bold px-1.5 py-0.5 rounded bg-rose-950 text-rose-300 border border-rose-500/60"
                              title={`Producto vencido el ${expInfo.formattedDate}`}
                            >
                              ⚠️ VENCIDO ({expInfo.formattedDate})
                            </span>
                          )}
                          {expInfo.status === "SOON" && (
                            <span
                              className="inline-flex items-center gap-1 text-[9.5px] font-mono font-bold px-1.5 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-500/60"
                              title={`Vence en ${expInfo.daysRemaining} días (${expInfo.formattedDate})`}
                            >
                              ⏳ Vence en {expInfo.daysRemaining}d ({expInfo.formattedDate})
                            </span>
                          )}
                          {expInfo.status === "OK" && (
                            <span className="text-[9.5px] font-mono text-slate-400">
                              Vence: {expInfo.formattedDate}
                            </span>
                          )}
                        </div>
                      </td>
                      <td data-col="acciones" className="py-2 px-2.5 text-center">
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
        <TablePagination
          currentPage={pagination.currentPage}
          pageSize={pagination.pageSize}
          totalPages={pagination.totalPages}
          totalItems={pagination.totalItems}
          startIndex={pagination.startIndex}
          endIndex={pagination.endIndex}
          onPageChange={pagination.setCurrentPage}
          onPageSizeChange={pagination.setPageSize}
          itemLabel="productos"
        />
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
                    {categories.map((c, idx) => (
                      <option key={`modal-cat-opt-${c.id}-${idx}`} value={c.id}>
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
                  <label className="block text-slate-300 font-medium mb-1">
                    {editingProduct ? "Existencia / Stock Actual:" : "Stock Inicial:"}
                  </label>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    placeholder="0"
                    value={formStock}
                    onChange={(e) => setFormStock(e.target.value)}
                    className="w-full bg-[#111317] border border-slate-700 rounded-lg px-3 py-2 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Stock Mínimo (Alerta):</label>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    placeholder="5"
                    value={formMinStock}
                    onChange={(e) => setFormMinStock(e.target.value)}
                    className="w-full bg-[#111317] border border-slate-700 rounded-lg px-3 py-2 text-white font-mono"
                  />
                </div>
              </div>

              {/* Control de Lote y Fecha de Vencimiento (Punto 6) */}
              <div className="grid grid-cols-2 gap-2.5 p-2.5 rounded-xl bg-[#12141a] border border-slate-800">
                <div>
                  <label className="block text-amber-300 font-semibold mb-1 text-[11px]">
                    📅 Fecha Vencimiento (Opcional):
                  </label>
                  <input
                    type="date"
                    value={formExpirationDate}
                    onChange={(e) => setFormExpirationDate(e.target.value)}
                    className="w-full bg-[#181a20] border border-slate-700 rounded-lg px-2.5 py-1.5 text-white font-mono text-xs focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1 text-[11px]">
                    🏷️ N° Lote / Pasillo (Opcional):
                  </label>
                  <input
                    type="text"
                    placeholder="Ej: L-2026-09"
                    value={formBatch}
                    onChange={(e) => setFormBatch(e.target.value)}
                    className="w-full bg-[#181a20] border border-slate-700 rounded-lg px-2.5 py-1.5 text-white font-mono text-xs focus:outline-none focus:border-blue-500"
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
                    {stockModalProduct.stock_actual ?? 0} {stockModalProduct.unidad_medida || "Pza"}
                  </strong>
                </span>
                <span className="text-slate-400">
                  Costo PMP:{" "}
                  <strong className="text-amber-300 font-mono">
                    ${(stockModalProduct.costo_promedio_ponderado || stockModalProduct.precio_costo || 0).toFixed(2)}
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
                  step="any"
                  required
                  min={adjType === "AJUSTE" ? "0" : "0.01"}
                  placeholder={adjType === "AJUSTE" ? "0" : "1"}
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
                      step="any"
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
                          ${(stockModalProduct.costo_promedio_ponderado || stockModalProduct.precio_costo || 0).toFixed(2)}
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

      {/* Modal de Inspección de Nombre Completo y Ficha de Producto */}
      {inspectProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-[#151821] border border-slate-700 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl animate-in zoom-in-95 duration-150 flex flex-col max-h-[90vh]">
            <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-[#11131a] shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
                  <Eye className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Nombre Completo & Detalle</h3>
                  <p className="text-[11px] text-slate-400">Ficha técnica y descripción comercial</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setInspectProduct(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 overflow-y-auto">
              <div>
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1.5">
                  Descripción Comercial Completa del Producto:
                </span>
                <div className="p-4 rounded-xl bg-[#0e1017] border border-slate-800 text-white font-medium text-sm sm:text-base leading-relaxed select-text break-words shadow-inner">
                  {inspectProduct.nombre}
                </div>
                <div className="flex items-center justify-between mt-2 text-[11px] text-slate-400">
                  <span>Longitud: <strong className="text-slate-200">{inspectProduct.nombre.length}</strong> caracteres</span>
                  <button
                    type="button"
                    onClick={() => handleCopyInspect(inspectProduct.nombre, "Nombre completo")}
                    className="flex items-center gap-1.5 text-blue-400 hover:text-blue-300 font-semibold px-2 py-1 rounded-md hover:bg-blue-500/10 transition-colors cursor-pointer"
                  >
                    {copiedInspectText === "Nombre completo" ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-emerald-400">¡Copiado al portapapeles!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copiar Nombre Completo</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5 text-xs">
                <div className="p-3 rounded-xl bg-[#0e1017] border border-slate-800/80">
                  <span className="text-[11px] text-slate-500 block">Código / SKU:</span>
                  <div className="flex items-center justify-between mt-1">
                    <span className="font-mono font-bold text-white select-all">
                      {inspectProduct.codigo_barras || "N/A"}
                    </span>
                    {inspectProduct.codigo_barras && (
                      <button
                        type="button"
                        onClick={() => handleCopyInspect(inspectProduct.codigo_barras, "Código de barras")}
                        className="text-slate-400 hover:text-white cursor-pointer p-0.5"
                        title="Copiar código"
                      >
                        <Copy className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-[#0e1017] border border-slate-800/80">
                  <span className="text-[11px] text-slate-500 block">Categoría:</span>
                  <span className="font-semibold text-slate-200 mt-1 block truncate">
                    {inspectProduct.categoria_nombre || "General"}
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-[#0e1017] border border-slate-800/80">
                  <span className="text-[11px] text-slate-500 block">Stock Disponible:</span>
                  <div className="flex items-baseline gap-1 mt-1">
                    <span className="text-sm font-bold font-mono text-emerald-400">
                      {inspectProduct.stock_actual}
                    </span>
                    <span className="text-[11px] text-slate-400">{inspectProduct.unidad_medida || "Pza"}</span>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-[#0e1017] border border-slate-800/80">
                  <span className="text-[11px] text-slate-500 block">Precio de Venta:</span>
                  <div className="mt-1">
                    <span className="text-sm font-bold font-mono text-amber-400">
                      ${inspectProduct.precio_venta.toFixed(2)}
                    </span>
                    <span className="text-[11px] text-slate-400 ml-1 font-mono">
                      (Bs. {(inspectProduct.precio_venta * bcvRate).toFixed(2)})
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-4 bg-[#11131a] border-t border-slate-800 flex items-center justify-between gap-2 shrink-0">
              <span className="text-[11px] text-slate-500">
                Tip: Puede activar &quot;Nombres Completos&quot; en la barra superior.
              </span>
              <div className="flex items-center gap-2">
                {permissions.puedeModificarPrecios && (
                  <button
                    type="button"
                    onClick={() => {
                      const prod = inspectProduct;
                      setInspectProduct(null);
                      openEditModal(prod);
                    }}
                    className="px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs rounded-xl transition cursor-pointer flex items-center gap-1.5"
                  >
                    <Edit className="w-3.5 h-3.5" />
                    <span>Editar Producto</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setInspectProduct(null)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs rounded-xl transition cursor-pointer"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Validación de PIN de Administrador para Ver Valuaciones */}
      {showPinModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-[#151821] border border-slate-700 rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl animate-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-[#11131a]">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
                  <KeyRound className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Autorización Requerida</h3>
                  <p className="text-[11px] text-slate-400">Valuación de Costo y Venta</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowPinModal(false);
                  setAdminPinInput("");
                  setPinError("");
                }}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleVerifyPin} className="p-5 space-y-4">
              <p className="text-xs text-slate-300 leading-relaxed text-center">
                Por seguridad financiera, ingrese el <strong>PIN de Administrador</strong> para visualizar las cifras de valuación del inventario.
              </p>

              {pinError && (
                <div className="p-2.5 rounded-xl bg-rose-950/50 border border-rose-500/50 text-rose-200 text-xs flex items-center gap-2 animate-in shake duration-200">
                  <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                  <span>{pinError}</span>
                </div>
              )}

              {/* PIN input display */}
              <div className="relative">
                <input
                  type={showPinPassword ? "text" : "password"}
                  autoFocus
                  required
                  value={adminPinInput}
                  onChange={(e) => {
                    setAdminPinInput(e.target.value);
                    if (pinError) setPinError("");
                  }}
                  placeholder="Ingrese PIN..."
                  className="w-full text-center tracking-widest text-xl font-mono py-2.5 px-10 bg-[#0c0e14] border border-slate-700 rounded-xl text-white focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all font-bold placeholder:tracking-normal placeholder:text-sm placeholder:text-slate-600"
                />
                <button
                  type="button"
                  onClick={() => setShowPinPassword((prev) => !prev)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-1"
                  title={showPinPassword ? "Ocultar PIN" : "Mostrar PIN"}
                >
                  {showPinPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {/* Teclado numérico táctil para pantalla Touch / POS */}
              <div className="grid grid-cols-3 gap-1.5 pt-1">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                  <button
                    key={`pin-keypad-${num}`}
                    type="button"
                    onClick={() => handleAppendPinDigit(num.toString())}
                    className="py-2.5 bg-[#1a1d26] hover:bg-slate-700/80 active:scale-95 text-white font-mono font-bold text-base rounded-lg border border-slate-700/60 transition-all cursor-pointer"
                  >
                    {num}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={handleClearPin}
                  className="py-2.5 bg-[#181b22] hover:bg-slate-800 text-slate-400 hover:text-white font-mono text-xs font-bold rounded-lg border border-slate-800 transition-all cursor-pointer"
                  title="Limpiar"
                >
                  C
                </button>
                <button
                  type="button"
                  onClick={() => handleAppendPinDigit("0")}
                  className="py-2.5 bg-[#1a1d26] hover:bg-slate-700/80 active:scale-95 text-white font-mono font-bold text-base rounded-lg border border-slate-700/60 transition-all cursor-pointer"
                >
                  0
                </button>
                <button
                  type="button"
                  onClick={handleBackspacePin}
                  className="py-2.5 bg-[#181b22] hover:bg-slate-800 text-slate-400 hover:text-white font-mono text-xs font-bold rounded-lg border border-slate-800 transition-all cursor-pointer"
                  title="Borrar último dígito"
                >
                  ⌫
                </button>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowPinModal(false);
                    setAdminPinInput("");
                    setPinError("");
                  }}
                  className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs rounded-xl transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={!adminPinInput.trim()}
                  className="flex-1 py-2.5 bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 disabled:opacity-50 text-slate-950 font-bold text-xs rounded-xl shadow-lg shadow-amber-950/40 transition-all cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span>Desbloquear</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Importación & Migración Masiva desde Excel / CSV (Saint, A2) */}
      {showImportModal && (
        <Suspense fallback={null}>
          <UniversalCatalogImportModal
            isOpen={showImportModal}
            onClose={() => setShowImportModal(false)}
            products={products}
            categories={categories}
            bcvRate={bcvRate}
            showToast={showToast || (() => {})}
            onImportSuccess={(newProds, newCats) => {
              if (onBatchImportProducts) {
                onBatchImportProducts(newProds, newCats);
              }
            }}
          />
        </Suspense>
      )}

      {/* Modal de Exportación de Stock Detallado (Opción 1) */}
      {showExportModal && (
        <Suspense fallback={null}>
          <StockExportModal
            isOpen={showExportModal}
            onClose={() => setShowExportModal(false)}
            products={products}
            filteredProducts={filteredProducts}
            categories={categories}
            bcvRate={bcvRate}
            isValuationUnlocked={isValuationUnlocked}
            onUnlockValuation={() => setIsValuationUnlocked(true)}
            permissions={permissions}
            showToast={showToast}
            currentSearchTerm={search}
            currentCategoryName={
              selectedCategory !== "ALL"
                ? categories.find((c) => c.id.toString() === selectedCategory)?.nombre
                : undefined
            }
          />
        </Suspense>
      )}
    </div>
  );
};
