<template>
  <div class="node-wrap" :style="{ opacity: d.opacity ?? 1 }">
    <svg :width="w" :height="h" :viewBox="`0 0 ${w} ${h}`" xmlns="http://www.w3.org/2000/svg"
      xmlns:xlink="http://www.w3.org/1999/xlink">

      <!-- Image element -->
      <!-- none = stretch to node w×h so bitmap always fills the selection box (no letterboxing) -->
      <image
        v-if="d.imageSource"
        :href="d.imageSource"
        x="0" y="0"
        :width="w"
        :height="h"
        preserveAspectRatio="none"
      />

      <!-- Placeholder when no image is set -->
      <g v-else>
        <rect x="1" y="1" :width="w-2" :height="h-2"
          fill="#0d1117" stroke="#30363d" stroke-width="1.5" rx="4" />
        <text :x="w/2" :y="h/2-8" text-anchor="middle" font-size="24" fill="#30363d">🖼</text>
        <text :x="w/2" :y="h/2+12" text-anchor="middle" font-size="11"
          font-family="'Segoe UI', sans-serif" fill="#8b949e">Paste or set imageSource</text>
      </g>

      <!-- Invalid overlay -->
      <rect v-if="d.isInvalid" x="0" y="0" :width="w" :height="h"
        fill="rgba(231,76,60,0.35)" rx="4" />


    </svg>
  </div>
</template>

<script setup lang="ts">
import { useNodeData } from "./useNodeData";
const { d, w, h } = useNodeData(160, 120);
</script>

<style scoped>
.node-wrap {
  width: 100%;
  height: 100%;
  margin: 0;
  padding: 0;
  line-height: 0;
  overflow: hidden;
}
svg {
  display: block;
  margin: 0;
  padding: 0;
  overflow: hidden;
}
</style>
