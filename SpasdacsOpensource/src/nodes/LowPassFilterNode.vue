<template>
  <div class="node-wrap" :style="{ opacity: d.opacity ?? 1 }">
    <svg :width="w" :height="h" :viewBox="`0 0 ${w} ${h}`" xmlns="http://www.w3.org/2000/svg" overflow="visible">
      <defs>
        <!-- ── Metallic chassis ────────────────────────────────────── -->
        <linearGradient :id="`lpf-rim-${uid}`" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%"   stop-color="#c8c8da"/>
          <stop offset="20%"  stop-color="#686878"/>
          <stop offset="48%"  stop-color="#e4e4f2"/>
          <stop offset="74%"  stop-color="#565666"/>
          <stop offset="100%" stop-color="#b8b8ca"/>
        </linearGradient>
        <linearGradient :id="`lpf-body-${uid}`" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stop-color="#0e1828"/>
          <stop offset="100%" stop-color="#060e18"/>
        </linearGradient>
        <linearGradient :id="`lpf-sheen-${uid}`" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stop-color="#fff" stop-opacity="0.07"/>
          <stop offset="40%"  stop-color="#fff" stop-opacity="0.02"/>
          <stop offset="100%" stop-color="#000" stop-opacity="0.15"/>
        </linearGradient>

        <!-- ── Inner panel gradient ───────────────────────────────── -->
        <radialGradient :id="`lpf-panel-off-${uid}`" cx="50%" cy="45%" r="65%">
          <stop offset="0%"   stop-color="#14182e"/>
          <stop offset="100%" stop-color="#06080e"/>
        </radialGradient>
        <radialGradient :id="`lpf-panel-on-${uid}`" cx="38%" cy="38%" r="70%">
          <stop offset="0%"   stop-color="#0e2230"/>
          <stop offset="60%"  stop-color="#061420"/>
          <stop offset="100%" stop-color="#030a12"/>
        </radialGradient>

        <!-- ── Filter curve fill — horizontal teal gradient (bright passband left) -->
        <linearGradient :id="`lpf-fill-on-${uid}`" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%"   stop-color="#22d3ee" stop-opacity="0.38"/>
          <stop offset="70%"  stop-color="#0891b2" stop-opacity="0.14"/>
          <stop offset="100%" stop-color="#0e7490" stop-opacity="0.03"/>
        </linearGradient>
        <linearGradient :id="`lpf-fill-off-${uid}`" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%"   stop-color="#475569" stop-opacity="0.22"/>
          <stop offset="100%" stop-color="#1e293b" stop-opacity="0.05"/>
        </linearGradient>

        <!-- ── RF connector ───────────────────────────────────────── -->
        <linearGradient :id="`lpf-conn-${uid}`" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stop-color="#5a7a9a"/>
          <stop offset="50%"  stop-color="#2a4a6a"/>
          <stop offset="100%" stop-color="#1a2a3a"/>
        </linearGradient>
        <linearGradient :id="`lpf-conn-rim-${uid}`" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stop-color="#7a9aba"/>
          <stop offset="50%"  stop-color="#4a6a8a"/>
          <stop offset="100%" stop-color="#1e3048"/>
        </linearGradient>

        <!-- ── Glow filter ────────────────────────────────────────── -->
        <filter :id="`lpf-glow-${uid}`" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="2.2" result="blur"/>
          <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>

        <!-- ── Clip: inner panel ──────────────────────────────────── -->
        <clipPath :id="`lpf-clip-${uid}`">
          <rect :x="px" :y="py" :width="pw" :height="ph" :rx="pr"/>
        </clipPath>
      </defs>

      <!-- ── Chassis ─────────────────────────────────────────────────────── -->
      <rect x="1" y="1" :width="w-2" :height="h-2"
        :rx="cr" :fill="`url(#lpf-body-${uid})`"
        :stroke="`url(#lpf-rim-${uid})`" :stroke-width="rw"/>
      <rect :x="rw*0.5" :y="rw*0.5" :width="w-rw" :height="h-rw"
        :rx="cr*0.8" :fill="`url(#lpf-sheen-${uid})`" pointer-events="none"/>

      <!-- ── RF connectors (left + right) ───────────────────────────────── -->
      <rect :x="0"     :y="h/2 - connH/2" :width="connW" :height="connH" :rx="connW*0.35"
        :fill="`url(#lpf-conn-${uid})`" :stroke="`url(#lpf-conn-rim-${uid})`" :stroke-width="w*0.009"/>
      <circle :cx="connW*0.5"   :cy="h/2" :r="connH*0.22" fill="#0d1117" stroke="#8090a0" stroke-width="1.2"/>
      <rect :x="w-connW" :y="h/2 - connH/2" :width="connW" :height="connH" :rx="connW*0.35"
        :fill="`url(#lpf-conn-${uid})`" :stroke="`url(#lpf-conn-rim-${uid})`" :stroke-width="w*0.009"/>
      <circle :cx="w-connW*0.5" :cy="h/2" :r="connH*0.22" fill="#0d1117" stroke="#8090a0" stroke-width="1.2"/>

      <!-- ── Inner panel ─────────────────────────────────────────────────── -->
      <rect :x="px" :y="py" :width="pw" :height="ph" :rx="pr"
        :fill="showActive ? `url(#lpf-panel-on-${uid})` : `url(#lpf-panel-off-${uid})`"
        stroke="#06080e" :stroke-width="rw*0.4"/>
      <!-- Panel glow: always on when LED is hidden, otherwise follows LED state -->
      <rect v-if="showActive && !d.isInvalid" :x="px" :y="py" :width="pw" :height="ph" :rx="pr"
        fill="none" stroke="#22d3ee" :stroke-width="rw*0.35" opacity="0.34"
        :style="`filter: drop-shadow(0 0 ${pw*0.04}px #0891b2)`"/>

      <!-- ── Frequency axis (bottom reference line) ─────────────────────── -->
      <line :x1="curveX0" :y1="axisY" :x2="curveX5" :y2="axisY"
        stroke="#2a3a5a" :stroke-width="sw*0.6" stroke-linecap="round"
        :clip-path="`url(#lpf-clip-${uid})`"/>

      <!-- ── Signal path lines (IN → passband top, stopband floor → OUT) ── -->
      <line :x1="connW" :y1="h/2" :x2="curveX0" :y2="topY"
        :stroke="sigColor" stroke-width="1.5" stroke-linecap="round"
        :opacity="showActive ? 0.7 : 0.2" :clip-path="`url(#lpf-clip-${uid})`"/>
      <line :x1="curveX5" :y1="axisY" :x2="px + mainW" :y2="h/2"
        :stroke="sigColor" stroke-width="1.5" stroke-linecap="round"
        :opacity="showActive ? 0.7 : 0.2" :clip-path="`url(#lpf-clip-${uid})`"/>

      <!-- ── Filter curve: filled passband area ─────────────────────────── -->
      <path :d="curveFillPath"
        :fill="showActive ? `url(#lpf-fill-on-${uid})` : `url(#lpf-fill-off-${uid})`"
        :clip-path="`url(#lpf-clip-${uid})`"/>

      <!-- ── Filter curve: response line ───────────────────────────────── -->
      <path :d="curvePath"
        fill="none"
        :stroke="curveStroke" :stroke-width="curveLineW"
        stroke-linecap="round" stroke-linejoin="round"
        :filter="showActive && !d.isInvalid ? `url(#lpf-glow-${uid})` : ''"
        :clip-path="`url(#lpf-clip-${uid})`"/>

      <!-- ── Cutoff marker — dashed vertical at –3 dB point ────────────── -->
      <line :x1="fcX" :y1="topY - ph*0.04" :x2="fcX" :y2="axisY"
        :stroke="curveStroke" :stroke-width="curveLineW*0.45"
        stroke-dasharray="2.5,2.5" opacity="0.40"
        :clip-path="`url(#lpf-clip-${uid})`"/>
      <!-- –3 dB tick at the midpoint between passband and stopband -->
      <line :x1="fcX" :y1="midY - ph*0.06" :x2="fcX" :y2="midY + ph*0.06"
        :stroke="curveStroke" :stroke-width="curveLineW*0.65"
        opacity="0.70" :clip-path="`url(#lpf-clip-${uid})`"/>

      <!-- ── Separator before right LED strip (only when LED shown) ──────── -->
      <line v-if="hasStatusBinding"
        :x1="px + mainW" :y1="py + ph*0.08" :x2="px + mainW" :y2="py + ph*0.65"
        stroke="#1e3048" stroke-width="1" opacity="0.55"
        :clip-path="`url(#lpf-clip-${uid})`"/>

      <!-- ── Status LED (only when statusColor is bound) ────────────────── -->
      <g v-if="hasStatusBinding">
        <circle :cx="ledX" :cy="ledY" :r="ledR*1.30"
          fill="#0d1520" stroke="#4a6070" :stroke-width="w*0.014"/>
        <circle :cx="ledX" :cy="ledY" :r="ledR"
          :fill="ledFill" :stroke="ledFill" :stroke-width="w*0.010"/>
        <circle v-if="isOn && !d.isInvalid"
          :cx="ledX - ledR*0.28" :cy="ledY - ledR*0.28" :r="ledR*0.38"
          fill="white" opacity="0.55"/>
      </g>

      <!-- ── Node name label (upper strip, inside chassis) ──────────────── -->
      <text v-if="d.name"
        :x="titleX" :y="titleY"
        :text-anchor="titleAnchor" dominant-baseline="middle"
        :fill="titleFontColor" :font-size="titleFontSize"
        font-weight="600" font-family="'Segoe UI',sans-serif" opacity="0.85"
        :clip-path="`url(#lpf-clip-${uid})`">{{ d.name }}</text>

      <!-- ── Cutoff frequency label (below curve, when bound) ───────────── -->
      <text v-if="cutoffFreqText"
        :x="fcX" :y="py + ph*0.90"
        text-anchor="middle" dominant-baseline="middle"
        :fill="curveStroke" :font-size="subFontSize"
        font-weight="600" font-family="'Segoe UI',sans-serif" opacity="0.88"
        :clip-path="`url(#lpf-clip-${uid})`">{{ cutoffFreqText }}</text>

      <!-- ── Temperature (only when temperature is bound) ───────────────── -->
      <text v-if="hasTempBinding"
        :x="px + pw - pw*0.04" :y="py + ph - ph*0.10"
        text-anchor="end" dominant-baseline="middle"
        :fill="tempColor" :font-size="tempFontSize"
        font-weight="700" font-family="'Digital7','Courier New',monospace"
        :clip-path="`url(#lpf-clip-${uid})`">{{ tempText }}</text>



      <!-- ── Optional inner border glow ring ───────────────────────────── -->
      <rect v-if="hasBorder" :x="px" :y="py" :width="pw" :height="ph" :rx="pr"
        fill="none" :stroke="resolvedBorderColor" :stroke-width="rw * 0.55"
        :opacity="showActive ? 1.0 : 0.35"/>

      <!-- ── Invalid overlay ─────────────────────────────────────────────── -->
      <rect v-if="d.isInvalid" x="1" y="1" :width="w-2" :height="h-2"
        fill="rgba(231,76,60,0.20)" :rx="cr"
        stroke="#e74c3c" :stroke-width="rw*0.55" stroke-dasharray="8,5"/>
    </svg>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from "vue";
