# Keycloak Browser Login Flow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the SPA's dead custom-IAM login with a real Keycloak Authorization Code + PKCE flow, guard the whole app behind it, and attach the resulting bearer token to every existing API call without editing the 23 call sites.

**Architecture:** `oidc-client-ts`'s `UserManager` drives the redirect-based login against Keycloak. A global route middleware enforces auth on every page. A global `$fetch` override (one Nuxt plugin) attaches the Bearer token to same-origin API requests. A prerequisite fix on the Keycloak container (`KC_HOSTNAME`) makes the token issuer consistent between the browser's path to Keycloak (`localhost:8080`) and APISIX's internal path (`keycloak:8080`), which otherwise blocks every login.

**Tech Stack:** Nuxt 3 (Vue 3, `ssr: false`), `oidc-client-ts`, Keycloak 26, APISIX (`openid-connect` plugin, already built).

## Global Constraints

- No changes to `GoLang/` or any backend service — this plan only touches `docker/compose.yml` (one env-var addition) and `GUI/`.
- No changes to the 23 existing files that call `$fetch` / `useSimpleAPIFetch` directly — the whole point of the API-auth plugin task is that those files stay untouched.
- Match existing code conventions: Nuxt 3 `<script setup lang="ts">` composition API, existing dark-theme CSS variable/color usage in `AppTopbar.vue` (`#0b1220`, `#e2e8f0`, etc.), existing `useState`-based composable pattern (see `useSideNav.ts`).

---

### Task 1: Fix Keycloak issuer consistency (KC_HOSTNAME)

**Files:**
- Modify: `docker/compose.yml:80-90` (the `keycloak` service)

**Interfaces:**
- Produces: Keycloak's discovery document and issued tokens both declare issuer `http://localhost:8080/realms/mainframe` regardless of whether a request arrived via `localhost:8080` (browser) or `keycloak:8080` (APISIX's internal discovery/introspection calls). This is a prerequisite for every later task — without it, no browser-obtained token will pass APISIX's `openid-connect` plugin.

- [ ] **Step 1: Confirm the current bug**

From `docker/`:
```powershell
docker compose up -d --force-recreate keycloak
Start-Sleep -Seconds 15
$tok = Invoke-RestMethod -Method Post -Uri "http://localhost:8080/realms/mainframe/protocol/openid-connect/token" -Body @{
    client_id = "tm-tc-spa"; grant_type = "password"; username = "operator"; password = "Operator@123!"
}
# Decode the token's issuer claim (just the payload segment, base64url)
$payload = $tok.access_token.Split('.')[1]
$payload += '=' * ((4 - $payload.Length % 4) % 4)
$claims = [System.Text.Encoding]::UTF8.GetString([Convert]::FromBase64String($payload.Replace('-','+').Replace('_','/'))) | ConvertFrom-Json
$claims.iss
```
Expected (pre-fix): `http://localhost:8080/realms/mainframe` — this is the *browser's* path. Now check what APISIX's internal discovery believes:
```powershell
Invoke-RestMethod -Uri "http://localhost:8080/realms/mainframe/.well-known/openid-configuration" | Select-Object issuer
```
This also currently resolves to whatever hostname you used to ask — the bug is that Keycloak's issuer varies per-request instead of being fixed, so APISIX (which always asks via `keycloak:8080` internally) sees a *different* issuer (`http://keycloak:8080/realms/mainframe`) than what's embedded in a browser-obtained token, and rejects it. This step is establishing the baseline, not asserting a specific failure — proceed to the fix.

- [ ] **Step 2: Add KC_HOSTNAME env vars**

