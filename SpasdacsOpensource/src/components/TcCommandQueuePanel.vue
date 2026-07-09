<template>
  <Teleport to="body">
    <div v-if="visible" class="tcqp-backdrop" @mousedown.self="close">
      <div class="tcqp-panel">

        <!-- Header -->
        <div class="tcqp-header">
          <span class="tcqp-title">📋 TC Queue</span>
          <span class="tcqp-count-badge" v-if="queue.items.length">{{ queue.items.length }}</span>
          <button class="tcqp-close" @click="close" title="Close">✕</button>
        </div>

        <!-- Empty state -->
        <div v-if="!queue.items.length" class="tcqp-empty">
          No commands in queue.<br/>
          <span class="tcqp-empty-hint">Double-click an element in the diagram to add commands.</span>
        </div>

        <!-- Command list -->
        <div v-else class="tcqp-list">
          <div
            v-for="(item, idx) in queue.items"
            :key="item.uid"
            class="tcqp-item"
            :class="{ dragging: dragIdx === idx, dragover: dragOverIdx === idx }"
            draggable="true"
            @dragstart="onDragStart(idx)"
            @dragover.prevent="onDragOver(idx)"
            @dragleave="onDragLeave"
            @drop="onDrop(idx)"
            @dragend="onDragEnd"
          >
            <!-- Sequence number -->
            <span class="tcqp-seq">{{ idx + 1 }}</span>

            <!-- Drag grip -->
            <span class="tcqp-grip" title="Drag to reorder">⠿</span>

            <!-- Command info -->
            <div class="tcqp-info">
              <span class="tcqp-cmd">{{ item.cmdDesc }}</span>
              <span v-if="item.dataPart" class="tcqp-dp">
                <span class="tcqp-dp-label">data:</span> {{ item.dataPart }}
              </span>
            </div>

            <!-- Reorder arrows -->
            <div class="tcqp-arrows">
              <button class="tcqp-arrow" :disabled="idx === 0"
                @click="reorderCommand(idx, idx - 1)" title="Move up">▲</button>
              <button class="tcqp-arrow" :disabled="idx === queue.items.length - 1"
                @click="reorderCommand(idx, idx + 1)" title="Move down">▼</button>
            </div>

            <!-- Delete -->
            <button class="tcqp-del" @click="dequeueCommand(item.uid)" title="Remove">✕</button>
          </div>
        </div>

        <!-- Footer actions -->
        <div class="tcqp-footer">
          <button class="tcqp-btn-clear" :disabled="!queue.items.length" @click="onClearAll">
            🗑 Clear All
          </button>
          <button class="tcqp-btn-send" :disabled="!queue.items.length" @click="onSendCommands">
            🚀 Send Commands
          </button>
        </div>

      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, watch } from "vue";
import {
  commandQueue as queue,
  dequeueCommand,
  reorderCommand,
  clearQueue,
} from "../stores/commandQueueStore";

const props = defineProps<{ visible: boolean }>();
const emit  = defineEmits<{ (e: "update:visible", v: boolean): void }>();

function close() { emit("update:visible", false); }

// Auto-close when queue is emptied by individual deletes
watch(() => queue.items.length, (len) => {
  if (len === 0 && props.visible) close();
});

// ── Drag-to-reorder ────────────────────────────────────────────────────────
const dragIdx     = ref<number | null>(null);
const dragOverIdx = ref<number | null>(null);

function onDragStart(idx: number) { dragIdx.value = idx; }
function onDragOver(idx: number)  { if (dragIdx.value !== null) dragOverIdx.value = idx; }
function onDragLeave()             { dragOverIdx.value = null; }
function onDrop(idx: number) {
  if (dragIdx.value !== null && dragIdx.value !== idx) {
    reorderCommand(dragIdx.value, idx);
  }
  dragIdx.value = dragOverIdx.value = null;
}
function onDragEnd() { dragIdx.value = dragOverIdx.value = null; }

// ── Clear all + close ─────────────────────────────────────────────────────
function onClearAll() {
  clearQueue();
  close();
}

// ── Send (stub — functionality added later) ────────────────────────────────
function onSendCommands() {
  // TODO: implement send logic
  close();
}
</script>

<style scoped>
/* ── Backdrop ─────────────────────────────────────────────────────────── */
.tcqp-backdrop {
  position: fixed; inset: 0;
  background: rgba(0,0,0,.45);
  display: flex; align-items: flex-start; justify-content: center;
  padding-top: 60px;
  z-index: 11500;
}

/* ── Panel box ────────────────────────────────────────────────────────── */
.tcqp-panel {
  background: #fff;
  border-radius: 10px;
  box-shadow: 0 8px 48px rgba(0,0,0,.30);
  width: min(560px, 96vw);
  max-height: 75vh;
  display: flex; flex-direction: column;
  overflow: hidden;
  animation: tcqp-drop .18s ease;
}
@keyframes tcqp-drop {
  from { opacity: 0; transform: translateY(-10px); }
  to   { opacity: 1; transform: translateY(0); }
}

