<template>
  <div class="node-wrap" :style="{ opacity: d.opacity ?? 1 }">
    <svg :width="w" :height="h" :viewBox="`0 0 ${w} ${h}`" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="mv-metal" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%"   stop-color="#a8a8b8"/>
          <stop offset="50%"  stop-color="#d0d0e0"/>
          <stop offset="100%" stop-color="#606078"/>
        </linearGradient>
        <radialGradient :id="`mv-motor-${uid}`" cx="40%" cy="35%" r="65%">
          <stop offset="0%"   :stop-color="motorHL"/>
          <stop offset="100%" :stop-color="motorFill"/>
        </radialGradient>
      </defs>

      <!-- Motor circle on top -->
      <circle :cx="w/2" :cy="motorCy" :r="motorR"
        :fill="`url(#mv-motor-${uid})`"
        stroke="url(#mv-metal)" :stroke-width="motorR*0.15"/>

      <!-- "M" label in motor -->
      <text :x="w/2" :y="motorCy"
        text-anchor="middle" dominant-baseline="middle"
        :font-size="motorR*0.80" font-weight="900"
        font-family="monospace"
        :fill="isOn ? activeColor : '#5a6a7a'">M</text>

      <!-- Rotation indicator arc (when on) -->
      <path v-if="isOn"
        :d="`M ${w/2 + motorR*0.55} ${motorCy - motorR*0.10}
             A ${motorR*0.55} ${motorR*0.55} 0 0 0 ${w/2 - motorR*0.40} ${motorCy - motorR*0.40}`"
        fill="none" :stroke="activeColor" :stroke-width="motorR*0.12"
        stroke-linecap="round" opacity="0.8"/>
      <!-- Arrow tip -->
      <polygon v-if="isOn"
        :points="`${w/2 - motorR*0.40},${motorCy - motorR*0.55}
                  ${w/2 - motorR*0.55},${motorCy - motorR*0.32}
                  ${w/2 - motorR*0.22},${motorCy - motorR*0.28}`"
        :fill="activeColor" opacity="0.8"/>

      <!-- Stem -->
      <rect :x="w/2-3" :y="motorCy+motorR" width="6" :height="h*0.10"
        fill="url(#mv-metal)"/>

      <!-- Bow-tie valve body -->
      <polygon
        :points="`${pad},${bodyTop} ${w-pad},${bodyBot} ${w-pad},${bodyTop} ${pad},${bodyBot}`"
        :fill="bodyFill"
        stroke="url(#mv-metal)"
        stroke-width="3"
        stroke-linejoin="round"
      />

      <!-- Position text -->
      <text :x="w/2" :y="h-2"
        text-anchor="middle" dominant-baseline="auto"
        :font-size="Math.max(7, h*0.10)" font-weight="600"
        font-family="monospace"
        :fill="isOn ? activeColor : '#5a6a7a'">{{ posText }}</text>

      <!-- Invalid overlay -->
      <rect v-if="d.isInvalid" x="0" y="0" :width="w" :height="h"
        fill="rgba(231,76,60,0.35)" rx="3"/>
    </svg>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from "vue";
import { useNodeData } from "./useNodeData";

const { d, w, h } = useNodeData(80, 85);
const uid     = ref(Math.random().toString(36).slice(2, 8));
const motorR  = computed(() => Math.min(w.value, h.value) * 0.185);
const motorCy = computed(() => motorR.value + 2);
const pad     = computed(() => Math.min(w.value, h.value) * 0.05);
const bodyTop = computed(() => motorCy.value + motorR.value + h.value * 0.10);
const bodyBot = computed(() => bodyTop.value + h.value * 0.38);

const isOn        = computed(() => !!d.value.statusColor && d.value.statusColor !== "");
const activeColor = computed(() => (d.value.statusColor as string) || "#27ae60");

const posVal  = computed(() => Math.round(((d.value.position as number) ?? 0) * 100));
const posText = computed(() => posVal.value > 0 ? `${posVal.value}%` : "CLOSED");

const bodyFill = computed(() => {
  if (d.value.isInvalid) return "#e74c3c";
  const sc = d.value.statusColor;
  return (sc && sc !== "") ? sc : "#0a0a18";
});

const motorFill = computed(() => isOn.value ? "#0b2216" : "#0e1420");
const motorHL   = computed(() => isOn.value ? "#184830" : "#1a2840");
</script>

<style scoped>
.node-wrap { width: 100%; height: 100%; overflow: visible; }
svg { overflow: visible; }
</style>
