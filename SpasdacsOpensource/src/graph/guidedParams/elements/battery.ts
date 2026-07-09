import type { GuidedCategoryDef } from "../types";

export const battery: GuidedCategoryDef = {
  params: [
    { key: "chargeLevel", label: "Charge Level", hint: "0–100" },
    { key: "isCharging", label: "Is Charging", hint: '"true" | "false"', fixedValues: ["true", "false"] },
    { key: "batteryAnim", label: "Battery Anim", hint: "0–100 (animation driver)" },
    { key: "isInvalid", label: "Is Invalid", hint: '"true" | "false"', fixedValues: ["true", "false"], optional: true },
  ],
  body: () =>
    `const pct = Math.min(100, Math.max(0, chargeLevel));\n` +
    `return {\n` +
    `  chargeLevel: pct,\n` +
    `  isCharging,\n` +
    `  batteryAnim: batteryAnim,\n` +
    `  isInvalid,\n` +
    `};\n`,
};
