<template>
  <aside class="inspector">
    <InspectorGatewayHeader>
      <template #badge>
        <span v-if="isMultiEdge" class="inspector-type">{{ cells!.length }} Edges</span>
        <span v-else-if="cell" class="inspector-type">{{ cellCategory }}</span>
      </template>
    </InspectorGatewayHeader>

    <InspectorCanvasEmpty
      v-if="!cell && !isMultiEdge"
      :canvas-bg="canvasBg"
      :edge-color="edgeColor"
      :edge-width="edgeWidth"
      :port-size-factor="portSizeFactor"
      @canvas-bg-change="onCanvasBgInput"
      @edge-color-change="emit('edge-color-change', $event)"
      @edge-width-change="emit('edge-width-change', $event)"
      @port-size-factor-change="emit('port-size-factor-change', $event)"
    />

    <InspectorMultiEdge
      v-else-if="isMultiEdge"
      :edge-count="cells!.length"
      :data="multiEdgeLocalData"
      :set-all="setAll"
      :set-all-edge-router="setAllEdgeRouter"
      :set-all-edge-connector="setAllEdgeConnector"
      @remove-binding="removeBindingMulti"
      @open-binding-editor="showEditor = true"
    />

    <!-- Inspector body (single selection) -->
    <div v-else class="inspector-body">

      <InspectorIdentity :data="data" :set="set" :is-edge="isEdge" />
      <InspectorNodeAppearance v-if="isNode" :data="data" :set="set" />
      <InspectorNodeTitle v-if="isNode" :data="data" :set="set" :default-pos="nodeTitleDefaultPos" />
      <InspectorNodePositionSize
        v-if="isNode"
        :pos-x="Math.round((cell as any)?.getPosition?.()?.x ?? 0)"
        :pos-y="Math.round((cell as any)?.getPosition?.()?.y ?? 0)"
        :width="Math.round((cell as any)?.getSize?.()?.width ?? 0)"
        :height="Math.round((cell as any)?.getSize?.()?.height ?? 0)"
        :set-pos="setPos"
        :set-size="setSize"
      />

      <!-- ── EDGE / CONNECTOR ────────────────────────────────── -->
      <InspectorEdgeConnector
        v-if="isEdge"
        :data="data"
        :set="set"
        :set-edge-router="setEdgeRouter"
        :set-edge-connector="setEdgeConnector"
      />

      <!-- ── SHAPE-SPECIFIC PROPS (per-category slices) ─────── -->

      <InspectorRect          v-if="isAny('Rect')"             :data="data" :set="set" />
      <InspectorTankGauge     v-if="isAny('Tank','Gauge')"     :data="data" :set="set" />
      <InspectorCurrentSensor v-if="isAny('CurrentSensor')"  :data="data" :set="set" />
      <InspectorIndicator     v-if="isAny('NumericDisplay')"  :data="data" :set="set" />

      <InspectorTwta v-if="isAny('TWTA')" :data="data" :set="set" />
      <InspectorFpga v-if="isAny('FPGA')" :data="data" :set="set" />
      <InspectorDriverAmplifier v-if="isAny('DriverAmplifier')" :data="data" :set="set" />
      <InspectorTwtada v-if="isAny('TWTADA')" :data="data" :set="set" />
      <InspectorSspa           v-if="isAny('SSPA', 'SSPA_reverse')" :data="data" :set="set" />
      <InspectorRfConverter    v-if="isAny('RFDownConverter', 'RFUpConverter', 'LNA', 'Receiver')" :data="data" :set="set" />
      <InspectorReceiverDemod  v-if="isAny('ReceiverDemod', 'Transmitter', 'Modulator', 'ACMU', 'QPSKModulator', 'QPSKDemodulator', 'TMDecoder')" :data="data" :set="set" />
      <InspectorNsgu           v-if="isAny('NSGU')" :data="data" :set="set" />
      <InspectorRfCoupler      v-if="isAny('RFCoupler')" :data="data" :set="set" />
      <InspectorRfCirculator v-if="isAny('RFCirculator')" :data="data" :set="set" />
      <InspectorBandpassFilter v-if="isAny('BandpassFilter')" :data="data" :set="set" />
      <InspectorLowPassFilter v-if="isAny('LowPassFilter')" :data="data" :set="set" />
      <InspectorSystem v-if="isAny('System')" :data="data" :set="set" />
      <InspectorRadiatorFan v-if="isAny('RadiatorFan')" :data="data" :set="set" />
      <InspectorHeaterPlate v-if="isAny('HeaterPlate')" :data="data" :set="set" />
      <InspectorBattery v-if="isAny('Battery')" :data="data" :set="set" />
      <InspectorMomentumWheel v-if="isAny('MomentumWheel', 'DTG')" :data="data" :set="set" />
      <InspectorSwitch v-if="isAny('SP2T','SP2TC','Switch3P','TransferSwitch')" :data="data" :set="set" />
      <InspectorThruster       v-if="isAny('Thruster')"         :data="data" :set="set" />
      <InspectorMonopropThruster v-if="isAny('MonopropThruster')" :data="data" :set="set" />
      <InspectorTextLabel        v-if="isAny('TextLabel')"        :data="data" :set="set" />
      <InspectorTransparentLabel v-if="isAny('TransparentLabel')" :data="data" :set="set" />
      <InspectorRubidiumClock v-if="isAny('RubidiumClock','RubidiumAtom','HornAntenna','PatchArrayAntenna','HelicalAntenna','OffsetReflector')" :data="data" :set="set" />
      <InspectorDataGrid v-if="isAny('DataGrid')" :data="data" :set="set" />
      <InspectorPlotGraph v-if="isAny('PlotGraph')" :data="data" :set="set" />
      <InspectorTextBox  v-if="isAny('TextBox')"  :data="data" :set="set" />
      <InspectorRobot    v-if="isAny('Robot')"      :data="data" :set="set" />
      <InspectorCtrlBoard v-if="isAny('CtrlBoard')" :data="data" :set="set" />
      <InspectorFreehandPath v-if="isAny('FreehandPath')" :data="data" :set="set" />
      <InspectorMosfet       v-if="isAny('Mosfet')"      :data="data" :set="set" />
      <InspectorSpstSwitch   v-if="isAny('SpstSwitch')" :data="data" :set="set" />

      <InspectorNodeState v-if="isNode" :data="data" :set="set" />

      <!-- SVG element selector — shown for SvgGraphic nodes only -->
      <InspectorSvgElement
        v-if="isAny('SvgGraphic')"
        :selected-id="String(data.svgSelectedElementId ?? '')"
        @clear="set('svgSelectedElementId', '')"
        @fit="fitSvgNode"
        @toback="sendSvgToBack"
      />

      <InspectorTelemetryBindings
        :bindings="data.telemetryBindings ?? []"
        @remove="removeBinding"
        @manage="showEditor = true"
      />

    </div>

    <!-- Always-visible canvas items panel (Inkscape-style Objects list) -->
    <InspectorCanvasItems
      :items="canvasItemList"
      @toggle-lock="onToggleLock"
      @focus-cell="onFocusCell"
    />

    <!-- Telemetry Binding Editor modal (single cell or multi-edge shared) -->
    <TelemetryBindingEditor
      v-if="cell || isMultiEdge"
      v-model:visible="showEditor"
      :bindings="bindingEditorBindings"
      :hover-mnemonics="bindingEditorHoverMnemonics"
      :telecommands="bindingEditorTelecommands"
      :cell-label="bindingEditorCellLabel"
      :svg-element-id="bindingEditorSvgElementId"
      :category="bindingEditorCategory"
      :is-edge="isEdge || isMultiEdge"
      :data-grid-rows="bindingEditorDataGridRows"
      :current-color-rules="bindingEditorCurrentColorRules"
      :border-color-rules="bindingEditorBorderColorRules"
      @update:bindings="onBindingsUpdate"
      @update:hoverMnemonics="onHoverMnemonicsUpdate"
      @update:telecommands="onTelecommandsUpdate"
      @dataGridRowsUpdated="onDataGridRowsUpdate"
      @update:currentColorRules="onCurrentColorRulesUpdate"
      @update:borderColorRules="onBorderColorRulesUpdate"
    />
  </aside>
