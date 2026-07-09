<template>
  <section class="section">
    <h4 class="section-title">Radiator Fan</h4>

    <label class="field">
      <span>Label</span>
      <input
        class="input"
        type="text"
        placeholder="e.g. RAD FAN-1"
        :value="data.name ?? ''"
        @change="set('name', ($event.target as HTMLInputElement).value)"
      />
    </label>

    <label class="field">
      <span>Status Color</span>
      <div class="color-row">
        <input
          class="color-picker"
          type="color"
          :value="safeColor"
          @input="set('statusColor', ($event.target as HTMLInputElement).value)"
        />
        <input
          class="input"
          type="text"
          :value="safeColor"
          @change="set('statusColor', ($event.target as HTMLInputElement).value)"
        />
      </div>
    </label>

    <div class="divider" />

    <div class="field">
      <span>Fan State</span>
      <div class="btn-group">
        <button class="btn" :class="{ active: !isOn }" @click="setOff">OFF</button>
        <button class="btn" :class="{ active: isOn }" @click="setOn">ON</button>
      </div>
      <span class="field-hint">Use this to validate blade + airflow cooling animation without telemetry.</span>
    </div>

    <label class="field checkbox-row">
      <input
        type="checkbox"
        :checked="flowActive"
        @change="set('flowActive', ($event.target as HTMLInputElement).checked)"
      />
      <span>Airflow Animation Enabled</span>
    </label>

    <label class="field">
      <span>Temperature (C)</span>
      <input
        class="input"
        type="number"
        step="0.1"
        :value="tempNumber"
        @change="onTempChange"
      />
    </label>

    <div class="preview-state">
      <span class="preview-label">Preview:</span>
      <span class="chip" :class="isOn ? 'chip-on' : 'chip-off'">{{ isOn ? 'ON' : 'OFF' }}</span>
      <span class="chip" :class="flowActive ? 'chip-flow' : 'chip-dim'">airflow {{ flowActive ? 'active' : 'idle' }}</span>
    </div>
    <label class="field">
      <span>Title Font Size ({{ data.titleFontSize ?? 'auto' }}{{ data.titleFontSize ? 'px' : '' }})</span>
      <div class="slider-row">
        <input class="slider" type="range" min="6" max="40" step="1"
          :value="data.titleFontSize ?? 10"
          @input="set('titleFontSize', Number(($event.target as HTMLInputElement).value))" />
        <span class="slider-val">{{ data.titleFontSize ?? 'auto' }}{{ data.titleFontSize ? 'px' : '' }}</span>
      </div>
    </label>
  </section>
</template>

<script setup lang="ts">
import { computed } from "vue";
import type { InspectorSetter } from "../inspectorTypes";

const props = defineProps<{
  data: Record<string, any>;
  set: InspectorSetter;
}>();

const flowActive = computed(() => props.data.flowActive === true);
const statusColor = computed(() => String(props.data.statusColor ?? "").trim());
const isOn = computed(() => flowActive.value || statusColor.value.length > 0);

const safeColor = computed(() => {
  const raw = statusColor.value;
  return /^#[0-9a-fA-F]{6}$/.test(raw) ? raw : "#27ae60";
});

const tempNumber = computed(() => {
  const t = Number(props.data.temperature);
  return Number.isFinite(t) ? t : 30;
});

function setOn() {
  props.set("flowActive", true);
  if (!statusColor.value) props.set("statusColor", "#27ae60");
}

function setOff() {
  props.set("flowActive", false);
  props.set("statusColor", "");
}

function onTempChange(e: Event) {
  const n = Number((e.target as HTMLInputElement).value);
  if (Number.isFinite(n)) props.set("temperature", n);
}
</script>

<style scoped>
.field { display: flex; flex-direction: column; gap: 4px; margin-bottom: 8px; }
.field > span:first-child {
  font-size: 10px;
  color: #8b949e;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
.input {
  background: #0d1117;
  border: 1px solid #30363d;
  border-radius: 4px;
  color: #c9d1d9;
  font-size: 12px;
  padding: 4px 7px;
  width: 100%;
  outline: none;
  box-sizing: border-box;
}
.input:focus { border-color: #4a9eff; }
.color-row { display: flex; gap: 5px; align-items: center; }
.color-picker {
  width: 28px;
  height: 26px;
  padding: 0;
  border: 1px solid #30363d;
  border-radius: 4px;
  cursor: pointer;
  flex-shrink: 0;
}
.divider { height: 1px; background: #21262d; margin: 8px 0; }
.btn-group { display: flex; gap: 4px; }
.btn {
  flex: 1;
  padding: 4px 0;
  font-size: 11px;
  font-weight: 600;
  border: 1px solid #30363d;
  border-radius: 4px;
  background: #0d1117;
  color: #8b949e;
  cursor: pointer;
}
.btn:hover { background: #161b22; color: #c9d1d9; }
.btn.active { background: #1a3a5c; color: #4a9eff; border-color: #2a5090; }
.field-hint { font-size: 10px; color: #4a5568; line-height: 1.3; }
.checkbox-row {
  flex-direction: row;
  align-items: center;
  gap: 8px;
}
.checkbox-row > span {
  font-size: 12px;
  color: #c9d1d9;
  text-transform: none;
  letter-spacing: 0;
}
.preview-state {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
  margin-top: 4px;
  padding: 6px 8px;
  background: #0d1117;
  border: 1px solid #21262d;
  border-radius: 5px;
}
.preview-label { font-size: 10px; color: #4a5568; }
.chip {
  font-size: 10px;
  font-weight: 700;
  padding: 2px 7px;
  border-radius: 10px;
  border: 1px solid transparent;
}
.chip-on { background: #173323; color: #4ddf92; border-color: #245438; }
.chip-off { background: #2a1e1e; color: #c28585; border-color: #4a3232; }
.chip-flow { background: #142b36; color: #6cd9ff; border-color: #21495a; }
.chip-dim { background: #161b22; color: #6a7a8a; border-color: #21262d; }
</style>
