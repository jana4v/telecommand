<template>
  <section class="section">
    <h4 class="section-title">RF Circulator</h4>
    <p class="field-hint" style="font-size:11px;opacity:0.75;margin:0 0 8px;line-height:1.35">
      Center shows <code>xx.x deg C</code> when a temperature is set. Leave empty or clear for N/A (no text).
    </p>
    <label class="field">
      <span>Temperature (°C)</span>
      <input class="input" type="number" step="0.1"
        :value="data.temperature !== undefined && data.temperature !== null ? data.temperature : ''"
        @change="onTempChange($event)" />
    </label>
    <button type="button" class="btn-manage" style="margin-top:6px;width:100%"
      @click="set('temperature', undefined)">Clear temperature (N/A)</button>
  </section>
</template>

<script setup lang="ts">
import type { InspectorSetter } from "../inspectorTypes";

const props = defineProps<{
  data: Record<string, any>;
  set: InspectorSetter;
}>();

function onTempChange(ev: Event) {
  const raw = (ev.target as HTMLInputElement).value.trim();
  if (raw === "") {
    props.set("temperature", undefined);
    return;
  }
  const n = parseFloat(raw);
  props.set("temperature", Number.isNaN(n) ? undefined : n);
}
</script>
