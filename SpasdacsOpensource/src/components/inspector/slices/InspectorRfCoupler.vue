<template>
  <section class="section">
    <h4 class="section-title">RF Coupler</h4>

    <label class="field">
      <span>Body Color</span>
      <div class="color-row">
        <input type="color" class="color-picker"
          :value="data.fill || '#1e90b8'"
          @input="set('fill', ($event.target as HTMLInputElement).value)" />
        <input type="text" class="input"
          :value="data.fill || '#1e90b8'"
          @change="set('fill', ($event.target as HTMLInputElement).value)" />
      </div>
    </label>

    <label class="field">
      <span>Border Color</span>
      <div class="color-row">
        <input type="color" class="color-picker"
          :value="data.stroke || '#0d5f78'"
          @input="set('stroke', ($event.target as HTMLInputElement).value)" />
        <input type="text" class="input"
          :value="data.stroke || '#0d5f78'"
          @change="set('stroke', ($event.target as HTMLInputElement).value)" />
      </div>
    </label>

    <label class="field">
      <span>Border Width ({{ data.strokeWidth ?? 2 }}px)</span>
      <div class="slider-row">
        <input class="slider" type="range" min="1" max="8" step="0.5"
          :value="data.strokeWidth ?? 2"
          @input="set('strokeWidth', Number(($event.target as HTMLInputElement).value))" />
        <span class="slider-val">{{ data.strokeWidth ?? 2 }}px</span>
      </div>
    </label>
  </section>
</template>

<script setup lang="ts">
import type { InspectorSetter } from "../inspectorTypes";

defineProps<{
  data: Record<string, any>;
  set: InspectorSetter;
}>();
</script>
