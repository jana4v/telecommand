<template>
  <div class="node-wrap" :style="{ opacity: d.opacity ?? 1 }">
    <svg :width="w" :height="h" :viewBox="`0 0 ${w} ${h}`" xmlns="http://www.w3.org/2000/svg" overflow="visible">
      <defs>
        <linearGradient :id="`rfan-hot-${uid}`" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#ff7a42"/>
          <stop offset="100%" stop-color="#ffb166"/>
        </linearGradient>
        <linearGradient :id="`rfan-cool-${uid}`" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#59b8ff"/>
          <stop offset="100%" stop-color="#6be4ff"/>
        </linearGradient>
        <radialGradient :id="`rfan-body-${uid}`" cx="35%" cy="33%" r="68%">
          <stop offset="0%" :stop-color="fanBodyHi"/>
          <stop offset="100%" :stop-color="fanBodyLo"/>
        </radialGradient>
      </defs>

      <!-- Fan housing (top) -->
      <circle :cx="fanCx" :cy="fanCy" :r="fanR" :fill="`url(#rfan-body-${uid})`" :stroke="fanRing" stroke-width="2"/>
      <circle :cx="fanCx" :cy="fanCy" :r="fanR * 0.72" fill="#061520" :stroke="fanRingInner" stroke-width="1.5"/>

      <!-- Fan blades -->
      <g :transform="`rotate(${fanAngle}, ${fanCx}, ${fanCy})`">
        <path v-for="blade in blades" :key="blade.i"
          :d="blade.d"
          :fill="bladeFill"
          :stroke="bladeStroke"
          stroke-width="0.8"
          :opacity="isOn ? 0.95 : 0.55"
        />
      </g>
      <circle :cx="fanCx" :cy="fanCy" :r="fanR * 0.11" :fill="hubFill" :stroke="hubStroke" stroke-width="1"/>

      <!-- Attached radiator slab (bottom) -->
      <rect
        :x="radX" :y="radY" :width="radW" :height="radH"
        :fill="radiatorFill"
        :stroke="radiatorStroke"
        stroke-width="2"
        rx="4"
      />
      <line
        v-for="i in finCount"
        :key="`fin-${i}`"
        :x1="radX + ((radW / (finCount + 1)) * i)"
        :y1="radY + 4"
        :x2="radX + ((radW / (finCount + 1)) * i)"
        :y2="radY + radH - 4"
        :stroke="finStroke"
        stroke-width="1"
        opacity="0.75"
      />

      <!-- Radiator connector points (left + right) -->
      <circle :cx="radX" :cy="radCy" :r="connectorR" :fill="connectorFill" :stroke="connectorStroke" stroke-width="1.2"/>
      <circle :cx="radX + radW" :cy="radCy" :r="connectorR" :fill="connectorFill" :stroke="connectorStroke" stroke-width="1.2"/>

      <!-- Support structure: fan frame attached to radiator -->
      <rect
        :x="braceX"
        :y="braceY"
        :width="braceW"
        :height="braceH"
        :fill="braceFill"
        :stroke="braceStroke"
        stroke-width="1.6"
        rx="2"
      />
      <line
        :x1="braceX"
        :y1="braceY + braceH * 0.2"
        :x2="braceX + braceW"
        :y2="braceY + braceH * 0.8"
        :stroke="braceCross"
        stroke-width="1"
        opacity="0.9"
      />
      <line
        :x1="braceX + braceW"
        :y1="braceY + braceH * 0.2"
        :x2="braceX"
        :y2="braceY + braceH * 0.8"
        :stroke="braceCross"
        stroke-width="1"
        opacity="0.9"
      />

      <!-- Inflow stream toward radiator (warm) -->
      <path :d="streamPath(0)" fill="none" :stroke="`url(#rfan-hot-${uid})`" stroke-width="2" :stroke-dasharray="streamDash" :stroke-dashoffset="streamOffset" :opacity="isOn ? 0.75 : 0.12"/>
      <path :d="streamPath(1)" fill="none" :stroke="`url(#rfan-hot-${uid})`" stroke-width="2" :stroke-dasharray="streamDash" :stroke-dashoffset="streamOffset + 5" :opacity="isOn ? 0.75 : 0.12"/>
      <path :d="streamPath(2)" fill="none" :stroke="`url(#rfan-hot-${uid})`" stroke-width="2" :stroke-dasharray="streamDash" :stroke-dashoffset="streamOffset + 10" :opacity="isOn ? 0.75 : 0.12"/>

      <!-- Cooled air moving away from radiator face (upward dispersion) -->
      <path
        v-for="(p, i) in coolSprayPaths"
        :key="`cool-spray-${i}`"
        :d="p"
        fill="none"
        :stroke="`url(#rfan-cool-${uid})`"
        stroke-width="1.8"
        :stroke-dasharray="coolSprayDash"
        :stroke-dashoffset="coolSprayOffset + i * 4"
        :opacity="isOn ? 0.82 : 0.08"
      />

      <!-- Warm particles moving toward radiator -->
      <circle
        v-for="p in airParticles"
        :key="p.key"
        :cx="p.x"
        :cy="p.y"
        :r="p.r"
        :fill="p.fill"
        :opacity="p.opacity"
      />

      <!-- Cooled particles leaving radiator face -->
      <circle
        v-for="p in coolAirParticles"
        :key="p.key"
        :cx="p.x"
        :cy="p.y"
        :r="p.r"
        :fill="p.fill"
        :opacity="p.opacity"
      />

      <text
        :x="titleX"
        :y="titleY"
        :text-anchor="titleAnchor"
        dominant-baseline="auto"
        :font-size="titleFontSz"
        font-family="monospace"
        font-weight="700"
        :fill="titleFontColor"
      >{{ displayName }}</text>

      <text
        v-if="hasTemp"
        :x="radX + radW / 2"
        :y="radY + radH / 2 + 3"
        text-anchor="middle"
        dominant-baseline="middle"
        :font-size="Math.max(7, h * 0.1)"
        font-family="monospace"
        font-weight="600"
        :fill="tempColor"
      >{{ tempText }}</text>

      <circle
        :cx="fanCx + fanR * 0.72"
        :cy="fanCy - fanR * 0.72"
        :r="fanR * 0.12"
        :fill="isOn ? '#37d67a' : '#394655'"
        :stroke="isOn ? '#9ff5c4' : '#5d6b7a'"
        stroke-width="1"
      />

      <rect v-if="d.isInvalid" x="0" y="0" :width="w" :height="h" fill="rgba(231,76,60,0.28)" rx="4"/>
    </svg>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import { useNodeData } from "./useNodeData";
