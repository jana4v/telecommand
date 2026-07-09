<template>
  <section class="section">
    <h4 class="section-title">Connector</h4>
    <label class="field">
      <span>Line Color</span>
      <div class="color-row">
        <input type="color" class="color-picker" :value="data.stroke || '#6b7280'"
          @input="set('stroke', ($event.target as HTMLInputElement).value)" />
        <input class="input" :value="data.stroke || '#6b7280'"
          @change="set('stroke', ($event.target as HTMLInputElement).value)" />
      </div>
    </label>
    <label class="field">
      <span>Line Width</span>
      <div class="slider-row">
        <input class="slider" type="range" min="1" max="10" step="0.5"
          :value="data.strokeWidth ?? 1.5"
          @input="set('strokeWidth', Number(($event.target as HTMLInputElement).value))" />
        <span class="slider-val">{{ Number(data.strokeWidth ?? 1.5).toFixed(1) }}px</span>
      </div>
    </label>
    <label class="field">
      <span>Opacity</span>
      <div class="slider-row">
        <input class="slider" type="range" min="0" max="1" step="0.05"
          :value="data.opacity ?? 1"
          @input="set('opacity', parseFloat(($event.target as HTMLInputElement).value))" />
        <span class="slider-val">{{ Number(data.opacity ?? 1).toFixed(2) }}</span>
      </div>
    </label>
    <label class="field">
      <span>Router</span>
      <select class="input" :value="data.router || 'manhattan'"
        @change="setEdgeRouter(($event.target as HTMLSelectElement).value)">
        <option value="manhattan">Manhattan (auto-route)</option>
        <option value="orth">Orthogonal</option>
        <option value="normal">Normal (straight)</option>
        <option value="er">Entity Relation</option>
      </select>
    </label>
    <label class="field">
      <span>Connector Style</span>
      <select class="input" :value="data.connector || 'rounded'"
        @change="setEdgeConnector(($event.target as HTMLSelectElement).value)">
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
            @change="set('flowActive', ($event.target as HTMLInputElement).checked)" />
          <span class="toggle-knob"></span>
        </label>
        <span class="toggle-label">{{ data.flowActive ? 'On' : 'Off' }}</span>
        <button v-if="data.flowActive" class="dir-btn"
          :class="{ active: (data.flowDirection ?? 1) >= 0 }"
          @click="set('flowDirection', 1)">→ Fwd</button>
        <button v-if="data.flowActive" class="dir-btn"
          :class="{ active: (data.flowDirection ?? 1) < 0 }"
          @click="set('flowDirection', -1)">← Rev</button>
      </div>
    </div>
    <label class="field">
      <span>Start arrow</span>
      <select class="input" :value="data.sourceMarker ?? 'none'"
        @change="set('sourceMarker', ($event.target as HTMLSelectElement).value)">
        <option v-for="opt in EDGE_MARKER_OPTIONS" :key="'sm-'+opt.value" :value="opt.value">{{ opt.label }}</option>
      </select>
    </label>
    <label class="field">
      <span>End arrow</span>
      <select class="input" :value="data.targetMarker ?? 'classic'"
        @change="set('targetMarker', ($event.target as HTMLSelectElement).value)">
        <option v-for="opt in EDGE_MARKER_OPTIONS" :key="'tm-'+opt.value" :value="opt.value">{{ opt.label }}</option>
      </select>
    </label>
    <label class="field">
      <span>Label</span>
      <input class="input" type="text" :value="data.labelText ?? ''" placeholder="Optional text on the line"
        @change="set('labelText', ($event.target as HTMLInputElement).value)" />
    </label>
    <p class="field-hint edge-bind-hint">
      All properties above can be driven by telemetry via <strong>Telemetry Bindings</strong>:
      <strong>line color</strong> (stroke), <strong>line width</strong> (strokeWidth),
      <strong>opacity</strong>, <strong>flow animation</strong> (flowActive),
      <strong>flow direction</strong> (flowDirection&nbsp;1&nbsp;/&nbsp;−1),
      <strong>start/end arrows</strong> (sourceMarker, targetMarker),
      <strong>label text</strong> (labelText), <strong>visible</strong>.
    </p>
  </section>
</template>

<script setup lang="ts">
import { EDGE_MARKER_OPTIONS } from "../../../graph/edgeVisuals";
import type { InspectorSetter } from "../inspectorTypes";

defineProps<{
  data: Record<string, any>;
  set: InspectorSetter;
  setEdgeRouter: (name: string) => void;
  setEdgeConnector: (name: string) => void;
}>();
</script>
