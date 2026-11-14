# Create Windows Desktop Shortcuts for NETLAB AI
$wsh = New-Object -ComObject WScript.Shell
$desktop = [System.Environment]::GetFolderPath('Desktop')
$projRoot = $PSScriptRoot

# 1. Launcher shortcut (Silent, no terminal windows)
$scLaunch = $wsh.CreateShortcut("$desktop\NETLAB AI.lnk")
$scLaunch.TargetPath = "wscript.exe"
$scLaunch.Arguments = "`"$projRoot\launch-silent.vbs`""
$scLaunch.WorkingDirectory = $projRoot
$scLaunch.Description = "Launch NETLAB AI Platform (Private Localhost)"
$scLaunch.Save()

# 2. Stop shortcut
$scStop = $wsh.CreateShortcut("$desktop\Stop NETLAB AI.lnk")
$scStop.TargetPath = "$projRoot\stop-netlab.bat"
$scStop.WorkingDirectory = $projRoot
$scStop.Description = "Stop NETLAB AI Platform background services"
$scStop.Save()

Write-Host "Created Desktop shortcuts successfully at: $desktop" -ForegroundColor Green
