<template>
  <div class="node-wrap" :style="{ opacity: d.opacity ?? 1 }">

    <!-- ── Display mode ─────────────────────────────────────────────────── -->
    <svg v-if="!editing"
         :width="w" :height="h" :viewBox="`0 0 ${w} ${h}`"
         xmlns="http://www.w3.org/2000/svg" overflow="visible">
      <rect x="0" y="0" :width="w" :height="h"
        :fill="d.fill || 'transparent'"
        :stroke="d.stroke || 'transparent'"
        :stroke-width="d.strokeWidth || 0"
      />
      <text :x="w / 2" :y="h / 2"
        text-anchor="middle" dominant-baseline="middle"
        :font-size="d.fontSize || 16"
        font-weight="600"
        :fill="d.statusColor || '#e6edf3'"
      >{{ labelText }}</text>
    </svg>

    <!-- ── Edit mode overlay ─────────────────────────────────────────────── -->
    <input v-else
      ref="inputRef"
      type="text"
      class="label-input"
      :style="inputStyle"
      v-model="editValue"
      @blur="commitEdit"
      @keydown.enter.prevent="commitEdit"
      @keydown.esc.stop="cancelEdit"
      @mousedown.stop
      @click.stop
      @dblclick.stop
    />

  </div>
</template>

<script setup lang="ts">
import { ref, computed, inject, watch, nextTick } from "vue";
import type { Node } from "@antv/x6";
import { useNodeData } from "./useNodeData";

const { d, w, h } = useNodeData(120, 40);
const getNode = inject<() => Node>("getNode");

const editing   = ref(false);
const editValue = ref("");
const inputRef  = ref<HTMLInputElement | null>(null);

// statusText carries the live telemetry value; name is the static user-typed label.
// Also support legacy/generic bindings that target `text`.
const labelText = computed(() =>
  ((d.value.statusText || d.value.text || d.value.name || "Label") as string)
);

const inputStyle = computed(() => ({
  width:      w.value + "px",
  height:     h.value + "px",
  fontSize:   (d.value.fontSize || 16) + "px",
  color:      (d.value.statusColor as string) || "#e6edf3",
  paddingTop: Math.max(0, h.value / 2 - ((d.value.fontSize as number) || 16) / 2 - 2) + "px",
  background: (d.value.fill && d.value.fill !== "transparent")
                ? (d.value.fill as string)
                : "rgba(15,20,26,0.90)",
}));

// X6 sets _editing:true on node:dblclick (from EditorPage)
watch(() => d.value._editing, (val) => {
  if (val) openEditor();
});

function openEditor() {
  // Always edit the static name, not the live telemetry statusText
  editValue.value = (d.value.name as string) || "";
  editing.value = true;
  nextTick(() => {
    inputRef.value?.focus();
    inputRef.value?.select();
  });
}

function commitEdit() {
  const node = getNode?.();
  if (node) {
    const text = editValue.value.trim() || "Label";
    node.setData({ name: text, _editing: false }, { overwrite: false });
  }
  editing.value = false;
}

function cancelEdit() {
  const node = getNode?.();
  node?.setData({ _editing: false }, { overwrite: false });
  editing.value = false;
}
</script>

<style scoped>
.node-wrap {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: visible;
}
svg { overflow: visible; }

.label-input {
  position: absolute;
  top: 0;
  left: 0;
  border: none;
  border-bottom: 1px dashed rgba(255,255,255,0.35);
  outline: none;
  text-align: center;
  font-weight: 600;
  font-family: inherit;
  padding-left: 4px;
  padding-right: 4px;
  box-sizing: border-box;
  caret-color: #4a9eff;
  border-radius: 2px;
}
.label-input:focus {
  border-bottom-color: #4a9eff;
}
</style>
