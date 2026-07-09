import type { GuidedCategoryDef } from "../types";

export const ctrlBoard: GuidedCategoryDef = {
  params: [
    {
      key: "status",
      label: "Status",
      hint: "Controller operating mode. Values: nominal | standby | fault | off",
      fixedValues: ["nominal", "standby", "fault", "off"],
    },
    {
      key: "signalActive",
      label: "Signal Active",
      hint: "Activates signal-trace animations when true (auto-on when status=nominal). Values: true / false",
    },
  ],
  body: () => `
// status: nominal | standby | fault  (or shorthand variants)
const nomVals = ["nominal","ok","active","on","1","true","yes","run","running"];
const fltVals = ["fault","error","fail","alarm","critical","err"];
const stbVals = ["standby","idle","sleep","waiting","ready","warm"];
const s = String(status ?? "").toLowerCase().trim();
const statusVal = nomVals.includes(s) ? "nominal"
                : fltVals.includes(s) ? "fault"
                : stbVals.includes(s) ? "standby"
                : "standby";

// signalActive: true when nominal, or explicitly forced
const sigVals = ["1","true","on","yes","active"];
const signalActiveVal = sigVals.includes(String(signalActive ?? "").toLowerCase().trim())
                     || statusVal === "nominal" ? "true" : "false";

return { status: statusVal, signalActive: signalActiveVal };
`.trim(),
};
