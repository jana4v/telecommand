<template>
  <div class="plot-wrap" :style="{ opacity: d.opacity ?? 1 }" @pointerdown.capture="ensureNodeSelected" @contextmenu.capture="forwardContextMenu">
    <div class="plot-header">
      <div class="plot-header-left">
        <span class="plot-title">{{ title }}</span>
      </div>
      <span class="plot-meta">{{ plotTypeLabel }} · {{ xModeLabel }}</span>
    </div>
    <div ref="plotEl" class="plot-body" :class="{ 'plot-body-editor': isEditorMode }"></div>
  </div>
</template>

<script setup lang="ts">
import { computed, inject, nextTick, onMounted, onUnmounted, ref, watch } from "vue";
import type { Node } from "@antv/x6";
import Plotly from "plotly.js-dist-min";
import type { TelemetryBinding } from "../types";
import { telemetryKeyAliases } from "../services/mnemonicStore";
import { getAllValues, getTelemetryValue } from "../telemetry/telemetryStore";
import { useNodeData } from "./useNodeData";

const { d, w, h } = useNodeData(360, 220);
const getNode = inject<() => Node>("getNode");

const plotEl = ref<HTMLElement | null>(null);
const traces = ref<Array<{ x: any[]; y: Array<number | null>; name: string }>>([]);

let lastSignature = "";
let localTimeTimer: ReturnType<typeof setInterval> | null = null;

const title = computed(() => String(d.value.plotTitle || d.value.name || "Telemetry Plot"));
const plotType = computed<"line" | "scatter" | "bar">(() => {
  const t = String(d.value.plotType || "line").toLowerCase();
  return t === "bar" || t === "scatter" ? (t as "bar" | "scatter") : "line";
});
const plotTypeLabel = computed(() => plotType.value.toUpperCase());
const xMode = computed<"time" | "telemetry">(() => {
  const m = String(d.value.plotXMode || "time").toLowerCase();
  return m === "telemetry" ? "telemetry" : "time";
});
const isEditorMode = computed(() => {
  if (typeof window === "undefined") return false;
  const where = `${window.location.pathname}${window.location.hash}`.toLowerCase();
  return where.includes("/editor/");
});
const xModeLabel = computed(() => (xMode.value === "time" ? "Local Time" : "TM X-Axis"));
const bufferSeconds = computed(() => {
  const n = Number(d.value.plotBufferSeconds ?? 120);
  return Number.isFinite(n) ? Math.max(5, n) : 120;
});
const yTopics = computed<string[]>(() => {
  const arr = Array.isArray(d.value.plotYTopics) ? d.value.plotYTopics : [];
  return arr.map((s) => String(s ?? "").trim()).filter(Boolean);
});

type SeriesDef = { idx: number; name: string };
const ySeries = computed<SeriesDef[]>(() => {
  if (yTopics.value.length) {
    return yTopics.value.map((name, idx) => ({ idx, name }));
  }
  const bindings = Array.isArray(d.value.telemetryBindings)
    ? (d.value.telemetryBindings as TelemetryBinding[])
    : [];
  const byIdx = new Map<number, string>();
  for (const b of bindings) {
    const tp = String(b?.targetProp ?? "");
    const m = tp.match(/^plot_y_(\d+)$/);
    if (m) {
      const idx = Number(m[1]);
      byIdx.set(idx, String(b.topic ?? `Y${idx + 1}`));
      continue;
    }
    if (tp === "__multi__" && typeof b.script === "string") {
      const re = /plot_y_(\d+)/g;
      let mm: RegExpExecArray | null;
      while ((mm = re.exec(b.script)) !== null) {
        const idx = Number(mm[1]);
        if (!byIdx.has(idx)) byIdx.set(idx, `Y${idx + 1}`);
      }
    }
  }

  // Fallback for legacy/script-only nodes that already have runtime plot_y_* keys on data.
  for (let idx = 0; idx <= 7; idx++) {
    const key = `plot_y_${idx}`;
    if (d.value[key] !== undefined && !byIdx.has(idx)) {
      byIdx.set(idx, `Y${idx + 1}`);
    }
  }

  const out = Array.from(byIdx.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([idx, name]) => ({ idx, name }));
  return out;
});

