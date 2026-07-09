<template>
  <section class="section">
    <h4 class="section-title">Wheel Settings</h4>
    <label class="field">
      <span>Speed (RPM)</span>
      <div class="slider-row">
        <input class="slider" type="range" min="0" max="6000" step="100"
          :value="data.wheelSpeed ?? 0"
          @input="set('wheelSpeed', Number(($event.target as HTMLInputElement).value))" />
        <span class="slider-val">{{ data.wheelSpeed ?? 0 }}</span>
      </div>
    </label>
    <div class="field">
      <span>Direction</span>
      <div class="dir-btn-group">
        <button class="dir-btn" :class="{ active: (data.wheelDirection ?? 1) > 0 }" @click="set('wheelDirection', 1)">↻ CW</button>
        <button class="dir-btn" :class="{ active: (data.wheelDirection ?? 1) < 0 }" @click="set('wheelDirection', -1)">↺ CCW</button>
      </div>
    </div>
    <label class="field">
      <span>Title Font Size ({{ data.titleFontSize ?? 'auto' }}{{ data.titleFontSize ? 'px' : '' }})</span>
      <div class="slider-row">
        <input class="slider" type="range" min="6" max="40" step="1"
          :value="data.titleFontSize ?? 12"
          @input="set('titleFontSize', Number(($event.target as HTMLInputElement).value))" />
        <span class="slider-val">{{ data.titleFontSize ?? 'auto' }}{{ data.titleFontSize ? 'px' : '' }}</span>
      </div>
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
