<template>
  <section class="section">
    <h4 class="section-title">Bandpass Filter Settings</h4>
    <label class="field">
      <span>Status LED</span>
      <select class="input"
        :value="daStatusVal"
        @change="set('statusColor', ($event.target as HTMLSelectElement).value === 'on' ? '#27ae60' : '')">
        <option value="off">Hidden</option>
        <option value="on">Visible</option>
      </select>
    </label>
    <label v-if="daStatusVal === 'on'" class="field">
      <span>LED Color</span>
      <div class="color-row">
        <input type="color" class="color-picker"
          :value="data.statusColor || '#27ae60'"
          @input="set('statusColor', ($event.target as HTMLInputElement).value)" />
        <input class="input"
          :value="data.statusColor || ''"
          @change="set('statusColor', ($event.target as HTMLInputElement).value)"
          placeholder="#27ae60" />
      </div>
    </label>
    <label class="field">
      <span>Temperature Label</span>
      <select class="input"
        :value="bpfTempEnabled ? 'on' : 'off'"
        @change="onBpfTempToggle(($event.target as HTMLSelectElement).value)">
        <option value="off">Hidden</option>
        <option value="on">Visible</option>
      </select>
    </label>
    <label v-if="bpfTempEnabled" class="field">
      <span>Temperature (°C)</span>
      <input class="input" type="number" step="0.1"
        :value="data.temperature ?? 20"
        @change="set('temperature', parseFloat(($event.target as HTMLInputElement).value))" />
    </label>
    <label class="field">
      <span>Centre Frequency</span>
      <input class="input" type="text"
        :value="String(data.centerFreq ?? '')"
        @change="set('centerFreq', ($event.target as HTMLInputElement).value)"
        placeholder="e.g. 14.25 GHz" />
    </label>
    <label class="field">
      <span>Title Font Size ({{ data.titleFontSize ?? 'auto' }}{{ data.titleFontSize ? 'px' : '' }})</span>
      <div class="slider-row">
        <input class="slider" type="range" min="6" max="40" step="1"
          :value="data.titleFontSize ?? 14"
          @input="set('titleFontSize', Number(($event.target as HTMLInputElement).value))" />
        <span class="slider-val">{{ data.titleFontSize ?? 'auto' }}{{ data.titleFontSize ? 'px' : '' }}</span>
      </div>
    </label>
  </section>
</template>

<script setup lang="ts">
import { useBpfTempEnabled, useDaStatusVal } from "../composables/useInspectorDerived";
import type { InspectorSetter } from "../inspectorTypes";

const props = defineProps<{
  data: Record<string, any>;
  set: InspectorSetter;
}>();

const daStatusVal = useDaStatusVal(() => props.data);
const bpfTempEnabled = useBpfTempEnabled(() => props.data);

function onBpfTempToggle(val: string) {
  if (val === "on") {
    const t = props.data.temperature;
    const hadNum = t !== undefined && t !== null && typeof t === "number" && !Number.isNaN(t);
    props.set("temperature", hadNum ? t : 20.0);
  } else {
    props.set("temperature", null);
  }
}
</script>
