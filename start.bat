@echo off
setlocal
cd /d "%~dp0"

echo ========================================
echo       EVGRID PORTAL - NEON POSTGRESQL
echo ========================================
echo.

if not exist "backend\.env" (
  echo ERROR: backend\.env not found.
  echo Copy backend\.env.example to backend\.env and fill in DATABASE_URL and JWT_SECRET.
  echo.
  pause
  exit /b 1
)

if not exist "backend\node_modules" (
  echo Installing backend dependencies...
  call npm --prefix backend install
  if errorlevel 1 goto :error
)

echo.
echo Starting EVGRID...
echo Open: http://localhost:5000
echo.
call npm run dev
exit /b %errorlevel%

:error
echo.
echo Installation failed. Please check the npm error above.
pause
