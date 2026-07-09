<template>
  <div class="node-wrap" :style="{ opacity: d.opacity ?? 1 }">
    <svg :width="w" :height="h" :viewBox="`0 0 ${w} ${h}`" xmlns="http://www.w3.org/2000/svg" overflow="visible">
      <defs>
        <!-- Metallic chassis rim -->
        <linearGradient :id="`rcv-rim-${uid}`" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%"   stop-color="#c8c8da"/>
          <stop offset="20%"  stop-color="#686878"/>
          <stop offset="48%"  stop-color="#e4e4f2"/>
          <stop offset="74%"  stop-color="#565666"/>
          <stop offset="100%" stop-color="#b8b8ca"/>
        </linearGradient>
        <linearGradient :id="`rcv-body-${uid}`" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stop-color="#0e1828"/>
          <stop offset="100%" stop-color="#060e18"/>
        </linearGradient>
        <linearGradient :id="`rcv-sheen-${uid}`" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stop-color="#fff" stop-opacity="0.07"/>
          <stop offset="40%"  stop-color="#fff" stop-opacity="0.02"/>
          <stop offset="100%" stop-color="#000" stop-opacity="0.15"/>
        </linearGradient>
        <!-- Inner panel — OFF -->
        <radialGradient :id="`rcv-panel-off-${uid}`" cx="50%" cy="45%" r="65%">
          <stop offset="0%"   stop-color="#14182e"/>
          <stop offset="100%" stop-color="#06080e"/>
        </radialGradient>
        <!-- Inner panel — ON (indigo glow) -->
        <radialGradient :id="`rcv-panel-on-${uid}`" cx="38%" cy="38%" r="70%">
          <stop offset="0%"   stop-color="#0e1a3a"/>
          <stop offset="60%"  stop-color="#060e22"/>
          <stop offset="100%" stop-color="#020810"/>
        </radialGradient>
        <!-- LNA Triangle — ON: blue/indigo -->
        <linearGradient :id="`rcv-tri-on-${uid}`" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%"   stop-color="#1e3a8a" stop-opacity="0.95"/>
          <stop offset="100%" stop-color="#2563eb" stop-opacity="0.78"/>
        </linearGradient>
        <!-- LNA Triangle — OFF -->
        <linearGradient :id="`rcv-tri-off-${uid}`" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%"   stop-color="#1a2030" stop-opacity="0.90"/>
          <stop offset="100%" stop-color="#243040" stop-opacity="0.65"/>
        </linearGradient>
        <!-- Mixer circle fill -->
        <radialGradient :id="`rcv-mixer-${uid}`" cx="35%" cy="35%" r="65%">
          <stop offset="0%"   :stop-color="isOn ? '#1e3070' : '#18222e'"/>
          <stop offset="100%" :stop-color="isOn ? '#080e28' : '#08101a'"/>
        </radialGradient>
        <!-- RF connector -->
        <linearGradient :id="`rcv-conn-${uid}`" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stop-color="#5a7a9a"/>
          <stop offset="50%"  stop-color="#2a4a6a"/>
          <stop offset="100%" stop-color="#1a2a3a"/>
        </linearGradient>
        <linearGradient :id="`rcv-conn-rim-${uid}`" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stop-color="#7a9aba"/>
          <stop offset="50%"  stop-color="#4a6a8a"/>
          <stop offset="100%" stop-color="#1e3048"/>
        </linearGradient>
        <!-- Glow filter -->
        <filter :id="`rcv-glow-${uid}`" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="2.4" result="blur"/>
          <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
        <!-- Clip: inner panel -->
        <clipPath :id="`rcv-clip-${uid}`">
          <rect :x="px" :y="py" :width="pw" :height="ph" :rx="pr"/>
        </clipPath>
      </defs>

      <!-- ── Chassis ─────────────────────────────────────────────────────── -->
      <rect x="1" y="1" :width="w-2" :height="h-2"
        :rx="cr" :fill="`url(#rcv-body-${uid})`"
        :stroke="`url(#rcv-rim-${uid})`" :stroke-width="rw"
      />
      <rect :x="rw*0.5" :y="rw*0.5" :width="w-rw" :height="h-rw"
        :rx="cr*0.8" :fill="`url(#rcv-sheen-${uid})`" pointer-events="none"
      />

      <!-- ── RF Connectors ───────────────────────────────────────────────── -->
      <rect :x="0" :y="h/2 - connH/2" :width="connW" :height="connH" :rx="connW*0.35"
        :fill="`url(#rcv-conn-${uid})`" :stroke="`url(#rcv-conn-rim-${uid})`" :stroke-width="w*0.007"
      />
      <circle :cx="connW*0.5" :cy="h/2" :r="connH*0.22" fill="#0d1117" stroke="#8090a0" stroke-width="1.2"/>
      <rect :x="w-connW" :y="h/2 - connH/2" :width="connW" :height="connH" :rx="connW*0.35"
        :fill="`url(#rcv-conn-${uid})`" :stroke="`url(#rcv-conn-rim-${uid})`" :stroke-width="w*0.007"
      />
      <circle :cx="w-connW*0.5" :cy="h/2" :r="connH*0.22" fill="#0d1117" stroke="#8090a0" stroke-width="1.2"/>

      <!-- ── Inner panel ─────────────────────────────────────────────────── -->
      <rect :x="px" :y="py" :width="pw" :height="ph" :rx="pr"
        :fill="isOn ? `url(#rcv-panel-on-${uid})` : `url(#rcv-panel-off-${uid})`"
        stroke="#06080e" :stroke-width="rw*0.4"
      />
      <rect v-if="isOn && !d.isInvalid" :x="px" :y="py" :width="pw" :height="ph" :rx="pr"
        fill="none" stroke="#3b82f6" :stroke-width="rw*0.4" opacity="0.35"
        :style="`filter: drop-shadow(0 0 ${pw*0.03}px #3b82f6)`"
      />

      <!-- ══════════════════════════════════════════════════════════════════
           LNA SECTION — left portion, triangle amplifier symbol
           ════════════════════════════════════════════════════════════════ -->

      <!-- Signal IN: left connector → triangle left face -->
      <line :x1="connW" :y1="sigY"
            :x2="tLeft"  :y2="sigY"
        :stroke="signalColor" stroke-width="1.6" stroke-linecap="round"
        :opacity="isOn ? 0.82 : 0.22"
        :clip-path="`url(#rcv-clip-${uid})`"
      />

      <!-- Amplifier triangle (right-pointing) -->
      <polygon
        :points="trianglePoints"
        :fill="isOn ? `url(#rcv-tri-on-${uid})` : `url(#rcv-tri-off-${uid})`"
        :stroke="elemStroke"
        stroke-width="1.8"
        stroke-linejoin="round"
        :filter="isOn && !d.isInvalid ? `url(#rcv-glow-${uid})` : ''"
        :clip-path="`url(#rcv-clip-${uid})`"
      />

      <!-- ══════════════════════════════════════════════════════════════════
           INTER-SECTION signal line + divider
           ════════════════════════════════════════════════════════════════ -->

      <!-- Signal: triangle apex → mixer left -->
      <line :x1="tRight" :y1="sigY"
            :x2="mixerCx - mixerR" :y2="sigY"
        :stroke="signalColor" stroke-width="1.6" stroke-linecap="round"
        :opacity="isOn ? 0.82 : 0.22"
        :clip-path="`url(#rcv-clip-${uid})`"
      />

      <!-- Subtle divider between LNA and mixer sections -->
      <line :x1="divX" :y1="py + ph*0.06"
            :x2="divX" :y2="py + ph*0.72"
        stroke="#1a2a3a" stroke-width="1" opacity="0.45"
        :clip-path="`url(#rcv-clip-${uid})`"
      />

      <!-- ══════════════════════════════════════════════════════════════════
           MIXER / DOWN-CONVERTER SECTION
           ════════════════════════════════════════════════════════════════ -->

      <!-- Mixer circle -->
      <circle :cx="mixerCx" :cy="mixerCy" :r="mixerR"
        :fill="`url(#rcv-mixer-${uid})`"
        :stroke="elemStroke" :stroke-width="w*0.010"
        :filter="isOn && !d.isInvalid ? `url(#rcv-glow-${uid})` : ''"
      />
      <!-- × symbol inside mixer -->
      <line :x1="mixerCx - mixerR*0.50" :y1="mixerCy - mixerR*0.50"
            :x2="mixerCx + mixerR*0.50" :y2="mixerCy + mixerR*0.50"
        :stroke="crossColor" :stroke-width="w*0.014" stroke-linecap="round"
      />
      <line :x1="mixerCx + mixerR*0.50" :y1="mixerCy - mixerR*0.50"
            :x2="mixerCx - mixerR*0.50" :y2="mixerCy + mixerR*0.50"
        :stroke="crossColor" :stroke-width="w*0.014" stroke-linecap="round"
      />

      <!-- LO dashed input from bottom of mixer -->
      <line :x1="mixerCx" :y1="mixerCy + mixerR"
            :x2="mixerCx" :y2="mixerCy + mixerR + ph*0.09"
        :stroke="loColor" stroke-width="1.2" stroke-linecap="round" stroke-dasharray="3,2"
        :opacity="isOn ? 0.60 : 0.18"
        :clip-path="`url(#rcv-clip-${uid})`"
      />
      <!-- LO label -->
      <text :x="mixerCx" :y="mixerCy + mixerR + ph*0.18"
        text-anchor="middle" dominant-baseline="middle"
        fill="#5a7a98" :font-size="loFontSize"
        font-family="'Segoe UI', sans-serif" font-weight="600"
        :clip-path="`url(#rcv-clip-${uid})`"
      >LO</text>

      <!-- Signal: mixer right → LED strip -->
      <line :x1="mixerCx + mixerR" :y1="sigY"
            :x2="px + pw - stripW - pw*0.01" :y2="sigY"
        :stroke="signalColor" stroke-width="1.6" stroke-linecap="round"
        :opacity="isOn ? 0.82 : 0.22"
        :clip-path="`url(#rcv-clip-${uid})`"
      />

      <!-- ── Separator before LED strip ─────────────────────────────────── -->
      <line :x1="px + pw - stripW" :y1="py + ph*0.08"
            :x2="px + pw - stripW" :y2="py + ph*0.70"
        stroke="#1e3048" stroke-width="1" opacity="0.55"
        :clip-path="`url(#rcv-clip-${uid})`"
      />

      <!-- ── Status LED ──────────────────────────────────────────────────── -->
      <circle :cx="ledX" :cy="ledY" :r="ledR*1.30"
        fill="#0d1520" stroke="#4a6070" :stroke-width="w*0.011"/>
      <circle :cx="ledX" :cy="ledY" :r="ledR"
        :fill="ledFill" :stroke="ledFill" :stroke-width="w*0.008"
      />
      <circle v-if="isOn && !d.isInvalid"
        :cx="ledX - ledR*0.28" :cy="ledY - ledR*0.28" :r="ledR*0.38"
        fill="white" opacity="0.55"
      />

      <!-- ── Temperature (bottom-right) ─────────────────────────────────── -->
      <text :x="px + pw - pw*0.025" :y="py + ph - ph*0.10"
        text-anchor="end" dominant-baseline="middle"
        :fill="tempColor" :font-size="tempFontSize"
        font-weight="700" font-family="'Digital7', 'Courier New', monospace"
        :clip-path="`url(#rcv-clip-${uid})`"
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

