<template>
  <div class="node-wrap" :style="{ opacity: d.opacity ?? 1 }">
    <svg :width="w" :height="h" :viewBox="`0 0 ${w} ${h}`" xmlns="http://www.w3.org/2000/svg" overflow="visible">
      <defs>
        <!-- Per-colour arrowheads so each arc tip matches its stroke -->
        <marker :id="`rfca-${uid}`" markerWidth="7" markerHeight="7" refX="5.5" refY="3.5" orient="auto">
          <path d="M0,0.5 L6,3.5 L0,6.5 z" fill="#2b82c9" />
        </marker>
        <marker :id="`rfcb-${uid}`" markerWidth="7" markerHeight="7" refX="5.5" refY="3.5" orient="auto">
          <path d="M0,0.5 L6,3.5 L0,6.5 z" fill="#e67e22" />
        </marker>
        <marker :id="`rfcc-${uid}`" markerWidth="7" markerHeight="7" refX="5.5" refY="3.5" orient="auto">
          <path d="M0,0.5 L6,3.5 L0,6.5 z" fill="#27ae60" />
        </marker>

        <!-- Radial gradient: bright centre → steel-blue rim -->
        <radialGradient :id="`rfg-${uid}`" cx="38%" cy="33%" r="65%">
          <stop offset="0%"   stop-color="#f0f7ff" />
          <stop offset="55%"  stop-color="#d6eaf8" />
          <stop offset="100%" stop-color="#aed6f1" />
        </radialGradient>

        <!-- Subtle drop-shadow for the main circle -->
        <filter :id="`rfs-${uid}`" x="-25%" y="-25%" width="150%" height="150%">
          <feDropShadow dx="0" dy="1.5" stdDeviation="2.5"
            flood-color="#0d2137" flood-opacity="0.22" />
        </filter>
      </defs>

      <!-- No stub lines — port circles and terminator attach directly on the circle -->

      <!-- ══════════════════════════════════════════════
           P1 port circle (left) — positioned close to main circle
           ══════════════════════════════════════════════ -->
      <!-- outer ring -->
      <circle :cx="p1x" :cy="cy" :r="pcR"
        fill="#f0f7ff" stroke="#1a3a6e" :stroke-width="sw * 1.3" />
      <!-- centre dot -->
      <circle :cx="p1x" :cy="cy" :r="pcR * 0.36" fill="#1a3a6e" />
      <!-- label above -->
      <text :x="p1x" :y="cy - pcR - scl * 1.5"
        text-anchor="middle" :font-size="pFs" font-weight="700"
        fill="#1a3a6e" font-family="'Segoe UI',sans-serif">P1</text>

      <!-- ══════════════════════════════════════════════
           P2 port circle (right) — positioned close to main circle
           ══════════════════════════════════════════════ -->
      <circle :cx="p2x" :cy="cy" :r="pcR"
        fill="#f0f7ff" stroke="#1a3a6e" :stroke-width="sw * 1.3" />
      <circle :cx="p2x" :cy="cy" :r="pcR * 0.36" fill="#1a3a6e" />
      <text :x="p2x" :y="cy - pcR - scl * 1.5"
        text-anchor="middle" :font-size="pFs" font-weight="700"
        fill="#1a3a6e" font-family="'Segoe UI',sans-serif">P2</text>

      <!-- ══════════════════════════════════════════════
           Main circle  (drawn after stubs so it cleanly caps stub ends)
           ══════════════════════════════════════════════ -->
      <!-- Outer glow ring -->
      <circle :cx="cx" :cy="cy" :r="r + sw * 1.3"
        fill="none" stroke="#1a3a6e" :stroke-width="sw * 0.5" opacity="0.28" />
      <!-- Primary filled circle -->
      <circle :cx="cx" :cy="cy" :r="r"
        :fill="`url(#rfg-${uid})`" stroke="#1a3a6e"
        :stroke-width="sw * 1.9" :filter="`url(#rfs-${uid})`" />
      <!-- Inner decorative dashed ring -->
      <circle :cx="cx" :cy="cy" :r="r * 0.86"
        fill="none" stroke="#2c5282"
        :stroke-width="sw * 0.4" stroke-dasharray="3,4" opacity="0.28" />

      <!-- ══════════════════════════════════════════════
           Clockwise circulation arcs  (P1 → P2 → P3 → P1)
           ══════════════════════════════════════════════ -->
      <path :d="pathTop"   fill="none" stroke="#2b82c9" :stroke-width="aw"
        stroke-linecap="round" :marker-end="`url(#rfca-${uid})`" />
      <path :d="pathRight" fill="none" stroke="#e67e22" :stroke-width="aw"
        stroke-linecap="round" :marker-end="`url(#rfcb-${uid})`" />
      <path :d="pathLeft"  fill="none" stroke="#27ae60" :stroke-width="aw"
        stroke-linecap="round" :marker-end="`url(#rfcc-${uid})`" />

      <!-- ══════════════════════════════════════════════
           Centre labels
           ══════════════════════════════════════════════ -->
      <text :x="cx" :y="cy - fs * 0.22"
        text-anchor="middle" dominant-baseline="middle"
        :font-size="fs" font-weight="800" fill="#1a3a6e"
        font-family="'Segoe UI',sans-serif" letter-spacing="1.5">RF</text>
      <text :x="cx" :y="cy + fs * 0.68"
        text-anchor="middle" dominant-baseline="middle"
        :font-size="fs * 0.5" font-weight="600" fill="#2c5282"
        font-family="'Segoe UI',sans-serif" letter-spacing="1" opacity="0.72">CIRC</text>

      <!-- ══════════════════════════════════════════════
           Invalid overlay
           ══════════════════════════════════════════════ -->
      <circle v-if="d.isInvalid" :cx="cx" :cy="cy" :r="r"
        fill="rgba(231,76,60,0.35)" stroke="#e53e3e"
        :stroke-width="sw * 1.5" pointer-events="none" />

      <!-- ══════════════════════════════════════════════
           P3 — Terminated port  (resistor body + ground symbol)
           ══════════════════════════════════════════════ -->
      <!-- Resistor body (international rectangular symbol) -->
      <rect :x="cx - termW / 2" :y="termBodyY" :width="termW" :height="termH"
        fill="#e8f4f8" stroke="#1a3a6e" :stroke-width="sw * 1.1" rx="2" />

      <!-- Hatch lines — hidden when temperature is assigned -->
      <g v-if="!tempLabel">
        <line :x1="cx - termW * 0.28" :y1="termBodyY + termH * 0.28"
              :x2="cx + termW * 0.28" :y2="termBodyY + termH * 0.28"
          stroke="#1a3a6e" :stroke-width="sw * 0.5" opacity="0.45" />
        <line :x1="cx - termW * 0.28" :y1="termBodyY + termH * 0.52"
              :x2="cx + termW * 0.28" :y2="termBodyY + termH * 0.52"
          stroke="#1a3a6e" :stroke-width="sw * 0.5" opacity="0.45" />
        <line :x1="cx - termW * 0.28" :y1="termBodyY + termH * 0.76"
              :x2="cx + termW * 0.28" :y2="termBodyY + termH * 0.76"
          stroke="#1a3a6e" :stroke-width="sw * 0.5" opacity="0.45" />
      </g>

      <!-- P3 label to the right of the resistor body -->
      <text :x="cx + termW / 2 + scl * 3.5" :y="termBodyY + termH * 0.38"
        text-anchor="start" :font-size="pFs" font-weight="700"
        fill="#1a3a6e" font-family="'Segoe UI',sans-serif">P3</text>
      <!-- 50Ω label to the right -->
      <text :x="cx + termW / 2 + scl * 3.5" :y="termBodyY + termH * 0.82"
        text-anchor="start" :font-size="pFs * 0.88" font-weight="600"
        fill="#4a6fa5" font-family="'Segoe UI',sans-serif">50&#937;</text>

      <!-- Temperature — pill badge drawn last so it covers P3/50Ω labels -->
      <g v-if="tempLabel">
        <!-- badge background pill -->
        <rect
          :x="cx - tempBadgeW / 2" :y="termBodyY + termH * 0.72 - tempBadgeH / 2"
          :width="tempBadgeW"      :height="tempBadgeH"
          fill="#1a3a6e" rx="5" opacity="0.95" />
        <!-- value text — no dot -->
        <text
          :x="cx"
          :y="termBodyY + termH * 0.72"
          text-anchor="middle" dominant-baseline="middle"
          :font-size="fs * 1.56" font-weight="800" fill="#e8f4fc"
          font-family="'Segoe UI',sans-serif">{{ tempLabel }}</text>
      </g>

      <!-- Ground symbol — three horizontal lines, decreasing width -->
      <line :x1="cx - gW1 / 2" :y1="gndY1" :x2="cx + gW1 / 2" :y2="gndY1"
        stroke="#1a3a6e" :stroke-width="sw * 1.3" stroke-linecap="round" />
      <line :x1="cx - gW2 / 2" :y1="gndY2" :x2="cx + gW2 / 2" :y2="gndY2"
        stroke="#1a3a6e" :stroke-width="sw * 1.3" stroke-linecap="round" />
      <line :x1="cx - gW3 / 2" :y1="gndY3" :x2="cx + gW3 / 2" :y2="gndY3"
        stroke="#1a3a6e" :stroke-width="sw * 1.3" stroke-linecap="round" />
    </svg>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useNodeData } from "./useNodeData";

