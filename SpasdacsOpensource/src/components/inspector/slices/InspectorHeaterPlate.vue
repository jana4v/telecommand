<template>
  <section class="section">
    <h4 class="section-title">Heater Plate</h4>

    <label class="field">
      <span>Label</span>
      <input
        class="input"
        type="text"
        placeholder="e.g. HEATER-1"
        :value="data.name ?? ''"
        @change="set('name', ($event.target as HTMLInputElement).value)"
      />
    </label>

    <div class="divider" />

    <div class="field">
      <span>Heater State</span>
      <div class="btn-group">
        <button class="btn" :class="{ active: !isOn }" @click="setOff">OFF</button>
        <button class="btn" :class="{ active: isOn }" @click="setOn">ON</button>
      </div>
      <span class="field-hint">Manual check for heating visual without telemetry.</span>
    </div>

    <label class="field checkbox-row">
      <input
        type="checkbox"
        :checked="heaterOn"
        @change="set('heaterOn', ($event.target as HTMLInputElement).checked)"
      />
      <span>Heater Enabled Flag</span>
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

    <label class="field">
      <span>Temp Font Size ({{ tempFontSize }}px)</span>
      <div class="slider-row">
        <input
          class="slider"
          type="range"
          min="10"
          max="52"
          step="1"
          :value="tempFontSize"
          @input="set('tempFontSize', Number(($event.target as HTMLInputElement).value))"
        />
        <span class="slider-val">{{ tempFontSize }}px</span>
      </div>
    </label>

    <div class="preview-state">
      <span class="preview-label">Preview:</span>
      <span class="chip" :class="isOn ? 'chip-on' : 'chip-off'">{{ isOn ? 'ON' : 'OFF' }}</span>
      <span class="chip" :class="tempChipClass">{{ tempLabel }}</span>
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

const heaterOn = computed(() => props.data.heaterOn === true);
const statusColor = computed(() => String(props.data.statusColor ?? "").trim());
const isOn = computed(() => heaterOn.value || statusColor.value.length > 0);

const tempNumber = computed(() => {
  const t = Number(props.data.temperature);
  return Number.isFinite(t) ? t : 40;
});

const tempFontSize = computed(() => {
  const s = Number(props.data.tempFontSize);
  return Number.isFinite(s) && s > 0 ? s : 18;
});

const tempLabel = computed(() => {
  const t = Number(props.data.temperature);
  return Number.isFinite(t) ? `${t.toFixed(1)}C` : "temp --";
});

const tempChipClass = computed(() => {
  const t = Number(props.data.temperature);
  if (!Number.isFinite(t)) return "chip-dim";
  if (t >= 65) return "chip-hot";
  if (t >= 45) return "chip-warm";
  return "chip-cool";
});

function setOn() {
  props.set("heaterOn", true);
  if (!statusColor.value) props.set("statusColor", "#ff8a3d");
}

function setOff() {
  props.set("heaterOn", false);
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
.btn.active { background: #5a2f1f; color: #ffbd8d; border-color: #8a4f30; }
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
.chip-on { background: #4f2a18; color: #ffbe8b; border-color: #8a5530; }
.chip-off { background: #2a1e1e; color: #c28585; border-color: #4a3232; }
.chip-hot { background: #4f2416; color: #ff9d72; border-color: #8a3f2b; }
.chip-warm { background: #4a3517; color: #ffce82; border-color: #7f5c2e; }
.chip-cool { background: #17344a; color: #7dd8ff; border-color: #295472; }
.chip-dim { background: #161b22; color: #6a7a8a; border-color: #21262d; }

.slider-row { display: flex; align-items: center; gap: 8px; }
.slider { flex: 1; }
.slider-val {
  min-width: 42px;
  text-align: right;
  font-size: 11px;
  color: #9bb0c8;
  font-variant-numeric: tabular-nums;
}
</style>
