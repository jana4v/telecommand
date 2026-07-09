import type { GuidedCategoryDef } from "../types";

// twtaSts + anadovoltage → statusColor (TWTA warmup encoding, same as TWTA)
// daMode    → statusText  ("FGM" | "ALC"  — triangle fill + mode label)
// boa       → gaugeValue  (BOA dB, bottom-left)
// temperature → temperature (shared °C readout, bottom-right)
export const twtada: GuidedCategoryDef = {
  params: [
    { key: "twtaSts", label: "TWTA Status", hint: '"ON" | "OFF"', fixedValues: ["ON", "OFF"] },
    { key: "anadovoltage", label: "Anode Voltage", hint: "number (V)" },
    { key: "daMode", label: "DA Mode", hint: '"FGM" | "ALC"', fixedValues: ["FGM", "ALC"] },
    { key: "boa", label: "BOA", hint: "number (dB)" },
    { key: "temperature", label: "Temperature", hint: "number (°C)" },
    { key: "isInvalid", label: "Is Invalid", hint: '"true" | "false"', fixedValues: ["true", "false"], optional: true },
  ],
  body: () =>
    `return {\n` +
    `  statusColor: twtaSts === "ON"\n` +
    `             ? (anadovoltage > 2 ? "#6aaa6a" : "#27ae60")\n` +
    `             : "gradient:off",\n` +
    `  statusText:   daMode,\n` +
    `  gaugeValue:   +boa,\n` +
    `  temperature:  +temperature,\n` +
    `  isInvalid,\n` +
    `};\n`,
};
