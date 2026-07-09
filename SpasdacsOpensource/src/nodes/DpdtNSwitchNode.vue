<template>
  <div class="node-wrap" :style="{ opacity: d.opacity ?? 1 }">
    <svg :width="w" :height="h" :viewBox="`0 0 ${w} ${h}`" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="dpdtn-ring" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%"   stop-color="#a8a8b8"/>
          <stop offset="25%"  stop-color="#68687a"/>
          <stop offset="50%"  stop-color="#d8d8e8"/>
          <stop offset="75%"  stop-color="#68687a"/>
          <stop offset="100%" stop-color="#a8a8b8"/>
        </linearGradient>
        <radialGradient id="dpdtn-body" cx="50%" cy="50%" r="50%">
          <stop offset="0%"   stop-color="#22223a"/>
          <stop offset="85%"  stop-color="#14142a"/>
          <stop offset="100%" stop-color="#0a0a1a"/>
        </radialGradient>
        <linearGradient id="dpdtn-route" gradientUnits="userSpaceOnUse" x1="0" y1="0" :x2="w" y2="0">
          <stop offset="0%"   stop-color="#a8c8e8"/>
          <stop offset="50%"  stop-color="#e0f0ff"/>
          <stop offset="100%" stop-color="#6090b8"/>
        </linearGradient>
      </defs>

      <!-- Outer metallic frame -->
      <rect :x="bdO" :y="bdO" :width="w-bdSw" :height="h-bdSw"
        fill="url(#dpdtn-body)"
        :stroke="bodyFill !== '' ? bodyFill : 'url(#dpdtn-ring)'"
        :stroke-width="bdSw"
        :rx="bdRx"
      />
      <!-- Inner glow ring -->
      <rect :x="glO" :y="glO" :width="w-2*glO" :height="h-2*glO"
        fill="none"
        stroke="rgba(100,140,255,0.10)"
        :stroke-width="bdSw"
        :rx="bdO"
      />
      <!-- Invalid overlay -->
      <rect v-if="d.isInvalid" :x="bdO" :y="bdO" :width="w-bdSw" :height="h-bdSw"
        fill="rgba(231,76,60,0.35)" :rx="bdRx" />

      <!--
        DPDT_N — same as DPDT but outer ports are parallel to the inner
        COM dots instead of at the corners. Each outer port sits directly
        above (top row) or below (bottom row) its matching inner dot, so
        the four fixed corner arms are vertical lines.

        8 dots:  4 outer ports (TL TR BL BR) + 4 interior COM dots (CTL CTR CBL CBR)
          TL ── CTL,  TR ── CTR,  BL ── CBL,  BR ── CBR  (vertical arms, always on)

        Inner bridge switches between:
          POS-1 (position=0) — HORIZONTAL:  CTL ── CTR  and  CBL ── CBR
          POS-2 (position=1) — VERTICAL:    CTL          CTR
                                              |            |
                                             CBL          CBR
      -->

      <!-- ── Fixed vertical arms (always fully connected) ───────── -->
      <line :x1="otlx" :y1="otly" :x2="ctlx" :y2="ctly"
        stroke="url(#dpdtn-route)" :stroke-width="polW" stroke-linecap="round"/>
      <line :x1="otrx" :y1="otly" :x2="ctrx" :y2="ctry"
        stroke="url(#dpdtn-route)" :stroke-width="polW" stroke-linecap="round"/>
      <line :x1="oblx" :y1="obly" :x2="cblx" :y2="cbly"
        stroke="url(#dpdtn-route)" :stroke-width="polW" stroke-linecap="round"/>
      <line :x1="obrx" :y1="obly" :x2="cbrx" :y2="cbry"
        stroke="url(#dpdtn-route)" :stroke-width="polW" stroke-linecap="round"/>

      <!-- ── Horizontal bridges (POS-1, fade out) ──────────────── -->
      <line :x1="ctlx" :y1="ctly" :x2="ctrx" :y2="ctry"
        stroke="url(#dpdtn-route)" :stroke-width="polW" stroke-linecap="round"
        :opacity="hOpacity"/>
      <line :x1="cblx" :y1="cbly" :x2="cbrx" :y2="cbry"
        stroke="url(#dpdtn-route)" :stroke-width="polW" stroke-linecap="round"
        :opacity="hOpacity"/>

      <!-- ── Vertical bridges (POS-2, fade in) ─────────────────── -->
      <line :x1="ctlx" :y1="ctly" :x2="cblx" :y2="cbly"
        stroke="url(#dpdtn-route)" :stroke-width="polW" stroke-linecap="round"
        :opacity="vOpacity"/>
      <line :x1="ctrx" :y1="ctry" :x2="cbrx" :y2="cbry"
        stroke="url(#dpdtn-route)" :stroke-width="polW" stroke-linecap="round"
        :opacity="vOpacity"/>

      <!-- ── Outer ports: TL, TR, BL, BR (parallel to inner dots) ─ -->
      <circle :cx="otlx" :cy="otly" :r="dotR" fill="#0d1117" stroke="#8090a0" :stroke-width="dotSw"/>
      <circle :cx="otlx" :cy="otly" :r="dotI" fill="#5080a0"/>

      <circle :cx="otrx" :cy="otly" :r="dotR" fill="#0d1117" stroke="#8090a0" :stroke-width="dotSw"/>
      <circle :cx="otrx" :cy="otly" :r="dotI" fill="#5080a0"/>

      <circle :cx="oblx" :cy="obly" :r="dotR" fill="#0d1117" stroke="#8090a0" :stroke-width="dotSw"/>
      <circle :cx="oblx" :cy="obly" :r="dotI" fill="#5080a0"/>

      <circle :cx="obrx" :cy="obly" :r="dotR" fill="#0d1117" stroke="#8090a0" :stroke-width="dotSw"/>
      <circle :cx="obrx" :cy="obly" :r="dotI" fill="#5080a0"/>

      <!-- ── Interior COM dots: CTL, CTR, CBL, CBR ─────────────── -->
      <circle :cx="ctlx" :cy="ctly" :r="dotR" fill="#0d1117" stroke="#8090a0" :stroke-width="dotSw"/>
      <circle :cx="ctlx" :cy="ctly" :r="dotI" fill="#5080a0"/>

      <circle :cx="ctrx" :cy="ctry" :r="dotR" fill="#0d1117" stroke="#8090a0" :stroke-width="dotSw"/>
      <circle :cx="ctrx" :cy="ctry" :r="dotI" fill="#5080a0"/>

      <circle :cx="cblx" :cy="cbly" :r="dotR" fill="#0d1117" stroke="#8090a0" :stroke-width="dotSw"/>
      <circle :cx="cblx" :cy="cbly" :r="dotI" fill="#5080a0"/>

      <circle :cx="cbrx" :cy="cbry" :r="dotR" fill="#0d1117" stroke="#8090a0" :stroke-width="dotSw"/>
      <circle :cx="cbrx" :cy="cbry" :r="dotI" fill="#5080a0"/>

    </svg>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useNodeData } from "./useNodeData";
