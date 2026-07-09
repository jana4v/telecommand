import type { GuidedCategoryDef } from "../types";

export const rfDownConverter: GuidedCategoryDef = {
  params: [
    { key: "rfStatus", label: "RF Status", hint: '"ON" | "OFF"', fixedValues: ["ON", "OFF"] },
    { key: "temperature", label: "Temperature", hint: "number (°C)" },
    { key: "isInvalid", label: "Is Invalid", hint: '"true" | "false"', fixedValues: ["true", "false"], optional: true },
  ],
  body: () =>
    `return {\n` +
    `  statusColor: rfStatus === "ON" ? "#27ae60" : "",\n` +
    `  temperature: +temperature,\n` +
    `  isInvalid,\n` +
    `};\n`,
};

export const rfUpConverter: GuidedCategoryDef = {
  params: [
    { key: "rfStatus", label: "RF Status", hint: '"ON" | "OFF"', fixedValues: ["ON", "OFF"] },
    { key: "temperature", label: "Temperature", hint: "number (°C)" },
    { key: "isInvalid", label: "Is Invalid", hint: '"true" | "false"', fixedValues: ["true", "false"], optional: true },
  ],
  body: () =>
    `return {\n` +
    `  statusColor: rfStatus === "ON" ? "#27ae60" : "",\n` +
    `  temperature: +temperature,\n` +
    `  isInvalid,\n` +
    `};\n`,
};

export const receiver: GuidedCategoryDef = {
  params: [
    { key: "rcvStatus", label: "Status", hint: '"ON" | "OFF"', fixedValues: ["ON", "OFF"] },
    { key: "temperature", label: "Temperature", hint: "number (°C)" },
    { key: "isInvalid", label: "Is Invalid", hint: '"true" | "false"', fixedValues: ["true", "false"], optional: true },
  ],
  body: () =>
    `return {\n` +
    `  statusColor: rcvStatus === "ON" ? "#27ae60" : "",\n` +
    `  temperature: +temperature,\n` +
    `  isInvalid,\n` +
    `};\n`,
};

export const transmitter: GuidedCategoryDef = {
  params: [
    { key: "txStatus",    label: "Status",      hint: '"ON" | "OFF"',    fixedValues: ["ON", "OFF"] },
    { key: "temperature", label: "Temperature", hint: "number (°C)" },
    { key: "isInvalid",   label: "Is Invalid",  hint: '"true" | "false"', fixedValues: ["true", "false"], optional: true },
  ],
  body: () =>
    `return {\n` +
    `  statusColor: txStatus === "ON" ? "#27ae60" : "",\n` +
    `  temperature: +temperature,\n` +
    `  isInvalid,\n` +
    `};\n`,
};

export const receiverDemod: GuidedCategoryDef = {
  params: [
    { key: "rcvStatus",   label: "Status",      hint: '"ON" | "OFF"',    fixedValues: ["ON", "OFF"] },
    { key: "temperature", label: "Temperature", hint: "number (°C)" },
    { key: "isInvalid",   label: "Is Invalid",  hint: '"true" | "false"', fixedValues: ["true", "false"], optional: true },
  ],
  body: () =>
    `return {\n` +
    `  statusColor: rcvStatus === "ON" ? "#27ae60" : "",\n` +
    `  temperature: +temperature,\n` +
    `  isInvalid,\n` +
    `};\n`,
};

export const modulator: GuidedCategoryDef = {
  params: [
    { key: "modStatus",   label: "Status",      hint: '"ON" | "OFF"',    fixedValues: ["ON", "OFF"] },
    { key: "temperature", label: "Temperature", hint: "number (°C)" },
    { key: "isInvalid",   label: "Is Invalid",  hint: '"true" | "false"', fixedValues: ["true", "false"], optional: true },
  ],
  body: () =>
    `return {\n` +
    `  statusColor: modStatus === "ON" ? "#27ae60" : "",\n` +
    `  temperature: +temperature,\n` +
    `  isInvalid,\n` +
    `};\n`,
};

export const nsgu: GuidedCategoryDef = {
  params: [
    { key: "nsguStatus",  label: "Status",      hint: '"ON" | "OFF"',    fixedValues: ["ON", "OFF"] },
    { key: "temperature", label: "Temperature", hint: "number (°C)" },
    { key: "isInvalid",   label: "Is Invalid",  hint: '"true" | "false"', fixedValues: ["true", "false"], optional: true },
  ],
  body: () =>
    `return {\n` +
    `  statusColor: nsguStatus === "ON" ? "#27ae60" : "",\n` +
    `  temperature: +temperature,\n` +
    `  isInvalid,\n` +
    `};\n`,
};

export const acmu: GuidedCategoryDef = {
  params: [
    { key: "acmuStatus",  label: "Status",      hint: '"ON" | "OFF"',    fixedValues: ["ON", "OFF"] },
    { key: "referenceInputClock", label: "Reference Input Clock", hint: '1 | 2 | 3 | 4', fixedValues: ["1", "2", "3", "4"] },
    { key: "phaseMeterInputClock", label: "Phase Meter Input Clock", hint: '1 | 2 | 3 | 4', fixedValues: ["1", "2", "3", "4"] },
    { key: "synthesizerLockStatus", label: "Synthesizer Lock Status", hint: '"LOCKED" | "UNLOCKED"', fixedValues: ["LOCKED", "UNLOCKED"] },
    { key: "phaseMeterLockStatus", label: "Phase Meter Lock Status", hint: '"LOCKED" | "UNLOCKED"', fixedValues: ["LOCKED", "UNLOCKED"] },
    { key: "clockPresent", label: "Clock Present", hint: '"PRESENT" | "ABSENT"', fixedValues: ["PRESENT", "ABSENT"] },
    { key: "samplingTime", label: "Sampling Time", hint: "number (x.x)" },
    { key: "temperature", label: "Temperature", hint: "number (°C)" },
    { key: "isInvalid",   label: "Is Invalid",  hint: '"true" | "false"', fixedValues: ["true", "false"], optional: true },
  ],
  body: () =>
    `return {\n` +
    `  statusColor: acmuStatus === "ON" ? "#27ae60" : "",\n` +
    `  referenceInputClock: Number(referenceInputClock),\n` +
    `  phaseMeterInputClock: Number(phaseMeterInputClock),\n` +
    `  synthesizerLockStatus,\n` +
    `  phaseMeterLockStatus,\n` +
    `  clockPresent,\n` +
    `  samplingTime: +samplingTime,\n` +
    `  temperature: +temperature,\n` +
    `  isInvalid,\n` +
    `};\n`,
};

export const lna: GuidedCategoryDef = {
  params: [
    { key: "lnaStatus", label: "LNA Status", hint: '"ON" | "OFF"', fixedValues: ["ON", "OFF"] },
    { key: "temperature", label: "Temperature", hint: "number (°C)" },
    { key: "isInvalid", label: "Is Invalid", hint: '"true" | "false"', fixedValues: ["true", "false"], optional: true },
  ],
  body: () =>
    `return {\n` +
    `  statusColor: lnaStatus === "ON" ? "#27ae60" : "",\n` +
    `  temperature: +temperature,\n` +
    `  isInvalid,\n` +
    `};\n`,
};
