@echo off
title VOEXI Master Server Suite Launcher
echo ==========================================================
echo 🚀 STARTING ALL VOEXI BACKEND & MEDIA SERVERS
echo ==========================================================

echo [1/3] Starting VOEXI Media Server (Port 8080)...
start "VOEXI Media Server (8080)" cmd /k "node C:\vibroxe_new\scripts\pendrive_server.js"

echo [2/3] Starting VOEXI 3D Avatar Server (Port 8085)...
start "VOEXI 3D Avatar Server (8085)" cmd /k "node C:\vibroxe_new\scripts\avatar_server.js"

echo [3/3] Starting VOEXI AI Neural Server (Port 8000)...
start "VOEXI AI Neural Core (8000)" cmd /k "python C:\vibroxe_new\vnc_server.py"

echo ==========================================================
echo ✅ ALL SERVERS LAUNCHED SUCCESSFULLY!
echo ----------------------------------------------------------
echo 📂 Media Server:    http://192.168.31.39:8080
echo 💃 3D Avatar Server: http://192.168.31.39:8085
echo 🧠 AI Neural Core:   http://192.168.31.39:8000
echo ==========================================================
pause
