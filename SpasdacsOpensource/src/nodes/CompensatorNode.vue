<template>
  <div class="node-wrap" :style="{ opacity: d.opacity ?? 1 }">
    <svg :width="w" :height="h" :viewBox="`0 0 ${w} ${h}`" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient :id="`comp-body-${uid}`" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%"   stop-color="#606078"/>
          <stop offset="40%"  stop-color="#a8a8c0"/>
          <stop offset="100%" stop-color="#404058"/>
        </linearGradient>
      </defs>

      <!-- Top pipe cap -->
      <rect :x="w*0.25" y="0" :width="w*0.50" :height="h*0.10"
        fill="url(#comp-body-${uid})" :stroke="borderColor" stroke-width="1.5" rx="2"/>

      <!-- Upper cylinder -->
      <rect :x="w*0.15" :y="h*0.09" :width="w*0.70" :height="h*0.20"
        :fill="topFill" :stroke="borderColor" stroke-width="1.5" rx="1"/>

      <!-- Bellows / accordion section -->
      <path :d="bellowsPath"
        fill="none" :stroke="bellowsColor" stroke-width="2"
        stroke-linejoin="round"/>
      <!-- Bellows fill -->
      <rect :x="w*0.15" :y="h*0.29" :width="w*0.70" :height="h*0.42"
        :fill="belloFill" :stroke="borderColor" stroke-width="1" rx="1" opacity="0.4"/>

      <!-- Lower cylinder (fluid section) -->
      <rect :x="w*0.15" :y="h*0.71" :width="w*0.70" :height="h*0.19"
        :fill="fluidFill" :stroke="borderColor" stroke-width="1.5" rx="1"/>

      <!-- Fluid level indicator inside lower section -->
      <rect :x="w*0.17" :y="h*0.71 + (h*0.19 * (1 - fillRatio))"
        :width="w*0.66" :height="h*0.19 * fillRatio"
        :fill="levelColor" rx="1" opacity="0.8"/>

      <!-- Bottom pipe cap -->
      <rect :x="w*0.25" :y="h*0.90" :width="w*0.50" :height="h*0.10"
        fill="url(#comp-body-${uid})" :stroke="borderColor" stroke-width="1.5" rx="2"/>

      <!-- Level text -->
      <text :x="w/2" :y="h*0.83"
        text-anchor="middle" dominant-baseline="middle"
        :font-size="Math.max(7, h*0.09)" font-weight="600"
        font-family="monospace"
        :fill="isActive ? '#a0c0e0' : '#506070'">{{ levelText }}</text>

      <!-- Invalid overlay -->
      <rect v-if="d.isInvalid" x="0" y="0" :width="w" :height="h"
        fill="rgba(231,76,60,0.35)" rx="3"/>
    </svg>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from "vue";
import { useNodeData } from "./useNodeData";

const { d, w, h } = useNodeData(60, 110);
const uid = ref(Math.random().toString(36).slice(2, 8));

const isActive   = computed(() => !!d.value.statusColor && d.value.statusColor !== "");
const fillRatio  = computed(() => Math.min(1, Math.max(0, ((d.value.level as number) ?? 50) / 100)));
const borderColor = computed(() => isActive.value ? "#6080a0" : "#303050");
const topFill    = computed(() => isActive.value ? "#0e1828" : "#0a0e18");
const belloFill  = computed(() => isActive.value ? "#0a1424" : "#080c14");
const fluidFill  = computed(() => "#0a1018");
const bellowsColor = computed(() => isActive.value ? "#4060a0" : "#283040");
const levelColor = computed(() => {
  const sc = d.value.statusColor as string;
  return (sc && sc !== "") ? sc : "#2060a0";
});

const levelText = computed(() => `${Math.round(fillRatio.value * 100)}%`);

// Accordion zigzag path
const bellowsPath = computed(() => {
  const x0  = w.value * 0.15;
  const x1  = w.value * 0.85;
  const y0  = h.value * 0.29;
  const y1  = h.value * 0.71;
  const rows = 6;
  const dy   = (y1 - y0) / rows;
  let p = `M ${x0} ${y0}`;
  for (let i = 0; i <= rows; i++) {
    const y = y0 + i * dy;
    p += ` L ${i % 2 === 0 ? x1 : x0} ${y}`;
  }
  return p;
});
</script>

<style scoped>
.node-wrap { width: 100%; height: 100%; overflow: visible; }
svg { overflow: visible; }
</style>
