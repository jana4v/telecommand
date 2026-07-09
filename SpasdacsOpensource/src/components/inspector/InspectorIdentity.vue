<template>
  <section class="section">
    <h4 class="section-title">Identity</h4>
    <label class="field">
      <span>Name <span class="field-hint">(Enter for new line)</span></span>
      <textarea class="input input-name" rows="2"
        :value="data.name"
        @change="set('name', ($event.target as HTMLTextAreaElement).value)"
        @keydown.enter.stop
      />
    </label>
    <label class="field">
      <span>Category</span>
      <input class="input" :value="data.category" disabled />
    </label>
    <p v-if="data.category === 'SvgGraphic'" class="field-hint-svg">
      Double-click a shape inside the SVG to choose it for telemetry, then open <strong>Manage Bindings</strong>.
      <template v-if="data.svgSelectedElementId"><br />Selected part: <code>{{ data.svgSelectedElementId }}</code></template>
    </p>
    <label v-if="!isEdge" class="field">
      <span>Opacity</span>
      <div class="slider-row">
        <input class="slider" type="range" min="0" max="1" step="0.05"
          :value="data.opacity ?? 1"
          @input="set('opacity', parseFloat(($event.target as HTMLInputElement).value))" />
        <span class="slider-val">{{ (data.opacity ?? 1).toFixed(2) }}</span>
      </div>
    </label>
  </section>
</template>

<script setup lang="ts">
import type { InspectorSetter } from "./inspectorTypes";

defineProps<{
  data: Record<string, any>;
  set: InspectorSetter;
  isEdge: boolean;
}>();
</script>

<style scoped>
.section { padding: 9px 12px; border-bottom: 1px solid #21262d; }
.section-title {
  font-size: 10px; font-weight: 700; color: #8b949e;
  text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 7px;
}
.field {
  display: flex; flex-direction: column; gap: 2px; margin-bottom: 6px;
}
.field > span {
  font-size: 10px; color: #8b949e; text-transform: uppercase; letter-spacing: 0.04em;
}
.field-hint-svg {
  font-size: 10px; color: #8b949e; line-height: 1.35; margin: -2px 0 8px;
}
.field-hint-svg code { font-size: 10px; color: #4a9eff; }
.input {
  background: #0d1117; border: 1px solid #30363d; border-radius: 4px;
  color: #c9d1d9; font-size: 12px; padding: 4px 7px; width: 100%; outline: none;
}
.input:focus { border-color: #4a9eff; }
.input:disabled { opacity: 0.5; }
.input-name {
  resize: vertical;
  min-height: 38px;
  line-height: 1.4;
  font-family: inherit;
}
.field-hint {
  font-size: 9px;
  color: #4a5568;
  font-weight: 400;
  text-transform: none;
  letter-spacing: 0;
}
.slider-row { display: flex; align-items: center; gap: 6px; }
.slider { flex: 1; accent-color: #4a9eff; }
.slider-val { font-size: 11px; color: #8b949e; min-width: 36px; text-align: right; }
</style>
