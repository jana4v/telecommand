<template>
  <div class="node-wrap" :style="{ opacity: d.opacity ?? 1 }">
    <!--
      RF Coupler — passive 4-port directional coupler — 200×80 default (freely resizable).
      Port layout:
        P1  — left-centre  (input)
        P2  — right-centre (through / output)
        P3  — bottom-right (coupled port,  ~76% along body)
        P4  — bottom-left  (isolated port, ~38% along body)
      Signal arrows (white):
        P1 → P2  horizontal through-path arrow
        Branch → P3  vertical coupled-path arrow
    -->
    <svg :width="w" :height="h" :viewBox="`0 0 ${w} ${h}`"
         xmlns="http://www.w3.org/2000/svg" overflow="visible">
      <defs>
        <!-- Static sheen overlay — applied on top of any user fill colour -->
        <linearGradient :id="`rc-sheen-${uid}`" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stop-color="#ffffff" stop-opacity="0.28"/>
          <stop offset="45%"  stop-color="#ffffff" stop-opacity="0.04"/>
          <stop offset="100%" stop-color="#000000" stop-opacity="0.22"/>
        </linearGradient>
        <!-- Metallic stub gradient (horizontal, for P1/P2 side stubs) -->
        <linearGradient :id="`rc-hstub-${uid}`" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stop-color="#9ab0c0"/>
          <stop offset="50%"  stop-color="#c8d8e0"/>
          <stop offset="100%" stop-color="#6888a0"/>
        </linearGradient>
        <!-- Metallic stub gradient (vertical, for P3/P4 bottom stubs) -->
        <linearGradient :id="`rc-vstub-${uid}`" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%"   stop-color="#9ab0c0"/>
          <stop offset="50%"  stop-color="#c8d8e0"/>
          <stop offset="100%" stop-color="#6888a0"/>
        </linearGradient>
        <!-- Clip for arrows confined inside body -->
        <clipPath :id="`rc-body-clip-${uid}`">
          <rect :x="bodyX" :y="bodyY" :width="bodyW" :height="bodyH" :rx="bodyRx"/>
        </clipPath>
      </defs>

      <!-- ── Main body (flat fill + sheen overlay) ────────────────────── -->
      <rect
        :x="bodyX" :y="bodyY" :width="bodyW" :height="bodyH" :rx="bodyRx"
        :fill="bodyFill"
        :stroke="strokeColor" :stroke-width="strokeW"
      />
      <!-- Sheen highlight overlay -->
      <rect
        :x="bodyX" :y="bodyY" :width="bodyW" :height="bodyH" :rx="bodyRx"
        :fill="`url(#rc-sheen-${uid})`" pointer-events="none"
      />

      <!-- ── P1 connector stub (left side) ────────────────────────────── -->
      <rect
        :x="0" :y="stubSideY" :width="bodyX + strokeW*0.5" :height="stubSideH"
        :rx="stubSideH * 0.2"
        :fill="`url(#rc-hstub-${uid})`"
        :stroke="strokeColor" :stroke-width="strokeW * 0.55"
      />
      <!-- P1 centre pin -->
      <circle :cx="bodyX * 0.40" :cy="stubSideY + stubSideH * 0.5"
        :r="stubSideH * 0.20"
        fill="#2a3a4a" :stroke="strokeColor" stroke-width="0.8"
      />

      <!-- ── P2 connector stub (right side) ────────────────────────────── -->
      <rect
        :x="bodyX + bodyW - strokeW*0.5" :y="stubSideY"
        :width="w - (bodyX + bodyW) + strokeW*0.5" :height="stubSideH"
        :rx="stubSideH * 0.2"
        :fill="`url(#rc-hstub-${uid})`"
        :stroke="strokeColor" :stroke-width="strokeW * 0.55"
      />
      <!-- P2 centre pin -->
      <circle :cx="bodyX + bodyW + (w - bodyX - bodyW) * 0.60" :cy="stubSideY + stubSideH * 0.5"
        :r="stubSideH * 0.20"
        fill="#2a3a4a" :stroke="strokeColor" stroke-width="0.8"
      />

      <!-- ── P4 connector stub (isolated, bottom-left) ────────────────── -->
      <rect
        :x="p4x - stubBotW * 0.5" :y="bodyY + bodyH - strokeW * 0.5"
        :width="stubBotW" :height="stubBotH + strokeW * 0.5"
        :rx="stubBotW * 0.15"
        :fill="`url(#rc-vstub-${uid})`"
        :stroke="strokeColor" :stroke-width="strokeW * 0.55"
      />
      <!-- P4 centre pin (bottom) -->
      <circle :cx="p4x" :cy="bodyY + bodyH + stubBotH * 0.72"
        :r="stubBotW * 0.20"
        fill="#2a3a4a" :stroke="strokeColor" stroke-width="0.8"
      />

      <!-- ── P3 connector stub (coupled, bottom-right) ─────────────────── -->
      <rect
        :x="p3x - stubBotW * 0.5" :y="bodyY + bodyH - strokeW * 0.5"
        :width="stubBotW" :height="stubBotH + strokeW * 0.5"
        :rx="stubBotW * 0.15"
        :fill="`url(#rc-vstub-${uid})`"
        :stroke="strokeColor" :stroke-width="strokeW * 0.55"
      />
      <!-- P3 centre pin (bottom) -->
      <circle :cx="p3x" :cy="bodyY + bodyH + stubBotH * 0.72"
        :r="stubBotW * 0.20"
        fill="#2a3a4a" :stroke="strokeColor" stroke-width="0.8"
      />

      <!-- ══════════════════════════════════════════════════════════════════
           SIGNAL ARROWS (white, inside body)
           ════════════════════════════════════════════════════════════════ -->

      <!-- Main through-path: P1 → P2 (horizontal arrow) -->
      <line
        :x1="bodyX + bodyW * 0.05" :y1="sigY"
        :x2="bodyX + bodyW * 0.90" :y2="sigY"
        stroke="#ffffff" stroke-width="1.5" stroke-linecap="round" opacity="0.88"
        :clip-path="`url(#rc-body-clip-${uid})`"
      />
      <!-- Main arrowhead (right-pointing) -->
      <polygon :points="mainArrowHead"
        fill="#ffffff" opacity="0.88"
        :clip-path="`url(#rc-body-clip-${uid})`"
      />

      <!-- Coupled path: vertical drop from main path at p3x column → P3 -->
      <line
        :x1="p3x" :y1="sigY + bodyH*0.04"
        :x2="p3x" :y2="bodyY + bodyH - arrowHH * 1.5"
        stroke="#ffffff" stroke-width="1.5" stroke-linecap="round" opacity="0.88"
        :clip-path="`url(#rc-body-clip-${uid})`"
      />
      <!-- Coupled arrowhead (down-pointing) -->
      <polygon :points="coupledArrowHead"
        fill="#ffffff" opacity="0.88"
        :clip-path="`url(#rc-body-clip-${uid})`"
      />
      <!-- Coupling junction dot on main path -->
      <circle
        :cx="p3x" :cy="sigY"
        :r="bodyH * 0.055"
        fill="#ffffff" opacity="0.70"
        :clip-path="`url(#rc-body-clip-${uid})`"
      />

      <!-- ══════════════════════════════════════════════════════════════════
           PORT LABELS  (outside body, small but legible)
           ════════════════════════════════════════════════════════════════ -->
      <!-- P1 label — left of left stub -->
      <text
        :x="bodyX * 0.36" :y="bodyY - labelFontSize * 0.3"
        text-anchor="middle" dominant-baseline="auto"
        :font-size="labelFontSize" font-weight="700"
        font-family="'Segoe UI', sans-serif" fill="#c9d1d9"
      >p1</text>
      <!-- P2 label — right of right stub -->
      <text
        :x="bodyX + bodyW + bodyX * 0.64" :y="bodyY - labelFontSize * 0.3"
        text-anchor="middle" dominant-baseline="auto"
        :font-size="labelFontSize" font-weight="700"
        font-family="'Segoe UI', sans-serif" fill="#c9d1d9"
      >p2</text>
      <!-- P4 label — below P4 stub -->
      <text
        :x="p4x" :y="bodyY + bodyH + stubBotH + labelFontSize * 1.1"
        text-anchor="middle" dominant-baseline="auto"
        :font-size="labelFontSize" font-weight="700"
        font-family="'Segoe UI', sans-serif" fill="#c9d1d9"
      >p4</text>
      <!-- P3 label — below P3 stub -->
      <text
        :x="p3x" :y="bodyY + bodyH + stubBotH + labelFontSize * 1.1"
        text-anchor="middle" dominant-baseline="auto"
        :font-size="labelFontSize" font-weight="700"
        font-family="'Segoe UI', sans-serif" fill="#c9d1d9"
      >p3</text>

      <!-- ── Invalid overlay ─────────────────────────────────────────────── -->
      <rect v-if="d.isInvalid" x="0" y="0" :width="w" :height="h"
        fill="rgba(231,76,60,0.15)"
        stroke="#e74c3c" stroke-width="1.5" stroke-dasharray="6,4" rx="3"
      />
    </svg>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from "vue";
