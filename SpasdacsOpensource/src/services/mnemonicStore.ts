/**
 * mnemonicStore — reactive singleton for Gateway mnemonic catalog.
 *
 * Endpoints used (see GoLang/gateway/internal/router.go — this gateway has
 * no single all-subsystems+metadata or id-mapping endpoint, so the catalog
 * and paramId→mnemonic map are built by looping /get/tm/details/{subsystem}
 * over the subsystem list):
 *   GET <gatewayUrl>/get/tm/subsystems                      → { subsystems: string[] }
 *   GET <gatewayUrl>/tm/mnemonics                           → { mnemonics: string[] } (Redis live key list)
 *   GET <gatewayUrl>/get/tm/details/{subsystem}              → [{ pid_no, mnemonic, subsystem, parameter_type, ... }]
 *   GET <gatewayUrl>/get/tm/mnemonic_list/{subsystem}        → string[]
 *   GET <gatewayUrl>/get/tm/pid_mnemonic_list/{subsystem}    → string[] (see loadPidMnemonicsForSubsystem note)
 *   GET <gatewayUrl>/get/tm/{pid}/range                      → { mnemonic, pid, range: string[] }
 *
 *   gatewayUrl default: http://<window.location.hostname>/api/go/v1  (nginx, port 80)
 *
 * The gatewayUrl is itself reactive so it can be changed from the UI.
 * lastError exposes the failure reason so the Inspector can display it.
 */

import { ref } from "vue";
import { SIMULATED_TOPICS } from "../types";
import { getCachedMnemonics, setCachedMnemonics, mnemonicVersion, clearCachedMnemonics } from "./mnemonicCache";

// ── Config ────────────────────────────────────────────────────────────────

/** Gateway base URL — reactive so it can be edited in the Inspector UI. */
export const gatewayUrl = ref<string>(
  (import.meta.env.VITE_GATEWAY_URL as string | undefined) ??
  `http://${import.meta.env.DEV ? window.location.hostname : window.location.host}/api/go/v1`
);

// ── Types ─────────────────────────────────────────────────────────────────

export interface MnemonicInfo {
  mnemonic: string;
  subsystem?: string;
  type?: string;
  unit?: string;
}

// ── Reactive state ────────────────────────────────────────────────────────

export const subsystems      = ref<string[]>([]);
export const liveMnemonics   = ref<string[]>([]);
export const mnemonicCatalog = ref<MnemonicInfo[]>([]);
export const paramIdMnemonicMap = ref<Record<string, string>>({});
export const gatewayAvailable = ref(false);
export const mnemonicsLoading = ref(false);

// Matches both standard CDB paramIds (3 letters + 5 digits, e.g. "TTC00300")
// and UDTM-assigned PIDs (subsystem name + 4-digit sequence, e.g. "SMON20001",
// "ADC10002", "UDTM0004" — see gateway subsystemFromPID, which strips the
// last 4 digits as the sequence number regardless of subsystem name length).
const PARAM_ID_RE = /^[A-Za-z][A-Za-z0-9]*\d{4}$/i;

/** Human-readable reason for the last failed fetch, empty on success. */
export const lastError = ref<string>("");

let reverseMapSourceRef: Record<string, string> | null = null;
let reverseMnemonicToIds = new Map<string, string[]>();
let pidMnemonicSourceRef: Record<string, string> | null = null;
let allPidMnemonicsCache: string[] = [];
const subsystemMnemonicCache = new Map<string, string[]>();
const subsystemMnemonicInFlight = new Map<string, Promise<string[]>>();
const subsystemPidMnemonicCache = new Map<string, string[]>();

function normalizeSubsystemKey(subsystem: string): string {
  return String(subsystem ?? "").trim();
}

function clearDerivedCaches(): void {
  subsystemMnemonicCache.clear();
  subsystemMnemonicInFlight.clear();
  subsystemPidMnemonicCache.clear();
}

