<template>
  <div class="node-wrap" :style="{ opacity: d.opacity ?? 1 }">
    <svg :width="w" :height="h" :viewBox="`0 0 ${w} ${h}`" xmlns="http://www.w3.org/2000/svg" overflow="visible">
      <defs>
        <!-- Metallic chassis rim -->
        <linearGradient :id="`da-rim-${uid}`" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%"   stop-color="#c8c8da"/>
          <stop offset="20%"  stop-color="#686878"/>
          <stop offset="48%"  stop-color="#e4e4f2"/>
          <stop offset="74%"  stop-color="#565666"/>
          <stop offset="100%" stop-color="#b8b8ca"/>
        </linearGradient>
        <!-- Chassis body -->
        <linearGradient :id="`da-body-${uid}`" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stop-color="#0e1828"/>
          <stop offset="100%" stop-color="#060e18"/>
        </linearGradient>
        <!-- Top sheen -->
        <linearGradient :id="`da-sheen-${uid}`" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stop-color="#fff" stop-opacity="0.07"/>
          <stop offset="40%"  stop-color="#fff" stop-opacity="0.02"/>
          <stop offset="100%" stop-color="#000" stop-opacity="0.15"/>
        </linearGradient>

        <!-- Triangle fill — FGM: GREEN -->
        <linearGradient :id="`da-tri-fgm-${uid}`" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%"   stop-color="#14532d" stop-opacity="0.95"/>
          <stop offset="100%" stop-color="#166534" stop-opacity="0.75"/>
        </linearGradient>
        <!-- Triangle fill — ALC: ORANGE -->
        <linearGradient :id="`da-tri-alc-${uid}`" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%"   stop-color="#b45309" stop-opacity="0.95"/>
          <stop offset="100%" stop-color="#f97316" stop-opacity="0.80"/>
        </linearGradient>
        <!-- Triangle fill — Standby: dark grey -->
        <linearGradient :id="`da-tri-stby-${uid}`" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%"   stop-color="#1a2030" stop-opacity="0.90"/>
          <stop offset="100%" stop-color="#243040" stop-opacity="0.65"/>
        </linearGradient>

        <!-- Inner panel background -->
        <radialGradient :id="`da-panel-${uid}`" cx="30%" cy="30%" r="80%">
          <stop offset="0%"   stop-color="#14182e"/>
          <stop offset="100%" stop-color="#06080e"/>
        </radialGradient>
        <!-- RF connector gradient -->
        <linearGradient :id="`da-conn-${uid}`" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stop-color="#5a7a9a"/>
          <stop offset="50%"  stop-color="#2a4a6a"/>
          <stop offset="100%" stop-color="#1a2a3a"/>
        </linearGradient>
        <!-- Connector rim -->
        <linearGradient :id="`da-conn-rim-${uid}`" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stop-color="#7a9aba"/>
          <stop offset="50%"  stop-color="#4a6a8a"/>
          <stop offset="100%" stop-color="#1e3048"/>
        </linearGradient>
        <!-- Glow filter -->
        <filter :id="`da-glow-${uid}`" x="-25%" y="-25%" width="150%" height="150%">
          <feGaussianBlur stdDeviation="2.5" result="blur"/>
          <feMerge>
            <feMergeNode in="blur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
        <!-- Clip to inner panel -->
        <clipPath :id="`da-panel-clip-${uid}`">
          <rect :x="px" :y="py" :width="pw" :height="ph" :rx="pr"/>
        </clipPath>
      </defs>

      <!-- ── Chassis ─────────────────────────────────────────────────────── -->
      <rect x="1" y="1" :width="w-2" :height="h-2"
        :rx="cr"
        :fill="`url(#da-body-${uid})`"
        :stroke="`url(#da-rim-${uid})`"
        :stroke-width="rw"
      />
      <rect :x="rw*0.5" :y="rw*0.5" :width="w-rw" :height="h-rw"
        :rx="cr*0.8"
        :fill="`url(#da-sheen-${uid})`"
        pointer-events="none"
      />

      <!-- ── RF Connector housings ──────────────────────────────────────── -->
      <!-- Left (RF IN) -->
      <rect :x="0" :y="h/2 - connH/2" :width="connW" :height="connH" :rx="connW*0.35"
        :fill="`url(#da-conn-${uid})`" :stroke="`url(#da-conn-rim-${uid})`" :stroke-width="w*0.009"
      />
      <circle :cx="connW*0.5" :cy="h/2" :r="connH*0.22" fill="#0d1117" stroke="#8090a0" stroke-width="1.2"/>
      <!-- Right (RF OUT) -->
      <rect :x="w-connW" :y="h/2 - connH/2" :width="connW" :height="connH" :rx="connW*0.35"
        :fill="`url(#da-conn-${uid})`" :stroke="`url(#da-conn-rim-${uid})`" :stroke-width="w*0.009"
      />
      <circle :cx="w-connW*0.5" :cy="h/2" :r="connH*0.22" fill="#0d1117" stroke="#8090a0" stroke-width="1.2"/>

      <!-- ── Inner panel ──────────────────────────────────────────────────── -->
      <rect :x="px" :y="py" :width="pw" :height="ph" :rx="pr"
        :fill="`url(#da-panel-${uid})`"
        stroke="#06080e" :stroke-width="rw*0.5"
      />
      <!-- Active / fault glow border -->
      <rect v-if="isOn || !!d.isInvalid"
        :x="px" :y="py" :width="pw" :height="ph" :rx="pr"
        fill="none"
        :stroke="panelGlowColor"
        :stroke-width="rw*0.55"
        opacity="0.45"
        :style="`filter: drop-shadow(0 0 ${pw*0.03}px ${panelGlowColor})`"
      />


      <!-- ── Signal lines ────────────────────────────────────────────────── -->
      <!-- Left: panel edge → triangle input face -->
      <line
        :x1="px + rw*0.8" :y1="h/2"
        :x2="tLeft"        :y2="h/2"
        :stroke="sigLineColor" stroke-width="1.8" stroke-linecap="round"
        :opacity="isOn ? 0.88 : 0.30"
        :clip-path="`url(#da-panel-clip-${uid})`"
      />
      <!-- Right: triangle apex → strip separator -->
      <line
        :x1="tRight"               :y1="h/2"
        :x2="tRight + stripW*0.08" :y2="h/2"
        :stroke="sigLineColor" stroke-width="1.8" stroke-linecap="round"
        :opacity="isOn ? 0.88 : 0.30"
        :clip-path="`url(#da-panel-clip-${uid})`"
      />

      <!-- ── Amplifier triangle (right-pointing) ────────────────────────── -->
      <polygon
        :points="trianglePoints"
        :fill="triGradId"
        :stroke="triStrokeColor"
        stroke-width="2"
        stroke-linejoin="round"
        :filter="isOn && !d.isInvalid ? `url(#da-glow-${uid})` : ''"
        :clip-path="`url(#da-panel-clip-${uid})`"
      />

      <!-- ── Mode text inside triangle (FGM / ALC) ─────────────────────── -->
      <text
        :x="triCx" :y="triCy"
        text-anchor="middle" dominant-baseline="middle"
        fill="white"
        :fill-opacity="isOn ? 0.95 : 0.40"
        :font-size="modeFontSize"
        font-weight="700"
        font-family="'Segoe UI', sans-serif"
        letter-spacing="1.5"
        :clip-path="`url(#da-panel-clip-${uid})`"
      >{{ modeText }}</text>

      <!-- ── Right strip: separator + Status LED ────────────────────────── -->
      <!-- Vertical separator -->
      <line
        :x1="tRight + stripW*0.10" :y1="py + ph*0.06"
        :x2="tRight + stripW*0.10" :y2="py + ph*0.62"
        stroke="#1e3048" stroke-width="1" opacity="0.55"
        :clip-path="`url(#da-panel-clip-${uid})`"
      />
      <!-- LED bezel -->
      <circle :cx="ledX" :cy="ledY" :r="ledR*1.30"
        fill="#0d1520" stroke="#4a6070" :stroke-width="w*0.014"/>
      <!-- LED lens -->
      <circle :cx="ledX" :cy="ledY" :r="ledR"
        :fill="ledFill" :stroke="ledFill" :stroke-width="w*0.010"
      />
      <!-- LED specular hotspot (only when ON) -->
      <circle v-if="isOn && !d.isInvalid"
        :cx="ledX - ledR*0.28" :cy="ledY - ledR*0.28" :r="ledR*0.38"
        fill="white" opacity="0.55"
      />

      <!-- ── Bottom values ────────────────────────────────────────────────── -->
      <!-- Left — BOA  (uses d.gaugeValue, displayed as X.XX dB) -->
      <text
        :x="px + pw*0.04"
        :y="py + ph - ph*0.08"
        text-anchor="start" dominant-baseline="middle"
        :fill="boaColor"
        :font-size="valueFontSize"
        font-weight="700"
        font-family="'Digital7', 'Courier New', monospace"
        :clip-path="`url(#da-panel-clip-${uid})`"
      >{{ boaText }}</text>

      <!-- Right — Attenuation (uses d.temperature, displayed as XX.X dB like TWTA) -->
      <text
        :x="px + pw - pw*0.04"
        :y="py + ph - ph*0.08"
        text-anchor="end" dominant-baseline="middle"
        :fill="attColor"
        :font-size="valueFontSize"
        font-weight="700"
        font-family="'Digital7', 'Courier New', monospace"
        :clip-path="`url(#da-panel-clip-${uid})`"
      >{{ attText }}</text>

      <!-- ── Invalid overlay ─────────────────────────────────────────────── -->
      <rect v-if="d.isInvalid"
        x="1" y="1" :width="w-2" :height="h-2"
        fill="rgba(231,76,60,0.20)" :rx="cr"
        stroke="#e74c3c" :stroke-width="rw*0.55" stroke-dasharray="8,5"
      />
    </svg>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from "vue";
