import React, { useState, useEffect, Suspense } from "react";
import { Header } from "./components/Header";
import { InventoryView } from "./components/InventoryView";
import { PosView } from "./components/PosView";
import { BodegaEditionView } from "./components/BodegaEditionView";
import { SalesBookView } from "./components/SalesBookView";

const loadMovementsView = () =>
  import("./components/MovementsView").then((m) => ({ default: m.MovementsView }));
const loadGeminiInvoiceView = () =>
  import("./components/GeminiInvoiceView").then((m) => ({ default: m.GeminiInvoiceView }));
const loadDashboardView = () =>
  import("./components/DashboardView").then((m) => ({ default: m.DashboardView }));

const MovementsView = React.lazy(loadMovementsView);
const GeminiInvoiceView = React.lazy(loadGeminiInvoiceView);
const DashboardView = React.lazy(loadDashboardView);
import {
  Producto,
  Categoria,
  Movimiento,
  Venta,
  CartItem,
  FacturaExtraida,
  MetodoPagoFiscal,
  PosOperationalMode,
  PagoMixtoItem,
} from "./types";
import {
  getStoredProducts,
  saveProducts,
  getStoredCategories,
  saveCategories,
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
  revokeFiscalEdition,
  parseContractedEdition,
  isEditionAuthorizedByLicense,
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
import { testFirestoreConnection } from "./firebase";
import {
  fetchRemoteLicenseFromFirestore,
  saveLicenseToFirestore,
} from "./services/licenseService";
import { APP_VERSION } from "./version";
import { saveInvoiceLocally } from "./services/invoiceStorageService";
import { EditionSelectorModal } from "./components/EditionSelectorModal";
import { InitialPosModeModal } from "./components/InitialPosModeModal";
import { InitialSetupModal } from "./components/InitialSetupModal";
import { LicenseLockScreen } from "./components/LicenseLockScreen";
import { ExpirationWarningBanner } from "./components/ExpirationWarningBanner";
import { UserProfileLoginModal } from "./components/UserProfileLoginModal";

const UserManagementModal = React.lazy(() =>
  import("./components/UserManagementModal").then((m) => ({ default: m.UserManagementModal }))
);
const BackupRestoreModal = React.lazy(() =>
  import("./components/BackupRestoreModal").then((m) => ({ default: m.BackupRestoreModal }))
);
const TermsAndPrivacyModal = React.lazy(() =>
  import("./components/TermsAndPrivacyModal").then((m) => ({ default: m.TermsAndPrivacyModal }))
);
const AppIconModal = React.lazy(() =>
  import("./components/AppIconModal").then((m) => ({ default: m.AppIconModal }))
);
const ClientConfigModal = React.lazy(() =>
  import("./components/ClientConfigModal").then((m) => ({ default: m.ClientConfigModal }))
);
const ClientUserManualModal = React.lazy(() =>
  import("./components/ClientUserManualModal").then((m) => ({ default: m.ClientUserManualModal }))
);
const NodeJsSetupModal = React.lazy(() =>
  import("./components/NodeJsSetupModal").then((m) => ({ default: m.NodeJsSetupModal }))
);
const SubscriptionInfoModal = React.lazy(() =>
  import("./components/SubscriptionInfoModal").then((m) => ({ default: m.SubscriptionInfoModal }))
);
const KeyboardShortcutsModal = React.lazy(() =>
  import("./components/KeyboardShortcutsModal").then((m) => ({ default: m.KeyboardShortcutsModal }))
);
const SystemLogsModal = React.lazy(() =>
  import("./components/SystemLogsModal").then((m) => ({ default: m.SystemLogsModal }))
);
const SystemUpdateModal = React.lazy(() =>
  import("./components/SystemUpdateModal").then((m) => ({ default: m.SystemUpdateModal }))
);
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
  BookOpen,
  Calculator,
  Tag,
} from "lucide-react";

