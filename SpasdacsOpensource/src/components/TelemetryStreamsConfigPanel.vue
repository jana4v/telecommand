<template>
  <div class="tsp">
    <p class="tsp-hint">
      Subjects are <code>{{ subjectPrefix || "tm" }}.&lt;suffix&gt;</code>.
      Each row is one logical source; comma-separated suffixes if a source uses multiple subjects (e.g. <code>tm_map, tm_map/full</code>).
    </p>
    <div v-for="(row, idx) in telemetryStreams" :key="idx" class="tsp-row">
      <label class="tsp-field tsp-field-id">
        <span>Id</span>
        <input class="tsp-input" :disabled="disabled" :value="row.id"
          @change="onStreamId(idx, ($event.target as HTMLInputElement).value)"
          placeholder="default" spellcheck="false" />
      </label>
      <label class="tsp-field tsp-field-label">
        <span>Label</span>
        <input class="tsp-input" v-model="row.label" :disabled="disabled" placeholder="Display name" />
      </label>
      <label class="tsp-field tsp-field-suffix">
        <span>Suffix(es)</span>
        <input class="tsp-input" :disabled="disabled"
          :value="row.subjectSuffixes.join(', ')"
          @change="onStreamSuffixes(idx, ($event.target as HTMLInputElement).value)"
          placeholder="tm1, tm2 or tm_map" spellcheck="false" />
      </label>
      <button type="button" class="tsp-remove" :disabled="disabled || telemetryStreams.length <= 1"
        title="Remove stream" @click="removeRow(idx)">✕</button>
    </div>
    <div class="tsp-actions">
      <button type="button" class="tsp-btn-secondary" :disabled="disabled" @click="addRow">+ Add stream</button>
      <button type="button" class="tsp-btn-ghost" :disabled="disabled" @click="resetDefaults">Reset defaults</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { NatsTelemetryStream } from "../types";
import { telemetryStreams, resetTelemetryStreamsToDefault } from "../stores/telemetryStreamsConfig";

defineProps<{
  /** Grey out editing (e.g. NATS connected in viewer) */
  disabled?: boolean;
  /** Shown in the subject hint */
  subjectPrefix?: string;
}>();

function onStreamId(idx: number, raw: string) {
  const id = raw.replace(/[^a-zA-Z0-9_]/g, "").slice(0, 48) || "default";
  telemetryStreams.value[idx]!.id = id;
}

function onStreamSuffixes(idx: number, raw: string) {
  const parts = raw.split(/[,;\s]+/).map(s => s.trim()).filter(Boolean);
  telemetryStreams.value[idx]!.subjectSuffixes = parts.length ? parts : ["tm_map"];
}

function addRow() {
  const n = telemetryStreams.value.length + 1;
  const row: NatsTelemetryStream = {
    id:    `tm${n}`,
    label: `Stream ${n}`,
    subjectSuffixes: [`tm${n}`],
  };
  telemetryStreams.value = [...telemetryStreams.value, row];
}

function removeRow(idx: number) {
  if (telemetryStreams.value.length <= 1) return;
  telemetryStreams.value = telemetryStreams.value.filter((_, i) => i !== idx);
}

function resetDefaults() {
  resetTelemetryStreamsToDefault();
}
</script>

<style scoped>
.tsp { display: flex; flex-direction: column; gap: 10px; }
.tsp-hint {
  font-size: 11px; color: #8b949e; line-height: 1.45; margin: 0;
}
.tsp-hint code { font-size: 10px; color: #c9d1d9; }
.tsp-row {
  display: flex; flex-wrap: wrap; align-items: flex-end; gap: 8px;
}
.tsp-field {
  display: flex; flex-direction: column; gap: 3px;
}
.tsp-field span {
  font-size: 10px; font-weight: 700; color: #8b949e; text-transform: uppercase; letter-spacing: 0.04em;
}
.tsp-field-id    { flex: 0 0 100px; min-width: 80px; }
.tsp-field-label { flex: 1 1 120px; min-width: 100px; }
.tsp-field-suffix{ flex: 2 1 200px; min-width: 160px; }
.tsp-input {
  background: #0d1117; border: 1px solid #30363d; border-radius: 5px;
  color: #c9d1d9; font-size: 12px; padding: 5px 8px; outline: none;
}
.tsp-input:focus { border-color: #4a9eff; }
.tsp-input:disabled { opacity: 0.5; }
.tsp-remove {
  flex: 0 0 auto; height: 28px; width: 28px; margin-bottom: 2px;
  background: rgba(231,76,60,0.15); border: 1px solid rgba(231,76,60,0.35);
  color: #e74c3c; border-radius: 4px; cursor: pointer; font-size: 14px; line-height: 1;
}
.tsp-remove:disabled { opacity: 0.35; cursor: default; }
.tsp-actions { display: flex; gap: 8px; flex-wrap: wrap; }
.tsp-btn-secondary, .tsp-btn-ghost {
  font-size: 11px; padding: 4px 10px; border-radius: 4px; cursor: pointer;
  background: #21262d; border: 1px solid #30363d; color: #c9d1d9;
}
.tsp-btn-ghost { color: #8b949e; }
.tsp-btn-secondary:disabled, .tsp-btn-ghost:disabled { opacity: 0.4; cursor: default; }
</style>
