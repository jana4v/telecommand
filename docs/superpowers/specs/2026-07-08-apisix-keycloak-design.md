# APISIX + Keycloak ingress/auth — design

## Goal
Replace nginx as the stack's ingress with Apache APISIX, and replace the
custom Go `iam` service's login/JWT-issuing with Keycloak as the identity
provider. APISIX enforces authentication on API routes via Keycloak-issued
tokens.

## Current state (before this change)
- `docker/compose.yml` runs `gui` (nginx), which serves the built Nuxt SPA
  and reverse-proxies `/api/`, `/restApi/`, `/simulator/`, `/iam/`,
  `/umacs/`, `/nats` to backend services (see `docker/nginx/default.conf`).
- `iam` (Go, `GoLang/iam`) issues its own JWTs and does casbin-based RBAC.
  No other service currently validates IAM's JWTs — there is no auth
  middleware in `gateway` today. Auth enforcement is effectively nonexistent
  at the edge.

## Target architecture

```
Browser → APISIX (:80, public ingress)
            ├─ /              → spa (internal-only nginx, static Nuxt build, no auth)
            ├─ /api/*         → gateway:21000   (openid-connect plugin)
            ├─ /restApi/*     → gateway:21000   (openid-connect plugin)
            ├─ /simulator/*   → simulator:21001 (openid-connect plugin)
            ├─ /umacs/*       → umacs-tc:21002  (openid-connect plugin)
            └─ /nats          → nats:4223 (websocket passthrough, no auth)

Keycloak (:8080)
  realm "mainframe" auto-imported on startup (start-dev --import-realm):
    - client for the Nuxt SPA (public, Authorization Code + PKCE)
    - client for APISIX token introspection (confidential)
    - a couple of seed users/roles
```

- Login flow: the Nuxt SPA redirects to Keycloak directly for
  Authorization Code + PKCE, obtains a token, and sends it as
  `Authorization: Bearer <token>` on API calls. APISIX's `openid-connect`
  plugin validates the token against Keycloak per route; APISIX does not
  perform the login redirect itself.
- APISIX runs in **standalone/declarative mode** — routes, upstreams, and
  plugin config live in a checked-in YAML file (`docker/apisix/apisix.yaml`).
  No etcd, no Admin API, no apisix-dashboard: the route set is static and
  doesn't need a database-backed config store.
- Keycloak runs in dev mode (`start-dev`), matching the rest of the stack's
  current lack of TLS.

## Components to add/change under `docker/`

- `docker/keycloak/realm-export.json` — realm, 2 clients, seed users/roles.
- `docker/apisix/config.yaml` — APISIX standalone-mode config.
- `docker/apisix/apisix.yaml` — declarative routes/upstreams/plugins
  (openid-connect plugin config referencing Keycloak's realm).
- `docker/compose.yml`:
  - add `keycloak` service (image `quay.io/keycloak/keycloak`, realm import
    volume-mounted)
  - add `apisix` service (image `apache/apisix`, config volume-mounted,
    published on `${GUI_PORT:-80}`)
  - remove `iam` service
  - replace `gui` service with `spa` — same build (Nuxt static generate +
    nginx), but internal-only (no published port), config trimmed to a
    static-file vhost with no proxy locations
- `docker/nginx/default.conf` — trimmed to static-only (or removed and
  inlined into a new minimal spa config; decided during implementation)
- `docker/config/iam.yaml` removed
- `docker/.env.example` — add Keycloak admin credentials env vars

## Explicitly out of scope
- No changes to `GoLang/iam` Go source. The container stops being deployed;
  the code stays in the repo untouched.
- No production TLS/certificate setup for Keycloak or APISIX — dev-mode
  HTTP, consistent with the rest of this stack today.
- No casbin/RBAC replacement. Keycloak puts identity/roles into the issued
  token; mapping those roles into fine-grained per-service authorization
  (what casbin did) is a separate future change, not part of this one.
- No Nuxt frontend code changes are designed here beyond "point login at
  Keycloak" being a prerequisite — the actual SPA auth integration
  (OIDC client library choice, token storage/refresh, login/logout UI) is
  implementation detail decided in the plan, not pre-specified here.

## Testing
- `docker compose up -d` brings up the full stack cleanly.
- Keycloak realm import succeeds (check container logs / admin console).
- APISIX routes: unauthenticated request to `/api/...` returns 401/redirect;
  authenticated request (token obtained via Keycloak
  password/client-credentials grant for a seeded test user) returns 200 from
  `gateway`.
- Static SPA still loads at `/` through APISIX.
- `/nats` websocket passthrough still works (manual check or existing
  frontend usage).
