@echo off
echo ============================================
echo   MoodLog - First Time Setup
echo ============================================
echo.

echo [1/4] Installing dependencies...
call npm install
if %errorlevel% neq 0 (
    echo ERROR: npm install failed!
    pause
    exit /b 1
)
echo.

echo [2/4] Generating Prisma Client...
call npx prisma generate
if %errorlevel% neq 0 (
    echo ERROR: prisma generate failed!
    pause
    exit /b 1
)
echo.

echo [3/4] Creating/migrating database...
call npx prisma db push
if %errorlevel% neq 0 (
    echo ERROR: prisma db push failed!
    pause
    exit /b 1
)
echo.

echo [4/4] Creating required directories...
if not exist "db" mkdir db
if not exist "uploads\avatars" mkdir uploads\avatars
echo.

echo ============================================
echo   Setup complete! Starting dev server...
echo ============================================
echo.
call npm run dev
