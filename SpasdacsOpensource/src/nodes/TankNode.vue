<template>
  <div class="node-wrap" :style="{ opacity: d.opacity ?? 1 }">
    <svg :width="w" :height="h" :viewBox="`0 0 ${w} ${h}`" xmlns="http://www.w3.org/2000/svg" overflow="visible">
      <defs>
        <!-- Metallic rim gradient -->
        <linearGradient :id="`tk-rim-${uid}`" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%"   stop-color="#c8c8da"/>
          <stop offset="22%"  stop-color="#686878"/>
          <stop offset="50%"  stop-color="#e0e0f0"/>
          <stop offset="78%"  stop-color="#585868"/>
          <stop offset="100%" stop-color="#b0b0c2"/>
        </linearGradient>
        <!-- Cylindrical side shading (horizontal) -->
        <linearGradient :id="`tk-side-${uid}`" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%"   stop-color="#000" stop-opacity="0.55"/>
          <stop offset="18%"  stop-color="#000" stop-opacity="0.15"/>
          <stop offset="45%"  stop-color="#fff" stop-opacity="0.04"/>
          <stop offset="82%"  stop-color="#000" stop-opacity="0.18"/>
          <stop offset="100%" stop-color="#000" stop-opacity="0.55"/>
        </linearGradient>
        <!-- Fluid gradient (horizontal cylinder shading) -->
        <linearGradient :id="`tk-fluid-${uid}`" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%"   :stop-color="levelColor" stop-opacity="0.45"/>
          <stop offset="28%"  :stop-color="levelColor" stop-opacity="0.80"/>
          <stop offset="52%"  :stop-color="levelColor" stop-opacity="0.95"/>
          <stop offset="72%"  :stop-color="levelColor" stop-opacity="0.80"/>
          <stop offset="100%" :stop-color="levelColor" stop-opacity="0.45"/>
        </linearGradient>
        <!-- Fluid vertical shading (surface brighter) -->
        <linearGradient :id="`tk-fv-${uid}`" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"  stop-color="#fff" stop-opacity="0.14"/>
          <stop offset="30%" stop-color="#fff" stop-opacity="0.04"/>
          <stop offset="100%" stop-color="#000" stop-opacity="0.15"/>
        </linearGradient>
        <!-- Clip to tank body shape -->
        <clipPath :id="`tk-clip-${uid}`">
          <rect :x="bx" :y="by" :width="bw" :height="bh" :rx="br"/>
        </clipPath>
      </defs>

      <!-- Top pipe fitting -->
      <rect :x="w / 2 - pipeW / 2" :y="by - pipeH" :width="pipeW" :height="pipeH + 1"
        :rx="pipeW * 0.15" fill="#0c1828" stroke="#253a50" :stroke-width="pipeStroke"
      />
      <ellipse :cx="w / 2" :cy="by - pipeH * 0.3" :rx="pipeW / 2" :ry="pipeH * 0.28"
        fill="#060e1a" stroke="#253a50" :stroke-width="pipeStroke * 0.7"
      />

      <!-- Tank body shell -->
      <rect :x="bx" :y="by" :width="bw" :height="bh" :rx="br"
        fill="#08121e" :stroke="`url(#tk-rim-${uid})`" :stroke-width="rimStroke"
      />

      <!-- Fluid fill with wave surface (clipped) -->
      <path v-if="fillPct > 0.005" :d="fluidPath"
        :fill="`url(#tk-fluid-${uid})`"
        :clip-path="`url(#tk-clip-${uid})`"
      />
      <!-- Fluid vertical shading overlay (clipped) -->
      <path v-if="fillPct > 0.005" :d="fluidPath"
        :fill="`url(#tk-fv-${uid})`"
        :clip-path="`url(#tk-clip-${uid})`"
      />

      <!-- Cylindrical side shading overlay (full height, clipped) -->
      <rect :x="bx" :y="by" :width="bw" :height="bh" :rx="br"
        :fill="`url(#tk-side-${uid})`"
        :clip-path="`url(#tk-clip-${uid})`"
      />

      <!-- Barrel band rings at 33% and 66% -->
      <line :x1="bx + rimStroke" :y1="by + bh * 0.33" :x2="bx + bw - rimStroke" :y2="by + bh * 0.33"
        stroke="#1c3550" :stroke-width="bandStroke" opacity="0.85"
        :clip-path="`url(#tk-clip-${uid})`"
      />
      <line :x1="bx + rimStroke" :y1="by + bh * 0.66" :x2="bx + bw - rimStroke" :y2="by + bh * 0.66"
        stroke="#1c3550" :stroke-width="bandStroke" opacity="0.85"
        :clip-path="`url(#tk-clip-${uid})`"
      />

      <!-- Level guide lines at 25%, 50%, 75% (subtle dashed) -->
      <line v-for="g in levelGuides" :key="g.pct"
        :x1="bx + rimStroke * 2" :y1="g.y" :x2="bx + bw - rimStroke * 2" :y2="g.y"
        stroke="#1e3a52" :stroke-width="bw * 0.014" stroke-dasharray="3,4" opacity="0.6"
        :clip-path="`url(#tk-clip-${uid})`"
      />

      <!-- Fluid surface wave glow line -->
      <path v-if="fillPct > 0.02 && fillPct < 0.99" :d="waveLine"
        fill="none" :stroke="levelColor" :stroke-width="bw * 0.022" opacity="0.65"
        :clip-path="`url(#tk-clip-${uid})`"
        :style="`filter: drop-shadow(0 0 ${bw * 0.04}px ${levelColor})`"
      />

      <!-- Shimmer highlight strip (left 18%, clipped) -->
      <rect :x="bx + rimStroke" :y="by" :width="bw * 0.16" :height="bh" :rx="bw * 0.06"
        fill="white" opacity="0.055"
        :clip-path="`url(#tk-clip-${uid})`"
      />

      <!-- Level tick marks on right wall (inside body) -->
      <line v-for="t in levelTicks" :key="t.pct"
        :x1="bx + bw - tickLen" :y1="t.y" :x2="bx + bw - tickInset" :y2="t.y"
        stroke="#4a7090" :stroke-width="bw * 0.017" stroke-linecap="round"
        :clip-path="`url(#tk-clip-${uid})`"
      />

      <!-- Body outline on top (clean edge, no fill) -->
      <rect :x="bx" :y="by" :width="bw" :height="bh" :rx="br"
        fill="none" :stroke="`url(#tk-rim-${uid})`" :stroke-width="rimStroke"
      />

      <!-- Elliptical top-cap highlight (3D depth) -->
      <ellipse :cx="w / 2" :cy="by + bh * 0.025" :rx="bw / 2 - rimStroke * 1.5" :ry="bh * 0.038"
        fill="none" stroke="#2a4a62" :stroke-width="bw * 0.021" opacity="0.6"
      />
      <!-- Elliptical bottom-cap shadow -->
      <ellipse :cx="w / 2" :cy="by + bh - bh * 0.025" :rx="bw / 2 - rimStroke * 1.5" :ry="bh * 0.038"
        fill="none" stroke="#0a1824" :stroke-width="bw * 0.029" opacity="0.7"
      />

      <!-- Value badge -->
      <rect :x="w / 2 - badgeW / 2" :y="badgeY - badgeH / 2" :width="badgeW" :height="badgeH"
        :rx="bw * 0.045" fill="#040c18" :stroke="levelColor" :stroke-width="bw * 0.013" opacity="0.96"
      />
      <text :x="w / 2" :y="badgeY + badgeFontSize * 0.38"
        text-anchor="middle" :font-size="badgeFontSize" font-weight="700"
        font-family="'Digital7', 'Courier New', monospace" :letter-spacing="bw * 0.007"
        :fill="levelColor"
      >{{ valText }}</text>

      <!-- Bottom pipe fitting -->
      <rect :x="w / 2 - pipeW / 2" :y="by + bh - 1" :width="pipeW" :height="pipeH"
        :rx="pipeW * 0.15" fill="#0c1828" stroke="#253a50" :stroke-width="pipeStroke"
      />

      <!-- Invalid overlay -->
      <rect v-if="d.isInvalid" :x="bx" :y="by" :width="bw" :height="bh" :rx="br"
        fill="rgba(231,76,60,0.22)" stroke="#e74c3c" :stroke-width="bw * 0.029" stroke-dasharray="7,4"
      />

    </svg>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from "vue";
