<template>
  <div class="node-wrap" :style="{ opacity: d.opacity ?? 1 }">
    <!--
      Patch Array Antenna — 160×110 viewBox.
      2×4 microstrip patch elements on PCB substrate above ground plane.
      Modes: TX (cyan lobes expand up), RX (green lobes contract down), TX+RX (both).
    -->
    <svg :width="w" :height="h" viewBox="0 0 160 110"
         preserveAspectRatio="none"
         xmlns="http://www.w3.org/2000/svg" overflow="visible">

      <defs>
        <linearGradient :id="`pa-gnd-${uid}`" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stop-color="#2e4460"/>
          <stop offset="100%" stop-color="#111a28"/>
        </linearGradient>
        <linearGradient :id="`pa-sub-${uid}`" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stop-color="#0f1e30"/>
          <stop offset="100%" stop-color="#091420"/>
        </linearGradient>
        <linearGradient :id="`pa-patch-off-${uid}`" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stop-color="#1e3050"/>
          <stop offset="100%" stop-color="#121e30"/>
        </linearGradient>
        <linearGradient :id="`pa-patch-on-${uid}`" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stop-color="#1e5c8c"/>
          <stop offset="100%" stop-color="#0c2e50"/>
        </linearGradient>
        <filter :id="`pa-glow-${uid}`" x="-80%" y="-80%" width="260%" height="260%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="2" result="b"/>
          <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
      </defs>

      <!-- ── Title ──────────────────────────────────────────────────── -->
      <SvgMultilineText v-if="titleText"
        :text="titleText" :x="titleX" :y="titleY" :centered="false"
        :font-size="titleFontSz" font-weight="700" letter-spacing="1.2"
        font-family="'Courier New', monospace"
        :fill="titleFontColor" :text-anchor="titleAnchor"
      />

      <!-- ── PCB Substrate ─────────────────────────────────────────── -->
      <rect x="8" y="15" width="144" height="55" rx="2"
        :fill="`url(#pa-sub-${uid})`"
        :stroke="isOn ? '#1e3555' : '#1e3a58'"
        stroke-width="1"/>

      <!-- ── Patch elements (2 rows × 4 cols) ──────────────────────── -->
      <template v-for="(patch, idx) in patches" :key="idx">
        <rect
          :x="patch.x" :y="patch.y"
          :width="PATCH_W" :height="PATCH_H"
          rx="1"
          :fill="isOn ? `url(#pa-patch-on-${uid})` : `url(#pa-patch-off-${uid})`"
          :stroke="isOn ? '#4a9eff' : '#2e5070'"
          :stroke-width="isOn ? 1.1 : 0.9"/>
        <line
          :x1="patch.x + 2" :y1="patch.y"
          :x2="patch.x + PATCH_W - 2" :y2="patch.y"
          :stroke="isOn ? '#00ccff' : '#2e4e6a'"
          :stroke-width="isOn ? 1.6 : 0.9"
          stroke-linecap="round"
          :opacity="isOn ? 0.85 : 0.7"/>
        <line
          :x1="patch.x + 2" :y1="patch.y + PATCH_H"
          :x2="patch.x + PATCH_W - 2" :y2="patch.y + PATCH_H"
          :stroke="isOn ? '#00ccff' : '#2e4e6a'"
          :stroke-width="isOn ? 1.6 : 0.9"
          stroke-linecap="round"
          :opacity="isOn ? 0.85 : 0.7"/>
        <circle
          :cx="patch.x + PATCH_W / 2" :cy="patch.y + PATCH_H / 2"
          r="1.8"
          :fill="isOn ? '#4a9eff' : '#2a4a68'"
          :opacity="isOn ? 0.6 : 0.5"/>
      </template>

      <!-- ── Corporate feed network ──────────────────────────────────── -->
      <line v-for="cx in feedCentres" :key="'fs'+cx"
        :x1="cx" :y1="ROW_2_Y + PATCH_H"
        :x2="cx" :y2="BUS_Y"
        :stroke="isOn ? '#2a5888' : '#1e3e5a'" stroke-width="0.9"/>
      <line :x1="feedCentres[0]" :y1="BUS_Y"
            :x2="feedCentres[3]" :y2="BUS_Y"
        :stroke="isOn ? '#2a5888' : '#1e3e5a'" stroke-width="0.9"/>
      <template v-if="isOn">
        <circle v-for="cx in feedCentres" :key="'fj'+cx"
          :cx="cx" :cy="BUS_Y" r="1.5" fill="#3a78b8" opacity="0.9"/>
      </template>
      <line x1="80" :y1="BUS_Y" x2="80" :y2="GND_Y"
        :stroke="isOn ? '#4a9eff' : '#2a4a6a'" stroke-width="1.2"/>
      <circle cx="80" :cy="BUS_Y" r="1.8"
        :fill="isOn ? '#4a9eff' : '#2a4a6a'"
        :opacity="isOn ? 0.9 : 0.6"/>

      <!-- ── Ground plane ───────────────────────────────────────────── -->
      <rect x="8" :y="GND_Y" width="144" height="13" rx="1.5"
        :fill="`url(#pa-gnd-${uid})`"
        :stroke="isOn ? '#3a6080' : '#2a4a65'"
        stroke-width="1"/>
      <line v-for="xi in 10" :key="'h'+xi"
        :x1="8 + xi * 13.1" :y1="GND_Y"
        :x2="8 + xi * 13.1" :y2="GND_Y + 13"
        :stroke="isOn ? '#2a4a62' : '#1e3a55'" stroke-width="0.5"/>
      <text x="80" :y="GND_Y + 24" text-anchor="middle" font-size="5.5"
            font-family="monospace" font-weight="600" letter-spacing="0.8"
            :fill="isOn ? '#4a7090' : '#2a4a65'">GND</text>

      <!-- ── Mode badge ──────────────────────────────────────────────── -->
      <text v-if="isOn" x="12" y="105" text-anchor="middle" font-size="5.5"
            font-family="'Courier New', monospace" font-weight="700"
            :fill="modeColor" opacity="0.85">{{ mode }}</text>

      <!-- ── TX lobes — cyan ))) expanding upward (TX or TX+RX) ─────────── -->
      <template v-if="isOn">
        <g v-for="(wave, i) in txWaves" :key="`pa-tx-${i}`"
           :filter="`url(#pa-glow-${uid})`">
          <path :d="mainLobePath(wave.r, false)"
                fill="none" stroke="#00e5ff"
                :stroke-width="2.2 - wave.r * 0.018"
                stroke-linecap="round"
                :opacity="wave.opacity * 0.9"/>
          <path :d="sideLobePath(wave.r, -1, false)"
                fill="none" stroke="#00aaff"
                :stroke-width="1.4 - wave.r * 0.01"
                stroke-linecap="round"
                :opacity="wave.opacity * 0.45"/>
          <path :d="sideLobePath(wave.r, +1, false)"
                fill="none" stroke="#00aaff"
                :stroke-width="1.4 - wave.r * 0.01"
                stroke-linecap="round"
                :opacity="wave.opacity * 0.45"/>
        </g>
      </template>

      <!-- ── RX lobes — green ((( contracting downward (RX or TX+RX) ──── -->
      <template v-if="isOn">
        <g v-for="(wave, i) in rxWaves" :key="`pa-rx-${i}`"
           :filter="`url(#pa-glow-${uid})`">
          <path :d="mainLobePath(wave.r, true)"
                fill="none" stroke="#44ff88"
                :stroke-width="2.2 - wave.r * 0.018"
                stroke-linecap="round"
                :opacity="wave.opacity * 0.9"/>
          <path :d="sideLobePath(wave.r, -1, true)"
                fill="none" stroke="#22dd66"
                :stroke-width="1.4 - wave.r * 0.01"
                stroke-linecap="round"
                :opacity="wave.opacity * 0.45"/>
          <path :d="sideLobePath(wave.r, +1, true)"
                fill="none" stroke="#22dd66"
                :stroke-width="1.4 - wave.r * 0.01"
                stroke-linecap="round"
                :opacity="wave.opacity * 0.45"/>
        </g>
      </template>

    </svg>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from "vue";
import { useNodeData } from "./useNodeData";
import SvgMultilineText from "./SvgMultilineText.vue";
import { useTitlePosition } from "./useTitlePosition";

const { d, w, h } = useNodeData(160, 110);
const uid = Math.random().toString(36).slice(2, 8);

const titleText   = computed(() => (d.value.name         as string) ?? "");
const titleFontSz = computed(() => (d.value.titleFontSize as number) ?? 9);
const titleFontColor = computed(() => (d.value.titleFontColor as string) || "#c9d1d9");
const { titleX, titleY, titleAnchor } = useTitlePosition(
  () => d.value.titlePosition as string | undefined,
  () => 0,
  () => w.value,
  () => 0,
  () => h.value,
  "top-center",
);
const isOn  = computed(() => ((d.value.position as number) ?? 0) > 0);
const mode  = computed(() => (d.value.mode as string) || "TX");

const modeColor = computed(() => {
  if (mode.value === "RX")    return "#44ff88";
  if (mode.value === "TX+RX") return "#aaddff";
  return "#00e5ff";
});

// ── Patch geometry: 2 rows × 4 cols ──────────────────────────────────────────
const PATCH_W = 26;
const PATCH_H = 18;
const COLS    = [13, 49, 85, 121];
const ROW_1_Y = 20;
const ROW_2_Y = 44;
const BUS_Y   = 66;
const GND_Y   = 71;

const patches = computed(() =>
  [ROW_1_Y, ROW_2_Y].flatMap(y => COLS.map(x => ({ x, y })))
);

const feedCentres = COLS.map(x => x + PATCH_W / 2);

// ── Radiation arcs ────────────────────────────────────────────────────────────
const ARRAY_CX  = 80;
const ARRAY_TOP = ROW_1_Y;   // 20

// rx=false → sweep=1 bows AWAY  from array (TX outgoing, arcs bow upward)
// rx=true  → sweep=0 bows TOWARD array (RX incoming, arcs bow downward)
function mainLobePath(r: number, rx = false): string {
  const ang = 50 * (Math.PI / 180);
  const x1  = (ARRAY_CX - r * Math.sin(ang)).toFixed(1);
  const x2  = (ARRAY_CX + r * Math.sin(ang)).toFixed(1);
  const yp  = (ARRAY_TOP - r * Math.cos(ang)).toFixed(1);
  return `M ${x1},${yp} A ${r},${r} 0 0,${rx ? 0 : 1} ${x2},${yp}`;
}

function sideLobePath(r: number, side: 1 | -1, rx = false): string {
  const halfAng = 18 * (Math.PI / 180);
  const cx      = ARRAY_CX + side * r * 0.55;
  const cy      = ARRAY_TOP - r * 0.38;
  const x1      = (cx - r * 0.35 * Math.cos(halfAng)).toFixed(1);
  const y1      = (cy - r * 0.35 * Math.sin(halfAng)).toFixed(1);
  const x2      = (cx + r * 0.35 * Math.cos(halfAng)).toFixed(1);
  const y2      = (cy - r * 0.35 * Math.sin(halfAng)).toFixed(1);
  return `M ${x1},${y1} A ${r * 0.35},${r * 0.35} 0 0,${rx ? 0 : 1} ${x2},${y2}`;
}

// ── rAF animation ─────────────────────────────────────────────────────────────
interface Wave { r: number; opacity: number; }
const txWaves = ref<Wave[]>([]);
const rxWaves = ref<Wave[]>([]);

const R_MIN   = 8;
const R_MAX   = 46;
const N_WAVES = 3;

let _rafId = 0;
let _lastT = 0;
let _phase = 0;

function buildWave(i: number, rx: boolean): Wave {
  const p = (_phase + i / N_WAVES) % 1;
  const r = rx
    ? R_MAX - p * (R_MAX - R_MIN)
    : R_MIN + p * (R_MAX - R_MIN);
  const opacity = p < 0.20 ? (p / 0.20) * 0.85
                : p > 0.75 ? ((1 - p) / 0.25) * 0.85
                : 0.85;
  return { r, opacity };
}

function tick(t: number) {
  if (_lastT === 0) _lastT = t;
  const dt = Math.min((t - _lastT) / 1000, 0.05);
  _lastT = t;

  if (isOn.value) {
    _phase = (_phase + dt * 0.48) % 1;
    const doTx = mode.value !== "RX";
    const doRx = mode.value !== "TX";
    txWaves.value = doTx ? Array.from({ length: N_WAVES }, (_, i) => buildWave(i, false)) : [];
    rxWaves.value = doRx ? Array.from({ length: N_WAVES }, (_, i) => buildWave(i, true))  : [];
  } else {
    txWaves.value = [];
    rxWaves.value = [];
    _phase = 0;
  }

  _rafId = requestAnimationFrame(tick);
}

onMounted(()   => { _rafId = requestAnimationFrame(tick); });
onUnmounted(() => { if (_rafId) cancelAnimationFrame(_rafId); });
</script>

<style scoped>
.node-wrap { width: 100%; height: 100%; overflow: visible; }
svg { overflow: visible; }
svg * { transition: none !important; animation: none !important; }
</style>
