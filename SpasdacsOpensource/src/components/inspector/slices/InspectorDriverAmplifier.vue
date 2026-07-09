<template>
  <section class="section">
    <h4 class="section-title">Driver Amplifier Settings</h4>
    <label class="field">
      <span>Status</span>
      <select class="input"
        :value="daStatusVal"
        @change="set('statusColor', ($event.target as HTMLSelectElement).value === 'on' ? '#22c55e' : '')">
        <option value="off">OFF</option>
        <option value="on">ON</option>
      </select>
    </label>
    <label class="field">
      <span>Mode</span>
      <select class="input"
        :value="data.statusText ?? 'FGM'"
        @change="set('statusText', ($event.target as HTMLSelectElement).value)">
        <option value="FGM">FGM — Fixed Gain Mode</option>
        <option value="ALC">ALC — Automatic Level Control</option>
      </select>
    </label>
    <label class="field">
      <span>BOA (dB)</span>
      <select class="input"
        :value="(+(data.gaugeValue ?? 1.20)).toFixed(2)"
        @change="set('gaugeValue', parseFloat(($event.target as HTMLSelectElement).value))">
        <option v-for="v in DA_BOA_OPTIONS" :key="v" :value="v.toFixed(2)">
          {{ v >= 0 ? '+' : '' }}{{ v.toFixed(2) }} dB
        </option>
      </select>
    </label>
    <label class="field">
      <span>Temperature (°C)</span>
      <select class="input"
        :value="(+(data.temperature ?? -3.5)).toFixed(1)"
        @change="set('temperature', parseFloat(($event.target as HTMLSelectElement).value))">
        <option v-for="v in DA_TEMP_OPTIONS" :key="v" :value="v.toFixed(1)">
          {{ v.toFixed(1) }} °C
        </option>
      </select>
    </label>
    <label class="field">
      <span>Title Font Size ({{ data.titleFontSize ?? 'auto' }}{{ data.titleFontSize ? 'px' : '' }})</span>
      <div class="slider-row">
        <input class="slider" type="range" min="6" max="40" step="1"
          :value="data.titleFontSize ?? 12"
          @input="set('titleFontSize', Number(($event.target as HTMLInputElement).value))" />
        <span class="slider-val">{{ data.titleFontSize ?? 'auto' }}{{ data.titleFontSize ? 'px' : '' }}</span>
      </div>
    </label>
  </section>
</template>

<script setup lang="ts">
import { DA_BOA_OPTIONS, DA_TEMP_OPTIONS } from "../constants";
import { useDaStatusVal } from "../composables/useInspectorDerived";
import type { InspectorSetter } from "../inspectorTypes";

const props = defineProps<{
  data: Record<string, any>;
  set: InspectorSetter;
}>();

const daStatusVal = useDaStatusVal(() => props.data);
</script>
