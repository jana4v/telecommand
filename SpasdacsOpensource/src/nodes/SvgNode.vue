<template>
  <div class="svg-node-wrap" :style="{ opacity: Number(d.opacity ?? 1) }" @click.capture="onPartClick">
    <div ref="hostRef" class="svg-host" />
  </div>
</template>

<script setup lang="ts">
import { inject, ref, onMounted, onUnmounted, computed } from "vue";
import type { Node as X6Node } from "@antv/x6";
import { sanitizeSvgMarkup, ensureSvgElementIds } from "./svgGraphicUtils";

// ── SVG path flow animation ────────────────────────────────────────────────
// Reuses the same @keyframes already injected by X6NatsTelemetry (x6FlowFwd / x6FlowBwd).
// If telemetry hasn't connected yet we inject them ourselves so the SVG path
// animation works even in editor / offline mode.
function ensureSvgFlowKeyframes() {
  const ID = "x6-nats-flow-keyframes";
  if (document.getElementById(ID)) return;
  const s = document.createElement("style");
  s.id = ID;
  s.textContent = `
    @keyframes x6FlowFwd { from { stroke-dashoffset: 0; } to { stroke-dashoffset: -12; } }
    @keyframes x6FlowBwd { from { stroke-dashoffset: 0; } to { stroke-dashoffset:  12; } }
  `;
  document.head.appendChild(s);
}

const FLOW_DASH = "8 4"; // 8px dash + 4px gap → matches edge flow visual
const FLOW_DUR  = "0.4s linear infinite";

const getNode = inject<() => X6Node>("getNode");
const hostRef = ref<HTMLDivElement | null>(null);

const _d = ref<Record<string, unknown>>({});
const d = computed(() => _d.value);

let _node: X6Node | undefined;
let lastSvgMarkup = "";

function readData() {
  _d.value = (_node?.getData() as Record<string, unknown>) ?? {};
}

/** Inline `style="fill:…"` (Inkscape, etc.) beats presentation attributes — use !important. */
function setPaintImportant(el: SVGElement, cssName: string, val: string) {
  try {
    el.style.setProperty(cssName, val, "important");
  } catch {
    el.style.setProperty(cssName, val);
  }
}

function applyOneAttr(el: SVGElement, prop: string, val: unknown) {
  const tag = el.tagName.toLowerCase();
  const n = typeof val === "number" ? val : Number(val);
  const s = val === null || val === undefined ? "" : String(val);
  switch (prop) {
    case "fill":
      setPaintImportant(el, "fill", s);
      break;
    case "stroke":
      setPaintImportant(el, "stroke", s);
      break;
    case "strokeWidth":
      setPaintImportant(el, "stroke-width", s);
      break;
    case "opacity":
      setPaintImportant(el, "opacity", s || "1");
      break;
    case "visible":
      el.setAttribute("visibility", val === false || val === "false" || val === 0 ? "hidden" : "visible");
      break;
    case "x":
      if (tag === "rect" || tag === "image") el.setAttribute("x", String(val ?? ""));
      else if (tag === "circle" || tag === "ellipse") el.setAttribute("cx", String(val ?? ""));
      break;
    case "y":
      if (tag === "rect" || tag === "image") el.setAttribute("y", String(val ?? ""));
      else if (tag === "circle" || tag === "ellipse") el.setAttribute("cy", String(val ?? ""));
      break;
    case "width":
      if (tag === "rect" || tag === "image") el.setAttribute("width", String(val ?? ""));
      else if (tag === "circle" && Number.isFinite(n)) el.setAttribute("r", String(Math.max(0, n / 2)));
      break;
    case "height":
      if (tag === "rect" || tag === "image") el.setAttribute("height", String(val ?? ""));
      else if (tag === "ellipse" && Number.isFinite(n)) el.setAttribute("ry", String(Math.max(0, n / 2)));
      break;
    case "angle": {
      if (!Number.isFinite(n)) break;
      try {
        const g = el as SVGGraphicsElement;
        const bb = g.getBBox();
        const cx = bb.x + bb.width / 2;
        const cy = bb.y + bb.height / 2;
        el.setAttribute("transform", `rotate(${n} ${cx} ${cy})`);
      } catch {
        el.setAttribute("transform", `rotate(${n})`);
      }
      break;
    }
    case "flowActive": {
      const active = val === true || val === "true" || Number(val) === 1 || val === 1;
      if (active) {
        ensureSvgFlowKeyframes();
        // Read current direction from data attribute (set by flowDirection binding)
        const dir = el.dataset.flowDir === "-1" ? -1 : 1;
        const anim = dir >= 0 ? "x6FlowFwd" : "x6FlowBwd";
        el.style.setProperty("stroke-dasharray", FLOW_DASH, "important");
        el.style.setProperty("animation", `${anim} ${FLOW_DUR}`, "important");
      } else {
        el.style.removeProperty("stroke-dasharray");
        el.style.removeProperty("animation");
      }
      el.dataset.flowActive = active ? "1" : "0";
      break;
    }
    case "flowDirection": {
      const dir = Number(val) < 0 ? -1 : 1;
      el.dataset.flowDir = String(dir);
      // Update animation direction if flow is currently active
      if (el.dataset.flowActive === "1") {
        ensureSvgFlowKeyframes();
        const anim = dir >= 0 ? "x6FlowFwd" : "x6FlowBwd";
        el.style.setProperty("animation", `${anim} ${FLOW_DUR}`, "important");
      }
      break;
    }
    case "text":
      // Update text content of <text>, <tspan>, <title>, etc.
      el.textContent = s;
      break;
    default:
      break;
  }
}

