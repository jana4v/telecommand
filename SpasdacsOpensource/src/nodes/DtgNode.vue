<template>
  <div class="node-wrap" :style="{ opacity: d.opacity ?? 1 }">
    <svg :width="w" :height="h" :viewBox="`0 0 ${w} ${h}`" xmlns="http://www.w3.org/2000/svg" overflow="visible">
      <defs>
        <linearGradient :id="`dtg-ring-${uid}`" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%"   stop-color="#c8c8da"/>
          <stop offset="20%"  stop-color="#686878"/>
          <stop offset="48%"  stop-color="#e4e4f2"/>
          <stop offset="74%"  stop-color="#565666"/>
          <stop offset="100%" stop-color="#b8b8ca"/>
        </linearGradient>
        <radialGradient :id="`dtg-body-${uid}`" cx="40%" cy="38%" r="62%">
          <stop offset="0%"   stop-color="#1a2c42"/>
          <stop offset="55%"  stop-color="#0c1c2e"/>
          <stop offset="100%" stop-color="#060f1c"/>
        </radialGradient>
        <linearGradient :id="`dtg-gimbal-${uid}`" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%"   stop-color="#5a8ab0"/>
          <stop offset="50%"  stop-color="#2a4a6a"/>
          <stop offset="100%" stop-color="#4a7a9a"/>
        </linearGradient>
        <radialGradient :id="`dtg-rotor-${uid}`" cx="38%" cy="35%" r="65%">
          <stop offset="0%"   stop-color="#1e3050"/>
          <stop offset="65%"  stop-color="#0e1e32"/>
          <stop offset="100%" stop-color="#060e1c"/>
        </radialGradient>
        <radialGradient :id="`dtg-cap-${uid}`" cx="32%" cy="30%" r="70%">
          <stop offset="0%"   stop-color="#94b6d8"/>
          <stop offset="45%"  stop-color="#3c5a7a"/>
          <stop offset="100%" stop-color="#182438"/>
        </radialGradient>
        <linearGradient :id="`dtg-frame-${uid}`" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%"   stop-color="#a8a8b8"/>
          <stop offset="25%"  stop-color="#68687a"/>
          <stop offset="50%"  stop-color="#d8d8e8"/>
          <stop offset="75%"  stop-color="#68687a"/>
          <stop offset="100%" stop-color="#a8a8b8"/>
        </linearGradient>
      </defs>


      <line :x1="frameO + frameSw" :y1="topH"
        :x2="w - frameO - frameSw" :y2="topH"
        stroke="rgba(100,140,200,0.22)" :stroke-width="frameSw * 0.28"
      />

      <!-- ══ GYROSCOPE VISUAL ═══════════════════════════════════════════════ -->

      <!-- Outer glow halo -->
      <circle :cx="cx" :cy="cy" :r="r1 + r1 * 0.08"
        fill="none" :stroke="gyroColor" :stroke-width="r1 * 0.028" opacity="0.20"
      />
      <!-- Outer metallic rim -->
      <circle :cx="cx" :cy="cy" :r="r1" :fill="`url(#dtg-ring-${uid})`"/>
      <!-- Outer body -->
      <circle :cx="cx" :cy="cy" :r="r1 - rim1" :fill="`url(#dtg-body-${uid})`"/>

      <!-- Speed arc track -->
      <path :d="arcTrack"
        fill="none" stroke="#1a2d42" :stroke-width="arcStroke" stroke-linecap="round"
      />
      <!-- Speed arc fill -->
      <path v-if="speedFraction > 0.005" :d="arcFill"
        fill="none" :stroke="gyroColor" :stroke-width="arcStroke" stroke-linecap="round"
        :style="`filter: drop-shadow(0 0 ${arcStroke}px ${gyroColor})`"
      />

      <!-- Gimbal gap separator -->
      <circle :cx="cx" :cy="cy" :r="r2 + gimbalGap"
        fill="none" stroke="#070e1c" :stroke-width="gimbalGap * 2.2"
      />
      <!-- Middle gimbal ring -->
      <circle :cx="cx" :cy="cy" :r="r2"
        fill="none" :stroke="`url(#dtg-gimbal-${uid})`" :stroke-width="rim2"
      />
      <!-- Gimbal inner fill -->
      <circle :cx="cx" :cy="cy" :r="r2 - rim2 * 0.6 - gimbalGap"
        fill="#060d1a"
      />

      <!-- ── Rotating rotor disc ─────────────────────────────────────── -->
      <g :transform="`rotate(${rotorAngle}, ${cx}, ${cy})`">
        <circle :cx="cx" :cy="cy" :r="r3" :fill="`url(#dtg-rotor-${uid})`"/>
        <!-- Rotor diagonal reference lines -->
        <line :x1="cx - r3 * 0.80" :y1="cy - r3 * 0.80"
              :x2="cx + r3 * 0.80" :y2="cy + r3 * 0.80"
          :stroke="gyroColor" :stroke-width="r3 * 0.038" opacity="0.35" stroke-linecap="round"
        />
        <line :x1="cx + r3 * 0.80" :y1="cy - r3 * 0.80"
              :x2="cx - r3 * 0.80" :y2="cy + r3 * 0.80"
          :stroke="gyroColor" :stroke-width="r3 * 0.038" opacity="0.35" stroke-linecap="round"
        />
        <!-- Rotor rim inner highlight -->
        <circle :cx="cx" :cy="cy" :r="r3"
          fill="none" stroke="rgba(80,130,190,0.18)" :stroke-width="r3 * 0.045"
        />
      </g>

      <!-- ── Fixed 2-DOF axis indicators (don't rotate) ────────────── -->
      <!-- Pitch axis (horizontal) — amber -->
      <line :x1="cx - r3 * 0.80" :y1="cy" :x2="cx + r3 * 0.80" :y2="cy"
        stroke="#f39c12" :stroke-width="r3 * 0.048" opacity="0.82" stroke-linecap="round"
        stroke-dasharray="3,3"
      />
      <!-- Roll axis (vertical) — teal -->
      <line :x1="cx" :y1="cy - r3 * 0.80" :x2="cx" :y2="cy + r3 * 0.80"
        stroke="#1abc9c" :stroke-width="r3 * 0.048" opacity="0.82" stroke-linecap="round"
        stroke-dasharray="3,3"
      />
      <!-- Pitch axis endpoint dots -->
      <circle :cx="cx - r3 * 0.80" :cy="cy" :r="r3 * 0.070" fill="#f39c12" opacity="0.90"/>
      <circle :cx="cx + r3 * 0.80" :cy="cy" :r="r3 * 0.070" fill="#f39c12" opacity="0.90"/>
      <!-- Roll axis endpoint dots -->
      <circle :cx="cx" :cy="cy - r3 * 0.80" :r="r3 * 0.070" fill="#1abc9c" opacity="0.90"/>
      <circle :cx="cx" :cy="cy + r3 * 0.80" :r="r3 * 0.070" fill="#1abc9c" opacity="0.90"/>

      <!-- Centre hub cap -->
      <circle :cx="cx" :cy="cy" :r="capR"
        :fill="`url(#dtg-cap-${uid})`" :stroke="gyroColor" :stroke-width="r1 * 0.018" opacity="0.95"
      />

      <!-- Invalid overlay -->
      <circle v-if="d.isInvalid"
        :cx="cx" :cy="cy" :r="r1"
        fill="rgba(231,76,60,0.22)" stroke="#e74c3c"
        :stroke-width="r1 * 0.048" stroke-dasharray="7,4"
      />

      <!-- ══ RIGHT COLUMN: Speed + Temperature ══════════════════════════════ -->
      <text :x="rightCx" :y="cy - tempValFsz * 0.80"
        text-anchor="middle" dominant-baseline="middle"
        :font-size="tempValFsz" font-weight="700"
        font-family="'Digital7', 'Courier New', monospace"
        :fill="gyroColor" opacity="0.88"
      >{{ speedText }}</text>
      <text :x="rightCx" :y="cy + tempValFsz * 0.80"
        text-anchor="middle" dominant-baseline="middle"
        :font-size="tempValFsz" font-weight="700"
        font-family="'Digital7', 'Courier New', monospace"
        :fill="gyroColor"
      >{{ tempVal }}°C</text>

      <!-- ══ BOTTOM: Pitch | Roll ════════════════════════════════════════════ -->
      <line :x1="frameO + frameSw" :y1="h - botH"
        :x2="w - frameO - frameSw" :y2="h - botH"
        stroke="rgba(100,140,200,0.22)" :stroke-width="frameSw * 0.28"
      />
      <!-- Vertical divider -->
      <line :x1="fullCx" :y1="h - botH + botH * 0.12"
        :x2="fullCx" :y2="h - botH * 0.12"
        stroke="rgba(100,140,200,0.22)" :stroke-width="frameSw * 0.28"
      />
      <!-- Pitch label + value -->
      <text :x="w * 0.25" :y="h - botH + botH * 0.54"
        text-anchor="middle" dominant-baseline="middle"
        fill="#f39c12"
      ><tspan :font-size="axisLblFsz" font-weight="600" font-family="sans-serif" opacity="0.72"
        >P </tspan><tspan :font-size="axisFontSz" font-weight="700"
        font-family="'Digital7', 'Courier New', monospace"
        >{{ pitchText }}</tspan></text>
      <!-- Roll label + value -->
      <text :x="w * 0.75" :y="h - botH + botH * 0.54"
        text-anchor="middle" dominant-baseline="middle"
        fill="#1abc9c"
      ><tspan :font-size="axisLblFsz" font-weight="600" font-family="sans-serif" opacity="0.72"
        >R </tspan><tspan :font-size="axisFontSz" font-weight="700"
        font-family="'Digital7', 'Courier New', monospace"
        >{{ rollText }}</tspan></text>

      <!-- ══ METALLIC FRAME ═════════════════════════════════════════════════ -->
      <rect :x="frameO" :y="frameO" :width="w - frameSw" :height="h - frameSw"
        fill="none"
        :stroke="d.isInvalid ? '#e74c3c' : `url(#dtg-frame-${uid})`"
        :stroke-width="frameSw"
        :rx="frameRx"
      />
    </svg>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from "vue";
import { useNodeData }  from "./useNodeData";
import { useGsapSpin }  from "./useGsapSpin";
import { useGsapTween } from "./useGsapTween";

const { d, w, h } = useNodeData(255, 190);
const uid = ref(Math.random().toString(36).slice(2, 8));

// ── Metallic frame ─────────────────────────────────────────────────────────
const frameSw = computed(() => Math.min(w.value, h.value) * 0.038);
const frameO  = computed(() => frameSw.value * 0.5);
const frameRx = computed(() => Math.min(w.value, h.value) * 0.060);

// ── Layout zones ───────────────────────────────────────────────────────────
const topH   = computed(() => h.value * 0.155);
const botH   = computed(() => h.value * 0.178);
const midGap = computed(() => h.value * 0.026);
const fullCx = computed(() => w.value / 2);

// Right column for speed + temp
const rightFrac = 0.300;
const rightW    = computed(() => w.value * rightFrac);
const rightCx   = computed(() => w.value - rightW.value / 2 - rightW.value * 0.22);

// ── Wheel zone ─────────────────────────────────────────────────────────────
const whlW = computed(() => w.value - rightW.value - midGap.value);
const whlH = computed(() => h.value - topH.value - botH.value - midGap.value * 2);
const cx   = computed(() => whlW.value / 2 - whlW.value * 0.06);
const cy   = computed(() => topH.value + midGap.value + whlH.value / 2);

// ── Ring sizes ─────────────────────────────────────────────────────────────
const r1         = computed(() => Math.min(whlW.value, whlH.value) / 2 - 3);
const rim1       = computed(() => r1.value * 0.115);
const r2         = computed(() => r1.value * 0.760);
const rim2       = computed(() => r2.value * 0.090);
const gimbalGap  = computed(() => r1.value * 0.030);
const r3         = computed(() => (r2.value - rim2.value) * 0.70);
const capR       = computed(() => r3.value * 0.20);
const arcR       = computed(() => r1.value - rim1.value / 2);
const arcStroke  = computed(() => r1.value * 0.082);

// ── Telemetry ──────────────────────────────────────────────────────────────
const speed = computed(() => Math.abs((d.value.dtgSpeed ?? 0) as number));

// GSAP-driven continuous rotor spin — DTG always rotates CW, max 8000 RPM
const rotorAngle    = useGsapSpin(() => speed.value, () => 1, 8000);
// Smooth arc-fill transition
const speedFraction = useGsapTween(() => Math.min(speed.value / 8000, 1), 1.0, "power1.inOut");
const gyroColor     = computed(() => String(d.value.statusColor || "#4a9eff"));

const speedText = computed(() => {
  const raw = (d.value.dtgSpeedRaw ?? d.value.dtgSpeed ?? 0) as number;
  return Math.abs(raw).toFixed(0) + " RPM";
});
const pitchText = computed(() => {
  const p = d.value.dtgPitch;
  return (p !== undefined && p !== null) ? (p as number).toFixed(2) + "°" : "--.-°";
});
const rollText = computed(() => {
  const r = d.value.dtgRoll;
  return (r !== undefined && r !== null) ? (r as number).toFixed(2) + "°" : "--.-°";
});
const tempVal = computed(() => {
  const t = d.value.dtgTemperature;
  return (t !== undefined && t !== null) ? (t as number).toFixed(1) : "---";
});
const titleText = computed(() => (d.value.name as string) || "DTG");

// ── Font sizes ─────────────────────────────────────────────────────────────
const titleFontSz = computed(() => (d.value.titleFontSize as number | undefined) ?? topH.value * 0.62);
const titleFontColor = computed(() => (d.value.titleFontColor as string) || "#94a3b8");
const axisFontSz  = computed(() => botH.value  * 0.52);
const axisLblFsz  = computed(() => axisFontSz.value * 0.68);
const tempValFsz  = computed(() => Math.min(whlH.value * 0.58, r1.value * 1.15) * 0.36);

// ── Speed arc ──────────────────────────────────────────────────────────────
function makeArc(startDeg: number, spanDeg: number, arcRadius: number): string {
  const toRad = (deg: number) => deg * Math.PI / 180;
  const x1 = cx.value + arcRadius * Math.cos(toRad(startDeg));
  const y1 = cy.value + arcRadius * Math.sin(toRad(startDeg));
  const x2 = cx.value + arcRadius * Math.cos(toRad(startDeg + spanDeg));
  const y2 = cy.value + arcRadius * Math.sin(toRad(startDeg + spanDeg));
  const largeArc = spanDeg > 180 ? 1 : 0;
  return `M ${x1.toFixed(1)} ${y1.toFixed(1)} A ${arcRadius} ${arcRadius} 0 ${largeArc} 1 ${x2.toFixed(1)} ${y2.toFixed(1)}`;
}
const arcTrack = computed(() => makeArc(120, 300, arcR.value));
const arcFill  = computed(() => makeArc(120, Math.max(speedFraction.value * 300, 3), arcR.value));
</script>

<style scoped>
.node-wrap { width: 100%; height: 100%; overflow: visible; }
svg { overflow: visible; }
svg * { transition: none !important; animation: none !important; }
</style>
