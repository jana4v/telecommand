<template>
  <div class="admin-page">
    <header class="admin-header">
      <div class="header-inner">
        <div class="brand">
          <button @click="goHome" class="home-btn" title="Go to home">
            <span class="home-icon">🏠</span>
            <span class="home-label">Home</span>
          </button>
          <div class="brand-text">
            <span class="spasdacs-title">🛰️ SPASDACS <span class="nova">Nova</span></span>
            <span class="spasdacs-subtitle">SPAcecraft Status Display And Commanding Software</span>
          </div>
        </div>
        <div class="header-actions">
          <button type="button" class="btn-streams" title="Configure NATS telemetry streams for bindings"
            @click="showStreamsModal = true">
            📡 Streams
          </button>
          <div class="user-badge">
            <span>{{ auth.user?.username || 'user' }}</span>
            <small>{{ roleLabel }}</small>
          </div>
          <!-- NATS server active connection count -->
          <span v-if="natsServerConns !== null" class="nats-conns-badge"
            :class="natsConnsBadgeClass"
            :title="`NATS server: ${natsServerConns} active connections (max ${natsServerMax})`">
            🔌 {{ natsServerConns }}/{{ natsServerMax }}
          </span>
          <!-- Export all diagrams as a single JSON bundle -->
          <button v-if="diagrams.length > 0" class="header-import"
            :disabled="exportingAll"
            @click="exportAllDiagrams"
            title="Download all diagrams as a single JSON file">
            {{ exportingAll ? '⏳ Exporting…' : '⬇ Export All' }}
          </button>

          <!-- Import — accepts one or more files; each file may be a single
               diagram object or an Export All array bundle -->
          <label v-if="canWrite" class="header-import" title="Import one or more diagram JSON files">
            <input type="file" accept=".json" multiple @change="handleImportAll" class="import-input" />
            <span>⬆ Import</span>
          </label>

          <button v-if="canWrite" @click="createNewDiagram" class="btn-create">
            <span class="btn-create-icon">+</span>
            Create diagram
          </button>
          <button v-if="auth.isLoggedIn" @click="doLogout" class="btn-logout">Logout</button>
          <router-link v-else to="/login" class="btn-login">Login</router-link>
        </div>
      </div>
    </header>
    <!-- Unauthenticated viewer banner -->
    <div v-if="!auth.isLoggedIn" class="viewer-banner">
      <span class="banner-icon">👁️</span>
      <span class="banner-text">You are viewing in read-only mode.</span>
      <router-link to="/login" class="banner-link">Login to edit diagrams</router-link>
    </div>


    <main class="admin-main">
      <div v-if="diagrams.length === 0" class="empty-state">
        <div class="empty-icon">◈</div>
        <h2>No diagrams yet</h2>
        <p>Create your first SPASDACS diagram to get started.</p>
        <button v-if="canWrite" @click="createNewDiagram" class="btn-create btn-create--center">
          <span class="btn-create-icon">+</span>
          Create diagram
        </button>
      </div>

      <div v-else class="content-full">
        <div class="section-head">
          <h2 class="section-title">Diagrams</h2>
          <!-- Auto View controls -->
          <div class="auto-view-bar">
            <label class="auto-view-toggle">
              <input type="checkbox" v-model="autoViewEnabled" class="auto-view-checkbox" />
              <span class="auto-view-label">Auto View</span>
            </label>
            <template v-if="autoViewEnabled">
              <label class="auto-view-delay-label">
                Interval
                <input
                  type="number"
                  v-model.number="autoViewDelay"
                  class="auto-view-delay-input"
                  min="5" max="3600"
                  placeholder="30"
                />
                <span class="auto-view-delay-unit">sec</span>
              </label>
              <button class="btn-autoview-start" @click="startAutoView">
                ▶ Start Auto View
              </button>
            </template>
          </div>
        </div>
        <div class="card-grid">
          <article v-for="diagram in diagrams" :key="diagram.id" class="card"
            :class="{ 'card--excluded': diagram.autoViewInclude === false }">
            <div class="card-inner">
              <div class="card-head">
                <h3 class="card-title">{{ diagram.name }}</h3>
                <button
                  v-if="canWrite"
                  @click="deleteDiagram(diagram)"
                  class="card-delete"
                  title="Delete diagram"
                  aria-label="Delete"
                >
                  ×
                </button>
              </div>
              <p v-if="diagram.description" class="card-desc">
                {{ diagram.description }}
              </p>
              <div class="card-meta">
                <span>Updated {{ formatDate(diagram.updatedAt) }}</span>
              </div>

              <!-- ── Auto View settings per diagram ──────────────────── -->
              <div class="card-av">
                <label class="av-toggle" :title="diagram.autoViewInclude === false ? 'Excluded from Auto View' : 'Included in Auto View'">
                  <input
                    type="checkbox"
                    class="av-checkbox"
                    :checked="diagram.autoViewInclude !== false"
                    @change="setAutoViewInclude(diagram, ($event.target as HTMLInputElement).checked)"
                  />
                  <span class="av-toggle-label">Auto View</span>
                  <span class="av-status-dot"
                    :class="diagram.autoViewInclude !== false ? 'av-dot-on' : 'av-dot-off'"></span>
                </label>
                <label class="av-duration" :class="{ 'av-duration--disabled': diagram.autoViewInclude === false }">
                  <span class="av-duration-label">Duration</span>
                  <input
                    type="number"
                    class="av-duration-input"
                    :value="diagram.autoViewDuration ?? 30"
                    min="5" max="3600"
                    :disabled="diagram.autoViewInclude === false"
                    @change="setAutoViewDuration(diagram, Number(($event.target as HTMLInputElement).value))"
                  />
                  <span class="av-duration-unit">sec</span>
                </label>
                <span v-if="savingIds.has(diagram.id)" class="av-saving">↻ saving…</span>
                <span v-else-if="savedIds.has(diagram.id)" class="av-saved">✓ saved</span>
              </div>

              <div class="card-actions">
                <button @click="viewDiagram(diagram.id)" class="card-btn card-btn--view">View</button>
                <button v-if="canWrite" @click="editDiagram(diagram)" class="card-btn card-btn--edit">Edit</button>
                <button @click="exportDiagram(diagram)" class="card-btn card-btn--export" title="Export as JSON">Export</button>
              </div>
            </div>
          </article>
        </div>
        <div v-if="canWrite" class="import-wrap">
          <button class="import-btn" :disabled="exportingAll" @click="exportAllDiagrams"
            title="Download all diagrams as one JSON bundle">
            {{ exportingAll ? '⏳ Exporting…' : '⬇ Export All' }}
          </button>
          <label class="import-btn" title="Import one or more JSON files (single diagram or Export All bundle)">
            <input type="file" accept=".json" multiple @change="handleImportAll" class="import-input" />
            <span class="import-label">⬆ Import All</span>
          </label>
        </div>
      </div>
    </main>

    <TelemetryStreamsModal v-model="showStreamsModal" />
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import { DiagramStorage, type DiagramData } from '../services/diagramStorage';
import { useAuth } from '../services/auth';
import { loadTelemetryStreamsFromStorage } from '../stores/telemetryStreamsConfig';
import TelemetryStreamsModal from '../components/TelemetryStreamsModal.vue';
import gsap from 'gsap';

