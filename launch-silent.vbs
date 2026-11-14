Set WshShell = CreateObject("WScript.Shell")
strPath = WshShell.CurrentDirectory
WshShell.Run chr(34) & strPath & "\launch-netlab.bat" & Chr(34), 0
Set WshShell = Nothing
