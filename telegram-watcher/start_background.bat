@echo off
rem Runs without a console window. Do the first login with run.bat before using this.
cd /d "%~dp0"
set PYTHONUTF8=1
if not exist sessions\user.session (echo Log in once with run.bat first. & pause & exit /b 1)
start "" .venv\Scripts\pythonw.exe main.py