import { useNodeData } from "./useNodeData";
import { useTitlePosition } from "./useTitlePosition";

const { d, w, h } = useNodeData(170, 100);
const uid = ref(Math.random().toString(36).slice(2, 8));

// ── Chassis ───────────────────────────────────────────────────────────────
const rw = computed(() => w.value * 0.036);
const cr = computed(() => w.value * 0.072);
const sw = computed(() => w.value * 0.012);

// ── Inner panel ───────────────────────────────────────────────────────────
const px = computed(() => rw.value * 0.55);
const py = computed(() => rw.value * 0.55);
const pw = computed(() => w.value - px.value * 2);
const ph = computed(() => h.value - py.value * 2);
const pr = computed(() => cr.value * 0.65);

// ── RF connectors ─────────────────────────────────────────────────────────
const connW = computed(() => rw.value * 1.8);
const connH = computed(() => h.value * 0.28);

// ── Layout: main curve area + right LED strip ─────────────────────────────
const stripW = computed(() => pw.value * 0.21);
const mainW  = computed(() => pw.value - stripW.value);

// ── Font sizes ────────────────────────────────────────────────────────────
const nameFontSize = computed(() => h.value * 0.22);
const tempFontSize = computed(() => h.value * 0.22);
const subFontSize  = computed(() => h.value * 0.175);
const titleFontSize = computed(() => (d.value.titleFontSize as number | undefined) ?? subFontSize.value);
const titleFontColor = computed(() => (d.value.titleFontColor as string) || "#94a3b8");
const { titleX, titleY, titleAnchor } = useTitlePosition(
  () => d.value.titlePosition as string | undefined,
  () => px.value,
  () => mainW.value,
  () => py.value,
  () => ph.value,
  "top-center",
);

