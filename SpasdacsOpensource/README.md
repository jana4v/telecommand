# SPASDACS Nova

SPASDACS Nova is a Vue 3 and AntV X6 based spacecraft status display and commanding application.

It provides a browser-based diagram editor and live viewer for spacecraft system diagrams, with telemetry-driven visual updates over NATS WebSocket and integration points for gateway and IAM services.

## What It Does

- Create and manage SPASDACS diagrams
- View diagrams without logging in in read-only mode
- Edit diagrams with role-based access control
- Bind diagram elements to live telemetry values
- Animate node and edge state changes from telemetry updates
- Import and export diagrams as JSON
- Cycle diagrams automatically in Auto View mode
- Load mnemonic metadata and ranges from a gateway API

## Main Features

- Diagram list page with create, import, export, delete, and Auto View controls
- Viewer page with live telemetry panels, pinned telemetry popups, fit-to-screen, command queue, and NATS configuration
- Editor page for building and updating diagrams
- Login flow backed by an IAM API
- Backend-first diagram persistence with browser localStorage fallback
- Reactive mnemonic catalog loaded from the gateway API

## Tech Stack

- Vue 3
- Vue Router
- Vite
- TypeScript
- AntV X6
- GSAP
- NATS WebSocket via `nats.ws`

## Runtime Dependencies

This frontend expects external services to be available.

### 1. IAM API

Used for login, logout, refresh, and role-aware session handling.

Default base pattern:

`http://<host>/iam/api/v1`

Expected endpoints include:

- `/auth/login`
- `/auth/refresh`
- `/auth/logout`

### 2. Gateway API

Used for diagram persistence and mnemonic metadata.

Default base URL:

`http://<host>/gateway/api/go/v1`

Used for:

- `/diagrams`
- `/diagrams/:id`
- `/telemetry/subsystems`
- `/tm/mnemonics`
- `/mnemonics/tm`
- `/get/mnemonics/tm/{subsystem}`
- `/get/mnemonics/tm/{subsystem}/{mnemonic}/range`

### 3. NATS WebSocket

Used for live telemetry updates in the viewer.

Typical server URL:

`ws://<host>:4223`

The viewer subscribes to subject patterns such as:

- `tm.tm_map`
- `tm.tm_map/full`
- `tm.heartbeat`

The subject prefix is configurable in the viewer UI.

## Roles and Access

The app supports role-based behavior.

- `viewer`: read-only access
- `operator`: can edit diagrams
- `admin`: can edit diagrams
- `super_admin`: can edit diagrams

Current route behavior:

- `/` is public
- `/viewer/:id` is public
- `/login` is public
- `/editor/:id` requires authenticated write-capable roles

Unauthenticated users can browse and open diagrams, but cannot create, edit, import, or delete them.

## Local Persistence Behavior

Diagram persistence is backend-first.

If the gateway diagram API is unavailable:

- diagram saves fall back to browser localStorage
- diagram reads fall back to localStorage when possible
- Auto View settings are cached locally

This makes the UI usable even during temporary backend outages, but the backend remains the primary source of truth.

## Getting Started

### Prerequisites

- Node.js 18+ recommended
- npm or yarn

### Install

Using npm:

```bash
npm install
```

Using yarn:

```bash
yarn install
```

### Start the Dev Server

Using npm:

```bash
npm run dev
```

Using yarn:

```bash
yarn dev
```

### Build for Production

Using npm:

```bash
npm run build
```

Using yarn:

```bash
yarn build
```

### Preview Production Build

Using npm:

```bash
npm run preview
```

Using yarn:

```bash
yarn preview
```

## Environment and Configuration

The app can use Vite environment values where available.

Relevant values include:

- `VITE_DIAGRAM_API_URL`
- `VITE_GATEWAY_URL`

If these are not provided, the app falls back to host-based defaults derived from `window.location`.

## Project Structure

```text
src/
  components/      Reusable UI pieces, X6 canvas, inspector, command queue panels
  graph/           Graph setup and edge visual logic
  nodes/           Custom X6 node components
  pages/           Diagram list, login, editor, and viewer pages
  router/          Route definitions and auth guards
  services/        Auth, diagram storage, mnemonic store
  stores/          Command queue and other state helpers
  telemetry/       NATS telemetry engine and telemetry store
```

## Documentation

- [Adding a new diagram element](docs/ADDING_NEW_ELEMENT.md) — category, palette, graph registration, inspector, guided params, and telemetry.

The repository also contains historical and Nova documentation assets under:

- `Documentation/V1`
- `Documentation/Nova`

## Notes

- Routing uses hash history, which simplifies static hosting
- `node_modules` and `dist` are intentionally ignored from version control
- The repository currently includes generated and source documentation assets alongside the frontend codebase

## Status

This repository contains the standalone SPASDACS Nova frontend project extracted from the larger MainframeAutomation workspace and published as its own repository.
