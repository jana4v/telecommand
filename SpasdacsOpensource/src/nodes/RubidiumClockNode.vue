<template>
  <div class="node-wrap" :style="{ opacity: d.opacity ?? 1 }">
    <!--
      Fixed viewBox 0 0 160 120 — all layout coords are absolute.
      The SVG scales automatically when the node is resized.
    -->
    <svg :width="w" :height="h" viewBox="0 0 160 120"
         xmlns="http://www.w3.org/2000/svg" overflow="visible">

      <defs>
        <!-- Nucleus radial gradient — colour changes with state -->
        <radialGradient :id="`rbc-nuc-${uid}`" cx="35%" cy="35%" r="65%">
          <stop offset="0%"   :stop-color="nucHighlight"/>
          <stop offset="55%"  :stop-color="nucColor"/>
          <stop offset="100%" stop-color="#040608"/>
        </radialGradient>

        <!-- Metallic outer frame gradient -->
        <linearGradient :id="`rbc-frame-${uid}`" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%"   stop-color="#a8a8b8"/>
          <stop offset="25%"  stop-color="#68687a"/>
          <stop offset="50%"  stop-color="#d8d8e8"/>
          <stop offset="75%"  stop-color="#68687a"/>
          <stop offset="100%" stop-color="#a8a8b8"/>
        </linearGradient>

        <!-- Soft glow filter for electrons and nucleus pulse -->
        <filter :id="`rbc-glow-${uid}`" x="-80%" y="-80%" width="260%" height="260%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="2.2" result="b"/>
          <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
      </defs>

      <!-- ── Outer frame ──────────────────────────────────────────────────── -->
      <rect x="1" y="1" width="158" height="118" rx="6" fill="#0d1117"
        :stroke="d.isInvalid ? '#e74c3c' : `url(#rbc-frame-${uid})`"
        stroke-width="3"
      />

      <!-- ── Title bar — bound to node Name field ─────────────────────────── -->
      <SvgMultilineText v-if="titleText"
        :text="titleText" :x="titleX" :y="titleY" :centered="false"
        :font-size="titleFontSz" font-weight="700" letter-spacing="1.5"
        font-family="'Courier New', monospace" :fill="titleFontColor" :text-anchor="titleAnchor"
      />

      <!-- ── Status LEDs — top strip ─────────────────────────────────────── -->
      <!-- ON indicator — lit whenever device is powered (ON or LOCK) -->
      <circle cx="18" cy="14" r="4.2"
        :fill="isPowered ? '#27ae60' : '#131e13'"
        :stroke="isPowered ? '#3dca80' : '#1e3020'"
        stroke-width="0.8"
      />
      <text x="18" y="24" text-anchor="middle" font-size="5" fill="#6b7280">ON</text>

      <!-- LOCK indicator -->
      <circle cx="34" cy="14" r="4.2"
        :fill="isLocked ? '#d4860a' : '#1e1608'"
        :stroke="isLocked ? '#f0a030' : '#3a2a10'"
        stroke-width="0.8"
      />
      <text x="34" y="24" text-anchor="middle" font-size="5" fill="#6b7280">LK</text>

      <!-- INV indicator (right side) -->
      <circle cx="142" cy="14" r="4.2"
        :fill="d.isInvalid ? '#e74c3c' : '#1e0808'"
        :stroke="d.isInvalid ? '#ff6b6b' : '#3a1010'"
        stroke-width="0.8"
      />
      <text x="142" y="24" text-anchor="middle" font-size="5" fill="#6b7280">INV</text>

      <!-- Title / LED separator -->
      <line x1="7" y1="21" x2="153" y2="21"
            stroke="rgba(100,140,200,0.20)" stroke-width="0.7"/>

      <!-- ── Atom visual — orbit ellipses ────────────────────────────────── -->
      <!-- Three orbital planes at 0°, 60°, 120° tilt.
           When OFF, render grey static rings; otherwise coloured animated. -->
      <ellipse
        v-for="(tilt, i) in [0, 60, 120]" :key="`orb-${i}`"
        :cx="CX" :cy="CY" :rx="OA" :ry="OB"
        fill="none"
        :stroke="isOff ? '#2a2a40' : orbitStroke"
        :stroke-width="isOff ? 0.7 : 1.0"
        :opacity="isOff ? 0.45 : 0.60"
        :transform="`rotate(${tilt}, ${CX}, ${CY})`"
      />

      <!-- ── Pump-laser beams (ON & not LOCK) ───────────────────────────── -->
      <template v-if="isOn">
        <line :x1="9"   :y1="CY - 3" :x2="CX - 22" :y2="CY"
              stroke="#00e5ff" stroke-width="1.3" stroke-dasharray="4,3"
              stroke-linecap="round" :opacity="0.65 + 0.2 * laserPulse"/>
        <line :x1="151" :y1="CY - 3" :x2="CX + 22" :y2="CY"
              stroke="#00e5ff" stroke-width="1.3" stroke-dasharray="4,3"
              stroke-linecap="round" :opacity="0.65 + 0.2 * laserPulse"/>
        <!-- laser glow tips -->
        <circle :cx="CX - 22" :cy="CY" r="2.5" fill="#00e5ff" :opacity="0.5 + 0.35 * laserPulse"/>
        <circle :cx="CX + 22" :cy="CY" r="2.5" fill="#00e5ff" :opacity="0.5 + 0.35 * laserPulse"/>
      </template>

      <!-- ── Frequency reference sine wave (LOCK state only) ───────────── -->
      <path v-if="isLocked"
        :d="freqWavePath"
        fill="none" stroke="#d4860a" stroke-width="1.4"
        stroke-linecap="round" stroke-linejoin="round" opacity="0.80"
      />
      <!-- Frequency stability label -->
      <text v-if="isLocked" x="80" y="108" text-anchor="middle"
            font-size="6" font-family="'Courier New',monospace" fill="#d4860a" opacity="0.80">
        FREQ LOCK
      </text>

      <!-- ── Nucleus ─────────────────────────────────────────────────────── -->
      <!-- Outer pulse ring — visible only when not off -->
      <circle v-if="!isOff"
        :cx="CX" :cy="CY" :r="7 + pulseR"
        fill="none" :stroke="orbitStroke"
        :stroke-width="1.5 - pulseR * 0.12"
        :opacity="0.65 - pulseR * 0.08"
      />
      <!-- Nucleus body -->
      <circle :cx="CX" :cy="CY" r="7"
        :fill="`url(#rbc-nuc-${uid})`"
        :stroke="isOff ? '#2a2a42' : orbitStroke"
        stroke-width="1.0"
      />

      <!-- ── Moving electrons — hidden in OFF state ─────────────────────── -->
      <template v-if="!isOff">
        <g v-for="(ep, i) in electronPositions" :key="`e-${i}`"
           :filter="`url(#rbc-glow-${uid})`">
          <!-- Electron glow halo -->
          <circle :cx="ep.x" :cy="ep.y" r="4.8"
            :fill="electronColor" opacity="0.18"/>
          <!-- Electron dot -->
          <circle :cx="ep.x" :cy="ep.y" r="3"
            :fill="electronColor" opacity="0.95"/>
          <!-- Electron specular highlight -->
          <circle :cx="ep.x - 0.8" :cy="ep.y - 0.8" r="0.9"
            fill="rgba(255,255,255,0.55)"/>
        </g>
      </template>

      <!-- ── Temperature readout ────────────────────────────────────────── -->
      <text x="154" y="116"
            text-anchor="end"
            :font-size="tempFontSz" font-weight="600"
            font-family="'Digital7','Courier New',monospace"
            :fill="isOff ? '#3a3a52' : orbitStroke">
        {{ tempText }}
      </text>

    </svg>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from "vue";
