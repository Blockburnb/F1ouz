@echo off
setlocal enabledelayedexpansion

echo ============================
echo   Script Docker Automation
echo ============================
echo.

REM Vérifier installation Docker Desktop
set DOCKER_PATH="%ProgramFiles%\Docker\Docker\Docker Desktop.exe"

if not exist %DOCKER_PATH% (
    echo [ERREUR] Docker Desktop n'est pas installe !
    pause
    exit /b
)

REM Lancement Docker Desktop si pas démarré
tasklist /FI "IMAGENAME eq Docker Desktop.exe" | find /I "Docker Desktop.exe" >nul
if %ERRORLEVEL%==0 (
    echo Docker Desktop est deja lance.
) else (
    echo Lancement de Docker Desktop...
    start "" %DOCKER_PATH%
)

REM Attendre que Docker Engine soit prêt
:wait_docker
docker info >nul 2>&1
if errorlevel 1 (
    echo Docker n'est pas encore pret... attente 3 sec.
    timeout /t 3 >nul
    goto wait_docker
)

echo Docker est operationnel !

REM Lancer docker compose en mode detach
echo Lancement de docker compose en mode detach...
docker compose up --build -d

REM Ouvrir localhost dans le navigateur
echo Ouverture de http://localhost ...
start http://localhost

pause
