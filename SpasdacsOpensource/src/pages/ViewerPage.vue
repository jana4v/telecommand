<template>
  <div class="viewer-page">
    <!-- Invisible hover trigger at top -->
    <div class="nav-trigger" @mouseenter="showNav" />

    <!-- Top bar (auto-hides) -->
    <header class="topbar" :class="{ visible: navVisible }"
      @mouseenter="showNav" @mouseleave="scheduleHide">
      <div class="topbar-left">
        <button class="btn-back" @click="goBack">← Back</button>
        <span class="spasdacs-title">🛰️ SPASDACS <span class="nova">Nova</span></span>
        <select v-model="diagramId" class="diagram-select" @change="onSwitchDiagram">
          <option v-for="d in allDiagrams" :key="d.id" :value="d.id">{{ d.name }}</option>
        </select>
      </div>
      <div class="topbar-center">
        <!-- Telemetry chain activity badges — always visible, grey until data flows -->
        <div class="chain-status-bar">
          <span
            v-for="stream in telemetryStreams"
            :key="stream.id"
            class="chain-badge"
            :class="chainBadgeClass(stream.id)"
            :title="chainBadgeTitle(stream.id, stream.label)">
            {{ stream.label }}
          </span>
        </div>
      </div>
      <div class="topbar-right">
        <span v-if="auth.user" class="user-badge">
          {{ auth.user.username }}
          <small>{{ (auth.user.roles ?? []).join(', ') }}</small>
        </span>

        <!-- Auto-view pause/resume -->
        <button v-if="autoViewActive" class="btn-autoview"
          :class="{ paused: autoViewPaused }"
          @click="togglePause">
          {{ autoViewPaused ? '▶ Resume' : '⏸ Pause' }}
        </button>

        <!-- Heartbeat indicator -->
        <span v-if="natsConnected" class="heartbeat-badge" :class="heartbeatStatus === 'OK' ? 'hb-ok' : 'hb-warn'"
          title="Data heartbeat">
          {{ heartbeatStatus === 'OK' ? '♥ Data' : `♥ ${heartbeatStatus}` }}
        </span>

        <!-- NATS status badge -->
        <span class="nats-badge" :class="{ connected: natsConnected }"
          :title="natsConnected ? 'NATS connected' : 'Not connected'">
          {{ natsConnected ? '⚡ Live' : '○ Idle' }}
        </span>

        <!-- NATS config button -->
        <button class="btn-nats" @click="showNatsModal = true">⚙ NATS</button>

        <button class="btn-fit" @click="fitToScreen" title="Fit diagram to screen">⊞ Fit</button>
        <button v-if="canEdit" class="btn-edit" @click="editDiagram">✏️ Edit</button>

        <!-- Command queue button -->
        <button class="btn-cmd-queue" @click="showCommandQueue = true"
          :class="{ 'has-commands': commandQueue.items.length > 0 }"
          title="Open TC command queue">
          📋 TC Queue
          <span v-if="commandQueue.items.length" class="cmd-queue-badge">
            {{ commandQueue.items.length }}
          </span>
        </button>

        <button class="btn-pin"
          :class="{ pinned: navPinned }"
          @click="navPinned = !navPinned"
          :title="navPinned ? 'Unpin nav' : 'Pin nav'">
          {{ navPinned ? '📌' : '📍' }}
        </button>
        <button v-if="auth.isLoggedIn" class="btn-logout" @click="doLogout">Logout</button>
        <router-link v-else to="/login" class="btn-login">Login</router-link>
      </div>
    </header>

    <!-- Unauthenticated viewer banner -->
    <div v-if="!auth.isLoggedIn" class="viewer-banner">
      <span class="banner-icon">👁️</span>
      <span class="banner-text">You are viewing in read-only mode.</span>
      <router-link to="/login" class="banner-link">Login to edit</router-link>
    </div>
    <!-- Canvas area -->
    <div ref="viewerAreaRef" class="viewer-area">
      <!-- Initial fetch state: data not yet ready, canvas not yet mounted -->
      <div v-if="loading" class="state-msg">Loading…</div>
      <div v-else-if="!found" class="state-msg error">
        <div>Diagram failed to load.</div>
        <div v-if="loadErrorDetail" class="state-msg-detail">{{ loadErrorDetail }}</div>
        <div class="state-msg-sub">The backend may be restarting. This does not affect the saved diagram.</div>
        <button class="btn-reload-diagram" @click="retryLoadDiagram">↻ Retry</button>
      </div>

      <!-- Normal X6 diagram — canvas stays mounted; overlays sit on top of it -->
      <template v-else>
        <!-- Partial-load warning: shown when some cells failed to render.
             Non-blocking — the good cells are already rendered underneath. -->
        <div v-if="partialLoadWarning" class="partial-load-banner">
          {{ partialLoadWarning }}
          <button class="partial-load-dismiss" @click="partialLoadWarning = ''">✕</button>
        </div>
        <!-- Progressive-render overlay: sits on top of the canvas so the canvas
             is never unmounted/destroyed mid-load (unlike setting loading=true which
             would remove the canvas from the DOM via v-else and destroy the graph). -->
        <div v-if="canvasLoading" class="graph-loading-overlay">
          <span v-if="loadingPct > 0">Rendering… {{ loadingPct }}%</span>
          <span v-else>Loading…</span>
        </div>
        <X6Canvas ref="canvasRef" :read-only="true" @ready="onGraphReady" />
      </template>
    </div>

    <!-- ── Hover telemetry panel ────────────────────────────────────────── -->
    <Teleport to="body">
      <div
        v-if="hoveredNodeData && tooltipMnemonics.length"
        class="tm-panel"
        :class="{ 'tm-panel-dragging': isDraggingPanel }"
        :style="{ left: tooltipX + 'px', top: tooltipY + 'px' }"
        @mouseenter="cancelHideTooltip"
        @mouseleave="scheduleHideTooltip"
      >
        <div class="tm-panel-header" @mousedown="onPanelDragStart">
          <span class="tm-drag-grip" title="Drag to move">⠿</span>
          <span class="tm-panel-title">{{ hoveredNodeData.name || hoveredNodeData.category }}</span>
          <div class="tm-header-btns">
            <button class="tm-mode-btn" @click.stop="toggleDisplayMode"
              :title="displayMode === 'simple' ? 'Switch to Dict mode' : 'Switch to Simple mode'">
              {{ displayMode === 'simple' ? '⊞ Dict' : '≡ Simple' }}
            </button>
            <button class="tm-pin-btn" @click.stop="togglePin" title="Pin panel">📌</button>
            <button class="tm-close-btn" @click.stop="forceHide" title="Close panel">✕</button>
          </div>
        </div>
        <div class="tm-search-wrap">
          <input class="tm-search" v-model="tooltipSearch" placeholder="Search mnemonics…"
            @click.stop @mousedown.stop />
          <span class="tm-row-count">{{ filteredRows.length }}/{{ tooltipMnemonics.length }}</span>
        </div>
        <div class="tm-table-wrap">
          <table class="tm-table">
            <thead>
              <tr>
                <template v-if="displayMode === 'simple'">
                  <th class="tm-th tm-th-mnem">Mnemonic</th>
                  <th class="tm-th tm-th-val">Value</th>
                </template>
                <template v-else>
                  <th v-for="col in dictColumns" :key="col" class="tm-th tm-th-dict">{{ col }}</th>
                </template>
              </tr>
            </thead>
            <tbody>
              <template v-for="mnem in filteredRows" :key="mnem">
                <tr v-for="row in getExpandedRows(mnem, tooltipValues)"
                  :key="mnem + '_' + row.rowIdx"
                  :class="{ 'tm-row-alert': isAlertRow(mnem, row.rowIdx) }">
                  <template v-if="displayMode === 'simple'">
                    <td class="tm-td tm-td-mnem">{{ displayMnemonic(mnem) }}</td>
                    <td class="tm-td tm-td-val">{{ formatValue(tooltipValues[mnem]) }}</td>
                  </template>
                  <template v-else>
                    <td v-for="col in dictColumns" :key="col" class="tm-td tm-td-dict">
                      {{ getDictField(mnem, col, row.rowIdx) }}
                    </td>
                  </template>
                </tr>
              </template>
              <tr v-if="filteredRows.length === 0">
                <td :colspan="displayMode === 'simple' ? 2 : dictColumns.length" class="tm-td-empty">
                  No matching mnemonics
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </Teleport>

    <!-- ── Pinned telemetry panels ──────────────────────────────────────── -->
    <Teleport to="body">
      <div v-for="panel in pinnedPanels" :key="panel.id"
        class="tm-panel tm-panel-pinned"
        :class="{ 'tm-panel-dragging': panel.isDragging }"
        :style="{ left: panel.x + 'px', top: panel.y + 'px' }">
        <div class="tm-panel-header" @mousedown="onPinnedPanelDragStart($event, panel.id)">
          <span class="tm-drag-grip" title="Drag to move">⠿</span>
          <span class="tm-panel-title">{{ panel.nodeData.name || panel.nodeData.category }}</span>
          <div class="tm-header-btns">
            <button class="tm-mode-btn" @click.stop="togglePinnedPanelMode(panel.id)"
              :title="panel.displayMode === 'simple' ? 'Switch to Dict mode' : 'Switch to Simple mode'">
              {{ panel.displayMode === 'simple' ? '⊞ Dict' : '≡ Simple' }}
            </button>
            <button class="tm-close-btn" @click.stop="removePinnedPanel(panel.id)" title="Close panel">✕</button>
          </div>
        </div>
        <div class="tm-search-wrap">
          <input class="tm-search" v-model="panel.search" placeholder="Search mnemonics…"
            @click.stop @mousedown.stop />
          <span class="tm-row-count">{{ getPanelFilteredRows(panel).length }}/{{ panel.mnemonics.length }}</span>
        </div>
        <div class="tm-table-wrap">
          <table class="tm-table">
            <thead>
              <tr>
                <template v-if="panel.displayMode === 'simple'">
                  <th class="tm-th tm-th-mnem">Mnemonic</th>
                  <th class="tm-th tm-th-val">Value</th>
                </template>
                <template v-else>
                  <th v-for="col in getPanelDictColumns(panel)" :key="col" class="tm-th tm-th-dict">{{ col }}</th>
                </template>
              </tr>
            </thead>
            <tbody>
              <template v-for="mnem in getPanelFilteredRows(panel)" :key="mnem">
                <tr v-for="row in getExpandedRows(mnem, panel.values)"
                  :key="mnem + '_' + row.rowIdx"
                  :class="{ 'tm-row-alert': isPanelAlertRow(panel, mnem, row.rowIdx) }">
                  <template v-if="panel.displayMode === 'simple'">
                    <td class="tm-td tm-td-mnem">{{ displayMnemonic(mnem) }}</td>
                    <td class="tm-td tm-td-val">{{ formatValue(panel.values[mnem]) }}</td>
                  </template>
                  <template v-else>
                    <td v-for="col in getPanelDictColumns(panel)" :key="col" class="tm-td tm-td-dict">
                      {{ getPanelDictField(panel, mnem, col, row.rowIdx) }}
                    </td>
                  </template>
                </tr>
              </template>
              <tr v-if="getPanelFilteredRows(panel).length === 0">
                <td :colspan="panel.displayMode === 'simple' ? 2 : getPanelDictColumns(panel).length" class="tm-td-empty">
                  No matching mnemonics
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </Teleport>

    <!-- ── TC Command Selector (opens on node dblclick) ───────────────── -->
    <TcCommandSelectorModal
      v-model:visible="showTcSelector"
      :telecommands="tcSelectorCommands"
      :element-name="tcSelectorElementName"
    />

    <!-- ── TC Command Queue Panel (opens from navbar) ───────────────── -->
    <TcCommandQueuePanel v-model:visible="showCommandQueue" />

    <!-- NATS settings modal -->
    <Teleport to="body">
      <div v-if="showNatsModal" class="modal-backdrop" @click.self="showNatsModal = false">
        <div class="modal">
          <div class="modal-header">
            <h3>⚙ NATS &amp; Gateway</h3>
            <button class="modal-close" @click="showNatsModal = false">×</button>
          </div>
          <div class="modal-body">
            <!-- NATS connection status -->
            <div class="conn-status" :class="natsConnected ? 'ok' : 'off'">
              {{ natsConnected ? '⚡ NATS Connected' : '○ NATS Disconnected' }}
              <span v-if="natsConnected && heartbeatStatus" class="hb-inline"
                :class="heartbeatStatus === 'OK' ? 'hb-inline-ok' : 'hb-inline-warn'">
                ♥ {{ heartbeatStatus }}
              </span>
            </div>

            <!-- NATS fields -->
            <div class="modal-section-label">NATS WebSocket</div>
            <label class="modal-field">
              <span>Server URL</span>
              <input class="modal-input" v-model="natsCfg.serverUrl" :disabled="natsConnected"
                :placeholder="`ws://${locationHostname}/nats`" />
            </label>
            <label class="modal-field">
              <span>Subject Prefix</span>
              <input class="modal-input" v-model="natsCfg.prefix" :disabled="natsConnected" placeholder="tm" />
            </label>
            <div class="modal-field-row">
              <label class="modal-field half">
                <span>Username</span>
                <input class="modal-input" v-model="natsCfg.username" :disabled="natsConnected"
                  autocomplete="username" placeholder="optional" />
              </label>
              <label class="modal-field half">
                <span>Password</span>
                <input class="modal-input" type="password" v-model="natsCfg.password" :disabled="natsConnected"
                  autocomplete="current-password" placeholder="optional" />
              </label>
            </div>

            <div class="modal-section-label" style="margin-top:12px">Telemetry streams</div>
            <TelemetryStreamsConfigPanel :disabled="natsConnected" :subject-prefix="natsStreamPrefix" />

            <!-- Gateway URL for mnemonics -->
            <div class="modal-section-label" style="margin-top:12px">Gateway API (mnemonics)</div>
            <label class="modal-field">
              <span>Gateway URL</span>
              <input class="modal-input" v-model="localGatewayUrl"
                :placeholder="`http://${locationHost}/api/go/v1`" />
            </label>
            <div class="gateway-status" :class="gatewayAvailable ? 'gw-ok' : (lastError ? 'gw-err' : 'gw-off')">
              <template v-if="mnemonicsLoading">⟳ Loading mnemonics…</template>
              <template v-else-if="gatewayAvailable">
                ✓ {{ liveMnemonics.length }} mnemonics · {{ subsystems.length }} subsystems
              </template>
              <template v-else-if="lastError">✗ {{ lastError }}</template>
              <template v-else>○ Not loaded</template>
            </div>
            <button class="btn-reload-mnemonics" type="button" :disabled="mnemonicsLoading"
              @click="reloadMnemonics">
              {{ mnemonicsLoading ? 'Loading…' : '↻ Reload Mnemonics' }}
            </button>
          </div>
          <div class="modal-footer">
            <button class="btn-cancel" @click="showNatsModal = false">Close</button>
            <button v-if="natsConnected" class="btn-disconnect" @click="disconnectNats">Disconnect</button>
            <button v-else class="btn-connect" @click="connectNats"
              :disabled="!natsCfg.serverUrl.trim()">Connect</button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, onUnmounted, watch, nextTick } from "vue";
