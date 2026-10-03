@echo off
TITLE Instalador del Sistema POS y Facturacion Venezuela (Node.js)
COLOR 0B
chcp 65001 >nul

echo =====================================================================
echo    INSTALADOR DEL SISTEMA POS Y FACTURACIÓN VENEZUELA (NODE.JS)
echo    Adaptado a: Providencia SNAT/00071, LISLR Art. 177, IGTF 3%%
echo =====================================================================
echo.

REM 1. Verificar si Node.js esta instalado en el sistema
echo [1/3] Verificando instalacion de Node.js...
node --version >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo =====================================================================
    echo [ERROR CRITICO] Node.js no se encuentra instalado en este equipo.
    echo.
    echo Para instalar Node.js:
    echo 1. Visite la pagina oficial: https://nodejs.org/
    echo 2. Descargue e instale la version "LTS" (Recomendada para la mayoria).
    echo 3. Durante la instalacion, asegurese de marcar "Add to PATH".
    echo 4. Una vez instalado, vuelva a ejecutar este archivo.
    echo =====================================================================
    echo.
    pause
    exit /b 1
)

for /f "tokens=*" %%i in ('node -v') do set NODE_VERSION=%%i
for /f "tokens=*" %%i in ('npm -v') do set NPM_VERSION=%%i
echo [OK] Node.js detectado: %NODE_VERSION% (npm: %NPM_VERSION%)
echo.

REM 2. Instalar dependencias del proyecto via npm
echo [2/3] Instalando librerias y dependencias del sistema...
echo       (Esto puede tardar 1 a 2 minutos dependiendo de su conexion)...
echo.
call npm install
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [ERROR] Ocurrio un fallo al instalar las dependencias con npm.
    echo Verifique su conexion a internet e intente nuevamente.
    pause
    exit /b 1
)
echo.
echo [OK] Dependencias instaladas correctamente.
echo.

REM 3. Preparar archivo de configuracion .env si no existe
echo [3/3] Configurando entorno del servidor...
if not exist .env (
    if exist .env.example (
        copy .env.example .env >nul
        echo [OK] Archivo de entorno .env generado desde la plantilla.
    ) else (
        echo PORT=3000 > .env
        echo [OK] Archivo .env creado.
    )
) else (
    echo [OK] Archivo .env ya existente.
)

echo.
echo =====================================================================
echo    ¡INSTALACIÓN COMPLETADA CON ÉXITO!
echo =====================================================================
echo.
echo Para iniciar el sistema POS:
echo   - Haga doble clic en el archivo: INICIAR_SISTEMA_NODEJS.bat
echo   - O ejecute en la consola: npm run dev
echo.
echo El sistema se abrira automaticamente en su navegador en:
echo   http://localhost:3000
echo.
pause