import { usePositionAnim } from "./usePositionAnim";

const { d, w, h } = useNodeData(100, 100);

const animVal  = usePositionAnim(() => (d.value.position ?? 0) as number);
const bodyFill = computed(() => {
  if (d.value.isInvalid) return "#e74c3c";
  const sc = d.value.statusColor;
  return (sc && sc !== "") ? sc : "";
});

// Scale helpers
const scl   = computed(() => Math.min(w.value, h.value));
const bdSw  = computed(() => scl.value * 0.085);
const bdO   = computed(() => bdSw.value * 0.5);
const bdRx  = computed(() => scl.value * 0.110);
const glO   = computed(() => bdSw.value * 1.5);
const dotR  = computed(() => scl.value * 0.070);
const dotI  = computed(() => scl.value * 0.035);
const dotSw = computed(() => scl.value * 0.022);
const polW  = computed(() => scl.value * 0.050);

function clamp01(v: number) { return Math.max(0, Math.min(1, v)); }

// ── Interior COM dot positions (same as DPDT) ────────────────────────────────
const ctlx = computed(() => w.value * 0.28);
const ctly = computed(() => h.value * 0.28);
const ctrx = computed(() => w.value * 0.72);
const ctry = computed(() => h.value * 0.28);
const cblx = computed(() => w.value * 0.28);
const cbly = computed(() => h.value * 0.72);
const cbrx = computed(() => w.value * 0.72);
const cbry = computed(() => h.value * 0.72);

// ── Outer port positions — directly left/right of the inner dots ────────────
// y matches the inner row; x is pinned to the left/right edge (dotR inset).
const otlx = computed(() => dotR.value);
const otrx = computed(() => w.value - dotR.value);
const oblx = otlx;
const obrx = otrx;
const otly = ctly;
const obly = cbly;

// ── Bridge opacities ─────────────────────────────────────────────────────────
const t        = computed(() => clamp01(animVal.value));
const hOpacity = computed(() => 1 - t.value);   // horizontal: full at POS-1, gone at POS-2
const vOpacity = computed(() => t.value);        // vertical:   gone at POS-1, full at POS-2
</script>

<style scoped>
.node-wrap { width: 100%; height: 100%; overflow: visible; }
svg { overflow: visible; }
</style>