import { useNodeData } from "./useNodeData";

const { d, w, h } = useNodeData(170, 115);
const uid = ref(Math.random().toString(36).slice(2, 8));

// ── Chassis geometry ────────────────────────────────────────────────────────
const rw = computed(() => w.value * 0.036);    // rim stroke width
const cr = computed(() => w.value * 0.072);    // chassis corner radius

// ── Inner panel ─────────────────────────────────────────────────────────────
const px = computed(() => rw.value * 1.55);
const py = computed(() => rw.value * 1.55);
const pw = computed(() => w.value - px.value * 2);
const ph = computed(() => h.value - py.value * 2);
const pr = computed(() => cr.value * 0.65);

// ── RF connector housings ───────────────────────────────────────────────────
const connW = computed(() => rw.value * 1.8);
const connH = computed(() => h.value * 0.28);

// ── Right strip (LED only) — rightmost 20% of inner panel ───────────────────
const stripW = computed(() => pw.value * 0.20);

// ── Triangle geometry (right-pointing amplifier symbol) ─────────────────────
// Reduced height (0.60 × ph) leaves room for bottom value readouts
const tLeft  = computed(() => px.value + pw.value * 0.04);
const tRight = computed(() => px.value + pw.value - stripW.value - pw.value * 0.02);
const triH   = computed(() => ph.value * 0.60);
const tTopY  = computed(() => h.value / 2 - triH.value / 2);
const tBotY  = computed(() => h.value / 2 + triH.value / 2);

