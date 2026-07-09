<template>
  <section class="section">
    <h4 class="section-title">NSGU Settings</h4>

    <label class="field">
      <span>Status</span>
      <select class="input"
        :value="statusVal"
        @change="onStatus(($event.target as HTMLSelectElement).value)">
        <option value="ON">ON</option>
        <option value="OFF">OFF</option>
      </select>
    </label>

    <label class="field">
      <span>Temperature (°C)</span>
      <input class="input" type="number" step="0.1"
        :value="data.temperature ?? ''"
        @change="set('temperature', Number(($event.target as HTMLInputElement).value))" />
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

const statusVal = computed(() => {
  const sc = props.data.statusColor as string | undefined;
  return sc && sc !== "" && sc !== "gradient:off" ? "ON" : "OFF";
});

function onStatus(val: string) {
  props.set("statusColor", val === "ON" ? "#27ae60" : "");
}
</script>
