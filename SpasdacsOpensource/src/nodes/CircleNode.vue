<template>
  <div class="node-wrap" :style="{ opacity: d.opacity ?? 1 }">
    <svg :width="w" :height="h" :viewBox="`0 0 ${w} ${h}`" xmlns="http://www.w3.org/2000/svg">
      <circle :cx="cx" :cy="cy" :r="r"
        :fill="d.statusColor || d.fill || '#22223a'"
        :stroke="d.stroke || '#a8a8b8'"
        :stroke-width="d.strokeWidth || 3"
      />
      <text v-if="d.statusText" :x="cx" :y="cy+4" text-anchor="middle" dominant-baseline="middle"
        font-size="12" fill="#e6edf3">{{ d.statusText }}</text>
      <rect v-if="d.isInvalid" x="0" y="0" :width="w" :height="h" fill="rgba(231,76,60,0.3)" />
    </svg>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useNodeData } from "./useNodeData";
const { d, w, h } = useNodeData(60, 60);
const cx = computed(() => w.value / 2);
const cy = computed(() => h.value / 2);
const r  = computed(() => Math.min(w.value, h.value) / 2 - 3);
</script>

<style scoped>
.node-wrap { width: 100%; height: 100%; overflow: visible; }
svg { overflow: visible; }
</style>
