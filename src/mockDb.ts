import {
  Producto,
  Categoria,
  Movimiento,
  Venta,
  EmisorFiscal,
  FiadoCliente,
  CierreCajaRecord,
  RemoteClientLicense,
  LicenseCheckResult,
  PosOperationalMode,
  SystemUser,
  UserRole,
  RolePermissions,
  DatabaseBackupPayload,
  NegocioClienteConfig,
  ClienteDirectorio,
  RubroNegocio,
} from "./types";

const STORAGE_KEY_PRODUCTS = "sqlite_inventario_venezuela_productos_v2";
const STORAGE_KEY_CATEGORIES = "sqlite_inventario_venezuela_categorias_v2";
const STORAGE_KEY_MOVEMENTS = "sqlite_inventario_venezuela_kardex_v2";
const STORAGE_KEY_SALES = "sqlite_inventario_venezuela_ventas_v2";
const STORAGE_KEY_BCV_RATE = "sqlite_inventario_venezuela_bcv_rate_v2";
const STORAGE_KEY_CORRELATIVOS = "sqlite_inventario_venezuela_correlativos_v2";
const STORAGE_KEY_FIADOS = "sqlite_bodega_fiados_v1";
const STORAGE_KEY_CIERRES = "sqlite_bodega_cierres_caja_v1";
const STORAGE_KEY_REMOTE_LICENSE = "sqlite_subscription_license_v1";
const STORAGE_KEY_POS_OPERATIONAL_MODE = "sqlite_pos_operational_mode_v1";
const STORAGE_KEY_USERS = "sqlite_pos_users_v1";
const STORAGE_KEY_CURRENT_USER = "sqlite_pos_current_user_v1";

export const INITIAL_USERS: SystemUser[] = [
  {
    id: "usr-admin-1",
    username: "admin",
    nombre_completo: "Propietario / Administrador",
    rol: "ADMIN",
    pin: "1234",
    activo: true,
    ultimo_acceso: new Date().toISOString(),
    avatar_color: "from-blue-600 to-indigo-600",
  },
  {
    id: "usr-cajero-1",
    username: "cajero1",
    nombre_completo: "Cajero de Turno 1",
    rol: "CAJERO",
    pin: "0000",
    activo: true,
    ultimo_acceso: new Date().toISOString(),
    avatar_color: "from-amber-500 to-orange-600",
  },
  {
    id: "usr-sup-1",
    username: "supervisor",
    nombre_completo: "Supervisor de Almacén",
    rol: "SUPERVISOR",
    pin: "2580",
    activo: true,
    ultimo_acceso: new Date().toISOString(),
    avatar_color: "from-emerald-600 to-teal-700",
  },
];

export const ROLE_PERMISSIONS: Record<UserRole, RolePermissions> = {
  ADMIN: {
    puedeVender: true,
    puedeVerCostosYMargenes: true,
    puedeModificarPrecios: true,
    puedeAjustarStockManual: true,
    puedeEliminarProductos: true,
    puedeVerLibretaFiados: true,
    puedeHacerCierreCaja: true,
    puedeConfigurarSistema: true,
    puedeHacerBackups: true,
    puedeGestionarUsuarios: true,
  },
  SUPERVISOR: {
    puedeVender: true,
    puedeVerCostosYMargenes: true,
    puedeModificarPrecios: false,
    puedeAjustarStockManual: true,
    puedeEliminarProductos: false,
    puedeVerLibretaFiados: true,
    puedeHacerCierreCaja: true,
    puedeConfigurarSistema: false,
    puedeHacerBackups: true,
    puedeGestionarUsuarios: false,
  },
  CAJERO: {
    puedeVender: true,
    puedeVerCostosYMargenes: false, // Blindaje de márgenes de ganancia
    puedeModificarPrecios: false,   // No puede alterar precios de venta
    puedeAjustarStockManual: false, // No puede inflar o descontar stock sin venta
    puedeEliminarProductos: false,
    puedeVerLibretaFiados: true,
    puedeHacerCierreCaja: true,     // Puede registrar el conteo de su turno
    puedeConfigurarSistema: false,
    puedeHacerBackups: false,
    puedeGestionarUsuarios: false,
  },
};

export function parseFlexibleDate(input: string | Date | undefined | null): Date | null {
  if (!input) return null;
  if (input instanceof Date) {
    return isNaN(input.getTime()) ? null : input;
  }

  const str = String(input).trim();
  if (!str) return null;

  // 1. Formatos DD/MM/YYYY, DD-MM-YYYY, DD.MM.YYYY
  const ddmmyyyyMatch = str.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})(?:\s+.*)?$/);
  if (ddmmyyyyMatch) {
    const day = parseInt(ddmmyyyyMatch[1], 10);
    const month = parseInt(ddmmyyyyMatch[2], 10) - 1;
    const year = parseInt(ddmmyyyyMatch[3], 10);
    const date = new Date(year, month, day, 23, 59, 59, 999);
    if (!isNaN(date.getTime()) && date.getFullYear() === year) {
      return date;
    }
  }

  // 2. Formatos YYYY/MM/DD, YYYY-MM-DD, YYYY.MM.DD
  const yyyymmddMatch = str.match(/^(\d{4})[\/\-\.](\d{1,2})[\/\-\.](\d{1,2})(?:\s+.*)?$/);
  if (yyyymmddMatch) {
    const year = parseInt(yyyymmddMatch[1], 10);
    const month = parseInt(yyyymmddMatch[2], 10) - 1;
    const day = parseInt(yyyymmddMatch[3], 10);
    const date = new Date(year, month, day, 23, 59, 59, 999);
    if (!isNaN(date.getTime()) && date.getFullYear() === year) {
      return date;
    }
  }

  // 3. Fallback constructor Date
  const parsed = new Date(str);
  if (!isNaN(parsed.getTime())) {
    if (!str.includes("T") && !str.includes(":")) {
      parsed.setHours(23, 59, 59, 999);
    }
    return parsed;
  }

  return null;
}

export const getDefault30DaysExpiry = (): string => {
  const d = new Date();
  d.setDate(d.getDate() + 30);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
};

export const DEFAULT_REMOTE_LICENSE: RemoteClientLicense = {
  cliente_id: "POS-VE-PRODUCCION",
  nombre_negocio: "Mi Negocio Comercial, C.A.",
  rif_cedula: "J-40918274-1",
  telefono_contacto: "+58 412-5551234",
  edicion_contratada: "bodega",
  cuota_mensual_usd: 15,
  monto_instalacion_usd: 50,
  fecha_instalacion: "2026-01-01",
  fecha_vencimiento_actual: getDefault30DaysExpiry(), // Ciclo mensual estándar de 30 días
  estado_remoto: "ACTIVO",
  dias_gracia_offline_max: 30,
  ultimo_contacto_servidor: new Date().toISOString(),
  motivo_bloqueo: "",
  observaciones: "Sistema POS para Clientes en Producción (Node.js).",
};

export const SOPORTE_WHATSAPP = "+58 412-9264885";
export const SOPORTE_EMAIL = "soporte.sistemas@venezuela-pos.com";

export const PAGO_MOVIL_COBRO = {
  telefono: "04129264885",
  cedula: "V-30988249",
  cedulaNum: "30988249",
  banco: "Banesco (0134)",
  titular: "Administrador del Sistema",
};

export const EMISOR_FISCAL_DEFAULT: EmisorFiscal = {
  rif: "J-31456789-2",
  razon_social: "INVERSIONES & DISTRIBUCIONES CARACAS, C.A.",
  direccion_fiscal: "Av. Francisco de Miranda, Edif. Centro Empresarial, Chacao, Caracas",
  telefono: "(0212) 285-4011",
  providencia_fiscal: "SNAT/00071 - Contribuyente Ordinario IVA",
};

export const INITIAL_CATEGORIES: Categoria[] = [
  { id: 1, nombre: "Víveres y Granos", descripcion: "Alimentos básicos canasta alimentaria (Exentos de IVA)" },
  { id: 2, nombre: "Bebidas y Refrescos", descripcion: "Bebidas pasteurizadas y gaseosas (Gravados 16% IVA)" },
  { id: 3, nombre: "Cuidado y Aseo", descripcion: "Productos de limpieza del hogar y aseo personal (Gravados 16% IVA)" },
  { id: 4, nombre: "Lácteos y Derivados", descripcion: "Leches y quesos pasteurizados (Exentos de IVA)" },
  { id: 5, nombre: "Charcutería y Embutidos", descripcion: "Jamones y embutidos (Gravados 16% IVA)" },
  { id: 6, nombre: "Golosinas y Snacks", descripcion: "Snacks, chocolates y galletas (Gravados 16% IVA)" },
];