function ensureReverseMnemonicIndex(): void {
  const src = paramIdMnemonicMap.value;
  if (reverseMapSourceRef === src) return;

  reverseMapSourceRef = src;
  reverseMnemonicToIds = new Map<string, string[]>();
  for (const [pid, mnemonic] of Object.entries(src)) {
    if (!pid || !mnemonic) continue;
    const key = String(mnemonic).trim();
    if (!key) continue;
    const list = reverseMnemonicToIds.get(key);
    if (list) list.push(pid);
    else reverseMnemonicToIds.set(key, [pid]);
  }
}

function ensureAllPidMnemonicsCache(): void {
  const src = paramIdMnemonicMap.value;
  if (pidMnemonicSourceRef === src) return;

  pidMnemonicSourceRef = src;
  allPidMnemonicsCache = Object.entries(src)
    .filter(([pid, mnemonic]) => !!pid && !!String(mnemonic).trim())
    .map(([pid, mnemonic]) => `${pid}_${String(mnemonic).trim()}`);

  // PID mapping changes invalidate per-subsystem pid_mnemonic expansion.
  subsystemPidMnemonicCache.clear();
}

// ── Load function ─────────────────────────────────────────────────────────

/**
 * Fetch mnemonic data from the Gateway.
 * - Skips re-fetch unless `force = true`.
 * - Updates `gatewayUrl` if a new `url` argument is supplied.
 */
export async function loadMnemonics(force = false, url?: string): Promise<void> {
  if (url) gatewayUrl.value = url.replace(/\/$/, ""); // strip trailing slash
  if (!force && gatewayAvailable.value) return;
  if (mnemonicsLoading.value) return;

  mnemonicsLoading.value = true;
  lastError.value = "";

  const base = gatewayUrl.value;

  try {
    // ── Cheap endpoints first ─────────────────────────────────────────────
    // These are small and give us the live-key list we use to version the
    // IndexedDB cache, so we can decide whether to skip the heavy fetches.
    const [subsysRes, liveRes] = await Promise.allSettled([
      fetch(`${base}/get/tm/subsystems`),
      fetch(`${base}/tm/mnemonics`),
    ]);

    // ── Subsystem list (/get/tm/subsystems) ────────────────────────────────
    if (subsysRes.status === "fulfilled" && subsysRes.value.ok) {
      const data = (await subsysRes.value.json()) as { subsystems?: string[] };
      subsystems.value = data.subsystems ?? [];
    }

    // ── Live key list (/tm/mnemonics) ─────────────────────────────────────
    let live: string[] = [];
    if (liveRes.status === "rejected") {
      lastError.value = `Network error: ${liveRes.reason?.message ?? liveRes.reason}`;
    } else if (!liveRes.value.ok) {
      lastError.value = `HTTP ${liveRes.value.status} from ${base}/tm/mnemonics`;
    } else {
      const data = (await liveRes.value.json()) as { mnemonics?: string[] };
      live = data.mnemonics ?? [];
      liveMnemonics.value = live;
      gatewayAvailable.value = true;
    }

    // ── IndexedDB cache: skip the ~5 MB catalog + ~0.4 MB mapping fetches ──
    // when we already hold a copy whose version matches the current live list.
    // mnemonics are effectively immutable between catalogue uploads, so this is
    // a network hit only on the very first load (or after a re-upload).
    const version = mnemonicVersion(live);
    if (!force) {
      const cached = await getCachedMnemonics(version);
      if (cached) {
        mnemonicCatalog.value   = cached.catalog;
        paramIdMnemonicMap.value = cached.mapping;
        clearDerivedCaches();
        if (cached.subsystems.length && subsystems.value.length === 0) {
          subsystems.value = cached.subsystems;
        }
        gatewayAvailable.value = true;
        return; // cache hit — no heavy network transfer
      }
    }

    // ── Cache miss (or forced refresh): fetch the heavy payloads ──────────
    // No single all-subsystems+metadata or id-mapping endpoint exists on
    // this gateway — build both the rich catalog and the paramId→mnemonic
    // map by looping GET /get/tm/details/{subsystem} over every subsystem
    // from the list fetched above.
    let catalog: MnemonicInfo[] = mnemonicCatalog.value;
    let mapping: Record<string, string> = paramIdMnemonicMap.value;
    if (subsystems.value.length > 0) {
      const detailResults = await Promise.allSettled(
        subsystems.value.map((sub) => fetch(`${base}/get/tm/details/${encodeURIComponent(sub)}`)),
      );

      const newCatalog: MnemonicInfo[] = [];
      const newMapping: Record<string, string> = {};

      for (const res of detailResults) {
        if (res.status !== "fulfilled" || !res.value.ok) continue;
        const rows = (await res.value.json()) as unknown;
        if (!Array.isArray(rows)) continue;
        for (const d of rows as Array<Record<string, unknown>>) {
          const mnemonic = String(d.mnemonic ?? "").trim();
          if (!mnemonic) continue;
          newCatalog.push({
            mnemonic,
            subsystem: d.subsystem as string | undefined,
            type:      d.parameter_type as string | undefined,
            unit:      d.unit as string | undefined,
          });
          const pid = String(d.pid_no ?? "").trim();
          if (pid) newMapping[pid] = mnemonic;
        }
      }

      if (newCatalog.length > 0) {
        catalog = newCatalog;
        mnemonicCatalog.value = catalog;
      }
      if (Object.keys(newMapping).length > 0) {
        mapping = newMapping;
        paramIdMnemonicMap.value = mapping;
      }
    }

    clearDerivedCaches();

    if (!gatewayAvailable.value && !lastError.value) {
      lastError.value = "No mnemonics returned.";
    }

    // ── Persist for next load (only when we actually fetched data) ────────
    // JSON round-trip strips Vue reactive Proxy wrappers so IndexedDB's
    // structured-clone algorithm doesn't throw DataCloneError on Proxy objects.
    if (gatewayAvailable.value && (catalog.length > 0 || Object.keys(mapping).length > 0)) {
      void setCachedMnemonics({
        version,
        catalog:    JSON.parse(JSON.stringify(catalog)),
        mapping:    JSON.parse(JSON.stringify(mapping)),
        subsystems: JSON.parse(JSON.stringify(subsystems.value)),
        live:       [...live],
        savedAt: Date.now(),
      });
    }

  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    lastError.value = msg;
    console.warn("[mnemonicStore] Gateway fetch failed:", msg);
  } finally {
    mnemonicsLoading.value = false;
  }
}

