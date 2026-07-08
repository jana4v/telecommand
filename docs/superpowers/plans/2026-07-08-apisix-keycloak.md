# APISIX + Keycloak Ingress/Auth Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace nginx as the stack's public ingress with Apache APISIX, and replace the custom Go `iam` service's login with Keycloak as identity provider, with APISIX enforcing Keycloak-token auth on API routes.

**Architecture:** APISIX (declarative/standalone mode, no etcd) becomes the single published port. It routes `/` to an internal-only static-file server (the existing Nuxt build, trimmed down from a full nginx reverse proxy to a plain static vhost) and routes `/api/*`, `/restApi/*`, `/simulator/*`, `/umacs/*` to the existing Go services, protected by APISIX's `openid-connect` plugin validating Keycloak-issued bearer tokens. Keycloak runs in dev mode with a realm auto-imported from a checked-in JSON file. The `iam` service and its config are removed from the deployed stack (Go source untouched).

**Tech Stack:** Docker Compose, Apache APISIX 3.9 (standalone/YAML config provider, no etcd), Keycloak 26 (`start-dev --import-realm`), existing nginx-based static build for the SPA.

## Global Constraints

- No changes to any Go source under `GoLang/` — this is a deployment-layer-only change.
- No TLS/production hardening — dev-mode HTTP throughout, consistent with the rest of `docker/compose.yml` today.
- Full path prefixes (`/api/go/v1/...`, `/simulator/...`, `/umacs/...`) must reach backend services unmodified — today's nginx `proxy_pass http://gateway:21000;` (no path in the proxy_pass URI) forwards the original URI as-is, and APISIX routes must preserve that behavior (no `uri` rewriting/stripping).
- Every new/changed compose service keeps the existing file's conventions: `restart: unless-stopped`, comment-banner section headers, `${VAR:-default}` env-var style.

---

### Task 1: Keycloak service with auto-imported realm

**Files:**
- Create: `docker/keycloak/realm-export.json`
- Modify: `docker/compose.yml` (add `keycloak` service)
- Modify: `docker/.env.example` (add Keycloak admin credentials)

**Interfaces:**
- Produces: a running Keycloak reachable at `http://keycloak:8080` inside `mainframe-net`, with realm `mainframe` containing:
  - client `tm-tc-spa` (public, Authorization Code + PKCE, `directAccessGrantsEnabled: true` so later tasks can obtain a test token via the password grant without a browser)
  - client `apisix-introspection` (confidential, bearer-only, secret `apisix-introspection-secret-change-me` — consumed by Task 4)
  - realm role `tm-tc-user`
  - seed user `operator` / `Operator@123!` with role `tm-tc-user`
  - discovery document at `http://keycloak:8080/realms/mainframe/.well-known/openid-configuration` (consumed by Task 4)

- [ ] **Step 1: Write the realm export file**

Create `docker/keycloak/realm-export.json`:

```json
{
  "realm": "mainframe",
  "enabled": true,
  "sslRequired": "none",
  "roles": {
    "realm": [
      { "name": "tm-tc-user", "description": "Standard TM/TC application user" }
    ]
  },
  "clients": [
    {
      "clientId": "tm-tc-spa",
      "name": "TM-TC SPA",
      "protocol": "openid-connect",
      "publicClient": true,
      "standardFlowEnabled": true,
      "directAccessGrantsEnabled": true,
      "redirectUris": ["*"],
      "webOrigins": ["*"],
      "attributes": {
        "pkce.code.challenge.method": "S256"
      }
    },
    {
      "clientId": "apisix-introspection",
      "name": "APISIX Token Introspection",
      "protocol": "openid-connect",
      "publicClient": false,
      "bearerOnly": true,
      "standardFlowEnabled": false,
      "directAccessGrantsEnabled": false,
      "secret": "apisix-introspection-secret-change-me"
    }
  ],
  "users": [
    {
      "username": "operator",
      "enabled": true,
      "credentials": [
        { "type": "password", "value": "Operator@123!", "temporary": false }
      ],
      "realmRoles": ["tm-tc-user"]
    }
  ]
}
```

- [ ] **Step 2: Add the Keycloak service to compose.yml**

In `docker/compose.yml`, insert a new `keycloak` service in the "Infrastructure" section, right after the `influxdb` block (before the "Go microservices" section header at line 80):

