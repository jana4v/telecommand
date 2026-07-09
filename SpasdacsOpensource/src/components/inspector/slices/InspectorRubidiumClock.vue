<template>
  <section class="section">
    <h4 class="section-title">Display Settings</h4>

    <label class="field">
      <span>Title Font Size ({{ data.titleFontSize ?? 10 }}px)</span>
      <div class="slider-row">
        <input class="slider" type="range" min="6" max="24" step="1"
          :value="data.titleFontSize ?? 10"
          @input="set('titleFontSize', Number(($event.target as HTMLInputElement).value))" />
        <span class="slider-val">{{ data.titleFontSize ?? 10 }}px</span>
      </div>
    </label>

    <label class="field">
      <span>Temp Font Size ({{ data.tempFontSize ?? 9 }}px)</span>
      <div class="slider-row">
        <input class="slider" type="range" min="6" max="24" step="1"
          :value="data.tempFontSize ?? 9"
          @input="set('tempFontSize', Number(($event.target as HTMLInputElement).value))" />
        <span class="slider-val">{{ data.tempFontSize ?? 9 }}px</span>
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
