@echo off
echo ============================================================
echo Azure AI Foundry Native Agent Setup
echo ============================================================
echo.

echo [1/4] Checking Python...
python --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Python not found. Please install Python 3.11 or later.
    echo Download from: https://www.python.org/downloads/
    pause
    exit /b 1
)
python --version

echo.
echo [2/4] Installing Python dependencies...
echo Running: pip install -r requirements.txt
pip install -r requirements.txt
if errorlevel 1 (
    echo ERROR: Failed to install Python dependencies
    pause
    exit /b 1
)

echo.
echo [3/4] Building TypeScript...
echo Running: npm run build
call npm run build
if errorlevel 1 (
    echo ERROR: TypeScript build failed
    pause
    exit /b 1
)

echo.
echo [4/4] Setup complete!
echo.
echo ============================================================
echo NEXT STEPS:
echo ============================================================
echo.
echo 1. Start the Agent Bridge Service:
echo    npm run agent-bridge
echo.
echo 2. In a new terminal, test it works:
echo    npm run test:foundry-analysis
echo.
echo 3. OR start everything together:
echo    npm run start:with-bridge
echo.
echo ============================================================
echo.
echo For detailed instructions, see: NATIVE_AGENT_SETUP.md
echo.
pause
