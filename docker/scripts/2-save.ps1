# =============================================================
#  2-save.ps1 - Export all Docker images to .tar files
#
#  Run this on the internet-connected build machine AFTER 1-build.ps1.
#  Outputs to docker/images/ (3 tar files):
#    scg-apps.tar        - all Go microservice images
#    scg-gui.tar          - static Nuxt SPA image (nginx, no proxying)
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
    "scg/gateway:latest",
    "scg/ingest:latest",
    "scg/chainmon:latest",
    "scg/comparator:latest",
    "scg/limiter:latest",
    "scg/simulator:latest",
    "scg/storage:latest",
    "scg/umacs-tc:latest"
)

$GuiImages = @(
    "scg/gui:latest"
)

$InfraImages = @(
    "postgres:16-alpine",
    "redis:7-alpine",
    "nats:2.10-alpine",
    "influxdb:2.7",
    "alpine:3.20",
    "nginx:1.27-alpine",
    "golang:1.25-alpine",
    "node:22-alpine",
    "quay.io/keycloak/keycloak:26.0",
    "apache/apisix:3.9.1-debian"
)

function Write-Header {
    Write-Host ""
    Write-Host "================================================================" -ForegroundColor Cyan
    Write-Host "  SCG - Save Images for Offline Transfer" -ForegroundColor Cyan
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

Write-Host "  Saving app images -> scg-apps.tar ..." -ForegroundColor Yellow
docker save $AppImages -o (Join-Path $OutDir "scg-apps.tar")
if ($LASTEXITCODE -ne 0) { throw "Failed to save app images" }
Write-Host "  [OK] scg-apps.tar" -ForegroundColor Green

Write-Host "  Saving GUI image -> scg-gui.tar ..." -ForegroundColor Yellow
docker save $GuiImages -o (Join-Path $OutDir "scg-gui.tar")
if ($LASTEXITCODE -ne 0) { throw "Failed to save GUI image" }
Write-Host "  [OK] scg-gui.tar" -ForegroundColor Green

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
