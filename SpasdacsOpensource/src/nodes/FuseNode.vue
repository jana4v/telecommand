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
        <linearGradient :id="bodyOffId" gradientUnits="userSpaceOnUse" x1="0" y1="0" :x2="w" y2="0">
          <stop offset="0%" stop-color="#1a2230" />
          <stop offset="55%" stop-color="#0f1622" />
          <stop offset="100%" stop-color="#0a1018" />
        </linearGradient>
      </defs>

      <!-- Leads -->
      <line :x1="0" :y1="h * 0.5" :x2="w * 0.2" :y2="h * 0.5" :stroke="`url(#${metalId})`" stroke-width="3" stroke-linecap="round" />
      <line :x1="w * 0.8" :y1="h * 0.5" :x2="w" :y2="h * 0.5" :stroke="`url(#${metalId})`" stroke-width="3" stroke-linecap="round" />

      <!-- Glass/ceramic body -->
      <rect
        :x="w * 0.2"
        :y="h * 0.12"
        :width="w * 0.6"
        :height="h * 0.76"
        rx="4"
        :fill="bodyFill"
        :stroke="`url(#${metalId})`"
        stroke-width="2.5"
      />

      <!-- End caps -->
      <rect :x="w * 0.2" :y="h * 0.2" :width="w * 0.055" :height="h * 0.6" :fill="`url(#${metalId})`" />
      <rect :x="w * 0.745" :y="h * 0.2" :width="w * 0.055" :height="h * 0.6" :fill="`url(#${metalId})`" />

      <!-- Fuse filament -->
      <polyline
        :points="filamentPath"
        fill="none"
        :stroke="filamentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      />

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

const metalId = computed(() => `fuse-metal-${uid.value}`);
const bodyOffId = computed(() => `fuse-body-off-${uid.value}`);

const bodyFill = computed(() => {
  if (d.value.isInvalid) return "#e74c3c";
  const sc = d.value.statusColor;
  return sc && sc !== "" ? sc : `url(#${bodyOffId.value})`;
});

const filamentColor = computed(() => {
  if (d.value.isInvalid) return "#ffd0cc";
  const sc = d.value.statusColor;
  return sc && sc !== "" ? "#e7f5ff" : "#d7deea";
});

const filamentPath = computed(() => {
  const y = h.value * 0.5;
  return `${w.value * 0.275},${y} ${w.value * 0.385},${h.value * 0.34} ${w.value * 0.5},${h.value * 0.66} ${w.value * 0.615},${h.value * 0.34} ${w.value * 0.725},${y}`;
});
</script>

<style scoped>
.node-wrap { width: 100%; height: 100%; overflow: visible; }
svg { overflow: visible; }
</style>