<template>
  <div class="node-wrap" :style="{ opacity: d.opacity ?? 1 }">
    <svg :width="w" :height="h" :viewBox="`0 0 ${w} ${h}`" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="dpdt-ring" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%"   stop-color="#a8a8b8"/>
          <stop offset="25%"  stop-color="#68687a"/>
          <stop offset="50%"  stop-color="#d8d8e8"/>
          <stop offset="75%"  stop-color="#68687a"/>
          <stop offset="100%" stop-color="#a8a8b8"/>
        </linearGradient>
        <radialGradient id="dpdt-body" cx="50%" cy="50%" r="50%">
          <stop offset="0%"   stop-color="#22223a"/>
          <stop offset="85%"  stop-color="#14142a"/>
          <stop offset="100%" stop-color="#0a0a1a"/>
        </radialGradient>
        <linearGradient id="dpdt-route" gradientUnits="userSpaceOnUse" x1="0" y1="0" :x2="w" y2="0">
          <stop offset="0%"   stop-color="#a8c8e8"/>
          <stop offset="50%"  stop-color="#e0f0ff"/>
          <stop offset="100%" stop-color="#6090b8"/>
        </linearGradient>
      </defs>

      <!-- Outer metallic frame -->
      <rect :x="bdO" :y="bdO" :width="w-bdSw" :height="h-bdSw"
        fill="url(#dpdt-body)"
        :stroke="bodyFill !== '' ? bodyFill : 'url(#dpdt-ring)'"
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
        8 dots:  4 corner ports (TL TR BL BR) + 4 interior COM dots (CTL CTR CBL CBR)

        Corner arms are FIXED (always fully connected):
          TL ── CTL,  TR ── CTR,  BL ── CBL,  BR ── CBR

        Only the inner bridge between the 4 COM dots switches:
          POS-1 (position=0) — HORIZONTAL:  CTL ── CTR  and  CBL ── CBR
          POS-2 (position=1) — VERTICAL:    CTL          CTR
                                              |            |
                                             CBL          CBR
        Horizontal bridges fade OUT; vertical bridges fade IN.
      -->

      <!-- ── Fixed corner arms (always fully connected) ─────────── -->
      <line :x1="tlx"  :y1="tly"  :x2="ctlx" :y2="ctly"
        stroke="url(#dpdt-route)" :stroke-width="polW" stroke-linecap="round"/>
      <line :x1="trx"  :y1="tly"  :x2="ctrx" :y2="ctry"
        stroke="url(#dpdt-route)" :stroke-width="polW" stroke-linecap="round"/>
      <line :x1="tlx"  :y1="bly"  :x2="cblx" :y2="cbly"
        stroke="url(#dpdt-route)" :stroke-width="polW" stroke-linecap="round"/>
      <line :x1="trx"  :y1="bly"  :x2="cbrx" :y2="cbry"
        stroke="url(#dpdt-route)" :stroke-width="polW" stroke-linecap="round"/>

      <!-- ── Horizontal bridges (POS-1, fade out) ──────────────── -->
      <line :x1="ctlx" :y1="ctly" :x2="ctrx" :y2="ctry"
        stroke="url(#dpdt-route)" :stroke-width="polW" stroke-linecap="round"
        :opacity="hOpacity"/>
      <line :x1="cblx" :y1="cbly" :x2="cbrx" :y2="cbry"
        stroke="url(#dpdt-route)" :stroke-width="polW" stroke-linecap="round"
        :opacity="hOpacity"/>

      <!-- ── Vertical bridges (POS-2, fade in) ─────────────────── -->
      <line :x1="ctlx" :y1="ctly" :x2="cblx" :y2="cbly"
        stroke="url(#dpdt-route)" :stroke-width="polW" stroke-linecap="round"
        :opacity="vOpacity"/>
      <line :x1="ctrx" :y1="ctry" :x2="cbrx" :y2="cbry"
        stroke="url(#dpdt-route)" :stroke-width="polW" stroke-linecap="round"
        :opacity="vOpacity"/>

      <!-- ── Corner ports: TL, TR, BL, BR ──────────────────────── -->
      <circle :cx="tlx" :cy="tly" :r="dotR" fill="#0d1117" stroke="#8090a0" :stroke-width="dotSw"/>
      <circle :cx="tlx" :cy="tly" :r="dotI" fill="#5080a0"/>

      <circle :cx="trx" :cy="tly" :r="dotR" fill="#0d1117" stroke="#8090a0" :stroke-width="dotSw"/>
      <circle :cx="trx" :cy="tly" :r="dotI" fill="#5080a0"/>

      <circle :cx="tlx" :cy="bly" :r="dotR" fill="#0d1117" stroke="#8090a0" :stroke-width="dotSw"/>
      <circle :cx="tlx" :cy="bly" :r="dotI" fill="#5080a0"/>

      <circle :cx="trx" :cy="bly" :r="dotR" fill="#0d1117" stroke="#8090a0" :stroke-width="dotSw"/>
      <circle :cx="trx" :cy="bly" :r="dotI" fill="#5080a0"/>

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

// ── Corner port positions ────────────────────────────────────────────────────
const tlx = computed(() => dotR.value);
const tly = computed(() => dotR.value);
const trx = computed(() => w.value - dotR.value);
const bly = computed(() => h.value - dotR.value);

// ── Interior COM dot positions ───────────────────────────────────────────────
// Placed at ~28% inward and ~28% down/up so they sit symmetrically inside body
const ctlx = computed(() => w.value * 0.28);
const ctly = computed(() => h.value * 0.28);
const ctrx = computed(() => w.value * 0.72);
const ctry = computed(() => h.value * 0.28);
const cblx = computed(() => w.value * 0.28);
const cbly = computed(() => h.value * 0.72);
const cbrx = computed(() => w.value * 0.72);
const cbry = computed(() => h.value * 0.72);

// ── Bridge opacities ─────────────────────────────────────────────────────────
const t        = computed(() => clamp01(animVal.value));
const hOpacity = computed(() => 1 - t.value);   // horizontal: full at POS-1, gone at POS-2
const vOpacity = computed(() => t.value);        // vertical:   gone at POS-1, full at POS-2
</script>

<style scoped>
.node-wrap { width: 100%; height: 100%; overflow: visible; }
svg { overflow: visible; }
</style>
