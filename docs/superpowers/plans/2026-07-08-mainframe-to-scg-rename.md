# Rename "mainframe" → "SCG" Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rename the `mainframe` branding/identifier to `scg` (lowercase for technical identifiers, `SCG` for human-facing text) across the Docker deployment layer and the one GUI reference, with no behavior change.

**Architecture:** Pure mechanical text substitution across 12 files, grouped into 4 tasks by layer (compose/env core, auth layer, build tooling, frontend+verification) so each task's diff is independently reviewable against the spec's exact mapping table. The final task brings up the renamed stack and re-runs the auth verification flow already exercised by earlier plans, proving the rename didn't break anything.

**Tech Stack:** Docker Compose, Keycloak, APISIX, PowerShell, Nuxt 3.

## Global Constraints

- Every replacement must exactly match the mapping in the design spec (`docs/superpowers/specs/2026-07-08-mainframe-to-scg-rename-design.md`): lowercase `mainframe`→`scg` for technical identifiers, `Mainframe`→`SCG` only in human-facing banner/display text.
- Do NOT touch: the two absolute filesystem paths in `GUI/nuxt.config.ts`'s Vite `fs.allow` array, Keycloak client IDs (`tm-tc-spa`, `apisix-introspection`), realm roles, the `operator` user, or any file under `docker/images/`.
- No Go source changes — this is deployment-layer and one GUI-config-file only.

---

### Task 1: Compose + env + storage config

**Files:**
- Modify: `docker/compose.yml`
- Modify: `docker/.env`
- Modify: `docker/.env.example`
- Modify: `docker/config/storage.yaml`

