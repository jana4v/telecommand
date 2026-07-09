<template>
  <section class="section">
    <h4 class="section-title">Receiver + Demod Settings</h4>

    <label class="field">
      <span>Status</span>
      <select class="input"
        :value="statusVal"
        @change="set('statusColor', ($event.target as HTMLSelectElement).value === 'on' ? '#27ae60' : '')">
        <option value="off">OFF</option>
        <option value="on">ON</option>
      </select>
    </label>

    <label class="field">
      <span>Temperature (°C)</span>
      <input class="input" type="number" step="0.1"
        :value="data.temperature ?? ''"
        @change="set('temperature', parseFloat(($event.target as HTMLInputElement).value))" />
    </label>

    <label class="field">
      <span>Title Font Size ({{ data.titleFontSize ?? 10 }}px)</span>
      <div class="slider-row">
        <input class="slider" type="range" min="6" max="24" step="1"
          :value="data.titleFontSize ?? 10"
          @input="set('titleFontSize', Number(($event.target as HTMLInputElement).value))" />
        <span class="slider-val">{{ data.titleFontSize ?? 10 }}px</span>
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

const statusVal = computed(() =>
  props.data.statusColor && props.data.statusColor !== "" ? "on" : "off"
);
</script>
