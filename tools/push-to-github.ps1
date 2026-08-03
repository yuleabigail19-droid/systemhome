# Push to GitHub script for SYSTEMHOME
# Usage: Open PowerShell, cd to project root and run: .\tools\push-to-github.ps1

param(
    [string]$RemoteUrl = 'https://github.com/yuleabigail19-droid/systemhome.git',
    [string]$CommitMessage = 'UI: estilo profesional, gestión de imágenes en inventario, mejoras'
)

function ExitWithError($msg) {
    Write-Host "ERROR: $msg" -ForegroundColor Red
    exit 1
}

# Check git availability
if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
    ExitWithError 'git no está disponible en este entorno. Instala Git y reinicia la terminal.'
}

# Change to repo directory (script should be run from workspace root)
$root = Resolve-Path -Path .
Write-Host "Using workspace: $root"

# Initialize repo if needed
if (-not (Test-Path .git)) {
    Write-Host 'Inicializando repo git...'
    git init
}

# Stage changes
Write-Host 'Agregando archivos al índice...'
git add -A

# Commit (if there are changes)
try {
    git commit -m "$CommitMessage"
} catch {
    Write-Host 'No hay cambios para commitear o el commit falló.'
}

# Configure remote
try {
    $existing = git remote get-url origin 2>$null
    if ($existing) {
        Write-Host "Remote origin existe: $existing -> actualizando URL a $RemoteUrl"
        git remote set-url origin $RemoteUrl
    } else {
        Write-Host "Añadiendo remote origin -> $RemoteUrl"
        git remote add origin $RemoteUrl
    }
} catch {
    Write-Host "Añadiendo remote origin -> $RemoteUrl"
    git remote add origin $RemoteUrl
}

# Ensure branch main
git branch -M main

# Push
Write-Host 'Empujando a origin main (se solicitarán credenciales si es necesario)...'
try {
    git push -u origin main
    Write-Host 'Push completado.' -ForegroundColor Green
} catch {
    Write-Host 'Push falló. Revisa tus credenciales o ejecuta el comando manualmente.' -ForegroundColor Yellow
}
