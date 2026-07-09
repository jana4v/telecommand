<template>
  <div class="inspector-body">
    <section class="section">
      <h4 class="section-title">{{ edgeCount }} Edges Selected</h4>
      <p class="field-hint edge-bind-hint" style="margin-top:-4px;margin-bottom:8px">
        Values shown are from the first selected edge. Edits apply to <strong>all</strong> selected edges.
      </p>
      <label class="field">
        <span>Line Color</span>
        <div class="color-row">
          <input type="color" class="color-picker" :value="data.stroke || '#6b7280'"
            @input="setAll('stroke', ($event.target as HTMLInputElement).value)" />
          <input class="input" :value="data.stroke || '#6b7280'"
            @change="setAll('stroke', ($event.target as HTMLInputElement).value)" />
        </div>
      </label>
      <label class="field">
        <span>Line Width</span>
        <div class="slider-row">
          <input class="slider" type="range" min="1" max="10" step="0.5"
            :value="data.strokeWidth ?? 1.5"
            @input="setAll('strokeWidth', Number(($event.target as HTMLInputElement).value))" />
          <span class="slider-val">{{ Number(data.strokeWidth ?? 1.5).toFixed(1) }}px</span>
        </div>
      </label>
      <label class="field">
        <span>Opacity</span>
        <div class="slider-row">
          <input class="slider" type="range" min="0" max="1" step="0.05"
            :value="data.opacity ?? 1"
            @input="setAll('opacity', parseFloat(($event.target as HTMLInputElement).value))" />
          <span class="slider-val">{{ Number(data.opacity ?? 1).toFixed(2) }}</span>
        </div>
      </label>
      <label class="field">
        <span>Router</span>
        <select class="input" :value="data.router || 'manhattan'"
          @change="setAllEdgeRouter(($event.target as HTMLSelectElement).value)">
          <option value="manhattan">Manhattan (auto-route)</option>
          <option value="orth">Orthogonal</option>
          <option value="normal">Normal (straight)</option>
          <option value="er">Entity Relation</option>
        </select>
      </label>
      <label class="field">
        <span>Connector Style</span>
        <select class="input" :value="data.connector || 'rounded'"
          @change="setAllEdgeConnector(($event.target as HTMLSelectElement).value)">
          <option value="rounded">Rounded corners</option>
          <option value="smooth">Smooth (Bézier)</option>
          <option value="normal">Straight segments</option>
          <option value="jumpover">Jump-over crossings</option>
        </select>
      </label>
      <div class="field">
        <span>Flow Animation</span>
        <div class="toggle-row">
          <label class="toggle-switch">
            <input type="checkbox" :checked="data.flowActive ?? false"
              @change="setAll('flowActive', ($event.target as HTMLInputElement).checked)" />
            <span class="toggle-knob"></span>
          </label>
          <span class="toggle-label">{{ data.flowActive ? 'On' : 'Off' }}</span>
          <button v-if="data.flowActive" class="dir-btn"
            :class="{ active: (data.flowDirection ?? 1) >= 0 }"
            @click="setAll('flowDirection', 1)">→ Fwd</button>
          <button v-if="data.flowActive" class="dir-btn"
            :class="{ active: (data.flowDirection ?? 1) < 0 }"
            @click="setAll('flowDirection', -1)">← Rev</button>
        </div>
      </div>
      <label class="field">
        <span>Start arrow</span>
        <select class="input" :value="data.sourceMarker ?? 'none'"
          @change="setAll('sourceMarker', ($event.target as HTMLSelectElement).value)">
          <option v-for="opt in EDGE_MARKER_OPTIONS" :key="'me-sm-'+opt.value" :value="opt.value">{{ opt.label }}</option>
        </select>
      </label>
      <label class="field">
        <span>End arrow</span>
        <select class="input" :value="data.targetMarker ?? 'classic'"
          @change="setAll('targetMarker', ($event.target as HTMLSelectElement).value)">
          <option v-for="opt in EDGE_MARKER_OPTIONS" :key="'me-tm-'+opt.value" :value="opt.value">{{ opt.label }}</option>
        </select>
      </label>
      <label class="field">
        <span>Label</span>
        <input class="input" type="text" :value="data.labelText ?? ''" placeholder="Optional text on each line"
          @change="setAll('labelText', ($event.target as HTMLInputElement).value)" />
      </label>
      <p class="field-hint edge-bind-hint">Bindable via Telemetry Bindings below: <strong>stroke</strong>, <strong>strokeWidth</strong>, <strong>opacity</strong>, <strong>flowActive</strong>, <strong>flowDirection</strong>, <strong>sourceMarker</strong>, <strong>targetMarker</strong>, <strong>labelText</strong>, <strong>visible</strong>.</p>
    </section>

    <InspectorTelemetryBindings
      :bindings="data.telemetryBindings ?? []"
      @remove="(i) => emit('removeBinding', i)"
      @manage="emit('openBindingEditor')"
    >
      <template #hint>
        <p class="field-hint edge-bind-hint" style="margin:-4px 0 8px">
          One binding set is copied to <strong>every</strong> selected edge (same rules, same topics).
        </p>
      </template>
    </InspectorTelemetryBindings>
  </div>
</template>

<script setup lang="ts">
import { EDGE_MARKER_OPTIONS } from "../../graph/edgeVisuals";
import type { InspectorBulkSetter } from "./inspectorTypes";
import InspectorTelemetryBindings from "./InspectorTelemetryBindings.vue";

defineProps<{
  edgeCount: number;
  data: Record<string, any>;
  setAll: InspectorBulkSetter;
  setAllEdgeRouter: (name: string) => void;
  setAllEdgeConnector: (name: string) => void;
}>();

const emit = defineEmits<{
  removeBinding: [index: number];
  openBindingEditor: [];
}>();
</script>

<style scoped>
.inspector-body { flex: 1; overflow-y: auto; padding-bottom: 1rem; }
.inspector-body::-webkit-scrollbar { width: 4px; }
.inspector-body::-webkit-scrollbar-thumb { background: #30363d; border-radius: 2px; }

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
.field-hint {
  font-size: 10px; color: #8b949e; line-height: 1.35; margin: 4px 0 0;
}
.input {
  background: #0d1117; border: 1px solid #30363d; border-radius: 4px;
  color: #c9d1d9; font-size: 12px; padding: 4px 7px; width: 100%; outline: none;
}
.input:focus { border-color: #4a9eff; }
.color-row { display: flex; gap: 5px; align-items: center; }
.color-picker { width: 28px; height: 26px; padding: 0; border: 1px solid #30363d; border-radius: 4px; cursor: pointer; flex-shrink: 0; }
.slider-row { display: flex; align-items: center; gap: 6px; }
.slider { flex: 1; accent-color: #4a9eff; }
.slider-val { font-size: 11px; color: #8b949e; min-width: 36px; text-align: right; }
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
.dir-btn {
  padding: 4px 6px; background: #0d1117; color: #8b949e;
  border: 1px solid #30363d; border-radius: 4px; font-size: 10px; cursor: pointer;
}
.dir-btn.active { background: rgba(74,158,255,0.15); color: #4a9eff; border-color: rgba(74,158,255,0.4); }
</style>
