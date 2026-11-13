import React, { useState, useEffect, useCallback } from "react";
import { SlidersHorizontal, RotateCcw, GripVertical, Maximize2, Minimize2, Check } from "lucide-react";

export interface ColumnDef {
  key: string;
  label: string;
  defaultWidth: number;
  minWidth?: number;
  maxWidth?: number;
}

export type RowDensity = "compact" | "normal" | "spacious";

interface StoredColumnConfig {
  widths: Record<string, number>;
  wrapText: boolean;
  density: RowDensity;
}

export function useResizableColumns(tableId: string, columns: ColumnDef[]) {
  const storageKey = `smartpos_col_config_${tableId}`;

  const getDefaultWidths = useCallback(() => {
    const map: Record<string, number> = {};
    columns.forEach((c) => {
      map[c.key] = c.defaultWidth;
    });
    return map;
  }, [columns]);

  const [widths, setWidths] = useState<Record<string, number>>(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const parsed: StoredColumnConfig = JSON.parse(raw);
        if (parsed && parsed.widths) {
          return { ...getDefaultWidths(), ...parsed.widths };
        }
      }
    } catch {
      // ignore storage errors
    }
    return getDefaultWidths();
  });

  const [wrapText, setWrapText] = useState<boolean>(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const parsed: StoredColumnConfig = JSON.parse(raw);
        return !!parsed.wrapText;
      }
    } catch {
      // ignore
    }
    return false;
  });

  const [density, setDensity] = useState<RowDensity>(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const parsed: StoredColumnConfig = JSON.parse(raw);
        if (parsed.density) return parsed.density;
      }
    } catch {
      // ignore
    }
    return "normal";
  });

  const [resizingCol, setResizingCol] = useState<string | null>(null);

  useEffect(() => {
    try {
      const payload: StoredColumnConfig = { widths, wrapText, density };
      localStorage.setItem(storageKey, JSON.stringify(payload));
    } catch {
      // ignore
    }
  }, [storageKey, widths, wrapText, density]);

  const setColumnWidth = useCallback(
    (key: string, newWidth: number) => {
      const col = columns.find((c) => c.key === key);
      const minW = col?.minWidth ?? 60;
      const maxW = col?.maxWidth ?? 800;
      const clamped = Math.max(minW, Math.min(maxW, Math.round(newWidth)));
      setWidths((prev) => ({ ...prev, [key]: clamped }));
    },
    [columns]
  );

  const applyPreset = useCallback(
    (factor: number) => {
      const next: Record<string, number> = {};
      columns.forEach((c) => {
        const minW = c.minWidth ?? 60;
        const maxW = c.maxWidth ?? 800;
        next[c.key] = Math.max(minW, Math.min(maxW, Math.round(c.defaultWidth * factor)));
      });
      setWidths(next);
    },
    [columns]
  );

  const resetColumns = useCallback(() => {
    setWidths(getDefaultWidths());
    setWrapText(false);
    setDensity("normal");
  }, [getDefaultWidths]);

  const startResize = useCallback(
    (key: string, e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const startX = e.clientX;
      const startWidth = widths[key] ?? columns.find((c) => c.key === key)?.defaultWidth ?? 140;
      setResizingCol(key);

      const handleMouseMove = (moveEvent: MouseEvent) => {
        const delta = moveEvent.clientX - startX;
        setColumnWidth(key, startWidth + delta);
      };

      const handleMouseUp = () => {
        setResizingCol(null);
        window.removeEventListener("mousemove", handleMouseMove);
        window.removeEventListener("mouseup", handleMouseUp);
      };

      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
    },
    [widths, columns, setColumnWidth]
  );

  const dynamicCss = columns
    .map((c) => {
      const w = widths[c.key] ?? c.defaultWidth;
      return `
        table[data-resizable-table="${tableId}"] th[data-col="${c.key}"],
        table[data-resizable-table="${tableId}"] td[data-col="${c.key}"] {
          width: ${w}px;
          min-width: ${w}px;
          max-width: ${w}px;
          ${wrapText ? "white-space: normal !important; word-break: break-word;" : ""}
        }
      `;
    })
    .join("\n");

  const densityRule =
    density === "compact"
      ? `table[data-resizable-table="${tableId}"] td { padding-top: 0.35rem !important; padding-bottom: 0.35rem !important; }`
      : density === "spacious"
      ? `table[data-resizable-table="${tableId}"] td { padding-top: 0.9rem !important; padding-bottom: 0.9rem !important; }`
      : "";

  return {
    tableId,
    columns,
    widths,
    wrapText,
    setWrapText,
    density,
    setDensity,
    resizingCol,
    setColumnWidth,
    applyPreset,
    resetColumns,
    startResize,
    styleBlock: `${dynamicCss}\n${densityRule}`,
  };
}

