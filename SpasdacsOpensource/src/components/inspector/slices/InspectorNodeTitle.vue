<!--
  InspectorNodeTitle — universal title/label controls shown for every node.
  Covers: title position (3×3 grid), font size (6–100 px), font colour.
-->
<template>
  <section class="section">
    <h4 class="section-title">Title / Label</h4>

    <!-- Position picker -->
    <div class="field">
      <span>Position</span>
      <TitlePositionPicker
        :model-value="data.titlePosition"
        :default-pos="(defaultPos as any)"
        @update:model-value="set('titlePosition', $event)"
      />
    </div>

    <!-- Font size -->
    <label class="field">
      <span>Font Size ({{ data.titleFontSize ?? 'auto' }}{{ data.titleFontSize ? 'px' : '' }})</span>
      <div class="slider-row">
        <input class="slider" type="range" min="6" max="100" step="1"
          :value="data.titleFontSize ?? 12"
          @input="set('titleFontSize', Number(($event.target as HTMLInputElement).value))" />
        <span class="slider-val">{{ data.titleFontSize ?? 'auto' }}{{ data.titleFontSize ? 'px' : '' }}</span>
      </div>
    </label>

    <!-- Font colour -->
    <label class="field">
      <span>Font Color</span>
      <div class="color-row">
        <input type="color" class="color-picker"
          :value="data.titleFontColor || '#94a3b8'"
          @input="set('titleFontColor', ($event.target as HTMLInputElement).value)" />
        <input class="input"
          :value="data.titleFontColor || ''"
          @change="set('titleFontColor', ($event.target as HTMLInputElement).value)"
          placeholder="#94a3b8 (default)" />
        <button v-if="data.titleFontColor" class="btn-reset" title="Reset to default"
          @click="set('titleFontColor', '')">✕</button>
      </div>
    </label>
  </section>
</template>

<script setup lang="ts">
import { computed } from "vue";
import type { InspectorSetter } from "../inspectorTypes";
import TitlePositionPicker from "../TitlePositionPicker.vue";

const props = defineProps<{
  data: Record<string, any>;
  set: InspectorSetter;
  /** Which position slot to highlight when none is saved (per-element default). */
  defaultPos?: string;
}>();

// Infer a sensible default from existing data so the picker's active slot
// matches the current rendering for elements without a saved titlePosition.
const defaultPos = computed(() =>
  props.defaultPos ?? (props.data.titlePosition as string | undefined) ?? "top-center"
);
</script>

<style scoped>
.color-row { display: flex; align-items: center; gap: 6px; }
.color-picker { width: 28px; height: 24px; padding: 0; border: 1px solid #30363d; border-radius: 4px; cursor: pointer; background: none; }
.btn-reset {
  padding: 2px 6px; background: #161b22; border: 1px solid #30363d;
  border-radius: 4px; color: #8b949e; font-size: 10px; cursor: pointer;
}
.btn-reset:hover { color: #e74c3c; border-color: #e74c3c; }
</style>
