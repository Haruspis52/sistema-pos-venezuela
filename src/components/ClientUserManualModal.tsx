import React, { useState } from "react";
import {
  BookOpen,
  ShoppingBag,
  Store,
  DollarSign,
  Printer,
  Smartphone,
  HardDrive,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  X,
  FileText,
  CreditCard,
  Barcode,
  Terminal,
  Download,
  HelpCircle,
} from "lucide-react";
import { getStoredNegocioConfig } from "../mockDb";

interface ClientUserManualModalProps {
  isOpen: boolean;
  onClose: () => void;
  bcvRate: number;
}

export const ClientUserManualModal: React.FC<ClientUserManualModalProps> = ({
  isOpen,
  onClose,
  bcvRate,
}) => {
  const [activeTopic, setActiveTopic] = useState<
    "caja" | "divisas" | "smartpos" | "inventario" | "cierre" | "backup" | "windows"
  >("caja");

  const negocio = getStoredNegocioConfig();

  if (!isOpen) return null;

  const handlePrintManual = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-[#12141a] border border-slate-700/80 rounded-2xl w-full max-w-5xl shadow-2xl text-slate-100 overflow-hidden my-auto flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-900/60 via-slate-800 to-indigo-900/40 p-4 border-b border-slate-700/70 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600/30 border border-blue-500/40 flex items-center justify-center text-blue-300 shrink-0">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                Manual de Operaciones y Guía de Usuario para Clientes
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-950 border border-emerald-500/40 text-emerald-300">
                  Edición Venezuela
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Instrucciones claras para cajeros, encargados y propietarios de {negocio.nombreComercial}.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handlePrintManual}
              className="px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-200 flex items-center gap-1.5 transition-all"
              title="Imprimir guía para tenerla en la caja registradora"
            >
              <Printer className="w-4 h-4 text-blue-400" />
              <span>Imprimir Guía</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="bg-[#0e1017] px-4 py-2 border-b border-slate-800 flex items-center gap-2 overflow-x-auto text-xs font-semibold shrink-0">
          <button
            onClick={() => setActiveTopic("caja")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all shrink-0 ${
              activeTopic === "caja"
                ? "bg-blue-600 text-white shadow"
                : "text-slate-400 hover:text-white hover:bg-slate-800"
            }`}
          >
            <ShoppingBag className="w-3.5 h-3.5" />
            <span>1. Cobro en Mostrador</span>
          </button>

          <button
            onClick={() => setActiveTopic("divisas")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all shrink-0 ${
              activeTopic === "divisas"
                ? "bg-blue-600 text-white shadow"
                : "text-slate-400 hover:text-white hover:bg-slate-800"
            }`}
          >
            <DollarSign className="w-3.5 h-3.5" />
            <span>2. Divisas & Tasa BCV</span>
          </button>

          <button
            onClick={() => setActiveTopic("smartpos")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all shrink-0 ${
              activeTopic === "smartpos"
                ? "bg-blue-600 text-white shadow"
                : "text-slate-400 hover:text-white hover:bg-slate-800"
            }`}
          >
            <CreditCard className="w-3.5 h-3.5" />
            <span>3. SmartPOS & Tarjetas</span>
          </button>

          <button
            onClick={() => setActiveTopic("inventario")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all shrink-0 ${
              activeTopic === "inventario"
                ? "bg-blue-600 text-white shadow"
                : "text-slate-400 hover:text-white hover:bg-slate-800"
            }`}
          >
            <Barcode className="w-3.5 h-3.5" />
            <span>4. Inventario & IA</span>
          </button>

          <button
            onClick={() => setActiveTopic("cierre")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all shrink-0 ${
              activeTopic === "cierre"
                ? "bg-blue-600 text-white shadow"
                : "text-slate-400 hover:text-white hover:bg-slate-800"
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>5. Arqueo y Cierre Z</span>
          </button>

          <button
            onClick={() => setActiveTopic("backup")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all shrink-0 ${
              activeTopic === "backup"
                ? "bg-blue-600 text-white shadow"
                : "text-slate-400 hover:text-white hover:bg-slate-800"
            }`}
          >
            <HardDrive className="w-3.5 h-3.5" />
            <span>6. Respaldo en Pendrive</span>
          </button>

          <button
            onClick={() => setActiveTopic("windows")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all shrink-0 ${
              activeTopic === "windows"
                ? "bg-blue-600 text-white shadow"
                : "text-slate-400 hover:text-white hover:bg-slate-800"
            }`}
          >
            <Terminal className="w-3.5 h-3.5" />
            <span>7. Despliegue Node.js</span>
          </button>
        </div>

        {/* Topic Body */}
        <div className="p-6 overflow-y-auto flex-1 min-h-0 space-y-6 text-xs text-slate-300 leading-relaxed print:text-black">
          {/* TOPIC 1: COBRO EN MOSTRADOR */}
          {activeTopic === "caja" && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-white font-bold text-sm border-b border-slate-700 pb-2">
                <ShoppingBag className="w-4 h-4 text-blue-400" />
                <span>Paso a Paso para Cobrar una Venta en Mostrador</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-[#181b24] p-4 rounded-xl border border-slate-800 space-y-2">
                  <div className="font-bold text-white flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-blue-600 text-white text-[10px] flex items-center justify-center font-bold">1</span>
                    Agregar Productos al Carrito
                  </div>
                  <ul className="list-disc pl-5 space-y-1 text-slate-300">
                    <li><strong>Con Pistola Láser:</strong> Pasa el lector por el código de barras del producto; se agregará de inmediato.</li>
                    <li><strong>Por Nombre o Teclado:</strong> Escribe en el buscador (ej. <em>Harina</em>, <em>Queso</em>, <em>Refresco</em>) y haz clic o presiona Enter.</li>
                    <li><strong>Botones Rápidos:</strong> Usa los botones de acceso directo de productos populares.</li>
                    <li><strong>Cantidades:</strong> Presiona los botones <span className="text-white font-bold">[+]</span> o <span className="text-white font-bold">[-]</span> en el carrito.</li>
                  </ul>
                </div>

                <div className="bg-[#181b24] p-4 rounded-xl border border-slate-800 space-y-2">
                  <div className="font-bold text-white flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-blue-600 text-white text-[10px] flex items-center justify-center font-bold">2</span>
                    Seleccionar Método de Pago
                  </div>
                  <ul className="list-disc pl-5 space-y-1 text-slate-300">
                    <li><strong>Efectivo Dólares ($):</strong> Ingresa el billete recibido (ej. $10 o $20). El sistema calcula el vuelto exacto en Bolívares o Dólares.</li>
                    <li><strong>Efectivo Bolívares (Bs.):</strong> Muestra el monto exacto al cambio oficial del día.</li>
                    <li><strong>Pago Móvil:</strong> Pide al cliente los últimos 4 dígitos de la referencia para guardarlo en la conciliación.</li>
                    <li><strong>Punto de Venta / SmartPOS:</strong> Envía el cobro al datáfono automáticamente o digita el comprobante.</li>
                    <li><strong>Libreta de Fiado:</strong> Carga la cuenta al cliente con límite autorizado.</li>
                  </ul>
                </div>
              </div>

              <div className="bg-emerald-950/30 border border-emerald-500/40 p-3.5 rounded-xl flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                <div className="text-xs text-slate-200">
                  <strong>Impresión del Ticket Térmico:</strong> Al presionar <em>«Procesar Venta»</em>, se descuenta el inventario al instante y se abre la vista de impresión lista para tu impresora térmica USB de 58mm o 80mm con el RIF y nombre de <strong>{negocio.nombreComercial}</strong>.
                </div>
              </div>
            </div>
          )}

          {/* TOPIC 2: DIVISAS Y TASA BCV */}
          {activeTopic === "divisas" && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-white font-bold text-sm border-b border-slate-700 pb-2">
                <DollarSign className="w-4 h-4 text-amber-400" />
                <span>Manejo de Moneda Dual y Sincronización del Banco Central (BCV)</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-[#181b24] p-4 rounded-xl border border-slate-800 space-y-2">
                  <div className="font-bold text-white">Sincronización Automática Diaria</div>
                  <p>
                    Cuando la computadora tiene conexión a internet, el sistema consulta diariamente la cotización oficial publicada por el <strong>Banco Central de Venezuela (bcv.org.ve)</strong> a través del servicio DolarApi.
                  </p>
                  <p className="text-slate-400">
                    Todos los precios en el mostrador se recalculan en tiempo real sin tener que cambiar etiqueta por etiqueta.
                  </p>
                </div>

                <div className="bg-[#181b24] p-4 rounded-xl border border-slate-800 space-y-2">
                  <div className="font-bold text-white">Ajuste Manual si no hay Internet o por Fecha Valor</div>
                  <p>
                    Si la tienda se queda sin internet o el BCV publica la tasa de la tarde para el día siguiente:
                  </p>
                  <ol className="list-decimal pl-5 space-y-1 text-slate-300">
                    <li>Haz clic en el lápiz <span className="text-amber-400 font-bold">✎</span> junto al indicador de Tasa BCV en la barra superior.</li>
                    <li>Escribe el nuevo valor en bolívares (ej. 36.80).</li>
                    <li>Presiona <span className="text-emerald-400 font-bold">[✓]</span> o Enter. ¡Listo! Todo el inventario queda ajustado al instante.</li>
                  </ol>
                </div>
              </div>

              <div className="bg-amber-950/30 border border-amber-500/40 p-3.5 rounded-xl flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                <div className="text-xs text-slate-200">
                  <strong>Cumplimiento Legal Venezolano:</strong> Los precios de base en el sistema se fijan en USD para proteger el valor de reposición de la mercancía, y el sistema muestra siempre de manera simultánea el precio en Bolívares a la tasa activa del BCV como lo exige la normativa nacional.
                </div>
              </div>
            </div>
          )}

          {/* TOPIC 3: SMARTPOS Y TARJETAS */}
          {activeTopic === "smartpos" && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-white font-bold text-sm border-b border-slate-700 pb-2">
                <CreditCard className="w-4 h-4 text-blue-400" />
                <span>Integración con Puntos de Venta Bancarios (SmartPOS)</span>
              </div>

              <p>
                El sistema soporta conexión directa por red Wi-Fi o cable Ethernet con terminales bancarios SmartPOS Android bajo el protocolo de enlace ECR:
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="bg-[#181b24] p-3 rounded-xl border border-slate-800 text-center">
                  <div className="font-bold text-white text-xs mb-1">Terminales WizarPOS</div>
                  <div className="text-[10px] text-slate-400">Modelos Q2, Q3 Mini (Bancamiga, Banesco, Provincial)</div>
                </div>
                <div className="bg-[#181b24] p-3 rounded-xl border border-slate-800 text-center">
                  <div className="font-bold text-white text-xs mb-1">Terminales PAX</div>
                  <div className="text-[10px] text-slate-400">Modelos A920, A930, A80 (Credicard, Banesco, Mercantil)</div>
                </div>
                <div className="bg-[#181b24] p-3 rounded-xl border border-slate-800 text-center">
                  <div className="font-bold text-white text-xs mb-1">Modo Híbrido Manual</div>
                  <div className="text-[10px] text-slate-400">Cualquier punto tradicional ingresando la referencia bancaria</div>
                </div>
              </div>

              <div className="bg-[#181b24] p-4 rounded-xl border border-slate-800 space-y-2">
                <div className="font-bold text-white">¿Cómo configurar el Punto de Venta en la tienda?</div>
                <ol className="list-decimal pl-5 space-y-1.5 text-slate-300">
                  <li>Conecta la computadora del POS y el SmartPOS al mismo router Wi-Fi del negocio.</li>
                  <li>En el sistema, presiona el botón <strong>«Configurar Datáfono»</strong>.</li>
                  <li>Coloca la dirección IP del datáfono (ej. <em>192.168.1.45</em>) y selecciona el banco o switch (MegaSoft, Credicard o Bancamiga).</li>
                  <li>¡Listo! Al cobrar con tarjeta, el sistema enviará el monto en Bolívares automáticamente a la pantalla del datáfono del cliente.</li>
                </ol>
              </div>
            </div>
          )}

          {/* TOPIC 4: INVENTARIO E IA */}
          {activeTopic === "inventario" && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-white font-bold text-sm border-b border-slate-700 pb-2">
                <Barcode className="w-4 h-4 text-emerald-400" />
                <span>Control de Inventario y Carga Inteligente de Facturas con IA</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-[#181b24] p-4 rounded-xl border border-slate-800 space-y-2">
                  <div className="font-bold text-white">Registro Manual de Productos</div>
                  <p>
                    En la pestaña <em>«Catálogo de Productos»</em> presiona <strong>«+ Nuevo Producto»</strong>. Ingresa el código de barras, nombre comercial, categoría, costo en USD y precio de venta.
                  </p>
                  <p className="text-slate-400">
                    El sistema calcula automáticamente el porcentaje de ganancia neta y alerta si las existencias bajan del stock mínimo.
                  </p>
                </div>

                <div className="bg-[#181b24] p-4 rounded-xl border border-slate-800 space-y-2">
                  <div className="font-bold text-white flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-amber-400" />
                    Lector de Facturas de Proveedores (IA Gemini)
                  </div>
                  <p>
                    Cuando llegue el camión distribuidor con la factura de compra impresa o en PDF:
                  </p>
                  <ol className="list-decimal pl-5 space-y-1 text-slate-300">
                    <li>Toma una foto con el teléfono o sube el PDF en la pestaña <em>«Facturas de Proveedor (IA)»</em>.</li>
                    <li>La IA extrae automáticamente los nombres, cantidades y costos unitarios.</li>
                    <li>Presiona <strong>«Ingresar al Kardex»</strong>: el stock se suma y el Costo Promedio Ponderado (PMP) según el Art. 177 de la LISLR se actualiza solo.</li>
                  </ol>
                </div>
              </div>
            </div>
          )}

          {/* TOPIC 5: CIERRE DE CAJA */}
          {activeTopic === "cierre" && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-white font-bold text-sm border-b border-slate-700 pb-2">
                <FileText className="w-4 h-4 text-blue-400" />
                <span>Arqueo de Caja y Cierre de Turno (Cierre Z)</span>
              </div>

              <p>
                Al finalizar el turno o antes de cerrar el local en la noche, el cajero debe realizar el arqueo para garantizar que no falte dinero:
              </p>

              <div className="bg-[#181b24] p-4 rounded-xl border border-slate-800 space-y-3">
                <div className="font-bold text-white">Procedimiento de Cierre:</div>
                <ol className="list-decimal pl-5 space-y-2 text-slate-300">
                  <li>
                    Entra a la pestaña <strong>«🏪 Mostrador»</strong> y presiona el botón <strong>«Cierre de Turno / Arqueo»</strong>.
                  </li>
                  <li>
                    Cuenta el dinero físico que hay en la gaveta y anota:
                    <ul className="list-disc pl-5 mt-1 text-slate-400 space-y-0.5">
                      <li>Total de billetes en dólares ($ en efectivo).</li>
                      <li>Total de bolívares en efectivo (Bs.).</li>
                      <li>Total cobrado en Pago Móvil según la app bancaria.</li>
                      <li>Total de lotes del Punto de Venta según el reporte del datáfono.</li>
                    </ul>
                  </li>
                  <li>
                    El sistema compara de inmediato lo contado contra las ventas registradas y emite el diagnóstico: <strong>CUADRADA</strong>, <strong>FALTANTE</strong> o <strong>SOBRANTE</strong>.
                  </li>
                  <li>
                    Presiona <strong>«Guardar e Imprimir Cierre Z»</strong> para archivar el comprobante firmado por el cajero.
                  </li>
                </ol>
              </div>
            </div>
          )}

          {/* TOPIC 6: COPIA DE SEGURIDAD EN PENDRIVE */}
          {activeTopic === "backup" && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-white font-bold text-sm border-b border-slate-700 pb-2">
                <HardDrive className="w-4 h-4 text-emerald-400" />
                <span>Copias de Seguridad Diarias en Pendrive / Memoria USB</span>
              </div>

              <div className="bg-emerald-950/30 border border-emerald-500/40 p-4 rounded-xl space-y-2">
                <div className="font-bold text-emerald-300 text-sm">
                  Protege la información de tu negocio contra apagones y fallas de disco
                </div>
                <p className="text-slate-300 text-xs">
                  Se recomienda hacer un respaldo todas las noches al cerrar el local en un Pendrive USB.
                </p>
              </div>

              <div className="bg-[#181b24] p-4 rounded-xl border border-slate-800 space-y-2">
                <div className="font-bold text-white">¿Cómo sacar la copia de seguridad en 10 segundos?</div>
                <ol className="list-decimal pl-5 space-y-2 text-slate-300">
                  <li>Conecta el pendrive a la computadora.</li>
                  <li>En la barra superior del sistema, haz clic en el botón <strong>«Respaldos»</strong> (ícono de disco duro).</li>
                  <li>Presiona <strong>«Exportar Copia Completa (.JSON)»</strong>.</li>
                  <li>Guarda el archivo en tu pendrive. Si la computadora sufre alguna falla, podrás restaurar todos tus productos, precios, fiados y ventas en cualquier otra máquina con 1 solo clic.</li>
                </ol>
              </div>
            </div>
          )}

          {/* TOPIC 7: INSTALACION Y DESPLIEGUE CON NODE.JS */}
          {activeTopic === "windows" && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-white font-bold text-sm border-b border-slate-700 pb-2">
                <Terminal className="w-4 h-4 text-blue-400" />
                <span>Instalación y Despliegue con Node.js (Servidor Local en Puerto 3000)</span>
              </div>

              <p>
                El sistema funciona sobre el motor <strong>Node.js</strong> con un backend rápido en Express y frontend en React, permitiendo funcionar de forma local, rápida y sin depender de internet:
              </p>

              <div className="bg-[#181b24] p-4 rounded-xl border border-slate-800 space-y-3">
                <div className="font-bold text-white">Pasos para instalar y poner en marcha con Node.js:</div>
                <ol className="list-decimal pl-5 space-y-2.5 text-slate-300">
                  <li>
                    <strong>Tener Node.js instalado:</strong> Descargue e instale la versión LTS de Node.js (v18, v20 o v22) desde <span className="font-mono text-cyan-300">https://nodejs.org</span> en Windows, Linux o Mac.
                  </li>
                  <li>
                    <strong>Descargar el Paquete:</strong> En la barra superior haga clic en <strong>«Paquete Node.js (.ZIP)»</strong> y descomprima los archivos en la computadora del negocio (ej. <span className="font-mono text-amber-300">C:\SistemaPOS</span>).
                  </li>
                  <li>
                    <strong>Instalación de Dependencias:</strong>
                    <ul className="list-disc pl-5 mt-1 text-slate-400 space-y-1">
                      <li>En Windows: Haga doble clic sobre <span className="font-mono font-bold text-emerald-400">INSTALAR_DEPENDENCIAS_NODE.bat</span>.</li>
                      <li>O desde la consola: <span className="font-mono text-white bg-slate-900 px-2 py-0.5 rounded">npm install && npm run build</span>.</li>
                    </ul>
                  </li>
                  <li>
                    <strong>Iniciar el Sistema en Caja:</strong>
                    <ul className="list-disc pl-5 mt-1 text-slate-400 space-y-1">
                      <li>Haga doble clic en <span className="font-mono font-bold text-blue-400">INICIAR_SISTEMA_NODE.bat</span>.</li>
                      <li>O ejecute en consola: <span className="font-mono text-white bg-slate-900 px-2 py-0.5 rounded">npm start</span> (o <span className="font-mono text-white bg-slate-900 px-2 py-0.5 rounded">npm run dev</span>).</li>
                    </ul>
                  </li>
                  <li>
                    <strong>Acceso en el Navegador:</strong> El sistema se abre automáticamente en <span className="font-mono text-emerald-400 font-bold">http://localhost:3000</span>.
                  </li>
                </ol>
              </div>

              <div className="bg-blue-950/30 border border-blue-500/40 p-3.5 rounded-xl flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
                <div className="text-xs text-slate-200">
                  <strong>Acceso en Red Local (Multi-caja):</strong> Otras computadoras, teléfonos o tablets conectadas a la misma red Wi-Fi o red cableada del comercio pueden conectarse simultáneamente entrando a <span className="font-mono text-amber-300">http://[IP-DEL-SERVIDOR]:3000</span> para facturar o consultar precios en mostrador.
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-[#0e1017] p-3.5 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400 shrink-0">
          <div>
            Manual adaptado a la legislación fiscal venezolana (SENIAT Prov. 00071 / BCV).
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-white"
          >
            Cerrar Manual
          </button>
        </div>
      </div>
    </div>
  );
};
