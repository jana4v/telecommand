/**
 * X6NatsTelemetry — NATS telemetry engine for AntV X6 diagrams.
 *
 * Adapted from the legacy telemetry implementation:
 *  - GoJS `diagram.model.setDataProperty()` → X6 `cell.setData()`
 *  - Vue SFCs auto-react to setData() via useCell() composable
 *
 * Smooth animation: all numeric AND color properties tween from current → target
 * over TWEEN_MS milliseconds using an easeOutCubic curve.
 * Colors interpolate per RGB channel (R, G, B independently).
 * Text and boolean/visibility props apply instantly.
 */

import type { Graph, Node, Edge } from "@antv/x6";
import type { NatsConfig, NatsTelemetryStream, TelemetryBinding } from "../types";
import { DEFAULT_TELEMETRY_STREAMS } from "../types";
import { applyEdgeVisualsFromData } from "../graph/edgeVisuals";
import { loadMnemonics, mapTelemetryKeys, telemetryKeyAliases } from "../services/mnemonicStore";
import { clearTelemetryStore, setTelemetryValue } from "./telemetryStore";
import { buildFullTMAccessor, buildStreamTMAccessor } from "./tmAccessor";
import { getSharedNatsHub } from "./natsSharedHub";

function logNatsInbound(_kind: string, _subject: string, _payloadText: string) {
  // telemetry logging suppressed in production
}

// ── Property type coercion maps ───────────────────────────────────────────

const COLOR_PROPS   = new Set(["statusColor", "stroke", "fill", "innerBorderColor"]);
const NUMERIC_PROPS = new Set(["level", "gaugeValue", "gaugeMin", "gaugeMax", "wheelSpeed",
  "wheelDirection", "chargeLevel", "opacity", "thrustLevel",
  "strokeWidth", "fontSize", "position",
  // Geometric — numeric values applied via X6 model methods
  "x", "y", "width", "height", "angle"]);
const BOOLEAN_PROPS = new Set(["flowActive", "isCharging", "oxidizerEnabled",
  "fuelEnabled", "isInvalid", "isLocked", "alarm", "visible"]);

/** Edge-only string props (labels / marker names from TM). */
const EDGE_STRING_PROPS = new Set(["labelText", "sourceMarker", "targetMarker"]);

