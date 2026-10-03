export interface Categoria {
  id: number;
  nombre: string;
  descripcion: string;
}

export type TipoAlicuotaIva = 16 | 0; // 16% General, 0% Exento según Ley IVA SENIAT

export interface Producto {
  id: number;
  codigo_barras: string;
  codigo_interno?: string;
  nombre: string;
  categoria_id: number;
  categoria_nombre?: string;
  stock_actual: number; // Restricción CHECK (stock_actual >= 0)
  stock_minimo: number;
  costo_promedio?: number; // Costo Promedio Ponderado (PMP) según Reglamento LISLR Art. 177
  costo_promedio_ponderado?: number; // Alias para compatibilidad de esquema
  precio_costo: number; // Último costo de adquisición
  precio_venta: number; // Precio base en USD
  alicuota_iva: TipoAlicuotaIva; // 16% o 0% (Exento)
  unidad_medida: string;
  fecha_registro?: string;
}

export type TipoMovimientoKardex =
  | 'ENTRADA'
  | 'SALIDA'
  | 'VENTA'
  | 'DEVOLUCION'
  | 'MERMA'
  | 'AJUSTE';

export interface Movimiento {
  id: number;
  fecha_hora?: string;
  producto_id: number;
  producto_nombre?: string;
  tipo_movimiento?: TipoMovimientoKardex;
  tipo?: TipoMovimientoKardex;
  documento_ref?: string;
  cantidad: number;
  costo_unitario: number;
  costo_total?: number;
  stock_resultante: number; // Obligatorio por Art. 177 LISLR
  costo_promedio_resultante?: number; // Obligatorio por Art. 177 LISLR
  costo_promedio_ponderado?: number; // Alias para compatibilidad
  motivo?: string;
  usuario?: string;
  fecha?: string;
  referencia_factura?: string;
}

export interface CartItem {
  producto: Producto;
  cantidad: number;
  precio_unitario: number; // USD
  subtotal: number; // USD
  alicuota_iva: TipoAlicuotaIva;
  es_exento: boolean;
}

export type MetodoPagoFiscal =
  | 'Punto de Venta'
  | 'Pago Móvil'
  | 'Transferencia Bs'
  | 'Divisas en Efectivo'
  | 'Criptoactivos';

export interface Venta {
  id: number;
  numero_factura: string; // Correlativo fiscal editable/secuencial
  numero_control: string; // Número de control asignado a formato libre
  folio_ticket?: string;
  fecha_hora: string;
  fecha?: string;
  cliente_rif: string; // Formato J-12345678-0, V-12345678-0, etc.
  cliente_nombre: string;
  cliente_direccion?: string;
  tasa_bcv: number; // Tasa Oficial BCV activa al momento de la venta
  tasa_bcv_aplicada?: number; // Alias para compatibilidad con reportes fiscales
  metodo_pago: MetodoPagoFiscal | 'Efectivo' | 'Tarjeta' | 'Transferencia' | string;
  moneda_pago: 'VES' | 'USD';
  
  // Desglose fiscal Providencia SNAT/00071
  base_imponible_usd: number;
  base_imponible_ves: number;
  base_exenta_usd: number;
  base_exenta_ves: number;
  iva_usd: number;
  iva_ves: number; // IVA 16%
  aplica_igtf: boolean; // Si es pago en divisas en efectivo o cripto
  igtf_usd: number; // 3% IGTF
  igtf_ves: number; // 3% IGTF en Bs.
  total_usd: number;
  total_ves: number; // Total a liquidar en Bs.
  
  total: number; // USD total
  monto_pagado: number;
  cambio: number;
  usuario?: string;
  pos_referencia?: string;
  pos_lote?: string;
  pos_aprobacion?: string;
  pos_terminal?: string;
  items: {
    producto_id: number;
    nombre: string;
    cantidad: number;
    precio_unitario: number;
    subtotal: number;
    alicuota_iva: TipoAlicuotaIva;
    es_exento: boolean;
    iva_monto_ves?: number;
  }[];
}

export type SmartPosModelVE =
  | 'WIZARPOS_Q2'
  | 'WIZARPOS_Q3'
  | 'PAX_A920'
  | 'PAX_A930'
  | 'PAX_A910'
  | 'PAX_A80'
  | 'SUNMI_P2'
  | 'SUNMI_V2'
  | 'VERIFONE_X990'
  | 'INGENICO_APOS_A8'
  | 'GENERIC_SMARTPOS';

export type SmartPosSwitchVE =
  | 'MEGASOFT'      // Mega Soft Computación (VPMS / VPOS ECR) - Banesco, Mercantil, BDV, Provincial
  | 'CREDICARD'     // Credicard ECR Link (Bancos afiliados a Credicard)
  | 'BANCAMIGA'     // Bancamiga SmartPOS Link Directo
  | 'ECR_JSON'      // WizarPOS / PAX ECR Universal TCP/IP JSON
  | 'PLATCO'        // Red Platco / Banesco
  | 'SIMULADO';     // Modo Simulado de Pruebas

