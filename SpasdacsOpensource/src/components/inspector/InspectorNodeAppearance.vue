<template>
  <section class="section">
    <h4 class="section-title">Appearance</h4>
    <label class="field">
      <span>Fill</span>
      <div class="color-row">
        <input type="color" class="color-picker" :value="data.fill || '#22223a'"
          @input="set('fill', ($event.target as HTMLInputElement).value)" />
        <input class="input" :value="data.fill || '#22223a'"
          @change="set('fill', ($event.target as HTMLInputElement).value)" />
      </div>
    </label>
    <label class="field">
      <span>Stroke</span>
      <div class="color-row">
        <input type="color" class="color-picker" :value="data.stroke || '#a8a8b8'"
          @input="set('stroke', ($event.target as HTMLInputElement).value)" />
        <input class="input" :value="data.stroke || '#a8a8b8'"
          @change="set('stroke', ($event.target as HTMLInputElement).value)" />
      </div>
    </label>
    <label class="field">
      <span>Stroke Width</span>
      <input class="input" type="number" min="0" max="20"
        :value="data.strokeWidth ?? 2"
        @change="set('strokeWidth', parseFloat(($event.target as HTMLInputElement).value))" />
    </label>
  </section>
</template>

<script setup lang="ts">
import type { InspectorSetter } from "./inspectorTypes";

defineProps<{
  data: Record<string, any>;
  set: InspectorSetter;
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
.input {
  background: #0d1117; border: 1px solid #30363d; border-radius: 4px;
  color: #c9d1d9; font-size: 12px; padding: 4px 7px; width: 100%; outline: none;
}
.input:focus { border-color: #4a9eff; }
.color-row { display: flex; gap: 5px; align-items: center; }
.color-picker { width: 28px; height: 26px; padding: 0; border: 1px solid #30363d; border-radius: 4px; cursor: pointer; flex-shrink: 0; }
</style>
