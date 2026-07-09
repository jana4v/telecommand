import type { GuidedCategoryDef } from "../types";

// daStatus  → statusColor  (ON = green #22c55e, OFF = blank)
// daMode    → statusText   ("FGM" or "ALC")
// boa       → gaugeValue   (Back-of-Attenuation dB)
// temperature → temperature (°C, displayed bottom-right)
export const driverAmplifier: GuidedCategoryDef = {
  params: [
    { key: "daStatus", label: "DA Status", hint: '"ON" | "OFF"', fixedValues: ["ON", "OFF"] },
    { key: "daMode", label: "Mode", hint: '"FGM" | "ALC"', fixedValues: ["FGM", "ALC"] },
    { key: "boa", label: "BOA", hint: "number (dB)" },
    { key: "temperature", label: "Temperature", hint: "number (°C)" },
  ],
  body: () =>
    `return {\n` +
    `  statusColor: daStatus === "ON" ? "#22c55e" : "",\n` +
    `  statusText:  daMode,\n` +
    `  gaugeValue:  +boa,\n` +
    `  temperature: +temperature,\n` +
    `};\n`,
};
