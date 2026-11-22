import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  Search,
  X,
  ShoppingCart,
  BookOpen,
  DollarSign,
  Tag,
  FileText,
  Package,
  BarChart3,
  Volume2,
  VolumeX,
  Banknote,
  ArrowRight,
  Command,
  UserCheck,
  Sparkles,
} from "lucide-react";
import { Producto, FiadoCliente } from "../types";
import { getStoredFiados } from "../mockDb";

export type MainTabTarget =
  | "bodega"
  | "pos"
  | "inventory"
  | "dashboard"
  | "sales_book"
  | "movements"
  | "invoice_ai";

export type BodegaSubTabTarget = "mostrador" | "fiados" | "caja" | "etiquetas";

interface CommandPaletteModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: Producto[];
  bcvRate: number;
  soundEnabled: boolean;
  onToggleSound: () => void;
  onNavigateCommand: (
    mainTab: MainTabTarget,
    bodegaSubTab?: BodegaSubTabTarget,
    extraPayload?: {
      openRateEditor?: boolean;
      openAvanceModal?: boolean;
      productToSelect?: Producto;
      vecinoSearch?: string;
    },
  ) => void;
}

interface PaletteItem {
  id: string;
  category:
    | "Acciones Rápidas"
    | "Vecinos (Libreta de Fiados)"
    | "Productos en Mostrador";
  title: string;
  subtitle: string;
  badge?: string;
  badgeColor?: "green" | "amber" | "red" | "violet" | "teal";
  icon: React.ReactNode;
  onSelect: () => void;
}

