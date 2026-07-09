<template>
  <div class="node-wrap" :style="{ opacity: d.opacity ?? 1 }">
    <svg :width="w" :height="h" :viewBox="`0 0 ${w} ${h}`" xmlns="http://www.w3.org/2000/svg" overflow="visible">
      <defs>
        <linearGradient :id="`hplate-base-${uid}`" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" :stop-color="plateTop" />
          <stop offset="100%" :stop-color="plateBottom" />
        </linearGradient>
        <radialGradient :id="`hplate-glow-${uid}`" cx="50%" cy="50%" r="60%">
          <stop offset="0%" :stop-color="glowCore" :stop-opacity="isOn ? 0.7 : 0" />
          <stop offset="100%" stop-color="#ffad66" stop-opacity="0" />
        </radialGradient>
      </defs>

      <rect
        :x="plateX"
        :y="plateY"
        :width="plateW"
        :height="plateH"
        rx="5"
        :fill="`url(#hplate-base-${uid})`"
        :stroke="plateStroke"
        stroke-width="2"
      />

      <line
        v-for="i in finCount"
        :key="`fin-${i}`"
        :x1="plateX + ((plateW / (finCount + 1)) * i)"
        :y1="plateY + 4"
        :x2="plateX + ((plateW / (finCount + 1)) * i)"
        :y2="plateY + plateH - 4"
        :stroke="finStroke"
        stroke-width="1"
        opacity="0.85"
      />

      <rect
        :x="heaterX"
        :y="heaterY"
        :width="heaterW"
        :height="heaterH"
        rx="4"
        :fill="heaterFill"
        :stroke="heaterStroke"
        stroke-width="1.6"
      />

      <!-- Heater mounted above radiator (attached via support legs) -->
      <line :x1="heaterX + heaterW * 0.2" :y1="heaterY + heaterH" :x2="heaterX + heaterW * 0.3" :y2="plateY" :stroke="mountStroke" stroke-width="1.6" />
      <line :x1="heaterX + heaterW * 0.8" :y1="heaterY + heaterH" :x2="heaterX + heaterW * 0.7" :y2="plateY" :stroke="mountStroke" stroke-width="1.6" />

      <path
        :d="coilPath"
        fill="none"
        :stroke="coilStroke"
        stroke-width="2"
        stroke-linecap="round"
      />

      <rect
        :x="plateX"
        :y="plateY"
        :width="plateW"
        :height="plateH"
        rx="5"
        :fill="`url(#hplate-glow-${uid})`"
        :opacity="isOn ? 0.35 : 0"
      />

      <path
        v-for="(p, i) in radiatorRadiationPaths"
        :key="`rad-heat-${i}`"
        v-if="isOn"
        :d="p"
        fill="none"
        :stroke="radiationStroke(i)"
        :stroke-width="1.1 + (i % 3) * 0.2"
        :stroke-dasharray="heatDash"
        :stroke-dashoffset="heatOffset + i * 3"
        :opacity="0.5 + (i % 3) * 0.12"
      />

      <circle
        v-for="p in heatParticles"
        :key="p.key"
        :cx="p.x"
        :cy="p.y"
        :r="p.r"
        :fill="p.fill"
        :opacity="p.opacity"
      />

      <rect
        :x="tempBadgeX"
        :y="tempBadgeY"
        :width="tempBadgeW"
        :height="tempBadgeH"
        :rx="Math.max(3, tempBadgeH * 0.25)"
        :fill="tempBadgeFill"
        :stroke="tempBadgeStroke"
        stroke-width="1.2"
        :opacity="0.96"
      />

      <text
        :x="heaterX + heaterW / 2"
        :y="heaterY + heaterH / 2 + 3"
        text-anchor="middle"
        dominant-baseline="middle"
        :font-size="Math.max(7, h * 0.09)"
        font-family="monospace"
        font-weight="700"
        :fill="isOn ? '#ffd9b0' : '#90a3b8'"
      >HTR</text>

      <text
        :x="w * 0.5"
        :y="plateY + plateH / 2 + 3"
        text-anchor="middle"
        dominant-baseline="middle"
        :font-size="displayTempFontSize"
        font-family="monospace"
        font-weight="800"
        :fill="tempColor"
      >{{ tempText }}</text>

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

      <circle
        :cx="heaterX + heaterW + 8"
        :cy="heaterY + 6"
        :r="Math.max(2.2, Math.min(w, h) * 0.03)"
        :fill="isOn ? '#ff8a3d' : '#394655'"
        :stroke="isOn ? '#ffd7b8' : '#5d6b7a'"
        stroke-width="1"
      />

      <rect v-if="d.isInvalid" x="0" y="0" :width="w" :height="h" fill="rgba(231,76,60,0.28)" rx="4" />
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

