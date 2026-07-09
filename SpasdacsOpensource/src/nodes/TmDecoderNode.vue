<template>
  <div class="node-wrap" :style="{ opacity: d.opacity ?? 1 }">
    <svg :width="w" :height="h" :viewBox="`0 0 ${w} ${h}`" xmlns="http://www.w3.org/2000/svg" overflow="visible">
      <defs>
        <linearGradient :id="`tmd-rim-${uid}`" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#c8c8da"/>
          <stop offset="20%" stop-color="#686878"/>
          <stop offset="48%" stop-color="#e4e4f2"/>
          <stop offset="74%" stop-color="#565666"/>
          <stop offset="100%" stop-color="#b8b8ca"/>
        </linearGradient>
        <linearGradient :id="`tmd-body-${uid}`" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#0e1828"/>
          <stop offset="100%" stop-color="#060e18"/>
        </linearGradient>
        <radialGradient :id="`tmd-panel-off-${uid}`" cx="50%" cy="45%" r="65%">
          <stop offset="0%" stop-color="#14182e"/>
          <stop offset="100%" stop-color="#06080e"/>
        </radialGradient>
        <radialGradient :id="`tmd-panel-on-${uid}`" cx="38%" cy="35%" r="72%">
          <stop offset="0%" stop-color="#0b2238"/>
          <stop offset="100%" stop-color="#040910"/>
        </radialGradient>
        <linearGradient :id="`tmd-conn-${uid}`" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#5a7a9a"/>
          <stop offset="50%" stop-color="#2a4a6a"/>
          <stop offset="100%" stop-color="#1a2a3a"/>
        </linearGradient>
        <filter :id="`tmd-glow-${uid}`" x="-30%" y="-40%" width="170%" height="180%">
          <feGaussianBlur stdDeviation="2.0" result="blur"/>
          <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
        <clipPath :id="`tmd-clip-${uid}`">
          <rect :x="px" :y="py" :width="pw" :height="ph" :rx="pr"/>
        </clipPath>
      </defs>

      <rect x="1" y="1" :width="w-2" :height="h-2"
        :rx="cr" :fill="`url(#tmd-body-${uid})`"
        :stroke="`url(#tmd-rim-${uid})`" :stroke-width="rw"
      />

      <rect :x="0" :y="h/2 - connH/2" :width="connW" :height="connH" :rx="connW*0.35"
        :fill="`url(#tmd-conn-${uid})`" stroke="#4a6a8a" :stroke-width="w*0.007"
      />
      <circle :cx="connW*0.5" :cy="h/2" :r="connH*0.22" fill="#0d1117" stroke="#8090a0" stroke-width="1.2"/>
      <rect :x="w-connW" :y="h/2 - connH/2" :width="connW" :height="connH" :rx="connW*0.35"
        :fill="`url(#tmd-conn-${uid})`" stroke="#4a6a8a" :stroke-width="w*0.007"
      />
      <circle :cx="w-connW*0.5" :cy="h/2" :r="connH*0.22" fill="#0d1117" stroke="#8090a0" stroke-width="1.2"/>

      <rect :x="px" :y="py" :width="pw" :height="ph" :rx="pr"
        :fill="isOn ? `url(#tmd-panel-on-${uid})` : `url(#tmd-panel-off-${uid})`"
        stroke="#06080e" :stroke-width="rw*0.35"
      />

      <text :x="titleX" :y="titleY"
        :text-anchor="titleAnchor" dominant-baseline="middle"
        :font-size="titleFontSz" font-weight="700" letter-spacing="0.8"
        font-family="'Courier New', monospace"
        :fill="titleFontColor"
        :clip-path="`url(#tmd-clip-${uid})`"
      >{{ titleText }}</text>

      <line v-if="!isOn"
        :x1="connW" :y1="sigY" :x2="decodeX" :y2="sigY"
        stroke="#1e3048" stroke-width="1.5" stroke-linecap="round" opacity="0.24"
        :clip-path="`url(#tmd-clip-${uid})`"
      />
      <path v-else :d="busWavePath"
        fill="none" stroke="#00ccff" stroke-width="1.7" stroke-linecap="round"
        :filter="`url(#tmd-glow-${uid})`"
        :clip-path="`url(#tmd-clip-${uid})`"
      />

      <rect :x="decodeX" :y="sigY - ph*0.23" :width="decodeW" :height="ph*0.46" :rx="ph*0.06"
        :fill="isOn ? '#062214' : '#0b1320'"
        :stroke="isOn ? '#44ff88' : '#1e3048'" stroke-width="1.25"
        :filter="isOn && !d.isInvalid ? `url(#tmd-glow-${uid})` : ''"
        :clip-path="`url(#tmd-clip-${uid})`"
      />
      <text :x="decodeX + decodeW * 0.5" :y="sigY + ph*0.01"
        text-anchor="middle" dominant-baseline="middle"
        :fill="isOn ? '#86efac' : '#4a6070'"
        :font-size="h*0.076" font-family="'Segoe UI', sans-serif" font-weight="700"
        :clip-path="`url(#tmd-clip-${uid})`"
      >DECODER</text>

      <line :x1="decodeX + decodeW + pw*0.03" :y1="sigY" :x2="fanX" :y2="sigY"
        :stroke="isOn ? '#4a9eff' : '#1e3048'" stroke-width="1.5" stroke-linecap="round"
        :opacity="isOn ? 0.88 : 0.24"
        :clip-path="`url(#tmd-clip-${uid})`"
      />

      <line v-for="(out, i) in outputs" :key="i"
        :x1="fanX" :y1="sigY" :x2="out.x2" :y2="out.y2"
        :stroke="isOn ? '#44ff88' : '#1e3a2a'" stroke-width="1.35" stroke-linecap="round"
        :opacity="isOn ? (activeLineIndex === i ? 0.96 : 0.45) : 0.24"
        :filter="isOn && activeLineIndex === i ? `url(#tmd-glow-${uid})` : ''"
        :clip-path="`url(#tmd-clip-${uid})`"
      />

      <circle v-for="(out, i) in outputs" :key="`dot-${i}`" :cx="out.x2" :cy="out.y2" :r="outDotR"
        :fill="isOn ? (activeLineIndex === i ? '#fbbf24' : '#44ff88') : '#2a3a2a'"
        :opacity="isOn ? 0.95 : 0.30"
        :clip-path="`url(#tmd-clip-${uid})`"
      />

      <text :x="px + pw - pw*0.025" :y="py + ph - ph*0.10"
        text-anchor="end" dominant-baseline="middle"
        :fill="tempColor" :font-size="tempFontSize"
        font-weight="700" font-family="'Digital7', 'Courier New', monospace"
        :clip-path="`url(#tmd-clip-${uid})`"
      >{{ tempText }}</text>

      <rect v-if="d.isInvalid" x="1" y="1" :width="w-2" :height="h-2"
        fill="rgba(231,76,60,0.20)" :rx="cr"
        stroke="#e74c3c" :stroke-width="rw*0.55" stroke-dasharray="8,5"
      />
    </svg>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from "vue";