import { useGsapSpin } from "./useGsapSpin";
import { useTitlePosition } from "./useTitlePosition";

const { d, w, h } = useNodeData(220, 100);
const uid = ref(Math.random().toString(36).slice(2, 8));

const onByStatus = computed(() => !!d.value.statusColor && d.value.statusColor !== "");
const onByFlow = computed(() => d.value.flowActive === true);
const isOn = computed(() => onByFlow.value || onByStatus.value);

const fanSpeed = computed(() => {
  const explicit = Number(d.value.pumpSpeed ?? 0);
  if (Number.isFinite(explicit) && Math.abs(explicit) > 0.5) return Math.abs(explicit);
  return isOn.value ? 1800 : 0;
});
const fanAngle = useGsapSpin(() => fanSpeed.value, () => 1, 4000);

const fanCx = computed(() => w.value * 0.5);
const fanCy = computed(() => h.value * 0.23);
const fanR = computed(() => Math.min(w.value, h.value) * 0.18);

const radX = computed(() => w.value * 0.22);
const radY = computed(() => h.value * 0.58);
const radW = computed(() => w.value * 0.56);
const radH = computed(() => h.value * 0.30);
const radCy = computed(() => radY.value + radH.value / 2);

const braceW = computed(() => Math.max(10, w.value * 0.08));
const braceH = computed(() => Math.max(16, radY.value - (fanCy.value + fanR.value) - h.value * 0.03));
const braceX = computed(() => fanCx.value - braceW.value / 2);
const braceY = computed(() => fanCy.value + fanR.value + h.value * 0.01);
const connectorR = computed(() => Math.max(2.8, Math.min(w.value, h.value) * 0.03));

const finCount = computed(() => Math.max(6, Math.floor(radW.value / 9)));