const onByFlag = computed(() => d.value.heaterOn === true);
const onByStatus = computed(() => !!d.value.statusColor && d.value.statusColor !== "");
const isOn = computed(() => onByFlag.value || onByStatus.value);
const heatAnim = useGsapSpin(() => (isOn.value ? 1500 : 0), () => 1, 4200);

const plateX = computed(() => w.value * 0.08);
const plateY = computed(() => h.value * 0.42);
const plateW = computed(() => w.value * 0.84);
const plateH = computed(() => h.value * 0.46);
const finCount = computed(() => Math.max(8, Math.floor(plateW.value / 11)));

const heaterW = computed(() => w.value * 0.30);
const heaterH = computed(() => h.value * 0.20);
const heaterX = computed(() => (w.value - heaterW.value) / 2);
// Mounted above the radiator plate with visible support legs.
const heaterY = computed(() => plateY.value - heaterH.value - h.value * 0.06);

const displayName = computed(() => String(d.value.name || "HEATER"));
const titleFontSz = computed(() => (d.value.titleFontSize as number | undefined) ?? Math.max(8, h.value * 0.11));
const titleFontColor = computed(() => (d.value.titleFontColor as string) || "#ffd8bb");
const { titleX, titleY, titleAnchor } = useTitlePosition(
  () => d.value.titlePosition as string | undefined,
  () => 0,
  () => w.value,
  () => 0,
  () => h.value,
  "top-center",
);

const tempRaw = computed(() => Number(d.value.temperature));
const hasTemp = computed(() => Number.isFinite(tempRaw.value));
const tempText = computed(() => (hasTemp.value ? `${tempRaw.value.toFixed(1)}C` : "--.-C"));
const displayTempFontSize = computed(() => {
  const explicit = Number(d.value.tempFontSize);
  if (Number.isFinite(explicit) && explicit > 0) return explicit;
  return Math.max(14, h.value * 0.19);
});
const tempColor = computed(() => {
  if (!hasTemp.value) return "#8ca1b8";
  const t = tempRaw.value;
  if (t >= 65) return "#ff6f32";
  if (t >= 45) return "#ffae57";
  if (t >= 30) return "#ffd276";
  return "#85cfff";
});
const tempBadgeW = computed(() => Math.max(66, plateW.value * 0.42));
const tempBadgeH = computed(() => Math.max(20, plateH.value * 0.56));
const tempBadgeX = computed(() => (w.value - tempBadgeW.value) / 2);
const tempBadgeY = computed(() => plateY.value + (plateH.value - tempBadgeH.value) / 2);
const tempBadgeFill = computed(() => (isOn.value ? "#2a1a12" : "#12202e"));
const tempBadgeStroke = computed(() => (isOn.value ? "#8f5d3a" : "#3e556b"));

const plateTop = computed(() => (isOn.value ? "#49301f" : "#172433"));
const plateBottom = computed(() => (isOn.value ? "#281810" : "#0f1a28"));
const plateStroke = computed(() => (isOn.value ? "#d58d52" : "#4f6680"));
const finStroke = computed(() => (isOn.value ? "#cf8a4f" : "#4d647b"));

const heaterFill = computed(() => (isOn.value ? "#4f2a18" : "#1a2430"));
const heaterStroke = computed(() => (isOn.value ? "#ffb16d" : "#5f7288"));
const mountStroke = computed(() => (isOn.value ? "#c98349" : "#4a5d70"));

