import React from "react";
import { Database, Table, ShieldCheck, Zap, Scale } from "lucide-react";

export const DatabaseSchemaView: React.FC = () => {
  const tables = [
    {
      name: "productos",
      description: "Catálogo de inventario adaptado a LISLR Art. 177 y Ley de IVA",
      columns: [
        { name: "id", type: "INTEGER PRIMARY KEY AUTOINCREMENT", note: "Identificador único interno" },
        { name: "codigo_barras", type: "TEXT UNIQUE", note: "Código EAN-13, UPC o SKU de producto" },
        { name: "nombre", type: "TEXT NOT NULL", note: "Descripción y marca comercial del artículo" },
        { name: "categoria_id", type: "INTEGER REFERENCES categorias(id)", note: "Familia o categoría fiscal" },
        { name: "stock_actual", type: "REAL DEFAULT 0", note: "Existencia física (Prohibición estricta de saldo negativo Art. 177)" },
        { name: "stock_minimo", type: "REAL DEFAULT 5", note: "Umbral para disparo de alertas de reposición" },
        { name: "precio_costo", type: "REAL DEFAULT 0.0", note: "Último costo de adquisición en USD" },
        { name: "costo_promedio_ponderado", type: "REAL DEFAULT 0.0", note: "Costo PMP fiscal obligatorio (Reglamento LISLR Art. 177)" },
        { name: "precio_venta", type: "REAL NOT NULL", note: "Precio base de venta al público (PVP) en USD" },
        { name: "alicuota_iva", type: "REAL DEFAULT 16", note: "0% para exentos (canasta básica) o 16% alícuota general" },
        { name: "unidad_medida", type: "TEXT DEFAULT 'Pza'", note: "Pza, Kg, Lt, Bulto, Paquete, etc." },
        { name: "fecha_registro", type: "DATETIME", note: "Timestamp de alta en el sistema fiscal" },
      ],
    },
    {
      name: "categorias",
      description: "Clasificación taxonómica y tratamiento de IVA",
      columns: [
        { name: "id", type: "INTEGER PRIMARY KEY AUTOINCREMENT", note: "ID numérico de la categoría" },
        { name: "nombre", type: "TEXT UNIQUE NOT NULL", note: "Nombre de la categoría (ej: Víveres, Bebidas)" },
        { name: "descripcion", type: "TEXT", note: "Explicación del tipo de bien o exención tributaria" },
      ],
    },
    {
      name: "movimientos",
      description: "Kardex Permanente de Inventario Obligatorio (Reglamento LISLR Art. 177)",
      columns: [
        { name: "id", type: "INTEGER PRIMARY KEY AUTOINCREMENT", note: "Número consecutivo inalterable de asiento" },
        { name: "producto_id", type: "INTEGER REFERENCES productos(id)", note: "ID del artículo afectado" },
        { name: "tipo", type: "TEXT CHECK(tipo IN ('ENTRADA','SALIDA','AJUSTE'))", note: "Naturaleza de la operación fiscal" },
        { name: "cantidad", type: "REAL NOT NULL", note: "Unidades físicas movilizadas" },
        { name: "costo_unitario", type: "REAL", note: "Costo de compra (en entradas) o costo PMP (en salidas)" },
        { name: "costo_promedio_ponderado", type: "REAL", note: "PMP recalculado tras la operación (Fórmula Art. 177)" },
        { name: "stock_resultante", type: "REAL", note: "Saldo físico resultante tras el movimiento (≥ 0)" },
        { name: "motivo", type: "TEXT NOT NULL", note: "Causa o justificación (Factura compra, Venta POS, Merma)" },
        { name: "fecha", type: "DATETIME DEFAULT CURRENT_TIMESTAMP", note: "Momento cronológico exacto del registro" },
        { name: "usuario", type: "TEXT DEFAULT 'Admin Fiscal'", note: "Operador o sistema responsable" },
        { name: "referencia_factura", type: "TEXT", note: "Número de factura o documento de soporte fiscal" },
      ],
    },
    {
      name: "ventas",
      description: "Cabecera de Facturas Fiscales (Providencia SNAT/00071 & Ley de IGTF)",
      columns: [
        { name: "id", type: "INTEGER PRIMARY KEY AUTOINCREMENT", note: "ID consecutivo interno" },
        { name: "numero_factura", type: "TEXT NOT NULL", note: "Correlativo fiscal obligatorio (ej: 00-000452)" },
        { name: "numero_control", type: "TEXT NOT NULL", note: "Número de control fiscal pre-impreso (ej: 00-001890)" },
        { name: "folio_ticket", type: "TEXT UNIQUE NOT NULL", note: "Identificador único de ticket/factura" },
        { name: "fecha", type: "DATETIME DEFAULT CURRENT_TIMESTAMP", note: "Hora y fecha legal de emisión" },
        { name: "cliente_rif", type: "TEXT NOT NULL", note: "RIF o C.I. del comprador (V-, J-, G-, E-, P-)" },
        { name: "cliente_nombre", type: "TEXT NOT NULL", note: "Razón Social o Nombre del receptor" },
        { name: "cliente_direccion", type: "TEXT", note: "Domicilio fiscal del receptor" },
        { name: "tasa_bcv", type: "REAL NOT NULL", note: "Tasa de cambio oficial del BCV vigente al momento de emisión" },
        { name: "base_exenta_usd", type: "REAL DEFAULT 0", note: "Total de artículos exentos de IVA en USD" },
        { name: "base_imponible_usd", type: "REAL DEFAULT 0", note: "Monto gravado al 16% en USD" },
        { name: "iva_usd", type: "REAL DEFAULT 0", note: "Impuesto al Valor Agregado (16%) en USD" },
        { name: "igtf_usd", type: "REAL DEFAULT 0", note: "3% IGTF (Aplica a pagos en Divisas o Criptoactivos)" },
        { name: "total_usd", type: "REAL NOT NULL", note: "Monto total facturado en USD" },
        { name: "base_exenta_ves", type: "REAL DEFAULT 0", note: "Total exento expresado en Bolívares (VES)" },
        { name: "base_imponible_ves", type: "REAL DEFAULT 0", note: "Base gravada 16% expresada en Bolívares (VES)" },
        { name: "iva_ves", type: "REAL DEFAULT 0", note: "IVA (16%) expresado en Bolívares (VES)" },
        { name: "igtf_ves", type: "REAL DEFAULT 0", note: "IGTF (3%) expresado en Bolívares (VES)" },
        { name: "total_ves", type: "REAL NOT NULL", note: "Monto total facturado en Bolívares (VES)" },
        { name: "metodo_pago", type: "TEXT NOT NULL", note: "Divisas en Efectivo, Pago Móvil, Punto de Venta, etc." },
        { name: "monto_pagado", type: "REAL", note: "Monto recibido del cliente" },
        { name: "cambio", type: "REAL", note: "Vuelto entregado" },
      ],
    },
    {
      name: "detalle_ventas",
      description: "Renglones de Factura con desglose de IVA individual",
      columns: [
        { name: "id", type: "INTEGER PRIMARY KEY AUTOINCREMENT", note: "Identificador de renglón" },
        { name: "venta_id", type: "INTEGER REFERENCES ventas(id)", note: "Vínculo con encabezado de factura" },
        { name: "producto_id", type: "INTEGER REFERENCES productos(id)", note: "Producto vendido" },
        { name: "cantidad", type: "REAL NOT NULL", note: "Unidades facturadas" },
        { name: "precio_unitario", type: "REAL NOT NULL", note: "Precio unitario sin IVA en USD" },
        { name: "alicuota_iva", type: "REAL DEFAULT 16", note: "0% (Exento) o 16% (Gravado)" },
        { name: "es_exento", type: "INTEGER DEFAULT 0", note: "1 si es exento, 0 si aplica IVA" },
        { name: "subtotal", type: "REAL NOT NULL", note: "Cálculo: cantidad * precio_unitario" },
      ],
    },
  ];

  return (
    <div className="space-y-6">
      {/* Overview Info Banner */}
      <div className="bg-[#1a1d24] border border-slate-800 rounded-xl p-5">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-xl bg-blue-600/20 text-blue-400 border border-blue-500/30 flex items-center justify-center shrink-0">
            <Database className="w-5 h-5" />
          </div>
          <div className="space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base font-bold text-white">
                Arquitectura de Base de Datos SQLite: <code className="text-blue-400">inventario.db</code>
              </h2>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-950 text-emerald-400 border border-emerald-800">
                SENIAT / Prov. SNAT/00071
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-blue-950 text-blue-400 border border-blue-800">
                LISLR Art. 177 (PMP)
              </span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed max-w-4xl">
              Esquema relacional adaptado a la legislación tributaria de la República Bolivariana de Venezuela.
              Garantiza cálculo estricto de Costo Promedio Ponderado (PMP), bloqueo de inventarios negativos,
              doble expresión monetaria (USD / Bs. a Tasa Oficial BCV), desglose de Alícuota General (16%),
              exenciones de canasta alimentaria y recaudación de IGTF (3%).
            </p>
            <div className="flex flex-wrap gap-2 pt-1">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-950/60 border border-emerald-800/60 text-emerald-400 text-xs font-mono">
                <ShieldCheck className="w-3.5 h-3.5" /> PRAGMA foreign_keys = ON
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-blue-950/60 border border-blue-800/60 text-blue-400 text-xs font-mono">
                <Zap className="w-3.5 h-3.5" /> PRAGMA journal_mode = WAL
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-purple-950/60 border border-purple-800/60 text-purple-400 text-xs font-mono">
                <Scale className="w-3.5 h-3.5" /> Transacciones Atómicas (BEGIN / COMMIT / ROLLBACK)
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Tables Grid */}
      <div className="grid grid-cols-1 gap-5">
        {tables.map((tbl) => (
          <div
            key={tbl.name}
            className="bg-[#1a1d24] border border-slate-800 rounded-xl overflow-hidden shadow-sm"
          >
            <div className="p-4 bg-[#14161c] border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Table className="w-4 h-4 text-blue-400" />
                <h3 className="font-mono font-bold text-white text-sm">
                  TABLA: <span className="text-blue-400">{tbl.name}</span>
                </h3>
              </div>
              <span className="text-xs text-slate-400 font-medium">{tbl.description}</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300 font-sans">
                <thead className="bg-[#101217] text-slate-400 border-b border-slate-800 uppercase font-mono text-[11px]">
                  <tr>
                    <th className="py-2.5 px-4 w-48">Campo / Columna</th>
                    <th className="py-2.5 px-4">Tipo &amp; Restricciones</th>
                    <th className="py-2.5 px-4">Descripción / Función Fiscal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {tbl.columns.map((col) => (
                    <tr key={col.name} className="hover:bg-slate-800/30">
                      <td className="py-2.5 px-4 font-mono font-bold text-blue-300 text-xs">
                        {col.name}
                      </td>
                      <td className="py-2.5 px-4 font-mono text-emerald-400 text-xs">
                        {col.type}
                      </td>
                      <td className="py-2.5 px-4 text-slate-300">{col.note}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
