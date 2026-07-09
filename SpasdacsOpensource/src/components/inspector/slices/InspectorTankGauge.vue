<template>
  <section class="section">
    <h4 class="section-title">{{ data.category }} Settings</h4>
    <div class="field-row">
      <label class="field half">
        <span>Min</span>
        <input class="input" type="number" :value="data.gaugeMin ?? 0"
          @change="set('gaugeMin', Number(($event.target as HTMLInputElement).value))" />
      </label>
      <label class="field half">
        <span>Max</span>
        <input class="input" type="number" :value="data.gaugeMax ?? 100"
          @change="set('gaugeMax', Number(($event.target as HTMLInputElement).value))" />
      </label>
    </div>
    <label class="field">
      <span>Units <small style="opacity:0.6">(e.g. %, bar, psi, °C)</small></span>
      <input class="input" type="text" :value="data.units ?? '%'"
        @change="set('units', ($event.target as HTMLInputElement).value.trim())" />
    </label>
    <label class="field">
      <span>Value ({{ data.gaugeMin ?? 0 }}–{{ data.gaugeMax ?? 100 }})</span>
      <div class="slider-row">
        <input class="slider" type="range"
          :min="data.gaugeMin ?? 0" :max="data.gaugeMax ?? 100"
          :step="((data.gaugeMax ?? 100) - (data.gaugeMin ?? 0)) / 100"
          :value="data.gaugeValue ?? data.level ?? 0"
          @input="onValueInput($event)" />
        <span class="slider-val">{{ (data.gaugeValue ?? data.level ?? 0).toFixed(1) }}</span>
      </div>
    </label>
  </section>
</template>

<script setup lang="ts">
import type { InspectorSetter } from "../inspectorTypes";

const props = defineProps<{
  data: Record<string, any>;
  set: InspectorSetter;
}>();

function onValueInput(e: Event) {
  const v = Number((e.target as HTMLInputElement).value);
  props.set("gaugeValue", v);
  props.set("level", v);
}
</script>