```yaml
  keycloak:
    image: quay.io/keycloak/keycloak:26.0
    command: ["start-dev", "--import-realm"]
    environment:
      KEYCLOAK_ADMIN:          ${KEYCLOAK_ADMIN:-admin}
      KEYCLOAK_ADMIN_PASSWORD: ${KEYCLOAK_ADMIN_PASSWORD:-Admin@123!}
    volumes:
      - ./keycloak/realm-export.json:/opt/keycloak/data/import/realm.json:ro
    restart: unless-stopped
```

- [ ] **Step 3: Add Keycloak env vars to .env.example**

Append to `docker/.env.example`:

```
# --------------------------------------------------
# Keycloak — CHANGE before production use
# --------------------------------------------------
KEYCLOAK_ADMIN=admin
KEYCLOAK_ADMIN_PASSWORD=Admin@123!
```

- [ ] **Step 4: Bring up Keycloak and verify the realm imported**

Run (PowerShell, from `docker/`):

```powershell
docker compose up -d keycloak
```

Wait ~20s for dev-mode boot, then check the logs for the import confirmation:

```powershell
docker compose logs keycloak | Select-String "Imported realm"
```

Expected: a line containing `Imported realm mainframe`.

Then verify the discovery document is served:

```powershell
Invoke-RestMethod -Uri "http://localhost:8080/realms/mainframe/.well-known/openid-configuration" | Select-Object issuer
```

Expected: `issuer` is `http://localhost:8080/realms/mainframe` (no error).

- [ ] **Step 5: Commit**

```bash
git add docker/keycloak/realm-export.json docker/compose.yml docker/.env.example
git commit -m "feat: add Keycloak service with auto-imported mainframe realm"
```

---

### Task 2: Static-only SPA service (strip nginx down from reverse proxy)

**Files:**
- Modify: `docker/nginx/default.conf` (strip all proxy `location` blocks, keep only static serving)
- Modify: `docker/compose.yml` (rename `gui` service to `spa`, drop published port and `depends_on`)

**Interfaces:**
- Produces: a `spa` container (image `mainframe/gui:latest`, unchanged build) reachable at `http://spa:80` inside `mainframe-net`, serving the built Nuxt SPA with client-side routing and asset caching, and nothing else — no `/api`, `/iam`, `/simulator`, `/umacs`, `/nats`, `/restApi` locations.

- [ ] **Step 1: Strip default.conf to static-only**

Replace the full contents of `docker/nginx/default.conf` with:

```nginx
server {
    listen 80;
    server_name _;

    root /usr/share/nginx/html;
    index index.html;

    # -------------------------------------------------------------------------
    # Nuxt SPA — serve index.html for all unmatched paths (client-side routing)
    # -------------------------------------------------------------------------
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Aggressive caching for hashed JS/CSS assets
    location ~* \.(js|css|woff2?|ttf|eot|svg|png|jpg|webp|ico)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
        try_files $uri =404;
    }
}
```

- [ ] **Step 2: Rename the gui service to spa in compose.yml**

In `docker/compose.yml`, replace:

```yaml
  gui:
    image: mainframe/gui:latest
    ports:
      - "${GUI_PORT:-80}:80"
    depends_on:
      - gateway
      - iam
      - simulator
    restart: unless-stopped
```

with:

```yaml
  spa:
    image: mainframe/gui:latest
    restart: unless-stopped
```

Also update the section comment directly above it (currently `# Frontend — nginx serves the Nuxt SPA + reverse-proxies to backend services`) to:

```yaml
  # ---------------------------------------------------------------------------
  # Frontend — static-only nginx serving the built Nuxt SPA (no proxying;
  # APISIX is the reverse proxy / ingress — see the apisix service)
  # ---------------------------------------------------------------------------
```

- [ ] **Step 3: Rebuild the image and verify it serves static content only**

```powershell
cd docker
docker compose build spa
docker compose up -d spa
```

Verify from inside the compose network (no host port is published for `spa` by design):

```powershell
docker run --rm --network mainframe-net curlimages/curl:8.10.1 curl -sf -o NUL -w "%{http_code}" http://spa/
```

Expected: `200`.

Verify the old proxy routes are gone:

```powershell
docker run --rm --network mainframe-net curlimages/curl:8.10.1 curl -s -o NUL -w "%{http_code}" http://spa/api/go/v1/chain-status
```

Expected: `200` (nginx serves `index.html` via SPA fallback — the SPA no longer proxies `/api`, so this is expected client-routing behavior, not an API response).

- [ ] **Step 4: Commit**

```bash
git add docker/nginx/default.conf docker/compose.yml
git commit -m "refactor: strip nginx down to static-only SPA server, rename gui to spa"
```

