@echo off
title VOEXI Local Media Server 2 (Port 8080)
color 0B

echo ========================================================
echo       💾 VOEXI LOCAL MEDIA SERVER (SERVER 2)
echo ========================================================
echo.
echo [1/2] Checking Storage Drives (D:\vibroxe_media_storage)...
echo [2/2] Launching Server 2 on Port 8080...
echo.

node scripts/pendrive_server.js

pause
