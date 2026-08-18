@echo off
cd /d "%~dp0"
if not exist venv (
  echo Creando entorno virtual...
  py -3 -m venv venv 2>nul || python -m venv venv
)
call venv\Scripts\activate.bat
pip install -r requirements.txt -q
python manage.py runserver 0.0.0.0:8000