---

### Task 3: APISIX ingress with declarative routing (no auth yet)

**Files:**
- Create: `docker/apisix/config.yaml`
- Create: `docker/apisix/apisix.yaml`
- Modify: `docker/compose.yml` (add `apisix` service, publish `${GUI_PORT:-80}`)

**Interfaces:**
- Consumes: `spa:80` (Task 2), `gateway:21000`, `simulator:21001`, `umacs-tc:21002`, `nats:4223` (all pre-existing).
- Produces: the stack's single public ingress on `${GUI_PORT:-80}`, routing `/` to `spa`, `/api/*` and `/restApi/*` to `gateway`, `/simulator/*` to `simulator`, `/umacs/*` to `umacs-tc`, `/nats*` (websocket) to `nats`.

- [ ] **Step 1: Write the APISIX standalone-mode config**

Create `docker/apisix/config.yaml`:

```yaml
deployment:
  role: data_plane
  role_data_plane:
    config_provider: yaml

apisix:
  node_listen: 9080

nginx_config:
  http:
    client_max_body_size: 200m
```

- [ ] **Step 2: Write the declarative routes file**

Create `docker/apisix/apisix.yaml`:

```yaml
routes:
  - id: spa
    uri: /*
    upstream:
      type: roundrobin
      nodes:
        "spa:80": 1

  - id: gateway-api
    uri: /api/*
    upstream:
      type: roundrobin
      nodes:
        "gateway:21000": 1

  - id: gateway-restapi
    uri: /restApi/*
    upstream:
      type: roundrobin
      nodes:
        "gateway:21000": 1

  - id: simulator
    uri: /simulator/*
    upstream:
      type: roundrobin
      nodes:
        "simulator:21001": 1

  - id: umacs
    uri: /umacs/*
    upstream:
      type: roundrobin
      nodes:
        "umacs-tc:21002": 1

  - id: nats-ws
    uri: /nats*
    enable_websocket: true
    upstream:
      type: roundrobin
      nodes:
        "nats:4223": 1

#END
```

The trailing `#END` marker is required by APISIX's YAML config provider (it hashes the file up to that marker to detect changes) — omitting it means edits to this file are silently ignored.

- [ ] **Step 3: Add the apisix service to compose.yml**

In `docker/compose.yml`, replace the "Frontend" section (the `spa` service from Task 2) with the `apisix` service placed before it, so the file reads:

```yaml
  # ---------------------------------------------------------------------------
  # Ingress — APISIX is the single public entrypoint: static SPA + API routing
  # ---------------------------------------------------------------------------

  apisix:
    image: apache/apisix:3.9.1-debian
    volumes:
      - ./apisix/config.yaml:/usr/local/apisix/conf/config.yaml:ro
      - ./apisix/apisix.yaml:/usr/local/apisix/conf/apisix.yaml:ro
    ports:
      - "${GUI_PORT:-80}:9080"
    depends_on:
      - spa
      - gateway
      - simulator
      - umacs-tc
    restart: unless-stopped

  # ---------------------------------------------------------------------------
  # Frontend — static-only nginx serving the built Nuxt SPA (no proxying;
  # APISIX is the reverse proxy / ingress — see the apisix service above)
  # ---------------------------------------------------------------------------

  spa:
    image: mainframe/gui:latest
    restart: unless-stopped
```

- [ ] **Step 4: Bring up the full stack and verify routing end-to-end**

```powershell
cd docker
docker compose up -d
Start-Sleep -Seconds 5
```

SPA through APISIX:

```powershell
(Invoke-WebRequest -Uri "http://localhost/" -UseBasicParsing).StatusCode
```
Expected: `200`.

Gateway API through APISIX (same path nginx used to forward verbatim):

```powershell
(Invoke-WebRequest -Uri "http://localhost/api/go/v1/chain-status" -UseBasicParsing).StatusCode
```
Expected: `200` (matches whatever `gateway` itself returns for this route today — no 404/502 from APISIX).