const router = useRouter();
const auth = useAuth();
const diagrams    = ref<DiagramData[]>([]);
const autoViewEnabled = ref(false);
const autoViewDelay   = ref(30);

const canWrite = computed(() => auth.hasAnyRole(['operator', 'admin', 'super_admin']));
const roleLabel = computed(() => (auth.user?.roles ?? []).join(', ') || 'viewer');

const showStreamsModal = ref(false);

// ── NATS server connection count badge ────────────────────────────────────
const natsServerConns = ref<number | null>(null);
const natsServerMax   = ref<number>(128);
let natsStatusPollTimer: ReturnType<typeof setInterval> | null = null;

const natsConnsBadgeClass = computed(() => {
  const n = natsServerConns.value;
  if (n === null) return "";
  // Thresholds relative to the 128-connection cap:
  //   green  < 32  (~25 %)
  //   yellow < 96  (~75 %)
  //   red   >= 96
  if (n >= 96) return "nats-conns-red";
  if (n >= 32) return "nats-conns-yellow";
  return "nats-conns-green";
});

async function pollNatsStatus() {
  const status = await DiagramStorage.getNatsStatus();
  if (status) {
    natsServerConns.value = status.connections;
    natsServerMax.value   = status.max;
  } else {
    natsServerConns.value = null;
  }
}

