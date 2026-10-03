import React, { useState, useRef, useEffect } from "react";
import {
  Calendar,
  ChevronDown,
  X,
  Check,
  CalendarRange,
  Clock,
  RotateCcw,
} from "lucide-react";

export type DatePreset = "all" | "today" | "yesterday" | "7d" | "30d" | "this_month" | "last_month" | "custom";

export interface DateRangeValue {
  preset: DatePreset;
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
}

interface DateRangePickerProps {
  value: DateRangeValue;
  onChange: (value: DateRangeValue) => void;
  className?: string;
}

export const DateRangePicker: React.FC<DateRangePickerProps> = ({
  value,
  onChange,
  className = "",
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [tempStart, setTempStart] = useState(value.startDate);
  const [tempEnd, setTempEnd] = useState(value.endDate);
  const containerRef = useRef<HTMLDivElement>(null);

  // Sync temp dates if external value changes
  useEffect(() => {
    setTempStart(value.startDate);
    setTempEnd(value.endDate);
  }, [value.startDate, value.endDate]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  // Format date helper to YYYY-MM-DD
  const formatDate = (d: Date): string => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const getPresetRange = (preset: DatePreset): { startDate: string; endDate: string } => {
    const now = new Date();
    const todayStr = formatDate(now);

    switch (preset) {
      case "today":
        return { startDate: todayStr, endDate: todayStr };
      case "yesterday": {
        const yest = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        const yestStr = formatDate(yest);
        return { startDate: yestStr, endDate: yestStr };
      }
      case "7d": {
        const d7 = new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000);
        return { startDate: formatDate(d7), endDate: todayStr };
      }
      case "30d": {
        const d30 = new Date(now.getTime() - 29 * 24 * 60 * 60 * 1000);
        return { startDate: formatDate(d30), endDate: todayStr };
      }
      case "this_month": {
        const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
        return { startDate: formatDate(firstDay), endDate: todayStr };
      }
      case "last_month": {
        const firstDayLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const lastDayLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);
        return {
          startDate: formatDate(firstDayLastMonth),
          endDate: formatDate(lastDayLastMonth),
        };
      }
      case "all":
      default:
        return { startDate: "", endDate: "" };
    }
  };

  const handleSelectPreset = (preset: DatePreset) => {
    if (preset === "custom") {
      // Keep open for user to pick dates
      return;
    }
    const range = getPresetRange(preset);
    onChange({
      preset,
      startDate: range.startDate,
      endDate: range.endDate,
    });
    setTempStart(range.startDate);
    setTempEnd(range.endDate);
    setIsOpen(false);
  };

  const handleApplyCustom = () => {
    if (!tempStart && !tempEnd) {
      handleSelectPreset("all");
      return;
    }
    // Swap if end is earlier than start
    let start = tempStart;
    let end = tempEnd;
    if (start && end && start > end) {
      const temp = start;
      start = end;
      end = temp;
    }
    onChange({
      preset: "custom",
      startDate: start,
      endDate: end || start,
    });
    setIsOpen(false);
  };

  const handleReset = () => {
    handleSelectPreset("all");
  };

  // Label display
  const getButtonLabel = (): string => {
    switch (value.preset) {
      case "all":
        return "Histórico completo";
      case "today":
        return "Hoy";
      case "yesterday":
        return "Ayer";
      case "7d":
        return "Últimos 7 días";
      case "30d":
        return "Últimos 30 días";
      case "this_month":
        return "Este mes";
      case "last_month":
        return "Mes anterior";
      case "custom":
        if (value.startDate && value.endDate) {
          if (value.startDate === value.endDate) {
            return value.startDate;
          }
          return `${value.startDate} al ${value.endDate}`;
        }
        if (value.startDate) return `Desde ${value.startDate}`;
        if (value.endDate) return `Hasta ${value.endDate}`;
        return "Rango personalizado";
      default:
        return "Filtrar por fecha";
    }
  };

  return (
    <div className={`relative ${className}`} ref={containerRef} id="dashboard-date-range-picker">
      {/* Trigger Button */}
      <div className="flex items-center gap-1">
        <button
          type="button"
          id="btn-open-date-picker"
          onClick={() => setIsOpen(!isOpen)}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-medium transition-all border ${
            value.preset !== "all"
              ? "bg-blue-600/20 text-blue-300 border-blue-500/40 shadow-sm"
              : "bg-[#12141a] text-slate-300 hover:text-white border-slate-800 hover:border-slate-700"
          }`}
        >
          <CalendarRange className="w-3.5 h-3.5 text-blue-400 shrink-0" />
          <span className="truncate max-w-[150px] sm:max-w-[190px]">{getButtonLabel()}</span>
          <ChevronDown
            className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 shrink-0 ${
              isOpen ? "rotate-180" : ""
            }`}
          />
        </button>

        {/* Clear Filter button if active filter */}
        {value.preset !== "all" && (
          <button
            type="button"
            id="btn-clear-date-filter"
            title="Restablecer al histórico completo"
            onClick={handleReset}
            className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-slate-200 text-xs border border-slate-700 transition-colors"
          >
            <X className="w-3 h-3" />
          </button>
        )}
      </div>

      {/* Dropdown Panel */}
      {isOpen && (
        <div className="absolute right-0 sm:right-auto sm:left-0 mt-2 w-[310px] sm:w-[360px] bg-[#14161f] border border-slate-700/80 rounded-2xl shadow-2xl z-50 p-3.5 backdrop-blur-md text-xs animate-in fade-in zoom-in-95 duration-150">
          <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-slate-800">
            <div className="flex items-center gap-1.5 text-white font-semibold text-xs">
              <Calendar className="w-3.5 h-3.5 text-blue-400" />
              <span>Intervalo de Fechas del Dashboard</span>
            </div>
            {value.preset !== "all" && (
              <button
                type="button"
                onClick={handleReset}
                className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-slate-200 font-medium"
              >
                <RotateCcw className="w-2.5 h-2.5" />
                <span>Restablecer</span>
              </button>
            )}
          </div>

          {/* Preset Buttons Grid */}
          <div className="grid grid-cols-2 gap-1.5 mb-3">
            {[
              { id: "all" as DatePreset, label: "Todo el histórico" },
              { id: "today" as DatePreset, label: "Hoy" },
              { id: "yesterday" as DatePreset, label: "Ayer" },
              { id: "7d" as DatePreset, label: "Últimos 7 días" },
              { id: "30d" as DatePreset, label: "Últimos 30 días" },
              { id: "this_month" as DatePreset, label: "Este mes" },
              { id: "last_month" as DatePreset, label: "Mes anterior" },
            ].map((p) => {
              const isSelected = value.preset === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  id={`date-preset-${p.id}`}
                  onClick={() => handleSelectPreset(p.id)}
                  className={`px-2.5 py-1.5 rounded-lg text-left font-medium transition-all flex items-center justify-between border ${
                    isSelected
                      ? "bg-blue-600 text-white border-blue-500 shadow-sm"
                      : "bg-[#1a1d28] text-slate-300 hover:bg-slate-800 hover:text-white border-slate-800"
                  }`}
                >
                  <span className="truncate">{p.label}</span>
                  {isSelected && <Check className="w-3 h-3 shrink-0 ml-1" />}
                </button>
              );
            })}
          </div>

          {/* Custom Date Range Inputs */}
          <div className="bg-[#101218] p-3 rounded-xl border border-slate-800">
            <div className="flex items-center gap-1 text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
              <Clock className="w-3 h-3 text-blue-400" />
              <span>Rango Específico</span>
            </div>

            <div className="grid grid-cols-2 gap-2 mb-3">
              <div>
                <label className="block text-[10px] text-slate-400 mb-1 font-medium">
                  Fecha Inicial:
                </label>
                <input
                  type="date"
                  id="input-date-range-start"
                  value={tempStart}
                  onChange={(e) => setTempStart(e.target.value)}
                  className="w-full bg-[#181b24] border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500 font-mono"
                />
              </div>
              <div>
                <label className="block text-[10px] text-slate-400 mb-1 font-medium">
                  Fecha Final:
                </label>
                <input
                  type="date"
                  id="input-date-range-end"
                  value={tempEnd}
                  onChange={(e) => setTempEnd(e.target.value)}
                  className="w-full bg-[#181b24] border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500 font-mono"
                />
              </div>
            </div>

            <button
              type="button"
              id="btn-apply-custom-date"
              onClick={handleApplyCustom}
              disabled={!tempStart && !tempEnd}
              className="w-full py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold rounded-lg text-xs transition-all shadow-md shadow-blue-950/40 flex items-center justify-center gap-1.5"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Aplicar Rango al Dashboard</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
