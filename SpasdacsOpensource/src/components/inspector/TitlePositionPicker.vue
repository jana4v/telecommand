<!--
  TitlePositionPicker — compact 3×3 grid for choosing title label placement.
  Emits update:modelValue with a TitlePosition string.
-->
<template>
  <div class="tp-wrap">
    <div class="tp-grid">
      <button
        v-for="slot in SLOTS"
        :key="slot.value"
        class="tp-btn"
        :class="{ active: (modelValue ?? defaultPos) === slot.value }"
        :title="slot.label"
        @click="$emit('update:modelValue', slot.value)"
      >
        <svg width="14" height="10" viewBox="0 0 14 10">
          <!-- outer rect hint -->
          <rect x="0.5" y="0.5" width="13" height="9" rx="1.5"
            fill="none" stroke="currentColor" stroke-width="0.8" opacity="0.35"/>
          <!-- dot at the slot's position -->
          <circle :cx="slot.dotX" :cy="slot.dotY" r="1.8"
            fill="currentColor" opacity="0.9"/>
        </svg>
      </button>
    </div>
    <span class="tp-label">{{ currentLabel }}</span>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";

export type TitlePosition =
  | "top-left"    | "top-center"    | "top-right"
  | "middle-left" | "center"        | "middle-right"
  | "bottom-left" | "bottom-center" | "bottom-right";

const props = withDefaults(defineProps<{
  modelValue?: TitlePosition | string;
  defaultPos?: TitlePosition;
}>(), {
  defaultPos: "top-center",
});

defineEmits<{ (e: "update:modelValue", v: TitlePosition): void }>();

// ── Grid slot definitions (row-major order) ───────────────────────────────
const SLOTS: { value: TitlePosition; label: string; dotX: number; dotY: number }[] = [
  { value: "top-left",      label: "Top Left",      dotX: 2.5, dotY: 2.0 },
  { value: "top-center",    label: "Top Center",    dotX: 7.0, dotY: 2.0 },
  { value: "top-right",     label: "Top Right",     dotX: 11.5, dotY: 2.0 },
  { value: "middle-left",   label: "Middle Left",   dotX: 2.5, dotY: 5.0 },
  { value: "center",        label: "Center",        dotX: 7.0, dotY: 5.0 },
  { value: "middle-right",  label: "Middle Right",  dotX: 11.5, dotY: 5.0 },
  { value: "bottom-left",   label: "Bottom Left",   dotX: 2.5, dotY: 8.0 },
  { value: "bottom-center", label: "Bottom Center", dotX: 7.0, dotY: 8.0 },
  { value: "bottom-right",  label: "Bottom Right",  dotX: 11.5, dotY: 8.0 },
];

const currentLabel = computed(() => {
  const active = (props.modelValue ?? props.defaultPos) as TitlePosition;
  return SLOTS.find(s => s.value === active)?.label ?? active;
});
</script>

<style scoped>
.tp-wrap  { display: flex; align-items: center; gap: 8px; }
.tp-grid  { display: grid; grid-template-columns: repeat(3, 26px); gap: 3px; }
.tp-btn {
  width: 26px; height: 22px;
  display: flex; align-items: center; justify-content: center;
  background: #0d1117; border: 1px solid #30363d; border-radius: 4px;
  color: #8b949e; cursor: pointer; padding: 0; transition: background 0.15s, color 0.15s;
}
.tp-btn:hover { background: #161b22; border-color: #4a9eff; color: #c9d1d9; }
.tp-btn.active {
  background: rgba(74,158,255,0.18); border-color: #4a9eff; color: #4a9eff;
}
.tp-label { font-size: 10px; color: #8b949e; white-space: nowrap; }
</style>
