<template>
  <section class="section">
    <h4 class="section-title">Plot Graph</h4>

    <label class="field">
      <span>Title</span>
      <input class="input" type="text" :value="title" @change="setTitle(($event.target as HTMLInputElement).value)" />
    </label>

    <label class="field">
      <span>Plot Type</span>
      <select class="input" :value="plotType" @change="setPlotType(($event.target as HTMLSelectElement).value)">
        <option value="line">Line</option>
        <option value="scatter">Scatter</option>
        <option value="bar">Bar</option>
      </select>
    </label>

    <label class="field">
      <span>X-Axis Source</span>
      <select class="input" :value="xMode" @change="setXMode(($event.target as HTMLSelectElement).value)">
        <option value="time">Local Time</option>
        <option value="telemetry">Telemetry</option>
      </select>
    </label>

    <label v-if="xMode === 'telemetry'" class="field">
      <span>X Telemetry Topic</span>
      <input class="input topic-input" type="text" :value="xTopic"
        placeholder="e.g. SIM_TIME"
        @change="setXTopic(($event.target as HTMLInputElement).value)" />
    </label>

    <div class="field">
      <span>Y-Axis Telemetry</span>
      <div class="y-list">
        <div v-for="(topic, idx) in yTopics" :key="idx" class="y-row">
          <input class="input topic-input" type="text" :value="topic"
            :placeholder="`Series ${idx + 1} topic`"
            @change="setYTopic(idx, ($event.target as HTMLInputElement).value)" />
          <button class="btn-del" type="button" title="Remove series" @click="removeYTopic(idx)">×</button>
        </div>
      </div>
      <button class="btn-add" type="button" :disabled="yTopics.length >= 4" @click="addYTopic">+ Add Y Series</button>
      <p v-if="plotType === 'line' && xMode === 'time'" class="hint">
        Multiple Y series are supported for line plots with local-time X-axis.
      </p>
    </div>

    <label class="field">
      <span>Buffer Duration (seconds)</span>
      <input class="input" type="number" min="5" max="86400" step="1"
        :value="bufferSeconds"
        @change="setBufferSeconds(($event.target as HTMLInputElement).value)" />
      <small class="hint">Old points are removed after this duration, new points keep streaming in.</small>
    </label>
  </section>
</template>

<script setup lang="ts">
import { computed } from "vue";
import type { TelemetryBinding } from "../../../types";
import type { InspectorSetter } from "../inspectorTypes";

const props = defineProps<{
  data: Record<string, any>;
  set: InspectorSetter;
}>();

const title = computed(() => String(props.data.plotTitle ?? props.data.name ?? "Telemetry Plot"));
const plotType = computed<"line" | "scatter" | "bar">(() => {
  const t = String(props.data.plotType ?? "line").toLowerCase();
  return t === "scatter" || t === "bar" ? t : "line";
});
const xMode = computed<"time" | "telemetry">(() => {
  const m = String(props.data.plotXMode ?? "time").toLowerCase();
  return m === "telemetry" ? "telemetry" : "time";
});
const xTopic = computed(() => String(props.data.plotXTopic ?? ""));
const yTopics = computed<string[]>(() => {
  const arr = Array.isArray(props.data.plotYTopics) ? props.data.plotYTopics : [];
  return arr.map((s: unknown) => String(s ?? ""));
});
const bufferSeconds = computed(() => {
  const n = Number(props.data.plotBufferSeconds ?? 120);
  return Number.isFinite(n) ? Math.max(5, n) : 120;
});

function newId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function rebuildBindings(nextXMode: "time" | "telemetry", nextXTopic: string, nextYTopics: string[]) {
  const existing = (props.data.telemetryBindings as TelemetryBinding[] | undefined) ?? [];
  const keep = existing.filter((b) => !/^plot_(x|y_\d+)$/.test(String(b.targetProp ?? "")));

  const fresh: TelemetryBinding[] = [];
  if (nextXMode === "telemetry" && nextXTopic.trim()) {
    const prev = existing.find((b) => b.targetProp === "plot_x");
    fresh.push({
      id: prev?.id ?? newId(),
      topic: nextXTopic.trim(),
      targetProp: "plot_x",
      sourceStreamId: prev?.sourceStreamId,
    });
  }

  nextYTopics
    .map((t) => t.trim())
    .filter(Boolean)
    .forEach((topic, idx) => {
      const targetProp = `plot_y_${idx}`;
      const prev = existing.find((b) => b.targetProp === targetProp);
      fresh.push({
        id: prev?.id ?? newId(),
        topic,
        targetProp,
        sourceStreamId: prev?.sourceStreamId,
      });
    });

  props.set("telemetryBindings", [...keep, ...fresh]);
}

function setTitle(v: string) {
  const t = v.trim() || "Telemetry Plot";
  props.set("name", t);
  props.set("plotTitle", t);
}

function setPlotType(v: string) {
  const t = v === "scatter" || v === "bar" ? v : "line";
  props.set("plotType", t);
}

function setXMode(v: string) {
  const mode = v === "telemetry" ? "telemetry" : "time";
  props.set("plotXMode", mode);
  rebuildBindings(mode, xTopic.value, yTopics.value);
}

function setXTopic(v: string) {
  const topic = v.trim();
  props.set("plotXTopic", topic);
  rebuildBindings(xMode.value, topic, yTopics.value);
}

function setYTopic(idx: number, v: string) {
  const next = [...yTopics.value];
  next[idx] = v.trim();
  props.set("plotYTopics", next);
  rebuildBindings(xMode.value, xTopic.value, next);
}

function addYTopic() {
  const next = [...yTopics.value, ""];
  props.set("plotYTopics", next);
  rebuildBindings(xMode.value, xTopic.value, next);
}

function removeYTopic(idx: number) {
  const next = yTopics.value.filter((_, i) => i !== idx);
  props.set("plotYTopics", next);
  rebuildBindings(xMode.value, xTopic.value, next);
}

function setBufferSeconds(v: string) {
  const n = Number(v);
  props.set("plotBufferSeconds", Number.isFinite(n) ? Math.max(5, Math.round(n)) : 120);
}
</script>

<style scoped>
.y-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin: 6px 0;
}

.y-row {
  display: flex;
  align-items: center;
  gap: 6px;
}

.topic-input {
  color: #4a9eff !important;
  font-size: 10px !important;
}

.btn-add {
  margin-top: 4px;
  padding: 4px 8px;
  border-radius: 5px;
  border: 1px solid rgba(74, 158, 255, 0.35);
  background: rgba(74, 158, 255, 0.12);
  color: #4a9eff;
  cursor: pointer;
  font-size: 11px;
}

.btn-add:disabled {
  opacity: 0.45;
  cursor: default;
}

.btn-del {
  border: none;
  background: none;
  color: #6e7681;
  cursor: pointer;
  font-size: 16px;
  line-height: 1;
  padding: 0 2px;
}

.btn-del:hover {
  color: #e74c3c;
}

.hint {
  margin: 6px 0 0;
  color: #8b949e;
  font-size: 10px;
}
</style>
