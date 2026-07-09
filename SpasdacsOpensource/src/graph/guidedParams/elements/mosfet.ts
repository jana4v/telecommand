import type { GuidedCategoryDef } from "../types";

export const mosfet: GuidedCategoryDef = {
  params: [
    {
      key: "state",
      label: "State",
      hint: "Mnemonic value that drives the MOSFET ON/OFF (e.g. '1' = ON, '0' = OFF)",
      fixedValues: ["ON", "OFF"],
    },
  ],
  body: () =>
    `const on = ["1","on","true","enabled","active","closed","conducting","yes"].includes(String(state).toLowerCase());\n` +
    `return {\n` +
    `  statusColor: (state === undefined || state === "" || state === null)\n` +
    `    ? ""\n` +
    `    : on ? "#27ae60" : "",\n` +
    `};\n`,
};