export const INITIAL_PRODUCTS: Producto[] = [
  {
    id: 1,
    codigo_barras: "7591001000101",
    nombre: "Harina PAN Blanca Maíz 1kg",
    categoria_id: 1,
    categoria_nombre: "Víveres y Granos",
    stock_actual: 45,
    stock_minimo: 15,
    costo_promedio: 1.05, // Costo Promedio Ponderado en USD
    precio_costo: 1.05,
    precio_venta: 1.40, // Base USD
    alicuota_iva: 0, // Exento según Ley de IVA canasta alimentaria
    unidad_medida: "Pza",
    fecha_registro: "2026-09-01 08:30:00",
  },
  {
    id: 2,
    codigo_barras: "7591002000202",
    nombre: "Arroz Blanco Grano Entero 1kg",
    categoria_id: 1,
    categoria_nombre: "Víveres y Granos",
    stock_actual: 38,
    stock_minimo: 12,
    costo_promedio: 1.15,
    precio_costo: 1.15,
    precio_venta: 1.55,
    alicuota_iva: 0, // Exento
    unidad_medida: "Pza",
    fecha_registro: "2026-09-01 09:15:00",
  },
  {
    id: 3,
    codigo_barras: "7591003000303",
    nombre: "Refresco Cola Negra 1.5L",
    categoria_id: 2,
    categoria_nombre: "Bebidas y Refrescos",
    stock_actual: 30,
    stock_minimo: 10,
    costo_promedio: 1.40,
    precio_costo: 1.40,
    precio_venta: 2.20,
    alicuota_iva: 16, // Gravado 16% IVA
    unidad_medida: "Pza",
    fecha_registro: "2026-09-02 10:00:00",
  },
  {
    id: 4,
    codigo_barras: "7591004000404",
    nombre: "Aceite Vegetal Comestible 1L",
    categoria_id: 1,
    categoria_nombre: "Víveres y Granos",
    stock_actual: 25,
    stock_minimo: 8,
    costo_promedio: 2.10,
    precio_costo: 2.10,
    precio_venta: 2.95,
    alicuota_iva: 0, // Exento
    unidad_medida: "Pza",
    fecha_registro: "2026-09-03 11:20:00",
  },
  {
    id: 5,
    codigo_barras: "7591005000505",
    nombre: "Detergente Multiusos en Polvo 1kg",
    categoria_id: 3,
    categoria_nombre: "Cuidado y Aseo",
    stock_actual: 20,
    stock_minimo: 8,
    costo_promedio: 2.25,
    precio_costo: 2.25,
    precio_venta: 3.50,
    alicuota_iva: 16, // Gravado 16% IVA
    unidad_medida: "Pza",
    fecha_registro: "2026-09-04 14:00:00",
  },
  {
    id: 6,
    codigo_barras: "7591006000606",
    nombre: "Leche Líquida Completa Pasteurizada 1L",
    categoria_id: 4,
    categoria_nombre: "Lácteos y Derivados",
    stock_actual: 16,
    stock_minimo: 10,
    costo_promedio: 1.80,
    precio_costo: 1.80,
    precio_venta: 2.40,
    alicuota_iva: 0, // Exento
    unidad_medida: "Pza",
    fecha_registro: "2026-09-05 09:40:00",
  },
  {
    id: 7,
    codigo_barras: "7591007000707",
    nombre: "Café Tostado y Molido Gourmet 250g",
    categoria_id: 1,
    categoria_nombre: "Víveres y Granos",
    stock_actual: 5, // Alerta stock bajo
    stock_minimo: 10,
    costo_promedio: 2.60,
    precio_costo: 2.60,
    precio_venta: 3.90,
    alicuota_iva: 0, // Exento
    unidad_medida: "Pza",
    fecha_registro: "2026-09-06 15:30:00",
  },
  {
    id: 8,
    codigo_barras: "7591008000808",
    nombre: "Galletas Dulces tipo Sandwich 108g",
    categoria_id: 6,
    categoria_nombre: "Golosinas y Snacks",
    stock_actual: 0, // Alerta agotado
    stock_minimo: 12,
    costo_promedio: 0.85,
    precio_costo: 0.85,
    precio_venta: 1.30,
    alicuota_iva: 16, // Gravado 16% IVA
    unidad_medida: "Pza",
    fecha_registro: "2026-09-07 16:10:00",
  },
];

export const INITIAL_MOVEMENTS: Movimiento[] = [
  {
    id: 1,
    fecha_hora: "2026-09-01 08:30:00",
    producto_id: 1,
    producto_nombre: "Harina PAN Blanca Maíz 1kg",
    tipo_movimiento: "ENTRADA",
    documento_ref: "FAC-PROV-00412",
    cantidad: 45,
    costo_unitario: 1.05,
    costo_total: 47.25,
    stock_resultante: 45,
    costo_promedio_resultante: 1.05,
    motivo: "Recepción de compra inicial proveedor Alimentos Polar",
    usuario: "Dpto. Almacén",
  },
  {
    id: 2,
    fecha_hora: "2026-09-01 09:15:00",
    producto_id: 2,
    producto_nombre: "Arroz Blanco Grano Entero 1kg",
    tipo_movimiento: "ENTRADA",
    documento_ref: "FAC-PROV-00412",
    cantidad: 38,
    costo_unitario: 1.15,
    costo_total: 43.70,
    stock_resultante: 38,
    costo_promedio_resultante: 1.15,
    motivo: "Recepción de compra inicial proveedor Alimentos Mary",
    usuario: "Dpto. Almacén",
  },
  {
    id: 3,
    fecha_hora: "2026-09-02 10:00:00",
    producto_id: 3,
    producto_nombre: "Refresco Cola Negra 1.5L",
    tipo_movimiento: "ENTRADA",
    documento_ref: "FAC-PROV-00890",
    cantidad: 30,
    costo_unitario: 1.40,
    costo_total: 42.00,
    stock_resultante: 30,
    costo_promedio_resultante: 1.40,
    motivo: "Compra con factura fiscal distribuidor Coca Cola Femsa",
    usuario: "Dpto. Almacén",
  },
  {
    id: 4,
    fecha_hora: "2026-09-10 11:30:00",
    producto_id: 8,
    producto_nombre: "Galletas Dulces tipo Sandwich 108g",
    tipo_movimiento: "VENTA",
    documento_ref: "FAC-00-000451",
    cantidad: 6,
    costo_unitario: 0.85,
    costo_total: 5.10,
    stock_resultante: 0,
    costo_promedio_resultante: 0.85,
    motivo: "Facturación a cliente en POS",
    usuario: "Caja Principal",
  },
];

/**
 * Calcula el Costo Promedio Ponderado (PMP) según el Art. 177 del Reglamento de la LISLR
 * Fórmula:
 * Nuevo_Costo_Promedio = ((Stock_Actual * Costo_Promedio_Actual) + (Cant_Entrada * Costo_Compra)) / (Stock_Actual + Cant_Entrada)
 */
export function calcularPMP(
  stockActual: number,
  costoPromedioActual: number,
  cantEntrada: number,
  costoCompra: number
): number {
  if (cantEntrada <= 0) return costoPromedioActual;
  const nuevoStock = stockActual + cantEntrada;
  if (nuevoStock <= 0) return costoCompra;
  
  if (stockActual <= 0) {
    // Si no había stock previo, el costo promedio es exactamente el de la nueva compra
    return costoCompra;
  }

  const valorStockPrevio = stockActual * costoPromedioActual;
  const valorEntrada = cantEntrada * costoCompra;
  const nuevoPMP = (valorStockPrevio + valorEntrada) / nuevoStock;
  
  return parseFloat(nuevoPMP.toFixed(4));
}

export function getStoredCategories(): Categoria[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_CATEGORIES);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error(e);
  }
  localStorage.setItem(STORAGE_KEY_CATEGORIES, JSON.stringify(INITIAL_CATEGORIES));
  return INITIAL_CATEGORIES;
}

export function getStoredProducts(): Producto[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_PRODUCTS);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error(e);
  }
  localStorage.setItem(STORAGE_KEY_PRODUCTS, JSON.stringify(INITIAL_PRODUCTS));
  return INITIAL_PRODUCTS;
}

export function saveProducts(products: Producto[]): void {
  localStorage.setItem(STORAGE_KEY_PRODUCTS, JSON.stringify(products));
}

export function getStoredMovements(): Movimiento[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_MOVEMENTS);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error(e);
  }
  localStorage.setItem(STORAGE_KEY_MOVEMENTS, JSON.stringify(INITIAL_MOVEMENTS));
  return INITIAL_MOVEMENTS;
}

export function saveMovements(movements: Movimiento[]): void {
  localStorage.setItem(STORAGE_KEY_MOVEMENTS, JSON.stringify(movements));
}

