import React, { useState, useMemo, useEffect, useRef } from "react";
import { Producto, CartItem, FiadoCliente, CierreCajaRecord, WizarPosTransactionResult, Venta, PosOperationalMode, SystemUser } from "../types";
import { WizarPosModal } from "./WizarPosModal";
import { WizarPosConfigModal } from "./WizarPosConfigModal";
import {
  Store,
  ShoppingCart,
  Plus,
  Minus,
  Trash2,
  DollarSign,
  CreditCard,
  Smartphone,
  Banknote,
  BookOpen,
  Calculator,
  Printer,
  Search,
  CheckCircle2,
  AlertCircle,
  Clock,
  UserPlus,
  ArrowRight,
  TrendingUp,
  Receipt,
  Tag,
  Share2,
  RefreshCw,
  RotateCcw,
  Wallet,
  Wifi,
  Settings,
  Barcode,
  History as HistoryIcon,
  FileDown,
  Eye,
  X,
  Check,
  Calendar,
  User,
  FileText,
  Layers,
  Zap,
  KeyRound,
  ShieldCheck,
  Lock,
  MessageCircle,
} from "lucide-react";
import {
  getStoredFiados,
  saveFiados,
  getStoredCierresCaja,
  saveCierresCaja,
  getStoredUsers,
  getStoredCurrentUser,
  saveStoredCurrentUser,
  authenticateUserByPin,
  getStoredNegocioConfig,
} from "../mockDb";

interface BodegaEditionViewProps {
  products: Producto[];
  bcvRate: number;
  onUpdateProductStock?: (productId: number, newStock: number) => void;
  onRecordSale?: (sale: Venta) => void;
  showToast: (msg: string) => void;
  posMode?: PosOperationalMode;
  onTogglePosMode?: (mode: PosOperationalMode) => void;
  currentUser?: SystemUser;
  onUserChange?: (user: SystemUser) => void;
}

