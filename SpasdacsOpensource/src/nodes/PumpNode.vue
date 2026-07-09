<template>
  <div class="node-wrap" :style="{ opacity: d.opacity ?? 1 }">
    <svg :width="w" :height="h" :viewBox="`0 0 ${w} ${h}`" xmlns="http://www.w3.org/2000/svg" overflow="visible">
      <defs>
        <radialGradient :id="`pump-body-${uid}`" cx="38%" cy="34%" r="66%">
          <stop offset="0%"   :stop-color="bodyHighlight"/>
          <stop offset="60%"  :stop-color="bodyFill"/>
          <stop offset="100%" stop-color="#04090f"/>
        </radialGradient>
        <linearGradient :id="`pump-ring-${uid}`" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%"   stop-color="#b0b0c8"/>
          <stop offset="22%"  stop-color="#606078"/>
          <stop offset="50%"  stop-color="#d8d8e8"/>
          <stop offset="78%"  stop-color="#606078"/>
          <stop offset="100%" stop-color="#b0b0c8"/>
        </linearGradient>
        <radialGradient :id="`pump-hub-${uid}`" cx="36%" cy="33%" r="67%">
          <stop offset="0%"   stop-color="#304050"/>
          <stop offset="100%" stop-color="#0e1820"/>
        </radialGradient>
        <radialGradient :id="`pump-cap-${uid}`" cx="32%" cy="30%" r="70%">
          <stop offset="0%"   stop-color="#9ab6d4"/>
          <stop offset="45%"  stop-color="#3c5a7a"/>
          <stop offset="100%" stop-color="#182438"/>
        </radialGradient>
      </defs>

      <!-- ── Inlet pipe (left) ──────────────────────────────────────────── -->
      <rect
        :x="0" :y="pipY - pipeH / 2"
        :width="pipeInLen" :height="pipeH"
        :fill="pipeFill" :stroke="pipeStroke" stroke-width="1"
        rx="1"
      />
      <!-- Inlet cap -->
      <rect
        :x="0" :y="pipY - pipeH / 2 - pipeH * 0.18"
        :width="pipeH * 0.22" :height="pipeH * 1.36"
        :fill="pipeStroke" rx="1"
      />

      <!-- ── Outlet pipe (right) ────────────────────────────────────────── -->
      <rect
        :x="w - pipeOutLen" :y="pipY - pipeH / 2"
        :width="pipeOutLen" :height="pipeH"
        :fill="pipeFill" :stroke="pipeStroke" stroke-width="1"
        rx="1"
      />
      <!-- Outlet cap -->
      <rect
        :x="w - pipeH * 0.22" :y="pipY - pipeH / 2 - pipeH * 0.18"
        :width="pipeH * 0.22" :height="pipeH * 1.36"
        :fill="pipeStroke" rx="1"
      />

      <!-- ── Status glow (ON only) ──────────────────────────────────────── -->
      <circle v-if="isOn"
        :cx="cx" :cy="cy" :r="r + r * 0.06"
        fill="none"
        :stroke="activeColor" :stroke-width="r * 0.04"
        opacity="0.3"
        :style="`filter: drop-shadow(0 0 ${r * 0.18}px ${activeColor})`"
      />

      <!-- ── Casing metallic ring ───────────────────────────────────────── -->
      <circle :cx="cx" :cy="cy" :r="r" :fill="`url(#pump-ring-${uid})`"/>

      <!-- ── Casing body ────────────────────────────────────────────────── -->
      <circle :cx="cx" :cy="cy" :r="r - rimW" :fill="`url(#pump-body-${uid})`"/>

      <!-- ── Rotating impeller ─────────────────────────────────────────── -->
      <g :transform="`rotate(${pumpAngle}, ${cx}, ${cy})`">
        <!-- 6 curved impeller blades -->
        <path v-for="blade in blades" :key="blade.i"
          :d="blade.d"
          fill="none"
          :stroke="bladeStroke"
          :stroke-width="bladeW"
          stroke-linecap="round"
          :opacity="isOn ? 0.92 : 0.45"
        />
        <!-- Hub ring -->
        <circle :cx="cx" :cy="cy" :r="hubR"
          :fill="`url(#pump-hub-${uid})`"
          :stroke="bladeStroke"
          :stroke-width="r * 0.028"
          opacity="0.95"
        />
      </g>

      <!-- ── Centre cap (static, on top) ──────────────────────────────── -->
      <circle :cx="cx" :cy="cy" :r="capR"
        :fill="`url(#pump-cap-${uid})`"
        :stroke="activeColor"
        :stroke-width="r * 0.022"
        opacity="0.95"
      />

      <!-- ── Status LED (top-right of casing) ─────────────────────────── -->
      <circle
        :cx="cx + r * 0.60" :cy="cy - r * 0.60" :r="r * 0.115"
        :fill="isOn ? activeColor : '#2a2a40'"
        :stroke="isOn ? activeColor : '#44445a'"
        stroke-width="1"
        :opacity="isOn ? 1 : 0.6"
        :style="isOn ? `filter: drop-shadow(0 0 ${r * 0.12}px ${activeColor})` : ''"
      />

      <!-- ── Speed readout (bottom strip) ─────────────────────────────── -->
      <text
        :x="cx" :y="h - 3"
        text-anchor="middle" dominant-baseline="auto"
        :font-size="speedFsz" font-weight="700"
        font-family="'Digital7', 'Courier New', monospace"
        :fill="isOn ? activeColor : '#5a6a7a'"
        opacity="0.88"
      >{{ speedText }}</text>

      <!-- ── Invalid overlay ───────────────────────────────────────────── -->
      <circle v-if="d.isInvalid"
        :cx="cx" :cy="cy" :r="r"
        fill="rgba(231,76,60,0.22)"
        stroke="#e74c3c"
        :stroke-width="r * 0.05"
        stroke-dasharray="7,4"
      />
    </svg>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from "vue";
