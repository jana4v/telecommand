<template>
  <div class="node-wrap" :style="{ opacity: d.opacity ?? 1 }">
    <svg :width="w" :height="h" :viewBox="`0 0 ${w} ${h}`" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="hex-warm" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%"   stop-color="#c04020"/>
          <stop offset="100%" stop-color="#804010"/>
        </linearGradient>
        <linearGradient id="hex-cool" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%"   stop-color="#204080"/>
          <stop offset="100%" stop-color="#103060"/>
        </linearGradient>
      </defs>

      <!-- Outer body -->
      <rect x="0" y="0" :width="w" :height="h"
        :fill="bodyFill" :stroke="borderColor" stroke-width="2" rx="4"/>

      <!-- Internal channel divider -->
      <line :x1="0" :y1="h*0.50" :x2="w" :y2="h*0.50"
        :stroke="borderColor" stroke-width="1.5" stroke-dasharray="4,3" opacity="0.5"/>

      <!-- Hot fluid path (top) — serpentine -->
      <path :d="hotPath"
        fill="none" :stroke="isActive ? '#e05030' : '#502010'"
        stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/>

      <!-- Cold fluid path (bottom) — serpentine (reversed) -->
      <path :d="coldPath"
        fill="none" :stroke="isActive ? '#3070c0' : '#102040'"
        stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/>

      <!-- Hot inlet arrow (left top) -->
      <polygon :points="`${w*0.04},${h*0.22} ${w*0.10},${h*0.16} ${w*0.10},${h*0.28}`"
        :fill="isActive ? '#e05030' : '#502010'"/>
      <!-- Cold inlet arrow (right bottom) -->
      <polygon :points="`${w*0.96},${h*0.72} ${w*0.90},${h*0.66} ${w*0.90},${h*0.78}`"
        :fill="isActive ? '#3070c0' : '#102040'" transform="scale(-1,1)" :transform-origin="`${w/2} 0`"/>

      <!-- HEX type label (top-left) -->
      <text :x="w*0.05" :y="h*0.96"
        dominant-baseline="auto" font-size="9" font-weight="700"
        font-family="monospace" :fill="isActive ? '#c0c0e0' : '#505070'">{{ hexLabel }}</text>

      <!-- Temperature display -->
      <text v-if="hasTemp" :x="w*0.95" :y="h*0.96"
        text-anchor="end" dominant-baseline="auto"
        font-size="9" font-weight="600"
        font-family="monospace" :fill="tempColor">{{ tempText }}</text>

      <!-- Invalid overlay -->
      <rect v-if="d.isInvalid" x="0" y="0" :width="w" :height="h"
        fill="rgba(231,76,60,0.35)" rx="4"/>
    </svg>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useNodeData } from "./useNodeData";

const { d, w, h } = useNodeData(130, 80);

const isActive    = computed(() => !!d.value.statusColor && d.value.statusColor !== "");
const borderColor = computed(() => isActive.value ? "#607080" : "#2a3040");
const bodyFill    = computed(() => {
  if (d.value.isInvalid) return "#3a0a0a";
  return "#0a1018";
});

const hexLabel = computed(() => (d.value.name as string) || "HEX");

const hasTemp  = computed(() => d.value.temperature != null);
const tempVal  = computed(() => d.value.temperature as number);
const tempText = computed(() => `${tempVal.value?.toFixed(1)}°C`);
const tempColor = computed(() => {
  const t = tempVal.value;
  if (t == null) return "#808090";
  if (t > 60) return "#e05030";
  if (t > 40) return "#e0a020";
  return "#40a0e0";
});

// Serpentine path for hot side (top half)
const hotPath = computed(() => {
  const mx = w.value;
  const ty = h.value * 0.16;
  const by = h.value * 0.42;
  const cy = (ty + by) / 2;
  const segs = 3;
  const sw   = (mx - 20) / segs;
  let d2 = `M 10 ${cy}`;
  for (let i = 0; i < segs; i++) {
    const x0 = 10 + i * sw;
    const x1 = x0 + sw;
    const y  = i % 2 === 0 ? ty : by;
    d2 += ` Q ${x0 + sw * 0.5} ${y} ${x1} ${cy}`;
  }
  return d2;
});

// Serpentine path for cold side (bottom half) — reversed direction
const coldPath = computed(() => {
  const mx = w.value;
  const ty = h.value * 0.58;
  const by = h.value * 0.84;
  const cy = (ty + by) / 2;
  const segs = 3;
  const sw   = (mx - 20) / segs;
  let d2 = `M ${mx - 10} ${cy}`;
  for (let i = segs - 1; i >= 0; i--) {
    const x1 = 10 + i * sw;
    const x0 = x1 + sw;
    const y  = i % 2 === 0 ? ty : by;
    d2 += ` Q ${x1 + sw * 0.5} ${y} ${x1} ${cy}`;
  }
  return d2;
});
</script>

<style scoped>
.node-wrap { width: 100%; height: 100%; overflow: visible; }
svg { overflow: visible; }
</style>
