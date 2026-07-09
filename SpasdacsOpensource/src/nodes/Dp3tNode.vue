<template>
  <div class="node-wrap" :style="{ opacity: d.opacity ?? 1 }">
    <svg :width="w" :height="h" :viewBox="`0 0 ${w} ${h}`" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="dp3t-ring" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%"   stop-color="#a8a8b8"/>
          <stop offset="25%"  stop-color="#68687a"/>
          <stop offset="50%"  stop-color="#d8d8e8"/>
          <stop offset="75%"  stop-color="#68687a"/>
          <stop offset="100%" stop-color="#a8a8b8"/>
        </linearGradient>
        <radialGradient id="dp3t-body" cx="50%" cy="50%" r="50%">
          <stop offset="0%"   stop-color="#22223a"/>
          <stop offset="85%"  stop-color="#14142a"/>
          <stop offset="100%" stop-color="#0a0a1a"/>
        </radialGradient>
        <linearGradient id="dp3t-route" gradientUnits="userSpaceOnUse" x1="0" y1="0" :x2="w" y2="0">
          <stop offset="0%"   stop-color="#a8c8e8"/>
          <stop offset="50%"  stop-color="#e0f0ff"/>
          <stop offset="100%" stop-color="#6090b8"/>
        </linearGradient>
      </defs>

      <!-- Outer metallic frame (portrait rectangle) -->
      <rect :x="bdO" :y="bdO" :width="w-bdSw" :height="h-bdSw"
        fill="url(#dp3t-body)"
        :stroke="bodyFill !== '' ? bodyFill : 'url(#dp3t-ring)'"
        :stroke-width="bdSw"
        :rx="bdRx"
      />
      <!-- Inner glow ring -->
      <rect :x="glO" :y="glO" :width="w-2*glO" :height="h-2*glO"
        fill="none"
        stroke="rgba(100,140,255,0.10)"
        :stroke-width="bdSw"
        :rx="bdO"
      />
      <!-- Invalid overlay -->
      <rect v-if="d.isInvalid" :x="bdO" :y="bdO" :width="w-bdSw" :height="h-bdSw"
        fill="rgba(231,76,60,0.35)" :rx="bdRx" />

      <!--
        Port Y positions:
          L1 = 25%,  L2 = 75%
          R1 = 17%,  R2 = 50%,  R3 = 83%

        POS0: L1→R1, L2→R2
        POS1: L1→R2, L2→R3
        POS2: L1→R3, L2→R1 (cross)
      -->

      <!-- Pole L1: right endpoint slides R1(17%)→R2(50%)→R3(83%) -->
      <line :x1="dotR" :y1="h*0.25" :x2="w-dotR" :y2="l1Ry"
        stroke="url(#dp3t-route)" :stroke-width="polW" stroke-linecap="round" />
      <!-- Pole L2: right endpoint slides R2(50%)→R3(83%)→R1(17%) -->
      <line :x1="dotR" :y1="h*0.75" :x2="w-dotR" :y2="l2Ry"
        stroke="url(#dp3t-route)" :stroke-width="polW" stroke-linecap="round" />

      <!-- Connecting points: L1 (25%), L2 (75%) -->
      <circle :cx="dotR" :cy="h*0.25" :r="dotR" fill="#0d1117" stroke="#8090a0" :stroke-width="dotSw"/>
      <circle :cx="dotR" :cy="h*0.25" :r="dotI" fill="#5080a0"/>
      <circle :cx="dotR" :cy="h*0.75" :r="dotR" fill="#0d1117" stroke="#8090a0" :stroke-width="dotSw"/>
      <circle :cx="dotR" :cy="h*0.75" :r="dotI" fill="#5080a0"/>
      <!-- Connecting points: R1 (17%), R2 (50%), R3 (83%) -->
      <circle :cx="w-dotR" :cy="h*0.17" :r="dotR" fill="#0d1117" stroke="#8090a0" :stroke-width="dotSw"/>
      <circle :cx="w-dotR" :cy="h*0.17" :r="dotI" fill="#5080a0"/>
      <circle :cx="w-dotR" :cy="h*0.50" :r="dotR" fill="#0d1117" stroke="#8090a0" :stroke-width="dotSw"/>
      <circle :cx="w-dotR" :cy="h*0.50" :r="dotI" fill="#5080a0"/>
      <circle :cx="w-dotR" :cy="h*0.83" :r="dotR" fill="#0d1117" stroke="#8090a0" :stroke-width="dotSw"/>
      <circle :cx="w-dotR" :cy="h*0.83" :r="dotI" fill="#5080a0"/>

    </svg>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useNodeData } from "./useNodeData";
import { usePositionAnim } from "./usePositionAnim";
const { d, w, h } = useNodeData(70, 120);
const animVal  = usePositionAnim(() => (d.value.position ?? 0) as number);
const bodyFill = computed(() => {
  if (d.value.isInvalid) return "#e74c3c";
  const sc = d.value.statusColor;
  return (sc && sc !== "") ? sc : "";
});
// Proportional scale helpers
const scl   = computed(() => Math.min(w.value, h.value));
const bdSw  = computed(() => scl.value * 0.085);
const bdO   = computed(() => bdSw.value * 0.5);
const bdRx  = computed(() => scl.value * 0.110);
const glO   = computed(() => bdSw.value * 1.5);
const dotR  = computed(() => scl.value * 0.070);
const dotI  = computed(() => scl.value * 0.035);
const dotSw = computed(() => scl.value * 0.022);
const polW  = computed(() => scl.value * 0.044);

function lerp(a: number, b: number, t: number) { return a + (b - a) * t; }
// L1 right-end Y: POS0→R1(17%), POS1→R2(50%), POS2→R3(83%)
const l1Ry = computed(() => {
  const v = Math.max(0, Math.min(2, animVal.value));
  return v <= 1 ? h.value * lerp(0.17, 0.50, v) : h.value * lerp(0.50, 0.83, v - 1);
});
// L2 right-end Y: POS0→R2(50%), POS1→R3(83%), POS2→R1(17%)
const l2Ry = computed(() => {
  const v = Math.max(0, Math.min(2, animVal.value));
  return v <= 1 ? h.value * lerp(0.50, 0.83, v) : h.value * lerp(0.83, 0.17, v - 1);
});
</script>

<style scoped>
.node-wrap { width: 100%; height: 100%; overflow: visible; }
svg { overflow: visible; }
</style>
