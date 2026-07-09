<template>
  <section class="section">
    <h4 class="section-title">Label Settings</h4>
    <label class="field">
      <span>Text</span>
      <input class="input" :value="data.statusText || data.name || ''"
        @change="set('statusText', ($event.target as HTMLInputElement).value)" />
    </label>
    <label class="field">
      <span>Font Size</span>
      <div class="slider-row">
        <input class="slider" type="range" min="8" max="72" step="1"
          :value="data.fontSize ?? 16"
          @input="set('fontSize', Number(($event.target as HTMLInputElement).value))" />
        <span class="slider-val">{{ data.fontSize ?? 16 }}px</span>
      </div>
    </label>
    <label class="field">
      <span>Text Color</span>
      <div class="color-row">
        <input type="color" class="color-picker" :value="data.statusColor || '#ffffff'"
          @input="set('statusColor', ($event.target as HTMLInputElement).value)" />
        <input class="input" :value="data.statusColor || '#ffffff'"
          @change="set('statusColor', ($event.target as HTMLInputElement).value)" />
      </div>
    </label>

    <h4 class="section-title" style="margin-top:10px">Telemetry Formatting</h4>
    <p class="hint">Prefix / Suffix wrap the live telemetry value when bound.</p>
    <label class="field">
      <span>Prefix</span>
      <input class="input" :value="data.labelPrefix ?? ''"
        placeholder="e.g. Temp:"
        @input="set('labelPrefix', ($event.target as HTMLInputElement).value)" />
    </label>
    <label class="field">
      <span>Suffix</span>
      <input class="input" :value="data.labelSuffix ?? '°C'"
        placeholder="°C"
        @input="set('labelSuffix', ($event.target as HTMLInputElement).value)" />
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

<style scoped>
.hint { font-size: 11px; color: #7a8a9a; line-height: 1.45; margin: 2px 0 6px 0; }
</style>