export function App() {
  // Main view tabs: inventory | pos | bodega | sales_book | movements | dashboard | invoice_ai
  const [activeCtkTab, setActiveCtkTab] = useState<
    "dashboard" | "inventory" | "pos" | "bodega" | "sales_book" | "movements" | "invoice_ai"
  >("bodega");
  const [activeBodegaTab, setActiveBodegaTab] = useState<
    "mostrador" | "fiados" | "caja" | "etiquetas"
  >("mostrador");

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

  // Startup 3-second smooth icon animation state
  const [showStartupSplash, setShowStartupSplash] = useState<boolean>(true);

  // Initialize Logger Global Handlers, safety fallback timer for splash, and idle prefetch for secondary tabs
  useEffect(() => {
    logger.initGlobalHandlers();
    const splashTimer = setTimeout(() => {
      setShowStartupSplash(false);
    }, 3300);
    const prefetchTimer = setTimeout(() => {
      loadMovementsView().catch(() => {});
      loadGeminiInvoiceView().catch(() => {});
      loadDashboardView().catch(() => {});
    }, 1000);
    return () => {
      clearTimeout(splashTimer);
      clearTimeout(prefetchTimer);
    };
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
        setActiveBodegaTab("mostrador");
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
    setProducts(getStoredProducts());
    setCategories(getStoredCategories());
    setMovements(getStoredMovements());
    setSales(getStoredSales());
    setCorrelativos(getCorrelativosFiscales());
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
      version: `v${APP_VERSION}`,
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
    const contracted = parseContractedEdition(updated.edicion_contratada);
    const normalized: RemoteClientLicense = {
      ...updated,
      edicion_contratada: contracted,
    };
    setClientLicense(normalized);
    saveRemoteLicense(normalized);
    if (contracted === "bodega") {
      revokeFiscalEdition();
      setAppEdition("bodega");
      saveAppEdition("bodega");
      setActiveCtkTab((prev) =>
        prev === "pos" || prev === "sales_book" || prev === "movements" ? "bodega" : prev
      );
    } else if (contracted === "fiscal") {
      // Si el cliente tiene SOLO la Edición Fiscal, no tiene Edición Bodega
      setAppEdition("fiscal");
      saveAppEdition("fiscal");
      setActiveCtkTab((prev) => (prev === "bodega" ? "pos" : prev));
    }
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
    // 1. Prioridad: Consulta instantánea a Firebase Firestore (< 50ms)
    try {
      const fsResult = await fetchRemoteLicenseFromFirestore(clientLicense.cliente_id);
      if (fsResult.success && fsResult.found && fsResult.license) {
        const fsLic = fsResult.license;
        const isActivo = fsLic.estado_remoto === "ACTIVO";
        const newExpDate = fsLic.fecha_vencimiento_actual;
        const now = new Date();
        const exp = parseFlexibleDate(newExpDate);
        const isExpired = !exp || exp.getTime() - now.getTime() < 0;

        const updated: RemoteClientLicense = {
          ...clientLicense,
          ...fsLic,
          ultimo_contacto_servidor: new Date().toISOString(),
        };

        handleUpdateLicenseState(updated);

        if (isActivo && !isExpired) {
          showToast(`¡Licencia verificada en Firebase Firestore! Sistema activo para ${updated.nombre_negocio}.`);
          return {
            success: true,
            message: `¡Estado ACTIVO confirmado en Firebase Firestore! Vence: ${newExpDate}. Desbloqueando...`,
          };
        } else if (fsLic.estado_remoto === "SUSPENDIDO") {
          return {
            success: false,
            message: `El cliente ${fsLic.cliente_id} figura como SUSPENDIDO en Firebase. Por favor reporte su comprobante.`,
          };
        } else if (isExpired) {
          return {
            success: false,
            message: `La fecha en Firebase (${newExpDate}) ya venció. Por favor extienda el mes en Firebase.`,
          };
        }
      }
    } catch (fsErr) {
      console.warn("Fallo temporal consultando Firebase:", fsErr);
    }

    // 2. Respaldo: Google Sheets
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
          // Auto-migrar a Firebase Firestore
          saveLicenseToFirestore(updated).catch(() => {});

          if (isActivo && !isExpired) {
            showToast(`¡Pago verificado! Sistema reactivado para ${updated.nombre_negocio}.`);
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
              message: `La fecha registrada (${newExpDate}) ya venció. Por favor extienda la fecha.`,
            };
          }
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

    // Sincronización automática de licencia con Firebase Firestore (y respaldo Google Sheets) al iniciar
    const silentSyncLicense = async () => {
      try {
        const storedLic = getRemoteLicense();

        // 1. Prioridad absoluta: Consultar Firebase Firestore en tiempo real
        if (storedLic.cliente_id) {
          const fsRes = await fetchRemoteLicenseFromFirestore(storedLic.cliente_id);
          if (fsRes.success && fsRes.found && fsRes.license) {
            const fsLic = fsRes.license;
            const contracted = parseContractedEdition(fsLic.edicion_contratada);
            const updated: RemoteClientLicense = {
              ...storedLic,
              ...fsLic,
              edicion_contratada: contracted,
              ultimo_contacto_servidor: new Date().toISOString(),
            };
            setClientLicense(updated);
            saveRemoteLicense(updated);
            if (contracted === "bodega") {
              revokeFiscalEdition();
              setAppEdition("bodega");
              saveAppEdition("bodega");
              setActiveCtkTab((prev) =>
                prev === "pos" || prev === "sales_book" || prev === "movements" ? "bodega" : prev
              );
            } else if (contracted === "fiscal") {
              setAppEdition("fiscal");
              saveAppEdition("fiscal");
              setActiveCtkTab((prev) => (prev === "bodega" ? "pos" : prev));
            }
            return;
          }
        }

        // 2. Respaldo: Google Sheets API
        const res = await fetch(`/api/license/sync?clienteId=${encodeURIComponent(storedLic.cliente_id)}`);
        if (res.ok) {
          const data = await res.json();
          if (data.found) {
            const contracted = parseContractedEdition(data.edicion || storedLic.edicion_contratada);
            const updated: RemoteClientLicense = {
              ...storedLic,
              estado_remoto: data.estado || storedLic.estado_remoto,
              fecha_vencimiento_actual: data.fechaVencimiento || storedLic.fecha_vencimiento_actual,
              nombre_negocio: data.nombreNegocio || storedLic.nombre_negocio,
              cuota_mensual_usd: data.cuotaUsd || storedLic.cuota_mensual_usd,
              edicion_contratada: contracted,
              motivo_bloqueo: data.motivo || "",
              ultimo_contacto_servidor: new Date().toISOString(),
            };
            setClientLicense(updated);
            saveRemoteLicense(updated);
            if (contracted === "bodega") {
              revokeFiscalEdition();
              setAppEdition("bodega");
              saveAppEdition("bodega");
              setActiveCtkTab((prev) =>
                prev === "pos" || prev === "sales_book" || prev === "movements" ? "bodega" : prev
              );
            } else if (contracted === "fiscal") {
              setAppEdition("fiscal");
              saveAppEdition("fiscal");
              setActiveCtkTab((prev) => (prev === "bodega" ? "pos" : prev));
            }
          }
        }
      } catch (err) {
        console.warn("Silent license sync error on startup:", err);
      }
    };
    silentSyncLicense();

    const handleOnlineReconnect = () => {
      silentSyncLicense();
    };
    window.addEventListener("online", handleOnlineReconnect);
    return () => {
      window.removeEventListener("online", handleOnlineReconnect);
    };
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
    // Si se registró una venta nueva y estamos en modo Sin Datáfono ('inventory_only'):
    if (newSales.length > sales.length && newSales[0] && posMode === "inventory_only") {
      const addedSale = newSales[0];
      saveInvoiceLocally(addedSale, posMode).then((res) => {
        if (res.success && res.folder) {
          showToast(`📁 Factura guardada en carpeta: facturas_emitidas/${res.folder}`);
        } else if (res.success && res.filename) {
          showToast(`📁 Factura guardada en disco: ${res.filename}`);
        }
      });
    }
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

  const handleUpdateProduct = (
    prod: Producto,
    originalBarcode?: string,
    originalId?: number | string
  ) => {
    let matched = false;
    const targetCode = (originalBarcode || prod.codigo_barras || "").trim().toLowerCase();
    const targetId = originalId !== undefined ? originalId : prod.id;
    let oldProduct: Producto | null = null;

    const updated = products.map((p) => {
      const idMatch =
        (targetId !== undefined && (p.id === targetId || String(p.id) === String(targetId))) ||
        (prod.id !== undefined && (p.id === prod.id || String(p.id) === String(prod.id)));

      const codeMatch = Boolean(
        targetCode &&
        p.codigo_barras &&
        p.codigo_barras.trim().toLowerCase() === targetCode
      );

      if (idMatch || codeMatch) {
        matched = true;
        oldProduct = p;
        return {
          ...p,
          ...prod,
          id: p.id ?? prod.id,
        };
      }
      return p;
    });

    if (!matched) {
      const nameMatchIdx = updated.findIndex(
        (p) => p.nombre.trim().toLowerCase() === prod.nombre.trim().toLowerCase()
      );
      if (nameMatchIdx >= 0) {
        oldProduct = updated[nameMatchIdx];
        updated[nameMatchIdx] = { ...updated[nameMatchIdx], ...prod };
        matched = true;
      } else {
        updated.unshift(prod);
      }
    }

    updateProductsState(updated);

    // Si el stock fue modificado en la edición, registrar movimiento en Kardex para trazabilidad SENIAT
    if (oldProduct && (oldProduct as Producto).stock_actual !== prod.stock_actual) {
      const diff = prod.stock_actual - (oldProduct as Producto).stock_actual;
      const now = new Date().toISOString().slice(0, 19).replace("T", " ");
      const newMov: Movimiento = {
        id: movements.length + 1,
        producto_id: prod.id,
        producto_nombre: prod.nombre,
        tipo: "AJUSTE",
        cantidad: Math.abs(diff),
        costo_unitario: prod.precio_costo,
        costo_promedio_ponderado: prod.costo_promedio_ponderado || prod.precio_costo,
        stock_resultante: prod.stock_actual,
        motivo: `Ajuste manual de ficha: stock anterior ${(oldProduct as Producto).stock_actual} -> nuevo stock ${prod.stock_actual}`,
        fecha: now,
        usuario: currentUser?.username || "Admin Fiscal",
      };
      updateMovementsState([newMov, ...movements]);
    }

    showToast(`Producto '${prod.nombre}' actualizado.`);
  };

  const handleDeleteProduct = (id: number | string, codigoBarras?: string) => {
    const targetCode = (codigoBarras || "").trim().toLowerCase();
    const target = products.find(
      (p) =>
        p.id === id ||
        String(p.id) === String(id) ||
        (targetCode && p.codigo_barras && p.codigo_barras.trim().toLowerCase() === targetCode)
    );
    const updated = products.filter(
      (p) =>
        p.id !== id &&
        String(p.id) !== String(id) &&
        (!targetCode || !p.codigo_barras || p.codigo_barras.trim().toLowerCase() !== targetCode)
    );
    updateProductsState(updated);
    showToast(`Producto '${target?.nombre || id}' eliminado del inventario.`);
  };

  const handleBatchImportProducts = (
    updatedProducts: Producto[],
    updatedCategories?: Categoria[]
  ) => {
    updateProductsState(updatedProducts);
    if (updatedCategories && updatedCategories.length > 0) {
      setCategories(updatedCategories);
      saveCategories(updatedCategories);
    }
  };

  // Stock Adjustment strictly enforcing Venezuelan LISLR Art. 177:
  // 1. Method: Costo Promedio Ponderado (PMP)
  // 2. Prohibition of negative stock
  const handleQuickStockAdjustment = (
    prodId: number | string,
    tipo: "ENTRADA" | "SALIDA" | "AJUSTE",
    cantidad: number,
    motivo: string,
    costoCompra?: number,
    codigoBarras?: string
  ) => {
    const targetCode = (codigoBarras || "").trim().toLowerCase();
    const target = products.find(
      (p) =>
        (prodId !== undefined && (p.id === prodId || String(p.id) === String(prodId))) ||
        (targetCode && p.codigo_barras && p.codigo_barras.trim().toLowerCase() === targetCode)
    );
    if (!target) {
      showToast("❌ No se encontró el producto en el catálogo para ajustar stock.");
      return;
    }

    const currentPmp = target.costo_promedio_ponderado || target.precio_costo || 0;
    let newStock = target.stock_actual || 0;
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

    const updatedProducts = products.map((p) => {
      const isTarget =
        (prodId !== undefined && (p.id === prodId || String(p.id) === String(prodId))) ||
        (targetCode && p.codigo_barras && p.codigo_barras.trim().toLowerCase() === targetCode) ||
        (p.id === target.id);

      return isTarget
        ? {
            ...p,
            stock_actual: newStock,
            costo_promedio_ponderado: newPmp,
            precio_costo: newPmp,
          }
        : p;
    });
    updateProductsState(updatedProducts);

    const now = new Date().toISOString().slice(0, 19).replace("T", " ");
    const newMov: Movimiento = {
      id: movements.length + 1,
      producto_id: target.id,
      producto_nombre: target.nombre,
      tipo,
      cantidad,
      costo_unitario: movementCost,
      costo_promedio_ponderado: newPmp,
      stock_resultante: newStock,
      motivo,
      fecha: now,
      usuario: currentUser?.username || "Admin Fiscal",
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
    posMetadata?: {
      referencia?: string;
      lote?: string;
      aprobacion?: string;
      terminal?: string;
      pagos_mixtos?: PagoMixtoItem[];
      monto_base_igtf_usd?: number;
      imprenta_digital_proveedor?: string;
      imprenta_digital_rif?: string;
      imprenta_digital_autorizacion?: string;
      imprenta_digital_hash?: string;
      imprenta_digital_url?: string;
      imprenta_digital_fecha_asignacion?: string;
    }
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

    // IGTF 3% si el usuario seleccionó aplicarlo (o sobre la porción en divisas en caso de Pago Mixto)
    const aplicaIgtf =
      aplicaIgtfCustom !== undefined
        ? aplicaIgtfCustom
        : metodo === "Divisas en Efectivo" || metodo === "Criptoactivos";

    const baseIgtfUsd =
      posMetadata?.monto_base_igtf_usd !== undefined
        ? Math.min(subtotalConIvaUsd, Math.max(0, posMetadata.monto_base_igtf_usd))
        : subtotalConIvaUsd;

    const igtfUsd =
      aplicaIgtf && baseIgtfUsd > 0 ? Math.round(baseIgtfUsd * 0.03 * 100) / 100 : 0;
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
      monto_base_igtf_usd: aplicaIgtf ? baseIgtfUsd : 0,
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
      usuario: currentUser ? `${currentUser.nombre_completo} (${currentUser.rol === "ADMIN" ? "Administrador" : "Cajero"})` : "Caja 1 Fiscal",
      pos_referencia: posMetadata?.referencia,
      pos_lote: posMetadata?.lote,
      pos_aprobacion: posMetadata?.aprobacion,
      pos_terminal: posMetadata?.terminal,
      pagos_mixtos: posMetadata?.pagos_mixtos,
      imprenta_digital_proveedor: posMetadata?.imprenta_digital_proveedor,
      imprenta_digital_rif: posMetadata?.imprenta_digital_rif,
      imprenta_digital_autorizacion: posMetadata?.imprenta_digital_autorizacion,
      imprenta_digital_hash: posMetadata?.imprenta_digital_hash,
      imprenta_digital_url: posMetadata?.imprenta_digital_url,
      imprenta_digital_fecha_asignacion: posMetadata?.imprenta_digital_fecha_asignacion,
      estado: "ACTIVA",
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
        usuario: currentUser?.username || "Caja 1",
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

  // Emitir Nota de Crédito / Anulación de Factura con reintegro de Stock y Kardex (Punto 4)
  const handleVoidSale = (saleId: number, motivo: string, autorizador?: string) => {
    const targetSale = sales.find((s) => s.id === saleId);
    if (!targetSale || targetSale.estado === "ANULADA") return;

    const now = new Date();
    const dateStr = now.toISOString().slice(0, 19).replace("T", " ");
    const voidedCount = sales.filter((s) => s.estado === "ANULADA").length + 1;
    const ncNumber = `NC-00-${String(voidedCount).padStart(6, "0")}`;
    const authUser =
      autorizador ||
      (currentUser
        ? `${currentUser.nombre_completo} (${currentUser.rol === "ADMIN" ? "Administrador" : "Supervisor"})`
        : "Administrador");

    // 1. Reintegrar existencias al inventario de todos los productos de la factura
    const returnMap = new Map<number, number>();
    (targetSale.items || []).forEach((it) => {
      returnMap.set(it.producto_id, (returnMap.get(it.producto_id) || 0) + it.cantidad);
    });

    const updatedProducts = products.map((p) => {
      const qtyToReturn = returnMap.get(p.id);
      if (qtyToReturn) {
        return { ...p, stock_actual: p.stock_actual + qtyToReturn };
      }
      return p;
    });

    // 2. Registrar entradas por DEVOLUCION en el Kardex Valorado (Art. 177 LISLR)
    const newKardexEntries: Movimiento[] = (targetSale.items || []).map((it, idx) => {
      const p = products.find((prod) => prod.id === it.producto_id);
      const currentPmp = p?.costo_promedio_ponderado || p?.precio_costo || 0;
      const resultingStock = (p?.stock_actual || 0) + it.cantidad;

      return {
        id: movements.length + idx + 1,
        producto_id: it.producto_id,
        producto_nombre: it.nombre,
        tipo: "DEVOLUCION",
        cantidad: it.cantidad,
        costo_unitario: currentPmp,
        costo_promedio_ponderado: currentPmp,
        stock_resultante: resultingStock,
        motivo: `Nota de Crédito ${ncNumber} (Anula Factura ${targetSale.numero_factura}) - ${motivo}`,
        fecha: dateStr,
        usuario: authUser,
        referencia_factura: ncNumber,
      };
    });

    // 3. Actualizar la factura a estado ANULADA conservando trazabilidad SENIAT
    const updatedSales = sales.map((s) =>
      s.id === saleId
        ? {
            ...s,
            estado: "ANULADA" as const,
            nota_credito: ncNumber,
            fecha_anulacion: dateStr,
            motivo_anulacion: motivo,
            usuario_anulacion: authUser,
          }
        : s
    );

    updateProductsState(updatedProducts);
    updateMovementsState([...newKardexEntries, ...movements]);
    setSales(updatedSales);
    saveSales(updatedSales);

    logger.warn(
      "Nota de Crédito / Anulación",
      `Emitida ${ncNumber} anulando Factura N° ${targetSale.numero_factura}. Stock reintegrado al almacén. Motivo: ${motivo}`,
      {
        notaCredito: ncNumber,
        facturaOriginal: targetSale.numero_factura,
        motivo,
        autorizadoPor: authUser,
      }
    );

    showToast(
      `✅ Nota de Crédito ${ncNumber} emitida. Factura ${targetSale.numero_factura} anulada y stock reintegrado al inventario.`
    );
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
  const handleSelectEdition = (
    edition: "bodega" | "fiscal",
    unlockedWithMasterCode = false
  ) => {
    const currentLic = getRemoteLicense();
    const isAuthorizedInFirebase = isEditionAuthorizedByLicense(edition, currentLic);

    // Si intenta activar una edición no autorizada en su licencia de Firebase y no ingresó el código maestro, bloquear
    if (!isAuthorizedInFirebase && !unlockedWithMasterCode) {
      if (parseContractedEdition(currentLic.edicion_contratada) === "bodega") {
        revokeFiscalEdition();
      }
      showToast(
        edition === "fiscal"
          ? "🔒 Introduzca el Código de activación para la Edición Fiscal"
          : "🔒 Introduzca el Código de activación para la Edición Bodega"
      );
      setShowEditionModal(true);
      return;
    }

    setAppEdition(edition);
    saveAppEdition(edition);
    setShowEditionModal(false);
    setIsFirstRunModal(false);

    // Si se desbloqueó la otra edición con código de activación, habilitar 'ambas' ($35/mes) en Firebase
    if (unlockedWithMasterCode) {
      const updatedLic: RemoteClientLicense = {
        ...currentLic,
        edicion_contratada: "ambas",
        cuota_mensual_usd: 35,
        ultimo_contacto_servidor: new Date().toISOString(),
      };
      setClientLicense(updatedLic);
      saveRemoteLicense(updatedLic);

      if (updatedLic.cliente_id) {
        saveLicenseToFirestore(updatedLic)
          .then((ok) => {
            if (ok) {
              logger.info(
                "Firebase Firestore",
                `Estatus de edición actualizado a 'ambas' ($35/mes) en Firebase mediante Código de Activación para ${updatedLic.cliente_id}`
              );
            }
          })
          .catch((err) => {
            console.warn("[Firebase] No se pudo sincronizar el cambio de edición:", err);
          });
      }
    }

    if (edition === "bodega") {
      setActiveCtkTab("bodega");
      showToast(
        unlockedWithMasterCode
          ? "🏪 Edición Bodega desbloqueada y habilitada en Firebase ($35/mes Ambas)."
          : "🏪 Edición Bodega y Mostrador activada."
      );
    } else {
      setActiveCtkTab("pos");
      showToast(
        unlockedWithMasterCode
          ? "🏢 Edición Fiscal SENIAT desbloqueada y habilitada en Firebase ($35/mes Ambas)."
          : "🏢 Edición Fiscal SENIAT activada."
      );
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
    <div className="faraday-theme-root min-h-screen bg-[#EEE8DB] text-[#222629] flex flex-col font-sans selection:bg-[#7B61C9] selection:text-white relative overflow-x-hidden">
      {/* Orbes Difuminados de Armonía Triádica (Verde Agua #68B8A6 izq/centro, Violeta #7B61C9 y Lavanda #A592DC der) */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden" aria-hidden="true">
        <div className="absolute -top-20 left-[6%] w-[440px] h-[440px] rounded-full bg-[#68B8A6]/45 blur-[110px]" />
        <div className="absolute top-[38%] left-[20%] w-[460px] h-[360px] rounded-full bg-[#68B8A6]/35 blur-[125px]" />
        <div className="absolute top-[10%] left-[44%] w-[360px] h-[300px] rounded-full bg-white/70 blur-[100px]" />
        <div className="absolute top-[14%] right-[8%] w-[420px] h-[380px] rounded-full bg-[#7B61C9]/30 blur-[120px]" />
        <div className="absolute bottom-[6%] right-[10%] w-[480px] h-[400px] rounded-full bg-[#A592DC]/45 blur-[125px]" />
        <div className="absolute bottom-[8%] left-[12%] w-[360px] h-[260px] rounded-full bg-[#E09F3E]/20 blur-[115px]" />
      </div>

      {/* Animación de Inicio de 3 Segundos (FaradayPOS) */}
      {showStartupSplash && (
        <div
          className="fixed inset-0 z-[100] bg-[#EEE8DB] flex flex-col items-center justify-center select-none pointer-events-none animate-faraday-splash-2s"
          onAnimationEnd={(e) => {
            if (e.target === e.currentTarget) {
              setShowStartupSplash(false);
            }
          }}
          aria-hidden="true"
        >
          <div className="relative flex flex-col items-center gap-3 animate-faraday-icon-2s">
            <div className="w-32 h-32 sm:w-36 sm:h-36 rounded-3xl overflow-hidden border border-white/70 shadow-xl">
              <img
                src="/src/assets/images/faraday_pos_dark_icon_1794172646016.jpg"
                alt="FaradayPOS"
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            </div>
            <span className="text-xl sm:text-2xl font-extrabold tracking-tight text-[#222629]">
              Faraday<span className="text-[#248F78]">POS</span>
            </span>
          </div>
        </div>
      )}

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
      <main className="relative flex-1 max-w-[1680px] w-full mx-auto px-2.5 py-2 lg:px-4 lg:py-2.5">
        {/* Banner de Aviso de Próximo Vencimiento */}
        <ExpirationWarningBanner
          license={clientLicense}
          checkResult={licenseCheck}
          bcvRate={bcvRate}
        />

        {/* Toast Alert */}
        {toastMessage && (
          <div className="fixed bottom-6 right-6 z-50 bg-[#248F78] backdrop-blur-md text-white faraday-keep-white px-4 py-3 rounded-xl shadow-2xl flex items-center gap-2.5 text-xs font-semibold animate-in fade-in slide-in-from-bottom-3 duration-200 border border-white/60">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-white" />
            <span className="faraday-keep-white">{toastMessage}</span>
          </div>
        )}

        {/* Punto de Venta & Sistema de Inventario para Clientes */}
        <div className="rounded-2xl faraday-glass-shell">
          {/* Main Application Tab Bar (Unified Single Bar) */}
          <div className="relative faraday-glass-bar rounded-t-2xl px-3 py-2 border-b border-white/60 flex items-center justify-between gap-2 overflow-x-auto scrollbar-none">
            <div className="flex items-center gap-1.5 shrink-0">
              {/* Pestañas Integradas de Edición Bodega */}
              {appEdition === "bodega" && (
                <>
                  <button
                    id="tab-bodega"
                    onClick={() => {
                      setActiveCtkTab("bodega");
                      setActiveBodegaTab("mostrador");
                    }}
                    className={`shrink-0 whitespace-nowrap flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-extrabold transition-all border cursor-pointer ${
                      activeCtkTab === "bodega" && activeBodegaTab === "mostrador"
                        ? "bg-[#E09F3E] text-[#222629] border-white/70 shadow-md shadow-[#E09F3E]/25"
                        : "bg-white/45 text-[#222629] hover:bg-white/75 border-white/60"
                    }`}
                  >
                    <Store className="w-3.5 h-3.5" />
                    <span>Mostrador</span>
                  </button>

                  <button
                    id="tab-bodega-fiados"
                    onClick={() => {
                      setActiveCtkTab("bodega");
                      setActiveBodegaTab("fiados");
                    }}
                    className={`shrink-0 whitespace-nowrap flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all border cursor-pointer ${
                      activeCtkTab === "bodega" && activeBodegaTab === "fiados"
                        ? "bg-[#E09F3E] text-[#222629] font-extrabold border-white/70 shadow-md shadow-[#E09F3E]/25"
                        : "bg-white/45 text-[#222629] hover:bg-white/75 border-white/60"
                    }`}
                  >
                    <BookOpen className={`w-3.5 h-3.5 ${activeCtkTab === "bodega" && activeBodegaTab === "fiados" ? "text-[#222629]" : "text-[#E09F3E]"}`} />
                    <span>Libreta</span>
                  </button>

                  <button
                    id="tab-bodega-caja"
                    onClick={() => {
                      setActiveCtkTab("bodega");
                      setActiveBodegaTab("caja");
                    }}
                    className={`shrink-0 whitespace-nowrap flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all border cursor-pointer ${
                      activeCtkTab === "bodega" && activeBodegaTab === "caja"
                        ? "bg-[#E09F3E] text-[#222629] font-extrabold border-white/70 shadow-md shadow-[#E09F3E]/25"
                        : "bg-white/45 text-[#222629] hover:bg-white/75 border-white/60"
                    }`}
                  >
                    <Calculator className={`w-3.5 h-3.5 ${activeCtkTab === "bodega" && activeBodegaTab === "caja" ? "text-[#222629]" : "text-[#248F78]"}`} />
                    <span>Caja</span>
                  </button>

                  <button
                    id="tab-bodega-anaquel"
                    onClick={() => {
                      setActiveCtkTab("bodega");
                      setActiveBodegaTab("etiquetas");
                    }}
                    className={`shrink-0 whitespace-nowrap flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all border cursor-pointer ${
                      activeCtkTab === "bodega" && activeBodegaTab === "etiquetas"
                        ? "bg-[#E09F3E] text-[#222629] font-extrabold border-white/70 shadow-md shadow-[#E09F3E]/25"
                        : "bg-white/45 text-[#222629] hover:bg-white/75 border-white/60"
                    }`}
                  >
                    <Tag className={`w-3.5 h-3.5 ${activeCtkTab === "bodega" && activeBodegaTab === "etiquetas" ? "text-[#222629]" : "text-[#7B61C9]"}`} />
                    <span>Anaquel</span>
                  </button>

                  <span className="h-5 w-px bg-[#222629]/15 mx-0.5 shrink-0" aria-hidden="true" />
                </>
              )}

              {/* Pestañas de Edición Fiscal SENIAT */}
              {appEdition === "fiscal" && (
                <>
                  <button
                    id="tab-pos"
                    onClick={() => setActiveCtkTab("pos")}
                    className={`shrink-0 whitespace-nowrap flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                      activeCtkTab === "pos"
                        ? "bg-[#E09F3E] text-[#222629] border-white/70 shadow-md shadow-[#E09F3E]/25"
                        : "bg-white/45 text-[#5C646D] hover:text-[#222629] hover:bg-white/75 border-white/60"
                    }`}
                  >
                    <ShoppingBag className="w-3.5 h-3.5" />
                    <span>Punto de Venta Fiscal (Prov. 00071)</span>
                  </button>

                  <button
                    id="tab-movements"
                    onClick={() => setActiveCtkTab("movements")}
                    className={`shrink-0 whitespace-nowrap flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                      activeCtkTab === "movements"
                        ? "bg-[#E09F3E] text-[#222629] border-white/70 shadow-md shadow-[#E09F3E]/25"
                        : "bg-white/45 text-[#5C646D] hover:text-[#222629] hover:bg-white/75 border-white/60"
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
                className={`shrink-0 whitespace-nowrap flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all border cursor-pointer ${
                  activeCtkTab === "sales_book"
                    ? "bg-[#E09F3E] text-[#222629] font-extrabold border-white/70 shadow-md shadow-[#E09F3E]/25"
                    : "bg-white/45 text-[#222629] hover:bg-white/75 border-white/60"
                }`}
              >
                <FileText className={`w-3.5 h-3.5 ${activeCtkTab === "sales_book" ? "text-[#222629]" : "text-[#248F78]"}`} />
                <span>Libro de Ventas</span>
                {sales.length > 0 && (
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold ${
                    activeCtkTab === "sales_book"
                      ? "bg-[#222629] text-white faraday-keep-white"
                      : "bg-[#248F78]/15 text-[#248F78]"
                  }`}>
                    {sales.length}
                  </span>
                )}
              </button>

              {/* Pestañas compartidas en ambas ediciones */}
              <button
                id="tab-inventory"
                onClick={() => setActiveCtkTab("inventory")}
                className={`shrink-0 whitespace-nowrap flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all border cursor-pointer ${
                  activeCtkTab === "inventory"
                    ? "bg-[#E09F3E] text-[#222629] font-extrabold border-white/70 shadow-md shadow-[#E09F3E]/25"
                    : "bg-white/45 text-[#222629] hover:bg-white/75 border-white/60"
                }`}
              >
                <Package className={`w-3.5 h-3.5 ${activeCtkTab === "inventory" ? "text-[#222629]" : "text-[#5C646D]"}`} />
                <span>Catálogo ({products.length})</span>
              </button>

              {/* Pestaña: Dashboard Analítico */}
              <button
                id="tab-dashboard"
                onClick={() => setActiveCtkTab("dashboard")}
                className={`shrink-0 whitespace-nowrap flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all border cursor-pointer ${
                  activeCtkTab === "dashboard"
                    ? "bg-[#E09F3E] text-[#222629] border-white/70 shadow-md shadow-[#E09F3E]/25"
                    : "bg-white/45 text-[#7B61C9] hover:bg-white/75 border-white/60"
                }`}
              >
                <TrendingUp className="w-3.5 h-3.5" />
                <span>Dashboard</span>
              </button>

              <button
                id="tab-invoice-ai"
                onClick={() => setActiveCtkTab("invoice_ai")}
                className={`shrink-0 whitespace-nowrap flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all border cursor-pointer ${
                  activeCtkTab === "invoice_ai"
                    ? "bg-[#E09F3E] text-[#222629] font-extrabold border-white/70 shadow-md shadow-[#E09F3E]/25"
                    : "bg-white/45 text-[#222629] hover:bg-white/75 border-white/60"
                }`}
              >
                <Sparkles className={`w-3.5 h-3.5 ${activeCtkTab === "invoice_ai" ? "text-[#222629]" : "text-[#E09F3E]"}`} />
                <span>Facturas (IA)</span>
              </button>
            </div>
          </div>

          {/* Inner Body */}
          <div className="relative p-3 lg:p-4 bg-transparent">
                <Suspense
                  fallback={
                    <div className="py-16 flex flex-col items-center justify-center gap-2 text-slate-400 text-xs font-mono">
                      <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                      <span>Cargando módulo...</span>
                    </div>
                  }
                >
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
                      sales={sales}
                      bcvRate={bcvRate}
                      onUpdateProductStock={handleBodegaStockUpdate}
                      onRecordSale={(sale) => updateSalesState([sale, ...sales])}
                      showToast={showToast}
                      posMode={posMode}
                      onTogglePosMode={handleSelectPosMode}
                      currentUser={currentUser}
                      onUserChange={(newUser) => setCurrentUser(newUser)}
                      onOpenCatalog={() => setActiveCtkTab("inventory")}
                      onOpenInvoiceAi={() => setActiveCtkTab("invoice_ai")}
                      activeTab={activeBodegaTab}
                      onTabChange={setActiveBodegaTab}
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
                      onBatchImportProducts={handleBatchImportProducts}
                      showToast={showToast}
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
                      onOpenCatalog={() => setActiveCtkTab("inventory")}
                    />
                  )}

                  {activeCtkTab === "sales_book" && (
                    <SalesBookView
                      sales={sales}
                      bcvRate={bcvRate}
                      onClearSales={() => updateSalesState([])}
                      onVoidSale={handleVoidSale}
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
                </Suspense>
              </div>
            </div>
        </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/60 faraday-glass-bar py-2.5 text-xs text-[#5C646D]">
        <div className="max-w-[1680px] mx-auto px-3 lg:px-5 flex flex-col md:flex-row items-center justify-between gap-3">
          <p className="text-center md:text-left">
            <strong className="text-[#222629]">FaradayPOS</strong> — Sistema de Inventario y Facturación para Comercios en Venezuela (SENIAT / Providencia SNAT/00071 / LISLR Art. 177)
          </p>

          <div className="flex items-center gap-3 text-[#5C646D] font-medium shrink-0 flex-wrap justify-center text-[11px]">
            <button
              type="button"
              onClick={() => handleOpenTermsModal("terms")}
              className="hover:text-[#7B61C9] underline transition-colors cursor-pointer"
            >
              Términos y Condiciones
            </button>
            <span>•</span>
            <button
              type="button"
              onClick={() => handleOpenTermsModal("privacy")}
              className="hover:text-[#7B61C9] underline transition-colors cursor-pointer"
            >
              Política de Privacidad
            </button>
            <span>•</span>
            <button
              type="button"
              onClick={() => handleOpenTermsModal("fiscal")}
              className="hover:text-[#248F78] underline transition-colors cursor-pointer"
            >
              Aviso Fiscal SENIAT
            </button>
            <span>•</span>
            <button
              type="button"
              onClick={() => handleOpenTermsModal("certificate")}
              className="text-[#222629] hover:text-[#E09F3E] font-bold underline transition-colors cursor-pointer"
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
        clientLicense={clientLicense}
        onUpdateLicense={handleUpdateLicenseState}
      />

      {/* Asistente de Selección de Modo Operativo (SmartPOS vs Solo Inventario & Total) */}
      <InitialPosModeModal
        isOpen={showPosModeModal}
        onClose={() => setShowPosModeModal(false)}
        currentMode={posMode}
        onSelectMode={handleSelectPosMode}
        isFirstRun={isFirstRunPosMode}
      />

      {/* Modales diferidos (Code Splitting bajo demanda) */}
      <Suspense fallback={null}>
        {showNodeJsModal && (
          <NodeJsSetupModal
            isOpen={showNodeJsModal}
            onClose={() => setShowNodeJsModal(false)}
            showToast={showToast}
          />
        )}

        {showUserModal && (
          <UserManagementModal
            isOpen={showUserModal}
            onClose={() => setShowUserModal(false)}
            currentUser={currentUser}
            onSelectUser={handleSelectUser}
            showToast={showToast}
          />
        )}

        {showBackupModal && (
          <BackupRestoreModal
            isOpen={showBackupModal}
            onClose={() => setShowBackupModal(false)}
            onRestoreComplete={handleRestoreComplete}
            showToast={showToast}
            onOpenPrivacyPolicy={() => handleOpenTermsModal("privacy")}
            currentUser={currentUser}
          />
        )}

        {showTermsModal && (
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
        )}

        {showIconModal && (
          <AppIconModal
            isOpen={showIconModal}
            onClose={() => setShowIconModal(false)}
            showToast={showToast}
          />
        )}

        {showClientConfigModal && (
          <ClientConfigModal
            isOpen={showClientConfigModal}
            onClose={() => setShowClientConfigModal(false)}
            onSaved={(cfg) => setNegocioConfig(cfg)}
            showToast={showToast}
            bcvRate={bcvRate}
          />
        )}

        {showClientManualModal && (
          <ClientUserManualModal
            isOpen={showClientManualModal}
            onClose={() => setShowClientManualModal(false)}
            bcvRate={bcvRate}
          />
        )}

        {showSubscriptionModal && (
          <SubscriptionInfoModal
            isOpen={showSubscriptionModal}
            onClose={() => setShowSubscriptionModal(false)}
            clientLicense={clientLicense}
            onUpdateLicense={handleUpdateLicenseState}
            showToast={showToast}
            currentEdition={appEdition}
            bcvRate={bcvRate}
          />
        )}

        {showKeyboardShortcutsModal && (
          <KeyboardShortcutsModal
            isOpen={showKeyboardShortcutsModal}
            onClose={() => setShowKeyboardShortcutsModal(false)}
          />
        )}

        {showLogsModal && (
          <SystemLogsModal
            isOpen={showLogsModal}
            onClose={() => setShowLogsModal(false)}
            showToast={showToast}
          />
        )}

        {showUpdateModal && (
          <SystemUpdateModal
            isOpen={showUpdateModal}
            onClose={() => setShowUpdateModal(false)}
            showToast={showToast}
          />
        )}
      </Suspense>

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
    </div>
  );
}

export default App;
