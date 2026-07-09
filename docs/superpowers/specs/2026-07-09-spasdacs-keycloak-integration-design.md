# SPASDACS: API auth + Keycloak login + deployment integration — design

## Goal
Integrate the SPASDACS Nova frontend (`SpasdacsOpensource/`, a standalone
Vue 3 + Vite app for spacecraft diagram visualization, recently copied into
`tm_tc/`) into this branch's deployed stack: fix its API layer so calls
actually authenticate against the now-enforced APISIX/Keycloak auth, replace
its dead custom-IAM login with Keycloak, and deploy it behind APISIX
alongside the existing `GUI/` SPA.

## Current state (before this change)
- SPASDACS's `diagramStorage.ts` and `mnemonicStore.ts` already default to
  `http://<host>/api/go/v1` (no Kong-style `/gateway` prefix) — this matches
  tm_tc's actual APISIX-routed gateway exactly. A comment in
  `diagramStorage.ts` referencing "Kong gateway... prefix /gateway" is
  stale/misleading but the code itself is already correct. `README.md`'s
  documented endpoint prefixes (`/gateway/api/go/v1`, `/iam/api/v1`) are
  also stale relative to the actual code.
- tm_tc's `GoLang/gateway/internal/router.go` (main checkout) already
  registers the diagram CRUD routes SPASDACS needs
  (`GET/POST /api/go/v1/diagrams`, `GET/PATCH/DELETE /api/go/v1/diagrams/{id}`),
  matching the sibling `GoLang New` project's documented `API_ENDPOINTS.md`.
  No backend changes are needed.
- **No API call anywhere in SPASDACS attaches an `Authorization` header**
  (confirmed: only the old IAM logout call does). Every diagram/mnemonic
  fetch will 401 against APISIX's enforced `openid-connect` plugin on
  `/api/*`, independent of which login system is used — this is the same
  category of bug just fixed in `GUI/app/pages/tm/upload.vue`.
- `src/services/auth.ts` implements a username+password REST login against
  `/iam/api/v1/auth/{login,refresh,logout}` — structurally identical to the
  `useIamAuth` composable already removed from `GUI/`. This backend no
  longer exists behind APISIX.
- `src/router/index.ts` has a route-level access model: `/` (diagram list)
  and `/viewer/:id` are public; `/editor/:id` requires `requireAuth: true`
  plus one of roles `operator`/`admin`/`super_admin`
  (`hasAnyRole()`, OR logic).
- `vite.config.ts` already sets `base: "/spasdacs/"` and the PWA manifest's
  `start_url`/`scope`/icon paths are already `/spasdacs/`-prefixed — the app
  was already prepared to be served under that path prefix.
- Keycloak realm `scg` currently has one role (`tm-tc-user`) and one client
  (`tm-tc-spa`), used by `GUI/`.

## Target architecture

```
Browser → APISIX (:80)
  ├─ /spasdacs/*  → new spasdacs container (nginx, static Vite build)
  ├─ /api/*       → gateway (unchanged — diagram routes already exist)
  └─ (existing routes: /, /restApi/*, /simulator/*, /umacs/*, /nats* — unchanged)

Keycloak realm scg
  + roles: viewer, operator, admin, super_admin (new)
  + client: spasdacs-spa (new — public, Authorization Code + PKCE,
    same shape as tm-tc-spa; a separate client per real application,
    consistent with how tm-tc-spa was scoped to GUI/)
  operator user (existing) gets realm role 'operator' added
  (satisfies /editor's requiredRoles check; viewer/admin/super_admin
  are defined for future users, not assigned to anyone yet)
```

### Login
New `src/services/auth.ts` (replacing the IAM implementation) built on
`oidc-client-ts`, mirroring `GUI/`'s `useAuth`/`keycloak.client.ts` pattern
but adapted for plain Vue Router (no Nuxt plugin/auto-import system — a
manually-constructed `UserManager` singleton, module-level, imported where
needed). Preserves the existing public-viewing model:
- `/` and `/viewer/:id` stay reachable with no login.
- `/editor/:id`'s existing `router.beforeEach` guard triggers a Keycloak
  redirect only when `requireAuth` is set and the user isn't authenticated —
  the guard's own logic (`meta.public`, `meta.requireAuth`, `meta.roles`,
  `hasAnyRole()`) is unchanged; only how `isLoggedIn`/`user`/`hasAnyRole`
  are backed changes (Keycloak session instead of IAM REST calls).
- Realm roles come from the ID/access token's `realm_access.roles` claim,
  mapped into `AuthUser.roles` so `hasAnyRole()` keeps working unmodified.
- A new `/spasdacs/#/auth/callback`-equivalent handling (this app uses hash
  history, so the OIDC redirect_uri must point at a real path Keycloak can
  reach — a dedicated non-hash callback page, e.g. `/spasdacs/callback.html`
  or a router entry outside the hash scheme; exact mechanism decided in the
  implementation plan, since hash-history apps commonly need this handled
  slightly differently than `GUI/`'s browser-history callback route).

### API auth
A `window.fetch` override installed once in `src/main.ts`, functionally
identical to `GUI/`'s `api-auth.client.ts`: attach
`Authorization: Bearer <token>` to same-origin API requests (using an
origin-allowlist derived from the configured gateway/diagram API base URLs,
not a bare `startsWith('/')` check — reusing the lesson learned building
`GUI/`'s equivalent plugin), explicitly excluding Keycloak's own origin.
This covers `diagramStorage.ts`, `mnemonicStore.ts`, and
`TcCommandSelectorModal.vue`'s `fetch()` calls with zero edits to those
files.

### Deployment
- `docker/Dockerfile.spasdacs`: two-stage build (Node builder running
  `npm run build`, then nginx serving the `/spasdacs/`-prefixed output),
  following the same shape as `Dockerfile.gui`.
- New `spasdacs` compose service (internal-only, like `spa` — no published
  port, reached only via APISIX).
- New APISIX route `uri: /spasdacs/*` → `spasdacs` upstream. No
  `openid-connect` plugin on this route (public viewing is intentional by
  design; write operations remain protected by the existing `/api/*`
  route's auth once the fetch fix lands).
- nginx inside the `spasdacs` container must serve content such that a
  request for `/spasdacs/assets/...` (APISIX preserves the full path,
  no stripping, consistent with every other route in this stack) resolves
  correctly against the Vite build's `/spasdacs/`-prefixed output —
  exact nginx `location`/`alias` configuration decided in the
  implementation plan.

## Explicitly out of scope
- No changes to `GoLang/gateway`'s diagram endpoints — they already exist
  and match what SPASDACS expects.
- No changes to SPASDACS's diagram/editor/viewer feature logic, X6 canvas
  code, or telemetry/NATS handling — this is an auth + API-attachment +
  deployment change only.
- No production TLS/hardening — same dev-mode posture as the rest of this
  stack.
- No casbin/RBAC replacement — same disclosed gap as the original
  APISIX+Keycloak design; realm roles gate SPASDACS's own client-side route
  guard, not enforced again at the API layer.

## Testing
- `docker compose up -d` brings up `spasdacs` alongside the rest of the
  stack; `http://localhost/spasdacs/` loads the diagram list without login.
- `http://localhost/spasdacs/#/viewer/<id>` loads without login (public
  viewer route).
- Navigating to an editor route without a session redirects to Keycloak;
  logging in as `operator` (now holding the `operator` realm role) grants
  access and redirects back to the intended editor page.
- A real diagram write (create/save) succeeds — proves the Bearer token is
  now attached where it never was before.
- Logout clears the session; the next editor-route visit re-requires login.
