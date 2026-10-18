@echo off
TITLE Configurar Inicio Automatico con Windows
COLOR 0B
chcp 65001 >nul

echo =====================================================================
echo    CONFIGURAR INICIO AUTOMÁTICO DEL SISTEMA POS CON WINDOWS
echo =====================================================================
echo.
echo Este script configurará el sistema para que el servidor Node.js
echo arranque en segundo plano cada vez que el equipo se encienda.
echo.

set SCRIPT_DIR=%~dp0
set VBS_TARGET=%SCRIPT_DIR%INICIAR_EN_SEGUNDO_PLANO.vbs
set STARTUP_DIR=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup

if not exist "%VBS_TARGET%" (
    echo [ERROR] No se encontro el archivo INICIAR_EN_SEGUNDO_PLANO.vbs
    pause
    exit /b 1
)

echo Creando acceso directo en la carpeta de Inicio de Windows...
powershell -Command "$ws = New-Object -ComObject WScript.Shell; $s = $ws.CreateShortcut('%STARTUP_DIR%\SistemaPOS_AutoStart.lnk'); $s.TargetPath = '%VBS_TARGET%'; $s.WorkingDirectory = '%SCRIPT_DIR%'; $s.IconLocation = '%SCRIPT_DIR%public\app_icon.jpg'; $s.Save()"

if %ERRORLEVEL% EQU 0 (
    echo.
    echo =====================================================================
    echo   [EXITO] Inicio automatico configurado correctamente.
    echo.
    echo   A partir de ahora, cuando el cliente encienda la computadora:
    echo   1. El servidor se iniciara solo en segundo plano (sin consola).
    echo   2. El cliente solo tendra que hacer doble clic en el icono
    echo      del programa en su Escritorio y abrira de inmediato.
    echo =====================================================================
) else (
    echo [AVISO] No se pudo crear el acceso directo automatico.
)

echo.
pause
