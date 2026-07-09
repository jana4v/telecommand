import type { GuidedCategoryDef } from "../types";

export const heaterPlate: GuidedCategoryDef = {
  params: [
    { key: "heaterState", label: "Heater State", hint: '"ON" | "OFF"', fixedValues: ["ON", "OFF"] },
    { key: "temperature", label: "Plate Temp", hint: "Temperature in C", optional: true },
    { key: "isInvalid", label: "Is Invalid", hint: '"true" | "false"', fixedValues: ["true", "false"], optional: true },
  ],
  body: () =>
    `const onVals = ["1","on","true","yes","active","running","heat"];\n` +
    `const heaterEnabled = onVals.includes(String(heaterState ?? "").toLowerCase().trim());\n` +
    `return {\n` +
    `  heaterOn: heaterEnabled,\n` +
    `  statusColor: heaterEnabled ? "#ff8a3d" : "",\n` +
    `  temperature,\n` +
    `  isInvalid,\n` +
    `};\n`,
};
