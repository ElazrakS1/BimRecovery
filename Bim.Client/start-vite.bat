@echo off
echo Starting Vite development server...
cd /d "C:\Users\Salah-Eddine\BimRecovery\Bim.Client"
echo Current directory: %CD%
echo.
echo Running WASM setup...
node src/scripts/copyWasm.js
echo.
echo Starting Vite...
node_modules\.bin\vite.cmd
pause
