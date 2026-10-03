@echo off
chcp 65001 > nul
title Actualizador del Sistema POS - Brayan Developer
color 0B
cls

echo ===============================================================================
echo               ACTUALIZADOR OFICIAL DEL SISTEMA PUNTO DE VENTA POS
echo                         Sincronización con GitHub
echo ===============================================================================
echo.
echo Fecha: %date%  -  Hora: %time%
echo Directorio: %~dp0..
echo.

cd /d "%~dp0.."

echo [1/4] Verificando conexión a Internet y repositorio Git...
git status > nul 2>&1
if %errorlevel% neq 0 (
    color 0C
    echo [ERROR] Esta carpeta no parece tener un repositorio Git inicializado o Git no esta instalado.
    echo Asegúrate de tener Git para Windows instalado (https://git-scm.com).
    echo.
    pause
    exit /b 1
)

echo [✓] Repositorio Git detectado correctamente.
echo.

echo [2/4] Descargando las últimas actualizaciones y correcciones desde GitHub...
git pull origin main
if %errorlevel% neq 0 (
    echo [AVISO] 'git pull origin main' falló o el branch principal tiene otro nombre (master).
    echo Intentando 'git pull'...
    git pull
)

echo [✓] Archivos de código actualizados.
echo.

echo [3/4] Verificando dependencias de Node.js...
call npm install --omit=dev --no-audit --no-fund
echo [✓] Dependencias al día.
echo.

echo [4/4] Compilando la nueva versión del sistema...
call npm run build
if %errorlevel% neq 0 (
    color 0C
    echo [ERROR] La compilación falló. Revisa los logs anteriores.
    pause
    exit /b 1
)

echo.
echo ===============================================================================
echo                    ¡ACTUALIZACIÓN COMPLETADA CON ÉXITO!
echo             El sistema POS ya cuenta con las últimas mejoras.
echo ===============================================================================
echo.
echo Tus productos, ventas y deudas de clientes permanecen intactos.
echo Ya puedes iniciar el sistema con: scripts\iniciar_sistema.bat
echo.
pause
