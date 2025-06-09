@echo off
REM filepath: c:\Server\repo\tafel-racer\serve-portable.bat
echo Starting Tafel Race Game portable server...
echo.

REM Check if dist folder exists
if not exist dist (
    echo ❌ No 'dist' folder found! 
    echo Please run 'npm run build' first.
    echo.
    pause
    exit
)

echo ✅ Found dist folder
echo 🌐 Starting local server...
echo.
echo The game will open automatically in your browser.
echo If not, open: http://localhost:3004
echo.
echo Press Ctrl+C to stop the server
echo.

REM Start the preview server
call npm run preview