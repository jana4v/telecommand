<template>
  <div class="node-wrap" :style="{ opacity: d.opacity ?? 1 }">
    <svg :width="w" :height="h" :viewBox="`0 0 ${w} ${h}`" xmlns="http://www.w3.org/2000/svg" overflow="visible">
      <defs>
        <linearGradient :id="`qpm-rim-${uid}`" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#c8c8da"/>
          <stop offset="20%" stop-color="#686878"/>
          <stop offset="48%" stop-color="#e4e4f2"/>
          <stop offset="74%" stop-color="#565666"/>
          <stop offset="100%" stop-color="#b8b8ca"/>
        </linearGradient>
        <linearGradient :id="`qpm-body-${uid}`" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#0e1828"/>
          <stop offset="100%" stop-color="#060e18"/>
        </linearGradient>
        <radialGradient :id="`qpm-panel-off-${uid}`" cx="50%" cy="45%" r="65%">
          <stop offset="0%" stop-color="#14182e"/>
          <stop offset="100%" stop-color="#06080e"/>
        </radialGradient>
        <radialGradient :id="`qpm-panel-on-${uid}`" cx="40%" cy="35%" r="72%">
          <stop offset="0%" stop-color="#0c1c34"/>
          <stop offset="100%" stop-color="#040910"/>
        </radialGradient>
        <linearGradient :id="`qpm-conn-${uid}`" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#5a7a9a"/>
          <stop offset="50%" stop-color="#2a4a6a"/>
          <stop offset="100%" stop-color="#1a2a3a"/>
        </linearGradient>
        <filter :id="`qpm-glow-${uid}`" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="2.2" result="blur"/>
          <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
        <clipPath :id="`qpm-clip-${uid}`">
          <rect :x="px" :y="py" :width="pw" :height="ph" :rx="pr"/>
        </clipPath>
      </defs>

      <rect x="1" y="1" :width="w-2" :height="h-2"
        :rx="cr" :fill="`url(#qpm-body-${uid})`"
        :stroke="`url(#qpm-rim-${uid})`" :stroke-width="rw"
      />

      <rect :x="0" :y="h/2 - connH/2" :width="connW" :height="connH" :rx="connW*0.35"
        :fill="`url(#qpm-conn-${uid})`" stroke="#4a6a8a" :stroke-width="w*0.007"
      />
      <circle :cx="connW*0.5" :cy="h/2" :r="connH*0.22" fill="#0d1117" stroke="#8090a0" stroke-width="1.2"/>
      <rect :x="w-connW" :y="h/2 - connH/2" :width="connW" :height="connH" :rx="connW*0.35"
        :fill="`url(#qpm-conn-${uid})`" stroke="#4a6a8a" :stroke-width="w*0.007"
      />
      <circle :cx="w-connW*0.5" :cy="h/2" :r="connH*0.22" fill="#0d1117" stroke="#8090a0" stroke-width="1.2"/>

      <rect :x="px" :y="py" :width="pw" :height="ph" :rx="pr"
        :fill="isOn ? `url(#qpm-panel-on-${uid})` : `url(#qpm-panel-off-${uid})`"
        stroke="#06080e" :stroke-width="rw*0.35"
      />

      <text :x="titleX" :y="titleY"
        :text-anchor="titleAnchor" dominant-baseline="middle"
        :font-size="titleFontSz" font-weight="700" letter-spacing="1.0"
        font-family="'Courier New', monospace"
        :fill="titleFontColor"
        :clip-path="`url(#qpm-clip-${uid})`"
      >{{ titleText }}</text>

      <line v-if="!isOn"
        :x1="connW" :y1="sigY" :x2="mapX" :y2="sigY"
        stroke="#1e3048" stroke-width="1.4" stroke-linecap="round" opacity="0.26"
        :clip-path="`url(#qpm-clip-${uid})`"
      />
      <path v-else :d="inputPath"
        fill="none" stroke="#44ff88" stroke-width="1.7"
        stroke-linecap="square" stroke-linejoin="miter"
        :filter="`url(#qpm-glow-${uid})`"
        :clip-path="`url(#qpm-clip-${uid})`"
      />

      <rect :x="mapX" :y="sigY - ph*0.23" :width="mapW" :height="ph*0.46" :rx="ph*0.06"
        :fill="isOn ? '#071a34' : '#0b1320'"
        :stroke="isOn ? '#4a9eff' : '#1e3048'" stroke-width="1.2"
        :clip-path="`url(#qpm-clip-${uid})`"
      />
      <text :x="mapX + mapW * 0.5" :y="sigY + ph*0.01"
        text-anchor="middle" dominant-baseline="middle"
        :fill="isOn ? '#7dd3fc' : '#4a6070'"
        :font-size="h*0.082" font-family="'Segoe UI', sans-serif" font-weight="700"
        :clip-path="`url(#qpm-clip-${uid})`"
      >QPSK</text>

      <circle :cx="constCx" :cy="constCy" :r="constR"
        fill="#061526" :stroke="isOn ? '#b388ff' : '#304060'" :stroke-width="1.2"
        :filter="isOn && !d.isInvalid ? `url(#qpm-glow-${uid})` : ''"
        :clip-path="`url(#qpm-clip-${uid})`"
      />
      <line :x1="constCx - constR*0.75" :y1="constCy" :x2="constCx + constR*0.75" :y2="constCy"
        :stroke="isOn ? '#4a9eff' : '#2a3a4a'" stroke-width="1" opacity="0.7"
        :clip-path="`url(#qpm-clip-${uid})`"
      />
      <line :x1="constCx" :y1="constCy - constR*0.75" :x2="constCx" :y2="constCy + constR*0.75"
        :stroke="isOn ? '#4a9eff' : '#2a3a4a'" stroke-width="1" opacity="0.7"
        :clip-path="`url(#qpm-clip-${uid})`"
      />
      <circle v-for="p in constellationPts" :key="p.id" :cx="p.x" :cy="p.y" :r="constR*0.11"
        :fill="isOn ? '#38bdf8' : '#32465a'" opacity="0.85"
        :clip-path="`url(#qpm-clip-${uid})`"
      />
      <circle v-if="isOn" :cx="activePt.x" :cy="activePt.y" :r="constR*0.18"
        fill="#fbbf24" opacity="0.95" :filter="`url(#qpm-glow-${uid})`"
        :clip-path="`url(#qpm-clip-${uid})`"
      />

      <line v-if="!isOn"
        :x1="constCx + constR" :y1="sigY" :x2="w - connW" :y2="sigY"
        stroke="#1e3048" stroke-width="1.4" stroke-linecap="round" opacity="0.26"
        :clip-path="`url(#qpm-clip-${uid})`"
      />
      <path v-else :d="carrierPath"
        fill="none" stroke="#00ccff" stroke-width="1.8" stroke-linecap="round"
        :filter="`url(#qpm-glow-${uid})`"
        :clip-path="`url(#qpm-clip-${uid})`"
      />

      <text :x="px + pw - pw*0.025" :y="py + ph - ph*0.10"
        text-anchor="end" dominant-baseline="middle"
        :fill="tempColor" :font-size="tempFontSize"
        font-weight="700" font-family="'Digital7', 'Courier New', monospace"
        :clip-path="`url(#qpm-clip-${uid})`"
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

