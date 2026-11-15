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
import { APP_VERSION } from "../version";

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
TÉRMINOS Y CONDICIONES GENERALES DE USO Y LICENCIA DE SOFTWARE — FARADAYPOS
SISTEMA DE GESTIÓN COMERCIAL, INVENTARIO Y FACTURACIÓN FISCAL
Versión: ${APP_VERSION} (Revisión Legal 2026) • Ámbito: República Bolivariana de Venezuela
================================================================================

1. OBJETO Y ÁMBITO DE APLICACIÓN
El presente contrato rige los términos, condiciones y límites de uso del software de Punto de Venta (FaradayPOS), control de inventarios, libro de ventas y facturación en sus modalidades "Edición Bodega" y "Edición Fiscal SENIAT" (así como la modalidad combinada "Ambas Ediciones"). Al instalar, acceder, operar o registrar transacciones en esta plataforma, el usuario comercial (en lo sucesivo "EL COMERCIO" o "EL USUARIO") declara conocer, entender y aceptar en su totalidad las cláusulas aquí descritas.

2. NATURALEZA DE LA LICENCIA DE USO, TARIFAS Y ACTUALIZACIONES
2.1. Concesión de Licencia: Se otorga a EL COMERCIO una licencia de uso no exclusiva, intransferible y revocable para operar el software FaradayPOS en sus terminales autorizadas conforme a la edición contratada: Edición Bodega, Edición Fiscal o Ambas Ediciones (Multimodal), protegida mediante llaves de activación con validación criptográfica SHA-256.
2.2. Modalidad de Operación Híbrida (Offline-First): El software opera de manera primordial bajo un esquema local sin conexión forzosa a internet (almacenamiento local persistente en el equipo del comercio, con respaldos automáticos en la carpeta local "backups/" y archivo digital de comprobantes en "facturas_emitidas/"), garantizando la continuidad operativa del establecimiento comercial ante caídas de telecomunicaciones o fallas eléctricas.
2.3. Mantenimiento, Suscripción Mensual y Validación en Nube: Cuando el software se adquiera bajo modalidad de suscripción periódica ($15 USD/mes para Edición Bodega, $25 USD/mes para Edición Fiscal SENIAT, o $35 USD/mes para Ambas Ediciones), el acceso continuo al sistema, soporte técnico y actualizaciones estará condicionado al pago puntual de la cuota acordada. El estado de vigencia de la licencia se sincroniza periódicamente con el servidor de licencias en la nube (Google Firebase Firestore), contando con un período de gracia offline de cortesía (3 a 5 días) antes de limitar las funciones de facturación por mora.
2.4. Actualizaciones Oficiales del Sistema: El software incluye un módulo de actualización automática conectado al repositorio oficial de distribución en GitHub, el cual descarga e instala mejoras funcionales y normativas preservando intactos los datos comerciales, configuraciones y respaldos locales de EL COMERCIO.

3. DELIMITACIÓN DE RESPONSABILIDAD TRIBUTARIA Y FISCAL (SENIAT)
3.1. Rol Tecnológico: El software constituye exclusivamente una herramienta tecnológica de cálculo, registro y automatización contable-administrativa.
3.2. Responsabilidad Exclusiva del Contribuyente: EL COMERCIO es el único responsable legal, mercantil, civil y penal ante el Servicio Nacional Integrado de Administración Aduanera y Tributaria (SENIAT), la Superintendencia Nacional para la Defensa de los Derechos Socioeconómicos (SUNDDE), alcaldías y demás entes reguladores por:
    a) La exactitud, veracidad y licitud de las ventas, costos y precios registrados.
    b) El correcto reporte de alícuotas del Impuesto al Valor Agregado (IVA general 16% o exenciones según Art. 18 de la Ley de IVA).
    c) La aplicación obligatoria de la alícuota del 3% del Impuesto a las Grandes Transacciones Financieras (IGTF) en cobros efectuados en moneda extranjera o criptoactivos distintos al Petro.
    d) La emisión legal de Facturas Físicas / Talonarios autorizados conforme a la Providencia Administrativa SNAT/2011/00071, mediante Máquinas Fiscales homologadas, o mediante Facturación Digital a través de una Imprenta Digital Autorizada según la Providencia Administrativa SNAT/2024/000102 (Gaceta Oficial N° 43.032 del 19/12/2024), según corresponda a su calificación de contribuyente.
    e) La veracidad del Libro de Ventas y el cálculo del Costo Promedio Ponderado (PMP) exigido por el Artículo 177 del Reglamento de la Ley de Impuesto Sobre la Renta (LISLR).
