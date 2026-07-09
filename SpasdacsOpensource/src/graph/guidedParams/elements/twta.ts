import type { GuidedCategoryDef } from "../types";

export const twta: GuidedCategoryDef = {
  params: [
    { key: "twtaSts", label: "TWTA Status", hint: '"ON" | "OFF"', fixedValues: ["ON", "OFF"] },
    { key: "anadovoltage", label: "Anode Voltage", hint: "number (V)" },
    { key: "temperature", label: "Temperature", hint: "number (°C)" },
    { key: "isInvalid", label: "Is Invalid", hint: '"true" | "false"', fixedValues: ["true", "false"], optional: true },
  ],
  body: () =>
    // statusColor encodes the warm/on state so the component needs no extra field:
    //   "#6aaa6a"    = ON + anode > 2V  (warming up — LED on, coil dim)
    //   "#27ae60"    = ON + anode ≤ 2V  (fully on  — LED on, coil glows)
    //   "gradient:off" = OFF
    `return {\n` +
    `  statusColor: twtaSts === "ON"\n` +
    `             ? (anadovoltage > 2 ? "#6aaa6a" : "#27ae60")\n` +
    `             : "gradient:off",\n` +
    `  temperature:  +temperature,\n` +
    `  isInvalid,\n` +
    `};\n`,
};
