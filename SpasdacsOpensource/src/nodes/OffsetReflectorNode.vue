<template>
  <div class="node-wrap" :style="{ opacity: d.opacity ?? 1 }">
    <!--
      Offset-Feed Parabolic Reflector — 160×110 viewBox.
      TWO animation zones:
        Feed zone  — arcs between focal point and dish concave surface.
        Beam zone  — parallel beam arcs to the right of the dish aperture.
      TX : feed arcs expand focal→dish (sweep=1), beam arcs expand dish→right (sweep=1)
      RX : feed arcs contract dish→focal (sweep=0), beam arcs contract right→dish (sweep=0)
      TX+RX : both simultaneously (cyan TX + green RX)
    -->
    <svg :width="w" :height="h" viewBox="0 0 160 110"
         preserveAspectRatio="none"
         xmlns="http://www.w3.org/2000/svg" overflow="visible">

      <defs>
        <linearGradient :id="`or-horn-${uid}`" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   :stop-color="isOn ? '#2a5880' : '#1a2e44'"/>
          <stop offset="100%" :stop-color="isOn ? '#1e3a5a' : '#121e30'"/>
        </linearGradient>
        <filter :id="`or-glow-${uid}`" x="-80%" y="-80%" width="260%" height="260%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="2.0" result="b"/>
          <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
      </defs>

      <!-- ── Title (upper-right) ───────────────────────────────────────── -->
      <SvgMultilineText v-if="titleText"
        :text="titleText" :x="titleX" :y="titleY" :centered="false"
        :font-size="titleFontSz" font-weight="700" letter-spacing="1.0"
        font-family="'Courier New', monospace"
        :fill="titleFontColor" :text-anchor="titleAnchor"
      />

      <!-- ── Asymmetric parabolic reflector ────────────────────────────── -->
      <path d="M 78,10 C 15,10 10,55 50,98"
        fill="none"
        :stroke="isOn ? '#1e4060' : '#162844'"
        :stroke-width="isOn ? 7 : 6"
        stroke-linecap="round"/>
      <path d="M 78,10 C 15,10 10,55 50,98"
        fill="none"
        :stroke="isOn ? '#4a9eff' : '#3a5878'"
        :stroke-width="isOn ? 3.2 : 2.4"
        stroke-linecap="round"/>
      <path d="M 74,13 C 18,13 14,52 54,94"
        fill="none"
        :stroke="isOn ? '#00ccff' : '#2a4a6a'"
        stroke-width="0.8"
        stroke-linecap="round"
        :opacity="isOn ? 0.55 : 0.35"/>

      <!-- Rib glints (ON only) -->
      <template v-if="isOn">
        <path v-for="t in [0.25, 0.5, 0.75]" :key="t"
          :d="ribPath(t)"
          fill="none" stroke="#00ccff"
          stroke-width="0.6" opacity="0.28"
          stroke-linecap="round"/>
      </template>

      <!-- ── Feed horn ──────────────────────────────────────────────────── -->
      <g :transform="`translate(${HORN_X},${HORN_Y}) rotate(${HORN_ANGLE})`">
        <rect x="-16" y="-3" width="16" height="6"
          :fill="`url(#or-horn-${uid})`"
          :stroke="isOn ? '#3a78b8' : '#2a4a6a'"
          stroke-width="0.8" rx="0.5"/>
        <polygon points="0,-3 0,3 18,10 18,-10"
          :fill="`url(#or-horn-${uid})`"
          :stroke="isOn ? '#4a9eff' : '#2a4a6a'"
          stroke-width="0.9" stroke-linejoin="round"/>
        <line x1="18" y1="-10" x2="18" y2="10"
          :stroke="isOn ? '#00aaff' : '#2a5070'"
          :stroke-width="isOn ? 1.8 : 1.2"
          stroke-linecap="round"/>
        <rect x="-20" y="-4.5" width="5" height="9"
          :fill="isOn ? '#1e3a5a' : '#121e30'"
          :stroke="isOn ? '#2a5888' : '#1a3050'"
          stroke-width="0.7" rx="0.4"/>
      </g>

      <!-- ── Focal point dot ────────────────────────────────────────────── -->
      <circle :cx="focalX" :cy="focalY" r="2.2"
        :fill="isOn ? '#00ccff' : '#1e3a55'"
        :stroke="isOn ? '#00e5ff' : '#2a4a65'"
        stroke-width="0.7"
        :opacity="isOn ? 0.85 : 0.5"/>
      <text v-if="isOn" :x="focalX + 4" :y="focalY - 4" font-size="6"
            font-family="'Courier New', monospace" fill="#7090b0" opacity="0.7">F</text>

      <!-- ── Mode badge ──────────────────────────────────────────────────── -->
      <text v-if="isOn" x="120" y="107" text-anchor="middle" font-size="5.5"
            font-family="'Courier New', monospace" font-weight="700"
            :fill="modeColor" opacity="0.85">{{ mode }}</text>

      <!-- ══ TX animation (cyan) ══════════════════════════════════════════ -->
      <template v-if="isOn">
        <g v-for="(wave, i) in txWaves" :key="`or-tx-${i}`">
          <!-- Feed zone: arcs expand FROM focal TOWARD dish (sweep=1) -->
          <path :d="hornEmitPath(wave.feedR, false)"
                fill="none" stroke="#00ccff"
                :stroke-width="1.5"
                stroke-linecap="round"
                :filter="`url(#or-glow-${uid})`"
                :opacity="wave.opacity * 0.65"/>
          <!-- Beam zone: parallel arcs expand rightward from aperture (sweep=1) -->
          <path :d="reflMainPath(wave.beamR, false)"
                fill="none" stroke="#00e5ff"
                :stroke-width="2.2 - wave.beamR * 0.016"
                stroke-linecap="round"
                :filter="`url(#or-glow-${uid})`"
                :opacity="wave.opacity * 0.90"/>
        </g>
      </template>

      <!-- ══ RX animation (green) ═════════════════════════════════════════ -->
      <template v-if="isOn">
        <g v-for="(wave, i) in rxWaves" :key="`or-rx-${i}`">
          <!-- Beam zone: arcs contract FROM right TOWARD dish (sweep=0) -->
          <path :d="reflMainPath(wave.beamR, true)"
                fill="none" stroke="#44ff88"
                :stroke-width="2.2 - wave.beamR * 0.016"
                stroke-linecap="round"
                :filter="`url(#or-glow-${uid})`"
                :opacity="wave.opacity * 0.90"/>
          <!-- Feed zone: arcs contract FROM dish TOWARD focal (sweep=0) -->
          <path :d="hornEmitPath(wave.feedR, true)"
                fill="none" stroke="#44ff88"
                :stroke-width="1.5"
                stroke-linecap="round"
                :filter="`url(#or-glow-${uid})`"
                :opacity="wave.opacity * 0.65"/>
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

