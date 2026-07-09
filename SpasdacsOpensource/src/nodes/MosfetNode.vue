<template>
  <div class="node-wrap" :style="{ opacity: d.opacity ?? 1 }">
    <!--
      ViewBox mirrors the Inkscape coordinate space (≈ 0 0 50 75).
      G wire terminates at x=0 (left edge).
      D wire terminates at y=0 (top edge).
      S wire terminates at y=75 (bottom edge).
    -->
    <svg :width="w" :height="h" viewBox="0 0 50 75"
         xmlns="http://www.w3.org/2000/svg" overflow="visible">
      <defs>
        <filter :id="`mfet-glow-${uid}`" x="-50%" y="-40%" width="200%" height="180%">
          <feGaussianBlur stdDeviation="1.2" result="blur"/>
          <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
      </defs>

      <!-- ── Package circle ────────────────────────────────────────────────── -->
      <circle cx="35.496" cy="35.22" r="25"
        :fill="circleFill" fill-opacity="0.18"
        :stroke="isOn ? onColor : wireColor" stroke-width="1.2"
        :filter="isOn ? `url(#mfet-glow-${uid})` : undefined"/>

      <!-- ── Gate wire (path2): left-edge → right → up (acts as gate bar) ─── -->
      <!-- Extends to x=0 so port sits at left edge -->
      <path d="M 0,43.089 H 24.031 V 23.478"
        fill="none"
        :stroke="isOn ? onColor : wireColor"
        stroke-width="1" stroke-linecap="round" stroke-linejoin="round"
        :filter="isOn ? `url(#mfet-glow-${uid})` : undefined"/>

      <!-- ── Three filled rects ───────────────────────────────────────────── -->
      <!-- Top stub — DRAIN side only (isolated above) -->
      <rect x="28.517" y="17.002" width="3.158" height="7.158"
        :fill="isOn ? onColor : wireColor"
        :stroke="isOn ? onColor : wireColor" stroke-width="0.5"
        :filter="isOn ? `url(#mfet-glow-${uid})` : undefined"/>

      <!-- Middle stub -->
      <rect x="28.603" y="26.798" width="2.986" height="10.986"
        :fill="isOn ? onColor : wireColor"
        :stroke="isOn ? onColor : wireColor" stroke-width="0.5"
        :filter="isOn ? `url(#mfet-glow-${uid})` : undefined"/>

      <!-- Bottom stub — SOURCE side -->
      <rect x="28.517" y="40.421" width="3.158" height="7.158"
        :fill="isOn ? onColor : wireColor"
        :stroke="isOn ? onColor : wireColor" stroke-width="0.5"
        :filter="isOn ? `url(#mfet-glow-${uid})` : undefined"/>

      <!-- ── S wire (path3): bottom edge → up → left to bottom stub ────────── -->
      <!-- Extended to y=75 so S port sits at bottom edge -->
      <path d="M 43,75 V 44.571 H 31.847"
        fill="none"
        :stroke="isOn ? onColor : wireColor"
        stroke-width="1" stroke-linecap="round" stroke-linejoin="round"
        :filter="isOn ? `url(#mfet-glow-${uid})` : undefined"/>

      <!-- ── Arrow path (path4): source junction → up → left → arrowhead ──── -->
      <!-- Vertical segment connects source junction to middle-stub level.     -->
      <!-- Horizontal segment ends with arrowhead pointing LEFT at middle stub. -->
      <path d="M 43,44.817 V 31.333 H 35.8"
        fill="none"
        :stroke="isOn ? onColor : wireColor"
        stroke-width="0.9" stroke-linecap="round" stroke-linejoin="round"
        :filter="isOn ? `url(#mfet-glow-${uid})` : undefined"/>
      <!-- Arrowhead polygon: tip at (34.5, 31.333) pointing LEFT -->
      <polygon points="34.5,31.333 37.1,29.8 37.1,32.866"
        :fill="isOn ? onColor : wireColor"
        :filter="isOn ? `url(#mfet-glow-${uid})` : undefined"/>

      <!-- ── D wire (path5): top edge → down → left to top stub ───────────── -->
      <!-- Extended to y=0 so D port sits at top edge -->
      <path d="M 43,0 V 19.961 H 31.945"
        fill="none"
        :stroke="isOn ? onColor : wireColor"
        stroke-width="1" stroke-linecap="round" stroke-linejoin="round"
        :filter="isOn ? `url(#mfet-glow-${uid})` : undefined"/>

      <!-- ── Flowing current animation when ON (S → D direction) ────────────
           Non-scoped CSS classes (mfet-anim-d / mfet-anim-s) defined below
           in a plain <style> block — no Vue data-v scoping, guaranteed to
           reach SVG elements.
           D wire path goes FROM drain tip (y=0) DOWN toward body:
             current exits drain = dashes travel BACKWARD → dashoffset -13→0
           S wire path goes FROM source tip (y=75) UP toward body:
             current enters source = dashes travel FORWARD → dashoffset 0→-13
      ──────────────────────────────────────────────────────────────────────── -->
      <path v-if="isOn"
        d="M 43,0 V 19.961 H 31.945"
        fill="none" :stroke="onColor"
        stroke-width="1" stroke-dasharray="3 4"
        stroke-linecap="round" opacity="0.75"
        class="mfet-anim-d"/>
      <path v-if="isOn"
        d="M 43,75 V 44.571 H 31.847"
        fill="none" :stroke="onColor"
        stroke-width="1" stroke-dasharray="3 4"
        stroke-linecap="round" opacity="0.75"
        class="mfet-anim-s"/>

      <!-- ── Labels ─────────────────────────────────────────────────────────── -->
      <!-- G: port at x=0,y≈43 → label sits just below-right of the wire tip  -->
      <text x="2" y="48.5"
        font-size="4.8" font-weight="700"
        :fill="labelColor" font-family="'Segoe UI',monospace">G</text>
      <!-- D: port at x=43,y=0 → label sits just below, slightly right         -->
      <text x="44" y="6.5"
        font-size="4.8" font-weight="700"
        :fill="labelColor" font-family="'Segoe UI',monospace">D</text>
      <!-- S: port at x=43,y=75 → label sits above-left so it clears the port circle -->
      <text x="36" y="73"
        font-size="4.8" font-weight="700"
        :fill="labelColor" font-family="'Segoe UI',monospace">S</text>

      <!-- ── Device name ─────────────────────────────────────────────────────── -->
      <text v-if="nameText"
        x="3" y="71"
        font-size="4.2" font-weight="600"
        :fill="labelColor" font-family="'Segoe UI',sans-serif" opacity="0.75">{{ nameText }}</text>

      <!-- ── Invalid overlay ────────────────────────────────────────────────── -->
      <rect v-if="d.isInvalid" x="0" y="0" width="50" height="75"
        fill="rgba(231,76,60,0.22)"
        stroke="#e74c3c" stroke-width="1" stroke-dasharray="4,3"/>
    </svg>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from "vue";
