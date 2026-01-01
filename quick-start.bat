@echo off
REM Quick start script for Azure AI Foundry setup (Windows)
REM Usage: quick-start.bat

setlocal enabledelayedexpansion

echo.
echo ==================================================
echo  AsbestosGuard - Azure AI Foundry Quick Start
echo ==================================================
echo.

REM Check if .env.local exists
if not exist .env.local (
    echo WARNING: .env.local not found
    echo.
    echo Creating .env.local with template...
    echo.
    
    set /p ENDPOINT="Enter your Azure AI Foundry Project Endpoint: "
    set /p AGENT_1="Enter your first Agent ID or Name (e.g., EFSAGENT): "
    
    (
        echo # Azure AI Foundry Configuration
        echo AZURE_AI_FOUNDRY_PROJECT_ENDPOINT=%ENDPOINT%
        echo FOUNDRY_AGENT_1_ID=%AGENT_1%
        echo.
        echo # Optional: Additional agents
        echo # FOUNDRY_AGENT_2_ID=APPRISKANALYSIS
        echo # FOUNDRY_AGENT_3_ID=EMPWEBPROFILEAGENT
    ) > .env.local
    
    echo Created .env.local
) else (
    echo ^✓ .env.local already exists
)

echo.
echo Running validation check...
echo.

npx tsx validate-foundry-setup.ts

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo ERROR: Validation failed. Please fix the issues above.
    pause
    exit /b 1
)

echo.
echo Installing Python dependencies...
pip install fastapi uvicorn azure-identity azure-ai-projects python-dotenv

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo ERROR: Failed to install Python dependencies.
    pause
    exit /b 1
)

echo.
echo Setup complete!
echo.
echo Next Steps:
echo.
echo 1. Start the bridge service in Terminal 1:
echo    npm run agent-bridge
echo.
echo 2. Start the app in Terminal 2:
echo    npm run start:dev
echo.
echo Or start both at once:
echo    npm run start:with-bridge
echo.
echo 3. Test the connection:
echo    npm run test:foundry
echo.
echo Useful commands:
echo   npm run discover:agents       - List all available agents
echo   npm run validate:setup        - Check configuration
echo   npm run test:foundry-analysis - Test analysis endpoint
echo.
pause