3.3. Derogatoria de Homologación de Software (Providencia SNAT/2026/00084): Conforme a la Providencia Administrativa SNAT/2026/00084 (publicada en Gaceta Oficial N° 43.435 del 12 de agosto de 2026), quedó expresamente derogada la Providencia Administrativa SNAT/2024/000121. En consecuencia, la comercialización y uso del presente software de gestión administrativa e inventario no requiere procedimiento especial previo de homologación de software ante el SENIAT, manteniéndose plenamente vigentes las obligaciones del contribuyente bajo las Providencias SNAT/2011/00071 y SNAT/2024/000102.
3.4. Exoneración del Desarrollador: El desarrollador y proveedor del software quedan exentos de toda responsabilidad por multas, reparos fiscales, clausuras de establecimientos o sanciones derivadas de mala praxis contable, evasión fiscal o alteración fraudulenta de datos por parte de EL COMERCIO.

4. RÉGIMEN CAMBIARIO Y TASA OFICIAL BCV
4.1. Transparencia Cambiaria: Conforme a las directrices del Banco Central de Venezuela (BCV) y normativas de protección al consumidor, todo precio fijado en divisas (USD / EUR) debe ser liquidable en Bolívares (VES) a la tasa oficial de la fecha valor de la operación.
4.2. Validación de la Tasa: El software ofrece sincronización automática vía API con la cotización oficial del BCV. No obstante, es deber indelegable del cajero o administrador verificar visualmente la tasa antes de iniciar el turno diario.

5. INTEGRACIONES CON DISPOSITIVOS DE PAGO (SMARTPOS Y BIOPAGO)
5.1. Normativa PCI-DSS: El software no almacena, captura ni procesa datos confidenciales de tarjetas de crédito o débito, tales como números de PAN completos, fechas de vencimiento, códigos CVV/CVC ni números de PIN bancario.
5.2. Comunicación con SmartPOS: Las transacciones canalizadas a terminales inteligentes (WizarPOS, Sunmi, PAX, Biopago BDV) se transmiten a través de protocolos seguros e independientes de las redes bancarias adquirentes. El éxito o rechazo de los cobros bancarios depende de la entidad financiera.

6. LIBRETA DE FIADOS Y CONTROL DE CRÉDITOS COMERCIALES
La funcionalidad de "Libreta de Fiados" constituye un auxiliar de control de cuentas por cobrar entre vecinos y clientes de confianza. El software no actúa como entidad de intermediación financiera ni garantiza el cobro o solvencia de los deudores.

7. PROPIEDAD INTELECTUAL Y CÓDIGO FUENTE
Todos los derechos de autor, marca comercial FaradayPOS, código fuente, algoritmos, hashes criptográficos, interfaces visuales y documentación son propiedad exclusiva de sus creadores y están protegidos por las leyes de propiedad intelectual internacionales y de la República Bolivariana de Venezuela. Se prohíbe la ingeniería inversa no autorizada, descompilación fraudulenta, alteración de validadores de licencia o comercialización ilegal de copias del sistema.`;

  const privacyText = `================================================================================
POLÍTICA DE PRIVACIDAD, CONFIDENCIALIDAD Y TRATAMIENTO DE DATOS — FARADAYPOS
SISTEMA DE GESTIÓN COMERCIAL, INVENTARIO Y FACTURACIÓN FISCAL
Versión: ${APP_VERSION} (Revisión 2026) • Ámbito: Comercial y Protección al Consumidor
================================================================================

1. PRINCIPIO FUNDAMENTAL: SOBERANÍA TOTAL DEL DATO COMERCIAL
Nos tomamos la privacidad de su negocio con el más estricto rigor profesional. A diferencia de las plataformas SaaS tradicionales que monopolizan su información en servidores ajenos:
1.1. Almacenamiento Primario 100% Local: Su catálogo de productos, lista de precios, márgenes de ganancia, costos reales de adquisición (PMP), historial de ventas, cierres de caja y datos de clientes residen de forma exclusiva y primaria en su propio computador (almacenamiento seguro local del sistema, respaldos físicos en carpeta "backups/" y archivo de comprobantes en "facturas_emitidas/").
1.2. No Comercialización: Bajo NINGUNA circunstancia vendemos, alquilamos, cedemos ni compartimos sus cifras de facturación, márgenes comerciales o datos de clientes con competidores, empresas de publicidad ni terceros. Su negocio le pertenece a usted.

