@echo off
rem Запуск локального сервера документации Databird
cd /d %~dp0
echo Запуск сервера документации Databird...
echo Открывается http://localhost:7080
start "" http://localhost:7080
node server.js
pause