function applySvgOverrides(svg: SVGSVGElement, overrides: Record<string, Record<string, unknown>> | undefined) {
  if (!overrides) return;
  for (const [elId, attrs] of Object.entries(overrides)) {
    let el: SVGElement | null = null;
    try {
      el = svg.querySelector(`#${CSS.escape(elId)}`) as SVGElement | null;
    } catch {
      el = svg.getElementById(elId) as SVGElement | null;
    }
    if (!el) continue;
    for (const [prop, val] of Object.entries(attrs)) {
      applyOneAttr(el, prop, val);
    }
  }
}

function applyOverridesOnly() {
  if (!_node || !hostRef.value) return;
  const data = _node.getData() as Record<string, unknown>;
  const svg = hostRef.value.querySelector("svg") as SVGSVGElement | null;
  if (!svg) return;
  applySvgOverrides(svg, data.svgOverrides as Record<string, Record<string, unknown>> | undefined);
  applySelectionHighlight(svg, String(data.svgSelectedElementId ?? ""));
}

function applySelectionHighlight(svg: SVGSVGElement, selectedId: string) {
  svg.querySelectorAll("[data-spasdacs-sel]").forEach(el => el.removeAttribute("data-spasdacs-sel"));
  if (!selectedId) return;
  let el: SVGElement | null = null;
  try { el = svg.querySelector(`#${CSS.escape(selectedId)}`) as SVGElement | null; } catch { el = svg.getElementById(selectedId) as SVGElement | null; }
  if (el) el.setAttribute("data-spasdacs-sel", "1");
}

function renderSvgFull() {
  if (!_node || !hostRef.value) return;
  const data = _node.getData() as Record<string, unknown>;
  let markup = String(data.svgMarkup ?? "");
  if (!markup.trim()) {
    hostRef.value.innerHTML = "<div class=\"svg-empty\">No SVG</div>";
    lastSvgMarkup = "";
    return;
  }
  const clean = sanitizeSvgMarkup(markup);
  if (!clean) {
    hostRef.value.innerHTML = "<div class=\"svg-empty\">Invalid SVG</div>";
    lastSvgMarkup = "";
    return;
  }
  const withIds = ensureSvgElementIds(clean);
  lastSvgMarkup = withIds;
  hostRef.value.innerHTML = withIds;
  const svg = hostRef.value.querySelector("svg") as SVGSVGElement | null;
  if (!svg) return;
  applySvgOverrides(svg, data.svgOverrides as Record<string, Record<string, unknown>> | undefined);
  applySelectionHighlight(svg, String(data.svgSelectedElementId ?? ""));
  if (withIds !== String((_node.getData() as Record<string, unknown>).svgMarkup ?? "")) {
    _node.setData({ svgMarkup: withIds }, { overwrite: false });
  }
}

function onDataChange() {
  if (!_node || !hostRef.value) return;
  readData();
  const data = _node.getData() as Record<string, unknown>;
  const m = String(data.svgMarkup ?? "");
  if (m !== lastSvgMarkup) {
    renderSvgFull();
  } else {
    applyOverridesOnly();
  }
}

function onPartClick(e: MouseEvent) {
  const node = getNode?.();
  if (!node || !hostRef.value) return;
  const t = e.target instanceof Element ? e.target : (e.target as globalThis.Node | null)?.parentElement ?? null;
  if (!t || !hostRef.value.contains(t)) return;
  const svg = hostRef.value.querySelector("svg");
  if (!svg) return;
  // Click on SVG background clears sub-element selection
  if ((t as Element) === svg || (t as Element) === hostRef.value) {
    const cur = String((node.getData() as Record<string, unknown>).svgSelectedElementId ?? "");
    if (cur) node.setData({ svgSelectedElementId: "" }, { overwrite: false });
    return;
  }
  const hit = (t as Element).closest?.("[id]");
  const id = (hit as Element | null)?.id;
  if (id) {
    node.setData({ svgSelectedElementId: id }, { overwrite: false });
  }
}

onMounted(() => {
  _node = getNode?.();
  if (!_node) return;
  readData();
  renderSvgFull();
  _node.on("change:data", onDataChange);
});

onUnmounted(() => {
  _node?.off("change:data");
});
</script>

<style scoped>
.svg-node-wrap {
  width: 100%;
  height: 100%;
  margin: 0;
  padding: 0;
  line-height: 0;
  overflow: hidden;
}
.svg-host {
  width: 100%;
  height: 100%;
  display: block;
}
.svg-host :deep(svg) {
  display: block;
  width: 100%;
  height: 100%;
}
/* Make every element with an id interactive so users can click to select for binding */
.svg-host :deep(svg *[id]) {
  cursor: pointer;
}
/* Flowing paths keep default cursor — they're data displays, not controls */
.svg-host :deep(svg *[data-flow-active="1"]) {
  cursor: default;
}
.svg-host :deep(svg *[id]:hover) {
  filter: drop-shadow(0 0 2px rgba(74, 158, 255, 0.65));
}
/* Blue glow ring on the currently selected element */
.svg-host :deep([data-spasdacs-sel="1"]) {
  filter: drop-shadow(0 0 4px #4a9eff) drop-shadow(0 0 1px #4a9eff) !important;
}
.svg-empty {
  padding: 8px;
  font-size: 11px;
  color: #8b949e;
}
</style>