**Interfaces:**
- Produces: a compose file that, once images are rebuilt/retagged (Task 4's verification), starts a stack named `scg` on network `scg-net`, with all 9 services referencing `scg/*:latest` images and InfluxDB defaulting to org `scg`.

- [ ] **Step 1: Rename in docker/compose.yml**

Apply each of these exact replacements (all appear verbatim once, except the image tags which appear once each on their own line):

| Old | New |
|---|---|
| `# Mainframe full-stack deployment` (line 1) | `# SCG full-stack deployment` |
| `name: mainframe` (line 10) | `name: scg` |
| `${INFLUX_ORG:-mainframe}` | `${INFLUX_ORG:-scg}` |
| `${INFLUX_TOKEN:-mainframe-influx-token-change-me}` | `${INFLUX_TOKEN:-scg-influx-token-change-me}` |
| `image: mainframe/gateway:latest` | `image: scg/gateway:latest` |
| `image: mainframe/ingest:latest` | `image: scg/ingest:latest` |
| `image: mainframe/chainmon:latest` | `image: scg/chainmon:latest` |
| `image: mainframe/evaluator:latest` | `image: scg/evaluator:latest` |
| `image: mainframe/comparator:latest` | `image: scg/comparator:latest` |
| `image: mainframe/limiter:latest` | `image: scg/limiter:latest` |
| `image: mainframe/simulator:latest` | `image: scg/simulator:latest` |
| `image: mainframe/storage:latest` | `image: scg/storage:latest` |
| `image: mainframe/umacs-tc:latest` | `image: scg/umacs-tc:latest` |
| `image: mainframe/gui:latest` | `image: scg/gui:latest` |
| `name: mainframe-net` (last line) | `name: scg-net` |

- [ ] **Step 2: Rename in docker/.env**

Replace:
```
INFLUX_ORG=mainframe
INFLUX_BUCKET=telemetry
INFLUX_TOKEN=mainframe-influx-token-change-me
```
with:
```
INFLUX_ORG=scg
INFLUX_BUCKET=telemetry
INFLUX_TOKEN=scg-influx-token-change-me
```
(Do not touch the `POSTGRES_USER=scg`/`POSTGRES_DB=scg` lines above — those are already `scg` and unrelated to this rename. Do not touch the commented-out `IAM secrets` block near the bottom — out of scope for this task.)

- [ ] **Step 3: Rename in docker/.env.example**

Same replacement as Step 2, applied to `docker/.env.example`'s identical `INFLUX_ORG`/`INFLUX_TOKEN` lines.

- [ ] **Step 4: Rename in docker/config/storage.yaml**

Replace:
```yaml
  org: mainframe
```
with:
```yaml
  org: scg
```

- [ ] **Step 5: Verify no leftover "mainframe" in these 4 files**

```powershell
Select-String -Path docker/compose.yml, docker/.env, docker/.env.example, docker/config/storage.yaml -Pattern "mainframe" -CaseSensitive:$false
```
Expected: no matches.

- [ ] **Step 6: Commit**

```bash
git add docker/compose.yml docker/.env docker/.env.example docker/config/storage.yaml
git commit -m "chore: rename mainframe->scg in compose, env, and storage config"
```

---

### Task 2: Keycloak realm + APISIX routes

**Files:**
- Modify: `docker/keycloak/realm-export.json`
- Modify: `docker/apisix/apisix.yaml`

**Interfaces:**
- Consumes: nothing from Task 1.
- Produces: a Keycloak realm named `scg` (reachable at `/realms/scg/...` once the container is (re)started with this file), and APISIX routes whose `openid-connect` plugin discovers/validates against that renamed realm. Client IDs, roles, and the seed user are unchanged.

- [ ] **Step 1: Rename the realm in realm-export.json**

In `docker/keycloak/realm-export.json`, replace:
```json
  "realm": "mainframe",
```
with:
```json
  "realm": "scg",
```
(This is the only change to this file — every other field, including both `clients` entries and the `operator` user with its Task-1-added profile fields, stays exactly as-is.)

- [ ] **Step 2: Rename the realm in apisix.yaml's 4 openid-connect blocks**

In `docker/apisix/apisix.yaml`, each of the 4 routes with an `openid-connect` plugin (`gateway-api`, `gateway-restapi`, `simulator`, `umacs`) has these two lines — replace both occurrences of each, in all 4 blocks:
```yaml
        discovery: http://keycloak:8080/realms/mainframe/.well-known/openid-configuration
        realm: mainframe
```
with:
```yaml
        discovery: http://keycloak:8080/realms/scg/.well-known/openid-configuration
        realm: scg
```
(4 occurrences of each line, 8 total line changes. The `spa` and `nats-ws` routes have no `openid-connect` block and are untouched. The trailing `#END` marker must remain the last line of the file — do not disturb it.)

- [ ] **Step 3: Bring up Keycloak fresh and verify the renamed realm**

```powershell
cd docker
docker compose up -d --force-recreate keycloak
Start-Sleep -Seconds 15
(Invoke-RestMethod -Uri "http://localhost:8080/realms/scg/.well-known/openid-configuration").issuer
```
Expected: `http://localhost:8080/realms/scg` (the `KC_HOSTNAME` fix from the earlier login-flow plan still applies — issuer is fixed, just under the new realm name now).

Also confirm the OLD realm path is genuinely gone:
```powershell
try { Invoke-RestMethod -Uri "http://localhost:8080/realms/mainframe/.well-known/openid-configuration" } catch { $_.Exception.Response.StatusCode.value__ }
```
Expected: `404`.

- [ ] **Step 4: Commit**

```bash
git add docker/keycloak/realm-export.json docker/apisix/apisix.yaml
git commit -m "chore: rename Keycloak realm mainframe->scg, update APISIX routes"
```

---

### Task 3: Build/deploy scripts + nats.conf

**Files:**
- Modify: `docker/scripts/1-build.ps1`
- Modify: `docker/scripts/2-save.ps1`
- Modify: `docker/scripts/3-load.ps1`
- Modify: `docker/scripts/4-deploy.ps1`
- Modify: `docker/nats/nats.conf`

**Interfaces:**
- Produces: `1-build.ps1` tags images as `scg/*:latest` (matching Task 1's compose.yml); `2-save.ps1` exports `scg-apps.tar`/`scg-gui.tar` instead of `mainframe-apps.tar`/`mainframe-gui.tar`; console banners in all 4 scripts read "SCG" instead of "Mainframe".

- [ ] **Step 1: Rename in 1-build.ps1**

Replace:
```
#  1-build.ps1 - Build all Mainframe Docker images from source
```
with:
```
#  1-build.ps1 - Build all SCG Docker images from source
```

Replace:
```powershell
    Write-Host "  Mainframe - Docker Image Builder" -ForegroundColor Cyan
```
with:
```powershell
    Write-Host "  SCG - Docker Image Builder" -ForegroundColor Cyan
```

Replace:
```powershell
        Build-Image -Tag "mainframe/${svc}:latest" -Dockerfile $GoFile -Target $svc
```
with:
```powershell
        Build-Image -Tag "scg/${svc}:latest" -Dockerfile $GoFile -Target $svc
```

Replace:
```powershell
    Build-Image -Tag "mainframe/gui:latest" -Dockerfile $GuiFile
```
with:
```powershell
    Build-Image -Tag "scg/gui:latest" -Dockerfile $GuiFile
```

- [ ] **Step 2: Rename in 2-save.ps1**

Replace the header comment block:
```
#    mainframe-apps.tar  - all Go microservice images
#    mainframe-gui.tar   - static Nuxt SPA image (nginx, no proxying)
```
with:
```
#    scg-apps.tar        - all Go microservice images
#    scg-gui.tar          - static Nuxt SPA image (nginx, no proxying)
```

Replace the `$AppImages` array:
```powershell
$AppImages = @(
    "mainframe/gateway:latest",
    "mainframe/ingest:latest",
    "mainframe/chainmon:latest",
    "mainframe/comparator:latest",
    "mainframe/limiter:latest",
    "mainframe/simulator:latest",
    "mainframe/storage:latest",
    "mainframe/umacs-tc:latest"
)
```
with:
```powershell
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
```

Replace:
```powershell
$GuiImages = @(
    "mainframe/gui:latest"
)
```
with:
```powershell
$GuiImages = @(
    "scg/gui:latest"
)
```

Replace:
```powershell
    Write-Host "  Mainframe - Save Images for Offline Transfer" -ForegroundColor Cyan
```
with:
```powershell
    Write-Host "  SCG - Save Images for Offline Transfer" -ForegroundColor Cyan
```

Replace:
```powershell
Write-Host "  Saving app images -> mainframe-apps.tar ..." -ForegroundColor Yellow
docker save $AppImages -o (Join-Path $OutDir "mainframe-apps.tar")
if ($LASTEXITCODE -ne 0) { throw "Failed to save app images" }
Write-Host "  [OK] mainframe-apps.tar" -ForegroundColor Green

Write-Host "  Saving GUI image -> mainframe-gui.tar ..." -ForegroundColor Yellow
docker save $GuiImages -o (Join-Path $OutDir "mainframe-gui.tar")
if ($LASTEXITCODE -ne 0) { throw "Failed to save GUI image" }
Write-Host "  [OK] mainframe-gui.tar" -ForegroundColor Green
```
with:
```powershell
Write-Host "  Saving app images -> scg-apps.tar ..." -ForegroundColor Yellow
docker save $AppImages -o (Join-Path $OutDir "scg-apps.tar")
if ($LASTEXITCODE -ne 0) { throw "Failed to save app images" }
Write-Host "  [OK] scg-apps.tar" -ForegroundColor Green

Write-Host "  Saving GUI image -> scg-gui.tar ..." -ForegroundColor Yellow
docker save $GuiImages -o (Join-Path $OutDir "scg-gui.tar")
if ($LASTEXITCODE -ne 0) { throw "Failed to save GUI image" }
Write-Host "  [OK] scg-gui.tar" -ForegroundColor Green
```

- [ ] **Step 3: Rename in 3-load.ps1**

Replace:
```powershell
    Write-Host "  Mainframe - Load Images on Offline PC" -ForegroundColor Cyan
```
with:
```powershell
    Write-Host "  SCG - Load Images on Offline PC" -ForegroundColor Cyan
```
(No other change needed — this script globs `*.tar` generically and doesn't hardcode filenames.)

- [ ] **Step 4: Rename in 4-deploy.ps1**

Replace:
```
#  4-deploy.ps1 - Start, stop, or inspect the Mainframe stack
```
with:
```
#  4-deploy.ps1 - Start, stop, or inspect the SCG stack
```

Replace:
```powershell
    Write-Host "  Mainframe - Deployment Manager" -ForegroundColor Cyan
```
with:
```powershell
    Write-Host "  SCG - Deployment Manager" -ForegroundColor Cyan
```

Replace:
```powershell
    Write-Host "  Stopping Mainframe stack..." -ForegroundColor Yellow
```
with:
```powershell
    Write-Host "  Stopping SCG stack..." -ForegroundColor Yellow
```

Replace:
```powershell
    Write-Host "  Restarting Mainframe stack..." -ForegroundColor Yellow
```
with:
```powershell
    Write-Host "  Restarting SCG stack..." -ForegroundColor Yellow
```

Replace:
```powershell
Write-Host "  Starting Mainframe stack..." -ForegroundColor Yellow
```
with:
```powershell
Write-Host "  Starting SCG stack..." -ForegroundColor Yellow
```

- [ ] **Step 5: Rename in nats.conf**

Replace:
```
# NATS Server configuration for Mainframe deployment
```
with:
```
# NATS Server configuration for SCG deployment
```

- [ ] **Step 6: Verify no leftover "mainframe" in these 5 files**

```powershell
Select-String -Path docker/scripts/1-build.ps1, docker/scripts/2-save.ps1, docker/scripts/3-load.ps1, docker/scripts/4-deploy.ps1, docker/nats/nats.conf -Pattern "mainframe" -CaseSensitive:$false
```
Expected: no matches.

- [ ] **Step 7: Commit**

```bash
git add docker/scripts/1-build.ps1 docker/scripts/2-save.ps1 docker/scripts/3-load.ps1 docker/scripts/4-deploy.ps1 docker/nats/nats.conf
git commit -m "chore: rename mainframe->SCG in build/deploy scripts and nats.conf comment"
```

---

### Task 4: GUI config + full-stack verification

**Files:**
- Modify: `GUI/nuxt.config.ts`

**Interfaces:**
- Consumes: Task 2's renamed Keycloak realm (`scg`) — the GUI's `keycloakRealm` config must match it exactly or login breaks.
- Produces: a fully renamed, verified stack — this task's verification step is the final proof the whole rename works end-to-end.

- [ ] **Step 1: Rename in nuxt.config.ts**

Replace:
```ts
      keycloakRealm:    'mainframe',
```
with:
```ts
      keycloakRealm:    'scg',
```

Replace:
```ts
        name: 'Mainframe GUI',
```
with:
```ts
        name: 'SCG GUI',
```

(Do NOT touch the two `D:/code/Code/Mainframe/MainframeAutomation/...` paths in the Vite `fs.allow` array a few lines above — those are the real on-disk folder name, unrelated to this rename.)

- [ ] **Step 2: Verify no leftover "mainframe" in nuxt.config.ts's renamed fields**

```powershell
Select-String -Path GUI/nuxt.config.ts -Pattern "keycloakRealm.*mainframe|name:\s*'Mainframe GUI'"
```
Expected: no matches. (This deliberately does NOT search for bare "mainframe" — the `fs.allow` filesystem paths legitimately still contain it.)

- [ ] **Step 3: Rebuild/retag images under the new scg/* names**

The stack cannot start until local images exist under the new tags. Fastest path — retag the existing `mainframe/*`-tagged local images rather than a full rebuild, if they exist:

```powershell
$services = @("gateway","ingest","chainmon","evaluator","comparator","limiter","simulator","storage","umacs-tc","gui")
foreach ($svc in $services) {
    $old = "mainframe/${svc}:latest"
    $new = "scg/${svc}:latest"
    if (docker image inspect $old 2>$null) {
        docker tag $old $new
        Write-Host "Tagged $new"
    } else {
        Write-Host "No local image $old - will need a fresh build via .\scripts\1-build.ps1 -Services $svc"
    }
}
```
For any service reported as needing a fresh build, run `.\scripts\1-build.ps1 -Services <name>` from `docker/`.

- [ ] **Step 4: Bring up the full renamed stack**

```powershell
cd docker
docker compose down
docker compose up -d
Start-Sleep -Seconds 15
docker compose ps
```
Expected: containers come up under the `scg` compose project (check with `docker compose ls` — project name should read `scg`, not `mainframe`), no image-not-found errors.

- [ ] **Step 5: End-to-end auth verification under the new realm**

```powershell
# Unauthenticated request should still be rejected
try {
    Invoke-WebRequest -Uri "http://localhost/api/go/v1/chain-status" -UseBasicParsing
} catch {
    $_.Exception.Response.StatusCode.value__
}
```
Expected: `401`.

```powershell
# Authenticated request against the renamed realm should succeed
$resp = Invoke-RestMethod -Method Post -Uri "http://localhost:8080/realms/scg/protocol/openid-connect/token" -Body @{
    client_id  = "tm-tc-spa"
    grant_type = "password"
    username   = "operator"
    password   = "Operator@123!"
}
$token = $resp.access_token
(Invoke-WebRequest -Uri "http://localhost/api/go/v1/chain-status" -Headers @{ Authorization = "Bearer $token" } -UseBasicParsing).StatusCode
```
Expected: `200`.

- [ ] **Step 6: Commit**

```bash
git add GUI/nuxt.config.ts
git commit -m "chore: rename mainframe->SCG in GUI runtime config and PWA app name"
```
