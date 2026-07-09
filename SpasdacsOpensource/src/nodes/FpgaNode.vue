<template>
  <div class="node-wrap" :style="{ opacity: d.opacity ?? 1 }">
    <svg :width="w" :height="h" :viewBox="`0 0 ${w} ${h}`"
         xmlns="http://www.w3.org/2000/svg" overflow="visible">
      <defs>
        <!-- Static dark body gradient -->
        <linearGradient :id="`fpga-chip-${uid}`" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%"   stop-color="#101a2c"/>
          <stop offset="55%"  stop-color="#080f1c"/>
          <stop offset="100%" stop-color="#040a14"/>
        </linearGradient>
        <!-- Pin metallic gradients -->
        <linearGradient :id="`fpga-pin-h-${uid}`" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stop-color="#8ab0c8"/>
          <stop offset="50%"  stop-color="#d0e4f0"/>
          <stop offset="100%" stop-color="#6a90a8"/>
        </linearGradient>
        <linearGradient :id="`fpga-pin-v-${uid}`" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%"   stop-color="#8ab0c8"/>
          <stop offset="50%"  stop-color="#d0e4f0"/>
          <stop offset="100%" stop-color="#6a90a8"/>
        </linearGradient>
        <!-- Outer metallic frame gradient -->
        <linearGradient :id="`fpga-frame-${uid}`" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%"   stop-color="#a8a8b8"/>
          <stop offset="25%"  stop-color="#68687a"/>
          <stop offset="50%"  stop-color="#d8d8e8"/>
          <stop offset="75%"  stop-color="#68687a"/>
          <stop offset="100%" stop-color="#a8a8b8"/>
        </linearGradient>
      </defs>

      <!-- ══ TOP PINS (drawn before chip so chip overlaps bases) ══ -->
      <rect v-for="pin in topPins" :key="`tp-${pin.i}`"
        :x="pin.x - pinW * 0.5" :y="chipY - pinLen"
        :width="pinW" :height="pinLen + 1"
        :fill="`url(#fpga-pin-h-${uid})`" :rx="pinW * 0.28"/>
      <!-- ══ BOTTOM PINS ══ -->
      <rect v-for="pin in botPins" :key="`bp-${pin.i}`"
        :x="pin.x - pinW * 0.5" :y="chipY + chipH - 1"
        :width="pinW" :height="pinLen + 1"
        :fill="`url(#fpga-pin-h-${uid})`" :rx="pinW * 0.28"/>
      <!-- ══ LEFT PINS ══ -->
      <rect v-for="pin in leftPins" :key="`lp-${pin.i}`"
        :x="chipX - pinLen" :y="pin.y - pinW * 0.5"
        :width="pinLen + 1" :height="pinW"
        :fill="`url(#fpga-pin-v-${uid})`" :rx="pinW * 0.28"/>
      <!-- ══ RIGHT PINS ══ -->
      <rect v-for="pin in rightPins" :key="`rp-${pin.i}`"
        :x="chipX + chipW - 1" :y="pin.y - pinW * 0.5"
        :width="pinLen + 1" :height="pinW"
        :fill="`url(#fpga-pin-v-${uid})`" :rx="pinW * 0.28"/>

      <!-- ══ CHIP SHADOW ══ -->
      <rect :x="chipX + chipShadow" :y="chipY + chipShadow"
            :width="chipW" :height="chipH"
            fill="rgba(0,0,0,0.55)" :rx="chipRx"/>

      <!-- ══ CHIP BODY (base dark fill) ══ -->
      <rect :x="chipX" :y="chipY" :width="chipW" :height="chipH"
            :fill="`url(#fpga-chip-${uid})`" :rx="chipRx"/>

      <!-- Status tint overlay -->
      <rect :x="chipX" :y="chipY" :width="chipW" :height="chipH"
            :fill="statusColor" :opacity="tintOpacity" :rx="chipRx"/>

      <!-- Status outer glow halo — wide soft glow when ON -->
      <rect :x="chipX - chipBorderSw * 1.2" :y="chipY - chipBorderSw * 1.2"
            :width="chipW + chipBorderSw * 2.4" :height="chipH + chipBorderSw * 2.4"
            fill="none" :stroke="statusColor"
            :stroke-width="chipBorderSw * 1.4" :opacity="glowOpacity"
            :rx="chipRx + chipBorderSw * 1.2"/>
      <!-- Second tighter glow ring (fades in/out smoothly) -->
      <rect :x="chipX - chipBorderSw * 0.4" :y="chipY - chipBorderSw * 0.4"
            :width="chipW + chipBorderSw * 0.8" :height="chipH + chipBorderSw * 0.8"
            fill="none" :stroke="statusColor"
            :stroke-width="chipBorderSw * 0.6" :opacity="innerGlow"
            :rx="chipRx + chipBorderSw * 0.4"/>

      <!-- ══ INTERNAL FABRIC GRID ══ -->
      <!-- Horizontal lines -->
      <line v-for="r in gridRowLines" :key="`hr-${r}`"
        :x1="chipX + chipPad" :y1="chipY + chipPad + r * gridCellH"
        :x2="chipX + chipW - chipPad" :y2="chipY + chipPad + r * gridCellH"
        :stroke="statusColor" :opacity="gridOpacity" :stroke-width="chipBorderSw * 0.45"/>
      <!-- Vertical lines -->
      <line v-for="c in gridColLines" :key="`vc-${c}`"
        :x1="chipX + chipPad + c * gridCellW" :y1="chipY + chipPad"
        :x2="chipX + chipPad + c * gridCellW" :y2="chipY + chipH - chipPad"
        :stroke="statusColor" :opacity="gridOpacity" :stroke-width="chipBorderSw * 0.45"/>
      <!-- Intersection dots -->
      <circle v-for="pt in gridPoints" :key="`gp-${pt.key}`"
        :cx="pt.x" :cy="pt.y" :r="gridDotR"
        :fill="statusColor" :opacity="dotOpacity"/>

      <!-- ══ CHIP BORDER: ON + unlocked = orange, ON + locked = green, OFF = hidden ══ -->
      <rect :x="chipX" :y="chipY" :width="chipW" :height="chipH"
            fill="none" :stroke="chipOutlineStroke"
            :stroke-width="chipMainBorderWidth" :rx="chipRx"/>

      <!-- Pin-1 notch (top-left corner) -->
      <path :d="notchPath" :fill="`url(#fpga-chip-${uid})`"
            :stroke="chipOutlineStroke" :stroke-width="chipNotchBorderWidth" opacity="0.80"/>



      <!-- ══ TEMPERATURE (bottom-right, optional) ══ -->
      <text v-if="hasTemp"
        :x="chipX + chipW - chipPad * 1.0" :y="chipY + chipH - chipPad * 0.75"
        text-anchor="end" dominant-baseline="ideographic"
        :font-size="tempFz" font-weight="700"
        font-family="'Digital7', 'Courier New', monospace"
        :fill="tempColor"
      >{{ tempText }}</text>

      <!-- Invalid dashed overlay -->
      <rect v-if="d.isInvalid"
        :x="chipX" :y="chipY" :width="chipW" :height="chipH"
        fill="rgba(231,76,60,0.12)" stroke="#e74c3c"
        :stroke-width="chipBorderSw * 1.2" stroke-dasharray="6,3"
        :rx="chipRx"/>

      <!-- ══ METALLIC OUTER FRAME (drawn last) ══ -->
      <rect :x="frameO" :y="frameO" :width="w - frameSw" :height="h - frameSw"
        fill="none"
        :stroke="d.isInvalid ? '#e74c3c' : `url(#fpga-frame-${uid})`"
        :stroke-width="frameSw" :rx="frameRx"/>
    </svg>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from "vue";
