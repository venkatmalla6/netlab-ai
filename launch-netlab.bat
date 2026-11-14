@echo off
set DISABLE_SQLALCHEMY_CEXT=1

:: Start Backend on 127.0.0.1:8000 (Localhost only - private to laptop)
cd /d "%~dp0backend"
start /b python -m uvicorn app.main:app --host 127.0.0.1 --port 8000

:: Start Frontend on 127.0.0.1:5173 (Localhost only)
cd /d "%~dp0frontend"
start /b npm.cmd run dev

:: Wait 3 seconds for initial handshake and open browser
timeout /t 3 /nobreak >nul
start http://localhost:5173
