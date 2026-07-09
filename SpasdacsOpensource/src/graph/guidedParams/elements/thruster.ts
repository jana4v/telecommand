import type { GuidedCategoryDef } from "../types";

export const thruster: GuidedCategoryDef = {
  params: [
    {
      key: "thrustLevel",
      label: "Thrust Level",
      hint: "Normalised thrust 0–1 (0 = engine off, 1 = full thrust). Decimal values for partial thrust.",
      fixedValues: ["0", "1"],
    },
    {
      key: "oxidizerEnable",
      label: "Oxidizer Valve",
      hint: '"true" to open oxidizer valve | "false" to close',
      fixedValues: ["true", "false"],
    },
    {
      key: "fuelEnable",
      label: "Fuel Valve",
      hint: '"true" to open fuel valve | "false" to close',
      fixedValues: ["true", "false"],
    },
    {
      key: "isInvalid",
      label: "Is Invalid",
      hint: '"true" overlays a red fault indicator',
      fixedValues: ["true", "false"],
      optional: true,
    },
  ],
  body: () => `
// Normalize thrustLevel to 0–1 float
const t = parseFloat(String(thrustLevel ?? 0));
const thrustVal = isNaN(t) ? 0 : Math.max(0, Math.min(1, t));

// Valve booleans
const truthy = ["1","true","on","yes","open","enable","enabled","active"];
const oxVal  = truthy.includes(String(oxidizerEnable ?? "").toLowerCase().trim());
const fuVal  = truthy.includes(String(fuelEnable ?? "").toLowerCase().trim());

return {
  thrustLevel:     thrustVal,
  oxidizerEnabled: oxVal,
  fuelEnabled:     fuVal,
  isInvalid:       isInvalid,
  statusColor:     thrustVal > 0 ? "#ff4018" : "#18e060",
};
`.trim(),
};
