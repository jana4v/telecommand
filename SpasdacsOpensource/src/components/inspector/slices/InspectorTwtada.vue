<template>
  <section class="section">
    <h4 class="section-title">TWTA + Driver Amp Settings</h4>
    <label class="field">
      <span>DA Name</span>
      <input class="input" type="text"
        :value="data.daName ?? 'DA'"
        @change="set('daName', ($event.target as HTMLInputElement).value)" />
    </label>
    <label class="field">
      <span>TWTA Name</span>
      <input class="input" type="text"
        :value="data.twtaName ?? 'TWTA'"
        @change="set('twtaName', ($event.target as HTMLInputElement).value)" />
    </label>
    <label class="field">
      <span>Status Color <small style="opacity:0.6">#27ae60=ON · #6aaa6a=warm · gradient:off=OFF</small></span>
      <div class="color-row">
        <input type="color" class="color-picker" :value="data.statusColor || '#22223a'"
          @input="set('statusColor', ($event.target as HTMLInputElement).value)" />
        <input class="input" :value="data.statusColor || ''"
          @change="set('statusColor', ($event.target as HTMLInputElement).value)"
          placeholder="gradient:off / #27ae60 / #6aaa6a" />
      </div>
    </label>
    <label class="field">
      <span>DA Mode</span>
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
      <input class="input" type="number" step="0.1"
        :value="data.temperature ?? ''"
        @change="set('temperature', parseFloat(($event.target as HTMLInputElement).value))" />
    </label>
    <label class="field">
      <span>Title Font Size ({{ data.titleFontSize ?? 'auto' }}{{ data.titleFontSize ? 'px' : '' }})</span>
      <div class="slider-row">
        <input class="slider" type="range" min="6" max="80" step="1"
          :value="data.titleFontSize ?? 18"
          @input="set('titleFontSize', Number(($event.target as HTMLInputElement).value))" />
        <span class="slider-val">{{ data.titleFontSize ?? 'auto' }}{{ data.titleFontSize ? 'px' : '' }}</span>
      </div>
    </label>
  </section>
</template>

<script setup lang="ts">
import { DA_BOA_OPTIONS } from "../constants";
import type { InspectorSetter } from "../inspectorTypes";

defineProps<{
  data: Record<string, any>;
  set: InspectorSetter;
}>();
</script>
