<template>
  <section class="section">
    <h4 class="section-title">TWTA Settings</h4>
    <label class="field">
      <span>TWTA Name</span>
      <input class="input" type="text"
        :value="data.twtaName ?? 'TWTA'"
        @change="set('twtaName', ($event.target as HTMLInputElement).value)" />
    </label>
    <label class="field">
      <span>Temperature (°C)</span>
      <input class="input" type="number" step="0.1"
        :value="data.temperature ?? ''"
        @change="set('temperature', parseFloat(($event.target as HTMLInputElement).value))" />
    </label>
    <label class="field">
      <span>Anode Voltage (V) <small style="opacity:0.6">≤2V = fully ON</small></span>
      <input class="input" type="number" step="0.1"
        :value="data.anadoVoltage ?? 5"
        @change="set('anadoVoltage', parseFloat(($event.target as HTMLInputElement).value))" />
    </label>
    <label class="field">
      <span>Title Font Size ({{ data.titleFontSize ?? 18 }}px)</span>
      <div class="slider-row">
        <input class="slider" type="range" min="8" max="80" step="1"
          :value="data.titleFontSize ?? 18"
          @input="set('titleFontSize', Number(($event.target as HTMLInputElement).value))" />
        <span class="slider-val">{{ data.titleFontSize ?? 18 }}px</span>
      </div>
    </label>
    <label class="field">
      <span>Temp Font Size ({{ data.tempFontSize ?? 18 }}px)</span>
      <div class="slider-row">
        <input class="slider" type="range" min="8" max="80" step="1"
          :value="data.tempFontSize ?? 18"
          @input="set('tempFontSize', Number(($event.target as HTMLInputElement).value))" />
        <span class="slider-val">{{ data.tempFontSize ?? 18 }}px</span>
      </div>
    </label>
    <label class="field">
      <span>Status Color</span>
      <div class="color-row">
        <input type="color" class="color-picker" :value="data.statusColor || '#22223a'"
          @input="set('statusColor', ($event.target as HTMLInputElement).value)" />
        <input class="input" :value="data.statusColor || ''"
          @change="set('statusColor', ($event.target as HTMLInputElement).value)"
          placeholder="gradient:on / gradient:off / #color" />
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
