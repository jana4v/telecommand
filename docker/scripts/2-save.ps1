# =============================================================
#  2-save.ps1 - Export all Docker images to .tar files
#
#  Run this on the internet-connected build machine AFTER 1-build.ps1.
#  Outputs to docker/images/ (3 tar files):
#    mainframe-apps.tar  - all Go microservice images
#    mainframe-gui.tar   - nginx + Nuxt GUI image
#    infra.tar           - postgres, redis, nats, influxdb, alpine base
#
#  Transfer the entire docker/ folder to the offline PC, then run 3-load.ps1.
#
#  Usage:
#    .\2-save.ps1              # save everything
#    .\2-save.ps1 -SkipPull   # skip pulling infra images (already cached)
# =============================================================
param(
    [switch] $SkipPull
)

$ErrorActionPreference = "Stop"

$DockerDir = $PSScriptRoot | Split-Path -Parent
$OutDir    = Join-Path $DockerDir "images"

$AppImages = @(
    "mainframe/gateway:latest",
    "mainframe/iam:latest",
    "mainframe/ingest:latest",
    "mainframe/chainmon:latest",
    "mainframe/comparator:latest",
    "mainframe/limiter:latest",
    "mainframe/simulator:latest",
    "mainframe/storage:latest",
    "mainframe/umacs-tc:latest"
)

$GuiImages = @(
    "mainframe/gui:latest"
)

$InfraImages = @(
    "postgres:16-alpine",
    "redis:7-alpine",
    "nats:2.10-alpine",
    "influxdb:2.7",
    "alpine:3.20",
    "nginx:1.27-alpine",
    "golang:1.25-alpine",
    "node:22-alpine"
)

function Write-Header {
    Write-Host ""
    Write-Host "================================================================" -ForegroundColor Cyan
    Write-Host "  Mainframe - Save Images for Offline Transfer" -ForegroundColor Cyan
    Write-Host "================================================================" -ForegroundColor Cyan
    Write-Host "  Output: $OutDir" -ForegroundColor DarkGray
    Write-Host ""
}

Write-Header

New-Item -ItemType Directory -Force -Path $OutDir | Out-Null

if (-not $SkipPull) {
    Write-Host "  Pulling infrastructure images..." -ForegroundColor Yellow
    foreach ($img in $InfraImages) {
        Write-Host "    docker pull $img" -ForegroundColor DarkGray
        docker pull $img
        if ($LASTEXITCODE -ne 0) {
            Write-Warning "  Could not pull $img -- it may already be cached."
        }
    }
    Write-Host ""
}

Write-Host "  Saving app images -> mainframe-apps.tar ..." -ForegroundColor Yellow
docker save $AppImages -o (Join-Path $OutDir "mainframe-apps.tar")
if ($LASTEXITCODE -ne 0) { throw "Failed to save app images" }
Write-Host "  [OK] mainframe-apps.tar" -ForegroundColor Green

Write-Host "  Saving GUI image -> mainframe-gui.tar ..." -ForegroundColor Yellow
docker save $GuiImages -o (Join-Path $OutDir "mainframe-gui.tar")
if ($LASTEXITCODE -ne 0) { throw "Failed to save GUI image" }
Write-Host "  [OK] mainframe-gui.tar" -ForegroundColor Green

Write-Host "  Saving infra images -> infra.tar ..." -ForegroundColor Yellow
docker save $InfraImages -o (Join-Path $OutDir "infra.tar")
if ($LASTEXITCODE -ne 0) { throw "Failed to save infra images" }
Write-Host "  [OK] infra.tar" -ForegroundColor Green

Write-Host ""
Write-Host "  Saved files:" -ForegroundColor Cyan
Get-ChildItem -Path $OutDir -Filter "*.tar" | ForEach-Object {
    $sizeMB = [math]::Round($_.Length / 1MB, 1)
    Write-Host ("    {0,-30} {1} MB" -f $_.Name, $sizeMB) -ForegroundColor White
}

Write-Host ""
Write-Host "  Transfer the entire 'docker' folder to the offline PC." -ForegroundColor Cyan
Write-Host "  Then run .\3-load.ps1 on the offline PC." -ForegroundColor Cyan
Write-Host ""
