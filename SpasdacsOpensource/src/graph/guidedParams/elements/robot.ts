import type { GuidedCategoryDef } from "../types";

export const robot: GuidedCategoryDef = {
  params: [
    {
      key: "powerState",
      label: "Power State",
      hint: '"ON" | "OFF"',
      fixedValues: ["ON", "OFF"],
    },
    {
      key: "onColor",
      label: "ON Accent Color",
      hint: "Hex color for ON (e.g. #4a9eff)",
      optional: true,
    },
    {
      key: "offColor",
      label: "OFF Accent Color",
      hint: "Hex color for OFF (e.g. #5b6b7a)",
      optional: true,
    },
    {
      key: "posture",
      label: "Posture",
      hint: "Controls launch pose vs straight pose. Values: upright / reclined",
      fixedValues: ["upright", "reclined"],
    },
    {
      key: "rightArm",
      label: "Right Hand Command",
      hint: "Presses RIGHT monitor button with right hand. Values: forward/press / down",
      fixedValues: ["forward", "down"],
    },
    {
      key: "leftArm",
      label: "Left Hand Command",
      hint: "Presses LEFT monitor button with left hand. Values: forward/press / down",
      fixedValues: ["forward", "down"],
    },
    {
      key: "namaste",
      label: "Namaste",
      hint: "Both hands in prayer position (overrides individual arm states). Values: true / false",
      fixedValues: ["true", "false"],
    },
  ],
  body: () => `
// powerState: ON | OFF (or 1/0)
const onVals = ["1","on","true","yes","active","running"];
const isOn = onVals.includes(String(powerState ?? "").toLowerCase().trim());

const pickHex = (v, fallback) => {
  const s = String(v ?? "").trim();
  return /^#[0-9a-fA-F]{6}$/.test(s) ? s : fallback;
};
const accentOn  = pickHex(onColor,  "#4a9eff");
const accentOff = pickHex(offColor, "#5b6b7a");

// posture: upright | reclined  (or 1/0)
const uprightVals = ["1","upright","up","true","on","yes","standing"];
const postureVal  = uprightVals.includes(String(posture ?? "").toLowerCase().trim()) ? "upright" : "reclined";

// namaste: true | false  (overrides arm states)
const namVals   = ["1","namaste","pray","true","on","yes"];
const namaste   = namVals.includes(String(namaste ?? "").toLowerCase().trim()) ? "true" : "false";

// right/left arm: forward | down
const fwdVals   = ["1","forward","fwd","true","on","yes","extend"];
const rightArmVal = fwdVals.includes(String(rightArm ?? "").toLowerCase().trim()) ? "forward" : "down";
const leftArmVal  = fwdVals.includes(String(leftArm  ?? "").toLowerCase().trim()) ? "forward" : "down";

return {
  posture: postureVal,
  rightArm: rightArmVal,
  leftArm: leftArmVal,
  namaste,
  statusColor: isOn ? accentOn : accentOff,
};
`.trim(),
};