</template>

<script setup lang="ts">
import { computed, ref, watch, onUnmounted } from "vue";
import type { Node as X6Node } from "@antv/x6";
// TelemetryBindingEditor pulls in Monaco (~3 MB chunk). Lazy-load it so the
// editor/viewer entry stays small — Monaco only downloads when the user
// actually opens the binding modal.
const TelemetryBindingEditor = defineAsyncComponent(() => import("./TelemetryBindingEditor.vue"));
import type { TelemetryBinding, DataGridRow } from "../types";
import { buildDataGridBindings } from "../graph/dataGridUtils";
import {
  applyEdgeMarkerEnd,
  syncEdgeLabelFromText,
  inferMarkerKeyFromEdge,
  readEdgeLabelText,
} from "../graph/edgeVisuals";
import InspectorGatewayHeader from "./inspector/InspectorGatewayHeader.vue";
import InspectorCanvasEmpty from "./inspector/InspectorCanvasEmpty.vue";
import InspectorCanvasItems from "./inspector/InspectorCanvasItems.vue";
import type { CanvasItem } from "./inspector/InspectorCanvasItems.vue";
import InspectorMultiEdge from "./inspector/InspectorMultiEdge.vue";
import InspectorIdentity from "./inspector/InspectorIdentity.vue";
import InspectorNodeAppearance from "./inspector/InspectorNodeAppearance.vue";
import InspectorNodePositionSize from "./inspector/InspectorNodePositionSize.vue";
import InspectorNodeState from "./inspector/InspectorNodeState.vue";
import InspectorTelemetryBindings from "./inspector/InspectorTelemetryBindings.vue";
// Inspector slices are lazy-loaded — each is fetched only when the user
// selects a cell whose category matches the slice's v-if guard. A typical
// session uses 2–4 slices, so the other 20+ never hit the network.
import { defineAsyncComponent } from "vue";
const InspectorEdgeConnector  = defineAsyncComponent(() => import("./inspector/slices/InspectorEdgeConnector.vue"));
const InspectorTankGauge      = defineAsyncComponent(() => import("./inspector/slices/InspectorTankGauge.vue"));
const InspectorTwta           = defineAsyncComponent(() => import("./inspector/slices/InspectorTwta.vue"));
const InspectorFpga           = defineAsyncComponent(() => import("./inspector/slices/InspectorFpga.vue"));
const InspectorDriverAmplifier= defineAsyncComponent(() => import("./inspector/slices/InspectorDriverAmplifier.vue"));
const InspectorTwtada         = defineAsyncComponent(() => import("./inspector/slices/InspectorTwtada.vue"));
const InspectorSspa           = defineAsyncComponent(() => import("./inspector/slices/InspectorSspa.vue"));
const InspectorRfConverter    = defineAsyncComponent(() => import("./inspector/slices/InspectorRfConverter.vue"));
const InspectorRect           = defineAsyncComponent(() => import("./inspector/slices/InspectorRect.vue"));
const InspectorReceiverDemod  = defineAsyncComponent(() => import("./inspector/slices/InspectorReceiverDemod.vue"));
const InspectorNsgu           = defineAsyncComponent(() => import("./inspector/slices/InspectorNsgu.vue"));
const InspectorRfCoupler      = defineAsyncComponent(() => import("./inspector/slices/InspectorRfCoupler.vue"));
const InspectorRfCirculator   = defineAsyncComponent(() => import("./inspector/slices/InspectorRfCirculator.vue"));
const InspectorBandpassFilter = defineAsyncComponent(() => import("./inspector/slices/InspectorBandpassFilter.vue"));
const InspectorLowPassFilter  = defineAsyncComponent(() => import("./inspector/slices/InspectorLowPassFilter.vue"));
const InspectorSystem         = defineAsyncComponent(() => import("./inspector/slices/InspectorSystem.vue"));
const InspectorRadiatorFan    = defineAsyncComponent(() => import("./inspector/slices/InspectorRadiatorFan.vue"));
const InspectorHeaterPlate    = defineAsyncComponent(() => import("./inspector/slices/InspectorHeaterPlate.vue"));
const InspectorBattery        = defineAsyncComponent(() => import("./inspector/slices/InspectorBattery.vue"));
const InspectorMomentumWheel  = defineAsyncComponent(() => import("./inspector/slices/InspectorMomentumWheel.vue"));
const InspectorSwitch         = defineAsyncComponent(() => import("./inspector/slices/InspectorSwitch.vue"));
const InspectorThruster          = defineAsyncComponent(() => import("./inspector/slices/InspectorThruster.vue"));
const InspectorMonopropThruster  = defineAsyncComponent(() => import("./inspector/slices/InspectorMonopropThruster.vue"));
const InspectorTextLabel        = defineAsyncComponent(() => import("./inspector/slices/InspectorTextLabel.vue"));
const InspectorTransparentLabel = defineAsyncComponent(() => import("./inspector/slices/InspectorTransparentLabel.vue"));
const InspectorSvgElement     = defineAsyncComponent(() => import("./inspector/slices/InspectorSvgElement.vue"));
const InspectorRubidiumClock  = defineAsyncComponent(() => import("./inspector/slices/InspectorRubidiumClock.vue"));
const InspectorDataGrid       = defineAsyncComponent(() => import("./inspector/slices/InspectorDataGrid.vue"));
const InspectorPlotGraph      = defineAsyncComponent(() => import("./inspector/slices/InspectorPlotGraph.vue"));
const InspectorCurrentSensor  = defineAsyncComponent(() => import("./inspector/slices/InspectorCurrentSensor.vue"));
const InspectorIndicator      = defineAsyncComponent(() => import("./inspector/slices/InspectorIndicator.vue"));
const InspectorTextBox        = defineAsyncComponent(() => import("./inspector/slices/InspectorTextBox.vue"));
const InspectorRobot          = defineAsyncComponent(() => import("./inspector/slices/InspectorRobot.vue"));
const InspectorCtrlBoard      = defineAsyncComponent(() => import("./inspector/slices/InspectorCtrlBoard.vue"));
const InspectorFreehandPath   = defineAsyncComponent(() => import("./inspector/slices/InspectorFreehandPath.vue"));
const InspectorNodeTitle      = defineAsyncComponent(() => import("./inspector/slices/InspectorNodeTitle.vue"));
const InspectorMosfet         = defineAsyncComponent(() => import("./inspector/slices/InspectorMosfet.vue"));
const InspectorSpstSwitch     = defineAsyncComponent(() => import("./inspector/slices/InspectorSpstSwitch.vue"));
import { cropSvgToContent } from "../nodes/svgGraphicUtils";