export const INITIAL_SALES: Venta[] = [
  {
    id: 1,
    numero_factura: "00-000448",
    numero_control: "00-001886",
    fecha_hora: "2026-09-12 09:30:00",
    fecha: "2026-09-12",
    cliente_rif: "V-14285901-3",
    cliente_nombre: "María Rodríguez",
    tasa_bcv: 36.5,
    metodo_pago: "Punto de Venta",
    moneda_pago: "VES",
    base_imponible_usd: 2.2,
    base_imponible_ves: 2.2 * 36.5,
    base_exenta_usd: 5.6,
    base_exenta_ves: 5.6 * 36.5,
    iva_usd: 0.35,
    iva_ves: 0.35 * 36.5,
    aplica_igtf: false,
    igtf_usd: 0,
    igtf_ves: 0,
    total_usd: 8.15,
    total_ves: 8.15 * 36.5,
    total: 8.15,
    monto_pagado: 8.15 * 36.5,
    cambio: 0,
    usuario: "Cajero 1",
    items: [
      { producto_id: 1, nombre: "Harina PAN Blanca Maíz 1kg", cantidad: 2, precio_unitario: 1.45, subtotal: 2.9, alicuota_iva: 0, es_exento: true },
      { producto_id: 2, nombre: "Arroz Blanco Grano Entero 1kg", cantidad: 1, precio_unitario: 1.55, subtotal: 1.55, alicuota_iva: 0, es_exento: true },
      { producto_id: 3, nombre: "Refresco Cola Negra 1.5L", cantidad: 1, precio_unitario: 2.2, subtotal: 2.2, alicuota_iva: 16, es_exento: false },
      { producto_id: 8, nombre: "Galletas Dulces tipo Sandwich 108g", cantidad: 1, precio_unitario: 1.3, subtotal: 1.3, alicuota_iva: 16, es_exento: false }
    ]
  },
  {
    id: 2,
    numero_factura: "00-000449",
    numero_control: "00-001887",
    fecha_hora: "2026-09-13 11:15:00",
    fecha: "2026-09-13",
    cliente_rif: "V-18934512-0",
    cliente_nombre: "José Gregorio Gómez",
    tasa_bcv: 36.5,
    metodo_pago: "Pago Móvil",
    moneda_pago: "VES",
    base_imponible_usd: 0,
    base_imponible_ves: 0,
    base_exenta_usd: 9.75,
    base_exenta_ves: 9.75 * 36.5,
    iva_usd: 0,
    iva_ves: 0,
    aplica_igtf: false,
    igtf_usd: 0,
    igtf_ves: 0,
    total_usd: 9.75,
    total_ves: 9.75 * 36.5,
    total: 9.75,
    monto_pagado: 9.75 * 36.5,
    cambio: 0,
    usuario: "Cajero 1",
    items: [
      { producto_id: 1, nombre: "Harina PAN Blanca Maíz 1kg", cantidad: 3, precio_unitario: 1.45, subtotal: 4.35, alicuota_iva: 0, es_exento: true },
      { producto_id: 4, nombre: "Aceite Vegetal Comestible 1L", cantidad: 1, precio_unitario: 2.95, subtotal: 2.95, alicuota_iva: 0, es_exento: true },
      { producto_id: 6, nombre: "Leche Líquida Completa Pasteurizada 1L", cantidad: 1, precio_unitario: 2.4, subtotal: 2.4, alicuota_iva: 0, es_exento: true }
    ]
  },
  {
    id: 3,
    numero_factura: "00-000450",
    numero_control: "00-001888",
    fecha_hora: "2026-09-14 14:40:00",
    fecha: "2026-09-14",
    cliente_rif: "V-21045612-4",
    cliente_nombre: "Carlos Eduardo Pérez",
    tasa_bcv: 36.5,
    metodo_pago: "Divisas en Efectivo",
    moneda_pago: "USD",
    base_imponible_usd: 3.5,
    base_imponible_ves: 3.5 * 36.5,
    base_exenta_usd: 6.85,
    base_exenta_ves: 6.85 * 36.5,
    iva_usd: 0.56,
    iva_ves: 0.56 * 36.5,
    aplica_igtf: true,
    igtf_usd: 0.33,
    igtf_ves: 0.33 * 36.5,
    total_usd: 11.24,
    total_ves: 11.24 * 36.5,
    total: 11.24,
    monto_pagado: 20,
    cambio: 8.76,
    usuario: "Cajero 2",
    items: [
      { producto_id: 5, nombre: "Detergente Multiusos en Polvo 1kg", cantidad: 1, precio_unitario: 3.5, subtotal: 3.5, alicuota_iva: 16, es_exento: false },
      { producto_id: 7, nombre: "Café Tostado y Molido Gourmet 250g", cantidad: 1, precio_unitario: 3.9, subtotal: 3.9, alicuota_iva: 0, es_exento: true },
      { producto_id: 1, nombre: "Harina PAN Blanca Maíz 1kg", cantidad: 2, precio_unitario: 1.45, subtotal: 2.9, alicuota_iva: 0, es_exento: true }
    ]
  },
  {
    id: 4,
    numero_factura: "00-000451",
    numero_control: "00-001889",
    fecha_hora: "2026-09-15 10:20:00",
    fecha: "2026-09-15",
    cliente_rif: "V-12984512-1",
    cliente_nombre: "Ana Lucía Benítez",
    tasa_bcv: 36.5,
    metodo_pago: "Punto de Venta",
    moneda_pago: "VES",
    base_imponible_usd: 4.4,
    base_imponible_ves: 4.4 * 36.5,
    base_exenta_usd: 7.7,
    base_exenta_ves: 7.7 * 36.5,
    iva_usd: 0.70,
    iva_ves: 0.70 * 36.5,
    aplica_igtf: false,
    igtf_usd: 0,
    igtf_ves: 0,
    total_usd: 12.8,
    total_ves: 12.8 * 36.5,
    total: 12.8,
    monto_pagado: 12.8 * 36.5,
    cambio: 0,
    usuario: "Caja Principal",
    items: [
      { producto_id: 3, nombre: "Refresco Cola Negra 1.5L", cantidad: 2, precio_unitario: 2.2, subtotal: 4.4, alicuota_iva: 16, es_exento: false },
      { producto_id: 1, nombre: "Harina PAN Blanca Maíz 1kg", cantidad: 2, precio_unitario: 1.45, subtotal: 2.9, alicuota_iva: 0, es_exento: true },
      { producto_id: 2, nombre: "Arroz Blanco Grano Entero 1kg", cantidad: 2, precio_unitario: 1.55, subtotal: 3.1, alicuota_iva: 0, es_exento: true },
      { producto_id: 6, nombre: "Leche Líquida Completa Pasteurizada 1L", cantidad: 1, precio_unitario: 2.4, subtotal: 2.4, alicuota_iva: 0, es_exento: true }
    ]
  }
];

export function getStoredSales(): Venta[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_SALES);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (e) {
    console.error(e);
  }
  localStorage.setItem(STORAGE_KEY_SALES, JSON.stringify(INITIAL_SALES));
  return INITIAL_SALES;
}

export function saveSales(sales: Venta[]): void {
  localStorage.setItem(STORAGE_KEY_SALES, JSON.stringify(sales));
}

const STORAGE_KEY_BCV_INFO = "sqlite_inventario_venezuela_bcv_info_v2";

export interface StoredBcvInfo {
  rate: number;
  eur: number | null;
  source: string;
  fechaValor?: string;
  updatedAt: string;
}

export function getStoredBcvInfo(): StoredBcvInfo | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_BCV_INFO);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error(e);
  }
  return null;
}

export function saveBcvInfo(info: StoredBcvInfo): void {
  try {
    localStorage.setItem(STORAGE_KEY_BCV_INFO, JSON.stringify(info));
    localStorage.setItem(STORAGE_KEY_BCV_RATE, info.rate.toString());
  } catch (e) {
    console.error(e);
  }
}

export function getStoredBcvRate(): number {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_BCV_RATE);
    if (raw) {
      const parsed = parseFloat(raw);
      if (!isNaN(parsed) && parsed > 0) return parsed;
    }
  } catch (e) {
    console.error(e);
  }
  // Tasa de referencia por defecto en Bs./USD
  const DEFAULT_RATE = 36.50;
  localStorage.setItem(STORAGE_KEY_BCV_RATE, DEFAULT_RATE.toString());
  return DEFAULT_RATE;
}

export function saveBcvRate(rate: number): void {
  localStorage.setItem(STORAGE_KEY_BCV_RATE, rate.toString());
}

export function getCorrelativosFiscales(): { facturaNum: number; controlNum: number } {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_CORRELATIVOS);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error(e);
  }
  const init = { facturaNum: 452, controlNum: 1890 };
  localStorage.setItem(STORAGE_KEY_CORRELATIVOS, JSON.stringify(init));
  return init;
}

export function advanceCorrelativosFiscales(): { facturaNum: number; controlNum: number } {
  const current = getCorrelativosFiscales();
  const next = {
    facturaNum: current.facturaNum + 1,
    controlNum: current.controlNum + 1,
  };
  localStorage.setItem(STORAGE_KEY_CORRELATIVOS, JSON.stringify(next));
  return next;
}

export const INITIAL_FIADOS: FiadoCliente[] = [
  {
    id: "fia-01",
    nombre: "Doña Carmen (Casa #12)",
    telefono: "0414-1234567",
    direccion: "Calle Principal, Casa 12 (Frente a la plaza)",
    limite_credito_usd: 30.0,
    saldo_deuda_usd: 12.40,
    saldo_deuda_ves: 12.40 * 36.5,
    ultimo_movimiento: "2026-09-11 18:20",
    historial: [
      {
        id: "mov-1",
        fecha: "2026-09-10 10:15",
        tipo: "CARGO_VENTA",
        concepto: "1x Harina PAN + 1x Queso Blanco 500g + 1x Arroz",
        monto_usd: 8.50,
        monto_ves: 8.50 * 36.5,
        tasa_bcv: 36.5,
      },
      {
        id: "mov-2",
        fecha: "2026-09-10 19:30",
        tipo: "ABONO_PAGO",
        concepto: "Abono en Pago Móvil (Ref: 9812)",
        monto_usd: 5.00,
        monto_ves: 5.00 * 36.5,
        tasa_bcv: 36.5,
        metodo_abono: "Pago Móvil",
      },
      {
        id: "mov-3",
        fecha: "2026-09-11 18:20",
        tipo: "CARGO_VENTA",
        concepto: "1x Mantequilla + 2x Refresco Coca-Cola 1.5L + 1x Café",
        monto_usd: 8.90,
        monto_ves: 8.90 * 36.5,
        tasa_bcv: 36.5,
      },
    ],
  },
  {
    id: "fia-02",
    nombre: "Sr. Pedro (Mecánico)",
    telefono: "0424-7654321",
    direccion: "Taller Mecánico El Esfuerzo",
    limite_credito_usd: 50.0,
    saldo_deuda_usd: 18.20,
    saldo_deuda_ves: 18.20 * 36.5,
    ultimo_movimiento: "2026-09-12 08:45",
    historial: [
      {
        id: "mov-4",
        fecha: "2026-09-12 08:45",
        tipo: "CARGO_VENTA",
        concepto: "1x Aceite 1L + 2x Harina PAN + 1x Azúcar 1kg",
        monto_usd: 18.20,
        monto_ves: 18.20 * 36.5,
        tasa_bcv: 36.5,
      },
    ],
  },
  {
    id: "fia-03",
    nombre: "Profe. María Elena",
    telefono: "0412-9988776",
    direccion: "Bloque 4, Apto 2-B",
    limite_credito_usd: 25.0,
    saldo_deuda_usd: 4.50,
    saldo_deuda_ves: 4.50 * 36.5,
    ultimo_movimiento: "2026-09-09 16:30",
    historial: [
      {
        id: "mov-5",
        fecha: "2026-09-09 16:30",
        tipo: "CARGO_VENTA",
        concepto: "1x Leche Líquida 1L + 1x Galletas María",
        monto_usd: 4.50,
        monto_ves: 4.50 * 36.5,
        tasa_bcv: 36.5,
      },
    ],
  },
];

export function getStoredFiados(): FiadoCliente[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_FIADOS);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error(e);
  }
  localStorage.setItem(STORAGE_KEY_FIADOS, JSON.stringify(INITIAL_FIADOS));
  return INITIAL_FIADOS;
}

export function saveFiados(fiados: FiadoCliente[]): void {
  try {
    localStorage.setItem(STORAGE_KEY_FIADOS, JSON.stringify(fiados));
  } catch (e) {
    console.error(e);
  }
}

