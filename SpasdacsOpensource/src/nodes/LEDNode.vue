<template>
  <div class="node-wrap" :style="{ opacity: d.opacity ?? 1 }">
    <svg :width="w" :height="h" :viewBox="`0 0 ${w} ${h}`" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <!-- Radial glow for the LED bulb -->
        <radialGradient :id="`led-glow-${uid}`" cx="38%" cy="32%" r="70%">
          <stop offset="0%"   :stop-color="glowCenter"/>
          <stop offset="55%"  :stop-color="ledColor"/>
          <stop offset="100%" :stop-color="ledDim"/>
        </radialGradient>
        <!-- Soft outer bloom -->
        <filter :id="`led-bloom-${uid}`" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="2.5" result="blur"/>
          <feMerge>
            <feMergeNode in="blur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
        <!-- Metallic ring gradient: light top-left → dark bottom-right with a bright sheen -->
        <linearGradient :id="`led-metal-${uid}`" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%"   stop-color="#d0d8e0"/>
          <stop offset="25%"  stop-color="#f0f4f8"/>
          <stop offset="50%"  stop-color="#8090a0"/>
          <stop offset="75%"  stop-color="#a8b4c0"/>
          <stop offset="100%" stop-color="#3a4450"/>
        </linearGradient>
        <!-- Inner shadow ring -->
        <radialGradient :id="`led-recess-${uid}`" cx="50%" cy="50%" r="50%">
          <stop offset="70%"  stop-color="#050810" stop-opacity="1"/>
          <stop offset="100%" stop-color="#0d1420" stop-opacity="1"/>
        </radialGradient>
      </defs>

      <!-- Outer metallic ring -->
      <circle :cx="ledCx" :cy="ledCy" :r="ledR + ringW + 1"
        :fill="`url(#led-metal-${uid})`"/>

      <!-- Inner recess (dark mount) -->
      <circle :cx="ledCx" :cy="ledCy" :r="ledR + 1.5"
        :fill="`url(#led-recess-${uid})`"/>

      <!-- LED with bloom filter -->
      <circle :cx="ledCx" :cy="ledCy" :r="ledR"
        :fill="`url(#led-glow-${uid})`"
        :filter="`url(#led-bloom-${uid})`"/>

      <!-- Specular highlight (lens glint) -->
      <ellipse
        :cx="ledCx - ledR * 0.28" :cy="ledCy - ledR * 0.30"
        :rx="ledR * 0.32" :ry="ledR * 0.20"
        fill="rgba(255,255,255,0.45)"/>

      <!-- Label -->
      <text v-if="nameLabel"
        :x="w / 2" :y="h - 2"
        text-anchor="middle" dominant-baseline="auto"
        :font-size="nameFs" font-weight="700" font-family="monospace"
        :fill="ledColor" opacity="0.70">{{ nameLabel }}</text>

      <!-- Invalid overlay -->
      <circle v-if="d.isInvalid" :cx="ledCx" :cy="ledCy" :r="ledR + ringW + 1"
        fill="rgba(231,76,60,0.35)"/>
    </svg>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from "vue";
import { useNodeData } from "./useNodeData";

const { d, w, h } = useNodeData(60, 60);
const uid = ref(Math.random().toString(36).slice(2, 8));

// ── Layout ─────────────────────────────────────────────────────────────────
const nameLabel = computed(() => (d.value.name as string) || "");
const hasLabel  = computed(() => nameLabel.value.length > 0);

const nameFs = computed(() => Math.max(6, Math.min(w.value * 0.16, 12)));
const labelH = computed(() => hasLabel.value ? nameFs.value + 4 : 0);

// LED radius: largest circle that fits, leaving room for the metallic ring + label
const ringW  = computed(() => Math.max(3, Math.min(w.value, h.value) * 0.10));
const ledR   = computed(() => {
  const maxR = (Math.min(w.value, h.value - labelH.value) / 2) - ringW.value - 2;
  return Math.max(6, maxR);
});
const ledCx  = computed(() => w.value / 2);
const ledCy  = computed(() => {
  const available = h.value - labelH.value;
  return available / 2;
});

