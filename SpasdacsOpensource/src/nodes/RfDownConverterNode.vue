<template>
  <div class="node-wrap" :style="{ opacity: d.opacity ?? 1 }">
    <svg :width="w" :height="h" :viewBox="`0 0 ${w} ${h}`" xmlns="http://www.w3.org/2000/svg" overflow="visible">
      <defs>
        <!-- Metallic chassis rim -->
        <linearGradient :id="`rdc-rim-${uid}`" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%"   stop-color="#c8c8da"/>
          <stop offset="20%"  stop-color="#686878"/>
          <stop offset="48%"  stop-color="#e4e4f2"/>
          <stop offset="74%"  stop-color="#565666"/>
          <stop offset="100%" stop-color="#b8b8ca"/>
        </linearGradient>
        <linearGradient :id="`rdc-body-${uid}`" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stop-color="#0e1828"/>
          <stop offset="100%" stop-color="#060e18"/>
        </linearGradient>
        <linearGradient :id="`rdc-sheen-${uid}`" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stop-color="#fff" stop-opacity="0.07"/>
          <stop offset="40%"  stop-color="#fff" stop-opacity="0.02"/>
          <stop offset="100%" stop-color="#000" stop-opacity="0.15"/>
        </linearGradient>
        <!-- Inner panel — OFF -->
        <radialGradient :id="`rdc-off-${uid}`" cx="50%" cy="45%" r="65%">
          <stop offset="0%"   stop-color="#14182e"/>
          <stop offset="100%" stop-color="#06080e"/>
        </radialGradient>
        <!-- Inner panel — ON (cyan/blue glow) -->
        <radialGradient :id="`rdc-on-${uid}`" cx="38%" cy="38%" r="70%">
          <stop offset="0%"   stop-color="#0c2244"/>
          <stop offset="60%"  stop-color="#06122a"/>
          <stop offset="100%" stop-color="#020810"/>
        </radialGradient>
        <!-- Mixer circle fill -->
        <radialGradient :id="`rdc-mixer-${uid}`" cx="35%" cy="35%" r="65%">
          <stop offset="0%"   :stop-color="isOn ? '#1e4a7a' : '#18222e'"/>
          <stop offset="100%" :stop-color="isOn ? '#0a1c36' : '#08101a'"/>
        </radialGradient>
        <!-- RF connector -->
        <linearGradient :id="`rdc-conn-${uid}`" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stop-color="#5a7a9a"/>
          <stop offset="50%"  stop-color="#2a4a6a"/>
          <stop offset="100%" stop-color="#1a2a3a"/>
        </linearGradient>
        <linearGradient :id="`rdc-conn-rim-${uid}`" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stop-color="#7a9aba"/>
          <stop offset="50%"  stop-color="#4a6a8a"/>
          <stop offset="100%" stop-color="#1e3048"/>
        </linearGradient>
        <!-- Mixer glow filter -->
        <filter :id="`rdc-glow-${uid}`" x="-35%" y="-35%" width="170%" height="170%">
          <feGaussianBlur stdDeviation="2.2" result="blur"/>
          <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
        <!-- Clip: inner panel -->
        <clipPath :id="`rdc-clip-${uid}`">
          <rect :x="px" :y="py" :width="pw" :height="ph" :rx="pr"/>
        </clipPath>
      </defs>

      <!-- ── Chassis ─────────────────────────────────────────────────────── -->
      <rect x="1" y="1" :width="w-2" :height="h-2"
        :rx="cr" :fill="`url(#rdc-body-${uid})`"
        :stroke="`url(#rdc-rim-${uid})`" :stroke-width="rw"
      />
      <rect :x="rw*0.5" :y="rw*0.5" :width="w-rw" :height="h-rw"
        :rx="cr*0.8" :fill="`url(#rdc-sheen-${uid})`" pointer-events="none"
      />

      <!-- ── RF Connectors ───────────────────────────────────────────────── -->
      <rect :x="0" :y="h/2 - connH/2" :width="connW" :height="connH" :rx="connW*0.35"
        :fill="`url(#rdc-conn-${uid})`" :stroke="`url(#rdc-conn-rim-${uid})`" :stroke-width="w*0.009"
      />
      <circle :cx="connW*0.5" :cy="h/2" :r="connH*0.22" fill="#0d1117" stroke="#8090a0" stroke-width="1.2"/>
      <rect :x="w-connW" :y="h/2 - connH/2" :width="connW" :height="connH" :rx="connW*0.35"
        :fill="`url(#rdc-conn-${uid})`" :stroke="`url(#rdc-conn-rim-${uid})`" :stroke-width="w*0.009"
      />
      <circle :cx="w-connW*0.5" :cy="h/2" :r="connH*0.22" fill="#0d1117" stroke="#8090a0" stroke-width="1.2"/>

      <!-- ── Inner panel ─────────────────────────────────────────────────── -->
      <rect :x="px" :y="py" :width="pw" :height="ph" :rx="pr"
        :fill="isOn ? `url(#rdc-on-${uid})` : `url(#rdc-off-${uid})`"
        stroke="#06080e" :stroke-width="rw*0.4"
      />
      <!-- Panel glow when ON -->
      <rect v-if="isOn && !d.isInvalid" :x="px" :y="py" :width="pw" :height="ph" :rx="pr"
        fill="none" stroke="#0ea5e9" :stroke-width="rw*0.4" opacity="0.35"
        :style="`filter: drop-shadow(0 0 ${pw*0.04}px #0ea5e9)`"
      />

      <!-- ── Device name ─────────────────────────────────────────────────── -->


      <!-- ── Signal line: RF IN → mixer circle ──────────────────────────── -->
      <line :x1="connW" :y1="mixerCy"
            :x2="mixerCx - mixerR" :y2="mixerCy"
        :stroke="signalColor" stroke-width="1.6" stroke-linecap="round"
        :opacity="isOn ? 0.80 : 0.22"
        :clip-path="`url(#rdc-clip-${uid})`"
      />
      <!-- ── Signal line: mixer circle → IF OUT ─────────────────────────── -->
      <line :x1="mixerCx + mixerR" :y1="mixerCy"
            :x2="px + pw - stripW - pw*0.02" :y2="mixerCy"
        :stroke="signalColor" stroke-width="1.6" stroke-linecap="round"
        :opacity="isOn ? 0.80 : 0.22"
        :clip-path="`url(#rdc-clip-${uid})`"
      />

      <!-- ── LO input (dashed vertical line from below mixer) ───────────── -->
      <line :x1="mixerCx" :y1="mixerCy + mixerR"
            :x2="mixerCx" :y2="mixerCy + mixerR + ph*0.08"
        :stroke="loColor" stroke-width="1.2" stroke-linecap="round" stroke-dasharray="3,2"
        :opacity="isOn ? 0.60 : 0.18"
        :clip-path="`url(#rdc-clip-${uid})`"
      />
      <!-- LO label (centered below the LO port) -->
      <text :x="mixerCx" :y="mixerCy + mixerR + ph*0.16"
        text-anchor="middle" dominant-baseline="middle"
        fill="#6a8aaa" :font-size="loFontSize"
        font-family="'Segoe UI', sans-serif" font-weight="600"
        :clip-path="`url(#rdc-clip-${uid})`"
      >LO</text>

      <!-- ── Mixer circle ────────────────────────────────────────────────── -->
      <circle :cx="mixerCx" :cy="mixerCy" :r="mixerR"
        :fill="`url(#rdc-mixer-${uid})`"
        :stroke="mixerStroke" :stroke-width="w*0.013"
        :filter="isOn && !d.isInvalid ? `url(#rdc-glow-${uid})` : ''"
      />
      <!-- × symbol inside mixer circle -->
      <line :x1="mixerCx - mixerR*0.54" :y1="mixerCy - mixerR*0.54"
            :x2="mixerCx + mixerR*0.54" :y2="mixerCy + mixerR*0.54"
        :stroke="crossColor" :stroke-width="w*0.017" stroke-linecap="round"
      />
      <line :x1="mixerCx + mixerR*0.54" :y1="mixerCy - mixerR*0.54"
            :x2="mixerCx - mixerR*0.54" :y2="mixerCy + mixerR*0.54"
        :stroke="crossColor" :stroke-width="w*0.017" stroke-linecap="round"
      />

      <!-- ── Down-conversion chevrons (↓) to the right of mixer ─────────── -->
      <path :d="chevron1"
        fill="none" :stroke="chevronColor" :stroke-width="w*0.019"
        stroke-linecap="round" stroke-linejoin="round"
        :opacity="isOn ? 0.90 : 0.28"
      />
      <path :d="chevron2"
        fill="none" :stroke="chevronColor" :stroke-width="w*0.019"
        stroke-linecap="round" stroke-linejoin="round"
        :opacity="isOn ? 0.55 : 0.16"
      />

      <!-- ── Separator before LED strip ─────────────────────────────────── -->
      <line :x1="px + pw - stripW" :y1="py + ph*0.08"
            :x2="px + pw - stripW" :y2="py + ph*0.65"
        stroke="#1e3048" stroke-width="1" opacity="0.55"
        :clip-path="`url(#rdc-clip-${uid})`"
      />

      <!-- ── Status LED ──────────────────────────────────────────────────── -->
      <circle :cx="ledX" :cy="ledY" :r="ledR*1.30"
        fill="#0d1520" stroke="#4a6070" :stroke-width="w*0.014"/>
      <circle :cx="ledX" :cy="ledY" :r="ledR"
        :fill="ledFill" :stroke="ledFill" :stroke-width="w*0.010"
      />
      <circle v-if="isOn && !d.isInvalid"
        :cx="ledX - ledR*0.28" :cy="ledY - ledR*0.28" :r="ledR*0.38"
        fill="white" opacity="0.55"
      />

      <!-- ── Temperature (bottom-right) ─────────────────────────────────── -->
      <text :x="px + pw - pw*0.04" :y="py + ph - ph*0.12"
        text-anchor="end" dominant-baseline="middle"
        :fill="tempColor" :font-size="tempFontSize"
        font-weight="700" font-family="'Digital7', 'Courier New', monospace"
        :clip-path="`url(#rdc-clip-${uid})`"
      >{{ tempText }}</text>

      <!-- ── Invalid overlay ─────────────────────────────────────────────── -->
      <rect v-if="d.isInvalid" x="1" y="1" :width="w-2" :height="h-2"
        fill="rgba(231,76,60,0.20)" :rx="cr"
        stroke="#e74c3c" :stroke-width="rw*0.55" stroke-dasharray="8,5"
      />

      <!-- ── Device name (absolute last → always in front of all graphics) ─ -->
      <SvgMultilineText v-if="titleText"
        :text="titleText" :x="titleX" :y="titleY" :font-size="titleFontSz"
        font-weight="700" font-family="'Segoe UI',sans-serif"
        :fill="titleFontColor" opacity="0.85" :text-anchor="titleAnchor"
      />
    </svg>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from "vue";