const { d, w, h } = useNodeData(210, 110);
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

// ── Layout: LNA section | Mixer section | LED strip ───────────────────────
const stripW  = computed(() => pw.value * 0.20);
const mainW   = computed(() => pw.value - stripW.value);
const lnaSecW = computed(() => mainW.value * 0.44);   // LNA takes 44% of main area
const mixSecW = computed(() => mainW.value * 0.56);   // Mixer takes 56%
const divX    = computed(() => px.value + lnaSecW.value);

// ── Signal Y — single horizontal axis for all signal lines ────────────────
const sigY = computed(() => py.value + ph.value * 0.57);

// ── LNA triangle geometry (right-pointing) ────────────────────────────────
// tLeft starts just after the connector housing for a flush appearance
const tLeft  = computed(() => connW.value + mainW.value * 0.02);
const tRight = computed(() => px.value + lnaSecW.value * 0.90);
const triH   = computed(() => ph.value * 0.46);
const tTopY  = computed(() => sigY.value - triH.value / 2);
const tBotY  = computed(() => sigY.value + triH.value / 2);

const trianglePoints = computed(() =>
  `${tLeft.value.toFixed(1)},${tTopY.value.toFixed(1)} ` +
  `${tLeft.value.toFixed(1)},${tBotY.value.toFixed(1)} ` +
  `${tRight.value.toFixed(1)},${sigY.value.toFixed(1)}`
);

