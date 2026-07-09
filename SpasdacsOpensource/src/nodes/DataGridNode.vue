<template>
  <div class="node-wrap" :style="{ opacity: d.opacity ?? 1 }">
    <svg :width="w" :height="idealH" :viewBox="`0 0 ${w} ${idealH}`"
         xmlns="http://www.w3.org/2000/svg">

      <defs>
        <!-- Clip label column -->
        <clipPath :id="`dg-lbl-${nodeId}`">
          <rect x="1" y="0" :width="colX - 3" :height="idealH" />
        </clipPath>
        <!-- Clip value column -->
        <clipPath :id="`dg-val-${nodeId}`">
          <rect :x="colX + 2" y="0" :width="w - colX - 3" :height="idealH" />
        </clipPath>
      </defs>

      <!-- Background -->
      <rect x="0" y="0" :width="w" :height="idealH" rx="4" fill="#0b0f18"/>

      <!-- Border -->
      <rect x="0.5" y="0.5" :width="w - 1" :height="idealH - 1" rx="4"
        fill="none"
        :stroke="d.isInvalid ? '#e74c3c' : '#1e3040'"
        stroke-width="1.2"/>

      <!-- Title -->
      <template v-if="titleText">
        <SvgMultilineText
          :text="titleText" :x="titleX" :y="titleY" :centered="false"
          :font-size="titleFontSz" font-weight="700"
          font-family="'Courier New', monospace"
          :fill="titleFontColor" :text-anchor="titleAnchor"
        />
        <line x1="4" :y1="titleH - 2" :x2="w - 4" :y2="titleH - 2"
              stroke="rgba(0,200,230,0.18)" stroke-width="0.8"/>
      </template>

      <!-- Column divider -->
      <line :x1="colX" :y1="titleH" :x2="colX" :y2="idealH - 1"
            stroke="rgba(255,255,255,0.07)" stroke-width="0.7"/>

      <!-- Rows -->
      <template v-for="(row, i) in rows" :key="row.id">
        <!-- Alternating stripe -->
        <rect v-if="i % 2 === 1"
              x="1" :y="rowY(i)" :width="w - 2" :height="rowH"
              fill="rgba(255,255,255,0.025)"/>

        <!-- Row separator -->
        <line v-if="i > 0"
              x1="4" :y1="rowY(i)" :x2="w - 4" :y2="rowY(i)"
              stroke="rgba(255,255,255,0.05)" stroke-width="0.6"/>

        <!-- Label -->
        <text x="6" :y="rowY(i) + rowH * 0.72"
              :font-size="rowFontSz"
              font-family="'Segoe UI', system-ui, sans-serif"
              :fill="labelColor"
              style="dominant-baseline: auto"
              :clip-path="`url(#dg-lbl-${nodeId})`">
          {{ displayLabel(row) }}
        </text>

        <!-- Value: TEXT mode -->
        <text v-if="row.displayMode !== 'led'"
              :x="w - 6" :y="rowY(i) + rowH * 0.72"
              text-anchor="end"
              :font-size="rowFontSz" font-weight="600"
              font-family="'Courier New', monospace"
              :fill="getValueColor(row)"
              style="dominant-baseline: auto"
              :clip-path="`url(#dg-val-${nodeId})`">
          {{ displayValue(row) }}
        </text>

        <!-- Value: LED mode -->
        <template v-else>
          <circle
            :cx="w - 12" :cy="rowY(i) + rowH / 2"
            :r="Math.max(4, rowH * 0.22)"
            :fill="getLedColor(row)"
            :opacity="hasValue(row) ? 1 : 0.25"/>
          <circle v-if="hasValue(row)"
            :cx="w - 12" :cy="rowY(i) + rowH / 2"
            :r="Math.max(6, rowH * 0.33)"
            fill="none"
            :stroke="getLedColor(row)"
            stroke-width="0.8"
            opacity="0.35"/>
        </template>
      </template>

      <!-- Empty state -->
      <text v-if="rows.length === 0"
            :x="w / 2" :y="idealH / 2 + 4"
            text-anchor="middle" font-size="9"
            font-style="italic" font-family="monospace"
            fill="#2a3a4a">
        Add rows in Inspector
      </text>

    </svg>
  </div>
</template>

<script setup lang="ts">
import { computed, inject, onMounted, watchEffect } from "vue";
import type { Node } from "@antv/x6";
import { useNodeData } from "./useNodeData";
import SvgMultilineText from "./SvgMultilineText.vue";
import { useTitlePosition } from "./useTitlePosition";
import type { DataGridRow } from "../types";

