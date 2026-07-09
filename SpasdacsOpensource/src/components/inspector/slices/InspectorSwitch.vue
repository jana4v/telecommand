<template>
  <section class="section">
    <h4 class="section-title">Switch Settings</h4>
    <label class="field">
      <span>Position</span>
      <select class="input" :value="data.position ?? 0"
        @change="set('position', Number(($event.target as HTMLSelectElement).value))">
        <option value="0">0 (A / Straight)</option>
        <option value="1">1 (B / Cross)</option>
        <option v-if="data.category === 'Switch3P'" value="2">2 (C)</option>
      </select>
    </label>
  </section>
</template>

<script setup lang="ts">
import type { InspectorSetter } from "../inspectorTypes";

defineProps<{
  data: Record<string, any>;
  set: InspectorSetter;
}>();
</script>
