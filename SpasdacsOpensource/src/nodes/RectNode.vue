<template>
  <div class="node-wrap" :style="{ opacity: d.opacity ?? 1 }">
    <svg :width="w" :height="h" :viewBox="`0 0 ${w} ${h}`" xmlns="http://www.w3.org/2000/svg">
      <rect x="2" y="2" :width="w-4" :height="h-4"
        :fill="d.statusColor || d.fill || '#22223a'"
        :stroke="d.stroke || '#a8a8b8'"
        :stroke-width="d.strokeWidth || 3"
        rx="4"
      />

      <SvgMultilineText v-if="titleText"
        :text="titleText" :x="titleX" :y="titleY"
        :font-size="titleFontSz" font-weight="700"
        font-family="'Courier New', monospace"
        :fill="titleFontColor" :text-anchor="titleAnchor"
      />

      <text v-if="d.statusText" :x="w/2" :y="h*0.7" text-anchor="middle"
        font-size="11" fill="#adbac7">{{ d.statusText }}</text>
      <rect v-if="d.isInvalid" x="2" y="2" :width="w-4" :height="h-4" fill="rgba(231,76,60,0.35)" rx="4" />
    </svg>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useNodeData } from "./useNodeData";
import SvgMultilineText from "./SvgMultilineText.vue";
import { useTitlePosition } from "./useTitlePosition";
const { d, w, h } = useNodeData(120, 80);
const titleText   = computed(() => (d.value.name         as string) ?? "");
const titleFontSz = computed(() => (d.value.titleFontSize as number) ?? 11);
const titleFontColor = computed(() => (d.value.titleFontColor as string) || "#ffffff");
const { titleX, titleY, titleAnchor } = useTitlePosition(
  () => d.value.titlePosition as string | undefined,
  () => 0,
  () => w.value,
  () => 0,
  () => h.value,
  "top-center",
);
</script>

<style scoped>
.node-wrap { width: 100%; height: 100%; overflow: visible; }
svg { overflow: visible; }
</style>
