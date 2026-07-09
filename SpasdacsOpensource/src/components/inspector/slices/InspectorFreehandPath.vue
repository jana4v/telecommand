<template>
  <section class="section">
    <h4 class="section-title">Shape Settings</h4>
    <label class="field">
      <span>Type</span>
      <select class="input" :value="data.pathType || 'line'" @change="set('pathType', ($event.target as HTMLSelectElement).value)">
        <option value="line">Line / Polyline</option>
        <option value="ortho">Orthogonal (H/V only)</option>
        <option value="curve">Curved Line (Arc)</option>
      </select>
    </label>
    <label v-if="(data.pathType || 'line') === 'curve'" class="field">
      <span>Curve Bend ({{ bendDisplay }})</span>
      <div class="slider-row">
        <input class="slider" type="range" min="-2" max="2" step="0.05"
          :value="data.bendFactor ?? 0.3"
          @input="set('bendFactor', Number(($event.target as HTMLInputElement).value))" />
        <span class="slider-val">{{ bendDisplay }}</span>
      </div>
    </label>
    <label class="field">
      <span>Stroke Color</span>
      <div class="color-row">
        <input type="color" class="color-picker"
          :value="data.strokeColor || '#60a5fa'"
          @input="set('strokeColor', ($event.target as HTMLInputElement).value)" />
        <input class="input"
          :value="data.strokeColor || '#60a5fa'"
          @change="set('strokeColor', ($event.target as HTMLInputElement).value)"
          placeholder="#60a5fa" />
      </div>
    </label>
    <label class="field">
      <span>Stroke Width ({{ data.strokeWidth ?? 2 }}px)</span>
      <div class="slider-row">
        <input class="slider" type="range" min="1" max="20" step="0.5"
          :value="data.strokeWidth ?? 2"
          @input="set('strokeWidth', Number(($event.target as HTMLInputElement).value))" />
        <span class="slider-val">{{ data.strokeWidth ?? 2 }}px</span>
      </div>
    </label>
    <label class="field">
      <span>Opacity ({{ Math.round((data.opacity ?? 1) * 100) }}%)</span>
      <div class="slider-row">
        <input class="slider" type="range" min="0" max="1" step="0.05"
          :value="data.opacity ?? 1"
          @input="set('opacity', Number(($event.target as HTMLInputElement).value))" />
        <span class="slider-val">{{ Math.round((data.opacity ?? 1) * 100) }}%</span>
      </div>
    </label>
    <div class="field">
      <span>Flow Animation</span>
      <div class="toggle-row">
        <label class="toggle-switch">
          <input type="checkbox" :checked="data.flowActive ?? false"
            @change="set('flowActive', ($event.target as HTMLInputElement).checked)" />
          <span class="toggle-knob"></span>
        </label>
        <span class="toggle-label">{{ data.flowActive ? 'On' : 'Off' }}</span>
        <button v-if="data.flowActive" class="dir-btn"
          :class="{ active: (data.flowDirection ?? 1) >= 0 }"
          @click="set('flowDirection', 1)">→ Fwd</button>
        <button v-if="data.flowActive" class="dir-btn"
          :class="{ active: (data.flowDirection ?? 1) < 0 }"
          @click="set('flowDirection', -1)">← Rev</button>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from "vue";
import type { InspectorSetter } from "../inspectorTypes";

const props = defineProps<{
  data: Record<string, any>;
  set: InspectorSetter;
}>();

const bendDisplay = computed(() => {
  const v = (props.data.bendFactor as number) ?? 0.3;
  return v.toFixed(2);
});
</script>
