@echo off
REM ---------------------------------------------------------------
REM  Push InQueue to GitHub (beginner friendly)
REM  Double-click this file AFTER installing git + gh and logging in.
REM  It will: git init (if needed), commit, create public repo InQueue,
REM  and push. Safe to run twice.
REM ---------------------------------------------------------------
cd /d "%~dp0"

where git >nul 2>nul
if errorlevel 1 (
  echo [ERROR] git not found. Install it from https://git-scm.com/downloads
  echo Then re-run this file.
  pause
  exit /b 1
)

where gh >nul 2>nul
if errorlevel 1 (
  echo [ERROR] GitHub CLI (gh) not found. Install it from https://cli.github.com/
  echo Then run: gh auth login
  echo Then re-run this file.
  pause
  exit /b 1
)

echo Checking gh login...
gh auth status
if errorlevel 1 (
  echo.
  echo You are not logged in. Running: gh auth login
  echo Choose GitHub.com - HTTPS - Login with browser.
  gh auth login
)

if not exist ".git" (
  echo Initializing git repo...
  git init -b main
) else (
  echo Existing .git found, keeping it.
)

echo.
echo Adding files (respects .gitignore, so todo.db / node_modules / .venv are skipped)...
git add -A
git status --short --branch

echo.
set /p MSG="Commit message [press Enter for 'Initial commit: InQueue todo app']: "
if "%MSG%"=="" set MSG=Initial commit: InQueue todo app
git commit -m "%MSG%" 2>nul
if errorlevel 1 echo (nothing new to commit - continuing)

echo.
echo Creating GitHub repo InQueue (public) if needed...
gh repo create InQueue --public --source=. --remote=origin --push 2>nul
if errorlevel 1 (
  echo gh repo create said the repo may already exist. Trying normal push...
  git branch -M main
  git remote -v
  git push -u origin main
) else (
  echo Pushed!
)

echo.
echo Done. Your repo URL (if created):
gh repo view --web 2>nul
pause