In `docker/compose.yml`, replace:
```yaml
  keycloak:
    image: quay.io/keycloak/keycloak:26.0
    command: ["start-dev", "--import-realm"]
    environment:
      KEYCLOAK_ADMIN:          ${KEYCLOAK_ADMIN:-admin}
      KEYCLOAK_ADMIN_PASSWORD: ${KEYCLOAK_ADMIN_PASSWORD:-Admin@123!}
    volumes:
      - ./keycloak/realm-export.json:/opt/keycloak/data/import/realm.json:ro
    ports:
      - "${KEYCLOAK_PORT:-8080}:8080"
    restart: unless-stopped
```
with:
```yaml
  keycloak:
    image: quay.io/keycloak/keycloak:26.0
    command: ["start-dev", "--import-realm"]
    environment:
      KEYCLOAK_ADMIN:          ${KEYCLOAK_ADMIN:-admin}
      KEYCLOAK_ADMIN_PASSWORD: ${KEYCLOAK_ADMIN_PASSWORD:-Admin@123!}
      KC_HOSTNAME:             ${KEYCLOAK_HOSTNAME:-localhost}
      KC_HOSTNAME_PORT:        ${KEYCLOAK_PORT:-8080}
    volumes:
      - ./keycloak/realm-export.json:/opt/keycloak/data/import/realm.json:ro
    ports:
      - "${KEYCLOAK_PORT:-8080}:8080"
    restart: unless-stopped
```

Add a matching entry to `docker/.env.example` in the existing Keycloak block (next to `KEYCLOAK_PORT`):
```
KEYCLOAK_HOSTNAME=localhost
```

- [ ] **Step 3: Verify the issuer is now fixed and consistent**

```powershell
docker compose up -d --force-recreate keycloak
Start-Sleep -Seconds 15

# Discovery doc, fetched via the browser-facing hostname
(Invoke-RestMethod -Uri "http://localhost:8080/realms/mainframe/.well-known/openid-configuration").issuer

# A fresh token's issuer claim (reuse the decode snippet from Step 1)
$tok = Invoke-RestMethod -Method Post -Uri "http://localhost:8080/realms/mainframe/protocol/openid-connect/token" -Body @{
    client_id = "tm-tc-spa"; grant_type = "password"; username = "operator"; password = "Operator@123!"
}
$payload = $tok.access_token.Split('.')[1]
$payload += '=' * ((4 - $payload.Length % 4) % 4)
$claims = [System.Text.Encoding]::UTF8.GetString([Convert]::FromBase64String($payload.Replace('-','+').Replace('_','/'))) | ConvertFrom-Json
$claims.iss
```
Expected: both return exactly `http://localhost:8080/realms/mainframe`.

Now confirm this token, obtained purely via the browser-facing hostname, is accepted by APISIX (which validates internally via `keycloak:8080`):
```powershell
docker compose up -d apisix
$accessToken = $tok.access_token
(Invoke-WebRequest -Uri "http://localhost/api/go/v1/chain-status" -Headers @{ Authorization = "Bearer $accessToken" } -UseBasicParsing).StatusCode
```
Expected: `200` (previously this combination — token from `localhost:8080`, validated via `keycloak:8080` — returned `401`).

- [ ] **Step 4: Commit**

```bash
git add docker/compose.yml docker/.env.example
git commit -m "fix(keycloak): pin KC_HOSTNAME so browser and internal token issuers match"
```

---

### Task 2: Login/logout/session flow

**Files:**
- Modify: `GUI/package.json` (add `oidc-client-ts` dependency)
- Create: `GUI/app/plugins/keycloak.client.ts`
- Create: `GUI/app/composables/useAuth.ts`
- Create: `GUI/app/pages/auth/callback.vue`
- Create: `GUI/app/middleware/auth.global.ts`
- Modify: `GUI/nuxt.config.ts` (add Keycloak runtime config; remove dead `iamBase` config and `/iam` dev-proxy entry)

**Interfaces:**
- Consumes: Task 1's fixed Keycloak issuer (login only works end-to-end once Task 1 is done — depends on it).
- Produces: `useAuth()` composable with `user` (ref), `isAuthenticated` (computed ref), `accessToken` (computed ref, returns `''` when logged out), `login()` (redirects to Keycloak, returns a Promise that never resolves because of the redirect — callers don't need to await it), `logout()` (redirects to Keycloak's logout endpoint). Later tasks (3, 4) import `useAuth` and consume `accessToken`/`isAuthenticated`/`logout`.

- [ ] **Step 1: Add the oidc-client-ts dependency**

In `GUI/package.json`, in the `"dependencies"` block, insert alphabetically after `"nats.ws": "^1.30.2",`:
```json
    "oidc-client-ts": "^3.1.0",
```
So the surrounding lines read:
```json
    "nats.ws": "^1.30.2",
    "oidc-client-ts": "^3.1.0",
    "pinia": "^3.0.4",
```

