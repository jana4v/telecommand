<template>
  <div class="node-wrap" :style="{ opacity: d.opacity ?? 1 }">
    <svg :width="w" :height="h" :viewBox="`0 0 ${w} ${h}`" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient :id="`rad-panel-${uid}`" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   :stop-color="panelTop"/>
          <stop offset="100%" :stop-color="panelBot"/>
        </linearGradient>
        <linearGradient :id="`rad-rail-${uid}`" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" :stop-color="railTop"/>
          <stop offset="100%" :stop-color="railBot"/>
        </linearGradient>
        <linearGradient :id="`rad-tab-${uid}`" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" :stop-color="tabTop"/>
          <stop offset="100%" :stop-color="tabBot"/>
        </linearGradient>
        <radialGradient :id="`rad-core-glow-${uid}`" cx="50%" cy="42%" r="62%">
          <stop offset="0%" :stop-color="glowColor" :stop-opacity="isActive ? 0.28 : 0" />
          <stop offset="100%" stop-color="#000000" stop-opacity="0" />
        </radialGradient>
      </defs>

      <!-- Manifold pipes (left & right) -->
      <rect x="0" :y="h*0.15" :width="w*0.07" :height="h*0.70"
        :fill="`url(#rad-rail-${uid})`" rx="2"/>
      <rect :x="w*0.93" :y="h*0.15" :width="w*0.07" :height="h*0.70"
        :fill="`url(#rad-rail-${uid})`" rx="2"/>

      <!-- Radiator panel -->
      <rect :x="w*0.07" :y="h*0.20" :width="w*0.86" :height="h*0.60"
        :fill="`url(#rad-panel-${uid})`" :stroke="borderStroke" stroke-width="1.8" rx="3"/>

      <rect :x="w*0.07" :y="h*0.20" :width="w*0.86" :height="h*0.60"
        :fill="`url(#rad-core-glow-${uid})`" rx="3"/>

      <line :x1="w*0.07" :y1="h*0.20" :x2="w*0.93" :y2="h*0.20"
        :stroke="rimTop" stroke-width="1" opacity="0.85" />
      <line :x1="w*0.07" :y1="h*0.80" :x2="w*0.93" :y2="h*0.80"
        :stroke="rimBot" stroke-width="1" opacity="0.70" />

      <!-- Fin lines -->
      <line v-for="i in finCount" :key="i"
        :x1="w*0.07 + (w*0.86 / (finCount+1)) * i"
        :y1="h*0.20"
        :x2="w*0.07 + (w*0.86 / (finCount+1)) * i"
        :y2="h*0.80"
        :stroke="finColor" stroke-width="1" opacity="0.62"/>

      <!-- Flow connections top -->
      <rect :x="w*0.15" y="0" :width="w*0.12" :height="h*0.22"
        :fill="`url(#rad-tab-${uid})`" rx="1.8"/>
      <rect :x="w*0.73" y="0" :width="w*0.12" :height="h*0.22"
        :fill="`url(#rad-tab-${uid})`" rx="1.8"/>

      <!-- Connector pads aligned to requested top-tab hot spots -->
      <circle :cx="w*0.21" :cy="h*0.07" :r="Math.max(1.8, h*0.03)" :fill="padFill" :stroke="padStroke" stroke-width="1"/>
      <circle :cx="w*0.79" :cy="h*0.07" :r="Math.max(1.8, h*0.03)" :fill="padFill" :stroke="padStroke" stroke-width="1"/>

      <!-- RADIATOR label -->
      <text :x="w/2" :y="h*0.54"
        text-anchor="middle" dominant-baseline="middle"
        :font-size="Math.max(8, w*0.072)" font-weight="700"
        font-family="monospace"
        :fill="isActive ? '#adc8e4' : '#455d76'">RADIATOR</text>

      <!-- Temperature display -->
      <text v-if="hasTemp" :x="w/2" :y="h*0.70"
        text-anchor="middle" dominant-baseline="middle"
        :font-size="Math.max(8, w*0.065)" font-weight="600"
        font-family="monospace" :fill="tempColor">{{ tempText }}</text>

      <!-- Invalid overlay -->
      <rect v-if="d.isInvalid" x="0" y="0" :width="w" :height="h"
        fill="rgba(231,76,60,0.35)" rx="3"/>
    </svg>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import { useNodeData } from "./useNodeData";

const { d, w, h } = useNodeData(180, 70);
const uid = ref(Math.random().toString(36).slice(2, 8));

const isActive     = computed(() => !!d.value.statusColor && d.value.statusColor !== "");
const finCount     = computed(() => Math.max(4, Math.floor(w.value / 20)));
const borderStroke = computed(() => isActive.value ? "#72b5e6" : "#4a6f95");
const finColor     = computed(() => isActive.value ? "#5ea6d6" : "#3b5d7e");
const panelTop     = computed(() => isActive.value ? "#10283c" : "#0f1f30");
const panelBot     = computed(() => isActive.value ? "#0a1825" : "#0b1522");
const railTop      = computed(() => isActive.value ? "#24486d" : "#1a3550");
const railBot      = computed(() => isActive.value ? "#17324b" : "#13283a");
const tabTop       = computed(() => isActive.value ? "#1f4266" : "#17334d");
const tabBot       = computed(() => isActive.value ? "#142b42" : "#10253a");
const rimTop       = computed(() => isActive.value ? "#89c7ef" : "#5e82a2");
const rimBot       = computed(() => isActive.value ? "#5f95ba" : "#446988");
const glowColor    = computed(() => isActive.value ? "#56b7ff" : "#000000");
const padFill      = computed(() => isActive.value ? "#173a58" : "#122a40");
const padStroke    = computed(() => isActive.value ? "#98d3ff" : "#6f92b0");

const hasTemp  = computed(() => d.value.temperature != null);
const tempVal  = computed(() => d.value.temperature as number);
const tempText = computed(() => `${tempVal.value?.toFixed(1)}°C`);
const tempColor = computed(() => {
  const t = tempVal.value;
  if (t == null) return "#808090";
  if (t > 50) return "#e05030";
  if (t > 30) return "#e0a020";
  return "#40a0e0";
});
</script>

<style scoped>
.node-wrap { width: 100%; height: 100%; overflow: visible; }
svg { overflow: visible; }
</style>
