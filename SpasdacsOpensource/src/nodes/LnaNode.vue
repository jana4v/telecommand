<template>
  <div class="node-wrap" :style="{ opacity: d.opacity ?? 1 }">
    <svg :width="w" :height="h" :viewBox="`0 0 ${w} ${h}`" xmlns="http://www.w3.org/2000/svg" overflow="visible">
      <defs>
        <!-- Metallic chassis rim -->
        <linearGradient :id="`lna-rim-${uid}`" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%"   stop-color="#c8c8da"/>
          <stop offset="20%"  stop-color="#686878"/>
          <stop offset="48%"  stop-color="#e4e4f2"/>
          <stop offset="74%"  stop-color="#565666"/>
          <stop offset="100%" stop-color="#b8b8ca"/>
        </linearGradient>
        <linearGradient :id="`lna-body-${uid}`" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stop-color="#0e1828"/>
          <stop offset="100%" stop-color="#060e18"/>
        </linearGradient>
        <linearGradient :id="`lna-sheen-${uid}`" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stop-color="#fff" stop-opacity="0.07"/>
          <stop offset="40%"  stop-color="#fff" stop-opacity="0.02"/>
          <stop offset="100%" stop-color="#000" stop-opacity="0.15"/>
        </linearGradient>
        <!-- Inner panel — OFF -->
        <radialGradient :id="`lna-panel-off-${uid}`" cx="50%" cy="45%" r="65%">
          <stop offset="0%"   stop-color="#14182e"/>
          <stop offset="100%" stop-color="#06080e"/>
        </radialGradient>
        <!-- Inner panel — ON (teal glow) -->
        <radialGradient :id="`lna-panel-on-${uid}`" cx="38%" cy="38%" r="70%">
          <stop offset="0%"   stop-color="#082a28"/>
          <stop offset="60%"  stop-color="#041818"/>
          <stop offset="100%" stop-color="#020c0c"/>
        </radialGradient>
        <!-- Triangle — ON: teal -->
        <linearGradient :id="`lna-tri-on-${uid}`" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%"   stop-color="#0d4a4a" stop-opacity="0.95"/>
          <stop offset="100%" stop-color="#0f766e" stop-opacity="0.78"/>
        </linearGradient>
        <!-- Triangle — OFF: dark grey -->
        <linearGradient :id="`lna-tri-off-${uid}`" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%"   stop-color="#1a2030" stop-opacity="0.90"/>
          <stop offset="100%" stop-color="#243040" stop-opacity="0.65"/>
        </linearGradient>
        <!-- RF connector -->
        <linearGradient :id="`lna-conn-${uid}`" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stop-color="#5a7a9a"/>
          <stop offset="50%"  stop-color="#2a4a6a"/>
          <stop offset="100%" stop-color="#1a2a3a"/>
        </linearGradient>
        <linearGradient :id="`lna-conn-rim-${uid}`" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stop-color="#7a9aba"/>
          <stop offset="50%"  stop-color="#4a6a8a"/>
          <stop offset="100%" stop-color="#1e3048"/>
        </linearGradient>
        <!-- Triangle glow filter -->
        <filter :id="`lna-glow-${uid}`" x="-25%" y="-25%" width="150%" height="150%">
          <feGaussianBlur stdDeviation="2.5" result="blur"/>
          <feMerge>
            <feMergeNode in="blur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
        <!-- Clip: inner panel -->
        <clipPath :id="`lna-clip-${uid}`">
          <rect :x="px" :y="py" :width="pw" :height="ph" :rx="pr"/>
        </clipPath>
      </defs>

      <!-- ── Chassis ─────────────────────────────────────────────────────── -->
      <rect x="1" y="1" :width="w-2" :height="h-2"
        :rx="cr" :fill="`url(#lna-body-${uid})`"
        :stroke="`url(#lna-rim-${uid})`" :stroke-width="rw"
      />
      <rect :x="rw*0.5" :y="rw*0.5" :width="w-rw" :height="h-rw"
        :rx="cr*0.8" :fill="`url(#lna-sheen-${uid})`" pointer-events="none"
      />

      <!-- ── RF Connectors ───────────────────────────────────────────────── -->
      <rect :x="0" :y="h/2 - connH/2" :width="connW" :height="connH" :rx="connW*0.35"
        :fill="`url(#lna-conn-${uid})`" :stroke="`url(#lna-conn-rim-${uid})`" :stroke-width="w*0.009"
      />
      <circle :cx="connW*0.5" :cy="h/2" :r="connH*0.22" fill="#0d1117" stroke="#8090a0" stroke-width="1.2"/>
      <rect :x="w-connW" :y="h/2 - connH/2" :width="connW" :height="connH" :rx="connW*0.35"
        :fill="`url(#lna-conn-${uid})`" :stroke="`url(#lna-conn-rim-${uid})`" :stroke-width="w*0.009"
      />
      <circle :cx="w-connW*0.5" :cy="h/2" :r="connH*0.22" fill="#0d1117" stroke="#8090a0" stroke-width="1.2"/>

      <!-- ── Inner panel ─────────────────────────────────────────────────── -->
      <rect :x="px" :y="py" :width="pw" :height="ph" :rx="pr"
        :fill="isOn ? `url(#lna-panel-on-${uid})` : `url(#lna-panel-off-${uid})`"
        stroke="#06080e" :stroke-width="rw*0.4"
      />
      <!-- Panel glow when ON -->
      <rect v-if="isOn && !d.isInvalid" :x="px" :y="py" :width="pw" :height="ph" :rx="pr"
        fill="none" stroke="#14b8a6" :stroke-width="rw*0.4" opacity="0.38"
        :style="`filter: drop-shadow(0 0 ${pw*0.04}px #14b8a6)`"
      />

      <!-- ── Device name ─────────────────────────────────────────────────── -->
      <SvgMultilineText v-if="titleText"
        :text="titleText" :x="titleX" :y="titleY" :font-size="titleFontSz"
        font-weight="700" font-family="'Segoe UI',sans-serif"
        fill="#94a3b8" opacity="0.85" :text-anchor="titleAnchor"
        :clip-path="`url(#lna-clip-${uid})`"
      />

      <!-- ── Signal IN: left connector → stage 1 ──────────────────────── -->
      <line :x1="connW" :y1="triCy" :x2="t1L" :y2="triCy"
        :stroke="signalColor" stroke-width="1.6" stroke-linecap="round"
        :opacity="isOn ? 0.82 : 0.22" :clip-path="`url(#lna-clip-${uid})`"
      />
      <!-- ── Stage 1 triangle ────────────────────────────────────────── -->
      <polygon :points="tri1Points"
        :fill="isOn ? `url(#lna-tri-on-${uid})` : `url(#lna-tri-off-${uid})`"
        :stroke="triStroke" stroke-width="1.6" stroke-linejoin="round"
        :filter="isOn && !d.isInvalid ? `url(#lna-glow-${uid})` : ''"
        :clip-path="`url(#lna-clip-${uid})`"
      />
      <!-- ── Inter-stage signal: stage 1 → stage 2 ─────────────────── -->
      <line :x1="t1R" :y1="triCy" :x2="t2L" :y2="triCy"
        :stroke="signalColor" stroke-width="1.6" stroke-linecap="round"
        :opacity="isOn ? 0.82 : 0.22" :clip-path="`url(#lna-clip-${uid})`"
      />
      <!-- ── Stage 2 triangle ────────────────────────────────────────── -->
      <polygon :points="tri2Points"
        :fill="isOn ? `url(#lna-tri-on-${uid})` : `url(#lna-tri-off-${uid})`"
        :stroke="triStroke" stroke-width="1.6" stroke-linejoin="round"
        :filter="isOn && !d.isInvalid ? `url(#lna-glow-${uid})` : ''"
        :clip-path="`url(#lna-clip-${uid})`"
      />
      <!-- ── Inter-stage signal: stage 2 → stage 3 ─────────────────── -->
      <line :x1="t2R" :y1="triCy" :x2="t3L" :y2="triCy"
        :stroke="signalColor" stroke-width="1.6" stroke-linecap="round"
        :opacity="isOn ? 0.82 : 0.22" :clip-path="`url(#lna-clip-${uid})`"
      />
      <!-- ── Stage 3 triangle ────────────────────────────────────────── -->
      <polygon :points="tri3Points"
        :fill="isOn ? `url(#lna-tri-on-${uid})` : `url(#lna-tri-off-${uid})`"
        :stroke="triStroke" stroke-width="1.6" stroke-linejoin="round"
        :filter="isOn && !d.isInvalid ? `url(#lna-glow-${uid})` : ''"
        :clip-path="`url(#lna-clip-${uid})`"
      />
      <!-- ── Signal OUT: stage 3 → LED strip ───────────────────────── -->
      <line :x1="t3R" :y1="triCy" :x2="px + pw - stripW - pw*0.01" :y2="triCy"
        :stroke="signalColor" stroke-width="1.6" stroke-linecap="round"
        :opacity="isOn ? 0.82 : 0.22" :clip-path="`url(#lna-clip-${uid})`"
      />

      <!-- ── Separator before LED strip ─────────────────────────────────── -->
      <line :x1="px + pw - stripW" :y1="py + ph*0.08"
            :x2="px + pw - stripW" :y2="py + ph*0.65"
        stroke="#1e3048" stroke-width="1" opacity="0.55"
        :clip-path="`url(#lna-clip-${uid})`"
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
      <text :x="px + pw - pw*0.04" :y="py + ph - ph*0.10"
        text-anchor="end" dominant-baseline="middle"
        :fill="tempColor" :font-size="tempFontSize"
        font-weight="700" font-family="'Digital7', 'Courier New', monospace"
        :clip-path="`url(#lna-clip-${uid})`"
      >{{ tempText }}</text>

      <!-- ── Invalid overlay ─────────────────────────────────────────────── -->
      <rect v-if="d.isInvalid" x="1" y="1" :width="w-2" :height="h-2"
        fill="rgba(231,76,60,0.20)" :rx="cr"
        stroke="#e74c3c" :stroke-width="rw*0.55" stroke-dasharray="8,5"
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

