@echo off
title VOEXI 100KM REMOTE TUNNEL LAUNCHER
echo ==========================================================
echo 🚀 STARTING VOEXI 100KM REMOTE INTERNET TUNNEL
echo ==========================================================

taskkill /f /im node.exe >nul 2>&1
taskkill /f /im ngrok.exe >nul 2>&1

echo [1/2] Launching Expo Metro Server...
start "VOEXI Metro Server" cmd /k "cd /d C:\vibroxe_new && set NODE_OPTIONS=--dns-result-order=ipv4first && npx expo start --clear"

timeout /t 5 >nul

echo [2/2] Launching Global Internet Tunnel...
start "VOEXI Global Tunnel" cmd /k "cd /d C:\vibroxe_new && npx localtunnel --port 8081"

echo ==========================================================
echo ✅ REMOTE TUNNEL LAUNCHED!
echo Copy the https://xxxx.loca.lt URL from the Global Tunnel window.
echo Send it to your friend to open in Expo Go or Phone Browser!
echo ==========================================================
pause
