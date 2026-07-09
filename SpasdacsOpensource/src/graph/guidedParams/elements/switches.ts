import type { GuidedCategoryDef } from "../types";

const sp2Body = () =>
  `const pos = swPos === "POS-1" ? 0 : swPos === "POS-2" ? 1 : undefined;\n` +
  `return {\n` +
  `  position:  pos ?? 0,\n` +
  `  isInvalid: pos === undefined,\n` +
  `};\n`;

export const sp2t: GuidedCategoryDef = {
  params: [{ key: "swPos", label: "Position", hint: '"POS-1" | "POS-2"', fixedValues: ["POS-1", "POS-2"] }],
  body: sp2Body,
};

export const sp2tc: GuidedCategoryDef = {
  params: [{ key: "swPos", label: "Position", hint: '"POS-1" | "POS-2"', fixedValues: ["POS-1", "POS-2"] }],
  body: sp2Body,
};

export const sp2tNoBg: GuidedCategoryDef = {
  params: [
    {
      key: "pos1",
      label: "POS-1 Active",
      hint: "Mnemonic that is true/active when switch should route to POS-1",
      fixedValues: ["true", "false"],
    },
    {
      key: "pos2",
      label: "POS-2 Active",
      hint: "Mnemonic that is true/active when switch should route to POS-2",
      fixedValues: ["true", "false"],
    },
  ],
  body: () =>
    `const truthy = ["1","true","on","yes","open","enable","enabled","active","pos-1","pos-2"];
const falsy  = ["0","false","off","no","close","disable","disabled","inactive"];
const norm = (v) => String(v ?? "").toLowerCase().trim();
const toBool = (v) => {
  const s = norm(v);
  if (truthy.includes(s)) return true;
  if (falsy.includes(s)) return false;
  return null;
};

const p1 = toBool(pos1);
const p2 = toBool(pos2);

let position = 0;
let invalid = false;

if (p1 === true && p2 !== true) {
  position = 0;
} else if (p2 === true && p1 !== true) {
  position = 1;
} else {
  invalid = true;
}

return {
  position,
  isInvalid: invalid,
};\n`,
};

export const switch3p: GuidedCategoryDef = {
  params: [{ key: "sw3pPos", label: "Position", hint: '"POS-1" | "POS-2" | "POS-3"', fixedValues: ["POS-1", "POS-2", "POS-3"] }],
  body: () =>
    `const posMap = { "POS-1": 0, "POS-2": 1, "POS-3": 2 };\n` +
    `const pos = posMap[String(sw3pPos)];\n` +
    `return {\n` +
    `  position:  pos ?? 0,\n` +
    `  isInvalid: pos === undefined,\n` +
    `};\n`,
};

export const transferSwitch: GuidedCategoryDef = {
  params: [{ key: "swPos", label: "Position", hint: '"STRAIGHT" | "CROSS"', fixedValues: ["STRAIGHT", "CROSS"] }],
  body: () =>
    `const pos = swPos === "STRAIGHT" ? 0 : swPos === "CROSS" ? 1 : 0;\n` +
    `return {\n` +
    `  position:  pos,\n` +
    `  isInvalid: swPos !== "STRAIGHT" && swPos !== "CROSS",\n` +
    `};\n`,
};

export const dp3t: GuidedCategoryDef = {
  params: [{ key: "sw3pPos", label: "Position", hint: '"POS-1" | "POS-2" | "POS-3"', fixedValues: ["POS-1", "POS-2", "POS-3"] }],
  body: () =>
    `const posMap = { "POS-1": 0, "POS-2": 1, "POS-3": 2 };\n` +
    `const pos = posMap[String(sw3pPos)];\n` +
    `return {\n` +
    `  position:  pos ?? 0,\n` +
    `  isInvalid: pos === undefined,\n` +
    `};\n`,
};

export const dp4p: GuidedCategoryDef = {
  params: [{ key: "sw4pPos", label: "Position", hint: '"POS-1" | "POS-2" | "POS-3" | "POS-4"', fixedValues: ["POS-1", "POS-2", "POS-3", "POS-4"] }],
  body: () =>
    `const posMap = { "POS-1": 0, "POS-2": 1, "POS-3": 2, "POS-4": 3 };\n` +
    `const pos = posMap[String(sw4pPos)];\n` +
    `return {\n` +
    `  position:  pos ?? 0,\n` +
    `  isInvalid: pos === undefined,\n` +
    `};\n`,
};

/**
 * DPDT — double-pole double-throw switch. Same TM contract as SP2T:
 *   swPos "POS-1" → position = 0   (straight: TL↔TR, BL↔BR)
 *         "POS-2" → position = 1   (crossed)
 *   Anything else → isInvalid = true.
 */
export const dpdt: GuidedCategoryDef = {
  params: [{ key: "swPos", label: "Position", hint: '"POS-1" | "POS-2"', fixedValues: ["POS-1", "POS-2"] }],
  body: sp2Body,
};
