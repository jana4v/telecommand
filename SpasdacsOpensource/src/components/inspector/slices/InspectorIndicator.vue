<template>
  <section class="section">
    <h4 class="section-title">Indicator Settings</h4>

    <label class="field">
      <span>Label</span>
      <input class="input" type="text" placeholder="e.g. VOLTAGE"
        :value="data.name ?? ''"
        @change="set('name', ($event.target as HTMLInputElement).value)" />
    </label>

    <label class="field">
      <span>Units</span>
      <input class="input" type="text" placeholder="e.g. V, °C, kg, mA"
        :value="data.indicatorUnits ?? ''"
        @change="set('indicatorUnits', ($event.target as HTMLInputElement).value)" />
    </label>

    <label class="field">
      <span>Format <small style="opacity:0.6">(digits)</small></span>
      <div class="digits-row">
        <input class="input dig" type="number" min="1" max="8" step="1"
          title="Digits before decimal"
          :value="data.indicatorIntDigits ?? 3"
          @change="set('indicatorIntDigits', clamp(($event.target as HTMLInputElement).value, 1, 8))" />
        <span class="sep">.</span>
        <input class="input dig" type="number" min="0" max="6" step="1"
          title="Digits after decimal"
          :value="data.indicatorDecDigits ?? 3"
          @change="set('indicatorDecDigits', clamp(($event.target as HTMLInputElement).value, 0, 6))" />
        <span class="preview">→ {{ preview }}</span>
      </div>
    </label>

    <p class="hint">
      <strong>Colour conditions</strong> are configured in the Telemetry
      Binding Editor → <em>Simple</em> tab.
    </p>
  </section>
</template>

<script setup lang="ts">
import { computed } from "vue";
import type { InspectorSetter } from "../inspectorTypes";

const props = defineProps<{
  data: Record<string, any>;
  set: InspectorSetter;
}>();

function clamp(val: string, min: number, max: number): number {
  return Math.max(min, Math.min(max, Number(val)));
}

const preview = computed(() => {
  const int = Math.max(1, Math.min(8, Number(props.data.indicatorIntDigits ?? 3)));
  const dec = Math.max(0, Math.min(6, Number(props.data.indicatorDecDigits ?? 3)));
  const intStr = "0".repeat(int - 1) + "1";
  const decStr = dec > 0 ? "." + "0".repeat(dec - 1) + "5" : "";
  return `${intStr}${decStr}`;
});
</script>

<style scoped>
.digits-row {
  display: flex; align-items: center; gap: 4px;
}
.dig { width: 52px; text-align: center; }
.sep { font-size: 16px; font-weight: 700; color: #8aa0b8; line-height: 1; }
.preview { font-size: 11px; color: #6a9080; font-family: monospace; margin-left: 6px; }
.hint { font-size: 11px; color: #7a8a9a; line-height: 1.45; margin: 6px 0 0 0; }
.hint code { background: #0d1117; padding: 1px 4px; border-radius: 2px; color: #a8c8e8; }
</style>