import { useNodeData } from "./useNodeData";
import SvgMultilineText from "./SvgMultilineText.vue";
import { useTitlePosition } from "./useTitlePosition";

const { d, w, h } = useNodeData(160, 100);
const uid = ref(Math.random().toString(36).slice(2, 8));

// ── Chassis geometry ──────────────────────────────────────────────────────
const rw = computed(() => w.value * 0.036);
const cr = computed(() => w.value * 0.072);

// ── Inner panel (flush with metallic rim) ─────────────────────────────────
const px = computed(() => rw.value * 0.55);
const py = computed(() => rw.value * 0.55);
const pw = computed(() => w.value - px.value * 2);
const ph = computed(() => h.value - py.value * 2);
const pr = computed(() => cr.value * 0.65);

// ── RF connector housings ─────────────────────────────────────────────────
const connW = computed(() => rw.value * 1.8);
const connH = computed(() => h.value * 0.28);

// ── Layout: main area + right LED strip ──────────────────────────────────
const stripW = computed(() => pw.value * 0.22);

// ── Mixer circle ──────────────────────────────────────────────────────────
const mixerR  = computed(() => ph.value * 0.20);
const mixerCx = computed(() => px.value + (pw.value - stripW.value) * 0.40);
const mixerCy = computed(() => py.value + ph.value * 0.54);