const uid = Math.random().toString(36).slice(2, 9);
const { d, w, h } = useNodeData(160, 210);

// ── Scale & core geometry ─────────────────────────────────────────────────
// Reference: 160 px wide.  All sizes scale with min(w,h)/160.
const scl = computed(() => Math.min(w.value, h.value) / 160);
const sw  = computed(() => Math.max(1,   scl.value * 1.3));
const cx  = computed(() => w.value  * 0.5);
/** Circle fills width — port circles sit ~4 px from the side edges */
const r   = computed(() => Math.min(w.value, h.value) * 0.44);
/** Circle centre derived from radius so top of circle sits flush at top */
const cy  = computed(() => r.value + scl.value * 5);
const aw  = computed(() => Math.max(1.8, scl.value * 2.8));
const fs  = computed(() => Math.max(9,   scl.value * 12));
const pFs = computed(() => Math.max(9,   scl.value * 11));
/** Port circle radius (P1 & P2 coaxial-style connectors) */
const pcR = computed(() => scl.value * 6.5);
/** P1 port circle centre — on the left edge of the main circle */
const p1x = computed(() => cx.value - r.value);
/** P2 port circle centre — on the right edge of the main circle */
const p2x = computed(() => cx.value + r.value);

// ── P3 terminator geometry (2× size) ─────────────────────────────────────
/** Terminator body starts directly at the circle bottom edge */
const termBodyY = computed(() => cy.value + r.value);
const termH     = computed(() => scl.value * 40);
const termW     = computed(() => scl.value * 44);
/** Gap between ground lines */
const gGap      = computed(() => scl.value * 6.4);
const gndY1     = computed(() => termBodyY.value + termH.value + gGap.value);
const gndY2     = computed(() => gndY1.value + gGap.value);
const gndY3     = computed(() => gndY2.value + gGap.value);
const gW1       = computed(() => scl.value * 36);
const gW2       = computed(() => scl.value * 24);
const gW3       = computed(() => scl.value * 12);

