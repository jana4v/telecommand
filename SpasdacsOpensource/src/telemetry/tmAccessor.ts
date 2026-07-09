/**
 * TM accessors for telemetry scripts and transforms: flat mnemonic view per stream,
 * full multi-stream view, and subsystem dot-notation on the default stream.
 */

import { mnemonicCatalog } from "../services/mnemonicStore";

/** Subsystem-style proxy for one flat mnemonic map (one stream). */
export function buildFlatTMAccessor(flat: Record<string, unknown>): Record<string, unknown> {
  const bySubsystem: Record<string, Record<string, unknown>> = {};
  for (const info of mnemonicCatalog.value) {
    if (!info.subsystem || !(info.mnemonic in flat)) continue;
    (bySubsystem[info.subsystem] ??= {})[info.mnemonic] = flat[info.mnemonic];
  }
  return new Proxy(flat, {
    get(target, prop) {
      if (typeof prop !== "string") return undefined;
      if (prop in target) return target[prop];
      if (prop in bySubsystem) return bySubsystem[prop];
      return undefined;
    },
  }) as Record<string, unknown>;
}

/**
 * Full TM object from the raw store: `streams[streamId][mnemonic]`, default mnemonics at top level,
 * and `TM.streams` for explicit access.
 */
export function buildFullTMAccessor(values: Record<string, unknown>): Record<string, unknown> {
  const byStream: Record<string, Record<string, unknown>> = {};
  for (const [k, v] of Object.entries(values)) {
    const idx = k.indexOf("::");
    if (idx === -1) {
      (byStream["default"] ??= {})[k] = v;
    } else {
      const sid = k.slice(0, idx);
      const mnem = k.slice(idx + 2);
      (byStream[sid] ??= {})[mnem] = v;
    }
  }
  const defaultFlat = { ...(byStream["default"] ?? {}) };
  const bySubsystem: Record<string, Record<string, unknown>> = {};
  for (const info of mnemonicCatalog.value) {
    if (!info.subsystem || !(info.mnemonic in defaultFlat)) continue;
    (bySubsystem[info.subsystem] ??= {})[info.mnemonic] = defaultFlat[info.mnemonic];
  }
  const base = { ...defaultFlat, streams: byStream } as Record<string, unknown>;
  return new Proxy(base, {
    get(target, prop) {
      if (typeof prop !== "string") return undefined;
      if (prop === "streams") return byStream;
      if (prop in defaultFlat) return defaultFlat[prop];
      if (prop in bySubsystem) return bySubsystem[prop];
      const sub = byStream[prop];
      return sub;
    },
  }) as Record<string, unknown>;
}

/** Narrow TM for one stream id (guided / single-stream scripts). */
export function buildStreamTMAccessor(values: Record<string, unknown>, streamId: string): Record<string, unknown> {
  const flat: Record<string, unknown> = {};
  const p = `${streamId}::`;
  for (const [k, v] of Object.entries(values)) {
    if (k.startsWith(p)) flat[k.slice(p.length)] = v;
  }
  return buildFlatTMAccessor(flat);
}
