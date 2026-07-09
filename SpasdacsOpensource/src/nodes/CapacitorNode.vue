<template>
  <div class="node-wrap" :style="{ opacity: d.opacity ?? 1 }">
    <svg :width="w" :height="h" :viewBox="`0 0 ${w} ${h}`" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient :id="metalId" gradientUnits="userSpaceOnUse" x1="0" y1="0" :x2="w" y2="0">
          <stop offset="0%" stop-color="#9aa2af" />
          <stop offset="25%" stop-color="#5a6272" />
          <stop offset="50%" stop-color="#d7deea" />
          <stop offset="75%" stop-color="#5a6272" />
          <stop offset="100%" stop-color="#9aa2af" />
        </linearGradient>
      </defs>

      <!-- Leads -->
      <line :x1="0" :y1="h * 0.5" :x2="w * 0.39" :y2="h * 0.5" :stroke="`url(#${metalId})`" stroke-width="3" stroke-linecap="round" />
      <line :x1="w * 0.61" :y1="h * 0.5" :x2="w" :y2="h * 0.5" :stroke="`url(#${metalId})`" stroke-width="3" stroke-linecap="round" />

      <!-- Parallel plates -->
      <line :x1="w * 0.44" :y1="h * 0.18" :x2="w * 0.44" :y2="h * 0.82" :stroke="plateColor" stroke-width="4" stroke-linecap="round" />
      <line :x1="w * 0.56" :y1="h * 0.18" :x2="w * 0.56" :y2="h * 0.82" :stroke="plateColor" stroke-width="4" stroke-linecap="round" />

      <circle cx="5" :cy="h * 0.5" r="5" fill="#0d1117" stroke="#8090a0" stroke-width="1.5" />
      <circle cx="5" :cy="h * 0.5" r="2.5" fill="#5080a0" />
      <circle :cx="w - 5" :cy="h * 0.5" r="5" fill="#0d1117" stroke="#8090a0" stroke-width="1.5" />
      <circle :cx="w - 5" :cy="h * 0.5" r="2.5" fill="#5080a0" />

      <rect v-if="d.isInvalid" x="0" y="0" :width="w" :height="h" fill="rgba(231,76,60,0.3)" />
    </svg>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import { useNodeData } from "./useNodeData";

const { d, w, h } = useNodeData(100, 44);
const uid = ref(Math.random().toString(36).slice(2, 8));

const metalId = computed(() => `cap-metal-${uid.value}`);
const plateColor = computed(() => {
  if (d.value.isInvalid) return "#ffd0cc";
  const sc = d.value.statusColor;
  return sc && sc !== "" ? sc : `url(#${metalId.value})`;
});
</script>

<style scoped>
.node-wrap { width: 100%; height: 100%; overflow: visible; }
svg { overflow: visible; }
</style>