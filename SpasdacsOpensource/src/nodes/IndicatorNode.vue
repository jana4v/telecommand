<template>
  <div class="node-wrap" :style="{ opacity: d.opacity ?? 1 }">
    <svg :width="w" :height="h" :viewBox="`0 0 ${w} ${h}`" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient :id="`ind-bezel-${uid}`" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%"   stop-color="#909098"/>
          <stop offset="50%"  stop-color="#c8c8d0"/>
          <stop offset="100%" stop-color="#404048"/>
        </linearGradient>
        <radialGradient :id="`ind-screen-${uid}`" cx="50%" cy="40%" r="70%">
          <stop offset="0%"   stop-color="#0d1c12"/>
          <stop offset="100%" stop-color="#040a06"/>
        </radialGradient>
      </defs>

      <!-- Body -->
      <rect x="2" y="2" :width="w-4" :height="h-4"
        :fill="bodyFill" :stroke="`url(#ind-bezel-${uid})`"
        stroke-width="2.5" rx="4"/>

      <!-- Digital screen -->
      <rect :x="screenX" :y="screenY" :width="screenW" :height="screenH"
        :fill="`url(#ind-screen-${uid})`" :stroke="screenStroke"
        stroke-width="1.5" rx="3"/>

      <!-- Units badge (centred, above screen — only shown if units are set) -->
      <rect v-if="unitsLabel" :x="badgeX" :y="badgeY" :width="badgeW" :height="badgeH"
        :fill="badgeBg" stroke="#202830" stroke-width="1" rx="2"/>
      <text v-if="unitsLabel" :x="badgeX + badgeW/2" :y="badgeY + badgeH/2"
        text-anchor="middle" dominant-baseline="central"
        :font-size="badgeFs" font-weight="700" font-family="monospace"
        :fill="readoutColor">{{ unitsLabel }}</text>

      <!-- Value readout -->
      <text :x="screenX + screenW/2" :y="screenY + screenH/2 + 1"
        text-anchor="middle" dominant-baseline="central"
        :font-size="readoutFs" font-weight="700"
        font-family="'Digital7','Courier New',monospace"
        :fill="readoutColor"
        :style="`filter:drop-shadow(0 0 ${readoutFs*0.12}px ${readoutColor})`">{{ valueText }}</text>

      <!-- Element name (user-defined label, bottom strip) -->
      <text v-if="nameLabel" :x="w/2" :y="h-4"
        text-anchor="middle" dominant-baseline="auto"
        :font-size="nameFs" font-weight="700" font-family="monospace"
        :fill="readoutColor" opacity="0.55">{{ nameLabel }}</text>

      <!-- Invalid overlay -->
      <rect v-if="d.isInvalid" x="2" y="2" :width="w-4" :height="h-4"
        fill="rgba(231,76,60,0.35)" rx="4"/>
    </svg>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from "vue";
import { useNodeData } from "./useNodeData";

const { d, w, h } = useNodeData(120, 65);
const uid = ref(Math.random().toString(36).slice(2, 8));

// ── Layout ────────────────────────────────────────────────────────────────
const unitsLabel = computed(() => (d.value.indicatorUnits as string) || "");
const nameLabel  = computed(() => (d.value.name as string) || "");

const badgeW  = computed(() => Math.min((w.value - 8) * 0.55, 58));
const badgeH  = computed(() => Math.min((h.value - 4) * 0.26, 16));
const badgeX  = computed(() => 2 + ((w.value - 4) - badgeW.value) / 2);
const badgeY  = computed(() => 5);
const badgeFs = computed(() => Math.max(8, badgeH.value * 0.68));

const screenX   = computed(() => 6);
const screenY   = computed(() => unitsLabel.value ? badgeY.value + badgeH.value + 3 : 8);
const screenW   = computed(() => w.value - 12);
const screenH   = computed(() => h.value - screenY.value - (nameLabel.value ? 14 : 8));
const readoutFs = computed(() => Math.max(10, screenH.value * 0.70));
const nameFs    = computed(() => Math.max(6, Math.min(w.value, h.value) * 0.09));

// ── Value formatting ──────────────────────────────────────────────────────
/** Raw telemetry value — may be numeric or a string state like "ON"/"OFF". */
const currentVal = computed(() => d.value.indicatorValue ?? null);

const rawNum = computed(() => {
  const v = currentVal.value;
  if (v === null || v === undefined) return NaN;
  const n = Number(v);
  return n;
});

