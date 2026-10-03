import React, { useState, useEffect } from "react";
import { Header } from "./components/Header";
import { InventoryView } from "./components/InventoryView";
import { PosView } from "./components/PosView";
import { MovementsView } from "./components/MovementsView";
import { SalesBookView } from "./components/SalesBookView";
import { BodegaEditionView } from "./components/BodegaEditionView";
import { GeminiInvoiceView } from "./components/GeminiInvoiceView";
import { DashboardView } from "./components/DashboardView";
import {
  Producto,
  Categoria,
  Movimiento,
  Venta,
  CartItem,
  FacturaExtraida,
  MetodoPagoFiscal,
  PosOperationalMode,
} from "./types";
import {
  getStoredProducts,
  saveProducts,
  getStoredCategories,
  getStoredMovements,
  saveMovements,
  getStoredSales,
  saveSales,
  getStoredBcvRate,
  saveBcvRate,
  getStoredBcvInfo,
  saveBcvInfo,
  getCorrelativosFiscales,
  advanceCorrelativosFiscales,
  calcularPMP,
  resetDatabaseToDefault,
  getStoredAppEdition,
  saveAppEdition,
  isFiscalEditionUnlocked,
  getRemoteLicense,
  saveRemoteLicense,
  checkClientLicenseStatus,
  renewClientSubscription,
  unlockFiscalEdition,
  getStoredPosOperationalMode,
  savePosOperationalMode,
  getStoredUsers,
  getStoredCurrentUser,
  saveStoredCurrentUser,
  getStoredTermsAcceptance,
  saveStoredTermsAcceptance,
  TermsAcceptanceRecord,
  getStoredNegocioConfig,
  saveStoredNegocioConfig,
  getStoredInitialSetupDone,
  saveStoredInitialSetupDone,
  parseFlexibleDate,
} from "./mockDb";
import { EditionSelectorModal } from "./components/EditionSelectorModal";
import { InitialPosModeModal } from "./components/InitialPosModeModal";
import { UserManagementModal } from "./components/UserManagementModal";
import { BackupRestoreModal } from "./components/BackupRestoreModal";
import { TermsAndPrivacyModal } from "./components/TermsAndPrivacyModal";
import { AppIconModal } from "./components/AppIconModal";
import { ClientConfigModal } from "./components/ClientConfigModal";
import { ClientUserManualModal } from "./components/ClientUserManualModal";
import { NodeJsSetupModal } from "./components/NodeJsSetupModal";
import { InitialSetupModal } from "./components/InitialSetupModal";
import { SubscriptionInfoModal } from "./components/SubscriptionInfoModal";
import { LicenseLockScreen } from "./components/LicenseLockScreen";
import { ExpirationWarningBanner } from "./components/ExpirationWarningBanner";
import { UserProfileLoginModal } from "./components/UserProfileLoginModal";
import { KeyboardShortcutsModal } from "./components/KeyboardShortcutsModal";
import { SystemLogsModal } from "./components/SystemLogsModal";
import { SystemUpdateModal } from "./components/SystemUpdateModal";
import { logger } from "./services/logger";
import { getBcvRates } from "./services/bcvService";
import {
  RemoteClientLicense,
  LicenseCheckResult,
  SystemUser,
  NegocioClienteConfig,
  ClienteDirectorio,
} from "./types";
import {
  Package,
  ShoppingBag,
  History as HistoryIcon,
  FileText,
  Sparkles,
  Store,
  TrendingUp,
  X,
  CheckCircle2,
} from "lucide-react";

