<template>
  <section class="section">
    <h4 class="section-title">Text Settings</h4>
    <label class="field">
      <span>Title Font Size ({{ data.titleFontSize ?? 11 }}px)</span>
      <div class="slider-row">
        <input class="slider" type="range" min="6" max="48" step="1"
          :value="data.titleFontSize ?? 11"
          @input="set('titleFontSize', Number(($event.target as HTMLInputElement).value))" />
        <span class="slider-val">{{ data.titleFontSize ?? 11 }}px</span>
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
