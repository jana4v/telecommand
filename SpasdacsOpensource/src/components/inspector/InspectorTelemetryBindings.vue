<template>
  <section class="section">
    <h4 class="section-title">Telemetry Bindings</h4>
    <slot name="hint" />
    <div class="binding-list">
      <div v-for="(b, i) in bindings" :key="b.id" class="binding-chip">
        <span class="chip-badge" :class="b.targetProp === '__multi__' ? 'chip-script' : 'chip-rule'">
          {{ b.targetProp === '__multi__' ? 'Script' : b.targetProp }}
        </span>
        <span class="chip-preview">{{ b.topic || '(multi)' }}</span>
        <button type="button" class="chip-del" @click="emit('remove', i)">✕</button>
      </div>
      <div v-if="!bindings.length" class="binding-empty">No bindings</div>
    </div>
    <button type="button" class="btn-manage" @click="emit('manage')">
      {{ bindings.length ? '⚡ Manage Bindings' : '+ Add Binding' }}
    </button>
  </section>
</template>

<script setup lang="ts">
import type { TelemetryBinding } from "../../types";

defineProps<{
  bindings: TelemetryBinding[];
}>();

const emit = defineEmits<{
  remove: [index: number];
  manage: [];
}>();
</script>

<style scoped>
.section { padding: 9px 12px; border-bottom: 1px solid #21262d; }
.section-title {
  font-size: 10px; font-weight: 700; color: #8b949e;
  text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 7px;
}
.binding-list { display: flex; flex-direction: column; gap: 3px; margin-bottom: 7px; }
.binding-chip {
  display: flex; align-items: center; gap: 5px;
  padding: 4px 6px; background: #0d1117; border-radius: 4px; border: 1px solid #21262d;
}
.chip-badge {
  font-size: 9px; border-radius: 6px; padding: 1px 5px; font-weight: 700; flex-shrink: 0;
}
.chip-rule   { background: rgba(74,158,255,0.2); color: #4a9eff; border: 1px solid rgba(74,158,255,0.3); }
.chip-script { background: rgba(243,156,18,0.2); color: #f39c12; border: 1px solid rgba(243,156,18,0.3); }
.chip-preview {
  flex: 1; font-size: 10px; font-family: monospace; color: #8b949e;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.chip-del { background: none; border: none; color: #555; cursor: pointer; font-size: 11px; flex-shrink: 0; padding: 0 2px; }
.chip-del:hover { color: #e74c3c; }
.binding-empty { font-size: 11px; color: #4a5568; font-style: italic; padding: 2px 0; }
.btn-manage {
  width: 100%; padding: 6px;
  background: rgba(74,158,255,0.12); color: #4a9eff;
  border: 1px solid rgba(74,158,255,0.3); border-radius: 5px;
  font-size: 11px; font-weight: 600; cursor: pointer;
}
.btn-manage:hover { background: rgba(74,158,255,0.22); }
</style>