// ── Down-conversion chevron positions ────────────────────────────────────
// Two downward-pointing ∨ shapes to the right of the mixer circle
const chvCx = computed(() => mixerCx.value + mixerR.value + (pw.value - stripW.value) * 0.16);
const chvHh = computed(() => ph.value * 0.17);   // half-height of each chevron
const chvW  = computed(() => pw.value * 0.065);  // half-width

// chevron1: upper, chevron2: lower (cascade gives ↓↓ feel)
const chevron1 = computed(() => {
  const cx = chvCx.value, hw = chvW.value, hh = chvHh.value;
  const y0 = mixerCy.value - hh * 1.10;
  return `M ${cx - hw} ${y0} L ${cx} ${y0 + hh} L ${cx + hw} ${y0}`;
});
const chevron2 = computed(() => {
  const cx = chvCx.value, hw = chvW.value, hh = chvHh.value;
  const y0 = mixerCy.value + hh * 0.05;
  return `M ${cx - hw} ${y0} L ${cx} ${y0 + hh} L ${cx + hw} ${y0}`;
});

// ── Status LED ────────────────────────────────────────────────────────────
const ledR = computed(() => w.value * 0.048);
const ledX = computed(() => px.value + pw.value - stripW.value * 0.48);
const ledY = computed(() => py.value + ph.value * 0.52);

