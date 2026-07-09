<template>
  <div class="editor-page">
    <!-- Top bar -->
    <header class="topbar">
      <div class="topbar-left">
        <button class="btn-back" @click="router.push('/')">← Back</button>
        <input
          class="diagram-name-input"
          :value="diagramName"
          placeholder="Untitled"
          spellcheck="false"
          @change="diagramName = ($event.target as HTMLInputElement).value.trim() || 'Untitled'"
          @keydown.enter.prevent="($event.target as HTMLInputElement).blur()"
          @keydown.escape.prevent="($event.target as HTMLInputElement).blur()"
          @click.stop
          @dblclick.stop
        />
        <label class="canvas-size-wrap" title="Editor canvas size">
          <span>Canvas</span>
          <select
            class="canvas-size-select"
            :value="canvasSize"
            @change="onCanvasSizeSelect(($event.target as HTMLSelectElement).value)">
            <option v-for="opt in canvasSizeOptions" :key="opt.value" :value="opt.value">
              {{ opt.label }}
            </option>
          </select>
        </label>
      </div>
      <div class="topbar-center">
        
        <span class="spasdacs-title">🛰️ SPASDACS <span class="nova">Nova</span></span>
        
      </div>
      <div class="topbar-right">
        <!-- Toolbar -->
        <button class="btn-tool" @click="undo" title="Undo (Ctrl+Z)">↩</button>
        <button class="btn-tool" @click="redo" title="Redo (Ctrl+Y)">↪</button>
        <button class="btn-tool" @click="fitView" title="Fit to view">⊞</button>
        <button class="btn-tool" :class="{ active: gridVisible }" @click="toggleGrid" title="Toggle grid">⊡</button>
        <div class="toolbar-sep"></div>
        <button class="btn-tool btn-group" @click="groupSelected"   title="Group selected (2+ nodes)" :disabled="!canGroup()">⊕ Group</button>
        <button class="btn-tool btn-group" @click="ungroupSelected" title="Ungroup selected" :disabled="!canUngroup()">⊖ Ungroup</button>
        <button v-if="isGroupSelected" class="btn-tool btn-group" @click="toggleGroupCollapse" title="Minimize / Expand group">
          {{ groupCollapsed ? '+ Expand' : '− Minimize' }}
        </button>
        <div class="toolbar-sep"></div>
        <button class="btn-tool" @click="bringToFront" title="Bring to front" :disabled="!selectedCell">⬆</button>
        <button class="btn-tool" @click="bringForward" title="Bring forward" :disabled="!selectedCell">↑</button>
        <button class="btn-tool" @click="sendBackward" title="Send backward" :disabled="!selectedCell">↓</button>
        <button class="btn-tool" @click="sendToBack" title="Send to back" :disabled="!selectedCell">⬇</button>
        <div class="toolbar-sep"></div>
        <!-- Lock / Unlock controls -->
        <button
          class="btn-tool btn-lock"
          :disabled="!selectedCells.length"
          :title="selectedCells.length > 1 ? `Lock ${selectedCells.length} selected items` : 'Lock selected'"
          @click="lockSelected"
        >
          <svg viewBox="0 0 16 16" width="13" height="13" fill="none" style="vertical-align:middle;margin-right:3px">
            <rect x="3" y="7.5" width="10" height="7.5" rx="1.5" fill="currentColor" opacity="0.9"/>
            <path d="M5.5 7.5V5.5a2.5 2.5 0 0 1 5 0v2" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
            <circle cx="8" cy="11.5" r="1.3" fill="#1a2535"/>
          </svg>Lock
        </button>
        <button
          class="btn-tool btn-unlock-all"
          :disabled="!hasAnyLocked"
          title="Unlock all locked elements"
          @click="unlockAll"
        >
          <svg viewBox="0 0 16 16" width="13" height="13" fill="none" style="vertical-align:middle;margin-right:3px">
            <rect x="3" y="7.5" width="10" height="7.5" rx="1.5" stroke="currentColor" stroke-width="1.4" opacity="0.7"/>
            <path d="M5.5 7.5V5.5a2.5 2.5 0 0 1 5 0V4" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" opacity="0.7"/>
          </svg>Unlock All
        </button>
        <div class="toolbar-sep"></div>
        <button class="btn-tool" @click="zoomIn" title="Zoom in">+</button>
        <button class="btn-tool" @click="zoomOut" title="Zoom out">−</button>
        <div class="toolbar-sep"></div>
        <!-- Draw tool: line / curve -->
        <button class="btn-tool" :class="{ active: penMode }" @click="togglePenMode" title="Draw lines and curves">&#9998;</button>
        <template v-if="penMode">
          <button class="btn-tool btn-draw-sub" :class="{ active: drawSubMode === 'line' }"   @click="drawSubMode = 'line'"   title="Polyline: click anchors, double-click to end (Shift = 45° snap)">&#9135; Line</button>
          <button class="btn-tool btn-draw-sub" :class="{ active: drawSubMode === 'ortho' }"  @click="drawSubMode = 'ortho'"  title="Orthogonal: click anchors, double-click to end (H/V only)">&#9140; Ortho</button>
          <button class="btn-tool btn-draw-sub" :class="{ active: drawSubMode === 'curve' }"  @click="drawSubMode = 'curve'"  title="Curve: drag from start to end">&#8978; Curve</button>
          <input type="color" class="pen-color-input" :value="penStrokeColor" @input="penStrokeColor = ($event.target as HTMLInputElement).value" title="Stroke color" />
          <input class="pen-width-input" type="number" min="1" max="20" step="0.5" :value="penStrokeWidth" @change="penStrokeWidth = Number(($event.target as HTMLInputElement).value)" title="Stroke width" />
        </template>
        <div class="toolbar-sep"></div>
        <button class="btn-view" @click="viewDiagram" title="Open in Viewer">👁 View</button>
        <button class="btn-save" @click="save" :disabled="saving">
          {{ saving ? 'Saving…' : '💾 Save' }}
        </button>
        <span v-if="saveMsg" class="save-msg" role="alert">
          {{ saveMsg }}
          <button class="save-msg-dismiss" @click="saveMsg = ''" title="Dismiss">✕</button>
        </span>
        <!-- Revert button: always visible when a snapshot exists and diagram has unsaved changes -->
        <button
          v-if="lastGoodSnapshot && isDirty"
          class="btn-revert"
          :class="{ 'btn-revert-warn': !!revertWarning }"
          @click="revertToSnapshot"
          :title="revertWarning || 'Revert to last saved state'"
        >↩ Revert</button>
        <!-- Validation warning banner — shown below toolbar when an issue is detected -->
        <div v-if="revertWarning" class="revert-warning-bar">
          {{ revertWarning }}
          <button class="revert-warning-dismiss" @click="revertWarning = ''" title="Dismiss">✕</button>
        </div>
      </div>
    </header>

    <!-- Editor body -->
    <div class="editor-body">
      <ElementPalette @drag-start="onPaletteDragStart" />

      <!-- Drop target canvas area -->
      <div class="canvas-area"
        @dragover.prevent
        @drop="onDrop"
      >
        <div v-if="graphLoading" class="graph-loading-overlay">
          <span v-if="loadingPctEditor > 0">Rendering… {{ loadingPctEditor }}%</span>
          <span v-else>Loading…</span>
        </div>
        <X6Canvas ref="canvasRef"
          :port-size-factor="portSizeFactor"
          @ready="onGraphReady"
          @cell-selected="onCellSelected"
        />
        <!-- Draw overlay: covers canvas when draw tool is active -->
        <div
          v-if="penMode"
          ref="penOverlayRef"
          class="pen-overlay"
          @click.stop="onOverlayClick"
          @dblclick.stop.prevent="onOverlayDblClick"
          @mousemove="onOverlayMouseMove"
          @mouseleave="penMousePos = null"
          @pointerdown="onPenDown"
          @pointermove="onPenMove"
          @pointerup="onPenUp"
          @pointercancel="onPenCancel"
          @contextmenu.prevent
        >
          <svg class="pen-preview-svg"
               :width="penOverlayRef?.clientWidth ?? 0"
               :height="penOverlayRef?.clientHeight ?? 0"
               overflow="visible">
            <!-- Committed polyline segments (solid) -->
            <path
              v-if="committedPreviewD"
              :d="committedPreviewD"
              :stroke="penStrokeColor"
              :stroke-width="penStrokeWidth"
              fill="none"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
            <!-- Rubber-band: dashed line from last anchor to cursor -->
            <path
              v-if="rubberBandD"
              :d="rubberBandD"
              stroke="rgba(255,255,255,0.65)"
              stroke-width="1"
              fill="none"
              stroke-dasharray="5,5"
              stroke-linecap="round"
            />
            <!-- Anchor point dots -->
            <circle
              v-for="(pt, i) in penAnchors"
              :key="i"
              :cx="pt.x" :cy="pt.y" r="4"
              fill="#fff"
              :stroke="penStrokeColor"
              stroke-width="1.5"
            />
            <!-- Curve drag preview -->
            <path
              v-if="curvePreviewD"
              :d="curvePreviewD"
              :stroke="penStrokeColor"
              :stroke-width="penStrokeWidth"
              fill="none"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
        </div>
      </div>

      <Inspector ref="inspectorRef" :cell="selectedCell" :cells="selectedCells"
        :all-cells="allCells"
        :canvas-bg="canvasBg" :edge-color="edgeColor" :edge-width="edgeWidth"
        :port-size-factor="portSizeFactor"
        @update="onCellUpdate"
        @canvas-bg-change="onCanvasBgChange"
        @edge-color-change="onEdgeColorChange"
        @edge-width-change="onEdgeWidthChange"
        @port-size-factor-change="onPortSizeFactorChange"
        @lock-change="onLockChange"
        @focus-cell="onFocusCell"
      />
    </div>
  </div>

  <PortContextMenu
    :visible="portMenu.visible"
    :x="portMenu.x"
    :y="portMenu.y"
    :node="portMenu.node"
    @close="closePortMenu"
  />
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick } from "vue";
import gsap from "gsap";
import { useRoute, useRouter } from "vue-router";
import type { Graph, Cell, Node, Edge } from "@antv/x6";
import X6Canvas       from "../components/X6Canvas.vue";
import ElementPalette from "../components/ElementPalette.vue";
import Inspector        from "../components/Inspector.vue";
import PortContextMenu  from "../components/PortContextMenu.vue";
import { DiagramStorage } from "../services/diagramStorage";
import { CATEGORY_TO_SHAPE, syncAllCellLockPointerEvents, applyCellLockPointerEvents } from "../graph/setupGraph";
import { applyEdgeVisualsFromData } from "../graph/edgeVisuals";
import { PALETTE_ITEMS } from "../types";
import { loadMnemonics } from "../services/mnemonicStore";
import { loadTelemetryStreamsFromStorage } from "../stores/telemetryStreamsConfig";
import {
  extractSvgFromClipboard,
  cropSvgToContent,
  sanitizeSvgMarkup,
  ensureSvgElementIds,
} from "../nodes/svgGraphicUtils";

