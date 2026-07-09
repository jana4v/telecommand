import type { GuidedCategoryDef } from "../types";

export const bandpassFilter: GuidedCategoryDef = {
  params: [
    { key: "bpfStatus", label: "Status", hint: '"ON" | "OFF"', fixedValues: ["ON", "OFF"] },
    { key: "borderColor", label: "Border", hint: "hex color or TM state (empty = hidden)", optional: true, fetchRange: true },
    { key: "temperature", label: "Temperature", hint: "number (°C)", optional: true },
    { key: "isInvalid", label: "Is Invalid", hint: '"true" | "false"', fixedValues: ["true", "false"], optional: true },
  ],
  body: () =>
    `const _bc = borderColor !== undefined && borderColor !== false && borderColor !== "" ? String(borderColor) : "";\n` +
    `return {\n` +
    `  statusColor: bpfStatus === "ON" ? "#27ae60" : "",\n` +
    `  ...(_bc !== "" ? { stroke: _bc.startsWith("#") ? _bc : "", borderColorValue: _bc } : {}),\n` +
    `  temperature: temperature !== undefined && temperature !== false && temperature !== "" ? +temperature : null,\n` +
    `  isInvalid,\n` +
    `};\n`,
};

export const lowPassFilter: GuidedCategoryDef = {
  params: [
    { key: "lpfStatus", label: "Status", hint: '"ON" | "OFF"', fixedValues: ["ON", "OFF"] },
    { key: "borderColor", label: "Border", hint: "hex color or TM state (empty = hidden)", optional: true, fetchRange: true },
    { key: "temperature", label: "Temperature", hint: "number (°C)", optional: true },
    { key: "isInvalid", label: "Is Invalid", hint: '"true" | "false"', fixedValues: ["true", "false"], optional: true },
  ],
  body: () =>
    `const _bc = borderColor !== undefined && borderColor !== false && borderColor !== "" ? String(borderColor) : "";\n` +
    `return {\n` +
    `  statusColor: lpfStatus === "ON" ? "#27ae60" : "",\n` +
    `  ...(_bc !== "" ? { stroke: _bc.startsWith("#") ? _bc : "", borderColorValue: _bc } : {}),\n` +
    `  temperature: temperature !== undefined && temperature !== false && temperature !== "" ? +temperature : null,\n` +
    `  isInvalid,\n` +
    `};\n`,
};

export const system: GuidedCategoryDef = {
  params: [
    { key: "sysStatus", label: "Status", hint: '"ON" | "OFF"', fixedValues: ["ON", "OFF"] },
    { key: "borderColor", label: "Border", hint: "hex color or TM state (empty = hidden)", optional: true, fetchRange: true },
    { key: "temperature", label: "Temperature", hint: "number (°C)", optional: true },
    { key: "isInvalid", label: "Is Invalid", hint: '"true" | "false"', fixedValues: ["true", "false"], optional: true },
  ],
  body: () =>
    `const _bc = borderColor !== undefined && borderColor !== false && borderColor !== "" ? String(borderColor) : "";\n` +
    `return {\n` +
    `  statusColor: sysStatus === "ON" ? "#27ae60" : "",\n` +
    `  ...(_bc !== "" ? { stroke: _bc.startsWith("#") ? _bc : "", borderColorValue: _bc } : {}),\n` +
    `  temperature: temperature !== undefined && temperature !== false && temperature !== "" ? +temperature : null,\n` +
    `  isInvalid,\n` +
    `};\n`,
};