// Per-diagram save state
const savingIds = ref<Set<string>>(new Set());
const savedIds  = ref<Set<string>>(new Set());
const saveTimers: Record<string, ReturnType<typeof setTimeout>> = {};

function goHome() {
  window.location.href = window.location.origin;
}

async function doLogout() {
  await auth.logout();
  router.replace('/login');
}

onMounted(() => {
  loadTelemetryStreamsFromStorage();
  loadDiagrams();
  gsap.from(".spasdacs-title", { opacity: 0, y: -20, duration: 1, ease: "power3.out" });
  gsap.from(".nova",           { scale: 0.8, opacity: 0, duration: 1, delay: 0.3, ease: "back.out(1.7)" });
  gsap.fromTo(".nova",
    { textShadow: "0 0 0px #00eaff, 0 0 0px #0077ff" },
    { textShadow: "0 0 12px #00eaff, 0 0 24px #0077ff", duration: 1.5, repeat: -1, yoyo: true, ease: "sine.inOut", delay: 1.3 },
  );
  // Poll the NATS server connection count for the header badge.
  void pollNatsStatus();
  natsStatusPollTimer = setInterval(pollNatsStatus, 30_000);
});

onUnmounted(() => {
  if (natsStatusPollTimer) clearInterval(natsStatusPollTimer);
});

async function loadDiagrams() {
  diagrams.value = await DiagramStorage.getAllDiagrams();
}

function createNewDiagram() {
  if (!canWrite.value) return;
  const id = DiagramStorage.generateId();
  router.push(`/editor/${id}`);
}

async function editDiagram(diagram: DiagramData) {
  if (!canWrite.value) return;
  router.push(`/editor/${diagram.id}`);
}

function viewDiagram(id: string) {
  router.push(`/viewer/${id}`);
}

async function deleteDiagram(diagram: DiagramData) {
  if (!canWrite.value) return;
  const entered = prompt(`Type the diagram name to confirm delete:\n\n${diagram.name}`);
  if (entered === null) return; // cancelled
  if (entered.trim() !== diagram.name.trim()) {
    alert('Name did not match. Delete cancelled.');
    return;
  }
  await DiagramStorage.deleteDiagram(diagram.id);
  loadDiagrams();
}

async function exportDiagram(diagram: DiagramData) {
  const full = await DiagramStorage.getDiagram(diagram.id);
  const toExport = full ?? diagram;
  const json = DiagramStorage.exportDiagram(toExport);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${diagram.name.replace(/\s+/g, '_')}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

// ── Export All ────────────────────────────────────────────────────────────

const exportingAll = ref(false);

async function exportAllDiagrams() {
  if (exportingAll.value || diagrams.value.length === 0) return;
  exportingAll.value = true;
  try {
    // Fetch full diagram data in parallel (list API returns metadata only)
    const results = await Promise.all(
      diagrams.value.map(d => DiagramStorage.getDiagram(d.id))
    );
    // Strip server-generated derivatives (viewModelData, telemetryManifest)
    // from every entry — they are recreated automatically on import/save, so
    // they should not be included in portable export files.
    const full = results
      .filter((d): d is DiagramData => d !== null)
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      .map(({ viewModelData: _vm, telemetryManifest: _tm, ...d }) => d);
    const json = JSON.stringify(full, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const date = new Date().toISOString().slice(0, 10);
    a.download = `spasdacs_diagrams_${date}.json`;
    a.click();
    URL.revokeObjectURL(url);
  } finally {
    exportingAll.value = false;
  }
}

// ── Import All ────────────────────────────────────────────────────────────

async function handleImportAll(event: Event) {
  if (!canWrite.value) return;
  const input = event.target as HTMLInputElement;
  const files = Array.from(input.files ?? []);
  input.value = ''; // reset immediately so the same file can be re-selected
  if (files.length === 0) return;

  let importedCount = 0;
  let failedCount = 0;

  for (const file of files) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(await file.text());
    } catch {
      failedCount++;
      continue;
    }

    // Each file may be a single diagram object or an array (Export All bundle)
    const items: unknown[] = Array.isArray(parsed) ? parsed : [parsed];
    for (const item of items) {
      try {
        const result = await DiagramStorage.importDiagram(JSON.stringify(item));
        if (result) importedCount++;
        else failedCount++;
      } catch {
        failedCount++;
      }
    }
  }

  loadDiagrams();

  if (failedCount === 0) {
    alert(`✓ Imported ${importedCount} diagram${importedCount !== 1 ? 's' : ''} successfully.`);
  } else if (importedCount === 0) {
    alert(`✗ Import failed — no valid diagrams found in the selected file${files.length !== 1 ? 's' : ''}.`);
  } else {
    alert(`Imported ${importedCount} diagram${importedCount !== 1 ? 's' : ''}. ${failedCount} item${failedCount !== 1 ? 's' : ''} could not be imported.`);
  }
}

