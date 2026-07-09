import type { TelemetryBinding, DataGridRow } from "../types";

/**
 * Build the telemetry bindings array for a DataGrid element from its rows.
 * Auto-manages `tg_v_<id>` (value) and `tg_l_<id>` (label) entries while
 * preserving any user-created bindings that are not auto-managed.
 */
export function buildDataGridBindings(
  rows: DataGridRow[],
  existingBindings: TelemetryBinding[] = [],
): TelemetryBinding[] {
  const bindings: TelemetryBinding[] = [];

  for (const row of rows) {
    if (row.valueTopic?.trim()) {
      bindings.push({
        id:         `tg_v_${row.id}`,
        topic:      row.valueTopic.trim(),
        targetProp: `tg_v_${row.id}`,
        transform:  "v",
      } as TelemetryBinding);
    }
    if (row.labelTopic?.trim()) {
      bindings.push({
        id:         `tg_l_${row.id}`,
        topic:      row.labelTopic.trim(),
        targetProp: `tg_l_${row.id}`,
        transform:  "String(v)",
      } as TelemetryBinding);
    }
  }

  // Preserve user-added bindings that are NOT auto-managed by DataGrid
  const autoIds = new Set(rows.flatMap(r => [`tg_v_${r.id}`, `tg_l_${r.id}`]));
  const userBindings = existingBindings.filter(
    b => !autoIds.has(b.id)
      && !b.targetProp.startsWith("tg_v_")
      && !b.targetProp.startsWith("tg_l_"),
  );

  return [...bindings, ...userBindings];
}
