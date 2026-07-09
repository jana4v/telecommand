import { ref } from "vue";
import type { NatsTelemetryStream } from "../types";
import { DEFAULT_TELEMETRY_STREAMS } from "../types";

const STORAGE_KEY = "spasdacs_telemetry_streams";

export const telemetryStreams = ref<NatsTelemetryStream[]>([...DEFAULT_TELEMETRY_STREAMS]);

export function loadTelemetryStreamsFromStorage(): void {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const p = JSON.parse(raw) as unknown;
    if (!Array.isArray(p) || p.length === 0) return;
    const valid = p.every(
      (x: unknown) =>
        x &&
        typeof x === "object" &&
        typeof (x as { id: string }).id === "string" &&
        (x as { id: string }).id.trim() !== "" &&
        typeof (x as { label: string }).label === "string" &&
        Array.isArray((x as { subjectSuffixes: string[] }).subjectSuffixes) &&
        (x as { subjectSuffixes: string[] }).subjectSuffixes.length > 0 &&
        (x as { subjectSuffixes: string[] }).subjectSuffixes.every((s) => typeof s === "string" && s.trim() !== ""),
    );
    if (valid) telemetryStreams.value = p as NatsTelemetryStream[];
  } catch {
    /* ignore */
  }
}

export function saveTelemetryStreamsToStorage(): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(telemetryStreams.value));
  } catch {
    /* ignore */
  }
}

export function resetTelemetryStreamsToDefault(): void {
  telemetryStreams.value = [...DEFAULT_TELEMETRY_STREAMS];
  saveTelemetryStreamsToStorage();
}