// ── LED ───────────────────────────────────────────────────────────────────
const ledR = computed(() => w.value * 0.044);
const ledX = computed(() => px.value + pw.value - stripW.value * 0.48);
const ledY = computed(() => py.value + ph.value * 0.35);

// ── Frequency-response curve coordinate system ────────────────────────────
// topY  = passband peak level (response at maximum)
// botY  = stopband floor (also used as the frequency axis baseline)
const topY  = computed(() => py.value + ph.value * 0.24);
const botY  = computed(() => py.value + ph.value * 0.76);
const axisY = computed(() => botY.value);
/** Mid-level = –3 dB point on the rolloff — used for tick mark */
const midY  = computed(() => (topY.value + botY.value) / 2);

// X: spans from just inside the left connector to the right edge of mainW
const curveX0 = computed(() => px.value + connW.value + pw.value * 0.01);
const curveX5 = computed(() => px.value + mainW.value  - pw.value * 0.01);

// Rolloff region boundaries (LPF: flat passband on left, rolloff, flat stopband on right)
/** Start of rolloff (end of flat passband) — at ~50 % of span */
const lpX1 = computed(() => curveX0.value + (curveX5.value - curveX0.value) * 0.50);
/** End of rolloff (start of flat stopband) — at ~72 % of span */
const lpX2 = computed(() => curveX0.value + (curveX5.value - curveX0.value) * 0.72);
/** –3 dB / cutoff frequency x position — midpoint of rolloff */
const fcX  = computed(() => (lpX1.value + lpX2.value) / 2);

