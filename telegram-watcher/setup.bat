@echo off
chcp 65001 >nul
cd /d "%~dp0"
where py >nul 2>nul && (set "PY=py -3") || (set "PY=python")
echo [1/3] Creating virtual environment...
%PY% -m venv .venv || (echo Python 3.10+ is required: https://www.python.org/downloads/ & pause & exit /b 1)
echo [2/3] Installing packages...
.venv\Scripts\python -m pip install --upgrade pip
.venv\Scripts\python -m pip install -r requirements.txt || (pause & exit /b 1)
echo [3/3] Preparing .env
if not exist .env copy .env.example .env >nul
echo.
echo Done. Fill in .env (opening Notepad), then run run.bat
notepad .env
pause