/* ── Header ──────────────────────────────────────────────────────────── */
.tcqp-header {
  display: flex; align-items: center; gap: 10px;
  padding: 13px 16px 11px;
  background: #fff;
  border-bottom: 2px solid #1a73e8;
}
.tcqp-title { font-size: 15px; font-weight: 700; color: #1a1a2e; }
.tcqp-count-badge {
  background: #1a73e8; color: #fff;
  font-size: 11px; font-weight: 700;
  padding: 2px 8px; border-radius: 10px; min-width: 22px; text-align: center;
}
.tcqp-close {
  margin-left: auto; background: none; border: none;
  color: #888; font-size: 16px; cursor: pointer; line-height: 1;
  padding: 2px 6px; border-radius: 4px; transition: background .15s, color .15s;
}
.tcqp-close:hover { background: #f0f0f0; color: #333; }

/* ── Empty ────────────────────────────────────────────────────────────── */
.tcqp-empty {
  padding: 36px 24px; text-align: center;
  color: #888; font-size: 13px; line-height: 1.8;
}
.tcqp-empty-hint { font-size: 11px; color: #bbb; }

/* ── List ─────────────────────────────────────────────────────────────── */
.tcqp-list {
  flex: 1; overflow-y: auto;
  padding: 8px;
  display: flex; flex-direction: column; gap: 4px;
}

.tcqp-item {
  display: flex; align-items: center; gap: 8px;
  padding: 10px 10px;
  background: #f8f9fc;
  border: 1px solid #e3e6ee;
  border-radius: 7px;
  cursor: grab; transition: background .1s, box-shadow .1s;
  user-select: none;
}
.tcqp-item:hover { background: #eef2ff; box-shadow: 0 2px 8px rgba(0,0,0,.07); }
.tcqp-item.dragging { opacity: .4; }
.tcqp-item.dragover {
  border-color: #1a73e8; background: #e8f0fe;
  box-shadow: 0 0 0 2px #1a73e8;
}

.tcqp-seq {
  min-width: 22px; height: 22px;
  background: #1a73e8; color: #fff;
  border-radius: 50%; font-size: 11px; font-weight: 700;
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
}
.tcqp-grip {
  color: #aaa; font-size: 14px; cursor: grab; flex-shrink: 0;
}
.tcqp-info {
  flex: 1; min-width: 0;
  display: flex; flex-direction: column; gap: 2px;
}
.tcqp-cmd {
  font-size: 13px; font-weight: 600; color: #1a1a2e;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.tcqp-dp { font-size: 11px; color: #666; }
.tcqp-dp-label { color: #888; }

.tcqp-arrows { display: flex; flex-direction: column; gap: 2px; flex-shrink: 0; }
.tcqp-arrow {
  background: none; border: 1px solid #cdd3dd;
  border-radius: 3px; padding: 1px 5px; font-size: 9px;
  cursor: pointer; color: #555; line-height: 1.4;
  transition: background .1s;
}
.tcqp-arrow:hover:not(:disabled) { background: #e8f0fe; border-color: #1a73e8; color: #1a73e8; }
.tcqp-arrow:disabled { opacity: .3; cursor: default; }

.tcqp-del {
  background: none; border: none;
  color: #cc3333; font-size: 14px; cursor: pointer;
  padding: 2px 6px; border-radius: 4px; flex-shrink: 0;
  transition: background .1s;
}
.tcqp-del:hover { background: #ffeaea; }

/* ── Footer ──────────────────────────────────────────────────────────── */
.tcqp-footer {
  display: flex; gap: 10px; align-items: center; justify-content: flex-end;
  padding: 12px 16px;
  border-top: 1px solid #e8eaed;
  background: #fafafa;
}

.tcqp-btn-clear {
  padding: 7px 16px; border: 1px solid #f5c2c7;
  border-radius: 6px; background: #fff8f8; color: #cc3333;
  font-size: 13px; font-weight: 500; cursor: pointer;
  transition: background .15s;
}
.tcqp-btn-clear:hover:not(:disabled) { background: #ffeaea; }
.tcqp-btn-clear:disabled { opacity: .4; cursor: default; }

.tcqp-btn-send {
  padding: 7px 20px; border: none;
  border-radius: 6px; background: #1a73e8; color: #fff;
  font-size: 13px; font-weight: 700; cursor: pointer;
  transition: background .15s;
  letter-spacing: .2px;
}
.tcqp-btn-send:hover:not(:disabled) { background: #1557b0; }
.tcqp-btn-send:disabled { opacity: .4; cursor: default; }
</style>
