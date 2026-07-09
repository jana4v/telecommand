import type { GuidedCategoryDef } from "../types";

/**
 * Rubidium Atomic Clock — guided Simple Mode parameters.
 *
 * TM → element state mapping:
 *   rbStatus   "ON"   → position = 1  (fast cyan electron-pumping animation)
 *              "OFF"  → position = 0  (frozen, no animation)
 *   lockStatus "LOCK" → isLocked = true  (slow gold orbit + frequency sine wave)
 *              "UNLOCK" → isLocked = false
 *   temperature       → temperature in °C  (displayed bottom of element)
 *   isInvalid         → red INV LED + red border frame
 */
export const rubidiumClock: GuidedCategoryDef = {
  params: [
    { key: "rbStatus",    label: "ON / OFF Status", hint: '"ON" | "OFF"',       fixedValues: ["ON", "OFF"] },
    { key: "lockStatus",  label: "Frequency Lock",  hint: '"LOCK" | "UNLOCK"',  fixedValues: ["LOCK", "UNLOCK"] },
    { key: "temperature", label: "Temperature",     hint: "number (°C)",         optional: true },
    { key: "isInvalid",   label: "Is Invalid",      hint: '"true" | "false"',   fixedValues: ["true", "false"], optional: true },
  ],
  body: () =>
    `return {\n` +
    `  position:    rbStatus === "ON" ? 1 : 0,\n` +
    `  isLocked:    lockStatus === "LOCK",\n` +
    `  temperature: temperature !== undefined && temperature !== "" ? +temperature : undefined,\n` +
    `  isInvalid,\n` +
    `};\n`,
};
