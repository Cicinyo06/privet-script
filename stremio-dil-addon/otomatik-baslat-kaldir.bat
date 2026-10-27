@echo off
chcp 65001 >nul
del "%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup\dil-odakli-debrid.vbs" 2>nul
powershell -NoProfile -Command "Get-CimInstance Win32_Process -Filter \"Name='node.exe'\" | Where-Object { $_.CommandLine -like '*stremio-dil-addon*server.js*' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force }"
echo Otomatik baslatma kaldirildi ve calisan eklenti durduruldu.
pause