export interface WizarPosConfig {
  enabled: boolean;
  ip: string;
  puerto: number;
  modelo: SmartPosModelVE;
  switchRed: SmartPosSwitchVE;
  protocolo: 'ECR_JSON' | 'MEGASOFT' | 'CREDICARD' | 'BANCAMIGA' | 'PLATCO' | 'SIMULADO';
  timeoutSegundos: number;
  autoConfirmarVenta: boolean;
  nombreDispositivo: string;
}

export type SmartPosConfig = WizarPosConfig;

export interface WizarPosTransactionResult {
  aprobado: boolean;
  codigo_aprobacion: string;
  referencia: string;
  lote: string;
  terminal: string;
  tarjeta_ultimos4: string;
  tipo_tarjeta: string; // 'Debito' | 'Credito' | 'Maestro' | 'Visa' | 'MasterCard'
  banco_emisor?: string;
  monto_ves: number;
  fecha_hora: string;
  mensaje: string;
}

export interface FacturaExtraida {
  proveedor: string;
  proveedor_rif?: string;
  numero_factura: string;
  numero_control?: string;
  fecha: string;
  total_factura?: number;
  moneda?: string;
  tasa_cambio?: number;
  items: {
    codigo_barras?: string;
    nombre: string;
    categoria?: string;
    cantidad: number;
    precio_costo: number; // Costo unitario de compra
    precio_venta: number;
    alicuota_iva?: TipoAlicuotaIva;
    unidad_medida?: string;
  }[];
}

export interface EmisorFiscal {
  rif: string;
  razon_social: string;
  direccion_fiscal: string;
  telefono: string;
  providencia_fiscal: string;
}

export interface PythonFile {
  name: string;
  description: string;
  path: string;
  language: string;
  content: string;
}

export interface FiadoCliente {
  id: string;
  nombre: string;
  telefono: string;
  direccion: string;
  limite_credito_usd: number;
  saldo_deuda_usd: number;
  saldo_deuda_ves: number;
  ultimo_movimiento: string;
  historial: {
    id: string;
    fecha: string;
    tipo: 'CARGO_VENTA' | 'ABONO_PAGO';
    concepto: string;
    monto_usd: number;
    monto_ves: number;
    tasa_bcv: number;
    metodo_abono?: string;
  }[];
}

export interface CierreCajaRecord {
  id: string;
  fecha: string;
  hora_apertura: string;
  hora_cierre: string;
  cajero: string;
  tasa_bcv: number;
  ventas_count: number;
  // Totales esperados según sistema
  esperado_usd: number;
  esperado_ves: number;
  // Totales reales contados en caja
  total_efectivo_usd: number;
  total_efectivo_ves: number;
  total_pago_movil_ves: number;
  total_punto_ves: number;
  total_zelle_usd: number;
  total_fiado_usd: number;
  total_general_usd: number;
  total_general_ves: number;
  // Auditoría de cuadre
  diferencia_usd: number;
  diferencia_ves: number;
  estado_cuadre: 'CUADRADA' | 'FALTANTE' | 'SOBRANTE';
  observaciones?: string;
}

// ============================================================================
// SISTEMA DE CONTROL DE LICENCIA REMOTA Y SUSCRIPCIÓN MENSUAL (MÉTODO 1)
// ============================================================================
export type LicenseStatus = 'ACTIVO' | 'POR_VENCER' | 'VENCIDO' | 'SUSPENDIDO' | 'DESCONECTADO_GRACIA';

export interface RemoteClientLicense {
  cliente_id: string;              // Ej: "BDG-2026-9482"
  nombre_negocio: string;          // Ej: "Bodega La Esperanza"
  rif_cedula: string;              // Ej: "V-18492041-0"
  telefono_contacto: string;       // Ej: "+58 412-1234567"
  edicion_contratada: 'bodega' | 'fiscal';
  cuota_mensual_usd: number;       // 15$ Bodega, 30$ Fiscal
  monto_instalacion_usd: number;   // 50$ Instalación inicial
  fecha_instalacion: string;       // "2026-09-01"
  fecha_vencimiento_actual: string; // "2026-10-15"
  estado_remoto: 'ACTIVO' | 'SUSPENDIDO'; // Estado que tú cambias desde tu panel/Sheets
  dias_gracia_offline_max: number;  // Días permitidos sin internet (ej: 3 a 5 días)
  ultimo_contacto_servidor: string; // Fecha y hora del último ping a la nube
  motivo_bloqueo?: string;         // Ej: "Mensualidad de Octubre pendiente. Reporte su pago al WhatsApp"
  observaciones?: string;
}

