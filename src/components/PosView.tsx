import React, { useState, useMemo, useRef, useEffect } from "react";
import {
  Producto,
  CartItem,
  Venta,
  MetodoPagoFiscal,
  WizarPosTransactionResult,
  PosOperationalMode,
} from "../types";
import { EMISOR_FISCAL_DEFAULT, getStoredEmisorFiscal, getStoredNegocioConfig } from "../mockDb";
import { WizarPosModal } from "./WizarPosModal";
import { WizarPosConfigModal } from "./WizarPosConfigModal";
import {
  Search,
  ShoppingCart,
  Plus,
  Minus,
  Trash2,
  Printer,
  Check,
  CreditCard,
  FileText,
  ShieldAlert,
  DollarSign,
  Receipt,
  Percent,
  CheckCircle2,
  XCircle,
  Smartphone,
  Settings,
  Wifi,
  Barcode,
  Zap,
  Layers,
  ArrowRight,
} from "lucide-react";

interface PosViewProps {
  products: Producto[];
  bcvRate: number;
  correlativos: { facturaNum: number; controlNum: number };
  onCompleteSale: (
    items: CartItem[],
    metodo: MetodoPagoFiscal,
    pagado: number,
    cambio: number,
    clienteRif: string,
    clienteNombre: string,
    clienteDireccion: string,
    numeroFactura: string,
    numeroControl: string,
    aplicaIgtfCustom?: boolean,
    posMetadata?: { referencia?: string; lote?: string; aprobacion?: string; terminal?: string }
  ) => Venta;
  posMode?: PosOperationalMode;
  onTogglePosMode?: (mode: PosOperationalMode) => void;
}