const titleText = computed(() => (d.value.name as string) || "QPSK MOD");
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
const sigY = computed(() => py.value + ph.value * 0.57);

const mapX = computed(() => px.value + pw.value * 0.22);
const mapW = computed(() => pw.value * 0.19);
const constCx = computed(() => px.value + pw.value * 0.60);
const constCy = computed(() => sigY.value);
const constR = computed(() => ph.value * 0.28);

const constellationPts = computed(() => {
  const r = constR.value * 0.55;
  return [
    { id: 0, x: constCx.value + r, y: constCy.value - r },
    { id: 1, x: constCx.value - r, y: constCy.value - r },
    { id: 2, x: constCx.value - r, y: constCy.value + r },
    { id: 3, x: constCx.value + r, y: constCy.value + r },
  ];
});

const isOn = computed(() => {
  const sc = d.value.statusColor as string;
  return !!sc && sc !== "" && sc !== "gradient:off";
});

const BITS = [1, 0, 1, 1, 0, 1, 0, 0, 1, 0, 0, 1, 1, 1, 0, 0];
const N_VISIBLE_BITS = 5;
const INPUT_SPEED = 2.6;
const CARRIER_CYCLES_PER_SYMBOL = 2.2;
const SYMBOLS_VISIBLE = 4;

const inputPath = ref("");
const carrierPath = ref("");
const activeSymbol = ref(0);

