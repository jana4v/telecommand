import type { GuidedCategoryDef } from "../types";

export const radiatorFan: GuidedCategoryDef = {
  params: [
    { key: "fanState", label: "Fan State", hint: '"ON" | "OFF"', fixedValues: ["ON", "OFF"] },
    { key: "temperature", label: "Radiator Temp", hint: "Temperature in C", optional: true },
    { key: "isInvalid", label: "Is Invalid", hint: '"true" | "false"', fixedValues: ["true", "false"], optional: true },
  ],
  body: () =>
    `const onVals = ["1","on","true","yes","active","running"];
` +
    `const fanOn = onVals.includes(String(fanState ?? "").toLowerCase().trim());
` +
    `return {\n` +
    `  flowActive: fanOn,\n` +
    `  statusColor: fanOn ? "#27ae60" : "",\n` +
    `  temperature,\n` +
    `  isInvalid,\n` +
    `};\n`,
};