// ── Colour conditions ────────────────────────────────────────────────────
// User-defined colour conditions (stored under `currentColorRules`) take
// precedence over the script-computed statusColor. They match the raw state
// value (indicatorValue), which the indicator binding script passes through.
type Op = ">" | ">=" | "<" | "<=" | "==" | "!=";
type Rule = { op: Op; threshold: number | string; color: string };

// Word sets kept in sync with the heuristic in indicator.ts, so a string
// threshold like "ON" still matches a TM value that arrives as the number 1.
const ON_WORDS  = new Set(["1","on","true","enabled","active","present","ok","yes"]);
const OFF_WORDS = new Set(["0","off","false","disabled","inactive","absent","nok","no"]);

const currentVal = computed(() => d.value.indicatorValue ?? null);

const matchedRuleColor = computed<string | null>(() => {
  const cv = currentVal.value;
  if (cv === null || cv === undefined || cv === "") return null;
  const nv = Number(cv);
  const isNumeric = Number.isFinite(nv);
  const rules = (d.value.currentColorRules as Rule[]) || [];

  for (const r of rules) {
    let hit = false;
    const t  = r.threshold;
    const tn = Number(t);

    if (r.op === "==" || r.op === "!=") {
      // 1. Exact numeric match
      if (isNumeric && Number.isFinite(tn)) {
        hit = r.op === "==" ? nv === tn : nv !== tn;
      }
      // 2. Exact string match (case-insensitive)
      if (!hit) {
        const ts = String(t).trim().toLowerCase();
        const vs = String(cv).trim().toLowerCase();
        hit = r.op === "==" ? vs === ts : vs !== ts;
      }
      // 3. Semantic ON/OFF match: bridges "ON"/"OFF" threshold vs 1/0 wire value
      if (!hit) {
        const tStr   = String(t).trim().toLowerCase();
        const vStr   = String(cv).trim().toLowerCase();
        const tIsOn  = ON_WORDS.has(tStr);
        const tIsOff = OFF_WORDS.has(tStr);
        if (tIsOn || tIsOff) {
          const vOnLike  = ON_WORDS.has(vStr);
          const vOffLike = OFF_WORDS.has(vStr);
          const semanticMatch = (tIsOn && vOnLike) || (tIsOff && vOffLike);
          hit = r.op === "==" ? semanticMatch : !semanticMatch;
        }
      }
    } else if (isNumeric && Number.isFinite(tn)) {
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

// ── Colour ─────────────────────────────────────────────────────────────────
const ledColor   = computed(() =>
  matchedRuleColor.value ?? ((d.value.statusColor as string) || "#27ae60")
);
const glowCenter = computed(() => lighten(ledColor.value, 0.55));
const ledDim     = computed(() => darken(ledColor.value, 0.50));

/** Simple lightening: blend colour toward white */
function lighten(hex: string, amount: number): string {
  return blendToward(hex, "#ffffff", amount);
}
/** Simple darkening: blend colour toward black */
function darken(hex: string, amount: number): string {
  return blendToward(hex, "#000000", amount);
}
function blendToward(hex: string, target: string, t: number): string {
  const parse = (h: string) => {
    const c = h.replace("#", "");
    if (c.length === 3) return [
      parseInt(c[0]+c[0], 16),
      parseInt(c[1]+c[1], 16),
      parseInt(c[2]+c[2], 16),
    ];
    return [parseInt(c.slice(0,2),16), parseInt(c.slice(2,4),16), parseInt(c.slice(4,6),16)];
  };
  try {
    const [r1,g1,b1] = parse(hex);
    const [r2,g2,b2] = parse(target);
    const r = Math.round(r1 + (r2-r1)*t);
    const g = Math.round(g1 + (g2-g1)*t);
    const b = Math.round(b1 + (b2-b1)*t);
    return `#${r.toString(16).padStart(2,"0")}${g.toString(16).padStart(2,"0")}${b.toString(16).padStart(2,"0")}`;
  } catch { return hex; }
}
</script>

<style scoped>
.node-wrap { width: 100%; height: 100%; overflow: visible; display: flex; align-items: center; justify-content: center; }
svg { overflow: visible; }
</style>