Run from `GUI/`:
```powershell
npm install --legacy-peer-deps
```
Verify: `npm ls oidc-client-ts` shows the package installed, no errors.

- [ ] **Step 2: Add Keycloak runtime config, remove dead IAM config**

In `GUI/nuxt.config.ts`, in the `runtimeConfig.public` block, replace:
```ts
      // IAM is now served by the Python FastAPI backend (no Go gateway in
      // the path). Both dev and prod point at the same ``/iam`` prefix; in
      // dev the Vite proxy below forwards ``/iam`` to the FastAPI server on
      // :8010, in prod nginx (or whatever reverse proxy) is expected to do
      // the same. Override via NUXT_PUBLIC_IAM_BASE in .env if you front
      // FastAPI on a different origin (e.g. https://host/iam-api).
      iamBase:          isDev ? `${devHost}/iam`                 : '/iam',
      restApiBase:      isDev ? `${devHost}/restApi`            : '/restApi',
      simulatorApiBase: isDev ? `${devHost}/simulator/api/go/v1`: '/simulator/api/go/v1',
```
with:
```ts
      restApiBase:      isDev ? `${devHost}/restApi`            : '/restApi',
      simulatorApiBase: isDev ? `${devHost}/simulator/api/go/v1`: '/simulator/api/go/v1',
      // Keycloak is a separate origin reached directly by the browser (not
      // proxied) — the OIDC redirect flow works cross-origin by design.
      // Override via NUXT_PUBLIC_KEYCLOAK_URL/_REALM/_CLIENT_ID in .env.
      keycloakUrl:      'http://localhost:8080',
      keycloakRealm:    'mainframe',
      keycloakClientId: 'tm-tc-spa',
```

In the `vite.server.proxy` block, remove the now-dead IAM proxy entry:
```ts
        // IAM is now served by the Python FastAPI backend. Keep the path
        // prefix as-is so the FastAPI router (which already mounts at
        // ``/iam``) gets the request untouched.
        '/iam':       { target: 'http://127.0.0.1:8010', changeOrigin: true },
```
(Delete this block entirely; leave the other three proxy entries — `/api/go/v1`, `/api/v2/tm`, `/nats` — untouched.)

- [ ] **Step 3: Create the Keycloak plugin**

Create `GUI/app/plugins/keycloak.client.ts`:
```ts
import { UserManager, WebStorageStateStore } from 'oidc-client-ts'

export default defineNuxtPlugin(() => {
  const cfg = useRuntimeConfig()

  const userManager = new UserManager({
    authority: `${cfg.public.keycloakUrl}/realms/${cfg.public.keycloakRealm}`,
    client_id: cfg.public.keycloakClientId as string,
    redirect_uri: `${window.location.origin}/auth/callback`,
    post_logout_redirect_uri: window.location.origin,
    response_type: 'code',
    scope: 'openid profile email',
    userStore: new WebStorageStateStore({ store: window.sessionStorage }),
    automaticSilentRenew: true,
  })

  return {
    provide: {
      userManager,
    },
  }
})
```

- [ ] **Step 4: Create the useAuth composable**

Create `GUI/app/composables/useAuth.ts`:
```ts
import type { User } from 'oidc-client-ts'

export function useAuth() {
  const { $userManager } = useNuxtApp()
  const userManager = $userManager as import('oidc-client-ts').UserManager

  const user = useState<User | null>('auth-user', () => null)

  const isAuthenticated = computed(() => Boolean(user.value && !user.value.expired))
  const accessToken = computed(() => user.value?.access_token ?? '')

  async function loadUser() {
    if (!import.meta.client)
      return null
    user.value = await userManager.getUser()
    return user.value
  }

  async function login(returnPath?: string) {
    if (!import.meta.client)
      return
    await userManager.signinRedirect({
      state: { returnPath: returnPath ?? window.location.pathname },
    })
  }

  async function handleCallback() {
    const result = await userManager.signinRedirectCallback()
    user.value = await userManager.getUser()
    const state = result.state as { returnPath?: string } | undefined
    return state?.returnPath ?? '/'
  }

  async function logout() {
    await userManager.signoutRedirect()
  }

  return {
    user,
    isAuthenticated,
    accessToken,
    loadUser,
    login,
    handleCallback,
    logout,
  }
}
```