const coilStroke = computed(() => (isOn.value ? "#ffc07b" : "#70849b"));
const glowCore = computed(() => (isOn.value ? "#ff9a52" : "#000000"));
const heatDash = computed(() => `${Math.max(2, w.value * 0.02)} ${Math.max(3, w.value * 0.025)}`);
const heatOffset = computed(() => (isOn.value ? -heatAnim.value * 0.18 : 0));
const plateCx = computed(() => plateX.value + plateW.value / 2);
const plateCy = computed(() => plateY.value + plateH.value / 2);

const coilPath = computed(() => {
  const y = heaterY.value + heaterH.value * 0.55;
  const x0 = heaterX.value + heaterW.value * 0.15;
  const step = heaterW.value * 0.12;
  const pts: string[] = [`M ${x0} ${y}`];
  for (let i = 0; i < 6; i++) {
    const x1 = x0 + step * (i + 0.5);
    const x2 = x0 + step * (i + 1);
    const up = i % 2 === 0 ? -heaterH.value * 0.16 : heaterH.value * 0.16;
    pts.push(`Q ${x1} ${y + up} ${x2} ${y}`);
  }
  return pts.join(" ");
});

const radiatorRadiationPaths = computed(() => {
  const cx = plateCx.value;
  const cy = plateCy.value;
  const rx = plateW.value * 0.56;
  const ry = plateH.value * 0.72;
  const dirs = [
    { x:  1.0, y:  0.0 },
    { x: -1.0, y:  0.0 },
    { x:  0.0, y: -1.0 },
    { x:  0.0, y:  1.0 },
    { x:  0.74, y:  0.74 },
    { x: -0.74, y:  0.74 },
    { x:  0.74, y: -0.74 },
    { x: -0.74, y: -0.74 },
  ];
  return dirs.map((d) => {
    const ex = cx + d.x * rx;
    const ey = cy + d.y * ry;
    const c1x = cx + d.x * rx * 0.35 - d.y * w.value * 0.03;
    const c1y = cy + d.y * ry * 0.35 + d.x * h.value * 0.03;
    const c2x = cx + d.x * rx * 0.75 + d.y * w.value * 0.02;
    const c2y = cy + d.y * ry * 0.75 - d.x * h.value * 0.02;
    return `M ${cx} ${cy} C ${c1x} ${c1y} ${c2x} ${c2y} ${ex} ${ey}`;
  });
});

function radiationStroke(index: number): string {
  const palette = ["#ff9a52", "#ffbf76", "#ffd79b", "#ffab5e"];
  return palette[index % palette.length];
}

const heatParticles = computed(() => {
  if (!isOn.value) return [] as Array<{ key: string; x: number; y: number; r: number; fill: string; opacity: number }>;

  const phase = heatAnim.value / 360;
  const out: Array<{ key: string; x: number; y: number; r: number; fill: string; opacity: number }> = [];
  const dirs = [
    { x: 1.0, y: 0.0 },
    { x: -1.0, y: 0.0 },
    { x: 0.0, y: -1.0 },
    { x: 0.0, y: 1.0 },
    { x: 0.74, y: 0.74 },
    { x: -0.74, y: 0.74 },
    { x: 0.74, y: -0.74 },
    { x: -0.74, y: -0.74 },
  ];

  for (let c = 0; c < dirs.length; c++) {
    for (let i = 0; i < 2; i++) {
      const t = (phase + i * 0.42 + c * 0.11) % 1;
      const dir = dirs[c];
      const spanX = plateW.value * 0.36;
      const spanY = plateH.value * 0.48;
      const x = plateCx.value + dir.x * spanX * t + Math.sin((t * Math.PI * 2) + c) * (w.value * 0.006);
      const y = plateCy.value + dir.y * spanY * t + Math.cos((t * Math.PI * 2) + c) * (h.value * 0.006);
      out.push({
        key: `${c}-${i}`,
        x,
        y,
        r: Math.max(1.2, h.value * 0.012),
        fill: i % 2 === 0 ? "#ffad66" : "#ffd39b",
        opacity: 0.28 + (1 - t) * 0.46,
      });
    }
  }

  return out;
});
</script>
