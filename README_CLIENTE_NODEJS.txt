=====================================================================
SISTEMA POS & CONTROL DE INVENTARIO VENEZUELA (NODE.JS + REACT + EXPRESS)
Normativa Legal: Providencia SNAT/00071, LISLR Art. 177 (PMP), IGTF 3%
=====================================================================

¡Bienvenido! Este programa es una solución llave en mano para puntos de venta,
abastos, supermercados, bodegas, farmacias y comercios en Venezuela.

---------------------------------------------------------------------
1. REQUISITOS PREVIOS DEL SISTEMA
---------------------------------------------------------------------
- Una computadora con Windows 10/11, Linux o macOS.
- Node.js instalado (Versión 18, 20 o superior).
  Si no lo tiene instalado, descárguelo gratis desde: https://nodejs.org/
  (Recomendado: Descargar la versión "LTS").
- Navegador moderno (Google Chrome, Microsoft Edge, Mozilla Firefox o Brave).

---------------------------------------------------------------------
2. INSTALACIÓN EN 1 CLIC (WINDOWS)
---------------------------------------------------------------------
1. Haga doble clic en el archivo:
   INSTALAR_CLIENTE_NODEJS.bat

2. El instalador descargará automáticamente todas las librerías necesarias.
   Al finalizar, verá el mensaje: "¡INSTALACIÓN COMPLETADA CON ÉXITO!".

---------------------------------------------------------------------
3. INICIO DIARIO DEL PROGRAMA
---------------------------------------------------------------------
Opción A (Recomendada):
   - Haga doble clic en: INICIAR_SISTEMA_NODEJS.bat
   - Se abrirá automáticamente su navegador en: http://localhost:3000

Opción B (Desde la terminal o consola de comandos):
   - Abra una ventana de CMD o PowerShell en esta carpeta.
   - Ejecute:
     npm run dev
   - Abra su navegador en: http://localhost:3000

---------------------------------------------------------------------
4. CONEXIÓN EN RED LOCAL (MULTICAJA / TABLETS / TELÉFONOS EN LA TIENDA)
---------------------------------------------------------------------
Usted puede usar este sistema con varias computadoras o tablets conectadas
al mismo router WiFi de su negocio:

1. En la computadora donde corre Node.js (Servidor / Caja Principal):
   - Abra una terminal y escriba: ipconfig (en Windows) o ifconfig (en Linux/Mac).
   - Busque su "Dirección IPv4" (por ejemplo: 192.168.1.50).

2. En cualquier teléfono, tablet o laptop de la tienda conectada al mismo WiFi:
   - Abra el navegador y escriba:
     http://192.168.1.50:3000   (reemplace con la IP de su PC principal).
   - ¡Listo! Podrá facturar y consultar inventario en tiempo real desde
     múltiples puntos a la vez.

---------------------------------------------------------------------
5. ACCESO DIRECTO DE ESCRITORIO O APP DE ESCRITORIO
---------------------------------------------------------------------
Para abrir el sistema con un solo clic como si fuera una aplicación nativa:
- En Google Chrome o Microsoft Edge, ingrese a: http://localhost:3000
- Haga clic en el menú (tres puntos ⋮ en la esquina superior derecha).
- Seleccione: "Transmitir, guardar y compartir" -> "Instalar página como aplicación"
  o "Aplicaciones" -> "Instalar Sistema POS".
- Se creará un ícono en su escritorio y barra de tareas de Windows.

---------------------------------------------------------------------
6. RESPALDOS Y SEGURIDAD DE SUS DATOS
---------------------------------------------------------------------
- Dentro del sistema, en la barra superior tiene el botón "Respaldos".
- Puede descargar en cualquier momento una copia de seguridad completa (.JSON)
  para guardar en un pendrive o enviar a su correo electrónico.
- Todo funciona 100% de manera local y offline, protegiendo su negocio
  contra caídas de internet.
=====================================================================
