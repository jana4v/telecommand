import type { GuidedCategoryDef } from "../types";

export const hornAntenna: GuidedCategoryDef = {
  params: [
    { key: "antennaStatus", label: "ON / OFF Status", hint: '"ON" | "OFF"',            fixedValues: ["ON", "OFF"] },
    { key: "antennaMode",   label: "Antenna Mode",   hint: '"TX" | "RX" | "TX+RX"',   fixedValues: ["TX", "RX", "TX+RX"], optional: true },
    { key: "isInvalid",     label: "Is Invalid",     hint: '"true" | "false"',         fixedValues: ["true", "false"], optional: true },
  ],
  body: () =>
    `return {\n` +
    `  position:  antennaStatus === "ON" ? 1 : 0,\n` +
    `  mode:      antennaMode ?? "TX",\n` +
    `  isInvalid,\n` +
    `};\n`,
};
