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
  const isCashier = currentUser?.rol === "CAJERO";

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
    <header className="sticky top-0 z-40 w-full border-b border-slate-800/80 bg-[#11141a]/95 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 h-16 flex items-center justify-between gap-3">
        {/* =================================================================== */}
        {/* ZONA 1 (IZQUIERDA): Marca, Edición y Estado de Conectividad */}
        {/* =================================================================== */}
        <div className="flex items-center gap-3 shrink-0">
          {/* Logo del Sistema */}
          <div className="w-10 h-10 rounded-xl overflow-hidden border border-blue-500/30 bg-[#161a24] p-0.5 shadow-sm shadow-blue-950/40 shrink-0">
            <img
              src="/app_icon.jpg"
              alt="Logo del Sistema"
              className="w-full h-full object-cover rounded-[9px]"
              referrerPolicy="no-referrer"
            />
          </div>

          {/* Nombre y Selector de Edición Directo */}
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-sm sm:text-base text-white tracking-tight">
                POS Venezuela
              </span>
              <span className="text-slate-600 hidden sm:inline" aria-hidden="true">·</span>

              {/* Botón interactivo de cambio de Edición */}
              {onOpenEditionSelector && (
                <button
                  type="button"
                  id="btn-switch-edition"
                  onClick={onOpenEditionSelector}
                  title="Cambiar edición del sistema: Bodega o Fiscal SENIAT"
                  className="flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-md transition-colors border border-transparent hover:border-slate-700 hover:bg-slate-800/60 focus:outline-none focus-visible:ring-1 focus-visible:ring-amber-400"
                >
                  {currentEdition === "bodega" ? (
                    <>
                      <Store className="w-3.5 h-3.5 text-amber-400" />
                      <span className="text-amber-300">Bodega & Abasto</span>
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-emerald-300">Fiscal SENIAT</span>
                    </>
                  )}
                  <ChevronDown className="w-3 h-3 text-slate-500 ml-0.5" />
                </button>
              )}
            </div>

            {/* Subtítulo de estado limpio y unboxed */}
            <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
              <button
                type="button"
                onClick={() => setIsOfflineMode(!isOfflineMode)}
                className="flex items-center gap-1 hover:text-slate-200 transition-colors cursor-pointer group"
                title="Clic para alternar entre modo en línea y modo local autónomo"
              >
                <span
                  className={`w-2 h-2 rounded-full transition-colors ${
                    isOfflineMode
                      ? "bg-amber-400 shadow-[0_0_6px_rgba(251,191,36,0.6)]"
                      : "bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.6)] animate-pulse"
                  }`}
                  aria-hidden="true"
                />
                <span className="text-[10px] font-medium text-slate-400 group-hover:text-slate-200">
                  {isOfflineMode ? "Modo Local (Offline)" : "Servidor Local Activo"}
                </span>
              </button>
              <span className="text-slate-700 hidden sm:inline" aria-hidden="true">/</span>
              <span className="text-[10px] text-slate-500 font-mono hidden sm:inline">
                Puerto :3000
              </span>
            </div>
          </div>
        </div>

        {/* =================================================================== */}
        {/* ZONA 2 (CENTRAL): Widget Financiero de Tasa Oficial BCV */}
        {/* =================================================================== */}
        <div className="flex items-center">
          <div className="flex items-center gap-2 bg-[#161a22] border border-amber-500/25 px-2.5 sm:px-3 py-1.5 rounded-xl shadow-inner shadow-black/40">
            <div className="flex items-center gap-1.5">
              <div className="w-6 h-6 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center shrink-0">
                <DollarSign className="w-3.5 h-3.5 text-amber-400" />
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Tasa BCV
                  </span>
                  {bcvFechaValor && (
                    <span className="text-[9px] text-amber-400/80 font-mono hidden md:inline">
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
                      className="w-20 bg-slate-900 border border-amber-500 text-white text-xs font-mono tabular-nums px-1.5 py-0.5 rounded focus:outline-none focus:ring-1 focus:ring-amber-400"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleSaveBcv();
                        if (e.key === "Escape") setIsEditingBcv(false);
                      }}
                    />
                    <button
                      id="btn-save-bcv"
                      onClick={handleSaveBcv}
                      className="p-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded transition-colors cursor-pointer"
                      title="Guardar Tasa Manual"
                    >
                      <Check className="w-3 h-3" />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-baseline gap-1.5">
                    <span className="font-mono tabular-nums font-bold text-amber-300 text-sm sm:text-base leading-none">
                      Bs. {bcvRate.toFixed(2)}
                    </span>
                    {bcvEurRate && bcvEurRate > 0 && (
                      <span className="text-[10px] text-slate-400 font-mono tabular-nums hidden lg:inline">
                        € {bcvEurRate.toFixed(2)}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Acciones del BCV: Sincronizar y Editar */}
            {!isEditingBcv && (
              <div className="flex items-center gap-0.5 ml-1 border-l border-slate-800 pl-1.5">
                {onRefreshBcv && (
                  <button
                    id="btn-sync-bcv"
                    onClick={onRefreshBcv}
                    disabled={isLoadingBcv}
                    className="p-1 text-slate-400 hover:text-amber-300 disabled:opacity-50 rounded transition-colors cursor-pointer"
                    title="Actualizar tasa oficial en tiempo real con DolarApi / BCV"
                  >
                    <RefreshCw
                      className={`w-3.5 h-3.5 ${isLoadingBcv ? "animate-spin text-amber-400" : ""}`}
                    />
                  </button>
                )}
                <button
                  id="btn-edit-bcv"
                  onClick={() => setIsEditingBcv(true)}
                  className="p-1 text-slate-400 hover:text-amber-300 rounded transition-colors cursor-pointer"
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
        <div className="flex items-center gap-2">
          {/* Selector de Modo Operativo (Solo Inventario vs SmartPOS) */}
          {onOpenPosModeSelector && (
            <button
              id="btn-pos-mode"
              onClick={onOpenPosModeSelector}
              title="Cambiar Modo Operativo: Conectar terminal SmartPOS o Totalizar en Pantalla"
              className={`hidden md:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                posMode === "inventory_only"
                  ? "bg-[#181a20] text-slate-300 border-slate-700 hover:border-amber-500/50 hover:text-amber-300"
                  : "bg-blue-950/40 text-blue-300 border-blue-500/40 hover:bg-blue-900/50"
              }`}
            >
              {posMode === "inventory_only" ? (
                <>
                  <ShoppingCart className="w-3.5 h-3.5 text-amber-400" />
                  <span className="font-mono">Solo Inventario</span>
                </>
              ) : (
                <>
                  <Smartphone className="w-3.5 h-3.5 text-blue-400" />
                  <span className="font-mono">SmartPOS</span>
                </>
              )}
              <SlidersHorizontal className="w-3 h-3 text-slate-500 ml-0.5" />
            </button>
          )}

          {/* Usuario / Cajero Activo */}
          {onOpenUserManagement && (
            <button
              id="btn-user-management"
              onClick={onOpenUserManagement}
              title={`Usuario Activo: ${currentUser?.nombre_completo || 'Usuario'} (${currentUser?.rol || 'CAJERO'}). Clic para cambiar cajero.`}
              className="hidden lg:flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium border border-slate-800 bg-[#161922] hover:bg-slate-800/60 text-slate-300 hover:text-white transition-all cursor-pointer"
            >
              <div className="w-5 h-5 rounded-full bg-indigo-600/30 border border-indigo-400/40 flex items-center justify-center text-[10px] font-bold text-indigo-300">
                {(currentUser?.nombre_completo || currentUser?.username || "U")[0].toUpperCase()}
              </div>
              <span className="font-mono text-xs truncate max-w-[80px]">
                {currentUser?.username || "Cajero"}
              </span>
              <span className={`text-[9px] px-1 rounded font-mono uppercase font-bold ${
                currentUser?.rol === "ADMIN"
                  ? "bg-blue-900/60 text-blue-300 border border-blue-700/50"
                  : "bg-emerald-900/60 text-emerald-300 border border-emerald-700/50"
              }`}>
                {currentUser?.rol || "CAJA"}
              </span>
            </button>
          )}

          {/* Botón de Atajos de Teclado */}
          {onOpenKeyboardShortcuts && (
            <button
              type="button"
              onClick={onOpenKeyboardShortcuts}
              title="Ver Atajos de Teclado Rápido (F7 / Alt + H)"
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold border border-slate-700/80 bg-[#161a22] hover:bg-slate-800 text-amber-400 hover:text-amber-300 transition-all cursor-pointer"
            >
              <Keyboard className="w-4 h-4 text-amber-400" />
              <span className="hidden xl:inline font-mono">F7 Atajos</span>
            </button>
          )}
          <div className="relative" ref={toolsMenuRef}>
            <button
              id="btn-tools-menu"
              type="button"
              onClick={() => setIsToolsOpen(!isToolsOpen)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                isToolsOpen
                  ? "bg-blue-600 text-white border-blue-500 shadow-md shadow-blue-600/30"
                  : "bg-[#161a22] text-slate-300 border-slate-700/80 hover:bg-slate-800 hover:text-white"
              }`}
              title="Ajustes, respaldos, servidor y utilidades del sistema"
            >
              <Settings2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Herramientas</span>
              <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${isToolsOpen ? "rotate-180" : ""}`} />
            </button>

            {/* Dropdown Panel */}
            {isToolsOpen && (
              <div className="absolute right-0 mt-2 w-72 rounded-xl bg-[#141720] border border-slate-800 shadow-2xl shadow-black/80 py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
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
              </div>
            )}
          </div>

          {/* Botón Móvil Hamburguesa (para teléfonos y tablets) */}
          <button
            type="button"
            onClick={() => setIsMobileMenuOpen(true)}
            className="md:hidden p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/60 transition-colors cursor-pointer"
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
                  <div className="w-8 h-8 rounded-lg overflow-hidden border border-blue-500/40">
                    <img src="/app_icon.jpg" alt="Logo" className="w-full h-full object-cover" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-white">POS Venezuela</h3>
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
              </div>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
