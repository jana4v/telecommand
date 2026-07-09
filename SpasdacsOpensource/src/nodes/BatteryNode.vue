<template>
  <div class="node-wrap" :style="{ opacity: d.opacity ?? 1 }">
    <svg :width="w" :height="h" :viewBox="`0 0 ${w} ${h}`" xmlns="http://www.w3.org/2000/svg" overflow="visible">
      <defs>
        <!-- Metallic rim gradient -->
        <linearGradient :id="`bt-rim-${uid}`" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%"   stop-color="#d0d0e0"/>
          <stop offset="20%"  stop-color="#686878"/>
          <stop offset="48%"  stop-color="#e8e8f4"/>
          <stop offset="76%"  stop-color="#585868"/>
          <stop offset="100%" stop-color="#b8b8c8"/>
        </linearGradient>
        <!-- Dark body background -->
        <linearGradient :id="`bt-body-${uid}`" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%"   stop-color="#050a14"/>
          <stop offset="100%" stop-color="#0a1220"/>
        </linearGradient>
        <!-- Charge fill — horizontal cylinder shading -->
        <linearGradient :id="`bt-fluid-${uid}`" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%"   :stop-color="chargeColor" stop-opacity="0.40"/>
          <stop offset="25%"  :stop-color="chargeColor" stop-opacity="0.75"/>
          <stop offset="52%"  :stop-color="chargeColor" stop-opacity="0.96"/>
          <stop offset="75%"  :stop-color="chargeColor" stop-opacity="0.75"/>
          <stop offset="100%" :stop-color="chargeColor" stop-opacity="0.40"/>
        </linearGradient>
        <!-- Charge fill — vertical surface highlight -->
        <linearGradient :id="`bt-fv-${uid}`" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stop-color="#fff" stop-opacity="0.20"/>
          <stop offset="25%"  stop-color="#fff" stop-opacity="0.06"/>
          <stop offset="100%" stop-color="#000" stop-opacity="0.18"/>
        </linearGradient>
        <!-- Side shading overlay (makes body look cylindrical) -->
        <linearGradient :id="`bt-side-${uid}`" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%"   stop-color="#000" stop-opacity="0.50"/>
          <stop offset="16%"  stop-color="#000" stop-opacity="0.12"/>
          <stop offset="44%"  stop-color="#fff" stop-opacity="0.04"/>
          <stop offset="84%"  stop-color="#000" stop-opacity="0.14"/>
          <stop offset="100%" stop-color="#000" stop-opacity="0.52"/>
        </linearGradient>
        <!-- Terminal cap gradient -->
        <linearGradient :id="`bt-cap-${uid}`" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stop-color="#c0c8d8"/>
          <stop offset="40%"  stop-color="#7a8898"/>
          <stop offset="100%" stop-color="#3a4858"/>
        </linearGradient>
        <!-- Clip: charge fill from bottom up -->
        <clipPath :id="`bt-clip-${uid}`">
          <rect :x="bx" :y="by + bh * (1 - chargePct)" :width="bw" :height="bh * chargePct"/>
        </clipPath>
        <!-- Clip: body interior (for overlays) -->
        <clipPath :id="`bt-body-clip-${uid}`">
          <rect :x="bx" :y="by" :width="bw" :height="bh" :rx="br"/>
        </clipPath>
      </defs>

      <!-- ── Positive terminal (nub) ──────────────────────────────────────── -->
      <rect
        :x="w / 2 - termW / 2" :y="0"
        :width="termW" :height="termH + br"
        :rx="termW * 0.25"
        :fill="`url(#bt-cap-${uid})`"
        :stroke="`url(#bt-rim-${uid})`" :stroke-width="rimStroke * 0.6"
      />
      <!-- Terminal glow -->
      <rect
        :x="w / 2 - termW / 2" :y="0"
        :width="termW" :height="termH"
        :rx="termW * 0.25"
        fill="none" :stroke="chargeColor" :stroke-width="rimStroke * 0.4" opacity="0.30"
        :style="`filter: drop-shadow(0 0 ${termW * 0.3}px ${chargeColor})`"
      />

      <!-- ── Battery body shell ───────────────────────────────────────────── -->
      <!-- Dark interior -->
      <rect :x="bx" :y="by" :width="bw" :height="bh" :rx="br"
        :fill="`url(#bt-body-${uid})`"
      />

      <!-- Charge fill (clipped bottom-up) -->
      <rect :x="bx" :y="by" :width="bw" :height="bh" :rx="br"
        :fill="`url(#bt-fluid-${uid})`"
        :clip-path="`url(#bt-clip-${uid})`"
      />
      <!-- Charge fill vertical shading -->
      <rect :x="bx" :y="by" :width="bw" :height="bh" :rx="br"
        :fill="`url(#bt-fv-${uid})`"
        :clip-path="`url(#bt-clip-${uid})`"
      />

      <!-- Charge surface glow line -->
      <line v-if="chargePct > 0.02 && chargePct < 0.99"
        :x1="bx + br" :y1="by + bh * (1 - chargePct)"
        :x2="bx + bw - br" :y2="by + bh * (1 - chargePct)"
        :stroke="chargeColor" :stroke-width="bw * 0.025" stroke-linecap="round" opacity="0.80"
        :style="`filter: drop-shadow(0 0 ${bw * 0.05}px ${chargeColor})`"
      />

      <!-- Shimmer highlight (left strip) -->
      <rect :x="bx + rimStroke" :y="by + rimStroke" :width="bw * 0.14" :height="bh - rimStroke * 2"
        :rx="bw * 0.07" fill="white" opacity="0.055"
        :clip-path="`url(#bt-body-clip-${uid})`"
      />

      <!-- Cylindrical side shading (always on top) -->
      <rect :x="bx" :y="by" :width="bw" :height="bh" :rx="br"
        :fill="`url(#bt-side-${uid})`"
        :clip-path="`url(#bt-body-clip-${uid})`"
      />

      <!-- Cell dividers (4 cells, 3 separators) -->
      <line v-for="i in 3" :key="i"
        :x1="bx + rimStroke" :y1="by + i * bh / 4"
        :x2="bx + bw - rimStroke" :y2="by + i * bh / 4"
        stroke="#ffffff" stroke-width="0.8" opacity="0.10"
      />
      <!-- Cell divider accent lines (dark groove) -->
      <line v-for="i in 3" :key="`d${i}`"
        :x1="bx + rimStroke" :y1="by + i * bh / 4 + 0.8"
        :x2="bx + bw - rimStroke" :y2="by + i * bh / 4 + 0.8"
        stroke="#000" stroke-width="1.2" opacity="0.30"
      />

      <!-- Metallic rim (drawn last so it overlaps the fill edges) -->
      <rect :x="bx" :y="by" :width="bw" :height="bh" :rx="br"
        fill="none"
        :stroke="`url(#bt-rim-${uid})`" :stroke-width="rimStroke"
      />

      <!-- Top-cap ellipse (3D depth) -->
      <ellipse :cx="w / 2" :cy="by + bh * 0.022"
        :rx="bw / 2 - rimStroke" :ry="bh * 0.030"
        fill="none" stroke="#3a5268" :stroke-width="bw * 0.020" opacity="0.55"
      />
      <!-- Bottom-cap ellipse -->
      <ellipse :cx="w / 2" :cy="by + bh - bh * 0.022"
        :rx="bw / 2 - rimStroke" :ry="bh * 0.030"
        fill="none" stroke="#080f1c" :stroke-width="bw * 0.026" opacity="0.65"
      />

      <!-- Outer body glow (matches charge color) -->
      <rect :x="bx" :y="by" :width="bw" :height="bh" :rx="br"
        fill="none" :stroke="chargeColor" :stroke-width="rimStroke * 0.5" opacity="0.18"
        :style="`filter: drop-shadow(0 0 ${bw * 0.12}px ${chargeColor})`"
      />

      <!-- ── Charging bolt ────────────────────────────────────────────────── -->
      <text v-if="d.isCharging"
        :x="w / 2" :y="by + bh * 0.46"
        text-anchor="middle" dominant-baseline="middle"
        :font-size="bw * 0.62" fill="#ffffff" opacity="0.18"
        font-family="sans-serif" pointer-events="none"
      >⚡</text>
      <text v-if="d.isCharging"
        :x="w / 2" :y="by + bh * 0.46"
        text-anchor="middle" dominant-baseline="middle"
        :font-size="bw * 0.52" :fill="chargeColor" opacity="0.72"
        font-family="sans-serif" pointer-events="none"
        :style="`filter: drop-shadow(0 0 ${bw * 0.15}px ${chargeColor})`"
      >⚡</text>

      <!-- ── Charge % badge ─────────────────────────────────────────────── -->
      <rect
        :x="w / 2 - badgeW / 2" :y="badgeY - badgeH / 2"
        :width="badgeW" :height="badgeH"
        :rx="bw * 0.08"
        fill="#020609" :stroke="chargeColor" :stroke-width="bw * 0.018" opacity="0.95"
      />
      <!-- Charge % value -->
      <text :x="w / 2" :y="badgeY + badgeFontSize * 0.35"
        text-anchor="middle" :font-size="badgeFontSize" font-weight="700"
        font-family="'Digital7', 'Courier New', monospace"
        :fill="chargeColor"
      >{{ chargeText }}</text>
      <!-- State label (CHG / DIS / ---) -->
      <text :x="w / 2" :y="badgeY + badgeH * 0.50 + stateSize * 0.85"
        text-anchor="middle" :font-size="stateSize" font-weight="600"
        font-family="sans-serif" letter-spacing="1"
        :fill="chargeColor" opacity="0.72"
      >{{ stateText }}</text>

      <!-- ── Negative terminal (flat at bottom) ──────────────────────────── -->
      <rect
        :x="bx - negExtra" :y="by + bh - rimStroke * 0.5"
        :width="bw + negExtra * 2" :height="termH * 0.75"
        :rx="br * 0.5"
        :fill="`url(#bt-rim-${uid})`"
        :stroke="`url(#bt-rim-${uid})`" :stroke-width="rimStroke * 0.4"
      />

      <!-- ── Invalid overlay ─────────────────────────────────────────────── -->
      <rect v-if="d.isInvalid" :x="bx" :y="by" :width="bw" :height="bh" :rx="br"
        fill="rgba(231,76,60,0.22)" stroke="#e74c3c"
        :stroke-width="bw * 0.035" stroke-dasharray="7,4"
      />

    </svg>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from "vue";
