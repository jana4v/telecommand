<template>
  <div class="node-wrap" :style="{ opacity: d.opacity ?? 1 }">
    <svg :width="w" :height="h" :viewBox="`0 0 ${w} ${h}`" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient :id="`pyro-glow-${uid}`" cx="50%" cy="50%" r="50%">
          <stop offset="0%"   :stop-color="firedColor" stop-opacity="0.6"/>
          <stop offset="100%" :stop-color="firedColor" stop-opacity="0"/>
        </radialGradient>
      </defs>

      <!-- Fired glow -->
      <ellipse v-if="isFired"
        :cx="w/2" :cy="h*0.55"
        :rx="w*0.48" :ry="h*0.38"
        :fill="`url(#pyro-glow-${uid})`"
      />

      <!-- Bow-tie valve body -->
      <polygon
        :points="`${pad},${bodyTop} ${w-pad},${bodyBot} ${w-pad},${bodyTop} ${pad},${bodyBot}`"
        :fill="bodyFill"
        stroke="url(#pyro-metal)"
        stroke-width="3"
        stroke-linejoin="round"
      />

      <!-- Metal gradient def -->
      <defs>
        <linearGradient id="pyro-metal" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%"   stop-color="#b08040"/>
          <stop offset="50%"  stop-color="#e0b060"/>
          <stop offset="100%" stop-color="#b08040"/>
        </linearGradient>
      </defs>

      <!-- Pyro cap/actuator on top -->
      <rect :x="w*0.35" :y="0" :width="w*0.30" :height="h*0.22"
        :fill="capFill" stroke="#c08030" stroke-width="1.5" rx="2"/>

      <!-- Stem connecting cap to body -->
      <rect :x="w/2-3" :y="h*0.20" width="6" :height="h*0.12"
        fill="#a07030"/>

      <!-- "P" label inside cap -->
      <text :x="w/2" :y="h*0.175"
        text-anchor="middle" dominant-baseline="middle"
        :font-size="Math.max(8, h*0.13)" font-weight="900"
        font-family="monospace"
        :fill="isFired ? '#fff' : '#ffcc66'">P</text>

      <!-- PYRO text below body -->
      <text :x="w/2" :y="h-2"
        text-anchor="middle" dominant-baseline="auto"
        :font-size="Math.max(7, h*0.11)" font-weight="700"
        font-family="monospace"
        :fill="isFired ? firedColor : '#907040'">PYRO</text>

      <!-- Invalid overlay -->
      <rect v-if="d.isInvalid" x="0" y="0" :width="w" :height="h"
        fill="rgba(231,76,60,0.35)" rx="3"/>
    </svg>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from "vue";
import { useNodeData } from "./useNodeData";

const { d, w, h } = useNodeData(80, 70);
const uid     = ref(Math.random().toString(36).slice(2, 8));
const pad     = computed(() => Math.min(w.value, h.value) * 0.06);
const bodyTop = computed(() => h.value * 0.30);
const bodyBot = computed(() => h.value * 0.78);

const isFired   = computed(() => (d.value.position as number) >= 1);
const firedColor = "#ff9800";

const bodyFill = computed(() => {
  if (d.value.isInvalid) return "#e74c3c";
  if (isFired.value)     return "#3a1800";
  const sc = d.value.statusColor;
  return (sc && sc !== "") ? sc : "#1a1208";
});

const capFill = computed(() =>
  isFired.value ? "#ff7000" : d.value.statusColor && d.value.statusColor !== "" ? (d.value.statusColor as string) : "#2a1800"
);
</script>

<style scoped>
.node-wrap { width: 100%; height: 100%; overflow: visible; }
svg { overflow: visible; }
</style>
