import React, { useState, useMemo } from "react";
import { Movimiento, Producto } from "../types";
import { calcularPMP } from "../mockDb";
import {
  ArrowDownLeft,
  ArrowUpRight,
  RefreshCcw,
  Download,
  Plus,
  Search,
  ShieldCheck,
  AlertTriangle,
  FileSpreadsheet,
} from "lucide-react";

interface MovementsViewProps {
  movements: Movimiento[];
  products: Producto[];
  bcvRate: number;
  onAddManualMovement: (
    productoId: number,
    tipo: "ENTRADA" | "SALIDA" | "AJUSTE",
    cantidad: number,
    motivo: string,
    costoCompra?: number
  ) => void;
}

export const MovementsView: React.FC<MovementsViewProps> = ({
  movements,
  products,
  bcvRate,
  onAddManualMovement,
}) => {
  const [filterType, setFilterType] = useState<string>("TODOS");
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);

  // Form states
  const [selectedProdId, setSelectedProdId] = useState<number>(products[0]?.id || 1);
  const [movementType, setMovementType] = useState<"ENTRADA" | "SALIDA" | "AJUSTE">("ENTRADA");
  const [quantity, setQuantity] = useState("");
  const [costoCompra, setCostoCompra] = useState("");
  const [reason, setReason] = useState("");
  const [modalError, setModalError] = useState<string | null>(null);

  const selectedProduct = useMemo(() => {
    return products.find((p) => p.id === selectedProdId) || products[0];
  }, [products, selectedProdId]);

  const filteredMovements = useMemo(() => {
    return movements.filter((m) => {
      const matchesType = filterType === "TODOS" || m.tipo === filterType;
      const q = search.toLowerCase();
      const matchesSearch =
        !search ||
        (m.producto_nombre && m.producto_nombre.toLowerCase().includes(q)) ||
        (m.motivo && m.motivo.toLowerCase().includes(q)) ||
        (m.referencia_factura && m.referencia_factura.toLowerCase().includes(q));
      return matchesType && matchesSearch;
    });
  }, [movements, filterType, search]);

  const handleExportCsv = () => {
    if (movements.length === 0) return;

    const headers = [
      "ID",
      "Fecha",
      "Tipo",
      "Producto",
      "Cantidad",
      "Costo_Unitario_USD",
      "PMP_Resultante_USD",
      "Stock_Resultante",
      "Motivo",
      "Referencia_Factura",
      "Usuario",
    ];
    const rows = filteredMovements.map((m) => [
      m.id,
      m.fecha,
      m.tipo,
      `"${(m.producto_nombre || "").replace(/"/g, '""')}"`,
      m.cantidad,
      m.costo_unitario ?? "",
      m.costo_promedio_ponderado ?? "",
      m.stock_resultante ?? "",
      `"${m.motivo.replace(/"/g, '""')}"`,
      `"${(m.referencia_factura || "").replace(/"/g, '""')}"`,
      m.usuario || "Admin",
    ]);

    const csvContent = "\uFEFF" + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute(
      "download",
      `kardex_fiscal_art177_${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleSaveMovement = (e: React.FormEvent) => {
    e.preventDefault();
    setModalError(null);
    const qty = parseFloat(quantity);
    if (!qty || qty <= 0) return;

    // Regla de Oro Reglamento LISLR Art. 177: Prohibición de existencias negativas
    if (movementType === "SALIDA" && selectedProduct && qty > selectedProduct.stock_actual) {
      setModalError(
        `❌ Infracción LISLR Art. 177: Prohibición de existencias negativas. No se puede egresar ${qty} ${selectedProduct.unidad_medida}. Stock físico disponible: ${selectedProduct.stock_actual}.`
      );
      return;
    }

    const costNum = parseFloat(costoCompra) || selectedProduct?.precio_costo || 0;

    onAddManualMovement(
      selectedProdId,
      movementType,
      qty,
      reason.trim() || `Movimiento manual de ${movementType}`,
      movementType === "ENTRADA" ? costNum : undefined
    );

    setShowModal(false);
    setQuantity("");
    setCostoCompra("");
    setReason("");
    setModalError(null);
  };

  return (
    <div className="space-y-4">
      {/* Fiscal Banner LISLR Art. 177 */}
      <div className="bg-[#151921] border border-blue-900/60 rounded-xl p-3 flex items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0" />
          <div>
            <span className="font-bold text-slate-200">
              Kardex Permanente y Control Fiscal (Reglamento LISLR Art. 177):
            </span>{" "}
            <span className="text-slate-400 text-[11px]">
              Trazabilidad cronológica inalterable de costos y existencias con método PMP.
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2 font-mono text-[11px] shrink-0">
          <span className="px-2 py-0.5 rounded bg-blue-950 text-blue-300 border border-blue-800">
            Tasa Oficial BCV: Bs. {(bcvRate ?? 36.5).toFixed(2)}
          </span>
        </div>
      </div>

      {/* Top Filter Bar */}
      <div className="bg-[#1a1d24] border border-slate-800 rounded-xl p-3 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-3 w-full sm:w-auto flex-1">
          {/* Search */}
          <div className="relative flex-1 max-w-sm">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar por producto, motivo o factura..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-[#12141a] border border-slate-700/80 rounded-lg pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 font-mono"
            />
          </div>

          {/* Type Filter Buttons */}
          <div className="flex items-center bg-[#12141a] p-0.5 rounded-lg border border-slate-700/80 text-xs">
            {["TODOS", "ENTRADA", "SALIDA", "AJUSTE"].map((t) => (
              <button
                key={t}
                onClick={() => setFilterType(t)}
                className={`px-3 py-1.5 rounded-md font-semibold text-[11px] transition-all ${
                  filterType === t
                    ? "bg-blue-600 text-white shadow-sm"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <button
            onClick={() => {
              if (selectedProduct) {
                setCostoCompra(selectedProduct.precio_costo.toString());
              }
              setShowModal(true);
            }}
            className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs px-3.5 py-2 rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Asentar Movimiento</span>
          </button>

          <button
            onClick={handleExportCsv}
            className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs px-3.5 py-2 rounded-lg transition-colors border border-slate-700"
          >
            <Download className="w-4 h-4" />
            <span>Exportar CSV Fiscal</span>
          </button>
        </div>
      </div>

      {/* Movements Kardex Table with PMP and Resulting Stock */}
      <div className="bg-[#1a1d24] border border-slate-800 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-[#12141a] text-slate-400 border-b border-slate-800 uppercase font-mono text-[11px]">
              <tr>
                <th className="py-3 px-3 text-center">#</th>
                <th className="py-3 px-3">Fecha y Hora</th>
                <th className="py-3 px-3 text-center">Tipo</th>
                <th className="py-3 px-3">Producto Afectado</th>
                <th className="py-3 px-3 text-center">Cantidad</th>
                <th className="py-3 px-3 text-right">Costo Mov. ($)</th>
                <th className="py-3 px-3 text-right">PMP Resultante ($)</th>
                <th className="py-3 px-3 text-center">Existencia</th>
                <th className="py-3 px-3">Motivo / Justificación</th>
                <th className="py-3 px-3 text-center">Ref. Factura</th>
                <th className="py-3 px-3 text-center">Operador</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-sans">
              {filteredMovements.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-16 text-center text-slate-500">
                    No hay registros de movimientos en el Kardex.
                  </td>
                </tr>
              ) : (
                filteredMovements.map((m) => (
                  <tr key={m.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-2.5 px-3 text-center font-mono text-slate-500 text-[11px]">
                      {m.id}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-slate-300 whitespace-nowrap text-[11px]">
                      {m.fecha}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      {m.tipo === "ENTRADA" ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-950/60 text-emerald-400 border border-emerald-800/60">
                          <ArrowDownLeft className="w-3 h-3" /> ENTRADA
                        </span>
                      ) : m.tipo === "SALIDA" ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-rose-950/60 text-rose-400 border border-rose-800/60">
                          <ArrowUpRight className="w-3 h-3" /> SALIDA
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-950/60 text-blue-400 border border-blue-800/60">
                          <RefreshCcw className="w-3 h-3" /> AJUSTE
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 font-semibold text-white max-w-xs truncate">
                      {m.producto_nombre || "Producto #" + m.producto_id}
                    </td>
                    <td className="py-2.5 px-3 text-center font-mono font-bold text-slate-200">
                      {m.tipo === "SALIDA" ? `-${m.cantidad}` : `+${m.cantidad}`}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-slate-300">
                      {m.costo_unitario !== undefined && m.costo_unitario > 0 ? (
                        `$${m.costo_unitario.toFixed(2)}`
                      ) : (
                        <span className="text-slate-600">-</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-amber-300 font-medium">
                      {m.costo_promedio_ponderado !== undefined && m.costo_promedio_ponderado > 0 ? (
                        `$${m.costo_promedio_ponderado.toFixed(2)}`
                      ) : (
                        <span className="text-slate-600">-</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-center font-mono font-bold text-emerald-400">
                      {m.stock_resultante !== undefined ? m.stock_resultante : "-"}
                    </td>
                    <td className="py-2.5 px-3 text-slate-400 max-w-xs truncate">{m.motivo}</td>
                    <td className="py-2.5 px-3 text-center font-mono text-slate-400">
                      {m.referencia_factura ? (
                        <span className="px-1.5 py-0.5 rounded bg-slate-800 text-[11px] text-blue-300">
                          {m.referencia_factura}
                        </span>
                      ) : (
                        "-"
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-center text-slate-400">{m.usuario || "Admin"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: New Manual Movement with Fiscal Validations */}
      {showModal && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[#181a20] border border-slate-800 rounded-2xl max-w-md w-full p-5 shadow-2xl space-y-4 my-auto max-h-[92vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2.5 shrink-0">
              <h3 className="font-bold text-white text-sm flex items-center gap-2">
                <FileSpreadsheet className="w-4 h-4 text-blue-400" />
                <span>Asiento en Kardex Tributario (LISLR Art. 177)</span>
              </h3>
              <button
                onClick={() => {
                  setShowModal(false);
                  setModalError(null);
                }}
                className="text-slate-400 hover:text-white text-xs font-bold"
              >
                ✕
              </button>
            </div>

            {modalError && (
              <div className="p-2.5 bg-rose-950/80 border border-rose-700 rounded-lg text-rose-200 text-xs flex items-start gap-2 shrink-0">
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <span className="text-[11px] leading-tight">{modalError}</span>
              </div>
            )}

            <form onSubmit={handleSaveMovement} className="space-y-3 text-xs overflow-y-auto flex-1 min-h-0 pr-1">
              <div>
                <label className="block text-slate-300 font-medium mb-1">Producto Afectado:</label>
                <select
                  value={selectedProdId}
                  onChange={(e) => {
                    const id = Number(e.target.value);
                    setSelectedProdId(id);
                    const p = products.find((prod) => prod.id === id);
                    if (p) setCostoCompra(p.precio_costo.toString());
                    setModalError(null);
                  }}
                  className="w-full bg-[#111317] border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                >
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nombre} (Stock actual: {p.stock_actual} {p.unidad_medida} | PMP: ${p.costo_promedio_ponderado || p.precio_costo})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Tipo de Movimiento:</label>
                <div className="grid grid-cols-3 gap-2">
                  {(["ENTRADA", "SALIDA", "AJUSTE"] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => {
                        setMovementType(t);
                        setModalError(null);
                      }}
                      className={`py-2 text-center font-semibold rounded-lg border text-xs transition-all ${
                        movementType === t
                          ? "bg-blue-600 border-blue-500 text-white"
                          : "bg-slate-800/80 border-slate-700 text-slate-300 hover:bg-slate-700"
                      }`}
                    >
                      {t === "ENTRADA" ? "ENTRADA (Compra)" : t === "SALIDA" ? "SALIDA (Baja)" : "AJUSTE"}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">
                  Cantidad ({selectedProduct?.unidad_medida}):
                </label>
                <input
                  type="number"
                  step="1"
                  min="1"
                  required
                  placeholder="0"
                  value={quantity}
                  onChange={(e) => {
                    setQuantity(e.target.value);
                    setModalError(null);
                  }}
                  className="w-full bg-[#111317] border border-slate-700 rounded-lg px-3 py-2 text-white font-mono"
                />
              </div>

              {movementType === "ENTRADA" && (
                <div>
                  <label className="block text-slate-300 font-medium mb-1">
                    Costo Unitario de Compra ($) (Para cálculo PMP Art. 177):
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder={selectedProduct?.precio_costo.toString() || "0.00"}
                    value={costoCompra}
                    onChange={(e) => setCostoCompra(e.target.value)}
                    className="w-full bg-[#111317] border border-slate-700 rounded-lg px-3 py-2 text-white font-mono"
                  />
                </div>
              )}

              <div>
                <label className="block text-slate-300 font-medium mb-1">
                  Motivo / Justificación / Comprobante:
                </label>
                <input
                  type="text"
                  placeholder="Ej: Factura Proveedor N° 45892, Devolución en buen estado, Merma autorizada"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full bg-[#111317] border border-slate-700 rounded-lg px-3 py-2 text-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold"
                >
                  Asentar en Kardex SQLite
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
