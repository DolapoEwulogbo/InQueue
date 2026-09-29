@echo off
REM Beginner helper: pushes all InQueue fixes to GitHub.
REM Just double-click this file. If git asks you to log in, do it in the browser window that opens.

cd /d "%~dp0"

echo.
echo === Step 1: get latest from GitHub ===
git pull origin main
if errorlevel 1 (
  echo.
  echo Pull had an issue - continuing anyway with local files...
)

echo.
echo === Step 2: remove broken template workflows (they only exist on GitHub) ===
git fetch origin
git checkout origin/main -- .github/workflows/ 2>nul
if exist ".github\workflows\django.yml" del ".github\workflows\django.yml"
if exist ".github\workflows\node.js.yml" del ".github\workflows\node.js.yml"
if exist ".github\workflows\python-package.yml" del ".github\workflows\python-package.yml"
if exist ".github\workflows\python-publish.yml" del ".github\workflows\python-publish.yml"

echo.
echo === Step 3: add all fixes ===
git add .github/workflows/inqueue-ci.yml
git add to_do_list_1/backend/wsgi.py
git add to_do_list_1/backend/PYTHONANYWHERE_WSGI_SNIPPET.txt
git add to_do_list_1/backend/requirements.txt
git add to_do_list_1/vercel.json
git add to_do_list_1/README.md
git add to_do_list_1/frontend/package-lock.json
git add PUSH-FIXES.cmd

echo.
echo === What will be pushed: ===
git status --short

echo.
echo === Step 4: commit + push ===
git commit -m "Fix CI, Vercel 404, and PythonAnywhere deploy"
git push origin main

echo.
if errorlevel 1 (
  echo PUSH FAILED - you may need to log in to git first.
  echo Run: gh auth login
  echo Or push from VS Code Source Control panel.
) else (
  echo DONE! Check https://github.com/DolapoEwulogbo/InQueue/actions - InQueue CI should go green.
)
echo.
pause
