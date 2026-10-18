import React, { useState, useMemo } from "react";
import { Producto, Categoria, TipoAlicuotaIva } from "../types";
import {
  FileSpreadsheet,
  Upload,
  Download,
  CheckCircle2,
  AlertTriangle,
  X,
  FileText,
  Layers,
  ArrowRight,
  Database,
  RefreshCw,
  SlidersHorizontal,
  DollarSign,
  Sparkles,
  Info,
} from "lucide-react";

interface UniversalCatalogImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: Producto[];
  categories: Categoria[];
  onImportSuccess: (updatedProducts: Producto[], updatedCategories: Categoria[]) => void;
  bcvRate: number;
  showToast: (msg: string) => void;
}

type SoftwarePreset = "GENERIC" | "SAINT" | "A2" | "STELLAR" | "VALERY";

interface ColumnMapping {
  code: string;
  name: string;
  price: string;
  cost: string;
  stock: string;
  category: string;
  iva: string;
  unit: string;
}

export const UniversalCatalogImportModal: React.FC<UniversalCatalogImportModalProps> = ({
  isOpen,
  onClose,
  products,
  categories,
  onImportSuccess,
  bcvRate,
  showToast,
}) => {
  const [selectedPreset, setSelectedPreset] = useState<SoftwarePreset>("GENERIC");
  const [inputMode, setInputMode] = useState<"file" | "paste">("file");
  const [rawText, setRawText] = useState<string>("");
  const [fileName, setFileName] = useState<string>("");
  const [currencyMode, setCurrencyMode] = useState<"USD" | "VES">("USD");
  const [importStrategy, setImportStrategy] = useState<"FUSIONAR" | "SOLO_NUEVOS" | "REEMPLAZAR">("FUSIONAR");
  const [isProcessing, setIsProcessing] = useState(false);

  // Column Mappings
  const [mapping, setMapping] = useState<ColumnMapping>({
    code: "",
    name: "",
    price: "",
    cost: "",
    stock: "",
    category: "",
    iva: "",
    unit: "",
  });

  // Helper: Detect delimiter (, or ; or \t or |)
  const detectDelimiter = (text: string): string => {
    const firstLine = text.split(/\r?\n/)[0] || "";
    const counts = {
      ",": (firstLine.match(/,/g) || []).length,
      ";": (firstLine.match(/;/g) || []).length,
      "\t": (firstLine.match(/\t/g) || []).length,
      "|": (firstLine.match(/\|/g) || []).length,
    };
    let maxDelim = ",";
    let maxCount = -1;
    for (const [delim, count] of Object.entries(counts)) {
      if (count > maxCount) {
        maxCount = count;
        maxDelim = delim;
      }
    }
    return maxDelim;
  };

  // Helper: Parse CSV/TSV line respecting quotes
  const parseLine = (line: string, delim: string): string[] => {
    const result: string[] = [];
    let cur = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (c === '"') {
        inQuotes = !inQuotes;
      } else if (c === delim && !inQuotes) {
        result.push(cur.trim().replace(/^"|"$/g, "").trim());
        cur = "";
      } else {
        cur += c;
      }
    }
    result.push(cur.trim().replace(/^"|"$/g, "").trim());
    return result;
  };

  // Parse raw rows and headers
  const { headers, rawRows } = useMemo(() => {
    if (!rawText.trim()) return { headers: [], rawRows: [] };

    const lines = rawText.split(/\r?\n/).filter((l) => l.trim().length > 0);
    if (lines.length === 0) return { headers: [], rawRows: [] };

    const delim = detectDelimiter(rawText);
    const rawParsedHeaders = parseLine(lines[0], delim);

    // Sanitize headers so each is non-empty and strictly unique
    const seen = new Map<string, number>();
    const parsedHeaders = rawParsedHeaders.map((h, i) => {
      let base = (h || `Columna_${i + 1}`).trim();
      if (!base) base = `Columna_${i + 1}`;
      const count = seen.get(base) || 0;
      seen.set(base, count + 1);
      return count === 0 ? base : `${base}_${count + 1}`;
    });

    const rows = lines.slice(1).map((l) => parseLine(l, delim));

    return { headers: parsedHeaders, rawRows: rows };
  }, [rawText]);

  // Auto-guess column mappings whenever headers change
  const handleAutoMapHeaders = (foundHeaders: string[], preset: SoftwarePreset) => {
    const normalize = (s: string) =>
      (s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, "");

    const newMap: ColumnMapping = {
      code: "",
      name: "",
      price: "",
      cost: "",
      stock: "",
      category: "",
      iva: "",
      unit: "",
    };

    foundHeaders.forEach((h) => {
      const n = normalize(h);
      if (!newMap.code && (n.includes("cod") || n.includes("sku") || n.includes("ref") || n.includes("barcode") || n.includes("barra"))) {
        newMap.code = h;
      } else if (!newMap.name && (n.includes("desc") || n.includes("nom") || n.includes("art") || n.includes("prod") || n.includes("detalle"))) {
        newMap.name = h;
      } else if (!newMap.price && (n.includes("prec") || n.includes("pvp") || n.includes("vent") || n.includes("p1"))) {
        newMap.price = h;
      } else if (!newMap.cost && (n.includes("cost") || n.includes("compr") || n.includes("pmp"))) {
        newMap.cost = h;
      } else if (!newMap.stock && (n.includes("exist") || n.includes("stock") || n.includes("cant") || n.includes("saldo"))) {
        newMap.stock = h;
      } else if (!newMap.category && (n.includes("dep") || n.includes("cat") || n.includes("rub") || n.includes("grup"))) {
        newMap.category = h;
      } else if (!newMap.iva && (n.includes("iva") || n.includes("ali") || n.includes("exen") || n.includes("imp"))) {
        newMap.iva = h;
      } else if (!newMap.unit && (n.includes("unid") || n.includes("med") || n.includes("empa"))) {
        newMap.unit = h;
      }
    });

    // Fallback if name wasn't matched but we have columns
    if (!newMap.name && foundHeaders.length > 1) {
      newMap.name = foundHeaders[1];
    }
    if (!newMap.code && foundHeaders.length > 0) {
      newMap.code = foundHeaders[0];
    }

    setMapping(newMap);
  };

  // Handle file upload (.csv, .tsv, .txt)
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setRawText(content);
      const delim = detectDelimiter(content);
      const lines = content.split(/\r?\n/).filter((l) => l.trim().length > 0);
      if (lines.length > 0) {
        const parsedHeaders = parseLine(lines[0], delim);
        handleAutoMapHeaders(parsedHeaders, selectedPreset);
      }
    };
    reader.readAsText(file, "UTF-8");
  };

  // Clean and parse numbers correctly (handles 44.00, 44,00, 1,250.50, 1.250,50, Bs., $)
  const parseCleanNumber = (val: string | undefined): number => {
    if (val === undefined || val === null) return 0;
    if (typeof val === "number") return isNaN(val) ? 0 : val;

    let s = String(val).trim();
    if (!s) return 0;

    // Remove currency words and units (Bs., Bs, USD, $, VES, pza, kg, etc.)
    s = s.replace(/^(Bs\.?|USD|\$|VES)\s*/i, "");
    s = s.replace(/\s*(Bs\.?|USD|\$|VES|pza|pz|kg|un|unid|unidades)\s*$/i, "");
    s = s.replace(/[$€]/g, "").trim();

    if (!s) return 0;

    const hasComma = s.includes(",");
    const hasDot = s.includes(".");

    if (hasComma && hasDot) {
      // Both present: e.g. 1,250.50 or 1.250,50
      if (s.lastIndexOf(".") > s.lastIndexOf(",")) {
        s = s.replace(/,/g, ""); // 1,250.50 -> 1250.50
      } else {
        s = s.replace(/\./g, "").replace(",", "."); // 1.250,50 -> 1250.50
      }
    } else if (hasComma && !hasDot) {
      // Only comma: 44,00 or 44,50 -> decimal comma
      const parts = s.split(",");
      if (parts.length === 2 && parts[1].length <= 3) {
        s = s.replace(",", ".");
      } else {
        s = s.replace(/,/g, "");
      }
    } else if (hasDot && !hasComma) {
      // Only dot: e.g. 44.00 or 1.000.000
      const parts = s.split(".");
      if (parts.length > 2) {
        s = s.replace(/\./g, "");
      }
      // If single dot like "44.00" or "44.5", standard parseFloat handles it as 44 or 44.5!
    }

    const n = parseFloat(s);
    return isNaN(n) ? 0 : Math.max(0, n);
  };

  // Preview computed items
  const previewItems = useMemo(() => {
    if (!headers.length || !rawRows.length) return [];

    const getColIdx = (colName: string) => headers.indexOf(colName);
    const codeIdx = getColIdx(mapping.code);
    const nameIdx = getColIdx(mapping.name);
    const priceIdx = getColIdx(mapping.price);
    const costIdx = getColIdx(mapping.cost);
    const stockIdx = getColIdx(mapping.stock);
    const catIdx = getColIdx(mapping.category);
    const ivaIdx = getColIdx(mapping.iva);
    const unitIdx = getColIdx(mapping.unit);

    // Preview up to 200 items with full scrolling support
    return rawRows.slice(0, 200).map((row, idx) => {
      const rawCode = (codeIdx >= 0 ? row[codeIdx] : "") || `SKU-${idx + 1000}`;
      const rawName = (nameIdx >= 0 ? row[nameIdx] : "") || `Producto Importado #${idx + 1}`;
      let rawPrice = parseCleanNumber(priceIdx >= 0 ? row[priceIdx] : "0");
      let rawCost = parseCleanNumber(costIdx >= 0 ? row[costIdx] : "0");
      const rawStock = parseCleanNumber(stockIdx >= 0 ? row[stockIdx] : "0");
      const rawCat = (catIdx >= 0 ? row[catIdx] : "") || "Víveres y Granos";
      const rawIvaStr = (ivaIdx >= 0 ? row[ivaIdx] : "").toLowerCase();
      const rawUnit = (unitIdx >= 0 ? row[unitIdx] : "") || "Pza";

      // Currency conversion if original prices are in Bolívares
      if (currencyMode === "VES" && bcvRate > 0) {
        rawPrice = rawPrice / bcvRate;
        rawCost = rawCost / bcvRate;
      }

      // IVA calculation (0 for exento/E, 16 for gravado/G)
      const isExento =
        rawIvaStr.includes("exent") ||
        rawIvaStr.includes("e") ||
        rawIvaStr === "0" ||
        rawIvaStr === "0%" ||
        rawIvaStr.includes("no");
      const alicuotaIva: TipoAlicuotaIva = isExento ? 0 : 16;

      return {
        codigo: rawCode,
        nombre: rawName,
        precioUsd: rawPrice,
        precioVes: rawPrice * bcvRate,
        costoUsd: rawCost,
        stock: rawStock,
        categoria: rawCat,
        alicuotaIva,
        unidad: rawUnit,
      };
    });
  }, [headers, rawRows, mapping, currencyMode, bcvRate]);

  // Execute Import
  const handleExecuteImport = () => {
    if (!rawRows.length) {
      showToast("❌ No hay datos cargados para importar.");
      return;
    }

    if (!mapping.name) {
      showToast("❌ Debe seleccionar al menos la columna correspondiente al Nombre/Descripción del producto.");
      return;
    }

    setIsProcessing(true);

    try {
      const getColIdx = (colName: string) => headers.indexOf(colName);
      const codeIdx = getColIdx(mapping.code);
      const nameIdx = getColIdx(mapping.name);
      const priceIdx = getColIdx(mapping.price);
      const costIdx = getColIdx(mapping.cost);
      const stockIdx = getColIdx(mapping.stock);
      const catIdx = getColIdx(mapping.category);
      const ivaIdx = getColIdx(mapping.iva);
      const unitIdx = getColIdx(mapping.unit);

      // Clone existing categories or start fresh
      const newCategories: Categoria[] =
        importStrategy === "REEMPLAZAR" ? [] : [...categories];

      let maxCatId = newCategories.reduce((max, c) => Math.max(max, c.id), 0);

      const getOrCreateCategoryId = (catName: string): { id: number; name: string } => {
        const cleanName = catName.trim() || "Víveres y Granos";
        const found = newCategories.find(
          (c) => c.nombre.toLowerCase() === cleanName.toLowerCase()
        );
        if (found) return { id: found.id, name: found.nombre };

        maxCatId++;
        const newCat: Categoria = {
          id: maxCatId,
          nombre: cleanName,
          descripcion: `Departamento importado (${cleanName})`,
        };
        newCategories.push(newCat);
        return { id: newCat.id, name: newCat.nombre };
      };

      // Base products according to strategy
      let updatedProductsList: Producto[] =
        importStrategy === "REEMPLAZAR" ? [] : [...products];

      let maxProdId = updatedProductsList.reduce((max, p) => Math.max(max, p.id), 0);
      let countAdded = 0;
      let countUpdated = 0;

      for (let i = 0; i < rawRows.length; i++) {
        const row = rawRows[i];
        const rawName = (nameIdx >= 0 ? row[nameIdx] : "").trim();
        if (!rawName) continue; // Skip empty rows

        const rawCode =
          (codeIdx >= 0 ? row[codeIdx] : "").trim() ||
          `750${Math.floor(100000000 + Math.random() * 900000000)}`;

        let priceNum = parseCleanNumber(priceIdx >= 0 ? row[priceIdx] : "0");
        let costNum = parseCleanNumber(costIdx >= 0 ? row[costIdx] : "0");
        const stockNum = parseCleanNumber(stockIdx >= 0 ? row[stockIdx] : "0");
        const rawCatName = (catIdx >= 0 ? row[catIdx] : "").trim() || "Víveres y Granos";
        const rawIvaStr = (ivaIdx >= 0 ? row[ivaIdx] : "").toLowerCase().trim();
        const rawUnit = (unitIdx >= 0 ? row[unitIdx] : "").trim() || "Pza";

        if (currencyMode === "VES" && bcvRate > 0) {
          priceNum = Number((priceNum / bcvRate).toFixed(2));
          costNum = Number((costNum / bcvRate).toFixed(2));
        }

        const isExento =
          rawIvaStr.includes("exent") ||
          rawIvaStr.includes("e") ||
          rawIvaStr === "0" ||
          rawIvaStr === "0%" ||
          rawIvaStr.includes("no");
        const alicuotaIva: TipoAlicuotaIva = isExento ? 0 : 16;

        const catInfo = getOrCreateCategoryId(rawCatName);

        const existingIdx = updatedProductsList.findIndex(
          (p) =>
            p.codigo_barras.trim().toLowerCase() === rawCode.toLowerCase() ||
            p.nombre.trim().toLowerCase() === rawName.toLowerCase()
        );

        if (existingIdx >= 0) {
          if (importStrategy === "FUSIONAR") {
            // Update existing product
            updatedProductsList[existingIdx] = {
              ...updatedProductsList[existingIdx],
              precio_venta: priceNum > 0 ? priceNum : updatedProductsList[existingIdx].precio_venta,
              precio_costo: costNum > 0 ? costNum : updatedProductsList[existingIdx].precio_costo,
              stock_actual: stockNum >= 0 ? stockNum : updatedProductsList[existingIdx].stock_actual,
              alicuota_iva: alicuotaIva,
              categoria_id: catInfo.id,
              categoria_nombre: catInfo.name,
              unidad_medida: rawUnit,
            };
            countUpdated++;
          }
          // If SOLO_NUEVOS, ignore existing
        } else {
          // Add new product
          maxProdId++;
          const newProd: Producto = {
            id: maxProdId,
            codigo_barras: rawCode,
            nombre: rawName,
            categoria_id: catInfo.id,
            categoria_nombre: catInfo.name,
            stock_actual: stockNum,
            stock_minimo: 5,
            precio_costo: costNum,
            costo_promedio: costNum,
            costo_promedio_ponderado: costNum,
            precio_venta: priceNum,
            alicuota_iva: alicuotaIva,
            unidad_medida: rawUnit,
            fecha_registro: new Date().toISOString().slice(0, 19).replace("T", " "),
          };
          updatedProductsList.push(newProd);
          countAdded++;
        }
      }

      // Guarantee strictly unique integer IDs across all products
      const usedIds = new Set<number>();
      let nextSafeId = 1;
      const sanitizedProducts = updatedProductsList.map((p) => {
        let pId = typeof p.id === "number" && !isNaN(p.id) && p.id > 0 ? p.id : parseInt(String(p.id), 10);
        if (!pId || isNaN(pId) || usedIds.has(pId)) {
          while (usedIds.has(nextSafeId)) {
            nextSafeId++;
          }
          pId = nextSafeId;
          nextSafeId++;
        }
        usedIds.add(pId);
        return { ...p, id: pId };
      });

      // Guarantee strictly unique IDs across all categories
      const usedCatIds = new Set<number>();
      let nextSafeCatId = 1;
      const sanitizedCategories = newCategories.map((c) => {
        let cId = c.id;
        if (!cId || usedCatIds.has(cId)) {
          while (usedCatIds.has(nextSafeCatId)) {
            nextSafeCatId++;
          }
          cId = nextSafeCatId;
          nextSafeCatId++;
        }
        usedCatIds.add(cId);
        return { ...c, id: cId };
      });

      onImportSuccess(sanitizedProducts, sanitizedCategories);
      showToast(
        `✅ ¡Importación completada! ${countAdded} productos nuevos y ${countUpdated} actualizados.`
      );
      onClose();
    } catch (err: any) {
      console.error("Error en importación masiva:", err);
      showToast(`❌ Error al importar: ${err?.message || "Formato de archivo inválido."}`);
    } finally {
      setIsProcessing(false);
    }
  };

  // Download sample CSV template
  const handleDownloadTemplate = () => {
    const csvContent =
      "codigo_barras,nombre_descripcion,categoria_departamento,precio_venta,precio_costo,stock_existencia,alicuota_iva,unidad_medida\n" +
      '7591001000101,"Harina PAN Blanca 1kg","Víveres y Granos",1.40,1.05,45,Exento,Pza\n' +
      '7591002000202,"Arroz Blanco Entero 1kg","Víveres y Granos",1.55,1.15,38,Exento,Pza\n' +
      '7591003000303,"Refresco Cola 1.5L","Bebidas y Refrescos",2.00,1.40,24,16%,Pza\n' +
      '7591004000404,"Queso Blanco Duro 500g","Lácteos y Derivados",2.80,2.10,18,Exento,Kg\n' +
      '7591005000505,"Aceite Vegetal 1L","Víveres y Granos",2.50,1.90,30,Exento,Pza\n';

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "plantilla_migracion_inventario_saint_a2.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast("📥 Plantilla CSV descargada exitosamente.");
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-[#12151e] border-2 border-emerald-600/70 rounded-3xl w-full max-w-4xl shadow-2xl shadow-emerald-950/40 overflow-hidden flex flex-col max-h-[94vh]">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-950 via-[#151d24] to-[#12151e] p-5 sm:p-6 border-b border-emerald-800/60 flex items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border-2 border-emerald-500/40 flex items-center justify-center text-emerald-400 shadow-lg shadow-emerald-950/50 shrink-0">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg sm:text-xl font-black text-white tracking-tight">
                  Importación & Migración de Inventario
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 uppercase">
                  Saint • A2 • Stellar • Valery • Excel
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Importa miles de productos con código de barras, precios, stock y categorías desde tu software anterior.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 space-y-5 overflow-y-auto flex-1 min-h-0 text-xs text-slate-300">
          {/* Presets & Plantilla */}
          <div className="bg-[#171a24] p-4 rounded-2xl border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                Compatibilidad:
              </span>
              {(
                [
                  { id: "GENERIC", label: "Excel / CSV Genérico" },
                  { id: "SAINT", label: "Saint Enterprise" },
                  { id: "A2", label: "A2 Softway" },
                  { id: "STELLAR", label: "Stellar / Valery" },
                ] as const
              ).map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => {
                    setSelectedPreset(preset.id);
                    if (headers.length) handleAutoMapHeaders(headers, preset.id);
                  }}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                    selectedPreset === preset.id
                      ? "bg-emerald-600/30 text-emerald-300 border-emerald-500/60 shadow-sm"
                      : "bg-slate-900 text-slate-400 border-slate-700/60 hover:text-slate-200"
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={handleDownloadTemplate}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center gap-1.5 text-xs font-bold transition-all cursor-pointer shrink-0"
            >
              <Download className="w-3.5 h-3.5 text-blue-400" />
              <span>Descargar Plantilla CSV</span>
            </button>
          </div>

          {/* Selector de Archivo o Pegar Texto */}
          <div className="space-y-3">
            <div className="flex items-center gap-3 border-b border-slate-800 pb-2">
              <button
                type="button"
                onClick={() => setInputMode("file")}
                className={`pb-1 text-xs font-bold transition-all cursor-pointer border-b-2 ${
                  inputMode === "file"
                    ? "border-emerald-500 text-emerald-400"
                    : "border-transparent text-slate-400 hover:text-slate-200"
                }`}
              >
                1. Subir Archivo (.CSV / .TSV)
              </button>
              <button
                type="button"
                onClick={() => setInputMode("paste")}
                className={`pb-1 text-xs font-bold transition-all cursor-pointer border-b-2 ${
                  inputMode === "paste"
                    ? "border-emerald-500 text-emerald-400"
                    : "border-transparent text-slate-400 hover:text-slate-200"
                }`}
              >
                2. O Pegar Texto Copiado de Excel
              </button>
            </div>

            {inputMode === "file" ? (
              <label className="border-2 border-dashed border-slate-700 hover:border-emerald-500/70 bg-[#151822] hover:bg-[#181c28] rounded-2xl p-6 flex flex-col items-center justify-center gap-2 cursor-pointer transition-all group">
                <Upload className="w-8 h-8 text-slate-400 group-hover:text-emerald-400 transition-colors" />
                <span className="text-xs font-bold text-slate-200">
                  {fileName ? `Archivo seleccionado: ${fileName}` : "Haz clic para subir tu archivo Excel / CSV exportado"}
                </span>
                <span className="text-[11px] text-slate-500">
                  Soporta archivos .CSV separados por coma (,), punto y coma (;) o tabulación de Saint / A2.
                </span>
                <input
                  type="file"
                  accept=".csv,.tsv,.txt"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
            ) : (
              <div>
                <textarea
                  rows={4}
                  value={rawText}
                  onChange={(e) => {
                    const text = e.target.value;
                    setRawText(text);
                    const delim = detectDelimiter(text);
                    const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
                    if (lines.length > 0) {
                      const parsedHeaders = parseLine(lines[0], delim);
                      handleAutoMapHeaders(parsedHeaders, selectedPreset);
                    }
                  }}
                  placeholder="Copia las filas desde Excel (Ctrl+C) y pégalas aquí (Ctrl+V)..."
                  className="w-full bg-[#151822] border border-slate-700 rounded-xl p-3 font-mono text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
            )}
          </div>

          {/* Mapeo de Columnas Detectadas */}
          {headers.length > 0 && (
            <div className="bg-[#171a24] p-4 rounded-2xl border border-slate-800 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <SlidersHorizontal className="w-4 h-4 text-emerald-400" />
                  <span className="text-xs font-bold text-white uppercase tracking-wider">
                    Asignación de Columnas Detectadas ({rawRows.length} filas leídas)
                  </span>
                </div>
                <span className="text-[11px] text-emerald-400 font-bold bg-emerald-950 px-2 py-0.5 rounded border border-emerald-800">
                  ✓ Auto-Mapeado
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {/* Código */}
                <div>
                  <label className="text-[10px] font-bold text-slate-400 block mb-1">
                    Cód. Barras / SKU:
                  </label>
                  <select
                    value={mapping.code}
                    onChange={(e) => setMapping({ ...mapping, code: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="">(Auto-generar si vacío)</option>
                    {headers.map((h, idx) => (
                      <option key={`code-opt-${h}-${idx}`} value={h}>
                        {h}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Nombre */}
                <div>
                  <label className="text-[10px] font-bold text-emerald-400 block mb-1">
                    Descripción / Nombre (*):
                  </label>
                  <select
                    value={mapping.name}
                    onChange={(e) => setMapping({ ...mapping, name: e.target.value })}
                    className="w-full bg-slate-900 border border-emerald-600/70 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500 font-bold"
                  >
                    <option value="">Seleccione columna...</option>
                    {headers.map((h, idx) => (
                      <option key={`name-opt-${h}-${idx}`} value={h}>
                        {h}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Precio Venta */}
                <div>
                  <label className="text-[10px] font-bold text-slate-400 block mb-1">
                    Precio Venta:
                  </label>
                  <select
                    value={mapping.price}
                    onChange={(e) => setMapping({ ...mapping, price: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="">(Sin precio / $0.00)</option>
                    {headers.map((h, idx) => (
                      <option key={`price-opt-${h}-${idx}`} value={h}>
                        {h}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Costo */}
                <div>
                  <label className="text-[10px] font-bold text-slate-400 block mb-1">
                    Costo (PMP):
                  </label>
                  <select
                    value={mapping.cost}
                    onChange={(e) => setMapping({ ...mapping, cost: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="">(Igual al precio o $0)</option>
                    {headers.map((h, idx) => (
                      <option key={`cost-opt-${h}-${idx}`} value={h}>
                        {h}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Stock */}
                <div>
                  <label className="text-[10px] font-bold text-slate-400 block mb-1">
                    Stock / Existencia:
                  </label>
                  <select
                    value={mapping.stock}
                    onChange={(e) => setMapping({ ...mapping, stock: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="">(Por defecto 0)</option>
                    {headers.map((h, idx) => (
                      <option key={`stock-opt-${h}-${idx}`} value={h}>
                        {h}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Categoría / Departamento */}
                <div>
                  <label className="text-[10px] font-bold text-slate-400 block mb-1">
                    Categoría / Depto:
                  </label>
                  <select
                    value={mapping.category}
                    onChange={(e) => setMapping({ ...mapping, category: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="">(General / Víveres)</option>
                    {headers.map((h, idx) => (
                      <option key={`cat-opt-${h}-${idx}`} value={h}>
                        {h}
                      </option>
                    ))}
                  </select>
                </div>

                {/* IVA */}
                <div>
                  <label className="text-[10px] font-bold text-slate-400 block mb-1">
                    Alícuota IVA (Exento / 16%):
                  </label>
                  <select
                    value={mapping.iva}
                    onChange={(e) => setMapping({ ...mapping, iva: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="">(Exento por defecto)</option>
                    {headers.map((h, idx) => (
                      <option key={`iva-opt-${h}-${idx}`} value={h}>
                        {h}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Unidad */}
                <div>
                  <label className="text-[10px] font-bold text-slate-400 block mb-1">
                    Unidad de Medida:
                  </label>
                  <select
                    value={mapping.unit}
                    onChange={(e) => setMapping({ ...mapping, unit: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="">(Pza por defecto)</option>
                    {headers.map((h, idx) => (
                      <option key={`unit-opt-${h}-${idx}`} value={h}>
                        {h}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Opciones de Moneda y Estrategia */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-slate-800">
                {/* Moneda de los Precios */}
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1.5">
                    ¿En qué moneda están los precios del archivo?
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setCurrencyMode("USD")}
                      className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                        currencyMode === "USD"
                          ? "bg-emerald-600 text-white border-emerald-400 shadow-sm"
                          : "bg-slate-900 text-slate-400 border-slate-700 hover:text-white"
                      }`}
                    >
                      Dólares (USD $)
                    </button>
                    <button
                      type="button"
                      onClick={() => setCurrencyMode("VES")}
                      className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                        currencyMode === "VES"
                          ? "bg-amber-600 text-white border-amber-400 shadow-sm"
                          : "bg-slate-900 text-slate-400 border-slate-700 hover:text-white"
                      }`}
                    >
                      Bolívares (Bs. a tasa BCV)
                    </button>
                  </div>
                </div>

                {/* Estrategia de Importación */}
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1.5">
                    Estrategia de Carga:
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setImportStrategy("FUSIONAR")}
                      className={`flex-1 py-1.5 px-2 rounded-lg text-[11px] font-bold border transition-all cursor-pointer ${
                        importStrategy === "FUSIONAR"
                          ? "bg-blue-600 text-white border-blue-400"
                          : "bg-slate-900 text-slate-400 border-slate-700 hover:text-white"
                      }`}
                    >
                      Actualizar & Agregar
                    </button>
                    <button
                      type="button"
                      onClick={() => setImportStrategy("SOLO_NUEVOS")}
                      className={`flex-1 py-1.5 px-2 rounded-lg text-[11px] font-bold border transition-all cursor-pointer ${
                        importStrategy === "SOLO_NUEVOS"
                          ? "bg-blue-600 text-white border-blue-400"
                          : "bg-slate-900 text-slate-400 border-slate-700 hover:text-white"
                      }`}
                    >
                      Solo Nuevos
                    </button>
                    <button
                      type="button"
                      onClick={() => setImportStrategy("REEMPLAZAR")}
                      className={`flex-1 py-1.5 px-2 rounded-lg text-[11px] font-bold border transition-all cursor-pointer ${
                        importStrategy === "REEMPLAZAR"
                          ? "bg-rose-600 text-white border-rose-400"
                          : "bg-slate-900 text-slate-400 border-slate-700 hover:text-white"
                      }`}
                    >
                      Reemplazar Todo
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Vista Previa de Filas a Importar */}
          {previewItems.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                  <Database className="w-3.5 h-3.5 text-emerald-400" />
                  Vista Previa ({previewItems.length} de {rawRows.length} productos)
                </span>
                <span className="text-[11px] font-mono text-slate-400">
                  Tasa BCV Referencial: Bs. {bcvRate.toFixed(2)}
                </span>
              </div>

              <div className="border border-slate-800 rounded-xl overflow-x-auto overflow-y-auto max-h-[380px] bg-[#11131a] overscroll-contain">
                <table className="w-full text-left text-[11px] text-slate-300">
                  <thead className="bg-[#181b24] text-slate-400 font-mono uppercase text-[10px] border-b border-slate-800 sticky top-0 z-10 shadow-md">
                    <tr>
                      <th className="p-2">Cód. Barras</th>
                      <th className="p-2">Descripción</th>
                      <th className="p-2">Depto/Categoría</th>
                      <th className="p-2 text-center">Stock</th>
                      <th className="p-2 text-right">Precio Venta ($ / Bs)</th>
                      <th className="p-2 text-center">IVA</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-sans">
                    {previewItems.map((item, idx) => (
                      <tr key={idx} className="hover:bg-slate-800/30">
                        <td className="p-2 font-mono text-slate-400 font-semibold">{item.codigo}</td>
                        <td className="p-2 font-bold text-white">{item.nombre}</td>
                        <td className="p-2 text-slate-400">{item.categoria}</td>
                        <td className="p-2 text-center font-mono font-bold text-emerald-400">
                          {item.stock} {item.unidad}
                        </td>
                        <td className="p-2 text-right font-mono">
                          <span className="text-emerald-400 font-bold">${item.precioUsd.toFixed(2)}</span>
                          <span className="text-slate-500 text-[10px] block">
                            Bs. {item.precioVes.toFixed(2)}
                          </span>
                        </td>
                        <td className="p-2 text-center">
                          <span
                            className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                              item.alicuotaIva === 0
                                ? "bg-emerald-950 text-emerald-300 border border-emerald-800/60"
                                : "bg-blue-950 text-blue-300 border border-blue-800/60"
                            }`}
                          >
                            {item.alicuotaIva === 0 ? "Exento (E)" : "16% (G)"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-[#151822] p-4 sm:p-5 border-t border-slate-800 flex items-center justify-between gap-3 shrink-0">
          <div className="text-xs text-slate-400 font-medium hidden sm:block">
            {rawRows.length > 0 ? (
              <span>
                Listo para procesar <strong className="text-white">{rawRows.length} productos</strong> al catálogo local.
              </span>
            ) : (
              <span>Carga un archivo .csv o pega filas de Excel para comenzar.</span>
            )}
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={onClose}
              disabled={isProcessing}
              className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            >
              Cancelar
            </button>

            <button
              type="button"
              onClick={handleExecuteImport}
              disabled={isProcessing || rawRows.length === 0 || !mapping.name}
              className="px-6 py-2.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>
                {isProcessing
                  ? "Importando..."
                  : `Ejecutar Importación (${rawRows.length} Productos)`}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
