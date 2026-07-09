<template>
  <div class="node-wrap" :style="{ opacity: d.opacity ?? 1 }">
    <svg :width="w" :height="h" :viewBox="`0 0 ${w} ${h}`" xmlns="http://www.w3.org/2000/svg" overflow="visible">
      <defs>
        <linearGradient :id="`g-bezel-${uid}`" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%"   stop-color="#c8c8da"/>
          <stop offset="20%"  stop-color="#686878"/>
          <stop offset="48%"  stop-color="#e4e4f2"/>
          <stop offset="74%"  stop-color="#565666"/>
          <stop offset="100%" stop-color="#b8b8ca"/>
        </linearGradient>
        <radialGradient :id="`g-face-${uid}`" cx="40%" cy="36%" r="68%">
          <stop offset="0%"   stop-color="#1c2c3e"/>
          <stop offset="60%"  stop-color="#0c1a28"/>
          <stop offset="100%" stop-color="#060e18"/>
        </radialGradient>
        <radialGradient :id="`g-hub-${uid}`" cx="35%" cy="30%" r="70%">
          <stop offset="0%"   stop-color="#4a5e72"/>
          <stop offset="55%"  stop-color="#1e2c3a"/>
          <stop offset="100%" stop-color="#0c141e"/>
        </radialGradient>
      </defs>

      <!-- Outer ambient glow -->
      <circle :cx="cx" :cy="cy" :r="r + r * 0.11"
        fill="none" :stroke="arcColor" :stroke-width="r * 0.033" opacity="0.14"
        :style="`filter: drop-shadow(0 0 ${r*0.15}px ${arcColor})`"
      />

      <!-- Metallic bezel -->
      <circle :cx="cx" :cy="cy" :r="r" :fill="`url(#g-bezel-${uid})`"/>

      <!-- Gauge face -->
      <circle :cx="cx" :cy="cy" :r="r - r * 0.13" :fill="`url(#g-face-${uid})`"/>

      <!-- Coloured zone arcs (behind track) -->
      <path :d="zoneGreen"  fill="none" stroke="#27ae60" :stroke-width="zoneW" stroke-linecap="butt" opacity="0.22"/>
      <path :d="zoneOrange" fill="none" stroke="#ff9800" :stroke-width="zoneW" stroke-linecap="butt" opacity="0.22"/>
      <path :d="zoneRed"    fill="none" stroke="#e74c3c" :stroke-width="zoneW" stroke-linecap="butt" opacity="0.22"/>

      <!-- Arc track -->
      <path :d="arcTrack" fill="none" stroke="#0e1e2e" :stroke-width="trackW" stroke-linecap="round"/>

      <!-- Arc fill with glow -->
      <path v-if="pct > 0.005" :d="arcFill"
        fill="none" :stroke="arcColor" :stroke-width="trackW" stroke-linecap="round"
        :style="`filter: drop-shadow(0 0 ${trackW}px ${arcColor})`"
      />

      <!-- Major tick marks -->
      <line v-for="t in majorTicks" :key="t.i"
        :x1="t.ox" :y1="t.oy" :x2="t.ix" :y2="t.iy"
        stroke="#8899aa" :stroke-width="r * 0.04" stroke-linecap="round"
      />

      <!-- Minor tick marks -->
      <line v-for="t in minorTicks" :key="t.i"
        :x1="t.ox" :y1="t.oy" :x2="t.ix" :y2="t.iy"
        stroke="#2e4458" :stroke-width="r * 0.02" stroke-linecap="round"
      />

      <!-- Needle shadow -->
      <polygon :points="needleShadow" fill="rgba(0,0,0,0.45)"/>

      <!-- Needle -->
      <polygon :points="needlePoints" :fill="arcColor"/>

      <!-- Hub ring -->
      <circle :cx="cx" :cy="cy" :r="hubR"
        :fill="`url(#g-hub-${uid})`" :stroke="arcColor" :stroke-width="r * 0.026"
      />
      <!-- Hub centre bolt -->
      <circle :cx="cx" :cy="cy" :r="r * 0.06" fill="#c8dff0" opacity="0.88"/>

      <!-- Value badge -->
      <rect
        :x="cx - badgeW / 2" :y="badgeY"
        :width="badgeW" :height="badgeH"
        :rx="r * 0.065"
        fill="#030a12" :stroke="arcColor" :stroke-width="r * 0.02" opacity="0.95"
      />
      <text :x="cx" :y="badgeY + badgeH * 0.72"
        text-anchor="middle"
        :font-size="badgeFontSize"
        font-weight="700"
        font-family="'Digital7', 'Courier New', monospace"
        :letter-spacing="r * 0.011"
        :fill="arcColor"
      >{{ displayVal }}</text>

      <!-- Invalid overlay -->
      <circle v-if="d.isInvalid" :cx="cx" :cy="cy" :r="r - r * 0.13"
        fill="rgba(231,76,60,0.22)" stroke="#e74c3c" :stroke-width="r * 0.043" stroke-dasharray="6,4"
      />

    </svg>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from "vue";
import { useNodeData }  from "./useNodeData";
import { useGsapTween } from "./useGsapTween";

const { d, w, h } = useNodeData(100, 100);
const uid = ref(Math.random().toString(36).slice(2, 8));

const cx = computed(() => w.value / 2);
const cy = computed(() => h.value / 2);
const r  = computed(() => Math.min(w.value, h.value) / 2 - 4);

const START_ANGLE = (220 * Math.PI) / 180;
const SWEEP       = (280 * Math.PI) / 180;