const scriptYTopics = computed<Record<number, string>>(() => {
  const out: Record<number, string> = {};
  const bindings = Array.isArray(d.value.telemetryBindings)
    ? (d.value.telemetryBindings as TelemetryBinding[])
    : [];
  for (const b of bindings) {
    if (String(b.targetProp ?? "") !== "__multi__" || typeof b.script !== "string") continue;
    const script = b.script;
    const varToTopic: Record<string, string> = {};
    const assignRe = /(?:\b(?:let|const|var)\s+)?([A-Za-z_$][\w$]*)\s*=\s*TM\[\s*["']([^"']+)["']\s*\]/g;
    let m: RegExpExecArray | null;
    while ((m = assignRe.exec(script)) !== null) {
      varToTopic[m[1]] = m[2].trim();
    }
    const returnRe = /["']?plot_y_(\d+)["']?\s*:\s*([A-Za-z_$][\w$]*)/g;
    while ((m = returnRe.exec(script)) !== null) {
      const idx = Number(m[1]);
      const varName = m[2];
      const topic = varToTopic[varName];
      if (topic) out[idx] = topic;
    }

    // Also support direct return expressions like: plot_y_0: TM["TOPIC"]
    const returnDirectRe = /["']?plot_y_(\d+)["']?\s*:\s*TM\[\s*["']([^"']+)["']\s*\]/g;
    while ((m = returnDirectRe.exec(script)) !== null) {
      const idx = Number(m[1]);
      const topic = m[2].trim();
      if (topic) out[idx] = topic;
    }
  }
  return out;
});

function resolveTelemetryRawByTopic(topic: string): { value: unknown; matchedKey: string | null } {
  const needle = topic.trim();
  if (!needle) return { value: undefined, matchedKey: null };

  const aliases = telemetryKeyAliases(needle)
    .map((k) => String(k ?? "").trim())
    .filter(Boolean);
  const aliasSet = new Set<string>(aliases);
  aliasSet.add(needle);

  for (const key of aliasSet) {
    const vFlat = getTelemetryValue(key);
    if (vFlat !== undefined) return { value: vFlat, matchedKey: key };
    const vScoped = getTelemetryValue(`default::${key}`);
    if (vScoped !== undefined) return { value: vScoped, matchedKey: `default::${key}` };
  }

  // Case-insensitive + scoped fallback for keys that differ in namespace/case.
  const lowerAliases = new Set(Array.from(aliasSet).map((k) => k.toLowerCase()));
  const all = getAllValues();
  for (const [k, v] of Object.entries(all)) {
    const kl = k.toLowerCase();
    if (lowerAliases.has(kl)) return { value: v, matchedKey: k };
    const bare = kl.includes("::") ? (kl.split("::").pop() || "") : "";
    if (bare && lowerAliases.has(bare)) return { value: v, matchedKey: k };
  }

  return { value: undefined, matchedKey: null };
}

function resolveYSeriesTelemetryHit(idx: number): { topic: string; matchedKey: string | null; value: unknown } {
  const topic = scriptYTopics.value[idx] ?? "";
  if (!topic) return { topic: "", matchedKey: null, value: undefined };
  const hit = resolveTelemetryRawByTopic(topic);
  return { topic, matchedKey: hit.matchedKey, value: hit.value };
}

function resolveRawYBySeries(idx: number): unknown {
  const fromData = d.value[`plot_y_${idx}`];
  if (fromData !== undefined) return fromData;
  const hit = resolveYSeriesTelemetryHit(idx);
  return hit.value;
}

function getYValueBySeries(idx: number): number | null {
  return parseNumeric(resolveRawYBySeries(idx));
}

function ensureNodeSelected() {
  const node = getNode?.();
  const graph = (node as any)?.model?.graph as { resetSelection?: (n: Node) => void } | undefined;
  graph?.resetSelection?.(node as Node);
}

function forwardContextMenu(e: MouseEvent) {
  e.preventDefault();
  ensureNodeSelected();
  const node = getNode?.();
  if (!node || typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("scada-node-contextmenu", {
    detail: { nodeId: node.id, x: e.clientX, y: e.clientY },
  }));
}

function parseNumeric(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  if (typeof v === "boolean") return null;
  if (typeof v === "object") {
    const obj = v as Record<string, unknown>;
    for (const k of ["value", "raw", "v", "num", "eng", "val", "current", "y"]) {
      if (obj[k] !== undefined) return parseNumeric(obj[k]);
    }
  }
  if (typeof v === "string") {
    const cleaned = v.replace(/,/g, "").trim();
    if (!cleaned) return null;
    const n = Number(cleaned);
    if (Number.isFinite(n)) return n;
    const match = cleaned.match(/[-+]?\d*\.?\d+(?:[eE][-+]?\d+)?/);
    if (match) {
      const extracted = Number(match[0]);
      if (Number.isFinite(extracted)) return extracted;
    }
    return null;
  }
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function telemetryXValue(): any {
  if (xMode.value === "time") return new Date();
  const raw = d.value.plot_x;
  if (raw === null || raw === undefined || raw === "") return null;
  const asNum = Number(raw);
  if (Number.isFinite(asNum)) return asNum;
  return String(raw);
}

function appendSample() {
  const xVal = telemetryXValue();
  if (xMode.value === "telemetry" && xVal === null) return;

  const series = ySeries.value;
  if (!series.length) return;

  const yVals = series.map((s) => getYValueBySeries(s.idx));
  const anyY = yVals.some((y) => y !== null);
  if (!anyY) return;

  if (traces.value.length !== series.length) {
    const prevByName = new Map(traces.value.map((t) => [t.name, t]));
    traces.value = series.map((s) => {
      const prev = prevByName.get(s.name);
      return prev ? { x: [...prev.x], y: [...prev.y], name: s.name } : { x: [], y: [], name: s.name };
    });
  }

  for (let i = 0; i < series.length; i++) {
    traces.value[i].x.push(xVal);
    traces.value[i].y.push(yVals[i]);
    traces.value[i].name = series[i].name;
  }

  if (xMode.value === "time") {
    const cutoff = Date.now() - bufferSeconds.value * 1000;
    for (const t of traces.value) {
      while (t.x.length && t.x[0] instanceof Date && (t.x[0] as Date).getTime() < cutoff) {
        t.x.shift();
        t.y.shift();
      }
    }
  } else {
    const maxPoints = Math.max(20, Math.round(bufferSeconds.value));
    for (const t of traces.value) {
      if (t.x.length > maxPoints) {
        const remove = t.x.length - maxPoints;
        t.x.splice(0, remove);
        t.y.splice(0, remove);
      }
    }
  }

  void renderPlot();
}

async function renderPlot() {
  const el = plotEl.value;
  if (!el) return;

  const type = plotType.value;
  const datasets = traces.value.map((t) => ({
    type: type === "bar" ? "bar" : "scatter",
    mode: type === "line" ? "lines+markers" : "markers",
    x: t.x,
    y: t.y,
    name: t.name,
    connectgaps: false,
  }));

  const layout = {
    paper_bgcolor: "#0d1117",
    plot_bgcolor: "#0d1117",
    font: { color: "#c9d1d9", size: 11 },
    margin: { l: 40, r: 12, t: 10, b: 30 },
    xaxis: {
      gridcolor: "#1f2d3d",
      type: xMode.value === "time" ? "date" : undefined,
      range: xMode.value === "time"
        ? [new Date(Date.now() - bufferSeconds.value * 1000), new Date()]
        : undefined,
      title: xMode.value === "time" ? "Local Time" : (d.value.plotXTopic || "X"),
    },
    yaxis: {
      gridcolor: "#1f2d3d",
      title: "Y",
    },
    showlegend: true,
    legend: {
      orientation: "h",
      yanchor: "bottom",
      y: 1.01,
      x: 0,
      font: { size: 10 },
    },
  } as any;

  const config = {
    responsive: true,
    displayModeBar: !isEditorMode.value,
    displaylogo: false,
    scrollZoom: !isEditorMode.value,
    staticPlot: isEditorMode.value,
    doubleClick: "autosize",
    toImageButtonOptions: {
      format: "png",
      filename: String(d.value.plotTitle || d.value.name || "telemetry-plot"),
      scale: 2,
    },
  };

  await Plotly.react(el, datasets as any, layout, config as any);
}

function stopLocalTimeTimer() {
  if (localTimeTimer !== null) {
    clearInterval(localTimeTimer);
    localTimeTimer = null;
  }
}

function restartLocalTimeTimer() {
  stopLocalTimeTimer();
  if (xMode.value !== "time") return;
  localTimeTimer = setInterval(() => {
    appendSample();
  }, 1000);
}

watch(
  () => [
    plotType.value,
    xMode.value,
    bufferSeconds.value,
    ySeries.value.map((s) => `${s.idx}:${s.name}`).join("|"),
    d.value.plotXTopic || "",
  ],
  async () => {
    const prevByName = new Map(traces.value.map((t) => [t.name, t]));
    traces.value = ySeries.value.map((s) => {
      const prev = prevByName.get(s.name);
      return prev ? { x: [...prev.x], y: [...prev.y], name: s.name } : { x: [], y: [], name: s.name };
    });
    lastSignature = "";
    restartLocalTimeTimer();
    await nextTick();
    await renderPlot();
  },
  { immediate: true },
);

watch(
  () => {
    const ys = ySeries.value.map((s) => d.value[`plot_y_${s.idx}`]);
    return JSON.stringify({ x: d.value.plot_x ?? null, ys });
  },
  (sig) => {
    if (sig === lastSignature) return;
    lastSignature = sig;
    appendSample();
  },
);

watch(
  () => [w.value, h.value],
  async () => {
    await nextTick();
    if (plotEl.value) Plotly.Plots.resize(plotEl.value);
  },
);

onMounted(async () => {
  restartLocalTimeTimer();
  await nextTick();
  await renderPlot();
});

onUnmounted(() => {
  stopLocalTimeTimer();
  if (plotEl.value) Plotly.purge(plotEl.value);
});
</script>

<style scoped>
.plot-wrap {
  width: 100%;
  height: 100%;
  background: #0d1117;
  border: 1px solid #2a3a4a;
  border-radius: 6px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.plot-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 26px;
  padding: 4px 8px;
  border-bottom: 1px solid #1f2d3d;
  background: #0b1624;
}

.plot-header-left {
  display: flex;
  flex-direction: column;
  min-width: 0;
  max-width: 78%;
}

.plot-title {
  font-size: 11px;
  font-weight: 700;
  color: #e6edf3;
  max-width: 100%;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.plot-debug {
  margin-top: 2px;
  font-size: 9px;
  color: #7f92a8;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.plot-meta {
  font-size: 9px;
  color: #8aa0b8;
  white-space: nowrap;
}

.plot-body {
  flex: 1;
  min-height: 0;
}

.plot-body-editor :deep(.js-plotly-plot),
.plot-body-editor :deep(.plotly),
.plot-body-editor :deep(.main-svg) {
  pointer-events: none !important;
}

.plot-body-editor :deep(.modebar) {
  display: none !important;
}
</style>