/**
 * Hard-reset the mnemonic cache: wipe the persisted IndexedDB copy, then
 * refetch everything from the gateway (which repopulates the cache). Use this
 * for an explicit "Clear cache & reload" action. For an ordinary reload prefer
 * loadMnemonics(true) — it already refetches and overwrites the cache without
 * needing the wipe.
 */
export async function reloadMnemonicsFromBackend(): Promise<void> {
  await clearCachedMnemonics();
  gatewayAvailable.value = false; // ensure loadMnemonics doesn't early-return
  await loadMnemonics(true);
}

// ── Per-subsystem helpers ─────────────────────────────────────────────────

/**
 * Fetch the list of mnemonic names belonging to a subsystem.
 * Returns an empty array on network failure (offline-safe).
 */
export async function loadMnemonicsForSubsystem(subsystem: string): Promise<string[]> {
  const key = normalizeSubsystemKey(subsystem);
  if (!key) return [];

  const cached = subsystemMnemonicCache.get(key);
  if (cached) return cached;

  const active = subsystemMnemonicInFlight.get(key);
  if (active) return active;

  // Fast local path: when the catalog is loaded, derive subsystem mnemonics without a network hop.
  if (mnemonicCatalog.value.length > 0) {
    const keyLower = key.toLowerCase();
    const local = mnemonicCatalog.value
      .filter((r) => (r.subsystem ?? "").trim().toLowerCase() === keyLower)
      .map((r) => resolveTelemetryKey(r.mnemonic))
      .filter((v) => !!v.trim());
    if (local.length > 0) {
      const normalized = Array.from(new Set(local));
      subsystemMnemonicCache.set(key, normalized);
      return normalized;
    }
  }

  const base = gatewayUrl.value;
  const request = (async (): Promise<string[]> => {
    try {
      const res = await fetch(`${base}/get/tm/mnemonic_list/${encodeURIComponent(key)}`);
      if (!res.ok) return [];
      const data = await res.json();
      if (!Array.isArray(data)) return [];
      const normalized = (data as string[])
        .map((v) => resolveTelemetryKey(v))
        .filter((v) => !!v.trim());
      const unique = Array.from(new Set(normalized));
      subsystemMnemonicCache.set(key, unique);
      return unique;
    } catch {
      return [];
    } finally {
      subsystemMnemonicInFlight.delete(key);
    }
  })();

  subsystemMnemonicInFlight.set(key, request);
  return request;
}