// ── Dish bezier ───────────────────────────────────────────────────────────────
const D_P0 = { x: 78, y: 10 };
const D_P1 = { x: 15, y: 10 };
const D_P2 = { x: 10, y: 55 };
const D_P3 = { x: 50, y: 98 };

// ── Horn / Feed geometry ──────────────────────────────────────────────────────
const HORN_X     = 108;
const HORN_Y     = 82;
const HORN_ANGLE = -152;
const HORN_RAD   = HORN_ANGLE * (Math.PI / 180);

const focalX = HORN_X + 18 * Math.cos(HORN_RAD);   // ≈ 92.1
const focalY = HORN_Y + 18 * Math.sin(HORN_RAD);   // ≈ 73.6

// ── Feed-zone arc path (horn ↔ dish) ──────────────────────────────────────────
// Direction from focal toward dish centre (vertex ≈ 25,38)
const emitDirAngle = Math.atan2(38 - focalY, 25 - focalX);   // ≈ -152°
const EMIT_HALF    = 32 * (Math.PI / 180);

// rx=false → sweep=1: arcs diverge FROM focal TOWARD dish  (TX)
// rx=true  → sweep=0: arcs converge FROM dish TOWARD focal (RX)
function hornEmitPath(r: number, rx = false): string {
  const a1 = emitDirAngle - EMIT_HALF;
  const a2 = emitDirAngle + EMIT_HALF;
  const x1 = (focalX + r * Math.cos(a1)).toFixed(1);
  const y1 = (focalY + r * Math.sin(a1)).toFixed(1);
  const x2 = (focalX + r * Math.cos(a2)).toFixed(1);
  const y2 = (focalY + r * Math.sin(a2)).toFixed(1);
  return `M ${x1},${y1} A ${r},${r} 0 0,${rx ? 0 : 1} ${x2},${y2}`;
}

