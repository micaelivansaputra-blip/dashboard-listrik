@echo off
cd /d "%~dp0"
python refresh_dashboard.py %*
pause