import { useNodeData } from "./useNodeData";
import SvgMultilineText from "./SvgMultilineText.vue";
import { useTitlePosition } from "./useTitlePosition";

// ── Node data + size ──────────────────────────────────────────────────────────
const { d, w, h } = useNodeData(160, 120);

// Unique ID suffix so gradient/filter ids don't collide across instances
const uid = ref(Math.random().toString(36).slice(2, 8));

// ── Title + font sizes ────────────────────────────────────────────────────────
const titleText   = computed(() => (d.value.name   as string) ?? "");
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
const tempFontSz  = computed(() => (d.value.tempFontSize  as number) ?? 9);

// ── Atom geometry constants (fixed viewBox 0 0 160 120) ───────────────────────
const CX = 80;   // nucleus centre X
const CY = 64;   // nucleus centre Y
const OA = 33;   // orbit semi-major axis
const OB = 13;   // orbit semi-minor axis

// ── State derived from telemetry data ─────────────────────────────────────────
// isPowered: position ≥ 1  (device is on regardless of lock status)
// isLocked:  isPowered AND isLocked flag  (only meaningful when powered)
// isOn:      powered but NOT yet locked  (fast pumping animation)
// isOff:     position = 0  (no animation at all)
const isPowered = computed(() => ((d.value.position as number) ?? 0) > 0);
const isLocked  = computed(() => isPowered.value && !!(d.value.isLocked));
const isOn      = computed(() => isPowered.value && !isLocked.value);
const isOff     = computed(() => !isPowered.value);

