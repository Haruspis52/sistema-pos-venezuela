export interface SampleInvoice {
  id: string;
  title: string;
  supplier: string;
  invoiceNumber: string;
  date: string;
  total: number;
  previewSvgDataUri: string;
  mockExtraction: {
    proveedor: string;
    numero_factura: string;
    fecha: string;
    total_factura: number;
    moneda: string;
    items: {
      codigo_barras: string;
      nombre: string;
      categoria: string;
      cantidad: number;
      precio_costo: number;
      precio_venta: number;
      unidad_medida: string;
    }[];
  };
}

// Generates a clean SVG receipt rendered as a Data URI to simulate photo of invoice
function createInvoiceSvg(title: string, folio: string, date: string, items: { name: string; qty: number; cost: number }[], total: number) {
  const itemRows = items
    .map(
      (it, idx) => `
    <text x="25" y="${160 + idx * 26}" font-family="monospace" font-size="12" fill="#1e293b">${it.qty}x ${it.name}</text>
    <text x="355" y="${160 + idx * 26}" font-family="monospace" font-size="12" text-anchor="end" fill="#1e293b">$${(it.qty * it.cost).toFixed(2)}</text>
  `
    )
    .join("");

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="380" height="420" viewBox="0 0 380 420">
    <rect width="380" height="420" fill="#fbfbfa" rx="8" stroke="#cbd5e1" stroke-width="2"/>
    <rect x="0" y="0" width="380" height="65" fill="#1e293b" rx="8 8 0 0"/>
    <text x="190" y="32" font-family="sans-serif" font-weight="bold" font-size="15" fill="#ffffff" text-anchor="middle">${title}</text>
    <text x="190" y="52" font-family="monospace" font-size="11" fill="#94a3b8" text-anchor="middle">FACTURA DE PROVEEDOR</text>
    
    <text x="25" y="90" font-family="monospace" font-size="11" fill="#475569">FOLIO: ${folio}</text>
    <text x="355" y="90" font-family="monospace" font-size="11" text-anchor="end" fill="#475569">FECHA: ${date}</text>
    <line x1="25" y1="105" x2="355" y2="105" stroke="#94a3b8" stroke-dasharray="4 2"/>

    <text x="25" y="125" font-family="monospace" font-weight="bold" font-size="11" fill="#334155">CANT / DESCRIPCIÓN</text>
    <text x="355" y="125" font-family="monospace" font-weight="bold" font-size="11" text-anchor="end" fill="#334155">IMPORTE</text>
    <line x1="25" y1="135" x2="355" y2="135" stroke="#cbd5e1"/>

    ${itemRows}

    <line x1="25" y1="${170 + items.length * 26}" x2="355" y2="${170 + items.length * 26}" stroke="#94a3b8" stroke-dasharray="4 2"/>
    <text x="25" y="${195 + items.length * 26}" font-family="monospace" font-weight="bold" font-size="14" fill="#0f172a">TOTAL FACTURA:</text>
    <text x="355" y="${195 + items.length * 26}" font-family="monospace" font-weight="bold" font-size="16" text-anchor="end" fill="#0f172a">$${total.toFixed(2)}</text>

    <text x="190" y="390" font-family="sans-serif" font-size="10" fill="#94a3b8" text-anchor="middle">CFDI Digital Verificado por SAT | Gemini AI Ready</text>
  </svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export const SAMPLE_INVOICES: SampleInvoice[] = [
  {
    id: "sample_1",
    title: "Distribuidora Mayorista La Central S.A.",
    supplier: "Distribuidora Mayorista La Central S.A.",
    invoiceNumber: "FAC-98241",
    date: "2026-09-10",
    total: 1354.00,
    previewSvgDataUri: createInvoiceSvg(
      "DISTRIBUIDORA LA CENTRAL S.A.",
      "FAC-98241",
      "2026-09-10",
      [
        { name: "Atún en Aceite 140g", qty: 24, cost: 14.50 },
        { name: "Café Soluble Frasco 200g", qty: 12, cost: 48.00 },
        { name: "Pasta para Sopa Espagueti 200g", qty: 40, cost: 7.20 },
        { name: "Jabón de Tocador Neutro 150g", qty: 20, cost: 7.00 },
      ],
      1354.00
    ),
    mockExtraction: {
      proveedor: "Distribuidora Mayorista La Central S.A.",
      numero_factura: "FAC-98241",
      fecha: "2026-09-10",
      total_factura: 1354.00,
      moneda: "MXN",
      items: [
        {
          codigo_barras: "7501002233441",
          nombre: "Atún en Aceite 140g",
          categoria: "Abarrotes",
          cantidad: 24,
          precio_costo: 14.50,
          precio_venta: 22.00,
          unidad_medida: "Pza",
        },
        {
          codigo_barras: "7501003344552",
          nombre: "Café Soluble Frasco 200g",
          categoria: "Abarrotes",
          cantidad: 12,
          precio_costo: 48.00,
          precio_venta: 69.00,
          unidad_medida: "Pza",
        },
        {
          codigo_barras: "7501004455663",
          nombre: "Pasta para Sopa Espagueti 200g",
          categoria: "Abarrotes",
          cantidad: 40,
          precio_costo: 7.20,
          precio_venta: 12.00,
          unidad_medida: "Pza",
        },
        {
          codigo_barras: "7501005566774",
          nombre: "Jabón de Tocador Neutro 150g",
          categoria: "Limpieza",
          cantidad: 20,
          precio_costo: 7.00,
          precio_venta: 12.50,
          unidad_medida: "Pza",
        },
      ],
    },
  },
  {
    id: "sample_2",
    title: "Embotelladora & Bebidas del Valle",
    supplier: "Embotelladora & Bebidas del Valle",
    invoiceNumber: "INV-55210",
    date: "2026-09-11",
    total: 890.00,
    previewSvgDataUri: createInvoiceSvg(
      "BEBIDAS DEL VALLE S.A. DE C.V.",
      "INV-55210",
      "2026-09-11",
      [
        { name: "Agua Purificada Mineral 1.5L", qty: 24, cost: 11.00 },
        { name: "Jugo de Naranja 100% 1L", qty: 15, cost: 22.00 },
        { name: "Bebida Energizante 355ml", qty: 16, cost: 18.50 },
      ],
      890.00
    ),
    mockExtraction: {
      proveedor: "Embotelladora & Bebidas del Valle",
      numero_factura: "INV-55210",
      fecha: "2026-09-11",
      total_factura: 890.00,
      moneda: "MXN",
      items: [
        {
          codigo_barras: "7501006677885",
          nombre: "Agua Purificada Mineral 1.5L",
          categoria: "Bebidas",
          cantidad: 24,
          precio_costo: 11.00,
          precio_venta: 18.00,
          unidad_medida: "Pza",
        },
        {
          codigo_barras: "7501007788996",
          nombre: "Jugo de Naranja 100% 1L",
          categoria: "Bebidas",
          cantidad: 15,
          precio_costo: 22.00,
          precio_venta: 34.00,
          unidad_medida: "Pza",
        },
        {
          codigo_barras: "7501008899007",
          nombre: "Bebida Energizante 355ml",
          categoria: "Bebidas",
          cantidad: 16,
          precio_costo: 18.50,
          precio_venta: 29.50,
          unidad_medida: "Pza",
        },
      ],
    },
  },
];
