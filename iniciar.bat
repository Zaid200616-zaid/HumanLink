@echo off
cd /d "%~dp0"
echo.
echo  HumanLink - Aplicacion principal (Next.js)
echo  Abrira http://localhost:3000
echo  Contraseña demo: HumanLink2026!
echo.
if not exist node_modules (
  echo Instalando dependencias npm...
  call npm install
)
call npm run dev
