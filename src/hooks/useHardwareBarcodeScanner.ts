import { useEffect, useMemo, useRef, useState } from "react";
import { Producto } from "../types";

export interface UseHardwareBarcodeScannerOptions {
  products: Producto[];
  enabled?: boolean;
  onScanMatch: (product: Producto, scannedCode: string) => void;
  onScanNotFound?: (scannedCode: string) => void;
}

export interface UseHardwareBarcodeScannerReturn {
  lastScannedProduct: string | null;
  setLastScannedProduct: (name: string | null) => void;
  findProductByCode: (code: string) => Producto | undefined;
  barcodeIndexSize: number;
}

/**
 * Hook unificado para lectores físicos de código de barras (USB / Bluetooth HID)
 * Incluye indexación O(1) en memoria (Map) por código de barras, ID y código interno.
 */
export function useHardwareBarcodeScanner({
  products,
  enabled = true,
  onScanMatch,
  onScanNotFound,
}: UseHardwareBarcodeScannerOptions): UseHardwareBarcodeScannerReturn {
  const barcodeBufferRef = useRef<string>("");
  const lastKeyTimeRef = useRef<number>(0);
  const [lastScannedProduct, setLastScannedProduct] = useState<string | null>(null);

  // Mantener callbacks actualizados en refs para no re-registrar el listener en cada render
  const onScanMatchRef = useRef(onScanMatch);
  const onScanNotFoundRef = useRef(onScanNotFound);
  useEffect(() => {
    onScanMatchRef.current = onScanMatch;
    onScanNotFoundRef.current = onScanNotFound;
  }, [onScanMatch, onScanNotFound]);

  // Indexación O(1) en Map para búsqueda instantánea sin recorrer todo el arreglo
  const productLookupMap = useMemo(() => {
    const map = new Map<string, Producto>();
    for (let i = 0; i < products.length; i++) {
      const p = products[i];
      if (p.id !== undefined && p.id !== null) {
        map.set(String(p.id), p);
      }
      if (p.codigo_barras) {
        const cleanBarcode = p.codigo_barras.trim().toLowerCase();
        if (cleanBarcode) {
          map.set(cleanBarcode, p);
        }
      }
      if (p.codigo_interno) {
        const cleanInternal = p.codigo_interno.trim().toLowerCase();
        if (cleanInternal) {
          map.set(cleanInternal, p);
        }
      }
    }
    return map;
  }, [products]);

  const findProductByCode = useMemo(() => {
    return (code: string): Producto | undefined => {
      const normalized = code.trim().toLowerCase();
      if (!normalized) return undefined;
      return productLookupMap.get(normalized);
    };
  }, [productLookupMap]);

  useEffect(() => {
    if (!enabled) return;

    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement as HTMLElement | null;
      const activeTag = (activeEl?.tagName || "").toLowerCase();
      const isEditable = activeEl?.isContentEditable;

      // Si el usuario está escribiendo dentro de un input, textarea o select, no interceptar
      if (activeTag === "input" || activeTag === "textarea" || activeTag === "select" || isEditable) {
        return;
      }

      const currentTime = Date.now();
      // Los lectores de barras físicos envían pulsaciones con intervalos < 50ms
      if (currentTime - lastKeyTimeRef.current > 100) {
        barcodeBufferRef.current = "";
      }
      lastKeyTimeRef.current = currentTime;

      if (e.key === "Enter") {
        const scannedCode = barcodeBufferRef.current.trim();
        barcodeBufferRef.current = "";

        if (scannedCode.length >= 2) {
          const found = findProductByCode(scannedCode);
          if (found) {
            onScanMatchRef.current(found, scannedCode);
            setLastScannedProduct(found.nombre);
            window.setTimeout(() => setLastScannedProduct(null), 2500);
          } else if (onScanNotFoundRef.current) {
            onScanNotFoundRef.current(scannedCode);
          }
        }
      } else if (e.key.length === 1) {
        barcodeBufferRef.current += e.key;
      }
    };

    window.addEventListener("keydown", handleGlobalKeyDown);
    return () => {
      window.removeEventListener("keydown", handleGlobalKeyDown);
    };
  }, [enabled, findProductByCode]);

  return {
    lastScannedProduct,
    setLastScannedProduct,
    findProductByCode,
    barcodeIndexSize: productLookupMap.size,
  };
}
