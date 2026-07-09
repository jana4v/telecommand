import type { GuidedCategoryDef } from "../types";

export const gauge: GuidedCategoryDef = {
  params: [
    { key: "value", label: "Value", hint: "number" },
    { key: "min", label: "Min", hint: "number", fixedValues: ["0"] },
    { key: "max", label: "Max", hint: "number", fixedValues: ["100"] },
  ],
  body: () =>
    `return {\n` +
    `  gaugeValue: value,\n` +
    `  gaugeMin:   min || 0,\n` +
    `  gaugeMax:   max || 100\n` +
    `};\n`,
};

export const tank: GuidedCategoryDef = {
  params: [{ key: "value", label: "Fill Level", hint: "0–100" }],
  body: () =>
    `const pct = Math.min(100, Math.max(0, value));\n` +
    `return {\n` +
    `  level:       pct,\n` +
    `  statusColor: pct > 80 ? "#e74c3c" : pct > 50 ? "#ff9800" : "#27ae60",\n` +
    `  statusText:  pct.toFixed(1) + " %"\n` +
    `};\n`,
};
