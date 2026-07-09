<template>
  <section class="section ci-section">
    <!-- Header — click to collapse/expand -->
    <div class="ci-hdr" @click="collapsed = !collapsed">
      <h4 class="section-title">Canvas Items</h4>
      <span class="ci-badge">{{ items.length }}</span>
      <svg class="ci-chevron" :class="{ collapsed }" viewBox="0 0 10 6" width="10" height="10" fill="none">
        <path d="M1 1 L5 5 L9 1" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    </div>

    <div v-show="!collapsed" class="ci-body">
      <div v-if="!items.length" class="ci-empty">No items on canvas</div>

      <div
        v-for="item in items"
        :key="item.id"
        class="ci-row"
        :class="{ 'ci-row--locked': item.locked }"
      >
        <!-- Type icon: edge = diagonal arrow, node = rectangle -->
        <svg class="ci-type-icon" viewBox="0 0 14 14" width="13" height="13" fill="none">
          <template v-if="item.isEdge">
            <line x1="2" y1="12" x2="12" y2="2" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
            <polygon points="12,2 8.5,3.5 10.5,5.5" fill="currentColor"/>
          </template>
          <template v-else>
            <rect x="1.5" y="3.5" width="11" height="7" rx="1.2" stroke="currentColor" stroke-width="1.4"/>
          </template>
        </svg>

        <!-- Label — click to focus/select the cell on canvas -->
        <span
          class="ci-name"
          :title="item.locked ? `${item.label} (locked)` : item.label"
          @click="!item.locked && emit('focus-cell', item.id)"
        >{{ item.label }}</span>

        <!-- Lock / Unlock toggle -->
        <button
          class="ci-lock-btn"
          :class="{ 'ci-lock-btn--on': item.locked }"
          :title="item.locked ? 'Unlock' : 'Lock'"
          @click.stop="emit('toggle-lock', item.id, !item.locked)"
        >
          <!-- Closed padlock (locked) -->
          <svg v-if="item.locked" viewBox="0 0 16 16" width="14" height="14" fill="none">
            <rect x="3" y="7.5" width="10" height="7.5" rx="1.5" fill="currentColor" opacity="0.9"/>
            <path d="M5.5 7.5V5.5a2.5 2.5 0 0 1 5 0v2" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
            <circle cx="8" cy="11.5" r="1.3" fill="#0f1419"/>
          </svg>
          <!-- Open padlock (unlocked) -->
          <svg v-else viewBox="0 0 16 16" width="14" height="14" fill="none">
            <rect x="3" y="7.5" width="10" height="7.5" rx="1.5" stroke="currentColor" stroke-width="1.4" opacity="0.45"/>
            <path d="M5.5 7.5V5.5a2.5 2.5 0 0 1 5 0V4" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" opacity="0.45"/>
          </svg>
        </button>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { ref } from "vue";

export interface CanvasItem {
  id: string;
  label: string;
  category: string;
  isEdge: boolean;
  locked: boolean;
}

defineProps<{
  items: CanvasItem[];
}>();

const emit = defineEmits<{
  (e: "toggle-lock", id: string, locked: boolean): void;
  (e: "focus-cell", id: string): void;
}>();

const collapsed = ref(false);
</script>

<style scoped>
.ci-section {
  border-top: 1px solid #2a3340;
  padding-top: 0;
}

.ci-hdr {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  cursor: pointer;
  user-select: none;
}
.ci-hdr:hover {
  background: rgba(255,255,255,0.04);
}
.ci-hdr .section-title {
  margin: 0;
  flex: 1;
}

.ci-badge {
  font-size: 10px;
  background: #2a3a50;
  color: #7a9ab8;
  border-radius: 8px;
  padding: 1px 6px;
  min-width: 18px;
  text-align: center;
}

.ci-chevron {
  color: #556070;
  transition: transform 0.18s ease;
}
.ci-chevron.collapsed {
  transform: rotate(-90deg);
}

.ci-body {
  max-height: 260px;
  overflow-y: auto;
  overflow-x: hidden;
}
.ci-body::-webkit-scrollbar { width: 4px; }
.ci-body::-webkit-scrollbar-track { background: transparent; }
.ci-body::-webkit-scrollbar-thumb { background: #2a3a50; border-radius: 2px; }

.ci-empty {
  padding: 10px 14px;
  font-size: 11px;
  color: #4a5568;
  font-style: italic;
}

.ci-row {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 12px 4px 10px;
  border-radius: 4px;
  transition: background 0.12s;
}
.ci-row:hover {
  background: rgba(255,255,255,0.04);
}
.ci-row--locked {
  opacity: 0.6;
}

.ci-type-icon {
  color: #556878;
  flex-shrink: 0;
}

.ci-name {
  flex: 1;
  font-size: 11.5px;
  color: #b0bec5;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  cursor: pointer;
  min-width: 0;
}
.ci-name:hover {
  color: #d0e0ec;
}
.ci-row--locked .ci-name {
  cursor: default;
  color: #6a7e8e;
}

.ci-lock-btn {
  flex-shrink: 0;
  background: none;
  border: none;
  padding: 2px;
  cursor: pointer;
  color: #4a6070;
  border-radius: 3px;
  display: flex;
  align-items: center;
  transition: color 0.12s, background 0.12s;
}
.ci-lock-btn:hover {
  background: rgba(255,255,255,0.08);
  color: #7a9ab8;
}
.ci-lock-btn--on {
  color: #e09030;
}
.ci-lock-btn--on:hover {
  color: #f0a040;
  background: rgba(224,144,48,0.12);
}
</style>
