<template>
  <div class="node-wrap" :style="{ opacity: d.opacity ?? 1 }">
    <!--
      Horn Antenna — 140×90 viewBox, registered 130×85.
      Modes: TX (cyan arcs expand right), RX (green arcs contract inward), TX+RX (both).
    -->
    <svg :width="w" :height="h" viewBox="0 0 140 90"
         xmlns="http://www.w3.org/2000/svg" overflow="visible">

      <defs>
        <linearGradient :id="`ha-horn-${uid}`" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stop-color="#2e404e"/>
          <stop offset="35%"  stop-color="#56707e"/>
          <stop offset="65%"  stop-color="#3e5060"/>
          <stop offset="100%" stop-color="#1e2e3c"/>
        </linearGradient>
        <filter :id="`ha-glow-${uid}`" x="-70%" y="-70%" width="240%" height="240%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="1.8" result="b"/>
          <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
      </defs>

      <!-- ── Title ─────────────────────────────────────────────────── -->
      <SvgMultilineText v-if="titleText"
        :text="titleText" :x="titleX" :y="titleY" :centered="false"
        :font-size="titleFontSz" font-weight="700" letter-spacing="1.5"
        font-family="'Courier New', monospace"
        :fill="titleFontColor" :text-anchor="titleAnchor"
      />

      <!-- ── Waveguide feed ──────────────────────────────────────────── -->
      <line x1="0" y1="55" x2="5" y2="55"
            :stroke="isOn ? '#4a9eff' : '#2a3a50'" stroke-width="1.5"/>
      <rect x="5" y="49" width="20" height="12" rx="1.5"
        :fill="`url(#ha-horn-${uid})`"
        :stroke="isOn ? '#4a9eff' : '#2a3a50'" stroke-width="1.2"/>
      <line x1="7" y1="55" x2="23" y2="55"
            :stroke="isOn ? '#2266aa' : '#1a2a38'"
            stroke-width="1" stroke-dasharray="3,2"/>
      <text x="15" y="67" text-anchor="middle" font-size="5"
            font-family="monospace" font-weight="600"
            :fill="isOn ? '#4a9eff' : '#334455'">RF IN</text>

      <!-- ── Horn flare ──────────────────────────────────────────────── -->
      <path d="M 25,49 L 25,61 L 86,82 L 86,28 Z"
        :fill="`url(#ha-horn-${uid})`"
        :stroke="isOn ? '#4a9eff' : '#2a3a50'" stroke-width="1.2"
        stroke-linejoin="round"/>
      <line x1="86" y1="28" x2="86" y2="82"
            :stroke="isOn ? '#00aaff' : '#2a3a50'"
            :stroke-width="isOn ? 2.5 : 1.8"
            stroke-linecap="round"
            :opacity="isOn ? 1.0 : 0.5"/>

      <!-- ── Mode badge (TX / RX / TX+RX) ──────────────────────────── -->
      <text v-if="isOn" x="12" y="82" text-anchor="middle" font-size="5.5"
            font-family="'Courier New', monospace" font-weight="700"
            :fill="modeColor" opacity="0.85">{{ mode }}</text>

      <!-- ── TX arcs — cyan ))) expanding outward (TX or TX+RX) ──────── -->
      <template v-if="isOn">
        <g v-for="(wave, i) in txWaves" :key="`ha-tx-${i}`"
           :filter="`url(#ha-glow-${uid})`">
          <path :d="arcPath(wave.r, false)"
                fill="none" stroke="#00e5ff"
                :stroke-width="2.0 - wave.r * 0.024"
                stroke-linecap="round"
                :opacity="wave.opacity"/>
        </g>
      </template>

      <!-- ── RX arcs — green ((( contracting inward (RX or TX+RX) ───── -->
      <template v-if="isOn">
        <g v-for="(wave, i) in rxWaves" :key="`ha-rx-${i}`"
           :filter="`url(#ha-glow-${uid})`">
          <path :d="arcPath(wave.r, true)"
                fill="none" stroke="#44ff88"
                :stroke-width="2.0 - wave.r * 0.024"
                stroke-linecap="round"
                :opacity="wave.opacity"/>
        </g>
      </template>

    </svg>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from "vue";
import SvgMultilineText from "./SvgMultilineText.vue";
import { useNodeData } from "./useNodeData";
import { useTitlePosition } from "./useTitlePosition";

const { d, w, h } = useNodeData(130, 85);
const uid = ref(Math.random().toString(36).slice(2, 8));

const titleText   = computed(() => (d.value.name as string) ?? "");
const titleFontSz = computed(() => (d.value.titleFontSize as number) ?? 10);
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
  return "#00e5ff"; // TX
});

// ── Arc geometry — aperture at x=86, CY=55, ±43° beam spread ─────────────────
const CX = 86;
const CY = 55;
const HALF_ANG = 43 * (Math.PI / 180);

// rx=false → sweep=1 bows AWAY  from aperture (TX outgoing ))) )
// rx=true  → sweep=0 bows TOWARD aperture (RX incoming ((( )
function arcPath(r: number, rx = false): string {
  const x  = (CX + r * Math.cos(HALF_ANG)).toFixed(1);
  const y1 = (CY - r * Math.sin(HALF_ANG)).toFixed(1);
  const y2 = (CY + r * Math.sin(HALF_ANG)).toFixed(1);
  return `M ${x},${y1} A ${r},${r} 0 0,${rx ? 0 : 1} ${x},${y2}`;
}

// ── rAF wave animation ────────────────────────────────────────────────────────
interface Wave { r: number; opacity: number; }
const txWaves = ref<Wave[]>([]);
const rxWaves = ref<Wave[]>([]);

const R_MIN   = 6;
const R_MAX   = 44;
const N_WAVES = 3;

let _rafId = 0;
let _lastT = 0;
let _phase = 0;

function buildWave(i: number, rx: boolean): Wave {
  const p = (_phase + i / N_WAVES) % 1;
  const r = rx
    ? R_MAX - p * (R_MAX - R_MIN)   // shrink inward
    : R_MIN + p * (R_MAX - R_MIN);  // expand outward
  const opacity = p < 0.20 ? (p / 0.20) * 0.82
                : p > 0.75 ? ((1 - p) / 0.25) * 0.82
                : 0.82;
  return { r, opacity };
}

function tick(t: number) {
  if (_lastT === 0) _lastT = t;
  const dt = Math.min((t - _lastT) / 1000, 0.05);
  _lastT = t;

  if (isOn.value) {
    _phase = (_phase + dt * 0.52) % 1;
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

onMounted(() => { _rafId = requestAnimationFrame(tick); });
onUnmounted(() => { if (_rafId) cancelAnimationFrame(_rafId); });
</script>

<style scoped>
.node-wrap { width: 100%; height: 100%; overflow: visible; }
svg { overflow: visible; }
svg * { transition: none !important; animation: none !important; }
</style>
