import type { ParamValue } from "./types";
import { BODY_BUILDERS, GUIDED_PARAMS } from "./registry";
import { parseStateMapWrapper, wrapWithStateMap } from "./stateMapUtils";

export function parseGuidedScript(
  category: string,
  script: string,
): Record<string, ParamValue> | null {
  const params = GUIDED_PARAMS.get(category);
  if (!params || !script.trim()) return null;

  const result: Record<string, ParamValue> = {};
  let anyFound = false;

  for (const p of params) {
    result[p.key] = { mnemonic: "", fixed: "", na: false, transform: "" };
    const m = new RegExp(`(?:^|\\n)let\\s+${p.key}\\s*=\\s*([^;]+);`).exec(script);
    if (!m) continue;
    let rhs = m[1].trim();
    anyFound = true;

    if (rhs === "false") { result[p.key].na = true; continue; }

    const smw = parseStateMapWrapper(rhs);
    if (smw) {
      result[p.key].stateMap = smw.map;
      rhs = smw.inner.trim();
    }

    const xfM = rhs.match(/^\(\(v\)\s*=>\s*(.+)\)\(TM\["([^"]+)"\]\)$/);
    if (xfM) { result[p.key].mnemonic = xfM[2]; result[p.key].transform = xfM[1].trim(); continue; }

    const mnemM = rhs.match(/^TM\["([^"]+)"\]$/);
    if (mnemM) { result[p.key].mnemonic = mnemM[1]; continue; }

    const strM = rhs.match(/^["'](.+)["']$/);
    if (strM) { result[p.key].fixed = strM[1]; continue; }

    if (rhs === 'TM[""]') continue;
    result[p.key].customExpr = rhs;
  }

  return anyFound ? result : null;
}

export function generateGuidedScript(
  category: string,
  values: Record<string, ParamValue>,
): string {
  const params = GUIDED_PARAMS.get(category);
  if (!params) return "";

  const lines: string[] = [];
  for (const p of params) {
    const v = values[p.key];
    if (!v) { lines.push(`let ${p.key} = TM[""];   // ← pick a mnemonic in Simple`); continue; }
    if (v.customExpr) {
      lines.push(`let ${p.key} = ${v.customExpr};`);
    } else if (v.na) {
      lines.push(`let ${p.key} = false;`);
    } else if (v.mnemonic.trim()) {
      const raw = `TM["${v.mnemonic.trim()}"]`;
      const xf  = v.transform?.trim();
      let inner = xf ? `((v) => ${xf})(${raw})` : raw;
      const sm = v.stateMap;
      if (sm && Object.keys(sm).length > 0) inner = wrapWithStateMap(inner, sm);
      lines.push(`let ${p.key} = ${inner};`);
    } else if (v.fixed.trim()) {
      const f = v.fixed.trim();
      const isLiteral = f === "true" || f === "false" || !isNaN(Number(f));
      lines.push(`let ${p.key} = ${isLiteral ? f : JSON.stringify(f)};`);
    } else {
      lines.push(`let ${p.key} = TM[""];   // ← pick a mnemonic in Simple (empty key — not related to Telemetry source)`);
    }
  }

  const body = BODY_BUILDERS.get(category);
  if (!body) return lines.join("\n") + "\n";
  return lines.join("\n") + "\n" + body();
}
