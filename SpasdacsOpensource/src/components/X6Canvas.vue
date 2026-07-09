<template>
  <div ref="containerRef" class="x6-canvas" />
</template>

<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted } from "vue";
import type { Graph, Cell } from "@antv/x6";
import { createGraph, applyPortSizeToAllNodes } from "../graph/setupGraph";

const props = withDefaults(defineProps<{
  readOnly?: boolean;
  /** Diagram-level port size factor (multiplied by the larger node dimension).
   *  Default 0.12. Changing this updates all existing nodes immediately. */
  portSizeFactor?: number;
}>(), { readOnly: false, portSizeFactor: 0.12 });

const emit = defineEmits<{
  (e: "ready", graph: Graph): void;
  (e: "cell-selected", cells: Cell[]): void;
  (e: "cell-dblclick", cell: Cell): void;
}>();

const containerRef = ref<HTMLDivElement | null>(null);
let graph: Graph | null = null;

onMounted(() => {
  if (!containerRef.value) return;
  graph = createGraph(containerRef.value, props.readOnly, {
    getPortSizeFactor: () => props.portSizeFactor,
  });

  // Node selection is handled by the Selection plugin
  graph.on("selection:changed", ({ selected }) => {
    emit("cell-selected", selected as Cell[]);
  });

  graph.on("cell:dblclick", ({ cell }) => {
    emit("cell-dblclick", cell as Cell);
  });

  emit("ready", graph);
});

// Re-apply port sizes to all existing nodes whenever the factor changes.
watch(() => props.portSizeFactor, (factor) => {
  if (graph) applyPortSizeToAllNodes(graph, factor);
});

onUnmounted(() => {
  graph?.dispose();
  graph = null;
});

defineExpose({ getGraph: () => graph });
</script>

<style scoped>
.x6-canvas {
  flex: 1;
  min-height: 0;
  width: 100%;
  height: 100%;
  overflow: hidden;
}
</style>
<style>
  /*
   * X6 Scroller injects overflow: scroll — on Windows both scrollbars often stay visible
   * even when content fits. Use auto so bars appear only when needed.
   */
  .x6-graph-scroller {
    overflow: auto !important;
  }
</style>