export const CommandPaletteModal: React.FC<CommandPaletteModalProps> = ({
  isOpen,
  onClose,
  products,
  bcvRate,
  soundEnabled,
  onToggleSound,
  onNavigateCommand,
}) => {
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const fiadosList: FiadoCliente[] = useMemo(() => {
    if (!isOpen) return [];
    try {
      return getStoredFiados();
    } catch {
      return [];
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      setQuery("");
      setSelectedIndex(0);
      setTimeout(() => {
        inputRef.current?.focus();
      }, 30);
    }
  }, [isOpen]);

  const items: PaletteItem[] = useMemo(() => {
    const q = query.trim().toLowerCase();

    const quickActions: PaletteItem[] = [
      {
        id: "act-mostrador",
        category: "Acciones Rápidas",
        title: "Ir al Mostrador de Ventas",
        subtitle: "Cobrar productos, escanear código de barras o pausar carritos",
        badge: "POS",
        badgeColor: "amber",
        icon: <ShoppingCart className="w-4 h-4 text-[#9A6310]" />,
        onSelect: () => {
          onNavigateCommand("bodega", "mostrador");
          onClose();
        },
      },
      {
        id: "act-tasa",
        category: "Acciones Rápidas",
        title: `Cambiar / Actualizar Tasa BCV (Actual: Bs. ${bcvRate.toFixed(2)})`,
        subtitle: "Editar tasa oficial del día o sincronizar con BCV en el encabezado",
        badge: "Tasa BCV",
        badgeColor: "teal",
        icon: <DollarSign className="w-4 h-4 text-[#248F78]" />,
        onSelect: () => {
          onNavigateCommand("bodega", "mostrador", { openRateEditor: true });
          onClose();
        },
      },
      {
        id: "act-avance",
        category: "Acciones Rápidas",
        title: "Dar Avance de Efectivo",
        subtitle: "Entregar efectivo en Bs. y cobrar por Punto / Pago Móvil con comisión",
        badge: "Avance",
        badgeColor: "teal",
        icon: <Banknote className="w-4 h-4 text-[#248F78]" />,
        onSelect: () => {
          onNavigateCommand("bodega", "mostrador", { openAvanceModal: true });
          onClose();
        },
      },
      {
        id: "act-cierre",
        category: "Acciones Rápidas",
        title: "Cierre y Arqueo de Caja del Día",
        subtitle: "Cuadrar efectivo en dólares, bolívares, pago móvil y punto de venta",
        badge: "Caja",
        badgeColor: "amber",
        icon: <DollarSign className="w-4 h-4 text-[#9A6310]" />,
        onSelect: () => {
          onNavigateCommand("bodega", "caja");
          onClose();
        },
      },
      {
        id: "act-fiados",
        category: "Acciones Rápidas",
        title: "Abrir Libreta de Fiados (Cuentas por Cobrar)",
        subtitle: "Consultar saldos de vecinos, historial de cargos y registrar abonos",
        badge: "Fiados",
        badgeColor: "violet",
        icon: <BookOpen className="w-4 h-4 text-[#7B61C9]" />,
        onSelect: () => {
          onNavigateCommand("bodega", "fiados");
          onClose();
        },
      },
      {
        id: "act-etiquetas",
        category: "Acciones Rápidas",
        title: "Anaquel y Habladores de Precio",
        subtitle: "Imprimir etiquetas actualizadas en $ y Bs. para los estantes",
        badge: "Anaquel",
        badgeColor: "amber",
        icon: <Tag className="w-4 h-4 text-[#9A6310]" />,
        onSelect: () => {
          onNavigateCommand("bodega", "etiquetas");
          onClose();
        },
      },
      {
        id: "act-libro",
        category: "Acciones Rápidas",
        title: "Libro de Ventas y Facturas Emitidas",
        subtitle: "Revisar historial de tickets, reimprimir o consultar ventas del día",
        badge: "Historial",
        badgeColor: "teal",
        icon: <FileText className="w-4 h-4 text-[#248F78]" />,
        onSelect: () => {
          onNavigateCommand("sales_book");
          onClose();
        },
      },
      {
        id: "act-catalogo",
        category: "Acciones Rápidas",
        title: "Catálogo e Inventario de Productos",
        subtitle: "Agregar nuevos productos, ajustar stock, costos y márgenes",
        badge: "Catálogo",
        badgeColor: "violet",
        icon: <Package className="w-4 h-4 text-[#7B61C9]" />,
        onSelect: () => {
          onNavigateCommand("inventory");
          onClose();
        },
      },
      {
        id: "act-dashboard",
        category: "Acciones Rápidas",
        title: "Dashboard y Rendimiento del Negocio",
        subtitle: "Ver métricas de ganancias, productos más vendidos y flujo de caja",
        badge: "Reportes",
        badgeColor: "teal",
        icon: <BarChart3 className="w-4 h-4 text-[#248F78]" />,
        onSelect: () => {
          onNavigateCommand("dashboard");
          onClose();
        },
      },
      {
        id: "act-sound",
        category: "Acciones Rápidas",
        title: soundEnabled
          ? "Silenciar Sonidos del Mostrador 🔇"
          : "Activar Sonidos de Confirmación 🔊",
        subtitle: "Controlar feedback auditivo al escanear, alertar stock y cobrar",
        badge: soundEnabled ? "Sonido ON" : "Silencio",
        badgeColor: soundEnabled ? "green" : "red",
        icon: soundEnabled ? (
          <Volume2 className="w-4 h-4 text-[#248F78]" />
        ) : (
          <VolumeX className="w-4 h-4 text-[#B42E46]" />
        ),
        onSelect: () => {
          onToggleSound();
          onClose();
        },
      },
    ];

    const filteredActions = q
      ? quickActions.filter(
          (a) =>
            a.title.toLowerCase().includes(q) ||
            a.subtitle.toLowerCase().includes(q) ||
            (a.badge && a.badge.toLowerCase().includes(q)),
        )
      : quickActions.slice(0, 6);

    const matchingVecinos: PaletteItem[] = fiadosList
      .filter((v) => {
        if (!q) return v.saldo_deuda_usd > 0;
        return (
          v.nombre.toLowerCase().includes(q) ||
          (v.direccion && v.direccion.toLowerCase().includes(q)) ||
          (v.telefono && v.telefono.toLowerCase().includes(q)) ||
          "fiado libreta vecino deuda".includes(q)
        );
      })
      .slice(0, 5)
      .map((v) => ({
        id: `vecino-${v.id}`,
        category: "Vecinos (Libreta de Fiados)",
        title: v.nombre,
        subtitle: `Deuda: $${v.saldo_deuda_usd.toFixed(2)} (Bs. ${(v.saldo_deuda_usd * bcvRate).toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}) ${v.direccion ? `• ${v.direccion}` : ""}`,
        badge:
          v.saldo_deuda_usd > 0
            ? `Debe $${v.saldo_deuda_usd.toFixed(2)}`
            : "Al Día",
        badgeColor: v.saldo_deuda_usd > 0 ? "red" : "green",
        icon: <UserCheck className="w-4 h-4 text-[#7B61C9]" />,
        onSelect: () => {
          onNavigateCommand("bodega", "fiados", { vecinoSearch: v.nombre });
          onClose();
        },
      }));

    const matchingProducts: PaletteItem[] = (
      q
        ? products.filter(
            (p) =>
              p.nombre.toLowerCase().includes(q) ||
              (p.codigo_barras && p.codigo_barras.toLowerCase().includes(q)) ||
              (p.categoria_nombre &&
                p.categoria_nombre.toLowerCase().includes(q)),
          )
        : products.slice(0, 5)
    )
      .slice(0, 8)
      .map((p) => {
        const minStock = p.stock_minimo || 5;
        const isOut = p.stock_actual <= 0;
        const isLow = !isOut && p.stock_actual <= minStock;
        return {
          id: `prod-${p.id}`,
          category: "Productos en Mostrador",
          title: p.nombre,
          subtitle: `$${p.precio_venta.toFixed(2)} • Bs. ${(p.precio_venta * bcvRate).toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${p.categoria_nombre ? `• ${p.categoria_nombre}` : ""}`,
          badge: isOut
            ? "Agotado (0)"
            : isLow
              ? `Stock Bajo: ${p.stock_actual}`
              : `Stock: ${p.stock_actual}`,
          badgeColor: isOut ? "red" : isLow ? "amber" : "green",
          icon: <Sparkles className="w-4 h-4 text-[#9A6310]" />,
          onSelect: () => {
            onNavigateCommand("bodega", "mostrador", { productToSelect: p });
            onClose();
          },
        };
      });

    return [...filteredActions, ...matchingVecinos, ...matchingProducts];
  }, [
    query,
    bcvRate,
    soundEnabled,
    fiadosList,
    products,
    onNavigateCommand,
    onClose,
    onToggleSound,
  ]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) =>
          items.length > 0 ? (prev + 1) % items.length : 0,
        );
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) =>
          items.length > 0 ? (prev - 1 + items.length) % items.length : 0,
        );
      } else if (e.key === "Enter" && items[selectedIndex]) {
        e.preventDefault();
        items[selectedIndex].onSelect();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, items, selectedIndex, onClose]);

  if (!isOpen) return null;

  const badgeStyles: Record<string, string> = {
    green: "bg-[#248F78]/15 text-[#248F78] border-[#248F78]/35",
    amber: "bg-[#E09F3E]/20 text-[#9A6310] border-[#E09F3E]/45",
    red: "bg-[#B42E46]/15 text-[#B42E46] border-[#B42E46]/35",
    violet: "bg-[#7B61C9]/15 text-[#7B61C9] border-[#7B61C9]/35",
    teal: "bg-[#248F78]/15 text-[#248F78] border-[#248F78]/35",
  };

  return (
    <div
      className="fixed inset-0 z-[120] flex items-start justify-center pt-14 sm:pt-20 p-4 bg-black/55 backdrop-blur-sm animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl rounded-2xl border border-white/75 bg-[#EEE8DB]/95 shadow-2xl overflow-hidden backdrop-blur-xl faraday-command-palette"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Barra de Búsqueda Spotlight */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-black/10 bg-white/55">
          <div className="w-8 h-8 rounded-lg bg-[#E09F3E]/20 border border-[#E09F3E]/40 flex items-center justify-center text-[#9A6310] shrink-0">
            <Command className="w-4 h-4" />
          </div>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder='Escribe "tasa", "cierre", "doña rosa", "harina" o escanea...'
            className="w-full bg-transparent text-[#222629] placeholder-[#5C646D] text-sm sm:text-base font-medium focus:outline-none"
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              className="p-1 text-[#5C646D] hover:text-[#222629] rounded-md"
              title="Limpiar"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={onClose}
            className="px-2 py-1 text-[10px] font-mono font-bold uppercase tracking-wider rounded bg-black/5 text-[#5C646D] border border-black/10 hover:text-[#222629] shrink-0"
          >
            ESC
          </button>
        </div>

        {/* Lista de Resultados */}
        <div className="max-h-[62vh] overflow-y-auto p-2.5 space-y-1 custom-scrollbar">
          {items.length === 0 ? (
            <div className="py-10 text-center text-[#5C646D]">
              <Search className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm font-semibold">
                No se encontraron acciones, vecinos ni productos para "{query}"
              </p>
              <p className="text-xs opacity-75 mt-1">
                Prueba escribiendo "tasa", "cierre", "avance", el nombre de un cliente o un producto.
              </p>
            </div>
          ) : (
            items.map((item, idx) => {
              const isSelected = idx === selectedIndex;
              const showCategoryHeader =
                idx === 0 || items[idx - 1].category !== item.category;

              return (
                <React.Fragment key={item.id}>
                  {showCategoryHeader && (
                    <div className="px-3 pt-2.5 pb-1 text-[10px] font-bold uppercase tracking-widest text-[#5C646D]">
                      {item.category}
                    </div>
                  )}
                  <button
                    type="button"
                    onMouseEnter={() => setSelectedIndex(idx)}
                    onClick={item.onSelect}
                    className={`w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl text-left transition-all cursor-pointer ${
                      isSelected
                        ? "bg-[#E09F3E]/25 border border-[#E09F3E]/55 shadow-sm"
                        : "hover:bg-white/60 border border-transparent"
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-white/75 border border-black/10 flex items-center justify-center shrink-0 shadow-xs">
                        {item.icon}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-[#222629] truncate">
                          {item.title}
                        </p>
                        <p className="text-xs text-[#5C646D] truncate">
                          {item.subtitle}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {item.badge && (
                        <span
                          className={`px-2 py-0.5 text-[10px] font-bold rounded-md border ${
                            badgeStyles[item.badgeColor || "amber"]
                          }`}
                        >
                          {item.badge}
                        </span>
                      )}
                      <ArrowRight
                        className={`w-4 h-4 transition-transform ${
                          isSelected
                            ? "text-[#9A6310] translate-x-0.5"
                            : "text-[#5C646D] opacity-40"
                        }`}
                      />
                    </div>
                  </button>
                </React.Fragment>
              );
            })
          )}
        </div>

        {/* Pie con atajos de teclado */}
        <div className="px-4 py-2.5 border-t border-black/10 bg-white/50 flex flex-wrap items-center justify-between gap-2 text-[11px] text-[#5C646D]">
          <div className="flex items-center gap-3">
            <span>
              <strong className="font-mono text-[#222629]">↑↓</strong> Navegar
            </span>
            <span>
              <strong className="font-mono text-[#222629]">Enter</strong> Ejecutar / Agregar
            </span>
            <span>
              <strong className="font-mono text-[#222629]">Esc</strong> Cerrar
            </span>
          </div>
          <span className="font-mono text-[10px] text-[#9A6310] font-semibold">
            Atajo Rápido: Ctrl + K o F2
          </span>
        </div>
      </div>
    </div>
  );
};
