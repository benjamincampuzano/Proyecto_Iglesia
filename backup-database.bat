@echo off
echo ========================================
echo Database Backup Script
echo ========================================
echo.

REM Get current date and time for backup filename
for /f "tokens=2 delims==" %%I in ('wmic os get localdatetime /value') do set datetime=%%I
set BACKUP_DATE=%datetime:~0,8%_%datetime:~8,6%

REM Set backup directory
set BACKUP_DIR=C:\Users\Usuario\Documents\Proyecto_Iglesia\backups
set BACKUP_FILE=%BACKUP_DIR%\iglesia_crm_backup_%BACKUP_DATE%.sql

REM Create backup directory if it doesn't exist
if not exist "%BACKUP_DIR%" mkdir "%BACKUP_DIR%"

echo Creating backup...
echo Backup file: %BACKUP_FILE%
echo.

REM Execute pg_dump (adjust credentials as needed)
pg_dump -U postgres -d iglesia_crm -F p -f "%BACKUP_FILE%"

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ========================================
    echo Backup completed successfully!
    echo File: %BACKUP_FILE%
    echo ========================================
) else (
    echo.
    echo ========================================
    echo ERROR: Backup failed!
    echo ========================================
    exit /b 1
)

echo.
echo Backup size:
dir "%BACKUP_FILE%" | find "%BACKUP_DATE%"
echo.
pause