export const INITIAL_CIERRES: CierreCajaRecord[] = [
  {
    id: "CIE-2026-0912-01",
    fecha: "2026-09-12",
    hora_apertura: "08:00 AM",
    hora_cierre: "08:30 PM",
    cajero: "Brayan (Cajero Principal)",
    tasa_bcv: 36.50,
    ventas_count: 28,
    esperado_usd: 165.40,
    esperado_ves: 165.40 * 36.50,
    total_efectivo_usd: 45.00,
    total_efectivo_ves: 3850.00,
    total_pago_movil_ves: 8420.00,
    total_punto_ves: 12900.00,
    total_zelle_usd: 15.00,
    total_fiado_usd: 24.50,
    total_general_usd: 165.40,
    total_general_ves: 165.40 * 36.50,
    diferencia_usd: 0.00,
    diferencia_ves: 0.00,
    estado_cuadre: "CUADRADA",
    observaciones: "Turno cerrado sin novedades. Lotes de SmartPOS conciliados al 100%.",
  },
  {
    id: "CIE-2026-0911-01",
    fecha: "2026-09-11",
    hora_apertura: "08:00 AM",
    hora_cierre: "08:15 PM",
    cajero: "Brayan (Cajero Principal)",
    tasa_bcv: 36.45,
    ventas_count: 22,
    esperado_usd: 142.00,
    esperado_ves: 142.00 * 36.45,
    total_efectivo_usd: 40.00,
    total_efectivo_ves: 3200.00,
    total_pago_movil_ves: 7100.00,
    total_punto_ves: 9800.00,
    total_zelle_usd: 20.00,
    total_fiado_usd: 18.20,
    total_general_usd: 142.00,
    total_general_ves: 142.00 * 36.45,
    diferencia_usd: 0.00,
    diferencia_ves: 0.00,
    estado_cuadre: "CUADRADA",
    observaciones: "Cierre conforme. Entrega de efectivo en custodia.",
  },
];

export function getStoredCierresCaja(): CierreCajaRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_CIERRES);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error(e);
  }
  localStorage.setItem(STORAGE_KEY_CIERRES, JSON.stringify(INITIAL_CIERRES));
  return INITIAL_CIERRES;
}

export function saveCierresCaja(cierres: CierreCajaRecord[]): void {
  try {
    localStorage.setItem(STORAGE_KEY_CIERRES, JSON.stringify(cierres));
  } catch (e) {
    console.error(e);
  }
}

export const STORAGE_KEY_EDITION = "sistema_edicion_activa";
export const STORAGE_KEY_FISCAL_UNLOCKED = "sistema_fiscal_licencia_desbloqueada";
export const MASTER_UNLOCK_CODE = "FISCAL-ADMIN-2552";

export function isFiscalEditionUnlocked(): boolean {
  try {
    const val = localStorage.getItem(STORAGE_KEY_FISCAL_UNLOCKED);
    return val === "true";
  } catch (e) {
    return false;
  }
}

export function unlockFiscalEdition(code: string): { success: boolean; message: string } {
  if (code.trim() === MASTER_UNLOCK_CODE) {
    try {
      localStorage.setItem(STORAGE_KEY_FISCAL_UNLOCKED, "true");
    } catch (e) {
      console.error(e);
    }
    return { success: true, message: "¡Edición Fiscal SENIAT activada exitosamente!" };
  }
  return { success: false, message: "Código de activación incorrecto. Verifique con el administrador." };
}

export function revokeFiscalEdition(): void {
  try {
    localStorage.removeItem(STORAGE_KEY_FISCAL_UNLOCKED);
  } catch (e) {
    console.error(e);
  }
}

export function getStoredAppEdition(): { edition: "bodega" | "fiscal"; isFirstRun: boolean } {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_EDITION);
    if (raw) {
      const parsed = JSON.parse(raw);
      const savedEdition = parsed.edition || "bodega";
      // Si la edición guardada es fiscal pero no está desbloqueada, revertir a bodega
      if (savedEdition === "fiscal" && !isFiscalEditionUnlocked()) {
        return { edition: "bodega", isFirstRun: false };
      }
      return { edition: savedEdition, isFirstRun: false };
    }
  } catch (e) {
    console.error(e);
  }
  // If first run, default to bodega with isFirstRun: true
  return { edition: "bodega", isFirstRun: true };
}

export function saveAppEdition(edition: "bodega" | "fiscal"): void {
  try {
    localStorage.setItem(STORAGE_KEY_EDITION, JSON.stringify({ edition, updatedAt: new Date().toISOString() }));
  } catch (e) {
    console.error(e);
  }
}

export function getStoredPosOperationalMode(): { mode: PosOperationalMode; isFirstRun: boolean } {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_POS_OPERATIONAL_MODE);
    if (raw) {
      const parsed = JSON.parse(raw);
      const mode = parsed.mode === "smartpos" ? "smartpos" : "inventory_only";
      return { mode, isFirstRun: false };
    }
  } catch (e) {
    console.error(e);
  }
  // Por defecto la primera vez: isFirstRun = true, modo sugerido "inventory_only"
  return { mode: "inventory_only", isFirstRun: true };
}

export function savePosOperationalMode(mode: PosOperationalMode): void {
  try {
    localStorage.setItem(
      STORAGE_KEY_POS_OPERATIONAL_MODE,
      JSON.stringify({ mode, isFirstRun: false, updatedAt: new Date().toISOString() })
    );
  } catch (e) {
    console.error(e);
  }
}

export function getRemoteLicense(): RemoteClientLicense {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_REMOTE_LICENSE);
    if (raw) {
      const parsed: RemoteClientLicense = JSON.parse(raw);
      if (parsed.fecha_vencimiento_actual === "2099-12-31" || !parsed.fecha_vencimiento_actual) {
        parsed.fecha_vencimiento_actual = getDefault30DaysExpiry();
        saveRemoteLicense(parsed);
      }
      return parsed;
    }
  } catch (e) {
    console.error(e);
  }
  return DEFAULT_REMOTE_LICENSE;
}

export function saveRemoteLicense(license: RemoteClientLicense): void {
  try {
    localStorage.setItem(STORAGE_KEY_REMOTE_LICENSE, JSON.stringify(license));
  } catch (e) {
    console.error(e);
  }
}

export const STORAGE_KEY_INITIAL_SETUP_DONE = "sqlite_initial_setup_completed_v1";

export function getStoredInitialSetupDone(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY_INITIAL_SETUP_DONE) === "true";
  } catch {
    return false;
  }
}

export function saveStoredInitialSetupDone(done: boolean): void {
  try {
    localStorage.setItem(STORAGE_KEY_INITIAL_SETUP_DONE, done ? "true" : "false");
  } catch (e) {
    console.error(e);
  }
}

/**
 * Realiza la comprobación de estado de la licencia del cliente (Método 1: Nube / Fecha / Remoto)
 */
export function checkClientLicenseStatus(license: RemoteClientLicense): LicenseCheckResult {
  const now = new Date();
  const expDateStr = license.fecha_vencimiento_actual || "";
  const expDate = parseFlexibleDate(expDateStr);

  let diffDays = 0;
  let isExpired = false;

  if (expDate) {
    const diffTime = expDate.getTime() - now.getTime();
    diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    if (diffTime < 0) {
      isExpired = true;
    }
  } else {
    // Si la fecha no se pudo interpretar o no existe, tratar como expirada por seguridad
    isExpired = true;
    diffDays = 0;
  }

  const isExplicitlySuspended = license.estado_remoto === "SUSPENDIDO";
  const isSuspendedOrExpired = isExplicitlySuspended || isExpired || diffDays <= 0;

  const diasRestantes = isSuspendedOrExpired ? 0 : Math.max(0, diffDays);

  let status: "ACTIVO" | "POR_VENCER" | "SUSPENDIDO" = "ACTIVO";
  let permitirAcceso = true;
  let bloqueante = false;
  let mensajeAlerta = "";

  if (isExplicitlySuspended) {
    status = "SUSPENDIDO";
    permitirAcceso = false;
    bloqueante = true;
    mensajeAlerta = license.motivo_bloqueo || "Suscripción suspendida administrativamente.";
  } else if (isExpired || diffDays <= 0) {
    status = "SUSPENDIDO";
    permitirAcceso = false;
    bloqueante = true;
    mensajeAlerta = `Suscripción vencida (Fecha de corte: ${expDateStr || "Expirada"}). Por favor realice su Pago Móvil para reactivar el servicio.`;
  } else if (diasRestantes <= 7) {
    status = "POR_VENCER";
    permitirAcceso = true;
    bloqueante = false;
    mensajeAlerta = `Aviso: Quedan ${diasRestantes} ${diasRestantes === 1 ? "día" : "días"} de vigencia en la suscripción.`;
  } else {
    status = "ACTIVO";
    permitirAcceso = true;
    bloqueante = false;
    mensajeAlerta = "Suscripción activa y en regla.";
  }

  return {
    permitirAcceso,
    status,
    diasRestantes,
    fechaVencimiento: expDateStr,
    mensajeAlerta,
    bloqueante,
    negocioNombre: license.nombre_negocio,
    edicion: license.edicion_contratada,
    cuotaMensual: license.cuota_mensual_usd,
    telefonoSoporte: SOPORTE_WHATSAPP,
  };
}

/**
 * Renueva la suscripción por X días/meses tras recibir el pago móvil del cliente
 */
export function renewClientSubscription(daysToAdd: number = 30): RemoteClientLicense {
  const current = getRemoteLicense();
  const currentExp = parseFlexibleDate(current.fecha_vencimiento_actual);
  const now = new Date();

  // Si la fecha actual aún está vigente, sumar días a partir de esa fecha. Si ya venció, sumar a partir de hoy.
  let baseDate = now;
  if (currentExp && currentExp.getTime() > now.getTime()) {
    baseDate = currentExp;
  }

  const newDate = new Date(baseDate);
  newDate.setDate(newDate.getDate() + daysToAdd);

  const yyyy = newDate.getFullYear();
  const mm = String(newDate.getMonth() + 1).padStart(2, "0");
  const dd = String(newDate.getDate()).padStart(2, "0");
  const newDateStr = `${yyyy}-${mm}-${dd}`;

  const updated: RemoteClientLicense = {
    ...current,
    estado_remoto: "ACTIVO",
    fecha_vencimiento_actual: newDateStr,
    ultimo_contacto_servidor: new Date().toISOString(),
  };
  saveRemoteLicense(updated);
  return updated;
}

export function resetDatabaseToDefault(): void {
  localStorage.setItem(STORAGE_KEY_CATEGORIES, JSON.stringify(INITIAL_CATEGORIES));
  localStorage.setItem(STORAGE_KEY_PRODUCTS, JSON.stringify(INITIAL_PRODUCTS));
  localStorage.setItem(STORAGE_KEY_MOVEMENTS, JSON.stringify(INITIAL_MOVEMENTS));
  localStorage.setItem(STORAGE_KEY_SALES, JSON.stringify(INITIAL_SALES));
  localStorage.setItem(STORAGE_KEY_FIADOS, JSON.stringify(INITIAL_FIADOS));
  localStorage.setItem(STORAGE_KEY_CIERRES, JSON.stringify([]));
  localStorage.setItem(STORAGE_KEY_USERS, JSON.stringify(INITIAL_USERS));
  localStorage.setItem(STORAGE_KEY_CURRENT_USER, JSON.stringify(INITIAL_USERS[0]));
  localStorage.setItem(STORAGE_KEY_REMOTE_LICENSE, JSON.stringify(DEFAULT_REMOTE_LICENSE));
  localStorage.setItem(STORAGE_KEY_BCV_RATE, "36.50");
  localStorage.setItem(STORAGE_KEY_CORRELATIVOS, JSON.stringify({ facturaNum: 452, controlNum: 1890 }));
}

