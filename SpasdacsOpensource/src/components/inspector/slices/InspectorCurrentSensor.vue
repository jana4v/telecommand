<template>
  <section class="section">
    <h4 class="section-title">Current Sensor Settings</h4>

    <label class="field">
      <span>Units</span>
      <div class="seg">
        <button type="button"
          class="seg-btn"
          :class="{ active: units === 'A' }"
          @click="set('currentUnits', 'A')">A</button>
        <button type="button"
          class="seg-btn"
          :class="{ active: units === 'mA' }"
          @click="set('currentUnits', 'mA')">mA</button>
      </div>
    </label>

    <label class="field">
      <span>Default Value <small style="opacity:0.6">({{ units }})</small></span>
      <input class="input" type="number" step="any"
        :value="data.currentValue ?? 0"
        @change="set('currentValue', Number(($event.target as HTMLInputElement).value))" />
    </label>

    <p class="hint">
      <strong>Colour conditions</strong> are configured in the Telemetry
      Binding Editor → <em>Simple</em> tab, where you can add any number of
      rules like <code>if current &gt; X → colour</code>.
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

const units = computed<"A" | "mA">(() => (props.data.currentUnits as "A" | "mA") || "A");
</script>

<style scoped>
.seg { display: inline-flex; gap: 2px; background: #0d1117; border: 1px solid #2a2f3a; border-radius: 4px; padding: 2px; }
.seg-btn {
  background: transparent; color: #8aa0b8; border: 0;
  padding: 4px 14px; font-family: monospace; font-weight: 700;
  cursor: pointer; border-radius: 3px; transition: background 0.12s;
}
.seg-btn:hover  { background: #1a2030; color: #c8d8e8; }
.seg-btn.active { background: #27ae60; color: #fff; }
.hint  { font-size: 11px; color: #7a8a9a; line-height: 1.45; margin: 6px 0 0 0; }
.hint code { background: #0d1117; padding: 1px 4px; border-radius: 2px; color: #a8c8e8; }
</style>