export function App() {
  // Main view tabs: inventory | pos | bodega | sales_book | movements | dashboard | invoice_ai
  const [activeCtkTab, setActiveCtkTab] = useState<
    "dashboard" | "inventory" | "pos" | "bodega" | "sales_book" | "movements" | "invoice_ai"
  >("bodega");

  // SQLite data state
  const [products, setProducts] = useState<Producto[]>([]);
  const [categories, setCategories] = useState<Categoria[]>([]);
  const [movements, setMovements] = useState<Movimiento[]>([]);
  const [sales, setSales] = useState<Venta[]>([]);

  // Venezuelan Fiscal Variables: BCV Exchange Rate & Correlatives
  const [bcvRate, setBcvRate] = useState<number>(36.5);
  const [bcvEurRate, setBcvEurRate] = useState<number | null>(null);
  const [bcvSource, setBcvSource] = useState<string>("BCV Oficial Directo (bcv.org.ve)");
  const [bcvFechaValor, setBcvFechaValor] = useState<string>("");
  const [bcvUpdatedAt, setBcvUpdatedAt] = useState<string>("");
  const [isLoadingBcv, setIsLoadingBcv] = useState<boolean>(false);
  const [correlativos, setCorrelativos] = useState<{
    facturaNum: number;
    controlNum: number;
  }>({ facturaNum: 452, controlNum: 1890 });

  // Hybrid Mode state (True = simulated offline/no internet)
  const [isOfflineMode, setIsOfflineMode] = useState<boolean>(false);

  // Toast alert
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 3500);
  };

  const fetchLiveBcvRate = async (isManual = false) => {
    setIsLoadingBcv(true);
    try {
      const data = await getBcvRates();
      if (data && data.usd) {
        const rate = typeof data.usd === "number" ? data.usd : parseFloat(data.usd);
        if (!isNaN(rate) && rate > 0) {
          setBcvRate(rate);
          const eur = data.eur ? (typeof data.eur === "number" ? data.eur : parseFloat(data.eur as any)) : null;
          setBcvEurRate(eur);
          setBcvSource(data.source);
          setBcvFechaValor(data.fechaValor || "");
          setBcvUpdatedAt(data.updatedAt || new Date().toLocaleString());
          saveBcvInfo({
            rate,
            eur,
            source: data.source,
            fechaValor: data.fechaValor,
            updatedAt: data.updatedAt || new Date().toLocaleString(),
          });
          logger.info("Tasa BCV", `Cotización oficial BCV actualizada a Bs. ${rate.toFixed(2)} (Fuente: ${data.source || "BCV"})`);
          if (isManual) {
            showToast(
              `Cotización BCV actualizada: Bs. ${rate.toFixed(2)}${data.fechaValor ? ` (Valor: ${data.fechaValor})` : ""}`
            );
          }
        }
      }
    } catch (err: any) {
      console.warn("Fallo al obtener cotización oficial del BCV:", err);
      logger.warn("Tasa BCV", "Fallo al sincronizar tasa en vivo con BCV", err);
      if (isManual) {
        showToast(`Aviso: ${err?.message || "No se pudo sincronizar cotización en línea, se mantiene tasa en caché."}`);
      }
    } finally {
      setIsLoadingBcv(false);
    }
  };

  // Edition state (Method 1: Internal selector & stored config)
  const [appEdition, setAppEdition] = useState<"bodega" | "fiscal">("bodega");
  const [showEditionModal, setShowEditionModal] = useState<boolean>(false);
  const [isFirstRunModal, setIsFirstRunModal] = useState<boolean>(false);

  // Operational Mode (SmartPOS vs Solo Inventario & Total)
  const [posMode, setPosMode] = useState<PosOperationalMode>("inventory_only");
  const [showPosModeModal, setShowPosModeModal] = useState<boolean>(false);
  const [isFirstRunPosMode, setIsFirstRunPosMode] = useState<boolean>(false);

  // Subscription & Client License State
  const [clientLicense, setClientLicense] = useState<RemoteClientLicense>(getRemoteLicense());
  const [showNodeJsModal, setShowNodeJsModal] = useState<boolean>(false);

  // Security, Users & RBAC State
  const [currentUser, setCurrentUser] = useState<SystemUser>(() => getStoredCurrentUser());
  const [showUserModal, setShowUserModal] = useState<boolean>(false);
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);

  // Complete Database Backup / Restore State
  const [showBackupModal, setShowBackupModal] = useState<boolean>(false);

  // Legal, Terms and Conditions, and Privacy Policy State
  const [termsAcceptance, setTermsAcceptance] = useState<TermsAcceptanceRecord>(() => getStoredTermsAcceptance());
  const [showTermsModal, setShowTermsModal] = useState<boolean>(false);
  const [termsInitialTab, setTermsInitialTab] = useState<"terms" | "privacy" | "fiscal" | "certificate">("terms");

  // Official Program Icon Modal
  const [showIconModal, setShowIconModal] = useState<boolean>(false);

  // Initial Onboarding Setup & Subscription Info Modal States
  const [showInitialSetupModal, setShowInitialSetupModal] = useState<boolean>(false);
  const [showSubscriptionModal, setShowSubscriptionModal] = useState<boolean>(false);

  // Client Onboarding, Business Profile, Directory & User Manual State
  const [negocioConfig, setNegocioConfig] = useState<NegocioClienteConfig>(() => getStoredNegocioConfig());
  const [showClientConfigModal, setShowClientConfigModal] = useState<boolean>(false);
  const [showClientManualModal, setShowClientManualModal] = useState<boolean>(false);

  // Keyboard Shortcuts Modal State
  const [showKeyboardShortcutsModal, setShowKeyboardShortcutsModal] = useState<boolean>(false);

  // System Diagnostics & Logs Modal State
  const [showLogsModal, setShowLogsModal] = useState<boolean>(false);

  // System GitHub Updates Modal State
  const [showUpdateModal, setShowUpdateModal] = useState<boolean>(false);

  // Initialize Logger Global Handlers
  useEffect(() => {
    logger.initGlobalHandlers();
  }, []);

  // Sync Logger Context with Current User and Active Tab
  useEffect(() => {
    logger.setContext(currentUser?.username || "anonimo", activeCtkTab);
  }, [currentUser, activeCtkTab]);

  // Global Keyboard Shortcuts Listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInput = target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.tagName === "SELECT");

      // Escape: Close open modals
      if (e.key === "Escape") {
        setShowKeyboardShortcutsModal(false);
        setShowLogsModal(false);
        setShowUpdateModal(false);
        setShowUserModal(false);
        setShowBackupModal(false);
        setShowTermsModal(false);
        setShowClientConfigModal(false);
        setShowClientManualModal(false);
        setShowIconModal(false);
        setShowSubscriptionModal(false);
        setShowEditionModal(false);
        setShowPosModeModal(false);
        setShowNodeJsModal(false);
      }

      // F1 / Ctrl+F / Alt+F: Focus search product in catalog, mostrador, or billing
      if (e.key === "F1" || ((e.ctrlKey || e.altKey) && e.key.toLowerCase() === "f")) {
        e.preventDefault();
        const searchInput = document.querySelector<HTMLInputElement>(
          "#input-search-product, input[type='text'][placeholder*='Buscar'], input[type='text'][placeholder*='Escanear'], input[type='search']"
        );
        if (searchInput) {
          searchInput.focus();
          searchInput.select();
        }
      }

      // F2 / Alt+1: Go to Mostrador (Bodega)
      if (e.key === "F2" || (e.altKey && e.key === "1")) {
        e.preventDefault();
        setActiveCtkTab("bodega");
      }

      // F3 / Alt+2: Go to Product Catalog
      if (e.key === "F3" || (e.altKey && e.key === "2")) {
        e.preventDefault();
        setActiveCtkTab("inventory");
      }

      // F4 / Alt+3: Go to Dashboard
      if (e.key === "F4" || (e.altKey && e.key === "3")) {
        e.preventDefault();
        setActiveCtkTab("dashboard");
      }

      // F5 / Alt+4: Go to Sales Book
      if (e.key === "F5" || (e.altKey && e.key === "4")) {
        if (!e.ctrlKey) {
          e.preventDefault();
          setActiveCtkTab("sales_book");
        }
      }

      // F7 / Alt+H / Shift+?: Open Keyboard Shortcuts Guide
      if (e.key === "F7" || (e.altKey && e.key.toLowerCase() === "h") || (e.shiftKey && e.key === "?")) {
        if (!isInput || e.key === "F7") {
          e.preventDefault();
          setShowKeyboardShortcutsModal((prev) => !prev);
        }
      }

      // F8 / Alt+U: User Management
      if (e.key === "F8" || (e.altKey && e.key.toLowerCase() === "u")) {
        e.preventDefault();
        setShowUserModal(true);
      }

      // F9 / Alt+B: Backup & Restore Modal
      if (e.key === "F9" || (e.altKey && e.key.toLowerCase() === "b")) {
        e.preventDefault();
        setShowBackupModal(true);
      }

      // F10 / Alt+C: Facturar Venta / Open Pay Modal
      if (e.key === "F10" || (e.altKey && e.key.toLowerCase() === "c")) {
        e.preventDefault();
        const payBtn = document.querySelector<HTMLButtonElement>(
          "#btn-open-pay-modal, #btn-checkout-sale, button[id*='btn-pay']"
        );
        if (payBtn) {
          payBtn.click();
        }
      }

      // Alt+X: Vaciar Carrito
      if (e.altKey && e.key.toLowerCase() === "x") {
        e.preventDefault();
        const clearBtn = document.querySelector<HTMLButtonElement>("#btn-clear-cart");
        if (clearBtn) {
          clearBtn.click();
        }
      }

      // Alt+L / F11: Abrir Registro de Logs & Diagnóstico de Bugs
      if ((e.altKey && e.key.toLowerCase() === "l") || e.key === "F11") {
        e.preventDefault();
        setShowLogsModal((prev) => !prev);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleInitialSetupComplete = (
    newConfig: NegocioClienteConfig,
    edition: "bodega" | "fiscal",
    mode: PosOperationalMode
  ) => {
    setNegocioConfig(newConfig);
    setAppEdition(edition);
    setPosMode(mode);
    saveStoredInitialSetupDone(true);
    setIsLoggedIn(true);
    if (edition === "bodega") {
      setActiveCtkTab("bodega");
    } else {
      setActiveCtkTab("pos");
    }
    setClientLicense(getRemoteLicense());
  };

  const handleOpenTermsModal = (tab: "terms" | "privacy" | "fiscal" | "certificate" = "terms") => {
    setTermsInitialTab(tab);
    setShowTermsModal(true);
  };

  const handleAcceptTerms = (acceptedBy: string) => {
    const updated: TermsAcceptanceRecord = {
      accepted: true,
      acceptedAt: new Date().toISOString(),
      acceptedBy,
      version: "v2.4",
    };
    setTermsAcceptance(updated);
    saveStoredTermsAcceptance(updated);
    showToast("✅ Términos y Condiciones aceptados formalmente.");
  };

  // Dynamic Check of License
  const licenseCheck: LicenseCheckResult = checkClientLicenseStatus(clientLicense);

  const handleSelectUser = (user: SystemUser) => {
    setCurrentUser(user);
    saveStoredCurrentUser(user);
  };

  const handleRestoreComplete = () => {
    setProducts(getStoredProducts());
    setCategories(getStoredCategories());
    setMovements(getStoredMovements());
    setSales(getStoredSales());
    setCurrentUser(getStoredCurrentUser());
    const storedLic = getRemoteLicense();
    setClientLicense(storedLic);
    setBcvRate(getStoredBcvRate());
    setCorrelativos(getCorrelativosFiscales());
  };

  const handleUpdateLicenseState = (updated: RemoteClientLicense) => {
    setClientLicense(updated);
    saveRemoteLicense(updated);
  };

  const handleEmergencyUnlockLicense = (code: string): boolean => {
    const res = unlockFiscalEdition(code);
    if (res.success) {
      const updated = renewClientSubscription(30);
      setClientLicense(updated);
      showToast("¡Licencia desbloqueada y renovada por 30 días con Código Maestro!");
      return true;
    }
    return false;
  };

  const handleSimulatePaymentRenewal = () => {
    const updated = renewClientSubscription(30);
    setClientLicense(updated);
    showToast("¡Pago de mensualidad registrado! Sistema reactivado por 30 días.");
  };

  const handleRetryVerification = async (): Promise<{ success: boolean; message: string }> => {
    try {
      const res = await fetch(`/api/license/sync?clienteId=${encodeURIComponent(clientLicense.cliente_id)}`);
      if (res.ok) {
        const data = await res.json();
        if (data.found) {
          const isActivo = data.estado === "ACTIVO";
          const newExpDate = data.fechaVencimiento || clientLicense.fecha_vencimiento_actual;

          const now = new Date();
          const exp = parseFlexibleDate(newExpDate);
          const isExpired = !exp || exp.getTime() - now.getTime() < 0;

          const updated: RemoteClientLicense = {
            ...clientLicense,
            estado_remoto: data.estado,
            fecha_vencimiento_actual: newExpDate,
            nombre_negocio: data.nombreNegocio || clientLicense.nombre_negocio,
            cuota_mensual_usd: data.cuotaUsd || clientLicense.cuota_mensual_usd,
            motivo_bloqueo: data.motivo || "",
            ultimo_contacto_servidor: new Date().toISOString(),
          };

          setClientLicense(updated);
          saveRemoteLicense(updated);

          if (isActivo && !isExpired) {
            showToast(`¡Pago verificado en Google Sheets! Sistema reactivado para ${updated.nombre_negocio}.`);
            return {
              success: true,
              message: `¡Estado ACTIVO confirmado en Google Sheets! Fecha: ${newExpDate}. Desbloqueando...`,
            };
          } else if (data.estado === "SUSPENDIDO") {
            return {
              success: false,
              message: `El cliente ${data.clienteId} continúa en estado SUSPENDIDO. Si ya hizo el pago envié el comprobante.`,
            };
          } else if (isExpired) {
            return {
              success: false,
              message: `La fecha registrada (${newExpDate}) ya venció. Por favor extienda la fecha en Google Sheets.`,
            };
          }
        } else {
          return {
            success: false,
            message: `El ID '${clientLicense.cliente_id}' no fue encontrado en Google Sheets. Verifique la fila.`,
          };
        }
      }
    } catch (err: any) {
      console.warn("Fallo al verificar con Google Sheets:", err);
    }

    // Fallback: verificar estado local
    const reloaded = getRemoteLicense();
    const check = checkClientLicenseStatus(reloaded);
    if (!check.bloqueante) {
      setClientLicense(reloaded);
      showToast("¡Licencia validada exitosamente!");
      return { success: true, message: "¡Sistema validado y reactivado!" };
    }

    return {
      success: false,
      message: "Aún no se detecta la activación en Google Sheets. Asegúrese de guardar los cambios en la hoja.",
    };
  };

  // Load from local SQLite mock on mount & auto-sync live BCV
  useEffect(() => {
    // Check stored edition
    const { edition: savedEdition, isFirstRun: isFirstRunEdition } = getStoredAppEdition();
    setAppEdition(savedEdition);
    if (savedEdition === "bodega") {
      setActiveCtkTab("bodega");
    } else {
      setActiveCtkTab("pos");
    }

    // Check stored POS operational mode (SmartPOS vs Solo Inventario)
    const { mode: savedPosMode, isFirstRun: isFirstRunPos } = getStoredPosOperationalMode();
    setPosMode(savedPosMode);

    // Initial first-run setup check (Business details + Edition + POS Mode)
    const isInitialSetupDone = getStoredInitialSetupDone();
    if (!isInitialSetupDone || isFirstRunEdition) {
      setShowInitialSetupModal(true);
    } else if (isFirstRunPos) {
      setIsFirstRunPosMode(true);
      setShowPosModeModal(true);
    }

    setProducts(getStoredProducts());
    setCategories(getStoredCategories());
    setMovements(getStoredMovements());
    setSales(getStoredSales());

    const storedInfo = getStoredBcvInfo();
    if (storedInfo && storedInfo.rate > 0) {
      setBcvRate(storedInfo.rate);
      setBcvEurRate(storedInfo.eur);
      setBcvSource(storedInfo.source);
      setBcvFechaValor(storedInfo.fechaValor || "");
      setBcvUpdatedAt(storedInfo.updatedAt);
    } else {
      setBcvRate(getStoredBcvRate());
    }
    setCorrelativos(getCorrelativosFiscales());

    // Obtener cotización oficial en vivo de inmediato
    fetchLiveBcvRate(false);

    // Sincronización automática de licencia con Google Sheets al iniciar
    const silentSyncLicense = async () => {
      try {
        const storedLic = getRemoteLicense();
        const res = await fetch(`/api/license/sync?clienteId=${encodeURIComponent(storedLic.cliente_id)}`);
        if (res.ok) {
          const data = await res.json();
          if (data.found) {
            const updated: RemoteClientLicense = {
              ...storedLic,
              estado_remoto: data.estado || storedLic.estado_remoto,
              fecha_vencimiento_actual: data.fechaVencimiento || storedLic.fecha_vencimiento_actual,
              nombre_negocio: data.nombreNegocio || storedLic.nombre_negocio,
              cuota_mensual_usd: data.cuotaUsd || storedLic.cuota_mensual_usd,
              edicion_contratada: data.edicion || storedLic.edicion_contratada,
              motivo_bloqueo: data.motivo || "",
              ultimo_contacto_servidor: new Date().toISOString(),
            };
            setClientLicense(updated);
            saveRemoteLicense(updated);
            if (data.edicion && (data.edicion === "bodega" || data.edicion === "fiscal")) {
              setAppEdition(data.edicion);
              saveAppEdition(data.edicion);
            }
          }
        }
      } catch (err) {
        console.warn("Silent license sync error on startup:", err);
      }
    };
    silentSyncLicense();
  }, []);

  // Sync back to LocalStorage
  const updateProductsState = (newProducts: Producto[]) => {
    setProducts(newProducts);
    saveProducts(newProducts);
  };

  const updateMovementsState = (newMovements: Movimiento[]) => {
    setMovements(newMovements);
    saveMovements(newMovements);
  };

  const updateSalesState = (newSales: Venta[]) => {
    setSales(newSales);
    saveSales(newSales);
  };

  const handleUpdateBcvRate = (newRate: number) => {
    setBcvRate(newRate);
    saveBcvRate(newRate);
    setBcvSource("Ajuste Manual Local");
    const nowStr = new Date().toLocaleString();
    setBcvUpdatedAt(nowStr);
    saveBcvInfo({
      rate: newRate,
      eur: bcvEurRate,
      source: "Ajuste Manual Local",
      updatedAt: nowStr,
    });
    showToast(`Tasa Oficial BCV actualizada a Bs. ${newRate.toFixed(2)} por USD.`);
  };

  // Inventory actions
  const handleAddProduct = (prodData: Omit<Producto, "id">) => {
    const nextId = products.length > 0 ? Math.max(...products.map((p) => p.id)) + 1 : 1;
    const initialCost = prodData.precio_costo;
    const newProd: Producto = {
      ...prodData,
      id: nextId,
      costo_promedio_ponderado: initialCost,
    };
    const updated = [newProd, ...products];
    updateProductsState(updated);

    // Record initial movement in Kardex (LISLR Art. 177)
    if (newProd.stock_actual > 0) {
      const now = new Date().toISOString().slice(0, 19).replace("T", " ");
      const newMov: Movimiento = {
        id: movements.length + 1,
        producto_id: nextId,
        producto_nombre: newProd.nombre,
        tipo: "ENTRADA",
        cantidad: newProd.stock_actual,
        costo_unitario: initialCost,
        costo_promedio_ponderado: initialCost,
        stock_resultante: newProd.stock_actual,
        motivo: "Inventario Inicial / Apertura",
        fecha: now,
        usuario: "Admin Fiscal",
      };
      updateMovementsState([newMov, ...movements]);
    }

    showToast(`Producto '${newProd.nombre}' registrado con éxito en SQLite.`);
  };

  const handleUpdateProduct = (prod: Producto) => {
    const updated = products.map((p) => (p.id === prod.id ? prod : p));
    updateProductsState(updated);
    showToast(`Producto '${prod.nombre}' actualizado.`);
  };

  const handleDeleteProduct = (id: number) => {
    const target = products.find((p) => p.id === id);
    const updated = products.filter((p) => p.id !== id);
    updateProductsState(updated);
    showToast(`Producto '${target?.nombre || id}' eliminado del inventario.`);
  };

  // Stock Adjustment strictly enforcing Venezuelan LISLR Art. 177:
  // 1. Method: Costo Promedio Ponderado (PMP)
  // 2. Prohibition of negative stock
  const handleQuickStockAdjustment = (
    prodId: number,
    tipo: "ENTRADA" | "SALIDA" | "AJUSTE",
    cantidad: number,
    motivo: string,
    costoCompra?: number
  ) => {
    const target = products.find((p) => p.id === prodId);
    if (!target) return;

    const currentPmp = target.costo_promedio_ponderado || target.precio_costo;
    let newStock = target.stock_actual;
    let newPmp = currentPmp;
    let movementCost = currentPmp;

    if (tipo === "ENTRADA") {
      const compraUnit = costoCompra !== undefined && costoCompra > 0 ? costoCompra : target.precio_costo;
      movementCost = compraUnit;
      newPmp = calcularPMP(target.stock_actual, currentPmp, cantidad, compraUnit);
      newStock = target.stock_actual + cantidad;
    } else if (tipo === "SALIDA") {
      // Regla de Oro Art. 177 LISLR: Prohibición expresa de existencias negativas
      if (cantidad > target.stock_actual) {
        showToast(
          `❌ Infracción Art. 177 LISLR: No se puede egresar ${cantidad} ${target.unidad_medida}. Stock disponible: ${target.stock_actual}.`
        );
        return;
      }
      newStock = target.stock_actual - cantidad;
      // En salidas, el PMP no se modifica
      newPmp = currentPmp;
      movementCost = currentPmp;
    } else if (tipo === "AJUSTE") {
      if (cantidad < 0) {
        showToast("❌ El saldo resultante no puede ser negativo según la normativa fiscal.");
        return;
      }
      newStock = cantidad;
      newPmp = currentPmp;
      movementCost = currentPmp;
    }

    const updatedProducts = products.map((p) =>
      p.id === prodId
        ? {
            ...p,
            stock_actual: newStock,
            costo_promedio_ponderado: newPmp,
            precio_costo: newPmp,
          }
        : p
    );
    updateProductsState(updatedProducts);

    const now = new Date().toISOString().slice(0, 19).replace("T", " ");
    const newMov: Movimiento = {
      id: movements.length + 1,
      producto_id: prodId,
      producto_nombre: target.nombre,
      tipo,
      cantidad,
      costo_unitario: movementCost,
      costo_promedio_ponderado: newPmp,
      stock_resultante: newStock,
      motivo,
      fecha: now,
      usuario: "Admin Fiscal",
    };
    updateMovementsState([newMov, ...movements]);

    showToast(
      `Movimiento de ${tipo} registrado en Kardex. Nuevo stock: ${newStock} (PMP: $${newPmp.toFixed(2)}).`
    );
  };

  const handleBodegaStockUpdate = (productId: number, newStock: number) => {
    const updated = products.map((p) =>
      p.id === productId ? { ...p, stock_actual: Math.max(0, newStock) } : p
    );
    updateProductsState(updated);
  };

  // POS Complete Sale with Venezuelan Fiscal Rules (Providencia SNAT/00071 & IGTF 3%)
  const handleCompleteSale = (
    items: CartItem[],
    metodo: MetodoPagoFiscal,
    monto_pagado: number,
    cambio: number,
    clienteRif: string,
    clienteNombre: string,
    clienteDireccion: string,
    numeroFactura: string,
    numeroControl: string,
    aplicaIgtfCustom?: boolean,
    posMetadata?: { referencia?: string; lote?: string; aprobacion?: string; terminal?: string }
  ): Venta => {
    // 1. Verificación obligatoria contra saldos negativos (LISLR Art. 177)
    for (const it of items) {
      const p = products.find((prod) => prod.id === it.producto.id);
      if (!p || it.cantidad > p.stock_actual) {
        showToast(
          `❌ ERROR FISCAL BLOQUEANTE (Art. 177): Stock insuficiente para '${it.producto.nombre}'.`
        );
        throw new Error(`Stock insuficiente para ${it.producto.nombre}`);
      }
    }

    // 2. Desglose Tributario Dual USD y VES
    let baseExentaUsd = 0;
    let baseImponibleUsd = 0;

    items.forEach((it) => {
      if (it.alicuota_iva === 0) {
        baseExentaUsd += it.subtotal;
      } else {
        baseImponibleUsd += it.subtotal;
      }
    });

    const ivaUsd = Math.round(baseImponibleUsd * 0.16 * 100) / 100;
    const subtotalConIvaUsd = baseExentaUsd + baseImponibleUsd + ivaUsd;

    // IGTF 3% si el usuario seleccionó aplicarlo (o por defecto si el pago es en divisas o criptoactivos)
    const aplicaIgtf =
      aplicaIgtfCustom !== undefined
        ? aplicaIgtfCustom
        : metodo === "Divisas en Efectivo" || metodo === "Criptoactivos";
    const igtfUsd = aplicaIgtf ? Math.round(subtotalConIvaUsd * 0.03 * 100) / 100 : 0;
    const totalUsd = Math.round((subtotalConIvaUsd + igtfUsd) * 100) / 100;

    // Conversión a Bolívares (VES) a Tasa Oficial BCV
    const baseExentaVes = Math.round(baseExentaUsd * bcvRate * 100) / 100;
    const baseImponibleVes = Math.round(baseImponibleUsd * bcvRate * 100) / 100;
    const ivaVes = Math.round(ivaUsd * bcvRate * 100) / 100;
    const igtfVes = Math.round(igtfUsd * bcvRate * 100) / 100;
    const totalVes = Math.round(totalUsd * bcvRate * 100) / 100;

    const now = new Date();
    const dateStr = now.toISOString().slice(0, 19).replace("T", " ");

    const newSale: Venta = {
      id: sales.length + 1,
      numero_factura: numeroFactura,
      numero_control: numeroControl,
      folio_ticket: numeroFactura,
      fecha_hora: dateStr,
      fecha: dateStr,
      cliente_rif: clienteRif,
      cliente_nombre: clienteNombre,
      cliente_direccion: clienteDireccion,
      base_exenta_usd: baseExentaUsd,
      base_imponible_usd: baseImponibleUsd,
      iva_usd: ivaUsd,
      igtf_usd: igtfUsd,
      total_usd: totalUsd,
      total: totalUsd,
      tasa_bcv: bcvRate,
      base_exenta_ves: baseExentaVes,
      base_imponible_ves: baseImponibleVes,
      iva_ves: ivaVes,
      igtf_ves: igtfVes,
      total_ves: totalVes,
      aplica_igtf: aplicaIgtf,
      metodo_pago: metodo,
      moneda_pago: metodo === "Divisas en Efectivo" || metodo === "Criptoactivos" ? "USD" : "VES",
      monto_pagado,
      cambio,
      usuario: "Caja 1 Fiscal",
      pos_referencia: posMetadata?.referencia,
      pos_lote: posMetadata?.lote,
      pos_aprobacion: posMetadata?.aprobacion,
      pos_terminal: posMetadata?.terminal,
      items: items.map((it) => ({
        producto_id: it.producto.id,
        nombre: it.producto.nombre,
        cantidad: it.cantidad,
        precio_unitario: it.precio_unitario,
        subtotal: it.subtotal,
        alicuota_iva: it.alicuota_iva,
        es_exento: it.alicuota_iva === 0,
        iva_monto_ves: Math.round(it.subtotal * (it.alicuota_iva / 100) * bcvRate * 100) / 100,
      })),
    };

    // 3. Descontar inventario en tabla de productos y asentar en Kardex
    const productSoldMap = new Map<number, number>();
    items.forEach((it) => {
      productSoldMap.set(it.producto.id, it.cantidad);
    });

    const updatedProducts = products.map((p) => {
      const soldQty = productSoldMap.get(p.id);
      if (soldQty) {
        return { ...p, stock_actual: Math.max(0, p.stock_actual - soldQty) };
      }
      return p;
    });

    // 4. Registrar movimientos de SALIDA por venta en Kardex (LISLR Art. 177)
    const newKardexItems: Movimiento[] = items.map((it, idx) => {
      const p = products.find((prod) => prod.id === it.producto.id);
      const currentPmp = p?.costo_promedio_ponderado || p?.precio_costo || 0;
      const resultingStock = (p?.stock_actual || 0) - it.cantidad;

      return {
        id: movements.length + idx + 1,
        producto_id: it.producto.id,
        producto_nombre: it.producto.nombre,
        tipo: "SALIDA",
        cantidad: it.cantidad,
        costo_unitario: currentPmp,
        costo_promedio_ponderado: currentPmp,
        stock_resultante: resultingStock,
        motivo: `Factura Fiscal N° ${numeroFactura} (${clienteNombre})`,
        fecha: dateStr,
        usuario: "Caja 1",
        referencia_factura: numeroFactura,
      };
    });

    // Avanzar correlativo oficial
    const nextCorr = advanceCorrelativosFiscales();
    setCorrelativos(nextCorr);

    updateProductsState(updatedProducts);
    updateMovementsState([...newKardexItems, ...movements]);
    updateSalesState([newSale, ...sales]);

    logger.info("Facturación Fiscal", `Factura N° ${numeroFactura} emitida a ${clienteNombre} (${metodo}) por $${totalUsd.toFixed(2)} USD (Bs. ${totalVes.toFixed(2)})`, {
      factura: numeroFactura,
      control: numeroControl,
      cliente: clienteNombre,
      rif: clienteRif,
      metodo,
      items: items.length,
      totalUsd,
      totalVes,
      tasaBcv: bcvRate,
    });

    showToast(
      `Factura Fiscal N° ${numeroFactura} procesada exitosamente (Total: Bs. ${totalVes.toFixed(2)} / $${totalUsd.toFixed(2)}).`
    );
    return newSale;
  };

  // Import items extracted by Gemini AI from invoice (Purchase entry recalculating PMP)
  const handleImportInvoiceItems = (data: FacturaExtraida) => {
    let currentProducts = [...products];
    const now = new Date().toISOString().slice(0, 19).replace("T", " ");
    const newKardex: Movimiento[] = [];

    data.items.forEach((it) => {
      // Buscar producto existente por código de barras o nombre
      const existingIdx = currentProducts.findIndex(
        (p) =>
          (it.codigo_barras && p.codigo_barras === it.codigo_barras) ||
          p.nombre.toLowerCase().trim() === it.nombre.toLowerCase().trim()
      );

      let affectedId = 0;
      let affectedName = it.nombre;
      let resultingStock = it.cantidad;
      let finalPmp = it.precio_costo;

      if (existingIdx >= 0) {
        // Actualizar stock y PMP (LISLR Art. 177)
        const prev = currentProducts[existingIdx];
        affectedId = prev.id;
        affectedName = prev.nombre;
        const currentPmp = prev.costo_promedio_ponderado || prev.precio_costo;
        finalPmp = calcularPMP(prev.stock_actual, currentPmp, it.cantidad, it.precio_costo);
        resultingStock = prev.stock_actual + it.cantidad;

        currentProducts[existingIdx] = {
          ...prev,
          stock_actual: resultingStock,
          costo_promedio_ponderado: finalPmp,
          precio_costo: finalPmp,
          precio_venta: it.precio_venta > 0 ? it.precio_venta : prev.precio_venta,
        };
      } else {
        // Crear nuevo producto fiscal
        const nextId =
          currentProducts.length > 0 ? Math.max(...currentProducts.map((p) => p.id)) + 1 : 1;
        affectedId = nextId;

        const cat =
          categories.find((c) => c.nombre.toLowerCase() === (it.categoria || "").toLowerCase()) ||
          categories[0];

        const newProd: Producto = {
          id: nextId,
          codigo_barras:
            it.codigo_barras || `759${Math.floor(100000000 + Math.random() * 900000000)}`,
          nombre: it.nombre,
          categoria_id: cat.id,
          categoria_nombre: cat.nombre,
          precio_costo: it.precio_costo,
          costo_promedio: it.precio_costo,
          costo_promedio_ponderado: it.precio_costo,
          precio_venta: it.precio_venta > 0 ? it.precio_venta : it.precio_costo * 1.35,
          stock_actual: it.cantidad,
          stock_minimo: 5,
          alicuota_iva: 16,
          unidad_medida: it.unidad_medida || "Pza",
          fecha_registro: now,
        };
        currentProducts = [newProd, ...currentProducts];
      }

      // Asentar en Kardex con costo unitario y PMP resultante
      newKardex.push({
        id: movements.length + newKardex.length + 1,
        producto_id: affectedId,
        producto_nombre: affectedName,
        tipo: "ENTRADA",
        cantidad: it.cantidad,
        costo_unitario: it.precio_costo,
        costo_promedio_ponderado: finalPmp,
        stock_resultante: resultingStock,
        motivo: `Factura Compra ${data.proveedor} #${data.numero_factura}`,
        fecha: now,
        usuario: "Gemini AI",
        referencia_factura: data.numero_factura,
      });
    });

    updateProductsState(currentProducts);
    updateMovementsState([...newKardex, ...movements]);

    showToast(
      `Se importaron ${data.items.length} artículos de la factura #${data.numero_factura}. PMP actualizado según Art. 177 LISLR.`
    );
    setActiveCtkTab("inventory");
  };

  // Reset demo data
  const handleResetDatabase = () => {
    if (
      confirm(
        "¿Desea restablecer todos los productos, tasas y movimientos al estado inicial adaptado a Venezuela?"
      )
    ) {
      resetDatabaseToDefault();
      setProducts(getStoredProducts());
      setCategories(getStoredCategories());
      setMovements(getStoredMovements());
      setSales([]);
      setBcvRate(getStoredBcvRate());
      setCorrelativos(getCorrelativosFiscales());
      showToast("Base de datos SQLite restablecida a valores iniciales fiscales.");
    }
  };

  // Handle switching edition from modal
  const handleSelectEdition = (edition: "bodega" | "fiscal") => {
    if (edition === "fiscal" && !isFiscalEditionUnlocked()) {
      showToast("🔒 Se requiere ingresar el código 'FISCAL-ADMIN-2552' para habilitar la Edición Fiscal SENIAT.");
      setShowEditionModal(true);
      return;
    }

    setAppEdition(edition);
    saveAppEdition(edition);
    setShowEditionModal(false);
    setIsFirstRunModal(false);

    if (edition === "bodega") {
      setActiveCtkTab("bodega");
      showToast("🏪 Edición Bodega y Mostrador activada.");
    } else {
      setActiveCtkTab("pos");
      showToast("🏢 Edición Fiscal SENIAT activada.");
    }

    // Si es primera vez o aún no se ha configurado el modo de datáfono vs solo inventario, mostrar el modal de modo operativo
    const { isFirstRun: isFirstRunPos } = getStoredPosOperationalMode();
    if (isFirstRunPos) {
      setIsFirstRunPosMode(true);
      setShowPosModeModal(true);
    }
  };

  // Handle selecting POS Operational Mode (SmartPOS vs Solo Inventario & Total)
  const handleSelectPosMode = (mode: PosOperationalMode) => {
    setPosMode(mode);
    savePosOperationalMode(mode);
    setShowPosModeModal(false);
    setIsFirstRunPosMode(false);
    showToast(
      mode === "inventory_only"
        ? "🛒 Modo 'Solo Inventario & Total' activo. ¡Listo para totalizar y descontar existencias!"
        : "📲 Modo 'SmartPOS Integrado' activo. ¡Listo para transacciones con terminal bancario!"
    );
  };

  return (
    <div className="min-h-screen bg-[#0c0e12] text-slate-100 flex flex-col font-sans selection:bg-blue-600 selection:text-white">
      {/* Top Header with BCV Rate Editor & Fiscal Badges */}
      <Header
        isOfflineMode={isOfflineMode}
        setIsOfflineMode={setIsOfflineMode}
        bcvRate={bcvRate}
        bcvEurRate={bcvEurRate}
        bcvSource={bcvSource}
        bcvFechaValor={bcvFechaValor}
        bcvUpdatedAt={bcvUpdatedAt}
        isLoadingBcv={isLoadingBcv}
        onRefreshBcv={() => fetchLiveBcvRate(true)}
        onUpdateBcvRate={handleUpdateBcvRate}
        onResetDatabase={handleResetDatabase}
        currentEdition={appEdition}
        onOpenEditionSelector={() => {
          setIsFirstRunModal(false);
          setShowEditionModal(true);
        }}
        onOpenNodeJsGuide={() => setShowNodeJsModal(true)}
        posMode={posMode}
        onOpenPosModeSelector={() => {
          setIsFirstRunPosMode(false);
          setShowPosModeModal(true);
        }}
        currentUser={currentUser}
        onOpenUserManagement={() => setShowUserModal(true)}
        onOpenBackupModal={() => setShowBackupModal(true)}
        onOpenTermsModal={() => handleOpenTermsModal("terms")}
        onOpenIconModal={() => setShowIconModal(true)}
        onOpenClientConfig={() => setShowClientConfigModal(true)}
        onOpenClientManual={() => setShowClientManualModal(true)}
        onOpenSubscriptionModal={() => setShowSubscriptionModal(true)}
        onOpenLoginModal={() => setIsLoggedIn(false)}
        onOpenKeyboardShortcuts={() => setShowKeyboardShortcutsModal(true)}
        onOpenLogsModal={() => setShowLogsModal(true)}
        onOpenUpdateModal={() => setShowUpdateModal(true)}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 lg:p-6">
        {/* Banner de Aviso de Próximo Vencimiento */}
        <ExpirationWarningBanner
          license={clientLicense}
          checkResult={licenseCheck}
          bcvRate={bcvRate}
        />

        {/* Toast Alert */}
        {toastMessage && (
          <div className="fixed bottom-6 right-6 z-50 bg-blue-600 text-white px-4 py-3 rounded-xl shadow-2xl flex items-center gap-2.5 text-xs font-semibold animate-in fade-in slide-in-from-bottom-3 duration-200 border border-blue-400/40">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-blue-200" />
            <span>{toastMessage}</span>
          </div>
        )}

        {/* Punto de Venta & Sistema de Inventario para Clientes */}
        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-800 bg-[#161920] shadow-2xl overflow-hidden">
            {/* Main Application Tab Bar */}
            <div className="bg-[#14161c] px-4 pt-3 pb-2 border-b border-slate-800 flex items-center justify-between gap-2 overflow-x-auto">
              <div className="flex items-center gap-2">
                {/* Pestaña Exclusiva de Edición Bodega */}
                {appEdition === "bodega" && (
                  <button
                    id="tab-bodega"
                    onClick={() => setActiveCtkTab("bodega")}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-extrabold transition-all border ${
                      activeCtkTab === "bodega"
                        ? "bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 border-amber-400 shadow-lg shadow-amber-950/40"
                        : "bg-[#1d2028] text-amber-300 hover:text-amber-200 hover:bg-slate-800 border-amber-500/30"
                    }`}
                  >
                    <Store className="w-3.5 h-3.5" />
                    <span>🏪 Mostrador</span>
                  </button>
                )}

                  {/* Pestañas de Edición Fiscal SENIAT */}
                  {appEdition === "fiscal" && (
                    <>
                      <button
                        id="tab-pos"
                        onClick={() => setActiveCtkTab("pos")}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                          activeCtkTab === "pos"
                            ? "bg-blue-600 text-white shadow-md shadow-blue-900/40"
                            : "bg-[#1d2028] text-slate-400 hover:text-white hover:bg-slate-800"
                        }`}
                      >
                        <ShoppingBag className="w-3.5 h-3.5" />
                        <span>Punto de Venta Fiscal (Prov. 00071)</span>
                      </button>

                      <button
                        id="tab-movements"
                        onClick={() => setActiveCtkTab("movements")}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                          activeCtkTab === "movements"
                            ? "bg-blue-600 text-white shadow-md shadow-blue-900/40"
                            : "bg-[#1d2028] text-slate-400 hover:text-white hover:bg-slate-800"
                        }`}
                      >
                        <HistoryIcon className="w-3.5 h-3.5" />
                        <span>Kardex Tributario (Art. 177)</span>
                      </button>
                    </>
                  )}

                  {/* Pestaña: Libro de Ventas (disponible en ambas ediciones) */}
                  <button
                    id="tab-sales-book"
                    onClick={() => setActiveCtkTab("sales_book")}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                      activeCtkTab === "sales_book"
                        ? appEdition === "bodega"
                          ? "bg-amber-500 text-slate-950 font-bold shadow-md shadow-amber-950/40"
                          : "bg-blue-600 text-white shadow-md shadow-blue-900/40"
                        : "bg-[#1d2028] text-slate-400 hover:text-white hover:bg-slate-800"
                    }`}
                  >
                    <FileText className={`w-3.5 h-3.5 ${appEdition === "bodega" ? "text-amber-400" : "text-emerald-400"}`} />
                    <span>Libro de Ventas</span>
                    {sales.length > 0 && (
                      <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                        appEdition === "bodega"
                          ? activeCtkTab === "sales_book" ? "bg-slate-950 text-amber-300" : "bg-amber-500/20 text-amber-300"
                          : activeCtkTab === "sales_book" ? "bg-slate-900 text-emerald-300" : "bg-emerald-500/20 text-emerald-300"
                      }`}>
                        {sales.length}
                      </span>
                    )}
                  </button>

                  {/* Pestañas compartidas en ambas ediciones */}
                  <button
                    id="tab-inventory"
                    onClick={() => setActiveCtkTab("inventory")}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                      activeCtkTab === "inventory"
                        ? appEdition === "bodega"
                          ? "bg-amber-500 text-slate-950 font-bold shadow-md shadow-amber-950/40"
                          : "bg-blue-600 text-white shadow-md shadow-blue-900/40"
                        : "bg-[#1d2028] text-slate-400 hover:text-white hover:bg-slate-800"
                    }`}
                  >
                    <Package className="w-3.5 h-3.5" />
                    <span>Catálogo de Productos ({products.length})</span>
                  </button>

                  {/* Pestaña: Dashboard Analítico (después de Catálogo de Productos) */}
                  <button
                    id="tab-dashboard"
                    onClick={() => setActiveCtkTab("dashboard")}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-extrabold transition-all border ${
                      activeCtkTab === "dashboard"
                        ? appEdition === "bodega"
                          ? "bg-amber-500 text-slate-950 font-bold border-amber-400 shadow-md shadow-amber-950/40"
                          : "bg-gradient-to-r from-blue-600 to-indigo-600 text-white border-blue-400 shadow-lg shadow-blue-950/50"
                        : "bg-[#1d2028] text-blue-300 hover:text-white hover:bg-slate-800 border-blue-500/30"
                    }`}
                  >
                    <TrendingUp className="w-3.5 h-3.5" />
                    <span>📊 Dashboard</span>
                  </button>

                  <button
                    id="tab-invoice-ai"
                    onClick={() => setActiveCtkTab("invoice_ai")}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                      activeCtkTab === "invoice_ai"
                        ? appEdition === "bodega"
                          ? "bg-amber-500 text-slate-950 font-bold shadow-md shadow-amber-950/40"
                          : "bg-blue-600 text-white shadow-md shadow-blue-900/40"
                        : "bg-[#1d2028] text-slate-400 hover:text-white hover:bg-slate-800"
                    }`}
                  >
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    <span>Facturas de Proveedor (IA)</span>
                  </button>
                </div>

                {/* Badge indicador del modo activo en la barra de pestañas */}
                <button
                  onClick={() => setShowEditionModal(true)}
                  className={`shrink-0 flex items-center gap-1.5 px-3 py-1 rounded-lg text-[11px] font-mono font-bold border transition-colors ${
                    appEdition === "bodega"
                      ? "bg-amber-950/40 text-amber-300 border-amber-500/40 hover:bg-amber-900/40"
                      : "bg-blue-950/40 text-blue-300 border-blue-500/40 hover:bg-blue-900/40"
                  }`}
                  title="Clic para cambiar de edición"
                >
                  {appEdition === "bodega" ? (
                    <>
                      <Store className="w-3 h-3 text-amber-400" />
                      <span>Modo Bodega</span>
                    </>
                  ) : (
                    <>
                      <FileText className="w-3 h-3 text-blue-400" />
                      <span>Modo Fiscal</span>
                    </>
                  )}
                  <span className="text-[9px] underline ml-1 text-slate-400">cambiar</span>
                </button>
              </div>
            </div>

            {/* Inner Body */}
              <div className="p-4 lg:p-6 bg-[#16181f]">
                {activeCtkTab === "dashboard" && (
                  <DashboardView
                    sales={sales}
                    products={products}
                    bcvRate={bcvRate}
                    currentUser={currentUser}
                  />
                )}

                {activeCtkTab === "bodega" && (
                  <BodegaEditionView
                    products={products}
                    bcvRate={bcvRate}
                    onUpdateProductStock={handleBodegaStockUpdate}
                    onRecordSale={(sale) => updateSalesState([sale, ...sales])}
                    showToast={showToast}
                    posMode={posMode}
                    onTogglePosMode={handleSelectPosMode}
                    currentUser={currentUser}
                    onUserChange={(newUser) => setCurrentUser(newUser)}
                  />
                )}

                {activeCtkTab === "inventory" && (
                  <InventoryView
                    products={products}
                    categories={categories}
                    bcvRate={bcvRate}
                    onAddProduct={handleAddProduct}
                    onUpdateProduct={handleUpdateProduct}
                    onDeleteProduct={handleDeleteProduct}
                    onQuickStockAdjustment={handleQuickStockAdjustment}
                    currentUser={currentUser}
                  />
                )}

                {activeCtkTab === "pos" && (
                  <PosView
                    products={products}
                    bcvRate={bcvRate}
                    correlativos={correlativos}
                    onCompleteSale={handleCompleteSale}
                    posMode={posMode}
                    onTogglePosMode={handleSelectPosMode}
                  />
                )}

                {activeCtkTab === "sales_book" && (
                  <SalesBookView
                    sales={sales}
                    bcvRate={bcvRate}
                    onClearSales={() => updateSalesState([])}
                    showToast={showToast}
                    currentUser={currentUser}
                  />
                )}

                {activeCtkTab === "movements" && (
                  <MovementsView
                    movements={movements}
                    products={products}
                    bcvRate={bcvRate}
                    onAddManualMovement={handleQuickStockAdjustment}
                  />
                )}

                {activeCtkTab === "invoice_ai" && (
                  <GeminiInvoiceView
                    isOfflineMode={isOfflineMode}
                    onImportInvoiceItems={handleImportInvoiceItems}
                    showToast={showToast}
                  />
                )}
              </div>

              {/* Status Bar (Windows Bottom Bar) */}
              <div className="bg-[#12141a] px-4 py-2 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400 font-mono">
                <div className="flex items-center gap-3 flex-wrap">
                  <span>
                    Servidor: <strong className="text-emerald-400">Node.js (Puerto 3000)</strong>
                  </span>
                  <span>•</span>
                  <span>
                    Tasa Oficial BCV:{" "}
                    <strong className="text-amber-400">Bs. {bcvRate.toFixed(2)}</strong>
                  </span>
                  <span>•</span>
                  <span>
                    Factura Correlativo:{" "}
                    <strong className="text-blue-400">
                      00-{correlativos.facturaNum.toString().padStart(6, "0")}
                    </strong>
                  </span>
                  <span>•</span>
                  <span>
                    Productos:{" "}
                    <strong className="text-emerald-400">{products.length}</strong>
                  </span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      isOfflineMode ? "bg-amber-400" : "bg-emerald-400 animate-pulse"
                    }`}
                  ></span>
                  <span>{isOfflineMode ? "Modo Local Offline" : "Gemini API Habilitada"}</span>
                </div>
              </div>
            </div>
        </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 bg-[#12141a] py-3.5 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-3">
          <p className="text-center md:text-left">
            Sistema POS y Facturación para Comercios en Venezuela (SENIAT / Providencia SNAT/00071 / LISLR Art. 177) • Node.js + Express & React
          </p>

          <div className="flex items-center gap-3 text-slate-400 font-medium shrink-0 flex-wrap justify-center text-[11px]">
            <button
              type="button"
              onClick={() => handleOpenTermsModal("terms")}
              className="hover:text-blue-400 underline transition-colors cursor-pointer"
            >
              Términos y Condiciones
            </button>
            <span>•</span>
            <button
              type="button"
              onClick={() => handleOpenTermsModal("privacy")}
              className="hover:text-indigo-400 underline transition-colors cursor-pointer"
            >
              Política de Privacidad
            </button>
            <span>•</span>
            <button
              type="button"
              onClick={() => handleOpenTermsModal("fiscal")}
              className="hover:text-emerald-400 underline transition-colors cursor-pointer"
            >
              Aviso Fiscal SENIAT
            </button>
            <span>•</span>
            <button
              type="button"
              onClick={() => handleOpenTermsModal("certificate")}
              className="hover:text-amber-400 font-bold underline transition-colors cursor-pointer"
            >
              Constancia Legal
            </button>
          </div>
        </div>
      </footer>

      {/* Selector de Edición / Asistente Inicial */}
      <EditionSelectorModal
        isOpen={showEditionModal}
        onClose={() => setShowEditionModal(false)}
        currentEdition={appEdition}
        onSelectEdition={handleSelectEdition}
        isFirstRun={isFirstRunModal}
      />

      {/* Asistente de Selección de Modo Operativo (SmartPOS vs Solo Inventario & Total) */}
      <InitialPosModeModal
        isOpen={showPosModeModal}
        onClose={() => setShowPosModeModal(false)}
        currentMode={posMode}
        onSelectMode={handleSelectPosMode}
        isFirstRun={isFirstRunPosMode}
      />

      {/* Modal de Instalación, Servidor y Ejecución con Node.js */}
      <NodeJsSetupModal
        isOpen={showNodeJsModal}
        onClose={() => setShowNodeJsModal(false)}
        showToast={showToast}
      />

      {/* Modal de Control de Usuarios, Seguridad & RBAC */}
      <UserManagementModal
        isOpen={showUserModal}
        onClose={() => setShowUserModal(false)}
        currentUser={currentUser}
        onSelectUser={handleSelectUser}
        showToast={showToast}
      />

      {/* Modal de Exportación & Importación de Base de Datos para Respaldo */}
      <BackupRestoreModal
        isOpen={showBackupModal}
        onClose={() => setShowBackupModal(false)}
        onRestoreComplete={handleRestoreComplete}
        showToast={showToast}
        onOpenPrivacyPolicy={() => handleOpenTermsModal("privacy")}
        currentUser={currentUser}
      />

      {/* Modal de Términos y Condiciones, Privacidad & Cumplimiento Legal SENIAT */}
      <TermsAndPrivacyModal
        isOpen={showTermsModal}
        onClose={() => setShowTermsModal(false)}
        initialTab={termsInitialTab}
        termsAcceptance={termsAcceptance}
        onAcceptTerms={handleAcceptTerms}
        license={clientLicense}
        currentUser={currentUser}
        showToast={showToast}
      />

      {/* Modal de Visualización & Descarga del Ícono Oficial del Programa */}
      <AppIconModal
        isOpen={showIconModal}
        onClose={() => setShowIconModal(false)}
        showToast={showToast}
      />

      {/* Modal de Datos del Negocio del Cliente (Para Tickets y Facturas) */}
      <ClientConfigModal
        isOpen={showClientConfigModal}
        onClose={() => setShowClientConfigModal(false)}
        onSaved={(cfg) => setNegocioConfig(cfg)}
        showToast={showToast}
        bcvRate={bcvRate}
      />

      {/* Manual de Operaciones y Guía del Cajero para el Cliente */}
      <ClientUserManualModal
        isOpen={showClientManualModal}
        onClose={() => setShowClientManualModal(false)}
        bcvRate={bcvRate}
      />

      {/* Modal de Configuración Inicial (Datos del Negocio + Selección de Versión en Primer Inicio) */}
      <InitialSetupModal
        isOpen={showInitialSetupModal}
        onClose={() => setShowInitialSetupModal(false)}
        initialConfig={negocioConfig}
        initialEdition={appEdition}
        initialPosMode={posMode}
        bcvRate={bcvRate}
        onComplete={handleInitialSetupComplete}
        showToast={showToast}
      />

      {/* Modal de Información de Suscripción & Días Restantes */}
      <SubscriptionInfoModal
        isOpen={showSubscriptionModal}
        onClose={() => setShowSubscriptionModal(false)}
        clientLicense={clientLicense}
        onUpdateLicense={handleUpdateLicenseState}
        showToast={showToast}
        currentEdition={appEdition}
        bcvRate={bcvRate}
      />

      {/* Pantalla de Inicio de Sesión y Selección de Perfil con PIN */}
      <UserProfileLoginModal
        isOpen={!isLoggedIn && !showInitialSetupModal}
        onLoginSuccess={(user) => {
          setCurrentUser(user);
          setIsLoggedIn(true);
          showToast(`¡Bienvenido/a al sistema, ${user.nombre_completo}!`);
        }}
        bcvRate={bcvRate}
      />

      {/* Pantalla de Bloqueo por Licencia Vencida o Suspendida */}
      {licenseCheck.bloqueante && (
        <LicenseLockScreen
          license={clientLicense}
          checkResult={licenseCheck}
          bcvRate={bcvRate}
          onSimulatePayment={handleSimulatePaymentRenewal}
          onRetryVerification={handleRetryVerification}
        />
      )}

      {/* Modal de Guía de Atajos de Teclado */}
      <KeyboardShortcutsModal
        isOpen={showKeyboardShortcutsModal}
        onClose={() => setShowKeyboardShortcutsModal(false)}
      />

      {/* Modal de Registro de Eventos, Logs & Diagnóstico de Bugs */}
      <SystemLogsModal
        isOpen={showLogsModal}
        onClose={() => setShowLogsModal(false)}
        showToast={showToast}
      />

      {/* Modal de Actualizaciones del Sistema vía GitHub (Node.js Local) */}
      <SystemUpdateModal
        isOpen={showUpdateModal}
        onClose={() => setShowUpdateModal(false)}
        showToast={showToast}
      />
    </div>
  );
}

export default App;
