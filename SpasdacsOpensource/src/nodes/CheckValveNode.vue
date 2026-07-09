<template>
  <div class="node-wrap" :style="{ opacity: d.opacity ?? 1 }">
    <svg :width="w" :height="h" :viewBox="`0 0 ${w} ${h}`" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="cv-metal" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%"   stop-color="#909090"/>
          <stop offset="50%"  stop-color="#c8c8c8"/>
          <stop offset="100%" stop-color="#606060"/>
        </linearGradient>
      </defs>

      <!-- Body outline (circle) -->
      <circle :cx="cx" :cy="cy" :r="r"
        :fill="bodyFill" stroke="url(#cv-metal)" stroke-width="2.5"/>

      <!-- Flap / disc (the check element) -->
      <line :x1="cx" :y1="cy - r*0.70" :x2="cx" :y2="cy + r*0.70"
        :stroke="flapColor" stroke-width="3.5" stroke-linecap="round"/>

      <!-- Flow arrow (left to right — allowed direction) -->
      <line :x1="cx - r*0.58" :y1="cy" :x2="cx + r*0.30" :y2="cy"
        :stroke="arrowColor" stroke-width="2" stroke-linecap="round"/>
      <polygon
        :points="`${cx + r*0.30},${cy - r*0.20} ${cx + r*0.60},${cy} ${cx + r*0.30},${cy + r*0.20}`"
        :fill="arrowColor"/>

      <!-- Blocked direction indicator (small X on right side) -->
      <line :x1="cx + r*0.70" :y1="cy - r*0.18" :x2="cx + r*0.94" :y2="cy + r*0.18"
        stroke="#e74c3c" stroke-width="1.5" opacity="0.6"/>
      <line :x1="cx + r*0.94" :y1="cy - r*0.18" :x2="cx + r*0.70" :y2="cy + r*0.18"
        stroke="#e74c3c" stroke-width="1.5" opacity="0.6"/>

      <!-- Inlet/outlet pipes -->
      <rect x="0" :y="cy - pipeH/2" :width="cx - r" :height="pipeH"
        :fill="pipeFill" :stroke="pipeStroke" stroke-width="1" rx="1"/>
      <rect :x="cx + r" :y="cy - pipeH/2" :width="cx - r" :height="pipeH"
        :fill="pipeFill" :stroke="pipeStroke" stroke-width="1" rx="1"/>

      <!-- Invalid overlay -->
      <rect v-if="d.isInvalid" x="0" y="0" :width="w" :height="h"
        fill="rgba(231,76,60,0.35)" rx="3"/>
    </svg>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useNodeData } from "./useNodeData";

const { d, w, h } = useNodeData(90, 60);

const cx      = computed(() => w.value / 2);
const cy      = computed(() => h.value / 2);
const r       = computed(() => Math.min(w.value, h.value) * 0.36);
const pipeH   = computed(() => r.value * 0.32);

const isActive   = computed(() => !!d.value.statusColor && d.value.statusColor !== "");
const activeColor = computed(() => (d.value.statusColor as string) || "#27ae60");

const bodyFill  = computed(() => {
  if (d.value.isInvalid) return "#e74c3c";
  return "#0a1018";
});
const flapColor  = computed(() => isActive.value ? "#b0b8c8" : "#506070");
const arrowColor = computed(() => isActive.value ? activeColor.value : "#304050");
const pipeFill   = computed(() => isActive.value ? "#0e1820" : "#0a1014");
const pipeStroke = computed(() => isActive.value ? "#304858" : "#202830");
</script>

<style scoped>
.node-wrap { width: 100%; height: 100%; overflow: visible; }
svg { overflow: visible; }
</style>