2. TIPOS DE DATOS TRATADOS LOCALMENTE Y SU FINALIDAD
2.1. Datos de Facturación del Cliente Final: Cédula o RIF, Nombres o Razón Social, Teléfono y Dirección fiscal. Finalidad: Cumplimiento de las Providencias Administrativas SNAT/2011/00071 y SNAT/2024/000102 del SENIAT y emisión de comprobantes de venta.
2.2. Datos de Operadores del Sistema: Nombres de cajeros, supervisores y administradores, roles asignados y credenciales de autenticación. Las llaves de activación de edición están protegidas mediante algoritmos de hash irreversible SHA-256 con Salt criptográfico. Finalidad: Auditoría interna, arqueo de caja y control de acceso basado en roles (RBAC).
2.3. Libreta de Fiados: Nombres de clientes frecuentes, números telefónicos y registro de saldos deudores. Finalidad: Gestión privada de cobros del establecimiento.

3. VALIDACIÓN DE LICENCIAS EN LA NUBE (FIREBASE FIRESTORE) Y RESPALDOS
3.1. Telemetría Mínima de Licencia (Firebase Firestore): Para verificar la vigencia de la suscripción y la versión instalada del sistema, FaradayPOS sincroniza únicamente metadatos administrativos de la licencia con Google Firebase Firestore: Identificador de Licencia (cliente_id), Nombre del Comercio, RIF/Cédula del establecimiento, Edición Contratada, Cuota Mensual, Fecha de Vencimiento y Número de Versión instalada (v${APP_VERSION}).
3.2. Exclusión Absoluta de Datos Comerciales en la Nube de Licencias: El canal de validación de Firebase Firestore NUNCA transmite ni recopila su catálogo de productos, precios, costos de proveedores, ventas realizadas, cierres de caja ni cartera de clientes.
3.3. Respaldos Locales y en la Nube bajo Control del Usuario:
    a) El sistema guarda copias de seguridad automáticas en la carpeta local "backups/" de su disco duro y archiva cada comprobante emitido en "facturas_emitidas/".
    b) Cuando el administrador utiliza la exportación o sincronización con Google Sheets / archivos JSON, la transmisión se realiza mediante protocolos seguros TLS/HTTPS bajo autorización expresa del titular del comercio.

4. TRATAMIENTO ÉTICO DE INTELIGENCIA ARTIFICIAL (GEMINI OCR)
4.1. Escaneo de Facturas de Proveedores: Cuando el usuario utiliza el módulo de lectura de facturas físicas con IA (Gemini Vision), las imágenes cargadas son procesadas de manera estrictamente efímera.
4.2. No Entrenamiento: Los datos de costos, proveedores y compras extraídos de sus facturas no son almacenados por nosotros para entrenar modelos públicos de inteligencia artificial, respetando el secreto comercial de sus alianzas con mayoristas y distribuidores.

5. CONTROL DE ACCESO INTERNO Y PRIVACIDAD EN MOSTRADOR (RBAC)
Para proteger la privacidad de sus costos comerciales frente a empleados y clientes en el mostrador:
5.1. El perfil "CAJERO" tiene bloqueada por defecto la visualización del Costo Promedio Ponderado (PMP), valuaciones de inventario a costo y márgenes de utilidad neta.
5.2. El acceso a reportes financieros confidenciales, libros de venta consolidados, configuración de licencias y exportación de base de datos requiere perfil "ADMINISTRADOR" o autorización de "SUPERVISOR".

6. DERECHO A LA PORTABILIDAD Y DESTRUCCIÓN DE DATOS
6.1. Exportabilidad Universal: EL COMERCIO tiene el derecho absoluto en cualquier momento de exportar toda su base de datos (productos, movimientos, ventas, clientes) en formatos abiertos y legibles como JSON o CSV/Excel para su libre migración.
6.2. Eliminación Completa: Si EL COMERCIO decide dejar de utilizar el software, puede utilizar la herramienta de "Restablecimiento de Fábrica / Borrado Seguro" para eliminar definitivamente cualquier rastro de información de los dispositivos locales.`;

  const fiscalNoticeText = `================================================================================
