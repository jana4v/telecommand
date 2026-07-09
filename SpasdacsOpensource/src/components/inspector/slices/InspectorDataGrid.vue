<template>
  <section class="section">
    <h4 class="section-title">Telemetry Rows</h4>

    <!-- Existing rows -->
    <div v-for="(row, i) in localRows" :key="row.id" class="dg-row">
      <span class="dg-row-idx">{{ i + 1 }}</span>
      <div class="dg-row-fields">
        <!-- Label + topics -->
        <input class="input dg-input"
               :value="row.label"
               placeholder="Label"
               title="Display label (static text)"
               @change="updateRowLabel(i, ($event.target as HTMLInputElement).value)" />
        <input class="input dg-input dg-input-topic"
               :value="row.labelTopic"
               placeholder="Label topic (optional)"
               title="If set, the label text comes from this TM mnemonic"
               @change="updateRowLabelTopic(i, ($event.target as HTMLInputElement).value)" />
        <input class="input dg-input dg-input-topic"
               :value="row.valueTopic"
               placeholder="Value topic"
               title="TM mnemonic for the value column"
               @change="updateRowValueTopic(i, ($event.target as HTMLInputElement).value)" />

        <!-- Value options row -->
        <div class="dg-row-opts">
          <!-- Decimals -->
          <label class="dg-opt-label" title="Round numeric value to N decimal places">
            <span class="dg-opt-text">Decimals</span>
            <input class="input dg-decimals-input"
                   type="number" min="0" max="8" step="1"
                   :value="row.decimals ?? ''"
                   placeholder="—"
                   @change="updateRowDecimals(i, ($event.target as HTMLInputElement).value)" />
          </label>

          <!-- Display mode toggle -->
          <div class="dg-mode-toggle" title="How the value is displayed">
            <button class="dg-mode-btn" :class="{ active: (row.displayMode ?? 'text') === 'text' }"
                    @click="updateRowDisplayMode(i, 'text')">Text</button>
            <button class="dg-mode-btn" :class="{ active: row.displayMode === 'led' }"
                    @click="updateRowDisplayMode(i, 'led')">
              <span class="led-dot" :class="{ active: row.displayMode === 'led' }"></span>
              LED
            </button>
          </div>
        </div>

        <!-- LED condition inputs (visible only in LED mode) -->
        <div v-if="row.displayMode === 'led'" class="dg-led-conds">
          <div class="dg-led-cond-row">
            <span class="dg-led-dot-on">●</span>
            <input class="input dg-input dg-led-input"
                   :value="row.ledOnCondition ?? ''"
                   placeholder='ON condition  e.g. v === "PRESENT"'
                   @change="updateRowLedOn(i, ($event.target as HTMLInputElement).value)" />
          </div>
          <div class="dg-led-cond-row">
            <span class="dg-led-dot-off">●</span>
            <input class="input dg-input dg-led-input"
                   :value="row.ledOffCondition ?? ''"
                   placeholder='OFF condition  e.g. v === "ABSENT"'
                   @change="updateRowLedOff(i, ($event.target as HTMLInputElement).value)" />
          </div>
          <!-- Quick-pick chips from cached range values -->
          <div v-if="(row.ledRangeValues ?? []).length" class="dg-led-chips">
            <span class="dg-chips-hint">Values:</span>
            <button v-for="val in row.ledRangeValues" :key="val" class="dg-led-chip"
                    @click="quickChipOn(i, val)">{{ val }}</button>
          </div>
        </div>
      </div>
      <button class="btn-del" title="Remove row" @click="removeRow(i)">×</button>
    </div>

    <!-- Add-row form -->
    <div class="dg-add-form">
      <input class="input dg-input" v-model="newLabel"
             placeholder="Label" title="Static label text" />
      <input class="input dg-input dg-input-topic" v-model="newValueTopic"
             placeholder="Value topic *" title="TM mnemonic (required)" />
      <input class="input dg-input dg-input-topic" v-model="newLabelTopic"
             placeholder="Label topic (opt)" title="TM mnemonic for dynamic label (optional)" />
      <button class="btn-add" :disabled="!newValueTopic.trim()" @click="addRow">
        + Add Row
      </button>
    </div>

    <!-- Display settings -->
    <div class="dg-sep" />

    <!-- Font sizes -->
    <label class="field">
      <span>Title Font ({{ data.titleFontSize ?? 11 }}px)</span>
      <div class="slider-row">
        <input class="slider" type="range" min="6" max="100" step="1"
          :value="data.titleFontSize ?? 11"
          @input="set('titleFontSize', Number(($event.target as HTMLInputElement).value))" />
        <span class="slider-val">{{ data.titleFontSize ?? 11 }}px</span>
      </div>
    </label>
    <label class="field">
      <span>Row Font ({{ data.rowFontSize ?? 10 }}px)</span>
      <div class="slider-row">
        <input class="slider" type="range" min="6" max="100" step="1"
          :value="data.rowFontSize ?? 10"
          @input="set('rowFontSize', Number(($event.target as HTMLInputElement).value))" />
        <span class="slider-val">{{ data.rowFontSize ?? 10 }}px</span>
      </div>
    </label>

    <div class="dg-sep" />

    <!-- Colors -->
    <label class="field">
      <span>Label Color</span>
      <div class="color-row">
        <input type="color" class="color-picker"
               :value="data.labelColor || '#5e7888'"
               @input="set('labelColor', ($event.target as HTMLInputElement).value)" />
        <input class="input color-hex"
               :value="data.labelColor || '#5e7888'"
               maxlength="7"
               @change="set('labelColor', ($event.target as HTMLInputElement).value)" />
      </div>
    </label>
    <label class="field">
      <span>Value Color</span>
      <div class="color-row">
        <input type="color" class="color-picker"
               :value="data.valueColor || '#00ddc8'"
               @input="set('valueColor', ($event.target as HTMLInputElement).value)" />
        <input class="input color-hex"
               :value="data.valueColor || '#00ddc8'"
               maxlength="7"
               @change="set('valueColor', ($event.target as HTMLInputElement).value)" />
      </div>
    </label>
  </section>
