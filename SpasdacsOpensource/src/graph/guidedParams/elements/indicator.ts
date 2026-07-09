import type { GuidedCategoryDef } from "../types";

export const indicator: GuidedCategoryDef = {
  params: [
    { key: "state", label: "State", hint: "value that drives the LED colour (e.g. 'ON', '1', 'ENABLED')", fixedValues: ["ON", "OFF"] },
  ],
  body: () =>
    // Green when truthy/ON, red when falsy/OFF, grey when undefined/unknown.
    // indicatorValue passes the raw state through so colour conditions in the
    // node component can override statusColor with user-defined rules.
    `const on  = ["1","on","true","enabled","active","present","ok","yes"].includes(String(state).toLowerCase());\n` +
    `const off = state !== undefined && state !== "" && state !== null && !on;\n` +
    `return {\n` +
    `  indicatorValue: state,\n` +
    `  statusColor: (state === undefined || state === "" || state === null)\n` +
    `    ? "#888888"\n` +
    `    : on ? "#27ae60" : "#e74c3c",\n` +
    `};\n`,
};
