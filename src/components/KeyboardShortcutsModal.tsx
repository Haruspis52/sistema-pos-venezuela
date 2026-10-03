import React from "react";
import {
  Keyboard,
  X,
  ShoppingCart,
  Search,
  Zap,
  ShieldCheck,
  HardDrive,
  Users,
  LayoutGrid,
  FileText,
  DollarSign,
  HelpCircle,
} from "lucide-react";

interface KeyboardShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const KeyboardShortcutsModal: React.FC<KeyboardShortcutsModalProps> = ({
  isOpen,
  onClose,
}) => {
  if (!isOpen) return null;

  const shortcuts = [
    {
      category: "🛒 Mostrador & Ventas (Caja)",
      icon: <ShoppingCart className="w-4 h-4 text-amber-400" />,
      items: [
        { keys: ["F1", "Ctrl + F"], description: "Buscar producto en inventario / mostrador" },
        { keys: ["F10", "Alt + C"], description: "Procesar cobro / Abrir ventana de pago" },
        { keys: ["Esc"], description: "Cerrar ventanas / Cancelar o limpiar búsqueda" },
        { keys: ["Alt + X"], description: "Vaciar carrito de compras de la sesión" },
      ],
    },
    {
      category: "🚀 Navegación Rápida entre Módulos",
      icon: <LayoutGrid className="w-4 h-4 text-blue-400" />,
      items: [
        { keys: ["F2", "Alt + 1"], description: "Ir a Mostrador / Bodega & Abasto" },
        { keys: ["F3", "Alt + 2"], description: "Ir a Catálogo de Productos & Precios" },
        { keys: ["F4", "Alt + 3"], description: "Ir a Dashboard Analítico & Reportes" },
        { keys: ["F5", "Alt + 4"], description: "Ir a Libro de Ventas Fiscal / Kardex" },
      ],
    },
    {
      category: "🛡️ Seguridad & Herramientas",
      icon: <ShieldCheck className="w-4 h-4 text-indigo-400" />,
      items: [
        { keys: ["F8", "Alt + U"], description: "Control de Usuarios, Roles & Cambio de Cajero" },
        { keys: ["F9", "Alt + B"], description: "Copias de Seguridad (Respaldos en carpeta local)" },
        { keys: ["Alt + L", "F11"], description: "Registro de Logs & Diagnóstico de Bugs" },
        { keys: ["F7", "Shift + ?"], description: "Abrir esta guía de atajos de teclado" },
      ],
    },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200 overflow-y-auto"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-[#12141c] border border-slate-700/80 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh] my-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-amber-950/60 via-[#181a24] to-[#12141c] p-5 border-b border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-600 flex items-center justify-center text-slate-950 shadow-lg shadow-amber-900/30 shrink-0">
              <Keyboard className="w-6 h-6 text-slate-950" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white tracking-tight">
                  Atajos de Teclado para Cobro Rápido
                </h2>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-amber-950 text-amber-300 border border-amber-700/60 font-mono">
                  POS Directo
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Utiliza las teclas de función (F1 - F10) y combinaciones Alt/Ctrl para agilizar las ventas en caja.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 min-h-0">
          {shortcuts.map((group, idx) => (
            <div key={idx} className="space-y-3">
              <div className="flex items-center gap-2 border-b border-slate-800 pb-1.5">
                {group.icon}
                <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider font-mono">
                  {group.category}
                </h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {group.items.map((item, itemIdx) => (
                  <div
                    key={itemIdx}
                    className="bg-[#161822] border border-slate-800 rounded-2xl p-3 flex items-center justify-between gap-3 hover:border-slate-700 transition-all"
                  >
                    <span className="text-xs text-slate-300 font-medium leading-snug">
                      {item.description}
                    </span>

                    <div className="flex items-center gap-1 shrink-0">
                      {item.keys.map((k, kIdx) => (
                        <kbd
                          key={kIdx}
                          className="px-2 py-1 bg-[#0d0f17] border border-slate-700 text-amber-300 font-mono font-bold text-[11px] rounded-lg shadow-inner shadow-black/60"
                        >
                          {k}
                        </kbd>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}

          {/* Tips Box */}
          <div className="bg-[#161822] border border-amber-500/30 rounded-2xl p-4 text-xs space-y-1.5 text-slate-300">
            <div className="flex items-center gap-2 text-amber-400 font-bold">
              <Zap className="w-4 h-4" />
              <span>Modo Mostrador Táctil + Teclado Físico:</span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              En cualquier momento puedes presionar <kbd className="px-1.5 py-0.5 bg-slate-900 border border-slate-700 text-amber-300 rounded font-mono text-[10px]">F1</kbd> para enfocar la barra de búsqueda e ingresar el código de barras o nombre del producto, y luego presionar <kbd className="px-1.5 py-0.5 bg-slate-900 border border-slate-700 text-amber-300 rounded font-mono text-[10px]">F10</kbd> para proceder al cobro instantáneo.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-[#161822] px-6 py-3.5 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400 shrink-0">
          <span>Presione <kbd className="px-1.5 py-0.5 bg-slate-900 border border-slate-700 text-slate-300 rounded font-mono">Esc</kbd> para cerrar</span>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl transition-all cursor-pointer"
          >
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
};