import { useNodeData } from "./useNodeData";

const { d, w, h } = useNodeData(90, 120);
const uid = ref(Math.random().toString(36).slice(2, 8));

// ── State ────────────────────────────────────────────────────────────────────
const statusColor = computed(() => String(d.value.statusColor ?? ""));
const isOn = computed(() =>
  !!statusColor.value && statusColor.value !== "" && statusColor.value !== "gradient:off"
);

// ── Colours ──────────────────────────────────────────────────────────────────
// wireColor: uses lineColor from node data (inspector-settable), falls back to slate
const wireColor   = computed(() => d.value.isInvalid ? "#e74c3c"
  : ((d.value.lineColor as string) || "#94a3b8"));
// onColor: statusColor carries the active color (set by inspector toggle or telemetry transform)
// activeColor stores the "intended" on color so it survives turning off the preview
const onColor     = computed(() => d.value.isInvalid ? "#e74c3c"
  : (statusColor.value || (d.value.activeColor as string) || "#27ae60"));
const circleFill  = computed(() => isOn.value ? onColor.value : "#b7b9b9");
const labelColor  = computed(() => isOn.value ? onColor.value : "#94a3b8");

// ── Text ─────────────────────────────────────────────────────────────────────
const nameText = computed(() => (d.value.name as string) || "");
</script>

<style scoped>
.node-wrap { width: 100%; height: 100%; overflow: visible; }
svg { overflow: visible; }
</style>

<!-- Non-scoped: keyframes and animation classes must NOT carry a data-v attribute
     because Vue's scoped CSS does NOT reliably inject that attribute onto SVG child
     elements (path, animate, etc.).  Unique class names (mfet-*) prevent collisions. -->
<style>
@keyframes mfet-flow-d {
  from { stroke-dashoffset: -13; }
  to   { stroke-dashoffset:   0; }
}
@keyframes mfet-flow-s {
  from { stroke-dashoffset:   0; }
  to   { stroke-dashoffset: -13; }
}
/* D wire: current exits drain → dashes travel backward along path (drain tip ← body) */
.mfet-anim-d {
  stroke-dashoffset: -13;
  animation: mfet-flow-d 0.6s linear infinite;
}
/* S wire: current enters source → dashes travel forward along path (source tip → body) */
.mfet-anim-s {
  stroke-dashoffset: 0;
  animation: mfet-flow-s 0.6s linear infinite;
}
</style>
