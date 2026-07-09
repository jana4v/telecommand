<template>
  <section class="section">
    <h4 class="section-title">State</h4>
    <label class="field">
      <span>Status Color</span>
      <div class="color-row">
        <input type="color" class="color-picker" :value="data.statusColor || '#000000'"
          @input="set('statusColor', ($event.target as HTMLInputElement).value)" />
        <input class="input" :value="data.statusColor || ''"
          @change="set('statusColor', ($event.target as HTMLInputElement).value)" placeholder="auto / #hex" />
      </div>
    </label>
    <label class="field">
      <span>Status Text</span>
      <input class="input" :value="data.statusText || ''"
        @change="set('statusText', ($event.target as HTMLInputElement).value)" placeholder="shown as label" />
    </label>
    <div class="field">
      <span>Invalid (red overlay)</span>
      <div class="toggle-row">
        <label class="toggle-switch">
          <input type="checkbox" :checked="data.isInvalid ?? false"
            @change="set('isInvalid', ($event.target as HTMLInputElement).checked)" />
          <span class="toggle-knob"></span>
        </label>
        <span class="toggle-label">{{ data.isInvalid ? 'Yes' : 'No' }}</span>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import type { InspectorSetter } from "./inspectorTypes";

defineProps<{
  data: Record<string, any>;
  set: InspectorSetter;
}>();
</script>

<style scoped>
.section { padding: 9px 12px; border-bottom: 1px solid #21262d; }
.section-title {
  font-size: 10px; font-weight: 700; color: #8b949e;
  text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 7px;
}
.field {
  display: flex; flex-direction: column; gap: 2px; margin-bottom: 6px;
}
.field > span {
  font-size: 10px; color: #8b949e; text-transform: uppercase; letter-spacing: 0.04em;
}
.input {
  background: #0d1117; border: 1px solid #30363d; border-radius: 4px;
  color: #c9d1d9; font-size: 12px; padding: 4px 7px; width: 100%; outline: none;
}
.input:focus { border-color: #4a9eff; }
.color-row { display: flex; gap: 5px; align-items: center; }
.color-picker { width: 28px; height: 26px; padding: 0; border: 1px solid #30363d; border-radius: 4px; cursor: pointer; flex-shrink: 0; }
.toggle-row { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
.toggle-switch { position: relative; display: inline-block; width: 32px; height: 18px; flex-shrink: 0; }
.toggle-switch input { opacity: 0; width: 0; height: 0; }
.toggle-knob {
  position: absolute; inset: 0; background: #30363d; border-radius: 10px; cursor: pointer;
  transition: background 0.2s;
}
.toggle-knob::before {
  content: ''; position: absolute; width: 12px; height: 12px;
  left: 3px; top: 3px; background: #fff; border-radius: 50%; transition: transform 0.2s;
}
.toggle-switch input:checked + .toggle-knob { background: #27ae60; }
.toggle-switch input:checked + .toggle-knob::before { transform: translateX(14px); }
.toggle-label { font-size: 11px; color: #8b949e; }
</style>