const trianglePoints = computed(() =>
  `${tLeft.value.toFixed(1)},${tTopY.value.toFixed(1)} ` +
  `${tLeft.value.toFixed(1)},${tBotY.value.toFixed(1)} ` +
  `${tRight.value.toFixed(1)},${(h.value / 2).toFixed(1)}`
);

// Centroid: x = (tLeft + tLeft + tRight)/3, y = h/2 (always)
const triCx = computed(() => (tLeft.value * 2 + tRight.value) / 3);
const triCy = computed(() => h.value / 2);

// ── Status LED ──────────────────────────────────────────────────────────────
const ledR = computed(() => w.value * 0.055);
const ledX = computed(() => tRight.value + stripW.value * 0.50);
const ledY = computed(() => py.value + ph.value * 0.25);

// ── Font sizes ───────────────────────────────────────────────────────────────
const titleFontSize = computed(() => (d.value.titleFontSize as number | undefined) ?? h.value * 0.122);
const titleFontColor = computed(() => (d.value.titleFontColor as string) || "#94a3b8");
const modeFontSize  = computed(() => h.value * 0.210);  // large FGM/ALC inside triangle
const valueFontSize = computed(() => h.value * 0.155);  // bottom-left BOA & bottom-right ATT

// ── ON / OFF state ───────────────────────────────────────────────────────────
// statusColor non-empty and not "gradient:off" → ON
const isOn = computed(() => {
  const sc = d.value.statusColor as string | undefined;
  return !!sc && sc !== "" && sc !== "gradient:off";
});