</template>

<script setup lang="ts">
import { ref, computed } from "vue";
import type { InspectorSetter } from "../inspectorTypes";
import type { DataGridRow } from "../../../types";
import { buildDataGridBindings } from "../../../graph/dataGridUtils";

const props = defineProps<{
  data: Record<string, any>;
  set: InspectorSetter;
}>();

const localRows = computed<DataGridRow[]>(() => (props.data.rows as DataGridRow[]) ?? []);

const newLabel      = ref("");
const newValueTopic = ref("");
const newLabelTopic = ref("");

function commitRows(rows: DataGridRow[]) {
  props.set("rows", rows);
  props.set("telemetryBindings", buildDataGridBindings(rows, props.data.telemetryBindings ?? []));
}

function addRow() {
  const topic = newValueTopic.value.trim();
  if (!topic) return;
  const id = Math.random().toString(36).slice(2, 9);
  const row: DataGridRow = {
    id,
    label:      newLabel.value.trim() || topic,
    labelTopic: newLabelTopic.value.trim(),
    valueTopic: topic,
    unit:       "",
  };
  commitRows([...localRows.value, row]);
  newLabel.value = newValueTopic.value = newLabelTopic.value = "";
}

function removeRow(idx: number) {
  commitRows(localRows.value.filter((_, i) => i !== idx));
}

function updateRowLabel(idx: number, v: string) {
  commitRows(localRows.value.map((r, i) => i === idx ? { ...r, label: v } : r));
}
function updateRowLabelTopic(idx: number, v: string) {
  commitRows(localRows.value.map((r, i) => i === idx ? { ...r, labelTopic: v } : r));
}
function updateRowValueTopic(idx: number, v: string) {
  commitRows(localRows.value.map((r, i) => i === idx ? { ...r, valueTopic: v } : r));
}
function updateRowDecimals(idx: number, raw: string) {
  const trimmed = raw.trim();
  const decimals = trimmed === "" ? undefined : Math.max(0, Math.min(8, parseInt(trimmed, 10)));
  commitRows(localRows.value.map((r, i) => i === idx ? { ...r, decimals } : r));
}
function updateRowDisplayMode(idx: number, mode: "text" | "led") {
  commitRows(localRows.value.map((r, i) => i === idx ? { ...r, displayMode: mode } : r));
}
function updateRowLedOn(idx: number, v: string) {
  commitRows(localRows.value.map((r, i) => i === idx ? { ...r, ledOnCondition: v } : r));
}
function updateRowLedOff(idx: number, v: string) {
  commitRows(localRows.value.map((r, i) => i === idx ? { ...r, ledOffCondition: v } : r));
}
function quickChipOn(idx: number, val: string) {
  commitRows(localRows.value.map((r, i) => i === idx ? { ...r, ledOnCondition: `v === "${val}"` } : r));
}
</script>