AVISO FISCAL Y LEGAL SENIAT • RÉGIMEN TRIBUTARIO VENEZOLANO (ACTUALIZADO 2026)
DELIMITACIÓN DE RESPONSABILIDADES Y CUMPLIMIENTO NORMATIVO
================================================================================

1. PROVIDENCIA ADMINISTRATIVA SNAT/2011/00071 (RÉGIMEN GENERAL DE FACTURACIÓN)
El presente software está estructurado para emitir comprobantes de venta y formatos que cumplen con los datos exigidos por el artículo 13 de la Providencia 00071:
- Razón Social, RIF, Domicilio Fiscal y Número de Teléfono del Emisor.
- Identificación del Adquirente: Nombres/Razón Social y RIF o Cédula de Identidad.
- Número de Factura consecutivo y Número de Control correlativo asignado.
- Especificación de la cantidad, descripción, precio unitario y alícuota aplicable (16% o Exento).
- Total facturado desglosado en Base Imponible, Exento, IVA y total a pagar.
* ADVERTENCIA LEGAL: Si su empresa está obligada al uso de Máquina Fiscal homologada por el SENIAT en ventas presenciales, la Edición Bodega / Control Interno opera como auxiliar administrativo e inventario, debiendo emitirse la factura fiscal por su Máquina Fiscal o medio autorizado.

2. PROVIDENCIA ADMINISTRATIVA SNAT/2024/000102 (FACTURACIÓN DIGITAL E IMPRENTAS AUTORIZADAS)
Publicada en Gaceta Oficial N° 43.032 del 19/12/2024 (derogando la Providencia SNAT/2014/0032):
- Regula la emisión de facturas y documentos fiscales por medios electrónicos/digitales.
- Es obligatoria para contribuyentes que operen exclusivamente por medios electrónicos (e-commerce, apps, redes sociales) y para comercios físicos con máquina fiscal que además realicen ventas por canales digitales (por dichas ventas online).
- El sistema incorpora un Conector para Imprenta Digital Autorizada SENIAT (The Factory HKA, Unidigital, Serdimpre o API REST estándar) para la asignación telemática del Número de Control y resguardo fiscal.

3. DEROGATORIA DE LA PROVIDENCIA 000121 MEDIANTE PROVIDENCIA SNAT/2026/00084
Conforme a la Providencia Administrativa SNAT/2026/00084 (Gaceta Oficial N° 43.435 del 12 de agosto de 2026), el SENIAT derogó expresamente la Providencia Administrativa SNAT/2024/000121.
- En virtud de esta derogatoria, los proveedores y desarrolladores de software administrativo, inventario y punto de venta NO están sujetos al trámite previo de homologación y registro de software que exigía la extinta Providencia 000121.
- La validez de los documentos fiscales emitidos por el contribuyente se rige por las Providencias SNAT/2011/00071 (medios físicos/máquinas fiscales) y SNAT/2024/000102 (facturación digital vía Imprenta Digital Autorizada).

4. LEY DE IMPUESTO A LAS GRANDES TRANSACCIONES FINANCIERAS (IGTF - 3%)
Conforme a la reforma de la Ley de IGTF, todo pago recibido en divisas extranjeras en efectivo o criptomonedas no emitidas por la República conlleva la percepción de la alícuota del 3%. El sistema calcula y desglosa automáticamente este renglón tanto en USD como en su equivalente en Bolívares a la tasa oficial BCV.

5. REGLAMENTO DE LA LEY DE IMPUESTO SOBRE LA RENTA (ART. 177 - KARDEX PMP)
El sistema implementa el método de valoración de inventarios por "Costo Promedio Ponderado" (PMP) exigido por el Art. 177 del Reglamento de la LISLR. El Kardex registra cronológicamente cada entrada, salida, costo unitario resultante y saldo en existencia, garantizando trazabilidad auditable.