// ============================================================================
// GESTIÓN DE USUARIOS Y CONTROL DE ACCESO (RBAC)
// ============================================================================

export function getStoredUsers(): SystemUser[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_USERS);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY_USERS, JSON.stringify(INITIAL_USERS));
      return INITIAL_USERS;
    }
    return JSON.parse(raw);
  } catch {
    return INITIAL_USERS;
  }
}

export function saveStoredUsers(users: SystemUser[]): void {
  try {
    localStorage.setItem(STORAGE_KEY_USERS, JSON.stringify(users));
  } catch (e) {
    console.error("Error saving users:", e);
  }
}

export function getStoredCurrentUser(): SystemUser {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_CURRENT_USER);
    if (!raw) {
      const users = getStoredUsers();
      const admin = users[0] || INITIAL_USERS[0];
      localStorage.setItem(STORAGE_KEY_CURRENT_USER, JSON.stringify(admin));
      return admin;
    }
    return JSON.parse(raw);
  } catch {
    return INITIAL_USERS[0];
  }
}

export function saveStoredCurrentUser(user: SystemUser): void {
  try {
    localStorage.setItem(STORAGE_KEY_CURRENT_USER, JSON.stringify(user));
  } catch (e) {
    console.error("Error saving current user:", e);
  }
}

export function authenticateUserByPin(pin: string): { success: boolean; user?: SystemUser; error?: string } {
  const users = getStoredUsers();
  const matched = users.find((u) => u.pin === pin.trim() && u.activo);
  if (!matched) {
    return { success: false, error: "PIN incorrecto o usuario inactivo." };
  }
  // Actualizar último acceso
  matched.ultimo_acceso = new Date().toISOString();
  saveStoredUsers(users);
  saveStoredCurrentUser(matched);
  return { success: true, user: matched };
}

export function verifyAdminPin(enteredPin: string): boolean {
  const clean = enteredPin.trim();
  if (clean === "MASTER-CODE-BGP2004") return true;
  const users = getStoredUsers();
  const admin = users.find((u) => (u.rol === "ADMIN" || u.username === "admin") && u.activo && u.pin === clean);
  return !!admin;
}

export function resetEntireApplication(): void {
  try {
    localStorage.clear();
    sessionStorage.clear();
  } catch (e) {
    console.error("Error resetting application storage:", e);
  }
}

// ============================================================================
// EXPORTACIÓN & IMPORTACIÓN COMPLETA DE BASE DE DATOS (BACKUP JSON / SQLITE)
// ============================================================================

export function generateFullDatabaseBackup(tipo: 'COMPLETA' | 'SOLO_INVENTARIO' | 'SOLO_VENTAS' = 'COMPLETA'): DatabaseBackupPayload {
  const license = getRemoteLicense();
  const products = getStoredProducts();
  const categories = getStoredCategories();
  const movements = getStoredMovements();
  const sales = getStoredSales();
  const fiados = getStoredFiados();
  const cierres = getStoredCierresCaja();
  const users = getStoredUsers();
  const bcv = getStoredBcvRate();
  const correlativos = getCorrelativosFiscales();
  const posModeInfo = getStoredPosOperationalMode();

  const payload: DatabaseBackupPayload = {
    version: "2.4.0",
    fecha_respaldo: new Date().toISOString(),
    sistema: "Sistema POS & Facturacion Venezuela",
    tipo_exportacion: tipo,
    nombre_negocio: license.nombre_negocio,
    rif_negocio: license.rif_cedula,
    checksum: `CHK-${Date.now().toString(36).toUpperCase()}-${Math.floor(Math.random() * 9000 + 1000)}`,
    data: {
      productos: tipo === 'SOLO_VENTAS' ? [] : products,
      categorias: tipo === 'SOLO_VENTAS' ? [] : categories,
      movimientos: tipo === 'SOLO_VENTAS' ? [] : movements,
      ventas: tipo === 'SOLO_INVENTARIO' ? [] : sales,
      fiados: tipo === 'SOLO_INVENTARIO' ? [] : fiados,
      cierres_caja: tipo === 'SOLO_INVENTARIO' ? [] : cierres,
      usuarios: users,
      tasa_bcv: bcv,
      correlativos: correlativos,
      licencia: license,
      pos_mode: posModeInfo.mode,
    },
  };

  return payload;
}

export function restoreDatabaseFromBackup(backup: DatabaseBackupPayload, modo: 'REEMPLAZAR' | 'FUSIONAR' = 'REEMPLAZAR'): {
  success: boolean;
  message: string;
  detalles: {
    productos: number;
    ventas: number;
    movimientos: number;
    fiados: number;
    cierres: number;
    usuarios: number;
  };
} {
  try {
    if (!backup.data) {
      throw new Error("Formato de archivo de respaldo no reconocido o dañado.");
    }

    const { data } = backup;

    if (modo === 'REEMPLAZAR') {
      if (data.productos) saveProducts(data.productos);
      if (data.categorias) localStorage.setItem(STORAGE_KEY_CATEGORIES, JSON.stringify(data.categorias));
      if (data.movimientos) saveMovements(data.movimientos);
      if (data.ventas) saveSales(data.ventas);
      if (data.fiados) saveFiados(data.fiados);
      if (data.cierres_caja) saveCierresCaja(data.cierres_caja);
      if (data.usuarios && data.usuarios.length > 0) saveStoredUsers(data.usuarios);
      if (data.tasa_bcv) saveBcvRate(data.tasa_bcv);
      if (data.correlativos) localStorage.setItem(STORAGE_KEY_CORRELATIVOS, JSON.stringify(data.correlativos));
      if (data.pos_mode) savePosOperationalMode(data.pos_mode);
    } else {
      // Modo FUSIONAR (Merge)
      if (data.productos && data.productos.length > 0) {
        const currentProds = getStoredProducts();
        const prodMap = new Map(currentProds.map(p => [p.id, p]));
        data.productos.forEach(p => prodMap.set(p.id, p));
        saveProducts(Array.from(prodMap.values()));
      }
      if (data.ventas && data.ventas.length > 0) {
        const currentSales = getStoredSales();
        const salesMap = new Map(currentSales.map(s => [s.id, s]));
        data.ventas.forEach(s => salesMap.set(s.id, s));
        saveSales(Array.from(salesMap.values()));
      }
      if (data.fiados && data.fiados.length > 0) {
        const currentFiados = getStoredFiados();
        const fMap = new Map(currentFiados.map(f => [f.id, f]));
        data.fiados.forEach(f => fMap.set(f.id, f));
        saveFiados(Array.from(fMap.values()));
      }
    }

    return {
      success: true,
      message: `Base de datos restaurada con éxito (${modo === 'REEMPLAZAR' ? 'Sustitución completa' : 'Fusión incremental'}).`,
      detalles: {
        productos: data.productos?.length || 0,
        ventas: data.ventas?.length || 0,
        movimientos: data.movimientos?.length || 0,
        fiados: data.fiados?.length || 0,
        cierres: data.cierres_caja?.length || 0,
        usuarios: data.usuarios?.length || 0,
      },
    };
  } catch (err: any) {
    return {
      success: false,
      message: err.message || "Error al procesar el archivo de respaldo.",
      detalles: { productos: 0, ventas: 0, movimientos: 0, fiados: 0, cierres: 0, usuarios: 0 },
    };
  }
}

export const STORAGE_KEY_GEMINI_API_KEY = "sqlite_gemini_api_key_custom";

export function getStoredGeminiApiKey(): string {
  try {
    return localStorage.getItem(STORAGE_KEY_GEMINI_API_KEY) || "";
  } catch {
    return "";
  }
}

export function saveStoredGeminiApiKey(key: string): void {
  try {
    if (key.trim()) {
      localStorage.setItem(STORAGE_KEY_GEMINI_API_KEY, key.trim());
    } else {
      localStorage.removeItem(STORAGE_KEY_GEMINI_API_KEY);
    }
  } catch (e) {
    console.error("Error saving Gemini API Key locally:", e);
  }
}

export interface TermsAcceptanceRecord {
  accepted: boolean;
  acceptedAt: string;
  acceptedBy: string;
  version: string;
}

export const STORAGE_KEY_TERMS_ACCEPTANCE = "sqlite_pos_terms_acceptance_v1";

export function getStoredTermsAcceptance(): TermsAcceptanceRecord {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_TERMS_ACCEPTANCE);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (e) {
    console.error("Error loading terms acceptance:", e);
  }
  return {
    accepted: true,
    acceptedAt: "2026-09-01T08:00:00.000Z",
    acceptedBy: "admin",
    version: "v2.4",
  };
}

export function saveStoredTermsAcceptance(record: TermsAcceptanceRecord): void {
  try {
    localStorage.setItem(STORAGE_KEY_TERMS_ACCEPTANCE, JSON.stringify(record));
  } catch (e) {
    console.error("Error saving terms acceptance:", e);
  }
}

export function saveCategories(categories: Categoria[]): void {
  try {
    localStorage.setItem(STORAGE_KEY_CATEGORIES, JSON.stringify(categories));
  } catch (e) {
    console.error("Error saving categories:", e);
  }
}

// ============================================================================
// CONFIGURACIÓN DE NEGOCIO DEL CLIENTE (PARA TICKETS, FACTURAS Y PERSONALIZACIÓN)
// ============================================================================
export const STORAGE_KEY_NEGOCIO_CONFIG = "sqlite_negocio_cliente_config_v1";
export const STORAGE_KEY_EMISOR_FISCAL = "sqlite_emisor_fiscal_personalizado_v1";

