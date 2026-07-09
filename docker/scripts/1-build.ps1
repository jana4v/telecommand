# =============================================================
#  1-build.ps1 - Build all SCG Docker images from source
#
#  Run from any directory (uses script location to find paths).
#  Requirements: Docker Desktop (or Docker Engine), internet access
#                (Go modules and npm packages are downloaded during build).
#
#  Usage:
#    .\1-build.ps1                 # build everything
#    .\1-build.ps1 -Services gui   # rebuild only the GUI image
#    .\1-build.ps1 -Services gateway,iam,ingest
#    .\1-build.ps1 -NoCache        # force full rebuild (no layer cache)
# =============================================================
param(
    [string[]] $Services = @(),   # empty = build all
    [switch]   $NoCache
)

$ErrorActionPreference = "Stop"

# Paths
$DockerDir  = $PSScriptRoot | Split-Path -Parent  # docker/
$RepoRoot   = $DockerDir    | Split-Path -Parent  # tm_tc/ (build context)
$GoFile     = Join-Path $DockerDir "Dockerfile.go"
$GuiFile    = Join-Path $DockerDir "Dockerfile.gui"
$SpasdacsFile = Join-Path $DockerDir "Dockerfile.spasdacs"

# Go service targets
$GoServices = @(
    "gateway", "ingest", "chainmon", "comparator",
    "limiter", "simulator", "storage", "umacs-tc"
)

function Write-Header {
    Write-Host ""
    Write-Host "================================================================" -ForegroundColor Cyan
    Write-Host "  SCG - Docker Image Builder" -ForegroundColor Cyan
    Write-Host "================================================================" -ForegroundColor Cyan
    Write-Host "  Repo root : $RepoRoot" -ForegroundColor DarkGray
    Write-Host "  No-cache  : $NoCache" -ForegroundColor DarkGray
    Write-Host ""
}

function Build-Image {
    param(
        [string] $Tag,
        [string] $Dockerfile,
        [string] $Target = ""
    )
    $buildArgs = @(
        "build",
        "--file", $Dockerfile,
        "--tag",  $Tag
    )
    if ($Target)  { $buildArgs += "--target", $Target }
    if ($NoCache) { $buildArgs += "--no-cache" }
    $buildArgs += $RepoRoot   # build context

    Write-Host ""
    Write-Host "  Building $Tag ..." -ForegroundColor Yellow

    # Stream output directly so progress is visible; $LASTEXITCODE captures result.
    & docker @buildArgs
    if ($LASTEXITCODE -ne 0) {
        Write-Host "  [FAIL] $Tag" -ForegroundColor Red
        throw "Build failed: $Tag"
    }
    Write-Host "  [OK] $Tag" -ForegroundColor Green
}

Write-Header

# Determine what to build
$buildGo       = ($Services.Count -eq 0) -or ($Services | Where-Object { $_ -notin @("gui", "spasdacs") })
$buildGui      = ($Services.Count -eq 0) -or ($Services -contains "gui")
$buildSpasdacs = ($Services.Count -eq 0) -or ($Services -contains "spasdacs")

# Filter Go services if specific ones were requested
if ($Services.Count -gt 0) {
    $GoServices = $GoServices | Where-Object { $Services -contains $_ }
}

# Build Go service images (shared builder stage is cached across all targets)
if ($buildGo -and $GoServices.Count -gt 0) {
    Write-Host "  Building Go services..." -ForegroundColor Cyan
    Write-Host "  (First build downloads Go modules - takes a few minutes)" -ForegroundColor DarkGray
    Write-Host ""
    foreach ($svc in $GoServices) {
        Build-Image -Tag "scg/${svc}:latest" -Dockerfile $GoFile -Target $svc
    }
}

# Build GUI image (downloads npm packages + runs nuxt generate)
if ($buildGui) {
    Write-Host ""
    Write-Host "  Building GUI..." -ForegroundColor Cyan
    Write-Host "  (First build downloads npm packages - takes a few minutes)" -ForegroundColor DarkGray
    Write-Host ""
    Build-Image -Tag "scg/gui:latest" -Dockerfile $GuiFile
}

# Build SPASDACS image (downloads npm packages + runs vite build)
if ($buildSpasdacs) {
    Write-Host ""
    Write-Host "  Building SPASDACS..." -ForegroundColor Cyan
    Write-Host "  (First build downloads npm packages - takes a few minutes)" -ForegroundColor DarkGray
    Write-Host ""
    Build-Image -Tag "scg/spasdacs:latest" -Dockerfile $SpasdacsFile
}

Write-Host ""
Write-Host "  All images built successfully." -ForegroundColor Green
Write-Host ""
Write-Host "  Next step: run .\2-save.ps1 to export images for offline transfer." -ForegroundColor Cyan
Write-Host ""