const props = defineProps<{
  cell: any | null;
  cells?: any[];
  /** All cells currently on the canvas — drives the Canvas Items list. */
  allCells?: any[];
  canvasBg?: string;
  edgeColor?: string;
  edgeWidth?: number;
  portSizeFactor?: number;
}>();
const emit  = defineEmits<{
  (e: "update", cell: any): void;
  (e: "canvas-bg-change", color: string): void;
  (e: "edge-color-change", color: string): void;
  (e: "edge-width-change", width: number): void;
  (e: "port-size-factor-change", factor: number): void;
  /** Emitted when a cell's locked state changes via the Canvas Items panel. */
  (e: "lock-change", cell: any): void;
  /** Emitted when user clicks a cell name in the Canvas Items panel to focus it. */
  (e: "focus-cell", id: string): void;
}>();

// ── Canvas Items list ──────────────────────────────────────────────────────

/** Snapshot list derived from allCells — plain objects so Vue reactivity works. */
const canvasItemList = computed<CanvasItem[]>(() => {
  const cells = props.allCells ?? [];
  // Show in reverse z-order so topmost items appear first (like Inkscape layers)
  return [...cells].reverse().map(cell => {
    const data = (cell.getData?.() ?? {}) as Record<string, any>;
    const isEdge = typeof cell.isEdge === "function" ? cell.isEdge() : false;
    const name = String(data.name || "").trim();
    const category = String(data.category || "").trim();
    const label = name || category || (isEdge ? "Edge" : "Node");
    return {
      id: cell.id as string,
      label,
      category,
      isEdge,
      locked: !!(data.locked),
    } satisfies CanvasItem;
  });
});

