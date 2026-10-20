@echo off
title VOEXI Full Feature Web Server (Port 8081)
color 0A

echo ========================================================
echo       🚀 VOEXI FULL FEATURE WEB ENGINE (PORT 8081)
echo ========================================================
echo.
echo [1/2] Launching Full Feature VOEXI Web Engine...
echo [2/2] Opening Chrome Browser...
echo.

start "" "http://localhost:8081"
call npx expo start --web -c

pause