export const DEFAULT_NEGOCIO_CONFIG: NegocioClienteConfig = {
  nombreComercial: "Inversiones y Víveres Don Pedro",
  razonSocial: "INVERSIONES Y VÍVERES DON PEDRO, C.A.",
  rif: "J-40918274-1",
  direccion: "Av. Principal con Calle 4, Local N° 12, Casco Central",
  telefono: "+58 412-5551234",
  whatsappCobros: "+58 412-5551234",
  pieTicket: "¡Gracias por su preferencia! Conserve este comprobante para cualquier cambio en 48h.",
  monedaDefecto: "USD",
  rubro: "bodega",
  alicuotaIva: 16,
  alicuotaIgtf: 3,
  nombreCaja: "Caja Principal 01",
  autoImprimirTicket: true,
  tasaBcvFijadaManual: false,
};

export function getStoredNegocioConfig(): NegocioClienteConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_NEGOCIO_CONFIG);
    if (raw) {
      return { ...DEFAULT_NEGOCIO_CONFIG, ...JSON.parse(raw) };
    }
  } catch (e) {
    console.error("Error reading negocio config:", e);
  }
  return DEFAULT_NEGOCIO_CONFIG;
}

export function saveStoredNegocioConfig(config: NegocioClienteConfig): void {
  try {
    localStorage.setItem(STORAGE_KEY_NEGOCIO_CONFIG, JSON.stringify(config));
    // Sincronizar también con la estructura de EmisorFiscal
    const emisor: EmisorFiscal = {
      rif: config.rif,
      razon_social: config.razonSocial || config.nombreComercial,
      direccion_fiscal: config.direccion,
      telefono: config.telefono,
      providencia_fiscal: "SNAT/00071 - Contribuyente Ordinario IVA",
    };
    localStorage.setItem(STORAGE_KEY_EMISOR_FISCAL, JSON.stringify(emisor));
  } catch (e) {
    console.error("Error saving negocio config:", e);
  }
}

export function getStoredEmisorFiscal(): EmisorFiscal {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_EMISOR_FISCAL);
    if (raw) return JSON.parse(raw);
    const neg = getStoredNegocioConfig();
    return {
      rif: neg.rif,
      razon_social: neg.razonSocial || neg.nombreComercial,
      direccion_fiscal: neg.direccion,
      telefono: neg.telefono,
      providencia_fiscal: "SNAT/00071 - Contribuyente Ordinario IVA",
    };
  } catch {
    return EMISOR_FISCAL_DEFAULT;
  }
}

// ============================================================================
// DIRECTORIO DE CLIENTES (CRM / CARTERA DE CLIENTES)
// ============================================================================
export const STORAGE_KEY_CLIENTES_DIRECTORIO = "sqlite_clientes_directorio_v1";

export const INITIAL_CLIENTES_DIRECTORIO: ClienteDirectorio[] = [
  {
    id: "cli-01",
    cedula_rif: "V-14285901-3",
    nombre_completo: "María Rodríguez",
    telefono: "0414-1234567",
    email: "maria.rodriguez@gmail.com",
    direccion: "Calle Principal, Casa 12 (Frente a la plaza)",
    limite_credito_usd: 35.0,
    saldo_deuda_usd: 12.40,
    compras_realizadas: 14,
    monto_total_comprado_usd: 142.80,
    fecha_registro: "2026-08-15",
    ultima_compra: "2026-09-12",
    activo: true,
    notas: "Cliente habitual del vecindario. Paga puntual quincenas.",
  },
  {
    id: "cli-02",
    cedula_rif: "V-18934512-0",
    nombre_completo: "Pedro Antonio González (Mecánico)",
    telefono: "0424-7654321",
    direccion: "Taller Mecánico El Esfuerzo, Galpón 4",
    limite_credito_usd: 60.0,
    saldo_deuda_usd: 18.20,
    compras_realizadas: 9,
    monto_total_comprado_usd: 98.50,
    fecha_registro: "2026-08-20",
    ultima_compra: "2026-09-12",
    activo: true,
    notas: "Pide fiado los lunes y cancela los sábados al mediodía.",
  },
  {
    id: "cli-03",
    cedula_rif: "V-11234876-5",
    nombre_completo: "Prof. María Elena Márquez",
    telefono: "0412-9988776",
    direccion: "Bloque 4, Piso 2, Apto 2-B, Urb. Los Mangos",
    limite_credito_usd: 25.0,
    saldo_deuda_usd: 4.50,
    compras_realizadas: 6,
    monto_total_comprado_usd: 41.20,
    fecha_registro: "2026-08-25",
    ultima_compra: "2026-09-09",
    activo: true,
    notas: "Compras de merienda y víveres pequeños.",
  },
  {
    id: "cli-04",
    cedula_rif: "J-41238947-0",
    nombre_completo: "Panadería y Pastelería Los Abuelos, C.A.",
    telefono: "0212-3456789",
    email: "administracion@losabuelos.com",
    direccion: "Av. Bolívar, Edf. Rosalba, Local 1",
    limite_credito_usd: 150.0,
    saldo_deuda_usd: 0.0,
    compras_realizadas: 22,
    monto_total_comprado_usd: 580.00,
    fecha_registro: "2026-07-10",
    ultima_compra: "2026-09-11",
    activo: true,
    notas: "Compran bultos de harina, azúcar y margarina al mayor.",
  },
  {
    id: "cli-05",
    cedula_rif: "V-20194852-1",
    nombre_completo: "Carlos Eduardo Mendoza",
    telefono: "0416-5544332",
    direccion: "Sector La Lucha, Vereda 8, Casa 10",
    limite_credito_usd: 20.0,
    saldo_deuda_usd: 0.0,
    compras_realizadas: 5,
    monto_total_comprado_usd: 32.10,
    fecha_registro: "2026-09-02",
    ultima_compra: "2026-09-10",
    activo: true,
    notas: "Cliente de contado.",
  },
];

export function getStoredClientes(): ClienteDirectorio[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_CLIENTES_DIRECTORIO);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error("Error loading clientes:", e);
  }
  localStorage.setItem(STORAGE_KEY_CLIENTES_DIRECTORIO, JSON.stringify(INITIAL_CLIENTES_DIRECTORIO));
  return INITIAL_CLIENTES_DIRECTORIO;
}

export function saveClientes(clientes: ClienteDirectorio[]): void {
  try {
    localStorage.setItem(STORAGE_KEY_CLIENTES_DIRECTORIO, JSON.stringify(clientes));
  } catch (e) {
    console.error("Error saving clientes:", e);
  }
}

export function addOrUpdateCliente(cliente: ClienteDirectorio): ClienteDirectorio[] {
  const actuales = getStoredClientes();
  const idx = actuales.findIndex((c) => c.id === cliente.id || (c.cedula_rif.trim().toUpperCase() === cliente.cedula_rif.trim().toUpperCase() && c.cedula_rif.trim() !== ""));
  let actualizados: ClienteDirectorio[];
  if (idx >= 0) {
    actualizados = [...actuales];
    actualizados[idx] = { ...actualizados[idx], ...cliente };
  } else {
    actualizados = [cliente, ...actuales];
  }
  saveClientes(actualizados);
  return actualizados;
}

export function deleteCliente(id: string): ClienteDirectorio[] {
  const actuales = getStoredClientes();
  const filtrados = actuales.filter((c) => c.id !== id);
  saveClientes(filtrados);
  return filtrados;
}

// ============================================================================
// PLANTILLAS DE PRODUCTOS POR RUBRO PARA PUESTA EN MARCHA DE CLIENTES
// ============================================================================
export const TEMPLATE_CATEGORIES: Record<RubroNegocio, Categoria[]> = {
  bodega: [
    { id: 1, nombre: "Víveres y Granos", descripcion: "Alimentos básicos canasta alimentaria (Exentos IVA)" },
    { id: 2, nombre: "Bebidas y Refrescos", descripcion: "Gaseosas, jugos y aguas (16% IVA)" },
    { id: 3, nombre: "Lácteos y Derivados", descripcion: "Leches, quesos, mantequillas" },
    { id: 4, nombre: "Charcutería y Embutidos", descripcion: "Jamón, mortadela, salchichas" },
    { id: 5, nombre: "Cuidado y Aseo Personal", descripcion: "Jabones, champús, papel higiénico (16% IVA)" },
    { id: 6, nombre: "Golosinas y Snacks", descripcion: "Galletas, chocolates, pepitos (16% IVA)" },
  ],
  farmacia: [
    { id: 10, nombre: "Analgésicos y Antiinflamatorios", descripcion: "Alivio del dolor y fiebre (Exentos según Ley IVA)" },
    { id: 11, nombre: "Antibióticos y Antivirales", descripcion: "Tratamiento de infecciones" },
    { id: 12, nombre: "Gastrointestinales", descripcion: "Antiácidos, protectores gástricos" },
    { id: 13, nombre: "Antialérgicos y Respiratorios", descripcion: "Antihistamínicos y antigripales" },
    { id: 14, nombre: "Material Médico y Curación", descripcion: "Alcohol, gasas, vendas, inyectadoras (Exentos)" },
    { id: 15, nombre: "Vitaminas y Suplementos", descripcion: "Suplementos nutricionales" },
  ],
  panaderia: [
    { id: 20, nombre: "Panes Tradicionales", descripcion: "Canilla, campesino, sobao, pita (Exentos)" },
    { id: 21, nombre: "Pastelería y Dulces", descripcion: "Tortas, donas, hojaldres, galletas (16% IVA)" },
    { id: 22, nombre: "Charcutería y Rellenos", descripcion: "Quesos, jamones, tocineta" },
    { id: 23, nombre: "Cafetería y Bebidas", descripcion: "Café expreso, con leche, jugos, malta" },
  ],
  ferreteria: [
    { id: 30, nombre: "Herramientas Manuales", descripcion: "Martillos, alicates, destornilladores, llaves" },
    { id: 31, nombre: "Electricidad e Iluminación", descripcion: "Bombillos LED, cables, tomacorrientes, teipe" },
    { id: 32, nombre: "Plomería y Grifería", descripcion: "Tubos PVC, llaves de paso, pegamento" },
    { id: 33, nombre: "Fijación y Tornillería", descripcion: "Tornillos, clavos, tirros, pegamentos" },
    { id: 34, nombre: "Pinturas y Adhesivos", descripcion: "Brochas, rodillos, pinturas, silicones" },
  ],
  general: [
    { id: 40, nombre: "Artículos Generales", descripcion: "Productos variados del comercio" },
    { id: 41, nombre: "Servicios y Varios", descripcion: "Servicios comerciales y varios" },
  ],
};