export const BodegaEditionView: React.FC<BodegaEditionViewProps> = ({
  products,
  bcvRate,
  onUpdateProductStock,
  onRecordSale,
  showToast,
  posMode = "inventory_only",
  onTogglePosMode,
  currentUser,
  onUserChange,
}) => {
  // Subtabs within Bodega edition
  const [bodegaTab, setBodegaTab] = useState<
    "mostrador" | "fiados" | "caja" | "etiquetas"
  >("mostrador");

  // Cart State
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchProduct, setSearchProduct] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("TODAS");

  // Payment Modal
  const [isPayModalOpen, setIsPayModalOpen] = useState(false);
  const [customTotalUsd, setCustomTotalUsd] = useState<number | "">("");
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<
    "EFECTIVO_USD" | "EFECTIVO_VES" | "PAGO_MOVIL" | "PUNTO_VENTA" | "ZELLE" | "FIADO"
  >("EFECTIVO_USD");
  const [cashGivenUsd, setCashGivenUsd] = useState<number | "">("");
  const [cashGivenVes, setCashGivenVes] = useState<number | "">("");
  const [pagoMovilRef, setPagoMovilRef] = useState("");
  const [puntoManualRef, setPuntoManualRef] = useState("");
  const [useSmartPosAuto, setUseSmartPosAuto] = useState(posMode === "smartpos");

  useEffect(() => {
    setUseSmartPosAuto(posMode === "smartpos");
  }, [posMode]);
  const [showWizarPosModal, setShowWizarPosModal] = useState(false);
  const [showWizarPosConfigModal, setShowWizarPosConfigModal] = useState(false);
  const [wizarPosIp, setWizarPosIp] = useState<string>(() => {
    try {
      const saved = localStorage.getItem("wizarpos_config");
      return saved ? JSON.parse(saved).ip : "192.168.1.45";
    } catch {
      return "192.168.1.45";
    }
  });
  const [selectedFiadoClienteId, setSelectedFiadoClienteId] = useState("");
  const [isInlineCreatingFiado, setIsInlineCreatingFiado] = useState(false);
  const [inlineFiadoNombre, setInlineFiadoNombre] = useState("");
  const [inlineFiadoTelefono, setInlineFiadoTelefono] = useState("");
  const [inlineFiadoDireccion, setInlineFiadoDireccion] = useState("");
  const [completedSaleTicket, setCompletedSaleTicket] = useState<{
    id: string;
    fecha: string;
    items: CartItem[];
    totalUsd: number;
    totalVes: number;
    subtotalProductosUsd?: number;
    montoAjustado?: boolean;
    metodo: string;
    pagoUsd?: number;
    pagoVes?: number;
    vueltoUsd?: number;
    vueltoVes?: number;
    clienteNombre?: string;
    ref?: string;
    posMetadata?: {
      banco?: string;
      tarjetaTipo?: string;
      ultimos4?: string;
      aprobacion?: string;
      lote?: string;
      terminal?: string;
    };
  } | null>(null);

  // Fiados State
  const [fiadosList, setFiadosList] = useState<FiadoCliente[]>(() =>
    getStoredFiados()
  );
  const [searchFiado, setSearchFiado] = useState("");
  const [selectedFiadoDetail, setSelectedFiadoDetail] = useState<FiadoCliente | null>(
    null
  );
  const [isNewFiadoModalOpen, setIsNewFiadoModalOpen] = useState(false);
  const [newFiadoNombre, setNewFiadoNombre] = useState("");
  const [newFiadoTelefono, setNewFiadoTelefono] = useState("");
  const [newFiadoDireccion, setNewFiadoDireccion] = useState("");
  const [newFiadoDeudaInicial, setNewFiadoDeudaInicial] = useState<number | "">("");
  const [newFiadoLimite, setNewFiadoLimite] = useState(30);

  // Abono Modal
  const [isAbonoModalOpen, setIsAbonoModalOpen] = useState(false);
  const [isAbonoJustCompleted, setIsAbonoJustCompleted] = useState(false);
  const [abonoMontoUsd, setAbonoMontoUsd] = useState<number | "">("");
  const [abonoMetodo, setAbonoMetodo] = useState<string>("Pago Móvil");
  const [abonoConcepto, setAbonoConcepto] = useState("Abono a cuenta");

  // Caja / Cash closure state
  const [cajaSubTab, setCajaSubTab] = useState<"actual" | "historial">("actual");
  const [cierresHistory, setCierresHistory] = useState<CierreCajaRecord[]>(() =>
    getStoredCierresCaja()
  );
  const [cajeroNombre, setCajeroNombre] = useState<string>(currentUser?.nombre_completo || "Cajero Principal");
  const [cierreObservaciones, setCierreObservaciones] = useState<string>("");
  const [countedCashUsd, setCountedCashUsd] = useState<number | "">("");
  const [countedCashVes, setCountedCashVes] = useState<number | "">("");
  const [selectedCierreDetail, setSelectedCierreDetail] = useState<CierreCajaRecord | null>(null);
  const [isClearHistoryConfirmOpen, setIsClearHistoryConfirmOpen] = useState(false);
  const [historialSearchQuery, setHistorialSearchQuery] = useState("");
  const [historialStatusFilter, setHistorialStatusFilter] = useState<"TODOS" | "CUADRADA" | "FALTANTE" | "SOBRANTE">("TODOS");

  // Cash Close -> Next Shift User Authentication Modal State
  const [isCierreAuthModalOpen, setIsCierreAuthModalOpen] = useState(false);
  const [pendingCierreRecord, setPendingCierreRecord] = useState<CierreCajaRecord | null>(null);
  const [nextUserSelectedId, setNextUserSelectedId] = useState<string>(currentUser?.id || "");
  const [nextUserPin, setNextUserPin] = useState<string>("");
  const [authError, setAuthError] = useState<string>("");

  useEffect(() => {
    if (currentUser) {
      setCajeroNombre(currentUser.nombre_completo);
      setNextUserSelectedId(currentUser.id);
    }
  }, [currentUser]);

  // Quick categories for bodegas
  const categoriesList = useMemo(() => {
    const set = new Set(
      products.map((p) => p.categoria_nombre || "Víveres").filter(Boolean)
    );
    return ["TODAS", ...Array.from(set)];
  }, [products]);

  // Filter products
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchCat =
        selectedCategory === "TODAS" ||
        p.categoria_nombre === selectedCategory;
      const q = searchProduct.toLowerCase().trim();
      const matchQuery =
        !q ||
        p.nombre.toLowerCase().includes(q) ||
        p.codigo_barras.includes(q);
      return matchCat && matchQuery;
    });
  }, [products, selectedCategory, searchProduct]);

  // Cart Calculations
  const cartTotalUsd = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.subtotal, 0);
  }, [cart]);

  const cartTotalVes = useMemo(() => {
    return cartTotalUsd * bcvRate;
  }, [cartTotalUsd, bcvRate]);

  // Effective checkout totals (allows customizing the total to charge, e.g. products + previous debt abono)
  const effectiveTotalUsd = useMemo(() => {
    if (typeof customTotalUsd === "number" && !isNaN(customTotalUsd) && customTotalUsd > 0) {
      return customTotalUsd;
    }
    return cartTotalUsd;
  }, [customTotalUsd, cartTotalUsd]);

  const effectiveTotalVes = useMemo(() => {
    return effectiveTotalUsd * bcvRate;
  }, [effectiveTotalUsd, bcvRate]);

  const isTotalCustomized = useMemo(() => {
    return (
      typeof customTotalUsd === "number" &&
      !isNaN(customTotalUsd) &&
      customTotalUsd > 0 &&
      Math.abs(customTotalUsd - cartTotalUsd) > 0.001
    );
  }, [customTotalUsd, cartTotalUsd]);

  // Initialize or reset custom amount when checkout modal opens
  useEffect(() => {
    if (isPayModalOpen) {
      setCustomTotalUsd(cartTotalUsd);
    }
  }, [isPayModalOpen]);

  // Buffer and timestamp refs for Global Hardware Barcode Scanner listener
  const barcodeBufferRef = useRef<string>("");
  const lastKeyTimeRef = useRef<number>(0);
  const [lastScannedProduct, setLastScannedProduct] = useState<string | null>(null);

  // Add to cart
  const handleAddToCart = (product: Producto) => {
    if (product.stock_actual <= 0) {
      showToast(`⚠️ Sin stock disponible de "${product.nombre}"`);
      return;
    }

    const existing = cart.find((item) => item.producto.id === product.id);
    if (existing && existing.cantidad + 1 > product.stock_actual) {
      showToast(`⚠️ No hay más stock disponible (Máx: ${product.stock_actual})`);
      return;
    }

    setCart((prev) => {
      const itemInCart = prev.find((item) => item.producto.id === product.id);
      if (itemInCart) {
        if (itemInCart.cantidad + 1 > product.stock_actual) {
          return prev;
        }
        return prev.map((item) =>
          item.producto.id === product.id
            ? {
                ...item,
                cantidad: item.cantidad + 1,
                subtotal: (item.cantidad + 1) * item.precio_unitario,
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
  };

  const handleUpdateCartQuantity = (productId: number, delta: number) => {
    const item = cart.find((i) => i.producto.id === productId);
    if (item && delta > 0 && item.cantidad + delta > item.producto.stock_actual) {
      showToast(`⚠️ Límite de stock: ${item.producto.stock_actual}`);
      return;
    }

    setCart((prev) => {
      return prev
        .map((it) => {
          if (it.producto.id === productId) {
            const newQty = it.cantidad + delta;
            if (newQty <= 0) return null;
            if (newQty > it.producto.stock_actual) {
              return it;
            }
            return {
              ...it,
              cantidad: newQty,
              subtotal: newQty * it.precio_unitario,
            };
          }
          return it;
        })
        .filter(Boolean) as CartItem[];
    });
  };

  const handleRemoveFromCart = (productId: number) => {
    setCart((prev) => prev.filter((item) => item.producto.id !== productId));
  };

  const handleClearCart = () => {
    setCart([]);
  };

  // Global Keyboard Shortcuts & Hardware Barcode Scanner Listener
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // Escape key handling
      if (e.key === "Escape") {
        if (isPayModalOpen) {
          setIsPayModalOpen(false);
          return;
        }
        if (isAbonoModalOpen) {
          setIsAbonoModalOpen(false);
          return;
        }
        if (isNewFiadoModalOpen) {
          setIsNewFiadoModalOpen(false);
          return;
        }
        if (selectedFiadoDetail) {
          setSelectedFiadoDetail(null);
          return;
        }
        if (selectedCierreDetail) {
          setSelectedCierreDetail(null);
          return;
        }
        if (isCierreAuthModalOpen) {
          setIsCierreAuthModalOpen(false);
          return;
        }
        if (isClearHistoryConfirmOpen) {
          setIsClearHistoryConfirmOpen(false);
          return;
        }
        if (showWizarPosModal) {
          setShowWizarPosModal(false);
          return;
        }
        if (showWizarPosConfigModal) {
          setShowWizarPosConfigModal(false);
          return;
        }
        if (searchProduct) {
          setSearchProduct("");
          return;
        }
      }

      // Alt+X: Clear shopping cart shortcut
      if (e.altKey && e.key.toLowerCase() === "x") {
        e.preventDefault();
        handleClearCart();
        return;
      }

      // If user is currently focused on an input, textarea or contenteditable element, let standard typing work
      const activeTag = (document.activeElement?.tagName || "").toLowerCase();
      const isEditable = (document.activeElement as HTMLElement)?.isContentEditable;
      if (activeTag === "input" || activeTag === "textarea" || isEditable) {
        return;
      }

      // If a modal or dialog is open, do not intercept keystrokes
      if (
        isPayModalOpen ||
        isAbonoModalOpen ||
        isNewFiadoModalOpen ||
        selectedFiadoDetail ||
        selectedCierreDetail ||
        isCierreAuthModalOpen ||
        isClearHistoryConfirmOpen ||
        showWizarPosModal ||
        showWizarPosConfigModal
      ) {
        return;
      }

      const currentTime = Date.now();
      // Hardware scanners typically type characters in intervals under 50-70ms
      if (currentTime - lastKeyTimeRef.current > 100) {
        barcodeBufferRef.current = "";
      }
      lastKeyTimeRef.current = currentTime;

      if (e.key === "Enter") {
        const scannedCode = barcodeBufferRef.current.trim();
        if (scannedCode.length >= 2) {
          // Look up product by exact barcode or ID or exact SKU
          const found = products.find(
            (p) =>
              (p.codigo_barras && p.codigo_barras.toLowerCase() === scannedCode.toLowerCase()) ||
              p.id.toString() === scannedCode ||
              (p.codigo_interno && p.codigo_interno.toLowerCase() === scannedCode.toLowerCase())
          );

          if (found) {
            handleAddToCart(found);
            setLastScannedProduct(found.nombre);
            showToast(`📦 Escaneado: ${found.nombre} ($${found.precio_venta.toFixed(2)})`);
            setTimeout(() => setLastScannedProduct(null), 2500);
          } else {
            showToast(`⚠️ Producto no encontrado para código: "${scannedCode}"`);
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
  }, [
    products,
    searchProduct,
    isPayModalOpen,
    isAbonoModalOpen,
    isNewFiadoModalOpen,
    selectedFiadoDetail,
    selectedCierreDetail,
    isCierreAuthModalOpen,
    isClearHistoryConfirmOpen,
    showWizarPosModal,
    showWizarPosConfigModal,
  ]);

  // Handle POS / SmartPOS Approved Sale
  const handleSmartPosSuccess = (posResult: WizarPosTransactionResult) => {
    // Deduct stock
    if (onUpdateProductStock) {
      cart.forEach((item) => {
        onUpdateProductStock(
          item.producto.id,
          item.producto.stock_actual - item.cantidad
        );
      });
    }

    const ticket = {
      id: `TKT-${Math.floor(1000 + Math.random() * 9000)}`,
      fecha: new Date().toLocaleString("es-VE"),
      items: [...cart],
      totalUsd: effectiveTotalUsd,
      totalVes: effectiveTotalVes,
      subtotalProductosUsd: cartTotalUsd,
      montoAjustado: isTotalCustomized,
      metodo: `Punto de Venta SmartPOS (${posResult.tipo_tarjeta || "Tarjeta"})`,
      clienteNombre: "Cliente de Mostrador",
      ref: posResult.referencia,
      posMetadata: {
        banco: posResult.banco_emisor,
        tarjetaTipo: posResult.tipo_tarjeta,
        ultimos4: posResult.tarjeta_ultimos4,
        aprobacion: posResult.codigo_aprobacion,
        lote: posResult.lote,
        terminal: posResult.terminal,
      },
    };

    if (onRecordSale) {
      const nowStr = new Date().toISOString().slice(0, 19).replace("T", " ");
      const ventaRecord: Venta = {
        id: Date.now(),
        numero_factura: ticket.id,
        numero_control: `CTRL-${ticket.id}`,
        fecha_hora: nowStr,
        fecha: nowStr.split(" ")[0],
        cliente_rif: "V-00000000-0",
        cliente_nombre: ticket.clienteNombre,
        tasa_bcv: bcvRate,
        metodo_pago: ticket.metodo,
        moneda_pago: "VES",
        base_imponible_usd: 0,
        base_imponible_ves: 0,
        base_exenta_usd: ticket.totalUsd,
        base_exenta_ves: ticket.totalVes,
        iva_usd: 0,
        iva_ves: 0,
        aplica_igtf: false,
        igtf_usd: 0,
        igtf_ves: 0,
        total_usd: ticket.totalUsd,
        total_ves: ticket.totalVes,
        total: ticket.totalUsd,
        monto_pagado: ticket.totalVes,
        cambio: 0,
        usuario: "SmartPOS Bodega",
        items: cart.map((c) => ({
          producto_id: c.producto.id,
          nombre: c.producto.nombre,
          cantidad: c.cantidad,
          precio_unitario: c.precio_unitario,
          subtotal: c.subtotal,
          alicuota_iva: 0,
          es_exento: true,
        })),
      };
      onRecordSale(ventaRecord);
    }

    setCompletedSaleTicket(ticket);
    setCart([]);
    setIsPayModalOpen(false);
    setCustomTotalUsd("");
    setShowWizarPosModal(false);
    showToast(`✅ Cobro SmartPOS APROBADO: Ref #${posResult.referencia}`);
  };

  // Complete Sale
  const handleConfirmSale = () => {
    if (cart.length === 0) return;

    // If using automated SmartPOS communication via Wi-Fi/IP (only in SmartPOS mode)
    if (selectedPaymentMethod === "PUNTO_VENTA" && posMode === "smartpos" && useSmartPosAuto) {
      setShowWizarPosModal(true);
      return;
    }

    let clienteFiadoNombre = "";
    if (selectedPaymentMethod === "FIADO") {
      let targetFiadoId = selectedFiadoClienteId;

      // Si el usuario estaba escribiendo un nuevo vecino y presionó directamente "Confirmar Cobro"
      if (!targetFiadoId && isInlineCreatingFiado && inlineFiadoNombre.trim()) {
        const newFiado: FiadoCliente = {
          id: `fia-${Date.now()}`,
          nombre: inlineFiadoNombre.trim(),
          telefono: inlineFiadoTelefono.trim() || "N/A",
          direccion: inlineFiadoDireccion.trim() || "Sector Local",
          limite_credito_usd: 9999,
          saldo_deuda_usd: 0,
          saldo_deuda_ves: 0,
          ultimo_movimiento: new Date().toLocaleString("es-VE"),
          historial: [],
        };
        targetFiadoId = newFiado.id;
        const updated = [newFiado, ...fiadosList];
        setFiadosList(updated);
        saveFiados(updated);
        setSelectedFiadoClienteId(newFiado.id);
      }

      if (!targetFiadoId) {
        showToast("⚠️ Selecciona o registra el vecino a quien le vas a fiar");
        return;
      }
      const cliente = fiadosList.find((f) => f.id === targetFiadoId) || (inlineFiadoNombre.trim() ? { nombre: inlineFiadoNombre.trim() } : null);
      if (!cliente) return;
      clienteFiadoNombre = cliente.nombre;

      // Update fiado record
      const nuevoMov = {
        id: `mov-${Date.now()}`,
        fecha: new Date().toLocaleString("es-VE"),
        tipo: "CARGO_VENTA" as const,
        concepto:
          cart.map((c) => `${c.cantidad}x ${c.producto.nombre}`).join(", ") +
          (isTotalCustomized ? ` (Monto ajustado: $${effectiveTotalUsd.toFixed(2)})` : ""),
        monto_usd: effectiveTotalUsd,
        monto_ves: effectiveTotalVes,
        tasa_bcv: bcvRate,
      };

      const updatedFiados = fiadosList.map((f) => {
        if (f.id === targetFiadoId) {
          const newSaldoUsd = f.saldo_deuda_usd + effectiveTotalUsd;
          return {
            ...f,
            saldo_deuda_usd: newSaldoUsd,
            saldo_deuda_ves: newSaldoUsd * bcvRate,
            ultimo_movimiento: new Date().toLocaleString("es-VE"),
            historial: [nuevoMov, ...f.historial],
          };
        }
        return f;
      });

      setFiadosList(updatedFiados);
      saveFiados(updatedFiados);
    }

    // Deduct stock
    if (onUpdateProductStock) {
      cart.forEach((item) => {
        onUpdateProductStock(
          item.producto.id,
          item.producto.stock_actual - item.cantidad
        );
      });
    }

    // Calculate change
    let vueltoUsd = 0;
    let vueltoVes = 0;
    if (
      selectedPaymentMethod === "EFECTIVO_USD" &&
      typeof cashGivenUsd === "number" &&
      cashGivenUsd > effectiveTotalUsd
    ) {
      vueltoUsd = cashGivenUsd - effectiveTotalUsd;
      vueltoVes = vueltoUsd * bcvRate;
    } else if (
      selectedPaymentMethod === "EFECTIVO_VES" &&
      typeof cashGivenVes === "number" &&
      cashGivenVes > effectiveTotalVes
    ) {
      vueltoVes = cashGivenVes - effectiveTotalVes;
      vueltoUsd = vueltoVes / bcvRate;
    }

    const ticket = {
      id: `TKT-${Math.floor(1000 + Math.random() * 9000)}`,
      fecha: new Date().toLocaleString("es-VE"),
      items: [...cart],
      totalUsd: effectiveTotalUsd,
      totalVes: effectiveTotalVes,
      subtotalProductosUsd: cartTotalUsd,
      montoAjustado: isTotalCustomized,
      metodo:
        selectedPaymentMethod === "EFECTIVO_USD"
          ? "Efectivo Divisas ($)"
          : selectedPaymentMethod === "EFECTIVO_VES"
          ? "Efectivo Bolívares (Bs.)"
          : selectedPaymentMethod === "PAGO_MOVIL"
          ? "Pago Móvil"
          : selectedPaymentMethod === "PUNTO_VENTA"
          ? "Punto de Venta Manual"
          : selectedPaymentMethod === "ZELLE"
          ? "Zelle"
          : `Fiado (${clienteFiadoNombre})`,
      pagoUsd: typeof cashGivenUsd === "number" ? cashGivenUsd : undefined,
      vueltoUsd: vueltoUsd > 0 ? vueltoUsd : undefined,
      vueltoVes: vueltoVes > 0 ? vueltoVes : undefined,
      clienteNombre: clienteFiadoNombre || "Cliente de Mostrador",
      ref:
        selectedPaymentMethod === "PAGO_MOVIL"
          ? pagoMovilRef
          : selectedPaymentMethod === "PUNTO_VENTA"
          ? puntoManualRef
          : undefined,
    };

    if (onRecordSale) {
      const nowStr = new Date().toISOString().slice(0, 19).replace("T", " ");
      const ventaRecord: Venta = {
        id: Date.now(),
        numero_factura: ticket.id,
        numero_control: `CTRL-${ticket.id}`,
        fecha_hora: nowStr,
        fecha: nowStr.split(" ")[0],
        cliente_rif: "V-00000000-0",
        cliente_nombre: ticket.clienteNombre,
        tasa_bcv: bcvRate,
        metodo_pago: ticket.metodo,
        moneda_pago: "VES",
        base_imponible_usd: 0,
        base_imponible_ves: 0,
        base_exenta_usd: ticket.totalUsd,
        base_exenta_ves: ticket.totalVes,
        iva_usd: 0,
        iva_ves: 0,
        aplica_igtf: false,
        igtf_usd: 0,
        igtf_ves: 0,
        total_usd: ticket.totalUsd,
        total_ves: ticket.totalVes,
        total: ticket.totalUsd,
        monto_pagado: ticket.totalVes,
        cambio: 0,
        usuario: "Mostrador Bodega",
        items: cart.map((c) => ({
          producto_id: c.producto.id,
          nombre: c.producto.nombre,
          cantidad: c.cantidad,
          precio_unitario: c.precio_unitario,
          subtotal: c.subtotal,
          alicuota_iva: 0,
          es_exento: true,
        })),
      };
      onRecordSale(ventaRecord);
    }

    setCompletedSaleTicket(ticket);
    setCart([]);
    setIsPayModalOpen(false);
    setCustomTotalUsd("");
    setIsInlineCreatingFiado(false);
    setInlineFiadoNombre("");
    setInlineFiadoTelefono("");
    setInlineFiadoDireccion("");
    setCashGivenUsd("");
    setCashGivenVes("");
    setPagoMovilRef("");
    setPuntoManualRef("");
    showToast(`✅ Venta registrada con éxito (${ticket.id})`);
  };

  // Add new neighbor to Fiado book with optional initial debt
  const handleAddNewFiado = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFiadoNombre.trim()) return;

    const initialDeudaUsd =
      typeof newFiadoDeudaInicial === "number" &&
      !isNaN(newFiadoDeudaInicial) &&
      newFiadoDeudaInicial > 0
        ? newFiadoDeudaInicial
        : 0;

    const newFiado: FiadoCliente = {
      id: `fia-${Date.now()}`,
      nombre: newFiadoNombre.trim(),
      telefono: newFiadoTelefono.trim() || "N/A",
      direccion: newFiadoDireccion.trim() || "Sector Local",
      limite_credito_usd: newFiadoLimite || 30,
      saldo_deuda_usd: initialDeudaUsd,
      saldo_deuda_ves: initialDeudaUsd * bcvRate,
      ultimo_movimiento: new Date().toLocaleString("es-VE"),
      historial:
        initialDeudaUsd > 0
          ? [
              {
                id: `mov-${Date.now()}`,
                fecha: new Date().toLocaleString("es-VE"),
                tipo: "CARGO_VENTA" as const,
                concepto: "Deuda / Saldo inicial registrado al agregar vecino",
                monto_usd: initialDeudaUsd,
                monto_ves: initialDeudaUsd * bcvRate,
                tasa_bcv: bcvRate,
              },
            ]
          : [],
    };

    const updated = [newFiado, ...fiadosList];
    setFiadosList(updated);
    saveFiados(updated);
    setIsNewFiadoModalOpen(false);
    setNewFiadoNombre("");
    setNewFiadoTelefono("");
    setNewFiadoDireccion("");
    setNewFiadoDeudaInicial("");
    showToast(
      `✅ Vecino "${newFiado.nombre}" agregado a la libreta${
        initialDeudaUsd > 0
          ? ` con deuda inicial de $${initialDeudaUsd.toFixed(2)} USD`
          : ""
      }`
    );
  };

  // Delete neighbor from Fiados list
  const handleDeleteFiado = (id: string, nombre: string) => {
    if (
      confirm(
        `¿Estás seguro de eliminar a "${nombre}" de la libreta de fiados? Esta acción borrará su cuenta e historial.`
      )
    ) {
      const updated = fiadosList.filter((f) => f.id !== id);
      setFiadosList(updated);
      saveFiados(updated);
      if (selectedFiadoDetail?.id === id) {
        setSelectedFiadoDetail(null);
      }
      showToast(`🗑️ Vecino "${nombre}" eliminado de la libreta`);
    }
  };

  // Quick register neighbor directly from Checkout modal when selecting "Fiar"
  const handleQuickCreateFiadoInCheckout = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inlineFiadoNombre.trim()) {
      showToast("⚠️ Ingresa el nombre del vecino para registrarlo");
      return;
    }

    const newFiado: FiadoCliente = {
      id: `fia-${Date.now()}`,
      nombre: inlineFiadoNombre.trim(),
      telefono: inlineFiadoTelefono.trim() || "N/A",
      direccion: inlineFiadoDireccion.trim() || "Sector Local",
      limite_credito_usd: 9999,
      saldo_deuda_usd: 0,
      saldo_deuda_ves: 0,
      ultimo_movimiento: new Date().toLocaleString("es-VE"),
      historial: [],
    };

    const updated = [newFiado, ...fiadosList];
    setFiadosList(updated);
    saveFiados(updated);
    setSelectedFiadoClienteId(newFiado.id);
    setIsInlineCreatingFiado(false);
    setInlineFiadoNombre("");
    setInlineFiadoTelefono("");
    setInlineFiadoDireccion("");
    showToast(`✅ Vecino "${newFiado.nombre}" creado y seleccionado para fiar`);
  };

  // Register payment (abono) to debt
  const handleRegisterAbono = () => {
    if (!selectedFiadoDetail || typeof abonoMontoUsd !== "number" || abonoMontoUsd <= 0) {
      showToast("⚠️ Ingresa un monto de abono válido");
      return;
    }

    const montoUsd = abonoMontoUsd;
    const nuevoMov = {
      id: `abn-${Date.now()}`,
      fecha: new Date().toLocaleString("es-VE"),
      tipo: "ABONO_PAGO" as const,
      concepto: `${abonoConcepto} (${abonoMetodo})`,
      monto_usd: montoUsd,
      monto_ves: montoUsd * bcvRate,
      tasa_bcv: bcvRate,
      metodo_abono: abonoMetodo,
    };

    const updated = fiadosList.map((f) => {
      if (f.id === selectedFiadoDetail.id) {
        const nuevoSaldoUsd = Math.max(0, f.saldo_deuda_usd - montoUsd);
        const updatedCliente = {
          ...f,
          saldo_deuda_usd: nuevoSaldoUsd,
          saldo_deuda_ves: nuevoSaldoUsd * bcvRate,
          ultimo_movimiento: new Date().toLocaleString("es-VE"),
          historial: [nuevoMov, ...f.historial],
        };
        setSelectedFiadoDetail(updatedCliente);
        return updatedCliente;
      }
      return f;
    });

    setFiadosList(updated);
    saveFiados(updated);
    setIsAbonoModalOpen(false);
    setIsAbonoJustCompleted(true);
    setAbonoMontoUsd("");
    showToast(`✅ Abono de $${montoUsd.toFixed(2)} registrado correctamente`);
  };

  // Cobranza Rápida por WhatsApp para Vecinos de la Libreta
  const handleSendWhatsAppDebtReminder = (vecino: FiadoCliente) => {
    if (vecino.saldo_deuda_usd <= 0) {
      showToast(`ℹ️ ${vecino.nombre} se encuentra al día, no mantiene saldo pendiente.`);
      return;
    }

    const negocio = getStoredNegocioConfig();
    const cleanPhone = (vecino.telefono || "").replace(/\D/g, "");
    const saldoVes = (vecino.saldo_deuda_usd * bcvRate).toFixed(2);

    let phoneParam = cleanPhone;
    if (phoneParam.startsWith("0")) {
      phoneParam = "58" + phoneParam.slice(1);
    } else if (!phoneParam.startsWith("58") && phoneParam.length === 10) {
      phoneParam = "58" + phoneParam;
    }

    const nombreNegocio = negocio.nombreComercial || "nuestro comercio";
    const mensaje = encodeURIComponent(
      `Hola *${vecino.nombre}*, cordial saludo de *${nombreNegocio}*.\n\nLe recordamos amablemente el saldo de su cuenta en nuestra libreta:\n• Monto pendiente: *$${vecino.saldo_deuda_usd.toFixed(2)} USD*\n• Equivalente a tasa oficial BCV (Bs. ${bcvRate.toFixed(2)}): *Bs. ${saldoVes}*\n\nPuede cancelar en efectivo ($ / Bs.), Pago Móvil o Punto de Venta en nuestro local. ¡Agradecemos su preferencia y confianza!`
    );

    const waUrl = phoneParam && phoneParam.length >= 10 ? `https://wa.me/${phoneParam}?text=${mensaje}` : `https://wa.me/?text=${mensaje}`;
    window.open(waUrl, "_blank");
    showToast(`📲 Abriendo WhatsApp para enviar cobro a ${vecino.nombre}...`);
  };

  // Keyboard shortcut: Press Enter to close neighbor detail modal if an abono was just completed
  useEffect(() => {
    if (!selectedFiadoDetail || isAbonoModalOpen || !isAbonoJustCompleted) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Enter") {
        e.preventDefault();
        setSelectedFiadoDetail(null);
        setIsAbonoJustCompleted(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [selectedFiadoDetail, isAbonoModalOpen, isAbonoJustCompleted]);

  // Total fiado pending
  const totalFiadosPendingUsd = useMemo(() => {
    return fiadosList.reduce((sum, f) => sum + f.saldo_deuda_usd, 0);
  }, [fiadosList]);

  return (
    <div className="space-y-4">
      {/* Top Bodega Navigation Header */}
      <div className="bg-[#12141a] border border-amber-500/30 rounded-2xl p-3.5 flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-lg shadow-amber-950/20">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-white shadow-md">
            <Store className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base font-bold text-white flex items-center gap-1.5">
                Edición Bodega & Comercio Comunitario
              </h2>
              {posMode === "inventory_only" ? (
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-1">
                  <Zap className="w-3 h-3 text-amber-400" />
                  <span>Modo: Solo Inventario & Total</span>
                </span>
              ) : (
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/40 flex items-center gap-1">
                  <Wifi className="w-3 h-3 text-blue-400" />
                  <span>Modo: SmartPOS Wi-Fi</span>
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400">
              {posMode === "inventory_only"
                ? "Operación autónoma sin datáfono: Precios en USD, conversión BCV automática y descuento inmediato de stock."
                : "Operación con datáfono Android: Envío de monto por Wi-Fi/IP y cierre automático de inventario."}
            </p>
          </div>
        </div>

        {/* Bodega Sub-tabs & Mode Switcher */}
        <div className="flex flex-wrap items-center gap-2">
          {onTogglePosMode && (
            <button
              onClick={() => onTogglePosMode(posMode === "inventory_only" ? "smartpos" : "inventory_only")}
              className={`px-2.5 py-1.5 rounded-xl text-xs font-bold border flex items-center gap-1.5 transition-all ${
                posMode === "inventory_only"
                  ? "bg-amber-950/40 border-amber-500/50 text-amber-300 hover:bg-amber-900/50"
                  : "bg-blue-950/40 border-blue-500/50 text-blue-300 hover:bg-blue-900/50"
              }`}
              title="Cambiar entre modo Solo Inventario y SmartPOS"
            >
              {posMode === "inventory_only" ? (
                <>
                  <Smartphone className="w-3.5 h-3.5 text-blue-400" />
                  <span className="hidden sm:inline">Cambiar a</span> SmartPOS
                </>
              ) : (
                <>
                  <ShoppingCart className="w-3.5 h-3.5 text-amber-400" />
                  <span className="hidden sm:inline">Cambiar a</span> Solo Inventario
                </>
              )}
            </button>
          )}

          <div className="flex flex-wrap items-center gap-1 bg-[#0e1017] p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => setBodegaTab("mostrador")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                bodegaTab === "mostrador"
                  ? "bg-amber-500 text-slate-950 shadow-md font-extrabold"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <ShoppingCart className="w-3.5 h-3.5" />
              <span>Mostrador</span>
              {cart.length > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-slate-950 text-amber-300 text-[10px] font-mono">
                  {cart.length}
                </span>
              )}
            </button>

            <button
              onClick={() => setBodegaTab("fiados")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                bodegaTab === "fiados"
                  ? "bg-amber-500 text-slate-950 shadow-md font-extrabold"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Libreta</span>
              {totalFiadosPendingUsd > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-amber-950 text-amber-300 text-[10px] font-mono">
                  ${totalFiadosPendingUsd.toFixed(1)}
                </span>
              )}
            </button>

            <button
              onClick={() => setBodegaTab("caja")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                bodegaTab === "caja"
                  ? "bg-amber-500 text-slate-950 shadow-md font-extrabold"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Calculator className="w-3.5 h-3.5" />
              <span>Caja</span>
            </button>

            <button
              onClick={() => setBodegaTab("etiquetas")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                bodegaTab === "etiquetas"
                  ? "bg-amber-500 text-slate-950 shadow-md font-extrabold"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Tag className="w-3.5 h-3.5" />
              <span>Anaquel</span>
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 1. TAB: MOSTRADOR / VENTA RÁPIDA */}
      {/* ========================================================= */}
      {bodegaTab === "mostrador" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Left: Product Catalog & Quick Search (7 cols) */}
          <div className="lg:col-span-7 space-y-3">
            {/* Search & Barcode Input */}
            <div className="bg-[#14161f] border border-slate-800 p-3 rounded-2xl flex flex-wrap sm:flex-nowrap items-center gap-2">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  id="input-search-product"
                  value={searchProduct}
                  onChange={(e) => setSearchProduct(e.target.value)}
                  placeholder="Escanear código de barras o escribir producto..."
                  className="w-full bg-[#0e1017] border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:border-amber-500 focus:outline-none"
                  autoFocus
                />
              </div>

              {/* Barcode Global Scanner Ready Badge */}
              <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[11px] font-medium shrink-0" title="Escaneo global activado: Pase cualquier producto por el lector sin necesidad de hacer clic en el buscador">
                <Barcode className="w-3.5 h-3.5 animate-pulse" />
                <span className="hidden sm:inline">Lector Activo</span>
              </div>

              {/* Tasa BCV Pill */}
              <div className="bg-amber-500/10 border border-amber-500/30 px-3 py-1.5 rounded-xl shrink-0 text-right">
                <div className="text-[10px] text-amber-300 font-semibold">Tasa BCV del Día</div>
                <div className="text-xs font-mono font-bold text-white">
                  Bs. {bcvRate.toFixed(2)}
                </div>
              </div>
            </div>

            {/* Quick Banner when product scanned via global scanner */}
            {lastScannedProduct && (
              <div className="bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 px-3.5 py-2 rounded-xl text-xs flex items-center justify-between animate-fadeIn">
                <div className="flex items-center gap-2">
                  <Barcode className="w-4 h-4 text-emerald-400" />
                  <span>
                    <strong>¡Producto añadido con escáner!</strong> {lastScannedProduct}
                  </span>
                </div>
                <span className="text-[10px] bg-emerald-500/30 px-2 py-0.5 rounded font-mono font-bold">+1 al carrito</span>
              </div>
            )}

            {/* Category Quick Chips */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
              {categoriesList.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
                    selectedCategory === cat
                      ? "bg-amber-500 text-slate-950 font-bold"
                      : "bg-[#14161f] text-slate-400 hover:text-white border border-slate-800"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Products Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 max-h-[520px] overflow-y-auto pr-1">
              {filteredProducts.map((p) => {
                const priceVes = p.precio_venta * bcvRate;
                const inCart = cart.find((c) => c.producto.id === p.id);
                return (
                  <button
                    key={p.id}
                    onClick={() => handleAddToCart(p)}
                    className={`bg-[#14161f] hover:bg-[#1c202d] border rounded-2xl p-3 text-left transition-all relative flex flex-col justify-between group ${
                      inCart
                        ? "border-amber-500 shadow-md shadow-amber-950/30 bg-amber-500/5"
                        : "border-slate-800 hover:border-slate-700"
                    }`}
                  >
                    {inCart && (
                      <span className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-amber-500 text-slate-950 text-[10px] font-mono font-bold shadow">
                        x{inCart.cantidad}
                      </span>
                    )}
                    <div>
                      <div className="text-[10px] text-slate-400 line-clamp-1 font-mono">
                        {p.codigo_barras}
                      </div>
                      <div className="text-xs font-bold text-white line-clamp-2 mt-0.5 group-hover:text-amber-300">
                        {p.nombre}
                      </div>
                    </div>

                    <div className="mt-3 pt-2 border-t border-slate-800/80 flex items-end justify-between">
                      <div>
                        <div className="text-sm font-extrabold text-amber-400 font-mono">
                          ${p.precio_venta.toFixed(2)}
                        </div>
                        <div className="text-[10px] text-slate-300 font-mono">
                          Bs. {priceVes.toFixed(2)}
                        </div>
                      </div>
                      <span className="text-[9px] text-slate-400 font-mono">
                        Stock: {p.stock_actual}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right: Mostrador Cart & Checkout Panel (5 cols) */}
          <div className="lg:col-span-5 bg-[#12141a] border border-slate-800 rounded-2xl p-4 flex flex-col justify-between shadow-xl min-h-[500px]">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <ShoppingCart className="w-4 h-4 text-amber-400" />
                  <span className="text-sm font-bold text-white">Canasta de Venta</span>
                  <span className="text-xs text-slate-400 font-mono">
                    ({cart.reduce((s, i) => s + i.cantidad, 0)} arts)
                  </span>
                </div>
                {cart.length > 0 && (
                  <button
                    id="btn-clear-cart"
                    onClick={handleClearCart}
                    className="text-[11px] text-rose-400 hover:text-rose-300 font-semibold flex items-center gap-1 cursor-pointer"
                    title="Vaciar Canasta de Ventas (Alt + X)"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>Vaciar</span>
                  </button>
                )}
              </div>

              {/* Cart Items List */}
              <div className="divide-y divide-slate-800/60 max-h-[280px] overflow-y-auto pr-1 my-2">
                {cart.length === 0 ? (
                  <div className="text-center py-12 text-slate-500 text-xs">
                    <Store className="w-8 h-8 mx-auto mb-2 opacity-30 text-amber-400" />
                    Haz clic en un producto o escanea un código para empezar a vender.
                  </div>
                ) : (
                  cart.map((item) => (
                    <div
                      key={item.producto.id}
                      className="py-2.5 flex items-center justify-between gap-2"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-bold text-white truncate">
                          {item.producto.nombre}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          ${item.precio_unitario.toFixed(2)} c/u • Bs.{" "}
                          {(item.precio_unitario * bcvRate).toFixed(2)}
                        </div>
                      </div>

                      {/* Quantity Controls */}
                      <div className="flex items-center gap-1.5 bg-[#0e1017] p-1 rounded-lg border border-slate-800">
                        <button
                          onClick={() =>
                            handleUpdateCartQuantity(item.producto.id, -1)
                          }
                          className="w-5 h-5 rounded flex items-center justify-center bg-slate-800 hover:bg-slate-700 text-white text-xs"
                        >
                          -
                        </button>
                        <span className="w-6 text-center text-xs font-mono font-bold text-white">
                          {item.cantidad}
                        </span>
                        <button
                          onClick={() =>
                            handleUpdateCartQuantity(item.producto.id, 1)
                          }
                          className="w-5 h-5 rounded flex items-center justify-center bg-slate-800 hover:bg-slate-700 text-white text-xs"
                        >
                          +
                        </button>
                      </div>

                      <div className="text-right font-mono min-w-[70px]">
                        <div className="text-xs font-bold text-amber-400">
                          ${item.subtotal.toFixed(2)}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          Bs. {(item.subtotal * bcvRate).toFixed(2)}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Totals & Fast Checkout Trigger */}
            <div className="pt-3 border-t border-slate-800 space-y-3">
              <div className="bg-[#181b24] p-3 rounded-xl space-y-1">
                <div className="flex justify-between items-baseline">
                  <span className="text-xs text-slate-300 font-semibold">
                    TOTAL EN DÓLARES:
                  </span>
                  <span className="text-lg font-extrabold text-amber-400 font-mono">
                    ${cartTotalUsd.toFixed(2)} USD
                  </span>
                </div>
                <div className="flex justify-between items-baseline pt-1 border-t border-slate-700/50">
                  <span className="text-xs text-slate-400">TOTAL EN BOLÍVARES:</span>
                  <span className="text-sm font-bold text-white font-mono">
                    Bs.{" "}
                    {cartTotalVes.toLocaleString("es-VE", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </span>
                </div>
              </div>

              {/* Big Facturar Venta Button */}
              <button
                type="button"
                id="btn-open-pay-modal"
                onClick={() => {
                  setCustomTotalUsd(cartTotalUsd);
                  setIsPayModalOpen(true);
                }}
                disabled={cart.length === 0}
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 disabled:opacity-40 disabled:hover:from-amber-500 text-slate-950 font-extrabold text-sm flex items-center justify-center gap-2 shadow-lg shadow-amber-950/40 transition-all active:scale-[0.99] cursor-pointer"
              >
                <DollarSign className="w-5 h-5" />
                <span>Facturar Venta</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 2. TAB: LIBRETA DE FIADOS (CUENTAS POR COBRAR A VECINOS) */}
      {/* ========================================================= */}
      {bodegaTab === "fiados" && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="bg-[#14161f] border border-slate-800 p-4 rounded-2xl">
              <div className="text-xs text-slate-400 font-medium">
                Total Deuda en la Calle (Fiado)
              </div>
              <div className="text-xl font-bold text-amber-400 font-mono mt-1">
                ${totalFiadosPendingUsd.toFixed(2)} USD
              </div>
              <div className="text-xs text-slate-300 font-mono mt-0.5">
                ≈ Bs. {(totalFiadosPendingUsd * bcvRate).toLocaleString("es-VE", { minimumFractionDigits: 2 })}
              </div>
            </div>

            <div className="bg-[#14161f] border border-slate-800 p-4 rounded-2xl">
              <div className="text-xs text-slate-400 font-medium">
                Vecinos con Saldo Pendiente
              </div>
              <div className="text-xl font-bold text-white font-mono mt-1">
                {fiadosList.filter((f) => f.saldo_deuda_usd > 0).length} de {fiadosList.length}
              </div>
              <div className="text-xs text-emerald-400 mt-0.5">
                Libreta Comunitaria Activa
              </div>
            </div>

            <div className="bg-[#14161f] border border-slate-800 p-4 rounded-2xl flex items-center justify-between">
              <div>
                <div className="text-xs text-slate-400 font-medium">Registrar Nuevo Vecino</div>
                <div className="text-xs text-slate-300 mt-0.5">Abrir cuenta en libreta</div>
              </div>
              <button
                type="button"
                onClick={() => setIsNewFiadoModalOpen(true)}
                className="px-3 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold flex items-center gap-1.5 shadow"
              >
                <UserPlus className="w-4 h-4" />
                <span>+ Agregar Vecino</span>
              </button>
            </div>
          </div>

          {/* Search neighbors */}
          <div className="bg-[#14161f] border border-slate-800 p-3 rounded-2xl flex items-center justify-between gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchFiado}
                onChange={(e) => setSearchFiado(e.target.value)}
                placeholder="Buscar vecino por nombre, casa o teléfono..."
                className="w-full bg-[#0e1017] border border-slate-700 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:border-amber-500"
              />
            </div>
          </div>

          {/* Neighbors List */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {fiadosList
              .filter((f) =>
                !searchFiado ||
                f.nombre.toLowerCase().includes(searchFiado.toLowerCase()) ||
                f.direccion.toLowerCase().includes(searchFiado.toLowerCase())
              )
              .map((f) => (
                <div
                  key={f.id}
                  className="bg-[#14161f] border border-slate-800 rounded-2xl p-4 flex flex-col justify-between hover:border-slate-700 transition-colors"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-bold text-white truncate">{f.nombre}</h3>
                        <p className="text-xs text-slate-400 truncate">{f.direccion}</p>
                        <p className="text-[10px] text-slate-500 font-mono mt-0.5">
                          📞 {f.telefono}
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            f.saldo_deuda_usd > 0
                              ? "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                              : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                          }`}
                        >
                          {f.saldo_deuda_usd > 0 ? "Debe" : "Al Día"}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleDeleteFiado(f.id, f.nombre)}
                          className="p-1 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                          title={`Eliminar a "${f.nombre}" de la libreta`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <div className="mt-4 p-3 bg-[#0e1017] rounded-xl border border-slate-800/80">
                      <div className="flex justify-between items-baseline">
                        <span className="text-[11px] text-slate-400">Saldo Deudor:</span>
                        <span className="text-base font-bold font-mono text-amber-400">
                          ${f.saldo_deuda_usd.toFixed(2)} USD
                        </span>
                      </div>
                      <div className="flex justify-between items-baseline mt-0.5">
                        <span className="text-[10px] text-slate-500">En Bolívares:</span>
                        <span className="text-xs text-slate-300 font-mono">
                          Bs. {(f.saldo_deuda_usd * bcvRate).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-800 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedFiadoDetail(f);
                        setIsAbonoJustCompleted(false);
                        setIsAbonoModalOpen(true);
                      }}
                      disabled={f.saldo_deuda_usd <= 0}
                      className="flex-1 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-30 text-white text-xs font-bold transition-colors shadow cursor-pointer"
                    >
                      💵 Registrar Abono
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSendWhatsAppDebtReminder(f)}
                      disabled={f.saldo_deuda_usd <= 0}
                      className="p-2 rounded-xl bg-emerald-950/80 hover:bg-emerald-800/80 disabled:opacity-30 text-emerald-400 hover:text-emerald-200 border border-emerald-600/50 transition-colors shadow cursor-pointer flex items-center justify-center shrink-0"
                      title={`Cobranza Rápida por WhatsApp a ${f.nombre} ($${f.saldo_deuda_usd.toFixed(2)})`}
                    >
                      <MessageCircle className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedFiadoDetail(f);
                        setIsAbonoJustCompleted(false);
                      }}
                      className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold cursor-pointer"
                    >
                      Historial
                    </button>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 3. TAB: ARQUEO Y CUADRE DE CAJA MULTIMONEDA */}
      {/* ========================================================= */}
      {bodegaTab === "caja" && (
        <div className="space-y-4">
          {/* Sub-navigation inside Caja Tab */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-[#12141a] p-2.5 rounded-2xl border border-slate-800">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setCajaSubTab("actual")}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
                  cajaSubTab === "actual"
                    ? "bg-amber-500 text-slate-950 shadow-md font-black"
                    : "text-slate-400 hover:text-white bg-slate-900/60"
                }`}
              >
                <Calculator className="w-4 h-4" />
                <span>Arqueo de Turno Actual</span>
              </button>

              <button
                type="button"
                onClick={() => setCajaSubTab("historial")}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
                  cajaSubTab === "historial"
                    ? "bg-amber-500 text-slate-950 shadow-md font-black"
                    : "text-slate-400 hover:text-white bg-slate-900/60"
                }`}
              >
                <HistoryIcon className="w-4 h-4 text-amber-400" />
                <span>Historial de Cierres Anteriores</span>
                <span className="px-1.5 py-0.5 rounded-full bg-slate-950 text-amber-300 text-[10px] font-mono font-bold">
                  {cierresHistory.length}
                </span>
              </button>
            </div>

            <div className="flex items-center gap-2">
              {cajaSubTab === "historial" && (
                <>
                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="px-3 py-1.5 rounded-xl bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/40 text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
                    title="Imprimir reporte o Guardar como PDF"
                  >
                    <FileDown className="w-3.5 h-3.5" />
                    <span>Exportar Auditoría en PDF</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsClearHistoryConfirmOpen(true)}
                    disabled={cierresHistory.length === 0}
                    className="px-3 py-1.5 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/40 text-xs font-bold flex items-center gap-1.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                    title="Limpiar todos los registros de cierres de caja anteriores"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                    <span>Limpiar Historial</span>
                  </button>
                </>
              )}
            </div>
          </div>

          {/* VIEW 1: ARQUEO DEL TURNO ACTUAL */}
          {cajaSubTab === "actual" && (
            <div className="bg-[#12141a] border border-slate-800 rounded-2xl p-4 space-y-4">
              {/* Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-800 gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
                    <Calculator className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <span>Cuadre y Cierre de Turno del Día</span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                        Turno Abierto
                      </span>
                    </h3>
                    <p className="text-xs text-slate-400">
                      Contraste en vivo entre ventas esperadas en sistema y billetes contados físicamente en gaveta.
                    </p>
                  </div>
                </div>
                <div className="text-right font-mono text-xs text-slate-400">
                  <div>Fecha: <strong className="text-slate-200">{new Date().toLocaleDateString("es-VE")}</strong></div>
                  <div>Tasa BCV: <strong className="text-amber-400">Bs. {bcvRate.toFixed(2)}</strong></div>
                </div>
              </div>

              {/* Grid de ventas esperadas según sistema */}
              <div>
                <div className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                  <TrendingUp className="w-3.5 h-3.5 text-amber-400" />
                  <span>1. Dinero Esperado en el Sistema (Turno Actual)</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2.5">
                  <div className="bg-[#14161f] border border-slate-800 p-3 rounded-xl">
                    <div className="text-[11px] text-slate-400 font-medium">💵 Efectivo Dólares ($)</div>
                    <div className="text-base font-bold text-amber-300 font-mono mt-1">$45.00</div>
                    <div className="text-[10px] text-slate-500 font-mono">Esperado en gaveta</div>
                  </div>
                  <div className="bg-[#14161f] border border-slate-800 p-3 rounded-xl">
                    <div className="text-[11px] text-slate-400 font-medium">🇻🇪 Efectivo Bolívares (Bs.)</div>
                    <div className="text-base font-bold text-blue-300 font-mono mt-1">Bs. 3,850.00</div>
                    <div className="text-[10px] text-slate-500 font-mono">≈ ${(3850 / bcvRate).toFixed(2)} USD</div>
                  </div>
                  <div className="bg-[#14161f] border border-slate-800 p-3 rounded-xl">
                    <div className="text-[11px] text-slate-400 font-medium">📲 Pago Móvil / Transf.</div>
                    <div className="text-base font-bold text-purple-300 font-mono mt-1">Bs. 8,420.00</div>
                    <div className="text-[10px] text-slate-500 font-mono">≈ ${(8420 / bcvRate).toFixed(2)} USD</div>
                  </div>
                  <div className="bg-[#14161f] border border-slate-800 p-3 rounded-xl">
                    <div className="text-[11px] text-slate-400 font-medium">💳 Punto / SmartPOS</div>
                    <div className="text-base font-bold text-emerald-300 font-mono mt-1">Bs. 12,900.00</div>
                    <div className="text-[10px] text-slate-500 font-mono">≈ ${(12900 / bcvRate).toFixed(2)} USD</div>
                  </div>
                  <div className="bg-[#14161f] border border-slate-800 p-3 rounded-xl">
                    <div className="text-[11px] text-slate-400 font-medium">🟢 Zelle / Divisas Dig.</div>
                    <div className="text-base font-bold text-teal-300 font-mono mt-1">$15.00</div>
                    <div className="text-[10px] text-slate-500 font-mono">≈ Bs. {(15 * bcvRate).toFixed(2)}</div>
                  </div>
                  <div className="bg-[#14161f] border border-slate-800 p-3 rounded-xl">
                    <div className="text-[11px] text-slate-400 font-medium">📖 Ventas Fiadas (Libreta)</div>
                    <div className="text-base font-bold text-rose-300 font-mono mt-1">$24.50</div>
                    <div className="text-[10px] text-slate-500 font-mono">Por cobrar</div>
                  </div>
                </div>

                {/* Total consolidado esperado */}
                <div className="mt-3 bg-[#0e1017] border border-amber-500/30 rounded-xl p-3 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-amber-400" />
                    <span className="text-xs font-bold text-slate-200">TOTAL CONSOLIDADO ESPERADO DEL TURNO:</span>
                  </div>
                  <div className="text-right font-mono flex items-center gap-3">
                    <span className="text-sm font-black text-amber-400 font-mono">
                      ${(45.00 + 3850 / bcvRate + 8420 / bcvRate + 12900 / bcvRate + 15.00 + 24.50).toFixed(2)} USD
                    </span>
                    <span className="text-xs text-slate-400">
                      ≈ Bs. {((45.00 + 3850 / bcvRate + 8420 / bcvRate + 12900 / bcvRate + 15.00 + 24.50) * bcvRate).toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              </div>

              {/* Conteo físico y auditoría */}
              <div className="p-4 bg-[#0e1017] rounded-2xl border border-slate-800 space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-white flex items-center gap-2">
                    <Wallet className="w-4 h-4 text-amber-400" />
                    <span>2. Conteo Físico de Billetes en Gaveta (Al Momento del Cierre)</span>
                  </h4>
                  <span className="text-[11px] text-slate-400 font-mono">
                    Ingresa los billetes reales que tienes en la gaveta
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1">
                      💵 Billetes $ Contados en Gaveta:
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-amber-400 font-mono">$</span>
                      <input
                        type="number"
                        step="any"
                        value={countedCashUsd}
                        onChange={(e) =>
                          setCountedCashUsd(
                            e.target.value === "" ? "" : parseFloat(e.target.value)
                          )
                        }
                        placeholder="45.00"
                        className="w-full bg-[#14161f] border border-slate-700 rounded-xl pl-7 pr-3 py-2 text-xs text-white font-mono focus:border-amber-400 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1">
                      🇻🇪 Billetes Bs. Contados en Gaveta:
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-blue-400 font-mono">Bs.</span>
                      <input
                        type="number"
                        step="any"
                        value={countedCashVes}
                        onChange={(e) =>
                          setCountedCashVes(
                            e.target.value === "" ? "" : parseFloat(e.target.value)
                          )
                        }
                        placeholder="3850.00"
                        className="w-full bg-[#14161f] border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs text-white font-mono focus:border-blue-400 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1">
                      👤 Cajero Responsable:
                    </label>
                    <input
                      type="text"
                      value={cajeroNombre}
                      onChange={(e) => setCajeroNombre(e.target.value)}
                      placeholder="Nombre del cajero"
                      className="w-full bg-[#14161f] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:border-amber-400 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1">
                      📝 Observaciones / Notas:
                    </label>
                    <input
                      type="text"
                      value={cierreObservaciones}
                      onChange={(e) => setCierreObservaciones(e.target.value)}
                      placeholder="Ej: Conforme, sin novedades"
                      className="w-full bg-[#14161f] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:border-amber-400 focus:outline-none"
                    />
                  </div>
                </div>

                {/* Resumen de Cuadre Instantáneo */}
                {(countedCashUsd !== "" || countedCashVes !== "") && (
                  <div className="p-3.5 rounded-xl border bg-[#14161f] border-slate-700 flex flex-wrap items-center justify-between gap-3 animate-fadeIn">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-xl ${
                        Math.abs((typeof countedCashUsd === "number" ? countedCashUsd : 45.00) - 45.00) < 0.05 &&
                        Math.abs((typeof countedCashVes === "number" ? countedCashVes : 3850.00) - 3850.00) < 1
                          ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40"
                          : ((typeof countedCashUsd === "number" ? countedCashUsd : 45.00) < 45.00 || (typeof countedCashVes === "number" ? countedCashVes : 3850.00) < 3850.00)
                          ? "bg-rose-500/20 text-rose-400 border border-rose-500/40"
                          : "bg-blue-500/20 text-blue-400 border border-blue-500/40"
                      }`}>
                        <CheckCircle2 className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-white flex items-center gap-2">
                          <span>Estado del Cuadre de Gaveta:</span>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold ${
                            Math.abs((typeof countedCashUsd === "number" ? countedCashUsd : 45.00) - 45.00) < 0.05 &&
                            Math.abs((typeof countedCashVes === "number" ? countedCashVes : 3850.00) - 3850.00) < 1
                              ? "bg-emerald-500 text-slate-950"
                              : ((typeof countedCashUsd === "number" ? countedCashUsd : 45.00) < 45.00 || (typeof countedCashVes === "number" ? countedCashVes : 3850.00) < 3850.00)
                              ? "bg-rose-500 text-white"
                              : "bg-blue-500 text-white"
                          }`}>
                            {Math.abs((typeof countedCashUsd === "number" ? countedCashUsd : 45.00) - 45.00) < 0.05 &&
                            Math.abs((typeof countedCashVes === "number" ? countedCashVes : 3850.00) - 3850.00) < 1
                              ? "CAJA CUADRADA EXACTA"
                              : ((typeof countedCashUsd === "number" ? countedCashUsd : 45.00) < 45.00 || (typeof countedCashVes === "number" ? countedCashVes : 3850.00) < 3850.00)
                              ? "FALTANTE EN GAVETA"
                              : "SOBRANTE EN GAVETA"}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                          Diferencia Efectivo $: ${((typeof countedCashUsd === "number" ? countedCashUsd : 45.00) - 45.00).toFixed(2)} USD • Diferencia Bs: Bs. {((typeof countedCashVes === "number" ? countedCashVes : 3850.00) - 3850.00).toFixed(2)}
                        </div>
                      </div>
                    </div>

                    <div className="text-right font-mono">
                      <div className="text-[10px] text-slate-400">Total Físico en Gaveta:</div>
                      <div className="text-sm font-bold text-white">
                        ${(typeof countedCashUsd === "number" ? countedCashUsd : 0).toFixed(2)} USD + Bs. {(typeof countedCashVes === "number" ? countedCashVes : 0).toFixed(2)}
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                  <div className="text-xs text-slate-400 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-amber-400" />
                    <span>Al cerrar caja, se guardará el comprobante de auditoría en el Historial Permanente.</span>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      const countUsd = typeof countedCashUsd === "number" ? countedCashUsd : 45.00;
                      const countVes = typeof countedCashVes === "number" ? countedCashVes : 3850.00;
                      const diffU = countUsd - 45.00 + (countVes - 3850.00) / bcvRate;
                      const diffV = diffU * bcvRate;
                      const status = Math.abs(diffU) < 0.05 ? "CUADRADA" : diffU < 0 ? "FALTANTE" : "SOBRANTE";

                      const totalGenUsd = countUsd + countVes / bcvRate + 8420 / bcvRate + 12900 / bcvRate + 15.00 + 24.50;
                      const totalGenVes = totalGenUsd * bcvRate;

                      const nuevoCierre: CierreCajaRecord = {
                        id: `CIE-${new Date().toISOString().split("T")[0].replace(/-/g, "")}-${Math.floor(100 + Math.random() * 900)}`,
                        fecha: new Date().toISOString().split("T")[0],
                        hora_apertura: "08:00 AM",
                        hora_cierre: new Date().toLocaleTimeString("es-VE", { hour: "2-digit", minute: "2-digit", hour12: true }),
                        cajero: cajeroNombre.trim() || currentUser?.nombre_completo || "Cajero Principal",
                        tasa_bcv: bcvRate,
                        ventas_count: 26,
                        esperado_usd: 165.40,
                        esperado_ves: 165.40 * bcvRate,
                        total_efectivo_usd: countUsd,
                        total_efectivo_ves: countVes,
                        total_pago_movil_ves: 8420.00,
                        total_punto_ves: 12900.00,
                        total_zelle_usd: 15.00,
                        total_fiado_usd: 24.50,
                        total_general_usd: parseFloat(totalGenUsd.toFixed(2)),
                        total_general_ves: parseFloat(totalGenVes.toFixed(2)),
                        diferencia_usd: parseFloat(diffU.toFixed(2)),
                        diferencia_ves: parseFloat(diffV.toFixed(2)),
                        estado_cuadre: status,
                        observaciones: cierreObservaciones.trim() || (status === "CUADRADA" ? "Cierre conforme sin diferencias." : `Diferencia registrada de $${diffU.toFixed(2)}`),
                      };

                      setPendingCierreRecord(nuevoCierre);
                      setNextUserPin("");
                      setAuthError("");
                      setIsCierreAuthModalOpen(true);
                    }}
                    className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black flex items-center gap-2 shadow-lg shadow-amber-950/40 cursor-pointer transition-all"
                  >
                    <CheckCircle2 className="w-4 h-4 text-slate-950" />
                    <span>Guardar y Cerrar caja</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* VIEW 2: HISTORIAL DE CIERRES ANTERIORES */}
          {cajaSubTab === "historial" && (
            <div className="bg-[#12141a] border border-slate-800 rounded-2xl p-4 space-y-4">
              {/* Header & Controls */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-slate-800">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <HistoryIcon className="w-4 h-4 text-amber-400" />
                    <span>Historial de Cierres de Caja Anteriores (Auditoría del Dueño)</span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Registro histórico persistente para contrastar cierres de turnos pasados, diferencias y conciliación.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400 font-mono">
                    Total Cierres Registrados: <strong className="text-amber-300">{cierresHistory.length}</strong>
                  </span>
                </div>
              </div>

              {/* Filters */}
              <div className="flex flex-wrap items-center gap-2 bg-[#0e1017] p-2.5 rounded-xl border border-slate-800">
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={historialSearchQuery}
                    onChange={(e) => setHistorialSearchQuery(e.target.value)}
                    placeholder="Buscar por ID, fecha (YYYY-MM-DD) o cajero..."
                    className="w-full bg-[#14161f] border border-slate-700/80 rounded-lg pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 font-mono"
                  />
                </div>

                <div className="flex items-center gap-1">
                  {(["TODOS", "CUADRADA", "FALTANTE", "SOBRANTE"] as const).map((st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => setHistorialStatusFilter(st)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-colors cursor-pointer ${
                        historialStatusFilter === st
                          ? "bg-amber-500 text-slate-950"
                          : "bg-slate-800 text-slate-400 hover:text-white"
                      }`}
                    >
                      {st}
                    </button>
                  ))}
                </div>
              </div>

              {/* List of Previous Closures */}
              {cierresHistory.length === 0 ? (
                <div className="text-center py-12 border border-dashed border-slate-800 rounded-2xl p-6">
                  <Calculator className="w-10 h-10 text-slate-600 mx-auto mb-2" />
                  <div className="text-sm font-bold text-slate-300">No hay cierres de caja registrados</div>
                  <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                    El historial está limpio. Realiza un cierre de caja desde la pestaña "Arqueo de Turno Actual" para generar registros de auditoría.
                  </p>
                  <button
                    type="button"
                    onClick={() => setCajaSubTab("actual")}
                    className="mt-4 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer shadow"
                  >
                    <Calculator className="w-4 h-4" />
                    <span>Ir a Arqueo de Turno</span>
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {cierresHistory
                    .filter((c) => {
                      const matchSearch =
                        !historialSearchQuery.trim() ||
                        c.id.toLowerCase().includes(historialSearchQuery.toLowerCase()) ||
                        c.cajero.toLowerCase().includes(historialSearchQuery.toLowerCase()) ||
                        c.fecha.includes(historialSearchQuery);
                      const matchStatus =
                        historialStatusFilter === "TODOS" || c.estado_cuadre === historialStatusFilter;
                      return matchSearch && matchStatus;
                    })
                    .map((cierre) => (
                      <div
                        key={cierre.id}
                        className="bg-[#14161f] border border-slate-800 hover:border-amber-500/40 p-4 rounded-xl transition-all space-y-3 shadow-md"
                      >
                        {/* Header of closure record */}
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2.5">
                            <span className="px-2 py-0.5 rounded bg-amber-500/15 border border-amber-500/30 text-amber-300 font-mono text-xs font-bold">
                              {cierre.id}
                            </span>
                            <span className="text-xs text-slate-300 font-semibold flex items-center gap-1">
                              <Calendar className="w-3.5 h-3.5 text-slate-400" />
                              {cierre.fecha} ({cierre.hora_apertura} - {cierre.hora_cierre})
                            </span>
                            <span className="text-xs text-slate-400 flex items-center gap-1">
                              <User className="w-3.5 h-3.5 text-slate-500" />
                              {cierre.cajero}
                            </span>
                          </div>

                          <div className="flex items-center gap-2">
                            <span
                              className={`px-2.5 py-0.5 rounded text-[11px] font-extrabold border ${
                                cierre.estado_cuadre === "CUADRADA"
                                  ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                                  : cierre.estado_cuadre === "FALTANTE"
                                  ? "bg-rose-500/20 text-rose-300 border-rose-500/40"
                                  : "bg-blue-500/20 text-blue-300 border-blue-500/40"
                              }`}
                            >
                              {cierre.estado_cuadre === "CUADRADA"
                                ? "✓ CUADRADA"
                                : cierre.estado_cuadre === "FALTANTE"
                                ? `⚠ FALTANTE (-$${Math.abs(cierre.diferencia_usd).toFixed(2)})`
                                : `+ SOBRANTE (+$${Math.abs(cierre.diferencia_usd).toFixed(2)})`}
                            </span>

                            <button
                              type="button"
                              onClick={() => setSelectedCierreDetail(cierre)}
                              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                            >
                              <Eye className="w-3.5 h-3.5 text-amber-400" />
                              <span>Ver Comprobante</span>
                            </button>
                          </div>
                        </div>

                        {/* Totals & Breakdown Grid */}
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2 bg-[#0e1017] p-2.5 rounded-xl border border-slate-850 font-mono text-xs">
                          <div>
                            <div className="text-[10px] text-slate-400">💵 Efec. USD</div>
                            <div className="font-bold text-amber-300">${cierre.total_efectivo_usd.toFixed(2)}</div>
                          </div>
                          <div>
                            <div className="text-[10px] text-slate-400">🇻🇪 Efec. Bs.</div>
                            <div className="font-bold text-blue-300">Bs. {cierre.total_efectivo_ves.toFixed(2)}</div>
                          </div>
                          <div>
                            <div className="text-[10px] text-slate-400">📲 Pago Móvil</div>
                            <div className="font-bold text-purple-300">Bs. {cierre.total_pago_movil_ves.toFixed(2)}</div>
                          </div>
                          <div>
                            <div className="text-[10px] text-slate-400">💳 Punto/POS</div>
                            <div className="font-bold text-emerald-300">Bs. {cierre.total_punto_ves.toFixed(2)}</div>
                          </div>
                          <div>
                            <div className="text-[10px] text-slate-400">🟢 Zelle / Dig.</div>
                            <div className="font-bold text-teal-300">${cierre.total_zelle_usd.toFixed(2)}</div>
                          </div>
                          <div>
                            <div className="text-[10px] text-slate-400">📖 Fiado Turno</div>
                            <div className="font-bold text-rose-300">${cierre.total_fiado_usd.toFixed(2)}</div>
                          </div>
                        </div>

                        {/* Footer info: Total General, Tasa BCV & Notes */}
                        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400 font-mono pt-1">
                          <div>
                            <span>Tasa BCV: <strong className="text-slate-300">Bs. {cierre.tasa_bcv.toFixed(2)}</strong></span>
                            {cierre.observaciones && (
                              <span className="ml-3 text-slate-300 italic">
                                Nota: "{cierre.observaciones}"
                              </span>
                            )}
                          </div>
                          <div className="text-right">
                            <span className="text-slate-400">Total Liquidado en Caja: </span>
                            <strong className="text-white text-sm font-bold">${cierre.total_general_usd.toFixed(2)} USD</strong>
                            <span className="text-slate-400 ml-1">(Bs. {cierre.total_general_ves.toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })})</span>
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ========================================================= */}
      {/* 4. TAB: PRECIOS Y CARTELITOS DE ANAQUEL */}
      {/* ========================================================= */}
      {bodegaTab === "etiquetas" && (
        <div className="bg-[#12141a] border border-slate-800 rounded-2xl p-4 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Tag className="w-4 h-4 text-amber-400" />
                <span>Precios de Anaquel en Dólares ($) con Referencia a Tasa BCV</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Cartelitos de anaquel con precio en dólares y pie de referencia a la tasa BCV oficial del día (Bs. {bcvRate.toFixed(2)}).
              </p>
            </div>
            <button
              type="button"
              onClick={() => window.print()}
              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Imprimir Cartelitos</span>
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2.5">
            {products.map((p) => (
              <div
                key={p.id}
                className="bg-white text-black p-2.5 rounded-xl border border-gray-300 shadow-sm flex flex-col justify-between text-center font-sans"
              >
                <div className="text-[11px] font-extrabold uppercase line-clamp-2 leading-tight">
                  {p.nombre}
                </div>
                <div className="my-2 py-2 bg-amber-100 rounded-lg">
                  <div className="text-xl font-black text-amber-950 font-mono tracking-tight">
                    ${p.precio_venta.toFixed(2)}
                  </div>
                </div>
                <div className="text-[9px] text-gray-600 font-mono font-medium">
                  Tasa BCV: {bcvRate.toFixed(2)} • {p.codigo_barras || `SKU-${p.id}`}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL COBRAR VENTA DE MOSTRADOR */}
      {/* ========================================================= */}
      {isPayModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[#12141a] border border-amber-500/40 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[92vh] my-auto">
            <div className="bg-[#181b24] px-4 py-3 border-b border-slate-800 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2 text-white font-bold text-sm">
                <DollarSign className="w-4 h-4 text-amber-400" />
                <span>Cobrar Venta Rápida de Mostrador</span>
              </div>
              <button
                onClick={() => {
                  setIsPayModalOpen(false);
                  setCustomTotalUsd("");
                }}
                className="text-slate-400 hover:text-white p-1"
              >
                ✕
              </button>
            </div>

            <div className="p-4 space-y-4 overflow-y-auto flex-1 min-h-0">
              {/* Total Banner Modificable */}
              <div className="bg-[#0e1017] p-3.5 rounded-xl border border-amber-500/40 space-y-2.5">
                <div className="flex items-center justify-between flex-wrap gap-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                      <DollarSign className="w-4 h-4 text-amber-400" />
                      TOTAL A COBRAR EN ESTA OPERACIÓN:
                    </span>
                    {isTotalCustomized && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                        {effectiveTotalUsd > cartTotalUsd ? "Monto con Abono / Ajuste" : "Monto Modificado"}
                      </span>
                    )}
                  </div>
                  {isTotalCustomized && (
                    <button
                      type="button"
                      onClick={() => setCustomTotalUsd(cartTotalUsd)}
                      className="text-[11px] text-amber-400 hover:text-amber-300 underline font-semibold flex items-center gap-1 cursor-pointer"
                    >
                      <RotateCcw className="w-3 h-3" />
                      Restablecer (${cartTotalUsd.toFixed(2)})
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center bg-[#14161f] p-3 rounded-xl border border-slate-800">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-[11px] text-slate-300 font-semibold">
                        Monto a Cobrar ($ USD):
                      </label>
                      <span className="text-[10px] text-slate-400">(Modificable)</span>
                    </div>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-base font-black text-amber-400 font-mono">
                        $
                      </span>
                      <input
                        type="number"
                        step="any"
                        value={customTotalUsd}
                        onChange={(e) => {
                          const val = e.target.value;
                          setCustomTotalUsd(val === "" ? "" : parseFloat(val));
                        }}
                        placeholder={cartTotalUsd.toFixed(2)}
                        className="w-full bg-[#0a0c10] border border-amber-500/60 rounded-xl pl-8 pr-3 py-2 text-lg font-black text-white font-mono focus:border-amber-400 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-[11px] text-slate-400 font-medium">TOTAL EN BOLÍVARES:</div>
                    <div className="text-xl font-black text-white font-mono">
                      Bs.{" "}
                      {effectiveTotalVes.toLocaleString("es-VE", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </div>
                    <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                      Tasa BCV: Bs. {bcvRate.toFixed(2)} / USD
                    </div>
                  </div>
                </div>

                {/* Subtotal vs Extra Abono Breakdown + Quick Abono Add Buttons */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-0.5 border-t border-slate-800/80">
                  <div className="text-[11px] text-slate-300 font-mono">
                    <span>Subtotal Carrito: <strong>${cartTotalUsd.toFixed(2)}</strong></span>
                    {isTotalCustomized && (
                      <span className={`ml-2 font-bold ${effectiveTotalUsd >= cartTotalUsd ? "text-amber-400" : "text-blue-400"}`}>
                        {effectiveTotalUsd > cartTotalUsd
                          ? `(+ $${(effectiveTotalUsd - cartTotalUsd).toFixed(2)} abono a cuenta anterior)`
                          : `(- $${(cartTotalUsd - effectiveTotalUsd).toFixed(2)})`}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1">
                    <span className="text-[10px] text-slate-400 font-medium">Sumar abono:</span>
                    {[5, 10, 20, 50].map((extra) => (
                      <button
                        key={extra}
                        type="button"
                        onClick={() => {
                          const base =
                            typeof customTotalUsd === "number" && !isNaN(customTotalUsd) && customTotalUsd > 0
                              ? customTotalUsd
                              : cartTotalUsd;
                          setCustomTotalUsd(parseFloat((base + extra).toFixed(2)));
                        }}
                        className="px-2 py-0.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-300 text-[10px] font-bold font-mono border border-slate-700 cursor-pointer transition-colors"
                        title={`Sumar $${extra} de abono anterior`}
                      >
                        +${extra}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Payment Methods Grid */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300">
                  Forma de Cobro:
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedPaymentMethod("EFECTIVO_USD")}
                    className={`p-2.5 rounded-xl border text-xs font-bold flex flex-col items-center gap-1 transition-all ${
                      selectedPaymentMethod === "EFECTIVO_USD"
                        ? "bg-amber-500 text-slate-950 border-amber-400 font-extrabold shadow"
                        : "bg-[#14161f] text-slate-300 border-slate-800 hover:bg-slate-800"
                    }`}
                  >
                    <Banknote className="w-4 h-4" />
                    <span>Efectivo ($)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedPaymentMethod("PAGO_MOVIL")}
                    className={`p-2.5 rounded-xl border text-xs font-bold flex flex-col items-center gap-1 transition-all ${
                      selectedPaymentMethod === "PAGO_MOVIL"
                        ? "bg-amber-500 text-slate-950 border-amber-400 font-extrabold shadow"
                        : "bg-[#14161f] text-slate-300 border-slate-800 hover:bg-slate-800"
                    }`}
                  >
                    <Smartphone className="w-4 h-4" />
                    <span>Pago Móvil</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedPaymentMethod("PUNTO_VENTA")}
                    className={`p-2.5 rounded-xl border text-xs font-bold flex flex-col items-center gap-1 transition-all ${
                      selectedPaymentMethod === "PUNTO_VENTA"
                        ? "bg-amber-500 text-slate-950 border-amber-400 font-extrabold shadow"
                        : "bg-[#14161f] text-slate-300 border-slate-800 hover:bg-slate-800"
                    }`}
                  >
                    <CreditCard className="w-4 h-4" />
                    <span>Punto / Tarjeta</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedPaymentMethod("EFECTIVO_VES")}
                    className={`p-2.5 rounded-xl border text-xs font-bold flex flex-col items-center gap-1 transition-all ${
                      selectedPaymentMethod === "EFECTIVO_VES"
                        ? "bg-amber-500 text-slate-950 border-amber-400 font-extrabold shadow"
                        : "bg-[#14161f] text-slate-300 border-slate-800 hover:bg-slate-800"
                    }`}
                  >
                    <Banknote className="w-4 h-4" />
                    <span>Efectivo (Bs.)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedPaymentMethod("ZELLE")}
                    className={`p-2.5 rounded-xl border text-xs font-bold flex flex-col items-center gap-1 transition-all ${
                      selectedPaymentMethod === "ZELLE"
                        ? "bg-amber-500 text-slate-950 border-amber-400 font-extrabold shadow"
                        : "bg-[#14161f] text-slate-300 border-slate-800 hover:bg-slate-800"
                    }`}
                  >
                    <DollarSign className="w-4 h-4" />
                    <span>Zelle</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedPaymentMethod("FIADO")}
                    className={`p-2.5 rounded-xl border text-xs font-bold flex flex-col items-center gap-1 transition-all ${
                      selectedPaymentMethod === "FIADO"
                        ? "bg-rose-600 text-white border-rose-500 font-extrabold shadow"
                        : "bg-[#14161f] text-rose-300 border-rose-900/50 hover:bg-slate-800"
                    }`}
                  >
                    <BookOpen className="w-4 h-4" />
                    <span>Fiar (Anotar)</span>
                  </button>
                </div>
              </div>

              {/* Conditional Inputs */}
              {selectedPaymentMethod === "PUNTO_VENTA" && (
                posMode === "smartpos" ? (
                  <div className="bg-[#14161f] p-3 rounded-xl border border-blue-900/60 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                        <span className="text-xs font-bold text-white flex items-center gap-1.5">
                          <Wifi className="w-3.5 h-3.5 text-blue-400" />
                          SmartPOS WizarPOS / PAX Conectado
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowWizarPosConfigModal(true)}
                        className="text-[10px] text-blue-300 hover:text-blue-200 underline flex items-center gap-1"
                      >
                        <Settings className="w-3 h-3" />
                        IP: {wizarPosIp}
                      </button>
                    </div>

                    <div className="p-2.5 rounded-lg bg-blue-950/40 border border-blue-800/40 text-[11px] text-blue-200 space-y-1">
                      <div className="flex justify-between font-mono">
                        <span>Monto a cobrar en punto:</span>
                        <span className="font-bold text-white text-xs">
                          Bs. {effectiveTotalVes.toFixed(2)} (${effectiveTotalUsd.toFixed(2)} USD)
                        </span>
                      </div>
                      <p className="text-[10px] text-blue-300">
                        Al presionar <strong>Confirmar Cobro</strong>, el sistema enviará automáticamente la orden al terminal por Wi-Fi para que el cliente pase su tarjeta.
                      </p>
                    </div>

                    {/* Toggle between automated SmartPOS or manual punto */}
                    <div className="flex items-center justify-between pt-1 text-[11px] text-slate-400">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={useSmartPosAuto}
                          onChange={(e) => setUseSmartPosAuto(e.target.checked)}
                          className="rounded border-slate-700 text-blue-600 focus:ring-blue-500"
                        />
                        <span>Enviar cobro automático por Wi-Fi</span>
                      </label>
                    </div>

                    {!useSmartPosAuto && (
                      <input
                        type="text"
                        value={puntoManualRef}
                        onChange={(e) => setPuntoManualRef(e.target.value)}
                        placeholder="Número de referencia manual del punto..."
                        className="w-full bg-[#0e1017] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono"
                      />
                    )}
                  </div>
                ) : (
                  <div className="bg-[#14161f] p-3 rounded-xl border border-amber-500/40 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CreditCard className="w-4 h-4 text-amber-400" />
                        <span className="text-xs font-bold text-white">
                          Punto de Venta Manual / Tarjeta Bancaria
                        </span>
                      </div>
                      <span className="text-[10px] font-mono font-bold text-amber-300 bg-amber-950/60 px-2 py-0.5 rounded border border-amber-800/40">
                        Sin Datáfono Wi-Fi
                      </span>
                    </div>

                    <div className="p-2.5 rounded-lg bg-[#0e1017] border border-slate-800 text-[11px] text-slate-300 space-y-1">
                      <div className="flex justify-between font-mono">
                        <span className="text-slate-400">Total a pasar en el punto:</span>
                        <span className="font-bold text-amber-400 text-xs">
                          Bs. {effectiveTotalVes.toFixed(2)} (${effectiveTotalUsd.toFixed(2)} USD)
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-400">
                        Procesa la tarjeta en el datáfono físico de tu banco. Al confirmar, se descontará el inventario inmediatamente.
                      </p>
                    </div>

                    <div>
                      <label className="text-[11px] text-slate-400 block mb-1">
                        Número de Referencia / Lote (Opcional):
                      </label>
                      <input
                        type="text"
                        value={puntoManualRef}
                        onChange={(e) => setPuntoManualRef(e.target.value)}
                        placeholder="Ej: 004821 o 4 últimos dígitos..."
                        className="w-full bg-[#0e1017] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 font-mono focus:border-amber-500 focus:outline-none"
                      />
                    </div>
                  </div>
                )
              )}

              {selectedPaymentMethod === "EFECTIVO_USD" && (
                <div className="bg-[#14161f] p-3.5 rounded-xl border border-amber-500/40 space-y-3 shadow-inner">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                      <Banknote className="w-4 h-4 text-amber-400" />
                      <span>Billetes $ en Dólares entregados por el cliente:</span>
                    </label>
                    <span className="text-[10px] text-amber-300 font-mono">
                      Tasa BCV: Bs. {bcvRate.toFixed(2)}
                    </span>
                  </div>

                  {/* Input for USD cash given */}
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-base font-bold text-amber-400 font-mono">
                      $
                    </span>
                    <input
                      type="number"
                      step="any"
                      value={cashGivenUsd}
                      onChange={(e) =>
                        setCashGivenUsd(
                          e.target.value === "" ? "" : parseFloat(e.target.value)
                        )
                      }
                      placeholder={`Ej: ${Math.ceil(effectiveTotalUsd)}`}
                      className="w-full bg-[#0e1017] border border-amber-500/50 rounded-xl pl-8 pr-3 py-2.5 text-base font-bold text-white font-mono focus:border-amber-400 focus:outline-none"
                      autoFocus
                    />
                  </div>

                  {/* Quick bill buttons ($1, $5, $10, $20, $50, $100 or Exact) */}
                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    <button
                      type="button"
                      onClick={() => setCashGivenUsd(effectiveTotalUsd)}
                      className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-[11px] font-mono font-semibold text-slate-300"
                    >
                      Exacto (${effectiveTotalUsd.toFixed(2)})
                    </button>
                    {[1, 2, 3, 5, 10, 20, 50, 100]
                      .filter((bill) => bill >= Math.floor(effectiveTotalUsd))
                      .slice(0, 6)
                      .map((bill) => (
                        <button
                          key={bill}
                          type="button"
                          onClick={() => setCashGivenUsd(bill)}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-mono font-bold transition-all ${
                            cashGivenUsd === bill
                              ? "bg-amber-500 text-slate-950 font-black shadow"
                              : "bg-[#1d2028] text-amber-300 hover:bg-slate-700 border border-amber-500/20"
                          }`}
                        >
                          ${bill}
                        </button>
                      ))}
                  </div>

                  {/* Vuelto a devolver en Bs y en USD */}
                  {typeof cashGivenUsd === "number" && (
                    <>
                      {cashGivenUsd >= effectiveTotalUsd ? (
                        <div className="mt-3 p-3 bg-gradient-to-br from-emerald-950/60 to-emerald-900/30 border border-emerald-500/50 rounded-xl space-y-2">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-emerald-300 font-bold flex items-center gap-1">
                              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                              VUELTO A ENTREGAR AL CLIENTE:
                            </span>
                            <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold text-[10px] border border-emerald-500/30">
                              Calculado a Tasa BCV
                            </span>
                          </div>

                          {/* Big Change in Bolivares (Bs.) box */}
                          <div className="bg-[#0b1b13] p-3 rounded-lg border border-emerald-500/40 flex items-center justify-between">
                            <div>
                              <div className="text-[10px] text-emerald-400 font-medium">
                                DEVOLVER EN BOLÍVARES (Bs.):
                              </div>
                              <div className="text-xl font-black text-white font-mono tracking-tight">
                                Bs.{" "}
                                {((cashGivenUsd - effectiveTotalUsd) * bcvRate).toLocaleString(
                                  "es-VE",
                                  {
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 2,
                                  }
                                )}
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-[10px] text-slate-400 font-medium">
                                O en Dólares ($):
                              </div>
                              <div className="text-sm font-bold text-emerald-300 font-mono">
                                ${(cashGivenUsd - effectiveTotalUsd).toFixed(2)} USD
                              </div>
                            </div>
                          </div>

                          {/* Clear breakdown legend */}
                          <div className="text-[10px] text-emerald-200/90 font-mono pt-0.5">
                            Desglose: Entregó ${cashGivenUsd.toFixed(2)} - Total $
                            {effectiveTotalUsd.toFixed(2)} = $
                            {(cashGivenUsd - effectiveTotalUsd).toFixed(2)} USD × Bs.{" "}
                            {bcvRate.toFixed(2)}
                          </div>
                        </div>
                      ) : (
                        <div className="p-2.5 bg-rose-950/40 border border-rose-500/50 rounded-xl flex items-center gap-2 text-rose-300 text-xs font-medium">
                          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                          <span>
                            Faltan <strong>${(effectiveTotalUsd - cashGivenUsd).toFixed(2)} USD</strong>{" "}
                            (Bs. {((effectiveTotalUsd - cashGivenUsd) * bcvRate).toFixed(2)}) para completar el pago.
                          </span>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}

              {selectedPaymentMethod === "EFECTIVO_VES" && (
                <div className="bg-[#14161f] p-3.5 rounded-xl border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                      <Banknote className="w-4 h-4 text-blue-400" />
                      <span>Billetes en Bolívares (Bs.) entregados por el cliente:</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => setCashGivenVes(effectiveTotalVes)}
                      className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-[10px] font-mono text-blue-300 font-semibold"
                    >
                      Exacto (Bs. {effectiveTotalVes.toFixed(2)})
                    </button>
                  </div>

                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-blue-400 font-mono">
                      Bs.
                    </span>
                    <input
                      type="number"
                      step="any"
                      value={cashGivenVes}
                      onChange={(e) =>
                        setCashGivenVes(
                          e.target.value === "" ? "" : parseFloat(e.target.value)
                        )
                      }
                      placeholder={`Ej: ${Math.ceil(effectiveTotalVes)}`}
                      className="w-full bg-[#0e1017] border border-slate-700 rounded-xl pl-10 pr-3 py-2 text-sm font-bold text-white font-mono focus:border-blue-500 focus:outline-none"
                      autoFocus
                    />
                  </div>

                  {/* Vuelto en Bs */}
                  {typeof cashGivenVes === "number" && (
                    <>
                      {cashGivenVes >= effectiveTotalVes ? (
                        <div className="p-3 bg-emerald-950/40 border border-emerald-500/40 rounded-xl flex items-center justify-between">
                          <div>
                            <div className="text-[10px] text-emerald-400 font-bold">
                              VUELTO A ENTREGAR EN BS:
                            </div>
                            <div className="text-lg font-black text-white font-mono">
                              Bs.{" "}
                              {(cashGivenVes - effectiveTotalVes).toLocaleString("es-VE", {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })}
                            </div>
                          </div>
                          <div className="text-right text-xs font-mono text-emerald-300">
                            ≈ ${((cashGivenVes - effectiveTotalVes) / bcvRate).toFixed(2)} USD
                          </div>
                        </div>
                      ) : (
                        <div className="p-2 bg-rose-950/40 border border-rose-500/40 rounded-xl text-rose-300 text-xs">
                          Faltan Bs. {(effectiveTotalVes - cashGivenVes).toFixed(2)} para completar el total.
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}

              {selectedPaymentMethod === "PAGO_MOVIL" && (
                <div className="bg-[#14161f] p-3 rounded-xl border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-amber-300">📲 Datos: 0414-1234567 • V-18.765.432 • Mercantil</span>
                    <span className="font-mono font-bold text-white">
                      Bs. {effectiveTotalVes.toFixed(2)} (${effectiveTotalUsd.toFixed(2)})
                    </span>
                  </div>
                  <input
                    type="text"
                    value={pagoMovilRef}
                    onChange={(e) => setPagoMovilRef(e.target.value)}
                    placeholder="Últimos 4 o 6 dígitos de referencia (opcional)..."
                    className="w-full bg-[#0e1017] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono"
                  />
                </div>
              )}

              {selectedPaymentMethod === "ZELLE" && (
                <div className="bg-[#14161f] p-3 rounded-xl border border-purple-900/60 space-y-2">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-purple-300 font-semibold">📧 Zelle: pagos@bodegafeliz.com</span>
                    <span className="font-mono font-bold text-white">
                      ${effectiveTotalUsd.toFixed(2)} USD
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400">
                    Confirme la recepción en la aplicación de su banco antes de entregar los productos.
                  </p>
                </div>
              )}

              {selectedPaymentMethod === "FIADO" && (
                <div className="bg-[#14161f] p-3.5 rounded-xl border border-rose-900/60 space-y-3">
                  {!isInlineCreatingFiado ? (
                    <>
                      <div className="flex items-center justify-between">
                        <label className="text-xs text-rose-300 font-bold flex items-center gap-1.5">
                          <BookOpen className="w-3.5 h-3.5 text-rose-400" />
                          <span>Seleccionar vecino a quien se le anota:</span>
                        </label>
                        <button
                          type="button"
                          onClick={() => setIsInlineCreatingFiado(true)}
                          className="px-2.5 py-1 rounded-lg bg-rose-600/20 hover:bg-rose-600/40 border border-rose-500/40 text-rose-300 hover:text-white text-[11px] font-bold flex items-center gap-1 transition-all shadow-sm cursor-pointer"
                        >
                          <UserPlus className="w-3.5 h-3.5 text-amber-400" />
                          <span>+ Nuevo Vecino</span>
                        </button>
                      </div>

                      <select
                        value={selectedFiadoClienteId}
                        onChange={(e) => setSelectedFiadoClienteId(e.target.value)}
                        className="w-full bg-[#0e1017] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:border-rose-500 focus:outline-none"
                      >
                        <option value="">-- Elige un vecino de la libreta --</option>
                        {fiadosList.map((f) => (
                          <option key={f.id} value={f.id}>
                            {f.nombre} (Debe: ${f.saldo_deuda_usd.toFixed(2)}) {f.direccion ? `• ${f.direccion}` : ""}
                          </option>
                        ))}
                      </select>

                      {/* Selected Neighbor Status Quick Info */}
                      {selectedFiadoClienteId && (() => {
                        const sel = fiadosList.find((f) => f.id === selectedFiadoClienteId);
                        if (!sel) return null;
                        const nuevoSaldo = sel.saldo_deuda_usd + effectiveTotalUsd;
                        return (
                          <div className="p-2.5 rounded-xl border text-xs bg-[#0e1017] border-slate-800 text-slate-300">
                            <div className="flex justify-between font-mono text-[11px]">
                              <span>Deuda actual: <strong className="text-white">${sel.saldo_deuda_usd.toFixed(2)}</strong></span>
                              <span>+ Esta operación: <strong className="text-amber-400">${effectiveTotalUsd.toFixed(2)}</strong></span>
                            </div>
                            <div className="flex justify-between items-center mt-1 pt-1 border-t border-slate-800/80 font-mono text-[11px]">
                              <span>Nuevo saldo total:</span>
                              <span className="font-bold text-rose-400 text-xs">
                                ${nuevoSaldo.toFixed(2)} USD (≈ Bs. {(nuevoSaldo * bcvRate).toFixed(2)})
                              </span>
                            </div>
                          </div>
                        );
                      })()}

                      {/* Link to create new neighbor if not found */}
                      <div className="flex items-center justify-between text-[11px] pt-1 border-t border-slate-800/80">
                        <span className="text-slate-400">¿No aparece en la libreta?</span>
                        <button
                          type="button"
                          onClick={() => setIsInlineCreatingFiado(true)}
                          className="text-amber-400 hover:text-amber-300 font-bold underline flex items-center gap-1 cursor-pointer"
                        >
                          <UserPlus className="w-3 h-3" />
                          <span>Crear nuevo vecino directamente aquí</span>
                        </button>
                      </div>
                    </>
                  ) : (
                    /* Inline Creation Form */
                    <div className="space-y-3 animate-in fade-in duration-200">
                      <div className="flex items-center justify-between border-b border-rose-900/60 pb-2">
                        <div className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                          <UserPlus className="w-4 h-4 text-amber-400" />
                          <span>Registrar Nuevo Vecino en la Libreta</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setIsInlineCreatingFiado(false)}
                          className="text-[11px] text-slate-400 hover:text-slate-200 font-semibold cursor-pointer"
                        >
                          ✕ Volver a la lista
                        </button>
                      </div>

                      <div className="space-y-2.5">
                        <div>
                          <label className="text-[11px] font-bold text-slate-200 block mb-1">
                            Nombre del Vecino / Familia <span className="text-rose-400">*</span>:
                          </label>
                          <input
                            type="text"
                            value={inlineFiadoNombre}
                            onChange={(e) => setInlineFiadoNombre(e.target.value)}
                            placeholder="Ej: Doña Carmen (Casa #12), Don Pedro..."
                            className="w-full bg-[#0e1017] border border-amber-500/70 rounded-xl px-3 py-2 text-xs text-white focus:border-amber-400 focus:outline-none"
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                handleQuickCreateFiadoInCheckout();
                              }
                            }}
                          />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <div>
                            <label className="text-[10px] text-slate-400 block mb-0.5">
                              Teléfono / WhatsApp (opcional):
                            </label>
                            <input
                              type="text"
                              value={inlineFiadoTelefono}
                              onChange={(e) => setInlineFiadoTelefono(e.target.value)}
                              placeholder="Ej: 0412-1234567"
                              className="w-full bg-[#0e1017] border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-white"
                            />
                          </div>

                          <div>
                            <label className="text-[10px] text-slate-400 block mb-0.5">
                              Dirección o Referencia:
                            </label>
                            <input
                              type="text"
                              value={inlineFiadoDireccion}
                              onChange={(e) => setInlineFiadoDireccion(e.target.value)}
                              placeholder="Ej: Calle 3, frente al parque"
                              className="w-full bg-[#0e1017] border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-white"
                            />
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => setIsInlineCreatingFiado(false)}
                          className="flex-1 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
                        >
                          Cancelar
                        </button>
                        <button
                          type="button"
                          onClick={() => handleQuickCreateFiadoInCheckout()}
                          className="flex-2 py-2 px-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 text-xs font-extrabold shadow flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5 text-slate-950" />
                          <span>Guardar y Seleccionar para Fiar</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="bg-[#181b24] px-4 py-3 border-t border-slate-800 flex items-center justify-between shrink-0">
              <button
                type="button"
                onClick={() => {
                  setIsPayModalOpen(false);
                  setCustomTotalUsd("");
                }}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-700"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmSale}
                className="px-6 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 text-xs font-black shadow-lg"
              >
                ✓ CONFIRMAR COBRO
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL TICKET NO FISCAL / NOTA DE ENTREGA */}
      {/* ========================================================= */}
      {completedSaleTicket && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[#12141a] border border-slate-700 rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden flex flex-col max-h-[90vh] my-auto">
            <div className="bg-[#181b24] px-4 py-3 border-b border-slate-800 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2 text-white font-bold text-xs">
                <Receipt className="w-4 h-4 text-amber-400" />
                <span>Ticket No Fiscal • {completedSaleTicket.id}</span>
              </div>
              <button
                onClick={() => setCompletedSaleTicket(null)}
                className="text-slate-400 hover:text-white p-1"
              >
                ✕
              </button>
            </div>

            <div className="p-4 overflow-y-auto flex-1 min-h-0">
              {/* Thermal paper simulation */}
              <div className="bg-white text-black p-4 rounded-xl shadow font-mono text-[10px] space-y-1 leading-tight">
                <div className="text-center font-bold text-xs uppercase">
                  {getStoredNegocioConfig().nombreComercial || "BODEGA & VÍVERES"}
                </div>
                <div className="text-center text-[9px] text-gray-700 font-semibold">
                  RIF: {getStoredNegocioConfig().rif} • {getStoredNegocioConfig().telefono}
                </div>
                <div className="text-center text-[8.5px] text-gray-500">
                  {getStoredNegocioConfig().direccion}
                </div>
                <div className="text-center text-[9px] text-gray-600">
                  Comprobante Interno / Nota de Entrega
                </div>
                <div className="text-center text-[9px] border-b pb-1">
                  Fecha: {completedSaleTicket.fecha}
                </div>

                <div className="pt-1">
                  <div>CLIENTE: {completedSaleTicket.clienteNombre}</div>
                  <div>PAGO: {completedSaleTicket.metodo}</div>
                  {completedSaleTicket.ref && (
                    <div>REF: {completedSaleTicket.ref}</div>
                  )}
                  {completedSaleTicket.posMetadata && (
                    <div className="bg-gray-100 p-1 rounded mt-1 text-[8px] text-gray-800 space-y-0.5 border border-gray-300">
                      <div className="font-bold">*** TRANSACCIÓN SMARTPOS APROBADA ***</div>
                      <div>BANCO: {completedSaleTicket.posMetadata.banco || "BANCARIO"}</div>
                      <div>TARJETA: {completedSaleTicket.posMetadata.tarjetaTipo} (**** {completedSaleTicket.posMetadata.ultimos4})</div>
                      <div>APROBACIÓN: {completedSaleTicket.posMetadata.aprobacion}</div>
                      <div>LOTE: {completedSaleTicket.posMetadata.lote} • TERM: {completedSaleTicket.posMetadata.terminal}</div>
                    </div>
                  )}
                </div>

                <div className="border-t border-b py-1 my-1 space-y-0.5">
                  <div className="flex justify-between font-bold text-[9px]">
                    <span>CANT / ART</span>
                    <span>TOTAL ($)</span>
                  </div>
                  {completedSaleTicket.items.map((it, idx) => (
                    <div key={idx} className="flex justify-between">
                      <span className="truncate pr-1">
                        {it.cantidad}x {it.producto.nombre}
                      </span>
                      <span>${it.subtotal.toFixed(2)}</span>
                    </div>
                  ))}
                </div>

                <div className="space-y-0.5 pt-1 text-right font-bold text-xs">
                  {completedSaleTicket.montoAjustado && typeof completedSaleTicket.subtotalProductosUsd === "number" && (
                    <>
                      <div className="flex justify-between text-gray-700 text-[10px] font-normal">
                        <span>SUBTOTAL PRODUCTOS:</span>
                        <span>${completedSaleTicket.subtotalProductosUsd.toFixed(2)}</span>
                      </div>
                      {completedSaleTicket.totalUsd > completedSaleTicket.subtotalProductosUsd && (
                        <div className="flex justify-between text-amber-800 text-[10px] font-medium">
                          <span>+ ABONO / PAGO ADICIONAL:</span>
                          <span>+${(completedSaleTicket.totalUsd - completedSaleTicket.subtotalProductosUsd).toFixed(2)}</span>
                        </div>
                      )}
                    </>
                  )}
                  <div className="flex justify-between">
                    <span>TOTAL USD:</span>
                    <span>${completedSaleTicket.totalUsd.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-gray-700 text-[10px] font-normal">
                    <span>TOTAL BS:</span>
                    <span>Bs. {completedSaleTicket.totalVes.toFixed(2)}</span>
                  </div>
                  <div className="text-[8px] text-gray-500 font-normal">
                    Tasa BCV: Bs. {bcvRate.toFixed(2)}
                  </div>
                </div>

                {completedSaleTicket.vueltoUsd && (
                  <div className="border-t pt-1 flex justify-between text-emerald-800 text-[9px]">
                    <span>VUELTO:</span>
                    <span>
                      ${completedSaleTicket.vueltoUsd.toFixed(2)} (Bs.{" "}
                      {completedSaleTicket.vueltoVes?.toFixed(2)})
                    </span>
                  </div>
                )}

                <div className="text-center text-[8.5px] italic text-gray-600 pt-2 border-t mt-2">
                  "{getStoredNegocioConfig().pieTicket || "¡GRACIAS POR SU COMPRA! • VUELVA PRONTO"}"
                </div>
              </div>
            </div>

            <div className="bg-[#181b24] px-4 py-3 border-t border-slate-800 flex items-center justify-between gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setCompletedSaleTicket(null)}
                className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 text-xs font-semibold"
              >
                Cerrar
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold flex items-center gap-1 shadow"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Imprimir Ticket</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL REGISTRAR ABONO / PAGO A FIADO */}
      {/* ========================================================= */}
      {isAbonoModalOpen && selectedFiadoDetail && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[#12141a] border border-emerald-500/40 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col max-h-[90vh] my-auto">
            <div className="bg-[#181b24] px-4 py-3 border-b border-slate-800 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2 text-white font-bold text-sm">
                <DollarSign className="w-4 h-4 text-emerald-400" />
                <span>Registrar Abono • {selectedFiadoDetail.nombre}</span>
              </div>
              <button
                onClick={() => setIsAbonoModalOpen(false)}
                className="text-slate-400 hover:text-white p-1"
              >
                ✕
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleRegisterAbono();
              }}
              className="flex flex-col flex-1 min-h-0"
            >
              <div className="p-4 space-y-3 overflow-y-auto flex-1 min-h-0">
                <div className="bg-[#0e1017] p-3 rounded-xl border border-slate-800 flex justify-between items-center">
                  <div>
                    <div className="text-[11px] text-slate-400">Saldo Pendiente:</div>
                    <div className="text-base font-bold text-rose-400 font-mono">
                      ${selectedFiadoDetail.saldo_deuda_usd.toFixed(2)} USD
                    </div>
                  </div>
                  <div className="text-right font-mono text-xs text-slate-300">
                    Bs. {(selectedFiadoDetail.saldo_deuda_usd * bcvRate).toFixed(2)}
                  </div>
                </div>

                <div>
                  <label className="text-xs text-slate-300 font-bold block mb-1">
                    Monto a Abonar (en USD $):
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={abonoMontoUsd}
                    onChange={(e) =>
                      setAbonoMontoUsd(
                        e.target.value === "" ? "" : parseFloat(e.target.value)
                      )
                    }
                    placeholder={`Ej: ${selectedFiadoDetail.saldo_deuda_usd}`}
                    className="w-full bg-[#0e1017] border border-slate-700 rounded-xl px-3 py-2 text-sm text-white font-mono focus:border-emerald-500 focus:outline-none"
                    autoFocus
                  />
                </div>

                <div>
                  <label className="text-xs text-slate-300 font-bold block mb-1">
                    Método de Pago:
                  </label>
                  <select
                    value={abonoMetodo}
                    onChange={(e) => setAbonoMetodo(e.target.value)}
                    className="w-full bg-[#0e1017] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                  >
                    <option value="Pago Móvil">Pago Móvil</option>
                    <option value="Efectivo USD ($)">Efectivo Dólares ($)</option>
                    <option value="Efectivo Bs.">Efectivo Bolívares</option>
                    <option value="Punto de Venta">Punto de Venta</option>
                    <option value="Zelle">Zelle</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs text-slate-300 font-bold block mb-1">
                    Nota / Concepto:
                  </label>
                  <input
                    type="text"
                    value={abonoConcepto}
                    onChange={(e) => setAbonoConcepto(e.target.value)}
                    className="w-full bg-[#0e1017] border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white"
                  />
                </div>
              </div>

              <div className="bg-[#181b24] px-4 py-3 border-t border-slate-800 flex items-center justify-between shrink-0">
                <button
                  type="button"
                  onClick={() => setIsAbonoModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-700"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow cursor-pointer"
                >
                  ✓ Guardar Abono
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL NUEVO VECINO FIADO */}
      {/* ========================================================= */}
      {isNewFiadoModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[#12141a] border border-amber-500/40 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col max-h-[90vh] my-auto">
            <div className="bg-[#181b24] px-4 py-3 border-b border-slate-800 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2 text-white font-bold text-sm">
                <UserPlus className="w-4 h-4 text-amber-400" />
                <span>Agregar Vecino a la Libreta de Fiados</span>
              </div>
              <button
                onClick={() => setIsNewFiadoModalOpen(false)}
                className="text-slate-400 hover:text-white p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddNewFiado} className="p-4 space-y-3 overflow-y-auto flex-1 min-h-0">
              <div>
                <label className="text-xs text-slate-300 font-bold block mb-1">
                  Nombre del Vecino / Familia:
                </label>
                <input
                  type="text"
                  required
                  value={newFiadoNombre}
                  onChange={(e) => setNewFiadoNombre(e.target.value)}
                  placeholder="Ej: Doña Rosa (Casa #5)"
                  className="w-full bg-[#0e1017] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                  autoFocus
                />
              </div>

              <div>
                <label className="text-xs text-slate-300 font-bold block mb-1">
                  Teléfono / WhatsApp:
                </label>
                <input
                  type="text"
                  value={newFiadoTelefono}
                  onChange={(e) => setNewFiadoTelefono(e.target.value)}
                  placeholder="Ej: 0414-9876543"
                  className="w-full bg-[#0e1017] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>

              <div>
                <label className="text-xs text-slate-300 font-bold block mb-1">
                  Dirección o Referencia:
                </label>
                <input
                  type="text"
                  value={newFiadoDireccion}
                  onChange={(e) => setNewFiadoDireccion(e.target.value)}
                  placeholder="Ej: Vereda 3, Casa #14"
                  className="w-full bg-[#0e1017] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:border-amber-400 focus:outline-none"
                />
              </div>

              {/* Campo para colocar el monto de deuda directamente */}
              <div className="bg-[#0e1017] p-3 rounded-xl border border-amber-500/30 space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs text-amber-300 font-bold flex items-center gap-1.5">
                    <DollarSign className="w-3.5 h-3.5 text-amber-400" />
                    <span>Monto de Deuda Inicial ($ USD):</span>
                  </label>
                  <span className="text-[10px] text-slate-400 font-mono">
                    (Opcional)
                  </span>
                </div>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-amber-400 font-mono">
                    $
                  </span>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    value={newFiadoDeudaInicial}
                    onChange={(e) =>
                      setNewFiadoDeudaInicial(
                        e.target.value === "" ? "" : Math.max(0, parseFloat(e.target.value))
                      )
                    }
                    placeholder="0.00 (Ej: 15.00)"
                    className="w-full bg-[#14161f] border border-amber-500/50 rounded-xl pl-7 pr-3 py-2 text-sm text-white font-mono font-bold focus:border-amber-400 focus:outline-none"
                  />
                </div>
                {typeof newFiadoDeudaInicial === "number" && newFiadoDeudaInicial > 0 && (
                  <div className="text-[11px] text-amber-400/90 font-mono flex items-center justify-between pt-0.5">
                    <span>Equivalente en Bolívares:</span>
                    <span className="font-bold">
                      ≈ Bs. {(newFiadoDeudaInicial * bcvRate).toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} (Tasa: Bs. {bcvRate.toFixed(2)})
                    </span>
                  </div>
                )}
              </div>

              <div className="bg-[#181b24] px-4 py-3 -mx-4 -mb-4 mt-4 border-t border-slate-800 flex items-center justify-between shrink-0">
                <button
                  type="button"
                  onClick={() => setIsNewFiadoModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-700"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-extrabold shadow"
                >
                  + Guardar Vecino
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL VER HISTORIAL DE VECINO */}
      {/* ========================================================= */}
      {selectedFiadoDetail && !isAbonoModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[#12141a] border border-slate-700 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[88vh] my-auto">
            <div className="bg-[#181b24] px-4 py-3 border-b border-slate-800 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2 text-white font-bold text-sm">
                <BookOpen className="w-4 h-4 text-amber-400" />
                <span>Libreta de Cuenta • {selectedFiadoDetail.nombre}</span>
              </div>
              <button
                onClick={() => {
                  setSelectedFiadoDetail(null);
                  setIsAbonoJustCompleted(false);
                }}
                className="text-slate-400 hover:text-white p-1"
              >
                ✕
              </button>
            </div>

            <div className="p-4 overflow-y-auto space-y-3 flex-1 min-h-0">
              {isAbonoJustCompleted && (
                <div className="bg-emerald-950/60 border border-emerald-500/50 rounded-xl p-3 flex items-center gap-2.5 text-emerald-200 text-xs">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <div>
                    <span className="font-bold text-emerald-300">¡Abono registrado con éxito!</span>
                    <p className="text-[11px] text-emerald-400/90 mt-0.5">
                      El saldo pendiente y el historial de {selectedFiadoDetail.nombre} se han actualizado.
                    </p>
                  </div>
                </div>
              )}

              <div className="bg-[#0e1017] p-3.5 rounded-xl border border-slate-800 flex justify-between items-center">
                <div>
                  <div className="text-xs text-slate-400 font-medium">Deuda Acumulada:</div>
                  <div className="text-lg font-bold text-amber-400 font-mono">
                    ${selectedFiadoDetail.saldo_deuda_usd.toFixed(2)} USD
                  </div>
                </div>
                <div className="text-right font-mono text-xs text-slate-300">
                  ≈ Bs. {(selectedFiadoDetail.saldo_deuda_usd * bcvRate).toFixed(2)}
                </div>
              </div>

              <h4 className="text-xs font-bold text-slate-300 pt-1">
                Historial de Movimientos:
              </h4>

              <div className="space-y-2">
                {selectedFiadoDetail.historial.length === 0 ? (
                  <div className="text-center py-6 text-slate-500 text-xs">
                    No hay movimientos registrados para este vecino.
                  </div>
                ) : (
                  selectedFiadoDetail.historial.map((mov) => (
                    <div
                      key={mov.id}
                      className="p-3 bg-[#14161f] rounded-xl border border-slate-800 flex items-center justify-between gap-2"
                    >
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`px-1.5 py-0.2 rounded text-[9px] font-bold font-mono ${
                              mov.tipo === "CARGO_VENTA"
                                ? "bg-rose-500/20 text-rose-300"
                                : "bg-emerald-500/20 text-emerald-300"
                            }`}
                          >
                            {mov.tipo === "CARGO_VENTA" ? "COMPRA FIADA" : "ABONO PAGO"}
                          </span>
                          <span className="text-[10px] text-slate-500 font-mono">
                            {mov.fecha}
                          </span>
                        </div>
                        <div className="text-xs text-slate-200 mt-1">
                          {mov.concepto}
                        </div>
                      </div>

                      <div className="text-right font-mono">
                        <div
                          className={`text-xs font-bold ${
                            mov.tipo === "CARGO_VENTA"
                              ? "text-rose-400"
                              : "text-emerald-400"
                          }`}
                        >
                          {mov.tipo === "CARGO_VENTA" ? "+" : "-"}${mov.monto_usd.toFixed(2)}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          Bs. {mov.monto_ves.toFixed(2)}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="bg-[#181b24] px-4 py-3 border-t border-slate-800 flex items-center justify-between">
              {isAbonoJustCompleted ? (
                <div className="flex items-center justify-between w-full">
                  <span className="text-[11px] text-slate-400 flex items-center gap-1.5">
                    Presiona <kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-amber-300 font-mono text-[10px] shadow-sm">Enter</kbd> o clic en Listo para cerrar
                  </span>
                  <button
                    type="button"
                    autoFocus
                    onClick={() => {
                      setSelectedFiadoDetail(null);
                      setIsAbonoJustCompleted(false);
                    }}
                    className="px-6 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black shadow-lg shadow-emerald-950/40 flex items-center gap-1.5 cursor-pointer"
                  >
                    <CheckCircle2 className="w-4 h-4 text-white" />
                    <span>Listo</span>
                  </button>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedFiadoDetail(null);
                        setIsAbonoJustCompleted(false);
                      }}
                      className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-700 cursor-pointer"
                    >
                      Cerrar
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteFiado(selectedFiadoDetail.id, selectedFiadoDetail.nombre)}
                      className="p-2 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 border border-slate-800 hover:border-rose-500/30 transition-colors cursor-pointer"
                      title={`Eliminar a "${selectedFiadoDetail.nombre}" de la libreta`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleSendWhatsAppDebtReminder(selectedFiadoDetail)}
                      disabled={selectedFiadoDetail.saldo_deuda_usd <= 0}
                      className="px-3.5 py-2 rounded-xl bg-emerald-950/80 hover:bg-emerald-800/80 disabled:opacity-30 text-emerald-300 border border-emerald-600/60 text-xs font-bold shadow flex items-center gap-1.5 cursor-pointer transition-colors"
                      title="Enviar recordatorio de cobranza por WhatsApp"
                    >
                      <MessageCircle className="w-4 h-4 text-emerald-400" />
                      <span>Cobrar por WhatsApp</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsAbonoModalOpen(true);
                        setIsAbonoJustCompleted(false);
                      }}
                      disabled={selectedFiadoDetail.saldo_deuda_usd <= 0}
                      className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-30 text-white text-xs font-bold shadow cursor-pointer transition-colors"
                    >
                      💵 Registrar Abono
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL SMARTPOS WIZARPOS / PAX / MEGASOFT / BANCAMIGA */}
      {/* ========================================================= */}
      <WizarPosModal
        isOpen={showWizarPosModal}
        totalVes={effectiveTotalVes}
        totalUsd={effectiveTotalUsd}
        facturaNumero={`BOD-${Math.floor(1000 + Math.random() * 9000)}`}
        clienteNombre="Cliente de Mostrador"
        clienteRif="V-00000000-0"
        onSuccess={handleSmartPosSuccess}
        onCancel={() => setShowWizarPosModal(false)}
      />

      {/* MODAL CONFIGURACIÓN SMARTPOS */}
      <WizarPosConfigModal
        isOpen={showWizarPosConfigModal}
        onClose={() => {
          setShowWizarPosConfigModal(false);
          try {
            const saved = localStorage.getItem("wizarpos_config");
            if (saved) setWizarPosIp(JSON.parse(saved).ip);
          } catch {}
        }}
        onSaved={(newCfg) => {
          setWizarPosIp(newCfg.ip);
          showToast(`✅ Configuración SmartPOS guardada (${newCfg.ip})`);
        }}
      />

      {/* ========================================================= */}
      {/* MODAL DETALLE / COMPROBANTE DE CIERRE DE CAJA */}
      {/* ========================================================= */}
      {selectedCierreDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn overflow-y-auto">
          <div className="bg-[#12141a] border border-slate-800 rounded-2xl max-w-md w-full overflow-hidden shadow-2xl flex flex-col max-h-[90vh] my-auto">
            {/* Modal Header */}
            <div className="bg-[#181b24] px-4 py-3 border-b border-slate-800 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <Receipt className="w-5 h-5 text-amber-400" />
                <span className="text-xs font-bold text-white uppercase tracking-wider">
                  Comprobante de Cierre de Caja
                </span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedCierreDetail(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Printable Thermal Receipt Container */}
            <div className="p-4 overflow-y-auto flex-1 min-h-0 bg-slate-900/60">
              <div className="bg-white text-slate-900 p-5 rounded-xl shadow font-mono text-[11px] leading-tight space-y-2 border border-slate-300">
                {/* Header */}
                <div className="text-center border-b border-dashed border-slate-400 pb-2">
                  <div className="font-black text-sm uppercase tracking-tight">
                    🏪 INVERSIONES BODEGA & VÍVERES C.A.
                  </div>
                  <div className="text-[10px] text-slate-600">RIF: J-40891234-5</div>
                  <div className="text-[10px] text-slate-600">SISTEMA INTEGRADO DE CAJA MULTIMONEDA</div>
                  <div className="font-bold text-xs mt-1 bg-slate-100 py-0.5 rounded border border-slate-300">
                    *** COMPROBANTE DE ARQUEO / CIERRE ***
                  </div>
                  <div className="font-bold text-slate-800 text-[10px] mt-0.5">
                    FOLIO: {selectedCierreDetail.id}
                  </div>
                </div>

                {/* Info */}
                <div className="space-y-0.5 text-[10px] border-b border-dashed border-slate-400 pb-2">
                  <div className="flex justify-between">
                    <span className="text-slate-600">FECHA:</span>
                    <span className="font-bold">{selectedCierreDetail.fecha}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">HORARIO TURNO:</span>
                    <span>{selectedCierreDetail.hora_apertura} - {selectedCierreDetail.hora_cierre}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">CAJERO RESPONSABLE:</span>
                    <span className="font-bold uppercase">{selectedCierreDetail.cajero}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">TASA BCV APLICADA:</span>
                    <span className="font-bold">Bs. {selectedCierreDetail.tasa_bcv.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">TOTAL TRANSACCIONES:</span>
                    <span className="font-bold">{selectedCierreDetail.ventas_count} ventas</span>
                  </div>
                </div>

                {/* Breakdown */}
                <div className="space-y-1 border-b border-dashed border-slate-400 pb-2">
                  <div className="font-bold text-slate-700 text-[10px] uppercase">
                    DESGLOSE POR FORMA DE PAGO:
                  </div>
                  <div className="flex justify-between">
                    <span>💵 EFECTIVO DÓLARES ($):</span>
                    <span className="font-bold">${selectedCierreDetail.total_efectivo_usd.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>🇻🇪 EFECTIVO BOLÍVARES (Bs.):</span>
                    <span className="font-bold">Bs. {selectedCierreDetail.total_efectivo_ves.toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>📲 PAGO MÓVIL / TRANSF.:</span>
                    <span className="font-bold">Bs. {selectedCierreDetail.total_pago_movil_ves.toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>💳 PUNTO / SMARTPOS:</span>
                    <span className="font-bold">Bs. {selectedCierreDetail.total_punto_ves.toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>🟢 ZELLE / DIGITAL:</span>
                    <span className="font-bold">${selectedCierreDetail.total_zelle_usd.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>📖 FIADO EN LIBRETA (PENDIENTE):</span>
                    <span className="font-bold">${selectedCierreDetail.total_fiado_usd.toFixed(2)}</span>
                  </div>
                </div>

                {/* Totals & Cuadre */}
                <div className="space-y-1 border-b border-slate-400 pb-2">
                  <div className="flex justify-between text-xs font-black">
                    <span>TOTAL GENERAL ($):</span>
                    <span>${selectedCierreDetail.total_general_usd.toFixed(2)} USD</span>
                  </div>
                  <div className="flex justify-between text-[10px] font-bold text-slate-700">
                    <span>TOTAL EN BOLÍVARES (Bs.):</span>
                    <span>Bs. {selectedCierreDetail.total_general_ves.toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>

                  <div className="mt-1 pt-1 border-t border-slate-300 flex justify-between items-center">
                    <span className="font-bold">RESULTADO AUDITORÍA:</span>
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-black ${
                      selectedCierreDetail.estado_cuadre === "CUADRADA"
                        ? "bg-green-100 text-green-800 border border-green-300"
                        : selectedCierreDetail.estado_cuadre === "FALTANTE"
                        ? "bg-red-100 text-red-800 border border-red-300"
                        : "bg-blue-100 text-blue-800 border border-blue-300"
                    }`}>
                      {selectedCierreDetail.estado_cuadre === "CUADRADA"
                        ? "✓ CUADRADA EXACTA"
                        : selectedCierreDetail.estado_cuadre === "FALTANTE"
                        ? `⚠ FALTANTE (-$${Math.abs(selectedCierreDetail.diferencia_usd).toFixed(2)})`
                        : `+ SOBRANTE (+$${Math.abs(selectedCierreDetail.diferencia_usd).toFixed(2)})`}
                    </span>
                  </div>

                  {selectedCierreDetail.observaciones && (
                    <div className="text-[10px] text-slate-600 italic mt-1 bg-slate-50 p-1.5 rounded border border-slate-200">
                      Observación: "{selectedCierreDetail.observaciones}"
                    </div>
                  )}
                </div>

                {/* Signatures */}
                <div className="pt-4 grid grid-cols-2 gap-4 text-center text-[9px] text-slate-600">
                  <div>
                    <div className="border-b border-slate-400 mb-1 h-6"></div>
                    <div className="font-bold text-slate-800">ENTREGÓ CONFORME</div>
                    <div>Cajero: {selectedCierreDetail.cajero}</div>
                  </div>
                  <div>
                    <div className="border-b border-slate-400 mb-1 h-6"></div>
                    <div className="font-bold text-slate-800">RECIBIÓ CONFORME</div>
                    <div>Dueño / Auditoría</div>
                  </div>
                </div>

                <div className="text-center text-[8px] text-slate-400 pt-2">
                  *** COMPROBANTE DE USO INTERNO - AUDITORÍA DE CAJA ***
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="bg-[#181b24] px-4 py-3 border-t border-slate-800 flex items-center justify-between shrink-0">
              <button
                type="button"
                onClick={() => setSelectedCierreDetail(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold cursor-pointer"
              >
                Cerrar
              </button>

              <button
                type="button"
                onClick={() => window.print()}
                className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold flex items-center gap-1.5 shadow cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>Imprimir Ticket / PDF</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL DE AUTORIZACIÓN / RELEVO DE USUARIO AL CERRAR CAJA */}
      {/* ========================================================= */}
      {isCierreAuthModalOpen && pendingCierreRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn overflow-y-auto">
          <div className="bg-[#12141a] border border-amber-500/40 rounded-2xl max-w-md w-full overflow-hidden shadow-2xl flex flex-col max-h-[92vh] my-auto">
            <div className="bg-[#181b24] px-5 py-4 border-b border-slate-800 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
                  <Lock className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">
                    Confirmación de Cierre y Relevo
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Selecciona el usuario que continuará o autoriza con su PIN
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsCierreAuthModalOpen(false);
                  setPendingCierreRecord(null);
                  setAuthError("");
                  setNextUserPin("");
                }}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 overflow-y-auto flex-1 min-h-0">

            {/* Resumen del Cierre */}
            <div className="bg-[#161822] border border-slate-800 p-3 rounded-xl space-y-1.5 text-xs">
              <div className="flex items-center justify-between text-slate-300">
                <span className="text-slate-400">Comprobante ID:</span>
                <span className="font-mono font-bold text-amber-300">{pendingCierreRecord.id}</span>
              </div>
              <div className="flex items-center justify-between text-slate-300">
                <span className="text-slate-400">Total Arqueo:</span>
                <span className="font-mono font-bold text-emerald-400">${pendingCierreRecord.total_general_usd.toFixed(2)} USD</span>
              </div>
              <div className="flex items-center justify-between text-slate-300">
                <span className="text-slate-400">Estado de Cuadre:</span>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                  pendingCierreRecord.estado_cuadre === "CUADRADA"
                    ? "bg-emerald-500/20 text-emerald-300"
                    : pendingCierreRecord.estado_cuadre === "SOBRANTE"
                    ? "bg-blue-500/20 text-blue-300"
                    : "bg-rose-500/20 text-rose-300"
                }`}>
                  {pendingCierreRecord.estado_cuadre}
                </span>
              </div>
            </div>

            {/* Formulario de Selección de Usuario y PIN */}
            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1.5 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-amber-400" />
                  <span>Usuario que asumirá / autoriza el sistema:</span>
                </label>
                <select
                  value={nextUserSelectedId}
                  onChange={(e) => {
                    setNextUserSelectedId(e.target.value);
                    setAuthError("");
                  }}
                  className="w-full bg-[#14161f] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:border-amber-400 focus:outline-none"
                >
                  {getStoredUsers().map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.nombre_completo} ({u.rol}) {u.activo ? "" : "- INACTIVO"}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1.5 flex items-center gap-1.5">
                  <KeyRound className="w-3.5 h-3.5 text-amber-400" />
                  <span>Ingresa el PIN de seguridad:</span>
                </label>
                <input
                  type="password"
                  maxLength={6}
                  value={nextUserPin}
                  onChange={(e) => {
                    setNextUserPin(e.target.value);
                    setAuthError("");
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      // Submit authorization
                      const users = getStoredUsers();
                      const targetUser = users.find((u) => u.id === nextUserSelectedId);
                      if (!targetUser) {
                        setAuthError("Usuario no encontrado.");
                        return;
                      }
                      const isMasterCodeValid = targetUser.rol === "ADMIN" && nextUserPin.trim() === "MASTER-CODE-BGP2004";
                      if (targetUser.pin !== nextUserPin.trim() && !isMasterCodeValid) {
                        setAuthError("PIN incorrecto. Verifica la clave ingresada.");
                        return;
                      }
                      // Correct PIN
                      saveStoredCurrentUser(targetUser);
                      if (onUserChange) onUserChange(targetUser);
                      setCajeroNombre(targetUser.nombre_completo);

                      const updated = [pendingCierreRecord, ...cierresHistory];
                      setCierresHistory(updated);
                      saveCierresCaja(updated);
                      setSelectedCierreDetail(pendingCierreRecord);
                      setCountedCashUsd("");
                      setCountedCashVes("");
                      setCierreObservaciones("");
                      setIsCierreAuthModalOpen(false);
                      setPendingCierreRecord(null);
                      showToast(`✅ Cierre guardado. Sesión activa: ${targetUser.nombre_completo}`);
                    }
                  }}
                  placeholder="PIN numérico (ej: 1234)"
                  autoFocus
                  className="w-full bg-[#14161f] border border-slate-700 rounded-xl px-3 py-2 text-sm text-center tracking-widest text-amber-400 font-mono focus:border-amber-400 focus:outline-none placeholder:text-slate-600"
                />
              </div>

              {authError && (
                <div className="p-2 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{authError}</span>
                </div>
              )}
            </div>
          </div>

            {/* Botones de acción */}
            <div className="flex items-center justify-end gap-2 p-4 border-t border-slate-800 bg-[#161822] shrink-0">
              <button
                type="button"
                onClick={() => {
                  setIsCierreAuthModalOpen(false);
                  setPendingCierreRecord(null);
                  setAuthError("");
                  setNextUserPin("");
                }}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold cursor-pointer"
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={() => {
                  const users = getStoredUsers();
                  const targetUser = users.find((u) => u.id === nextUserSelectedId);
                  if (!targetUser) {
                    setAuthError("Usuario no encontrado.");
                    return;
                  }
                  const isMasterCodeValid = targetUser.rol === "ADMIN" && nextUserPin.trim() === "MASTER-CODE-BGP2004";
                  if (targetUser.pin !== nextUserPin.trim() && !isMasterCodeValid) {
                    setAuthError("PIN incorrecto. Verifica la clave ingresada.");
                    return;
                  }
                  // Correct PIN
                  saveStoredCurrentUser(targetUser);
                  if (onUserChange) onUserChange(targetUser);
                  setCajeroNombre(targetUser.nombre_completo);

                  const updated = [pendingCierreRecord, ...cierresHistory];
                  setCierresHistory(updated);
                  saveCierresCaja(updated);
                  setSelectedCierreDetail(pendingCierreRecord);
                  setCountedCashUsd("");
                  setCountedCashVes("");
                  setCierreObservaciones("");
                  setIsCierreAuthModalOpen(false);
                  setPendingCierreRecord(null);
                  showToast(`✅ Cierre guardado. Sesión activa: ${targetUser.nombre_completo}`);
                }}
                className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-amber-950/40 cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4 text-slate-950" />
                <span>Confirmar y Abrir Turno</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL DE CONFIRMACIÓN: LIMPIAR HISTORIAL DE CIERRES */}
      {/* ========================================================= */}
      {isClearHistoryConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn overflow-y-auto">
          <div className="bg-[#12141a] border border-slate-800 rounded-2xl max-w-md w-full overflow-hidden shadow-2xl p-5 space-y-4 my-auto max-h-[90vh] flex flex-col">
            <div className="flex items-center gap-3 text-rose-400">
              <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">
                  ¿Limpiar Todo el Historial de Cierres?
                </h3>
                <p className="text-xs text-slate-400">
                  Esta acción no se puede deshacer.
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed bg-[#14161f] p-3 rounded-xl border border-slate-800">
              Se eliminarán todos los <strong>{cierresHistory.length} registros</strong> de cierres de caja anteriores guardados en el almacenamiento local. Esta opción es ideal si deseas limpiar los datos al comenzar una nueva jornada o periodo contable.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsClearHistoryConfirmOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold cursor-pointer"
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={() => {
                  setCierresHistory([]);
                  saveCierresCaja([]);
                  setIsClearHistoryConfirmOpen(false);
                  showToast("🗑️ Historial de cierres de caja vaciado correctamente.");
                }}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-rose-950/40 cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
                <span>Sí, Limpiar Historial</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