import { useNodeData } from "./useNodeData";
import { useTitlePosition } from "./useTitlePosition";

const { d, w, h } = useNodeData(250, 110);
const uid = ref(Math.random().toString(36).slice(2, 8));

const titleText = computed(() => (d.value.name as string) || "TM DECODER");
const titleFontSz = computed(() => (d.value.titleFontSize as number) ?? 10);
const titleFontColor = computed(() => (d.value.titleFontColor as string) || "#c9d1d9");
const { titleX, titleY, titleAnchor } = useTitlePosition(
  () => d.value.titlePosition as string | undefined,
  () => px.value,
  () => pw.value,
  () => py.value,
  () => ph.value,
  "top-center",
);
const rw = computed(() => w.value * 0.036);
const cr = computed(() => w.value * 0.072);
const px = computed(() => rw.value * 0.55);
const py = computed(() => rw.value * 0.55);
const pw = computed(() => w.value - px.value * 2);
const ph = computed(() => h.value - py.value * 2);
const pr = computed(() => cr.value * 0.65);
const connW = computed(() => rw.value * 1.8);
const connH = computed(() => h.value * 0.28);
const sigY = computed(() => py.value + ph.value * 0.58);

const decodeX = computed(() => px.value + pw.value * 0.30);
const decodeW = computed(() => pw.value * 0.24);
const fanX = computed(() => decodeX.value + decodeW.value + pw.value * 0.12);
const outDotR = computed(() => w.value * 0.013);

const outputs = computed(() => {
  const x2 = w.value - connW.value;
  return [
    { x2, y2: sigY.value - ph.value * 0.15 },
    { x2, y2: sigY.value },
    { x2, y2: sigY.value + ph.value * 0.15 },
  ];
});

const isOn = computed(() => {
  const sc = d.value.statusColor as string;
  return !!sc && sc !== "" && sc !== "gradient:off";
});

const busWavePath = ref("");
const activeLineIndex = ref(0);

function buildBusPath(phase: number): string {
  const sx = connW.value;
  const ex = decodeX.value;
  const width = ex - sx;
  if (width <= 4) return "";

  const cycles = 6;
  const samples = 120;
  const amp = ph.value * 0.10;
  const cy = sigY.value;
  let path = "";

  for (let i = 0; i <= samples; i++) {
    const u = i / samples;
    const x = sx + u * width;
    const y = cy - amp * Math.sin((u * cycles * 2 * Math.PI) - phase * 2 * Math.PI);
    if (i === 0) path = `M ${x.toFixed(2)},${y.toFixed(2)}`;
    else path += ` L ${x.toFixed(2)},${y.toFixed(2)}`;
  }
  return path;
}

let rafId = 0;
let lastT = 0;
let phase = 0;
let lineTimer = 0;

function tick(t: number) {
  if (!lastT) lastT = t;
  const dt = Math.min((t - lastT) / 1000, 0.05);
  lastT = t;

  if (isOn.value) {
    phase = (phase + dt * 1.2) % 1;
    lineTimer += dt;
    if (lineTimer >= 0.28) {
      lineTimer = 0;
      activeLineIndex.value = (activeLineIndex.value + 1) % 3;
    }
    busWavePath.value = buildBusPath(phase);
  } else {
    phase = 0;
    lineTimer = 0;
    activeLineIndex.value = 0;
    busWavePath.value = "";
  }

  rafId = requestAnimationFrame(tick);
}

onMounted(() => { rafId = requestAnimationFrame(tick); });
onUnmounted(() => { if (rafId) cancelAnimationFrame(rafId); });

const tempFontSize = computed(() => h.value * 0.235);
const tempText = computed(() => {
  const t = d.value.temperature as number | undefined;
  if (t === null || t === undefined || typeof t !== "number") return "xx.xC";
  return `${t.toFixed(1)}C`;
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
