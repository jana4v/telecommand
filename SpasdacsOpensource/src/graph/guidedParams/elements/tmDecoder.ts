import type { GuidedCategoryDef } from "../types";

export const tmDecoder: GuidedCategoryDef = {
  params: [
    { key: "tmDecoderStatus", label: "On/Off Mnemonic", hint: '"ON" | "OFF"', fixedValues: ["ON", "OFF"] },
    { key: "temperature", label: "Temperature Mnemonic", hint: "number (C)" },
  ],
  body: () =>
    `return {\n` +
    `  statusColor: tmDecoderStatus === "ON" ? "#27ae60" : "",\n` +
    `  temperature: +temperature,\n` +
    `};\n`,
};
