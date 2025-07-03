@echo off
cd /d "C:\Users\Salah-Eddine\BimRecovery\Bim.Client"
echo Starting BIM Recovery development server...
echo.
call node_modules\.bin\vite.cmd --host --port 5173
pause
