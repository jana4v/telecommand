<template>
  <section class="section">
    <h4 class="section-title">SVG Element Binding</h4>

    <template v-if="selectedId">
      <div class="element-row">
        <svg class="element-icon" viewBox="0 0 14 14" xmlns="http://www.w3.org/2000/svg">
          <rect x="2" y="2" width="10" height="10" rx="1.5" fill="none" stroke="#4a9eff" stroke-width="1.5" />
          <path d="M5 7 L7 9 L9 5" fill="none" stroke="#4a9eff" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
        <span class="element-id" :title="selectedId">{{ selectedId }}</span>
        <button class="btn-clear" @click="emit('clear')" title="Clear element selection">✕</button>
      </div>
      <p class="hint-text">New bindings will target this element. Use "Manage Bindings" below.</p>
    </template>

    <template v-else>
      <p class="hint-text">
        Click any path or shape directly on the SVG canvas node to select it, then assign a telemetry binding.
      </p>
      <div class="hint-example">
        <span class="hint-step">1</span> Click a shape in the SVG
        <span class="hint-step">2</span> Click "Add Binding" below
      </div>
    </template>

    <div class="btn-row">
      <button class="btn-fit" :class="{ busy: fitting }" :disabled="fitting" @click="onFit" title="Resize node to match SVG content bounds">
        <svg viewBox="0 0 14 14" xmlns="http://www.w3.org/2000/svg" class="fit-icon">
          <path d="M2 5V2h3M9 2h3v3M12 9v3H9M5 12H2V9" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        {{ fitting ? "Fitting…" : "Fit to SVG" }}
      </button>
      <button class="btn-fit" @click="emit('toback')" title="Send SVG node behind all other nodes so components can be overlaid on top">
        <svg viewBox="0 0 14 14" xmlns="http://www.w3.org/2000/svg" class="fit-icon">
          <rect x="1" y="4" width="8" height="8" rx="1" fill="none" stroke="currentColor" stroke-width="1.3"/>
          <rect x="5" y="1" width="8" height="8" rx="1" fill="#1a2030" stroke="currentColor" stroke-width="1.3"/>
          <path d="M5 5h4v4" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round"/>
        </svg>
        Send to back
      </button>
    </div>
  </section>
</template>

<script setup lang="ts">
import { ref } from "vue";

defineProps<{
  selectedId: string;
}>();

const emit = defineEmits<{
  clear: [];
  fit: [];
  toback: [];
}>();

const fitting = ref(false);

async function onFit() {
  fitting.value = true;
  emit("fit");
  // Reset busy state after a short delay (parent handles the async work).
  setTimeout(() => { fitting.value = false; }, 800);
}
</script>

<style scoped>
.section {
  padding: 9px 12px;
  border-bottom: 1px solid #21262d;
}
.section-title {
  font-size: 10px;
  font-weight: 700;
  color: #8b949e;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  margin-bottom: 7px;
}

.element-row {
  display: flex;
  align-items: center;
  gap: 6px;
  background: rgba(74, 158, 255, 0.08);
  border: 1px solid rgba(74, 158, 255, 0.25);
  border-radius: 5px;
  padding: 5px 8px;
  margin-bottom: 6px;
}
.element-icon {
  width: 14px;
  height: 14px;
  flex-shrink: 0;
}
.element-id {
  flex: 1;
  font-size: 11px;
  font-family: monospace;
  color: #58a6ff;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.btn-clear {
  background: none;
  border: none;
  color: #6e7681;
  cursor: pointer;
  font-size: 11px;
  padding: 0 2px;
  flex-shrink: 0;
  line-height: 1;
}
.btn-clear:hover { color: #e74c3c; }

.hint-text {
  font-size: 10px;
  color: #6e7681;
  margin: 0;
  line-height: 1.4;
}

.hint-example {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 6px;
  font-size: 10px;
  color: #6e7681;
  flex-wrap: wrap;
}
.hint-step {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: rgba(74, 158, 255, 0.18);
  color: #4a9eff;
  font-size: 9px;
  font-weight: 700;
  flex-shrink: 0;
}

.btn-row {
  display: flex;
  gap: 6px;
  margin-top: 8px;
}
.btn-fit {
  display: flex;
  align-items: center;
  gap: 5px;
  flex: 1;
  padding: 5px 8px;
  font-size: 10px;
  color: #8b949e;
  background: rgba(139, 148, 158, 0.08);
  border: 1px solid #30363d;
  border-radius: 4px;
  cursor: pointer;
  transition: color 0.15s, border-color 0.15s, background 0.15s;
}
.btn-fit:hover:not(:disabled) {
  color: #4a9eff;
  border-color: rgba(74, 158, 255, 0.4);
  background: rgba(74, 158, 255, 0.07);
}
.btn-fit.busy, .btn-fit:disabled {
  opacity: 0.55;
  cursor: default;
}
.fit-icon {
  width: 12px;
  height: 12px;
  flex-shrink: 0;
}
</style>