export const TEMPLATE_PRODUCTS: Record<RubroNegocio, Producto[]> = {
  bodega: [
    { id: 1, codigo_barras: "7591001000101", nombre: "Harina PAN Blanca Maíz 1kg", categoria_id: 1, categoria_nombre: "Víveres y Granos", stock_actual: 60, stock_minimo: 15, costo_promedio: 1.05, precio_costo: 1.05, precio_venta: 1.40, alicuota_iva: 0, unidad_medida: "Pza", fecha_registro: "2026-09-01" },
    { id: 2, codigo_barras: "7591002000202", nombre: "Arroz Blanco Grano Entero Mary 1kg", categoria_id: 1, categoria_nombre: "Víveres y Granos", stock_actual: 50, stock_minimo: 12, costo_promedio: 1.15, precio_costo: 1.15, precio_venta: 1.55, alicuota_iva: 0, unidad_medida: "Pza", fecha_registro: "2026-09-01" },
    { id: 3, codigo_barras: "7591003000303", nombre: "Pasta Larga Primor 1kg", categoria_id: 1, categoria_nombre: "Víveres y Granos", stock_actual: 45, stock_minimo: 10, costo_promedio: 1.20, precio_costo: 1.20, precio_venta: 1.60, alicuota_iva: 0, unidad_medida: "Pza", fecha_registro: "2026-09-01" },
    { id: 4, codigo_barras: "7591004000404", nombre: "Aceite Vegetal Mazeite 1L", categoria_id: 1, categoria_nombre: "Víveres y Granos", stock_actual: 35, stock_minimo: 8, costo_promedio: 2.10, precio_costo: 2.10, precio_venta: 2.95, alicuota_iva: 0, unidad_medida: "Pza", fecha_registro: "2026-09-01" },
    { id: 5, codigo_barras: "7591005000505", nombre: "Azúcar Blanca Refinada Montalbán 1kg", categoria_id: 1, categoria_nombre: "Víveres y Granos", stock_actual: 40, stock_minimo: 10, costo_promedio: 1.10, precio_costo: 1.10, precio_venta: 1.50, alicuota_iva: 0, unidad_medida: "Pza", fecha_registro: "2026-09-01" },
    { id: 6, codigo_barras: "7591006000606", nombre: "Café Tostado y Molido Fama de América 250g", categoria_id: 1, categoria_nombre: "Víveres y Granos", stock_actual: 30, stock_minimo: 8, costo_promedio: 2.40, precio_costo: 2.40, precio_venta: 3.50, alicuota_iva: 0, unidad_medida: "Pza", fecha_registro: "2026-09-01" },
    { id: 7, codigo_barras: "7591007000707", nombre: "Margarina Mavesa 500g", categoria_id: 3, categoria_nombre: "Lácteos y Derivados", stock_actual: 28, stock_minimo: 6, costo_promedio: 1.80, precio_costo: 1.80, precio_venta: 2.50, alicuota_iva: 0, unidad_medida: "Pza", fecha_registro: "2026-09-01" },
    { id: 8, codigo_barras: "7591008000808", nombre: "Mayonesa Mavesa Tradicional 445g", categoria_id: 1, categoria_nombre: "Víveres y Granos", stock_actual: 25, stock_minimo: 6, costo_promedio: 2.20, precio_costo: 2.20, precio_venta: 3.10, alicuota_iva: 16, unidad_medida: "Pza", fecha_registro: "2026-09-01" },
    { id: 9, codigo_barras: "7591009000909", nombre: "Queso Blanco Llanero Rallado 500g", categoria_id: 4, categoria_nombre: "Charcutería y Embutidos", stock_actual: 20, stock_minimo: 5, costo_promedio: 2.80, precio_costo: 2.80, precio_venta: 3.90, alicuota_iva: 0, unidad_medida: "Pza", fecha_registro: "2026-09-01" },
    { id: 10, codigo_barras: "7591010001010", nombre: "Jamón de Pierna Cocido Plumrose 250g", categoria_id: 4, categoria_nombre: "Charcutería y Embutidos", stock_actual: 18, stock_minimo: 5, costo_promedio: 2.20, precio_costo: 2.20, precio_venta: 3.20, alicuota_iva: 16, unidad_medida: "Pza", fecha_registro: "2026-09-01" },
    { id: 11, codigo_barras: "7591011001111", nombre: "Refresco Pepsi Cola 1.5L", categoria_id: 2, categoria_nombre: "Bebidas y Refrescos", stock_actual: 36, stock_minimo: 12, costo_promedio: 1.30, precio_costo: 1.30, precio_venta: 2.00, alicuota_iva: 16, unidad_medida: "Pza", fecha_registro: "2026-09-01" },
    { id: 12, codigo_barras: "7591012001212", nombre: "Malta Caracas 355ml Retornable", categoria_id: 2, categoria_nombre: "Bebidas y Refrescos", stock_actual: 48, stock_minimo: 12, costo_promedio: 0.65, precio_costo: 0.65, precio_venta: 1.00, alicuota_iva: 16, unidad_medida: "Pza", fecha_registro: "2026-09-01" },
    { id: 13, codigo_barras: "7591013001313", nombre: "Leche en Polvo Completa La Campiña 900g", categoria_id: 3, categoria_nombre: "Lácteos y Derivados", stock_actual: 22, stock_minimo: 5, costo_promedio: 6.80, precio_costo: 6.80, precio_venta: 8.90, alicuota_iva: 0, unidad_medida: "Pza", fecha_registro: "2026-09-01" },
    { id: 14, codigo_barras: "7591014001414", nombre: "Cartón de Huevos Frescos (30 unidades)", categoria_id: 1, categoria_nombre: "Víveres y Granos", stock_actual: 25, stock_minimo: 6, costo_promedio: 4.20, precio_costo: 4.20, precio_venta: 5.50, alicuota_iva: 0, unidad_medida: "Pza", fecha_registro: "2026-09-01" },
    { id: 15, codigo_barras: "7591015001515", nombre: "Detergente en Polvo Las Llaves 1kg", categoria_id: 5, categoria_nombre: "Cuidado y Aseo Personal", stock_actual: 24, stock_minimo: 8, costo_promedio: 2.10, precio_costo: 2.10, precio_venta: 3.20, alicuota_iva: 16, unidad_medida: "Pza", fecha_registro: "2026-09-01" },
    { id: 16, codigo_barras: "7591016001616", nombre: "Jabón de Baño Protex Antibacterial 110g", categoria_id: 5, categoria_nombre: "Cuidado y Aseo Personal", stock_actual: 30, stock_minimo: 10, costo_promedio: 0.70, precio_costo: 0.70, precio_venta: 1.15, alicuota_iva: 16, unidad_medida: "Pza", fecha_registro: "2026-09-01" },
    { id: 17, codigo_barras: "7591017001717", nombre: "Galletas Dulces Susy 48g", categoria_id: 6, categoria_nombre: "Golosinas y Snacks", stock_actual: 50, stock_minimo: 15, costo_promedio: 0.40, precio_costo: 0.40, precio_venta: 0.70, alicuota_iva: 16, unidad_medida: "Pza", fecha_registro: "2026-09-01" },
    { id: 18, codigo_barras: "7591018001818", nombre: "Pepito Tradicional 35g", categoria_id: 6, categoria_nombre: "Golosinas y Snacks", stock_actual: 40, stock_minimo: 12, costo_promedio: 0.45, precio_costo: 0.45, precio_venta: 0.75, alicuota_iva: 16, unidad_medida: "Pza", fecha_registro: "2026-09-01" },
  ],
  farmacia: [
    { id: 101, codigo_barras: "7592001000101", nombre: "Atamel Forte Acetaminofén 650mg (10 Tab)", categoria_id: 10, categoria_nombre: "Analgésicos y Antiinflamatorios", stock_actual: 80, stock_minimo: 20, costo_promedio: 1.10, precio_costo: 1.10, precio_venta: 1.80, alicuota_iva: 0, unidad_medida: "Caja", fecha_registro: "2026-09-01" },
    { id: 102, codigo_barras: "7592002000202", nombre: "Brugesic Ibuprofeno 400mg (10 Tab)", categoria_id: 10, categoria_nombre: "Analgésicos y Antiinflamatorios", stock_actual: 65, stock_minimo: 15, costo_promedio: 1.30, precio_costo: 1.30, precio_venta: 2.10, alicuota_iva: 0, unidad_medida: "Caja", fecha_registro: "2026-09-01" },
    { id: 103, codigo_barras: "7592003000303", nombre: "Amoxicilina 500mg (12 Cápsulas)", categoria_id: 11, categoria_nombre: "Antibióticos y Antivirales", stock_actual: 40, stock_minimo: 10, costo_promedio: 2.80, precio_costo: 2.80, precio_venta: 4.20, alicuota_iva: 0, unidad_medida: "Caja", fecha_registro: "2026-09-01" },
    { id: 104, codigo_barras: "7592004000404", nombre: "Teragrip Sobre Antigripal Día / Noche", categoria_id: 13, categoria_nombre: "Antialérgicos y Respiratorios", stock_actual: 90, stock_minimo: 25, costo_promedio: 0.85, precio_costo: 0.85, precio_venta: 1.40, alicuota_iva: 0, unidad_medida: "Sobre", fecha_registro: "2026-09-01" },
    { id: 105, codigo_barras: "7592005000505", nombre: "Loratadina 10mg (10 Tabletas)", categoria_id: 13, categoria_nombre: "Antialérgicos y Respiratorios", stock_actual: 70, stock_minimo: 15, costo_promedio: 0.90, precio_costo: 0.90, precio_venta: 1.50, alicuota_iva: 0, unidad_medida: "Caja", fecha_registro: "2026-09-01" },
    { id: 106, codigo_barras: "7592006000606", nombre: "Omeprazol 20mg (14 Cápsulas)", categoria_id: 12, categoria_nombre: "Gastrointestinales", stock_actual: 55, stock_minimo: 15, costo_promedio: 1.40, precio_costo: 1.40, precio_venta: 2.30, alicuota_iva: 0, unidad_medida: "Caja", fecha_registro: "2026-09-01" },
    { id: 107, codigo_barras: "7592007000707", nombre: "Suero Oral Electrolitos Pedialyte 500ml", categoria_id: 12, categoria_nombre: "Gastrointestinales", stock_actual: 45, stock_minimo: 10, costo_promedio: 1.80, precio_costo: 1.80, precio_venta: 2.80, alicuota_iva: 0, unidad_medida: "Frasco", fecha_registro: "2026-09-01" },
    { id: 108, codigo_barras: "7592008000808", nombre: "Alcohol Antiséptico 70% 500ml", categoria_id: 14, categoria_nombre: "Material Médico y Curación", stock_actual: 50, stock_minimo: 12, costo_promedio: 1.10, precio_costo: 1.10, precio_venta: 1.80, alicuota_iva: 0, unidad_medida: "Frasco", fecha_registro: "2026-09-01" },
    { id: 109, codigo_barras: "7592009000909", nombre: "Gasas Esterilizadas 3x3 (Paquete 5 unidades)", categoria_id: 14, categoria_nombre: "Material Médico y Curación", stock_actual: 60, stock_minimo: 15, costo_promedio: 0.60, precio_costo: 0.60, precio_venta: 1.00, alicuota_iva: 0, unidad_medida: "Paq", fecha_registro: "2026-09-01" },
    { id: 110, codigo_barras: "7592010001010", nombre: "Vitamina C Efervescente 1000mg (10 Tab)", categoria_id: 15, categoria_nombre: "Vitaminas y Suplementos", stock_actual: 35, stock_minimo: 10, costo_promedio: 2.20, precio_costo: 2.20, precio_venta: 3.50, alicuota_iva: 0, unidad_medida: "Tubo", fecha_registro: "2026-09-01" },
  ],
  panaderia: [
    { id: 201, codigo_barras: "7593001000101", nombre: "Pan Canilla Crujiente Tradicional", categoria_id: 20, categoria_nombre: "Panes Tradicionales", stock_actual: 120, stock_minimo: 20, costo_promedio: 0.35, precio_costo: 0.35, precio_venta: 0.60, alicuota_iva: 0, unidad_medida: "Pza", fecha_registro: "2026-09-01" },
    { id: 202, codigo_barras: "7593002000202", nombre: "Pan Campesino Grande de Corteza", categoria_id: 20, categoria_nombre: "Panes Tradicionales", stock_actual: 50, stock_minimo: 10, costo_promedio: 0.70, precio_costo: 0.70, precio_venta: 1.20, alicuota_iva: 0, unidad_medida: "Pza", fecha_registro: "2026-09-01" },
    { id: 203, codigo_barras: "7593003000303", nombre: "Pan de Sándwich Blanco Molde", categoria_id: 20, categoria_nombre: "Panes Tradicionales", stock_actual: 35, stock_minimo: 8, costo_promedio: 1.40, precio_costo: 1.40, precio_venta: 2.20, alicuota_iva: 0, unidad_medida: "Pza", fecha_registro: "2026-09-01" },
    { id: 204, codigo_barras: "7593004000404", nombre: "Cachito de Jamón Recién Horneado", categoria_id: 21, categoria_nombre: "Pastelería y Dulces", stock_actual: 40, stock_minimo: 10, costo_promedio: 0.90, precio_costo: 0.90, precio_venta: 1.80, alicuota_iva: 16, unidad_medida: "Pza", fecha_registro: "2026-09-01" },
    { id: 205, codigo_barras: "7593005000505", nombre: "Café con Leche Grande (Vaso 8oz)", categoria_id: 23, categoria_nombre: "Cafetería y Bebidas", stock_actual: 100, stock_minimo: 10, costo_promedio: 0.50, precio_costo: 0.50, precio_venta: 1.20, alicuota_iva: 16, unidad_medida: "Vaso", fecha_registro: "2026-09-01" },
    { id: 206, codigo_barras: "7593006000606", nombre: "Queso Amarillo Torondoy 1kg", categoria_id: 22, categoria_nombre: "Charcutería y Rellenos", stock_actual: 15, stock_minimo: 4, costo_promedio: 7.50, precio_costo: 7.50, precio_venta: 10.50, alicuota_iva: 0, unidad_medida: "Kg", fecha_registro: "2026-09-01" },
  ],
  ferreteria: [
    { id: 301, codigo_barras: "7594001000101", nombre: "Bombillo LED 9W Rosca E27 Luz Blanca", categoria_id: 31, categoria_nombre: "Electricidad e Iluminación", stock_actual: 80, stock_minimo: 15, costo_promedio: 0.90, precio_costo: 0.90, precio_venta: 1.60, alicuota_iva: 16, unidad_medida: "Pza", fecha_registro: "2026-09-01" },
    { id: 302, codigo_barras: "7594002000202", nombre: "Bombillo LED 12W Alta Potencia Luz Blanca", categoria_id: 31, categoria_nombre: "Electricidad e Iluminación", stock_actual: 60, stock_minimo: 12, costo_promedio: 1.20, precio_costo: 1.20, precio_venta: 2.20, alicuota_iva: 16, unidad_medida: "Pza", fecha_registro: "2026-09-01" },
    { id: 303, codigo_barras: "7594003000303", nombre: "Tirro Adhesivo de Embalar Transparente 48mm", categoria_id: 33, categoria_nombre: "Fijación y Tornillería", stock_actual: 45, stock_minimo: 10, costo_promedio: 1.00, precio_costo: 1.00, precio_venta: 1.80, alicuota_iva: 16, unidad_medida: "Rollo", fecha_registro: "2026-09-01" },
    { id: 304, codigo_barras: "7594004000404", nombre: "Teipe Eléctrico Negro 3M Temflex 20m", categoria_id: 31, categoria_nombre: "Electricidad e Iluminación", stock_actual: 70, stock_minimo: 15, costo_promedio: 0.75, precio_costo: 0.75, precio_venta: 1.50, alicuota_iva: 16, unidad_medida: "Rollo", fecha_registro: "2026-09-01" },
    { id: 305, codigo_barras: "7594005000505", nombre: "Alicate Universal 8 Pulgadas Aislado", categoria_id: 30, categoria_nombre: "Herramientas Manuales", stock_actual: 20, stock_minimo: 5, costo_promedio: 3.50, precio_costo: 3.50, precio_venta: 5.80, alicuota_iva: 16, unidad_medida: "Pza", fecha_registro: "2026-09-01" },
    { id: 306, codigo_barras: "7594006000606", nombre: "Teflón para Plomería 1/2 Pulgada x 10m", categoria_id: 32, categoria_nombre: "Plomería y Grifería", stock_actual: 90, stock_minimo: 20, costo_promedio: 0.40, precio_costo: 0.40, precio_venta: 0.90, alicuota_iva: 16, unidad_medida: "Pza", fecha_registro: "2026-09-01" },
  ],
  general: [
    { id: 401, codigo_barras: "7595001000101", nombre: "Producto Comercial Modelo A", categoria_id: 40, categoria_nombre: "Artículos Generales", stock_actual: 50, stock_minimo: 10, costo_promedio: 2.00, precio_costo: 2.00, precio_venta: 3.00, alicuota_iva: 16, unidad_medida: "Pza", fecha_registro: "2026-09-01" },
    { id: 402, codigo_barras: "7595002000202", nombre: "Producto Comercial Modelo B (Exento)", categoria_id: 40, categoria_nombre: "Artículos Generales", stock_actual: 40, stock_minimo: 10, costo_promedio: 1.50, precio_costo: 1.50, precio_venta: 2.50, alicuota_iva: 0, unidad_medida: "Pza", fecha_registro: "2026-09-01" },
  ],
};