import { useRoute, useRouter } from "vue-router";
import gsap from "gsap";
import type { Graph } from "@antv/x6";
import X6Canvas               from "../components/X6Canvas.vue";
import TcCommandSelectorModal  from "../components/TcCommandSelectorModal.vue";
import TcCommandQueuePanel     from "../components/TcCommandQueuePanel.vue";
// Lazy — Monaco-heavy chunk only loads when the user opens the binding modal.
import { DiagramStorage, type DiagramData, type ViewportState } from "../services/diagramStorage";
import { useAuth } from "../services/auth";
import { X6NatsTelemetry }  from "../telemetry/X6NatsTelemetry";
import {
  loadMnemonics, gatewayUrl,
  subsystems, liveMnemonics, mnemonicCatalog,
  gatewayAvailable, mnemonicsLoading, lastError, telemetryKeyAliases, resolveTelemetryKey,
} from "../services/mnemonicStore";
import { getTelemetryValue } from "../telemetry/telemetryStore";
import { commandQueue } from "../stores/commandQueueStore";
import { applyEdgeVisualsFromData } from "../graph/edgeVisuals";
import {
  telemetryStreams,
  loadTelemetryStreamsFromStorage,
  saveTelemetryStreamsToStorage,
} from "../stores/telemetryStreamsConfig";
import TelemetryStreamsConfigPanel from "../components/TelemetryStreamsConfigPanel.vue";

/** Match scroller viewport to DOM so zoomToFit uses the real visible area. */
function resizeGraphToScroller(g: Graph) {
  // Use stable viewer area dimensions as source-of-truth. Measuring the
  // scroller/internal graph box can include scrollbar feedback, causing each
  // Fit click to shrink the effective viewport by scrollbar thickness.
  const view = viewerAreaRef.value;
  if (view) {
    const w = view.clientWidth;
    const h = view.clientHeight;
    if (w > 0 && h > 0) {
      g.resize(w, h);
      return;
    }
  }

  // Fallback for environments where host is unavailable.
  const scroller = g.getPlugin("scroller") as { container?: HTMLElement } | null;
  const el = scroller?.container;
  if (!el) return;
  const w = el.clientWidth;
  const h = el.clientHeight;
  if (w > 0 && h > 0) g.resize(w, h);
}

function zoomGraphToFit(g: Graph) {
  resizeGraphToScroller(g);
  g.zoomToFit({ padding: 40 });
}

/**
 * Fast legacy-shape probe that avoids parsing huge X6 JSON on normal diagrams.
 * Legacy payloads include a top-level { type: "legacy", ... } marker.
 */
function isLikelyLegacyModel(model: unknown): boolean {
  if (!model) return false;
  if (typeof model === "object") {
    return (model as Record<string, unknown>).type === "legacy";
  }
  if (typeof model !== "string") return false;
  // Only inspect the first bytes where the top-level type field is expected.
  const head = model.slice(0, 512);
  return /"type"\s*:\s*"legacy"/.test(head);
}

// ── PinnedPanel ────────────────────────────────────────────────────────────
interface PinnedPanel {
  id:          number;
  nodeData:    Record<string, any>;
  mnemonics:   string[];
  x:           number;
  y:           number;
  values:      Record<string, unknown>;
  displayMode: 'simple' | 'dict';
  search:      string;
  isDragging:  boolean;
  refreshId:   ReturnType<typeof setInterval> | null;
}

const route  = useRoute();
const router = useRouter();
const auth = useAuth();
const viewerAreaRef = ref<HTMLElement | null>(null);
const canEdit = computed(() => auth.hasAnyRole(["operator", "admin", "super_admin"]));

const diagramId   = ref(route.params.id as string);
const allDiagrams = ref<DiagramData[]>([]);
const loading     = ref(true);  // true only during initial data fetch (hides the canvas)
const canvasLoading = ref(false); // true during progressive cell rendering (overlay ON TOP of canvas)
const loadingPct  = ref(0);   // 0–100 progress shown in the canvasLoading overlay
const found       = ref(false);
// Human-readable detail when a diagram fails to load/render (parse error,
// unregistered shape, etc.) so the user sees the real cause instead of a
// silent blank canvas.
const loadErrorDetail = ref("");
// Non-empty when cell-by-cell fallback was used: "Loaded 89 of 90 cells. 1 cell(s) had errors."
const partialLoadWarning = ref("");
const canvasRef   = ref<InstanceType<typeof X6Canvas> | null>(null);
let graph: Graph | null = null;
let telemetry: X6NatsTelemetry | null = null;
// Signature of the NATS config the live `telemetry` was created with. When an
// auto-view hop calls connectNats() again with an unchanged signature we rebind
// to the new diagram's cells instead of reopening the WebSocket.
let lastNatsConfigSig = "";
let pendingDiagramData: import("../services/diagramStorage").DiagramData | null = null;
let graphEventsRegistered = false;
let natsWatchdogTimer: ReturnType<typeof setInterval> | null = null;
let lastNatsRecoverAt = 0;

// ── TC Command Selector state ────────────────────────────────────────────
const showTcSelector        = ref(false);
const tcSelectorCommands    = ref<string[]>([]);
const tcSelectorElementName = ref("");

// ── Command Queue panel state ────────────────────────────────────────────
const showCommandQueue = ref(false);

// ── Nav auto-hide ────────────────────────────────────────────────────────
const navPinned  = ref(true);
const navVisible = ref(true);
let navTimer: ReturnType<typeof setTimeout> | null = null;

function showNav()        { if (navTimer) clearTimeout(navTimer); navVisible.value = true; }
function scheduleHide()   { if (navPinned.value) return; navTimer = setTimeout(() => navVisible.value = false, 2000); }

// ── NATS ─────────────────────────────────────────────────────────────────
const natsConnected   = ref(false);
const heartbeatStatus = ref("");

// ── Telemetry chain activity status ──────────────────────────────────────
// Tracks when each stream last delivered a TM message so the navbar badges
// can show green (live, <5 s) or red (stale / no data, ≥5 s).
const streamLastSeen = ref<Record<string, number>>({});
const chainTick      = ref(0);   // incremented every second to force badge re-evaluation
let   chainTickTimer: ReturnType<typeof setInterval> | null = null;

function onStreamActivity(streamId: string) {
  streamLastSeen.value = { ...streamLastSeen.value, [streamId]: Date.now() };
}

function chainBadgeClass(streamId: string): string {
  void chainTick.value; // reactive dep — re-evaluated every second
  if (!natsConnected.value) return 'chain-grey';
  const last = streamLastSeen.value[streamId];
  if (!last) return 'chain-grey';
  return (Date.now() - last) > 5_000 ? 'chain-red' : 'chain-green';
}

function chainBadgeTitle(streamId: string, label: string): string {
  void chainTick.value;
  if (!natsConnected.value) return `${label}: NATS not connected`;
  const last = streamLastSeen.value[streamId];
  if (!last) return `${label}: waiting for data…`;
  const age = Math.floor((Date.now() - last) / 1_000);
  return age > 5 ? `${label}: last message ${age}s ago` : `${label}: receiving`;
}

/**
 * Auto-view resilience: if stream activity silently stalls while the socket is
 * still "connected", force a reconnect so cycling diagrams don't go static.
 */
