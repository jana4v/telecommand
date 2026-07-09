<template>
  <div class="node-wrap" :style="{ opacity: d.opacity ?? 1 }">
    <svg :width="w" :height="h" :viewBox="`0 0 ${w} ${h}`"
         xmlns="http://www.w3.org/2000/svg" overflow="visible">
      <defs>
        <!-- ── Metallic chassis rim (same palette as BPF/LNA) ─────────── -->
        <linearGradient :id="`sys-rim-${uid}`" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%"   stop-color="#c8c8da"/>
          <stop offset="20%"  stop-color="#686878"/>
          <stop offset="48%"  stop-color="#e4e4f2"/>
          <stop offset="74%"  stop-color="#565666"/>
          <stop offset="100%" stop-color="#b8b8ca"/>
        </linearGradient>
        <!-- Dark body base -->
        <linearGradient :id="`sys-body-${uid}`" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stop-color="#0e1828"/>
          <stop offset="100%" stop-color="#060e18"/>
        </linearGradient>
        <!-- Status-colour fill gradient (ON state) -->
        <linearGradient :id="`sys-on-${uid}`" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   :stop-color="statusColor" stop-opacity="0.72"/>
          <stop offset="100%" :stop-color="statusColor" stop-opacity="0.94"/>
        </linearGradient>
        <!-- Sheen overlay -->
        <linearGradient :id="`sys-sheen-${uid}`" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stop-color="#fff" stop-opacity="0.07"/>
          <stop offset="40%"  stop-color="#fff" stop-opacity="0.02"/>
          <stop offset="100%" stop-color="#000" stop-opacity="0.15"/>
        </linearGradient>
        <!-- Glow filter (for optional inner border when ON) -->
        <filter :id="`sys-glow-${uid}`" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="2.5" result="blur"/>
          <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
        <!-- Clip mask for inner panel contents -->
        <clipPath :id="`sys-clip-${uid}`">
          <rect :x="px" :y="py" :width="pw" :height="ph" :rx="pr"/>
        </clipPath>
      </defs>

      <!-- ── Chassis outer body + metallic rim ──────────────────────────── -->
      <rect x="1" y="1" :width="w-2" :height="h-2"
        :rx="cr" :fill="`url(#sys-body-${uid})`"
        :stroke="`url(#sys-rim-${uid})`" :stroke-width="rw"/>
      <!-- Top sheen -->
      <rect :x="rw*0.5" :y="rw*0.5" :width="w-rw" :height="h-rw"
        :rx="cr*0.8" :fill="`url(#sys-sheen-${uid})`" pointer-events="none"/>

      <!-- ── Inner panel base (dark) ────────────────────────────────────── -->
      <rect :x="px" :y="py" :width="pw" :height="ph" :rx="pr"
        :fill="`url(#sys-body-${uid})`" stroke="#06080e" :stroke-width="rw*0.4"/>

      <!-- ── Full-fill status colour overlay (tweened 0 → 1 when ON) ───── -->
      <rect :x="px" :y="py" :width="pw" :height="ph" :rx="pr"
        :fill="`url(#sys-on-${uid})`" :opacity="fillOpacity"
        :clip-path="`url(#sys-clip-${uid})`"/>

      <!-- ── Sheen over inner panel ─────────────────────────────────────── -->
      <rect :x="px" :y="py" :width="pw" :height="ph*0.5" :rx="pr"
        fill="rgba(255,255,255,0.05)" pointer-events="none"
        :clip-path="`url(#sys-clip-${uid})`"/>

      <!-- ── Optional inner border glow ring ───────────────────────────── -->
      <rect v-if="hasBorder" :x="px" :y="py" :width="pw" :height="ph" :rx="pr"
        fill="none" :stroke="resolvedBorderColor" :stroke-width="borderSw"
        :opacity="isOn ? 1.0 : 0.35"
        :filter="isOn && !d.isInvalid ? `url(#sys-glow-${uid})` : ''"
        :clip-path="`url(#sys-clip-${uid})`"/>



      <!-- ── Title / name label ────────────────────────────────────────────── -->
      <SvgMultilineText v-if="nameText"
        :text="nameText" :x="nameLabelX" :y="nameLabelY"
        fill="#e8eaf0" :font-size="nameFz"
        font-weight="700" font-family="'Segoe UI','Arial',sans-serif"
        :text-anchor="nameAnchor" :opacity="labelOpacity"
        :clip-path="`url(#sys-clip-${uid})`"
      />

      <!-- ── Temperature (bottom-right, optional) ───────────────────────── -->
      <text v-if="hasTemp"
        :x="px + pw - pw*0.04" :y="py + ph - ph*0.20"
        text-anchor="end" dominant-baseline="middle"
        :fill="tempColor" :font-size="tempFz"
        font-weight="700" font-family="'Digital7','Courier New',monospace"
        :clip-path="`url(#sys-clip-${uid})`">{{ tempText }}</text>

      <!-- ── Invalid overlay ────────────────────────────────────────────── -->
      <rect v-if="d.isInvalid" x="1" y="1" :width="w-2" :height="h-2"
        fill="rgba(231,76,60,0.20)" :rx="cr"
        stroke="#e74c3c" :stroke-width="rw*0.55" stroke-dasharray="8,5"/>
    </svg>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from "vue";
import { useNodeData }   from "./useNodeData";
import SvgMultilineText  from "./SvgMultilineText.vue";
import { useGsapTween }  from "./useGsapTween";
import { useTitlePosition } from "./useTitlePosition";