// ── LPF response path ─────────────────────────────────────────────────────
// Flat passband at topY → smooth S-curve rolloff → flat stopband at botY
const curvePath = computed(() => {
  const x0 = curveX0.value, x1 = lpX1.value, x2 = lpX2.value, x3 = curveX5.value;
  const tY = topY.value, bY = botY.value;
  const dx = (x2 - x1) * 0.5;
  return (
    `M ${x0},${tY} L ${x1},${tY} ` +
    `C ${x1 + dx},${tY} ${x2 - dx},${bY} ${x2},${bY} ` +
    `L ${x3},${bY}`
  );
});

/** Closed fill shape: passband area between the response and the frequency axis */
const curveFillPath = computed(() => {
  // Close from (curveX5, botY) → (curveX0, botY) → back to start
  return curvePath.value + ` L ${curveX0.value},${botY.value} Z`;
});

// ── State & colours ───────────────────────────────────────────────────────
const isOn = computed(() => {
  const sc = d.value.statusColor as string;
  return !!sc && sc !== "" && sc !== "gradient:off";
});
/** True when the filter should render in its glowing/active state:
 *  - LED hidden (no binding)  → always active/glowing
 *  - LED visible              → follows the actual ON/OFF state            */
const showActive = computed(() => !hasStatusBinding.value || isOn.value);