// ── Mode ─────────────────────────────────────────────────────────────────────
// statusText: "ALC" | "FGM" (anything else defaults to FGM)
const modeText = computed((): "FGM" | "ALC" => {
  const t = d.value.statusText as string | undefined;
  return t === "ALC" ? "ALC" : "FGM";
});

const isALC = computed(() => modeText.value === "ALC");

// ── Triangle gradient ────────────────────────────────────────────────────────
// FGM → green   ALC → orange   standby → dark grey
const triGradId = computed(() => {
  if (!isOn.value) return `url(#da-tri-stby-${uid.value})`;
  return isALC.value
    ? `url(#da-tri-alc-${uid.value})`
    : `url(#da-tri-fgm-${uid.value})`;
});

// ── Colors ───────────────────────────────────────────────────────────────────
const modeColor = computed(() => {
  if (d.value.isInvalid) return "#e74c3c";
  if (!isOn.value)       return "#2a3a4a";
  return isALC.value ? "#f97316" : "#22c55e";   // orange for ALC, green for FGM
});

const triStrokeColor = computed(() => modeColor.value);
const sigLineColor   = computed(() => modeColor.value);
const panelGlowColor = computed(() => modeColor.value);

// LED: ON = green,  OFF = dark,  fault = red
const ledFill = computed(() => {
  if (d.value.isInvalid) return "#e74c3c";
  return isOn.value ? "#27ae60" : "#101e2a";
});

// ── Attenuation value (d.temperature → bottom-right, XX.X dB format) ────────
// Field: temperature  (repurposed — same approach as TWTA)
const attText = computed(() => {
  const v = d.value.temperature as number | undefined;
  if (v === null || v === undefined || typeof v !== "number") return "xx.x°C";
  return v.toFixed(1) + "°C";
});

const attColor = computed(() => {
  const v = d.value.temperature as number | undefined;
  if (!isOn.value) return "#4a5568";
  if (typeof v !== "number") return "#ffd740";
  return Math.abs(v) > 10 ? "#e74c3c" : "#ffd740";
});

// ── BOA value (d.gaugeValue → bottom-left, X.XX dB format) ──────────────────
// Field: gaugeValue  (repurposed for Back-of-Attenuation)
const boaText = computed(() => {
  const v = d.value.gaugeValue as number | undefined;
  if (v === null || v === undefined || typeof v !== "number") return "x.xx dB";
  return v.toFixed(2) + " dB";
});

const boaColor = computed(() => {
  const v = d.value.gaugeValue as number | undefined;
  if (!isOn.value) return "#4a5568";
  if (typeof v !== "number") return "#ffd740";
  return Math.abs(v) >= 3.0 ? "#fbbf24" : "#ffd740";
});
</script>

<style scoped>
.node-wrap { width: 100%; height: 100%; overflow: visible; }
svg { overflow: visible; }
svg * { transition: none !important; animation: none !important; }
</style>