// ── Layout: main area + right LED strip ───────────────────────────────────
const stripW = computed(() => pw.value * 0.22);
const mainW  = computed(() => pw.value - stripW.value);

// ── Three cascaded amplifier triangles (right-pointing) ───────────────────
const triW   = computed(() => mainW.value * 0.240);  // each triangle width
const triGap = computed(() => mainW.value * 0.042);  // gap between stages
const triH   = computed(() => ph.value  * 0.44);
const triCy  = computed(() => py.value  + ph.value * 0.60);
const tTopY  = computed(() => triCy.value - triH.value / 2);
const tBotY  = computed(() => triCy.value + triH.value / 2);

// Stage x-positions (left face / apex of each triangle)
const t1L = computed(() => connW.value + mainW.value * 0.01);
const t1R = computed(() => t1L.value + triW.value);
const t2L = computed(() => t1R.value + triGap.value);
const t2R = computed(() => t2L.value + triW.value);
const t3L = computed(() => t2R.value + triGap.value);
const t3R = computed(() => t3L.value + triW.value);

function triPts(l: number, r: number, top: number, bot: number, cy: number) {
  return `${l.toFixed(1)},${top.toFixed(1)} ${l.toFixed(1)},${bot.toFixed(1)} ${r.toFixed(1)},${cy.toFixed(1)}`;
}
const tri1Points = computed(() => triPts(t1L.value, t1R.value, tTopY.value, tBotY.value, triCy.value));
const tri2Points = computed(() => triPts(t2L.value, t2R.value, tTopY.value, tBotY.value, triCy.value));
const tri3Points = computed(() => triPts(t3L.value, t3R.value, tTopY.value, tBotY.value, triCy.value));

// ── LED ───────────────────────────────────────────────────────────────────
const ledR = computed(() => w.value * 0.048);
const ledX = computed(() => px.value + pw.value - stripW.value * 0.48);
const ledY = computed(() => py.value + ph.value * 0.35);

// ── Font sizes ────────────────────────────────────────────────────────────
const nameFontSize = computed(() => (d.value.titleFontSize as number | undefined) ?? h.value * 0.255);
const tempFontSize = computed(() => h.value * 0.255);
const titleText    = computed(() => (d.value.name as string) ?? "");
const titleFontSz  = computed(() => (d.value.titleFontSize as number) || 10);

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

// ── Colors (teal accent) ──────────────────────────────────────────────────
const signalColor = computed(() => d.value.isInvalid ? "#e74c3c" : isOn.value ? "#2dd4bf" : "#2a3a4a");
const triStroke   = computed(() => d.value.isInvalid ? "#e74c3c" : isOn.value ? "#14b8a6" : "#2a4060");

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
