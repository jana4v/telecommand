<template>
  <div class="node-wrap" :style="{ opacity: d.opacity ?? 1 }">
    <svg :width="w" :height="h" :viewBox="`0 0 ${w} ${h}`" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient :id="`cs-bezel-${uid}`" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%"   stop-color="#909098"/>
          <stop offset="50%"  stop-color="#c8c8d0"/>
          <stop offset="100%" stop-color="#404048"/>
        </linearGradient>
        <radialGradient :id="`cs-screen-${uid}`" cx="50%" cy="40%" r="70%">
          <stop offset="0%"   stop-color="#0d1c12"/>
          <stop offset="100%" stop-color="#040a06"/>
        </radialGradient>
      </defs>

      <!-- Body -->
      <rect x="2" y="2" :width="w-4" :height="h-4"
        :fill="bodyFill" :stroke="`url(#cs-bezel-${uid})`"
        stroke-width="2.5" rx="5"/>

      <!-- ── Toroid coil (left section) ── -->
      <path :d="toroidPath" fill-rule="evenodd"
        :fill="coilFill" :stroke="readoutColor" stroke-width="1.5"/>
      <circle v-for="(wnd, i) in coilWindings" :key="i"
        :cx="wnd.cx" :cy="wnd.cy" :r="wnd.r"
        :fill="coilFill" :stroke="readoutColor" stroke-width="1"/>
      <!-- Conductor wire through toroid hole -->
      <line
        :x1="4" :y1="coilCY"
        :x2="coilCX + coilIRx * 2" :y2="coilCY"
        stroke="#a0c8e8" stroke-width="1.8" stroke-linecap="round"/>

      <!-- Divider between coil and screen sections -->
      <line :x1="divX" y1="6" :x2="divX" :y2="h-6"
        :stroke="readoutColor" stroke-width="0.5" opacity="0.25"/>

      <!-- Digital screen -->
      <rect :x="screenX" :y="screenY" :width="screenW" :height="screenH"
        :fill="`url(#cs-screen-${uid})`" :stroke="screenStroke"
        stroke-width="1.5" rx="3"/>

      <!-- Unit badge (centred above screen) -->
      <rect :x="badgeX" :y="badgeY" :width="badgeW" :height="badgeH"
        :fill="badgeBg" stroke="#202830" stroke-width="1" rx="2"/>
      <text :x="badgeX + badgeW/2" :y="badgeY + badgeH/2"
        text-anchor="middle" dominant-baseline="central"
        :font-size="badgeFs" font-weight="700" font-family="monospace"
        :fill="readoutColor">{{ unitLabel }}</text>

      <!-- Value readout -->
      <text :x="screenX + screenW/2" :y="screenY + screenH/2 + 1"
        text-anchor="middle" dominant-baseline="central"
        :font-size="readoutFs" font-weight="700"
        font-family="'Digital7','Courier New',monospace"
        :fill="readoutColor"
        :style="`filter:drop-shadow(0 0 ${readoutFs*0.12}px ${readoutColor})`">{{ valueText }}</text>

      <!-- Element name (bottom strip) -->
      <text v-if="nameLabel" :x="w/2" :y="h-4"
        text-anchor="middle" dominant-baseline="auto"
        :font-size="nameFs" font-weight="700" font-family="monospace"
        :fill="readoutColor" opacity="0.55">{{ nameLabel }}</text>

      <!-- Invalid overlay -->
      <rect v-if="d.isInvalid" x="2" y="2" :width="w-4" :height="h-4"
        fill="rgba(231,76,60,0.35)" rx="5"/>
    </svg>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from "vue";
import { useNodeData } from "./useNodeData";

const { d, w, h } = useNodeData(130, 70);
const uid = ref(Math.random().toString(36).slice(2, 8));

// ── Toroid coil (left ~30% of node width) ────────────────────────────────
const coilCX  = computed(() => w.value * 0.17);
const coilCY  = computed(() => h.value * 0.50);
const coilORx = computed(() => Math.min(w.value * 0.11, 15));
const coilORy = computed(() => Math.min(h.value * 0.28, 17));
const coilIRx = computed(() => coilORx.value * 0.50);
const coilIRy = computed(() => coilORy.value * 0.50);