6. CUMPLIMIENTO CAMBIARIO (BANCO CENTRAL DE VENEZUELA - BCV)
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
                  Términos, Privacidad & Cumplimiento Legal — FaradayPOS
                </h2>
                <span className="text-[10px] uppercase font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-700/60 flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3 text-emerald-400" />
                  Versión Oficial v{APP_VERSION} (2026)
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Marco jurídico actualizado: SNAT/2011/00071, SNAT/2024/000102 y Derogatoria SNAT/2026/00084
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
                    ? "TERMINOS_Y_CONDICIONES_FARADAYPOS_2026.txt"
                    : activeTab === "privacy"
                    ? "POLITICA_DE_PRIVACIDAD_FARADAYPOS_2026.txt"
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
                  <h3 className="font-bold text-white text-sm">Resumen Ejecutivo de la Licencia FaradayPOS (Actualizado 2026)</h3>
                  <p className="text-slate-300 text-[11px] leading-relaxed">
                    Este software se entrega para uso comercial en el establecimiento designado bajo modalidad <strong>Edición Bodega</strong>, <strong>Edición Fiscal SENIAT</strong> o <strong>Ambas Ediciones</strong>. Conforme a la <strong>Providencia SNAT/2026/00084</strong> (que derogó la SNAT/2024/000121), la comercialización de sistemas administrativos e inventario no requiere homologación previa de software ante el SENIAT. El contribuyente es responsable de emitir sus facturas según la <strong>SNAT/2011/00071</strong> o <strong>SNAT/2024/000102</strong>.
                  </p>
                </div>
              </div>

              {/* Cláusula 1 */}
              <div className="bg-[#161822] border border-slate-800 rounded-2xl p-4 space-y-2">
                <div className="flex items-center gap-2 font-bold text-white text-sm">
                  <span className="w-6 h-6 rounded-full bg-blue-600/30 text-blue-400 flex items-center justify-center text-xs font-mono font-bold">1</span>
                  <h4>Objeto, Ediciones y Operación Local Autónoma</h4>
                </div>
                <p className="text-slate-300 text-xs leading-relaxed pl-8">
                  Se concede a <strong>{license?.nombre_negocio || "EL COMERCIO"}</strong> una licencia no exclusiva e intransferible para instalar y operar <strong>FaradayPOS</strong> en sus puntos de venta autorizados. El software funciona bajo arquitectura híbrida <em>Offline-First</em>: opera 100% de manera autónoma en su equipo local sin requerir conexión permanente a internet para registrar ventas, calcular vueltos, generar respaldos en disco (<code>backups/</code>) ni archivar comprobantes emitidos (<code>facturas_emitidas/</code>).
                </p>
              </div>

              {/* Cláusula 2 */}
              <div className="bg-[#161822] border border-slate-800 rounded-2xl p-4 space-y-2">
                <div className="flex items-center gap-2 font-bold text-white text-sm">
                  <span className="w-6 h-6 rounded-full bg-amber-600/30 text-amber-400 flex items-center justify-center text-xs font-mono font-bold">2</span>
                  <h4>Marco SENIAT: SNAT/2011/00071, SNAT/2024/000102 y Derogatoria SNAT/2026/00084</h4>
                </div>
                <p className="text-slate-300 text-xs leading-relaxed pl-8">
                  El software provee fórmulas estandarizadas según la <strong>Providencia SNAT/2011/00071</strong>, conector de Imprenta Digital Autorizada bajo la <strong>Providencia SNAT/2024/000102</strong>, la <strong>Ley de IVA</strong> (16% y Exentos), la <strong>Ley de IGTF (3%)</strong> y el <strong>Art. 177 de la LISLR (Kardex PMP)</strong>. Conforme a la <strong>Providencia SNAT/2026/00084</strong> (Gaceta Oficial N° 43.435 del 12/08/2026), quedó derogada la Providencia SNAT/2024/000121. EL COMERCIO asume plena y total responsabilidad legal, administrativa y penal por la veracidad de los datos contables emitidos y declaraciones presentadas ante la Administración Tributaria.
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
                  <h4>Planes de Suscripción Mensual, Validación de Licencia y Actualizaciones</h4>
                </div>
                <p className="text-slate-300 text-xs leading-relaxed pl-8">
                  Para las modalidades con soporte, actualizaciones automáticas vía GitHub y mantenimiento mensual (<strong>$15 USD/mes Edición Bodega</strong>, <strong>$25 USD/mes Edición Fiscal SENIAT</strong>, y <strong>$35 USD/mes Ambas Ediciones</strong>), se establece una fecha de corte mensual validada a través de Google Firebase Firestore. En caso de vencimiento o mora, el sistema otorga un período de gracia de cortesía (3 a 5 días offline). Transcurrido dicho plazo sin renovación, el sistema podrá restringir temporalmente las funciones de facturación hasta regularizar la suscripción, manteniendo siempre intactos y accesibles los datos del comercio.
                </p>
              </div>

              {/* Cláusula 6 */}
              <div className="bg-[#161822] border border-slate-800 rounded-2xl p-4 space-y-2">
                <div className="flex items-center gap-2 font-bold text-white text-sm">
                  <span className="w-6 h-6 rounded-full bg-slate-600 text-slate-300 flex items-center justify-center text-xs font-mono font-bold">6</span>
                  <h4>Propiedad Intelectual, Seguridad Criptográfica y Restricciones</h4>
                </div>
                <p className="text-slate-300 text-xs leading-relaxed pl-8">
                  El código fuente, diseño, arquitectura de base de datos, algoritmos y validadores criptográficos <strong>SHA-256</strong> de <strong>FaradayPOS</strong> son propiedad intelectual reservada. La licencia adquirida no faculta al usuario para revender, sublicenciar, alterar los mecanismos de control de licencia ni descompilar el software para su distribución comercial a terceros.
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
                  <h3 className="font-bold text-white text-sm">Compromiso de Privacidad y Soberanía de Datos Comerciales</h3>
                  <p className="text-slate-300 text-[11px] leading-relaxed">
                    Sus datos de ventas, catálogo, márgenes, costos PMP, cierres de caja y clientes le pertenecen al 100% a su negocio y permanecen en su computador local. Jamás comercializamos ni extraemos su información contable o de inventario.
                  </p>
                </div>
              </div>

              {/* Sección 1 */}
              <div className="bg-[#161822] border border-slate-800 rounded-2xl p-4 space-y-2">
                <div className="flex items-center gap-2 font-bold text-white text-sm">
                  <Database className="w-4 h-4 text-emerald-400" />
                  <h4>1. Almacenamiento Primario 100% Local y Respaldos en Disco</h4>
                </div>
                <p className="text-slate-300 text-xs leading-relaxed">
                  Toda la información operativa de su negocio (catálogo de productos, precios en USD/Bs, stock, ventas diarias, libro de ventas, clientes y libreta de fiados) se almacena directamente en su máquina local. Además, el servidor local genera copias de seguridad automáticas en la carpeta <code>backups/</code> de su disco duro y archiva digitalmente cada comprobante o factura emitida en la carpeta <code>facturas_emitidas/</code>.
                </p>
              </div>

              {/* Sección 2 */}
              <div className="bg-[#161822] border border-slate-800 rounded-2xl p-4 space-y-2">
                <div className="flex items-center gap-2 font-bold text-white text-sm">
                  <Shield className="w-4 h-4 text-blue-400" />
                  <h4>2. Sincronización de Licencias en la Nube (Google Firebase Firestore)</h4>
                </div>
                <p className="text-slate-300 text-xs leading-relaxed">
                  Con el único propósito de gestionar el estado de activación de su licencia, fecha de corte y control de versiones, el sistema se comunica de forma cifrada (HTTPS/TLS) con <strong>Google Firebase Firestore</strong> sincronizando exclusivamente los siguientes metadatos administrativos:
                </p>
                <ul className="list-disc list-inside space-y-1 text-slate-400 pl-2">
                  <li>Identificador de licencia (<code>cliente_id</code>), nombre del establecimiento y RIF/Cédula.</li>
                  <li>Edición contratada (Bodega, Fiscal o Ambas), cuota mensual y fecha de vencimiento.</li>
                  <li>Versión técnica instalada del software (<code>v{APP_VERSION}</code>) y marca de última conexión.</li>
                  <li className="text-emerald-300 font-semibold">
                    Garantía de Confidencialidad: Su catálogo de productos, precios, costos PMP, ventas y clientes NUNCA se envían a Firebase Firestore.
                  </li>
                </ul>
              </div>

              {/* Sección 3 */}
              <div className="bg-[#161822] border border-slate-800 rounded-2xl p-4 space-y-2">
                <div className="flex items-center gap-2 font-bold text-white text-sm">
                  <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                  <h4>3. Exportación a Google Sheets, Excel y Actualizaciones vía GitHub</h4>
                </div>
                <p className="text-slate-300 text-xs leading-relaxed">
                  Cuando usted utiliza las herramientas de exportación contable o actualización del sistema:
                </p>
                <ul className="list-disc list-inside space-y-1 text-slate-400 pl-2">
                  <li>La sincronización opcional con Google Sheets / CSV se ejecuta bajo orden directa del administrador mediante conexiones seguras HTTPS.</li>
                  <li>El módulo de actualizaciones consulta el repositorio oficial en GitHub únicamente para descargar nuevas versiones del código fuente, respetando y manteniendo intacta su base de datos local.</li>
                </ul>
              </div>

              {/* Sección 4 */}
              <div className="bg-[#161822] border border-slate-800 rounded-2xl p-4 space-y-2">
                <div className="flex items-center gap-2 font-bold text-white text-sm">
                  <Cpu className="w-4 h-4 text-purple-400" />
                  <h4>4. Tratamiento Efímero de Facturas por Inteligencia Artificial (Gemini OCR)</h4>
                </div>
                <p className="text-slate-300 text-xs leading-relaxed">
                  El módulo de digitalización de facturas de proveedores utiliza la API de Google Gemini para extraer renglones mediante visión artificial. Las imágenes de las facturas no se almacenan en servidores públicos ni se utilizan para entrenar modelos compartidos. Una vez procesados los renglones para alimentar su inventario local, la imagen temporal se descarta.
                </p>
              </div>

              {/* Sección 5 */}
              <div className="bg-[#161822] border border-slate-800 rounded-2xl p-4 space-y-2">
                <div className="flex items-center gap-2 font-bold text-white text-sm">
                  <ShieldCheck className="w-4 h-4 text-indigo-400" />
                  <h4>5. Privacidad Interna en Mostrador (RBAC) y Seguridad SHA-256</h4>
                </div>
                <p className="text-slate-300 text-xs leading-relaxed">
                  El sistema incorpora control de acceso por roles y validación criptográfica <strong>SHA-256 con Salt</strong> para las claves de activación de edición. Los operadores con rol de "CAJERO" tienen oculta la visualización del Costo Promedio Ponderado (PMP), valuaciones de inventario a costo y márgenes de ganancia neta, protegiendo la confidencialidad financiera del propietario frente a terceros en el mostrador.
                </p>
              </div>

              {/* Sección 6 */}
              <div className="bg-[#161822] border border-slate-800 rounded-2xl p-4 space-y-2">
                <div className="flex items-center gap-2 font-bold text-white text-sm">
                  <Download className="w-4 h-4 text-amber-400" />
                  <h4>6. Portabilidad Total y Cero "Secuestro de Datos" (No Vendor Lock-in)</h4>
                </div>
                <p className="text-slate-300 text-xs leading-relaxed">
                  Usted tiene derecho en cualquier momento a descargar una copia completa de su base de datos en formato JSON o exportar sus libros en CSV/Excel. Asimismo, cuenta con la función de "Restablecimiento de Fábrica" con respaldo automático previo para eliminar sus datos locales si decide migrar de equipo.
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
                  <h3 className="font-bold text-white text-sm">Guía de Cumplimiento Tributario y Cambiario (Actualizado 2026)</h3>
                  <p className="text-slate-300 text-[11px] leading-relaxed">
                    Directrices de auditoría fiscal venezolana: Providencia SNAT/2011/00071, Facturación Digital SNAT/2024/000102, Derogatoria de Homologación SNAT/2026/00084, Ley IGTF (3%), Art. 177 LISLR y Tasa Oficial BCV.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-[#161822] border border-slate-800 rounded-2xl p-4 space-y-2">
                  <div className="flex items-center gap-2 font-bold text-emerald-400 text-sm">
                    <CheckCircle2 className="w-4 h-4" />
                    <h4>Providencia SNAT/2011/00071</h4>
                  </div>
                  <p className="text-slate-400 text-xs leading-relaxed">
                    Emisión de comprobantes con todos los requisitos del Art. 13: RIF/Cédula del adquirente, datos del emisor, número de factura y control, fecha/hora, alícuotas 16% y exentos, y desglose en Bolívares y divisas.
                  </p>
                </div>

                <div className="bg-[#161822] border border-emerald-700/40 rounded-2xl p-4 space-y-2">
                  <div className="flex items-center gap-2 font-bold text-emerald-300 text-sm">
                    <CheckCircle2 className="w-4 h-4" />
                    <h4>Facturación Digital SNAT/2024/000102</h4>
                  </div>
                  <p className="text-slate-400 text-xs leading-relaxed">
                    Gaceta Oficial N° 43.032 (19/12/2024): Regula la emisión digital de facturas a través de una <strong>Imprenta Digital Autorizada</strong> (ej. The Factory HKA, Unidigital, Serdimpre) para negocios online o con canales electrónicos.
                  </p>
                </div>

                <div className="bg-[#161822] border border-blue-700/40 rounded-2xl p-4 space-y-2 md:col-span-2">
                  <div className="flex items-center gap-2 font-bold text-blue-400 text-sm">
                    <ShieldCheck className="w-4 h-4" />
                    <h4>Providencia SNAT/2026/00084 (Derogatoria de la SNAT/2024/000121)</h4>
                  </div>
                  <p className="text-slate-300 text-xs leading-relaxed">
                    Publicada en <strong>Gaceta Oficial N° 43.435 del 12 de agosto de 2026</strong>, esta providencia <strong>derogó expresamente la Providencia SNAT/2024/000121</strong>. Gracias a ello, los desarrolladores y proveedores de software administrativo/POS ya no están obligados a tramitar el registro u homologación previa del software ante el SENIAT que exigía la norma derogada, manteniéndose plenamente vigentes las Providencias <strong>00071</strong> y <strong>000102</strong>.
                  </p>
                </div>

                <div className="bg-[#161822] border border-slate-800 rounded-2xl p-4 space-y-2">
                  <div className="flex items-center gap-2 font-bold text-amber-400 text-sm">
                    <CheckCircle2 className="w-4 h-4" />
                    <h4>Alícuota IGTF 3% y LISLR Art. 177</h4>
                  </div>
                  <p className="text-slate-400 text-xs leading-relaxed">
                    Cálculo automático del 3% de IGTF en pagos en divisas/criptoactivos (incluyendo Pagos Mixtos) y libro Kardex por Costo Promedio Ponderado (PMP) inmutable conforme al Art. 177 del Reglamento de la LISLR.
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
                    Certificado de Aceptación Legal y Cumplimiento — FaradayPOS
                  </h3>
                  <p className="text-xs text-slate-400 max-w-lg mx-auto">
                    Constancia digital vinculante entre el prestador del servicio tecnológico y el establecimiento comercial titular de la licencia.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-xl mx-auto text-left bg-[#0e1017] p-4 rounded-xl border border-slate-800 text-xs font-mono">
                  <div>
                    <span className="text-slate-500 text-[10px] block uppercase">Establecimiento / Comercio:</span>
                    <span className="text-white font-bold">{license?.nombre_negocio || "Pendiente de registro"}</span>
                  </div>

                  <div>
                    <span className="text-slate-500 text-[10px] block uppercase">RIF / Cédula:</span>
                    <span className="text-amber-400 font-bold">{license?.rif_cedula || "Pendiente de registro"}</span>
                  </div>

                  <div>
                    <span className="text-slate-500 text-[10px] block uppercase">Edición de Software:</span>
                    <span className="text-blue-400 font-bold uppercase">
                      {license?.edicion_contratada === "ambas"
                        ? "Ambas Ediciones (Bodega + Fiscal)"
                        : license?.edicion_contratada === "fiscal"
                        ? "Edición Fiscal SENIAT"
                        : "Edición Bodega"}
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-500 text-[10px] block uppercase">Versión del Marco Legal:</span>
                    <span className="text-emerald-400 font-bold">FaradayPOS v{APP_VERSION} (2026)</span>
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
            <strong className="text-slate-300 font-semibold">SNAT/2011/00071</strong> •{" "}
            <strong className="text-emerald-400 font-semibold">SNAT/2024/000102</strong> •{" "}
            <strong className="text-blue-400 font-semibold">SNAT/2026/00084</strong> •{" "}
            <strong className="text-slate-300 font-semibold">LISLR Art. 177</strong> •{" "}
            <strong className="text-slate-300 font-semibold">BCV Oficial</strong>
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