const route  = useRoute();
const router = useRouter();

const diagramId    = route.params.id as string;
const diagramName  = ref("Untitled");
const saving       = ref(false);
const graphLoading      = ref(false); // true while progressive cell loading runs
const loadingPctEditor  = ref(0);     // 0–100 shown in the overlay
// Transient save feedback shown in the toolbar (errors/warnings).
const saveMsg     = ref("");
let   saveMsgTimer: ReturnType<typeof setTimeout> | null = null;
/** duration=0 means the message stays until the user clicks ✕ */
function flashSaveMsg(msg: string, duration = 6000) {
  saveMsg.value = msg;
  if (saveMsgTimer) clearTimeout(saveMsgTimer);
  if (duration > 0) {
    saveMsgTimer = setTimeout(() => { saveMsg.value = ""; }, duration);
  }
}

// ── Snapshot / revert ──────────────────────────────────────────────────────
// After every successful load or save we capture the graph JSON as a "known-
// good" checkpoint. A debounced validator runs on every structural change
// (add/remove cell, binding edits). If it detects a problem it shows a
// persistent warning and offers a one-click revert — so one bad telemetry
// binding never silently breaks the diagram.
const lastGoodSnapshot  = ref<string | null>(null);   // JSON.stringify of last verified state
const isDirty           = ref(false);                  // true once graph differs from snapshot
const revertWarning     = ref("");                     // non-empty = validation detected an issue
let   validateTimer: ReturnType<typeof setTimeout> | null = null;

/** Serialise + structurally validate the current graph state.
 *  Returns { ok, issue } — does NOT mutate any refs. */
function validateSnapshot(json: ReturnType<NonNullable<typeof graph>["toJSON"]>): { ok: boolean; issue: string } {
  try {
    JSON.stringify(json);  // catch circular refs / non-serialisable values
  } catch (e) {
    return { ok: false, issue: `Graph cannot be serialised: ${e instanceof Error ? e.message : String(e)}` };
  }
  for (const cell of (json.cells ?? []) as Record<string, any>[]) {
    const data = cell.data as Record<string, any> | undefined;
    if (!data) continue;
    const bindings = data.telemetryBindings;
    if (bindings === undefined || bindings === null) continue;
    const label = String(data.name || data.label || cell.id || "?");
    if (!Array.isArray(bindings)) {
      return { ok: false, issue: `"${label}": telemetryBindings is not an array` };
    }
    for (let i = 0; i < bindings.length; i++) {
      const b = bindings[i];
      if (typeof b !== "object" || b === null)
        return { ok: false, issue: `"${label}" binding [${i}]: not an object` };
      if (b.targetProp !== undefined && typeof b.targetProp !== "string")
        return { ok: false, issue: `"${label}" binding [${i}]: targetProp is not a string` };
      if (b.topic !== undefined && typeof b.topic !== "string")
        return { ok: false, issue: `"${label}" binding [${i}]: topic is not a string` };
      if (b.script !== undefined && typeof b.script !== "string")
        return { ok: false, issue: `"${label}" binding [${i}]: script is not a string` };
      if (b.transformScript !== undefined && typeof b.transformScript !== "string")
        return { ok: false, issue: `"${label}" binding [${i}]: transformScript is not a string` };
    }
  }
  return { ok: true, issue: "" };
}

/** Capture the current graph state as the new "known-good" checkpoint. */
function takeSnapshot() {
  if (!graph) return;
  try {
    lastGoodSnapshot.value = JSON.stringify(graph.toJSON());
    isDirty.value   = false;
    revertWarning.value = "";
  } catch { /* if serialisation fails we just skip the snapshot */ }
}

/** Debounced validation — called on every graph change event. */
function scheduleValidation() {
  isDirty.value = true;
  if (validateTimer) clearTimeout(validateTimer);
  validateTimer = setTimeout(() => {
    if (!graph) return;
    const json = graph.toJSON();
    const { ok, issue } = validateSnapshot(json);
    if (!ok) {
      revertWarning.value = `⚠ Diagram has an issue: ${issue}`;
    } else {
      revertWarning.value = "";
    }
  }, 600);
}

/** Restore the graph to the last known-good checkpoint. */
function revertToSnapshot() {
  if (!graph || !lastGoodSnapshot.value) return;
  try {
    graph.fromJSON(JSON.parse(lastGoodSnapshot.value));
    revertWarning.value = "";
    isDirty.value = false;
    flashSaveMsg("✓ Reverted to last saved state.", 4000);
  } catch (e) {
    flashSaveMsg(`⚠ Revert failed: ${e instanceof Error ? e.message : String(e)}`, 0);
  }
}
const gridVisible    = ref(true);
const selectedCell   = ref<Cell | null>(null);
const selectedCells  = ref<Cell[]>([]);
/** All cells on the canvas — kept in sync so Inspector can show the Canvas Items list. */
const allCells       = ref<Cell[]>([]);

const canGroup   = () => selectedCells.value.filter(c => c.isNode()).length >= 2;
const canUngroup = () => selectedCells.value.some(c => c.isNode() && (c.getData() as any)?.isGroup);
const isGroupSelected = computed(() => !!(selectedCell.value?.isNode() && (selectedCell.value.getData() as any)?.isGroup));
const groupCollapsed  = computed(() => !!((selectedCell.value?.getData() as any)?.collapsed));
/** True when at least one canvas cell is locked — drives the Unlock All button. */
const hasAnyLocked = computed(() =>
  allCells.value.some(c => !!(c.getData() as any)?.locked)
);
const canvasRef    = ref<InstanceType<typeof X6Canvas> | null>(null);
const inspectorRef = ref<InstanceType<typeof Inspector> | null>(null);

// ── Draw tool state ───────────────────────────────────────────────────────────────────
const penMode         = ref(false);
const penStrokeColor  = ref("#60a5fa");
const penStrokeWidth  = ref(2);
const drawSubMode     = ref<"line" | "ortho" | "curve">("line");
const penBendFactor   = ref(0.3);
const penOverlayRef   = ref<HTMLDivElement | null>(null);

// Click-based anchor state (line / ortho modes)
const penAnchors      = ref<{ x: number; y: number }[]>([]);
const penMousePos     = ref<{ x: number; y: number } | null>(null);

// Drag-based state (curve mode only)
const penDrawing      = ref(false);
const penCurvePoints  = ref<{ x: number; y: number }[]>([]);

/** Snap point to H or V relative to previous anchor (orthogonal constraint). */
function snapOrtho(from: { x: number; y: number }, to: { x: number; y: number }): { x: number; y: number } {
  const dx = Math.abs(to.x - from.x), dy = Math.abs(to.y - from.y);
  return dx >= dy ? { x: to.x, y: from.y } : { x: from.x, y: to.y };
}

/** Snap end point to nearest 45° increment from start (Shift key). */
function snapToAngle(from: { x: number; y: number }, to: { x: number; y: number }): { x: number; y: number } {
  const dx = to.x - from.x, dy = to.y - from.y;
  const dist = Math.sqrt(dx * dx + dy * dy);
  if (dist < 1) return to;
  const angle = Math.atan2(dy, dx);
  const snapped = Math.round(angle / (Math.PI / 4)) * (Math.PI / 4);
  return { x: from.x + Math.cos(snapped) * dist, y: from.y + Math.sin(snapped) * dist };
}

/** Apply current mode constraint to a raw mouse point. */
function constrainPt(raw: { x: number; y: number }, shiftHeld = false): { x: number; y: number } {
  const last = penAnchors.value[penAnchors.value.length - 1];
  if (!last) return raw;
  if (drawSubMode.value === "ortho") return snapOrtho(last, raw);
  if (shiftHeld) return snapToAngle(last, raw);
  return raw;
}

/** SVG path for committed polyline segments (solid). */
const committedPreviewD = computed(() => {
  const pts = penAnchors.value;
  if (pts.length < 2) return "";
  return "M " + pts.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" L ");
});

/** SVG path for rubber-band segment (dashed, last anchor → cursor). */
const rubberBandD = computed(() => {
  const pts = penAnchors.value;
  const mp = penMousePos.value;
  if (!pts.length || !mp) return "";
  const last = pts[pts.length - 1];
  const end = constrainPt(mp);
  return `M ${last.x.toFixed(1)},${last.y.toFixed(1)} L ${end.x.toFixed(1)},${end.y.toFixed(1)}`;
});

/** SVG path for curve drag preview. */
const curvePreviewD = computed(() => {
  const pts = penCurvePoints.value;
  if (pts.length < 2) return "";
  const [p0, p1] = pts;
  const cpx = (p0.x + p1.x) / 2 - (p1.y - p0.y) * penBendFactor.value;
  const cpy = (p0.y + p1.y) / 2 + (p1.x - p0.x) * penBendFactor.value;
  return `M ${p0.x},${p0.y} Q ${cpx.toFixed(1)},${cpy.toFixed(1)} ${p1.x},${p1.y}`;
});

function togglePenMode() {
  penMode.value = !penMode.value;
  if (!penMode.value) {
    penAnchors.value = [];
    penMousePos.value = null;
    penDrawing.value = false;
    penCurvePoints.value = [];
  }
}

// ── Line / Ortho: click-based handlers ────────────────────────────────────────────────

function onOverlayClick(e: MouseEvent) {
  if (drawSubMode.value === "curve") return;
  const raw = { x: e.offsetX, y: e.offsetY };
  const pt = constrainPt(raw, e.shiftKey);
  penAnchors.value = [...penAnchors.value, pt];
}

function onOverlayDblClick(e: MouseEvent) {
  if (drawSubMode.value === "curve") return;
  e.stopPropagation();
  // The 2nd click of the dblclick pair already added a duplicate anchor — remove it
  const anchors = penAnchors.value.slice(0, -1);
  penAnchors.value = [];
  penMousePos.value = null;
  if (anchors.length >= 2) commitPolyline(anchors);
}

function onOverlayMouseMove(e: MouseEvent) {
  if (drawSubMode.value === "curve") return;
  penMousePos.value = { x: e.offsetX, y: e.offsetY };
}

