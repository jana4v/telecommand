<template>
  <section class="section">
    <h4 class="section-title">FPGA Settings</h4>
    <label class="field">
      <span>Status</span>
      <select class="input"
        :value="data.statusColor === '#1a1a2e' ? 'off' : 'on'"
        @change="set('statusColor', ($event.target as HTMLSelectElement).value === 'on' ? '#27ae60' : '#1a1a2e')">
        <option value="on">ON</option>
        <option value="off">OFF</option>
      </select>
    </label>
    <div class="field">
      <span>Lock (green outline; unlocked = orange)</span>
      <div class="toggle-row">
        <label class="toggle-switch">
          <input type="checkbox" :checked="data.isLocked === true"
            @change="set('isLocked', ($event.target as HTMLInputElement).checked)" />
          <span class="toggle-knob"></span>
        </label>
        <span class="toggle-label">{{ data.isLocked ? 'Locked' : 'Unlocked' }}</span>
      </div>
    </div>
    <label class="field">
      <span>Temperature (°C) <small style="opacity:0.6">leave blank to hide</small></span>
      <input class="input" type="number" step="0.1"
        :value="data.temperature ?? ''"
        @change="onTemperatureChange($event)" />
    </label>
    <label class="field">
      <span>Title Font Size ({{ data.titleFontSize ?? 'auto' }})</span>
      <div class="slider-row">
        <input class="slider" type="range" min="8" max="80" step="1"
          :value="data.titleFontSize ?? 26"
          @input="set('titleFontSize', Number(($event.target as HTMLInputElement).value))" />
        <span class="slider-val">{{ data.titleFontSize ?? 'auto' }}</span>
      </div>
    </label>
    <label class="field">
      <span>Temp Font Size ({{ data.tempFontSize ?? 'auto' }})</span>
      <div class="slider-row">
        <input class="slider" type="range" min="6" max="40" step="1"
          :value="data.tempFontSize ?? 26"
          @input="set('tempFontSize', Number(($event.target as HTMLInputElement).value))" />
        <span class="slider-val">{{ data.tempFontSize ?? 'auto' }}</span>
      </div>
    </label>
    <label class="field">
      <span>Inner border (chip outline)</span>
      <div class="color-row">
        <input type="color" class="color-picker"
          :value="innerBorderColorPicker"
          @input="set('innerBorderColor', ($event.target as HTMLInputElement).value)" />
        <input class="input" :value="data.innerBorderColor ?? ''"
          placeholder="leave blank to match status color"
          @change="onInnerBorderInput(($event.target as HTMLInputElement).value)" />
      </div>
    </label>
  </section>
</template>

<script setup lang="ts">
import { useInnerBorderColorPicker } from "../composables/useInspectorDerived";
import type { InspectorSetter } from "../inspectorTypes";

const props = defineProps<{
  data: Record<string, any>;
  set: InspectorSetter;
}>();

const innerBorderColorPicker = useInnerBorderColorPicker(() => props.data);

function onTemperatureChange(ev: Event) {
  const raw = (ev.target as HTMLInputElement).value.trim();
  props.set("temperature", raw === "" ? undefined : parseFloat(raw));
}

function onInnerBorderInput(v: string) {
  const t = v.trim();
  props.set("innerBorderColor", t === "" ? "" : t);
}
</script>