const fanBodyHi = computed(() => isOn.value ? "#1d3a51" : "#1a2430");
const fanBodyLo = computed(() => isOn.value ? "#091928" : "#101822");
const fanRing = computed(() => isOn.value ? "#5aa8d8" : "#455667");
const fanRingInner = computed(() => isOn.value ? "#3a8ec0" : "#344453");

const bladeFill = computed(() => isOn.value ? "#9ed9ff" : "#5c6d7f");
const bladeStroke = computed(() => isOn.value ? "#d7f0ff" : "#74869a");
const hubFill = computed(() => isOn.value ? "#0d2f48" : "#2a3643");
const hubStroke = computed(() => isOn.value ? "#9fd8ff" : "#6d7b89");

const radiatorFill = computed(() => isOn.value ? "#0d2734" : "#141d28");
const radiatorStroke = computed(() => isOn.value ? "#64b3dd" : "#45596b");
const finStroke = computed(() => isOn.value ? "#6ec3ea" : "#4a5f72");
const connectorFill = computed(() => isOn.value ? "#0c1e2a" : "#14202a");
const connectorStroke = computed(() => isOn.value ? "#78c8ef" : "#6a7f90");
const braceFill = computed(() => isOn.value ? "#173447" : "#1c2732");
const braceStroke = computed(() => isOn.value ? "#5ea6cf" : "#4c5e6f");
const braceCross = computed(() => isOn.value ? "#87cbed" : "#607283");

const streamDash = computed(() => `${Math.max(3, w.value * 0.03)} ${Math.max(3, w.value * 0.03)}`);
const streamOffset = computed(() => isOn.value ? fanAngle.value * 0.18 : 0);
const coolSprayDash = computed(() => `${Math.max(2, w.value * 0.022)} ${Math.max(3, w.value * 0.026)}`);
const coolSprayOffset = computed(() => isOn.value ? -fanAngle.value * 0.15 : 0);

const displayName = computed(() => String(d.value.name || "RAD FAN"));
const titleFontSz = computed(() => (d.value.titleFontSize as number | undefined) ?? Math.max(8, h.value * 0.11));
const titleFontColor = computed(() => (d.value.titleFontColor as string) || "#cfe8ff");
const { titleX, titleY, titleAnchor } = useTitlePosition(
  () => d.value.titlePosition as string | undefined,
  () => 0,
  () => w.value,
  () => 0,
  () => h.value,
  "top-center",
);
const hasTemp = computed(() => d.value.temperature != null);
const tempVal = computed(() => Number(d.value.temperature));
const tempText = computed(() => `${tempVal.value.toFixed(1)}C`);
const tempColor = computed(() => {
  const t = tempVal.value;
  if (!Number.isFinite(t)) return "#8ca1b8";
  if (t >= 45) return "#ff8740";
  if (t >= 30) return "#f3cb60";
  return "#72d8ff";
});

function streamPath(row: number): string {
  const entryX = fanCx.value + (row - 1) * (fanR.value * 0.58);
  const startY = fanCy.value + fanR.value * 0.88;
  const endY = radY.value - h.value * 0.02;
  const midY1 = startY + (endY - startY) * 0.34;
  const midY2 = startY + (endY - startY) * 0.70;
  const drift = (row - 1) * (w.value * 0.02);
  return `M ${entryX} ${startY} C ${entryX + drift} ${midY1} ${entryX - drift} ${midY2} ${entryX} ${endY}`;
}

const coolSprayPaths = computed(() => {
  const ox = radX.value + radW.value / 2;
  const oy = radY.value;
  const len = Math.max(14, h.value * 0.20);
  const spread = [
    { dx: -w.value * 0.18, dy: -h.value * 0.16 },
    { dx: -w.value * 0.08, dy: -h.value * 0.20 },
    { dx: 0,               dy: -h.value * 0.22 },
    { dx:  w.value * 0.08, dy: -h.value * 0.20 },
    { dx:  w.value * 0.18, dy: -h.value * 0.16 },
  ];
  return spread.map((s) => {
    const ex = ox + s.dx;
    const ey = oy + s.dy;
    const c1x = ox + s.dx * 0.35;
    const c1y = oy - len * 0.35;
    const c2x = ox + s.dx * 0.75;
    const c2y = oy + s.dy * 0.70;
    return `M ${ox} ${oy} C ${c1x} ${c1y} ${c2x} ${c2y} ${ex} ${ey}`;
  });
});