const toroidPath = computed(() => {
  const cx = coilCX.value, cy = coilCY.value;
  const orx = coilORx.value, ory = coilORy.value;
  const irx = coilIRx.value, iry = coilIRy.value;
  return [
    `M ${cx - orx} ${cy}`,
    `a ${orx} ${ory} 0 1 0 ${2 * orx} 0`,
    `a ${orx} ${ory} 0 1 0 ${-2 * orx} 0`,
    `M ${cx - irx} ${cy}`,
    `a ${irx} ${iry} 0 1 1 ${2 * irx} 0`,
    `a ${irx} ${iry} 0 1 1 ${-2 * irx} 0`,
    "Z",
  ].join(" ");
});

// 3 winding circles across the top arc (210°, 270°, 330°)
const coilWindings = computed(() => {
  const cx = coilCX.value, cy = coilCY.value;
  const orx = coilORx.value, ory = coilORy.value;
  const irx = coilIRx.value, iry = coilIRy.value;
  const mr  = (orx + irx) / 2;
  const mry = (ory + iry) / 2;
  const wr  = (orx - irx) * 0.42;
  return [0, 1, 2].map(i => {
    const a = Math.PI + (Math.PI * (i + 0.5) / 3);
    return { cx: cx + mr * Math.cos(a), cy: cy + mry * Math.sin(a), r: wr };
  });
});

const coilFill = computed(() => "#0a1820");

// ── Screen layout (right ~65%) ─────────────────────────────────────────────
// divX is the soft boundary between coil and screen areas
const divX    = computed(() => w.value * 0.33);
const screenX = computed(() => divX.value + 4);
const screenY = computed(() => h.value * 0.28);
const screenW = computed(() => w.value - screenX.value - 6);
const screenH = computed(() => h.value * 0.52);

const badgeW  = computed(() => Math.min(screenW.value * 0.50, 42));
const badgeH  = computed(() => Math.min(h.value * 0.26, 17));
const badgeX  = computed(() => screenX.value + (screenW.value - badgeW.value) / 2);
const badgeY  = computed(() => screenY.value - badgeH.value - 2);
const badgeFs = computed(() => Math.max(9, badgeH.value * 0.70));

const readoutFs = computed(() => Math.max(10, screenH.value * 0.70));
const nameFs    = computed(() => Math.max(6, Math.min(w.value, h.value) * 0.09));

// ── Telemetry → display ───────────────────────────────────────────────────
const currentVal = computed(() => Number(d.value.currentValue ?? 0));
const units      = computed<"A" | "mA">(() => (d.value.currentUnits as "A" | "mA") || "A");
const unitLabel  = computed(() => units.value);
const nameLabel  = computed(() => (d.value.name as string) || "");

const valueText = computed(() => {
  const v = currentVal.value;
  if (!Number.isFinite(v)) return "---";
  const abs = Math.abs(v);
  const decimals = abs >= 100 ? 1 : abs >= 10 ? 2 : 3;
  return v.toFixed(decimals);
});

// ── Colour rules ──────────────────────────────────────────────────────────
type Op = ">" | ">=" | "<" | "<=" | "==" | "!=";
type Rule = { op: Op; threshold: number; color: string };

const matchedRuleColor = computed<string | null>(() => {
  const v = currentVal.value;
  if (!Number.isFinite(v)) return null;
  const rules = (d.value.currentColorRules as Rule[]) || [];
  for (const r of rules) {
    const t = Number(r.threshold);
    if (!Number.isFinite(t)) continue;
    let hit = false;
    switch (r.op) {
      case ">":  hit = v >  t; break;
      case ">=": hit = v >= t; break;
      case "<":  hit = v <  t; break;
      case "<=": hit = v <= t; break;
      case "==": hit = v === t; break;
      case "!=": hit = v !== t; break;
    }
    if (hit && r.color) return r.color;
  }
  return null;
});

const hasStatus    = computed(() => !!d.value.statusColor && d.value.statusColor !== "");
const readoutColor = computed(() =>
  matchedRuleColor.value ??
  (hasStatus.value ? (d.value.statusColor as string) : "#27ae60")
);

const bodyFill     = computed(() => d.value.isInvalid ? "#3a1212" : "#0e1626");
const screenStroke = computed(() => readoutColor.value);
const badgeBg      = computed(() => "#0a1018");
</script>

<style scoped>
.node-wrap { width: 100%; height: 100%; overflow: visible; }
svg { overflow: visible; }
</style>
