import { computed, type ComputedRef } from "vue";

/** ON/OFF from statusColor (non-empty & not gradient:off = ON) — used by DA, RF, filters, etc. */
export function useDaStatusVal(data: ComputedRef<Record<string, unknown>> | (() => Record<string, unknown>)) {
  const get = typeof data === "function" ? data : () => data.value;
  return computed(() => {
    const sc = get().statusColor as string | undefined;
    return (!!sc && sc !== "" && sc !== "gradient:off") ? "on" : "off";
  });
}

/** FPGA inner border color picker: valid #hex or fall back to status / default */
export function useInnerBorderColorPicker(data: ComputedRef<Record<string, unknown>> | (() => Record<string, unknown>)) {
  const get = typeof data === "function" ? data : () => data.value;
  return computed(() => {
    const d = get();
    const ib = d.innerBorderColor as string | undefined;
    if (typeof ib === "string" && /^#[0-9A-Fa-f]{6}$/.test(ib.trim())) return ib.trim();
    const sc = d.statusColor as string | undefined;
    if (typeof sc === "string" && /^#[0-9A-Fa-f]{6}$/.test(sc.trim())) return sc.trim();
    return "#27ae60";
  });
}

/** Bandpass/LPF: temperature label visible when temperature is a real number */
export function useBpfTempEnabled(data: ComputedRef<Record<string, unknown>> | (() => Record<string, unknown>)) {
  const get = typeof data === "function" ? data : () => data.value;
  return computed(() => {
    const t = get().temperature;
    return t !== undefined && t !== null && typeof t === "number" && !Number.isNaN(t);
  });
}