const gaugeMin = computed(() => (d.value.gaugeMin ?? 0) as number);
const gaugeMax = computed(() => (d.value.gaugeMax ?? 100) as number);
const gaugeVal = computed(() => (d.value.gaugeValue ?? d.value.level ?? 0) as number);

// Raw (instant) pct — used for color threshold decisions
const pctRaw = computed(() => {
  const range = gaugeMax.value - gaugeMin.value || 1;
  return Math.min(1, Math.max(0, (gaugeVal.value - gaugeMin.value) / range));
});
// Smoothly-animated pct — drives the needle and arc fill
const pct = useGsapTween(() => pctRaw.value, 0.6, "power2.out");

const arcColor = computed(() => {
  const p = pctRaw.value;    // use raw so color responds immediately at threshold
  return d.value.statusColor || (p > 0.95 ? "#e74c3c" : p > 0.85 ? "#ff9800" : "#27ae60");
});

// ── Proportional sizes ─────────────────────────────────────────────────────
const hubR       = computed(() => r.value * 0.16);
const arcR       = computed(() => r.value * 0.72);          // arc track radius
const zoneW      = computed(() => r.value * 0.20);          // zone arc stroke width
const trackW     = computed(() => r.value * 0.11);          // arc track stroke width
const badgeW     = computed(() => r.value * 0.96);          // value badge width
const badgeH     = computed(() => r.value * 0.33);          // value badge height
const badgeFontSize = computed(() => r.value * 0.20);       // value text size
const badgeY     = computed(() => cy.value + r.value * 0.28);

// ── Arc path helper ────────────────────────────────────────────────────────
function makeArc(startA: number, endA: number, radius: number): string {
  const toXY = (a: number) => [
    cx.value + radius * Math.cos(a - Math.PI / 2),
    cy.value + radius * Math.sin(a - Math.PI / 2),
  ];
  const [x1, y1] = toXY(startA);
  const [x2, y2] = toXY(endA);
  return `M ${x1.toFixed(2)} ${y1.toFixed(2)} A ${radius} ${radius} 0 ${endA - startA > Math.PI ? 1 : 0} 1 ${x2.toFixed(2)} ${y2.toFixed(2)}`;
}

const arcTrack   = computed(() => makeArc(START_ANGLE, START_ANGLE + SWEEP, arcR.value));
const arcFill    = computed(() => makeArc(START_ANGLE, START_ANGLE + pct.value * SWEEP, arcR.value));
const zoneGreen  = computed(() => makeArc(START_ANGLE, START_ANGLE + SWEEP * 0.5, arcR.value));
const zoneOrange = computed(() => makeArc(START_ANGLE + SWEEP * 0.5, START_ANGLE + SWEEP * 0.8, arcR.value));
const zoneRed    = computed(() => makeArc(START_ANGLE + SWEEP * 0.8, START_ANGLE + SWEEP, arcR.value));

// ── Tick marks ─────────────────────────────────────────────────────────────
function tickLine(t: number, outerR: number, innerR: number) {
  const a = START_ANGLE + t * SWEEP - Math.PI / 2;
  return {
    ox: cx.value + outerR * Math.cos(a),
    oy: cy.value + outerR * Math.sin(a),
    ix: cx.value + innerR * Math.cos(a),
    iy: cy.value + innerR * Math.sin(a),
  };
}

const majorTicks = computed(() =>
  [0, 0.25, 0.5, 0.75, 1].map((t, i) => ({
    i,
    ...tickLine(t, r.value * 0.83, r.value * 0.63),
  }))
);

const minorTicks = computed(() => {
  const result: { i: number; ox: number; oy: number; ix: number; iy: number }[] = [];
  for (let i = 0; i <= 20; i++) {
    if ([0, 5, 10, 15, 20].includes(i)) continue;
    result.push({ i, ...tickLine(i / 20, r.value * 0.83, r.value * 0.74) });
  }
  return result;
});

// ── Tapered needle polygon ─────────────────────────────────────────────────
const needleAngle = computed(() => START_ANGLE + pct.value * SWEEP - Math.PI / 2);

function needlePoly(angleOffset = 0) {
  const a        = needleAngle.value + angleOffset;
  const p        = a + Math.PI / 2;
  const tipDist  = arcR.value - 1;
  const backDist = hubR.value * 0.9;
  const hw       = r.value * 0.052;
  return [
    [cx.value + tipDist  * Math.cos(a),  cy.value + tipDist  * Math.sin(a)],
    [cx.value + hw       * Math.cos(p),  cy.value + hw       * Math.sin(p)],
    [cx.value - backDist * Math.cos(a),  cy.value - backDist * Math.sin(a)],
    [cx.value - hw       * Math.cos(p),  cy.value - hw       * Math.sin(p)],
  ].map(([x, y]) => `${(x as number).toFixed(1)},${(y as number).toFixed(1)}`).join(" ");
}

const needlePoints = computed(() => needlePoly(0));
const needleShadow = computed(() => needlePoly(0.06));

// ── Display value — uses raw (instant) value so text never counts up ───────
const displayVal = computed(() => {
  const v = (d.value.gaugeValueRaw ?? d.value.gaugeValue ?? d.value.level ?? 0) as number;
  return Number.isFinite(v) ? v.toFixed(3) : "—";
});
</script>

<style scoped>
.node-wrap { width: 100%; height: 100%; overflow: visible; }
svg { overflow: visible; }
svg * { transition: none !important; animation: none !important; }
</style>
