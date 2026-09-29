@echo off
REM ---------------------------------------------------------------
REM  Starts the React frontend on http://localhost:5173
REM  Double-click this file AFTER the backend is running.
REM ---------------------------------------------------------------
cd /d "%~dp0frontend"

if not exist "node_modules" (
  echo First run detected: installing frontend dependencies...
  call npm install
)

echo.
echo Frontend starting on http://localhost:5173
echo Your browser should open by itself; if not, visit that address.
echo Close this window (or press Ctrl+C) to stop the frontend.
echo.
call npm run dev

pause