/**
 * Fetch the discrete possible states (range) for a mnemonic.
 * Returns an empty array when the mnemonic is continuous or on error.
 */
export async function loadMnemonicRange(_subsystem: string, mnemonic: string): Promise<string[]> {
  const base = gatewayUrl.value;
  // The API accepts the paramId (e.g. "TTC00300") for direct primary-key lookup.
  // Extract the leading paramId from a pid_mnemonic string like "TTC00300_C_TX-1_STS".
  let apiMnemonic = mnemonic.trim();
  const underscoreIdx = apiMnemonic.indexOf("_");
  if (underscoreIdx > 0) {
    const maybeId = apiMnemonic.slice(0, underscoreIdx);
    if (PARAM_ID_RE.test(maybeId)) {
      apiMnemonic = maybeId; // standard paramId (3 letters + 5 digits)
    } else {
      // ponytail: UDTM PIDs (e.g. SMON10001) — not a standard paramId, use plain mnemonic
      apiMnemonic = apiMnemonic.slice(underscoreIdx + 1);
    }
  }
  try {
    const res = await fetch(`${base}/get/tm/${apiMnemonic}/range`);
    if (!res.ok) return [];
    const data = (await res.json()) as { range?: string[] | null };
    return Array.isArray(data.range) ? data.range : [];
  } catch {
    return [];
  }
}

// ── TC helpers ────────────────────────────────────────────────────────────

/** Fetch distinct subsystem names from tc_mnemonics. */
export async function loadTcSubsystems(): Promise<string[]> {
  const base = gatewayUrl.value;
  try {
    const res = await fetch(`${base}/telecommand/subsystems`);
    if (!res.ok) return [];
    const data = await res.json() as { subsystems?: string[] };
    return data.subsystems ?? [];
  } catch {
    return [];
  }
}

/**
 * Fetch TC mnemonics (command strings), optionally filtered by subsystem.
 * Pass "all" or omit to get everything.
 * API returns plain string[] e.g. ["PHASE_METER_MNT_RATE_SECS", ...]
 */
export async function loadTcMnemonicsForSubsystem(subsystem?: string): Promise<string[]> {
  const base = gatewayUrl.value;
  const path = subsystem && subsystem !== "all"
    ? `${base}/mnemonics/tc/${encodeURIComponent(subsystem)}`
    : `${base}/mnemonics/tc/all`;
  try {
    const res = await fetch(path);
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? (data as string[]) : [];
  } catch {
    return [];
  }
}

let tcDisplayMapCache: Record<string, string> | null = null;
let tcDisplayMapInFlight: Promise<Record<string, string>> | null = null;

/**
 * Fetch TC display labels keyed by command value.
 *
 * The `/mnemonics/tc` payload is richer than `/mnemonics/tc/all` and may include
 * `full_ref` in id_mnemonic style. The editor uses this only for dropdown labels
 * while preserving stored command values.
 */
export async function loadTcMnemonicDisplayMap(force = false): Promise<Record<string, string>> {
  if (!force && tcDisplayMapCache) return tcDisplayMapCache;
  if (!force && tcDisplayMapInFlight) return tcDisplayMapInFlight;

  const base = gatewayUrl.value;
  const request = (async (): Promise<Record<string, string>> => {
    try {
      const res = await fetch(`${base}/mnemonics/tc`);
      if (!res.ok) return tcDisplayMapCache ?? {};

      const data = await res.json();
      const map: Record<string, string> = {};

      if (Array.isArray(data)) {
        for (const row of data as Array<Record<string, unknown> | string>) {
          if (typeof row === "string") {
            const raw = row.trim();
            if (raw) map[raw] = raw;
            continue;
          }

          const command = String(
            row.command ?? row.cmdDesc ?? row.mnemonic ?? row.name ?? "",
          ).trim();
          if (!command) continue;

          const label = String(
            row.full_ref ?? row.fullRef ?? row.id_mnemonic ?? row.display ?? command,
          ).trim();

          map[command] = label || command;
        }
      }

      tcDisplayMapCache = map;
      return map;
    } catch {
      return tcDisplayMapCache ?? {};
    } finally {
      tcDisplayMapInFlight = null;
    }
  })();

  tcDisplayMapInFlight = request;
  return request;
}

