# Rename "mainframe" → "SCG" — design

## Goal
Rename the project's technical/branding identifier from `mainframe` to `scg`
(lowercase for technical identifiers, `SCG` for human-facing text) across the
Docker deployment layer and the one GUI reference to it. Mechanical rename,
no behavior change.

## Casing convention
Mirrors the existing pattern (`mainframe` lowercase for identifiers,
`Mainframe` capitalized for human-facing banners/app name):
- **Lowercase `scg`**: Docker Compose project name, network name, image
  tags, Keycloak realm name, InfluxDB org — anywhere a lowercase identifier
  is either required (Docker image repo names must be lowercase) or was
  already the existing convention.
- **`SCG` (human-facing text only)**: script console banners (`Write-Host`),
  the PWA app display name.

## Scope
Only the identifier changes. Keycloak client IDs (`tm-tc-spa`,
`apisix-introspection`), realm roles, and the seed user (`operator`) keep
their current names — only the realm's own name changes, everywhere it's
referenced.

## Files and changes

| File | Change |
|---|---|
| `docker/compose.yml` | `name: mainframe` → `name: scg`; network `mainframe-net` → `scg-net`; 9 image tags `mainframe/*:latest` → `scg/*:latest`; `INFLUX_ORG:-mainframe` → `INFLUX_ORG:-scg`; `INFLUX_TOKEN:-mainframe-influx-token-change-me` → `INFLUX_TOKEN:-scg-influx-token-change-me` |
| `docker/.env` / `docker/.env.example` | `INFLUX_ORG=mainframe` → `scg`; `INFLUX_TOKEN=mainframe-influx-token-change-me` → `scg-influx-token-change-me` |
| `docker/config/storage.yaml` | `org: mainframe` → `org: scg` (must match `INFLUX_ORG`) |
| `docker/keycloak/realm-export.json` | `"realm": "mainframe"` → `"realm": "scg"` |
| `docker/apisix/apisix.yaml` | All 4 `openid-connect` plugin blocks: `discovery: http://keycloak:8080/realms/mainframe/...` → `.../realms/scg/...`, `realm: mainframe` → `realm: scg` |
| `docker/nats/nats.conf` | Comment only: "for Mainframe deployment" → "for SCG deployment" |
| `docker/scripts/1-build.ps1` | Image tags `mainframe/${svc}:latest` → `scg/${svc}:latest`, `mainframe/gui:latest` → `scg/gui:latest`; banner text |
| `docker/scripts/2-save.ps1` | Image list entries, output filenames `mainframe-apps.tar`/`mainframe-gui.tar` → `scg-apps.tar`/`scg-gui.tar`, banner/comment text |
| `docker/scripts/3-load.ps1` | Banner text only (file globs `*.tar` generically, no rename needed there) |
| `docker/scripts/4-deploy.ps1` | Banner/status text only |
| `GUI/nuxt.config.ts` | `keycloakRealm: 'mainframe'` → `'scg'`; PWA manifest `name: 'Mainframe GUI'` → `'SCG GUI'` |

## Explicitly out of scope
- The two absolute filesystem paths in `nuxt.config.ts`'s Vite
  `fs.allow` array (`D:/code/.../MainframeAutomation/...`) — that's the
  real on-disk repository folder name, unrelated to this branding string.
- Keycloak client IDs, roles, seed user — unchanged per scope decision above.
- `docker/images/*.tar` — gitignored offline-export artifacts; regenerated
  fresh by `2-save.ps1` under the new names when next run, not edited in
  place.

## Testing
- After the rename, rebuild or retag local Docker images so
  `docker compose up -d` starts successfully under the new `scg/*` tags
  (old `mainframe/*`-tagged images become stale once compose.yml no longer
  references them).
- Keycloak realm import succeeds and is reachable at
  `http://localhost:8080/realms/scg/.well-known/openid-configuration`.
- An APISIX-protected route still enforces auth correctly end-to-end
  (401 without a token, 200 with a token obtained from the renamed realm)
  — reusing the same verification flow already exercised by the earlier
  Keycloak/APISIX plans.