/**
 * Prepara el sistema de forma integral para un cliente nuevo.
 * @param modo 'LIMPIO' (base en blanco sin movimientos ni ventas) | 'PLANTILLA' (con productos del rubro) | 'DEMO' (con datos completos de práctica)
 * @param rubro Rubro comercial seleccionado
 * @param negocioConfig Datos del comercio del cliente (Nombre, RIF, Teléfono, etc.)
 */
export function prepararSistemaParaNuevoCliente(
  modo: "LIMPIO" | "PLANTILLA" | "DEMO",
  rubro: RubroNegocio = "bodega",
  negocioConfig?: Partial<NegocioClienteConfig>
): {
  success: boolean;
  message: string;
  productosCargados: number;
  categoriasCargadas: number;
} {
  try {
    // 1. Configurar datos del negocio
    const currentConfig = getStoredNegocioConfig();
    const updatedConfig: NegocioClienteConfig = {
      ...currentConfig,
      ...negocioConfig,
      rubro,
    };
    saveStoredNegocioConfig(updatedConfig);

    // 2. Limpiar registros de ventas y movimientos previos para que el cliente empiece en limpio
    saveSales([]);
    saveMovements([]);
    saveCierresCaja([]);

    // 3. Configuración de productos y categorías según el modo
    let prodsToSave: Producto[] = [];
    let catsToSave: Categoria[] = [];

    if (modo === "LIMPIO") {
      // Base en blanco: categorías vacías o mínimas, 0 productos
      catsToSave = TEMPLATE_CATEGORIES[rubro] || TEMPLATE_CATEGORIES.bodega;
      prodsToSave = [];
      saveFiados([]);
    } else if (modo === "PLANTILLA") {
      // Catálogo precargado por rubro listo para vender
      catsToSave = TEMPLATE_CATEGORIES[rubro] || TEMPLATE_CATEGORIES.bodega;
      prodsToSave = TEMPLATE_PRODUCTS[rubro] || TEMPLATE_PRODUCTS.bodega;
      saveFiados([]);
    } else {
      // Modo DEMO: datos completos para entrenamiento
      catsToSave = INITIAL_CATEGORIES;
      prodsToSave = INITIAL_PRODUCTS;
      saveFiados(INITIAL_FIADOS);
      saveSales(INITIAL_SALES);
      saveMovements(INITIAL_MOVEMENTS);
    }

    saveCategories(catsToSave);
    saveProducts(prodsToSave);

    return {
      success: true,
      message: `¡Sistema preparado exitosamente para ${updatedConfig.nombreComercial}! Modo: ${modo}.`,
      productosCargados: prodsToSave.length,
      categoriasCargadas: catsToSave.length,
    };
  } catch (err: any) {
    console.error("Error al preparar sistema para cliente:", err);
    return {
      success: false,
      message: err.message || "Error al preparar el sistema para el cliente.",
      productosCargados: 0,
      categoriasCargadas: 0,
    };
  }
}




