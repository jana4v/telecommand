import type { GuidedCategoryDef } from "../types";

// lockStatus → isLocked (inner die outline turns orange when LOCKED)
export const fpga: GuidedCategoryDef = {
  params: [
    { key: "fpgaStatus", label: "Status", hint: '"ON" | "OFF"', fixedValues: ["ON", "OFF"] },
    { key: "lockStatus", label: "Lock status", hint: '"LOCK" | "UNLOCK"', fixedValues: ["LOCK", "UNLOCK"] },
    { key: "temperature", label: "Temperature", hint: "number (°C)", optional: true },
    { key: "isInvalid", label: "Is Invalid", hint: '"true" | "false"', fixedValues: ["true", "false"], optional: true },
  ],
  body: () =>
    `return {\n` +
    `  statusColor: fpgaStatus === "ON" ? "#27ae60" : "#1a1a2e",\n` +
    `  isLocked: lockStatus === "LOCK",\n` +
    `  temperature: temperature !== undefined && temperature !== "" ? +temperature : undefined,\n` +
    `  isInvalid,\n` +
    `};\n`,
};
