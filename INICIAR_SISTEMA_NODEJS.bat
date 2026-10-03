@echo off
TITLE Sistema POS Venezuela - Servidor Node.js
COLOR 0A
chcp 65001 >nul

echo =====================================================================
echo    SISTEMA POS Y FACTURACIÓN FISCAL VENEZUELA (NODE.JS)
echo =====================================================================
echo.
echo Iniciando servidor en el puerto 3000...
echo.

REM Verificar node_modules
if not exist node_modules (
    echo [AVISO] Las librerias no estan instaladas. Ejecutando instalacion inicial...
    call npm install
)

REM Abrir navegador web predeterminado despues de 2 segundos en segundo plano
start "" cmd /c "timeout /t 2 /nobreak >nul & start http://localhost:3000"

echo [OK] Servidor activo. Para detenerlo, presione Ctrl + C o cierre esta ventana.
echo Abriendo aplicacion en http://localhost:3000 ...
echo.

npm run dev
