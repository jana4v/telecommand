<template>
  <Teleport to="body">
    <div v-if="modelValue" class="tsm-backdrop" @click.self="close">
      <div class="tsm-dialog" role="dialog" aria-labelledby="tsm-title" @click.stop>
        <div class="tsm-header">
          <h3 id="tsm-title">📡 Telemetry streams</h3>
          <button type="button" class="tsm-close" aria-label="Close" @click="close">×</button>
        </div>
        <div class="tsm-body">
          <p class="tsm-lead">
            These streams appear in the <strong>Telemetry source</strong> dropdown when editing diagram bindings.
            The viewer uses the same list with NATS subject prefix <code>{{ displayPrefix }}.&lt;suffix&gt;</code>.
          </p>
          <TelemetryStreamsConfigPanel :disabled="false" :subject-prefix="displayPrefix" />
        </div>
        <div class="tsm-footer">
          <button type="button" class="tsm-btn-cancel" @click="close">Cancel</button>
          <button type="button" class="tsm-btn-save" @click="save">Save</button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { computed } from "vue";
import TelemetryStreamsConfigPanel from "./TelemetryStreamsConfigPanel.vue";
import { saveTelemetryStreamsToStorage } from "../stores/telemetryStreamsConfig";

const props = withDefaults(
  defineProps<{
    modelValue: boolean;
    /** Subject prefix for hints (default <code>tm</code>) */
    subjectPrefix?: string;
  }>(),
  { subjectPrefix: "tm" },
);

const emit = defineEmits<{ "update:modelValue": [boolean] }>();

const displayPrefix = computed(() => (props.subjectPrefix?.trim() || "tm"));

function close() {
  emit("update:modelValue", false);
}

function save() {
  saveTelemetryStreamsToStorage();
  close();
}
</script>

<style scoped>
.tsm-backdrop {
  position: fixed; inset: 0; z-index: 10050;
  background: rgba(0, 0, 0, 0.55);
  display: flex; align-items: center; justify-content: center;
  padding: 16px;
}
.tsm-dialog {
  width: min(560px, 96vw);
  max-height: 90vh;
  overflow: hidden;
  display: flex; flex-direction: column;
  background: #161b22;
  border: 1px solid #30363d;
  border-radius: 10px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.45);
}
.tsm-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 12px 16px;
  border-bottom: 1px solid #30363d;
  background: #0d1117;
}
.tsm-header h3 {
  margin: 0; font-size: 15px; font-weight: 700; color: #e6edf3;
}
.tsm-close {
  background: none; border: none; color: #8b949e; font-size: 22px;
  line-height: 1; cursor: pointer; padding: 0 4px;
}
.tsm-close:hover { color: #e6edf3; }
.tsm-body {
  padding: 14px 16px;
  overflow-y: auto;
  flex: 1;
}
.tsm-lead {
  font-size: 12px; line-height: 1.5; color: #8b949e; margin: 0 0 12px;
}
.tsm-lead code { font-size: 11px; color: #79c0ff; }
.tsm-footer {
  display: flex; justify-content: flex-end; gap: 8px;
  padding: 10px 16px;
  border-top: 1px solid #30363d;
  background: #0d1117;
}
.tsm-btn-cancel {
  padding: 6px 14px; background: #21262d; border: 1px solid #30363d;
  border-radius: 6px; color: #c9d1d9; font-size: 12px; cursor: pointer;
}
.tsm-btn-save {
  padding: 6px 16px; background: #238636; border: none;
  border-radius: 6px; color: #fff; font-size: 12px; font-weight: 600; cursor: pointer;
}
.tsm-btn-save:hover { filter: brightness(1.08); }
</style>
