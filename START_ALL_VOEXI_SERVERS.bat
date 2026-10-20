@echo off
title Launching All VOEXI Servers...
color 0A

echo ========================================================
echo       🚀 LAUNCHING ALL VOEXI SERVERS AND STORAGE
echo ========================================================
echo.

echo [1/2] Launching Local Media Server 2 (Port 8080)...
start "VOEXI Media Storage Server" cmd /k "node scripts/pendrive_server.js"

echo.
echo [2/2] Launching VOEXI Web App Server...
start "VOEXI Web App Server" cmd /k "Double_Click_To_Open_VOEXI.bat"

echo.
echo ✅ All Servers Successfully Started!
echo 🌐 Web App:       http://localhost:8081
echo 💾 Media Storage: http://192.168.31.39:8080
echo.
pause