function buildInputPath(phase: number): string {
  const sx = connW.value;
  const ex = mapX.value;
  const width = ex - sx;
  if (width <= 4) return "";

  const seg = width / N_VISIBLE_BITS;
  const cy = sigY.value;
  const amp = ph.value * 0.10;
  const frac = phase % 1;
  const base = Math.floor(phase);

  let path = "";
  let prev = -1;
  for (let i = -1; i <= N_VISIBLE_BITS + 1; i++) {
    const idx = ((base + i) % BITS.length + BITS.length) % BITS.length;
    const b = BITS[idx];
    const x = sx + (i + frac) * seg;
    const y = b === 1 ? cy - amp : cy + amp;
    if (!path) {
      path = `M ${x.toFixed(2)},${y.toFixed(2)}`;
    } else if (b !== prev) {
      const pyv = prev === 1 ? cy - amp : cy + amp;
      path += ` L ${x.toFixed(2)},${pyv.toFixed(2)} L ${x.toFixed(2)},${y.toFixed(2)}`;
    } else {
      path += ` L ${x.toFixed(2)},${y.toFixed(2)}`;
    }
    prev = b;
  }
  return path;
}

function buildCarrierPath(symbolPhase: number): string {
  const sx = constCx.value + constR.value;
  const ex = w.value - connW.value;
  const width = ex - sx;
  if (width <= 4) return "";

  const cy = sigY.value;
  const amp = ph.value * 0.13;
  const samples = 160;
  let path = "";

  for (let i = 0; i <= samples; i++) {
    const u = i / samples;
    const x = sx + u * width;

    const symbolPos = u * SYMBOLS_VISIBLE + (symbolPhase % 1);
    const symbolBase = Math.floor(symbolPhase);
    const symbolIdx = symbolBase + Math.floor(symbolPos);
    const bi = ((symbolIdx * 2) % BITS.length + BITS.length) % BITS.length;
    const bq = ((symbolIdx * 2 + 1) % BITS.length + BITS.length) % BITS.length;

    let phaseOffset = Math.PI * 0.25;
    if (bi === 0 && bq === 1) phaseOffset = Math.PI * 0.75;
    else if (bi === 1 && bq === 1) phaseOffset = Math.PI * 1.25;
    else if (bi === 1 && bq === 0) phaseOffset = Math.PI * 1.75;

    const carrierArg = u * SYMBOLS_VISIBLE * CARRIER_CYCLES_PER_SYMBOL * 2 * Math.PI;
    const y = cy - amp * Math.sin(carrierArg + phaseOffset);

    if (i === 0) path = `M ${x.toFixed(2)},${y.toFixed(2)}`;
    else path += ` L ${x.toFixed(2)},${y.toFixed(2)}`;
  }

  return path;
}

const activePt = computed(() => constellationPts.value[activeSymbol.value % 4] ?? constellationPts.value[0]);

let rafId = 0;
let lastT = 0;
let phase = 0;

function tick(t: number) {
  if (!lastT) lastT = t;
  const dt = Math.min((t - lastT) / 1000, 0.05);
  lastT = t;

  if (isOn.value) {
    phase = (phase + dt * INPUT_SPEED) % BITS.length;
    inputPath.value = buildInputPath(phase);
    carrierPath.value = buildCarrierPath(phase * 0.5);
    const symBase = Math.floor(phase * 0.5);
    const bi = BITS[(symBase * 2) % BITS.length];
    const bq = BITS[(symBase * 2 + 1) % BITS.length];
    activeSymbol.value = bi === 0 && bq === 0 ? 0 : bi === 0 && bq === 1 ? 1 : bi === 1 && bq === 1 ? 2 : 3;
  } else {
    phase = 0;
    inputPath.value = "";
    carrierPath.value = "";
    activeSymbol.value = 0;
  }

  rafId = requestAnimationFrame(tick);
}

onMounted(() => { rafId = requestAnimationFrame(tick); });
onUnmounted(() => { if (rafId) cancelAnimationFrame(rafId); });

const tempFontSize = computed(() => h.value * 0.245);
const tempText = computed(() => {
  const t = d.value.temperature as number | undefined;
  if (t === null || t === undefined || typeof t !== "number") return "xx.x°C";
  return `${t.toFixed(1)}°C`;
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
