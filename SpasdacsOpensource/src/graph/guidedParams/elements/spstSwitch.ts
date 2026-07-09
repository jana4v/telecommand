import type { GuidedCategoryDef } from "../types";

export const spstSwitch: GuidedCategoryDef = {
  params: [
    {
      key: "state",
      label: "State",
      hint: "Mnemonic value that drives the switch CLOSE (conducting) or OPEN (disconnected)",
      fixedValues: ["CLOSE", "OPEN"],
    },
  ],
  body: () =>
    `const closed = ["1","on","true","close","closed","yes","enabled","active","conducting"].includes(String(state).toLowerCase());\n` +
    `return {\n` +
    `  statusColor: (state === undefined || state === "" || state === null)\n` +
    `    ? ""\n` +
    `    : closed ? "#9b59b6" : "",\n` +
    `};\n`,
};
