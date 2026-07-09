<template>
  <Teleport to="body">
    <div v-if="visible" class="tcsm-backdrop" @mousedown.self="close">
      <div class="tcsm-modal">

        <!-- Header -->
        <div class="tcsm-header">
          <span class="tcsm-title">📡 Select Telecommands</span>
          <span v-if="elementName" class="tcsm-subtitle">{{ elementName }}</span>
          <button class="tcsm-close" @click="close" title="Close">✕</button>
        </div>

        <!-- Loading -->
        <div v-if="loading" class="tcsm-loading">
          <span class="tcsm-spinner">⟳</span> Loading command records…
        </div>

        <!-- Empty -->
        <div v-else-if="!rows.length" class="tcsm-empty">
          No telecommands assigned to this element.
        </div>

        <!-- Table -->
        <div v-else class="tcsm-table-wrap">
          <table class="tcsm-table">
            <thead>
              <tr>
                <th class="tcsm-th tcsm-th-chk">
                  <input type="checkbox" :checked="allChecked" :indeterminate="someChecked && !allChecked"
                    @change="toggleAll" title="Select all" />
                </th>
                <th class="tcsm-th tcsm-th-cmd">Command</th>
                <th class="tcsm-th tcsm-th-dp">Data Part</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in rows" :key="row.cmdDesc"
                class="tcsm-row" :class="{ selected: row.checked }"
                @click="row.checked = !row.checked">
                <td class="tcsm-td tcsm-td-chk" @click.stop>
                  <input type="checkbox" v-model="row.checked" />
                </td>
                <td class="tcsm-td tcsm-td-cmd">
                  <span class="tcsm-cmd-name">{{ row.cmdDesc }}</span>
                  <span v-if="row.type" class="tcsm-cmd-badge">{{ row.type }}</span>
                </td>
                <td class="tcsm-td tcsm-td-dp" @click.stop>
                  <!-- Has dataPart options -->
                  <select v-if="row.dataParts.length"
                    class="tcsm-dp-select"
                    v-model="row.selectedDataPart"
                    :disabled="!row.checked">
                    <option value="">— Select data part —</option>
                    <option v-for="dp in row.dataParts" :key="dp" :value="dp">{{ dp }}</option>
                  </select>
                  <!-- No dataPart -->
                  <span v-else class="tcsm-dp-none">—</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Footer -->
        <div class="tcsm-footer">
          <span class="tcsm-sel-count">
            {{ checkedRows.length }} command{{ checkedRows.length !== 1 ? 's' : '' }} selected
          </span>
          <div class="tcsm-footer-btns">
            <button class="tcsm-btn-cancel" @click="close">Cancel</button>
            <button class="tcsm-btn-add" :disabled="!checkedRows.length" @click="addToQueue">
              ➕ Add to TC Queue
            </button>
          </div>
        </div>

      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, watch } from "vue";
import { gatewayUrl } from "../services/mnemonicStore";
import { enqueueCommands } from "../stores/commandQueueStore";

interface TcRecord {
  cmdDesc:  string;
  type?:    string;
  dataPart: string[];
}

interface Row {
  cmdDesc:          string;
  type:             string;
  dataParts:        string[];
  selectedDataPart: string;
  checked:          boolean;
}

const props = defineProps<{
  visible:      boolean;
  telecommands: string[];   // assigned TC list from node data
  elementName?: string;
}>();

const emit = defineEmits<{
  (e: "update:visible", v: boolean): void;
}>();

const loading = ref(false);
const rows    = ref<Row[]>([]);

// ── Fetch records when modal opens ─────────────────────────────────────────
watch(() => props.visible, async (v) => {
  if (!v) return;
  rows.value = [];
  if (!props.telecommands.length) return;
  loading.value = true;
  const results = await Promise.allSettled(
    props.telecommands.map(cmd => fetchRecord(cmd))
  );
  rows.value = results
    .filter((r): r is PromiseFulfilledResult<TcRecord | null> => r.status === "fulfilled" && r.value !== null)
    .map(r => r.value!)
    .map(rec => ({
      cmdDesc:          rec.cmdDesc,
      type:             rec.type ?? "",
      dataParts:        rec.dataPart ?? [],
      selectedDataPart: "",
      checked:          false,
    }));
  loading.value = false;
});

async function fetchRecord(cmdDesc: string): Promise<TcRecord | null> {
  try {
    const url = `${gatewayUrl.value}/telecommand/record?cmdDesc=${encodeURIComponent(cmdDesc)}`;
    const res = await fetch(url);
    if (!res.ok) return { cmdDesc, dataPart: [] };
    const data = await res.json();
    return {
      cmdDesc:  data.cmdDesc  ?? cmdDesc,
      type:     data.type     ?? "",
      dataPart: Array.isArray(data.dataPart) ? data.dataPart : [],
    };
  } catch {
    return { cmdDesc, dataPart: [] };
  }
}

// ── Selection helpers ─────────────────────────────────────────────────────
const checkedRows  = computed(() => rows.value.filter(r => r.checked));
const allChecked   = computed(() => rows.value.length > 0 && rows.value.every(r => r.checked));
const someChecked  = computed(() => rows.value.some(r => r.checked));

function toggleAll(e: Event) {
  const checked = (e.target as HTMLInputElement).checked;
  rows.value.forEach(r => r.checked = checked);
}

