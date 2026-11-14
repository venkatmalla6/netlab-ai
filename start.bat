@echo off
title NETLAB AI - Launcher
echo ========================================================
echo        NETLAB AI - Network Automation Platform
echo ========================================================

where python >nul 2>nul
if %ERRORLEVEL% EQU 0 (
    set PY_CMD=python
) else (
    set PY_CMD=py -3
)

set DISABLE_SQLALCHEMY_CEXT=1

echo Starting Backend (FastAPI on http://127.0.0.1:8000)...
start "NETLAB AI Backend" cmd /k "cd /d %~dp0backend && set DISABLE_SQLALCHEMY_CEXT=1 && %PY_CMD% -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload"

echo Starting Frontend (Vite on http://localhost:5173)...
start "NETLAB AI Frontend" cmd /k "cd /d %~dp0frontend && npm.cmd run dev"

echo.
echo Waiting for servers to initialize...
timeout /t 3 /nobreak >nul

echo Opening browser at http://localhost:5173 ...
start http://localhost:5173

echo.
echo ========================================================
echo NETLAB AI is running!
echo Backend API:  http://127.0.0.1:8000/docs
echo Frontend App: http://localhost:5173
echo ========================================================
pause