const { d, w, h } = useNodeData(160, 70);
const uid = ref(Math.random().toString(36).slice(2, 8));

// ── Chassis geometry (mirrors BPF proportions) ──────────────────────────────
const rw = computed(() => w.value * 0.036);
const cr = computed(() => w.value * 0.072);

// ── Inner panel (inset from rim) ────────────────────────────────────────────
const px = computed(() => rw.value * 0.55);
const py = computed(() => rw.value * 0.55);
const pw = computed(() => w.value  - px.value * 2);
const ph = computed(() => h.value  - py.value * 2);
const pr = computed(() => cr.value * 0.65);

// ── Font sizes ──────────────────────────────────────────────────────────────
const nameFz = computed(() =>
  (d.value.titleFontSize as number | undefined) ??
  Math.min(ph.value * 0.40, pw.value * 0.16)
);
const tempFz = computed(() => ph.value * 0.30);

// ── Status ──────────────────────────────────────────────────────────────────
const statusColor = computed(() => String(d.value.statusColor || "#27ae60"));
const isOn = computed(() => {
  const sc = d.value.statusColor as string;
  return !!sc && sc !== "" && sc !== "gradient:off" && sc !== "#1a1a2e";
});

// Smooth ON ↔ OFF transitions via GSAP tween
const fillOpacity  = useGsapTween(() => isOn.value ? 1.0  : 0,    0.40, "power2.inOut");
const labelOpacity = useGsapTween(() => isOn.value ? 1.0  : 0.55, 0.40, "power2.inOut");

// ── Optional inner border ────────────────────────────────────────────────────
// Border colour can come from three sources (in priority order):
//   1. borderColorRules evaluated against borderColorValue (TM state → colour mapping)
//   2. d.stroke set directly by old scripts that put a hex colour from TM
//   3. Nothing — border is hidden
type BCRule = { op: string; threshold: number | string; color: string };
const ON_WORDS_BC  = new Set(["1","on","true","enabled","active","present","ok","yes"]);
const OFF_WORDS_BC = new Set(["0","off","false","disabled","inactive","absent","nok","no"]);

const matchedBorderColor = computed<string | null>(() => {
  const cv = d.value.borderColorValue as string | number | null | undefined;
  if (cv === null || cv === undefined || cv === "") return null;
  const nv = Number(cv);
  const isNumeric = Number.isFinite(nv);
  const rules = (d.value.borderColorRules as BCRule[]) || [];
  for (const r of rules) {
    let hit = false;
    const t  = r.threshold;
    const tn = Number(t);
    if (r.op === "==" || r.op === "!=") {
      if (isNumeric && Number.isFinite(tn)) {
        hit = r.op === "==" ? nv === tn : nv !== tn;
      }
      if (!hit) {
        const ts = String(t).trim().toLowerCase();
        const vs = String(cv).trim().toLowerCase();
        hit = r.op === "==" ? vs === ts : vs !== ts;
      }
      if (!hit) {
        const tStr = String(t).trim().toLowerCase();
        const vStr = String(cv).trim().toLowerCase();
        const tIsOn = ON_WORDS_BC.has(tStr); const tIsOff = OFF_WORDS_BC.has(tStr);
        if (tIsOn || tIsOff) {
          const vOnLike = ON_WORDS_BC.has(vStr); const vOffLike = OFF_WORDS_BC.has(vStr);
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

const resolvedBorderColor = computed<string>(() => {
  if (matchedBorderColor.value) return matchedBorderColor.value;
  const s = d.value.stroke as string | undefined;
  return (s && s !== "" && s !== "transparent" && s !== "none") ? s : "";
});

const hasBorder = computed(() => resolvedBorderColor.value !== "");
const borderSw = computed(() => {
  const sw = d.value.strokeWidth as number | undefined;
  return sw && sw > 0 ? sw : 1.5;
});

// ── Name ─────────────────────────────────────────────────────────────────────
const nameText = computed(() => String(d.value.name ?? ""));

// Position picker — when set, overrides the legacy nudge logic
const { titleX: _tpX, titleY: _tpY, titleAnchor: _tpAnchor } = useTitlePosition(
  () => d.value.titlePosition as string | undefined,
  () => px.value, () => pw.value, () => py.value, () => ph.value,
  "center",
);
const nameLabelX = computed(() =>
  d.value.titlePosition ? _tpX.value
    : hasTemp.value ? px.value + pw.value * 0.38 : px.value + pw.value * 0.5
);
const nameLabelY = computed(() =>
  d.value.titlePosition ? _tpY.value : py.value + ph.value * 0.5
);
const nameAnchor = computed(() =>
  d.value.titlePosition ? _tpAnchor.value : "middle"
);

// ── Temperature (optional) ───────────────────────────────────────────────────
const hasTemp = computed(() =>
  d.value.temperature !== undefined && d.value.temperature !== null
);
const tempText = computed(() => {
  const t = d.value.temperature;
  if (t === null || t === undefined || typeof t !== "number") return "xx.x°C";
  return t.toFixed(1) + "°C";
});
const tempColor = computed(() => {
  const t = d.value.temperature as number | undefined;
  if (t === undefined || t === null) return "#ffd740";
  return t > 80 ? "#e74c3c" : t > 60 ? "#ff9800" : "#ffd740";
});
</script>

<style scoped>
.node-wrap { width: 100%; height: 100%; overflow: visible; }
</style>
