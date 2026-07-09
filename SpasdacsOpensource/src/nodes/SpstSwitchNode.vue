<template>
  <div class="node-wrap" :style="{ opacity: d.opacity ?? 1 }">
    <!--
      ViewBox: 0 0 110 70
      Left pivot   (terminal): (16, 44) — port at xRatio=16/110≈0.145
      Right contact(terminal): (94, 44) — port at xRatio=94/110≈0.855
      Blade length : 78 px
      Closed angle : 0°   (horizontal — tip meets contact at 94,44)
      Open   angle : −30° (tip floats up-right)
      SVG draw order:
        1. contact circle (grey, behind blade when open)
        2. pivot circle   (always blade color)
        3. blade LINE     (no glow filter — avoids blur washing out thin stroke)
        4. blade tip      (topmost, covers contact circle when closed)
    -->
    <svg :width="w" :height="h" viewBox="0 0 110 70"
         xmlns="http://www.w3.org/2000/svg" overflow="visible">

      <defs>
        <filter :id="`spst-glow-${uid}`" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="2" result="blur"/>
          <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
      </defs>

      <!-- ── Right contact circle — hidden when CLOSED (blade tip fully covers it) ── -->
      <circle v-if="!isClosed" cx="94" cy="44" r="6"
        :fill="contactColor" :stroke="contactColor" stroke-width="1"/>

      <!-- ── Right contact circle open ring — always visible as target ─────────── -->
      <circle cx="94" cy="44" r="6"
        fill="none" :stroke="contactColor" stroke-width="1.5"/>

      <!-- ── Left pivot circle ─────────────────────────────────────────────── -->
      <circle cx="16" cy="44" r="6"
        :fill="bladeColor" :stroke="bladeColor"
        :filter="isClosed ? `url(#spst-glow-${uid})` : undefined"/>

      <!-- ── Blade LINE — NO filter so blur can't wash it out ─────────────── -->
      <line x1="16" y1="44" :x2="tipX" :y2="tipY"
        :stroke="bladeColor" stroke-width="4" stroke-linecap="butt"/>

      <!-- ── Blade tip circle ─ topmost, covers contact ring when CLOSED ──── -->
      <circle :cx="tipX" :cy="tipY" r="6"
        :fill="bladeColor" :stroke="bladeColor"
        :filter="isClosed ? `url(#spst-glow-${uid})` : undefined"/>

      <!-- ── Device name ─────────────────────────────────────────────────────── -->
      <text v-if="nameText" x="55" y="12" text-anchor="middle"
        font-size="5.5" font-weight="500"
        :fill="labelColor" font-family="'Segoe UI', sans-serif" opacity="0.75">
        {{ nameText }}
      </text>

      <!-- ── Invalid overlay ────────────────────────────────────────────────── -->
      <rect v-if="d.isInvalid" x="0" y="0" width="110" height="70"
        fill="rgba(231,76,60,0.18)"
        stroke="#e74c3c" stroke-width="1" stroke-dasharray="4,3"/>
    </svg>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onUnmounted } from "vue";
import { useNodeData } from "./useNodeData";

const { d, w, h } = useNodeData(110, 70);
const uid = ref(Math.random().toString(36).slice(2, 8));

// ── Fixed geometry (SVG viewBox 0 0 110 70) ──────────────────────────────────
const PX = 16           // pivot x
const CX = 94           // contact x
const PY = 44           // shared y for both terminals
const BLADE_LEN = CX - PX  // = 78

const ANGLE_CLOSED =  0    // degrees — horizontal, tip meets contact
const ANGLE_OPEN   = -30   // degrees — blade swings up

// ── State ─────────────────────────────────────────────────────────────────────
const statusColor = computed(() => String(d.value.statusColor ?? ""));
const isClosed = computed(() =>
  !!statusColor.value &&
  statusColor.value !== "" &&
  statusColor.value !== "gradient:off"
);

// ── JS-driven blade angle animation (1 s ease-in-out via RAF) ─────────────────
const currentAngle = ref(isClosed.value ? ANGLE_CLOSED : ANGLE_OPEN);

let rafId: number | null = null;
let animStartTime: number | null = null;
let animFrom = currentAngle.value;
let animTo   = currentAngle.value;

function easeInOut(t: number): number {
  return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
}

function startAnim(toAngle: number): void {
  animFrom      = currentAngle.value;
  animTo        = toAngle;
  animStartTime = null;
  if (rafId !== null) cancelAnimationFrame(rafId);
  rafId = requestAnimationFrame(step);
}

function step(ts: number): void {
  if (animStartTime === null) animStartTime = ts;
  const t = Math.min((ts - animStartTime) / 1000, 1);    // 1 000 ms = 1 s
  currentAngle.value = animFrom + (animTo - animFrom) * easeInOut(t);
  if (t < 1) {
    rafId = requestAnimationFrame(step);
  } else {
    currentAngle.value = animTo;
    rafId = null;
  }
}

watch(isClosed, (closed) => startAnim(closed ? ANGLE_CLOSED : ANGLE_OPEN));

onUnmounted(() => { if (rafId !== null) cancelAnimationFrame(rafId); });

// ── Blade tip (reactive, updated every RAF frame) ─────────────────────────────
const RAD = Math.PI / 180;
const tipX = computed(() => PX + BLADE_LEN * Math.cos(currentAngle.value * RAD));
const tipY = computed(() => PY + BLADE_LEN * Math.sin(currentAngle.value * RAD));

// ── Colours ───────────────────────────────────────────────────────────────────
const activeColor  = computed(() => (d.value.activeColor as string) || "#9b59b6");
const lineColor    = computed(() => (d.value.lineColor   as string) || "#7a7a9a");

const bladeColor   = computed(() =>
  d.value.isInvalid ? "#e74c3c"
  : isClosed.value  ? activeColor.value
  : lineColor.value
);
const contactColor = computed(() =>
  d.value.isInvalid ? "#e74c3c" : lineColor.value
);
const labelColor   = computed(() =>
  isClosed.value ? activeColor.value : lineColor.value
);

// ── Text ──────────────────────────────────────────────────────────────────────
const nameText = computed(() => (d.value.name as string) || "");
</script>

<style scoped>
.node-wrap { width: 100%; height: 100%; overflow: visible; }
svg { overflow: visible; }
</style>
