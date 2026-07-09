<template>
  <div class="node-wrap" :style="{ opacity: d.opacity ?? 1 }">
    <svg :width="w" :height="h" :viewBox="`0 0 ${w} ${h}`" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="valve-metal" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%"   stop-color="#a8a8b8"/>
          <stop offset="25%"  stop-color="#68687a"/>
          <stop offset="50%"  stop-color="#d8d8e8"/>
          <stop offset="75%"  stop-color="#68687a"/>
          <stop offset="100%" stop-color="#a8a8b8"/>
        </linearGradient>
        <radialGradient id="valve-off" cx="50%" cy="50%" r="50%">
          <stop offset="0%"   stop-color="#222236"/>
          <stop offset="60%"  stop-color="#10101e"/>
          <stop offset="100%" stop-color="#04040c"/>
        </radialGradient>
      </defs>

      <!-- Bow-tie body -->
      <polygon
        :points="`${pad},${pad} ${w-pad},${h-pad} ${w-pad},${pad} ${pad},${h-pad}`"
        :fill="bodyFill"
        stroke="url(#valve-metal)"
        stroke-width="4"
        stroke-linejoin="round"
      />
      <!-- T-actuator: horizontal bar -->
      <rect :x="w*0.28" y="0" :width="w*0.44" height="5" fill="url(#valve-metal)" />
      <!-- T-actuator: vertical stem -->
      <rect :x="w/2-4" y="0" width="8" :height="h*0.3" fill="url(#valve-metal)" />

      <!-- Invalid overlay -->
      <rect v-if="d.isInvalid" x="0" y="0" :width="w" :height="h" fill="rgba(231,76,60,0.35)" rx="3" />
    </svg>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useNodeData } from "./useNodeData";
const { d, w, h } = useNodeData(80, 60);
const pad      = computed(() => Math.min(w.value, h.value) * 0.05);
const bodyFill = computed(() => {
  if (d.value.isInvalid) return "#e74c3c";
  const sc = d.value.statusColor;
  return (sc && sc !== "") ? sc : "url(#valve-off)";
});
</script>

<style scoped>
.node-wrap { width: 100%; height: 100%; overflow: visible; }
svg { overflow: visible; }
</style>