function commitPolyline(anchors: { x: number; y: number }[]) {
  if (anchors.length < 2 || !graph) return;
  const overlayEl = penOverlayRef.value;
  if (!overlayEl) return;
  const rect = overlayEl.getBoundingClientRect();
  const gp = anchors.map(p => graph!.clientToLocal({ x: rect.left + p.x, y: rect.top + p.y }));
  const xs = gp.map(p => p.x), ys = gp.map(p => p.y);
  const PAD = 6;
  const bx = Math.min(...xs) - PAD;
  const by = Math.min(...ys) - PAD;
  const bw = Math.max(Math.max(...xs) - Math.min(...xs) + PAD * 2, 4);
  const bh = Math.max(Math.max(...ys) - Math.min(...ys) + PAD * 2, 4);
  const normPts = gp.map(p => ({
    x: parseFloat(((p.x - bx) / bw).toFixed(4)),
    y: parseFloat(((p.y - by) / bh).toFixed(4)),
  }));
  const id = `DrawnShape_${Date.now()}`;
  graph!.addNode({
    id,
    shape: "scada-freehand-path",
    x: bx, y: by, width: bw, height: bh,
    data: {
      key: id, category: "FreehandPath", name: "",
      strokeColor: penStrokeColor.value,
      strokeWidth: penStrokeWidth.value,
      pathType: drawSubMode.value,
      bendFactor: 0,
      points: normPts,
      telemetryBindings: [],
      opacity: 1,
    },
  });
}

// ── Curve: drag-based handlers ─────────────────────────────────────────────────────────

function onPenDown(e: PointerEvent) {
  if (drawSubMode.value !== "curve" || !graph) return;
  (e.target as HTMLElement).setPointerCapture(e.pointerId);
  penDrawing.value = true;
  penCurvePoints.value = [{ x: e.offsetX, y: e.offsetY }];
}

function onPenMove(e: PointerEvent) {
  if (drawSubMode.value !== "curve" || !penDrawing.value) return;
  penCurvePoints.value = [penCurvePoints.value[0], { x: e.offsetX, y: e.offsetY }];
}

function onPenUp(_e: PointerEvent) {
  if (drawSubMode.value !== "curve" || !penDrawing.value) return;
  penDrawing.value = false;
  commitCurveStroke();
}

function onPenCancel() {
  penDrawing.value = false;
  penCurvePoints.value = [];
}

function commitCurveStroke() {
  const pts = penCurvePoints.value;
  penCurvePoints.value = [];
  if (pts.length < 2 || !graph) return;
  const overlayEl = penOverlayRef.value;
  if (!overlayEl) return;
  const rect = overlayEl.getBoundingClientRect();
  const gp = pts.map(p => graph!.clientToLocal({ x: rect.left + p.x, y: rect.top + p.y }));
  const xs = gp.map(p => p.x), ys = gp.map(p => p.y);
  const PAD = 6;
  const curvePad = Math.hypot(gp[1].x - gp[0].x, gp[1].y - gp[0].y) * Math.abs(penBendFactor.value) * 0.55;
  const bx = Math.min(...xs) - PAD - curvePad;
  const by = Math.min(...ys) - PAD - curvePad;
  const bw = Math.max(Math.max(...xs) - Math.min(...xs) + (PAD + curvePad) * 2, 4);
  const bh = Math.max(Math.max(...ys) - Math.min(...ys) + (PAD + curvePad) * 2, 4);
  const normPts = gp.map(p => ({
    x: parseFloat(((p.x - bx) / bw).toFixed(4)),
    y: parseFloat(((p.y - by) / bh).toFixed(4)),
  }));
  const id = `DrawnShape_${Date.now()}`;
  graph!.addNode({
    id,
    shape: "scada-freehand-path",
    x: bx, y: by, width: bw, height: bh,
    data: {
      key: id, category: "FreehandPath", name: "",
      strokeColor: penStrokeColor.value,
      strokeWidth: penStrokeWidth.value,
      pathType: "curve",
      bendFactor: penBendFactor.value,
      points: normPts,
      telemetryBindings: [],
      opacity: 1,
    },
  });
}

/** ESC key: cancel in-progress polyline. */
function handleDrawKeydown(e: KeyboardEvent) {
  if (e.key === "Escape" && penAnchors.value.length) {
    penAnchors.value = [];
    penMousePos.value = null;
  }
}
const canvasBg        = ref("#0f1419");
const edgeColor       = ref("#6b7280");
const edgeWidth       = ref(1.5);
const portSizeFactor  = ref(0.12);
const DEFAULT_CANVAS_SIZE = "1920x1080";
const CANVAS_BOUNDARY_ID = "__canvas_boundary__";
const canvasSize = ref(DEFAULT_CANVAS_SIZE);
const canvasSizeOptions = [
  { value: "1366x768", label: "1366X768" },
  { value: "1600x900", label: "1600X900" },
  { value: "1920x1080", label: "1920X1080" },
  { value: "2560x1440", label: "2560X1440" },
  { value: "infinite", label: "Infinite" },
];
let graph: Graph | null = null;

function normalizeCanvasSize(value?: string): string {
  if (!value) return DEFAULT_CANVAS_SIZE;
  const trimmed = value.trim();
  if (/^infinite$/i.test(trimmed)) return "infinite";
  const m = trimmed.match(/^(\d+)\s*[xX]\s*(\d+)$/);
  if (!m) return DEFAULT_CANVAS_SIZE;
  return `${Number(m[1])}x${Number(m[2])}`;
}

function parseFixedCanvasSize(value: string): { width: number; height: number } | null {
  const m = value.match(/^(\d+)x(\d+)$/);
  if (!m) return null;
  return { width: Number(m[1]), height: Number(m[2]) };
}

function removeCanvasBoundaryGuide() {
  if (!graph) return;
  const existing = graph.getCellById(CANVAS_BOUNDARY_ID);
  if (existing) graph.removeCell(existing);
}

function upsertCanvasBoundaryGuide(width: number, height: number) {
  if (!graph) return;
  const commonAttrs = {
    body: {
      fill: "transparent",
      stroke: "#4a9eff",
      strokeOpacity: 0.65,
      strokeWidth: 2,
      strokeDasharray: "8 6",
      pointerEvents: "none",
    },
    label: {
      text: `Canvas ${width}x${height}`,
      fill: "#7ec3ff",
      fontSize: 12,
      fontWeight: 600,
      textAnchor: "start",
      textVerticalAnchor: "top",
      refX: 8,
      refY: 6,
      pointerEvents: "none",
    },
  };

  const existing = graph.getCellById(CANVAS_BOUNDARY_ID);
  if (existing?.isNode()) {
    const node = existing as Node;
    node.setPosition({ x: 0, y: 0 });
    node.setSize({ width, height });
    node.setAttrs(commonAttrs as any);
    node.setData({ isCanvasBoundaryGuide: true }, { overwrite: false });
    node.setZIndex(-1_000_000);
    node.toBack();
    return;
  }

  const guide = graph.addNode({
    id: CANVAS_BOUNDARY_ID,
    shape: "rect",
    x: 0,
    y: 0,
    width,
    height,
    attrs: commonAttrs as any,
    data: { isCanvasBoundaryGuide: true },
    zIndex: -1_000_000,
    interacting: false,
    selectable: false,
    draggable: false,
  } as any);
  guide.toBack();
}

function applyCanvasSizeToGraph(size: string) {
  if (!graph) return;
  const normalized = normalizeCanvasSize(size);
  const fixed = parseFixedCanvasSize(normalized);
  if (fixed) {
    graph.resize(fixed.width, fixed.height);
    upsertCanvasBoundaryGuide(fixed.width, fixed.height);
    return;
  }
  // Infinite: keep graph viewport coupled to editor canvas area.
  const host = graph.container;
  const w = host?.clientWidth ?? 0;
  const h = host?.clientHeight ?? 0;
  if (w > 0 && h > 0) graph.resize(w, h);
  removeCanvasBoundaryGuide();
}

function onCanvasSizeSelect(next: string) {
  canvasSize.value = normalizeCanvasSize(next);
  applyCanvasSizeToGraph(canvasSize.value);
}

// ── Port context menu ─────────────────────────────────────────────────────
const portMenu = ref({ visible: false, x: 0, y: 0, node: null as Node | null });

function closePortMenu() { portMenu.value.visible = false; }

function openPortMenuForNode(node: Node, x: number, y: number) {
  const data = (node.getData() as any) ?? {};
  if (data.isGroup) return;
  portMenu.value = { visible: true, x, y, node };
}

function handleCustomNodeContextMenu(evt: Event) {
  if (!graph) return;
  const detail = (evt as CustomEvent<{ nodeId: string; x: number; y: number }>).detail;
  if (!detail?.nodeId) return;
  const cell = graph.getCellById(detail.nodeId);
  if (!cell?.isNode()) return;
  openPortMenuForNode(cell as Node, detail.x, detail.y);
}

function onCanvasBgChange(color: string) {
  canvasBg.value = color;
  graph?.drawBackground({ color });
}

function onPortSizeFactorChange(factor: number) {
  portSizeFactor.value = factor;
  // X6Canvas watches the prop and calls applyPortSizeToAllNodes automatically.
}

function applyEdgeAttrs(color: string, width: number) {
  graph?.getEdges().forEach(edge => {
    edge.attr("line/stroke", color);
    edge.attr("line/strokeWidth", width);
  });
}

function onEdgeColorChange(color: string) {
  edgeColor.value = color;
  applyEdgeAttrs(color, edgeWidth.value);
}

function onEdgeWidthChange(width: number) {
  edgeWidth.value = width;
  applyEdgeAttrs(edgeColor.value, width);
}

// ── Graph ready ─────────────────────────────────────────────────────────────

const EDGE_TOOLS = [
  { name: "vertices",         args: { snapRadius: 20, attrs: { fill: "#4a9eff", stroke: "#fff", strokeWidth: 1.5, r: 5 } } },
  { name: "segments",         args: { attrs: { width: 12, height: 12, fill: "#4a9eff", stroke: "#fff", strokeWidth: 1.5 } } },
  { name: "source-arrowhead", args: { attrs: { fill: "#4a9eff", stroke: "#fff", strokeWidth: 1 } } },
  { name: "target-arrowhead", args: { attrs: { fill: "#4a9eff", stroke: "#fff", strokeWidth: 1 } } },
  { name: "button-remove",    args: { distance: -30 } },
];

// ── Manual edge multi-selection (complements X6 Selection; keep maps in sync) ──
// Map of edgeId → edge cell for all currently selected edges
const edgeSelMap = new Map<string, any>();
let normalizingSelection = false;

/** Additive selection: Shift, Ctrl, or Meta (X6 Selection uses ctrl/meta by default; we align all three). */
function isMultiSelectModifier(e: MouseEvent) {
  return !!(e.shiftKey || e.ctrlKey || e.metaKey);
}

function edgeAdd(edge: any) {
  edgeSelMap.set(edge.id, edge);
  edge.removeTools();
  edge.addTools(EDGE_TOOLS);
}
function edgeDel(edge: any) {
  edgeSelMap.delete(edge.id);
  edge.removeTools();
}
function edgeClearAll() {
  edgeSelMap.forEach(e => e.removeTools());
  edgeSelMap.clear();
}