import { useNodeData }  from "./useNodeData";
import { useGsapTween } from "./useGsapTween";

const { d, w, h } = useNodeData(185, 150);
const uid = ref(Math.random().toString(36).slice(2, 8));

// ── Metallic frame ─────────────────────────────────────────────────────────
const frameSw = computed(() => Math.min(w.value, h.value) * 0.040);
const frameO  = computed(() => frameSw.value * 0.5);
const frameRx = computed(() => Math.min(w.value, h.value) * 0.062);

// ── Pin stub dimensions (proportional to node size) ────────────────────────
const scl    = computed(() => Math.min(w.value, h.value));
const pinLen = computed(() => scl.value * 0.060);
const pinW   = computed(() => scl.value * 0.034);

// ── Chip body — fills node interior (frame + pin space on all sides) ───────
const inset  = computed(() => frameO.value + frameSw.value + pinLen.value);
const chipX  = computed(() => inset.value);
const chipY  = computed(() => inset.value);
const chipW  = computed(() => w.value - inset.value * 2);
const chipH  = computed(() => h.value - inset.value * 2);
const chipCx = computed(() => chipX.value + chipW.value / 2);
const chipCy = computed(() => chipY.value + chipH.value / 2);
const chipRx = computed(() => scl.value * 0.030);
const chipBorderSw = computed(() => scl.value * 0.018);
const chipShadow   = computed(() => chipBorderSw.value * 1.6);
const chipPad      = computed(() => scl.value * 0.052);

// ── Pin positions ──────────────────────────────────────────────────────────
const PIN_H = 6;  // pins on top / bottom
const PIN_V = 5;  // pins on left / right

const topPins   = computed(() => Array.from({ length: PIN_H }, (_, i) => ({
  i, x: chipX.value + chipW.value * (i + 0.5) / PIN_H,
})));
const botPins   = computed(() => topPins.value);
const leftPins  = computed(() => Array.from({ length: PIN_V }, (_, i) => ({
  i, y: chipY.value + chipH.value * (i + 0.5) / PIN_V,
})));
const rightPins = computed(() => leftPins.value);

