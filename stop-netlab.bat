@echo off
title NETLAB AI - Shutdown
echo ===================================================
echo           Shutting down NETLAB AI...
echo ===================================================
powershell -Command "$ports = @(8000, 5173); foreach ($p in $ports) { $conns = Get-NetTCPConnection -LocalPort $p -ErrorAction SilentlyContinue; foreach ($c in $conns) { Stop-Process -Id $c.OwningProcess -Force -ErrorAction SilentlyContinue } }"
echo.
echo All NETLAB AI background services stopped cleanly.
timeout /t 2 /nobreak >nul