import { useNodeData } from "./useNodeData";

const { d, w, h } = useNodeData(200, 80);
const uid = ref(Math.random().toString(36).slice(2, 8));

// ── Body geometry ─────────────────────────────────────────────────────────
const bodyX  = computed(() => w.value * 0.06);
const bodyY  = computed(() => h.value * 0.18);
const bodyW  = computed(() => w.value * 0.88);
const bodyH  = computed(() => h.value * 0.42);
const bodyRx = computed(() => bodyH.value * 0.26);

// ── P1/P2 side stubs ──────────────────────────────────────────────────────
const stubSideH = computed(() => bodyH.value * 0.38);
const stubSideY = computed(() => bodyY.value + bodyH.value * 0.31);

// ── P3/P4 bottom stubs ────────────────────────────────────────────────────
const stubBotW = computed(() => Math.max(6, bodyW.value * 0.075));
const stubBotH = computed(() => h.value * 0.22);

// ── Bottom port X centres (P3 coupled ~76%, P4 isolated ~38%) ────────────
const p3x = computed(() => bodyX.value + bodyW.value * 0.76);
const p4x = computed(() => bodyX.value + bodyW.value * 0.38);

// ── Main signal axis ──────────────────────────────────────────────────────
const sigY = computed(() => bodyY.value + bodyH.value * 0.44);

