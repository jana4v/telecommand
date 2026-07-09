<template>
  <div class="node-wrap" :style="{ opacity: d.opacity ?? 1 }">
    <svg :width="w" :height="h" :viewBox="`0 0 ${w} ${h}`" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="sv-metal" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%"   stop-color="#a8a8b8"/>
          <stop offset="50%"  stop-color="#d8d8e8"/>
          <stop offset="100%" stop-color="#606078"/>
        </linearGradient>
      </defs>

      <!-- Solenoid coil body (rectangle with winding lines) -->
      <rect :x="w*0.20" y="0" :width="w*0.60" :height="h*0.30"
        :fill="coilFill" stroke="url(#sv-metal)" stroke-width="1.5" rx="2"/>
      <!-- Coil winding marks -->
      <line v-for="i in 5" :key="i"
        :x1="w*0.20 + (w*0.60/6)*i" y1="0"
        :x2="w*0.20 + (w*0.60/6)*i" :y2="h*0.30"
        stroke="#6060a0" stroke-width="1" opacity="0.7"/>

      <!-- Stem -->
      <rect :x="w/2-3" :y="h*0.28" width="6" :height="h*0.10"
        fill="url(#sv-metal)"/>

      <!-- Bow-tie valve body -->
      <polygon
        :points="`${pad},${bodyTop} ${w-pad},${bodyBot} ${w-pad},${bodyTop} ${pad},${bodyBot}`"
        :fill="bodyFill"
        stroke="url(#sv-metal)"
        stroke-width="3"
        stroke-linejoin="round"
      />

      <!-- SOL label -->
      <text :x="w/2" :y="h-2"
        text-anchor="middle" dominant-baseline="auto"
        :font-size="Math.max(7, h*0.10)" font-weight="700"
        font-family="monospace"
        :fill="isOn ? activeColor : '#606080'">SOL</text>

      <!-- Status LED dot on coil -->
      <circle :cx="w*0.76" :cy="h*0.15" :r="h*0.06"
        :fill="isOn ? activeColor : '#2a2a40'"
        :stroke="isOn ? activeColor : '#44445a'"
        stroke-width="1"
        :style="isOn ? `filter:drop-shadow(0 0 3px ${activeColor})` : ''"/>

      <!-- Invalid overlay -->
      <rect v-if="d.isInvalid" x="0" y="0" :width="w" :height="h"
        fill="rgba(231,76,60,0.35)" rx="3"/>
    </svg>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useNodeData } from "./useNodeData";

const { d, w, h } = useNodeData(80, 75);
const pad     = computed(() => Math.min(w.value, h.value) * 0.05);
const bodyTop = computed(() => h.value * 0.38);
const bodyBot = computed(() => h.value * 0.82);

const isOn        = computed(() => !!d.value.statusColor && d.value.statusColor !== "");
const activeColor = computed(() => (d.value.statusColor as string) || "#4a9eff");

const bodyFill = computed(() => {
  if (d.value.isInvalid) return "#e74c3c";
  const sc = d.value.statusColor;
  return (sc && sc !== "") ? sc : "#0a0a18";
});

const coilFill = computed(() =>
  isOn.value ? "#0a1a30" : "#0e0e1e"
);
</script>

<style scoped>
.node-wrap { width: 100%; height: 100%; overflow: visible; }
svg { overflow: visible; }
</style>