interface ResizeHandleProps {
  colKey: string;
  resizingCol: string | null;
  onStartResize: (colKey: string, e: React.MouseEvent) => void;
}

export const ColumnResizeHandle: React.FC<ResizeHandleProps> = ({
  colKey,
  resizingCol,
  onStartResize,
}) => {
  const isResizing = resizingCol === colKey;
  return (
    <div
      onMouseDown={(e) => onStartResize(colKey, e)}
      onClick={(e) => e.stopPropagation()}
      title="Arrastra el borde para ajustar el ancho de esta columna"
      className={`absolute top-0 right-0 h-full w-2.5 cursor-col-resize select-none flex items-center justify-center group/resizer z-20 transition-colors ${
        isResizing ? "bg-amber-500/40" : "hover:bg-blue-500/30"
      }`}
    >
      <div
        className={`h-4 w-0.5 rounded-full transition-colors ${
          isResizing
            ? "bg-amber-400"
            : "bg-slate-700/80 group-hover/resizer:bg-amber-400"
        }`}
      />
    </div>
  );
};

interface ColumnConfiguratorPanelProps {
  controller: ReturnType<typeof useResizableColumns>;
  title?: string;
}

export const ColumnConfiguratorToolbar: React.FC<ColumnConfiguratorPanelProps> = ({
  controller,
  title = "Configurar Tamaño de Columnas",
}) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative">
      <style>{controller.styleBlock}</style>

      <div className="flex items-center justify-between gap-2 px-3 py-1.5 bg-[#13161f] border-b border-slate-800/80 text-[11px]">
        <div className="flex items-center gap-2 text-slate-400 flex-wrap">
          <span className="inline-flex items-center gap-1 text-slate-300 font-semibold">
            <GripVertical className="w-3.5 h-3.5 text-amber-400" />
            <span>Columnas ajustables:</span>
          </span>
          <span className="text-slate-400 hidden sm:inline">
            Arrastra el borde derecho de cualquier encabezado o usa el panel para configurar el tamaño a tu gusto.
          </span>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => setIsOpen((prev) => !prev)}
            className={`px-2.5 py-1 rounded-lg font-semibold flex items-center gap-1.5 border transition-all cursor-pointer ${
              isOpen
                ? "bg-amber-500 text-slate-950 border-amber-400 font-bold shadow"
                : "bg-[#1a1e29] hover:bg-slate-800 text-slate-200 border-slate-700"
            }`}
            title="Abrir configurador de ancho de columnas y altura de filas"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>Configurar Columnas</span>
          </button>

          <button
            type="button"
            onClick={controller.resetColumns}
            className="px-2 py-1 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-slate-700/80 flex items-center gap-1 transition-colors cursor-pointer"
            title="Restablecer tamaños de columna por defecto"
          >
            <RotateCcw className="w-3 h-3 text-slate-400" />
            <span className="hidden md:inline">Restablecer</span>
          </button>
        </div>
      </div>

      {isOpen && (
        <div className="p-3.5 bg-[#11131a] border-b border-slate-800 space-y-3 animate-fadeIn">
          <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-800/80">
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="w-4 h-4 text-amber-400" />
              <span className="text-xs font-bold text-white">{title}</span>
              <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 font-mono">
                Guardado automático
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              {/* Quick Presets */}
              <span className="text-[10px] text-slate-400 mr-1">Tamaño global:</span>
              <button
                type="button"
                onClick={() => controller.applyPreset(0.8)}
                className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-[10px] font-semibold flex items-center gap-1 cursor-pointer"
              >
                <Minimize2 className="w-3 h-3 text-blue-400" />
                <span>Compacto</span>
              </button>
              <button
                type="button"
                onClick={() => controller.applyPreset(1)}
                className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-[10px] font-semibold cursor-pointer"
              >
                Estándar
              </button>
              <button
                type="button"
                onClick={() => controller.applyPreset(1.3)}
                className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-[10px] font-semibold flex items-center gap-1 cursor-pointer"
              >
                <Maximize2 className="w-3 h-3 text-amber-400" />
                <span>Amplio</span>
              </button>

              <div className="h-4 w-px bg-slate-800 mx-1" />

              {/* Row Density */}
              <span className="text-[10px] text-slate-400">Filas:</span>
              {(
                [
                  { id: "compact", label: "Compactas" },
                  { id: "normal", label: "Normales" },
                  { id: "spacious", label: "Espaciosas" },
                ] as const
              ).map((d) => (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => controller.setDensity(d.id)}
                  className={`px-2 py-1 rounded text-[10px] font-semibold cursor-pointer transition-colors ${
                    controller.density === d.id
                      ? "bg-blue-600 text-white"
                      : "bg-slate-800 text-slate-400 hover:text-white"
                  }`}
                >
                  {d.label}
                </button>
              ))}

              <button
                type="button"
                onClick={() => controller.setWrapText((prev) => !prev)}
                className={`px-2 py-1 rounded text-[10px] font-semibold border flex items-center gap-1 cursor-pointer transition-colors ${
                  controller.wrapText
                    ? "bg-amber-500/20 text-amber-300 border-amber-500/40"
                    : "bg-slate-800 text-slate-400 border-slate-700 hover:text-white"
                }`}
              >
                {controller.wrapText && <Check className="w-3 h-3 text-amber-400" />}
                <span>Texto Multilínea</span>
              </button>
            </div>
          </div>

          {/* Individual Column Sliders */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2.5">
            {controller.columns.map((col) => {
              const currentW = controller.widths[col.key] ?? col.defaultWidth;
              const minW = col.minWidth ?? 60;
              const maxW = col.maxWidth ?? 650;
              return (
                <div
                  key={col.key}
                  className="bg-[#171a24] border border-slate-800/90 rounded-xl p-2.5 flex flex-col justify-between gap-1.5"
                >
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-[11px] font-semibold text-slate-200 truncate" title={col.label}>
                      {col.label}
                    </span>
                    <span className="text-[10px] font-mono font-bold text-amber-400 bg-amber-950/50 px-1.5 py-0.5 rounded border border-amber-800/50">
                      {currentW}px
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => controller.setColumnWidth(col.key, currentW - 20)}
                      className="w-5 h-5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 font-mono text-xs flex items-center justify-center cursor-pointer"
                      title="Reducir 20px"
                    >
                      -
                    </button>
                    <input
                      type="range"
                      min={minW}
                      max={maxW}
                      step={5}
                      value={currentW}
                      onChange={(e) => controller.setColumnWidth(col.key, Number(e.target.value))}
                      className="flex-1 accent-amber-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                    />
                    <button
                      type="button"
                      onClick={() => controller.setColumnWidth(col.key, currentW + 20)}
                      className="w-5 h-5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 font-mono text-xs flex items-center justify-center cursor-pointer"
                      title="Aumentar 20px"
                    >
                      +
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