import { useNodeData } from "./useNodeData";

const { d, w, h } = useNodeData(80, 130);
const uid = ref(Math.random().toString(36).slice(2, 8));

// ── Tank body geometry — all proportional to w / h ────────────────────────
const bx        = computed(() => w.value * 0.0625);          // ~5 at w=80
const by        = computed(() => h.value * 0.108);           // ~14 at h=130
const bw        = computed(() => w.value  - bx.value * 2);
const bh        = computed(() => h.value  - by.value - h.value * 0.092);
const br        = computed(() => bw.value * 0.13);           // rounded corners

// ── Proportional stroke / size helpers ────────────────────────────────────
const rimStroke  = computed(() => bw.value * 0.057);         // metallic rim stroke
const bandStroke = computed(() => bw.value * 0.036);         // barrel band stroke
const tickLen    = computed(() => bw.value * 0.16);          // tick length from right wall
const tickInset  = computed(() => bw.value * 0.043);         // inner gap of tick

// Pipe fittings
const pipeW      = computed(() => bw.value * 0.18);
const pipeH      = computed(() => h.value  * 0.075);
const pipeStroke = computed(() => bw.value * 0.021);

// Value badge
const badgeW        = computed(() => bw.value * 0.88);
const badgeH        = computed(() => bh.value * 0.18);
const badgeFontSize = computed(() => bh.value * 0.14);