// ── Colours from node data ────────────────────────────────────────────────
const bodyFill   = computed(() => (d.value.fill        as string) || "#1e90b8");
const strokeColor= computed(() => (d.value.stroke      as string) || "#0d5f78");
const strokeW    = computed(() => (d.value.strokeWidth as number) ||  2);

// ── Arrow geometry ────────────────────────────────────────────────────────
const arrowHH = computed(() => bodyH.value * 0.09);   // arrowhead half-height
const arrowHL = computed(() => bodyH.value * 0.12);   // arrowhead length

// Main right-pointing arrowhead
const mainArrowHead = computed(() => {
  const tip  = bodyX.value + bodyW.value * 0.935;
  const base = tip - arrowHL.value;
  const cy   = sigY.value;
  const hh   = arrowHH.value;
  return `${base.toFixed(1)},${(cy - hh).toFixed(1)} ${tip.toFixed(1)},${cy.toFixed(1)} ${base.toFixed(1)},${(cy + hh).toFixed(1)}`;
});

// Coupled down-pointing arrowhead (at bottom of coupled path)
const coupledArrowHead = computed(() => {
  const cx   = p3x.value;
  const tip  = bodyY.value + bodyH.value - bodyH.value * 0.04;
  const base = tip - arrowHL.value;
  const hw   = arrowHH.value;
  return `${(cx - hw).toFixed(1)},${base.toFixed(1)} ${cx.toFixed(1)},${tip.toFixed(1)} ${(cx + hw).toFixed(1)},${base.toFixed(1)}`;
});

// ── Label font size ───────────────────────────────────────────────────────
const labelFontSize = computed(() => Math.max(7, Math.min(11, h.value * 0.115)));
</script>

<style scoped>
.node-wrap { width: 100%; height: 100%; overflow: visible; }
svg { overflow: visible; }
</style>
