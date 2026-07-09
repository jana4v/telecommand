import type { GuidedCategoryDef } from "../types";

export const monopropThruster: GuidedCategoryDef = {
  params: [
    {
      key: "thrustLevel",
      label: "Thrust Level",
      hint: "Normalised thrust 0-1 (0 = engine off, 1 = full thrust). Decimal values for partial thrust.",
      fixedValues: ["0", "1"],
    },
    {
      key: "fuelEnable",
      label: "Propellant Valve",
      hint: '"true" to open propellant valve | "false" to close',
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
// Normalize thrustLevel to 0-1 float
const t = parseFloat(String(thrustLevel ?? 0));
const thrustVal = isNaN(t) ? 0 : Math.max(0, Math.min(1, t));

// Valve boolean
const truthy = ["1","true","on","yes","open","enable","enabled","active"];
const fuVal  = truthy.includes(String(fuelEnable ?? "").toLowerCase().trim());

return {
  thrustLevel:  thrustVal,
  fuelEnabled:  fuVal,
  isInvalid:    isInvalid,
  statusColor:  thrustVal > 0 ? "#ffa030" : "#18e060",
};
`.trim(),
};