const blades = computed(() => {
  const n = 5;
  const innerR = fanR.value * 0.18;
  const outerR = fanR.value * 0.66;
  return Array.from({ length: n }, (_, i) => {
    const base = (i * (360 / n)) * (Math.PI / 180);
    const tip = (i * (360 / n) + 42) * (Math.PI / 180);
    const ctrl = (base + tip) / 2;
    const x0 = fanCx.value + innerR * Math.cos(base);
    const y0 = fanCy.value + innerR * Math.sin(base);
    const x1 = fanCx.value + outerR * Math.cos(ctrl);
    const y1 = fanCy.value + outerR * Math.sin(ctrl);
    const x2 = fanCx.value + (fanR.value * 0.36) * Math.cos(tip);
    const y2 = fanCy.value + (fanR.value * 0.36) * Math.sin(tip);
    const dPath = [
      `M ${x0.toFixed(2)} ${y0.toFixed(2)}`,
      `Q ${x1.toFixed(2)} ${y1.toFixed(2)} ${x2.toFixed(2)} ${y2.toFixed(2)}`,
      `Q ${(fanCx.value + innerR * 0.62 * Math.cos(base + 0.2)).toFixed(2)} ${(fanCy.value + innerR * 0.62 * Math.sin(base + 0.2)).toFixed(2)} ${x0.toFixed(2)} ${y0.toFixed(2)}`,
      "Z",
    ].join(" ");
    return { i, d: dPath };
  });
});

const airParticles = computed(() => {
  if (!isOn.value) return [] as Array<{ key: string; x: number; y: number; r: number; fill: string; opacity: number }>;

  const phase = fanAngle.value / 360;
  const startY = fanCy.value + fanR.value * 0.88;
  const endY = radY.value - h.value * 0.02;
  const spanY = endY - startY;

  const cols = [fanCx.value - fanR.value * 0.48, fanCx.value, fanCx.value + fanR.value * 0.48];
  const out: Array<{ key: string; x: number; y: number; r: number; fill: string; opacity: number }> = [];

  for (let col = 0; col < cols.length; col++) {
    for (let i = 0; i < 4; i++) {
      const t = (phase + i * 0.24 + col * 0.11) % 1;
      const x = cols[col] + Math.sin((t * Math.PI * 2) + col) * (w.value * 0.01);
      const y = startY + spanY * t;
      const nearRadiator = t > 0.82;
      out.push({
        key: `${col}-${i}`,
        x,
        y,
        r: nearRadiator ? Math.max(1.4, h.value * 0.014) : Math.max(1.8, h.value * 0.017),
        fill: nearRadiator ? "#ffd082" : "#ff9a52",
        opacity: nearRadiator ? 0.92 : 0.78,
      });
    }
  }

  return out;
});

const coolAirParticles = computed(() => {
  if (!isOn.value) return [] as Array<{ key: string; x: number; y: number; r: number; fill: string; opacity: number }>;

  const phase = fanAngle.value / 360;
  const ox = radX.value + radW.value / 2;
  const oy = radY.value;
  const lanes = [-2, -1, 0, 1, 2];
  const out: Array<{ key: string; x: number; y: number; r: number; fill: string; opacity: number }> = [];

  for (let laneIdx = 0; laneIdx < lanes.length; laneIdx++) {
    const lane = lanes[laneIdx];
    for (let i = 0; i < 3; i++) {
      const t = (phase + i * 0.28 + laneIdx * 0.09) % 1;
      const x = ox + lane * (w.value * 0.03) * t + Math.sin((t * Math.PI * 2) + laneIdx) * (w.value * 0.006);
      const y = oy - (h.value * (0.10 + Math.abs(lane) * 0.02)) * t;
      out.push({
        key: `cool-${laneIdx}-${i}`,
        x,
        y,
        r: Math.max(1.2, h.value * 0.012),
        fill: "#7ee6ff",
        opacity: 0.86 - Math.abs(lane) * 0.06,
      });
    }
  }

  return out;
});
</script>

<style scoped>
.node-wrap { width: 100%; height: 100%; overflow: visible; }
svg { overflow: visible; }
</style>
