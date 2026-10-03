import React, { useState } from "react";
import {
  FileText,
  Shield,
  ShieldCheck,
  Scale,
  Lock,
  Download,
  Copy,
  CheckCircle2,
  Printer,
  ExternalLink,
  AlertTriangle,
  FileSpreadsheet,
  Cpu,
  Database,
  Smartphone,
  X,
  Building2,
  Calendar,
  Check,
  Eye,
} from "lucide-react";
import { TermsAcceptanceRecord } from "../mockDb";
import { RemoteClientLicense, SystemUser } from "../types";

interface TermsAndPrivacyModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: "terms" | "privacy" | "fiscal" | "certificate";
  termsAcceptance: TermsAcceptanceRecord;
  onAcceptTerms: (acceptedBy: string) => void;
  license?: RemoteClientLicense;
  currentUser?: SystemUser;
  showToast: (msg: string) => void;
}

export const TermsAndPrivacyModal: React.FC<TermsAndPrivacyModalProps> = ({
  isOpen,
  onClose,
  initialTab = "terms",
  termsAcceptance,
  onAcceptTerms,
  license,
  currentUser,
  showToast,
}) => {
  const [activeTab, setActiveTab] = useState<"terms" | "privacy" | "fiscal" | "certificate">(initialTab);
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleCopyText = (content: string, label: string) => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    showToast(`📋 ${label} copiado al portapapeles.`);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleDownloadDocument = (content: string, filename: string) => {
    const element = document.createElement("a");
    const file = new Blob([content], { type: "text/plain;charset=utf-8" });
    element.href = URL.createObjectURL(file);
    element.download = filename;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
    showToast(`📥 Documento legal descargado: ${filename}`);
  };

  const handlePrint = () => {
    window.print();
  };

  const termsText = `================================================================================
TÉRMINOS Y CONDICIONES GENERALES DE USO Y LICENCIA DE SOFTWARE POS
SISTEMA DE GESTIÓN COMERCIAL, INVENTARIO Y FACTURACIÓN FISCAL
Versión: 2.4 (Revisión Legal 2026) • Ámbito: República Bolivariana de Venezuela
================================================================================

1. OBJETO Y ÁMBITO DE APLICACIÓN
El presente contrato rige los términos, condiciones y límites de uso del software de Punto de Venta (POS), control de inventarios, libro de ventas y facturación en sus modalidades "Modo Bodega / Venta Rápida" y "Modo Fiscal SENIAT". Al instalar, acceder, operar o registrar transacciones en esta plataforma, el usuario comercial (en lo sucesivo "EL COMERCIO" o "EL USUARIO") declara conocer, entender y aceptar en su totalidad las cláusulas aquí descritas.

2. NATURALEZA DE LA LICENCIA DE USO
2.1. Concesión de Licencia: Se otorga a EL COMERCIO una licencia de uso no exclusiva, intransferible y revocable para operar el software en sus terminales autorizadas conforme a la edición contratada (Edición Bodega o Edición Fiscal).
2.2. Modalidad de Operación Híbrida: El software opera de manera primordial bajo un esquema local sin conexión forzosa a internet (almacenamiento local seguro en base de datos SQLite), garantizando la continuidad operativa del establecimiento comercial ante caídas de telecomunicaciones o fallas eléctricas.
2.3. Mantenimiento y Cuotas: Cuando el software se adquiera bajo modalidad de suscripción periódica ($15 USD/mes Bodega, $30 USD/mes Fiscal), el acceso continuo a actualizaciones normativas, soporte técnico y sincronización en la nube estará condicionado al pago puntual de la cuota acordada.

3. DELIMITACIÓN DE RESPONSABILIDAD TRIBUTARIA Y FISCAL (SENIAT)
3.1. Rol Tecnológico: El software constituye exclusivamente una herramienta tecnológica de cálculo, registro y automatización contable-administrativa.
3.2. Responsabilidad Exclusiva del Contribuyente: EL COMERCIO es el único responsable legal, mercantil, civil y penal ante el Servicio Nacional Integrado de Administración Aduanera y Tributaria (SENIAT), la Superintendencia Nacional para la Defensa de los Derechos Socioeconómicos (SUNDDE), alcaldías y demás entes reguladores por:
    a) La exactitud, veracidad y licitud de las ventas, costos y precios registrados.
    b) El correcto reporte de alícuotas del Impuesto al Valor Agregado (IVA general 16% o exenciones según Art. 18 de la Ley de IVA).
    c) La aplicación obligatoria de la alícuota del 3% del Impuesto a las Grandes Transacciones Financieras (IGTF) en cobros efectuados en moneda extranjera o criptoactivos distintos al Petro.
    d) La emisión legal de Facturas Físicas / Talonarios autorizados conforme a la Providencia Administrativa SNAT/00071 o mediante Máquinas Fiscales homologadas según corresponda a su calificación de contribuyente (ordinario o especial).
    e) La veracidad del Libro de Ventas y el cálculo del Costo Promedio Ponderado (PMP) exigido por el Artículo 177 del Reglamento de la Ley de Impuesto Sobre la Renta (LISLR).
3.3. Exoneración del Desarrollador: El desarrollador y proveedor del software quedan exentos de toda responsabilidad por multas, reparos fiscales, clausuras de establecimientos o sanciones derivadas de mala praxis contable, evasión fiscal o alteración fraudulenta de datos por parte de EL COMERCIO.

4. RÉGIMEN CAMBIARIO Y TASA OFICIAL BCV
4.1. Transparencia Cambiaria: Conforme a las directrices del Banco Central de Venezuela (BCV) y normativas de protección al consumidor, todo precio fijado en divisas (USD / EUR) debe ser liquidable en Bolívares (VES) a la tasa oficial de la fecha valor de la operación.
4.2. Validación de la Tasa: El software ofrece sincronización automática vía API con la cotización oficial del BCV. No obstante, es deber indelegable del cajero o administrador verificar visualmente la tasa antes de iniciar el turno diario.

5. INTEGRACIONES CON DISPOSITIVOS DE PAGO (SMARTPOS Y BIOPAGO)
5.1. Normativa PCI-DSS: El software no almacena, captura ni procesa datos confidenciales de tarjetas de crédito o débito, tales como números de PAN completos, fechas de vencimiento, códigos CVV/CVC ni números de PIN bancario.
5.2. Comunicación con SmartPOS: Las transacciones canalizadas a terminales inteligentes (WizarPOS, Sunmi, PAX, Biopago BDV) se transmiten a través de protocolos seguros e independientes de las redes bancarias adquirentes. El éxito o rechazo de los cobros bancarios depende de la entidad financiera.

6. LIBRETA DE FIADOS Y CONTROL DE CRÉDITOS COMERCIALES
La funcionalidad de "Libreta de Fiados" constituye un auxiliar de control de cuentas por cobrar entre vecinos y clientes de confianza. El software no actúa como entidad de intermediación financiera ni garantiza el cobro o solvencia de los deudores.

7. PROPIEDAD INTELECTUAL Y CÓDIGO FUENTE
Todos los derechos de autor, código fuente, algoritmos, interfaces visuales y documentación son propiedad exclusiva de sus creadores y están protegidos por las leyes de propiedad intelectual internacionales y de la República Bolivariana de Venezuela. Se prohíbe la ingeniería inversa no autorizada, descompilación fraudulenta o comercialización ilegal de copias del sistema.`;

  const privacyText = `================================================================================
POLÍTICA DE PRIVACIDAD, CONFIDENCIALIDAD Y TRATAMIENTO DE DATOS
SISTEMA DE GESTIÓN COMERCIAL, INVENTARIO Y FACTURACIÓN FISCAL
Versión: 2.4 (Revisión 2026) • Ámbito: Comercial y Protección al Consumidor
================================================================================

1. PRINCIPIO FUNDAMENTAL: SOBERANÍA TOTAL DEL DATO COMERCIAL
Nos tomamos la privacidad de su negocio con el más estricto rigor profesional. A diferencia de las plataformas SaaS tradicionales que monopolizan su información en servidores ajenos:
1.1. Almacenamiento Primario Local: Su catálogo de productos, lista de precios, márgenes de ganancia, costos reales de adquisición, historial de ventas y datos de clientes residen de forma primaria en su propio equipo (base de datos local SQLite o almacenamiento seguro de navegador).
1.2. No Comercialización: Bajo NINGUNA circunstancia vendemos, alquilamos, cedemos ni compartimos sus cifras de facturación, márgenes comerciales o datos de clientes con competidores, empresas de publicidad ni terceros. Su negocio le pertenece a usted.

2. TIPOS DE DATOS TRATADOS Y FINALIDAD
2.1. Datos de Facturación del Cliente Final: Cédula o RIF, Nombres o Razón Social, Teléfono y Dirección fiscal. Finalidad: Cumplimiento de la Providencia Administrativa SNAT/00071 del SENIAT y emisión de comprobantes de venta.
2.2. Datos de Operadores del Sistema: Nombres de cajeros, supervisores y administradores, roles asignados y código PIN cifrado de autenticación. Finalidad: Auditoría interna, arqueo de caja y control de acceso basado en roles (RBAC).
2.3. Libreta de Fiados: Nombres de clientes frecuentes, números telefónicos y registro de saldos deudores. Finalidad: Gestión privada de cobros del establecimiento.

3. RESPALDOS EN LA NUBE Y SINCRONIZACIÓN VOLUNTARIA
3.1. Acción Voluntaria: El sistema no envía copias de su base de datos a internet sin que el administrador lo configure o ejecute explícitamente.
3.2. Google Sheets y Google Drive: Cuando se utiliza la integración para respaldo automático o reporte contable:
    a) La transmisión se realiza mediante protocolos seguros TLS/HTTPS directamente entre su navegador/servidor y las APIs autorizadas por usted.
    b) El acceso está protegido por sus propias credenciales de Google Workspace OAuth o llaves de servicio privadas.
    c) En ningún momento el equipo de soporte técnico accede a sus hojas de cálculo sin su expresa autorización previa.

4. TRATAMIENTO ÉTICO DE INTELIGENCIA ARTIFICIAL (GEMINI OCR)
4.1. Escaneo de Facturas de Proveedores: Cuando el usuario utiliza el módulo de lectura de facturas físicas con IA (Gemini Vision), las imágenes cargadas son procesadas de manera estrictamente efímera.
4.2. No Entrenamiento: Los datos de costos, proveedores y compras extraídos de sus facturas no son almacenados por nosotros para entrenar modelos públicos de inteligencia artificial, respetando el secreto comercial de sus alianzas con mayoristas y distribuidores.

5. CONTROL DE ACCESO INTERNO Y PRIVACIDAD EN MOSTRADOR (RBAC)
Para proteger la privacidad de sus costos comerciales frente a empleados y clientes en el mostrador:
5.1. El perfil "CAJERO" tiene bloqueada por defecto la visualización del Costo Promedio Ponderado (PMP), valuaciones de inventario a costo y márgenes de utilidad neta.
5.2. El acceso a reportes financieros confidenciales, libros de venta consolidados y exportación de base de datos requiere perfil "ADMINISTRADOR" o autorización de "SUPERVISOR".

6. DERECHO A LA PORTABILIDAD Y DESTRUCCIÓN DE DATOS
6.1. Exportabilidad Universal: EL COMERCIO tiene el derecho absoluto en cualquier momento de exportar toda su base de datos (productos, movimientos, ventas, clientes) en formatos abiertos y legibles como JSON, CSV o SQL para su libre migración.
6.2. Eliminación Completa: Si EL COMERCIO decide dejar de utilizar el software, puede utilizar la herramienta de "Restablecimiento / Borrado Seguro" para eliminar definitivamente cualquier rastro de información de los dispositivos locales.`;

  const fiscalNoticeText = `================================================================================
AVISO FISCAL Y LEGAL SENIAT • RÉGIMEN TRIBUTARIO VENEZOLANO
DELIMITACIÓN DE RESPONSABILIDADES Y CUMPLIMIENTO NORMATIVO
================================================================================

1. PROVIDENCIA ADMINISTRATIVA SNAT/2011/00071 (RÉGIMEN DE EMISIÓN DE FACTURAS)
El presente software está estructurado para emitir comprobantes de venta y formatos digitales que cumplen con la totalidad de los datos exigidos por el artículo 13 de la Providencia 00071:
- Razón Social, RIF, Domicilio Fiscal y Número de Teléfono del Emisor.
- Identificación del Adquirente: Nombres/Razón Social y RIF o Cédula de Identidad.
- Número de Factura consecutivo y Número de Control correlativo asignado.
- Especificación de la cantidad, descripción, precio unitario y alícuota aplicable (16% o Exento).
- Total facturado desglosado en Base Imponible, Exento, IVA y total a pagar.
* ADVERTENCIA LEGAL: Si su empresa es calificada como Sujeto Pasivo Especial ("Contribuyente Especial") o la normativa le exige el uso obligatorio de Máquina Fiscal con Memoria de Auditoría homologada por el SENIAT, este sistema opera como soporte administrativo interno y control de inventario, debiendo canalizarse la impresión fiscal por los dispositivos homologados correspondientes.

2. LEY DE IMPUESTO A LAS GRANDES TRANSACCIONES FINANCIERAS (IGTF - 3%)
Conforme a la reforma de la Ley de IGTF, todo pago recibido en divisas extranjeras en efectivo o criptomonedas no emitidas por la República conlleva la percepción de la alícuota del 3%. El sistema calcula y desglosa automáticamente este renglón tanto en USD como en su equivalente en Bolívares a la tasa oficial BCV. Es obligación del cajero registrar el método de pago fidedigno.

3. REGLAMENTO DE LA LEY DE IMPUESTO SOBRE LA RENTA (ART. 177 - KARDEX PMP)
El sistema implementa el método de valoración de inventarios por "Costo Promedio Ponderado" (PMP) exigido por el Art. 177 del Reglamento de la LISLR. El Kardex registra cronológicamente cada entrada, salida, costo unitario resultante y saldo en existencia, garantizando trazabilidad auditable en caso de fiscalización.

4. CUMPLIMIENTO CAMBIARIO (BANCO CENTRAL DE VENEZUELA - BCV)
De conformidad con los Convenios Cambiarios vigentes y resoluciones del Banco Central de Venezuela, está prohibido el cobro o cotización en divisas utilizando tasas no oficiales o paralelas. El software integra enlace a la API oficial del BCV con indicación de la "Fecha Valor".`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-[#11131a] border border-slate-700/80 rounded-2xl shadow-2xl shadow-black/80 flex flex-col max-h-[92vh] overflow-hidden my-auto text-slate-200">
        {/* Top Header */}
        <div className="bg-gradient-to-r from-slate-900 via-[#161922] to-slate-900 border-b border-slate-800 px-6 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center text-white shadow-lg shadow-blue-600/30">
              <Scale className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
                  Términos, Privacidad & Cumplimiento Legal
                </h2>
                <span className="text-[10px] uppercase font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-700/60 flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3 text-emerald-400" />
                  Versión Oficial v2.4 (2026)
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Marco jurídico para Software de Punto de Venta, Inventarios, SENIAT, BCV y Protección de Datos
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-all cursor-pointer"
            title="Cerrar ventana"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="bg-[#0e1017] px-6 py-2 border-b border-slate-800 flex items-center gap-2 overflow-x-auto shrink-0 scrollbar-thin">
          <button
            type="button"
            onClick={() => setActiveTab("terms")}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === "terms"
                ? "bg-blue-600 text-white shadow-md shadow-blue-600/30"
                : "text-slate-400 hover:text-white hover:bg-slate-800/60"
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Términos y Condiciones</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("privacy")}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === "privacy"
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                : "text-slate-400 hover:text-white hover:bg-slate-800/60"
            }`}
          >
            <Lock className="w-3.5 h-3.5" />
            <span>Política de Privacidad</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("fiscal")}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === "fiscal"
                ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/30"
                : "text-slate-400 hover:text-white hover:bg-slate-800/60"
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>Aviso Fiscal SENIAT & BCV</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("certificate")}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === "certificate"
                ? "bg-amber-600 text-slate-950 shadow-md shadow-amber-600/30 font-black"
                : "text-slate-400 hover:text-white hover:bg-slate-800/60"
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Constancia de Aceptación</span>
          </button>
        </div>

        {/* Action bar for Copy / Download / Print */}
        <div className="bg-[#141722] px-6 py-2 border-b border-slate-800/60 flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-slate-400 text-[11px]">
            <span>Estado:</span>
            {termsAcceptance.accepted ? (
              <span className="text-emerald-400 font-bold flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Aceptado el {new Date(termsAcceptance.acceptedAt).toLocaleDateString()}
              </span>
            ) : (
              <span className="text-amber-400 font-bold flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5" /> Pendiente de Aceptación Formal
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                const currentDoc =
                  activeTab === "terms"
                    ? termsText
                    : activeTab === "privacy"
                    ? privacyText
                    : activeTab === "fiscal"
                    ? fiscalNoticeText
                    : `${termsText}\n\n${privacyText}\n\n${fiscalNoticeText}`;
                handleCopyText(currentDoc, "Texto del Documento Legal");
              }}
              className="flex items-center gap-1 px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg transition-colors cursor-pointer text-xs"
              title="Copiar texto al portapapeles"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span className="hidden sm:inline">Copiar</span>
            </button>

            <button
              type="button"
              onClick={() => {
                const currentDoc =
                  activeTab === "terms"
                    ? termsText
                    : activeTab === "privacy"
                    ? privacyText
                    : activeTab === "fiscal"
                    ? fiscalNoticeText
                    : `${termsText}\n\n${privacyText}`;
                const docName =
                  activeTab === "terms"
                    ? "TERMINOS_Y_CONDICIONES_POS_2026.txt"
                    : activeTab === "privacy"
                    ? "POLITICA_DE_PRIVACIDAD_POS_2026.txt"
                    : "AVISO_LEGAL_SENIAT_BCV.txt";
                handleDownloadDocument(currentDoc, docName);
              }}
              className="flex items-center gap-1 px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg transition-colors cursor-pointer text-xs"
              title="Descargar documento en texto plano"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Descargar .TXT</span>
            </button>

            <button
              type="button"
              onClick={handlePrint}
              className="flex items-center gap-1 px-2.5 py-1 bg-blue-600/30 hover:bg-blue-600/50 text-blue-300 border border-blue-500/40 rounded-lg transition-colors cursor-pointer text-xs"
              title="Imprimir o exportar en PDF"
            >
              <Printer className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Imprimir / PDF</span>
            </button>
          </div>
        </div>

        {/* Modal Body Content (Scrollable) */}
        <div className="flex-1 min-h-0 overflow-y-auto p-6 space-y-6 text-xs leading-relaxed text-slate-300">
          {/* TAB 1: TÉRMINOS Y CONDICIONES */}
          {activeTab === "terms" && (
            <div className="space-y-6">
              <div className="bg-blue-950/30 border border-blue-500/40 rounded-2xl p-4 flex items-start gap-3.5">
                <Shield className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
                <div className="space-y-1 text-xs">
                  <h3 className="font-bold text-white text-sm">Resumen Ejecutivo de la Licencia POS</h3>
                  <p className="text-slate-300 text-[11px] leading-relaxed">
                    Este software se entrega para uso comercial en el establecimiento designado. Al tratarse de un sistema con capacidades de cálculo tributario (IVA, IGTF 3%, PMP) y conexión con periféricos (SmartPOS, impresoras fiscales), el contribuyente es el responsable exclusivo de sus declaraciones fiscales ante el SENIAT.
                  </p>
                </div>
              </div>

              {/* Cláusula 1 */}
              <div className="bg-[#161822] border border-slate-800 rounded-2xl p-4 space-y-2">
                <div className="flex items-center gap-2 font-bold text-white text-sm">
                  <span className="w-6 h-6 rounded-full bg-blue-600/30 text-blue-400 flex items-center justify-center text-xs font-mono font-bold">1</span>
                  <h4>Objeto y Alcance de la Licencia</h4>
                </div>
                <p className="text-slate-300 text-xs leading-relaxed pl-8">
                  Se concede a <strong>{license?.nombre_negocio || "EL COMERCIO"}</strong> una licencia no exclusiva e intransferible para instalar y operar el software en sus puntos de venta autorizados. El software funciona bajo arquitectura híbrida: opera 100% de manera autónoma local mediante motor transaccional SQLite3 sin requerir conexión permanente a internet para registrar ventas, calcular vueltos y alimentar el inventario.
                </p>
              </div>

              {/* Cláusula 2 */}
              <div className="bg-[#161822] border border-slate-800 rounded-2xl p-4 space-y-2">
                <div className="flex items-center gap-2 font-bold text-white text-sm">
                  <span className="w-6 h-6 rounded-full bg-amber-600/30 text-amber-400 flex items-center justify-center text-xs font-mono font-bold">2</span>
                  <h4>Exoneración y Responsabilidad Fiscal ante el SENIAT</h4>
                </div>
                <p className="text-slate-300 text-xs leading-relaxed pl-8">
                  El software provee fórmulas estandarizadas de cálculo según la <strong>Providencia SNAT/00071</strong>, la <strong>Ley de IVA</strong> (16% y Exentos), la <strong>Ley de IGTF (3%)</strong> y el <strong>Art. 177 de la LISLR (Kardex PMP)</strong>. Sin embargo, EL COMERCIO asume plena y total responsabilidad legal, administrativa y penal por la veracidad de los datos contables emitidos, correlativos fiscales utilizados y declaraciones presentadas ante la Administración Tributaria. El desarrollador no será responsable por sanciones, clausuras o multas derivadas del mal uso del sistema.
                </p>
              </div>

              {/* Cláusula 3 */}
              <div className="bg-[#161822] border border-slate-800 rounded-2xl p-4 space-y-2">
                <div className="flex items-center gap-2 font-bold text-white text-sm">
                  <span className="w-6 h-6 rounded-full bg-emerald-600/30 text-emerald-400 flex items-center justify-center text-xs font-mono font-bold">3</span>
                  <h4>Cumplimiento Cambiario y Tasa Oficial BCV</h4>
                </div>
                <p className="text-slate-300 text-xs leading-relaxed pl-8">
                  Todas las conversiones entre Dólares Estadounidenses (USD) y Bolívares (VES) deben regirse según la tasa de cambio publicada oficialmente por el <strong>Banco Central de Venezuela (BCV)</strong> correspondiente a la fecha valor de la venta. El software sincroniza la cotización vía API oficial; es obligación del usuario corroborar y mantener actualizada la tasa al inicio de cada jornada comercial.
                </p>
              </div>

              {/* Cláusula 4 */}
              <div className="bg-[#161822] border border-slate-800 rounded-2xl p-4 space-y-2">
                <div className="flex items-center gap-2 font-bold text-white text-sm">
                  <span className="w-6 h-6 rounded-full bg-indigo-600/30 text-indigo-400 flex items-center justify-center text-xs font-mono font-bold">4</span>
                  <h4>Operaciones con SmartPOS y Pasarelas de Pago (PCI-DSS)</h4>
                </div>
                <p className="text-slate-300 text-xs leading-relaxed pl-8">
                  En cumplimiento con el estándar de seguridad bancaria <strong>PCI-DSS</strong>, el sistema <strong>NO almacena ni procesa números confidenciales de tarjetas de crédito o débito, CVV ni números de PIN bancario</strong>. La interacción con terminales SmartPOS (WizarPOS, Sunmi, PAX, Biopago) se limita al envío de la instrucción de monto a cobrar e importación del número de referencia de aprobación bancaria.
                </p>
              </div>

              {/* Cláusula 5 */}
              <div className="bg-[#161822] border border-slate-800 rounded-2xl p-4 space-y-2">
                <div className="flex items-center gap-2 font-bold text-white text-sm">
                  <span className="w-6 h-6 rounded-full bg-purple-600/30 text-purple-400 flex items-center justify-center text-xs font-mono font-bold">5</span>
                  <h4>Suscripción Mensual, Período de Gracia y Desconexión</h4>
                </div>
                <p className="text-slate-300 text-xs leading-relaxed pl-8">
                  Para las modalidades con soporte y mantenimiento mensual ($15 USD Bodega / $30 USD Fiscal), se establece una fecha de corte mensual. En caso de corte o mora, el sistema cuenta con un período de gracia de cortesía (hasta 3-5 días offline). Si no se reporta el pago tras dicho período, el sistema podrá limitar las funciones de venta hasta que se regularice la cuota con el administrador.
                </p>
              </div>

              {/* Cláusula 6 */}
              <div className="bg-[#161822] border border-slate-800 rounded-2xl p-4 space-y-2">
                <div className="flex items-center gap-2 font-bold text-white text-sm">
                  <span className="w-6 h-6 rounded-full bg-slate-600 text-slate-300 flex items-center justify-center text-xs font-mono font-bold">6</span>
                  <h4>Propiedad Intelectual y Restricciones de Copia</h4>
                </div>
                <p className="text-slate-300 text-xs leading-relaxed pl-8">
                  El código fuente, diseño, bases de datos y algoritmos son propiedad intelectual reservada. La licencia adquirida no faculta al usuario para revender, sublicenciar o descompilar el software para su distribución comercial a terceros ajenos a la licencia original contratada.
                </p>
              </div>
            </div>
          )}

          {/* TAB 2: POLÍTICA DE PRIVACIDAD */}
          {activeTab === "privacy" && (
            <div className="space-y-6">
              <div className="bg-indigo-950/30 border border-indigo-500/40 rounded-2xl p-4 flex items-start gap-3.5">
                <Lock className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
                <div className="space-y-1 text-xs">
                  <h3 className="font-bold text-white text-sm">Compromiso de Privacidad y No Venta de Datos</h3>
                  <p className="text-slate-300 text-[11px] leading-relaxed">
                    Sus datos de ventas, márgenes, costos PMP y clientes le pertenecen al 100% a su negocio. No vendemos sus números comerciales a competidores ni a terceros. La base de datos es local y soberana.
                  </p>
                </div>
              </div>

              {/* Sección 1 */}
              <div className="bg-[#161822] border border-slate-800 rounded-2xl p-4 space-y-2">
                <div className="flex items-center gap-2 font-bold text-white text-sm">
                  <Database className="w-4 h-4 text-emerald-400" />
                  <h4>1. Soberanía del Dato y Almacenamiento Local</h4>
                </div>
                <p className="text-slate-300 text-xs leading-relaxed">
                  Toda la información operativa (catálogo, precios, stock, ventas diarias, lista de clientes y fiados) se guarda de forma primordial en su máquina local a través de SQLite o almacenamiento local cifrado. Ninguna empresa externa tiene acceso a sus márgenes brutos ni a sus estadísticas de facturación a menos que usted exporte voluntariamente un respaldo.
                </p>
              </div>

              {/* Sección 2 */}
              <div className="bg-[#161822] border border-slate-800 rounded-2xl p-4 space-y-2">
                <div className="flex items-center gap-2 font-bold text-white text-sm">
                  <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                  <h4>2. Sincronización con Google Sheets y Copias de Seguridad en la Nube</h4>
                </div>
                <p className="text-slate-300 text-xs leading-relaxed">
                  Cuando usted activa la opción de respaldo en la nube (Google Sheets / Google Drive):
                </p>
                <ul className="list-disc list-inside space-y-1 text-slate-400 pl-2">
                  <li>La transmisión se realiza exclusivamente mediante protocolo HTTPS / TLS cifrado punto a punto.</li>
                  <li>Usted es el único propietario de la cuenta de Google y de la hoja de cálculo generada.</li>
                  <li>Las credenciales se gestionan vía OAuth del cliente y nunca se transfieren a servidores no autorizados.</li>
                </ul>
              </div>

              {/* Sección 3 */}
              <div className="bg-[#161822] border border-slate-800 rounded-2xl p-4 space-y-2">
                <div className="flex items-center gap-2 font-bold text-white text-sm">
                  <Cpu className="w-4 h-4 text-blue-400" />
                  <h4>3. Tratamiento Efímero de Facturas por Inteligencia Artificial (Gemini)</h4>
                </div>
                <p className="text-slate-300 text-xs leading-relaxed">
                  El módulo de digitalización de facturas de proveedores utiliza la API de Google Gemini para extraer renglones mediante visión artificial. Las imágenes de las facturas no se almacenan en servidores públicos ni se utilizan para alimentar modelos compartidos. Una vez procesados los renglones para alimentar su inventario, la imagen temporal se descarta de la memoria volátil.
                </p>
              </div>

              {/* Sección 4 */}
              <div className="bg-[#161822] border border-slate-800 rounded-2xl p-4 space-y-2">
                <div className="flex items-center gap-2 font-bold text-white text-sm">
                  <ShieldCheck className="w-4 h-4 text-indigo-400" />
                  <h4>4. Privacidad Interna en el Punto de Venta (RBAC)</h4>
                </div>
                <p className="text-slate-300 text-xs leading-relaxed">
                  El sistema incorpora control de acceso por roles. Los cajeros tienen oculta la visualización del Costo Promedio Ponderado (PMP), valuaciones de inventario a costo y márgenes de ganancia. Esto garantiza que ningún empleado de mostrador pueda conocer los márgenes privados de utilidad del dueño del negocio.
                </p>
              </div>

              {/* Sección 5 */}
              <div className="bg-[#161822] border border-slate-800 rounded-2xl p-4 space-y-2">
                <div className="flex items-center gap-2 font-bold text-white text-sm">
                  <Download className="w-4 h-4 text-amber-400" />
                  <h4>5. Portabilidad y Cero "Secuestro de Datos" (No Vendor Lock-in)</h4>
                </div>
                <p className="text-slate-300 text-xs leading-relaxed">
                  Usted tiene derecho en cualquier momento a descargar una copia completa de su base de datos en formato JSON o SQLite. No retenemos sus datos comerciales si decide cambiar de software o migrar de equipo.
                </p>
              </div>
            </div>
          )}

          {/* TAB 3: AVISO FISCAL SENIAT & BCV */}
          {activeTab === "fiscal" && (
            <div className="space-y-6">
              <div className="bg-emerald-950/30 border border-emerald-500/40 rounded-2xl p-4 flex items-start gap-3.5">
                <Building2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                <div className="space-y-1 text-xs">
                  <h3 className="font-bold text-white text-sm">Guía de Cumplimiento Tributario y Cambiario</h3>
                  <p className="text-slate-300 text-[11px] leading-relaxed">
                    Directrices de auditoría fiscal venezolana: Providencia Administrativa SNAT/00071, Ley de Impuesto a las Grandes Transacciones Financieras (IGTF 3%), Art. 177 LISLR y Tasa Oficial BCV.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-[#161822] border border-slate-800 rounded-2xl p-4 space-y-2">
                  <div className="flex items-center gap-2 font-bold text-emerald-400 text-sm">
                    <CheckCircle2 className="w-4 h-4" />
                    <h4>Providencia SNAT/00071</h4>
                  </div>
                  <p className="text-slate-400 text-xs leading-relaxed">
                    El sistema emite facturas con los requisitos exigidos por el artículo 13: RIF/Cédula del comprador, denominación del emisor, correlativo de factura y control, fecha y hora exacta, alícuotas 16% y exenciones, y monto total a pagar.
                  </p>
                </div>

                <div className="bg-[#161822] border border-slate-800 rounded-2xl p-4 space-y-2">
                  <div className="flex items-center gap-2 font-bold text-blue-400 text-sm">
                    <CheckCircle2 className="w-4 h-4" />
                    <h4>Alícuota IGTF 3%</h4>
                  </div>
                  <p className="text-slate-400 text-xs leading-relaxed">
                    Al cobrar en divisas en efectivo o criptoactivos, el software añade automáticamente el 3% de IGTF y desglosa la retención en Bolívares y Dólares, facilitando el reporte para la declaración quincenal del contribuyente especial.
                  </p>
                </div>

                <div className="bg-[#161822] border border-slate-800 rounded-2xl p-4 space-y-2">
                  <div className="flex items-center gap-2 font-bold text-amber-400 text-sm">
                    <CheckCircle2 className="w-4 h-4" />
                    <h4>Reglamento LISLR Art. 177</h4>
                  </div>
                  <p className="text-slate-400 text-xs leading-relaxed">
                    Exige a todo establecimiento comercial mantener un libro de inventario por Costo Promedio Ponderado (PMP). El Kardex registra cronológicamente cada compra y venta, generando un registro auditable e inmutable.
                  </p>
                </div>

                <div className="bg-[#161822] border border-slate-800 rounded-2xl p-4 space-y-2">
                  <div className="flex items-center gap-2 font-bold text-purple-400 text-sm">
                    <CheckCircle2 className="w-4 h-4" />
                    <h4>Tasa de Cambio Oficial BCV</h4>
                  </div>
                  <p className="text-slate-400 text-xs leading-relaxed">
                    Es obligatorio presentar los precios en Bolívares y liquidar a la tasa oficial del día del BCV (Banco Central de Venezuela). Queda estrictamente prohibido el uso de tasas informales en operaciones comerciales.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: CONSTANCIA DE ACEPTACIÓN FORMAL */}
          {activeTab === "certificate" && (
            <div className="space-y-6">
              <div className="bg-[#161822] border border-amber-500/40 rounded-2xl p-6 space-y-4 text-center">
                <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 mx-auto shadow-inner">
                  <ShieldCheck className="w-9 h-9" />
                </div>

                <div className="space-y-1">
                  <h3 className="text-base font-extrabold text-white">
                    Certificado de Aceptación Legal y Cumplimiento
                  </h3>
                  <p className="text-xs text-slate-400 max-w-lg mx-auto">
                    Constancia digital vinculante entre el prestador del servicio tecnológico y el establecimiento comercial titular de la licencia.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-xl mx-auto text-left bg-[#0e1017] p-4 rounded-xl border border-slate-800 text-xs font-mono">
                  <div>
                    <span className="text-slate-500 text-[10px] block uppercase">Establecimiento / Comercio:</span>
                    <span className="text-white font-bold">{license?.nombre_negocio || "Comercio Usuario del Sistema"}</span>
                  </div>

                  <div>
                    <span className="text-slate-500 text-[10px] block uppercase">RIF / Cédula:</span>
                    <span className="text-amber-400 font-bold">{license?.rif_cedula || "V-12345678-0"}</span>
                  </div>

                  <div>
                    <span className="text-slate-500 text-[10px] block uppercase">Edición de Software:</span>
                    <span className="text-blue-400 font-bold uppercase">{license?.edicion_contratada || "Edición Bodega & Fiscal"}</span>
                  </div>

                  <div>
                    <span className="text-slate-500 text-[10px] block uppercase">Versión del Marco Legal:</span>
                    <span className="text-emerald-400 font-bold">v2.4 - Leyes Fiscales 2026</span>
                  </div>

                  <div>
                    <span className="text-slate-500 text-[10px] block uppercase">Estado de Conformidad:</span>
                    <span className={`font-bold ${termsAcceptance.accepted ? "text-emerald-400" : "text-amber-400"}`}>
                      {termsAcceptance.accepted ? "ACEPTADO Y VINCULANTE" : "PENDIENTE DE CONFIRMACIÓN"}
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-500 text-[10px] block uppercase">Fecha de Validación:</span>
                    <span className="text-slate-300">
                      {termsAcceptance.accepted
                        ? new Date(termsAcceptance.acceptedAt).toLocaleString()
                        : "En espera de aceptación"}
                    </span>
                  </div>
                </div>

                <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
                  {!termsAcceptance.accepted ? (
                    <button
                      type="button"
                      onClick={() => onAcceptTerms(currentUser?.username || "Administrador")}
                      className="w-full sm:w-auto px-6 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-black text-xs rounded-xl shadow-lg shadow-emerald-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Aceptar Términos & Condiciones y Política de Privacidad</span>
                    </button>
                  ) : (
                    <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-950/60 border border-emerald-600/50 text-emerald-300 font-bold text-xs">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      <span>Términos y Política de Privacidad ya Aceptados por {termsAcceptance.acceptedBy}</span>
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={handlePrint}
                    className="w-full sm:w-auto px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Printer className="w-4 h-4 text-slate-400" />
                    <span>Imprimir Certificado</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Bottom Footer Actions */}
        <div className="bg-[#141620] px-6 py-3.5 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <div className="text-[11px] text-slate-400 text-center sm:text-left">
            <span>Marco Regulatorio: </span>
            <strong className="text-slate-300 font-semibold">SENIAT SNAT/00071</strong> •{" "}
            <strong className="text-slate-300 font-semibold">LISLR Art. 177</strong> •{" "}
            <strong className="text-slate-300 font-semibold">BCV Oficial</strong> •{" "}
            <strong className="text-slate-300 font-semibold">PCI-DSS Compliant</strong>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
            {!termsAcceptance.accepted && activeTab !== "certificate" && (
              <button
                type="button"
                onClick={() => onAcceptTerms(currentUser?.username || "Administrador")}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Aceptar Términos</span>
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl transition-all cursor-pointer"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
