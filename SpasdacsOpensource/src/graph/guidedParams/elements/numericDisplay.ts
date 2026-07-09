import type { GuidedCategoryDef } from "../types";

export const numericDisplay: GuidedCategoryDef = {
  params: [
    { key: "value", label: "Value", hint: "numeric value to display" },
  ],
  body: () =>
    `return {\n  indicatorValue: value !== undefined && value !== "" ? +value : undefined,\n};\n`,
};
