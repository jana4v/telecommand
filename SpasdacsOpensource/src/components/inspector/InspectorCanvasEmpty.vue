<template>
  <div class="inspector-empty-state">
    <section class="section">
      <h4 class="section-title">Canvas</h4>

      <label class="field">
        <span>Background Color</span>
        <div class="color-row">
          <input type="color" class="color-picker" :value="canvasBg"
            @input="emit('canvas-bg-change', ($event.target as HTMLInputElement).value)" />
          <input class="input" :value="canvasBg"
            @change="emit('canvas-bg-change', ($event.target as HTMLInputElement).value)" />
        </div>
      </label>

      <label class="field">
        <span>Connector Color</span>
        <div class="color-row">
          <input type="color" class="color-picker" :value="edgeColor"
            @input="emit('edge-color-change', ($event.target as HTMLInputElement).value)" />
          <input class="input" :value="edgeColor"
            @change="emit('edge-color-change', ($event.target as HTMLInputElement).value)" />
        </div>
      </label>

      <label class="field">
        <span>Connector Width</span>
        <div class="width-row">
          <input type="range" class="width-slider" min="0.5" max="8" step="0.5"
            :value="edgeWidth"
            @input="emit('edge-width-change', Number(($event.target as HTMLInputElement).value))" />
          <input type="number" class="input input-narrow" min="0.5" max="20" step="0.5"
            :value="edgeWidth"
            @change="emit('edge-width-change', Number(($event.target as HTMLInputElement).value))" />
        </div>
      </label>

      <label class="field">
        <span>Port Size <small style="opacity:0.55">(0.10 ≈ 6 px · 0.20 ≈ 12 px)</small></span>
        <div class="width-row">
          <input type="range" class="width-slider" min="0.01" max="0.50" step="0.01"
            :value="portSizeFactor"
            @input="emit('port-size-factor-change', Number(($event.target as HTMLInputElement).value))" />
          <input type="number" class="input input-narrow" min="0.01" max="1.00" step="0.01"
            :value="portSizeFactor"
            @change="emit('port-size-factor-change', Number(($event.target as HTMLInputElement).value))" />
        </div>
        <span class="field-hint">Connector port circle size. Applies instantly to all elements. Ports stay the same size when you resize an element.</span>
      </label>
    </section>
    <div class="inspector-hint">Click an element to inspect its properties.</div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  canvasBg?: string;
  edgeColor?: string;
  edgeWidth?: number;
  portSizeFactor?: number;
}>();
const emit = defineEmits<{
  "canvas-bg-change": [color: string];
  "edge-color-change": [color: string];
  "edge-width-change": [width: number];
  "port-size-factor-change": [factor: number];
}>();
</script>

<style scoped>
.inspector-empty-state { flex: 1; overflow-y: auto; }
.inspector-hint {
  padding: 10px 12px; font-size: 11px; color: #4a5568; font-style: italic;
}

.section { padding: 9px 12px; border-bottom: 1px solid #21262d; }
.section-title {
  font-size: 10px; font-weight: 700; color: #8b949e;
  text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 7px;
}
.field {
  display: flex; flex-direction: column; gap: 2px; margin-bottom: 8px;
}
.field:last-child { margin-bottom: 0; }
.field > span {
  font-size: 10px; color: #8b949e; text-transform: uppercase; letter-spacing: 0.04em;
}
.input {
  background: #0d1117; border: 1px solid #30363d; border-radius: 4px;
  color: #c9d1d9; font-size: 12px; padding: 4px 7px; width: 100%; outline: none;
  box-sizing: border-box;
}
.input:focus { border-color: #4a9eff; }
.input-narrow { width: 54px; flex-shrink: 0; text-align: center; }
.color-row { display: flex; gap: 5px; align-items: center; }
.color-picker {
  width: 28px; height: 26px; padding: 0; border: 1px solid #30363d;
  border-radius: 4px; cursor: pointer; flex-shrink: 0;
}
.width-row { display: flex; gap: 6px; align-items: center; }
.width-slider {
  flex: 1; accent-color: #4a9eff; cursor: pointer; height: 4px;
}
.field-hint {
  font-size: 10px; color: #4a5568; line-height: 1.4; margin-top: 2px;
}
</style>
