import type { GuidedCategoryDef } from "../types";

export const momentumWheel: GuidedCategoryDef = {
  params: [
    { key: "value", label: "Wheel Speed", hint: "number, signed (negative = CCW)" },
    { key: "temperature", label: "Temperature", hint: "number (°C)" },
    { key: "current", label: "Current", hint: "number (mA)" },
  ],
  body: () =>
    `const speed = Math.abs(value);\n` +
    `return {\n` +
    `  wheelSpeed:       speed,\n` +
    `  wheelSpeedRaw:    value,\n` +
    `  wheelDirection:   value >= 0 ? 1 : -1,\n` +
    `  wheelTemperature: +temperature,\n` +
    `  wheelCurrent:     +current,\n` +
    `  statusColor:      speed > 4000 ? "#e74c3c" : speed > 1000 ? "#27ae60" : "#ff9800",\n` +
    `};\n`,
};
