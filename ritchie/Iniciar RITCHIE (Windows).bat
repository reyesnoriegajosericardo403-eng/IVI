@echo off
REM Doble clic en este archivo para arrancar RITCHIE en Windows.
cd /d "%~dp0"

where python >nul 2>nul
if %errorlevel% neq 0 (
    echo No se encontro Python en esta computadora.
    echo Instalalo desde https://www.python.org/downloads/ y vuelve a intentar.
    echo IMPORTANTE: durante la instalacion, marca la casilla "Add Python to PATH".
    pause
    exit /b 1
)

python iniciar.py %*

echo.
pause