function onToggleLock(id: string, locked: boolean) {
  const cell = props.allCells?.find(c => c.id === id);
  if (!cell) return;
  cell.setData({ locked }, { overwrite: false });
  emit("lock-change", cell);
}

function onFocusCell(id: string) {
  emit("focus-cell", id);
}

function onCanvasBgInput(color: string) {
  emit("canvas-bg-change", color);
}

function edgeRouterProp(name: string) {
  if (name === "manhattan") {
    return {
      name,
      args: {
        // Keep near-node links from taking wide detours.
        padding: 4,
        step: 12,
        maximumLoops: 4000,
        maxAllowedDirectionChange: 90,
        excludeTerminals: ["source", "target"],
      },
    };
  }
  return { name };
}

const showEditor = ref(false);

let cellDataOff: (() => void) | null = null;

onUnmounted(() => {
  cellDataOff?.();
});

// ── Reactive local copy of cell data ─────────────────────────────────────
// X6 Cell objects are NOT Vue-reactive, so we keep a reactive snapshot that
// we update both on cell-selection change and in every setter.
const localData = ref<Record<string, any>>({});

/** Edge inspector snapshot (shared by single-edge pull and multi-edge first-edge preview). */
function hydrateEdgeData(cell: any): Record<string, any> {
  const d = { ...(cell.getData() as Record<string, any>) };
  d.stroke      = d.stroke      ?? (cell.attr("line/stroke")      as string)  ?? "#6b7280";
  d.strokeWidth = d.strokeWidth ?? (cell.attr("line/strokeWidth") as number)  ?? 1.5;
  d.opacity     = d.opacity     ?? (cell.attr("line/opacity")     as number)  ?? 1;
  const rp = cell.prop("router")    as any;
  const cp = cell.prop("connector") as any;
  d.router    = d.router    ?? (typeof rp === "object" ? rp?.name : rp) ?? "manhattan";
  d.connector = d.connector ?? (typeof cp === "object" ? cp?.name : cp) ?? "rounded";
  d.sourceMarker = inferMarkerKeyFromEdge(cell, "source", d);
  d.targetMarker = inferMarkerKeyFromEdge(cell, "target", d);
  d.labelText    = readEdgeLabelText(cell, d);
  return d;
}