import { useNodeData }  from "./useNodeData";
import { useGsapTween } from "./useGsapTween";

const { d, w, h } = useNodeData(60, 128);
const uid = ref(Math.random().toString(36).slice(2, 8));

// ── Proportional geometry ──────────────────────────────────────────────────
const termW    = computed(() => w.value * 0.30);          // positive terminal width
const termH    = computed(() => h.value * 0.090);         // positive terminal height
const bx       = computed(() => w.value * 0.06);          // body left edge
const by       = computed(() => termH.value * 0.55);      // body top (overlaps terminal base)
const bw       = computed(() => w.value - bx.value * 2);  // body width
const bh       = computed(() => h.value - by.value - h.value * 0.045); // body height
const br       = computed(() => bw.value * 0.09);         // body corner radius
const rimStroke = computed(() => bw.value * 0.072);       // metallic rim stroke width
const negExtra  = computed(() => bw.value * 0.06);        // negative terminal wider by this

// ── Badge sizing ──────────────────────────────────────────────────────────
const badgeW        = computed(() => bw.value * 0.90);
const badgeH        = computed(() => bh.value * 0.22);
const badgeFontSize = computed(() => bh.value * 0.13);
const stateSize     = computed(() => bh.value * 0.075);
const badgeY        = computed(() => by.value + bh.value * 0.72);

