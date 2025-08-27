@echo off
echo ========================================
echo SmartCallMate Team Deployment Builder
echo ========================================
echo.

echo [1/4] Installing dependencies...
call npm install
if errorlevel 1 (
    echo ERROR: Failed to install dependencies
    pause
    exit /b 1
)

echo.
echo [2/4] Building React application...
call npm run build
if errorlevel 1 (
    echo ERROR: Failed to build React app
    pause
    exit /b 1
)

echo.
echo [3/4] Creating distribution packages...
echo Building for Windows (x64 and x32)...
call npm run dist:win
if errorlevel 1 (
    echo ERROR: Failed to build Windows packages
    pause
    exit /b 1
)

echo.
echo [4/4] Build complete!
echo.
echo Distribution packages created in 'dist' folder:
echo - SmartCallMate-Setup-1.0.0.exe (Windows Installer)
echo - SmartCallMate-1.0.0-win-x64.zip (Portable Windows x64)
echo - SmartCallMate-1.0.0-win-ia32.zip (Portable Windows x32)
echo.
echo Instructions for team members:
echo 1. Download the installer (.exe file)
echo 2. Run as Administrator
echo 3. Follow installation wizard
echo 4. Get API keys from Deepgram and OpenAI
echo 5. Configure keys in Settings panel
echo.
echo Press any key to open dist folder...
pause > nul
start explorer dist