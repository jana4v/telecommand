<template>
  <div class="node-wrap" :style="{ opacity: d.opacity ?? 1 }">
    <!--
      Helical Antenna — 160×110 viewBox.
      Axial-mode helix coil on a circular ground-plane disc.
      Modes: TX (cyan end-fire lobes expand up), RX (green lobes contract down), TX+RX (both).
    -->
    <svg :width="w" :height="h" viewBox="0 0 160 110"
         preserveAspectRatio="none"
         xmlns="http://www.w3.org/2000/svg" overflow="visible">

      <defs>
        <radialGradient :id="`ha-gnd-${uid}`" cx="50%" cy="35%" r="60%">
          <stop offset="0%"   stop-color="#3a5a78"/>
          <stop offset="100%" stop-color="#162236"/>
        </radialGradient>
        <filter :id="`ha-glow-${uid}`" x="-80%" y="-80%" width="260%" height="260%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="2" result="b"/>
          <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
        <filter :id="`ha-tip-${uid}`" x="-200%" y="-200%" width="500%" height="500%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="3" result="b"/>
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

      <!-- ── Back arcs ─────────────────────────────────────────────── -->
      <path v-for="arc in backArcs" :key="arc.key"
        :d="arc.d"
        fill="none"
        :stroke="isOn ? '#006699' : '#1e3e58'"
        :stroke-width="isOn ? 2 : 1.4"
        stroke-linecap="round"
        :opacity="isOn ? 0.38 : 0.55"/>

      <!-- ── Centre axis ────────────────────────────────────────────── -->
      <line :x1="HELIX_CX" :y1="HELIX_TOP + 2"
            :x2="HELIX_CX" :y2="HELIX_BOTTOM + 4"
        :stroke="isOn ? '#1e4060' : '#1a3858'"
        stroke-width="0.9" stroke-dasharray="3 3"/>

      <!-- ── Front arcs ─────────────────────────────────────────────── -->
      <g :filter="isOn ? `url(#ha-glow-${uid})` : undefined">
        <path v-for="arc in frontArcs" :key="arc.key"
          :d="arc.d"
          fill="none"
          :stroke="isOn ? '#00ccff' : '#2e5878'"
          :stroke-width="isOn ? 2.5 : 1.8"
          stroke-linecap="round"/>
      </g>

      <!-- ── Connecting stub ────────────────────────────────────────── -->
      <polyline
        :points="`${HELIX_CX - HELIX_RX},${HELIX_BOTTOM} ${HELIX_CX},${HELIX_BOTTOM} ${HELIX_CX},${GND_CY - GND_RY}`"
        fill="none"
        :stroke="isOn ? '#00aadd' : '#2e5878'"
        stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>

      <!-- ── Open-end tip dot ───────────────────────────────────────── -->
      <g :filter="isOn ? `url(#ha-tip-${uid})` : undefined">
        <circle :cx="HELIX_CX" :cy="HELIX_TOP"
          r="3.5"
          :fill="isOn ? '#00e5ff' : '#1e4060'"
          :stroke="isOn ? '#00e5ff' : '#2e5878'"
          stroke-width="1"
          :opacity="isOn ? 1 : 0.8"/>
      </g>

      <!-- ── Ground disc ────────────────────────────────────────────── -->
      <ellipse :cx="GND_CX" :cy="GND_CY + 2" :rx="GND_RX + 3" :ry="GND_RY + 2"
        fill="#050d18" opacity="0.55"/>
      <ellipse :cx="GND_CX" :cy="GND_CY" :rx="GND_RX" :ry="GND_RY"
        :fill="`url(#ha-gnd-${uid})`"
        :stroke="isOn ? '#3a6080' : '#2a4a65'"
        stroke-width="1.1"/>
      <ellipse :cx="GND_CX" :cy="GND_CY" :rx="GND_RX * 0.65" :ry="GND_RY * 0.65"
        fill="none"
        :stroke="isOn ? '#2a4a62' : '#1e3a55'"
        stroke-width="0.6" opacity="0.7"/>
      <ellipse :cx="GND_CX" :cy="GND_CY" :rx="GND_RX * 0.32" :ry="GND_RY * 0.32"
        fill="none"
        :stroke="isOn ? '#2a4a62' : '#1e3a55'"
        stroke-width="0.6" opacity="0.6"/>
      <line :x1="GND_CX - GND_RX + 4" :y1="GND_CY"
            :x2="GND_CX + GND_RX - 4" :y2="GND_CY"
        :stroke="isOn ? '#2a4a62' : '#1e3a55'"
        stroke-width="0.6" opacity="0.5"/>
      <circle :cx="GND_CX" :cy="GND_CY" r="2.8"
        :fill="isOn ? '#1a5070' : '#1a3050'"
        :stroke="isOn ? '#3a7090' : '#1e3a55'"
        stroke-width="0.8"/>
      <text :x="GND_CX" :y="GND_CY + GND_RY + 10" text-anchor="middle"
            font-size="5.5" font-family="monospace" font-weight="600"
            letter-spacing="0.8"
            :fill="isOn ? '#4a7090' : '#2a4a65'">GND</text>

      <!-- ── Mode badge ──────────────────────────────────────────────── -->
      <text v-if="isOn" x="12" y="108" text-anchor="middle" font-size="5.5"
            font-family="'Courier New', monospace" font-weight="700"
            :fill="modeColor" opacity="0.85">{{ mode }}</text>

      <!-- ── TX lobes — cyan ))) expanding upward (TX or TX+RX) ─────────── -->
      <template v-if="isOn">
        <g v-for="(wave, i) in txWaves" :key="`ha-tx-${i}`"
           :filter="`url(#ha-glow-${uid})`">
          <path :d="mainLobePath(wave.r, false)"
                fill="none" stroke="#00e5ff"
                :stroke-width="2.2 - wave.r * 0.022"
                stroke-linecap="round"
                :opacity="wave.opacity * 0.9"/>
          <path :d="sideLobePath(wave.r, -1, false)"
                fill="none" stroke="#00aaff"
                :stroke-width="1.3 - wave.r * 0.012"
                stroke-linecap="round"
                :opacity="wave.opacity * 0.40"/>
          <path :d="sideLobePath(wave.r, +1, false)"
                fill="none" stroke="#00aaff"
                :stroke-width="1.3 - wave.r * 0.012"
                stroke-linecap="round"
                :opacity="wave.opacity * 0.40"/>
        </g>
      </template>

      <!-- ── RX lobes — green ((( contracting downward (RX or TX+RX) ──── -->
      <template v-if="isOn">
        <g v-for="(wave, i) in rxWaves" :key="`ha-rx-${i}`"
           :filter="`url(#ha-glow-${uid})`">
          <path :d="mainLobePath(wave.r, true)"
                fill="none" stroke="#44ff88"
                :stroke-width="2.2 - wave.r * 0.022"
                stroke-linecap="round"
                :opacity="wave.opacity * 0.9"/>
          <path :d="sideLobePath(wave.r, -1, true)"
                fill="none" stroke="#22dd66"
                :stroke-width="1.3 - wave.r * 0.012"
                stroke-linecap="round"
                :opacity="wave.opacity * 0.40"/>
          <path :d="sideLobePath(wave.r, +1, true)"
                fill="none" stroke="#22dd66"
                :stroke-width="1.3 - wave.r * 0.012"
                stroke-linecap="round"
                :opacity="wave.opacity * 0.40"/>
        </g>
      </template>

    </svg>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from "vue";
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

// ── Helix geometry ────────────────────────────────────────────────────────────
const HELIX_CX     = 80;
const HELIX_RX     = 46;
const HELIX_RY     = 5;
const HELIX_TOP    = 18;
const N_TURNS      = 5;
const TURN_H       = 12;
const HELIX_BOTTOM = HELIX_TOP + N_TURNS * TURN_H;   // = 78

const GND_CX = 80;
const GND_CY = 88;
const GND_RX = 52;
const GND_RY = 7;

interface HelixArc { key: string; d: string; }

const backArcs: HelixArc[] = Array.from({ length: N_TURNS }, (_, i) => {
  const y1 = HELIX_TOP + i * TURN_H + TURN_H / 2;
  const y2 = HELIX_TOP + (i + 1) * TURN_H;
  return {
    key: `ba${i}`,
    d: `M ${HELIX_CX + HELIX_RX},${y1} A ${HELIX_RX},${HELIX_RY} 0 0,1 ${HELIX_CX - HELIX_RX},${y2}`,
  };
});

const frontArcs: HelixArc[] = Array.from({ length: N_TURNS }, (_, i) => {
  const y0 = HELIX_TOP + i * TURN_H;
  const y1 = y0 + TURN_H / 2;
  return {
    key: `fa${i}`,
    d: `M ${HELIX_CX - HELIX_RX},${y0} A ${HELIX_RX},${HELIX_RY} 0 0,0 ${HELIX_CX + HELIX_RX},${y1}`,
  };
});

// ── Radiation arcs — end-fire from helix tip ──────────────────────────────────
const ARRAY_CX  = HELIX_CX;
const ARRAY_TOP = HELIX_TOP;   // 18

// rx=false → sweep=1 bows AWAY  from tip (TX outgoing, arcs bow upward)
// rx=true  → sweep=0 bows TOWARD tip (RX incoming, arcs bow downward)
function mainLobePath(r: number, rx = false): string {
  const ang = 38 * (Math.PI / 180);
  const x1  = (ARRAY_CX - r * Math.sin(ang)).toFixed(1);
  const x2  = (ARRAY_CX + r * Math.sin(ang)).toFixed(1);
  const yp  = (ARRAY_TOP - r * Math.cos(ang)).toFixed(1);
  return `M ${x1},${yp} A ${r},${r} 0 0,${rx ? 0 : 1} ${x2},${yp}`;
}

function sideLobePath(r: number, side: 1 | -1, rx = false): string {
  const halfAng = 15 * (Math.PI / 180);
  const cx      = ARRAY_CX + side * r * 0.62;
  const cy      = ARRAY_TOP - r * 0.30;
  const x1      = (cx - r * 0.28 * Math.cos(halfAng)).toFixed(1);
  const y1      = (cy - r * 0.28 * Math.sin(halfAng)).toFixed(1);
  const x2      = (cx + r * 0.28 * Math.cos(halfAng)).toFixed(1);
  const y2      = (cy - r * 0.28 * Math.sin(halfAng)).toFixed(1);
  return `M ${x1},${y1} A ${r * 0.28},${r * 0.28} 0 0,${rx ? 0 : 1} ${x2},${y2}`;
}

// ── rAF wave animation ─────────────────────────────────────────────────────────
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
