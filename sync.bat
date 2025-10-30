@echo off
REM =============================================
REM Dutchie Sync Wrapper Script for Windows
REM
REM This script runs the Dutchie sync with proper
REM error handling and logging.
REM
REM Use with Windows Task Scheduler:
REM   Trigger: Daily, repeat every 15 minutes
REM   Action: Start sync.bat
REM =============================================

REM Get script directory
set SCRIPT_DIR=%~dp0
cd /d %SCRIPT_DIR%

REM Configuration
set LOG_DIR=%SCRIPT_DIR%logs
set LOG_FILE=%LOG_DIR%\sync.log
set ERROR_LOG=%LOG_DIR%\error.log
set NODE_BIN=node

REM Create log directory if it doesn't exist
if not exist "%LOG_DIR%" mkdir "%LOG_DIR%"

REM Log start
echo =========================================== >> "%LOG_FILE%"
echo [%date% %time%] Starting Dutchie sync >> "%LOG_FILE%"
echo =========================================== >> "%LOG_FILE%"

REM Check if node is available
where %NODE_BIN% >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo [%date% %time%] ERROR: Node.js not found >> "%ERROR_LOG%"
    exit /b 1
)

REM Check if .env exists
if not exist "%SCRIPT_DIR%.env" (
    echo [%date% %time%] ERROR: .env file not found >> "%ERROR_LOG%"
    exit /b 1
)

REM Check if dist folder exists
if not exist "%SCRIPT_DIR%dist" (
    echo [%date% %time%] ERROR: dist folder not found. Run 'npm run build' first >> "%ERROR_LOG%"
    exit /b 1
)

REM Run the sync
echo [%date% %time%] Executing sync... >> "%LOG_FILE%"
%NODE_BIN% "%SCRIPT_DIR%dist\index.js" >> "%LOG_FILE%" 2>> "%ERROR_LOG%"

if %ERRORLEVEL% equ 0 (
    echo [%date% %time%] Sync completed successfully >> "%LOG_FILE%"
    exit /b 0
) else (
    echo [%date% %time%] ERROR: Sync failed with exit code %ERRORLEVEL% >> "%ERROR_LOG%"
    echo [%date% %time%] Check %ERROR_LOG% for details >> "%LOG_FILE%"
    exit /b %ERRORLEVEL%
)