// ── State-driven colours ──────────────────────────────────────────────────────
const orbitStroke  = computed(() => isLocked.value ? "#d4860a" : "#00ccff");
const electronColor= computed(() => isLocked.value ? "#ffc060" : "#00e5ff");
const nucColor     = computed(() =>
  isOff.value ? "#1a1a2e" : isLocked.value ? "#7a4200" : "#0a3a72"
);
const nucHighlight = computed(() =>
  isOff.value ? "#3a3a5a" : isLocked.value ? "#f0a030" : "#4ab8ff"
);

// ── rAF animation state ───────────────────────────────────────────────────────
const angle0   = ref(0);    // master orbital angle (degrees) for electron 0
const pulseR   = ref(0);    // nucleus pulse ring extra radius (0–3)
const laserPulse = ref(0);  // 0–1 normalised for laser intensity
let _rafId = 0;
let _lastT = 0;
let _phaseT = 0;

function tick(t: number) {
  if (_lastT === 0) _lastT = t;
  const dt = Math.min((t - _lastT) / 1000, 0.05); // cap at 50 ms to avoid jumps
  _lastT = t;
  _phaseT += dt;

  if (isLocked.value) {
    // LOCK — slow stable orbit: 45°/s gold glow
    angle0.value  = (angle0.value + 45 * dt) % 360;
    pulseR.value  = 1.8 + 1.2 * Math.sin(_phaseT * 1.4);
    laserPulse.value = 0;
  } else if (isOn.value) {
    // ON — fast electron pumping: 220°/s cyan flicker
    angle0.value  = (angle0.value + 220 * dt) % 360;
    pulseR.value  = 1.2 + 0.8 * Math.sin(_phaseT * 5.5);
    laserPulse.value = 0.5 + 0.5 * Math.sin(_phaseT * 8.0);
  } else {
    // OFF — freeze angle, collapse pulse
    pulseR.value   = 0;
    laserPulse.value = 0;
  }

  _rafId = requestAnimationFrame(tick);
}

onMounted(() => {
  _rafId = requestAnimationFrame(tick);
});
onUnmounted(() => {
  if (_rafId) cancelAnimationFrame(_rafId);
});

// ── Orbital positions ─────────────────────────────────────────────────────────
// Each orbital plane has a tilt: 0°, 60°, 120°
// Each electron starts 0° ahead on its own orbit
// All electrons advance at the same angular speed
const TILTS = [0, 60, 120]; // degrees

function orbitPoint(angleDeg: number, tiltDeg: number) {
  const a    = angleDeg * (Math.PI / 180);
  const tilt = tiltDeg  * (Math.PI / 180);
  const lx   = OA * Math.cos(a);
  const ly   = OB * Math.sin(a);
  return {
    x: CX + lx * Math.cos(tilt) - ly * Math.sin(tilt),
    y: CY + lx * Math.sin(tilt) + ly * Math.cos(tilt),
  };
}

const electronPositions = computed(() =>
  TILTS.map((tilt, i) => orbitPoint(angle0.value + i * 120, tilt))
);

// ── Frequency wave path — rendered in LOCK state ──────────────────────────────
// A sine-wave-like path drawn at y≈90 across most of the node width.
const freqWavePath = computed(() => {
  const y0 = 91;
  const amp = 4.5;
  const steps = 8;
  const x0 = 12, x1 = 148;
  const dx = (x1 - x0) / steps;
  let d = `M ${x0},${y0}`;
  for (let i = 0; i < steps; i++) {
    const xa = x0 + i * dx + dx / 3;
    const ya = y0 + (i % 2 === 0 ? -amp : amp);
    const xb = x0 + i * dx + 2 * dx / 3;
    const yb = y0 + (i % 2 === 0 ? -amp : amp);
    const xc = x0 + (i + 1) * dx;
    d += ` C ${xa.toFixed(1)},${ya.toFixed(1)} ${xb.toFixed(1)},${yb.toFixed(1)} ${xc.toFixed(1)},${y0}`;
  }
  return d;
});

// ── Temperature readout ───────────────────────────────────────────────────────
const tempText = computed(() => {
  const t = d.value.temperature as number | undefined | null;
  return (t !== undefined && t !== null) ? `${t.toFixed(1)} °C` : "--- °C";
});
</script>

<style scoped>
.node-wrap { width: 100%; height: 100%; overflow: visible; }
svg { overflow: visible; }
svg * { transition: none !important; animation: none !important; }
</style>