Simulator and UMACS routes reachable (any non-502/504 status confirms APISIX is proxying, not the gateway's own routing):

```powershell
(Invoke-WebRequest -Uri "http://localhost/simulator/" -UseBasicParsing -SkipHttpErrorCheck).StatusCode
(Invoke-WebRequest -Uri "http://localhost/umacs/" -UseBasicParsing -SkipHttpErrorCheck).StatusCode
```
Expected: neither is `502` or `504`.

- [ ] **Step 5: Commit**

```bash
git add docker/apisix/config.yaml docker/apisix/apisix.yaml docker/compose.yml
git commit -m "feat: add APISIX as declarative ingress routing to spa and backend services"
```

---

### Task 4: Enforce Keycloak auth on API routes

**Files:**
- Modify: `docker/apisix/apisix.yaml` (add `openid-connect` plugin to the 4 backend routes)

**Interfaces:**
- Consumes: `apisix-introspection` client + `mainframe` realm discovery document (Task 1).
- Produces: `/api/*`, `/restApi/*`, `/simulator/*`, `/umacs/*` now reject unauthenticated requests with `401`; `/` and `/nats*` remain unauthenticated.

- [ ] **Step 1: Verify current (pre-auth) behavior is open — this should still return 200**

```powershell
(Invoke-WebRequest -Uri "http://localhost/api/go/v1/chain-status" -UseBasicParsing).StatusCode
```
Expected: `200` (no auth enforced yet — confirms the baseline this task changes).

- [ ] **Step 2: Add the openid-connect plugin to the 4 protected routes**

In `docker/apisix/apisix.yaml`, add a `plugins` block to each of `gateway-api`, `gateway-restapi`, `simulator`, and `umacs` (not `spa`, not `nats-ws`). Example for `gateway-api` (repeat identically for the other three, only the route `id`/`uri`/`upstream` differ):

```yaml
  - id: gateway-api
    uri: /api/*
    plugins:
      openid-connect:
        client_id: apisix-introspection
        client_secret: apisix-introspection-secret-change-me
        discovery: http://keycloak:8080/realms/mainframe/.well-known/openid-configuration
        bearer_only: true
        realm: mainframe
    upstream:
      type: roundrobin
      nodes:
        "gateway:21000": 1
```

The full file after this step:

```yaml
routes:
  - id: spa
    uri: /*
    upstream:
      type: roundrobin
      nodes:
        "spa:80": 1

  - id: gateway-api
    uri: /api/*
    plugins:
      openid-connect:
        client_id: apisix-introspection
        client_secret: apisix-introspection-secret-change-me
        discovery: http://keycloak:8080/realms/mainframe/.well-known/openid-configuration
        bearer_only: true
        realm: mainframe
    upstream:
      type: roundrobin
      nodes:
        "gateway:21000": 1

  - id: gateway-restapi
    uri: /restApi/*
    plugins:
      openid-connect:
        client_id: apisix-introspection
        client_secret: apisix-introspection-secret-change-me
        discovery: http://keycloak:8080/realms/mainframe/.well-known/openid-configuration
        bearer_only: true
        realm: mainframe
    upstream:
      type: roundrobin
      nodes:
        "gateway:21000": 1

  - id: simulator
    uri: /simulator/*
    plugins:
      openid-connect:
        client_id: apisix-introspection
        client_secret: apisix-introspection-secret-change-me
        discovery: http://keycloak:8080/realms/mainframe/.well-known/openid-configuration
        bearer_only: true
        realm: mainframe
    upstream:
      type: roundrobin
      nodes:
        "simulator:21001": 1

  - id: umacs
    uri: /umacs/*
    plugins:
      openid-connect:
        client_id: apisix-introspection
        client_secret: apisix-introspection-secret-change-me
        discovery: http://keycloak:8080/realms/mainframe/.well-known/openid-configuration
        bearer_only: true
        realm: mainframe
    upstream:
      type: roundrobin
      nodes:
        "umacs-tc:21002": 1

  - id: nats-ws
    uri: /nats*
    enable_websocket: true
    upstream:
      type: roundrobin
      nodes:
        "nats:4223": 1

#END
```

- [ ] **Step 3: Reload APISIX and verify unauthenticated requests are now rejected**

APISIX's YAML config provider polls the file for changes, but to make the test deterministic, restart the container:

```powershell
docker compose restart apisix
Start-Sleep -Seconds 3
```

```powershell
try {
    Invoke-WebRequest -Uri "http://localhost/api/go/v1/chain-status" -UseBasicParsing
} catch {
    $_.Exception.Response.StatusCode.value__
}
```
Expected: `401`.

- [ ] **Step 4: Obtain a token from Keycloak and verify authenticated requests succeed**

```powershell
$resp = Invoke-RestMethod -Method Post -Uri "http://localhost:8080/realms/mainframe/protocol/openid-connect/token" -Body @{
    client_id  = "tm-tc-spa"
    grant_type = "password"
    username   = "operator"
    password   = "Operator@123!"
}
$token = $resp.access_token

(Invoke-WebRequest -Uri "http://localhost/api/go/v1/chain-status" -Headers @{ Authorization = "Bearer $token" } -UseBasicParsing).StatusCode
```
Expected: `200`.

Also confirm `/` is still unauthenticated (no regression from this task):

```powershell
(Invoke-WebRequest -Uri "http://localhost/" -UseBasicParsing).StatusCode
```
Expected: `200`.

- [ ] **Step 5: Commit**

```bash
git add docker/apisix/apisix.yaml
git commit -m "feat: enforce Keycloak bearer-token auth on API routes via APISIX openid-connect plugin"
```

---

### Task 5: Remove the iam service from the deployed stack

**Files:**
- Modify: `docker/compose.yml` (remove `iam` service, drop it from `gateway`'s `depends_on`)
- Delete: `docker/config/iam.yaml`
- Modify: `docker/scripts/1-build.ps1` (drop `iam` from the default Go service build list)

**Interfaces:**
- Produces: a full stack with no `iam` container; `GoLang/iam` source is untouched and still buildable manually via `docker compose build` with an explicit target if ever needed, just not part of the default build/deploy path.

- [ ] **Step 1: Remove the iam service and its dependency edge from compose.yml**

In `docker/compose.yml`, delete the entire `iam` service block:

```yaml
  iam:
    image: mainframe/iam:latest
    volumes:
      - ./config/iam.yaml:/config.yaml:ro
    # gateway uses positional arg (os.Args[1]) not --config flag
    command: ["/config.yaml"]
    depends_on:
      postgres: { condition: service_healthy }
    restart: unless-stopped
```

And in the `gateway` service, remove the `iam: { condition: service_started }` line so `depends_on` reads:

```yaml
  gateway:
    image: mainframe/gateway:latest
    volumes:
      - ./config/gateway.yaml:/config.yaml:ro
    # gateway uses positional arg (os.Args[1]) not --config flag
    command: ["/config.yaml"]
    depends_on:
      postgres: { condition: service_healthy }
      redis:    { condition: service_healthy }
    restart: unless-stopped
```

- [ ] **Step 2: Delete the iam config file**

```bash
git rm docker/config/iam.yaml
```

- [ ] **Step 3: Drop iam from the default build list**

In `docker/scripts/1-build.ps1`, change:

```powershell
$GoServices = @(
    "gateway", "iam", "ingest", "chainmon", "comparator",
    "limiter", "simulator", "storage", "umacs-tc"
)
```

to:

```powershell
$GoServices = @(
    "gateway", "ingest", "chainmon", "comparator",
    "limiter", "simulator", "storage", "umacs-tc"
)
```

- [ ] **Step 4: Bring up the full stack from a clean state and verify no iam container exists**

```powershell
cd docker
docker compose down
docker compose up -d
Start-Sleep -Seconds 10
docker compose ps
```

Expected: the service list includes `postgres`, `redis`, `nats`, `keycloak`, `apisix`, `spa`, `gateway`, `ingest`, `chainmon`, `evaluator`, `comparator`, `limiter`, `simulator`, `umacs-tc` — no `iam`.

Re-run the Task 4 authenticated-request check to confirm the end-to-end flow still works with `iam` gone:

```powershell
$resp = Invoke-RestMethod -Method Post -Uri "http://localhost:8080/realms/mainframe/protocol/openid-connect/token" -Body @{
    client_id  = "tm-tc-spa"
    grant_type = "password"
    username   = "operator"
    password   = "Operator@123!"
}
$token = $resp.access_token
(Invoke-WebRequest -Uri "http://localhost/api/go/v1/chain-status" -Headers @{ Authorization = "Bearer $token" } -UseBasicParsing).StatusCode
```
Expected: `200`.

- [ ] **Step 5: Commit**

```bash
git add docker/compose.yml docker/scripts/1-build.ps1
git commit -m "chore: remove iam service from deployed stack (Keycloak now issues auth tokens)"
```

---

## Post-plan note (not a task — for the user, not the implementer)

Real browser login (Nuxt SPA redirecting to Keycloak for Authorization Code + PKCE, storing/refreshing the resulting token, attaching it to `$fetch` calls) is explicitly out of scope per the design doc — this plan only makes the *infrastructure* enforce and validate Keycloak tokens. The SPA still needs its own OIDC client integration to actually log users in; today's tests exercise that path via the password grant (`tm-tc-spa`'s `directAccessGrantsEnabled`), which is a stand-in for a real login UI, not a substitute for one.
