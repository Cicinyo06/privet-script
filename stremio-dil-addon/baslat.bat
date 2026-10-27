@echo off
chcp 65001 >nul
title Dil Odakli Debrid - Stremio eklentisi
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js bulunamadi. https://nodejs.org adresinden LTS surumunu kurup tekrar calistir.
  start https://nodejs.org/
  pause
  exit /b 1
)
echo Eklenti baslatiliyor... Bu pencereyi kapatirsan eklenti durur.
start "" http://127.0.0.1:7000/configure
node src/server.js
pause
