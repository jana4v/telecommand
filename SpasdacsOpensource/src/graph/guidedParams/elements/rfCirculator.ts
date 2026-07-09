import type { GuidedCategoryDef } from "../types";

export const rfCirculator: GuidedCategoryDef = {
  params: [
    { key: "temperature", label: "Temperature", hint: "number (°C)", optional: true },
    { key: "isInvalid", label: "Is Invalid", hint: '"true" | "false"', fixedValues: ["true", "false"], optional: true },
  ],
  body: () =>
    `return {\n` +
    `  temperature: temperature !== false && temperature !== undefined && temperature !== "" ? +temperature : undefined,\n` +
    `  isInvalid,\n` +
    `};\n`,
};
