<template>
  <section class="section">
    <h4 class="section-title">SSPA Settings</h4>
    <label class="field">
      <span>Status</span>
      <select class="input"
        :value="daStatusVal"
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
  </section>
</template>

<script setup lang="ts">
import { useDaStatusVal } from "../composables/useInspectorDerived";
import type { InspectorSetter } from "../inspectorTypes";

const props = defineProps<{
  data: Record<string, any>;
  set: InspectorSetter;
}>();

const daStatusVal = useDaStatusVal(() => props.data);
</script>
