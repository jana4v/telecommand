import type { GuidedCategoryDef } from "../types";

export const dtg: GuidedCategoryDef = {
  params: [
    { key: "speed", label: "Rotor Speed", hint: "number (RPM)" },
    { key: "pitch", label: "Pitch", hint: "number (°)" },
    { key: "roll", label: "Roll", hint: "number (°)" },
    { key: "temperature", label: "Temperature", hint: "number (°C)" },
    { key: "isInvalid", label: "Is Invalid", hint: '"true" | "false"', fixedValues: ["true", "false"], optional: true },
  ],
  body: () =>
    `const spd = Math.abs(+speed);\n` +
    `return {\n` +
    `  dtgSpeed:       spd,\n` +
    `  dtgSpeedRaw:    +speed,\n` +
    `  dtgPitch:       +pitch,\n` +
    `  dtgRoll:        +roll,\n` +
    `  dtgTemperature: +temperature,\n` +
    `  statusColor:    spd > 5000 ? "#27ae60" : spd > 1000 ? "#ff9800" : "#e74c3c",\n` +
    `  isInvalid,\n` +
    `};\n`,
};