const valueText = computed(() => {
  const cv = currentVal.value;
  if (cv === null || cv === undefined || cv === "") return "---";
  const n = Number(cv);
  if (!Number.isFinite(n)) {
    // Non-numeric state: display the string, uppercased, truncated to 8 chars
    return String(cv).toUpperCase().slice(0, 8);
  }
  const dec = Math.max(0, Math.min(6, Number(d.value.indicatorDecDigits ?? 3)));
  const int = Math.max(1, Math.min(8, Number(d.value.indicatorIntDigits ?? 3)));
  const neg    = n < 0;
  const absStr = Math.abs(n).toFixed(dec);
  const [intPart, decPart] = absStr.split(".");
  const paddedInt = intPart.padStart(int, "0");
  const prefix = neg ? "-" : "";
  return dec > 0 ? `${prefix}${paddedInt}.${decPart}` : `${prefix}${paddedInt}`;
});

// ── Colour rules ──────────────────────────────────────────────────────────
// Stored under `currentColorRules` (same key as CurrentSensor) — NOT indicatorColorRules
// (which belongs to NumericDisplay). Inspector.vue saves to `currentColorRules` for Indicator.
type Op = ">" | ">=" | "<" | "<=" | "==" | "!=";
type Rule = { op: Op; threshold: number | string; color: string };

// Words the indicator script treats as "on-like". Must stay in sync with
// the heuristic in indicator.ts so that string thresholds like "ON" match
// TM values that arrive as the number 1 (or "1", "true", etc.).
const ON_WORDS  = new Set(["1","on","true","enabled","active","present","ok","yes"]);
const OFF_WORDS = new Set(["0","off","false","disabled","inactive","absent","nok","no"]);

/** True when a raw value (number or string) semantically means "on". */
function isOnLike(v: unknown): boolean {
  return ON_WORDS.has(String(v ?? "").trim().toLowerCase());
}
/** True when a raw value (number or string) semantically means "off". */
function isOffLike(v: unknown): boolean {
  return OFF_WORDS.has(String(v ?? "").trim().toLowerCase());
}

const matchedRuleColor = computed<string | null>(() => {
  const cv = currentVal.value;
  if (cv === null || cv === undefined || cv === "") return null;
  const nv  = Number(cv);
  const isNumeric = Number.isFinite(nv);
  const rules = (d.value.currentColorRules as Rule[]) || [];

  for (const r of rules) {
    let hit = false;
    const t  = r.threshold;
    const tn = Number(t);

    if (r.op === "==" || r.op === "!=") {
      // 1. Exact numeric match (both sides are finite numbers).
      if (isNumeric && Number.isFinite(tn)) {
        hit = r.op === "==" ? nv === tn : nv !== tn;
      }
      // 2. Exact string match (case-insensitive).
      if (!hit) {
        const ts = String(t).trim().toLowerCase();
        const vs = String(cv).trim().toLowerCase();
        hit = r.op === "==" ? vs === ts : vs !== ts;
      }
      // 3. Semantic ON/OFF match: threshold "ON" matches TM value 1, "1", "true"…
      //    and vice-versa for "OFF". This bridges the gap when range metadata
      //    returns "ON"/"OFF" but the TM wire format sends 1/0 (or vice-versa).
      if (!hit) {
        const tStr = String(t).trim().toLowerCase();
        const vOnLike  = isOnLike(cv);
        const vOffLike = isOffLike(cv);
        const tIsOn    = ON_WORDS.has(tStr);
        const tIsOff   = OFF_WORDS.has(tStr);
        if (tIsOn || tIsOff) {
          const semanticMatch = (tIsOn && vOnLike) || (tIsOff && vOffLike);
          hit = r.op === "==" ? semanticMatch : !semanticMatch;
        }
      }
    } else if (isNumeric && Number.isFinite(tn)) {
      // Range operators: numeric only.
      switch (r.op) {
        case ">":  hit = nv >  tn; break;
        case ">=": hit = nv >= tn; break;
        case "<":  hit = nv <  tn; break;
        case "<=": hit = nv <= tn; break;
      }
    }

    if (hit && r.color) return r.color;
  }
  return null;
});

const hasStatus    = computed(() => !!d.value.statusColor && d.value.statusColor !== "");
const readoutColor = computed(() =>
  matchedRuleColor.value ??
  (hasStatus.value ? (d.value.statusColor as string) : "#27ae60")
);

const bodyFill     = computed(() => d.value.isInvalid ? "#3a1212" : "#0e1626");
const screenStroke = computed(() => readoutColor.value);
const badgeBg      = computed(() => "#0a1018");
</script>

<style scoped>
.node-wrap { width: 100%; height: 100%; overflow: visible; }
svg { overflow: visible; }
</style>
