import type { TelemetryBinding } from "../types";

/**
 * Build the telemetry bindings array for a TextBox element.
 * Manages two auto-bindings:
 *   tg_text  — text content mnemonic (textTopic)
 *   tg_color — color-condition source mnemonic (colorTopic)
 * Preserves any user-created bindings that are not auto-managed.
 */
export function buildTextBoxBindings(
  textTopic:  string,
  colorTopic: string,
  existingBindings: TelemetryBinding[] = [],
): TelemetryBinding[] {
  const bindings: TelemetryBinding[] = [];

  if (textTopic?.trim()) {
    bindings.push({
      id:         "tg_text",
      topic:      textTopic.trim(),
      targetProp: "tg_text",
      transform:  "String(v)",
    } as TelemetryBinding);
  }

  if (colorTopic?.trim()) {
    bindings.push({
      id:         "tg_color",
      topic:      colorTopic.trim(),
      targetProp: "tg_color",
      transform:  "v",
    } as TelemetryBinding);
  }

  // Preserve user-added bindings not managed by TextBox
  const autoIds = new Set(["tg_text", "tg_color"]);
  const userBindings = existingBindings.filter(b => !autoIds.has(b.id));

  return [...bindings, ...userBindings];
}
