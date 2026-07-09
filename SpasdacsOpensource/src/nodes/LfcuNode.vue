<template>
  <div class="node-wrap" :style="{ opacity: d.opacity ?? 1 }">
    <svg :width="w" :height="h" :viewBox="`0 0 ${w} ${h}`" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="lfcu-metal" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%"   stop-color="#a8a8b8"/>
          <stop offset="50%"  stop-color="#d0d0e0"/>
          <stop offset="100%" stop-color="#606078"/>
        </linearGradient>
        <radialGradient :id="`lfcu-dial-${uid}`" cx="40%" cy="35%" r="65%">
          <stop offset="0%"   :stop-color="dialHL"/>
          <stop offset="100%" :stop-color="dialBg"/>
        </radialGradient>
      </defs>

      <!-- Inlet/outlet pipes -->
      <rect x="0" :y="cy - pipeH/2" :width="cx - bodyR" :height="pipeH"
        :fill="pipeFill" :stroke="pipeStroke" stroke-width="1" rx="1"/>
      <rect :x="cx + bodyR" :y="cy - pipeH/2" :width="cx - bodyR" :height="pipeH"
        :fill="pipeFill" :stroke="pipeStroke" stroke-width="1" rx="1"/>

      <!-- Valve body circle -->
      <circle :cx="cx" :cy="cy" :r="bodyR"
        :fill="`url(#lfcu-dial-${uid})`"
        stroke="url(#lfcu-metal)" stroke-width="3"/>

      <!-- Position indicator dial arc background -->
      <path :d="arcBg"
        fill="none" stroke="#1a2030" stroke-width="4" stroke-linecap="round"/>

      <!-- Position indicator arc (filled) -->
      <path :d="arcFill"
        fill="none" :stroke="arcColor" stroke-width="4"
        stroke-linecap="round"
        :style="isActive ? `filter:drop-shadow(0 0 3px ${arcColor})` : ''"/>

      <!-- Needle pointer -->
      <line :x1="cx" :y1="cy"
        :x2="needleX" :y2="needleY"
        :stroke="arcColor" :stroke-width="bodyR*0.12"
        stroke-linecap="round"/>

      <!-- Centre dot -->
      <circle :cx="cx" :cy="cy" :r="bodyR*0.12"
        :fill="isActive ? arcColor : '#303050'"/>

      <!-- LFCU label -->
      <text :x="cx" :y="cy + bodyR*0.48"
        text-anchor="middle" dominant-baseline="middle"
        :font-size="Math.max(7, bodyR*0.28)" font-weight="700"
        font-family="monospace"
        :fill="isActive ? '#a0c0e0' : '#405060'">LFCU</text>

      <!-- Position % below -->
      <text :x="cx" :y="h - 2"
        text-anchor="middle" dominant-baseline="auto"
        :font-size="Math.max(8, h*0.12)" font-weight="600"
        font-family="'Digital7','Courier New',monospace"
        :fill="isActive ? arcColor : '#405060'">{{ posText }}</text>

      <!-- Invalid overlay -->
      <rect v-if="d.isInvalid" x="0" y="0" :width="w" :height="h"
        fill="rgba(231,76,60,0.35)" rx="3"/>
    </svg>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from "vue";
import { useNodeData } from "./useNodeData";

const { d, w, h } = useNodeData(110, 90);
const uid   = ref(Math.random().toString(36).slice(2, 8));
const cx    = computed(() => w.value / 2);
const cy    = computed(() => h.value * 0.48);
const bodyR = computed(() => Math.min(w.value * 0.82, h.value * 0.82) * 0.36);
const pipeH = computed(() => bodyR.value * 0.32);

const isActive   = computed(() => !!d.value.statusColor && d.value.statusColor !== "");
const activeColor = computed(() => (d.value.statusColor as string) || "#27ae60");
const arcColor   = computed(() => isActive.value ? activeColor.value : "#304060");
const pipeFill   = computed(() => isActive.value ? "#0e1820" : "#0a1014");
const pipeStroke = computed(() => isActive.value ? "#304858" : "#202830");
const dialBg     = computed(() => isActive.value ? "#0b1e14" : "#0a1018");
const dialHL     = computed(() => isActive.value ? "#153024" : "#141e28");

const posRaw  = computed(() => Math.min(1, Math.max(0, ((d.value.position as number) ?? 0))));
const posText = computed(() => `${Math.round(posRaw.value * 100)}%`);

// Arc from -135° to +135° (270° sweep), filled proportionally to position
const START_DEG = -135;
const SWEEP_DEG = 270;

function polarX(cx: number, cy: number, r: number, deg: number) {
  return cx + r * Math.cos((deg * Math.PI) / 180);
}
function polarY(cx: number, cy: number, r: number, deg: number) {
  return cy + r * Math.sin((deg * Math.PI) / 180);
}
function arcPath(cx: number, cy: number, r: number, startDeg: number, endDeg: number) {
  const x0 = polarX(cx, cy, r, startDeg);
  const y0 = polarY(cx, cy, r, startDeg);
  const x1 = polarX(cx, cy, r, endDeg);
  const y1 = polarY(cx, cy, r, endDeg);
  const large = Math.abs(endDeg - startDeg) > 180 ? 1 : 0;
  return `M ${x0} ${y0} A ${r} ${r} 0 ${large} 1 ${x1} ${y1}`;
}

const arcBg = computed(() =>
  arcPath(cx.value, cy.value, bodyR.value * 0.72, START_DEG, START_DEG + SWEEP_DEG)
);

const arcFill = computed(() => {
  const endDeg = START_DEG + SWEEP_DEG * posRaw.value;
  if (posRaw.value < 0.01) return "";
  return arcPath(cx.value, cy.value, bodyR.value * 0.72, START_DEG, endDeg);
});

const needleAngle = computed(() => START_DEG + SWEEP_DEG * posRaw.value);
const needleX     = computed(() => polarX(cx.value, cy.value, bodyR.value * 0.55, needleAngle.value));
const needleY     = computed(() => polarY(cx.value, cy.value, bodyR.value * 0.55, needleAngle.value));
</script>

<style scoped>
.node-wrap { width: 100%; height: 100%; overflow: visible; }
svg { overflow: visible; }
</style>
