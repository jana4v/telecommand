<template>
  <div class="node-wrap" :style="{ opacity: d.opacity ?? 1 }">
    <svg :width="w" :height="h" :viewBox="`0 0 ${w} ${h}`"
         xmlns="http://www.w3.org/2000/svg" overflow="visible">
      <defs>
        <!-- ── Metallic chassis ───────────────────────────────────────── -->
        <linearGradient :id="`sspa-rim-${uid}`" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%"   stop-color="#c8c8da"/>
          <stop offset="20%"  stop-color="#686878"/>
          <stop offset="48%"  stop-color="#e4e4f2"/>
          <stop offset="74%"  stop-color="#565666"/>
          <stop offset="100%" stop-color="#b8b8ca"/>
        </linearGradient>
        <linearGradient :id="`sspa-body-${uid}`" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stop-color="#0e1828"/>
          <stop offset="100%" stop-color="#060e18"/>
        </linearGradient>
        <linearGradient :id="`sspa-sheen-${uid}`" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stop-color="#fff" stop-opacity="0.07"/>
          <stop offset="40%"  stop-color="#fff" stop-opacity="0.02"/>
          <stop offset="100%" stop-color="#000" stop-opacity="0.15"/>
        </linearGradient>

        <!-- ── Inner panel gradient (off = dark navy, on = deep green) ── -->
        <radialGradient :id="`sspa-panel-off-${uid}`" cx="50%" cy="45%" r="65%">
          <stop offset="0%"   stop-color="#14182e"/>
          <stop offset="100%" stop-color="#06080e"/>
        </radialGradient>
        <radialGradient :id="`sspa-panel-on-${uid}`" cx="38%" cy="38%" r="70%">
          <stop offset="0%"   stop-color="#001c0a"/>
          <stop offset="60%"  stop-color="#000e05"/>
          <stop offset="100%" stop-color="#03050a"/>
        </radialGradient>

        <!-- ── Triangle fill: green when ON, slate when OFF ─────────── -->
        <linearGradient :id="`sspa-tri-on-${uid}`" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%"   stop-color="#14532d" stop-opacity="0.72"/>
          <stop offset="60%"  stop-color="#16a34a" stop-opacity="0.55"/>
          <stop offset="100%" stop-color="#27ae60" stop-opacity="0.80"/>
        </linearGradient>
        <linearGradient :id="`sspa-tri-off-${uid}`" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%"   stop-color="#1e293b" stop-opacity="0.80"/>
          <stop offset="100%" stop-color="#0f172a" stop-opacity="0.50"/>
        </linearGradient>

        <!-- ── RF connector gradient ─────────────────────────────────── -->
        <linearGradient :id="`sspa-conn-${uid}`" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stop-color="#5a7a9a"/>
          <stop offset="50%"  stop-color="#2a4a6a"/>
          <stop offset="100%" stop-color="#1a2a3a"/>
        </linearGradient>
        <linearGradient :id="`sspa-conn-rim-${uid}`" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stop-color="#7a9aba"/>
          <stop offset="50%"  stop-color="#4a6a8a"/>
          <stop offset="100%" stop-color="#1e3048"/>
        </linearGradient>

        <!-- ── Glow filter (green) ───────────────────────────────────── -->
        <filter :id="`sspa-glow-${uid}`" x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="3.5" result="blur"/>
          <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>

        <!-- ── Clip: inner panel ─────────────────────────────────────── -->
        <clipPath :id="`sspa-clip-${uid}`">
          <rect :x="px" :y="py" :width="pw" :height="ph" :rx="pr"/>
        </clipPath>

        <!-- ── Clip: triangle interior (for gain stripes) ────────────── -->
        <clipPath :id="`sspa-tri-clip-${uid}`">
          <path :d="triPath"/>
        </clipPath>
      </defs>

      <!-- ── Chassis ──────────────────────────────────────────────────────── -->
      <rect x="1" y="1" :width="w-2" :height="h-2"
        :rx="cr" :fill="`url(#sspa-body-${uid})`"
        :stroke="`url(#sspa-rim-${uid})`" :stroke-width="rw"/>
      <rect :x="rw*0.5" :y="rw*0.5" :width="w-rw" :height="h-rw"
        :rx="cr*0.8" :fill="`url(#sspa-sheen-${uid})`" pointer-events="none"/>

      <!-- ── RF connectors (left IN, right OUT) ──────────────────────────── -->
      <rect :x="0"     :y="h/2 - connH/2" :width="connW" :height="connH" :rx="connW*0.35"
        :fill="`url(#sspa-conn-${uid})`" :stroke="`url(#sspa-conn-rim-${uid})`" :stroke-width="w*0.009"/>
      <circle :cx="connW*0.5"   :cy="h/2" :r="connH*0.22" fill="#0d1117" stroke="#8090a0" stroke-width="1.2"/>
      <rect :x="w-connW" :y="h/2 - connH/2" :width="connW" :height="connH" :rx="connW*0.35"
        :fill="`url(#sspa-conn-${uid})`" :stroke="`url(#sspa-conn-rim-${uid})`" :stroke-width="w*0.009"/>
      <circle :cx="w-connW*0.5" :cy="h/2" :r="connH*0.22" fill="#0d1117" stroke="#8090a0" stroke-width="1.2"/>

      <!-- ── Inner panel ───────────────────────────────────────────────────── -->
      <rect :x="px" :y="py" :width="pw" :height="ph" :rx="pr"
        :fill="isOn ? `url(#sspa-panel-on-${uid})` : `url(#sspa-panel-off-${uid})`"
        stroke="#06080e" :stroke-width="rw*0.4"/>
      <!-- Green border glow ring when ON -->
      <rect v-if="isOn && !d.isInvalid" :x="px" :y="py" :width="pw" :height="ph" :rx="pr"
        fill="none" stroke="#27ae60" :stroke-width="rw*0.35" opacity="0.38"
        :style="`filter: drop-shadow(0 0 ${pw*0.04}px #16a34a)`"/>

      <!-- ── Signal path lines (IN → triangle, triangle → OUT) ───────────── -->
      <line :x1="connW" :y1="h/2" :x2="triX0" :y2="h/2"
        :stroke="sigColor" stroke-width="1.6" stroke-linecap="round"
        :opacity="isOn ? 0.80 : 0.18" :clip-path="`url(#sspa-clip-${uid})`"/>
      <line :x1="triX1" :y1="h/2" :x2="w - connW" :y2="h/2"
        :stroke="sigColor" stroke-width="1.6" stroke-linecap="round"
        :opacity="isOn ? 0.80 : 0.18" :clip-path="`url(#sspa-clip-${uid})`"/>

      <!-- ── Amplifier triangle ────────────────────────────────────────────── -->
      <!-- Triangle body fill -->
      <path :d="triPath"
        :fill="isOn ? `url(#sspa-tri-on-${uid})` : `url(#sspa-tri-off-${uid})`"
        :clip-path="`url(#sspa-clip-${uid})`"/>
      <!-- Triangle border -->
      <path :d="triPath" fill="none"
        :stroke="accentColor" :stroke-width="triLineW"
        stroke-linejoin="round"
        :filter="isOn && !d.isInvalid ? `url(#sspa-glow-${uid})` : ''"
        :opacity="isOn ? 1.0 : 0.28"
        :clip-path="`url(#sspa-clip-${uid})`"/>

      <!-- ── Gain stripes inside triangle (horizontal dashed lines) ─────── -->
      <g :clip-path="`url(#sspa-tri-clip-${uid})`" :opacity="isOn ? 0.30 : 0.10">
        <line v-for="gy in gainLineYs" :key="gy"
          :x1="triX0 + triLineW" :x2="triX1 - triLineW * 0.5"
          :y1="gy" :y2="gy"
          :stroke="accentColor" :stroke-width="triLineW * 0.55"
          stroke-dasharray="3.5,3"/>
      </g>

      <!-- ── Output apex glow dot when ON ─────────────────────────────────── -->
      <circle v-if="isOn && !d.isInvalid"
        :cx="triX1" :cy="h/2" :r="connH * 0.28"
        fill="#27ae60" opacity="0.68"
        :filter="`url(#sspa-glow-${uid})`"
        :clip-path="`url(#sspa-clip-${uid})`"/>
      <circle v-if="isOn && !d.isInvalid"
        :cx="triX1" :cy="h/2" :r="connH * 0.12"
        fill="#f0fdf4" opacity="0.90"
        :clip-path="`url(#sspa-clip-${uid})`"/>

      <!-- ── Temperature (bottom-right, only when bound) ───────────────────── -->
      <text v-if="hasTemp"
        :x="px + pw - pw*0.04" :y="py + ph - ph*0.12"
        text-anchor="end" dominant-baseline="middle"
        :fill="tempColor" :font-size="tempFontSize"
        font-weight="700" font-family="'Digital7','Courier New',monospace"
        :clip-path="`url(#sspa-clip-${uid})`">{{ tempText }}</text>

      <!-- ── Invalid overlay ───────────────────────────────────────────────── -->
      <rect v-if="d.isInvalid" x="1" y="1" :width="w-2" :height="h-2"
        fill="rgba(231,76,60,0.20)" :rx="cr"
        stroke="#e74c3c" :stroke-width="rw*0.55" stroke-dasharray="8,5"/>

      <!-- ── Device name (absolute last → always in front of all graphics) ─ -->
      <SvgMultilineText v-if="titleText"
        :text="titleText" :x="titleX" :y="titleY" :font-size="titleFontSz"
        font-weight="700" font-family="'Segoe UI',sans-serif"
        :fill="titleFontColor" opacity="0.80" :text-anchor="titleAnchor"
      />
    </svg>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from "vue";
