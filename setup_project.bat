@echo off
echo ==========================================
echo S.O.S Editor Site - Setup
echo ==========================================

echo [1/3] Installing Backend dependencies...
cd backend
call npm install
if %errorlevel% neq 0 (
    echo Error installing backend dependencies!
    pause
    exit /b
)
cd ..

echo [2/3] Installing Frontend dependencies...
cd frontend
call npm install
if %errorlevel% neq 0 (
    echo Error installing frontend dependencies!
    pause
    exit /b
)
cd ..

echo [3/3] Installing Admin dependencies...
cd admin
call npm install
if %errorlevel% neq 0 (
    echo Error installing admin dependencies!
    pause
    exit /b
)
cd ..

echo ==========================================
echo Setup Completed Successfully!
echo You can now run 'start_project.bat'
echo ==========================================

