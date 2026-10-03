@echo off
chcp 65001 > nul
title Sistema POS - Bodega y Fiscal (Servidor Local)
color 0A
cls

echo ===============================================================================
echo                SISTEMA PUNTO DE VENTA POS - MODO LOCAL
echo                       Bodega & Edición Fiscal SENIAT
echo ===============================================================================
echo.

cd /d "%~dp0.."

:: Verificar Node.js
where node >nul 2>nul
if %errorlevel% neq 0 (
    color 0C
    echo [ERROR] Node.js no está instalado en este equipo.
    echo Por favor descárgalo e instálalo desde: https://nodejs.org (Versión LTS recomendada).
    echo.
    pause
    exit /b 1
)

echo [✓] Node.js detectado correctamente.
echo [✓] Iniciando servidor en el puerto 3000...
echo.
echo Presiona Ctrl + C en esta ventana si deseas apagar el servidor.
echo Minimizando esta ventana, el sistema seguirá operando.
echo.

:: Abrir navegador después de 3 segundos
start "" cmd /c "timeout /t 3 >nul && start http://localhost:3000"

:: Iniciar el servidor
npm run dev