/** Add/remove vertex tools on edges so they match `merged` (must include every selected edge cell). */
function reconcileEdgeToolsForMergedCells(merged: Cell[]) {
  const edgeIds = new Set(merged.filter(c => c.isEdge()).map(c => c.id));
  for (const [id, e] of [...edgeSelMap]) {
    if (!edgeIds.has(id)) edgeDel(e);
  }
  for (const c of merged) {
    if (c.isEdge() && !edgeSelMap.has(c.id)) edgeAdd(c as Edge);
  }
}

/**
 * Selection plugin is source of truth (rubberband, Ctrl+click, etc.).
 * Ensures edges in the box get vertex tools — previously only edge:click did.
 */
function reconcileFromGraphSelection() {
  if (!graph) return;
  const rawSelected = graph.getSelectedCells() as Cell[];
  const selected = rawSelected.filter(c => c.id !== CANVAS_BOUNDARY_ID);

  // Keep the X6 internal selection set clean so marquee-select + drag never
  // treats the editor-only canvas boundary guide as a movable selected cell.
  if (!normalizingSelection && selected.length !== rawSelected.length) {
    normalizingSelection = true;
    graph.resetSelection(selected);
    normalizingSelection = false;
  }

  reconcileEdgeToolsForMergedCells(selected);
  selectedCells.value = [...selected];
  selectedCell.value  = selected.length === 1 ? selected[0] : null;
}

/**
 * After manual edge:click handling, merge plugin selection with edgeSelMap (shift-toggle / scroller).
 */
function syncAfterManualEdgeInteraction() {
  if (!graph) return;
  const byId = new Map<string, Cell>();
  for (const c of graph.getSelectedCells() as Cell[]) byId.set(c.id, c);
  for (const c of edgeSelMap.values()) byId.set(c.id, c);
  const merged = [...byId.values()];
  reconcileEdgeToolsForMergedCells(merged);
  selectedCells.value = merged;
  selectedCell.value  = merged.length === 1 ? merged[0] : null;
}

function onGraphReady(g: Graph) {
  graph = g;
  applyCanvasSizeToGraph(canvasSize.value);

  // ── Edge multi-selection ──────────────────────────────────────────────────
  // Strategy: use BOTH edge:click and a DOM fallback with dedup (50 ms window).
  // Do NOT call g.cleanSelection() inside edge handlers — it fires onCellSelected
  // which would wipe edgeSelMap. Node selection is cleared only on blank:click.
  let lastHandledEdgeId = "";
  let lastHandledAt = 0;

  function handleEdge(edge: any, shift: boolean) {
    const now = Date.now();
    if (edge.id === lastHandledEdgeId && now - lastHandledAt < 50) return; // dedup
    lastHandledEdgeId = edge.id;
    lastHandledAt = now;
    if (shift) {
      if (edgeSelMap.has(edge.id)) { edgeDel(edge); } else { edgeAdd(edge); }
    } else {
      edgeClearAll();
      edgeAdd(edge);
    }
    syncAfterManualEdgeInteraction();
  }

  g.on("edge:click", ({ edge, e }) => handleEdge(edge, isMultiSelectModifier(e as unknown as MouseEvent)));

  // DOM fallback: catches clicks the Scroller swallows before edge:click fires
  g.container.addEventListener("click", (e: MouseEvent) => {
    let el: Element | null = e.target as Element;
    while (el && el !== g.container) {
      // X6 marks cell-view root elements with data-cell-id
      const cellId = (el as HTMLElement).dataset?.cellId
                  ?? el.getAttribute?.("data-cell-id");
      if (cellId) {
        const cell = g.getCellById(cellId);
        if (cell?.isEdge()) { handleEdge(cell, isMultiSelectModifier(e)); return; }
        break; // found a node — not an edge click
      }
      el = el.parentElement;
    }
  });

  // Apply global edge defaults to any newly drawn edge
  g.on("edge:added", ({ edge }: any) => {
    edge.attr("line/stroke", edgeColor.value);
    edge.attr("line/strokeWidth", edgeWidth.value);
  });

  // Group move: when a group node is moved, move all its members by the same delta
  g.on("node:change:position", ({ node, current, previous }: any) => {
    const d = node.getData() as any;
    if (!d?.isGroup || !Array.isArray(d?.memberIds) || !d.memberIds.length) return;

    // If group + members are already being moved together (e.g. clipboard
    // paste selects and offsets all pasted cells), avoid applying a second
    // parent-driven translation to members.
    const selectedIds = new Set((graph?.getSelectedCells() ?? []).map((c) => String(c.id)));
    const membersAlsoSelected = d.memberIds.some((id: string) => selectedIds.has(String(id)));
    if (selectedIds.has(String(node.id)) && membersAlsoSelected) return;

    const dx = current.x - previous.x;
    const dy = current.y - previous.y;
    if (dx === 0 && dy === 0) return;
    d.memberIds.forEach((id: string) => {
      const member = graph!.getCellById(id);
      if (member?.isNode()) {
        const pos = (member as Node).getPosition();
        (member as Node).setPosition({ x: pos.x + dx, y: pos.y + dy });
      }
    });

    // Edge vertices are absolute coordinates — they don't follow node moves
    // automatically. Offset vertices of any edge whose both terminals are
    // members of this group so the edge path moves with the group.
    const memberIdSet = new Set(d.memberIds.map((id: string) => String(id)));
    graph!.getEdges().forEach((edge: Edge) => {
      const srcCell = (edge.getSource() as { cell?: string } | null)?.cell;
      const tgtCell = (edge.getTarget() as { cell?: string } | null)?.cell;
      if (!srcCell || !tgtCell) return;
      if (!memberIdSet.has(String(srcCell)) || !memberIdSet.has(String(tgtCell))) return;
      const verts = edge.getVertices() as { x: number; y: number }[];
      if (!Array.isArray(verts) || verts.length === 0) return;
      edge.setVertices(verts.map((v) => ({ x: v.x + dx, y: v.y + dy })));
    });
  });

  // Right-click on regular nodes → port context menu
  g.on("node:contextmenu", ({ node, e }) => {
    e.preventDefault();
    openPortMenuForNode(node as Node, e.clientX, e.clientY);
  });

  // Double-click: inline edit for TextLabel, open binding editor for others
  g.on("node:dblclick", ({ node }) => {
    const cat = (node.getData() as any)?.category as string;
    if (cat === "TextLabel" || cat === "TransparentLabel") {
      node.setData({ _editing: true }, { overwrite: false });
    } else {
      // Select the node so Inspector shows its data, then open binding editor
      graph?.resetSelection(node);
      selectedCell.value  = node;
      selectedCells.value = [node];
      // Defer one tick so Inspector has updated its cell prop
      setTimeout(() => inspectorRef.value?.openBindingEditor(), 0);
    }
  });

  // Blank click → clear all
  g.on("blank:click", () => {
    closePortMenu();
    edgeClearAll();
    selectedCells.value = [];
    selectedCell.value  = null;
  });

  // ── Change tracking for snapshot/revert ──────────────────────────────────
  // These three events cover every meaningful mutation:
  //   cell:added   — node or edge dropped onto canvas
  //   cell:removed — node or edge deleted
  //   cell:change:data — binding edits, name changes, property panel updates
  g.on("cell:added",       scheduleValidation);
  g.on("cell:removed",     scheduleValidation);
  g.on("cell:change:data", scheduleValidation);

  // Keep Canvas Items list in sync
  function refreshAllCells() {
    allCells.value = g.getCells().filter(c => c.id !== CANVAS_BOUNDARY_ID);
  }
  g.on("cell:added",       refreshAllCells);
  g.on("cell:removed",     refreshAllCells);
  g.on("cell:change:data", refreshAllCells);

  loadDiagram();
}

// ── Load / Save ───────────────────────────────────────────────────────────

function normalizeHeaterPlatePorts(cells: Array<Record<string, unknown>>): void {
  for (const c of cells) {
    const data = (c.data ?? {}) as Record<string, unknown>;
    const isHeaterPlate = c.shape === "scada-heater-plate" || data.category === "HeaterPlate";
    if (!isHeaterPlate) continue;

    c.ports = {
      groups: {
        conn: {
          position: "scada-switch-port",
          markup: [{ tagName: "circle", selector: "circle" }],
          attrs: { circle: { r: 6, magnet: true, fill: "#0d1117", stroke: "#8aa7c6", strokeWidth: 1.6 } },
        },
      },
      items: [
        { id: "left",      group: "conn", args: { xRatio: 0.08, yRatio: 0.65 } },
        { id: "right",     group: "conn", args: { xRatio: 0.92, yRatio: 0.65 } },
        { id: "rad-left",  group: "conn", args: { xRatio: 0.08, yRatio: 0.65 } },
        { id: "rad-right", group: "conn", args: { xRatio: 0.92, yRatio: 0.65 } },
      ],
    };
  }
}

function normalizeReverseNodeRender(cells: Array<Record<string, unknown>>): void {
  for (const c of cells) {
    const data = (c.data ?? {}) as Record<string, unknown>;
    const category = String(data.category ?? "");
    if (!category.endsWith("_reverse")) continue;

    const reverseShape = CATEGORY_TO_SHAPE[category];
    if (reverseShape) c.shape = reverseShape;

    if (c.angle !== undefined) c.angle = 0;
    if (typeof data.angle === "number") data.angle = 0;
    c.data = data;
  }
}