// ── Internal logic fabric grid ─────────────────────────────────────────────
const GCOLS = 6;
const GROWS = 5;
const availW    = computed(() => chipW.value - chipPad.value * 2);
const availH    = computed(() => chipH.value - chipPad.value * 2);
const gridCellW = computed(() => availW.value / GCOLS);
const gridCellH = computed(() => availH.value / GROWS);
const gridDotR  = computed(() => scl.value * 0.012);

const gridRowLines = computed(() => Array.from({ length: GROWS - 1 }, (_, i) => i + 1));
const gridColLines = computed(() => Array.from({ length: GCOLS - 1 }, (_, i) => i + 1));

const gridPoints = computed(() => {
  const pts: { key: string; x: number; y: number }[] = [];
  for (let r = 0; r <= GROWS; r++) {
    for (let c = 0; c <= GCOLS; c++) {
      pts.push({
        key: `${r}-${c}`,
        x: chipX.value + chipPad.value + c * gridCellW.value,
        y: chipY.value + chipPad.value + r * gridCellH.value,
      });
    }
  }
  return pts;
});

// Pin-1 notch arc (top-left corner of chip)
const notchPath = computed(() => {
  const x = chipX.value;
  const y = chipY.value;
  const r = scl.value * 0.048;
  return `M ${x + r} ${y} A ${r} ${r} 0 0 0 ${x} ${y + r} L ${x} ${y} Z`;
});

// ── Telemetry ──────────────────────────────────────────────────────────────
const statusColor = computed(() => String(d.value.statusColor || "#27ae60"));
const isOn        = computed(() => statusColor.value !== "#1a1a2e");

/** Chip outline: OFF → none; ON → orange (unlocked) / green (locked); optional innerBorderColor override; invalid → red */
const chipOutlineStroke = computed((): string => {
  if (d.value.isInvalid) return "#e74c3c";
  if (!isOn.value) return "none";
  const custom = d.value.innerBorderColor;
  if (custom != null && String(custom).trim() !== "") return String(custom).trim();
  return d.value.isLocked === true ? "#27ae60" : "#ff9800";
});

// Smooth ON ↔ OFF opacity/size transitions
const tintOpacity  = useGsapTween(() => isOn.value ? 0.75 : 0.04, 0.75, "power2.inOut");
/** Outer glow halo: fully off when element is OFF, so only ON state shows colour */
const glowOpacity  = useGsapTween(() => isOn.value ? 0.75 : 0.00, 0.75, "power2.inOut");
const innerGlow    = useGsapTween(() => isOn.value ? 0.35 : 0.00, 0.45, "power2.inOut");
const gridOpacity  = useGsapTween(() => isOn.value ? 0.35 : 0.06, 0.45, "power2.inOut");
const dotOpacity   = useGsapTween(() => isOn.value ? 0.65 : 0.10, 0.45, "power2.inOut");
const borderScale  = useGsapTween(() => isOn.value ? 1.6  : 1.0,  0.45, "power2.inOut");

const chipMainBorderWidth = computed(() => {
  if (d.value.isInvalid) return chipBorderSw.value * Math.max(1, borderScale.value) * 1.2;
  if (!isOn.value) return 0;
  return chipBorderSw.value * borderScale.value * 1.6;
});

const chipNotchBorderWidth = computed(() => {
  if (d.value.isInvalid) return chipBorderSw.value * 0.7 * 1.2;
  if (!isOn.value) return 0;
  return chipBorderSw.value * 0.7 * borderScale.value;
});

const nameText    = computed(() => (d.value.name as string) || "FPGA");
const hasTemp     = computed(() => d.value.temperature !== undefined && d.value.temperature !== null);
const tempText    = computed(() => {
  const t = d.value.temperature;
  if (t === null || t === undefined || typeof t !== "number") return "xx.x°C";
  return t.toFixed(1) + "°C";
});
const tempColor = computed(() => {
  const t = d.value.temperature as number | undefined;
  if (!t) return "#ffd740";
  return t > 80 ? "#e74c3c" : t > 60 ? "#ff9800" : "#ffd740";
});

// ── Font sizes (overridable from Inspector via node data) ──────────────────
const nameFz = computed(() => (d.value.titleFontSize as number | undefined) ?? Math.min(chipH.value * 0.228, chipW.value * 0.175));
const titleFontColor = computed(() => (d.value.titleFontColor as string) || "#c9d1d9");
const tempFz = computed(() => (d.value.tempFontSize  as number | undefined) ?? scl.value * 0.173);
</script>

<style scoped>
.node-wrap { width: 100%; height: 100%; overflow: visible; }
</style>