// ── Beam-zone arc path (dish aperture ↔ right) ────────────────────────────────
const REFL_APX = 64;
const REFL_APY = 54;

// rx=false → sweep=1: arcs expand rightward (TX outgoing beam)
// rx=true  → sweep=0: arcs contract leftward (RX incoming beam)
function reflMainPath(r: number, rx = false): string {
  const ang = 10 * (Math.PI / 180);
  const y1  = (REFL_APY - r * Math.sin(ang)).toFixed(1);
  const y2  = (REFL_APY + r * Math.sin(ang)).toFixed(1);
  const xp  = (REFL_APX + r * Math.cos(ang)).toFixed(1);
  return `M ${xp},${y1} A ${r},${r} 0 0,${rx ? 0 : 1} ${xp},${y2}`;
}

// ── Rib glints ────────────────────────────────────────────────────────────────
function ribPath(t: number): string {
  const mt = 1 - t;
  const bx = mt*mt*mt*D_P0.x + 3*mt*mt*t*D_P1.x + 3*mt*t*t*D_P2.x + t*t*t*D_P3.x;
  const by = mt*mt*mt*D_P0.y + 3*mt*mt*t*D_P1.y + 3*mt*t*t*D_P2.y + t*t*t*D_P3.y;
  const tx = 3*(mt*mt*(D_P1.x-D_P0.x) + 2*mt*t*(D_P2.x-D_P1.x) + t*t*(D_P3.x-D_P2.x));
  const ty = 3*(mt*mt*(D_P1.y-D_P0.y) + 2*mt*t*(D_P2.y-D_P1.y) + t*t*(D_P3.y-D_P2.y));
  const len = Math.sqrt(tx*tx + ty*ty) || 1;
  const nx =  ty / len;
  const ny = -tx / len;
  const RL = 7;
  return `M ${(bx + nx*RL).toFixed(1)},${(by + ny*RL).toFixed(1)} L ${(bx - nx*RL*0.25).toFixed(1)},${(by - ny*RL*0.25).toFixed(1)}`;
}

// ── rAF wave animation ─────────────────────────────────────────────────────────
// Each Wave carries two radii so feed zone and beam zone animate together.
interface Wave { feedR: number; beamR: number; opacity: number; }
const txWaves = ref<Wave[]>([]);
const rxWaves = ref<Wave[]>([]);

// Feed zone: arcs from focal toward dish — max r kept < 30 to stay in feed space
const FEED_MIN = 5;
const FEED_MAX = 28;
// Beam zone: parallel beam to the right of dish aperture
const BEAM_MIN = 8;
const BEAM_MAX = 72;
const N_WAVES  = 3;

let _rafId = 0;
let _lastT = 0;
let _phase = 0;

function buildWave(i: number, rx: boolean): Wave {
  const p = (_phase + i / N_WAVES) % 1;
  const feedR = rx
    ? FEED_MAX - p * (FEED_MAX - FEED_MIN)   // shrink toward focal
    : FEED_MIN + p * (FEED_MAX - FEED_MIN);  // grow toward dish
  const beamR = rx
    ? BEAM_MAX - p * (BEAM_MAX - BEAM_MIN)   // shrink toward dish
    : BEAM_MIN + p * (BEAM_MAX - BEAM_MIN);  // grow rightward
  const opacity = p < 0.18 ? (p / 0.18) * 0.88
                : p > 0.75 ? ((1 - p) / 0.25) * 0.88
                : 0.88;
  return { feedR, beamR, opacity };
}

function tick(t: number) {
  if (_lastT === 0) _lastT = t;
  const dt = Math.min((t - _lastT) / 1000, 0.05);
  _lastT = t;

  if (isOn.value) {
    _phase = (_phase + dt * 0.44) % 1;
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