function startAutoView() {
  const included = diagrams.value.filter(d => d.autoViewInclude !== false);
  if (included.length === 0) {
    alert('No diagrams are included in Auto View. Enable at least one diagram.');
    return;
  }
  router.push(`/viewer/${included[0].id}?autoview=true&delay=${autoViewDelay.value}`);
}

// ── Per-diagram Auto View settings ───────────────────────────────────────

function setAutoViewInclude(diagram: DiagramData, value: boolean) {
  diagram.autoViewInclude = value;
  scheduleAutoViewSave(diagram);
}

function setAutoViewDuration(diagram: DiagramData, value: number) {
  diagram.autoViewDuration = Math.max(5, Math.min(3600, value || 30));
  scheduleAutoViewSave(diagram);
}

function scheduleAutoViewSave(diagram: DiagramData) {
  if (saveTimers[diagram.id]) clearTimeout(saveTimers[diagram.id]);
  saveTimers[diagram.id] = setTimeout(() => saveAutoViewSettings(diagram), 800);
}

async function saveAutoViewSettings(diagram: DiagramData) {
  savingIds.value = new Set([...savingIds.value, diagram.id]);
  savedIds.value.delete(diagram.id);
  try {
    await DiagramStorage.patchDiagram(diagram.id, {
      autoViewInclude:  diagram.autoViewInclude  ?? true,
      autoViewDuration: diagram.autoViewDuration ?? 30,
    });
    savedIds.value = new Set([...savedIds.value, diagram.id]);
    setTimeout(() => {
      savedIds.value.delete(diagram.id);
      savedIds.value = new Set(savedIds.value);
    }, 2000);
  } finally {
    savingIds.value.delete(diagram.id);
    savingIds.value = new Set(savingIds.value);
  }
}

function formatDate(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });
}
</script>

<style scoped>
.admin-page {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background: #0f1419;
  color: #e6edf3;
}

/* ── Top bar (full width) ──────────────────────────────────────────────── */
.admin-header {
  flex-shrink: 0;
  width: 100%;
  padding: 0 2rem;
  background: linear-gradient(180deg, #161b22 0%, #0f1419 100%);
  border-bottom: 1px solid rgba(110, 118, 129, 0.3);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.25);
}

.header-inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 72px;
  gap: 2rem;
}

.brand {
  display: flex;
  align-items: center;
  gap: 1.25rem;
}

.brand-text {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.home-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.85rem;
  background: rgba(74, 158, 255, 0.15);
  border: 1px solid rgba(74, 158, 255, 0.35);
  border-radius: 8px;
  color: #74d7ff;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s, transform 0.15s;
  flex-shrink: 0;
}

.home-btn:hover {
  background: rgba(74, 158, 255, 0.25);
  border-color: rgba(74, 158, 255, 0.55);
  transform: translateY(-2px);
}

.home-icon {
  font-size: 1.2rem;
  line-height: 1;
}

.btn-streams {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.45rem 0.85rem;
  background: rgba(35, 134, 54, 0.18);
  border: 1px solid rgba(63, 185, 80, 0.45);
  border-radius: 8px;
  color: #7ee787;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s;
  flex-shrink: 0;
}

