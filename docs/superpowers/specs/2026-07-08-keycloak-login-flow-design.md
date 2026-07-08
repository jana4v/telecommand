# Keycloak browser login flow — design

## Goal
Replace the SPA's dead custom-IAM login (`useIamAuth`, `login.vue`, pointed at
`/iam/auth/login` — a backend Task 5 already removed) with a real
Authorization Code + PKCE login flow against Keycloak, matching the
`apisix-keycloak` branch's server-side auth work (Keycloak as identity
provider, APISIX enforcing bearer tokens on API routes). Guard the whole app
behind login, since every API call now requires a token anyway.

## Current state (before this change)
- No route protection exists anywhere in the SPA — no middleware, no logout
  button in `AppTopbar.vue`. `login.vue` is an optional, currently-broken
  page (its target backend is gone).
- `useIamAuth` / `useIamApi` implement a username+password REST login against
  `/iam/auth/login`, storing tokens in `localStorage`, manually attaching
  `Authorization` headers per-call. Not used by anything except the 6
  `/iam/*` admin pages (`index`, `login`, `audit`, `permissions`, `roles`,
  `users`), which manage IAM users/roles/permissions — also pointed at the
  now-removed `iam` service.
- 23 other files across the app call `$fetch` / `useSimpleAPIFetch` directly
  against `/api/go/v1`, `/api/v2/tm`, `/restApi`, `/simulator/api/go/v1` —
  none currently attach any `Authorization` header.
- Keycloak (branch: `worktree-apisix-keycloak`) runs with realm `mainframe`,
  client `tm-tc-spa` (public, Authorization Code + PKCE already enabled,
  `directAccessGrantsEnabled: true` for test tooling), published on
  `${KEYCLOAK_PORT:-8080}`.
- **Known blocking bug** (flagged in that branch's final review, not yet
  fixed): Keycloak has no `KC_HOSTNAME` set, so a token's `iss` claim is
  bound to whatever hostname issued it. A token obtained via `localhost:8080`
  (what the browser will use) fails introspection via `keycloak:8080` (what
  APISIX's `openid-connect` plugin uses internally) — this blocks real
  browser login today and must be fixed as a prerequisite of this work.

## Target architecture

```
Browser → oidc-client-ts (UserManager) → Keycloak (:8080, public)
            │
            ├─ not authenticated → global route middleware redirects to
            │   Keycloak's hosted login page (Authorization Code + PKCE)
            │
            └─ authenticated → token held by oidc-client-ts (sessionStorage);
                a Nuxt plugin attaches it as `Authorization: Bearer <token>`
                to every same-origin API request — no changes needed to the
                23 existing $fetch / useSimpleAPIFetch call sites
                                               ↓
                                    APISIX validates via openid-connect
                                    plugin (already built on this branch)
```

### Prerequisite fix: Keycloak issuer consistency
Add `KC_HOSTNAME=localhost` and `KC_HOSTNAME_PORT=${KEYCLOAK_PORT:-8080}` to
the `keycloak` service in `docker/compose.yml`. This fixes Keycloak's
declared issuer to a single public URL (`http://localhost:8080/realms/mainframe`)
regardless of which hostname a given request arrived on. APISIX still reaches
Keycloak internally via `keycloak:8080` for its own discovery/introspection
calls (unaffected — the discovery document's *content*, not the URL used to
fetch it, is what carries the issuer string) — but the issuer value inside
tokens and the discovery document now match, resolving the introspection
failure that would otherwise block every browser login.

### Login/logout/session
- `GUI/app/plugins/keycloak.client.ts` — client-only Nuxt plugin,
  constructs one `oidc-client-ts` `UserManager` for the app's lifetime:
  authority `http://localhost:8080/realms/mainframe` (configurable via
  runtime config), `client_id: tm-tc-spa`, `redirect_uri:
  ${origin}/auth/callback`, `post_logout_redirect_uri: ${origin}`,
  `response_type: 'code'`, `scope: 'openid profile email'`. PKCE is
  automatic in `oidc-client-ts` for public clients using the code flow.
- `GUI/app/composables/useAuth.ts` — thin wrapper over the `UserManager`
  singleton: `user`, `isAuthenticated`, `accessToken` (reactive, backed by
  `getUser()`), `login()` (calls `signinRedirect()`, preserving the
  originally-requested path via oidc-client-ts's `state` param), `logout()`
  (calls `signoutRedirect()`). Replaces `useIamAuth` as the app's one auth
  composable.
- `GUI/app/pages/auth/callback.vue` — new page, calls
  `signinRedirectCallback()` on mount, then `router.replace()`s to the
  path that was being requested before the redirect (from `state`), or `/`
  if none.
- `GUI/app/middleware/auth.global.ts` — new global middleware. For every
  route except `/auth/callback`: if not authenticated, call `login()`
  (which redirects to Keycloak) instead of rendering the page.

### API calls: one plugin, zero call-site changes
- `GUI/app/plugins/api-auth.client.ts` — new Nuxt plugin. Overrides
  `globalThis.$fetch` with an `ofetch` instance created via
  `$fetch.create({ onRequest })` that attaches
  `Authorization: Bearer <accessToken>` when the request URL is same-origin
  (covers `/api/*`, `/restApi/*`, `/simulator/*`, `/umacs/*` — everything
  APISIX now gates). This is what makes the 23 existing `$fetch` /
  `useSimpleAPIFetch` call sites work under the new auth model without
  editing any of them.

### UI
- `AppTopbar.vue` gets a logout button and displays the logged-in user's
  name/username from `useAuth().user`.

### Config
- `nuxt.config.ts`: add `keycloakUrl` (default `http://localhost:8080`),
  `keycloakRealm` (default `mainframe`), `keycloakClientId` (default
  `tm-tc-spa`) to `runtimeConfig.public`. Remove the dead `iamBase` entry
  and the `/iam` dev-proxy rule (both pointed at the now-removed backend).

### Removed (dead code, confirmed self-contained — nothing else references them)
- `GUI/app/pages/iam/{index,login,audit,permissions,roles,users}.vue`
- `GUI/app/composables/iam/{auth,api,SideNav}.ts`

## Explicitly out of scope
- No changes to Keycloak realm roles/permissions mapping into per-service
  authorization (still the casbin-replacement gap already disclosed in the
  original `apisix-keycloak` design doc).
- No "remember me" / long-lived session beyond what `oidc-client-ts`'s
  default silent-renew behavior provides.
- No changes to non-`/auth` and non-`/iam` pages beyond what the global
  middleware and `$fetch` plugin require — existing page logic/UI is
  untouched.

## Testing
- Loading any page while logged out redirects to Keycloak's hosted login.
- Logging in as `operator`/`Operator@123!` redirects back to the originally
  requested page (not always `/`).
- A page that calls an existing `$fetch`/`useSimpleAPIFetch`-based composable
  (e.g. a TM data fetch) succeeds after login, proving the Bearer-token
  plugin works without per-call-site edits.
- Logout clears the session; the next page load redirects to Keycloak login
  again.
- The prerequisite `KC_HOSTNAME` fix: obtain a token via the browser flow,
  confirm an authenticated API call through APISIX returns 200 (not 401),
  proving the issuer-mismatch bug is resolved.
