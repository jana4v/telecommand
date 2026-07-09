/** After `const m={...}` inside the arrow block — must match generateGuidedScript exactly. */
export const STATE_MAP_BLOCK_TAIL =
  ";const k=String(v);return Object.prototype.hasOwnProperty.call(m,k)?m[k]:k}";

export function findMatchingJsonBrace(s: string, openIdx: number): number {
  if (s[openIdx] !== "{") return -1;
  let depth = 0;
  for (let i = openIdx; i < s.length; i++) {
    const c = s[i];
    if (c === "{") depth++;
    else if (c === "}") {
      depth--;
      if (depth === 0) return i;
    }
  }
  return -1;
}

/** Extract one parenthesized call argument (handles nested parens and strings). */
export function extractCallArgument(s: string, openParenIdx: number): string | null {
  if (s[openParenIdx] !== "(") return null;
  let depth = 0;
  let inStr: string | null = null;
  for (let i = openParenIdx; i < s.length; i++) {
    const c = s[i];
    if (inStr) {
      if (c === "\\" && i + 1 < s.length) {
        i++;
        continue;
      }
      if (c === inStr) inStr = null;
      continue;
    }
    if (c === '"' || c === "'") {
      inStr = c;
      continue;
    }
    if (c === "(") depth++;
    else if (c === ")") {
      depth--;
      if (depth === 0) return s.slice(openParenIdx + 1, i);
    }
  }
  return null;
}

/**
 * If rhs is `((v)=>{const m={...};...})(inner)`, returns inner + map. Otherwise null.
 */
export function parseStateMapWrapper(rhs: string): { inner: string; map: Record<string, string> } | null {
  const t = rhs.trim();
  const head = "((v)=>{const m=";
  if (!t.startsWith(head)) return null;
  const jsonStart = t.indexOf("{", head.length - 1);
  if (jsonStart < 0) return null;
  const jsonEnd = findMatchingJsonBrace(t, jsonStart);
  if (jsonEnd < 0) return null;
  let map: Record<string, string>;
  try {
    map = JSON.parse(t.slice(jsonStart, jsonEnd + 1)) as Record<string, string>;
  } catch {
    return null;
  }
  const afterJson = t.slice(jsonEnd + 1);
  const inv = STATE_MAP_BLOCK_TAIL + ")(";
  if (!afterJson.startsWith(inv)) return null;
  const openIdx = jsonEnd + 1 + inv.length - 1;
  if (t[openIdx] !== "(") return null;
  const inner = extractCallArgument(t, openIdx);
  if (inner === null) return null;
  return { inner: inner.trim(), map };
}

/** Wrap raw / transformed TM read so it yields canonical fixedValues strings. */
export function wrapWithStateMap(inner: string, stateMap: Record<string, string>): string {
  const json = JSON.stringify(stateMap);
  return `((v)=>{const m=${json}${STATE_MAP_BLOCK_TAIL})(${inner})`;
}

/** True when catalog/range states are not the same set as element fixedValues (e.g. ON/OFF vs LOCKED/UNLOCKED). */
export function telemetryStateSetDiffers(expected: string[], actual: string[]): boolean {
  const e = new Set(expected.map((s) => String(s).trim()));
  const a = new Set(actual.map((s) => String(s).trim()).filter(Boolean));
  if (a.size === 0) return false;
  if (e.size !== a.size) return true;
  for (const x of a) if (!e.has(x)) return true;
  for (const x of e) if (!a.has(x)) return true;
  return false;
}

/**
 * Heuristic defaults when telemetry discrete labels differ from element fixedValues.
 * Handles exact 2↔2 known patterns AND semantic keyword matching for any-size lists.
 * Users can always review / clear the auto-suggestion in the UI.
 */
export function suggestStateMap(expected: string[], actual: string[]): Record<string, string> {
  const exp = expected.map((s) => s.trim());
  const act = actual.map((s) => s.trim()).filter(Boolean);

  // ── Exact 2↔2 known patterns ──────────────────────────────────────────────
  if (exp.length === 2 && act.length === 2) {
    const es = new Set(exp);
    const as = new Set(act);

    if (es.has("LOCKED") && es.has("UNLOCKED") && as.has("ON") && as.has("OFF"))
      return { ON: "LOCKED", OFF: "UNLOCKED" };
    if (es.has("LOCKED") && es.has("UNLOCKED") && as.has("on") && as.has("off"))
      return { on: "LOCKED", off: "UNLOCKED" };

    if (es.has("true") && es.has("false") && as.has("0") && as.has("1"))
      return { "0": "false", "1": "true" };
    if (es.has("true") && es.has("false") && as.has("ON") && as.has("OFF"))
      return { ON: "true", OFF: "false" };

    if (es.has("POS-1") && es.has("POS-2") && as.has("0") && as.has("1"))
      return { "0": "POS-1", "1": "POS-2" };
    if (es.has("STRAIGHT") && es.has("CROSS") && as.has("0") && as.has("1"))
      return { "0": "STRAIGHT", "1": "CROSS" };
  }

  // ── Semantic keyword matching for any size ─────────────────────────────────
  // Maps expected canonical states to their keyword sets.
  // The first keyword group that matches an actual TM state wins for that canonical state.
  const SEMANTIC_GROUPS: Array<{ canonical: string; keywords: string[] }> = [
    { canonical: "nominal",  keywords: ["nominal","ok","active","run","running","on","1","true","yes","enable","enabled","good","normal","online"] },
    { canonical: "standby",  keywords: ["standby","idle","sleep","wait","waiting","ready","warm","off","0","false","no","disable","disabled","offline"] },
    { canonical: "fault",    keywords: ["fault","fail","failed","failure","error","alarm","critical","crit","bad","ng","abnormal","trip"] },
    { canonical: "off",      keywords: ["off","poweroff","power_off","shutdown","down","unpowered","0","false"] },
    // switch states
    { canonical: "upright",  keywords: ["upright","up","standing","1","on","true"] },
    { canonical: "reclined", keywords: ["reclined","recline","down","0","off","false"] },
    { canonical: "forward",  keywords: ["forward","fwd","extend","out","1","on","true"] },
    { canonical: "down",     keywords: ["down","rest","home","0","off","false"] },
  ];

  const expSet = new Set(exp);
  const result: Record<string, string> = {};

  for (const a of act) {
    const lower = a.toLowerCase().trim();
    // Find the first canonical state that (a) is in `expected` AND (b) matches the keyword
    for (const { canonical, keywords } of SEMANTIC_GROUPS) {
      if (!expSet.has(canonical)) continue;
      if (keywords.includes(lower)) {
        // Only assign if this canonical state hasn't been claimed yet
        const alreadyClaimed = Object.values(result).includes(canonical);
        if (!alreadyClaimed) {
          result[a] = canonical;
          break;
        }
      }
    }
  }

  // Only return if we mapped at least one state (partial maps are still useful)
  return Object.keys(result).length > 0 ? result : {};
}
