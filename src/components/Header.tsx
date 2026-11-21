import React, { useState, useRef, useEffect } from "react";
import {
  Wifi,
  WifiOff,
  RefreshCw,
  DollarSign,
  Check,
  Edit2,
  Globe,
  Store,
  ShieldCheck,
  SlidersHorizontal,
  ShoppingCart,
  Smartphone,
  Users,
  HardDrive,
  Scale,
  Sparkles,
  Building2,
  BookOpen,
  Wand2,
  Server,
  Menu,
  X,
  ChevronDown,
  Settings2,
  ChevronRight,
  UserCheck,
  CreditCard,
  Keyboard,
  Bug,
  GitBranch,
  Power,
  CheckCircle2,
} from "lucide-react";
import { PosOperationalMode, SystemUser } from "../types";

interface HeaderProps {
  isOfflineMode: boolean;
  setIsOfflineMode: (offline: boolean) => void;
  bcvRate: number;
  bcvEurRate?: number | null;
  bcvSource?: string;
  bcvFechaValor?: string;
  bcvUpdatedAt?: string;
  isLoadingBcv?: boolean;
  onRefreshBcv?: () => void;
  onUpdateBcvRate: (rate: number) => void;
  onResetDatabase: () => void;
  currentEdition?: "bodega" | "fiscal";
  onOpenEditionSelector?: () => void;
  onOpenNodeJsGuide?: () => void;
  posMode?: PosOperationalMode;
  onOpenPosModeSelector?: () => void;
  currentUser?: SystemUser;
  onOpenUserManagement?: () => void;
  onOpenBackupModal?: () => void;
  onOpenTermsModal?: () => void;
  onOpenIconModal?: () => void;
  onOpenClientConfig?: () => void;
  onOpenClientManual?: () => void;
  onOpenSubscriptionModal?: () => void;
  onOpenLoginModal?: () => void;
  onOpenKeyboardShortcuts?: () => void;
  onOpenLogsModal?: () => void;
  onOpenUpdateModal?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  isOfflineMode,
  setIsOfflineMode,
  bcvRate,
  bcvEurRate,
  bcvSource,
  bcvFechaValor,
  bcvUpdatedAt,
  isLoadingBcv,
  onRefreshBcv,
  onUpdateBcvRate,
  onResetDatabase,
  currentEdition = "bodega",
  onOpenEditionSelector,
  onOpenNodeJsGuide,
  posMode = "inventory_only",
  onOpenPosModeSelector,
  currentUser,
  onOpenUserManagement,
  onOpenBackupModal,
  onOpenTermsModal,
  onOpenIconModal,
  onOpenClientConfig,
  onOpenClientManual,
  onOpenSubscriptionModal,
  onOpenLoginModal,
  onOpenKeyboardShortcuts,
  onOpenLogsModal,
  onOpenUpdateModal,
}) => {
  const [isEditingBcv, setIsEditingBcv] = useState(false);
  const [tempBcvRate, setTempBcvRate] = useState(bcvRate.toString());
  const [isToolsOpen, setIsToolsOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showShutdownConfirm, setShowShutdownConfirm] = useState(false);
  const [isShuttingDown, setIsShuttingDown] = useState(false);
  const [isServerStopped, setIsServerStopped] = useState(false);
  const [shutdownMessage, setShutdownMessage] = useState<string>("");
  const isCashier = currentUser?.rol === "CAJERO";

  const handleConfirmShutdown = async () => {
    setIsShuttingDown(true);
    try {
      const res = await fetch("/api/system/shutdown", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const data = await res.json().catch(() => ({}));
      setShutdownMessage(
        data?.message ||
          "El servidor local Node.js ha sido detenido correctamente. Ya puedes cerrar esta ventana del navegador."
      );
    } catch {
      setShutdownMessage(
        "El servidor local Node.js ha sido detenido. Ya puedes cerrar esta pestaña del navegador."
      );
    } finally {
      setIsShuttingDown(false);
      setShowShutdownConfirm(false);
      setIsServerStopped(true);
      try {
        window.close();
      } catch {}
    }
  };

  const toolsMenuRef = useRef<HTMLDivElement>(null);
  const bcvInputRef = useRef<HTMLInputElement>(null);

  // Sync temp rate when bcvRate changes from external source
  useEffect(() => {
    setTempBcvRate(bcvRate.toString());
  }, [bcvRate]);

  // Focus input when editing starts
  useEffect(() => {
    if (isEditingBcv && bcvInputRef.current) {
      bcvInputRef.current.focus();
      bcvInputRef.current.select();
    }
  }, [isEditingBcv]);

  // Click outside to close tools dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (toolsMenuRef.current && !toolsMenuRef.current.contains(event.target as Node)) {
        setIsToolsOpen(false);
      }
    };
    if (isToolsOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isToolsOpen]);

  // Close mobile drawer on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsToolsOpen(false);
        setIsMobileMenuOpen(false);
        setIsEditingBcv(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleSaveBcv = () => {
    const val = parseFloat(tempBcvRate);
    if (!isNaN(val) && val > 0) {
      onUpdateBcvRate(val);
      setIsEditingBcv(false);
    }
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-white/60 faraday-glass-bar">
      <div className="max-w-[1680px] mx-auto px-3 sm:px-4 lg:px-5 min-h-14 py-1.5 flex flex-wrap md:flex-nowrap items-center justify-between gap-2 lg:gap-3">
        {/* =================================================================== */}
        {/* ZONA 1 (IZQUIERDA): Marca, Edición y Estado de Conectividad */}
        {/* =================================================================== */}
        <div className="flex items-center gap-2.5 shrink-0 min-w-0">
          {/* Logo del Sistema */}
          <div className="w-10 h-10 rounded-xl overflow-hidden border border-white/70 bg-white/60 p-0.5 shadow-sm shrink-0">
            <img
              src="/src/assets/images/faraday_pos_dark_icon_1794172646016.jpg"
              alt="Logo de FaradayPOS"
              className="w-full h-full object-cover rounded-[9px]"
              referrerPolicy="no-referrer"
            />
          </div>

          {/* Nombre y Selector de Edición Directo */}
          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-1.5 flex-nowrap">
              <span className="font-extrabold text-sm sm:text-base text-[#222629] tracking-tight whitespace-nowrap">
                FaradayPOS
              </span>
              <span className="text-[#5C646D]/60 hidden sm:inline" aria-hidden="true">·</span>

              {/* Botón interactivo de cambio de Edición */}
              {onOpenEditionSelector && (
                <button
                  type="button"
                  id="btn-switch-edition"
                  onClick={onOpenEditionSelector}
                  title="Cambiar edición del sistema: Bodega o Fiscal SENIAT"
                  className="flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-md transition-colors border border-transparent hover:border-white/70 hover:bg-white/50 focus:outline-none focus-visible:ring-1 focus-visible:ring-[#C66B49] whitespace-nowrap shrink-0 cursor-pointer"
                >
                  {currentEdition === "bodega" ? (
                    <>
                      <Store className="w-3.5 h-3.5 text-[#B85A3A] shrink-0" />
                      <span className="text-[#222629]">Bodega & Abasto</span>
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="w-3.5 h-3.5 text-[#248F78] shrink-0" />
                      <span className="text-[#248F78]">Fiscal SENIAT</span>
                    </>
                  )}
                  <ChevronDown className="w-3 h-3 text-[#5C646D] ml-0.5 shrink-0" />
                </button>
              )}
            </div>

            {/* Subtítulo de estado limpio y unboxed */}
            <div className="flex items-center gap-1.5 text-[11px] text-[#5C646D] whitespace-nowrap">
              <button
                type="button"
                onClick={() => setIsOfflineMode(!isOfflineMode)}
                className="flex items-center gap-1 hover:text-[#222629] transition-colors cursor-pointer group"
                title="Clic para alternar entre modo en línea y modo local autónomo"
              >
                <span
                  className={`w-2 h-2 rounded-full shrink-0 transition-colors ${
                    isOfflineMode
                      ? "bg-[#C66B49] shadow-[0_0_6px_rgba(198,107,73,0.6)]"
                      : "bg-[#248F78] shadow-[0_0_6px_rgba(36,143,120,0.6)] animate-pulse"
                  }`}
                  aria-hidden="true"
                />
                <span className="text-[10px] font-semibold text-[#5C646D] group-hover:text-[#222629]">
                  {isOfflineMode ? "Modo Local (Offline)" : "Servidor Local Activo"}
                </span>
              </button>
              <span className="text-[#5C646D]/50 hidden lg:inline" aria-hidden="true">/</span>
              <span className="text-[10px] text-[#5C646D] font-mono hidden lg:inline">
                Puerto :3000
              </span>
            </div>
          </div>
        </div>

        {/* =================================================================== */}
        {/* ZONA 2 (CENTRAL): Widget Financiero de Tasa Oficial BCV */}
        {/* =================================================================== */}
        <div className="flex items-center shrink-0">
          <div
            className="flex items-center gap-2 bg-white/55 backdrop-blur-md border border-white/70 px-2.5 sm:px-3 py-1 rounded-xl shadow-[inset_0_1px_0_0_rgba(255,255,255,0.85)] whitespace-nowrap"
            title={bcvFechaValor ? `Tasa Oficial BCV (${bcvFechaValor})` : "Tasa Oficial BCV"}
          >
            <div className="flex items-center gap-1.5">
              <div className="w-6 h-6 rounded-lg bg-[#C66B49]/18 border border-[#C66B49]/45 flex items-center justify-center shrink-0">
                <DollarSign className="w-3.5 h-3.5 text-[#B85A3A]" />
              </div>
              <div className="flex flex-col justify-center">
                <div className="flex items-center gap-1.5 leading-tight">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#5C646D] whitespace-nowrap">
                    Tasa BCV
                  </span>
                  {bcvFechaValor && (
                    <span className="text-[9px] text-[#5C646D] font-mono hidden xl:inline truncate max-w-[140px]">
                      ({bcvFechaValor})
                    </span>
                  )}
                </div>

                {isEditingBcv ? (
                  <div className="flex items-center gap-1 mt-0.5">
                    <input
                      ref={bcvInputRef}
                      id="input-bcv-rate"
                      type="number"
                      step="0.01"
                      min="0.01"
                      value={tempBcvRate}
                      onChange={(e) => setTempBcvRate(e.target.value)}
                      className="w-20 bg-white/80 border border-[#C66B49] text-[#222629] text-xs font-mono tabular-nums px-1.5 py-0.5 rounded focus:outline-none focus:ring-1 focus:ring-[#C66B49]"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleSaveBcv();
                        if (e.key === "Escape") setIsEditingBcv(false);
                      }}
                    />
                    <button
                      id="btn-save-bcv"
                      onClick={handleSaveBcv}
                      className="p-1 bg-[#248F78] hover:bg-[#1e7865] text-white faraday-keep-white rounded transition-colors cursor-pointer"
                      title="Guardar Tasa Manual"
                    >
                      <Check className="w-3 h-3" />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-baseline gap-1.5 whitespace-nowrap leading-tight mt-0.5">
                    <span className="font-mono tabular-nums font-extrabold text-[#222629] text-xs sm:text-sm leading-none whitespace-nowrap">
                      Bs. {bcvRate.toFixed(2)}
                    </span>
                    {bcvEurRate && bcvEurRate > 0 && (
                      <span className="text-[10px] text-[#5C646D] font-mono tabular-nums hidden xl:inline whitespace-nowrap">
                        · € {bcvEurRate.toFixed(2)}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Acciones del BCV: Sincronizar y Editar */}
            {!isEditingBcv && (
              <div className="flex items-center gap-0.5 ml-1 border-l border-[#222629]/15 pl-1.5 shrink-0">
                {onRefreshBcv && (
                  <button
                    id="btn-sync-bcv"
                    onClick={onRefreshBcv}
                    disabled={isLoadingBcv}
                    className="p-1 text-[#5C646D] hover:text-[#248F78] disabled:opacity-50 rounded transition-colors cursor-pointer"
                    title="Actualizar tasa oficial en tiempo real con DolarApi / BCV"
                  >
                    <RefreshCw
                      className={`w-3.5 h-3.5 ${isLoadingBcv ? "animate-spin text-[#248F78]" : ""}`}
                    />
                  </button>
                )}
                <button
                  id="btn-edit-bcv"
                  onClick={() => setIsEditingBcv(true)}
                  className="p-1 text-[#5C646D] hover:text-[#B85A3A] rounded transition-colors cursor-pointer"
                  title="Editar tasa manualmente"
                >
                  <Edit2 className="w-3 h-3" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* =================================================================== */}
        {/* ZONA 3 (DERECHA): Acciones Operativas, Usuario & Menú Desplegable */}
        {/* =================================================================== */}
        <div className="flex items-center gap-1.5 lg:gap-2 shrink-0">
          {/* Selector de Modo Operativo (Solo Inventario vs SmartPOS) */}
          {onOpenPosModeSelector && (
            <button
              id="btn-pos-mode"
              onClick={onOpenPosModeSelector}
              title="Cambiar Modo Operativo: Conectar terminal SmartPOS o Totalizar en Pantalla"
              className={`hidden md:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-all whitespace-nowrap shrink-0 cursor-pointer ${
                posMode === "inventory_only"
                  ? "bg-white/50 text-[#222629] border-white/60 hover:bg-white/75 hover:border-[#C66B49]/60"
                  : "bg-[#7B61C9]/15 text-[#7B61C9] border-[#7B61C9]/35 hover:bg-[#7B61C9]/25"
              }`}
            >
              {posMode === "inventory_only" ? (
                <>
                  <ShoppingCart className="w-3.5 h-3.5 text-[#B85A3A] shrink-0" />
                  <span className="font-mono">Solo Inventario</span>
                </>
              ) : (
                <>
                  <Smartphone className="w-3.5 h-3.5 text-[#7B61C9] shrink-0" />
                  <span className="font-mono">SmartPOS</span>
                </>
              )}
              <SlidersHorizontal className="w-3 h-3 text-[#5C646D] ml-0.5 shrink-0" />
            </button>
          )}

          {/* Usuario / Cajero Activo (Insignia ADMIN en Violeta Medio #7B61C9) */}
          {onOpenUserManagement && (
            <button
              id="btn-user-management"
              onClick={onOpenUserManagement}
              title={`Usuario Activo: ${currentUser?.nombre_completo || 'Usuario'} (${currentUser?.rol || 'CAJERO'}). Clic para cambiar cajero.`}
              className="hidden lg:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border border-white/60 bg-white/50 hover:bg-white/75 text-[#222629] transition-all cursor-pointer whitespace-nowrap shrink-0"
            >
              <div className="w-5 h-5 rounded-full bg-[#7B61C9]/20 border border-[#7B61C9]/45 flex items-center justify-center text-[10px] font-extrabold text-[#7B61C9] shrink-0">
                {(currentUser?.nombre_completo || currentUser?.username || "U")[0].toUpperCase()}
              </div>
              <span className="font-mono text-xs font-semibold truncate max-w-[75px]">
                {currentUser?.username || "Cajero"}
              </span>
              <span className={`text-[9px] px-1.5 py-0.5 rounded font-mono uppercase font-bold shrink-0 faraday-keep-white ${
                currentUser?.rol === "ADMIN"
                  ? "bg-[#7B61C9] text-white border border-[#7B61C9]"
                  : "bg-[#248F78] text-white border border-[#248F78]"
              }`}>
                {currentUser?.rol || "CAJA"}
              </span>
            </button>
          )}

          <div className="relative shrink-0" ref={toolsMenuRef}>
            <button
              id="btn-tools-menu"
              type="button"
              onClick={() => setIsToolsOpen(!isToolsOpen)}
              className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                isToolsOpen
                  ? "bg-[#7B61C9] text-white faraday-keep-white border-[#7B61C9] shadow-md shadow-[#7B61C9]/30"
                  : "bg-white/55 text-[#222629] border-white/65 hover:bg-white/80"
              }`}
              title="Ajustes, respaldos, servidor y utilidades del sistema"
            >
              <Settings2 className="w-3.5 h-3.5 shrink-0" />
              <span className="hidden sm:inline">Herramientas</span>
              <ChevronDown className={`w-3 h-3 shrink-0 transition-transform duration-200 ${isToolsOpen ? "rotate-180" : ""}`} />
            </button>

            {/* Dropdown Panel */}
            {isToolsOpen && (
              <div className="absolute right-0 mt-2 w-72 rounded-xl faraday-glass-panel border border-white/75 shadow-2xl py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                {/* Categoría: Gestión del Negocio */}
                {!isCashier && (
                  <>
                    <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                      Gestión del Negocio
                    </div>

                    {onOpenClientConfig && (
                      <button
                        type="button"
                        onClick={() => {
                          setIsToolsOpen(false);
                          onOpenClientConfig();
                        }}
                        className="w-full flex items-center justify-between px-3 py-2 text-xs text-slate-300 hover:bg-slate-800/70 hover:text-white transition-colors cursor-pointer text-left"
                      >
                        <div className="flex items-center gap-2">
                          <Building2 className="w-4 h-4 text-blue-400" />
                          <div>
                            <div className="font-medium">Datos de Mi Negocio</div>
                            <div className="text-[10px] text-slate-500">RIF, nombre comercial y pie de ticket</div>
                          </div>
                        </div>
                        <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
                      </button>
                    )}

                    {onOpenClientManual && (
                      <button
                        type="button"
                        onClick={() => {
                          setIsToolsOpen(false);
                          onOpenClientManual();
                        }}
                        className="w-full flex items-center justify-between px-3 py-2 text-xs text-slate-300 hover:bg-slate-800/70 hover:text-white transition-colors cursor-pointer text-left"
                      >
                        <div className="flex items-center gap-2">
                          <BookOpen className="w-4 h-4 text-amber-400" />
                          <div>
                            <div className="font-medium">Manual de Operaciones</div>
                            <div className="text-[10px] text-slate-500">Guía de cajero imprimible para el cliente</div>
                          </div>
                        </div>
                        <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
                      </button>
                    )}

                    <div className="my-1.5 border-t border-slate-800" />
                  </>
                )}

                {onOpenKeyboardShortcuts && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsToolsOpen(false);
                      onOpenKeyboardShortcuts();
                    }}
                    className="w-full flex items-center justify-between px-3 py-2 text-xs text-slate-300 hover:bg-slate-800/70 hover:text-white transition-colors cursor-pointer text-left"
                  >
                    <div className="flex items-center gap-2">
                      <Keyboard className="w-4 h-4 text-amber-400" />
                      <div>
                        <div className="font-medium">F7 Atajos de Teclado</div>
                        <div className="text-[10px] text-slate-500">Teclas rápidas de cobro y navegación</div>
                      </div>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
                  </button>
                )}

                {/* Categoría: Infraestructura & Servidor */}
                <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  {isCashier ? "Copias de Seguridad" : "Servidor & Datos"}
                </div>

                {!isCashier && onOpenNodeJsGuide && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsToolsOpen(false);
                      onOpenNodeJsGuide();
                    }}
                    className="w-full flex items-center justify-between px-3 py-2 text-xs text-slate-300 hover:bg-slate-800/70 hover:text-white transition-colors cursor-pointer text-left"
                  >
                    <div className="flex items-center gap-2">
                      <Server className="w-4 h-4 text-emerald-400" />
                      <div>
                        <div className="font-medium">Servidor Node.js</div>
                        <div className="text-[10px] text-slate-500">Guía de instalación y red local WiFi</div>
                      </div>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
                  </button>
                )}

                {onOpenBackupModal && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsToolsOpen(false);
                      onOpenBackupModal();
                    }}
                    className="w-full flex items-center justify-between px-3 py-2 text-xs text-slate-300 hover:bg-slate-800/70 hover:text-white transition-colors cursor-pointer text-left"
                  >
                    <div className="flex items-center gap-2">
                      <HardDrive className="w-4 h-4 text-indigo-400" />
                      <div>
                        <div className="font-medium">Copias de Seguridad</div>
                        <div className="text-[10px] text-slate-500">Exportar respaldo de datos</div>
                      </div>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
                  </button>
                )}

                {onOpenLogsModal && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsToolsOpen(false);
                      onOpenLogsModal();
                    }}
                    className="w-full flex items-center justify-between px-3 py-2 text-xs text-slate-300 hover:bg-slate-800/70 hover:text-white transition-colors cursor-pointer text-left"
                  >
                    <div className="flex items-center gap-2">
                      <Bug className="w-4 h-4 text-amber-400" />
                      <div>
                        <div className="font-medium">Registro de Logs &amp; Bugs</div>
                        <div className="text-[10px] text-slate-500">Historial de excepciones y diagnóstico</div>
                      </div>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
                  </button>
                )}

                {onOpenUpdateModal && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsToolsOpen(false);
                      onOpenUpdateModal();
                    }}
                    className="w-full flex items-center justify-between px-3 py-2 text-xs text-slate-300 hover:bg-slate-800/70 hover:text-white transition-colors cursor-pointer text-left"
                  >
                    <div className="flex items-center gap-2">
                      <GitBranch className="w-4 h-4 text-indigo-400" />
                      <div>
                        <div className="font-medium">Actualizaciones (GitHub)</div>
                        <div className="text-[10px] text-slate-500">Sincronizar versión con repositorio</div>
                      </div>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
                  </button>
                )}

                {!isCashier && onOpenSubscriptionModal && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsToolsOpen(false);
                      onOpenSubscriptionModal();
                    }}
                    className="w-full flex items-center justify-between px-3 py-2 text-xs text-slate-300 hover:bg-slate-800/70 hover:text-white transition-colors cursor-pointer text-left"
                  >
                    <div className="flex items-center gap-2">
                      <CreditCard className="w-4 h-4 text-emerald-400" />
                      <div>
                        <div className="font-medium flex items-center gap-1.5">
                          <span>Suscripción & Días Restantes</span>
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        </div>
                        <div className="text-[10px] text-slate-500">Estado de licencia, vigencia y soporte</div>
                      </div>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
                  </button>
                )}

                {!isCashier && <div className="my-1.5 border-t border-slate-800" />}

                {/* Categoría: Legal & Sistema */}
                {!isCashier && (
                  <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    Legal & Sistema
                  </div>
                )}

                {!isCashier && onOpenTermsModal && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsToolsOpen(false);
                      onOpenTermsModal();
                    }}
                    className="w-full flex items-center justify-between px-3 py-2 text-xs text-slate-300 hover:bg-slate-800/70 hover:text-white transition-colors cursor-pointer text-left"
                  >
                    <div className="flex items-center gap-2">
                      <Scale className="w-4 h-4 text-slate-400" />
                      <div>
                        <div className="font-medium">Marco Legal & SENIAT</div>
                        <div className="text-[10px] text-slate-500">Términos, privacidad y Providencia 00071</div>
                      </div>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
                  </button>
                )}

                {onOpenLoginModal && (
                  <>
                    <div className="my-1.5 border-t border-slate-800" />
                    <button
                      type="button"
                      onClick={() => {
                        setIsToolsOpen(false);
                        onOpenLoginModal();
                      }}
                      className="w-full flex items-center justify-between px-3 py-2 text-xs text-indigo-300 hover:bg-indigo-950/40 hover:text-white transition-colors cursor-pointer text-left font-bold"
                    >
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-indigo-400" />
                        <div>
                          <div className="font-bold">Cambiar Perfil / Cerrar Sesión</div>
                          <div className="text-[10px] text-slate-400 font-normal">Seleccionar otro usuario e ingresar PIN</div>
                        </div>
                      </div>
                      <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
                    </button>
                  </>
                )}

                <div className="my-1.5 border-t border-slate-800" />
                <button
                  type="button"
                  onClick={() => {
                    setIsToolsOpen(false);
                    setShowShutdownConfirm(true);
                  }}
                  className="w-full flex items-center justify-between px-3 py-2 text-xs text-rose-300 hover:bg-rose-950/50 hover:text-rose-200 transition-colors cursor-pointer text-left font-bold"
                >
                  <div className="flex items-center gap-2">
                    <Power className="w-4 h-4 text-rose-400" />
                    <div>
                      <div className="font-bold">Apagar Sistema y Servidor</div>
                      <div className="text-[10px] text-slate-400 font-normal">Detener Node.js local y cerrar programa</div>
                    </div>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-rose-500/70" />
                </button>
              </div>
            )}
          </div>

          {/* Botón Directo de Apagar Sistema / Servidor */}
          <button
            id="btn-shutdown-system"
            type="button"
            onClick={() => setShowShutdownConfirm(true)}
            title="Apagar Sistema y detener el servidor local Node.js"
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold border border-rose-500/35 bg-rose-500/15 hover:bg-rose-600 text-rose-700 hover:text-white hover:border-rose-500 transition-all cursor-pointer whitespace-nowrap shrink-0 shadow-sm"
          >
            <Power className="w-3.5 h-3.5 shrink-0" />
            <span className="hidden xl:inline">Apagar</span>
          </button>

          {/* Botón Móvil Hamburguesa (para teléfonos y tablets) */}
          <button
            type="button"
            onClick={() => setIsMobileMenuOpen(true)}
            className="md:hidden p-2 rounded-lg text-[#5C646D] hover:text-[#222629] hover:bg-white/60 transition-colors cursor-pointer"
            aria-label="Abrir menú de opciones móviles"
          >
            <Menu className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* =================================================================== */}
      {/* DRAWER MÓVIL / TABLET (Full responsive para terminales táctiles) */}
      {/* =================================================================== */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 flex justify-end md:hidden animate-in fade-in duration-200">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setIsMobileMenuOpen(false)}
          />

          {/* Drawer Content */}
          <div className="relative w-4/5 max-w-sm h-full bg-[#13161e] border-l border-slate-800 p-5 overflow-y-auto flex flex-col justify-between shadow-2xl">
            <div className="space-y-4">
              {/* Header del Drawer */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg overflow-hidden border border-blue-400/40">
                    <img src="/src/assets/images/faraday_pos_dark_icon_1794172646016.jpg" alt="Logo de FaradayPOS" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-white">FaradayPOS</h3>
                    <p className="text-[10px] text-slate-400">Panel de Control Rápido</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Selector de Edición Móvil */}
              {onOpenEditionSelector && (
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5 block">
                    Edición Activa
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      onOpenEditionSelector();
                    }}
                    className="w-full flex items-center justify-between p-3 rounded-xl border border-slate-700 bg-[#191d28] text-left cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5">
                      {currentEdition === "bodega" ? (
                        <Store className="w-5 h-5 text-amber-400" />
                      ) : (
                        <ShieldCheck className="w-5 h-5 text-emerald-400" />
                      )}
                      <div>
                        <div className="text-xs font-bold text-white">
                          {currentEdition === "bodega" ? "Edición Bodega y Abasto" : "Edición Fiscal SENIAT"}
                        </div>
                        <div className="text-[10px] text-slate-400">Toca para cambiar de modo</div>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-500" />
                  </button>
                </div>
              )}

              {/* Selector de Modo Operativo Móvil */}
              {onOpenPosModeSelector && (
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5 block">
                    Modo del Punto de Venta
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      onOpenPosModeSelector();
                    }}
                    className="w-full flex items-center justify-between p-3 rounded-xl border border-slate-700 bg-[#191d28] text-left cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5">
                      {posMode === "inventory_only" ? (
                        <ShoppingCart className="w-5 h-5 text-amber-400" />
                      ) : (
                        <Smartphone className="w-5 h-5 text-blue-400" />
                      )}
                      <div>
                        <div className="text-xs font-bold text-white">
                          {posMode === "inventory_only" ? "Solo Inventario & Total" : "Terminal SmartPOS"}
                        </div>
                        <div className="text-[10px] text-slate-400">Configuración de cobro</div>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-500" />
                  </button>
                </div>
              )}

              {/* Usuario Móvil */}
              {onOpenUserManagement && (
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5 block">
                    Usuario / Cajero
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      onOpenUserManagement();
                    }}
                    className="w-full flex items-center justify-between p-3 rounded-xl border border-slate-700 bg-[#191d28] text-left cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5">
                      <UserCheck className="w-5 h-5 text-indigo-400" />
                      <div>
                        <div className="text-xs font-bold text-white">
                          {currentUser?.nombre_completo || "Usuario Cajero"}
                        </div>
                        <div className="text-[10px] text-indigo-300 font-mono">
                          Rol: {currentUser?.rol || "CAJA"} • Cambiar usuario
                        </div>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-500" />
                  </button>
                </div>
              )}

              {/* Enlaces de Negocio y Herramientas Móviles */}
              <div className="space-y-1 pt-2">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1 block">
                  Herramientas
                </label>

                {!isCashier && onOpenClientConfig && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      onOpenClientConfig();
                    }}
                    className="w-full flex items-center gap-3 p-2.5 rounded-lg text-xs text-slate-300 hover:bg-slate-800/80 cursor-pointer"
                  >
                    <Building2 className="w-4 h-4 text-blue-400" />
                    <span>Datos de Mi Negocio</span>
                  </button>
                )}

                {!isCashier && onOpenClientManual && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      onOpenClientManual();
                    }}
                    className="w-full flex items-center gap-3 p-2.5 rounded-lg text-xs text-slate-300 hover:bg-slate-800/80 cursor-pointer"
                  >
                    <BookOpen className="w-4 h-4 text-amber-400" />
                    <span>Manual de Operaciones</span>
                  </button>
                )}

                {onOpenKeyboardShortcuts && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      onOpenKeyboardShortcuts();
                    }}
                    className="w-full flex items-center gap-3 p-2.5 rounded-lg text-xs text-amber-300 hover:bg-slate-800/80 cursor-pointer"
                  >
                    <Keyboard className="w-4 h-4 text-amber-400" />
                    <span>F7 Atajos de Teclado</span>
                  </button>
                )}

                {!isCashier && onOpenNodeJsGuide && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      onOpenNodeJsGuide();
                    }}
                    className="w-full flex items-center gap-3 p-2.5 rounded-lg text-xs text-slate-300 hover:bg-slate-800/80 cursor-pointer"
                  >
                    <Server className="w-4 h-4 text-emerald-400" />
                    <span>Servidor Node.js (Red Local)</span>
                  </button>
                )}

                {onOpenBackupModal && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      onOpenBackupModal();
                    }}
                    className="w-full flex items-center gap-3 p-2.5 rounded-lg text-xs text-slate-300 hover:bg-slate-800/80 cursor-pointer"
                  >
                    <HardDrive className="w-4 h-4 text-indigo-400" />
                    <span>Copias de Seguridad</span>
                  </button>
                )}

                {onOpenLogsModal && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      onOpenLogsModal();
                    }}
                    className="w-full flex items-center gap-3 p-2.5 rounded-lg text-xs text-amber-300 hover:bg-slate-800/80 cursor-pointer"
                  >
                    <Bug className="w-4 h-4 text-amber-400" />
                    <span>Registro de Logs &amp; Bugs</span>
                  </button>
                )}

                {onOpenUpdateModal && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      onOpenUpdateModal();
                    }}
                    className="w-full flex items-center gap-3 p-2.5 rounded-lg text-xs text-indigo-300 hover:bg-slate-800/80 cursor-pointer"
                  >
                    <GitBranch className="w-4 h-4 text-indigo-400" />
                    <span>Actualizaciones (GitHub)</span>
                  </button>
                )}

                {!isCashier && onOpenSubscriptionModal && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      onOpenSubscriptionModal();
                    }}
                    className="w-full flex items-center gap-3 p-2.5 rounded-lg text-xs text-emerald-300 hover:bg-slate-800/80 cursor-pointer"
                  >
                    <CreditCard className="w-4 h-4 text-emerald-400" />
                    <span className="font-semibold">Suscripción & Días Restantes</span>
                  </button>
                )}

                {!isCashier && onOpenTermsModal && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      onOpenTermsModal();
                    }}
                    className="w-full flex items-center gap-3 p-2.5 rounded-lg text-xs text-slate-300 hover:bg-slate-800/80 cursor-pointer"
                  >
                    <Scale className="w-4 h-4 text-slate-400" />
                    <span>Términos & Marco SENIAT</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    setShowShutdownConfirm(true);
                  }}
                  className="w-full flex items-center gap-3 p-2.5 rounded-lg text-xs font-bold text-rose-300 hover:bg-rose-950/50 cursor-pointer mt-2 border border-rose-500/30"
                >
                  <Power className="w-4 h-4 text-rose-400" />
                  <span>Apagar Sistema y Servidor</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* MODAL DE CONFIRMACIÓN PARA APAGAR EL SISTEMA Y SERVIDOR LOCAL       */}
      {/* =================================================================== */}
      {showShutdownConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-150">
          <div className="bg-[#131722] border-2 border-rose-500/40 rounded-2xl max-w-md w-full p-6 shadow-2xl shadow-black/90 space-y-5">
            <div className="flex items-start gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-rose-500/15 border border-rose-500/40 flex items-center justify-center text-rose-400 shrink-0">
                <Power className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-black text-white">
                  ¿Apagar FaradayPOS y el Servidor Local?
                </h3>
                <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                  Se cerrará el servidor local <strong>Node.js (Puerto 3000)</strong> y la ventana de consola en tu computadora.
                </p>
              </div>
            </div>

            <div className="bg-[#0d1017] border border-slate-800 rounded-xl p-3.5 text-[11px] text-slate-400 space-y-1">
              <div className="flex items-center gap-2 text-emerald-300 font-semibold">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>Tus ventas, inventario y cierres están guardados de forma segura.</span>
              </div>
              <p className="pl-6 text-slate-400">
                Para volver a abrir el sistema más tarde, solo haz doble clic en <code className="text-amber-300 font-mono">INICIAR_SISTEMA_NODEJS.bat</code>.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-1">
              <button
                type="button"
                disabled={isShuttingDown}
                onClick={() => setShowShutdownConfirm(false)}
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={isShuttingDown}
                onClick={handleConfirmShutdown}
                className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-black flex items-center gap-2 shadow-lg shadow-rose-950/60 transition-all cursor-pointer disabled:opacity-50"
              >
                <Power className="w-4 h-4" />
                <span>{isShuttingDown ? "Apagando..." : "Sí, Apagar Sistema"}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* PANTALLA FINAL DE SISTEMA APAGADO DE FORMA SEGURA                   */}
      {/* =================================================================== */}
      {isServerStopped && (
        <div className="fixed inset-0 z-[100] min-h-screen bg-[#0b0d13] text-slate-100 flex items-center justify-center p-4">
          <div className="bg-[#121621] border border-slate-800 rounded-3xl max-w-md w-full p-7 text-center shadow-2xl space-y-5">
            <div className="w-16 h-16 rounded-2xl bg-emerald-500/15 border border-emerald-500/40 flex items-center justify-center text-emerald-400 mx-auto shadow-lg shadow-emerald-950/40">
              <Power className="w-8 h-8" />
            </div>
            <div className="space-y-1.5">
              <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider bg-slate-800 text-slate-300 border border-slate-700">
                Servidor Local Detenido • Puerto 3000 Liberado
              </span>
              <h2 className="text-xl font-black text-white">
                Sistema Apagado Correctamente
              </h2>
              <p className="text-xs text-slate-300 leading-relaxed">
                {shutdownMessage}
              </p>
            </div>
            <div className="p-3.5 rounded-xl bg-[#0b0e15] border border-slate-800/90 text-[11px] text-slate-400">
              Ya puedes cerrar esta pestaña del navegador con total seguridad.
            </div>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="w-full py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-colors cursor-pointer"
            >
              Reconectar (si volviste a iniciar el servidor)
            </button>
          </div>
        </div>
      )}
    </header>
  );
};