const { d, w } = useNodeData(220, 40);

const nodeId = Math.random().toString(36).slice(2);

// ── Display settings ──────────────────────────────────────────────────────────
const titleText    = computed(() => (d.value.name         as string) || "");
const titleFontSz  = computed(() => (d.value.titleFontSize as number) ?? 13);
const titleFontColor = computed(() => (d.value.titleFontColor as string) || "#c9d1d9");
const { titleX, titleY, titleAnchor } = useTitlePosition(
  () => d.value.titlePosition as string | undefined,
  () => 0,
  () => w.value,
  () => 0,
  () => idealH.value,
  "top-center",
);
const rowFontSz    = computed(() => (d.value.rowFontSize   as number) ?? 12);
const labelColor   = computed(() => (d.value.labelColor    as string) || "#5e7888");
const valueLiveClr = computed(() => (d.value.valueColor    as string) || "#00ddc8");

// ── Dynamic row / title heights — grow with font size ────────────────────────
// rowH: enough vertical space to hold the row font with comfortable padding
const rowH   = computed(() => Math.max(16, Math.ceil(rowFontSz.value * 1.7)));
// Number of lines in the title text
const titleLineCount = computed(() =>
  titleText.value ? titleText.value.split("\n").length : 0
);
const titleLineH = computed(() => Math.ceil(titleFontSz.value * 1.3));
// titleH: enough for all title lines plus a small gap before the separator line
const titleH = computed(() => titleText.value
  ? Math.max(18, titleLineCount.value * titleLineH.value + 6)
  : 1
);

const colX   = computed(() => Math.round((w.value as number) * 0.55));
const rows   = computed(() => (d.value.rows as DataGridRow[]) ?? []);

const idealH = computed(() =>
  Math.max(20, titleH.value + rows.value.length * rowH.value + 4)
);

function rowY(i: number): number {
  return titleH.value + i * rowH.value;
}

// ── Auto-resize X6 node ───────────────────────────────────────────────────────
const getNode = inject<() => Node>("getNode");

onMounted(() => {
  watchEffect(() => {
    const node = getNode?.();
    if (!node) return;
    const newH = idealH.value;
    const { width, height } = node.getSize();
    if (Math.abs(height - newH) > 0.5) node.resize(width, newH);
  });
});

// ── Row render helpers ────────────────────────────────────────────────────────
function rawValue(row: DataGridRow): unknown {
  return d.value[`tg_v_${row.id}`];
}

function hasValue(row: DataGridRow): boolean {
  return rawValue(row) != null;
}

function displayLabel(row: DataGridRow): string {
  if (row.labelTopic) {
    const v = d.value[`tg_l_${row.id}`];
    if (v != null) return String(v);
  }
  return row.label || row.valueTopic || "";
}

function displayValue(row: DataGridRow): string {
  const v = rawValue(row);
  if (v == null) return "---";
  // Apply rounding if decimals is set and value is numeric
  if (row.decimals != null && row.decimals >= 0) {
    const n = Number(v);
    if (!isNaN(n)) return n.toFixed(row.decimals);
  }
  return String(v);
}

function getValueColor(row: DataGridRow): string {
  return hasValue(row) ? valueLiveClr.value : "#2a4a5a";
}

/** LED colour — evaluates custom conditions first, then falls back to built-in truthy/falsy logic */
function getLedColor(row: DataGridRow): string {
  const v = rawValue(row);
  if (v == null) return "#2a4a5a";
  try {
    if (row.ledOnCondition?.trim()) {
      const fn = new Function("v", "value", `"use strict"; return !!(${row.ledOnCondition});`);
      if (fn(v, v)) return "#00e060"; // green
    }
    if (row.ledOffCondition?.trim()) {
      const fn = new Function("v", "value", `"use strict"; return !!(${row.ledOffCondition});`);
      if (fn(v, v)) return "#dd2222"; // red
    }
  } catch { /* ignore expression errors — fall through to defaults */ }
  // Built-in fallback
  const s = String(v).trim().toUpperCase();
  const FALSY = ["0", "FALSE", "ABSENT", "OFF", "NO", "INACTIVE", "FAULT", "FAIL"];
  if (FALSY.includes(s)) return "#dd2222";
  const n = Number(v);
  if (!isNaN(n) && n === 0) return "#dd2222";
  return "#00e060";
}
</script>

<style scoped>
.node-wrap { width: 100%; height: 100%; overflow: visible; }
svg { overflow: visible; }
</style>