function pullCellData(cell: any) {
  if (!cell) { localData.value = {}; return; }
  if (cell.isEdge()) {
    localData.value = hydrateEdgeData(cell);
    return;
  }
  const d = { ...(cell.getData() as Record<string, any>) };
  if (cell.isNode() && d.isGroup) {
    d.fill        = d.fill        ?? (cell.attr("body/fill")        as string) ?? "rgba(74,158,255,0.05)";
    d.stroke      = d.stroke      ?? (cell.attr("body/stroke")      as string) ?? "#4a9eff";
    d.strokeWidth = d.strokeWidth ?? (cell.attr("body/strokeWidth") as number) ?? 1.5;
  }
  localData.value = d;
}

/** First selected edge preview when multiple edges are selected (edits apply to all). */
const multiEdgeLocalData = ref<Record<string, any>>({});

watch(
  () => (props.cells ?? []).map((c: any) => c.id).join(","),
  () => {
    const cells = props.cells ?? [];
    if (cells.length < 2 || !cells.every(c => c.isEdge())) {
      multiEdgeLocalData.value = {};
      return;
    }
    multiEdgeLocalData.value = hydrateEdgeData(cells[0]);
  },
  { immediate: true }
);

watch(
  () => props.cell,
  (cell) => {
    cellDataOff?.();
    cellDataOff = null;
    if (!cell) { localData.value = {}; return; }
    const handler = () => pullCellData(cell);
    pullCellData(cell);
    cell.on("change:data", handler);
    cellDataOff = () => cell.off("change:data", handler);
  },
  { immediate: true }
);

const data         = computed(() => localData.value);
const isNode       = computed(() => props.cell?.isNode() ?? false);
const isEdge       = computed(() => props.cell?.isEdge() ?? false);
const cellCategory = computed(() => data.value.category || (isEdge.value ? "Edge" : "Node"));

// Default title-position slot for the global title panel — System defaults to
// "center" (title is centred in the inner body); all other elements default to
// "top-center" (title sits at the top of the inner panel).
const nodeTitleDefaultPos = computed(() =>
  cellCategory.value === "System" ? "center" : "top-center"
);
const isMultiEdge  = computed(() =>
  (props.cells?.length ?? 0) > 1 && (props.cells?.every(c => c.isEdge()) ?? false)
);

const bindingEditorCellLabel = computed(() => {
  if (isMultiEdge.value) {
    return `${props.cells?.length ?? 0} edges (shared bindings)`;
  }
  let base = (data.value.name || data.value.category || "") + (isEdge.value ? " (edge)" : "");
  if (data.value.category === "SvgGraphic" && data.value.svgSelectedElementId) {
    base += ` — ${data.value.svgSelectedElementId}`;
  }
  return base;
});

const bindingEditorCategory = computed(() =>
  isMultiEdge.value ? "Edge" : cellCategory.value
);

const bindingEditorSvgElementId = computed(() =>
  isMultiEdge.value ? null : (data.value.svgSelectedElementId ?? null)
);

const bindingEditorDataGridRows = computed<DataGridRow[] | undefined>(() =>
  (!isMultiEdge.value && data.value.category === "DataGrid")
    ? (data.value.rows as DataGridRow[] | undefined)
    : undefined
);

const bindingEditorBindings = computed(() =>
  isMultiEdge.value
    ? (multiEdgeLocalData.value.telemetryBindings ?? [])
    : (data.value.telemetryBindings ?? [])
);

const bindingEditorHoverMnemonics = computed(() =>
  isMultiEdge.value
    ? (multiEdgeLocalData.value.hoverMnemonics ?? [])
    : (data.value.hoverMnemonics ?? [])
);

const bindingEditorCurrentColorRules = computed(() => {
  const cat = data.value.category as string;
  if (cat === "NumericDisplay") return Array.isArray(data.value.indicatorColorRules) ? data.value.indicatorColorRules : [];
  return Array.isArray(data.value.currentColorRules) ? data.value.currentColorRules : [];
});

const bindingEditorBorderColorRules = computed(() =>
  Array.isArray(data.value.borderColorRules) ? data.value.borderColorRules : []
);

const bindingEditorTelecommands = computed(() =>
  isMultiEdge.value
    ? (multiEdgeLocalData.value.telecommands ?? [])
    : (data.value.telecommands ?? [])
);

function isAny(...cats: string[]) {
  const category = String(data.value.category ?? "");
  const baseCategory = category.endsWith("_reverse") ? category.slice(0, -8) : category;
  return cats.includes(category) || cats.includes(baseCategory);
}

// ── Data setters ──────────────────────────────────────────────────────────

