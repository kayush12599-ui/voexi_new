@echo off
title VOEXI MASTER ALL-SERVER LAUNCHER (3D AVATAR + MEDIA SERVER 2 + ADMIN PORTAL + ULTRA-FAST EXPO WEB)
color 0A

echo ====================================================================
echo 🚀 LAUNCHING ALL VOEXI SERVERS & INSTANT APP WEB BUILD...
echo ====================================================================

echo 1. Starting 3D Avatar & Asset Storage Server (Port 8085)...
start "VOEXI 3D AVATAR SERVER (PORT 8085)" cmd /k "cd /d C:\vibroxe_new && node scripts/avatar_server.js"

echo 2. Starting Local Media Storage Server 2 (Port 8080)...
start "VOEXI MEDIA STORAGE SERVER 2 (PORT 8080)" cmd /k "cd /d C:\vibroxe_new && node scripts/pendrive_server.js"

echo 3. Starting Next.js Web Admin Portal (Port 3000)...
start "VOEXI NEXT.JS ADMIN PORTAL (PORT 3000)" cmd /k "cd /d C:\Users\hp\OneDrive\Desktop\admin && npm run dev"

echo 4. Starting Compiled VOEXI Web App Server (Port 8081 - Instant Load)...
start "VOEXI APP WEB SERVER (PORT 8081)" cmd /k "cd /d C:\vibroxe_new && npx serve dist -s -p 8081"

echo ====================================================================
echo ✅ ALL 4 VOEXI SERVERS ARE ONLINE AND RUNNING!
echo - 3D Avatar Server:      http://192.168.31.39:8085
echo - Media Server 2:        http://192.168.31.39:8080
echo - Next.js Admin Portal:  http://localhost:3000
echo - VOEXI App Web UI:      http://localhost:8081
echo ====================================================================
pause
