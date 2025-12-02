@echo off
REM Lightweight zero-install server using PowerShell (gzip + caching)
echo Starting PowerShell static server on port 8000...
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0serve.ps1" -Port 8000

REM When serve.ps1 starts it will print the URL. If you prefer to open browser automatically,
REM run: start http://localhost:8000/tp9_dashboard/dashboard.html