- [ ] **Step 5: Create the callback page**

Create `GUI/app/pages/auth/callback.vue`:
```vue
<script setup lang="ts">
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuth } from '@/composables/useAuth'

const router = useRouter()
const auth = useAuth()
const errorMessage = ref('')

onMounted(async () => {
  try {
    const returnPath = await auth.handleCallback()
    router.replace(returnPath)
  }
  catch (err: any) {
    console.error('[Auth Callback] Error:', err)
    errorMessage.value = err?.message ?? 'Login failed'
  }
})
</script>

<template>
  <div class="callback-page">
    <p v-if="errorMessage">
      {{ errorMessage }}
    </p>
    <p v-else>
      Signing in…
    </p>
  </div>
</template>

<style scoped>
.callback-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
```

- [ ] **Step 6: Create the global auth middleware**

Create `GUI/app/middleware/auth.global.ts`:
```ts
export default defineNuxtRouteMiddleware(async (to) => {
  if (!import.meta.client)
    return
  if (to.path === '/auth/callback')
    return

  const auth = useAuth()
  await auth.loadUser()

  if (!auth.isAuthenticated.value) {
    await auth.login(to.fullPath)
    // signinRedirect navigates away; abort this navigation.
    return abortNavigation()
  }
})
```

- [ ] **Step 7: Manual verification**

```powershell
cd GUI
npm run dev
```
In a browser, navigate to `http://localhost:3000/`. Expected: immediate redirect to Keycloak's hosted login page (`http://localhost:8080/realms/mainframe/protocol/openid-connect/auth?...`).

Log in as `operator` / `Operator@123!`. Expected: redirected back to `http://localhost:3000/auth/callback`, then to `http://localhost:3000/` (the original path).

Open browser devtools → Application → Session Storage. Expected: an `oidc.user:...` key present, containing the access token.

- [ ] **Step 8: Commit**

```bash
git add GUI/package.json GUI/package-lock.json GUI/nuxt.config.ts GUI/app/plugins/keycloak.client.ts GUI/app/composables/useAuth.ts GUI/app/pages/auth/callback.vue GUI/app/middleware/auth.global.ts
git commit -m "feat: add Keycloak Authorization Code + PKCE login flow"
```

---

### Task 3: Attach bearer token to existing API calls

**Files:**
- Create: `GUI/app/plugins/api-auth.client.ts`

**Interfaces:**
- Consumes: `useAuth().accessToken` (Task 2).
- Produces: every same-origin `$fetch` call (all 23 existing call sites, unmodified) now carries `Authorization: Bearer <token>` when a token exists.

- [ ] **Step 1: Write the plugin**

Create `GUI/app/plugins/api-auth.client.ts`:
```ts
export default defineNuxtPlugin(() => {
  const original = globalThis.$fetch

  const authenticated = original.create({
    onRequest({ request, options }) {
      const url = typeof request === 'string' ? request : request.url
      // Only attach the token to same-origin, relative API paths — never to
      // absolute cross-origin URLs (e.g. Keycloak itself).
      if (url.startsWith('/')) {
        const auth = useAuth()
        const token = auth.accessToken.value
        if (token) {
          options.headers = new Headers(options.headers)
          options.headers.set('Authorization', `Bearer ${token}`)
        }
      }
    },
  })

  globalThis.$fetch = authenticated as typeof globalThis.$fetch
})
```

- [ ] **Step 2: Verify an existing call site works unmodified**