async function loadDiagram() {
  const data = await DiagramStorage.getDiagram(diagramId);
  if (data) {
    diagramName.value = data.name;
    canvasSize.value = normalizeCanvasSize(data.canvasSize);
    applyCanvasSizeToGraph(canvasSize.value);
    // Restore canvas background colour
    if (data.backgroundColor) {
      canvasBg.value = data.backgroundColor;
      graph?.drawBackground({ color: data.backgroundColor });
    }
    // Restore global edge defaults
    if (data.edgeColor) edgeColor.value = data.edgeColor;
    if (data.edgeWidth) edgeWidth.value = data.edgeWidth;
    // Restore port size factor (the X6Canvas watch will apply it to all nodes after load)
    if (data.portSizeFactor !== undefined) portSizeFactor.value = data.portSizeFactor;
    if (data.modelData) {
      try {
        const json = typeof data.modelData === "string" ? JSON.parse(data.modelData) : data.modelData;
        let partialMsg = "";
        if (graph) {
          // Progressive loader: yields a requestAnimationFrame between each
          // chunk of 20 cells so the browser can repaint incrementally.
          // The overlay shows "Rendering… N%" so the user sees progress.
          graphLoading.value = true;
          loadingPctEditor.value = 0;
          await nextTick();
          const g = graph;
          try {
            const isEdge = (c: Record<string, unknown>) =>
              c.source !== undefined && c.target !== undefined;
            const cells = (json.cells as Record<string, unknown>[]) ?? [];
            normalizeHeaterPlatePorts(cells);
            normalizeReverseNodeRender(cells);
            const nodes = cells.filter(c => !isEdge(c));
            const edges = cells.filter(c =>  isEdge(c));
            const total = nodes.length + edges.length;
            let loadedN = 0;
            const CHUNK = 20;
            const yield_ = () => new Promise<void>(r => requestAnimationFrame(() => r()));

            g.clearCells();
            for (let i = 0; i < nodes.length; i += CHUNK) {
              g.startBatch("load");
              for (const cell of nodes.slice(i, i + CHUNK)) {
                try { g.addNode(cell as any); loadedN++; } catch { /* skip */ }
              }
              g.stopBatch("load");
              loadingPctEditor.value = total > 0 ? Math.round(loadedN / total * 100) : 0;
              await yield_();
            }
            for (let i = 0; i < edges.length; i += CHUNK) {
              g.startBatch("load");
              for (const cell of edges.slice(i, i + CHUNK)) {
                try { g.addEdge(cell as any); loadedN++; } catch { /* skip */ }
              }
              g.stopBatch("load");
              loadingPctEditor.value = total > 0 ? Math.round(loadedN / total * 100) : 0;
              await yield_();
            }
            if (loadedN < total) {
              partialMsg =
                `⚠ ${total - loadedN} cell(s) could not be loaded and were skipped ` +
                `(${loadedN} of ${total} cells loaded). Check console for details.`;
            }
          } catch (fromJsonErr) {
            console.warn("[EditorPage] progressive load failed:", fromJsonErr);
          }
        }
        // Re-add +/− toggle buttons on group nodes after load
        graph?.getNodes().forEach(n => {
          if ((n.getData() as any)?.isGroup) addGroupToggleButton(n);
        });
        // Migrate legacy manhattan-routed edges to orth. Manhattan fails for
        // nearly every edge in dense SCADA diagrams (hits maximumLoops) and
        // falls back to orth anyway — this makes the switch explicit and silent.
        graph?.getEdges().forEach(edge => {
          const r = edge.prop("router") as any;
          const name = typeof r === "string" ? r : r?.name;
          if (name === "manhattan") edge.prop("router", { name: "orth" });
        });
        // Re-apply edge visual attrs from data (backwards compat for diagrams
        // saved before opacity was wired to line/opacity attr)
        graph?.getEdges().forEach(edge => {
          applyEdgeVisualsFromData(edge, (edge.getData() ?? {}) as Record<string, unknown>);
        });
        // Progressive load clears cells; restore editor-only fixed-size boundary.
        applyCanvasSizeToGraph(canvasSize.value);
        graphLoading.value    = false;
        loadingPctEditor.value = 0;
        // Populate the Canvas Items list after a full load
        allCells.value = graph?.getCells().filter(c => c.id !== CANVAS_BOUNDARY_ID) ?? [];
        // Re-apply pointer-events:none to any locked cells (survives reload)
        if (graph) syncAllCellLockPointerEvents(graph);
        if (partialMsg) flashSaveMsg(partialMsg, 0); // stays until user closes it
        else takeSnapshot(); // only snapshot a clean/complete load
        // Auto fit-to-view when editor first opens so the diagram fills the viewport
        nextTick(() => fitView());
      } catch (e) {
        graphLoading.value    = false;
        loadingPctEditor.value = 0;
        console.warn("[EditorPage] Could not load model JSON:", e);
      }
    }
  }
}

async function save(): Promise<boolean> {
  if (!graph) return false;

  const model = graph.toJSON();
  const filteredCells = ((model.cells ?? []) as Array<Record<string, unknown>>)
    .filter((c) => String(c.id ?? "") !== CANVAS_BOUNDARY_ID);

  // Capture each routing-computed edge's live waypoints from its EdgeView and
  // store them as `_frozenVertices` in the cell data blob.  The viewer injects
  // these as static vertices with the passthrough router so every edge renders
  // pixel-for-pixel identical to the editor — no re-routing ever in view mode.
  // Updated on every save so always in sync with the current layout.
  //
  // WHY we match on NON-routing routers rather than on routing router names:
  //   All edges in this app inherit the graph-level orth router by default and
  //   are serialised with router=undefined (no per-edge override). Matching an
  //   allowlist ["orth","manhattan","er"] therefore misses every edge and
  //   _frozenVertices is never refreshed.  Instead we skip only the routers
  //   that produce NO intermediate waypoints ("passthrough" just replays stored
  //   vertices; "normal" draws a straight line). Every other router — including
  //   the implicit undefined/empty case that inherits the graph-level orth —
  //   can have computed waypoints worth freezing.
  const NON_ROUTING_ROUTER_NAMES = new Set(["passthrough", "normal"]);
  for (const c of filteredCells) {
    const isEdge = (c as any).source !== undefined && (c as any).target !== undefined;
    if (!isEdge) continue;
    try {
      const savedRouter = (c as any).router as any;
      const routerName: string =
        typeof savedRouter === "string" ? savedRouter : (savedRouter?.name ?? "");
      // Skip passthrough (already frozen) and normal (straight line, no waypoints).
      // Edges with router=undefined inherit the graph-level orth — treat them as
      // routing edges and always attempt to capture their live routePoints.
      if (NON_ROUTING_ROUTER_NAMES.has(routerName)) continue;
      const edge = graph.getCellById(String(c.id ?? ""));
      if (!edge) continue;
      const view = (graph as any).findViewByCell(edge) as any;
      const pts: { x: number; y: number }[] = view?.routePoints ?? [];
      const existingData = (c.data ?? {}) as Record<string, unknown>;
      if (pts.length > 0) {
        const waypoints = pts.map((p: any) => ({ x: +p.x, y: +p.y }));
        c.data = { ...existingData, _frozenVertices: waypoints };
      } else {
        // No computed waypoints (e.g. direct straight segment) — clear stale freeze.
        const { _frozenVertices: _fv, ...rest } = existingData as any;
        c.data = rest;
      }
    } catch {
      // Non-critical — viewer falls back to passthrough with stored vertices.
    }
  }

  model.cells = filteredCells as any;
  const cellCount = filteredCells.length;

  // GUARD: never overwrite a stored diagram with an empty graph. An empty graph
  // at save time almost always means the diagram failed to load (e.g. the
  // backend was restarting), and saving would irrecoverably wipe the stored
  // copy — the "diagram disappeared and can't be recovered" symptom. Refuse and
  // tell the user to reload before editing.
  if (cellCount === 0) {
    flashSaveMsg("⚠ Diagram is empty — not saved. If it failed to load, reload the page before editing.");
    console.warn("[EditorPage] Refusing to save empty graph for", diagramId);
    return false;
  }

  saving.value = true;
  try {
    const modelData = JSON.stringify(model);
    // viewModelData is generated server-side by the backend on every POST —
    // the client only needs to send modelData.
    await DiagramStorage.saveDiagram({
      id: diagramId,
      name: diagramName.value,
      modelData,
      canvasSize: canvasSize.value,
      backgroundColor: canvasBg.value,
      edgeColor: edgeColor.value,
      edgeWidth: edgeWidth.value,
      portSizeFactor: portSizeFactor.value,
    });
    takeSnapshot(); // backend confirmed — this is the new known-good checkpoint
    return true;
  } catch (e) {
    flashSaveMsg("⚠ Save failed — check the backend connection and try again.");
    console.warn("[EditorPage] save failed:", e);
    return false;
  } finally {
    saving.value = false;
  }
}

// ── Toolbar ──────────────────────────────────────────────────────────────

function undo()    { graph?.undo(); }
function redo()    { graph?.redo(); }
function fitSelectedToCanvas() {
  if (!graph) return;
  // Read directly from X6 selection to avoid stale reactive selection state.
  // If no nodes are selected, fall back to all diagram nodes (except boundary).
  const selectedNodes = (graph.getSelectedCells() as Cell[])
    .filter((c): c is Node => c.isNode())
    .filter((n) => n.id !== CANVAS_BOUNDARY_ID);
  const nodes = selectedNodes.length
    ? selectedNodes
    : graph.getNodes().filter((n) => n.id !== CANVAS_BOUNDARY_ID);
  if (!nodes.length) return;

  const nodeIds = new Set(nodes.map((n) => n.id));

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const n of nodes) {
    const p = n.getPosition();
    const s = n.getSize();
    minX = Math.min(minX, p.x);
    minY = Math.min(minY, p.y);
    maxX = Math.max(maxX, p.x + s.width);
    maxY = Math.max(maxY, p.y + s.height);
  }
  const srcW = Math.max(1, maxX - minX);
  const srcH = Math.max(1, maxY - minY);

  const fixed = parseFixedCanvasSize(normalizeCanvasSize(canvasSize.value));
  const targetW = fixed?.width ?? (graph.container?.clientWidth || srcW);
  const targetH = fixed?.height ?? (graph.container?.clientHeight || srcH);
  const padding = 28;
  const availW = Math.max(40, targetW - padding * 2);
  const availH = Math.max(40, targetH - padding * 2);
  const scale = Math.min(availW / srcW, availH / srcH);

  // Place scaled bounds centered in the selected canvas area.
  const dstW = srcW * scale;
  const dstH = srcH * scale;
  const dstMinX = (targetW - dstW) / 2;
  const dstMinY = (targetH - dstH) / 2;

  const transformPoint = (x: number, y: number) => ({
    x: dstMinX + (x - minX) * scale,
    y: dstMinY + (y - minY) * scale,
  });

  const edgeIdsFromSelection = new Set(
    (graph.getSelectedCells() as Cell[])
      .filter((c): c is Edge => c.isEdge())
      .map((e) => e.id),
  );

  const edgesToAdjust = graph.getEdges().filter((e) => {
    if (edgeIdsFromSelection.has(e.id)) return true;
    const src = (e.getSource() as { cell?: string } | null)?.cell;
    const tgt = (e.getTarget() as { cell?: string } | null)?.cell;
    return !!(src && tgt && nodeIds.has(src) && nodeIds.has(tgt));
  });

  graph.startBatch("fit-selection");
  for (const n of nodes) {
    const p = n.getPosition();
    const s = n.getSize();
    const nextPos = transformPoint(p.x, p.y);
    const nw = Math.max(10, s.width * scale);
    const nh = Math.max(10, s.height * scale);
    n.setPosition({ x: nextPos.x, y: nextPos.y });
    n.setSize({ width: nw, height: nh });
  }
  // Keep manually-routed edge geometry proportional after node scaling.
  for (const e of edgesToAdjust) {
    const verts = e.getVertices();
    if (!verts?.length) continue;
    e.setVertices(verts.map((v) => transformPoint(v.x, v.y)) as any);
  }
  graph.stopBatch("fit-selection");
}

