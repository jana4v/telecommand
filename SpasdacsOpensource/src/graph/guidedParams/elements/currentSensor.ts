import type { GuidedCategoryDef } from "../types";

/**
 * Current Sensor — guided Simple Mode parameters.
 *
 * TM → element state mapping:
 *   current → currentValue   (numeric reading, displayed in the digital readout)
 *
 * Colour conditions:
 *   The displayed colour is driven by `statusColor`. The user can attach a
 *   SECOND binding (Bindings tab) targeting `statusColor` with any number of
 *   threshold rules — e.g. `value > 5` → `"#e74c3c"`, `value > 2` → `"#ff9800"`,
 *   else → `"#27ae60"`. Rules support unlimited conditions out of the box.
 */
export const currentSensor: GuidedCategoryDef = {
  params: [
    { key: "current", label: "Current", hint: "number (A or mA per element units)" },
  ],
  body: () =>
    `return {\n` +
    `  currentValue: current !== undefined && current !== "" ? +current : undefined,\n` +
    `};\n`,
};
