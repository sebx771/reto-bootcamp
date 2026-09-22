@echo off
title SmartOps SuperBrix - FO-A-MA-01
echo ====================================================
echo Iniciando SmartOps SuperBrix (Modo sin restricciones)
echo ====================================================

where node >nul 2>nul
if %errorlevel% equ 0 (
    echo Iniciando con Node.js nativo...
    start http://localhost:3000/smartops-frontend/index.html
    node server.js
    goto end
)

where python >nul 2>nul
if %errorlevel% equ 0 (
    echo Iniciando con Python nativo...
    start http://localhost:8000/smartops-frontend/index.html
    python -m http.server 8000
    goto end
)

echo Abriendo directamente en el navegador predeterminado...
start smartops-frontend\index.html

:end
