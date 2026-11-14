# NETLAB AI - PowerShell Launcher
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "       NETLAB AI - Network Automation Platform" -ForegroundColor Cyan
Write-Host "========================================================" -ForegroundColor Cyan

$backendDir = Join-Path $PSScriptRoot "backend"
$frontendDir = Join-Path $PSScriptRoot "frontend"

$pyCmd = if (Get-Command python -ErrorAction SilentlyContinue) { "python" } else { "py -3" }

Write-Host "Starting Backend on http://127.0.0.1:8000 using $pyCmd..." -ForegroundColor Yellow
Start-Process cmd.exe -ArgumentList "/k", "cd /d `"$backendDir`" && set DISABLE_SQLALCHEMY_CEXT=1 && $pyCmd -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload"

Write-Host "Starting Frontend on http://localhost:5173..." -ForegroundColor Yellow
Start-Process cmd.exe -ArgumentList "/k", "cd /d `"$frontendDir`" && npm.cmd run dev"

Write-Host "`nWaiting for services to warm up..." -ForegroundColor Yellow
Start-Sleep -Seconds 3

Write-Host "Opening NETLAB AI in your default browser..." -ForegroundColor Green
Start-Process "http://localhost:5173"

Write-Host "`n========================================================" -ForegroundColor Cyan
Write-Host "NETLAB AI is running!" -ForegroundColor Green
Write-Host "Frontend:    http://localhost:5173" -ForegroundColor Green
Write-Host "Backend API: http://127.0.0.1:8000/docs`n" -ForegroundColor Green
Write-Host "========================================================" -ForegroundColor Cyan