function set(key: string, value: unknown) {
  if (!props.cell) return;
  // Update local reactive snapshot so template re-renders immediately
  localData.value = { ...localData.value, [key]: value };
  props.cell.setData({ [key]: value }, { overwrite: false });

  // Sync visual attrs for edges
  if (props.cell.isEdge()) {
    if (key === "stroke")      props.cell.attr("line/stroke", value as any);
    if (key === "strokeWidth") props.cell.attr("line/strokeWidth", value as any);
    if (key === "opacity")     props.cell.attr("line/opacity", value as any);
    if (key === "flowActive") {
      if (value) {
        props.cell.attr("line/strokeDasharray", "10 5");
      } else {
        props.cell.attr("line/strokeDasharray", null);
        props.cell.attr("line/strokeDashoffset", null);
      }
    }
    if (key === "labelText")   syncEdgeLabelFromText(props.cell, String(value ?? ""));
    if (key === "sourceMarker") applyEdgeMarkerEnd(props.cell, "source", String(value ?? "none"));
    if (key === "targetMarker") applyEdgeMarkerEnd(props.cell, "target", String(value ?? "classic"));
  }
  // Sync visual attrs for group nodes (built-in rect shape)
  if (props.cell.isNode() && (localData.value.isGroup)) {
    if (key === "fill")        props.cell.attr("body/fill", value as any);
    if (key === "stroke")      props.cell.attr("body/stroke", value as any);
    if (key === "strokeWidth") props.cell.attr("body/strokeWidth", value as any);
    if (key === "name") {
      const isCollapsed = (localData.value.collapsed ?? false);
      props.cell.attr("label/text", (isCollapsed ? `▶ ${value}` : value) as any);
    }
  }

  emit("update", props.cell);
}

function setAll(key: string, value: unknown) {
  const cells = (props.cells ?? []).filter(c => c.isEdge());
  for (const c of cells) {
    c.setData({ [key]: value }, { overwrite: false });
    if (key === "stroke")      c.attr("line/stroke", value as any);
    if (key === "strokeWidth") c.attr("line/strokeWidth", value as any);
    if (key === "opacity")     c.attr("line/opacity", value as any);
    if (key === "flowActive") {
      if (value) {
        c.attr("line/strokeDasharray", "10 5");
      } else {
        c.attr("line/strokeDasharray", null);
        c.attr("line/strokeDashoffset", null);
      }
    }
    if (key === "labelText")   syncEdgeLabelFromText(c, String(value ?? ""));
    if (key === "sourceMarker") applyEdgeMarkerEnd(c, "source", String(value ?? "none"));
    if (key === "targetMarker") applyEdgeMarkerEnd(c, "target", String(value ?? "classic"));
    emit("update", c);
  }
  multiEdgeLocalData.value = { ...multiEdgeLocalData.value, [key]: value };
}

function setAllEdgeRouter(name: string) {
  multiEdgeLocalData.value = { ...multiEdgeLocalData.value, router: name };
  for (const c of (props.cells ?? []).filter(e => e.isEdge())) {
    c.setData({ router: name }, { overwrite: false });
    c.prop("router", edgeRouterProp(name));
    emit("update", c);
  }
}

function setAllEdgeConnector(name: string) {
  multiEdgeLocalData.value = { ...multiEdgeLocalData.value, connector: name };
  for (const c of (props.cells ?? []).filter(e => e.isEdge())) {
    c.setData({ connector: name }, { overwrite: false });
    c.prop("connector", name === "rounded"
      ? { name, args: { radius: 8 } }
      : { name });
    emit("update", c);
  }
}

function setPos(axis: "x" | "y", value: number) {
  if (!props.cell?.isNode()) return;
  const node = props.cell as X6Node;
  node.setPosition({ ...node.getPosition(), [axis]: value });
  emit("update", props.cell);
}

function setSize(dim: "width" | "height", value: number) {
  if (!props.cell?.isNode()) return;
  const node = props.cell as X6Node;
  node.setSize({ ...node.getSize(), [dim]: value });
  emit("update", props.cell);
}

async function fitSvgNode() {
  if (!props.cell?.isNode()) return;
  const node = props.cell as X6Node;
  const markup = String((node.getData() as Record<string, unknown>).svgMarkup ?? "");
  if (!markup) return;
  const { svgMarkup, width, height } = await cropSvgToContent(markup);
  node.setData({ svgMarkup }, { overwrite: false });
  node.setSize({ width, height });
  emit("update", props.cell);
}

function sendSvgToBack() {
  if (!props.cell?.isNode()) return;
  (props.cell as X6Node).toBack();
}

function setEdgeRouter(name: string) {
  if (!props.cell?.isEdge()) return;
  localData.value = { ...localData.value, router: name };
  props.cell.setData({ router: name }, { overwrite: false });
  props.cell.prop("router", edgeRouterProp(name));
  emit("update", props.cell);
}

