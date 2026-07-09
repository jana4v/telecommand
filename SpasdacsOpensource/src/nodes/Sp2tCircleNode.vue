<!-- SP2TC: SP2T Switch with circular body (round variant) -->
<template>
  <div class="node-wrap" :style="{ opacity: d.opacity ?? 1 }">
    <svg :width="w" :height="h" :viewBox="`0 0 ${w} ${h}`" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="sp2tc-ring" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%"   stop-color="#a8a8b8"/>
          <stop offset="25%"  stop-color="#68687a"/>
          <stop offset="50%"  stop-color="#d8d8e8"/>
          <stop offset="75%"  stop-color="#68687a"/>
          <stop offset="100%" stop-color="#a8a8b8"/>
        </linearGradient>
        <radialGradient id="sp2tc-body" cx="50%" cy="50%" r="50%">
          <stop offset="0%"   stop-color="#22223a"/>
          <stop offset="85%"  stop-color="#14142a"/>
          <stop offset="100%" stop-color="#0a0a1a"/>
        </radialGradient>
        <linearGradient id="sp2tc-route" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%"   stop-color="#a8c8e8"/>
          <stop offset="50%"  stop-color="#e0f0ff"/>
          <stop offset="100%" stop-color="#6090b8"/>
        </linearGradient>
      </defs>

      <!-- Outer metallic ring (circle) -->
      <ellipse :cx="cx" :cy="cy" :rx="cx-bdO" :ry="cy-bdO"
        fill="url(#sp2tc-body)"
        :stroke="bodyFill !== '' ? bodyFill : 'url(#sp2tc-ring)'"
        :stroke-width="bdSw"
      />
      <!-- Inner glow ring -->
      <ellipse :cx="cx" :cy="cy" :rx="Math.max(dotI, cx-glO)" :ry="Math.max(dotI, cy-glO)"
        fill="none"
        stroke="rgba(100,140,255,0.10)"
        :stroke-width="bdSw"
      />
      <!-- Invalid overlay -->
      <ellipse v-if="d.isInvalid" :cx="cx" :cy="cy" :rx="cx-bdO" :ry="cy-bdO"
        fill="rgba(231,76,60,0.35)"
      />

      <!-- Single pole: right endpoint slides between R1 (25%) and R2 (75%) -->
      <line
        :x1="dotR" :y1="cy"
        :x2="w-dotR" :y2="routeY2"
        stroke="url(#sp2tc-route)"
        :stroke-width="polW"
        stroke-linecap="round"
      />

      <!-- Connecting point: L (left-center) -->
      <circle :cx="dotR" :cy="cy" :r="dotR" fill="#0d1117" stroke="#8090a0" :stroke-width="dotSw"/>
      <circle :cx="dotR" :cy="cy" :r="dotI" fill="#5080a0"/>
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
const { d, w, h } = useNodeData(90, 90);
const cx = computed(() => w.value / 2);
const cy = computed(() => h.value / 2);
const animVal  = usePositionAnim(() => (d.value.position ?? 0) as number);
const pos      = computed(() => Math.round(animVal.value));
const bodyFill = computed(() => {
  if (d.value.isInvalid) return "#e74c3c";
  const sc = d.value.statusColor;
  return (sc && sc !== "") ? sc : "";
});
const routeY2  = computed(() => h.value * (0.25 + 0.5 * Math.max(0, Math.min(1, animVal.value))));
// Proportional scale helpers
const scl   = computed(() => Math.min(w.value, h.value));
const bdSw  = computed(() => scl.value * 0.085);
const bdO   = computed(() => bdSw.value * 0.5);
const glO   = computed(() => bdSw.value * 1.5);
const dotR  = computed(() => scl.value * 0.070);
const dotI  = computed(() => scl.value * 0.035);
const dotSw = computed(() => scl.value * 0.022);
const polW  = computed(() => scl.value * 0.044);
</script>

<style scoped>
.node-wrap { width: 100%; height: 100%; overflow: visible; }
svg { overflow: visible; }
</style>