import { useNodeData } from "./useNodeData";
import SvgMultilineText from "./SvgMultilineText.vue";
import { useTitlePosition } from "./useTitlePosition";

const { d, w, h } = useNodeData(180, 100);
const uid = ref(Math.random().toString(36).slice(2, 8));

// ── Chassis ────────────────────────────────────────────────────────────────
const rw = computed(() => w.value * 0.036);
const cr = computed(() => w.value * 0.072);

// ── Inner panel ────────────────────────────────────────────────────────────
const px = computed(() => rw.value * 0.55);
const py = computed(() => rw.value * 0.55);
const pw = computed(() => w.value - px.value * 2);
const ph = computed(() => h.value - py.value * 2);
const pr = computed(() => cr.value * 0.65);

// ── RF connectors ──────────────────────────────────────────────────────────
const connW = computed(() => rw.value * 1.8);
const connH = computed(() => h.value * 0.28);

// ── Amplifier triangle geometry ────────────────────────────────────────────
/** Left edge start X (after left connector + small gap) */
const triX0 = computed(() => px.value + connW.value + ph.value * 0.20);
/** Apex X (pointing right, before right connector + small gap) */
const triX1 = computed(() => px.value + pw.value - connW.value - ph.value * 0.12);
/** Top vertex Y (left edge top) */
const triYTop = computed(() => py.value + ph.value * 0.09);
/** Bottom vertex Y (left edge bottom) */
const triYBot = computed(() => py.value + ph.value * 0.91);

