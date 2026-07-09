import type { GuidedCategoryDef } from "../types";

export const pump: GuidedCategoryDef = {
  params: [
    { key: "status",    label: "Pump Status", hint: '"ON" | "OFF"',           fixedValues: ["ON", "OFF"] },
    { key: "pumpSpeed", label: "Pump Speed",  hint: "Speed in RPM (0–6000)",  optional: true },
    { key: "isInvalid", label: "Is Invalid",  hint: '"true" | "false"',       fixedValues: ["true", "false"], optional: true },
  ],
  body: () =>
    `return {\n` +
    `  statusColor: status === "ON" ? "#27ae60" : "",\n` +
    `  pumpSpeed,\n` +
    `  isInvalid,\n` +
    `};\n`,
};