// ── Charge data ───────────────────────────────────────────────────────────
const gaugeMin   = computed(() => (d.value.gaugeMin ?? 0)   as number);
const gaugeMax   = computed(() => (d.value.gaugeMax ?? 100) as number);
const battUnits  = computed(() => String(d.value.units ?? "%"));
const chargeVal  = computed(() => (d.value.chargeLevel ?? 0) as number);

// Raw (instant) charge pct — used for color thresholds and text
const chargePctRaw = computed(() => {
  const range = gaugeMax.value - gaugeMin.value || 1;
  return Math.min(1, Math.max(0, (chargeVal.value - gaugeMin.value) / range));
});
// Smooth fill-level animation
const chargePct = useGsapTween(() => chargePctRaw.value, 0.8, "power2.out");

const chargeColor = computed(() => {
  const p = chargePctRaw.value;   // instant threshold — color changes immediately
  return d.value.statusColor || (p > 0.60 ? "#27ae60" : p > 0.25 ? "#ff9800" : "#e74c3c");
});

// Raw (instant) charge for display text — bypasses tweener
const chargeText = computed(() => {
  const raw = (d.value.chargeLevelRaw ?? d.value.chargeLevel ?? 0) as number;
  return raw.toFixed(1) + " " + battUnits.value;
});

const stateText = computed(() => {
  if (d.value.isInvalid) return "ERR";
  if (d.value.isCharging) return "CHG";
  return "DIS";
});
</script>

<style scoped>
.node-wrap { width: 100%; height: 100%; overflow: visible; }
svg { overflow: visible; }
svg * { transition: none !important; animation: none !important; }
</style>