// ── Level data ─────────────────────────────────────────────────────────────
const gaugeMin = computed(() => (d.value.gaugeMin ?? 0) as number);
const gaugeMax = computed(() => (d.value.gaugeMax ?? 100) as number);
const tankUnits = computed(() => String(d.value.units ?? "%"));
const tankVal  = computed(() => (d.value.level ?? d.value.gaugeValue ?? 0) as number);

const fillPct = computed(() => {
  const range = gaugeMax.value - gaugeMin.value || 1;
  return Math.min(1, Math.max(0, (tankVal.value - gaugeMin.value) / range));
});
const levelColor = computed(() => {
  const p = fillPct.value;
  return d.value.statusColor || (p > 0.8 ? "#e74c3c" : p > 0.5 ? "#ff9800" : "#2d8fdd");
});

// ── Fluid wave fill path ───────────────────────────────────────────────────
const fluidPath = computed(() => {
  const surfY = by.value + bh.value * (1 - fillPct.value);
  const x0 = bx.value, x4 = bx.value + bw.value;
  const xm = (x0 + x4) / 2;
  const wa = Math.min(bw.value * 0.05, bh.value * 0.025);
  const bot = by.value + bh.value;
  return (
    `M ${x0} ${surfY} ` +
    `Q ${x0 + bw.value * 0.25} ${surfY - wa} ${xm} ${surfY} ` +
    `Q ${x0 + bw.value * 0.75} ${surfY + wa} ${x4} ${surfY} ` +
    `L ${x4} ${bot} L ${x0} ${bot} Z`
  );
});

// Wave glow line along the fluid surface
const waveLine = computed(() => {
  const surfY = by.value + bh.value * (1 - fillPct.value);
  const x0 = bx.value, x4 = bx.value + bw.value;
  const xm = (x0 + x4) / 2;
  const wa = Math.min(bw.value * 0.05, bh.value * 0.025);
  return (
    `M ${x0} ${surfY} ` +
    `Q ${x0 + bw.value * 0.25} ${surfY - wa} ${xm} ${surfY} ` +
    `Q ${x0 + bw.value * 0.75} ${surfY + wa} ${x4} ${surfY}`
  );
});

// Level guide lines at 25 / 50 / 75 %
const levelGuides = computed(() =>
  [25, 50, 75].map(pct => ({
    pct,
    y: by.value + bh.value * (1 - pct / 100),
  }))
);

// Small tick marks at same positions (right wall)
const levelTicks = computed(() =>
  [25, 50, 75].map(pct => ({
    pct,
    y: by.value + bh.value * (1 - pct / 100),
  }))
);

// Value badge vertical position (centre of body)
const badgeY = computed(() => by.value + bh.value / 2);

// Raw (instant) value — bypasses the tweener so display never counts up
const valText = computed(() => {
  const lvl = (d.value.levelRaw ?? d.value.gaugeValueRaw ?? d.value.level ?? d.value.gaugeValue ?? 0) as number;
  return Number.isFinite(lvl) ? lvl.toFixed(1) + " " + tankUnits.value : "—";
});
</script>

<style scoped>
.node-wrap { width: 100%; height: 100%; overflow: visible; }
svg { overflow: visible; }
svg * { transition: none !important; animation: none !important; }
</style>
