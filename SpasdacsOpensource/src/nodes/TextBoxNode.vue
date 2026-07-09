<template>
  <div class="node-wrap" :style="{ opacity: d.opacity ?? 1 }">
    <svg :width="w" :height="h" :viewBox="`0 0 ${w} ${h}`"
         xmlns="http://www.w3.org/2000/svg" overflow="hidden">

      <!-- ── Background ────────────────────────────────────────────────── -->
      <rect x="0" y="0" :width="w" :height="h" rx="4"
        :fill="bgColor" :stroke="borderCol" stroke-width="1.5"/>

      <!-- ── Title bar ─────────────────────────────────────────────────── -->
      <template v-if="titleText">
        <rect x="1" y="1" :width="w - 2" :height="titleBarH - 1" rx="3"
          :fill="titleBarBg"/>
        <!-- Square bottom half so title blends into content area -->
        <rect x="1" :y="Math.ceil(titleBarH * 0.55)" :width="w - 2"
          :height="titleBarH - Math.ceil(titleBarH * 0.55)"
          :fill="titleBarBg"/>
        <SvgMultilineText
          :text="titleText" :x="titleX" :y="titleY"
          :font-size="titleFontSz" font-weight="700"
          font-family="'Courier New', monospace"
          :fill="titleFontColor" :text-anchor="titleAnchor"
        />
        <line x1="0" :y1="titleBarH" :x2="w" :y2="titleBarH"
          :stroke="borderCol" stroke-width="0.8" opacity="0.6"/>
      </template>

      <!-- ── Scrollable text content via foreignObject ─────────────────── -->
      <foreignObject
        :x="PAD" :y="contentY"
        :width="Math.max(1, w - PAD * 2)"
        :height="Math.max(1, contentH)">
        <div xmlns="http://www.w3.org/1999/xhtml"
             class="tb-scroll"
             :style="scrollStyle">
          <div class="tb-text" :style="textStyle">{{ displayText }}</div>
        </div>
      </foreignObject>

      <!-- ── Invalid overlay ───────────────────────────────────────────── -->
      <rect v-if="d.isInvalid" x="0" y="0" :width="w" :height="h"
        fill="rgba(231,76,60,0.15)" rx="4"
        stroke="#e74c3c" stroke-width="1.5" stroke-dasharray="6,4"/>
    </svg>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import SvgMultilineText from "./SvgMultilineText.vue";
import { useNodeData } from "./useNodeData";
import { useTitlePosition } from "./useTitlePosition";

interface ColorCondition { condition: string; color: string; }

const { d, w, h } = useNodeData(280, 180);

const PAD = 5;

// ── Title ──────────────────────────────────────────────────────────────────
const titleText   = computed(() => (d.value.name as string) ?? "");
const titleFontSz = computed(() => (d.value.titleFontSize as number) ?? 12);
const titleFontColor = computed(() => (d.value.titleFontColor as string) || "#e8eaf0");
const { titleX, titleY, titleAnchor } = useTitlePosition(
  () => d.value.titlePosition as string | undefined,
  () => 0,
  () => w.value,
  () => 0,
  () => h.value,
  "top-center",
);
const titleBarH   = computed(() =>
  titleText.value ? Math.max(22, Math.ceil(titleFontSz.value * 1.6) + 6) : 0
);

// ── Content area geometry ─────────────────────────────────────────────────
const contentY = computed(() => titleBarH.value + PAD);
const contentH = computed(() => Math.max(1, h.value - contentY.value - PAD));

// ── Colours ───────────────────────────────────────────────────────────────
const bgColor    = computed(() => (d.value.bgColor    as string) || "#0d1117");
const borderCol  = computed(() => (d.value.borderColor as string) || "#2a3a4a");
const titleBarBg = computed(() => (d.value.titleBarBg as string) || "#0e1f30");

// ── Text content: live TM value > static fallback ─────────────────────────
const displayText = computed(() => {
  const live = d.value.tg_text;
  if (live != null && live !== "") return String(live);
  return (d.value.staticText as string) || "";
});

// ── Text colour: evaluate colorConditions against tg_color ────────────────
const resolvedTextColor = computed(() => {
  const defaultColor = (d.value.textColor as string) || "#c9d1d9";
  const colorVal = d.value.tg_color;
  const conditions = (d.value.colorConditions as ColorCondition[]) ?? [];
  if (colorVal != null && conditions.length > 0) {
    for (const cond of conditions) {
      if (!cond.condition?.trim()) continue;
      try {
        const fn = new Function("v", "value", `"use strict"; return !!(${cond.condition});`);
        if (fn(colorVal, colorVal)) return cond.color;
      } catch { /* skip bad expression */ }
    }
  }
  return defaultColor;
});

const fontSize   = computed(() => (d.value.fontSize   as number) ?? 13);
const fontFamily = computed(() => (d.value.fontFamily as string) || "'Segoe UI', system-ui, sans-serif");

// ── Styles ────────────────────────────────────────────────────────────────
const scrollStyle = computed(() => ({
  width:  "100%",
  height: "100%",
  overflowY: "auto"  as const,
  overflowX: "hidden" as const,
  boxSizing: "border-box" as const,
  // thin scrollbar track colours (Firefox)
  scrollbarWidth: "thin"                 as const,
  scrollbarColor: "#2a4a6a transparent"  as const,
}));

const textStyle = computed(() => ({
  color:      resolvedTextColor.value,
  fontSize:   `${fontSize.value}px`,
  fontFamily: fontFamily.value,
  lineHeight: "1.55",
  whiteSpace:  "pre-wrap" as const,
  wordBreak:   "break-word" as const,
  padding:     "2px 4px",
  margin:      0,
  userSelect:  "none" as const,
}));
</script>

<style scoped>
.node-wrap { width: 100%; height: 100%; overflow: visible; }
svg { overflow: hidden; }
svg * { transition: none !important; animation: none !important; }

/* Webkit scrollbar theming — scoped to this component's foreignObject content */
.tb-scroll::-webkit-scrollbar        { width: 6px; }
.tb-scroll::-webkit-scrollbar-track  { background: transparent; }
.tb-scroll::-webkit-scrollbar-thumb  { background: #2a4a6a; border-radius: 3px; }
.tb-scroll::-webkit-scrollbar-thumb:hover { background: #3a6a9a; }
</style>