const tempLabel     = computed(() => formatCircTemp(d.value.temperature));
/** Badge pill sized for largest expected value "–99.9 °C" at 1.56× font */
const tempBadgeH    = computed(() => fs.value * 1.56 * 1.5);
const tempBadgeW    = computed(() => fs.value * 1.56 * 5.8);

// ── Clockwise circulation arcs ────────────────────────────────────────────
// pathTop   : P1 (left) → P2 (right)  — curves over the top
// pathRight : P2 (right) → P3 (bottom) — sweeps down the right side
// pathLeft  : P3 (bottom) → P1 (left)  — sweeps up the left side
const pathTop = computed(() => {
  const x = cx.value, y = cy.value, rad = r.value * 0.68;
  return `M ${x - rad * 0.82} ${y - rad * 0.30} Q ${x} ${y - rad * 1.10} ${x + rad * 0.82} ${y - rad * 0.30}`;
});
const pathRight = computed(() => {
  const x = cx.value, y = cy.value, rad = r.value * 0.68;
  return `M ${x + rad * 0.38} ${y - rad * 0.18} Q ${x + rad * 1.10} ${y + rad * 0.35} ${x + rad * 0.12} ${y + rad * 0.96}`;
});
const pathLeft = computed(() => {
  const x = cx.value, y = cy.value, rad = r.value * 0.68;
  return `M ${x - rad * 0.12} ${y + rad * 0.96} Q ${x - rad * 1.10} ${y + rad * 0.20} ${x - rad * 0.40} ${y - rad * 0.18}`;
});

// ── Helpers ───────────────────────────────────────────────────────────────
function formatCircTemp(t: unknown): string {
  if (t === undefined || t === null || t === false) return "";
  if (typeof t === "string") {
    const s = t.trim();
    if (s === "" || /^n\/?a$/i.test(s)) return "";
    const n = Number(s);
    if (Number.isNaN(n)) return "";
    return `${n.toFixed(1)} \u00b0C`;
  }
  const n = Number(t);
  if (Number.isNaN(n)) return "";
  return `${n.toFixed(1)} \u00b0C`;
}
</script>

<style scoped>
.node-wrap { width: 100%; height: 100%; overflow: visible; }
svg { overflow: visible; }
</style>
