@echo off
echo ==========================================
echo S.O.S Editor Site - Launcher
echo ==========================================

echo Starting Local Backend (Port 5000)...
start "SOS Backend" cmd /k "cd backend && npm start"

echo Starting Public Tunnel (Port 5000)...
start "SOS Tunnel" cmd /k "npx localtunnel --port 5000 --subdomain soseditor-api-v5"

echo Starting Frontend Site (Port 3000)...
start "SOS Frontend" cmd /k "cd frontend && npm run dev"

echo Starting Admin Panel (Port 3001)...
start "SOS Admin" cmd /k "cd admin && npm run dev"

echo ==========================================
echo All services are starting...
echo.
echo Access the sites at:
echo Frontend (Public Site): http://localhost:3000
echo Admin Panel: http://localhost:3001
echo Backend API: https://soseditor-api-v5.loca.lt (Local Tunnel)
echo.
echo Default Admin Login:
echo User: tutupoker
echo Pass: Juliano1983*
echo ==========================================
pause