function setEdgeConnector(name: string) {
  if (!props.cell?.isEdge()) return;
  localData.value = { ...localData.value, connector: name };
  props.cell.setData({ connector: name }, { overwrite: false });
  props.cell.prop("connector", name === "rounded"
    ? { name, args: { radius: 8 } }
    : { name });
  emit("update", props.cell);
}

// ── Bindings ──────────────────────────────────────────────────────────────

function removeBinding(idx: number) {
  const bindings = [...(data.value.telemetryBindings ?? [])];
  bindings.splice(idx, 1);
  set("telemetryBindings", bindings);
}

function removeBindingMulti(idx: number) {
  const bindings = [...(multiEdgeLocalData.value.telemetryBindings ?? [])];
  bindings.splice(idx, 1);
  applyBindingsToAllEdges(bindings);
}

/** Copy the same binding definitions to every selected edge (independent clones per edge). */
function applyBindingsToAllEdges(bindings: TelemetryBinding[]) {
  const snapshot = JSON.parse(JSON.stringify(bindings)) as TelemetryBinding[];
  multiEdgeLocalData.value = { ...multiEdgeLocalData.value, telemetryBindings: snapshot };
  for (const c of (props.cells ?? []).filter(e => e.isEdge())) {
    const perEdge = JSON.parse(JSON.stringify(bindings)) as TelemetryBinding[];
    c.setData({ telemetryBindings: perEdge }, { overwrite: false });
    emit("update", c);
  }
}

function onBindingsUpdate(bindings: TelemetryBinding[]) {
  if (isMultiEdge.value) {
    applyBindingsToAllEdges(bindings);
    return;
  }
  set("telemetryBindings", bindings);
}

function onCurrentColorRulesUpdate(rules: Array<{ op: string; threshold: number | string; color: string }>) {
  const cat = data.value.category as string;
  if (cat === "NumericDisplay") set("indicatorColorRules", rules);
  else set("currentColorRules", rules);
}

function onBorderColorRulesUpdate(rules: Array<{ op: string; threshold: number | string; color: string }>) {
  set("borderColorRules", rules);
}

function onHoverMnemonicsUpdate(mnemonics: string[]) {
  if (isMultiEdge.value) {
    const copy = [...mnemonics];
    multiEdgeLocalData.value = { ...multiEdgeLocalData.value, hoverMnemonics: copy };
    for (const c of (props.cells ?? []).filter(e => e.isEdge())) {
      c.setData({ hoverMnemonics: [...copy] }, { overwrite: false });
      emit("update", c);
    }
    return;
  }
  set("hoverMnemonics", mnemonics);
}

function onDataGridRowsUpdate(rows: DataGridRow[]) {
  // Rows update from the binding editor's DataGrid guided tab.
  // The editor also emits update:bindings with the recomputed auto-bindings,
  // but we still set rows here so node data stays in sync.
  set("rows", rows);
  set("telemetryBindings", buildDataGridBindings(rows, data.value.telemetryBindings ?? []));
}

function onTelecommandsUpdate(telecommands: string[]) {
  if (isMultiEdge.value) {
    const copy = [...telecommands];
    multiEdgeLocalData.value = { ...multiEdgeLocalData.value, telecommands: copy };
    for (const c of (props.cells ?? []).filter(e => e.isEdge())) {
      c.setData({ telecommands: [...copy] }, { overwrite: false });
      emit("update", c);
    }
    return;
  }
  set("telecommands", telecommands);
}

defineExpose({ openBindingEditor: () => { showEditor.value = true; } });
</script>

<style scoped>
.inspector {
  width: 230px; flex-shrink: 0;
  background: #161b22; border-left: 1px solid #30363d;
  display: flex; flex-direction: column; overflow: hidden;
}

/* Badge slot next to gateway header — slot content is compiled here */
.inspector-type {
  font-size: 9px; background: rgba(74,158,255,0.15); color: #4a9eff;
  border: 1px solid rgba(74,158,255,0.3); border-radius: 6px; padding: 1px 6px;
  font-weight: 700; letter-spacing: 0;
}

