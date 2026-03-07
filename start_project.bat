@echo off
echo ==========================================
echo S.O.S Editor Site - Launcher
echo ==========================================

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
echo Backend API: https://sos-editor-backend.onrender.com (Remote)
echo.
echo Default Admin Login:
echo User: admin
echo Pass: admin123
echo ==========================================
pause