export interface LicenseCheckResult {
  permitirAcceso: boolean;
  status: LicenseStatus;
  diasRestantes: number;
  fechaVencimiento: string;
  mensajeAlerta: string;
  bloqueante: boolean;
  negocioNombre: string;
  edicion: 'bodega' | 'fiscal';
  cuotaMensual: number;
  telefonoSoporte: string;
}

// ============================================================================
// MODO DE OPERACIÓN DEL PUNTO DE VENTA (SMARTPOS INTEGRADO VS SOLO INVENTARIO)
// ============================================================================
export type PosOperationalMode = 'smartpos' | 'inventory_only';

export interface PosOperationalConfig {
  mode: PosOperationalMode;
  isFirstRun: boolean;
  updatedAt: string;
}

// ============================================================================
// SEGURIDAD, ROLES Y CUENTAS DE USUARIO (RBAC)
// ============================================================================
export type UserRole = 'ADMIN' | 'SUPERVISOR' | 'CAJERO';

export interface SystemUser {
  id: string;
  username: string;
  nombre_completo: string;
  rol: UserRole;
  pin: string; // PIN numérico de 4 a 6 dígitos para cambio ágil en mostrador
  password_hash?: string;
  activo: boolean;
  ultimo_acceso?: string;
  avatar_color?: string;
}

export interface RolePermissions {
  puedeVender: boolean;
  puedeVerCostosYMargenes: boolean;
  puedeModificarPrecios: boolean;
  puedeAjustarStockManual: boolean;
  puedeEliminarProductos: boolean;
  puedeVerLibretaFiados: boolean;
  puedeHacerCierreCaja: boolean;
  puedeConfigurarSistema: boolean;
  puedeHacerBackups: boolean;
  puedeGestionarUsuarios: boolean;
}

// ============================================================================
// SISTEMA DE EXPORTACIÓN / IMPORTACIÓN COMPLETA DE BASE DE DATOS PARA RESPALDO
// ============================================================================
export interface DatabaseBackupPayload {
  version: string;
  fecha_respaldo: string;
  sistema: string;
  tipo_exportacion: 'COMPLETA' | 'SOLO_INVENTARIO' | 'SOLO_VENTAS';
  nombre_negocio: string;
  rif_negocio: string;
  checksum: string;
  data: {
    productos: Producto[];
    categorias: Categoria[];
    movimientos: Movimiento[];
    ventas: Venta[];
    fiados: FiadoCliente[];
    cierres_caja: CierreCajaRecord[];
    usuarios: SystemUser[];
    tasa_bcv: number;
    correlativos: { facturaNum: number; controlNum: number };
    licencia: RemoteClientLicense;
    pos_mode: PosOperationalMode;
    negocio_config?: NegocioClienteConfig;
  };
}

// ============================================================================
// CONFIGURACIÓN DE NEGOCIO DEL CLIENTE (PARA TICKETS, FACTURAS Y PERSONALIZACIÓN)
// ============================================================================
export type RubroNegocio = 'bodega' | 'farmacia' | 'panaderia' | 'ferreteria' | 'general';

export interface NegocioClienteConfig {
  nombreComercial: string; // ej: "Víveres & Minimarket El Éxito"
  razonSocial: string;     // ej: "Inversiones El Éxito 2026, C.A."
  rif: string;             // ej: "J-40918274-1" o "V-18492041-0"
  direccion: string;       // ej: "Calle Principal #14, Casco Central, Maracay"
  telefono: string;        // ej: "+58 412-5551234"
  whatsappCobros: string;  // ej: "+58 412-5551234"
  pieTicket: string;       // ej: "¡Gracias por su preferencia! Conserve este comprobante."
  monedaDefecto: 'USD' | 'VES';
  rubro: RubroNegocio;
  alicuotaIva: TipoAlicuotaIva;
  alicuotaIgtf: number;
  nombreCaja: string;      // ej: "Caja Principal 01"
  autoImprimirTicket: boolean;
  tasaBcvFijadaManual: boolean;
}

// ============================================================================
// DIRECTORIO DE CLIENTES (CRM / CARTERA DE CLIENTES COMERCIALES)
// ============================================================================
export interface ClienteDirectorio {
  id: string;
  cedula_rif: string;
  nombre_completo: string;
  telefono: string;
  email?: string;
  direccion: string;
  limite_credito_usd: number;
  saldo_deuda_usd: number;
  compras_realizadas: number;
  monto_total_comprado_usd: number;
  fecha_registro: string;
  ultima_compra?: string;
  activo: boolean;
  notas?: string;
}

// ============================================================================
// SISTEMA DE LOGS Y DIAGNÓSTICO DE INCIDENCIAS / BUGS
// ============================================================================
export type LogLevel = 'INFO' | 'WARN' | 'ERROR' | 'CRITICAL';

export interface SystemLogEntry {
  id: string;
  timestamp: string;
  level: LogLevel;
  modulo: string;
  mensaje: string;
  detalles?: string;
  usuario?: string;
  ruta?: string;
}




