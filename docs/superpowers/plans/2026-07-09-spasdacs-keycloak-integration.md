# SPASDACS Keycloak/API/Deployment Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace SPASDACS's dead custom-IAM login with Keycloak, attach the resulting bearer token to its existing API calls (currently none carry one), and deploy it behind APISIX at `/spasdacs/*` alongside the existing `GUI/` SPA.

**Architecture:** A new `oidc-client-ts`-based auth module (mirroring `GUI/`'s pattern, adapted for plain Vue Router/hash history) replaces `SpasdacsOpensource/src/services/auth.ts`, preserving its exact public interface so the 3 files that already consume `useAuth()` (`DiagramList.vue`, `ViewerPage.vue`, `router/index.ts`) need minimal or no changes. A `window.fetch` override (this app has no Nuxt-style `$fetch`) attaches the bearer token to same-origin API calls with zero edits to the files that call `fetch()` for data. SPASDACS is containerized the same way as `GUI/`'s `spa` service and exposed through a new APISIX route.

**Tech Stack:** Vue 3, Vue Router 4 (hash history), Vite, `oidc-client-ts`, nginx, APISIX, Keycloak.

## Global Constraints

- Preserve `useAuth()`'s consumed interface exactly: `isLoggedIn`, `user`, `login()`, `logout()`, `hasAnyRole()`, `restoreSession()` — these are called from `DiagramList.vue`, `ViewerPage.vue`, and `router/index.ts`, none of which are otherwise touched by this plan.
- No changes to SPASDACS's diagram/editor/viewer feature logic, X6 canvas code, or telemetry/NATS handling.
- No changes to `GoLang/gateway` — its `/diagrams` routes already exist and already match what SPASDACS expects.
- No production TLS/hardening — same dev-mode posture as the rest of this stack.
- Match existing code conventions in each file touched.

---

### Task 1: Keycloak realm — roles, client, role assignment

**Files:**
- Modify: `docker/keycloak/realm-export.json`

**Interfaces:**
- Produces: realm `scg` now has 4 roles (`viewer`, `operator`, `admin`, `super_admin`), a new public PKCE client `spasdacs-spa`, and the existing `operator` user holds the `operator` role in addition to `tm-tc-user`.

- [ ] **Step 1: Add the 3 new roles and a new client**

In `docker/keycloak/realm-export.json`, replace:
```json
  "roles": {
    "realm": [
      { "name": "tm-tc-user", "description": "Standard TM/TC application user" }
    ]
  },
  "clients": [
    {
      "clientId": "tm-tc-spa",
```
with:
```json
  "roles": {
    "realm": [
      { "name": "tm-tc-user", "description": "Standard TM/TC application user" },
      { "name": "viewer", "description": "SPASDACS read-only diagram access" },
      { "name": "operator", "description": "SPASDACS diagram edit access" },
      { "name": "admin", "description": "SPASDACS diagram edit access (admin tier)" },
      { "name": "super_admin", "description": "SPASDACS diagram edit access (super-admin tier)" }
    ]
  },
  "clients": [
    {
      "clientId": "spasdacs-spa",
      "name": "SPASDACS SPA",
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
      "clientId": "tm-tc-spa",
```

- [ ] **Step 2: Assign the operator role to the operator user**

Replace:
```json
      "realmRoles": ["tm-tc-user"]
```
with:
```json
      "realmRoles": ["tm-tc-user", "operator"]
```

- [ ] **Step 3: Verify**

```powershell
cd docker
docker compose up -d --force-recreate keycloak
Start-Sleep -Seconds 15

$resp = Invoke-RestMethod -Method Post -Uri "http://localhost:8080/realms/scg/protocol/openid-connect/token" -Body @{
    client_id = "spasdacs-spa"; grant_type = "password"; username = "operator"; password = "Operator@123!"
}
$payload = $resp.access_token.Split('.')[1]
$payload += '=' * ((4 - $payload.Length % 4) % 4)
$claims = [System.Text.Encoding]::UTF8.GetString([Convert]::FromBase64String($payload.Replace('-','+').Replace('_','/'))) | ConvertFrom-Json
$claims.realm_access.roles
```
Expected: a token is issued via the new `spasdacs-spa` client, and `realm_access.roles` includes both `tm-tc-user` and `operator`.

- [ ] **Step 4: Commit**

```bash
git add docker/keycloak/realm-export.json
git commit -m "feat(keycloak): add SPASDACS roles, spasdacs-spa client, assign operator role"
```

---

### Task 2: SPASDACS Keycloak login

**Files:**
- Modify: `SpasdacsOpensource/package.json` (add `oidc-client-ts`)
- Modify: `SpasdacsOpensource/src/services/auth.ts` (full rewrite)
- Modify: `SpasdacsOpensource/src/router/index.ts` (guard becomes async)
- Modify: `SpasdacsOpensource/src/pages/LoginPage.vue` (becomes a redirect trigger)
- Modify: `SpasdacsOpensource/src/main.ts` (handle the OIDC callback before mounting)

**Interfaces:**
- Consumes: Task 1's `spasdacs-spa` client and realm roles.
- Produces: `useAuth()` exporting `isLoggedIn`, `user`, `accessToken` (new — consumed by Task 3), `login(returnPath?)`, `logout()`, `hasAnyRole()`, `restoreSession()`; a module-level exported `handleAuthCallback()` used only by `main.ts`.

- [ ] **Step 1: Add the oidc-client-ts dependency**

In `SpasdacsOpensource/package.json`, in `"dependencies"`, insert alphabetically after `"nats.ws": "^1.30.2",`:
```json
    "oidc-client-ts": "^3.1.0",
```

Run from `SpasdacsOpensource/`:
```powershell
npm install --legacy-peer-deps
```

- [ ] **Step 2: Rewrite auth.ts**

Replace the entire contents of `SpasdacsOpensource/src/services/auth.ts` with:
```ts
import { reactive } from "vue";
import { UserManager, WebStorageStateStore, type User } from "oidc-client-ts";

export type RoleName = "super_admin" | "admin" | "operator" | "viewer" | string;

export interface AuthUser {
  id?: string;
  username?: string;
  full_name?: string;
  email?: string;
  roles?: RoleName[];
}

const KEYCLOAK_URL = (import.meta.env.VITE_KEYCLOAK_URL as string | undefined) ?? "http://localhost:8080";
const KEYCLOAK_REALM = (import.meta.env.VITE_KEYCLOAK_REALM as string | undefined) ?? "scg";
const KEYCLOAK_CLIENT_ID = (import.meta.env.VITE_KEYCLOAK_CLIENT_ID as string | undefined) ?? "spasdacs-spa";

function redirectUri(): string {
  return `${window.location.origin}/spasdacs/`;
}

export const userManager = new UserManager({
  authority: `${KEYCLOAK_URL}/realms/${KEYCLOAK_REALM}`,
  client_id: KEYCLOAK_CLIENT_ID,
  redirect_uri: redirectUri(),
  post_logout_redirect_uri: redirectUri(),
  response_type: "code",
  scope: "openid profile email",
  userStore: new WebStorageStateStore({ store: window.sessionStorage }),
  automaticSilentRenew: true,
});

function rolesOf(u: User): RoleName[] {
  const access = u.profile as unknown as { realm_access?: { roles?: string[] } };
  return access?.realm_access?.roles ?? [];
}

function toAuthUser(u: User): AuthUser {
  return {
    id: u.profile.sub,
    username: (u.profile.preferred_username as string | undefined) ?? u.profile.sub,
    full_name: u.profile.name as string | undefined,
    email: u.profile.email as string | undefined,
    roles: rolesOf(u),
  };
}

const state = reactive<{ oidcUser: User | null }>({ oidcUser: null });

userManager.events.addUserLoaded((u) => { state.oidcUser = u; });
userManager.events.addUserUnloaded(() => { state.oidcUser = null; });
userManager.events.addSilentRenewError((err) => {
  console.error("[Auth] Silent renew failed:", err);
});

let restorePromise: Promise<void> | null = null;

async function doRestore(): Promise<void> {
  const u = await userManager.getUser();
  if (u && !u.expired) state.oidcUser = u;
}

export function useAuth() {
  function restoreSession(): Promise<void> {
    if (!restorePromise) restorePromise = doRestore();
    return restorePromise;
  }

  async function login(returnPath?: string) {
    await userManager.signinRedirect({
      state: { returnPath: returnPath ?? (window.location.hash.replace(/^#/, "") || "/") },
    });
  }

  async function logout() {
    await userManager.signoutRedirect();
  }

  function hasAnyRole(roles: RoleName[]) {
    const userRoles = state.oidcUser ? rolesOf(state.oidcUser) : [];
    return roles.some((r) => userRoles.includes(r));
  }

  return {
    get isLoggedIn() {
      return Boolean(state.oidcUser && !state.oidcUser.expired);
    },
    get user() {
      return state.oidcUser ? toAuthUser(state.oidcUser) : null;
    },
    get accessToken() {
      return state.oidcUser?.access_token ?? "";
    },
    restoreSession,
    login,
    logout,
    hasAnyRole,
  };
}

/** Called once from main.ts when the page loads with an OIDC `code`/`state` in the query string. */
export async function handleAuthCallback(): Promise<string> {
  const result = await userManager.signinRedirectCallback();
  const u = await userManager.getUser();
  if (u) state.oidcUser = u;
  const returnState = result.state as { returnPath?: string } | undefined;
  return returnState?.returnPath ?? "/";
}
```

- [ ] **Step 3: Make the router guard async**

In `SpasdacsOpensource/src/router/index.ts`, replace:
```ts
router.beforeEach((to) => {
  const auth = useAuth();
  auth.restoreSession();
```
with:
```ts
router.beforeEach(async (to) => {
  const auth = useAuth();
  await auth.restoreSession();
```
No other lines in this file change — the rest of the guard's logic (`meta.public`, `meta.requireAuth`, `meta.roles`, `hasAnyRole()`) is unchanged; it was already compatible with an async guard function, it just needs `restoreSession()` to be awaited now that it's asynchronous (oidc-client-ts's session store is Promise-based, unlike the old synchronous `localStorage` read).

- [ ] **Step 4: Turn LoginPage.vue into a redirect trigger**

Replace the entire contents of `SpasdacsOpensource/src/pages/LoginPage.vue` with:
```vue
<script setup lang="ts">
import { onMounted } from "vue";
import { useRoute } from "vue-router";
import { useAuth } from "../services/auth";

const route = useRoute();
const auth = useAuth();

onMounted(() => {
  const target = typeof route.query.redirect === "string" ? route.query.redirect : "/";
  auth.login(target);
});
</script>

<template>
  <div class="login-page">
    <div class="login-card">
      <h1>Signing in…</h1>
      <p>Redirecting to the SCG identity provider.</p>
    </div>
  </div>
</template>

<style scoped>
.login-page {
  min-height: 100vh;
  display: grid;
  place-items: center;
  background: radial-gradient(circle at top, #1f2a44 0%, #101826 55%, #0a101a 100%);
  padding: 1.25rem;
}

.login-card {
  width: min(440px, 100%);
  background: #0f172a;
  border: 1px solid #334155;
  border-radius: 14px;
  padding: 1.25rem;
  color: #e2e8f0;
  box-shadow: 0 18px 50px rgba(0, 0, 0, 0.4);
  text-align: center;
}

h1 {
  margin: 0;
  font-size: 1.4rem;
}

p {
  margin: 0.45rem 0 0;
  color: #93c5fd;
}
</style>
```

- [ ] **Step 5: Handle the OIDC callback before mounting**

Replace the entire contents of `SpasdacsOpensource/src/main.ts` with:
```ts
import { createApp } from "vue";
import { router } from "./router/index";
import App from "./App.vue";
import "./assets/fonts.css";
import { handleAuthCallback } from "./services/auth";

async function bootstrap() {
  const params = new URLSearchParams(window.location.search);
  if (params.has("code") && params.has("state")) {
    try {
      const returnPath = await handleAuthCallback();
      window.history.replaceState({}, "", window.location.pathname);
      router.push(returnPath);
    } catch (err) {
      console.error("[Auth] Callback handling failed:", err);
      window.history.replaceState({}, "", window.location.pathname);
    }
  }
  createApp(App).use(router).mount("#app");
}

bootstrap();
```

- [ ] **Step 6: Manual verification**

```powershell
cd SpasdacsOpensource
npm run dev
```
In a browser, navigate to `http://localhost:5181/spasdacs/`. Expected: the diagram list loads with no login required, showing a "Login" link (per `DiagramList.vue`'s existing `v-else` branch — untouched by this task).

Click "Login" (routes to `/login`, which now immediately redirects). Expected: redirected to Keycloak's hosted login (`http://localhost:8080/realms/scg/protocol/openid-connect/auth?...client_id=spasdacs-spa...`).

Log in as `operator` / `Operator@123!`. Expected: redirected back to `http://localhost:5181/spasdacs/`, landing on the diagram list, now showing "Logout" instead of "Login".

Open devtools → Application → Session Storage. Expected: an `oidc.user:...spasdacs-spa` key present.

- [ ] **Step 7: Commit**

```bash
git add SpasdacsOpensource/package.json SpasdacsOpensource/package-lock.json SpasdacsOpensource/src/services/auth.ts SpasdacsOpensource/src/router/index.ts SpasdacsOpensource/src/pages/LoginPage.vue SpasdacsOpensource/src/main.ts
git commit -m "feat(spasdacs): replace custom-IAM login with Keycloak Authorization Code + PKCE"
```

---

### Task 3: Attach bearer token to existing API calls

**Files:**
- Create: `SpasdacsOpensource/src/services/apiAuth.ts`
- Modify: `SpasdacsOpensource/src/main.ts` (import the new module)

**Interfaces:**
- Consumes: `useAuth().accessToken`, `useAuth().restoreSession()`, `useAuth().isLoggedIn` (Task 2).
- Produces: every same-origin `fetch()` call (all of `diagramStorage.ts`, `mnemonicStore.ts`, `TcCommandSelectorModal.vue` — unmodified) now carries `Authorization: Bearer <token>` when a session exists.

- [ ] **Step 1: Write the fetch override**

Create `SpasdacsOpensource/src/services/apiAuth.ts`:
```ts
import { useAuth } from "./auth";

const KEYCLOAK_URL = (import.meta.env.VITE_KEYCLOAK_URL as string | undefined) ?? "http://localhost:8080";

function buildAllowedOrigins(): string[] {
  const configuredBases = [
    import.meta.env.VITE_DIAGRAM_API_URL as string | undefined,
    import.meta.env.VITE_GATEWAY_URL as string | undefined,
  ].filter((v): v is string => Boolean(v));

  const defaultGatewayHost = import.meta.env.DEV ? window.location.hostname : window.location.host;
  configuredBases.push(`http://${defaultGatewayHost}/api/go/v1`);

  const origins = new Set<string>([window.location.origin]);
  for (const base of configuredBases) {
    try {
      origins.add(new URL(base, window.location.origin).origin);
    } catch {
      // ignore malformed configured base
    }
  }

  try {
    origins.delete(new URL(KEYCLOAK_URL).origin);
  } catch {
    // ignore malformed KEYCLOAK_URL
  }

  return [...origins];
}

const allowedOrigins = buildAllowedOrigins();
const originalFetch = window.fetch.bind(window);

window.fetch = async (input: RequestInfo | URL, init: RequestInit = {}) => {
  const rawUrl = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;

  let requestOrigin = "";
  try {
    requestOrigin = new URL(rawUrl, window.location.origin).origin;
  } catch {
    // relative/invalid URL — fall through, treat as not matching
  }

  if (allowedOrigins.includes(requestOrigin)) {
    const auth = useAuth();
    await auth.restoreSession();
    if (auth.isLoggedIn && auth.accessToken) {
      const headers = new Headers(init.headers);
      headers.set("Authorization", `Bearer ${auth.accessToken}`);
      return originalFetch(input, { ...init, headers });
    }
  }

  return originalFetch(input, init);
};
```

- [ ] **Step 2: Install it at bootstrap**

In `SpasdacsOpensource/src/main.ts`, add the import alongside the existing ones:
```ts
import "./services/apiAuth";
```
(Place it after the `handleAuthCallback` import line — import order doesn't matter functionally here since `apiAuth.ts` only reads `window.fetch`/`useAuth` at call time, not at import time, but keep it grouped with the other service imports for readability.)

- [ ] **Step 3: Verify with a real, unauthenticated-vs-authenticated comparison**

With the dev server running (`npm run dev` from `SpasdacsOpensource/`) and the backend stack up (`docker compose up -d` from `docker/`, so `gateway`/`apisix`/`keycloak` are reachable):

Before logging in, open `http://localhost:5181/spasdacs/` — the diagram list should still load (it has a localStorage fallback per the app's existing design, so a 401 from a protected `/diagrams` call doesn't break the page, it just won't show backend-persisted diagrams).

Log in as `operator` (Step 6 of Task 2), then open devtools → Network, and reload the diagram list. Expected: a request to `/api/go/v1/diagrams` (or wherever `getDiagramApiBaseUrl()` points in dev — check the actual URL in the network tab) carries `Authorization: Bearer eyJ...`, and the response is not `401`.

- [ ] **Step 4: Commit**

```bash
git add SpasdacsOpensource/src/services/apiAuth.ts SpasdacsOpensource/src/main.ts
git commit -m "feat(spasdacs): attach Keycloak bearer token to all API requests via fetch override"
```

---

### Task 4: Deployment — Dockerfile, compose, APISIX route, build scripts

**Files:**
- Modify: `SpasdacsOpensource/vite.config.ts` (fix `build.outDir`, remove dead `/iam/api/v1` dev proxy)
- Create: `docker/Dockerfile.spasdacs`
- Create: `docker/nginx/spasdacs.conf`
- Modify: `docker/compose.yml` (add `spasdacs` service)
- Modify: `docker/apisix/apisix.yaml` (add `/spasdacs/*` route)
- Modify: `docker/scripts/1-build.ps1` (build the new image)
- Modify: `docker/scripts/2-save.ps1` (export the new image)

**Interfaces:**
- Consumes: Tasks 1-3's completed frontend + realm changes.
- Produces: `http://localhost/spasdacs/` reachable through the same APISIX ingress as everything else in this stack; the full login → diagram-write flow works end-to-end against the containerized build.

- [ ] **Step 1: Fix vite.config.ts's build output path and dev proxy**

In `SpasdacsOpensource/vite.config.ts`, replace:
```ts
  build: {
    outDir: "../GoLang New/dist/web/spasdacs",
```
with:
```ts
  build: {
    outDir: "../ui/dist/spasdacs",
```
(The old path pointed outside this repository entirely — a leftover from this app's previous location. `../ui/dist/spasdacs` relative to `SpasdacsOpensource/` matches `GUI/`'s existing convention of landing built output under a shared `ui/dist/` tree at the repo root.)

Replace:
```ts
    proxy: {
      "/api/go/v1": {
        target: "http://localhost:21000",
        changeOrigin: true,
      },
      "/iam/api/v1": {
        target: "http://localhost:21005",
        changeOrigin: true,
      },
    },
```
with:
```ts
    proxy: {
      "/api/go/v1": {
        target: "http://localhost:21000",
        changeOrigin: true,
      },
    },
```
(`/iam/api/v1` proxied to port 21005, the old `iam` service's port — that service no longer exists in this stack.)

- [ ] **Step 2: Write the Dockerfile**

Create `docker/Dockerfile.spasdacs`:
```dockerfile
# syntax=docker/dockerfile:1
# Build context: repo root (tm_tc/)
#
# Two-stage build:
#   1. Node builder — runs "npm run build" to produce the Vite static assets
#   2. nginx runtime — serves those assets under /spasdacs/

###############################################################################
# Stage 1 — Build the SPASDACS static bundle
###############################################################################
FROM node:22-alpine AS spasdacs-builder

WORKDIR /app/SpasdacsOpensource

COPY SpasdacsOpensource/ ./
RUN npm install --legacy-peer-deps

# vite.config.ts sets build.outDir to '../ui/dist/spasdacs' (relative to
# SpasdacsOpensource/), so the build lands at /app/ui/dist/spasdacs/
RUN npm run build

###############################################################################
# Stage 2 — nginx runtime serving the static bundle under /spasdacs/
###############################################################################
FROM nginx:1.27-alpine AS spasdacs

# vite.config.ts's base:'/spasdacs/' means every built asset URL is prefixed
# with /spasdacs/ — placing the files under that same subdirectory of the
# nginx document root makes those absolute paths resolve correctly.
COPY --from=spasdacs-builder /app/ui/dist/spasdacs/ /usr/share/nginx/html/spasdacs/

COPY docker/nginx/spasdacs.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
```

- [ ] **Step 3: Write the nginx config**

Create `docker/nginx/spasdacs.conf`:
```nginx
server {
    listen 80;
    server_name _;

    root /usr/share/nginx/html;
    index index.html;

    # SPASDACS uses hash-based routing (createWebHashHistory), so the server
    # only ever sees /spasdacs/ or /spasdacs/index.html as the request path —
    # in-app routes live entirely in the URL fragment, which never reaches
    # the server. This fallback covers a direct hit or a page refresh.
    location /spasdacs/ {
        try_files $uri $uri/ /spasdacs/index.html;
    }

    location ~* ^/spasdacs/.*\.(js|css|woff2?|ttf|eot|svg|png|jpg|webp|ico)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
        try_files $uri =404;
    }
}
```

- [ ] **Step 4: Add the compose service**

In `docker/compose.yml`, insert a new `spasdacs` service right after the `spa` service block, with its own section banner:
```yaml
  # ---------------------------------------------------------------------------
  # SPASDACS — spacecraft diagram visualization SPA, served under /spasdacs/
  # ---------------------------------------------------------------------------

  spasdacs:
    image: scg/spasdacs:latest
    restart: unless-stopped
```

Also add `spasdacs` to the `apisix` service's `depends_on` list (alongside `spa`, `gateway`, `simulator`, `umacs-tc`, `keycloak`).

- [ ] **Step 5: Add the APISIX route**

In `docker/apisix/apisix.yaml`, add a new route before the trailing `#END` marker:
```yaml
  - id: spasdacs
    uri: /spasdacs/*
    upstream:
      type: roundrobin
      nodes:
        "spasdacs:80": 1

```
(No `openid-connect` plugin on this route — SPASDACS's public-viewing model is enforced client-side by its own router guard, matching the `spa` route's treatment. No `uri` rewriting — the full `/spasdacs/...` path reaches the `spasdacs` container unmodified, matching this stack's existing no-path-stripping convention and this app's own `base: '/spasdacs/'` expectation.)

- [ ] **Step 6: Add the new image to the build script**

In `docker/scripts/1-build.ps1`, add near the top (after `$GuiFile`):
```powershell
$SpasdacsFile = Join-Path $DockerDir "Dockerfile.spasdacs"
```

Replace:
```powershell
$buildGo  = ($Services.Count -eq 0) -or ($Services | Where-Object { $_ -ne "gui" })
$buildGui = ($Services.Count -eq 0) -or ($Services -contains "gui")
```
with:
```powershell
$buildGo       = ($Services.Count -eq 0) -or ($Services | Where-Object { $_ -notin @("gui", "spasdacs") })
$buildGui      = ($Services.Count -eq 0) -or ($Services -contains "gui")
$buildSpasdacs = ($Services.Count -eq 0) -or ($Services -contains "spasdacs")
```

Replace:
```powershell
# Build GUI image (downloads npm packages + runs nuxt generate)
if ($buildGui) {
    Write-Host ""
    Write-Host "  Building GUI..." -ForegroundColor Cyan
    Write-Host "  (First build downloads npm packages - takes a few minutes)" -ForegroundColor DarkGray
    Write-Host ""
    Build-Image -Tag "scg/gui:latest" -Dockerfile $GuiFile
}
```
with:
```powershell
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
```

- [ ] **Step 7: Add the new image to the save script**

In `docker/scripts/2-save.ps1`, replace:
```powershell
$GuiImages = @(
    "scg/gui:latest"
)
```
with:
```powershell
$GuiImages = @(
    "scg/gui:latest"
)

$SpasdacsImages = @(
    "scg/spasdacs:latest"
)
```

Replace:
```powershell
Write-Host "  Saving GUI image -> scg-gui.tar ..." -ForegroundColor Yellow
docker save $GuiImages -o (Join-Path $OutDir "scg-gui.tar")
if ($LASTEXITCODE -ne 0) { throw "Failed to save GUI image" }
Write-Host "  [OK] scg-gui.tar" -ForegroundColor Green
```
with:
```powershell
Write-Host "  Saving GUI image -> scg-gui.tar ..." -ForegroundColor Yellow
docker save $GuiImages -o (Join-Path $OutDir "scg-gui.tar")
if ($LASTEXITCODE -ne 0) { throw "Failed to save GUI image" }
Write-Host "  [OK] scg-gui.tar" -ForegroundColor Green

Write-Host "  Saving SPASDACS image -> scg-spasdacs.tar ..." -ForegroundColor Yellow
docker save $SpasdacsImages -o (Join-Path $OutDir "scg-spasdacs.tar")
if ($LASTEXITCODE -ne 0) { throw "Failed to save SPASDACS image" }
Write-Host "  [OK] scg-spasdacs.tar" -ForegroundColor Green
```

Also update the header comment listing tar outputs:
```
#  Outputs to docker/images/ (3 tar files):
#    scg-apps.tar        - all Go microservice images
#    scg-gui.tar          - static Nuxt SPA image (nginx, no proxying)
#    infra.tar           - postgres, redis, nats, influxdb, alpine base
```
becomes:
```
#  Outputs to docker/images/ (4 tar files):
#    scg-apps.tar        - all Go microservice images
#    scg-gui.tar          - static Nuxt SPA image (nginx, no proxying)
#    scg-spasdacs.tar    - static SPASDACS SPA image (nginx, no proxying)
#    infra.tar           - postgres, redis, nats, influxdb, alpine base
```

- [ ] **Step 8: Build and deploy**

```powershell
cd docker
docker build -f Dockerfile.spasdacs -t scg/spasdacs:latest ..
docker compose up -d
Start-Sleep -Seconds 10
docker compose ps
```
Expected: `spasdacs` container present and running alongside the rest of the stack.

- [ ] **Step 9: End-to-end verification against the containerized build**

```powershell
(Invoke-WebRequest -Uri "http://localhost/spasdacs/" -UseBasicParsing).StatusCode
```
Expected: `200`.

In a browser: navigate to `http://localhost/spasdacs/`, confirm the diagram list loads without login. Click "Login", confirm redirect to Keycloak (`http://localhost:8080/realms/scg/...client_id=spasdacs-spa...`), log in as `operator`/`Operator@123!`, confirm redirect back to `http://localhost/spasdacs/` now showing "Logout". Create or edit a diagram and save it; confirm the save succeeds (not silently falling back to localStorage-only — check devtools Network tab for a `200` on the `POST`/`PATCH` `/api/go/v1/diagrams...` request with an `Authorization` header present). Click "Logout"; confirm the session clears and a subsequent visit to an editor route redirects to Keycloak again.

- [ ] **Step 10: Commit**

```bash
git add SpasdacsOpensource/vite.config.ts docker/Dockerfile.spasdacs docker/nginx/spasdacs.conf docker/compose.yml docker/apisix/apisix.yaml docker/scripts/1-build.ps1 docker/scripts/2-save.ps1
git commit -m "feat: deploy SPASDACS behind APISIX at /spasdacs/"
```
