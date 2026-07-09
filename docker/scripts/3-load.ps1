# =============================================================
#  3-load.ps1 - Load Docker images from .tar files (offline PC)
#
#  Run this on the OFFLINE target machine.
#  Expects the docker/images/ directory to contain the .tar files
#  produced by 2-save.ps1.
#
#  Order matters: infra.tar first (base layers), then app images.
#
#  Usage:
#    .\3-load.ps1
# =============================================================

$ErrorActionPreference = "Stop"

$DockerDir = $PSScriptRoot | Split-Path -Parent
$ImagesDir = Join-Path $DockerDir "images"

function Write-Header {
    Write-Host ""
    Write-Host "================================================================" -ForegroundColor Cyan
    Write-Host "  SCG - Load Images on Offline PC" -ForegroundColor Cyan
    Write-Host "================================================================" -ForegroundColor Cyan
    Write-Host "  Images dir: $ImagesDir" -ForegroundColor DarkGray
    Write-Host ""
}

Write-Header

if (-not (Test-Path $ImagesDir)) {
    Write-Host "  [ERROR] images/ directory not found: $ImagesDir" -ForegroundColor Red
    Write-Host "  Copy the docker/ folder from the build machine first." -ForegroundColor Yellow
    exit 1
}

$TarFiles = Get-ChildItem -Path $ImagesDir -Filter "*.tar" | Sort-Object Name

if ($TarFiles.Count -eq 0) {
    Write-Host "  [ERROR] No .tar files found in $ImagesDir" -ForegroundColor Red
    exit 1
}

# Load in a sensible order: infra first so base layers are available for app images
$ordered = @()
$infra = $TarFiles | Where-Object { $_.Name -eq "infra.tar" }
if ($infra) { $ordered += $infra }
$ordered += $TarFiles | Where-Object { $_.Name -ne "infra.tar" }

foreach ($tar in $ordered) {
    $sizeMB = [math]::Round($tar.Length / 1MB, 1)
    Write-Host "  Loading $($tar.Name) ($sizeMB MB) ..." -ForegroundColor Yellow
    docker load -i $tar.FullName
    if ($LASTEXITCODE -ne 0) {
        Write-Host "  [FAIL] $($tar.Name)" -ForegroundColor Red
        throw "Failed to load $($tar.Name)"
    }
    Write-Host "  [OK] $($tar.Name)" -ForegroundColor Green
    Write-Host ""
}

Write-Host "  All images loaded successfully." -ForegroundColor Green
Write-Host ""
Write-Host "  Next step: run .\4-deploy.ps1 to start the stack." -ForegroundColor Cyan
Write-Host ""