// ── Suggestions helper ────────────────────────────────────────────────────

export function buildSuggestions(): { value: string; label: string }[] {
  // liveMnemonics is the complete key list (3000+); enrich with catalog metadata where available
  if (liveMnemonics.value.length > 0) {
    const meta = new Map(mnemonicCatalog.value.map((m) => [m.mnemonic, m]));
    const unique = Array.from(new Set(liveMnemonics.value.map((v) => resolveTelemetryKey(v)).filter(Boolean)));
    return unique.map((v) => {
      const m = meta.get(v);
      return {
        value: v,
        label: m ? [m.mnemonic, m.subsystem, m.unit].filter(Boolean).join(" · ") : v,
      };
    });
  }
  if (mnemonicCatalog.value.length > 0) {
    return mnemonicCatalog.value.map((m) => ({
      value: m.mnemonic,
      label: [m.mnemonic, m.subsystem, m.unit].filter(Boolean).join(" · "),
    }));
  }
  return [...SIMULATED_TOPICS].map((t) => ({ value: t, label: t }));
}

export function resolveTelemetryKey(key: string): string {
  const raw = String(key ?? "").trim();
  if (!raw) return raw;

  // Direct ParamId lookup (e.g. "PLD05401" -> "ACMU_1_STS").
  const mapped = paramIdMnemonicMap.value[raw];
  if (mapped) return mapped;

  // Handle legacy id_mnemonic form (e.g. "PLD05401_ACMU_1_STS").
  const underscore = raw.indexOf("_");
  if (underscore > 0) {
    const maybeId = raw.slice(0, underscore);
    const rest = raw.slice(underscore + 1);
    if (PARAM_ID_RE.test(maybeId)) {
      return paramIdMnemonicMap.value[maybeId] ?? rest;
    }
  }

  return raw;
}

export function telemetryKeyAliases(key: string): string[] {
  const raw = String(key ?? "").trim();
  if (!raw) return [];

  const aliases: string[] = [raw];
  const canonical = resolveTelemetryKey(raw);
  if (canonical && canonical !== raw) aliases.push(canonical);

  // Mnemonic -> PID bridge: if live telemetry arrives as mnemonic names but
  // diagram bindings use bare paramIds, include those paramIds as aliases.
  ensureReverseMnemonicIndex();
  const fromRaw = reverseMnemonicToIds.get(raw);
  if (fromRaw?.length) aliases.push(...fromRaw);
  const fromCanonical = reverseMnemonicToIds.get(canonical);
  if (fromCanonical?.length) aliases.push(...fromCanonical);

  const underscore = raw.indexOf("_");
  if (underscore > 0) {
    const maybeId = raw.slice(0, underscore);
    const rest = raw.slice(underscore + 1);
    if (PARAM_ID_RE.test(maybeId)) {
      // Critical alias: many diagram bindings store bare paramId (e.g. CCS00425)
      // while live telemetry can arrive as PID_mnemonic (e.g. CCS00425_STATUS).
      aliases.push(maybeId);
      if (rest) aliases.push(rest);
      const mappedById = paramIdMnemonicMap.value[maybeId];
      if (mappedById) aliases.push(mappedById);
    }
  }

  return Array.from(new Set(aliases.filter(Boolean)));
}

export function mapTelemetryKeys(values: Record<string, unknown>): Record<string, unknown> {
  const mapped: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(values)) {
    const raw = String(key ?? "").trim();
    if (!raw) continue;

    // Keep all useful aliases so TM lookups work for PID, mnemonic, and PID_MNEMONIC formats.
    for (const alias of telemetryKeyAliases(raw)) {
      mapped[alias] = value;
    }

    // If raw is a plain PID and mapping exists, also expose PID_MNEMONIC.
    if (PARAM_ID_RE.test(raw)) {
      const mappedMnemonic = paramIdMnemonicMap.value[raw];
      if (mappedMnemonic) {
        mapped[`${raw}_${mappedMnemonic}`] = value;
      }
    }
  }
  return mapped;
}