/** SVG path: right-pointing amplifier triangle */
const triPath = computed(() =>
  `M ${triX0.value},${triYTop.value} ` +
  `L ${triX1.value},${h.value / 2} ` +
  `L ${triX0.value},${triYBot.value} Z`
);

/** Stroke width for triangle and gain lines */
const triLineW = computed(() => w.value * 0.013);

/** Y positions of gain stripe lines (clipped to triangle interior) */
const gainLineYs = computed(() => {
  const n = 5;
  return Array.from({ length: n }, (_, i) =>
    triYTop.value + (triYBot.value - triYTop.value) * ((i + 1) / (n + 1))
  );
});

// ── State & colours (amber accent for SSPA) ────────────────────────────────
const statusColor = computed(() => String(d.value.statusColor ?? ""));
const isOn = computed(() => !!statusColor.value && statusColor.value !== "" && statusColor.value !== "gradient:off");

/** Green when active, slate when off, red when invalid */
const accentColor = computed(() =>
  d.value.isInvalid ? "#e74c3c" : isOn.value ? "#27ae60" : "#475569"
);
const sigColor = computed(() =>
  d.value.isInvalid ? "#e74c3c" : isOn.value ? "#4ade80" : "#334155"
);

// ── Temperature ────────────────────────────────────────────────────────────
const hasTemp = computed(() => {
  const t = d.value.temperature;
  return t !== undefined && t !== null && typeof t === "number" && !Number.isNaN(t);
});
const tempText = computed(() => {
  if (!hasTemp.value) return "";
  return (d.value.temperature as number).toFixed(1) + "°C";
});
const tempColor = computed(() => {
  const t = d.value.temperature as number;
  return t > 80 ? "#e74c3c" : t > 60 ? "#ff9800" : "#ffd740";
});

// ── Font sizes ─────────────────────────────────────────────────────────────
const nameFontSize   = computed(() => h.value * 0.28);
const tempFontSize   = computed(() => h.value * 0.26);
const titleFontColor = computed(() => (d.value.titleFontColor as string) || "#94a3b8");
const titleText      = computed(() => (d.value.name as string) ?? "");
const titleFontSz    = computed(() => (d.value.titleFontSize as number) || 10);

// ── Title position ─────────────────────────────────────────────────────────
const { titleX, titleY, titleAnchor } = useTitlePosition(
  () => d.value.titlePosition as string | undefined,
  () => px.value, () => pw.value, () => py.value, () => ph.value,
  "top-center",
);
</script>

<style scoped>
.node-wrap { width: 100%; height: 100%; overflow: visible; }
svg { overflow: visible; }
svg * { transition: none !important; animation: none !important; }
</style>