export const PosView: React.FC<PosViewProps> = ({
  products,
  bcvRate,
  correlativos,
  onCompleteSale,
  posMode = "inventory_only",
  onTogglePosMode,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<MetodoPagoFiscal>(
    posMode === "smartpos" ? "Punto de Venta" : "Divisas en Efectivo"
  );
  const [tenderedAmount, setTenderedAmount] = useState<string>("");
  const [printTicket, setPrintTicket] = useState(true);
  const [completedSale, setCompletedSale] = useState<Venta | null>(null);
  const [showTicketModal, setShowTicketModal] = useState(false);
  const [showWizarPosModal, setShowWizarPosModal] = useState(false);
  const [showWizarPosConfigModal, setShowWizarPosConfigModal] = useState(false);

  // WizarPos cached IP for quick display
  const [wizarPosIp, setWizarPosIp] = useState<string>(() => {
    try {
      const saved = localStorage.getItem("wizarpos_config");
      return saved ? JSON.parse(saved).ip : "192.168.1.45";
    } catch {
      return "192.168.1.45";
    }
  });

  // Client Fiscal Info (Providencia SNAT/00071)
  const [rifPrefix, setRifPrefix] = useState<"V" | "J" | "E" | "G" | "P">("V");
  const [rifNumber, setRifNumber] = useState("00000000-0");
  const [clienteNombre, setClienteNombre] = useState("Consumidor Final");
  const [clienteDireccion, setClienteDireccion] = useState("Caracas, Venezuela");

  // Fiscal Correlatives
  const [customFactura, setCustomFactura] = useState(
    `00-${correlativos.facturaNum.toString().padStart(6, "0")}`
  );
  const [customControl, setCustomControl] = useState(
    `00-${correlativos.controlNum.toString().padStart(6, "0")}`
  );

  // Stock error banner (LISLR Art. 177)
  const [stockError, setStockError] = useState<string | null>(null);

  // User selection for applying IGTF (3%) - button/toggle selectable by user
  const [aplicaIgtf, setAplicaIgtf] = useState<boolean>(false);

  // Global Hardware Barcode Scanner listener state & refs
  const barcodeBufferRef = useRef<string>("");
  const lastKeyTimeRef = useRef<number>(0);
  const [lastScannedProduct, setLastScannedProduct] = useState<string | null>(null);

  const fullRif = `${rifPrefix}-${rifNumber.trim()}`;

  const handleSelectPaymentMethod = (metodo: MetodoPagoFiscal) => {
    setPaymentMethod(metodo);
    setTenderedAmount("");
    // Sugerencia automática inicial: si es divisa/cripto sugiere IGTF activo, si es Bs inactivo
    if (metodo === "Divisas en Efectivo" || metodo === "Criptoactivos") {
      setAplicaIgtf(true);
    } else {
      setAplicaIgtf(false);
    }
  };

  // Filter products for quick search dropdown
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase().trim();
    return products
      .filter(
        (p) =>
          p.nombre.toLowerCase().includes(q) ||
          (p.codigo_barras && p.codigo_barras.toLowerCase().includes(q))
      )
      .slice(0, 6);
  }, [products, searchQuery]);

  // Detailed Fiscal Breakdown
  const fiscalTotals = useMemo(() => {
    let rawBaseExentaUsd = 0;
    let rawBaseImponibleUsd = 0;

    cart.forEach((item) => {
      if (item.alicuota_iva === 0) {
        rawBaseExentaUsd += item.subtotal;
      } else {
        rawBaseImponibleUsd += item.subtotal;
      }
    });

    const baseExentaUsd = Math.round(rawBaseExentaUsd * 100) / 100;
    const baseImponibleUsd = Math.round(rawBaseImponibleUsd * 100) / 100;
    const ivaUsd = Math.round(baseImponibleUsd * 0.16 * 100) / 100; // 16% IVA General
    const subtotalConIvaUsd = Math.round((baseExentaUsd + baseImponibleUsd + ivaUsd) * 100) / 100;

    // IGTF 3% condicional según selección del usuario
    const igtfUsd = aplicaIgtf ? Math.round(subtotalConIvaUsd * 0.03 * 100) / 100 : 0;
    const totalUsd = Math.round((subtotalConIvaUsd + igtfUsd) * 100) / 100;

    // Equivalencias en Bolívares (VES) a Tasa BCV redondeadas al céntimo (Reglamento Ley IVA)
    const baseExentaVes = Math.round(baseExentaUsd * bcvRate * 100) / 100;
    const baseImponibleVes = Math.round(baseImponibleUsd * bcvRate * 100) / 100;
    const ivaVes = Math.round(ivaUsd * bcvRate * 100) / 100;
    const igtfVes = Math.round(igtfUsd * bcvRate * 100) / 100;
    const totalVes = Math.round(totalUsd * bcvRate * 100) / 100;

    const totalItems = cart.reduce((sum, item) => sum + item.cantidad, 0);

    return {
      baseExentaUsd,
      baseImponibleUsd,
      ivaUsd,
      igtfUsd,
      totalUsd,
      baseExentaVes,
      baseImponibleVes,
      ivaVes,
      igtfVes,
      totalVes,
      totalItems,
    };
  }, [cart, aplicaIgtf, bcvRate]);

  // Change Calculation (en USD o Bs. según el método)
  const changeAmount = useMemo(() => {
    const tendered = parseFloat(tenderedAmount) || 0;
    if (paymentMethod === "Divisas en Efectivo") {
      return Math.max(0, tendered - fiscalTotals.totalUsd);
    } else {
      // Bolívares
      return Math.max(0, tendered - fiscalTotals.totalVes);
    }
  }, [paymentMethod, tenderedAmount, fiscalTotals]);

  // Stock check strictly forbidding negative inventory (LISLR Art. 177)
  const handleAddToCart = (product: Producto) => {
    setStockError(null);
    const existingInCart = cart.find((item) => item.producto.id === product.id);
    const currentQtyInCart = existingInCart ? existingInCart.cantidad : 0;
    const newRequestedQty = currentQtyInCart + 1;

    // Validación estricta Art. 177 Reglamento LISLR: Stock_Disponible - Cantidad < 0
    if (newRequestedQty > product.stock_actual) {
      const msg = `⚠️ Infracción Art. 177 Reglamento LISLR: Prohibición de existencias negativas. No se puede facturar '${product.nombre}' (Existencia actual: ${product.stock_actual} ${product.unidad_medida}, solicitada: ${newRequestedQty}).`;
      setStockError(msg);
      return;
    }

    setCart((prev) => {
      const existing = prev.find((item) => item.producto.id === product.id);
      if (existing) {
        return prev.map((item) =>
          item.producto.id === product.id
            ? {
                ...item,
                cantidad: newRequestedQty,
                subtotal: Math.round(newRequestedQty * item.precio_unitario * 100) / 100,
              }
            : item
        );
      } else {
        return [
          ...prev,
          {
            producto: product,
            cantidad: 1,
            precio_unitario: product.precio_venta,
            subtotal: product.precio_venta,
            alicuota_iva: product.alicuota_iva,
            es_exento: product.alicuota_iva === 0,
          },
        ];
      }
    });
    setSearchQuery("");
  };

  const handleUpdateQuantity = (prodId: number, delta: number) => {
    setStockError(null);
    const itemInCart = cart.find((item) => item.producto.id === prodId);
    if (!itemInCart) return;

    const newQty = itemInCart.cantidad + delta;
    if (newQty <= 0) {
      handleRemoveItem(prodId);
      return;
    }

    // Regla de no existencia negativa
    if (newQty > itemInCart.producto.stock_actual) {
      setStockError(
        `⚠️ Infracción Art. 177 LISLR: Existencia insuficiente para '${itemInCart.producto.nombre}'. Stock disponible: ${itemInCart.producto.stock_actual}.`
      );
      return;
    }

    setCart((prev) =>
      prev.map((item) =>
        item.producto.id === prodId
          ? {
              ...item,
              cantidad: newQty,
              subtotal: Math.round(newQty * item.precio_unitario * 100) / 100,
            }
          : item
      )
    );
  };

  const handleRemoveItem = (prodId: number) => {
    setCart((prev) => prev.filter((item) => item.producto.id !== prodId));
    setStockError(null);
  };

  const handleClearCart = () => {
    setCart([]);
    setTenderedAmount("");
    setStockError(null);
  };

  // Global Hardware Barcode Scanner Listener for Fiscal POS
  // Scans barcodes directly without requiring focus on the search input
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // If user is typing in an input, textarea or editable field, allow normal typing
      const activeTag = (document.activeElement?.tagName || "").toLowerCase();
      const isEditable = (document.activeElement as HTMLElement)?.isContentEditable;
      if (activeTag === "input" || activeTag === "textarea" || isEditable) {
        return;
      }

      // If any modal dialog is open, do not intercept
      if (showTicketModal || showWizarPosModal || showWizarPosConfigModal) {
        return;
      }

      const currentTime = Date.now();
      // Hardware scanners send characters with sub-50ms intervals
      if (currentTime - lastKeyTimeRef.current > 100) {
        barcodeBufferRef.current = "";
      }
      lastKeyTimeRef.current = currentTime;

      if (e.key === "Enter") {
        const scannedCode = barcodeBufferRef.current.trim();
        if (scannedCode.length >= 2) {
          const found = products.find(
            (p) =>
              (p.codigo_barras && p.codigo_barras.toLowerCase() === scannedCode.toLowerCase()) ||
              p.id.toString() === scannedCode ||
              (p.codigo_interno && p.codigo_interno.toLowerCase() === scannedCode.toLowerCase())
          );

          if (found) {
            handleAddToCart(found);
            setLastScannedProduct(found.nombre);
            setTimeout(() => setLastScannedProduct(null), 2500);
          } else {
            setStockError(`⚠️ Producto no encontrado para el código escaneado: "${scannedCode}"`);
          }
        }
        barcodeBufferRef.current = "";
      } else if (e.key.length === 1) {
        barcodeBufferRef.current += e.key;
      }
    };

    window.addEventListener("keydown", handleGlobalKeyDown);
    return () => {
      window.removeEventListener("keydown", handleGlobalKeyDown);
    };
  }, [products, showTicketModal, showWizarPosModal, showWizarPosConfigModal]);

  const handleQuickKeySearch = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && searchResults.length > 0) {
      handleAddToCart(searchResults[0]);
    }
  };

  const handleCheckout = () => {
    if (cart.length === 0) return;
    setStockError(null);

    // Verificación final de integridad de stock para todo el carrito (Transacción atómica previa)
    for (const it of cart) {
      if (it.cantidad > it.producto.stock_actual) {
        setStockError(
          `❌ ERROR DE INTEGRIDAD FISCAL (LISLR Art. 177): El artículo '${it.producto.nombre}' excede las existencias físicas disponibles en almacén (${it.producto.stock_actual} disp. vs ${it.cantidad} solicitadas). La transacción fue abortada.`
        );
        return;
      }
    }

    // Si la forma de pago es Punto de Venta y estamos en modo SmartPOS, abrir modal TCP/IP con el terminal
    if (paymentMethod === "Punto de Venta" && posMode === "smartpos") {
      setShowWizarPosModal(true);
      return;
    }

    // En Modo Solo Inventario o cualquier método manual, registrar de inmediato descontando stock
    executeSaleCompletion();
  };

  const executeSaleCompletion = (posData?: {
    referencia?: string;
    lote?: string;
    aprobacion?: string;
    terminal?: string;
  }) => {
    const totalToPay =
      paymentMethod === "Divisas en Efectivo"
        ? fiscalTotals.totalUsd
        : fiscalTotals.totalVes;

    const tendered =
      parseFloat(tenderedAmount) > 0 ? parseFloat(tenderedAmount) : totalToPay;

    if (tendered < totalToPay - 0.01) {
      const monedaSimbolo = paymentMethod === "Divisas en Efectivo" ? "$" : "Bs.";
      alert(
        `El monto recibido (${monedaSimbolo}${tendered.toFixed(2)}) es menor al total a liquidar (${monedaSimbolo}${totalToPay.toFixed(2)}).`
      );
      return;
    }

    const sale = onCompleteSale(
      cart,
      paymentMethod,
      tendered,
      changeAmount,
      fullRif,
      clienteNombre,
      clienteDireccion,
      customFactura,
      customControl,
      aplicaIgtf,
      posData
    );

    setCompletedSale(sale);
    setCart([]);
    setTenderedAmount("");

    if (printTicket) {
      setShowTicketModal(true);
    }
  };

  const handleWizarPosSuccess = (result: WizarPosTransactionResult) => {
    setShowWizarPosModal(false);
    executeSaleCompletion({
      referencia: result.referencia,
      lote: result.lote,
      aprobacion: result.codigo_aprobacion,
      terminal: result.terminal,
    });
  };

  return (
    <div className="space-y-4">
      {/* Banner de Modo Operativo (Solo Inventario vs SmartPOS) */}
      <div className="bg-[#151720] border border-slate-800/90 rounded-2xl p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md">
        <div className="flex items-center gap-3">
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
              posMode === "inventory_only"
                ? "bg-amber-500/20 border border-amber-500/40 text-amber-400"
                : "bg-blue-500/20 border border-blue-500/40 text-blue-400"
            }`}
          >
            {posMode === "inventory_only" ? (
              <ShoppingCart className="w-5 h-5" />
            ) : (
              <Smartphone className="w-5 h-5" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold text-white tracking-wide">
                {posMode === "inventory_only"
                  ? "Modo Caja Rápida & Solo Inventario"
                  : "Modo SmartPOS Integrado (Terminal Bancario)"}
              </span>
              <span
                className={`text-[10px] uppercase font-bold font-mono px-2 py-0.5 rounded-md border ${
                  posMode === "inventory_only"
                    ? "bg-amber-950/70 text-amber-300 border-amber-700/60"
                    : "bg-blue-950/70 text-blue-300 border-blue-700/60"
                }`}
              >
                {posMode === "inventory_only" ? "Sin Datáfono" : `IP: ${wizarPosIp}`}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              {posMode === "inventory_only"
                ? "Agrega productos para totalizar en $ / Bs. BCV y descontar automáticamente del inventario."
                : "Envía montos por Wi-Fi/red al datáfono físico (WizarPOS, PAX, Sunmi) y recibe lotes bancarios."}
            </p>
          </div>
        </div>

        {onTogglePosMode && (
          <div className="flex items-center gap-1.5 self-start sm:self-auto bg-[#0f1117] p-1 rounded-xl border border-slate-800">
            <button
              type="button"
              onClick={() => onTogglePosMode("inventory_only")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                posMode === "inventory_only"
                  ? "bg-amber-500 text-slate-950 shadow"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <ShoppingCart className="w-3.5 h-3.5" />
              <span>Solo Inventario</span>
            </button>
            <button
              type="button"
              onClick={() => onTogglePosMode("smartpos")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                posMode === "smartpos"
                  ? "bg-blue-600 text-white shadow"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>SmartPOS</span>
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left 2 Columns: Fiscal Data + Search Bar + Cart */}
        <div className="lg:col-span-2 space-y-4">
        {/* Banner de Validación LISLR Art. 177 si ocurre intento de existencia negativa */}
        {stockError && (
          <div className="bg-rose-950/80 border border-rose-700/90 rounded-xl p-3 text-rose-200 text-xs flex items-start gap-2.5 animate-pulse shadow-lg">
            <ShieldAlert className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-bold text-rose-300 uppercase tracking-wide">
                Validación Fiscal Bloqueante:
              </p>
              <p className="mt-0.5 text-[11px] leading-relaxed">{stockError}</p>
            </div>
            <button
              onClick={() => setStockError(null)}
              className="text-rose-400 hover:text-white text-xs font-bold"
            >
              ✕
            </button>
          </div>
        )}

        {/* Formulario de Datos Fiscales del Cliente (Providencia SNAT/00071) */}
        <div className="bg-[#1a1d24] border border-slate-800 rounded-xl p-3 text-xs space-y-2.5">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
            <div className="flex items-center gap-1.5 font-bold text-slate-200 uppercase tracking-wider text-[11px]">
              <FileText className="w-3.5 h-3.5 text-blue-400" />
              <span>Datos Fiscales de Facturación (Providencia SNAT/00071)</span>
            </div>
            <div className="flex items-center gap-3 font-mono text-[11px]">
              <span className="text-slate-400">
                Factura N°: <strong className="text-amber-400">{customFactura}</strong>
              </span>
              <span className="text-slate-400">
                Control N°: <strong className="text-blue-400">{customControl}</strong>
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
            {/* RIF / Cédula */}
            <div className="sm:col-span-4">
              <label className="block text-[10px] text-slate-400 font-medium mb-1 uppercase tracking-wider">
                RIF / Cédula Receptor:
              </label>
              <div className="flex items-center">
                <select
                  value={rifPrefix}
                  onChange={(e) => setRifPrefix(e.target.value as any)}
                  className="bg-[#12141a] border border-slate-700 rounded-l-lg px-2 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-blue-500"
                >
                  <option value="V">V-</option>
                  <option value="J">J-</option>
                  <option value="E">E-</option>
                  <option value="G">G-</option>
                  <option value="P">P-</option>
                </select>
                <input
                  type="text"
                  value={rifNumber}
                  onChange={(e) => setRifNumber(e.target.value)}
                  placeholder="00000000-0"
                  className="w-full bg-[#12141a] border border-l-0 border-slate-700 rounded-r-lg px-2.5 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            {/* Nombre / Razón Social */}
            <div className="sm:col-span-5">
              <label className="block text-[10px] text-slate-400 font-medium mb-1 uppercase tracking-wider">
                Nombre / Razón Social:
              </label>
              <input
                type="text"
                value={clienteNombre}
                onChange={(e) => setClienteNombre(e.target.value)}
                placeholder="Consumidor Final o Nombre Cliente"
                className="w-full bg-[#12141a] border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500"
              />
            </div>

            {/* Correlativo Factura Editable */}
            <div className="sm:col-span-3">
              <label className="block text-[10px] text-slate-400 font-medium mb-1 uppercase tracking-wider">
                N° Factura:
              </label>
              <input
                type="text"
                value={customFactura}
                onChange={(e) => setCustomFactura(e.target.value)}
                className="w-full bg-[#12141a] border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs font-mono text-amber-300 focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Quick Barcode Scanner / Product Search */}
        <div className="bg-[#1a1d24] border border-slate-800 rounded-xl p-3 relative space-y-2">
          <div className="flex flex-wrap sm:flex-nowrap items-center gap-2">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                id="input-search-product"
                placeholder="Escanear código de barras o escribir producto... (Enter para agregar)"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={handleQuickKeySearch}
                className="w-full bg-[#12141a] border border-slate-700/80 rounded-lg pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 font-mono"
              />
            </div>

            {/* Barcode Global Scanner Ready Badge */}
            <div className="flex items-center gap-1.5 px-2.5 py-2 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[11px] font-medium shrink-0" title="Escaneo fiscal directo activo: Puede pasar cualquier producto por el lector óptico sin hacer clic en la barra">
              <Barcode className="w-3.5 h-3.5 animate-pulse" />
              <span className="hidden sm:inline">Lector Fiscal Activo</span>
            </div>

            {searchResults.length > 0 && (
              <button
                onClick={() => handleAddToCart(searchResults[0])}
                className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold px-4 py-2 rounded-lg flex items-center gap-1.5 transition-colors whitespace-nowrap"
              >
                <Plus className="w-4 h-4" />
                <span>Agregar</span>
              </button>
            )}
          </div>

          {/* Quick scan feedback banner */}
          {lastScannedProduct && (
            <div className="bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 px-3 py-1.5 rounded-lg text-xs flex items-center justify-between animate-fadeIn">
              <div className="flex items-center gap-2">
                <Barcode className="w-4 h-4 text-emerald-400" />
                <span>
                  <strong>¡Escaneado en Facturación!</strong> {lastScannedProduct}
                </span>
              </div>
              <span className="text-[10px] bg-emerald-500/30 px-2 py-0.5 rounded font-mono font-bold">+1 al renglón</span>
            </div>
          )}

          {/* Quick Dropdown results */}
          {searchResults.length > 0 && (
            <div className="absolute left-3 right-3 top-full mt-1 bg-[#181a20] border border-slate-700 rounded-xl shadow-2xl z-20 overflow-hidden divide-y divide-slate-800">
              {searchResults.map((p) => (
                <div
                  key={p.id}
                  onClick={() => handleAddToCart(p)}
                  className="px-4 py-2.5 flex items-center justify-between hover:bg-slate-800/80 cursor-pointer transition-colors text-xs"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-white">{p.nombre}</span>
                    <span
                      className={`text-[10px] font-mono px-1.5 py-0.5 rounded font-bold ${
                        p.alicuota_iva === 0
                          ? "bg-blue-950 text-blue-300 border border-blue-800"
                          : "bg-purple-950 text-purple-300 border border-purple-800"
                      }`}
                    >
                      {p.alicuota_iva === 0 ? "EXENTO (E)" : "IVA 16% (G)"}
                    </span>
                    <span className="text-slate-400 text-[11px]">
                      Stock:{" "}
                      <strong
                        className={
                          p.stock_actual <= p.stock_minimo
                            ? "text-rose-400"
                            : "text-emerald-400"
                        }
                      >
                        {p.stock_actual}
                      </strong>
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <div className="font-mono font-bold text-emerald-400 text-xs">
                        ${p.precio_venta.toFixed(2)}
                      </div>
                      <div className="font-mono text-[10px] text-amber-400">
                        Bs. {(p.precio_venta * bcvRate).toFixed(2)}
                      </div>
                    </div>
                    <button className="text-blue-400 bg-blue-950/60 px-2.5 py-1 rounded text-[11px] font-semibold border border-blue-800">
                      + Agregar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Cart Table */}
        <div className="bg-[#1a1d24] border border-slate-800 rounded-xl overflow-hidden shadow-sm flex flex-col min-h-[380px]">
          <div className="p-3 border-b border-slate-800 flex items-center justify-between bg-[#14161c]">
            <div className="flex items-center gap-2">
              <ShoppingCart className="w-4 h-4 text-blue-400" />
              <h2 className="text-xs font-bold text-white uppercase tracking-wider">
                Renglones a Facturar ({fiscalTotals.totalItems}{" "}
                {fiscalTotals.totalItems === 1 ? "artículo" : "artículos"})
              </h2>
            </div>
            {cart.length > 0 && (
              <button
                id="btn-clear-cart"
                onClick={handleClearCart}
                className="text-[11px] text-slate-400 hover:text-rose-400 flex items-center gap-1 transition-colors cursor-pointer"
                title="Vaciar carrito (Alt + X)"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Vaciar carrito</span>
              </button>
            )}
          </div>

          <div className="flex-1 overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-[#12141a] text-slate-400 border-b border-slate-800 text-[11px] uppercase font-mono">
                <tr>
                  <th className="py-2.5 px-3 w-8 text-center">#</th>
                  <th className="py-2.5 px-3">Artículo / Descripción</th>
                  <th className="py-2.5 px-2 text-center">Alic.</th>
                  <th className="py-2.5 px-3 text-right">P. Unit ($)</th>
                  <th className="py-2.5 px-3 text-right">P. Unit (Bs.)</th>
                  <th className="py-2.5 px-3 text-center">Cant.</th>
                  <th className="py-2.5 px-3 text-right">Total ($)</th>
                  <th className="py-2.5 px-3 text-right">Total (Bs.)</th>
                  <th className="py-2.5 px-2 text-center w-10">Quitar</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {cart.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-24 text-center text-slate-500">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <ShoppingCart className="w-8 h-8 text-slate-600" />
                        <p className="text-sm font-medium">No hay renglones en la factura</p>
                        <p className="text-xs text-slate-500 max-w-xs">
                          Escanee con lector de código de barras o busque productos arriba.
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  cart.map((item, index) => {
                    const subtotalVes = item.subtotal * bcvRate;
                    const unitVes = item.precio_unitario * bcvRate;
                    return (
                      <tr key={item.producto.id} className="hover:bg-slate-800/30">
                        <td className="py-2 px-3 text-center text-slate-500 font-mono text-[11px]">
                          {index + 1}
                        </td>
                        <td className="py-2 px-3">
                          <span className="font-semibold text-white block">{item.producto.nombre}</span>
                          <span className="text-[10px] text-slate-500 font-mono">
                            Stock disp: {item.producto.stock_actual}
                          </span>
                        </td>
                        <td className="py-2 px-2 text-center">
                          <span
                            className={`text-[10px] font-mono px-1 py-0.5 rounded font-bold ${
                              item.alicuota_iva === 0
                                ? "bg-blue-950/80 text-blue-300 border border-blue-800"
                                : "bg-purple-950/80 text-purple-300 border border-purple-800"
                            }`}
                          >
                            {item.alicuota_iva === 0 ? "E (0%)" : "G (16%)"}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-right font-mono text-slate-300 text-xs">
                          ${item.precio_unitario.toFixed(2)}
                        </td>
                        <td className="py-2 px-3 text-right font-mono text-amber-300/80 text-xs">
                          Bs. {unitVes.toFixed(2)}
                        </td>
                        <td className="py-2 px-3 text-center">
                          <div className="inline-flex items-center border border-slate-700 rounded-lg bg-[#12141a]">
                            <button
                              onClick={() => handleUpdateQuantity(item.producto.id, -1)}
                              className="p-1 hover:bg-slate-800 text-slate-400 hover:text-white rounded-l transition-colors"
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <span className="px-2 font-mono font-bold text-white text-xs">
                              {item.cantidad}
                            </span>
                            <button
                              onClick={() => handleUpdateQuantity(item.producto.id, 1)}
                              className="p-1 hover:bg-slate-800 text-slate-400 hover:text-white rounded-r transition-colors"
                              title="Aumentar cantidad (Valida existencias LISLR Art. 177)"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>
                        </td>
                        <td className="py-2 px-3 text-right font-mono font-bold text-emerald-400 text-xs">
                          ${item.subtotal.toFixed(2)}
                        </td>
                        <td className="py-2 px-3 text-right font-mono font-bold text-amber-300 text-xs">
                          Bs. {subtotalVes.toFixed(2)}
                        </td>
                        <td className="py-2 px-2 text-center">
                          <button
                            onClick={() => handleRemoveItem(item.producto.id)}
                            className="p-1 text-slate-500 hover:text-rose-400 rounded transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Right Column: Fiscal Summary + Payment & Checkout */}
      <div className="space-y-4">
        <div className="bg-[#1a1d24] border border-slate-800 rounded-xl p-4 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
              <Receipt className="w-4 h-4 text-emerald-400" />
              <span>Liquidación Fiscal Prov. 00071</span>
            </h3>
            <span className="text-[10px] font-mono text-amber-400 bg-amber-950/60 px-2 py-0.5 rounded border border-amber-800/80">
              BCV: Bs. {bcvRate.toFixed(2)}
            </span>
          </div>

          {/* Desglose Fiscal Detallado SENIAT */}
          <div className="space-y-2 text-xs divide-y divide-slate-800/60">
            <div className="flex justify-between text-slate-400 pt-1">
              <span>Ventas Exentas (E):</span>
              <div className="text-right font-mono">
                <span className="text-white">${fiscalTotals.baseExentaUsd.toFixed(2)}</span>
                <span className="text-slate-500 text-[11px] ml-1.5">
                  (Bs. {fiscalTotals.baseExentaVes.toFixed(2)})
                </span>
              </div>
            </div>

            <div className="flex justify-between text-slate-400 pt-1.5">
              <span>Base Imponible IVA (16% G):</span>
              <div className="text-right font-mono">
                <span className="text-white">${fiscalTotals.baseImponibleUsd.toFixed(2)}</span>
                <span className="text-slate-500 text-[11px] ml-1.5">
                  (Bs. {fiscalTotals.baseImponibleVes.toFixed(2)})
                </span>
              </div>
            </div>

            <div className="flex justify-between text-slate-400 pt-1.5">
              <span>Impuesto IVA (16%):</span>
              <div className="text-right font-mono">
                <span className="text-purple-300 font-semibold">${fiscalTotals.ivaUsd.toFixed(2)}</span>
                <span className="text-slate-500 text-[11px] ml-1.5">
                  (Bs. {fiscalTotals.ivaVes.toFixed(2)})
                </span>
              </div>
            </div>

            {/* IGTF 3% Condicional o Indicador de Exento */}
            {aplicaIgtf ? (
              <div className="flex justify-between items-center text-amber-300 pt-1.5 bg-amber-950/30 px-2 py-1.5 rounded border border-amber-800/60">
                <div className="flex flex-col">
                  <span className="font-bold text-[11px]">Perc. IGTF Divisas (3%):</span>
                  <span className="text-[9px] text-amber-400/80">Ley IGTF Divisas Efectivo / Cripto</span>
                </div>
                <div className="text-right font-mono">
                  <span className="font-bold">${fiscalTotals.igtfUsd.toFixed(2)}</span>
                  <span className="text-amber-400 text-[11px] ml-1.5">
                    (Bs. {fiscalTotals.igtfVes.toFixed(2)})
                  </span>
                </div>
              </div>
            ) : (
              <div className="flex justify-between items-center text-slate-400 pt-1.5 bg-slate-900/40 px-2 py-1.5 rounded border border-slate-800/80">
                <div className="flex flex-col">
                  <span className="text-[11px] text-slate-300 font-medium">IGTF (3%):</span>
                  <span className="text-[9px] text-slate-500">Exento / Desactivado para esta venta</span>
                </div>
                <div className="text-right font-mono text-[11px] text-slate-400 font-semibold">
                  $0.00 (Bs. 0.00)
                </div>
              </div>
            )}

            {/* Gran Total Dual (Bs. y USD) */}
            <div className="pt-2">
              <div className="p-3 bg-gradient-to-br from-emerald-950/60 to-blue-950/40 border border-emerald-700/60 rounded-xl">
                <div className="text-slate-400 text-[11px] uppercase tracking-wider font-semibold mb-1">
                  Total a Liquidar:
                </div>
                <div className="flex items-baseline justify-between">
                  <div className="text-xs text-amber-400 font-mono">Bolívares:</div>
                  <div className="text-2xl font-black font-mono text-amber-300 tracking-tight">
                    Bs. {fiscalTotals.totalVes.toFixed(2)}
                  </div>
                </div>
                <div className="flex items-baseline justify-between mt-0.5 border-t border-slate-700/60 pt-1">
                  <div className="text-xs text-emerald-400 font-mono">Equivalente USD:</div>
                  <div className="text-lg font-bold font-mono text-emerald-300">
                    ${fiscalTotals.totalUsd.toFixed(2)}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Botón y Control de Selección del IGTF (3%) */}
          <div className="p-3 bg-[#13151b] border border-slate-800 rounded-xl space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div
                  className={`p-1.5 rounded-lg transition-colors ${
                    aplicaIgtf
                      ? "bg-amber-500/20 text-amber-400 border border-amber-500/40"
                      : "bg-slate-800 text-slate-500 border border-slate-700"
                  }`}
                >
                  <Percent className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-white flex items-center gap-1.5">
                    <span>Impuesto IGTF (3%)</span>
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded font-mono font-bold ${
                        aplicaIgtf
                          ? "bg-amber-950 text-amber-300 border border-amber-600/80"
                          : "bg-slate-800 text-slate-400 border border-slate-700"
                      }`}
                    >
                      {aplicaIgtf ? "APLICADO (3%)" : "NO APLICADO (0%)"}
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-400">
                    Grandes Transacciones Financieras en divisas / cripto
                  </div>
                </div>
              </div>

              {/* Botón Switch rápido */}
              <button
                type="button"
                id="btn-switch-igtf"
                onClick={() => setAplicaIgtf((prev) => !prev)}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  aplicaIgtf ? "bg-amber-600" : "bg-slate-700"
                }`}
                title={aplicaIgtf ? "Desactivar IGTF" : "Activar IGTF (3%)"}
              >
                <span className="sr-only">Alternar IGTF</span>
                <span
                  aria-hidden="true"
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    aplicaIgtf ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>

            {/* Botones de Selección Directa (Aplicar / No Aplicar) */}
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                id="btn-opt-aplicar-igtf"
                onClick={() => setAplicaIgtf(true)}
                className={`py-2 px-2.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 border transition-all ${
                  aplicaIgtf
                    ? "bg-amber-950/90 text-amber-300 border-amber-500 shadow-sm ring-1 ring-amber-500/50"
                    : "bg-[#181a22] text-slate-400 border-slate-800 hover:text-slate-200 hover:bg-slate-800/60"
                }`}
              >
                <CheckCircle2
                  className={`w-3.5 h-3.5 ${
                    aplicaIgtf ? "text-amber-400" : "text-slate-600"
                  }`}
                />
                <span>Aplicar IGTF (3%)</span>
              </button>

              <button
                type="button"
                id="btn-opt-no-aplicar-igtf"
                onClick={() => setAplicaIgtf(false)}
                className={`py-2 px-2.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 border transition-all ${
                  !aplicaIgtf
                    ? "bg-slate-800 text-white border-slate-600 shadow-sm ring-1 ring-slate-500/50"
                    : "bg-[#181a22] text-slate-400 border-slate-800 hover:text-slate-200 hover:bg-slate-800/60"
                }`}
              >
                <XCircle
                  className={`w-3.5 h-3.5 ${
                    !aplicaIgtf ? "text-rose-400" : "text-slate-600"
                  }`}
                />
                <span>No Aplicar IGTF</span>
              </button>
            </div>
          </div>

          {/* Selector de Método de Pago Fiscal */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="block text-[11px] text-slate-400 font-bold uppercase tracking-wider">
                Forma de Pago:
              </label>

              {/* Botón rápido Configurar IP del SmartPOS (solo en modo smartpos) */}
              {posMode === "smartpos" ? (
                <button
                  type="button"
                  id="btn-config-wizarpos"
                  onClick={() => setShowWizarPosConfigModal(true)}
                  className="text-[10px] font-bold text-blue-400 hover:text-blue-300 flex items-center gap-1 bg-blue-950/40 hover:bg-blue-900/60 border border-blue-700/60 px-2 py-0.5 rounded-md transition-colors"
                  title="Configurar dirección IP, modelo (PAX, WizarPOS, Sunmi, Verifone) y puerto del terminal SmartPOS"
                >
                  <Smartphone className="w-3 h-3" />
                  <span>⚙️ Configurar IP SmartPOS</span>
                </button>
              ) : (
                <span className="text-[10px] font-mono text-amber-300 bg-amber-950/50 border border-amber-800/40 px-2 py-0.5 rounded-md flex items-center gap-1">
                  <span>🛒 Modo Inventario Directo</span>
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 gap-1.5">
              {(
                [
                  "Punto de Venta",
                  "Pago Móvil",
                  "Transferencia Bs",
                  "Divisas en Efectivo",
                  "Criptoactivos",
                ] as MetodoPagoFiscal[]
              ).map((metodo) => {
                const isDivisa =
                  metodo === "Divisas en Efectivo" || metodo === "Criptoactivos";
                const isSelected = paymentMethod === metodo;
                const isPos = metodo === "Punto de Venta";
                return (
                  <div key={metodo} className="space-y-1">
                    <button
                      type="button"
                      onClick={() => handleSelectPaymentMethod(metodo)}
                      className={`w-full px-3 py-2 rounded-lg text-xs font-semibold flex items-center justify-between border transition-all ${
                        isSelected
                          ? isDivisa
                            ? "bg-amber-950/80 border-amber-500 text-amber-300 shadow"
                            : "bg-blue-600/90 border-blue-500 text-white shadow"
                          : "bg-[#12141a] border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800/60"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        {isDivisa ? (
                          <DollarSign className="w-3.5 h-3.5 text-amber-400" />
                        ) : (
                          <CreditCard className="w-3.5 h-3.5 text-blue-400" />
                        )}
                        <span>{isPos && posMode === "inventory_only" ? "Punto de Venta Manual" : metodo}</span>
                      </div>

                      {isPos && (
                        posMode === "smartpos" ? (
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-blue-950/80 text-blue-200 border border-blue-400/40 flex items-center gap-1">
                            <Wifi className="w-2.5 h-2.5 text-emerald-400 animate-pulse" />
                            <span>{wizarPosIp}</span>
                          </span>
                        ) : (
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                            Datáfono Externo
                          </span>
                        )
                      )}

                      {isDivisa && (
                        <span
                          className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${
                            aplicaIgtf
                              ? "bg-amber-900/60 text-amber-300 border-amber-700"
                              : "bg-slate-800 text-slate-400 border-slate-700"
                          }`}
                        >
                          {aplicaIgtf ? "+3% IGTF" : "0% IGTF"}
                        </span>
                      )}
                    </button>

                    {/* Banner informativo interactivo cuando Punto de Venta está seleccionado */}
                    {isPos && isSelected && (
                      posMode === "smartpos" ? (
                        <div className="bg-blue-950/40 border border-blue-800/60 rounded-lg p-2 text-[11px] text-blue-200 flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5 truncate">
                            <Smartphone className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                            <span className="truncate">
                              Enlace ECR listo en <strong className="font-mono text-white">{wizarPosIp}</strong>
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => setShowWizarPosConfigModal(true)}
                            className="shrink-0 text-[10px] font-bold text-white bg-blue-600 hover:bg-blue-500 px-2 py-0.5 rounded transition-colors"
                          >
                            Cambiar IP
                          </button>
                        </div>
                      ) : (
                        <div className="bg-amber-950/30 border border-amber-700/50 rounded-lg p-2 text-[11px] text-amber-200 flex items-center gap-2">
                          <CreditCard className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                          <span>
                            Cobro por punto manual: pasa la tarjeta en el terminal físico bancario y confirma la venta.
                          </span>
                        </div>
                      )
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Tendered Amount & Change Calculation */}
          <div className="p-3 bg-[#14161c] border border-slate-800 rounded-xl space-y-2 text-xs">
            <div className="flex justify-between items-center">
              <label className="text-slate-400 font-semibold">
                Monto Recibido ({paymentMethod === "Divisas en Efectivo" ? "USD $" : "Bs."}):
              </label>
              <input
                type="number"
                step="0.01"
                placeholder={
                  paymentMethod === "Divisas en Efectivo"
                    ? fiscalTotals.totalUsd.toFixed(2)
                    : fiscalTotals.totalVes.toFixed(2)
                }
                value={tenderedAmount}
                onChange={(e) => setTenderedAmount(e.target.value)}
                className="w-28 bg-[#181a20] border border-slate-700 rounded-lg px-2.5 py-1 text-right text-white font-mono text-sm font-bold focus:outline-none focus:border-blue-500"
              />
            </div>

            {/* Quick Cash Buttons for USD */}
            {paymentMethod === "Divisas en Efectivo" && (
              <div className="grid grid-cols-4 gap-1 pt-1">
                {[5, 10, 20, 50].map((val) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setTenderedAmount(val.toString())}
                    className="bg-slate-800 hover:bg-slate-700 text-slate-300 rounded py-1 text-[11px] font-mono transition-colors"
                  >
                    ${val}
                  </button>
                ))}
              </div>
            )}

            {/* Change Box */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-800/80">
              <span className="text-slate-400 font-semibold">Cambio a Entregar:</span>
              <span className="text-base font-bold font-mono text-emerald-400">
                {paymentMethod === "Divisas en Efectivo"
                  ? `$${changeAmount.toFixed(2)} (Bs. ${(changeAmount * bcvRate).toFixed(2)})`
                  : `Bs. ${changeAmount.toFixed(2)}`}
              </span>
            </div>
          </div>

          {/* Print Checkbox */}
          <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300 select-none">
            <input
              type="checkbox"
              checked={printTicket}
              onChange={(e) => setPrintTicket(e.target.checked)}
              className="rounded border-slate-700 text-blue-600 focus:ring-blue-500 bg-slate-800"
            />
            <span>Emitir Comprobante Fiscal Impreso (SNAT/00071)</span>
          </label>

          {/* Big Checkout Button */}
          <button
            onClick={handleCheckout}
            id="btn-checkout-sale"
            disabled={cart.length === 0}
            className={`w-full py-3.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 shadow-lg transition-all active:scale-98 ${
              cart.length === 0
                ? "bg-slate-800 text-slate-500 cursor-not-allowed"
                : "bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-950/40"
            }`}
          >
            <CreditCard className="w-4 h-4" />
            <span>💳 COBRAR / EMITIR FACTURA FISCAL</span>
          </button>

          {completedSale && (
            <div className="p-3 bg-emerald-950/40 border border-emerald-800/60 rounded-lg text-emerald-300 text-xs flex items-center justify-between">
              <div>
                <p className="font-bold flex items-center gap-1">
                  <Check className="w-3.5 h-3.5" /> Factura Procesada:
                </p>
                <p className="font-mono text-[11px] text-emerald-400 mt-0.5">
                  N° {completedSale.numero_factura} • Control {completedSale.numero_control}
                </p>
              </div>
              <button
                onClick={() => setShowTicketModal(true)}
                className="bg-emerald-800 hover:bg-emerald-700 text-white text-[11px] font-semibold px-2.5 py-1 rounded transition-colors"
              >
                Ver Factura
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Venezuelan Fiscal Invoice Modal (Providencia SNAT/00071) */}
      {showTicketModal && completedSale && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#181a20] border border-slate-800 rounded-2xl max-w-md w-full p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
              <h3 className="font-bold text-white text-sm flex items-center gap-2">
                <Printer className="w-4 h-4 text-emerald-400" />
                <span>Comprobante Fiscal Digital (Providencia SNAT/00071)</span>
              </h3>
              <button
                onClick={() => setShowTicketModal(false)}
                className="text-slate-400 hover:text-white text-xs font-bold"
              >
                ✕
              </button>
            </div>

            {/* Official Venezuelan Thermal Receipt / Free-Format Invoice */}
            <div className="bg-[#fffef7] text-[#111] font-mono text-[10.5px] p-4 rounded-lg shadow-inner border border-amber-300 leading-tight space-y-1 select-all overflow-y-auto max-h-[460px]">
              <div className="text-center font-bold text-xs uppercase tracking-tight">
                {getStoredEmisorFiscal().razon_social}
              </div>
              <div className="text-center font-bold">RIF: {getStoredEmisorFiscal().rif}</div>
              <div className="text-center text-[9.5px]">
                {getStoredEmisorFiscal().direccion_fiscal}
              </div>
              <div className="text-center text-[9.5px]">
                Teléfono: {getStoredEmisorFiscal().telefono}
              </div>
              <div className="text-center font-semibold text-[9.5px]">
                {getStoredEmisorFiscal().providencia_fiscal}
              </div>
              <div className="border-b border-dashed border-gray-500 my-1"></div>

              <div className="flex justify-between font-bold text-[11px]">
                <span>FACTURA FISCAL N°:</span>
                <span>{completedSale.numero_factura}</span>
              </div>
              <div className="flex justify-between font-bold text-[11px]">
                <span>N° DE CONTROL:</span>
                <span>{completedSale.numero_control}</span>
              </div>
              <div className="flex justify-between text-[10px]">
                <span>FECHA: {completedSale.fecha_hora.split(" ")[0]}</span>
                <span>HORA: {completedSale.fecha_hora.split(" ")[1]}</span>
              </div>
              <div className="border-b border-dashed border-gray-400 my-1"></div>

              <div className="text-[10px] space-y-0.5">
                <div>
                  <strong>CLIENTE:</strong> {completedSale.cliente_nombre}
                </div>
                <div>
                  <strong>RIF / CI:</strong> {completedSale.cliente_rif}
                </div>
                <div>
                  <strong>DIRECCIÓN:</strong> {completedSale.cliente_direccion || "Caracas"}
                </div>
              </div>
              <div className="border-b border-dashed border-gray-400 my-1"></div>

              {/* Header table */}
              <div className="flex justify-between font-bold text-[10px]">
                <span className="w-10">CANT</span>
                <span className="flex-1">DESCRIPCION</span>
                <span className="w-12 text-right">P.U.($)</span>
                <span className="w-14 text-right">TOTAL(Bs.)</span>
                <span className="w-6 text-right">AL</span>
              </div>
              <div className="border-b border-gray-300 my-0.5"></div>

              {/* Items */}
              {completedSale.items.map((it, idx) => {
                const subVes = it.subtotal * completedSale.tasa_bcv;
                return (
                  <div key={idx} className="flex justify-between text-[10px]">
                    <span className="w-10 font-bold">{it.cantidad.toFixed(2)}</span>
                    <span className="flex-1 truncate">{it.nombre}</span>
                    <span className="w-12 text-right">${it.precio_unitario.toFixed(2)}</span>
                    <span className="w-14 text-right font-bold">{subVes.toFixed(2)}</span>
                    <span className="w-6 text-right font-bold">
                      {it.es_exento ? "(E)" : "(G)"}
                    </span>
                  </div>
                );
              })}

              <div className="border-b border-dashed border-gray-400 my-1.5"></div>

              {/* Tax totals */}
              <div className="space-y-0.5 text-[10px]">
                <div className="flex justify-between">
                  <span>VENTAS EXENTAS (E):</span>
                  <span>Bs. {completedSale.base_exenta_ves.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>BASE IMPONIBLE (G 16%):</span>
                  <span>Bs. {completedSale.base_imponible_ves.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>IMPUESTO IVA (16.00%):</span>
                  <span>Bs. {completedSale.iva_ves.toFixed(2)}</span>
                </div>

                {completedSale.aplica_igtf && (
                  <>
                    <div className="flex justify-between text-amber-900 font-bold">
                      <span>BASE PERCEPCION IGTF (3%):</span>
                      <span>
                        Bs.{" "}
                        {(
                          completedSale.base_imponible_ves +
                          completedSale.base_exenta_ves +
                          completedSale.iva_ves
                        ).toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between text-amber-900 font-bold">
                      <span>PERCEPCIÓN IGTF (3.00%):</span>
                      <span>Bs. {completedSale.igtf_ves.toFixed(2)}</span>
                    </div>
                  </>
                )}

                <div className="border-b border-gray-400 my-1"></div>
                <div className="flex justify-between font-black text-xs">
                  <span>TOTAL A PAGAR (BOLÍVARES):</span>
                  <span>Bs. {completedSale.total_ves.toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-bold text-[10px] text-emerald-800">
                  <span>EQUIVALENTE EN DIVISAS:</span>
                  <span>USD ${completedSale.total_usd.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-[9.5px] italic text-gray-600">
                  <span>TASA OFICIAL BCV:</span>
                  <span>Bs. {completedSale.tasa_bcv.toFixed(2)} / USD</span>
                </div>
              </div>

              <div className="border-b border-dashed border-gray-400 my-1.5"></div>

              {/* Payment details */}
              <div className="text-[10px] space-y-0.5">
                <div className="flex justify-between">
                  <span>FORMA DE PAGO:</span>
                  <span className="font-bold uppercase">{completedSale.metodo_pago}</span>
                </div>
                {completedSale.pos_referencia && (
                  <>
                    <div className="flex justify-between font-mono text-[9.5px] text-blue-900 font-bold">
                      <span>REF. BANCARIA POS:</span>
                      <span>{completedSale.pos_referencia}</span>
                    </div>
                    <div className="flex justify-between font-mono text-[9px] text-gray-700">
                      <span>LOTE / AUT:</span>
                      <span>{completedSale.pos_lote || "001"} / {completedSale.pos_aprobacion || "OK"}</span>
                    </div>
                  </>
                )}
                <div className="flex justify-between">
                  <span>MONTO RECIBIDO:</span>
                  <span>
                    {completedSale.metodo_pago === "Divisas en Efectivo"
                      ? `$${completedSale.monto_pagado.toFixed(2)}`
                      : `Bs. ${completedSale.monto_pagado.toFixed(2)}`}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>CAMBIO:</span>
                  <span>
                    {completedSale.metodo_pago === "Divisas en Efectivo"
                      ? `$${completedSale.cambio.toFixed(2)}`
                      : `Bs. ${completedSale.cambio.toFixed(2)}`}
                  </span>
                </div>
              </div>

              <div className="border-b border-dashed border-gray-400 my-1.5"></div>
              <div className="text-center text-[9px] font-bold">
                ESTA FACTURA CUMPLE CON EL ART. 13 DE LA PROVIDENCIA ADMINISTRATIVA SNAT/00071
              </div>
              <div className="text-center text-[8.5px] italic text-gray-700">
                "{getStoredNegocioConfig().pieTicket || "¡Gracias por su compra!"}"
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => window.print()}
                className="bg-slate-700 hover:bg-slate-600 text-white text-xs font-semibold px-4 py-2 rounded-lg transition-colors flex items-center gap-1.5"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Imprimir Comprobante</span>
              </button>
              <button
                onClick={() => setShowTicketModal(false)}
                className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold px-4 py-2 rounded-lg transition-colors"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* WizarPOS Q2 Integration Modal */}
      <WizarPosModal
        isOpen={showWizarPosModal}
        totalVes={fiscalTotals.totalVes}
        totalUsd={fiscalTotals.totalUsd}
        facturaNumero={customFactura || `FAC-${new Date().getFullYear()}-0001`}
        clienteNombre={clienteNombre || "CONSUMIDOR FINAL"}
        clienteRif={fullRif}
        onSuccess={handleWizarPosSuccess}
        onCancel={() => setShowWizarPosModal(false)}
      />

      {/* WizarPOS Q2 Dedicated Configuration Modal */}
      <WizarPosConfigModal
        isOpen={showWizarPosConfigModal}
        onClose={() => setShowWizarPosConfigModal(false)}
        onSaved={(cfg) => setWizarPosIp(cfg.ip)}
      />
    </div>
    </div>
  );
};
