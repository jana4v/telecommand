<!-- SP2T No Background: routing lines only, no visible body -->
<template>
  <div class="node-wrap" :style="{ opacity: d.opacity ?? 1 }">
    <svg :width="w" :height="h" :viewBox="`0 0 ${w} ${h}`" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="sp2tnb-route" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%"   stop-color="#a8c8e8"/>
          <stop offset="50%"  stop-color="#e0f0ff"/>
          <stop offset="100%" stop-color="#6090b8"/>
        </linearGradient>
      </defs>

      <!-- Single pole: right endpoint slides between R1 (25%) and R2 (75%) -->
      <line
        :x1="dotR" :y1="h*0.5"
        :x2="w-dotR" :y2="routeY2"
        stroke="url(#sp2tnb-route)"
        :stroke-width="polW"
        stroke-linecap="round"
      />

      <!-- Connecting point: L (left-center) -->
      <circle :cx="dotR" :cy="h*0.5" :r="dotR" fill="#0d1117" stroke="#8090a0" :stroke-width="dotSw"/>
      <circle :cx="dotR" :cy="h*0.5" :r="dotI" fill="#5080a0"/>
      <!-- Connecting point: R1 (right-upper) -->
      <circle :cx="w-dotR" :cy="h*0.25" :r="dotR" fill="#0d1117" stroke="#8090a0" :stroke-width="dotSw"/>
      <circle :cx="w-dotR" :cy="h*0.25" :r="dotI" :fill="pos===0 ? '#7ab8f0' : '#5080a0'"/>
      <!-- Connecting point: R2 (right-lower) -->
      <circle :cx="w-dotR" :cy="h*0.75" :r="dotR" fill="#0d1117" stroke="#8090a0" :stroke-width="dotSw"/>
      <circle :cx="w-dotR" :cy="h*0.75" :r="dotI" :fill="pos===1 ? '#7ab8f0' : '#5080a0'"/>

    </svg>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useNodeData } from "./useNodeData";
import { usePositionAnim } from "./usePositionAnim";
const { d, w, h } = useNodeData(70, 90);
const animVal  = usePositionAnim(() => (d.value.position ?? 0) as number);
const pos      = computed(() => Math.round(animVal.value));
const routeY2  = computed(() => h.value * (0.25 + 0.5 * Math.max(0, Math.min(1, animVal.value))));
// Proportional scale helpers
const scl   = computed(() => Math.min(w.value, h.value));
const dotR  = computed(() => scl.value * 0.070);
const dotI  = computed(() => scl.value * 0.035);
const dotSw = computed(() => scl.value * 0.022);
const polW  = computed(() => scl.value * 0.044);
</script>

<style scoped>
.node-wrap { width: 100%; height: 100%; overflow: visible; }
svg { overflow: visible; }
</style>
