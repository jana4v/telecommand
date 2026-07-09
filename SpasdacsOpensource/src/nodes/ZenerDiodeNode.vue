<template>
  <div class="node-wrap" :style="{ opacity: d.opacity ?? 1 }">
    <svg :width="w" :height="h" :viewBox="`0 0 ${w} ${h}`" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="zd-metal" gradientUnits="userSpaceOnUse" x1="0" y1="0" :x2="w" y2="0">
          <stop offset="0%"   stop-color="#a8a8b8"/>
          <stop offset="25%"  stop-color="#68687a"/>
          <stop offset="50%"  stop-color="#d8d8e8"/>
          <stop offset="75%"  stop-color="#68687a"/>
          <stop offset="100%" stop-color="#a8a8b8"/>
        </linearGradient>
        <radialGradient id="zd-off" cx="50%" cy="50%" r="50%">
          <stop offset="0%"   stop-color="#222236"/>
          <stop offset="60%"  stop-color="#10101e"/>
          <stop offset="100%" stop-color="#04040c"/>
        </radialGradient>
      </defs>

      <!-- Filled anode triangle (base left, apex right) -->
      <polygon
        :points="`${w*0.18},${h*0.1} ${w*0.72},${h*0.5} ${w*0.18},${h*0.9}`"
        :fill="bodyFill"
        stroke="url(#zd-metal)"
        stroke-width="3"
        stroke-linejoin="round"
      />
      <!-- Left lead -->
      <line :x1="0" :y1="h*0.5" :x2="w*0.18" :y2="h*0.5"
        stroke="url(#zd-metal)" stroke-width="3" stroke-linecap="round" />
      <!-- Zener cathode: top-left bent tip → bar top → bar → bar bottom → bottom-right bent tip -->
      <polyline
        :points="`${w*0.60},${h*0.06} ${w*0.72},${h*0.14} ${w*0.72},${h*0.86} ${w*0.84},${h*0.94}`"
        fill="none"
        stroke="url(#zd-metal)"
        stroke-width="4"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
      <!-- Right lead -->
      <line :x1="w*0.72" :y1="h*0.5" :x2="w" :y2="h*0.5"
        stroke="url(#zd-metal)" stroke-width="3" stroke-linecap="round" />

      <!-- Connecting points: left (input) and right (output) -->
      <circle cx="5" :cy="h*0.5" r="5" fill="#0d1117" stroke="#8090a0" stroke-width="1.5"/>
      <circle cx="5" :cy="h*0.5" r="2.5" fill="#5080a0"/>
      <circle :cx="w-5" :cy="h*0.5" r="5" fill="#0d1117" stroke="#8090a0" stroke-width="1.5"/>
      <circle :cx="w-5" :cy="h*0.5" r="2.5" fill="#5080a0"/>

      <!-- Invalid overlay -->
      <rect v-if="d.isInvalid" x="0" y="0" :width="w" :height="h" fill="rgba(231,76,60,0.3)" />
    </svg>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useNodeData } from "./useNodeData";
const { d, w, h } = useNodeData(100, 80);
const bodyFill = computed(() => {
  if (d.value.isInvalid) return "#e74c3c";
  const sc = d.value.statusColor;
  return (sc && sc !== "") ? sc : "url(#zd-off)";
});
</script>

<style scoped>
.node-wrap { width: 100%; height: 100%; overflow: visible; }
svg { overflow: visible; }
</style>
