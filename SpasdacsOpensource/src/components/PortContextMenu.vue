<template>
  <Teleport to="body">
    <div
      v-if="visible"
      class="port-ctx-menu"
      :style="{ left: x + 'px', top: y + 'px' }"
      @mouseleave="$emit('close')"
    >
      <div class="port-ctx-title">Connection Points</div>
      <div v-for="side in SIDES" :key="side.id" class="port-ctx-row">
        <span class="side-label">{{ side.label }}</span>
        <div class="side-controls">
          <button class="btn-pm" :disabled="getCount(side.id) === 0" @click="remove(side.id)">−</button>
          <span class="side-count">{{ getCount(side.id) }}</span>
          <button class="btn-pm" @click="add(side.id)">+</button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref } from "vue";

const props = defineProps<{
  visible: boolean;
  x: number;
  y: number;
  node: any | null;
}>();

defineEmits<{ (e: "close"): void }>();

const SIDES = [
  { id: "left",   label: "Left"   },
  { id: "right",  label: "Right"  },
  { id: "top",    label: "Top"    },
  { id: "bottom", label: "Bottom" },
];

// Tick forces recompute after add/remove (X6 Node mutations are not Vue-reactive)
const tick = ref(0);

const PORT_MARKUP = [{ tagName: "circle", selector: "circle" }];
const PORT_CIRCLE_BASE = { magnet: true, fill: "#0d1117", stroke: "#8090a0", strokeWidth: 1.5 };

/** Compute port radius proportional to the node's larger dimension. */
function portRadius(node: any): number {
  const size = node.getSize?.();
  if (!size) return 5;
  return Math.min(3, Math.max(size.width, size.height) * 0.12);
}

/** Guarantee the four standard groups exist on this node instance. */
function ensureGroups(node: any) {
  const r = portRadius(node);
  for (const side of ["left", "right", "top", "bottom"]) {
    const existing = node.prop(`ports/groups/${side}`);
    if (!existing) {
      node.prop(`ports/groups/${side}`, {
        position: side,
        markup:   PORT_MARKUP,
        attrs:    { circle: { ...PORT_CIRCLE_BASE, r } },
      });
    } else {
      // Keep r in sync with current node size
      node.prop(`ports/groups/${side}/attrs/circle/r`, r);
    }
  }
}

function getCount(side: string): number {
  tick.value; // reactive dependency
  return props.node?.getPorts().filter((p: any) => p.group === side).length ?? 0;
}

function add(side: string) {
  if (!props.node) return;
  ensureGroups(props.node);
  props.node.addPort({ id: `${side}_${Date.now()}`, group: side });
  tick.value++;
}

function remove(side: string) {
  if (!props.node) return;
  const ports = props.node.getPorts().filter((p: any) => p.group === side);
  if (ports.length === 0) return;
  props.node.removePort(ports[ports.length - 1].id!);
  tick.value++;
}
</script>

<style scoped>
.port-ctx-menu {
  position: fixed;
  z-index: 9999;
  min-width: 180px;
  background: #1c2128;
  border: 1px solid #30363d;
  border-radius: 6px;
  box-shadow: 0 4px 20px rgba(0,0,0,0.6);
  padding: 4px 0;
  user-select: none;
}

.port-ctx-title {
  font-size: 0.72rem;
  color: #6e7681;
  padding: 5px 12px 3px;
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

.port-ctx-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 5px 10px;
  font-size: 0.85rem;
  color: #c9d1d9;
}

.side-label {
  flex: 1;
}

.side-controls {
  display: flex;
  align-items: center;
  gap: 4px;
}

.side-count {
  width: 20px;
  text-align: center;
  font-weight: 600;
  color: #4a9eff;
}

.btn-pm {
  width: 22px;
  height: 22px;
  border: 1px solid #30363d;
  border-radius: 4px;
  background: rgba(139,148,158,0.15);
  color: #c9d1d9;
  font-size: 1rem;
  line-height: 1;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.1s;
}

.btn-pm:hover:not(:disabled) {
  background: rgba(74,158,255,0.2);
  color: #fff;
  border-color: rgba(74,158,255,0.4);
}

.btn-pm:disabled {
  opacity: 0.3;
  cursor: default;
}
</style>
