export interface BcvRateResult {
  success: boolean;
  source: string;
  usd: number;
  eur: number | null;
  fechaValor?: string;
  updatedAt: string;
}

/**
 * Consulta la cotización oficial del Banco Central de Venezuela (BCV).
 * 1. Prioridad 1: Consulta directa a la web oficial del BCV (bcv.org.ve) a través del backend,
 *    obteniendo de forma inmediata la tasa publicada para el fin de semana o siguiente día hábil (Fecha Valor).
 * 2. Prioridad 2: Respaldo con DolarApi (Oficial BCV para USD y EUR).
 * 3. Prioridad 3: Fallback a Open Exchange Rates (open.er-api.com).
 */
export async function getBcvRates(): Promise<BcvRateResult> {
  const timestamp = Date.now();

  // 1. Intentar primero con el endpoint oficial directo del backend (bcv.org.ve en tiempo real)
  try {
    const res = await fetch(`/api/bcv?_t=${timestamp}`, { cache: "no-store" });
    if (res.ok) {
      const data = await res.json();
      if (data && data.usd && data.usd > 0) {
        return {
          success: true,
          source: data.source || "BCV Oficial Directo (bcv.org.ve)",
          usd: Number(data.usd),
          eur: data.eur ? Number(data.eur) : null,
          fechaValor: data.fechaValor || undefined,
          updatedAt: data.updatedAt || new Date().toISOString(),
        };
      }
    }
  } catch (backendError) {
    console.warn("Fallo endpoint directo /api/bcv, intentando DolarApi...", backendError);
  }

  // 2. Intentar con DolarApi (Oficial BCV)
  try {
    const [usdRes, eurRes] = await Promise.all([
      fetch(`https://ve.dolarapi.com/v1/dolares/oficial?_t=${timestamp}`, { cache: "no-store" }),
      fetch(`https://ve.dolarapi.com/v1/euros/oficial?_t=${timestamp}`, { cache: "no-store" }),
    ]);

    if (usdRes.ok) {
      const usdData = await usdRes.json();
      const eurData = eurRes.ok ? await eurRes.json() : null;

      return {
        success: true,
        source: "BCV Oficial (ve.dolarapi.com)",
        usd: usdData.promedio,
        eur: eurData?.promedio || null,
        fechaValor: usdData.fechaActualizacion || undefined,
        updatedAt: usdData.fechaActualizacion,
      };
    }
  } catch (error) {
    console.warn("Fallo fuente secundaria DolarApi, intentando Open Exchange...", error);
  }

  // 3. Fallback de respaldo (open.er-api.com)
  try {
    const res = await fetch(`https://open.er-api.com/v6/latest/USD?_t=${timestamp}`);
    const data = await res.json();
    return {
      success: true,
      source: "Open Exchange Rates (BCV)",
      usd: data.rates.VES,
      eur: null,
      fechaValor: undefined,
      updatedAt: data.time_last_update_utc,
    };
  } catch (fallbackError) {
    console.error("Error al obtener cotizaciones BCV:", fallbackError);
    throw new Error("No se pudo obtener la cotización del BCV en ninguna fuente.");
  }
}
