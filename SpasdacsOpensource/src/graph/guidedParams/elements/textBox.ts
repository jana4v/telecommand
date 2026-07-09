import type { GuidedCategoryDef } from "../types";

export const textBox: GuidedCategoryDef = {
  params: [
    {
      key:   "textContent",
      label: "Text Content",
      hint:  "Mnemonic whose value is displayed as the box text",
    },
    {
      key:      "colorValue",
      label:    "Color Source",
      hint:     "Mnemonic whose value is evaluated against colour conditions (optional)",
      optional: true,
    },
  ],
  body: () => [
    "return {",
    "  tg_text:  textContent !== undefined && textContent !== '' ? String(textContent) : undefined,",
    "  tg_color: colorValue  !== undefined && colorValue  !== '' ? colorValue           : undefined,",
    "};",
  ].join("\n"),
};