// ── Font sizes ────────────────────────────────────────────────────────────
const nameFontSize   = computed(() => (d.value.titleFontSize as number | undefined) ?? h.value * 0.165);
const titleFontColor = computed(() => (d.value.titleFontColor as string) || "#94a3b8");
const titleText      = computed(() => (d.value.name as string) ?? "");
const titleFontSz    = computed(() => (d.value.titleFontSize as number) || 10);
const loFontSize     = computed(() => h.value * 0.100);
const tempFontSize   = computed(() => h.value * 0.165);

// ── Title position (main area excluding right LED strip) ──────────────────
const { titleX, titleY, titleAnchor } = useTitlePosition(
  () => d.value.titlePosition as string | undefined,
  () => px.value, () => pw.value - stripW.value, () => py.value, () => ph.value,
  "top-center",
);

// ── State ─────────────────────────────────────────────────────────────────
const isOn = computed(() => {
  const sc = d.value.statusColor as string;
  return !!sc && sc !== "" && sc !== "gradient:off";
});

// ── Colors ────────────────────────────────────────────────────────────────
const signalColor  = computed(() => d.value.isInvalid ? "#e74c3c" : isOn.value ? "#0ea5e9" : "#2a3a4a");
const loColor      = computed(() => d.value.isInvalid ? "#e74c3c" : isOn.value ? "#38bdf8" : "#1e2a3a");
const mixerStroke  = computed(() => d.value.isInvalid ? "#e74c3c" : isOn.value ? "#0ea5e9" : "#2a4060");
const crossColor   = computed(() => d.value.isInvalid ? "#e74c3c" : isOn.value ? "#7dd3fc" : "#3a5070");
const chevronColor = computed(() => d.value.isInvalid ? "#e74c3c" : isOn.value ? "#fbbf24" : "#2a2a1a");

const ledFill = computed(() => {
  if (d.value.isInvalid) return "#e74c3c";
  return isOn.value ? "#27ae60" : "#101e2a";
});

// ── Temperature ───────────────────────────────────────────────────────────
const tempText = computed(() => {
  const t = d.value.temperature as number | undefined;
  if (t === null || t === undefined || typeof t !== "number") return "xx.x°C";
  return t.toFixed(1) + "°C";
});
const tempColor = computed(() => {
  const t = d.value.temperature as number | undefined;
  if (!t) return "#ffd740";
  return t > 80 ? "#e74c3c" : t > 60 ? "#ff9800" : "#ffd740";
});
</script>

<style scoped>
.node-wrap { width: 100%; height: 100%; overflow: visible; }
svg { overflow: visible; }
svg * { transition: none !important; animation: none !important; }
</style>
