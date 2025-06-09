@echo off
REM filepath: c:\Server\repo\tafel-racer\create-portable.bat
echo Building Tafel Race Game for portable distribution...
echo.

REM Build the project
call npm run build

REM Check if build was successful
if exist dist (
    echo.
    echo ✅ Build successful!
    echo.
    echo 📁 Copy the 'dist' folder to any computer
    echo 🌐 Open 'dist/index.html' in any web browser
    echo 🎮 No internet or Node.js installation required!
    echo.
    echo Distribution ready in: %cd%\dist
    pause
) else (
    echo.
    echo ❌ Build failed! Check for errors above.
    pause
)