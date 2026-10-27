@echo off
chcp 65001 >nul
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js bulunamadi. Once https://nodejs.org adresinden LTS surumunu kur.
  pause
  exit /b 1
)
set "VBS=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup\dil-odakli-debrid.vbs"
> "%VBS%" echo ' Dil Odakli Debrid Stremio eklentisini arka planda (pencere acmadan) baslatir.
>> "%VBS%" echo Set sh = CreateObject("WScript.Shell")
>> "%VBS%" echo dir = "%~dp0"
>> "%VBS%" echo sh.CurrentDirectory = dir
>> "%VBS%" echo sh.Run "node """ ^& dir ^& "src\server.js""", 0, False
echo Otomatik baslatma kuruldu. Bilgisayar her acildiginda eklenti arka planda calisacak.
echo Simdi de baslatiliyor...
wscript "%VBS%"
echo.
echo Tamam. Bu pencereyi kapatabilirsin. Ayar sayfasi: http://127.0.0.1:7000/configure
echo Not: Bu klasoru tasirsan bu dosyayi yeniden calistir.
pause