With the dev server running and logged in (from Task 2's verification), navigate to a page that calls an existing composable — e.g. the TM index page (`/tm`), which uses `useSimpleAPIFetch` under the hood. Open devtools → Network tab, find the resulting `/api/go/v1/...` request, and inspect its request headers.

Expected: `Authorization: Bearer eyJ...` is present on the request, and the response is `200` (not `401`) — with no changes to `useSimpleAPIFetch.ts` or the page itself.

- [ ] **Step 3: Commit**

```bash
git add GUI/app/plugins/api-auth.client.ts
git commit -m "feat: attach Keycloak bearer token to all API requests via global fetch plugin"
```

---

### Task 4: Topbar logout UI + remove dead IAM code

**Files:**
- Modify: `GUI/app/components/app/AppTopbar.vue`
- Delete: `GUI/app/pages/iam/index.vue`
- Delete: `GUI/app/pages/iam/login.vue`
- Delete: `GUI/app/pages/iam/audit.vue`
- Delete: `GUI/app/pages/iam/permissions.vue`
- Delete: `GUI/app/pages/iam/roles.vue`
- Delete: `GUI/app/pages/iam/users.vue`
- Delete: `GUI/app/composables/iam/auth.ts`
- Delete: `GUI/app/composables/iam/api.ts`
- Delete: `GUI/app/composables/iam/SideNav.ts`

**Interfaces:**
- Consumes: `useAuth().user`, `useAuth().logout()` (Task 2).
- Produces: visible logout affordance in the topbar; no remaining references anywhere in the app to the deleted files (confirmed by a passing build).

- [ ] **Step 1: Add logout button and user display to AppTopbar**

In `GUI/app/components/app/AppTopbar.vue`, replace:
```vue
<script setup lang="ts">
const visible = useState<boolean>('visible', () => true)
</script>

<template>
  <nav class="topnav-overlay">
    <div class="topnav-container">
      <div class="topnav-left">
        <button
          class="menu-toggle-btn"
          title="Toggle Menu"
          @click="visible = !visible"
        >
          <i class="pi pi-bars" />
        </button>

        <div class="topnav-brand-wrap">
          <img src="/tc.gif" alt="logo" class="topnav-logo">
          <span class="topnav-brand">TeleCommand</span>
        </div>
      </div>
    </div>
  </nav>
</template>
```
with:
```vue
<script setup lang="ts">
import { useAuth } from '@/composables/useAuth'

const visible = useState<boolean>('visible', () => true)
const auth = useAuth()
</script>

<template>
  <nav class="topnav-overlay">
    <div class="topnav-container">
      <div class="topnav-left">
        <button
          class="menu-toggle-btn"
          title="Toggle Menu"
          @click="visible = !visible"
        >
          <i class="pi pi-bars" />
        </button>

        <div class="topnav-brand-wrap">
          <img src="/tc.gif" alt="logo" class="topnav-logo">
          <span class="topnav-brand">TeleCommand</span>
        </div>
      </div>

      <div class="topnav-right">
        <span v-if="auth.user.value" class="topnav-username">
          {{ auth.user.value.profile.preferred_username }}
        </span>
        <button
          class="menu-toggle-btn"
          title="Log Out"
          @click="auth.logout()"
        >
          <i class="pi pi-sign-out" />
        </button>
      </div>
    </div>
  </nav>
</template>
```
And add, after the existing `.topnav-left` CSS rule:
```scss
.topnav-right {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.topnav-username {
  color: #e2e8f0;
  font-size: 0.9rem;
}
```

- [ ] **Step 2: Delete the dead IAM files**

```bash
git rm GUI/app/pages/iam/index.vue GUI/app/pages/iam/login.vue GUI/app/pages/iam/audit.vue GUI/app/pages/iam/permissions.vue GUI/app/pages/iam/roles.vue GUI/app/pages/iam/users.vue
git rm GUI/app/composables/iam/auth.ts GUI/app/composables/iam/api.ts GUI/app/composables/iam/SideNav.ts
```

- [ ] **Step 3: Verify the build succeeds with no dangling references**

```powershell
cd GUI
npm run build
```
Expected: build completes with no errors referencing missing modules (this catches any leftover import of the deleted `composables/iam/*` or `pages/iam/*` files).

Separately, grep for any leftover reference the build might not catch (e.g. a router link in markup):
```powershell
Select-String -Path (Get-ChildItem -Recurse app -Include *.vue,*.ts) -Pattern "iam/(login|index|audit|permissions|roles|users)|composables/iam"
```
Expected: no matches.

- [ ] **Step 4: Manual verification**

```powershell
npm run dev
```
Log in, confirm the topbar shows the logged-in username and a logout button. Click logout. Expected: redirected to Keycloak's logout confirmation, then back to the app, which immediately redirects to Keycloak login again (per Task 2's middleware) since the session is gone.

- [ ] **Step 5: Commit**

```bash
git add GUI/app/components/app/AppTopbar.vue
git commit -m "feat: add logout UI to topbar, remove dead custom-IAM login pages/composables"
```
