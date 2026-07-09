import type { GuidedCategoryDef } from "../types";

export const sspa: GuidedCategoryDef = {
  params: [
    { key: "sspaStatus",  label: "Status",      hint: '"ON" | "OFF"',        fixedValues: ["ON", "OFF"] },
    { key: "temperature", label: "Temperature",  hint: "number (°C)",         optional: true },
    { key: "isInvalid",   label: "Is Invalid",   hint: '"true" | "false"',    fixedValues: ["true", "false"], optional: true },
  ],
  body: () =>
    `return {\n` +
    `  statusColor: sspaStatus === "ON" ? "#27ae60" : "",\n` +
    `  temperature: temperature !== undefined && temperature !== false && temperature !== "" ? +temperature : null,\n` +
    `  isInvalid,\n` +
    `};\n`,
};
