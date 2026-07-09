/**
 * Shared in-memory store of the latest known telemetry values.
 *
 * Key   = mnemonic name (e.g. "TEMP", "PRESS") or legacy topic path
 *         (e.g. "factory/pump1/status") depending on the active source.
 * Value = last received raw value — string | number | boolean | unknown.
 *
 * Telemetry engine writes here; ViewerPage reads here to populate the hover tooltip.
 */
export const telemetryStore = new Map<string, unknown>();

export function setTelemetryValue(key: string, value: unknown): void {
  telemetryStore.set(key, value);
}

export function getTelemetryValue(key: string): unknown {
  return telemetryStore.get(key);
}

/** Return a shallow snapshot of all current mnemonic→value pairs. */
export function getAllValues(): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  telemetryStore.forEach((v, k) => { out[k] = v; });
  return out;
}

/** Remove all stored values (call when disconnecting a source). */
export function clearTelemetryStore(): void {
  telemetryStore.clear();
}