// ── Mixer geometry ────────────────────────────────────────────────────────
const mixerR  = computed(() => ph.value * 0.195);
const mixerCx = computed(() => px.value + lnaSecW.value + mixSecW.value * 0.46);
const mixerCy = computed(() => sigY.value);   // mixer centred on signal line

// ── LED ───────────────────────────────────────────────────────────────────
const ledR = computed(() => w.value * 0.038);
const ledX = computed(() => px.value + pw.value - stripW.value * 0.48);
const ledY = computed(() => py.value + ph.value * 0.34);

// ── Font sizes ────────────────────────────────────────────────────────────
const nameFontSize  = computed(() => (d.value.titleFontSize as number | undefined) ?? h.value * 0.245);
const titleFontColor = computed(() => (d.value.titleFontColor as string) || "#94a3b8");
const titleText     = computed(() => (d.value.name as string) ?? "");
const titleFontSz   = computed(() => (d.value.titleFontSize as number) || 10);
const loFontSize    = computed(() => h.value * 0.095);
const tempFontSize  = computed(() => h.value * 0.245);

// ── Title position (area = main section, excluding the right LED strip) ────
const { titleX, titleY, titleAnchor } = useTitlePosition(
  () => d.value.titlePosition as string | undefined,
  () => px.value, () => mainW.value, () => py.value, () => ph.value,
  "top-center",
);

// ── State ─────────────────────────────────────────────────────────────────
const isOn = computed(() => {
  const sc = d.value.statusColor as string;
  return !!sc && sc !== "" && sc !== "gradient:off";
});

// ── Colors (indigo/blue accent) ───────────────────────────────────────────
const signalColor = computed(() => d.value.isInvalid ? "#e74c3c" : isOn.value ? "#60a5fa" : "#1e3048");
const elemStroke  = computed(() => d.value.isInvalid ? "#e74c3c" : isOn.value ? "#3b82f6" : "#1e3a5a");
const crossColor  = computed(() => d.value.isInvalid ? "#e74c3c" : isOn.value ? "#93c5fd" : "#2a4060");
const loColor     = computed(() => d.value.isInvalid ? "#e74c3c" : isOn.value ? "#60a5fa" : "#1e2a3a");

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