/**
 * Build a list of all available pid_mnemonics (PID_MNEMONIC format).
 * Combines ParamId with mnemonic using the paramIdMnemonicMap.
 */
export function buildPidMnemonics(): string[] {
  ensureAllPidMnemonicsCache();
  return allPidMnemonicsCache;
}

/**
 * Get pid_mnemonics for a specific subsystem.
 * Loads mnemonics for the subsystem and combines them with their PIDs.
 */
export async function loadPidMnemonicsForSubsystem(subsystem: string): Promise<string[]> {
  const key = normalizeSubsystemKey(subsystem);
  if (!key || key.toLowerCase() === "all") {
    return buildPidMnemonics();
  }

  const cached = subsystemPidMnemonicCache.get(key);
  if (cached) return cached;

  // Source of truth: backend per-subsystem endpoint. It may already return
  // PID_MNEMONIC strings, and those should be shown exactly in the dropdown.
  const base = gatewayUrl.value;
  try {
    const res = await fetch(`${base}/get/tm/pid_mnemonic_list/${encodeURIComponent(key)}`);
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        const raw = (data as string[])
          .map((v) => String(v ?? "").trim())
          .filter(Boolean);

        const pidLike = raw.filter((v) => {
          const us = v.indexOf("_");
          if (us <= 0) return false;
          const maybeId = v.slice(0, us);
          return PARAM_ID_RE.test(maybeId);
        });

        if (pidLike.length > 0) {
          const unique = Array.from(new Set(pidLike));
          subsystemPidMnemonicCache.set(key, unique);
          return unique;
        }

        // If backend returns plain mnemonic names, expand to PID_MNEMONIC.
        ensureReverseMnemonicIndex();
        const expanded: string[] = [];
        for (const mnem of raw.map((v) => resolveTelemetryKey(v)).filter(Boolean)) {
          const ids = reverseMnemonicToIds.get(mnem);
          if (!ids?.length) continue;
          for (const pid of ids) expanded.push(`${pid}_${mnem}`);
        }
        // ponytail: SMON/ADC mnemonics have no paramId → fall back to plain names
        const unique = Array.from(new Set(expanded.length > 0 ? expanded : raw));
        subsystemPidMnemonicCache.set(key, unique);
        return unique;
      }
      // data.length === 0 is treated as a soft failure, not "no PID
      // mnemonics for this subsystem": the real gateway has a duplicate
      // route registration for /get/tm/pid_mnemonic_list/{subsystem} (see
      // router.go — a later TC route silently shadows the TM one this call
      // needs), so TM-only subsystems (e.g. SMON1) always get []. Fall
      // through to local reconstruction below instead of trusting that as
      // a genuine empty result.
    }
  } catch {
    // Fall back to local reconstruction below.
  }

  // Fallback path for offline/errors: reconstruct from cached catalog + id map.
  ensureReverseMnemonicIndex();
  const mnemonics = await loadMnemonicsForSubsystem(key);
  const fallbackPidMnemonics: string[] = [];
  for (const mnem of mnemonics) {
    const ids = reverseMnemonicToIds.get(mnem);
    if (!ids?.length) continue;
    for (const pid of ids) fallbackPidMnemonics.push(`${pid}_${mnem}`);
  }

  const unique = Array.from(new Set(fallbackPidMnemonics));
  subsystemPidMnemonicCache.set(key, unique);
  return unique;
}

/**
 * Extract PID from a pid_mnemonic string (e.g., "TTC00300_C_TX-1_STS" -> "TTC00300").
 */
export function extractPidFromPidMnemonic(pidMnemonic: string): string {
  const underscore = pidMnemonic.indexOf("_");
  if (underscore > 0) {
    const maybeId = pidMnemonic.slice(0, underscore);
    if (PARAM_ID_RE.test(maybeId)) {
      return maybeId;
    }
  }
  return "";
}
