@echo off
REM ---------------------------------------------------------------
REM  Starts the Python (FastAPI) backend on http://127.0.0.1:8000
REM  Just double-click this file.
REM ---------------------------------------------------------------
cd /d "%~dp0backend"

if not exist ".venv\Scripts\python.exe" (
  echo First run detected: creating the Python virtual environment...
  python -m venv .venv
  echo Installing backend dependencies...
  ".venv\Scripts\python.exe" -m pip install -r requirements.txt
)

echo.
echo Backend starting on http://127.0.0.1:8000
echo Interactive API docs:  http://127.0.0.1:8000/docs
echo Close this window (or press Ctrl+C) to stop the backend.
echo.
".venv\Scripts\python.exe" run.py

pause