// ── Actions ───────────────────────────────────────────────────────────────
function addToQueue() {
  enqueueCommands(
    checkedRows.value.map(r => ({
      cmdDesc:  r.cmdDesc,
      dataPart: r.selectedDataPart,
    }))
  );
  // uncheck added rows so user can pick more without closing
  checkedRows.value.forEach(r => r.checked = false);
}

function close() {
  emit("update:visible", false);
}
</script>

<style scoped>
/* ── Backdrop ─────────────────────────────────────────────────────────── */
.tcsm-backdrop {
  position: fixed; inset: 0;
  background: rgba(0,0,0,.52);
  display: flex; align-items: center; justify-content: center;
  z-index: 12000;
}

/* ── Modal box ────────────────────────────────────────────────────────── */
.tcsm-modal {
  background: #fff;
  border-radius: 10px;
  box-shadow: 0 8px 40px rgba(0,0,0,.28);
  width: min(680px, 96vw);
  max-height: 80vh;
  display: flex; flex-direction: column;
  overflow: hidden;
  animation: tcsm-pop .15s ease;
}
@keyframes tcsm-pop {
  from { opacity: 0; transform: scale(.94); }
  to   { opacity: 1; transform: scale(1); }
}

/* ── Header ──────────────────────────────────────────────────────────── */
.tcsm-header {
  display: flex; align-items: center; gap: 10px;
  padding: 14px 16px 12px;
  background: #fff;
  border-bottom: 2px solid #1a73e8;
}
.tcsm-title   { font-size: 15px; font-weight: 700; color: #1a1a2e; }
.tcsm-subtitle {
  font-size: 12px; color: #555;
  background: #eef2ff; padding: 2px 8px; border-radius: 4px;
  max-width: 260px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.tcsm-close {
  margin-left: auto; background: none; border: none;
  color: #888; font-size: 16px; cursor: pointer; line-height: 1;
  padding: 2px 6px; border-radius: 4px;
  transition: background .15s, color .15s;
}
.tcsm-close:hover { background: #f0f0f0; color: #333; }

/* ── Loading / empty ────────────────────────────────────────────────── */
.tcsm-loading, .tcsm-empty {
  padding: 32px 20px; text-align: center;
  color: #888; font-size: 13px;
}
.tcsm-spinner {
  display: inline-block; animation: spin 1s linear infinite; margin-right: 6px;
}
@keyframes spin { to { transform: rotate(360deg); } }

/* ── Table ───────────────────────────────────────────────────────────── */
.tcsm-table-wrap {
  flex: 1; overflow-y: auto; overflow-x: hidden;
}
.tcsm-table {
  width: 100%; border-collapse: collapse;
  font-size: 13px;
}
.tcsm-th {
  position: sticky; top: 0; z-index: 1;
  background: #f3f4f6;
  padding: 9px 12px;
  text-align: left; font-weight: 600; font-size: 11px;
  color: #555; border-bottom: 1px solid #dde1e7;
  text-transform: uppercase; letter-spacing: .4px;
}
.tcsm-th-chk  { width: 38px; text-align: center; }
.tcsm-th-cmd  { width: auto; }
.tcsm-th-dp   { width: 220px; }

.tcsm-row {
  cursor: pointer; transition: background .1s;
  border-bottom: 1px solid #f0f0f0;
}
.tcsm-row:hover   { background: #f0f7ff; }
.tcsm-row.selected { background: #e8f2ff; }

.tcsm-td { padding: 9px 12px; vertical-align: middle; }
.tcsm-td-chk { text-align: center; }

.tcsm-cmd-name { font-weight: 500; color: #1a1a2e; }
.tcsm-cmd-badge {
  margin-left: 8px; font-size: 10px; padding: 1px 6px;
  background: #e8f0fe; color: #1a73e8;
  border-radius: 10px; font-weight: 600; vertical-align: middle;
}

.tcsm-dp-select {
  width: 100%; padding: 5px 8px;
  border: 1px solid #cdd3dd; border-radius: 5px;
  font-size: 12px; background: #fff; color: #333;
  outline: none; cursor: pointer;
}
.tcsm-dp-select:focus   { border-color: #1a73e8; }
.tcsm-dp-select:disabled { opacity: .45; cursor: default; }

.tcsm-dp-none { color: #bbb; font-size: 12px; font-style: italic; }

/* ── Footer ──────────────────────────────────────────────────────────── */
.tcsm-footer {
  display: flex; align-items: center; justify-content: space-between;
  padding: 12px 16px;
  border-top: 1px solid #e8eaed;
  background: #fafafa;
}
.tcsm-sel-count { font-size: 12px; color: #666; }
.tcsm-footer-btns { display: flex; gap: 8px; }

.tcsm-btn-cancel {
  padding: 7px 16px; border: 1px solid #cdd3dd;
  border-radius: 6px; background: #fff; color: #444;
  font-size: 13px; cursor: pointer; font-weight: 500;
  transition: background .15s;
}
.tcsm-btn-cancel:hover { background: #f0f0f0; }

.tcsm-btn-add {
  padding: 7px 18px; border: none;
  border-radius: 6px; background: #1a73e8; color: #fff;
  font-size: 13px; font-weight: 600; cursor: pointer;
  transition: background .15s;
}
.tcsm-btn-add:hover:not(:disabled) { background: #1557b0; }
.tcsm-btn-add:disabled { opacity: .45; cursor: default; }
</style>
