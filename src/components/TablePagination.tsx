import React, { useState, useMemo, useEffect } from "react";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Layers } from "lucide-react";

export interface PaginationResult<T> {
  paginatedItems: T[];
  currentPage: number;
  pageSize: number;
  totalPages: number;
  totalItems: number;
  startIndex: number;
  endIndex: number;
  setCurrentPage: (page: number) => void;
  setPageSize: (size: number) => void;
}

export function usePagination<T>(
  items: T[],
  defaultPageSize: number = 50,
  storageKey?: string
): PaginationResult<T> {
  const [pageSize, setPageSizeState] = useState<number>(() => {
    if (storageKey) {
      try {
        const saved = localStorage.getItem(`pos_table_pagesize_${storageKey}`);
        if (saved) {
          const parsed = parseInt(saved, 10);
          if (!isNaN(parsed) && parsed >= 0) return parsed;
        }
      } catch {
        // ignore storage errors
      }
    }
    return defaultPageSize;
  });

  const [currentPage, setCurrentPageState] = useState<number>(1);

  const totalItems = items.length;
  const effectivePageSize = pageSize === 0 ? Math.max(1, totalItems) : pageSize;
  const totalPages = Math.max(1, Math.ceil(totalItems / effectivePageSize));

  // Ajustar página actual si el filtro reduce el total de páginas
  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPageState(totalPages);
    }
  }, [currentPage, totalPages]);

  const setPageSize = (newSize: number) => {
    setPageSizeState(newSize);
    setCurrentPageState(1);
    if (storageKey) {
      try {
        localStorage.setItem(`pos_table_pagesize_${storageKey}`, String(newSize));
      } catch {
        // ignore
      }
    }
  };

  const setCurrentPage = (page: number) => {
    const safePage = Math.max(1, Math.min(totalPages, page));
    setCurrentPageState(safePage);
  };

  const { paginatedItems, startIndex, endIndex } = useMemo(() => {
    if (pageSize === 0 || totalItems <= pageSize) {
      return {
        paginatedItems: items,
        startIndex: totalItems > 0 ? 1 : 0,
        endIndex: totalItems,
      };
    }
    const safePage = Math.max(1, Math.min(totalPages, currentPage));
    const start = (safePage - 1) * pageSize;
    const end = Math.min(start + pageSize, totalItems);
    return {
      paginatedItems: items.slice(start, end),
      startIndex: totalItems > 0 ? start + 1 : 0,
      endIndex: end,
    };
  }, [items, pageSize, currentPage, totalItems, totalPages]);

  return {
    paginatedItems,
    currentPage,
    pageSize,
    totalPages,
    totalItems,
    startIndex,
    endIndex,
    setCurrentPage,
    setPageSize,
  };
}

interface TablePaginationProps {
  currentPage: number;
  pageSize: number;
  totalPages: number;
  totalItems: number;
  startIndex: number;
  endIndex: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  itemLabel?: string;
}

export const TablePagination: React.FC<TablePaginationProps> = React.memo(
  ({
    currentPage,
    pageSize,
    totalPages,
    totalItems,
    startIndex,
    endIndex,
    onPageChange,
    onPageSizeChange,
    itemLabel = "registros",
  }) => {
    if (totalItems === 0) return null;

    return (
      <div className="faraday-glass-bar px-4 py-2.5 border-t border-white/60 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[#5C646D]">
        <div className="flex items-center gap-3 flex-wrap">
          <span className="flex items-center gap-1.5 text-[#222629] font-medium">
            <Layers className="w-3.5 h-3.5 text-[#7B61C9]" />
            Mostrando{" "}
            <strong className="text-[#222629] font-mono font-extrabold">
              {startIndex}–{endIndex}
            </strong>{" "}
            de <strong className="text-[#248F78] font-mono font-extrabold">{totalItems}</strong> {itemLabel}
          </span>

          <div className="flex items-center gap-1.5 bg-white/55 border border-white/75 rounded-lg px-2 py-1 shadow-inner">
            <span className="text-[11px] text-[#5C646D]">Filas por pág:</span>
            <select
              value={pageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              className="bg-transparent text-[#222629] font-mono font-bold text-xs focus:outline-none cursor-pointer"
              title="Cantidad de filas a renderizar en pantalla"
            >
              <option value={25}>
                25
              </option>
              <option value={50}>
                50
              </option>
              <option value={100}>
                100
              </option>
              <option value={250}>
                250
              </option>
              <option value={0}>
                Todos ({totalItems})
              </option>
            </select>
          </div>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => onPageChange(1)}
              disabled={currentPage <= 1}
              className="p-1.5 rounded-lg bg-white/55 hover:bg-white/80 text-[#222629] disabled:opacity-35 disabled:pointer-events-none border border-white/70 transition-colors cursor-pointer"
              title="Primera página"
            >
              <ChevronsLeft className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => onPageChange(currentPage - 1)}
              disabled={currentPage <= 1}
              className="px-2.5 py-1 rounded-lg bg-white/55 hover:bg-white/80 text-[#222629] disabled:opacity-35 disabled:pointer-events-none border border-white/70 transition-colors flex items-center gap-1 font-semibold cursor-pointer"
              title="Página anterior"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>Ant.</span>
            </button>

            <span className="px-3 py-1 rounded-lg bg-white/65 border border-white/75 text-[#222629] font-mono text-xs">
              Pág. <strong className="text-[#7B61C9]">{currentPage}</strong> / {totalPages}
            </span>

            <button
              type="button"
              onClick={() => onPageChange(currentPage + 1)}
              disabled={currentPage >= totalPages}
              className="px-2.5 py-1 rounded-lg bg-white/55 hover:bg-white/80 text-[#222629] disabled:opacity-35 disabled:pointer-events-none border border-white/70 transition-colors flex items-center gap-1 font-semibold cursor-pointer"
              title="Página siguiente"
            >
              <span>Sig.</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => onPageChange(totalPages)}
              disabled={currentPage >= totalPages}
              className="p-1.5 rounded-lg bg-white/55 hover:bg-white/80 text-[#222629] disabled:opacity-35 disabled:pointer-events-none border border-white/70 transition-colors cursor-pointer"
              title="Última página"
            >
              <ChevronsRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>
    );
  }
);