.btn-streams:hover {
  background: rgba(35, 134, 54, 0.28);
  border-color: rgba(63, 185, 80, 0.65);
}

.user-badge {
  display: inline-flex;
  flex-direction: column;
  align-items: flex-end;
  justify-content: center;
  line-height: 1.1;
  color: #9cc9ff;
  min-width: 7rem;
}

.user-badge small {
  color: #7aa2d6;
  font-size: 0.72rem;
}

/* NATS server connection count badge */
.nats-conns-badge {
  font-size: 0.75rem;
  font-weight: 600;
  padding: 0.2rem 0.55rem;
  border-radius: 10px;
  letter-spacing: 0.02em;
  cursor: default;
  white-space: nowrap;
}
.nats-conns-green  { background: rgba(39,174,96,0.18);  color: #2ecc71; }
.nats-conns-yellow { background: rgba(243,156,18,0.22); color: #f39c12; }
.nats-conns-red    { background: rgba(231,76,60,0.25);  color: #e74c3c; }

.btn-logout {
  border: 1px solid rgba(244, 63, 94, 0.55);
  background: rgba(190, 24, 93, 0.2);
  color: #fecdd3;
  border-radius: 8px;
  padding: 0.45rem 0.7rem;
  cursor: pointer;
}

.btn-logout:hover {
  background: rgba(190, 24, 93, 0.35);
}

.btn-login {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.45rem 0.7rem;
  background: rgba(74, 158, 255, 0.2);
  border: 1px solid rgba(74, 158, 255, 0.55);
  border-radius: 8px;
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

.home-label {
  font-size: 0.95rem;
}

.brand-icon {
  font-size: 1.85rem;
  color: rgba(74, 158, 255, 0.9);
}

.spasdacs-title {
  font-size: 1.75rem;
  font-weight: 700;
  color: #fff;
  letter-spacing: 0.05em;
  line-height: 1.2;
}

.spasdacs-subtitle {
  font-size: 0.85rem;
  font-weight: 500;
  color: #8b949e;
  letter-spacing: 0.03em;
  text-transform: uppercase;
}

.nova {
  color: #00eaff;
  font-style: italic;
  font-weight: 800;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.header-import {
  display: inline-flex;
  align-items: center;
  padding: 0.5rem 1rem;
  background: rgba(139, 148, 158, 0.25);
  color: #e6edf3;
  border: 1px solid rgba(139, 148, 158, 0.5);
  border-radius: 8px;
  font-size: 1.05rem;
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s;
}

.header-import:hover {
  background: rgba(139, 148, 158, 0.4);
  border-color: rgba(74, 158, 255, 0.5);
}

.btn-create {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.6rem 1.25rem;
  background: linear-gradient(135deg, #32657b 0%, #2a5266 100%);
  color: #fff;
  border: 1px solid rgba(74, 158, 255, 0.35);
  border-radius: 8px;
  font-size: 1.1rem;
  font-weight: 600;
  cursor: pointer;
  transition: transform 0.15s, box-shadow 0.2s;
}

.btn-create:hover {
  transform: translateY(-1px);
  box-shadow: 0 6px 20px rgba(50, 101, 123, 0.35);
}

.btn-create-icon {
  font-size: 1.4rem;
  font-weight: 300;
  line-height: 1;
}

.btn-create--center {
  margin-top: 1.5rem;
}

/* ── Main (full width, fills remaining height) ───────────────────────────── */
.admin-main {
  flex: 1;
  width: 100%;
  overflow: auto;
  padding: 1.5rem 2rem 2.5rem;
}

.content-full {
  width: 100%;
  max-width: none;
}

.section-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 0.75rem;
  margin-bottom: 1.5rem;
}

/* ── Auto View bar ──────────────────────────────────────────────────────── */
.auto-view-bar {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.auto-view-toggle {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  cursor: pointer;
}

.auto-view-checkbox {
  width: 15px;
  height: 15px;
  cursor: pointer;
  accent-color: #4a9eff;
}

.auto-view-label {
  font-size: 0.95rem;
  color: #e6edf3;
  font-weight: 500;
  user-select: none;
}

.auto-view-delay-label {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.9rem;
  color: #adbac7;
}

.auto-view-delay-input {
  width: 60px;
  padding: 0.28rem 0.45rem;
  background: rgba(139, 148, 158, 0.2);
  border: 1px solid rgba(139, 148, 158, 0.4);
  border-radius: 5px;
  color: #e6edf3;
  font-size: 0.9rem;
  text-align: center;
}

.auto-view-delay-unit {
  color: #adbac7;
  font-size: 0.85rem;
}

.btn-autoview-start {
  padding: 0.45rem 1rem;
  background: linear-gradient(135deg, #27ae60, #229954);
  color: #fff;
  border: none;
  border-radius: 7px;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  transition: transform 0.15s, box-shadow 0.2s;
}

.btn-autoview-start:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(39, 174, 96, 0.4);
}

.section-title {
  margin: 0;
  font-size: 1.55rem;
  font-weight: 700;
  color: #f0f6fc;
  letter-spacing: 0.03em;
  background: linear-gradient(135deg, #f0f6fc 0%, #c9d1d9 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

/* ── Card grid: larger cards, full-width layout ─────────────────────────── */
.card-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(380px, 1fr));
  gap: 1.5rem;
}

.card {
  background: rgba(28, 33, 40, 0.85);
  border: 1px solid rgba(139, 148, 158, 0.35);
  border-radius: 14px;
  overflow: hidden;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  backdrop-filter: blur(5px);
}

.card:hover {
  border-color: rgba(74, 158, 255, 0.55);
  box-shadow: 0 16px 48px rgba(74, 158, 255, 0.15), 0 8px 24px rgba(0, 0, 0, 0.4);
  transform: translateY(-4px);
}

.card-inner {
  padding: 2rem;
}

.card-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 1rem;
  margin-bottom: 0.75rem;
}

.card-title {
  margin: 0;
  font-size: 1.55rem;
  font-weight: 700;
  color: #f0f6fc;
  line-height: 1.35;
  flex: 1;
  min-width: 0;
}

.card-delete {
  flex-shrink: 0;
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(139, 148, 158, 0.2);
  border: 1px solid rgba(139, 148, 158, 0.4);
  border-radius: 8px;
  color: #adbac7;
  font-size: 1.85rem;
  line-height: 1;
  cursor: pointer;
  transition: all 0.2s;
}

.card-delete:hover {
  color: #fff;
  background: rgba(248, 81, 73, 0.35);
  border-color: rgba(248, 81, 73, 0.5);
  transform: scale(1.08);
}

.card-desc {
  margin: 0.75rem 0 0;
  font-size: 1.15rem;
  color: #c9d1d9;
  line-height: 1.6;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.card-meta {
  margin-top: 1.25rem;
  padding-top: 1.25rem;
  border-top: 1px solid rgba(139, 148, 158, 0.35);
  font-size: 1.05rem;
  color: #8b949e;
  font-weight: 500;
}

/* ── Per-card Auto View settings ──────────────────────────────────────── */
.card--excluded {
  opacity: 0.65;
  border-color: rgba(139, 148, 158, 0.2) !important;
}

.card-av {
  display: flex;
  align-items: center;
  gap: 1rem;
  flex-wrap: wrap;
  margin-top: 1rem;
  padding: 0.65rem 0.85rem;
  background: rgba(139, 148, 158, 0.08);
  border: 1px solid rgba(139, 148, 158, 0.2);
  border-radius: 8px;
}

.av-toggle {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  cursor: pointer;
  user-select: none;
}

.av-checkbox {
  width: 14px;
  height: 14px;
  accent-color: #4a9eff;
  cursor: pointer;
}

.av-toggle-label {
  font-size: 0.88rem;
  color: #adbac7;
  font-weight: 500;
}

.av-status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}
.av-dot-on  { background: #27ae60; box-shadow: 0 0 5px rgba(39,174,96,.5); }
.av-dot-off { background: #555; }

.av-duration {
  display: flex;
  align-items: center;
  gap: 0.35rem;
}
.av-duration--disabled { opacity: 0.4; pointer-events: none; }

.av-duration-label {
  font-size: 0.82rem;
  color: #8b949e;
}

.av-duration-input {
  width: 58px;
  padding: 0.22rem 0.4rem;
  background: rgba(139, 148, 158, 0.2);
  border: 1px solid rgba(139, 148, 158, 0.35);
  border-radius: 5px;
  color: #e6edf3;
  font-size: 0.85rem;
  text-align: center;
}
.av-duration-input:focus { outline: none; border-color: rgba(74,158,255,0.5); }
.av-duration-input:disabled { opacity: 0.45; }

.av-duration-unit {
  font-size: 0.82rem;
  color: #8b949e;
}

.av-saving {
  font-size: 0.78rem;
  color: #8b949e;
  animation: pulse-opacity 1s infinite alternate;
}
.av-saved {
  font-size: 0.78rem;
  color: #27ae60;
}
@keyframes pulse-opacity {
  from { opacity: 0.5; }
  to   { opacity: 1;   }
}

.card-actions {
  display: flex;
  gap: 0.75rem;
  margin-top: 1.25rem;
}

.card-btn {
  flex: 1;
  padding: 0.7rem 1rem;
  border-radius: 10px;
  font-size: 1.1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  border: 1px solid transparent;
}

.card-btn--view {
  background: rgba(74, 158, 255, 0.18);
  color: #74d7ff;
  border-color: rgba(74, 158, 255, 0.35);
}

.card-btn--view:hover {
  background: rgba(74, 158, 255, 0.28);
  box-shadow: 0 4px 12px rgba(74, 158, 255, 0.2);
  transform: translateY(-2px);
}

.card-btn--edit {
  background: rgba(139, 148, 158, 0.3);
  color: #e6edf3;
  border-color: rgba(139, 148, 158, 0.5);
}

.card-btn--edit:hover {
  background: rgba(139, 148, 158, 0.45);
  border-color: rgba(139, 148, 158, 0.6);
  transform: translateY(-2px);
}

.card-btn--export {
  background: rgba(139, 148, 158, 0.2);
  color: #c9d1d9;
  border-color: rgba(139, 148, 158, 0.5);
}

.card-btn--export:hover {
  background: rgba(139, 148, 158, 0.35);
  color: #e6edf3;
  border-color: rgba(139, 148, 158, 0.6);
  transform: translateY(-2px);
}

/* ── Empty state ────────────────────────────────────────────────────────── */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 60vh;
  padding: 3rem 2rem;
  text-align: center;
}

.empty-icon {
  font-size: 5.5rem;
  color: rgba(74, 158, 255, 0.3);
  margin-bottom: 1.25rem;
  animation: float 3s ease-in-out infinite;
}

.empty-state h2 {
  margin: 0 0 0.5rem;
  font-size: 2rem;
  font-weight: 700;
  color: #f0f6fc;
}

.empty-state p {
  margin: 0;
  color: #adbac7;
  font-size: 1.2rem;
  margin-bottom: 1.5rem;
}

@keyframes float {
  0%, 100% { transform: translateY(0px); }
  50% { transform: translateY(-20px); }
}

/* ── Import / Export wrap ──────────────────────────────────────────────── */
.import-wrap {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  flex-wrap: wrap;
  padding: 2.5rem 0 0;
  border-top: 1px solid rgba(139, 148, 158, 0.4);
  margin-top: 2.5rem;
}

.import-btn {
  display: inline-flex;
  align-items: center;
  padding: 0.75rem 1.5rem;
  background: rgba(139, 148, 158, 0.25);
  color: #e6edf3;
  border: 1px dashed rgba(139, 148, 158, 0.55);
  border-radius: 10px;
  font-size: 1.1rem;
  font-weight: 500;
  cursor: pointer;
  transition: border-color 0.2s, background 0.2s;
}

.import-btn:hover:not(:disabled) {
  background: rgba(139, 148, 158, 0.4);
  border-color: rgba(74, 158, 255, 0.55);
}

.import-btn:disabled {
  opacity: 0.5;
  cursor: default;
}

.import-input {
  position: absolute;
  width: 0;
  height: 0;
  opacity: 0;
  pointer-events: none;
}

.import-label {
  pointer-events: none;
}
</style>
