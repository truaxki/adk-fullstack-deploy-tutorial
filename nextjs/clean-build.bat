@echo off
echo Cleaning Next.js build cache...
echo ================================

REM Remove .next folder completely
if exist ".next" (
    echo Removing .next folder...
    rmdir /s /q ".next"
    echo .next folder removed
)

REM Remove node_modules/.cache if it exists
if exist "node_modules\.cache" (
    echo Removing node_modules cache...
    rmdir /s /q "node_modules\.cache"
    echo node_modules cache removed
)

REM Clear npm cache
echo Clearing npm cache...
call npm cache clean --force

echo.
echo Rebuilding project...
echo ================================

REM Run fresh build
call npm run build

echo.
echo ================================
echo Build process complete!