<style scoped>
.dg-row {
  display: flex; align-items: flex-start; gap: 4px;
  margin-bottom: 5px; padding: 4px 0;
  border-bottom: 1px solid #1c2430;
}
.dg-row-idx { font-size: 9px; color: #4a5568; min-width: 12px; padding-top: 5px; }
.dg-row-fields { flex: 1; display: flex; flex-direction: column; gap: 3px; }

.dg-input { font-size: 10px !important; padding: 3px 5px !important; }
.dg-input-topic { font-size: 9px !important; color: #4a9eff !important; }

/* Options row (decimals + mode) */
.dg-row-opts {
  display: flex; align-items: center; gap: 8px; margin-top: 2px;
}
.dg-opt-label {
  display: flex; align-items: center; gap: 4px;
}
.dg-opt-text { font-size: 9px; color: #4a5568; white-space: nowrap; }
.dg-decimals-input {
  width: 40px; font-size: 9px !important; padding: 2px 4px !important;
  text-align: center;
}

/* Display mode toggle */
.dg-mode-toggle {
  display: flex; border: 1px solid #1c2430; border-radius: 4px; overflow: hidden;
}
.dg-mode-btn {
  display: flex; align-items: center; gap: 3px;
  padding: 2px 7px; font-size: 9px; font-weight: 500;
  background: none; border: none; color: #4a5568; cursor: pointer;
  transition: background 0.15s, color 0.15s;
}
.dg-mode-btn.active { background: rgba(74,158,255,0.15); color: #4a9eff; }
.dg-mode-btn:hover:not(.active) { background: rgba(255,255,255,0.04); color: #8899aa; }
.led-dot {
  display: inline-block; width: 7px; height: 7px; border-radius: 50%;
  background: #2a4a5a; transition: background 0.15s;
}
.led-dot.active { background: #00e060; box-shadow: 0 0 4px #00e060; }

/* Add form */
.dg-add-form {
  display: flex; flex-direction: column; gap: 4px;
  margin-top: 6px; padding: 6px 0;
  border-top: 1px dashed #1c2430;
}

.dg-sep { height: 1px; background: #1c2430; margin: 8px 0; }

/* Color controls */
.color-row { display: flex; align-items: center; gap: 6px; }
.color-picker {
  width: 28px; height: 22px; border: 1px solid #2a3a4a;
  border-radius: 3px; padding: 1px; cursor: pointer; background: transparent;
}
.color-hex { flex: 1; font-size: 10px !important; padding: 3px 5px !important; font-family: monospace; }

/* Buttons */
.btn-del {
  background: none; border: none; color: #4a5568;
  font-size: 14px; cursor: pointer; padding: 0 2px; flex-shrink: 0; margin-top: 2px;
}
.btn-del:hover { color: #e74c3c; }
.btn-add {
  width: 100%; padding: 5px;
  background: rgba(74,158,255,0.10); color: #4a9eff;
  border: 1px dashed rgba(74,158,255,0.3); border-radius: 4px;
  font-size: 10px; font-weight: 600; cursor: pointer;
}
.btn-add:hover:not(:disabled) { background: rgba(74,158,255,0.20); }
.btn-add:disabled { opacity: 0.35; cursor: default; }

/* LED condition inputs */
.dg-led-conds {
  display: flex; flex-direction: column; gap: 3px;
  margin-top: 3px; padding: 5px 6px;
  background: rgba(74,158,255,0.05); border: 1px solid rgba(74,158,255,0.15);
  border-radius: 4px;
}
.dg-led-cond-row { display: flex; align-items: center; gap: 4px; }
.dg-led-dot-on  { font-size: 10px; color: #00c853; flex-shrink: 0; }
.dg-led-dot-off { font-size: 10px; color: #e53935; flex-shrink: 0; }
.dg-led-input { font-size: 9px !important; font-family: 'Courier New', monospace !important; }
.dg-led-chips { display: flex; flex-wrap: wrap; align-items: center; gap: 3px; margin-top: 2px; }
.dg-chips-hint { font-size: 8px; color: #4a5568; }
.dg-led-chip {
  font-size: 8px; padding: 1px 5px;
  border: 1px solid rgba(74,158,255,0.25); border-radius: 8px;
  background: rgba(74,158,255,0.08); color: #4a9eff; cursor: pointer;
  font-family: monospace;
}
.dg-led-chip:hover { background: rgba(74,158,255,0.2); }
</style>
