<!--
  SvgMultilineText — drop-in replacement for a single SVG <text> element that
  supports multi-line content by splitting on '\n' and rendering each line as a
  <tspan> at the correct y position.

  Two vertical-alignment modes controlled by `centered` prop (default: true):

    centered=true  — the whole block is vertically centred at :y
                     (mirrors the original dominant-baseline="middle" behaviour)

    centered=false — the first line's baseline sits at :y; extra lines flow
                     downward (for nodes where the title sits at the top edge)
-->
<template>
  <text
    :text-anchor="textAnchor"
    :font-size="fontSize"
    :font-weight="fontWeight"
    :font-family="fontFamily"
    :fill="fill"
    :letter-spacing="letterSpacing"
    :opacity="opacity"
    :clip-path="clipPath"
  >
    <tspan
      v-for="(line, i) in lines"
      :key="i"
      :x="x"
      :y="lineY(i)"
      :dominant-baseline="centered ? 'middle' : 'auto'"
    >{{ line }}</tspan>
  </text>
</template>

<script setup lang="ts">
import { computed } from "vue";

const props = withDefaults(defineProps<{
  text:          string;
  x:             number | string;
  y:             number | string;
  fontSize?:     number | string;
  fontWeight?:   number | string;
  fontFamily?:   string;
  fill?:         string;
  letterSpacing?: number | string;
  opacity?:      number | string;
  clipPath?:     string;
  textAnchor?:   string;
  /** true  → block centre at :y  (mirrors dominant-baseline="middle")
   *  false → first-line baseline at :y  (top-anchored) */
  centered?:     boolean;
}>(), {
  textAnchor: "middle",
  fontWeight: 700,
  centered:   true,
});

// Split on \n; preserve empty lines as a zero-width space so tspan renders
const lines = computed<string[]>(() => {
  const raw = String(props.text ?? "");
  return raw.split("\n").map(l => l === "" ? "​" : l);
});

const fz     = computed(() => Number(props.fontSize) || 11);
// Line-to-line spacing: slightly looser than cap-height for readability
const lineH  = computed(() => Math.ceil(fz.value * 1.3));

function lineY(i: number): number {
  const n  = lines.value.length;
  const cy = Number(props.y);
  if (props.centered) {
    // Vertical centre of block at cy
    return cy + (i - (n - 1) / 2) * lineH.value;
  } else {
    // First baseline at cy, subsequent lines flow downward
    return cy + i * lineH.value;
  }
}
</script>