function maybeRecoverTelemetryStall() {
  if (!autoViewActive.value || autoViewPaused.value) return;
  if (!natsConnected.value || !telemetry || !telemetry.isLive) return;

  const seen = Object.values(streamLastSeen.value);
  if (!seen.length) return;
  const newestSeen = Math.max(...seen);
  const idleMs = Date.now() - newestSeen;

  // Require a clear inactivity gap before recovery, and throttle retries.
  if (idleMs < 8_000) return;
  if (Date.now() - lastNatsRecoverAt < 15_000) return;

  lastNatsRecoverAt = Date.now();
  console.warn("[ViewerPage] Auto-view telemetry stalled; reconnecting NATS", { idleMs });
  disconnectNats();
  connectNats();
}
const showNatsModal  = ref(false);
const locationHost     = window.location.host;
const locationHostname = import.meta.env.DEV ? window.location.hostname : window.location.host;

function normalizeNatsServerUrl(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return `ws://${locationHostname}/nats`;

  try {
    const url = new URL(trimmed);
    const protocol = url.protocol === "wss:" ? "wss:" : "ws:";
    const host = url.hostname || locationHostname;
    const port = url.port ? `:${url.port}` : "";
    const path = (url.pathname && url.pathname !== "/") ? url.pathname : "";
    // With nginx, ws://<host>/nats is the expected entrypoint.
    return `${protocol}//${host}${port}${path || (port ? "" : "/nats")}`;
  } catch {
    const hostOnly = trimmed.replace(/^wss?:\/\//i, "").replace(/\/.*/, "").split(":")[0] || locationHostname;
    return `ws://${hostOnly}/nats`;
  }
}

const natsCfg = reactive({
  serverUrl: `ws://${locationHostname}/nats`,
  prefix:    "tm",
  username:  "",
  password:  "",
});

const natsStreamPrefix = computed(() => {
  const p = natsCfg.prefix.trim();
  return p || "tm";
});

// Gateway URL local copy so edits in modal don't take effect until Reload
const localGatewayUrl = ref(gatewayUrl.value);

async function reloadMnemonics() {
  gatewayUrl.value = localGatewayUrl.value.trim().replace(/\/$/, "");
  await loadMnemonics(true);
}

let pendingNatsConnect = false;

/** Stable signature of the current NATS connection config + stream set. */
function natsConfigSignature(): string {
  return JSON.stringify({
    url:    natsCfg.serverUrl,
    prefix: natsCfg.prefix,
    user:   natsCfg.username,
    pass:   natsCfg.password,
    streams: telemetryStreams.value.map(s => s.id),
  });
}

function connectNats() {
  natsCfg.serverUrl = normalizeNatsServerUrl(natsCfg.serverUrl);
  saveTelemetryStreamsToStorage();
  showNatsModal.value = false;

  if (!graph) {
    // Graph not ready yet (diagram still loading) — queue connect for when it is
    pendingNatsConnect = true;
    return;
  }
  pendingNatsConnect = false;

  // If a live telemetry session already exists with the SAME config (the usual
  // case for an auto-view hop — same graph instance, same NATS settings), just
  // rebind to the newly-loaded cells. This keeps the WebSocket open instead of
  // forcing a fresh 101 handshake on every diagram switch.
  const sig = natsConfigSignature();
  if (telemetry && telemetry.isLive && natsConnected.value && sig === lastNatsConfigSig) {
    telemetry.rebind();
    return;
  }

  lastNatsConfigSig = sig;
  telemetry?.stop();
  telemetry = new X6NatsTelemetry(graph, {
    serverUrl: natsCfg.serverUrl,
    prefix:    natsCfg.prefix,
    username:  natsCfg.username || undefined,
    password:  natsCfg.password || undefined,
    streams:   telemetryStreams.value,
  });
  telemetry.onConnectionChange = (c) => {
    natsConnected.value = c;
    if (!c) streamLastSeen.value = {}; // clear chain status on disconnect
  };
  telemetry.onHeartbeat       = (s) => { heartbeatStatus.value = s; };
  telemetry.onStreamActivity  = onStreamActivity;
  telemetry.start();
}

function disconnectNats() {
  telemetry?.stop();
  telemetry = null;
  natsConnected.value  = false;
  streamLastSeen.value = {};
  lastNatsConfigSig    = ""; // force a full reconnect next time
}

// ── Auto-view ────────────────────────────────────────────────────────────
const autoViewActive = ref(false);
const autoViewPaused = ref(false);
let autoViewTimer: ReturnType<typeof setTimeout> | null = null;
// Tracks which diagram ID was last loaded by auto-view — prevents watcher double-load
let autoViewLoadedId: string | null = null;

/** Global fallback delay (sec) — from ?delay= query param set by DiagramList */
const globalAutoViewDelay = computed(() => {
  const v = Number(route.query.delay);
  return v > 0 ? v : 30;
});

/**
 * Returns the effective display duration for a diagram.
 * If the diagram's own duration is 0 (or unset), fall back to the global delay.
 */
function effectiveDuration(diagram: { autoViewDuration?: number }): number {
  const local = diagram.autoViewDuration ?? 0;
  return local > 0 ? local : globalAutoViewDelay.value;
}

/**
 * Advance to the next included diagram directly — bypasses the router watcher
 * to avoid race conditions. Updates the URL for browser history only.
 */
async function advanceAutoView() {
  if (!autoViewActive.value || autoViewPaused.value) return;
  const included = allDiagrams.value.filter(d => d.autoViewInclude !== false);
  if (included.length <= 1) return;
  const idx  = included.findIndex(d => d.id === diagramId.value);
  const next = included[(idx + 1) % included.length];

  // Mark this as an auto-view load so the watcher skips it
  autoViewLoadedId = next.id;
  diagramId.value  = next.id;

  // Fetch and render — use localStorage cache to avoid a backend round-trip
  // on every auto-view hop. Cache TTL is 5 minutes (see diagramStorage.ts).
  const data = await DiagramStorage.getForAutoView(next.id);
  if (data) {
    await loadDiagramIntoGraph(data);
  } else {
    // Diagram data unavailable — still schedule the next hop so cycling doesn't freeze
    scheduleNextAutoView(globalAutoViewDelay.value);
  }

  // Update URL for browser history (watcher will see autoViewLoadedId and skip)
  router.replace(`/viewer/${next.id}?autoview=true&delay=${globalAutoViewDelay.value}`);
}

/** Called once after a diagram finishes loading — schedules the next switch */
function scheduleNextAutoView(durationSec: number) {
  if (autoViewTimer) clearTimeout(autoViewTimer);
  if (!autoViewActive.value || autoViewPaused.value) return;
  autoViewTimer = setTimeout(() => { advanceAutoView(); }, durationSec * 1000);
}

function startAutoView() {
  // Clear any stale cached diagrams so the session always starts fresh.
  DiagramStorage.clearDiagramCache();
  autoViewActive.value = true;
  autoViewPaused.value = false;

  // Pre-fetch ALL included diagrams into the in-memory cache in parallel.
  // This fires-and-forgets; by the time the first auto-view hop occurs the
  // diagrams are already cached so every getForAutoView() call is a hit and
  // no backend requests are needed during cycling.
  const included = allDiagrams.value.filter(d => d.autoViewInclude !== false);
  void Promise.all(included.map(d => DiagramStorage.getForAutoView(d.id)));

  // loadDiagramIntoGraph already ran (before this call), so schedule the first hop now
  const cur = allDiagrams.value.find(d => d.id === diagramId.value);
  scheduleNextAutoView(cur ? effectiveDuration(cur) : globalAutoViewDelay.value);
}

function togglePause() {
  autoViewPaused.value = !autoViewPaused.value;
  if (autoViewPaused.value) {
    if (autoViewTimer) { clearTimeout(autoViewTimer); autoViewTimer = null; }
  } else {
    const cur = allDiagrams.value.find(d => d.id === diagramId.value);
    scheduleNextAutoView(cur ? effectiveDuration(cur) : globalAutoViewDelay.value);
  }
}

// ── Lifecycle ────────────────────────────────────────────────────────────

onMounted(async () => {
  loadTelemetryStreamsFromStorage();

  // Entrance — title slides down, then "Nova" pops in with a bounce
  gsap.from(".spasdacs-title", { opacity: 0, y: -20, duration: 1, ease: "power3.out" });
  gsap.from(".nova",           { scale: 0.8, opacity: 0, duration: 1, delay: 0.3, ease: "back.out(1.7)" });
  // Glow pulse — starts after entrance finishes, loops forever
  gsap.fromTo(".nova",
    { textShadow: "0 0 0px #00eaff, 0 0 0px #0077ff" },
    { textShadow: "0 0 12px #00eaff, 0 0 24px #0077ff", duration: 1.5, repeat: -1, yoyo: true, ease: "sine.inOut", delay: 1.3 },
  );

  // Fetch the mnemonic mapping from the gateway — non-blocking best-effort.
  // When the diagram has viewModelData (saved with the new editor), this is NOT
  // needed for telemetry to work: topics are already bare paramIds and NATS
  // messages match directly. We still fire it so hover-tooltip mnemonic labels
  // are humanised (paramId → full name) once it resolves, but no UI element
  // waits for it.
  loadMnemonics().catch(() => {});

  // Render the current diagram first; list fetch is intentionally deferred
  // because large installations can return heavy /diagrams payloads.
  await loadDiagram();

  void DiagramStorage.getAllDiagrams().then((diagrams) => {
    allDiagrams.value = diagrams;
    if (route.query.autoview === "true") {
      startAutoView();
    }
  });
});

// Ensure NATS connections are torn down when the user closes/refreshes the tab.
// onUnmounted() is NOT guaranteed to fire in that case, so we register a
// beforeunload handler as a safety net. The handler is also removed on normal
// component unmount to avoid double-stop.
function handleBeforeUnload() {
  telemetry?.stop();
}

onMounted(() => {
  window.addEventListener('beforeunload', handleBeforeUnload);
  // Chain badge age check — increments every second so badges turn red
  // within 1 s of the 5-second gap threshold being crossed.
  chainTickTimer = setInterval(() => { chainTick.value++; }, 1_000);
  // Telemetry stall watchdog for long-running auto-view sessions.
  natsWatchdogTimer = setInterval(() => { maybeRecoverTelemetryStall(); }, 2_000);
});

onUnmounted(() => {
  window.removeEventListener('beforeunload', handleBeforeUnload);
  if (chainTickTimer)           clearInterval(chainTickTimer);
  if (natsWatchdogTimer)        clearInterval(natsWatchdogTimer);
  telemetry?.stop();
  if (autoViewTimer)     clearTimeout(autoViewTimer);
  if (tooltipRefreshId)  clearInterval(tooltipRefreshId);
  if (hideTooltipTimer)  clearTimeout(hideTooltipTimer);
  if (viewportSaveTimer) clearTimeout(viewportSaveTimer);
  viewportScrollCleanup?.();
  for (const panel of pinnedPanels.value) {
    if (panel.refreshId) clearInterval(panel.refreshId);
  }
  window.removeEventListener('mousemove', onPinnedPanelDrag);
  window.removeEventListener('mouseup',   onPinnedPanelDragEnd);
});

watch(() => route.params.id as string, async (newId) => {
  if (!newId) return;

  // ── Auto-view guard ───────────────────────────────────────────────────
  // advanceAutoView() owns all loading while auto-view is running.
  // router.replace() inside advanceAutoView() still triggers this watcher
  // (for browser history), but we must NOT call loadDiagram() — doing so
  // causes an extra getDiagram() fetch on every hop and re-initialises
  // the NATS connection unnecessarily.
  if (newId === autoViewLoadedId) {
    // Expected auto-view hop — just clear the sentinel and bail.
    autoViewLoadedId = null;
    return;
  }
  autoViewLoadedId = null;
  if (autoViewActive.value) {
    // Auto-view is running but the URL changed for a reason other than the
    // sentinel (e.g. concurrent user interaction). Sync the select only.
    diagramId.value = newId;
    return;
  }
  // ── Normal (non-auto-view) diagram navigation ─────────────────────────
  // Flush any pending viewport save for the previous diagram before switching
  if (viewportSaveTimer && graph) {
    clearTimeout(viewportSaveTimer);
    viewportSaveTimer = null;
    const vp = captureViewport(graph);
    if (vp) void DiagramStorage.patchDiagram(diagramId.value, { viewportState: vp });
  }
  viewportScrollCleanup?.();
  diagramId.value = newId;
  await loadDiagram();
  if (route.query.autoview === "true" && !autoViewActive.value) {
    startAutoView();
  }
});

// ── Hover tooltip ─────────────────────────────────────────────────────────

const hoveredNodeData  = ref<Record<string, any> | null>(null);
const tooltipMnemonics = ref<string[]>([]);
const tooltipX         = ref(0);
const tooltipY         = ref(0);
const tooltipValues    = ref<Record<string, unknown>>({});
const displayMode      = ref<'simple' | 'dict'>('simple');
const tooltipSearch    = ref('');
const isDraggingPanel  = ref(false);
const pinnedPanels     = ref<PinnedPanel[]>([]);
let nextPanelId        = 0;
let pinnedDraggingId:  number | null = null;
let pinnedDragOffsetX  = 0;
let pinnedDragOffsetY  = 0;
let tooltipRefreshId:   ReturnType<typeof setInterval>  | null = null;
let hideTooltipTimer:   ReturnType<typeof setTimeout>   | null = null;
let modeAutoSet        = false;

// Auto-detect display mode once values first arrive
watch(tooltipValues, (vals) => {
  if (modeAutoSet) return;
  if (Object.keys(vals).length === 0) return;
  const hasDict = Object.values(vals).some(v => isDictObj(tryParseJson(v)));
  displayMode.value = hasDict ? 'dict' : 'simple';
  modeAutoSet = true;
}, { deep: true });

// Reset search + mode flag when new node shown
watch(tooltipMnemonics, () => {
  tooltipSearch.value = '';
  modeAutoSet = false;
});

const dictColumns = computed(() => {
  if (displayMode.value !== 'dict') return [];
  const keys = new Set<string>();
  for (const mnem of tooltipMnemonics.value) {
    const v = tryParseJson(tooltipValues.value[mnem]);
    if (isDictObj(v)) Object.keys(v).filter(k => k !== 'ERROR').forEach(k => keys.add(k));
  }
  return Array.from(keys);
});

const filteredRows = computed(() => {
  const search = tooltipSearch.value.toLowerCase().trim();
  let rows = tooltipMnemonics.value.filter((m) => {
    if (!search) return true;
    const shown = displayMnemonic(m).toLowerCase();
    return m.toLowerCase().includes(search) || shown.includes(search);
  });
  if (displayMode.value === 'dict') {
    const alertRows  = rows.filter(m => hasMnemAlert(m, tooltipValues.value));
    const normalRows = rows.filter(m => !hasMnemAlert(m, tooltipValues.value));
    rows = [...alertRows, ...normalRows];
  }
  return rows;
});

// ── Helper functions ───────────────────────────────────────────────────────

function tryParseJson(v: unknown): unknown {
  if (typeof v !== 'string') return v;
  const s = v.trim();
  if ((s.startsWith('{') && s.endsWith('}')) || (s.startsWith('[') && s.endsWith(']'))) {
    try { return JSON.parse(s); } catch { /* not valid JSON */ }
  }
  return v;
}

function isDictObj(v: unknown): v is Record<string, unknown> {
  return v !== null && typeof v === 'object' && !Array.isArray(v);
}

function getDictRowCount(v: Record<string, unknown>): number {
  for (const [k, val] of Object.entries(v)) {
    if (k === 'ERROR') continue;
    if (Array.isArray(val)) return val.length;
  }
  return 1;
}

function getExpandedRows(mnem: string, values: Record<string, unknown>): Array<{ rowIdx: number | null }> {
  const v = tryParseJson(values[mnem]);
  if (!isDictObj(v)) return [{ rowIdx: null }];
  const count = getDictRowCount(v);
  if (count <= 1) return [{ rowIdx: null }];
  return Array.from({ length: count }, (_, i) => ({ rowIdx: i }));
}

function hasMnemAlert(mnem: string, values: Record<string, unknown>): boolean {
  const v = tryParseJson(values[mnem]);
  if (!isDictObj(v)) return false;
  const err = v['ERROR'];
  if (Array.isArray(err)) return err.some(Boolean);
  return Boolean(err);
}

function isDictAlertRow(v: Record<string, unknown>, rowIdx: number | null): boolean {
  const err = v['ERROR'];
  if (rowIdx !== null && Array.isArray(err)) return Boolean(err[rowIdx]);
  return Boolean(err);
}

function isAlertRow(mnem: string, rowIdx: number | null = null): boolean {
  if (displayMode.value !== 'dict') return false;
  const v = tryParseJson(tooltipValues.value[mnem]);
  if (!isDictObj(v)) return false;
  return isDictAlertRow(v, rowIdx);
}

function getDictField(mnem: string, col: string, rowIdx: number | null = null): string {
  const v = tryParseJson(tooltipValues.value[mnem]);
  if (!isDictObj(v)) return '—';
  const colVal = v[col];
  if (rowIdx !== null && Array.isArray(colVal)) return formatValue(colVal[rowIdx]);
  return formatValue(Array.isArray(colVal) ? (colVal[0] ?? '—') : colVal);
}

function formatValue(v: unknown): string {
  const resolved = tryParseJson(v);
  if (resolved === undefined || resolved === null) return "—";
  if (typeof resolved === "number")  return Number.isInteger(resolved) ? String(resolved) : resolved.toFixed(2);
  if (typeof resolved === "boolean") return resolved ? "true" : "false";
  if (typeof resolved === "object" && !Array.isArray(resolved)) {
    return Object.entries(resolved as Record<string, unknown>)
      .map(([k, val]) => `${k}: ${val}`).join(', ');
  }
  return String(resolved);
}

function displayMnemonic(raw: string): string {
  return resolveTelemetryKey(raw);
}

// ── Panel helper functions ─────────────────────────────────────────────────

function getPanelDictColumns(panel: PinnedPanel): string[] {
  if (panel.displayMode !== 'dict') return [];
  const keys = new Set<string>();
  for (const mnem of panel.mnemonics) {
    const v = tryParseJson(panel.values[mnem]);
    if (isDictObj(v)) Object.keys(v).filter(k => k !== 'ERROR').forEach(k => keys.add(k));
  }
  return Array.from(keys);
}

function getPanelFilteredRows(panel: PinnedPanel): string[] {
  const search = panel.search.toLowerCase().trim();
  let rows = panel.mnemonics.filter((m) => {
    if (!search) return true;
    const shown = displayMnemonic(m).toLowerCase();
    return m.toLowerCase().includes(search) || shown.includes(search);
  });
  if (panel.displayMode === 'dict') {
    const alert  = rows.filter(m => hasMnemAlert(m, panel.values));
    const normal = rows.filter(m => !hasMnemAlert(m, panel.values));
    rows = [...alert, ...normal];
  }
  return rows;
}

function isPanelAlertRow(panel: PinnedPanel, mnem: string, rowIdx: number | null = null): boolean {
  if (panel.displayMode !== 'dict') return false;
  const v = tryParseJson(panel.values[mnem]);
  if (!isDictObj(v)) return false;
  return isDictAlertRow(v, rowIdx);
}

function getPanelDictField(panel: PinnedPanel, mnem: string, col: string, rowIdx: number | null = null): string {
  const v = tryParseJson(panel.values[mnem]);
  if (!isDictObj(v)) return '—';
  const colVal = v[col];
  if (rowIdx !== null && Array.isArray(colVal)) return formatValue(colVal[rowIdx]);
  return formatValue(Array.isArray(colVal) ? (colVal[0] ?? '—') : colVal);
}

// ── Tooltip / panel lifecycle ──────────────────────────────────────────────

function refreshTooltipValues() {
  if (!hoveredNodeData.value) return;
  const vals: Record<string, unknown> = {};
  for (const m of tooltipMnemonics.value) {
    let resolved: unknown = undefined;
    for (const key of telemetryKeyAliases(m)) {
      const v = getTelemetryValue(key);
      if (v !== undefined) {
        resolved = v;
        break;
      }
    }
    vals[m] = resolved;
  }
  tooltipValues.value = vals;
}

function showNodeTooltip(nodeData: Record<string, any>, clientX: number, clientY: number) {
  const mnemonics: string[] = nodeData.hoverMnemonics?.length
    ? nodeData.hoverMnemonics
    : (nodeData.telemetryBindings ?? []).map((b: any) => b.topic).filter(Boolean);
  if (!mnemonics.length) return;

  cancelHideTooltip();
  hoveredNodeData.value  = nodeData;
  tooltipMnemonics.value = mnemonics;

  const tw = 420, th = Math.min(180 + mnemonics.length * 36, 560);
  tooltipX.value = Math.min(clientX + 16, Math.max(8, window.innerWidth  - tw - 16));
  tooltipY.value = Math.min(clientY + 16, Math.max(8, window.innerHeight - th - 16));

  refreshTooltipValues();
  if (!tooltipRefreshId) {
    tooltipRefreshId = setInterval(refreshTooltipValues, 200);
  }
}

function resetHoverPanel() {
  hoveredNodeData.value = null;
  tooltipValues.value   = {};
  tooltipSearch.value   = '';
  modeAutoSet           = false;
  if (tooltipRefreshId) { clearInterval(tooltipRefreshId); tooltipRefreshId = null; }
  if (hideTooltipTimer) { clearTimeout(hideTooltipTimer);  hideTooltipTimer = null; }
}

function hideTooltip() {
  hoveredNodeData.value = null;
  tooltipValues.value   = {};
  if (tooltipRefreshId) { clearInterval(tooltipRefreshId); tooltipRefreshId = null; }
  if (hideTooltipTimer) { clearTimeout(hideTooltipTimer);  hideTooltipTimer = null; }
}

function scheduleHideTooltip() {
  if (hideTooltipTimer) clearTimeout(hideTooltipTimer);
  hideTooltipTimer = setTimeout(hideTooltip, 300);
}

function cancelHideTooltip() {
  if (hideTooltipTimer) { clearTimeout(hideTooltipTimer); hideTooltipTimer = null; }
}

function toggleDisplayMode() {
  displayMode.value = displayMode.value === 'simple' ? 'dict' : 'simple';
}

function togglePin() {
  if (hoveredNodeData.value) pinCurrentPanel();
}

function forceHide() {
  resetHoverPanel();
}

// ── Pinning ────────────────────────────────────────────────────────────────

function pinCurrentPanel(): PinnedPanel {
  const id = nextPanelId++;
  const panel: PinnedPanel = {
    id,
    nodeData:    hoveredNodeData.value!,
    mnemonics:   [...tooltipMnemonics.value],
    x:           tooltipX.value,
    y:           tooltipY.value,
    values:      { ...tooltipValues.value },
    displayMode: displayMode.value,
    search:      '',
    isDragging:  false,
    refreshId:   null,
  };
  panel.refreshId = setInterval(() => {
    const idx = pinnedPanels.value.findIndex(p => p.id === id);
    if (idx === -1) return;
    const vals: Record<string, unknown> = {};
    for (const mnem of panel.mnemonics) {
      let resolved: unknown = undefined;
      for (const key of telemetryKeyAliases(mnem)) {
        const v = getTelemetryValue(key);
        if (v !== undefined) {
          resolved = v;
          break;
        }
      }
      vals[mnem] = resolved;
    }
    pinnedPanels.value[idx].values = vals;
  }, 200);
  pinnedPanels.value.push(panel);
  resetHoverPanel();
  return panel;
}

function removePinnedPanel(id: number) {
  const idx = pinnedPanels.value.findIndex(p => p.id === id);
  if (idx === -1) return;
  const panel = pinnedPanels.value[idx];
  if (panel.refreshId) clearInterval(panel.refreshId);
  pinnedPanels.value.splice(idx, 1);
}

function togglePinnedPanelMode(id: number) {
  const idx = pinnedPanels.value.findIndex(p => p.id === id);
  if (idx === -1) return;
  pinnedPanels.value[idx].displayMode =
    pinnedPanels.value[idx].displayMode === 'simple' ? 'dict' : 'simple';
}

// ── Drag handlers ──────────────────────────────────────────────────────────

function onPanelDragStart(e: MouseEvent) {
  if ((e.target as HTMLElement).closest('button, input')) return;
  const newPanel    = pinCurrentPanel();
  pinnedDraggingId  = newPanel.id;
  pinnedDragOffsetX = e.clientX - newPanel.x;
  pinnedDragOffsetY = e.clientY - newPanel.y;
  const idx = pinnedPanels.value.findIndex(p => p.id === newPanel.id);
  if (idx !== -1) pinnedPanels.value[idx].isDragging = true;
  window.addEventListener('mousemove', onPinnedPanelDrag);
  window.addEventListener('mouseup',   onPinnedPanelDragEnd);
  e.preventDefault();
}

function onPinnedPanelDragStart(e: MouseEvent, id: number) {
  if ((e.target as HTMLElement).closest('button, input')) return;
  const idx = pinnedPanels.value.findIndex(p => p.id === id);
  if (idx === -1) return;
  pinnedDraggingId  = id;
  pinnedDragOffsetX = e.clientX - pinnedPanels.value[idx].x;
  pinnedDragOffsetY = e.clientY - pinnedPanels.value[idx].y;
  pinnedPanels.value[idx].isDragging = true;
  window.addEventListener('mousemove', onPinnedPanelDrag);
  window.addEventListener('mouseup',   onPinnedPanelDragEnd);
  e.preventDefault();
}

function onPinnedPanelDrag(e: MouseEvent) {
  if (pinnedDraggingId === null) return;
  const idx = pinnedPanels.value.findIndex(p => p.id === pinnedDraggingId);
  if (idx === -1) return;
  pinnedPanels.value[idx].x = Math.max(0, Math.min(e.clientX - pinnedDragOffsetX, window.innerWidth  - 420));
  pinnedPanels.value[idx].y = Math.max(0, Math.min(e.clientY - pinnedDragOffsetY, window.innerHeight - 80));
}

function onPinnedPanelDragEnd() {
  if (pinnedDraggingId !== null) {
    const idx = pinnedPanels.value.findIndex(p => p.id === pinnedDraggingId);
    if (idx !== -1) pinnedPanels.value[idx].isDragging = false;
  }
  pinnedDraggingId = null;
  window.removeEventListener('mousemove', onPinnedPanelDrag);
  window.removeEventListener('mouseup',   onPinnedPanelDragEnd);
}

// ── Viewport persist ─────────────────────────────────────────────────────

/** Read the scroller container from the X6 Scroller plugin. */
function getScrollerEl(g: Graph): HTMLElement | null {
  const scroller = g.getPlugin("scroller") as { container?: HTMLElement } | null;
  return scroller?.container ?? null;
}

/** Capture the current zoom + viewport center in graph-local coordinates. */
function captureViewport(g: Graph): ViewportState | null {
  const zoom = g.zoom();
  if (!Number.isFinite(zoom) || zoom <= 0) return null;
  const el = getScrollerEl(g);
  if (!el) return null;
  // Centre of the visible scroller area in client coords → graph-local coords
  const rect = el.getBoundingClientRect();
  const clientCx = rect.left + rect.width  / 2;
  const clientCy = rect.top  + rect.height / 2;
  const local = g.clientToLocal({ x: clientCx, y: clientCy });
  return { zoom, cx: Math.round(local.x), cy: Math.round(local.y) };
}

/** Restore a saved viewport (zoom + center). */
// True while we are programmatically restoring a saved viewport. The zoomTo /
// centerPoint calls below emit "scale"/"scroll" events that look identical to a
// user pan/zoom, which would otherwise trigger a viewport save (PATCH) of the
// value we just restored — on every diagram load/auto-view hop.
let applyingViewport = false;

async function applyViewport(g: Graph, vp: ViewportState) {
  applyingViewport = true;
  g.zoomTo(vp.zoom);
  await nextTick();
  g.centerPoint(vp.cx, vp.cy);
  // Release one more tick later so the trailing scroll event is also ignored.
  await nextTick();
  applyingViewport = false;
}

let viewportSaveTimer: ReturnType<typeof setTimeout> | null = null;
let viewportScrollCleanup: (() => void) | null = null;

/** Debounce-save the viewport state to the backend (2 s after last change). */
function scheduleViewportSave(g: Graph, id: string) {
  // Never persist viewport changes during auto-view cycling, nor while we are
  // programmatically restoring a saved viewport — those aren't user intent.
  if (autoViewActive.value || applyingViewport) return;
  if (viewportSaveTimer) clearTimeout(viewportSaveTimer);
  viewportSaveTimer = setTimeout(async () => {
    viewportSaveTimer = null;
    const vp = captureViewport(g);
    if (!vp) return;
    await DiagramStorage.patchDiagram(id, { viewportState: vp });
  }, 2000);
}

/** Attach zoom + pan listeners for the given graph/diagram and tear down old ones. */
function attachViewportListeners(g: Graph, id: string) {
  // Tear down previous listeners if diagram switched
  viewportScrollCleanup?.();
  viewportScrollCleanup = null;

  const onViewportChange = () => scheduleViewportSave(g, id);

  // Zoom: X6 emits "scale" on the graph
  g.on("scale", onViewportChange);

  // Pan: listen to scroll on the scroller container element
  const el = getScrollerEl(g);
  if (el) {
    el.addEventListener("scroll", onViewportChange, { passive: true });
    viewportScrollCleanup = () => {
      el.removeEventListener("scroll", onViewportChange);
      g.off("scale", onViewportChange);
    };
  } else {
    viewportScrollCleanup = () => { g.off("scale", onViewportChange); };
  }
}

// ── Graph ready / load ───────────────────────────────────────────────────

function onGraphReady(g: Graph) {
  graph = g;
  graphEventsRegistered = false;
  // Use data already fetched by loadDiagram — no second round-trip needed
  const data = pendingDiagramData;
  pendingDiagramData = null;
  // Don't await here — onGraphReady is a sync callback from X6 canvas mount.
  // loadDiagramIntoGraph manages loading.value internally; the void is intentional.
  void loadDiagramIntoGraph(data ?? undefined).then(() => {
    // If user clicked Connect before the diagram finished loading, start now
    if (pendingNatsConnect) connectNats();
  });
}

/**
 * Retry loading after a transient backend failure (e.g. NATS/gateway restart).
 * Re-fetches from the backend (bypassing any auto-view cache) and, if telemetry
 * dropped, reconnects. Lets the user recover in-session without a full reload.
 */
async function retryLoadDiagram() {
  DiagramStorage.invalidateDiagramCache(diagramId.value);
  await loadDiagram();
  if (found.value && !natsConnected.value) connectNats();
}

async function loadDiagram() {
  loading.value = true;
  loadErrorDetail.value = "";
  partialLoadWarning.value = "";

  // Use the auto-view in-memory cache when cycling — avoids a backend fetch
  // on every hop. Falls back to a full getDiagram() on cache miss (first visit
  // in a session or after cache was cleared by startAutoView()).
  // Treat the ?autoview=true URL the same as an active session so the very
  // first diagram is cached on initial load and isn't re-fetched once cycling
  // returns to it.
  const useAutoViewCache = autoViewActive.value || route.query.autoview === "true";
  // viewOnly=true: server strips raw modelData when viewModelData is present,
  // halving the payload (~564 KB → ~320 KB before gzip, ~25 KB after).
  const data = useAutoViewCache
    ? await DiagramStorage.getForAutoView(diagramId.value)
    : await DiagramStorage.getDiagram(diagramId.value, true);
  found.value = !!data;

  if (data && isLikelyLegacyModel(data.modelData)) {
    // Legacy mode has been removed: keep the viewer in a clear unsupported
    // state instead of trying to render/edit legacy SVG payloads.
    found.value = false;
    loading.value = false;
    loadErrorDetail.value = "Legacy diagrams are no longer supported. Open this diagram in the X6 editor and resave it in the current format.";
    return;
  }

  // Normal X6 diagram path
  if (graph) {
    // Canvas already mounted — reuse the same graph instance, no unmount/remount.
    // await so loadDiagramIntoGraph can manage loading.value itself (progressive
    // loader is async — without await, loading=false fires before cells render).
    if (data) await loadDiagramIntoGraph(data);
    loading.value = false;
    return;
  }
  // First load only — canvas not mounted yet, need loading gate
  pendingDiagramData = data ?? null;
  loading.value = false;
  // X6Canvas mounts → onGraphReady fires → loadDiagramIntoGraph(pendingDiagramData)
}

/**
 * Graceful fallback for graph.fromJSON() failures.
 *
 * When one bad cell (unknown shape, malformed binding, etc.) causes fromJSON to
 * throw, the whole canvas goes blank even though 99% of cells are fine. This
 * function adds cells one-by-one — nodes first so edges can resolve their
 * endpoints — and silently skips any that throw, letting the good cells render.
 *
 * Returns { loaded, failed, errors } so the caller can show a non-blocking
 * warning instead of a full "diagram failed to load" error screen.
 */
function safeFromJSON(
  g: Graph,
  json: { cells: Record<string, unknown>[] },
): { loaded: number; failed: number; errors: string[] } {
  // Edges reference node IDs — always add nodes first.
  const isEdgeCell = (c: Record<string, unknown>) =>
    c.source !== undefined && c.target !== undefined;

  const nodes  = json.cells.filter(c => !isEdgeCell(c));
  const edges  = json.cells.filter(c =>  isEdgeCell(c));
  const errors: string[] = [];
  let loaded = 0;

  g.startBatch("safe-load");
  for (const cellData of [...nodes, ...edges]) {
    try {
      if (isEdgeCell(cellData)) {
        g.addEdge(cellData as any);
      } else {
        g.addNode(cellData as any);
      }
      loaded++;
    } catch (err) {
      const id    = String(cellData.id    ?? "?");
      const shape = String(cellData.shape ?? "?");
      errors.push(`cell ${id} (shape="${shape}"): ${err instanceof Error ? err.message : String(err)}`);
    }
  }
  g.stopBatch("safe-load");

  return { loaded, failed: errors.length, errors };
}

/**
 * Progressive cell loader — replaces a single blocking g.fromJSON() call with
 * batched insertion that yields a requestAnimationFrame between each chunk.
 *
 * Why: X6 creates SVG elements synchronously. A 200-cell diagram can block the
 * JS thread for 8–15 s in one shot. Loading in chunks of CHUNK_SIZE lets the
 * browser repaint between batches so the diagram appears to build up
 * incrementally and the page stays responsive throughout.
 *
 * Nodes are always loaded before edges (X6 requires source/target to exist).
 * On error a cell is silently skipped (same behaviour as safeFromJSON).
 * Returns the number of cells successfully added.
 */
async function progressiveFromJSON(
  g: Graph,
  json: { cells: Record<string, unknown>[] },
  onProgress?: (loaded: number, total: number) => void,
  CHUNK_SIZE = 20,
): Promise<number> {
  const isEdge = (c: Record<string, unknown>) =>
    c.source !== undefined && c.target !== undefined;

  const nodes = json.cells.filter(c => !isEdge(c));
  const edges = json.cells.filter(c =>  isEdge(c));
  const total = nodes.length + edges.length;
  let loaded  = 0;

  const yieldFrame = () => new Promise<void>(r => requestAnimationFrame(() => r()));

  // ── Nodes ──
  for (let i = 0; i < nodes.length; i += CHUNK_SIZE) {
    g.startBatch("progressive-load");
    for (const cell of nodes.slice(i, i + CHUNK_SIZE)) {
      try { g.addNode(cell as any); loaded++; } catch { /* skip bad cell */ }
    }
    g.stopBatch("progressive-load");
    onProgress?.(loaded, total);
    await yieldFrame();
  }

  // ── Edges (after all nodes exist) ──
  for (let i = 0; i < edges.length; i += CHUNK_SIZE) {
    g.startBatch("progressive-load");
    for (const cell of edges.slice(i, i + CHUNK_SIZE)) {
      try { g.addEdge(cell as any); loaded++; } catch { /* skip bad cell */ }
    }
    g.stopBatch("progressive-load");
    onProgress?.(loaded, total);
    await yieldFrame();
  }

  return loaded;
}

async function loadDiagramIntoGraph(data?: DiagramData) {
  const g = graph;          // capture locally — safe across awaits
  if (!g) return;
  // Use the auto-view cache when cycling so we never hit the backend mid-session.
  // Only fall back to getDiagram() for manual (non-auto-view) loads.
  const d = data ?? (autoViewActive.value
    ? await DiagramStorage.getForAutoView(diagramId.value)
    : await DiagramStorage.getDiagram(diagramId.value, true));
  if (!d || g !== graph) return;  // bail if stale
  try {
    // Restore canvas background colour saved by the editor
    if (d.backgroundColor) {
      g.drawBackground({ color: d.backgroundColor });
    }
    // Prefer the view-optimised copy (topics stripped to bare paramIds so NATS
    // messages match directly with no gateway round-trip).  Fall back to the
    // full modelData for diagrams saved before this feature was introduced.
    // NOTE: use || not ?? — an empty-string viewModelData ("") must fall back to
    // modelData, otherwise JSON.parse("") throws and the graph renders blank.
    const rawModel = d.viewModelData || d.modelData;
    // Auto-view keeps diagrams in an in-memory cache. When modelData/viewModelData
    // is already an object (not a JSON string), clone before touching it; this
    // function mutates cell fields (e.g. router normalization), and mutating the
    // cached object can make later cycles reuse stale/partially-modified cells.
    const json = typeof rawModel === "string"
      ? JSON.parse(rawModel)
      : (globalThis.structuredClone
        ? globalThis.structuredClone(rawModel)
        : JSON.parse(JSON.stringify(rawModel)));
    // Viewer-only route policy: freeze ALL edges to passthrough so they render
    // pixel-for-pixel identical to the editor — no re-routing ever in view mode.
    // For edges whose router computes intermediate waypoints (manhattan, orth, er)
    // the editor stores the live route as `_frozenVertices` at save time; we
    // inject those here so the path is exact.  For straight-line edges (normal)
    // or any edge without stored vertices, passthrough with no extra vertices
    // simply draws a direct segment — the same result those routers produce.
    // Already-passthrough edges (pen-drawn freehand paths etc.) are left alone.
    if (json && Array.isArray(json.cells)) {
      for (const c of json.cells as Array<Record<string, unknown>>) {
        const isEdge = c.source !== undefined && c.target !== undefined;
        if (isEdge) {
          const data = (c.data ?? {}) as Record<string, unknown>;
          const savedRouter = c.router as any;
          const savedRouterName: string =
            typeof savedRouter === "string" ? savedRouter : (savedRouter?.name ?? "");
          // Skip edges already frozen to passthrough (pen-drawn paths, etc.)
          if (savedRouterName === "passthrough") continue;
          // Inject frozen waypoints captured at save time so the path is
          // identical to what the editor displayed.
          const frozenVerts = data._frozenVertices as { x: number; y: number }[] | undefined;
          if (frozenVerts && frozenVerts.length > 0) {
            c.vertices = frozenVerts;
          }
          c.router = { name: "passthrough" };
          c.data = { ...data, router: "passthrough" };
          continue;
        }

        const nodeData = (c.data ?? {}) as Record<string, unknown>;
        const isHeaterPlate = c.shape === "scada-heater-plate" || nodeData.category === "HeaterPlate";
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
    // Guard against an empty/invalid model wiping the canvas: only swap cells in
    // when we actually parsed a non-empty graph. fromJSON({cells:[]}) would clear
    // everything and leave a blank diagram with no way to recover in-session.
    if (json && Array.isArray(json.cells) && json.cells.length > 0) {
      // View mode uses a single-pass load so the first paint happens as soon as
      // possible. Keep the canvas mounted, do one graph swap, and let telemetry
      // rebind after the diagram is visible.
      canvasLoading.value = true;
      loadingPct.value    = 0;
      await nextTick();

      g.clearCells();
      try {
        g.startBatch("fast-view-load");
        g.fromJSON(json as { cells: Record<string, unknown>[] });
      } catch (err) {
        // If a single malformed cell breaks the fast path, fall back to the
        // defensive loader so the rest of the diagram can still appear.
        g.clearCells();
        const fallback = safeFromJSON(
          g,
          json as { cells: Record<string, unknown>[] },
        );
        if (fallback.loaded === 0 && json.cells.length > 0) {
          throw new Error(`No cells could be loaded (0 of ${json.cells.length})`);
        }
        if (fallback.failed > 0) {
          partialLoadWarning.value =
            `⚠ ${fallback.failed} cell(s) could not be rendered and were skipped ` +
            `(${fallback.loaded} of ${json.cells.length} cells loaded). ` +
            `Check the browser console for details.`;
        }
      } finally {
        try {
          g.stopBatch("fast-view-load");
        } catch {
          // Ignore batch-stop errors when the graph was already reset.
        }
      }
      canvasLoading.value = false;
      loadingPct.value    = 0;
    } else {
      console.warn("[ViewerPage] model has no cells — keeping current canvas", d.id);
    }
    // Safety net + visual-attrs: combined into one batchUpdate so X6 flushes
    // all edge changes — router, vertices, stroke/width/markers — in a single
    // synchronized render pass.
    //
    // Safety net purpose: force every non-passthrough edge to passthrough so
    // no routing algorithm runs in view mode.  Covers:
    //   • safeFromJSON fallback path (cell-by-cell load)
    //   • any case where X6's fromJSON re-applies the graph-level
    //     connecting.router (orth) instead of the per-edge router in JSON
    //
    // Vertices: inject _frozenVertices (captured at editor-save time) so the
    // passthrough router replays the exact path the editor displayed.
    g.batchUpdate(() => {
      g.getEdges().forEach((edge) => {
        // ── Router freeze ──
        const r = edge.prop("router") as any;
        const rName: string = typeof r === "string" ? r : (r?.name ?? "");
        if (rName !== "passthrough") {
          const d = (edge.getData() ?? {}) as Record<string, unknown>;
          const fv = d._frozenVertices as { x: number; y: number }[] | undefined;
          if (fv && fv.length > 0) {
            edge.setVertices(fv);
          }
          // Use prop() so the change is guaranteed to fire a model-change event
          // that X6 picks up when the batch flushes.
          edge.prop("router", { name: "passthrough" });
        }
        // ── Visual attrs ──
        applyEdgeVisualsFromData(edge, (edge.getData() ?? {}) as Record<string, unknown>);
      });
    });
    await nextTick();
    // Re-sync graph size every load to keep the viewer canvas full-height across
    // auto-view hops, even when previous diagrams had active scrollbars.
    resizeGraphToScroller(g);

    // `?fit=1` is used when opening viewer from editor so the freshly edited
    // diagram is shown fitted to the current viewport instead of reusing an
    // older saved pan/zoom state from a previous viewer session.
    const forceFit = route.query.fit === "1";

    // Restore saved viewport, or fall back to fit-to-screen for first-time loads
    if (d.viewportState && !forceFit) {
      await applyViewport(g, d.viewportState);
    } else {
      zoomGraphToFit(g);
    }

    // Attach pan/zoom listeners so the viewport is auto-saved on change
    attachViewportListeners(g, d.id);

    // Register events only once per graph instance — reused across diagram switches
    if (!graphEventsRegistered) {
      graphEventsRegistered = true;

      g.on("node:dblclick", ({ node }: any) => {
        const nd = node.getData() as Record<string, any> ?? {};
        const tcs = (nd.telecommands ?? []) as string[];
        if (!tcs.length) return;
        tcSelectorCommands.value    = tcs;
        tcSelectorElementName.value = nd.name || nd.label || nd.category || "";
        showTcSelector.value        = true;
      });

      g.on("node:mouseenter", ({ node, e }: any) => {
        showNodeTooltip(node.getData() ?? {}, e.clientX, e.clientY);
      });
      g.on("node:mousemove", ({ e }: any) => {
        if (!hoveredNodeData.value || pinnedDraggingId !== null) return;
        const tw = 420, th = Math.min(180 + tooltipMnemonics.value.length * 36, 560);
        tooltipX.value = Math.min(e.clientX + 16, Math.max(8, window.innerWidth  - tw - 16));
        tooltipY.value = Math.min(e.clientY + 16, Math.max(8, window.innerHeight - th - 16));
      });
      g.on("node:mouseleave", () => { scheduleHideTooltip(); });
    }

    // Rebind NATS telemetry to the newly loaded nodes.
    // Always call connectNats() here: depending on timing, the earlier
    // pre-connect (started before progressive render) may still be in
    // handshake and won't have indexed the freshly loaded cells yet.
    // connectNats() already has a fast path that reuses the live socket and
    // only rebinds when config is unchanged.
    connectNats();
  } catch (e) {
    // A render failure (e.g. unregistered shape, malformed cell) used to leave a
    // silent blank canvas. Surface it so the user/operator sees the real cause.
    console.error("[ViewerPage] Failed to render diagram:", e);
    loadErrorDetail.value = e instanceof Error ? e.message : String(e);
    canvasLoading.value = false;
    loadingPct.value    = 0;
    found.value = false;
  }

  // Schedule next auto-view switch — outside try/catch so errors don't break the cycle
  if (autoViewActive.value) {
    scheduleNextAutoView(effectiveDuration(d));
  }
}

// ── Navigation ───────────────────────────────────────────────────────────

function onSwitchDiagram() {
  if (diagramId.value !== route.params.id) {
    router.push(`/viewer/${diagramId.value}`);
  }
}

function fitToScreen() {
  if (!graph) return;
  void nextTick(() => {
    zoomGraphToFit(graph!);
  });
}

function editDiagram() {
  if (autoViewTimer) { clearInterval(autoViewTimer); autoViewTimer = null; }
  router.push(`/editor/${diagramId.value}`);
}

async function doLogout() {
  if (autoViewTimer) { clearInterval(autoViewTimer); autoViewTimer = null; }
  await auth.logout();
  router.replace("/login");
}

function goBack() {
  if (autoViewTimer) { clearInterval(autoViewTimer); autoViewTimer = null; }
  router.push("/");
}
</script>

<style scoped>
.viewer-page {
  display: flex;
  flex-direction: column;
  height: 100vh;
  overflow: hidden;
  background: #0f1419;
  color: #e6edf3;
}

.nav-trigger {
  position: fixed;
  top: 0; left: 0; right: 0;
  height: 6px;
  z-index: 101;
}

.topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 1rem;
  height: 52px;
  flex-shrink: 0;
  background: linear-gradient(135deg, #2c3e50, #34495e);
  border-bottom: 1px solid #30363d;
  position: fixed;
  top: 0; left: 0; right: 0;
  z-index: 100;
  transform: translateY(-100%);
  transition: transform 0.25s ease;
  box-shadow: 0 2px 8px rgba(0,0,0,0.3);
}
.topbar.visible { transform: translateY(0); }

.topbar-left, .topbar-center, .topbar-right {
  display: flex; align-items: center; gap: 0.6rem; flex: 1;
}
.topbar-center { justify-content: center; }
.topbar-right  { justify-content: flex-end; }

.user-badge {
  display: inline-flex;
  flex-direction: column;
  align-items: flex-end;
  line-height: 1;
  color: #dbeafe;
  font-size: 0.8rem;
}

.user-badge small {
  color: #93c5fd;
  margin-top: 2px;
}

.btn-back {
  padding: 0.35rem 0.75rem;
  background: rgba(255,255,255,0.15);
  color: #fff;
  border: 1px solid rgba(255,255,255,0.2);
  border-radius: 4px;
  font-size: 0.85rem;
  cursor: pointer;
}

.btn-logout {
  padding: 0.35rem 0.7rem;
  border-radius: 7px;
  border: 1px solid rgba(244, 63, 94, 0.5);
  background: rgba(225, 29, 72, 0.2);
  color: #ffe4e6;
  cursor: pointer;
}

.btn-logout:hover {
  background: rgba(225, 29, 72, 0.35);
}

.btn-login {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.35rem 0.7rem;
  background: rgba(74, 158, 255, 0.2);
  border: 1px solid rgba(74, 158, 255, 0.55);
  border-radius: 7px;
  color: #74d7ff;
  font-size: 0.95rem;
  font-weight: 500;
  cursor: pointer;
  text-decoration: none;
  transition: background 0.15s, border-color 0.15s;
}

.btn-login:hover {
  background: rgba(74, 158, 255, 0.35);
  border-color: rgba(74, 158, 255, 0.75);
}

/* Unauthenticated viewer banner */
.viewer-banner {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.85rem 1.25rem;
  background: rgba(74, 158, 255, 0.1);
  border: 1px solid rgba(74, 158, 255, 0.3);
  border-radius: 6px;
  color: #a8d5ff;
  font-size: 0.95rem;
  margin-bottom: 1rem;
}

.banner-icon {
  font-size: 1.2rem;
  flex-shrink: 0;
}

.banner-text {
  flex-grow: 1;
}

.banner-link {
  display: inline-flex;
  align-items: center;
  padding: 0.3rem 0.6rem;
  background: rgba(74, 158, 255, 0.25);
  border: 1px solid rgba(74, 158, 255, 0.5);
  border-radius: 5px;
  color: #74d7ff;
  text-decoration: none;
  font-weight: 600;
  font-size: 0.9rem;
  cursor: pointer;
  transition: background 0.15s;
  flex-shrink: 0;
}

.banner-link:hover {
  background: rgba(74, 158, 255, 0.4);
}

.btn-back:hover { background: rgba(255,255,255,0.25); }

.diagram-select {
  padding: 0.35rem 0.75rem;
  background: rgba(255,255,255,0.15);
  color: #fff;
  border: 1px solid rgba(255,255,255,0.2);
  border-radius: 4px;
  font-size: 0.9rem;
  min-width: 8rem;
  max-width: 18rem;
}
.diagram-select option { background: #2c3e50; }

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

.app-icon  { font-size: 1.4rem; }
.app-title { font-size: 1rem; font-weight: 700; color: #fff; }
.app-badge {
  font-size: 0.7rem;
  background: rgba(39,174,96,0.2);
  color: #27ae60;
  border: 1px solid rgba(39,174,96,0.4);
  border-radius: 8px;
  padding: 1px 6px;
}

.btn-autoview {
  padding: 0.3rem 0.75rem;
  background: rgba(39,174,96,0.25);
  color: #2ecc71;
  border: 1px solid rgba(39,174,96,0.5);
  border-radius: 5px;
  font-size: 0.82rem;
  font-weight: 600;
  cursor: pointer;
}
.btn-autoview.paused { background: rgba(243,156,18,0.25); color: #f39c12; border-color: rgba(243,156,18,0.5); }

.nats-badge {
  font-size: 0.8rem;
  padding: 0.25rem 0.6rem;
  border-radius: 10px;
  background: rgba(0,0,0,0.3);
}
.nats-badge.connected { background: #4caf50; color: #fff; }

/* ── Telemetry chain status badges ──────────────────────────────────────── */
.chain-status-bar {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  flex-wrap: wrap;
  justify-content: center;
}

.chain-badge {
  font-size: 0.7rem;
  font-weight: 700;
  padding: 0.18rem 0.6rem;
  border-radius: 10px;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  cursor: default;
  transition: background 0.4s, color 0.4s, border-color 0.4s;
  border: 1px solid transparent;
  white-space: nowrap;
}
.chain-green { background: rgba(39,174,96,0.18);  color: #2ecc71; border-color: rgba(39,174,96,0.4); }
.chain-red   { background: rgba(231,76,60,0.2);   color: #e74c3c; border-color: rgba(231,76,60,0.4); }
.chain-grey  { background: rgba(139,148,158,0.12); color: #8b949e; border-color: rgba(139,148,158,0.25); }

.btn-fit, .btn-nats, .btn-edit, .btn-pin {
  padding: 0.3rem 0.7rem;
  background: rgba(255,255,255,0.12);
  color: #ddd;
  border: 1px solid rgba(255,255,255,0.18);
  border-radius: 4px;
  font-size: 0.82rem;
  cursor: pointer;
}
.btn-fit:hover, .btn-nats:hover, .btn-edit:hover, .btn-pin:hover { background: rgba(255,255,255,0.22); color: #fff; }

/* ── Command queue button ──────────────────────────────────────────────── */
.btn-cmd-queue {
  position: relative;
  padding: 0.3rem 0.7rem;
  background: rgba(255,255,255,0.12);
  color: #ddd;
  border: 1px solid rgba(255,255,255,0.18);
  border-radius: 4px;
  font-size: 0.82rem;
  cursor: pointer;
  transition: background .15s, border-color .15s;
}
.btn-cmd-queue:hover { background: rgba(255,255,255,0.22); color: #fff; }
.btn-cmd-queue.has-commands {
  border-color: #1a73e8;
  color: #6ab3ff;
}
.cmd-queue-badge {
  display: inline-flex; align-items: center; justify-content: center;
  min-width: 18px; height: 18px;
  background: #1a73e8; color: #fff;
  border-radius: 9px; font-size: 10px; font-weight: 700;
  padding: 0 5px; margin-left: 5px;
  vertical-align: middle;
}

.viewer-area {
  position: relative; /* needed so .graph-loading-overlay (position:absolute) covers the canvas */
  flex: 1;
  min-height: 0;
  width: 100%;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

/* Legacy diagram layout */
.viewer-area.has-side-panel {
  flex-direction: row;
}

.legacy-main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.legacy-toolbar {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 16px;
  background: rgba(8, 18, 26, 0.9);
  border-bottom: 1px solid rgba(176, 205, 215, 0.1);
  flex-shrink: 0;
  flex-wrap: wrap;
}

.btn-legacy-bindings {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  border: 1px solid rgba(163, 199, 213, 0.28);
  border-radius: 999px;
  height: 34px;
  padding: 0 14px;
  cursor: pointer;
  background: rgba(9, 22, 29, 0.74);
  color: #e8edf2;
  font-size: 13px;
}

.btn-legacy-bindings.active {
  border-color: rgba(130, 217, 186, 0.5);
  background: rgba(61, 182, 135, 0.18);
  color: #82d9ba;
}

.binding-badge {
  background: rgba(61, 182, 135, 0.35);
  border-radius: 999px;
  padding: 1px 7px;
  font-size: 11px;
  color: #82d9ba;
}

.selected-comp-hint {
  font-size: 12px;
  color: #82d9ba;
  font-style: italic;
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.btn-legacy-save {
  display: inline-flex;
  align-items: center;
  border: 1px solid rgba(130, 217, 186, 0.35);
  border-radius: 999px;
  height: 34px;
  padding: 0 14px;
  cursor: pointer;
  background: linear-gradient(135deg, rgba(61,182,135,0.28), rgba(25,122,144,0.3));
  color: #e8edf2;
  font-size: 13px;
}

.btn-legacy-save:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.legacy-save-msg {
  font-size: 13px;
}
.legacy-save-msg.ok  { color: #82d9ba; }
.legacy-save-msg.err { color: #f08080; }

.legacy-svg-area {
  flex: 1;
  overflow: auto;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding: 24px;
  cursor: pointer;
  background:
    linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px),
    linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px),
    #0a1520;
  background-size: 24px 24px;
}

.legacy-svg-area.legacy-svg-area--edit {
  cursor: crosshair;
}

:deep(.legacy-svg-area svg) {
  max-width: 100%;
  height: auto;
}

/* Side panel */
.legacy-side-panel {
  width: 360px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  background: #081218;
  border-left: 1px solid rgba(176, 205, 215, 0.12);
  overflow: hidden;
}

.lsp-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px 10px;
  border-bottom: 1px solid rgba(176, 205, 215, 0.1);
  flex-shrink: 0;
}

.lsp-header h3 {
  margin: 0;
  font-size: 1rem;
}

.lsp-close {
  background: none;
  border: none;
  color: #8ea8b4;
  cursor: pointer;
  font-size: 16px;
  line-height: 1;
  padding: 4px;
}

.lsp-close:hover { color: #e8edf2; }

.lsp-comp-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 10px;
  max-height: 220px;
  overflow-y: auto;
  flex-shrink: 0;
  border-bottom: 1px solid rgba(176, 205, 215, 0.1);
}

.lsp-comp-item {
  display: grid;
  grid-template-columns: 1fr auto;
  grid-template-rows: auto auto;
  gap: 1px 8px;
  padding: 8px 10px;
  border-radius: 10px;
  border: 1px solid transparent;
  background: rgba(255,255,255,0.03);
  cursor: pointer;
  text-align: left;
  color: #e8edf2;
}

.lsp-comp-item.active {
  border-color: rgba(130, 217, 186, 0.4);
  background: rgba(61, 182, 135, 0.1);
}

.lsp-comp-item:hover:not(.active) {
  background: rgba(255,255,255,0.06);
}

.lsp-comp-symbol {
  font-size: 13px;
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.lsp-comp-id {
  font-size: 11px;
  color: #8ea8b4;
  grid-column: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.lsp-comp-count {
  grid-row: 1 / 3;
  grid-column: 2;
  align-self: center;
  font-size: 11px;
  color: #82d9ba;
  white-space: nowrap;
}

.lsp-inspector {
  flex: 1;
  overflow-y: auto;
  padding: 12px;
}

.lsp-empty {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  text-align: center;
  color: #8ea8b4;
  line-height: 1.6;
  font-size: 14px;
}

/* Progressive-render overlay: floats above the X6 canvas without unmounting it */
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

.state-msg {
  margin: auto;
  font-size: 1.2rem;
  color: #8b949e;
}
.state-msg.error { color: #e74c3c; }
.state-msg-detail {
  font-size: 0.8rem;
  color: #f08080;
  margin-top: 0.35rem;
  font-family: monospace;
  max-width: 520px;
  word-break: break-word;
  white-space: pre-wrap;
}
.state-msg-sub {
  font-size: 0.85rem;
  color: #8ea8b4;
  margin-top: 0.4rem;
}
.btn-reload-diagram {
  margin-top: 0.9rem;
  padding: 0.4rem 1rem;
  background: rgba(74,158,255,0.12);
  border: 1px solid rgba(74,158,255,0.4);
  color: #9cc9ff;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.9rem;
}
.btn-reload-diagram:hover { background: rgba(74,158,255,0.22); }

/* ── Partial-load warning banner ─────────────────────────────────────────── */
.partial-load-banner {
  position: absolute;
  top: 8px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 120;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 7px 14px;
  background: rgba(180, 100, 0, 0.88);
  border: 1px solid rgba(255,160,0,0.55);
  border-radius: 6px;
  font-size: 0.82rem;
  color: #ffe0a0;
  max-width: 680px;
  text-align: center;
  backdrop-filter: blur(4px);
  pointer-events: auto;
}
.partial-load-dismiss {
  flex-shrink: 0;
  background: none;
  border: none;
  color: #ffe0a0;
  cursor: pointer;
  font-size: 0.9rem;
  line-height: 1;
  padding: 0 2px;
  opacity: 0.75;
}
.partial-load-dismiss:hover { opacity: 1; }

/* ── NATS modal ─────────────────────────────────────────────────────────── */
.modal-backdrop {
  position: fixed; inset: 0;
  background: rgba(0,0,0,0.55);
  z-index: 9000;
  display: flex; align-items: center; justify-content: center;
}
.modal {
  background: #161b22;
  border: 1px solid #30363d;
  border-radius: 10px;
  width: 380px;
  max-width: 96vw;
  overflow: hidden;
}
.modal-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 14px 18px 10px;
  border-bottom: 1px solid #30363d;
}
.modal-header h3 { margin: 0; font-size: 14px; font-weight: 700; color: #e6edf3; }
.modal-close { background: none; border: none; font-size: 1.4rem; color: #8b949e; cursor: pointer; }
.modal-body { padding: 14px 18px; display: flex; flex-direction: column; gap: 10px; }

.conn-status { font-size: 12px; font-weight: 700; padding: 5px 8px; border-radius: 5px; }
.conn-status.ok  { background: rgba(39,174,96,0.15); color: #27ae60; }
.conn-status.off { background: rgba(139,148,158,0.12); color: #8b949e; }

.modal-field { display: flex; flex-direction: column; gap: 3px; }
.modal-field span { font-size: 10px; font-weight: 700; color: #8b949e; text-transform: uppercase; letter-spacing: 0.04em; }
.modal-input {
  background: #0d1117; border: 1px solid #30363d; border-radius: 5px;
  color: #c9d1d9; font-size: 12px; padding: 5px 8px; outline: none;
}
.modal-input:focus { border-color: #4a9eff; }
.modal-input:disabled { opacity: 0.5; }

.modal-footer {
  display: flex; justify-content: flex-end; gap: 8px;
  padding: 10px 18px;
  border-top: 1px solid #30363d;
}
.btn-cancel    { padding: 6px 14px; background: #21262d; border: 1px solid #30363d; border-radius: 5px; color: #c9d1d9; font-size: 12px; cursor: pointer; }
.btn-connect   { padding: 6px 16px; background: #3498db; color: #fff; border: none; border-radius: 5px; font-size: 12px; font-weight: 600; cursor: pointer; }
.btn-disconnect{ padding: 6px 16px; background: #e74c3c; color: #fff; border: none; border-radius: 5px; font-size: 12px; font-weight: 600; cursor: pointer; }
.btn-connect:disabled { background: #555; cursor: default; }

/* ── Modal extras ──────────────────────────────────────────────────────── */
.modal-section-label {
  font-size: 10px; font-weight: 700; color: #4a9eff;
  text-transform: uppercase; letter-spacing: 0.06em; margin: 6px 0 4px;
}
.modal-field-row {
  display: flex; gap: 8px;
}
.modal-field.half { flex: 1; }

.hb-inline { font-size: 10px; padding: 1px 6px; border-radius: 8px; margin-left: 6px; font-weight: 700; }
.hb-inline-ok   { background: rgba(39,174,96,0.2); color: #27ae60; }
.hb-inline-warn { background: rgba(243,156,18,0.2); color: #f39c12; }

.gateway-status {
  font-size: 11px; padding: 4px 7px; border-radius: 4px; margin: 4px 0;
}
.gw-ok  { background: rgba(39,174,96,0.12); color: #27ae60; }
.gw-err { background: rgba(231,76,60,0.12);  color: #e74c3c; }
.gw-off { background: rgba(139,148,158,0.1); color: #8b949e; }

.btn-reload-mnemonics {
  width: 100%; padding: 5px; margin-top: 2px;
  background: rgba(74,158,255,0.12); color: #4a9eff;
  border: 1px solid rgba(74,158,255,0.3); border-radius: 4px;
  font-size: 12px; cursor: pointer;
}
.btn-reload-mnemonics:hover:not(:disabled) { background: rgba(74,158,255,0.22); }
.btn-reload-mnemonics:disabled { opacity: 0.4; cursor: default; }

/* ── Heartbeat badge in topbar ─────────────────────────────────────────── */
.heartbeat-badge {
  font-size: 0.75rem; padding: 0.2rem 0.55rem; border-radius: 10px; font-weight: 700;
}
.hb-ok   { background: rgba(39,174,96,0.2); color: #2ecc71; }
.hb-warn { background: rgba(243,156,18,0.25); color: #f39c12; }

/* ── Hover / Pinned telemetry panels ──────────────────────────────────── */
.tm-panel {
  position: fixed;
  z-index: 9000;
  background: #0f1c2e;
  border: 1px solid #2c4a6e;
  border-radius: 8px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.6);
  min-width: 480px;
  max-width: min(860px, 94vw);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  font-family: 'Segoe UI', system-ui, sans-serif;
  transition: box-shadow 0.15s;
}
.tm-panel-pinned {
  border-color: #74d7ff;
  box-shadow: 0 8px 32px rgba(0,0,0,0.6), 0 0 0 1px rgba(116,215,255,0.4);
}
.tm-panel-dragging {
  box-shadow: 0 16px 48px rgba(0, 0, 0, 0.8);
  opacity: 0.95;
}

.tm-panel-header {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px 9px;
  background: linear-gradient(135deg, #132336 0%, #1a2f45 100%);
  border-bottom: 1px solid #2c4a6e;
  cursor: grab;
  user-select: none;
}
.tm-panel-dragging .tm-panel-header { cursor: grabbing; }

.tm-drag-grip {
  font-size: 20px;
  color: #3d6a9e;
  line-height: 1;
  flex-shrink: 0;
  pointer-events: none;
}

.tm-panel-title {
  flex: 1;
  font-size: 20px;
  font-weight: 700;
  color: #74d7ff;
  letter-spacing: 0.4px;
  text-transform: uppercase;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.tm-header-btns {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
}

.tm-mode-btn,
.tm-pin-btn,
.tm-close-btn {
  flex-shrink: 0;
  padding: 5px 12px;
  border-radius: 5px;
  font-size: 20px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s;
  white-space: nowrap;
  line-height: 1.2;
}

.tm-mode-btn {
  background: rgba(116, 215, 255, 0.12);
  border: 1px solid rgba(116, 215, 255, 0.35);
  color: #74d7ff;
}
.tm-mode-btn:hover { background: rgba(116, 215, 255, 0.25); }

.tm-pin-btn {
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.18);
  color: #7a9ab8;
  font-size: 18px;
  padding: 5px 9px;
}
.tm-pin-btn:hover { background: rgba(255,255,255,0.14); color: #fff; }

.tm-close-btn {
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.18);
  color: #7a9ab8;
  font-size: 18px;
  padding: 5px 9px;
}
.tm-close-btn:hover { background: rgba(220, 38, 38, 0.25); border-color: #e74c3c; color: #fca5a5; }

.tm-search-wrap {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 12px;
  background: #0d1928;
  border-bottom: 1px solid #1e3550;
}

.tm-search {
  flex: 1;
  background: #132336;
  border: 1px solid #2c4a6e;
  border-radius: 5px;
  color: #cde6ff;
  font-size: 20px;
  padding: 6px 12px;
  outline: none;
  transition: border-color 0.15s;
}
.tm-search:focus { border-color: #74d7ff; }
.tm-search::placeholder { color: #4a6880; }

.tm-row-count {
  font-size: 20px;
  color: #4a6880;
  white-space: nowrap;
  flex-shrink: 0;
}

.tm-table-wrap {
  overflow-y: auto;
  max-height: min(560px, calc(100vh - 220px));
}
.tm-table-wrap::-webkit-scrollbar       { width: 7px; }
.tm-table-wrap::-webkit-scrollbar-track { background: #0d1928; }
.tm-table-wrap::-webkit-scrollbar-thumb { background: #2c4a6e; border-radius: 4px; }
.tm-table-wrap::-webkit-scrollbar-thumb:hover { background: #3d6a9e; }

.tm-table {
  border-collapse: collapse;
  width: 100%;
  table-layout: auto;
}

.tm-th {
  position: sticky;
  top: 0;
  z-index: 1;
  background: #132336;
  color: #74d7ff;
  font-size: 20px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.4px;
  padding: 10px 14px;
  border-bottom: 2px solid #2c4a6e;
  white-space: nowrap;
  text-align: left;
}
.tm-th-mnem { min-width: 150px; }
.tm-th-val  { text-align: right; }
.tm-th-dict { text-align: center; }

.tm-td {
  font-size: 20px;
  padding: 8px 14px;
  border-bottom: 1px solid #1a2f45;
  white-space: nowrap;
  vertical-align: middle;
}

.tm-td-mnem {
  font-family: 'Courier New', monospace;
  color: #a8c4de;
}

.tm-td-val {
  font-family: 'Courier New', monospace;
  font-weight: 700;
  color: #e8f4fd;
  text-align: right;
}

.tm-td-dict {
  font-family: 'Courier New', monospace;
  color: #cde6ff;
  text-align: center;
}

.tm-row-alert .tm-td       { background: rgba(220, 38, 38, 0.18); color: #fca5a5; }
.tm-row-alert .tm-td-mnem  { color: #fca5a5; }
.tm-row-alert .tm-td-val   { color: #fca5a5; }
.tm-row-alert .tm-td-dict  { color: #fca5a5; }
.tm-row-alert:hover .tm-td { background: rgba(220, 38, 38, 0.28); }

tr:not(.tm-row-alert):hover .tm-td { background: rgba(116, 215, 255, 0.05); }

.tm-td-empty {
  padding: 18px 14px;
  text-align: center;
  color: #4a6880;
  font-size: 20px;
  font-style: italic;
}


</style>