function fitView() {
  const selectedNodeCount = (graph?.getSelectedCells() as Cell[] | undefined)?.filter(
    (c) => c.isNode() && c.id !== CANVAS_BOUNDARY_ID,
  ).length ?? 0;
  if (selectedNodeCount > 0) {
    fitSelectedToCanvas();
    return;
  }

  if (!graph) return;

  const fixed = parseFixedCanvasSize(normalizeCanvasSize(canvasSize.value));
  const scroller = graph.getPlugin("scroller") as { container?: HTMLElement } | null;
  const host = scroller?.container ?? graph.container;
  const viewportW = host?.clientWidth ?? 0;
  const viewportH = host?.clientHeight ?? 0;
  const scrollbarY = host ? Math.max(0, host.offsetHeight - host.clientHeight) : 0;
  const scrollbarX = host ? Math.max(0, host.offsetWidth - host.clientWidth) : 0;

  // Fixed-size canvas: fit to the canvas rectangle itself (not all nodes), then
  // center on canvas midpoint so the full dashed boundary is always visible.
  if (fixed) {
    const padTop = 44;
    const padLeft = 44;
    const padRight = 44 + scrollbarX;
    const padBottom = 96 + scrollbarY;
    const availW = Math.max(40, viewportW - padLeft - padRight);
    const availH = Math.max(40, viewportH - padTop - padBottom);
    const fitZoom = Math.min(availW / fixed.width, availH / fixed.height);

    if (Number.isFinite(fitZoom) && fitZoom > 0) {
      graph.zoomTo(fitZoom);
      graph.centerPoint(fixed.width / 2, fixed.height / 2);
    } else {
      graph.zoomToFit({ padding: 44 });
    }
    return;
  }

  graph.zoomToFit({ padding: 44 });
}
function zoomIn()    { graph?.zoom(0.15); }
function zoomOut()   { graph?.zoom(-0.15); }
// ── Group / Ungroup ───────────────────────────────────────────────────────

function groupSelected() {
  if (!graph || !canGroup()) return;
  const allNodes = selectedCells.value.filter(c => c.isNode()) as Node[];

  // Collect all memberIds already owned by selected group nodes so we don't
  // double-register their children in the new parent group's memberIds.
  // Without this, moving the parent would move child-group members twice:
  // once directly (parent→rect) and once via the child group's own handler.
  const idsAlreadyInSelectedGroup = new Set<string>();
  allNodes.forEach(n => {
    const d = n.getData() as any;
    if (d?.isGroup && Array.isArray(d.memberIds)) {
      d.memberIds.forEach((id: string) => idsAlreadyInSelectedGroup.add(id));
    }
  });

  // Top-level nodes only: exclude anything that's already a member of a
  // selected child group so the new parent just tracks the group envelope.
  const nodes = allNodes.filter(n => !idsAlreadyInSelectedGroup.has(n.id));

  const PAD = 24;
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  allNodes.forEach(n => {
    const { x, y } = n.getPosition();
    const { width, height } = n.getSize();
    minX = Math.min(minX, x); minY = Math.min(minY, y);
    maxX = Math.max(maxX, x + width); maxY = Math.max(maxY, y + height);
  });

  const gx = minX - PAD, gy = minY - PAD;
  const gw = maxX - minX + PAD * 2, gh = maxY - minY + PAD * 2;
  const groupId = `group_${Date.now()}`;
  // Store only top-level member IDs. Child groups are responsible for moving
  // their own members via their own node:change:position events.
  const memberIds = nodes.map(n => n.id);

  const groupNode = graph.addNode({
    id: groupId, shape: "rect",
    x: gx, y: gy, width: gw, height: gh,
    attrs: {
      body:  { fill: "rgba(74,158,255,0.05)", stroke: "#4a9eff", strokeDasharray: "6 3", strokeWidth: 1.5, rx: 6 },
      label: { text: "Group", fill: "#4a9eff", fontSize: 10, refX: 10, refY: 6, textAnchor: "start", textVerticalAnchor: "top" },
    },
    data: {
      key: groupId, category: "Group", name: "Group", isGroup: true,
      memberIds,
      fill: "rgba(74,158,255,0.05)", stroke: "#4a9eff", strokeWidth: 1.5,
      telemetryBindings: [],
    },
    zIndex: Math.min(...nodes.map(n => n.getZIndex() ?? 0)) - 1,
  });

  addGroupToggleButton(groupNode);
  graph.resetSelection(groupNode);
  selectedCell.value  = groupNode;
  selectedCells.value = [groupNode];
}

function ungroupSelected() {
  if (!graph || !canUngroup()) return;
  // No coordinate adjustment needed — members were never re-parented.
  // Just remove the group envelope node; members stay at their world positions.
  const groups = selectedCells.value.filter(c => c.isNode() && (c.getData() as any)?.isGroup);
  groups.forEach(group => {
    // Ensure members are visible before removing the group
    const d = group.getData() as any;
    (d?.memberIds ?? []).forEach((id: string) => {
      graph!.getCellById(id)?.setVisible(true);
    });
    graph!.removeCell(group as any);
  });
  graph.resetSelection([]);
  selectedCells.value = [];
  selectedCell.value  = null;
}

// Recursively show/hide members of a group.
// When hiding: always hide all descendants.
// When showing: respect each child group's own collapsed state (don't reveal
// members of a child group that was itself collapsed before parent collapsed).
function setMembersVisible(memberIds: string[], visible: boolean) {
  memberIds.forEach(id => {
    const member = graph!.getCellById(id);
    if (!member) return;
    member.setVisible(visible);
    if (member.isNode()) {
      const cd = member.getData() as any;
      if (cd?.isGroup) {
        if (!visible) {
          // Remove the +/− button so it doesn't float outside the collapsed parent
          (member as Node).removeTools();
          if (Array.isArray(cd.memberIds)) setMembersVisible(cd.memberIds, false);
        } else {
          // Restore the +/− button and reveal grandchildren if not collapsed
          addGroupToggleButton(member as Node);
          if (!cd.collapsed && Array.isArray(cd.memberIds)) setMembersVisible(cd.memberIds, true);
        }
      }
    }
  });
}

// Add (or refresh) the +/− button tool on a group node.
// Called after creating a group and after each collapse/expand toggle.
function addGroupToggleButton(node: Node) {
  node.removeTools();
  const collapsed = (node.getData() as any)?.collapsed ?? false;
  node.addTools([{
    name: "button",
    args: {
      markup: [
        { tagName: "circle", selector: "btn", attrs: { r: 8, fill: "#4a9eff", stroke: "rgba(255,255,255,0.5)", strokeWidth: 1, cursor: "pointer" } },
        { tagName: "text",   selector: "icon", textContent: collapsed ? "+" : "−", attrs: { fill: "#fff", fontSize: 14, fontWeight: "bold", textAnchor: "middle", dominantBaseline: "central", pointerEvents: "none" } },
      ],
      x: 0, y: 0,
      offset: { x: 14, y: 14 },
      onClick({ cell }: any) {
        selectedCell.value  = cell as Node;
        selectedCells.value = [cell as Node];
        toggleGroupCollapse();
      },
    },
  }]);
}

function toggleGroupCollapse() {
  const group = selectedCell.value;
  if (!group?.isNode()) return;
  const d = group.getData() as any;
  if (!d?.isGroup) return;

  const memberIds: string[] = d.memberIds ?? [];
  const isCollapsed = d.collapsed ?? false;

  if (isCollapsed) {
    // Expand: restore saved height and recursively show members
    const expandedH = d.expandedHeight ?? 200;
    (group as Node).setSize({ width: (group as Node).getSize().width, height: expandedH });
    group.setData({ collapsed: false }, { overwrite: false });
    group.attr("label/text", d.name || "Group");
    setMembersVisible(memberIds, true);
  } else {
    // Collapse: save height, shrink to header bar, recursively hide members
    const currentH = (group as Node).getSize().height;
    group.setData({ collapsed: true, expandedHeight: currentH }, { overwrite: false });
    (group as Node).setSize({ width: (group as Node).getSize().width, height: 30 });
    group.attr("label/text", d.name || "Group");
    setMembersVisible(memberIds, false);
  }

  addGroupToggleButton(group as Node);
}

function bringToFront() {
  if (!selectedCell.value) return;
  const cells = (graph?.getCells() ?? []).filter((c) => c.id !== CANVAS_BOUNDARY_ID);
  const maxZ = Math.max(0, ...cells.map(c => (c.getZIndex() ?? 0)));
  selectedCell.value.setZIndex(maxZ + 1);
}
function sendToBack() {
  if (!selectedCell.value) return;
  const cells = (graph?.getCells() ?? []).filter((c) => c.id !== CANVAS_BOUNDARY_ID);
  const minZ = Math.min(0, ...cells.map(c => (c.getZIndex() ?? 0)));
  selectedCell.value.setZIndex(minZ - 1);
}

function getZOrderedEditableCells(): Cell[] {
  const all = graph?.getCells() ?? [];
  const order = new Map<string, number>();
  all.forEach((c, i) => order.set(String(c.id), i));
  return all
    .filter((c) => c.id !== CANVAS_BOUNDARY_ID)
    .sort((a, b) => {
      const za = a.getZIndex() ?? 0;
      const zb = b.getZIndex() ?? 0;
      if (za !== zb) return za - zb;
      return (order.get(String(a.id)) ?? 0) - (order.get(String(b.id)) ?? 0);
    });
}

function normalizeEditableZOrder(cells: Cell[]) {
  // Ensure strict monotonic z-order so step operations never get stuck on duplicate z values.
  cells.forEach((cell, idx) => cell.setZIndex(idx));
}

function bringForward() {
  if (!selectedCell.value) return;
  const cells = getZOrderedEditableCells();
  if (cells.length < 2) return;
  normalizeEditableZOrder(cells);
  const index = cells.findIndex((c) => c.id === selectedCell.value!.id);
  if (index < 0 || index >= cells.length - 1) return;
  const current = cells[index];
  const next = cells[index + 1];
  const zCurrent = current.getZIndex() ?? index;
  const zNext = next.getZIndex() ?? index + 1;
  current.setZIndex(zNext);
  next.setZIndex(zCurrent);
}
function sendBackward() {
  if (!selectedCell.value) return;
  const cells = getZOrderedEditableCells();
  if (cells.length < 2) return;
  normalizeEditableZOrder(cells);
  const index = cells.findIndex((c) => c.id === selectedCell.value!.id);
  if (index <= 0) return;
  const current = cells[index];
  const previous = cells[index - 1];
  const zCurrent = current.getZIndex() ?? index;
  const zPrevious = previous.getZIndex() ?? index - 1;
  current.setZIndex(zPrevious);
  previous.setZIndex(zCurrent);
}
function toggleGrid() {
  if (!graph) return;
  gridVisible.value = !gridVisible.value;
  if (gridVisible.value) {
    graph.showGrid();
  } else {
    graph.hideGrid();
  }
}