// Literal TM key references inside scripts, e.g. TM["CAS00025"] or TM['CAS00025_XXX'].
const TM_REF_ANY_RE = /TM\[\s*["']([^"']+)["']\s*\]/g;
// Dynamic TM access, e.g. TM[someVar] / TM[a+b] (cannot be statically indexed).
const TM_DYNAMIC_RE = /TM\[\s*[^"'\]\s]/;

// Props that are X6 model-level (not stored in node.data) — applied via dedicated methods
const GEO_PROPS = new Set(["x", "y", "width", "height", "angle", "visible"]);

// Geometric props where TM value is an OFFSET added to the designed (base) value.
// e.g. element at x=200, TM=50 → actual x=250. Captures designed position on start().
const GEO_OFFSET_PROPS = new Set(["x", "y", "width", "height", "angle"]);

// ── Lightweight tweener ───────────────────────────────────────────────────

const TWEEN_MS = 500;
// Under high telemetry rates, per-prop tweening can overwhelm the UI thread.
// Keep value updates immediate for responsiveness.
const ENABLE_NUMERIC_TWEENS = false;
// Geometry updates (x/y/width/height/angle) force X6 rerouting/repaint work and
// can make the viewer unresponsive on dense diagrams. Keep disabled for live TM.
const ENABLE_GEO_TELEMETRY = false;
// Max time spent applying dirty node/edge bindings per animation-frame flush.
const BIND_FLUSH_BUDGET_MS = 6;
const EDGE_BUDGET_RATIO = 0.4;

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

interface Tween {
  from:      number;
  to:        number;
  startTime: number;
  onUpdate:  (v: number) => void;
}

// ── Color interpolation (RGB per-channel) ─────────────────────────────────


// Momentum wheel: full 360° in this many seconds at speed=6000 RPM
const WHEEL_DEG_PER_RPM = 360 / 6000;
// Battery charge animation: 0→100 in this many seconds
const BATTERY_ANIM_SPEED = 30; // % per second

// ── CSS flow animation (injected once into <head>) ────────────────────────
// Uses stroke-dashoffset CSS animation — runs on the compositor, zero JS
// per frame, perfectly smooth regardless of CPU load.
// Pattern: "8 4" = 8px dash + 4px gap = 12px repeat.
// Duration 0.4s → 30px/s apparent flow speed.
function ensureFlowStyles() {
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

export class X6NatsTelemetry {
  private hubDetach: (() => void) | null = null;
  private liveConnection = false;
  private graph:       Graph;
  private config:      NatsConfig;
  /** Resolved stream definitions (never empty) */
  private streams:     NatsTelemetryStream[];
  private animFrame:   number | null = null;
  private lastFrameMs: number = 0;
  private tmStore:     Map<string, unknown> = new Map();

  // key = `${cellId}:${prop}`
  private tweens:       Map<string, Tween>      = new Map();
  // tracks which edges have CSS flow active and their last direction
  private flowingEdges: Map<string, number>     = new Map();
  // designed (base) values for GEO_OFFSET_PROPS — captured before first telemetry
  private baseValues:   Map<string, number>     = new Map();
  // nodes that need per-frame dt animation (MomentumWheel, Battery) — updated by events
  private animatingNodeIds: Set<string>         = new Set();

  // ── Per-message coalescing & change tracking ──────────────────────────────
  // Reverse index: bare param key → ids of cells that bind it. Built on start()
  // and rebind(). Lets an incoming message touch only the cells whose params
  // actually changed instead of re-evaluating the whole graph.
  private keyToNodeIds:  Map<string, Set<string>> = new Map();
  private keyToEdgeIds:  Map<string, Set<string>> = new Map();
  // Cells whose bindings include a __multi__ script: scripts read arbitrary TM
  // keys so their inputs aren't statically knowable — re-evaluate on any message.
  private scriptNodeIds: Set<string> = new Set();
  private scriptEdgeIds: Set<string> = new Set();
  // Dirty cells accumulated since the last animation-frame flush.
  private dirtyNodeIds:  Set<string> = new Set();
  private dirtyEdgeIds:  Set<string> = new Set();
  // When true the next flush re-binds the entire graph (used on first snapshot).
  private allCellsDirty = false;
  // Handle for the pending coalesced flush (one per animation frame at most).
  private bindFlushRaf: number | null = null;
  // Monotonic token used to cancel stale async connect/monitor tasks.
  private connectionToken = 0;
  // Lightweight runtime counters for diagnosing "receiving but not updating".
  private debugMessages = 0;
  private debugFlushes = 0;
  private debugAppliedNodes = 0;
  private debugAppliedEdges = 0;
  private debugChangedWrites = 0;
  private debugLastChangedInMessage = 0;
  private debugLastIncomingKeys: string[] = [];

  onConnectionChange?:  (connected: boolean) => void;
  onHeartbeat?:         (status: string) => void;
  /** Fired whenever a TM message is received on a named stream subject. */
  onStreamActivity?:    (streamId: string) => void;

  constructor(graph: Graph, config: NatsConfig) {
    this.graph  = graph;
    this.config = config;
    this.streams = config.streams?.length ? config.streams : DEFAULT_TELEMETRY_STREAMS;
  }

  // ── Public ──────────────────────────────────────────────────────────────

  start() {
    void this.connectNats();

    ensureFlowStyles();
    this.captureGeoBaseValues(); // snapshot designed positions before telemetry
    this.rebuildBindingIndex();  // param-key → cell index for per-message dirty tracking
    this.wireNodeAnimEvents();
    this.wireEdgeFlowEvents();
    this.startAnimationLoop();

    // Defer initial edge-flow setup by one rAF so the graph SVG has fully
    // painted before we batch-write animation attrs. Spreading past the load
    // frame prevents N simultaneous edge.attr() calls causing a jank spike.
    requestAnimationFrame(() => this.initEdgeFlowAnimations());
  }

  /** True while a live NATS connection is held. */
  get isLive(): boolean {
    return this.liveConnection;
  }

  /**
   * Re-bind to the graph after its cells have been replaced (e.g. an auto-view
   * diagram switch on a reused graph instance) WITHOUT tearing down the NATS
   * connection. The WebSocket and all subscriptions stay open; only the
   * graph-derived animation state is rebuilt and the latest telemetry snapshot
   * is re-applied to the new cells. This avoids a connect/disconnect (and the
   * accompanying 101 handshake) on every diagram hop.
   *
   * The graph instance itself is unchanged across hops (X6Canvas is not
   * remounted — loadDiagramIntoGraph calls g.fromJSON to swap cells), so the
   * graph-level event listeners wired in start() remain valid and are NOT
   * re-registered here.
   */
  rebind() {
    // Drop animation/tween state tied to the previous diagram's cells.
    this.tweens.clear();
    this.flowingEdges.clear();
    this.baseValues.clear();
    this.animatingNodeIds.clear();

    // Rebuild graph-derived state for the freshly-loaded cells.
    this.captureGeoBaseValues();
    this.rebuildBindingIndex();
    this.graph.getNodes().forEach(n => {
      if (this.nodeNeedsAnim(n.getData() as any)) this.animatingNodeIds.add(n.id);
    });

    // Re-apply the most recent telemetry we've already received so the new
    // diagram shows live values immediately instead of waiting for the next
    // message.
    this.applyBindingsToGraph();

    // Resume per-frame animation if it had idle-paused, and re-init edge flow
    // one rAF later so the new SVG has painted.
    if (this.animFrame === null) this.startAnimationLoop();
    requestAnimationFrame(() => this.initEdgeFlowAnimations());
  }

  private async connectNats() {
    const token = ++this.connectionToken;
    const { serverUrl, username, password } = this.config;
    if (!serverUrl.trim()) return;

    if (this.hubDetach) return;

    // Kick off mnemonic loading without blocking the NATS connection.
    // ViewerPage already fires loadMnemonics() before calling start(); if mnemonics
    // aren't ready by the time the first message arrives the raw key is stored and
    // subsequent messages will carry the mapped key — no data is permanently lost.
    void loadMnemonics().catch(() => {});

    try {
      const detach = await getSharedNatsHub().attach(
        {
          serverUrl,
          prefix: this.config.prefix,
          username: username || undefined,
          password: password || undefined,
          streams: this.streams,
        },
        {
          onMessage: (subject, payloadText) => {
            if (token !== this.connectionToken) return;
            this.handleMessage(subject, payloadText);
          },
          onConnection: (connected) => {
            if (token !== this.connectionToken) return;
            this.liveConnection = connected;
            this.onConnectionChange?.(connected);
          },
        },
      );

      if (token !== this.connectionToken) {
        detach();
        return;
      }

      this.hubDetach = detach;
    } catch (e) {
      console.warn("[X6NatsTelemetry] connect failed:", e);
      this.liveConnection = false;
      this.onConnectionChange?.(false);
    }
  }

  private subject(prefix: string, suffix: string): string {
    if (!prefix) return suffix;
    return `${prefix}.${suffix}`;
  }

  /**
   * Ensure each /full snapshot suffix also has its live update suffix.
   * This prevents "snapshot-only" behavior when a stream is configured
   * with /full but missing the corresponding non-/full subject.
   */
  private expandedStreamSuffixes(stream: NatsTelemetryStream): string[] {
    const out = new Set<string>();
    for (const raw of stream.subjectSuffixes ?? []) {
      const suffix = raw.trim();
      if (!suffix) continue;
      out.add(suffix);
      if (suffix.endsWith("/full")) {
        const live = suffix.slice(0, -"/full".length);
        if (live) out.add(live);
      }
    }
    return Array.from(out);
  }

  /** Match incoming NATS subject to a configured stream id (longest suffix wins). */
  private resolveStreamId(topic: string): string | null {
    const prefix = this.config.prefix.trim();
    const candidates: { streamId: string; full: string }[] = [];
    for (const s of this.streams) {
      for (const suffix of this.expandedStreamSuffixes(s)) {
        candidates.push({ streamId: s.id, full: this.subject(prefix, suffix) });
      }
    }
    candidates.sort((a, b) => b.full.length - a.full.length);
    for (const c of candidates) {
      if (topic === c.full) return c.streamId;
    }
    return null;
  }

  private ingestMapIntoStore(streamId: string, map: Record<string, unknown>) {
    let changedInMessage = 0;
    for (const [k, v] of Object.entries(map)) {
      const scoped = `${streamId}::${k}`;
      const prevScoped = this.tmStore.get(scoped);
      if (prevScoped !== v) changedInMessage++;
      this.tmStore.set(scoped, v);
      setTelemetryValue(scoped, v);
      if (streamId === "default") {
        const prevFlat = this.tmStore.get(k);
        if (prevFlat !== v) changedInMessage++;
        this.tmStore.set(k, v);
        setTelemetryValue(k, v);
      }
    }
    this.debugChangedWrites += changedInMessage;
    this.debugLastChangedInMessage = changedInMessage;
  }

  private publishDebug() {
    if (typeof window === "undefined") return;
    (window as unknown as { __spasdacsTmDebug?: Record<string, unknown> }).__spasdacsTmDebug = {
      messages: this.debugMessages,
      flushes: this.debugFlushes,
      appliedNodes: this.debugAppliedNodes,
      appliedEdges: this.debugAppliedEdges,
      changedWrites: this.debugChangedWrites,
      lastChangedInMessage: this.debugLastChangedInMessage,
      lastIncomingKeys: this.debugLastIncomingKeys,
      dirtyNodes: this.dirtyNodeIds.size,
      dirtyEdges: this.dirtyEdgeIds.size,
      connected: this.liveConnection,
      streams: this.streams.map((s) => ({ id: s.id, suffixes: this.expandedStreamSuffixes(s) })),
      lastUpdateMs: Date.now(),
    };
  }

  /**
   * TM for transforms / rules / __multi__ scripts.
   * If `sourceStreamId` is set (including guided Simple), TM is narrowed to that stream so `TM.MNEMONIC` works.
   * If omitted (legacy), full multi-stream TM (`TM.streams.*`, default mnemonics at top level).
   */
  private tmForBinding(binding: TelemetryBinding): Record<string, unknown> {
    const flat = Object.fromEntries(this.tmStore);
    const sid = binding.sourceStreamId?.trim();
    if (!sid || sid === "default") return buildFullTMAccessor(flat);
    return buildStreamTMAccessor(flat, sid);
  }

  private lookupRawValue(binding: TelemetryBinding): unknown {
    const aliases = telemetryKeyAliases(binding.topic);
    if (!aliases.length) return undefined;
    const sid = binding.sourceStreamId?.trim();

    const lookup = (key: string): unknown => {
      if (!sid) {
        const scoped = this.tmStore.get(`default::${key}`);
        if (scoped !== undefined) return scoped;
        return this.tmStore.get(key);
      }
      if (sid === "default") {
        return this.tmStore.get(`default::${key}`) ?? this.tmStore.get(key);
      }
      return this.tmStore.get(`${sid}::${key}`);
    };

    for (const key of aliases) {
      const value = lookup(key);
      if (value !== undefined) return value;
    }
    return undefined;
  }

  private handleMessage(topic: string, payloadText: string) {
    try {
      if (topic.endsWith(".heartbeat")) {
        logNatsInbound("heartbeat", topic, payloadText);
        const text = payloadText;
        this.onHeartbeat?.(text === "1" || text.toLowerCase() === "ok" ? "OK" : text);
        return;
      }

      logNatsInbound("telemetry", topic, payloadText);

      // Payload is a JSON array of single-key objects
      //   e.g. [{"TEMP":"47.3"},{"PRESS":"1013"},{"STATUS":"OK"}]
      // Also accept plain object for backward compat / other sources.
      const parsed = JSON.parse(payloadText);
      let map: Record<string, unknown>;
      if (Array.isArray(parsed)) {
        map = {};
        for (const item of parsed) Object.assign(map, item);
      } else {
        map = parsed as Record<string, unknown>;
      }
      map = mapTelemetryKeys(map);
      const streamId = this.resolveStreamId(topic);
      if (!streamId) {
        console.warn("[X6NatsTelemetry] unknown subject (no matching stream):", topic);
        return;
      }
      this.onStreamActivity?.(streamId);
      this.ingestMapIntoStore(streamId, map);
      this.debugMessages++;
      this.debugLastIncomingKeys = Object.keys(map).slice(0, 24);
      // Coalesce: mark only the cells whose params changed, then flush once per
      // animation frame instead of re-binding the whole graph on every message.
      this.markDirtyForKeys(Object.keys(map));
      this.publishDebug();
      this.scheduleBindFlush();
    } catch (e) {
      console.warn("[NATS] parse error on", topic, e, payloadText.slice(0, 500));
    }
  }

  stop() {
    this.connectionToken++;
    if (this.hubDetach) {
      this.hubDetach();
      this.hubDetach = null;
    }
    this.liveConnection = false;
    this.stopAnimationLoop();
    if (this.bindFlushRaf !== null) {
      cancelAnimationFrame(this.bindFlushRaf);
      this.bindFlushRaf = null;
    }
    this.dirtyNodeIds.clear();
    this.dirtyEdgeIds.clear();
    this.tweens.clear();
    // Remove CSS flow animation from all currently flowing edges
    for (const [id] of this.flowingEdges) {
      const edge = this.graph.getCellById(id);
      if (edge?.isEdge()) {
        edge.attr("line/style", "");
        edge.attr("line/strokeDasharray", "");
      }
    }
      this.flowingEdges.clear();
    this.baseValues.clear();
    this.tmStore.clear();
    clearTelemetryStore();
    this.onConnectionChange?.(false);
  }

  // ── Value application ────────────────────────────────────────────────────

  applyBindingsToGraph() {
    this.graph.getNodes().forEach(node => this.applyBindingsToNode(node));
    this.graph.getEdges().forEach(edge => this.applyBindingsToEdge(edge));
  }

  /**
   * Apply telemetry bindings to a single node. Extracted from
   * applyBindingsToGraph so a coalesced per-message flush can update only the
   * nodes whose bound params changed, instead of walking the whole graph on
   * every message.
   */
  private applyBindingsToNode(node: Node) {
      const data: any = node.getData() ?? {};
      const bindings: TelemetryBinding[] = data.telemetryBindings ?? [];
      if (!bindings.length) return;

      const instant: Record<string, unknown> = {};
      const numeric: Record<string, number>  = {};

      const svgInstant: Array<{ elId: string; prop: string; value: unknown }> = [];
      const svgNumeric: Array<{ elId: string; prop: string; value: number }> = [];

      for (const binding of bindings) {
        // __multi__ scripts read TM (full or narrowed by sourceStreamId)
        if (binding.targetProp === "__multi__" && binding.script) {
          try {
            const TM = this.tmForBinding(binding);
            const normalizedScript = binding.script.replace(/TM\[\s*["']\s*["']\s*\]/g, "null");
            const fn = new Function("TM", "number", `"use strict"; ${normalizedScript}`);
            const result = fn(TM, Number);
            if (result && typeof result === "object") {
              const res = result as Record<string, unknown>;

              // Backward-compat shim: Indicator scripts saved before the
              // indicatorValue field was added to the template only return
              // statusColor. Colour conditions in the node need the raw state
              // value to match against. Extract it from the script text so
              // old bindings work without requiring a re-save.
              if (!("indicatorValue" in res) && data.category === "Indicator") {
                const m = normalizedScript.match(
                  /let\s+state\s*=\s*TM\[\s*["']([^"']+)["']\s*\]/
                );
                if (m) {
                  const raw = (TM as Record<string, unknown>)[m[1]];
                  if (raw !== undefined) res.indicatorValue = raw;
                }
              }

              for (const [k, v] of Object.entries(res)) {
                if (NUMERIC_PROPS.has(k)) numeric[k] = Number(v);
                else                      instant[k] = v;
              }
            }
          } catch (e) {
            console.warn("[X6NatsTelemetry] script error:", e);
          }
          continue;
        }

        const rawValue = this.lookupRawValue(binding);
        if (rawValue === undefined) continue;

        const transformed = this.applyTransform(rawValue, binding);
        if (transformed === undefined) continue;

        const prop    = binding.targetProp;
        const coerced = this.coerce(prop, transformed);

        if (binding.svgElementId) {
          if (NUMERIC_PROPS.has(prop)) {
            svgNumeric.push({ elId: binding.svgElementId, prop, value: Number(coerced) });
          } else {
            svgInstant.push({ elId: binding.svgElementId, prop, value: coerced });
          }
          continue;
        }

        if (NUMERIC_PROPS.has(prop)) numeric[prop] = Number(coerced);
        else                         instant[prop] = coerced;
      }

      if (svgInstant.length) {
        const dataAny = node.getData() as any;
        const ov: Record<string, Record<string, unknown>> = { ...(dataAny.svgOverrides ?? {}) };
        let svgChanged = false;
        for (const p of svgInstant) {
          const current = ov[p.elId]?.[p.prop];
          if (current === p.value) continue;
          ov[p.elId] = { ...(ov[p.elId] ?? {}), [p.prop]: p.value };
          svgChanged = true;
        }
        if (svgChanged) node.setData({ svgOverrides: ov }, { overwrite: false });
      }
      for (const p of svgNumeric) {
        this.tweenSvgOverrideProp(node, p.elId, p.prop, p.value);
      }

      // Apply instant props (colors, text, booleans, visibility)
      const instGeo:  Record<string, unknown> = {};
      const instData: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(instant)) {
        if (GEO_PROPS.has(k)) instGeo[k]  = v;
        else                   instData[k] = v;
      }
      this.applyGeoInstant(node, instGeo);
      if (Object.keys(instData).length) {
        const currentData: Record<string, unknown> = (node.getData() as Record<string, unknown>) ?? {};
        const changedData: Record<string, unknown> = {};
        for (const [k, v] of Object.entries(instData)) {
          if (currentData[k] !== v) changedData[k] = v;
        }
        if (Object.keys(changedData).length) {
          node.setData(changedData, { overwrite: false });
          // Keep generic X6 attrs in sync for shapes that render from attrs.
          this.applyNodeVisualAttrs(node, changedData);
        }
      }

      // Tween numeric props
      for (const [prop, target] of Object.entries(numeric)) {
        if (!ENABLE_GEO_TELEMETRY && GEO_PROPS.has(prop)) continue;
        this.tweenNodeProp(node, prop, target);
      }
  }

  /** Apply telemetry bindings to a single edge. */
  private applyBindingsToEdge(edge: Edge) {
      const data: any = edge.getData() ?? {};
      const bindings: TelemetryBinding[] = data.telemetryBindings ?? [];
      if (!bindings.length) return;

      const instant: Record<string, unknown> = {};
      const numeric: Record<string, number>  = {};

      for (const binding of bindings) {
        if (binding.targetProp === "__multi__" && binding.script) {
          try {
            const TM = this.tmForBinding(binding);
            const normalizedScript = binding.script.replace(/TM\[\s*["']\s*["']\s*\]/g, "null");
            const fn = new Function("TM", "number", `"use strict"; ${normalizedScript}`);
            const result = fn(TM, Number);
            if (result && typeof result === "object") {
              for (const [k, v] of Object.entries(result as Record<string, unknown>)) {
                if (NUMERIC_PROPS.has(k)) numeric[k] = Number(v);
                else                      instant[k] = v;
              }
            }
          } catch (e) {
            console.warn("[X6NatsTelemetry] edge script error:", e);
          }
          continue;
        }
        const raw = this.lookupRawValue(binding);
        if (raw === undefined) continue;
        const transformed = this.applyTransform(raw, binding);
        if (transformed === undefined) continue;
        const prop    = binding.targetProp;
        const coerced = this.coerce(prop, transformed);
        if (NUMERIC_PROPS.has(prop)) numeric[prop] = Number(coerced);
        else                         instant[prop]  = coerced;
      }

      let edgeDataChanged = false;
      let edgeVisualFieldsChanged = false;
      if (Object.keys(instant).length) {
        const currentData: Record<string, unknown> = (edge.getData() as Record<string, unknown>) ?? {};
        const changedData: Record<string, unknown> = {};
        for (const [k, v] of Object.entries(instant)) {
          if (currentData[k] !== v) changedData[k] = v;
        }
        if (Object.keys(changedData).length) {
          edge.setData(changedData, { overwrite: false });
          edgeDataChanged = true;
          edgeVisualFieldsChanged =
            changedData.stroke !== undefined ||
            changedData.strokeWidth !== undefined ||
            changedData.opacity !== undefined ||
            changedData.sourceMarker !== undefined ||
            changedData.targetMarker !== undefined ||
            changedData.labelText !== undefined;
        }
      }
      if (instant.visible !== undefined) edge.setVisible(Boolean(instant.visible));
      if (edgeDataChanged && edgeVisualFieldsChanged) {
        applyEdgeVisualsFromData(edge, { ...(edge.getData() as Record<string, unknown>) });
      }

      for (const [prop, target] of Object.entries(numeric)) {
        this.tweenEdgeProp(edge, prop, target);
      }
  }

  // ── Per-message coalescing & change tracking ──────────────────────────────

  /**
   * (Re)build the param-key → cell index from the current graph. The index keys
   * are the same alias forms lookupRawValue() uses, so an incoming message key
   * that matches marks exactly the cells that bind it. Over-marking (e.g. across
   * streams that share a bare key) is safe — it only re-evaluates a cell whose
   * scoped value may not have changed. Under-marking is what we must avoid, hence
   * script-bound cells are tracked separately and always re-evaluated.
   */
  private rebuildBindingIndex() {
    this.keyToNodeIds.clear();
    this.keyToEdgeIds.clear();
    this.scriptNodeIds.clear();
    this.scriptEdgeIds.clear();
    this.dirtyNodeIds.clear();
    this.dirtyEdgeIds.clear();

    const indexCell = (
      id: string,
      bindings: TelemetryBinding[],
      keyMap: Map<string, Set<string>>,
      scriptSet: Set<string>,
    ) => {
      const addIndexedKey = (key: string) => {
        let set = keyMap.get(key);
        if (!set) { set = new Set(); keyMap.set(key, set); }
        set.add(id);
      };

      for (const b of bindings) {
        if (b.targetProp === "__multi__" && b.script) {
          const script = b.script;
          let hadLiteralRef = false;
          for (const m of script.matchAll(TM_REF_ANY_RE)) {
            const ref = (m[1] ?? "").trim();
            if (!ref) continue;
            hadLiteralRef = true;
            for (const key of telemetryKeyAliases(ref)) addIndexedKey(key);
          }
          // Keep always-dirty fallback only for dynamic/unknown TM access.
          if (TM_DYNAMIC_RE.test(script) || !hadLiteralRef) {
            scriptSet.add(id);
          }
          continue;
        }
        for (const key of telemetryKeyAliases(b.topic)) {
          addIndexedKey(key);
        }
      }
    };

    this.graph.getNodes().forEach(n => {
      const bindings: TelemetryBinding[] = (n.getData() as any)?.telemetryBindings ?? [];
      if (bindings.length) indexCell(n.id, bindings, this.keyToNodeIds, this.scriptNodeIds);
    });
    this.graph.getEdges().forEach(e => {
      const bindings: TelemetryBinding[] = (e.getData() as any)?.telemetryBindings ?? [];
      if (bindings.length) indexCell(e.id, bindings, this.keyToEdgeIds, this.scriptEdgeIds);
    });
  }

  /** Mark cells affected by the given incoming param keys (plus all script cells). */
  private markDirtyForKeys(keys: string[]) {
    for (const key of keys) {
      const nodes = this.keyToNodeIds.get(key);
      if (nodes) for (const id of nodes) this.dirtyNodeIds.add(id);
      const edges = this.keyToEdgeIds.get(key);
      if (edges) for (const id of edges) this.dirtyEdgeIds.add(id);
    }
    // Script-driven cells read arbitrary keys → always re-evaluate them.
    for (const id of this.scriptNodeIds) this.dirtyNodeIds.add(id);
    for (const id of this.scriptEdgeIds) this.dirtyEdgeIds.add(id);
  }

  /**
   * Schedule a single binding flush on the next animation frame. Many messages
   * arriving within one frame collapse into ONE graph update, capping the
   * expensive re-bind work at ~display refresh rate regardless of message rate.
   */
  private scheduleBindFlush() {
    if (this.bindFlushRaf !== null) return;
    this.bindFlushRaf = requestAnimationFrame(() => {
      this.bindFlushRaf = null;
      this.flushBindings();
    });
  }

  /** Apply pending dirty cells (or the whole graph if a full re-bind is queued). */
  private flushBindings() {
    this.debugFlushes++;
    if (this.allCellsDirty) {
      this.allCellsDirty = false;
      this.dirtyNodeIds.clear();
      this.dirtyEdgeIds.clear();
      this.applyBindingsToGraph();
      this.publishDebug();
      return;
    }
    const startedAt = performance.now();
    const edgeBudgetMs = this.dirtyEdgeIds.size ? BIND_FLUSH_BUDGET_MS * EDGE_BUDGET_RATIO : 0;
    const nodeBudgetMs = BIND_FLUSH_BUDGET_MS - edgeBudgetMs;

    if (this.dirtyNodeIds.size) {
      for (const id of this.dirtyNodeIds) {
        const node = this.graph.getCellById(id);
        if (node?.isNode()) {
          this.applyBindingsToNode(node);
          this.debugAppliedNodes++;
        }
        this.dirtyNodeIds.delete(id);
        if (performance.now() - startedAt >= nodeBudgetMs) break;
      }
    }

    if (this.dirtyEdgeIds.size) {
      for (const id of this.dirtyEdgeIds) {
        const edge = this.graph.getCellById(id);
        if (edge?.isEdge()) {
          this.applyBindingsToEdge(edge);
          this.debugAppliedEdges++;
        }
        this.dirtyEdgeIds.delete(id);
        if (performance.now() - startedAt >= BIND_FLUSH_BUDGET_MS) break;
      }
    }

    // Continue draining in subsequent frames so one burst cannot freeze input.
    if (this.dirtyNodeIds.size || this.dirtyEdgeIds.size) {
      this.scheduleBindFlush();
    }

    this.publishDebug();
  }

  // ── Geo base value capture ────────────────────────────────────────────────

  private captureGeoBaseValues() {
    this.baseValues.clear();
    this.graph.getNodes().forEach(node => {
      const bindings: TelemetryBinding[] = (node.getData() as any)?.telemetryBindings ?? [];
      for (const b of bindings) {
        if (b.svgElementId) continue;
        if (!GEO_OFFSET_PROPS.has(b.targetProp)) continue;
        const key = `${node.id}:${b.targetProp}`;
        if (!this.baseValues.has(key))
          this.baseValues.set(key, this.getNodeNumericValue(node, b.targetProp));
      }
    });
  }

  // ── Tween helpers ────────────────────────────────────────────────────────

  /** Numeric telemetry for inline SVG sub-elements (stored in data.svgOverrides). */
  private tweenSvgOverrideProp(node: Node, elementId: string, prop: string, target: number) {
    const key = `${node.id}:svg:${elementId}:${prop}`;
    const data: any = node.getData() ?? {};
    const cur = Number(data.svgOverrides?.[elementId]?.[prop] ?? 0);
    if (Math.abs(cur - target) < 0.001) return;

    if (!ENABLE_NUMERIC_TWEENS) {
      const d: any = node.getData() ?? {};
      const ov: Record<string, Record<string, unknown>> = { ...(d.svgOverrides ?? {}) };
      ov[elementId] = { ...(ov[elementId] ?? {}), [prop]: target };
      node.setData({ svgOverrides: ov }, { overwrite: false });
      return;
    }

    this.tweens.set(key, {
      from:      cur,
      to:        target,
      startTime: performance.now(),
      onUpdate:  v => {
        const d: any = node.getData() ?? {};
        const ov: Record<string, Record<string, unknown>> = { ...(d.svgOverrides ?? {}) };
        ov[elementId] = { ...(ov[elementId] ?? {}), [prop]: v };
        node.setData({ svgOverrides: ov }, { overwrite: false });
      },
    });
  }

  private tweenNodeProp(node: Node, prop: string, tmValue: number) {
    const key    = `${node.id}:${prop}`;
    // For geometric props, TM value is an offset from the designed position
    const base   = this.baseValues.get(key);
    const target = base !== undefined ? base + tmValue : tmValue;
    const current = this.getNodeNumericValue(node, prop);

    // Always write the raw (instant) target so display text updates immediately
    if (!GEO_PROPS.has(prop)) {
      node.setData({ [`${prop}Raw`]: target }, { overwrite: false });
    }

    if (Math.abs(current - target) < 0.001) return;

    if (!ENABLE_NUMERIC_TWEENS) {
      this.applyNodeNumericValue(node, prop, target);
      return;
    }

    this.tweens.set(key, {
      from:      current,
      to:        target,
      startTime: performance.now(),
      onUpdate:  v => this.applyNodeNumericValue(node, prop, v),
    });
  }


  private tweenEdgeProp(edge: Edge, prop: string, target: number) {
    const key     = `${edge.id}:${prop}`;
    const data: any = edge.getData() ?? {};
    const current   = Number(data[prop] ?? 0);
    if (Math.abs(current - target) < 0.001) return;

    if (!ENABLE_NUMERIC_TWEENS) {
      edge.setData({ [prop]: target }, { overwrite: false });
      if (prop === "strokeWidth") edge.attr("line/strokeWidth", target);
      if (prop === "opacity")     edge.attr("line/opacity",     target);
      return;
    }

    this.tweens.set(key, {
      from:      current,
      to:        target,
      startTime: performance.now(),
      onUpdate:  v => {
        edge.setData({ [prop]: v }, { overwrite: false });
        if (prop === "strokeWidth") edge.attr("line/strokeWidth", v);
        if (prop === "opacity")     edge.attr("line/opacity",     v);
      },
    });
  }

  private getNodeNumericValue(node: Node, prop: string): number {
    switch (prop) {
      case "x":     return node.getPosition().x;
      case "y":     return node.getPosition().y;
      case "width":  return node.getSize().width;
      case "height": return node.getSize().height;
      case "angle":  return Number(node.prop("angle") ?? 0);
      default: {
        const data: any = node.getData() ?? {};
        return Number(data[prop] ?? 0);
      }
    }
  }

  private applyNodeNumericValue(node: Node, prop: string, v: number) {
    switch (prop) {
      case "x": {
        const pos = node.getPosition();
        node.setPosition({ x: v, y: pos.y });
        break;
      }
      case "y": {
        const pos = node.getPosition();
        node.setPosition({ x: pos.x, y: v });
        break;
      }
      case "width": {
        const sz = node.getSize();
        node.setSize({ width: v, height: sz.height });
        break;
      }
      case "height": {
        const sz = node.getSize();
        node.setSize({ width: sz.width, height: v });
        break;
      }
      case "angle":
        node.prop("angle", v);
        break;
      default:
        node.setData({ [prop]: v }, { overwrite: false });
    }
  }

  private applyGeoInstant(node: Node, geo: Record<string, unknown>) {
    for (const [k, v] of Object.entries(geo)) {
      switch (k) {
        case "visible": node.setVisible(Boolean(v)); break;
        // numeric geo props handled by tweener, not here
      }
    }
  }

  private applyNodeVisualAttrs(node: Node, data: Record<string, unknown>) {
    const stroke = data.stroke ?? data.statusColor;
    const fill = data.fill;
    const strokeWidth = data.strokeWidth;
    const opacity = data.opacity;

    if (stroke !== undefined) node.attr("body/stroke", String(stroke));
    if (fill !== undefined) node.attr("body/fill", String(fill));
    if (strokeWidth !== undefined && Number.isFinite(Number(strokeWidth))) {
      node.attr("body/strokeWidth", Number(strokeWidth));
    }
    if (opacity !== undefined && Number.isFinite(Number(opacity))) {
      node.attr("body/opacity", Number(opacity));
    }
  }

  // ── Transform application ────────────────────────────────────────────────

  private applyTransform(value: unknown, binding: TelemetryBinding): unknown {
    try {
      if (binding.rules?.length) {
        const TM = this.tmForBinding(binding);
        for (const rule of binding.rules) {
          const fn = new Function("value", "TM", `"use strict"; return !!(${rule.condition});`);
          if (fn(value, TM)) return rule.value;
        }
        // No rule matched — fall through to transform/raw value
      }
      if (binding.transformScript) {
        const TM = this.tmForBinding(binding);
        const fn = new Function("value", "TM", `"use strict"; ${binding.transformScript}`);
        return fn(value, TM);
      }
      if (binding.transform) {
        // UI hint and all snippets use "v" as the variable name.
        // Also expose "value" as an alias for backwards-compat with older saved bindings.
        const fn = new Function("v", "value", `"use strict"; return (${binding.transform});`);
        return fn(value, value);
      }
      return value;
    } catch (e) {
      console.warn("[X6NatsTelemetry] transform error:", e);
      return undefined;
    }
  }

  // ── Type coercion ────────────────────────────────────────────────────────

  private coerce(prop: string, value: unknown): unknown {
    if (COLOR_PROPS.has(prop))   return String(value ?? "");
    if (EDGE_STRING_PROPS.has(prop)) return String(value ?? "");
    if (NUMERIC_PROPS.has(prop)) return Number(value);
    if (BOOLEAN_PROPS.has(prop)) {
      if (typeof value === "boolean") return value;
      const s = String(value).toLowerCase().trim();
      return s === "true" || s === "1" || s === "yes";
    }
    return value;
  }

  // ── Animation loop (rAF-based, delta-time driven) ────────────────────────

  private startAnimationLoop() {
    const loop = (now: number) => {
      const dt = this.lastFrameMs === 0 ? 0 : Math.min((now - this.lastFrameMs) / 1000, 0.1);
      this.lastFrameMs = now;
      this.tick(dt);
      this.animFrame = requestAnimationFrame(loop);
    };
    this.animFrame = requestAnimationFrame(loop);
  }

  private stopAnimationLoop() {
    if (this.animFrame !== null) { cancelAnimationFrame(this.animFrame); this.animFrame = null; }
    this.lastFrameMs = 0;
  }

  private tick(dt: number) {
    const now = performance.now();

    // ── Numeric tweens (time-based, dt not needed) ───────────────────────
    for (const [key, tween] of this.tweens) {
      const t     = Math.min((now - tween.startTime) / TWEEN_MS, 1);
      const eased = easeOutCubic(t);
      tween.onUpdate(tween.from + (tween.to - tween.from) * eased);
      if (t >= 1) this.tweens.delete(key);
    }

    // ── Idle-pause: nothing left to animate → stop RAF until next write ──
    if (this.tweens.size === 0 && this.animatingNodeIds.size === 0) {
      this.stopAnimationLoop();
      return;
    }

    if (dt === 0) return; // first frame — skip delta-based animations

    // ── dt-based node animations (only nodes in animatingNodeIds cache) ──
    for (const nodeId of this.animatingNodeIds) {
      const node = this.graph.getCellById(nodeId) as any;
      if (!node) { this.animatingNodeIds.delete(nodeId); continue; }
      const data: any = node.getData() ?? {};

      if (data.category === "MomentumWheel") {
        const speed = Math.abs(Number(data.wheelSpeed ?? 0));
        if (speed > 0) {
          const dir      = Number(data.wheelDirection ?? 1);
          const degStep  = speed * WHEEL_DEG_PER_RPM * dt;
          const newAngle = ((Number(data.wheelAngle ?? 0)) + dir * degStep) % 360;
          node.setData({ wheelAngle: newAngle }, { overwrite: false });
        } else {
          this.animatingNodeIds.delete(nodeId);
        }
      } else if (data.category === "Battery") {
        if (data.isCharging) {
          const anim = (Number(data.batteryAnim ?? 0) + BATTERY_ANIM_SPEED * dt) % 100;
          node.setData({ batteryAnim: anim }, { overwrite: false });
        } else {
          this.animatingNodeIds.delete(nodeId);
        }
      }
    }

    // Edge flow animations are fully event-driven (see wireEdgeFlowEvents /
    // applyEdgeFlowAnim). No per-frame edge scan needed here.
  }

  // ── Event-driven helpers ─────────────────────────────────────────────────

  /** Build animatingNodeIds from current graph state and keep it up-to-date. */
  private wireNodeAnimEvents() {
    this.graph.getNodes().forEach(n => {
      if (this.nodeNeedsAnim(n.getData() as any)) this.animatingNodeIds.add(n.id);
    });
    this.graph.on("node:change:data", ({ node }: any) => {
      if (this.nodeNeedsAnim(node.getData() as any)) {
        this.animatingNodeIds.add(node.id);
        // Restart RAF if it was idle-paused
        if (this.animFrame === null) this.startAnimationLoop();
      } else {
        this.animatingNodeIds.delete(node.id);
      }
    });
    this.graph.on("node:removed", ({ node }: any) => this.animatingNodeIds.delete(node.id));
  }

  private nodeNeedsAnim(data: any): boolean {
    if (!data) return false;
    if (data.category === "MomentumWheel" && Math.abs(Number(data.wheelSpeed ?? 0)) > 0) return true;
    if (data.category === "Battery" && !!data.isCharging) return true;
    return false;
  }

  /** Process every edge's current flow state once (called after first rAF). */
  private initEdgeFlowAnimations() {
    this.graph.getEdges().forEach(edge => this.applyEdgeFlowAnim(edge));
  }

  /** Wire edge data-change events so flow attrs are applied only on change. */
  private wireEdgeFlowEvents() {
    this.graph.on("edge:change:data", ({ edge }: any) => this.applyEdgeFlowAnim(edge));
    this.graph.on("edge:removed",     ({ edge }: any) => this.flowingEdges.delete(edge.id));
  }

  /** Apply or remove CSS flow animation for one edge — called only on state change. */
  private applyEdgeFlowAnim(edge: any) {
    const data: any = edge.getData() ?? {};
    const active    = !!data.flowActive;
    const dir       = Number(data.flowDirection ?? 1);
    const prevDir   = this.flowingEdges.get(edge.id);

    if (active) {
      if (prevDir !== dir) {
        const anim = dir >= 0 ? "x6FlowFwd" : "x6FlowBwd";
        edge.attr("line/strokeDasharray", "8 4");
        edge.attr("line/style", `animation:${anim} 0.4s linear infinite`);
        this.flowingEdges.set(edge.id, dir);
      }
    } else if (prevDir !== undefined) {
      edge.attr("line/style", "");
      edge.attr("line/strokeDasharray", "");
      edge.attr("line/strokeDashoffset", "0");
      this.flowingEdges.delete(edge.id);
    }
  }
}
