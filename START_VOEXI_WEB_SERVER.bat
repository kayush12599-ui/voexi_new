@echo off
title VOEXI Full Feature Web Server (Port 8081)
color 0A

echo ========================================================
echo       🚀 VOEXI FULL FEATURE WEB ENGINE (PORT 8081)
echo ========================================================
echo.
echo [1/2] Applying Web Shields & Patches...
call node scripts/patch-metro.js

echo.
echo [2/2] Launching Full Feature VOEXI Web Engine...
echo.
echo 🌐 Live Local URL:   http://localhost:8081
echo 🌐 Network URL:      http://192.168.31.39:8081
echo.
call npx expo start --web -c

pause