async function viewDiagram() {
  // Only navigate to the viewer if the save actually persisted. If save was
  // refused (empty graph) or failed, stay in the editor so the user sees the
  // warning instead of landing on a blank viewer.
  const ok = await save();
  if (!ok) return;
  // Opening viewer from editor should show the current diagram fitted to the
  // available viewport, not restore an old saved pan/zoom from a previous
  // viewer session.
  router.push(`/viewer/${diagramId}?fit=1`);
}

// ── Selection ────────────────────────────────────────────────────────────

function onCellSelected(_cells: Cell[]) {
  reconcileFromGraphSelection();
}

function onCellUpdate(_cell: Cell) {
  // Trigger auto-save on meaningful change (debounced in real app)
}

/** Lock all currently selected cells (toolbar button). */
function lockSelected() {
  const tolock = selectedCells.value.filter(c => c.id !== CANVAS_BOUNDARY_ID);
  if (!tolock.length) return;
  tolock.forEach(cell => {
    cell.setData({ locked: true }, { overwrite: false });
    if (graph) applyCellLockPointerEvents(graph, cell);
  });
  // Locked cells cannot stay selected
  graph?.cleanSelection();
  selectedCell.value  = null;
  selectedCells.value = [];
  allCells.value = graph?.getCells().filter(c => c.id !== CANVAS_BOUNDARY_ID) ?? [];
}

/** Unlock every locked cell on the canvas (toolbar button). */
function unlockAll() {
  const cells = graph?.getCells().filter(c => c.id !== CANVAS_BOUNDARY_ID) ?? [];
  cells.forEach(cell => {
    if ((cell.getData() as any)?.locked) {
      cell.setData({ locked: false }, { overwrite: false });
      if (graph) applyCellLockPointerEvents(graph, cell);
    }
  });
  allCells.value = cells;
}

/** Called when user toggles lock on a cell in the Canvas Items panel. */
function onLockChange(cell: Cell) {
  const locked = !!(cell.getData() as any)?.locked;
  // Immediately sync pointer-events so rubber-band works (no wait for cell:change:data)
  if (graph) applyCellLockPointerEvents(graph, cell);
  if (locked) {
    // Deselect the cell immediately — locked cells cannot stay selected
    graph?.unselect(cell);
    if (selectedCell.value?.id === cell.id) {
      selectedCell.value = null;
    }
    selectedCells.value = selectedCells.value.filter(c => c.id !== cell.id);
  }
  onCellUpdate(cell);
}

/** Called when user clicks a cell name in the Canvas Items panel. */
function onFocusCell(id: string) {
  const cell = graph?.getCellById(id);
  if (!cell) return;
  // Pan/scroll to the cell
  if (cell.isNode()) {
    (graph as any)?.scrollToCell?.(cell, { animation: { duration: 280 } });
  }
  // Select it (only if not locked)
  if (!(cell.getData() as any)?.locked) {
    graph?.resetSelection(cell);
    reconcileFromGraphSelection();
  }
}

// ── Drag & Drop from palette ──────────────────────────────────────────────

let dragCategory = "";
let dragDefaults: Record<string, unknown> = {};

function onPaletteDragStart(payload: { category: string; event: DragEvent; defaults?: Record<string, unknown> }) {
  dragCategory = payload.category;
  const item = PALETTE_ITEMS.find(p => p.category === payload.category);
  dragDefaults = { ...(item?.defaults ?? {}), ...(payload.defaults ?? {}) };
}

async function onDrop(event: DragEvent) {
  if (!graph || !dragCategory) return;

  // clientToLocal expects raw viewport coordinates — no manual offset subtraction
  const graphPt = graph.clientToLocal({ x: event.clientX, y: event.clientY });
  const shape   = CATEGORY_TO_SHAPE[dragCategory];
  if (!shape) return;

  const id = `${dragCategory.toLowerCase()}_${Date.now()}`;

  const data: Record<string, unknown> = {
    key: id,
    category: dragCategory,
    name: dragCategory,
    statusColor: "",
    statusText: "",
    opacity: 1,
    telemetryBindings: [],
    ...dragDefaults,
  };

  const nodeCfg: Record<string, unknown> = {
    id,
    shape,
    x: graphPt.x - 50,
    y: graphPt.y - 40,
    data,
  };

  if (dragCategory === "SvgGraphic" && data.svgMarkup) {
    const raw = ensureSvgElementIds(sanitizeSvgMarkup(String(data.svgMarkup)) || String(data.svgMarkup));
    const { svgMarkup, width, height } = await cropSvgToContent(raw);
    data.svgMarkup = svgMarkup;
    nodeCfg.width = width;
    nodeCfg.height = height;
    nodeCfg.x = graphPt.x - width / 2;
    nodeCfg.y = graphPt.y - height / 2;
  }

  const newNode = graph.addNode(nodeCfg as any);

  // SVG nodes serve as background diagrams — push behind all component nodes automatically.
  if (dragCategory === "SvgGraphic") newNode.toBack();

  dragCategory = "";
  dragDefaults = {};
}

// ── Paste image from clipboard ────────────────────────────────────────────

// Set to true by the keydown handler when Ctrl+V is pressed while X6 clipboard
// has cells — tells clipboard paste handler to skip that one paste event.
let skipNextImagePaste = false;

// ── Ctrl-key pan mode ────────────────────────────────────────────────────
// Hold Ctrl (or Meta on Mac) to temporarily switch the canvas into pan mode.
// Released or window-blur restores the default pointer/select behaviour.
function handleCtrlPanKeydown(e: KeyboardEvent) {
  if ((e.key === "Control" || e.key === "Meta") && graph) {
    graph.enablePanning();
  }
}
function handleCtrlPanKeyup(e: KeyboardEvent) {
  if ((e.key === "Control" || e.key === "Meta") && graph) {
    graph.disablePanning();
  }
}
function handleCtrlPanBlur() {
  // If Ctrl is held while the window loses focus, restore normal mode.
  if (graph) graph.disablePanning();
}

function handlePasteKeydown(e: KeyboardEvent) {
  if (!graph) return;
  if ((e.ctrlKey || e.metaKey) && e.key === "v") {
    // If X6 clipboard has cells the user is intentionally pasting X6 elements;
    // suppress the image paste for this single Ctrl+V.
    skipNextImagePaste = !graph.isClipboardEmpty();
  }
}

async function pasteSvgNode(svgRaw: string) {
  if (!graph) return;
  const clean = sanitizeSvgMarkup(svgRaw);
  if (!clean) return;
  const withIds = ensureSvgElementIds(clean);
  const { svgMarkup, width, height } = await cropSvgToContent(withIds);
  const containerEl = graph.container;
  const rect = containerEl.getBoundingClientRect();
  const center = graph.clientToLocal({
    x: rect.left + rect.width / 2,
    y: rect.top + rect.height / 2,
  });
  const id = `svg_${Date.now()}`;
  graph.addNode({
    id,
    shape: "scada-svg",
    x: center.x - width / 2,
    y: center.y - height / 2,
    width,
    height,
    data: {
      key: id,
      category: "SvgGraphic",
      name: "SVG",
      svgMarkup,
      svgOverrides: {},
      svgSelectedElementId: "",
      fill: "transparent",
      stroke: "#30363d",
      strokeWidth: 1,
      statusColor: "",
      statusText: "",
      opacity: 1,
      telemetryBindings: [],
    },
  });
}

async function tryPasteSvg(e: ClipboardEvent): Promise<boolean> {
  if (!graph) return false;
  const cd = e.clipboardData;
  if (!cd) return false;

  const items = Array.from(cd.items);
  const svgItem = items.find(i => i.type === "image/svg+xml");
  if (svgItem) {
    const blob = svgItem.getAsFile();
    if (blob) {
      const text = await blob.text();
      if (text.includes("<svg")) {
        e.preventDefault();
        e.stopPropagation();
        pasteSvgNode(text);
        return true;
      }
    }
  }

  const html = cd.getData("text/html");
  const plain = cd.getData("text/plain");
  const extracted = extractSvgFromClipboard(html, plain);
  if (extracted) {
    e.preventDefault();
    e.stopPropagation();
    pasteSvgNode(extracted);
    return true;
  }
  return false;
}

function handlePasteRasterImage(e: ClipboardEvent) {
  if (!graph) return;
  if (skipNextImagePaste) {
    skipNextImagePaste = false;
    return;
  }

  const items = Array.from(e.clipboardData?.items ?? []);
  const imageItem = items.find(item => item.type.startsWith("image/") && item.type !== "image/svg+xml");
  if (!imageItem) return;

  // Image found — consume event so X6 clipboard doesn't also fire
  e.preventDefault();
  e.stopPropagation();

  const blob = imageItem.getAsFile();
  if (!blob) return;

  const reader = new FileReader();
  reader.onload = (ev) => {
    const dataUrl = ev.target?.result as string;
    if (!dataUrl) return;

    // Place at center of current viewport
    const containerEl = graph!.container;
    const rect = containerEl.getBoundingClientRect();
    const center = graph!.clientToLocal({
      x: rect.left + rect.width  / 2,
      y: rect.top  + rect.height / 2,
    });

    // Detect natural image dimensions then add node
    const img = new Image();
    img.onload = () => {
      const maxW = 400;
      const scale = img.naturalWidth > maxW ? maxW / img.naturalWidth : 1;
      const w = Math.round(img.naturalWidth  * scale);
      const h = Math.round(img.naturalHeight * scale);

      const id = `image_${Date.now()}`;
      graph!.addNode({
        id,
        shape: "scada-image",
        x: center.x - w / 2,
        y: center.y - h / 2,
        width:  w,
        height: h,
        data: {
          key: id,
          category: "Image",
          name: "Pasted Image",
          imageSource: dataUrl,
          opacity: 1,
          telemetryBindings: [],
        },
      });
    };
    img.src = dataUrl;
  };
  reader.readAsDataURL(blob);
}

async function handlePasteClipboard(e: ClipboardEvent) {
  if (!graph) return;
  if (skipNextImagePaste) {
    skipNextImagePaste = false;
    return;
  }
  if (await tryPasteSvg(e)) return;
  handlePasteRasterImage(e);
}