import { useNodeData }  from "./useNodeData";
import { useGsapSpin }  from "./useGsapSpin";

const { d, w, h } = useNodeData(130, 110);

const uid = ref(Math.random().toString(36).slice(2, 8));

// ── Layout ────────────────────────────────────────────────────────────────
const cx      = computed(() => w.value / 2);
const cy      = computed(() => h.value * 0.47);
const r       = computed(() => Math.min(w.value * 0.82, h.value * 0.78) * 0.40);
const rimW    = computed(() => r.value * 0.13);
const hubR    = computed(() => r.value * 0.24);
const capR    = computed(() => r.value * 0.093);
const bladeW  = computed(() => r.value * 0.068);
const speedFsz = computed(() => Math.min(w.value, h.value) * 0.115);

// ── Pipes ─────────────────────────────────────────────────────────────────
const pipeH      = computed(() => r.value * 0.38);
const pipY       = computed(() => cy.value);
const pipeInLen  = computed(() => Math.max(cx.value - r.value + rimW.value, 4));
const pipeOutLen = computed(() => pipeInLen.value);

// ── Telemetry ──────────────────────────────────────────────────────────────
const pumpSpeed   = computed(() => Math.abs((d.value.pumpSpeed ?? 0) as number));
const isOn        = computed(() => !!d.value.statusColor && d.value.statusColor !== "");
const activeColor = computed(() => (d.value.statusColor as string) || "#4a9eff");

// ── Colors ─────────────────────────────────────────────────────────────────
const bodyFill      = computed(() => isOn.value ? "#0b2216" : "#0b1422");
const bodyHighlight = computed(() => isOn.value ? "#184830" : "#1a2c42");
const pipeFill      = computed(() => isOn.value ? "#102010" : "#141420");
const pipeStroke    = computed(() => isOn.value ? activeColor.value : "#3a3a56");
const bladeStroke   = computed(() => isOn.value ? activeColor.value : "#50607a");

// ── GSAP continuous rotation ───────────────────────────────────────────────
const pumpAngle = useGsapSpin(() => pumpSpeed.value, () => 1, 6000);

// ── Speed text ────────────────────────────────────────────────────────────
const speedText = computed(() => {
  const v = (d.value.pumpSpeedRaw ?? d.value.pumpSpeed ?? 0) as number;
  return Math.abs(v).toFixed(0) + " RPM";
});

// ── Impeller blades (6 curved vanes) ─────────────────────────────────────
const blades = computed(() => {
  const n       = 6;
  const innerR  = hubR.value * 1.12;
  const outerR  = r.value - rimW.value - r.value * 0.045;
  const sweep   = 55; // degrees each blade sweeps

  return Array.from({ length: n }, (_, i) => {
    const a0 = (i * (360 / n)) * (Math.PI / 180);
    const a1 = (i * (360 / n) + sweep) * (Math.PI / 180);
    const am = (a0 + a1) / 2;

    const p0x = cx.value + innerR * Math.cos(a0);
    const p0y = cy.value + innerR * Math.sin(a0);
    const p2x = cx.value + outerR * Math.cos(a1);
    const p2y = cy.value + outerR * Math.sin(a1);

    // Quadratic bezier control point offset outward for a natural blade curve
    const cpR = (innerR + outerR) * 0.52;
    const p1x = cx.value + cpR * Math.cos(am);
    const p1y = cy.value + cpR * Math.sin(am);

    return {
      i,
      d: `M ${p0x.toFixed(2)} ${p0y.toFixed(2)} Q ${p1x.toFixed(2)} ${p1y.toFixed(2)} ${p2x.toFixed(2)} ${p2y.toFixed(2)}`,
    };
  });
});
</script>

<style scoped>
.node-wrap { width: 100%; height: 100%; overflow: visible; }
svg { overflow: visible; }
svg * { transition: none !important; animation: none !important; }
</style>