.inspector-body { flex: 1; overflow-y: auto; padding-bottom: 1rem; }
.inspector-body::-webkit-scrollbar { width: 4px; }
.inspector-body::-webkit-scrollbar-thumb { background: #30363d; border-radius: 2px; }

/* Shared form look for palette slices (child SFC roots use :deep) */
.inspector :deep(.section) { padding: 9px 12px; border-bottom: 1px solid #21262d; }
.inspector :deep(.section-title) {
  font-size: 10px; font-weight: 700; color: #8b949e;
  text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 7px;
}

.inspector :deep(.field) {
  display: flex; flex-direction: column; gap: 2px; margin-bottom: 6px;
}
.inspector :deep(.field > span), .inspector :deep(.field > label > span) {
  font-size: 10px; color: #8b949e; text-transform: uppercase; letter-spacing: 0.04em;
}
.inspector :deep(.field-row) { display: flex; gap: 6px; }
.inspector :deep(.field.half) { flex: 1; }
.inspector :deep(.field-hint-svg) {
  font-size: 10px; color: #8b949e; line-height: 1.35; margin: -2px 0 8px;
}
.inspector :deep(.field-hint-svg code) { font-size: 10px; color: #4a9eff; }
.inspector :deep(.field-hint) {
  font-size: 10px; color: #8b949e; line-height: 1.35; margin: 4px 0 0;
}

.inspector :deep(.input) {
  background: #0d1117; border: 1px solid #30363d; border-radius: 4px;
  color: #c9d1d9; font-size: 12px; padding: 4px 7px; width: 100%; outline: none;
}
.inspector :deep(.input:focus) { border-color: #4a9eff; }
.inspector :deep(.input:disabled) { opacity: 0.5; }

.inspector :deep(.color-row) { display: flex; gap: 5px; align-items: center; }
.inspector :deep(.color-picker) { width: 28px; height: 26px; padding: 0; border: 1px solid #30363d; border-radius: 4px; cursor: pointer; flex-shrink: 0; }

.inspector :deep(.slider-row) { display: flex; align-items: center; gap: 6px; }
.inspector :deep(.slider) { flex: 1; accent-color: #4a9eff; }
.inspector :deep(.slider-val) { font-size: 11px; color: #8b949e; min-width: 36px; text-align: right; }

.inspector :deep(.toggle-row) { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
.inspector :deep(.toggle-switch) { position: relative; display: inline-block; width: 32px; height: 18px; flex-shrink: 0; }
.inspector :deep(.toggle-switch input) { opacity: 0; width: 0; height: 0; }
.inspector :deep(.toggle-knob) {
  position: absolute; inset: 0; background: #30363d; border-radius: 10px; cursor: pointer;
  transition: background 0.2s;
}
.inspector :deep(.toggle-knob::before) {
  content: ''; position: absolute; width: 12px; height: 12px;
  left: 3px; top: 3px; background: #fff; border-radius: 50%; transition: transform 0.2s;
}
.inspector :deep(.toggle-switch input:checked + .toggle-knob) { background: #27ae60; }
.inspector :deep(.toggle-switch input:checked + .toggle-knob::before) { transform: translateX(14px); }
.inspector :deep(.toggle-label) { font-size: 11px; color: #8b949e; }

.inspector :deep(.dir-btn-group) { display: flex; gap: 4px; }
.inspector :deep(.dir-btn) {
  flex: 1; padding: 4px 6px; background: #0d1117; color: #8b949e;
  border: 1px solid #30363d; border-radius: 4px; font-size: 10px; cursor: pointer;
}
.inspector :deep(.dir-btn.active) { background: rgba(74,158,255,0.15); color: #4a9eff; border-color: rgba(74,158,255,0.4); }

.inspector :deep(.binding-list) { display: flex; flex-direction: column; gap: 3px; margin-bottom: 7px; }
.inspector :deep(.binding-chip) {
  display: flex; align-items: center; gap: 5px;
  padding: 4px 6px; background: #0d1117; border-radius: 4px; border: 1px solid #21262d;
}
.inspector :deep(.chip-badge) {
  font-size: 9px; border-radius: 6px; padding: 1px 5px; font-weight: 700; flex-shrink: 0;
}
.inspector :deep(.chip-rule)   { background: rgba(74,158,255,0.2); color: #4a9eff; border: 1px solid rgba(74,158,255,0.3); }
.inspector :deep(.chip-script) { background: rgba(243,156,18,0.2); color: #f39c12; border: 1px solid rgba(243,156,18,0.3); }
.inspector :deep(.chip-preview) {
  flex: 1; font-size: 10px; font-family: monospace; color: #8b949e;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.inspector :deep(.chip-del) { background: none; border: none; color: #555; cursor: pointer; font-size: 11px; flex-shrink: 0; padding: 0 2px; }
.inspector :deep(.chip-del:hover) { color: #e74c3c; }
.inspector :deep(.binding-empty) { font-size: 11px; color: #4a5568; font-style: italic; padding: 2px 0; }

.inspector :deep(.btn-manage) {
  width: 100%; padding: 6px;
  background: rgba(74,158,255,0.12); color: #4a9eff;
  border: 1px solid rgba(74,158,255,0.3); border-radius: 5px;
  font-size: 11px; font-weight: 600; cursor: pointer;
}
.inspector :deep(.btn-manage:hover) { background: rgba(74,158,255,0.22); }
</style>
