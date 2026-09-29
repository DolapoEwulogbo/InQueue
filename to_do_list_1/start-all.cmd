@echo off
REM ---------------------------------------------------------------
REM  Convenience launcher: opens the backend and the frontend
REM  each in its own window. Double-click this file to run the app.
REM ---------------------------------------------------------------
start "To-Do backend (API)" cmd /k "%~dp0start-backend.cmd"
timeout /t 3 /nobreak >nul
start "To-Do frontend (React)" cmd /k "%~dp0start-frontend.cmd"
