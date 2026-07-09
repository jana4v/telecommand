# =============================================================
#  4-deploy.ps1 - Start, stop, or inspect the SCG stack
#
#  Run from any directory (uses script location to find compose.yml).
#
#  Prerequisites (offline PC):
#    - Docker Desktop (or Docker Engine + Docker Compose plugin)
#    - Images loaded via 3-load.ps1
#    - docker/.env file (copy from .env.example and adjust)
#
#  Usage:
#    .\4-deploy.ps1              # start all core services
#    .\4-deploy.ps1 -Storage     # also start InfluxDB + storage service
#    .\4-deploy.ps1 -Down        # stop and remove containers
#    .\4-deploy.ps1 -Restart     # stop then start
#    .\4-deploy.ps1 -Status      # show running containers
#    .\4-deploy.ps1 -Logs        # stream logs (Ctrl+C to stop)
#    .\4-deploy.ps1 -Logs gateway keycloak   # stream logs for specific services
#    .\4-deploy.ps1 -Pull        # re-pull base images (online only)
# =============================================================
param(
    [switch]   $Down,
    [switch]   $Restart,
    [switch]   $Status,
    [switch]   $Logs,
    [switch]   $Storage,
    [switch]   $Pull,
    [string[]] $Filter = @()
)

$ErrorActionPreference = "Stop"

$DockerDir   = $PSScriptRoot | Split-Path -Parent
$ComposeFile = Join-Path $DockerDir "compose.yml"
$EnvFile     = Join-Path $DockerDir ".env"

function Write-Header {
    Write-Host ""
    Write-Host "================================================================" -ForegroundColor Cyan
    Write-Host "  SCG - Deployment Manager" -ForegroundColor Cyan
    Write-Host "================================================================" -ForegroundColor Cyan
    Write-Host ""
}

function Get-ComposeArgs {
    $a = @("--file", $ComposeFile)
    if (Test-Path $EnvFile) { $a += "--env-file", $EnvFile }
    if ($Storage) { $a += "--profile", "storage" }
    return $a
}

Write-Header

docker info 2>&1 | Out-Null
if ($LASTEXITCODE -ne 0) {
    Write-Host "  [ERROR] Docker is not running. Start Docker Desktop first." -ForegroundColor Red
    exit 1
}

if (-not (Test-Path $EnvFile)) {
    Write-Host "  [WARN]  .env not found -- using built-in defaults." -ForegroundColor Yellow
    Write-Host "          Copy docker\.env.example to docker\.env and review before first run." -ForegroundColor DarkGray
    Write-Host ""
}

if ($Pull) {
    Write-Host "  Pulling latest base images (requires internet)..." -ForegroundColor Yellow
    docker compose (Get-ComposeArgs) pull
    exit $LASTEXITCODE
}

if ($Status) {
    Write-Host "  Stack status:" -ForegroundColor Cyan
    docker compose (Get-ComposeArgs) ps
    exit $LASTEXITCODE
}

if ($Logs) {
    $logArgs = Get-ComposeArgs
    $logArgs += "logs", "-f", "--tail=100"
    if ($Filter.Count -gt 0) { $logArgs += $Filter }
    docker compose @logArgs
    exit $LASTEXITCODE
}

if ($Down) {
    Write-Host "  Stopping SCG stack..." -ForegroundColor Yellow
    docker compose (Get-ComposeArgs) down
    Write-Host ""
    Write-Host "  Stack stopped. Data volumes are preserved." -ForegroundColor Green
    Write-Host "  To also delete volumes: docker compose down -v" -ForegroundColor DarkGray
    exit $LASTEXITCODE
}

if ($Restart) {
    Write-Host "  Restarting SCG stack..." -ForegroundColor Yellow
    docker compose (Get-ComposeArgs) down
    Start-Sleep -Seconds 2
}

Write-Host "  Starting SCG stack..." -ForegroundColor Yellow
if ($Storage) {
    Write-Host "  Profile: storage (InfluxDB + storage service included)" -ForegroundColor DarkGray
}
Write-Host ""

docker compose (Get-ComposeArgs) up --detach --remove-orphans
if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "  [ERROR] Failed to start the stack." -ForegroundColor Red
    Write-Host "  Check logs with: .\4-deploy.ps1 -Logs" -ForegroundColor Yellow
    exit 1
}

Write-Host ""
Write-Host "  Stack is starting..." -ForegroundColor Green
Write-Host ""

Start-Sleep -Seconds 3
docker compose (Get-ComposeArgs) ps

Write-Host ""

$guiPort = "80"
if (Test-Path $EnvFile) {
    $portLine = Get-Content $EnvFile | Where-Object { $_ -match "^GUI_PORT=" }
    if ($portLine) { $guiPort = $portLine -replace "^GUI_PORT=", "" }
}

Write-Host "  GUI available at: http://localhost:$guiPort" -ForegroundColor Cyan
Write-Host ""
Write-Host "  Commands:" -ForegroundColor DarkGray
Write-Host "    .\4-deploy.ps1 -Logs     # stream all logs" -ForegroundColor DarkGray
Write-Host "    .\4-deploy.ps1 -Status   # show container status" -ForegroundColor DarkGray
Write-Host "    .\4-deploy.ps1 -Down     # stop the stack" -ForegroundColor DarkGray
Write-Host ""
