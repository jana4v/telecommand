<template>
  <div class="node-wrap" :style="{ opacity: d.opacity ?? 1 }">
    <svg class="body-svg" :viewBox="`0 0 ${w} ${h}`" preserveAspectRatio="none"
         xmlns="http://www.w3.org/2000/svg" overflow="visible">
      <defs>
        <filter id="gnd-glow" x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="1.4" result="b"/>
          <feComposite in="SourceGraphic" in2="b" operator="over"/>
        </filter>
      </defs>

      <!-- ── Connection wire (vertical lead) ── -->
      <line
        :x1="w * 0.5" :y1="0"
        :x2="w * 0.5" :y2="h * 0.40"
        :stroke="lineColor" stroke-width="2.2" stroke-linecap="round"
        filter="url(#gnd-glow)"/>

      <!-- ── Ground bar 1 — widest ── -->
      <line
        :x1="w * 0.05" :y1="h * 0.40"
        :x2="w * 0.95" :y2="h * 0.40"
        :stroke="lineColor" stroke-width="2.5" stroke-linecap="round"
        filter="url(#gnd-glow)"/>

      <!-- ── Ground bar 2 — medium ── -->
      <line
        :x1="w * 0.22" :y1="h * 0.58"
        :x2="w * 0.78" :y2="h * 0.58"
        :stroke="lineColor" stroke-width="2.5" stroke-linecap="round"
        filter="url(#gnd-glow)"/>

      <!-- ── Ground bar 3 — narrowest ── -->
      <line
        :x1="w * 0.39" :y1="h * 0.76"
        :x2="w * 0.61" :y2="h * 0.76"
        :stroke="lineColor" stroke-width="2.5" stroke-linecap="round"
        filter="url(#gnd-glow)"/>

      <!-- Optional node label -->
      <text v-if="nodeName"
        :x="w * 0.5" :y="h * 0.95"
        text-anchor="middle" dominant-baseline="auto"
        :font-size="Math.max(8, w * 0.22)"
        font-family="monospace"
        :fill="lineColor" opacity="0.65">
        {{ nodeName }}
      </text>
    </svg>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useNodeData } from "./useNodeData";

const { d, w, h } = useNodeData(50, 70);

// Use the node's stroke colour if set, otherwise default silver-white
const lineColor = computed(() => {
  const s = d.value.stroke as string | undefined;
  return (s && s !== "" && s !== "transparent") ? s : "#b0bec5";
});

const nodeName = computed(() => (d.value.name as string)?.trim() || "");
</script>

<style scoped>
.node-wrap {
  width: 100%;
  height: 100%;
  overflow: visible;
}
svg {
  overflow: visible;
  display: block;
  width: 100%;
  height: 100%;
}
</style>