/** Teal accent when active; grey when off; red when invalid */
const curveStroke = computed(() => d.value.isInvalid ? "#e74c3c" : showActive.value ? "#22d3ee" : "#4a5568");
const sigColor    = computed(() => d.value.isInvalid ? "#e74c3c" : showActive.value ? "#67e8f9" : "#334155");
const curveLineW  = computed(() => w.value * 0.013);

const ledFill = computed(() => {
  if (d.value.isInvalid) return "#e74c3c";
  return isOn.value ? (d.value.statusColor as string) : "#101e2a";
});

// ── Cutoff frequency ──────────────────────────────────────────────────────
const cutoffFreqText = computed(() => {
  const cf = (d.value as any).centerFreq;
  if (cf === undefined || cf === null || String(cf).trim() === "") return "";
  return String(cf);
});

// ── Border colour rules ───────────────────────────────────────────────────
type BCRule = { op: string; threshold: number | string; color: string };
const ON_WORDS_BC  = new Set(["1","on","true","enabled","active","present","ok","yes"]);
const OFF_WORDS_BC = new Set(["0","off","false","disabled","inactive","absent","nok","no"]);
const matchedBorderColor = computed<string | null>(() => {
  const cv = d.value.borderColorValue as string | number | null | undefined;
  if (cv === null || cv === undefined || cv === "") return null;
  const nv = Number(cv); const isNumeric = Number.isFinite(nv);
  const rules = (d.value.borderColorRules as BCRule[]) || [];
  for (const r of rules) {
    let hit = false; const t = r.threshold; const tn = Number(t);
    if (r.op === "==" || r.op === "!=") {
      if (isNumeric && Number.isFinite(tn)) hit = r.op === "==" ? nv === tn : nv !== tn;
      if (!hit) { const ts = String(t).trim().toLowerCase(); const vs = String(cv).trim().toLowerCase(); hit = r.op === "==" ? vs === ts : vs !== ts; }
      if (!hit) {
        const tStr = String(t).trim().toLowerCase();
        const vStr = String(cv).trim().toLowerCase();
        const tIsOn = ON_WORDS_BC.has(tStr); const tIsOff = OFF_WORDS_BC.has(tStr);
        if (tIsOn || tIsOff) { const semanticMatch = (tIsOn && ON_WORDS_BC.has(vStr)) || (tIsOff && OFF_WORDS_BC.has(vStr)); hit = r.op === "==" ? semanticMatch : !semanticMatch; }
      }
    } else if (isNumeric && Number.isFinite(tn)) {
      switch (r.op) { case ">": hit = nv > tn; break; case ">=": hit = nv >= tn; break; case "<": hit = nv < tn; break; case "<=": hit = nv <= tn; break; }
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

// ── Binding guards ────────────────────────────────────────────────────────
/** Show LED only when a statusColor has been bound (non-empty, non-null) */
const hasStatusBinding = computed(() => {
  const sc = d.value.statusColor as string | undefined | null;
  return sc !== undefined && sc !== null && sc !== "";
});
/** Show temperature only when a real numeric temperature has been bound */
const hasTempBinding = computed(() => {
  const t = d.value.temperature;
  return t !== undefined && t !== null && typeof t === "number" && !Number.isNaN(t);
});

// ── Temperature ───────────────────────────────────────────────────────────
const tempText = computed(() => {
  if (!hasTempBinding.value) return "";
  return (d.value.temperature as number).toFixed(1) + "°C";
});
const tempColor = computed(() => {
  const t = d.value.temperature as number;
  return t > 80 ? "#e74c3c" : t > 60 ? "#ff9800" : "#ffd740";
});
</script>

<style scoped>
.node-wrap { width: 100%; height: 100%; overflow: visible; }
svg { overflow: visible; }
svg * { transition: none !important; animation: none !important; }
</style>