onMounted(() => {
  loadTelemetryStreamsFromStorage();
  // Defer mnemonic prefetch off the critical path — it's 4 parallel HTTP
  // calls used by the Telemetry Binding Editor, which the user rarely opens
  // in the first second. requestIdleCallback (with a setTimeout fallback)
  // lets the editor paint first.
  const prefetch = () => { loadMnemonics().catch(() => {}); };
  (window as any).requestIdleCallback
    ? (window as any).requestIdleCallback(prefetch, { timeout: 2000 })
    : setTimeout(prefetch, 800);
  window.addEventListener("keydown", handlePasteKeydown,    true);
  window.addEventListener("paste",   handlePasteClipboard,  true);
  window.addEventListener("keydown", handleCtrlPanKeydown);
  window.addEventListener("keyup",   handleCtrlPanKeyup);
  window.addEventListener("blur",    handleCtrlPanBlur);
  window.addEventListener("keydown", handleDrawKeydown);
  window.addEventListener("scada-node-contextmenu", handleCustomNodeContextMenu as EventListener);

  // Entrance — title slides down, then "Nova" pops in with a bounce
  gsap.from(".spasdacs-title", { opacity: 0, y: -20, duration: 1, ease: "power3.out" });
  gsap.from(".nova",           { scale: 0.8, opacity: 0, duration: 1, delay: 0.3, ease: "back.out(1.7)" });
  // Glow pulse — starts after entrance finishes, loops forever
  gsap.fromTo(".nova",
    { textShadow: "0 0 0px #00eaff, 0 0 0px #0077ff" },
    { textShadow: "0 0 12px #00eaff, 0 0 24px #0077ff", duration: 1.5, repeat: -1, yoyo: true, ease: "sine.inOut", delay: 1.3 },
  );
});

onUnmounted(() => {
  window.removeEventListener("keydown", handlePasteKeydown,   true);
  window.removeEventListener("paste",   handlePasteClipboard, true);
  window.removeEventListener("keydown", handleCtrlPanKeydown);
  window.removeEventListener("keyup",   handleCtrlPanKeyup);
  window.removeEventListener("blur",    handleCtrlPanBlur);
  window.removeEventListener("keydown", handleDrawKeydown);
  window.removeEventListener("scada-node-contextmenu", handleCustomNodeContextMenu as EventListener);
});
</script>

<style scoped>
.editor-page {
  display: flex;
  flex-direction: column;
  height: 100vh;
  overflow: hidden;
  background: #0f1419;
}

/* ── Topbar ──────────────────────────────────────────────────────────── */
.topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 1rem;
  height: 52px;
  flex-shrink: 0;
  background: #161b22;
  border-bottom: 1px solid #30363d;
}

.topbar-left, .topbar-center, .topbar-right {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  flex: 1;
}
.topbar-center { justify-content: center; }
.topbar-right  { justify-content: flex-end; }

.btn-back {
  padding: 0.35rem 0.75rem;
  background: rgba(139,148,158,0.2);
  color: #c9d1d9;
  border: 1px solid #30363d;
  border-radius: 5px;
  font-size: 0.85rem;
  cursor: pointer;
}
.btn-back:hover { background: rgba(139,148,158,0.35); }

.diagram-name-input {
  font-size: 0.95rem;
  color: #e6edf3;
  font-weight: 600;
  background: transparent;
  border: 1px solid transparent;
  border-radius: 5px;
  padding: 2px 7px;
  outline: none;
  min-width: 80px;
  max-width: 260px;
  width: auto;
  font-family: inherit;
  transition: border-color 0.15s, background 0.15s;
}
.diagram-name-input:hover {
  border-color: #30363d;
  background: rgba(139,148,158,0.08);
}
.diagram-name-input:focus {
  border-color: rgba(74,158,255,0.55);
  background: rgba(74,158,255,0.07);
  color: #fff;
}

.canvas-size-wrap {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  color: #9fb2c4;
  font-size: 0.78rem;
  border: 1px solid #30363d;
  border-radius: 6px;
  padding: 0.18rem 0.35rem 0.18rem 0.5rem;
  background: rgba(139,148,158,0.08);
}

.canvas-size-select {
  appearance: none;
  background: rgba(22,27,34,0.9);
  color: #dbe6ef;
  border: 1px solid #3b4652;
  border-radius: 5px;
  padding: 0.18rem 1.4rem 0.18rem 0.45rem;
  font-size: 0.78rem;
  font-weight: 600;
  line-height: 1.2;
  cursor: pointer;
}

.canvas-size-select:focus {
  outline: none;
  border-color: rgba(74,158,255,0.6);
}

.spasdacs-title {
  font-size: 1.05rem;
  font-weight: 700;
  color: #fff;
  letter-spacing: 0.05em;
}
.nova {
  color: #00eaff;
  font-style: italic;
  font-weight: 800;
  text-shadow: 0 0 0px #00eaff, 0 0 0px #0077ff;
}

.app-icon  { font-size: 1.4rem; color: rgba(74,158,255,0.9); }
.app-title { font-size: 1.05rem; font-weight: 700; color: #fff; letter-spacing: 0.05em; }
.app-badge {
  font-size: 0.7rem;
  background: rgba(39,174,96,0.2);
  color: #27ae60;
  border: 1px solid rgba(39,174,96,0.4);
  border-radius: 8px;
  padding: 1px 6px;
}

.btn-tool {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(139,148,158,0.15);
  border: 1px solid #30363d;
  border-radius: 5px;
  color: #c9d1d9;
  font-size: 1rem;
  cursor: pointer;
  transition: background 0.12s;
}
.btn-tool:hover { background: rgba(139,148,158,0.3); color: #fff; }
.btn-tool.active { background: rgba(74,158,255,0.2); color: #4a9eff; border-color: rgba(74,158,255,0.4); }
.btn-tool:disabled { opacity: 0.3; cursor: default; pointer-events: none; }
.btn-tool.btn-group  { width: auto; padding: 0 8px; font-size: 0.78rem; }
.btn-tool.btn-lock   { width: auto; padding: 0 8px; font-size: 0.78rem; display: flex; align-items: center; gap: 2px; }
.btn-tool.btn-unlock-all { width: auto; padding: 0 8px; font-size: 0.78rem; display: flex; align-items: center; gap: 2px; }
.btn-tool.btn-lock:not(:disabled):hover   { background: rgba(224,144,48,0.15); color: #e09030; border-color: rgba(224,144,48,0.3); }
.btn-tool.btn-unlock-all:not(:disabled):hover { background: rgba(74,158,255,0.15); color: #4a9eff; border-color: rgba(74,158,255,0.3); }

.toolbar-sep { width: 1px; height: 20px; background: #30363d; margin: 0 2px; }


.btn-view {
  padding: 0.35rem 0.9rem;
  background: rgba(74,158,255,0.15);
  color: #4a9eff;
  border: 1px solid rgba(74,158,255,0.35);
  border-radius: 5px;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
}
.btn-view:hover { background: rgba(74,158,255,0.28); }

.btn-save {
  padding: 0.35rem 0.9rem;
  background: linear-gradient(135deg, #32657b, #2a5266);
  color: #fff;
  border: 1px solid rgba(74,158,255,0.35);
  border-radius: 5px;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
}
.btn-save:hover:not(:disabled) { opacity: 0.9; }
.btn-save:disabled { opacity: 0.5; cursor: default; }
.save-msg {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin-left: 0.6rem;
  font-size: 0.78rem;
  color: #ffcf66;
  max-width: 44rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.save-msg-dismiss {
  flex-shrink: 0;
  background: none;
  border: none;
  color: #ffcf66;
  cursor: pointer;
  font-size: 0.8rem;
  opacity: 0.7;
  padding: 0 2px;
  line-height: 1;
}
.save-msg-dismiss:hover { opacity: 1; }

/* ── Revert button & warning bar ──────────────────────────────────────── */
.btn-revert {
  padding: 0.3rem 0.75rem;
  background: rgba(100, 100, 100, 0.18);
  color: #9ca3af;
  border: 1px solid rgba(120, 120, 120, 0.35);
  border-radius: 5px;
  font-size: 0.82rem;
  cursor: pointer;
  transition: background 0.12s, color 0.12s, border-color 0.12s;
}
.btn-revert:hover {
  background: rgba(100, 100, 100, 0.32);
  color: #e0e0e0;
}
/* When a validation issue is detected, the button turns amber to draw attention */
.btn-revert.btn-revert-warn {
  background: rgba(180, 100, 0, 0.22);
  color: #ffb347;
  border-color: rgba(255, 160, 0, 0.5);
  animation: revert-pulse 1.5s ease-in-out 2;
}
.btn-revert.btn-revert-warn:hover {
  background: rgba(180, 100, 0, 0.38);
}
@keyframes revert-pulse {
  0%, 100% { box-shadow: none; }
  50%       { box-shadow: 0 0 8px rgba(255, 160, 0, 0.6); }
}

/* Warning bar: floats below the topbar, centred over the canvas */
.revert-warning-bar {
  position: fixed;
  top: 52px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 200;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 7px 16px;
  background: rgba(160, 80, 0, 0.92);
  border: 1px solid rgba(255, 160, 0, 0.55);
  border-radius: 6px;
  font-size: 0.82rem;
  color: #ffe0a0;
  max-width: 680px;
  text-align: center;
  backdrop-filter: blur(4px);
  white-space: nowrap;
  pointer-events: auto;
}
.revert-warning-dismiss {
  flex-shrink: 0;
  background: none;
  border: none;
  color: #ffe0a0;
  cursor: pointer;
  font-size: 0.9rem;
  opacity: 0.75;
  padding: 0 2px;
  line-height: 1;
}
.revert-warning-dismiss:hover { opacity: 1; }

/* ── Editor body ─────────────────────────────────────────────────────── */
.editor-body {
  flex: 1;
  display: flex;
  overflow: hidden;
}

.canvas-area {
  flex: 1;
  position: relative;
  overflow: hidden;
}

.pen-overlay {
  position: absolute;
  inset: 0;
  z-index: 100;
  cursor: crosshair;
  overflow: hidden;
  background: transparent;
}

.pen-preview-svg {
  display: block;
  width: 100%;
  height: 100%;
  overflow: visible;
  pointer-events: none;
}

.pen-color-input {
  width: 28px;
  height: 28px;
  padding: 1px;
  border: 1px solid #30363d;
  border-radius: 5px;
  background: none;
  cursor: pointer;
}

.pen-width-input {
  width: 44px;
  height: 28px;
  background: rgba(139,148,158,0.15);
  border: 1px solid #30363d;
  border-radius: 5px;
  color: #c9d1d9;
  font-size: 0.8rem;
  text-align: center;
  padding: 0 4px;
}

.btn-draw-sub {
  width: auto;
  padding: 0 7px;
  font-size: 0.85rem;
  font-weight: 600;
}

.graph-loading-overlay {
  position: absolute;
  inset: 0;
  z-index: 50;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.55);
  color: #e0e0e0;
  font-size: 1.1rem;
  letter-spacing: 0.05em;
  pointer-events: none;
}
</style>
