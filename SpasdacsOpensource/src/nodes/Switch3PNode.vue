<template>
  <div class="node-wrap" :style="{ opacity: d.opacity ?? 1 }">
    <svg :width="w" :height="h" :viewBox="`0 0 ${w} ${h}`" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="sw3p-ring" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%"   stop-color="#a8a8b8"/>
          <stop offset="25%"  stop-color="#68687a"/>
          <stop offset="50%"  stop-color="#d8d8e8"/>
          <stop offset="75%"  stop-color="#68687a"/>
          <stop offset="100%" stop-color="#a8a8b8"/>
        </linearGradient>
        <radialGradient id="sw3p-body" cx="50%" cy="50%" r="50%">
          <stop offset="0%"   stop-color="#22223a"/>
          <stop offset="85%"  stop-color="#14142a"/>
          <stop offset="100%" stop-color="#0a0a1a"/>
        </radialGradient>
        <linearGradient id="sw3p-route" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%"   stop-color="#a8c8e8"/>
          <stop offset="50%"  stop-color="#e0f0ff"/>
          <stop offset="100%" stop-color="#6090b8"/>
        </linearGradient>
      </defs>

      <!-- Outer metallic ring (circle) -->
      <ellipse :cx="cx" :cy="cy" :rx="cx-bdO" :ry="cy-bdO"
        fill="url(#sw3p-body)"
        :stroke="bodyFill !== '' ? bodyFill : 'url(#sw3p-ring)'"
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

      <!-- Pole A (L-anchored): endpoint moves B→R→T as position increases -->
      <path :d="poleA" fill="none" stroke="url(#sw3p-route)" :stroke-width="polW" stroke-linecap="round"/>
      <!-- Pole B: T→R, T→B, B→R with interpolated control points -->
      <path :d="poleB" fill="none" stroke="url(#sw3p-route)" :stroke-width="polW" stroke-linecap="round"/>

      <!-- Connecting points: T, B, L, R -->
      <circle :cx="cx" :cy="dotR" :r="dotR" fill="#0d1117" stroke="#8090a0" :stroke-width="dotSw"/>
      <circle :cx="cx" :cy="dotR" :r="dotI" fill="#5080a0"/>
      <circle :cx="cx" :cy="h-dotR" :r="dotR" fill="#0d1117" stroke="#8090a0" :stroke-width="dotSw"/>
      <circle :cx="cx" :cy="h-dotR" :r="dotI" fill="#5080a0"/>
      <circle :cx="dotR" :cy="cy" :r="dotR" fill="#0d1117" stroke="#8090a0" :stroke-width="dotSw"/>
      <circle :cx="dotR" :cy="cy" :r="dotI" fill="#5080a0"/>
      <circle :cx="w-dotR" :cy="cy" :r="dotR" fill="#0d1117" stroke="#8090a0" :stroke-width="dotSw"/>
      <circle :cx="w-dotR" :cy="cy" :r="dotI" fill="#5080a0"/>

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
const bodyFill = computed(() => {
  if (d.value.isInvalid) return "#e74c3c";
  const sc = d.value.statusColor;
  return (sc && sc !== "") ? sc : "";
});
// Proportional scale helpers
const scl   = computed(() => Math.min(w.value, h.value));
const bdSw  = computed(() => scl.value * 0.085);
const bdO   = computed(() => bdSw.value * 0.5);
const glO   = computed(() => bdSw.value * 1.5);
const dotR  = computed(() => scl.value * 0.070);
const dotI  = computed(() => scl.value * 0.035);
const dotSw = computed(() => scl.value * 0.022);
const polW  = computed(() => scl.value * 0.044);

// Cubic bezier interpolation helper
interface CS { sx:number; sy:number; cp1x:number; cp1y:number; cp2x:number; cp2y:number; ex:number; ey:number }
function ic(a: CS, b: CS, t: number): string {
  const l = (p:number,q:number) => p+(q-p)*t;
  return `M ${l(a.sx,b.sx)} ${l(a.sy,b.sy)} C ${l(a.cp1x,b.cp1x)} ${l(a.cp1y,b.cp1y)} ${l(a.cp2x,b.cp2x)} ${l(a.cp2y,b.cp2y)} ${l(a.ex,b.ex)} ${l(a.ey,b.ey)}`;
}

// Pole A — always starts at L(dotR, cy), endpoint sweeps B→R→T
const poleA = computed(() => {
  const W=w.value, H=h.value, C=W/2, M=H/2, D=dotR.value;
  const s: CS[] = [
    { sx:D,  sy:M, cp1x:C/2, cp1y:M,   cp2x:C,    cp2y:M+M/2, ex:C,   ey:H-D }, // L→B
    { sx:D,  sy:M, cp1x:W/3, cp1y:M,   cp2x:2*W/3, cp2y:M,     ex:W-D, ey:M   }, // L→R
    { sx:D,  sy:M, cp1x:C/2, cp1y:M,   cp2x:C,    cp2y:M/2,   ex:C,   ey:D   }, // L→T
  ];
  const v = Math.max(0, Math.min(2, animVal.value));
  const i = Math.min(Math.floor(v), 1);
  return ic(s[i], s[i+1], v-i);
});

// Pole B — T→R, T→B, B→R
const poleB = computed(() => {
  const W=w.value, H=h.value, C=W/2, M=H/2, D=dotR.value;
  const s: CS[] = [
    { sx:C, sy:D,   cp1x:C, cp1y:M/2,   cp2x:C+C/2, cp2y:M,     ex:W-D, ey:M   }, // T→R
    { sx:C, sy:D,   cp1x:C, cp1y:H/3,   cp2x:C,     cp2y:2*H/3, ex:C,   ey:H-D }, // T→B
    { sx:C, sy:H-D, cp1x:C, cp1y:M+M/2, cp2x:C+C/2, cp2y:M,     ex:W-D, ey:M   }, // B→R
  ];
  const v = Math.max(0, Math.min(2, animVal.value));
  const i = Math.min(Math.floor(v), 1);
  return ic(s[i], s[i+1], v-i);
});
</script>

<style scoped>
.node-wrap { width: 100%; height: 100%; overflow: visible; }
svg { overflow: visible; }
</style>
