@echo off
cd /d "%~dp0"
echo Iniciando HumanLink (Next.js + Django demo BD)...
start "HumanLink Next.js" cmd /k "cd /d %~dp0 && iniciar.bat"
timeout /t 3 /nobreak >nul
start "HumanLink Django BD" cmd /k "cd /d %~dp0\backend && run.bat"
echo.
echo  Next.js (app completa):  http://localhost:3000
echo  Django (demo BD):        http://localhost:8000/database-demo/
echo.
