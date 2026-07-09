import { inject, ref, onMounted, onUnmounted, computed } from "vue";
import type { Node } from "@antv/x6";

/**
 * Composable for x6-vue-shape nodes.
 * x6-vue-shape v2.x provides the node via inject('getNode') — not useCell().
 * We bridge X6's event system into Vue's reactivity here.
 */
export function useNodeData(defaultW = 80, defaultH = 80) {
  const getNode = inject<() => Node>("getNode");
  const _d = ref<Record<string, any>>({});
  const _w = ref(defaultW);
  const _h = ref(defaultH);
  let _node: Node | undefined;

  onMounted(() => {
    _node = getNode?.();
    if (!_node) return;
    _d.value = (_node.getData() as Record<string, any>) ?? {};
    const s = _node.getSize();
    _w.value = s.width;
    _h.value = s.height;
    _node.on("change:data", () => {
      _d.value = { ...(_node!.getData() as Record<string, any>) };
    });
    _node.on("change:size", () => {
      const s = _node!.getSize();
      _w.value = s.width;
      _h.value = s.height;
    });
  });

  onUnmounted(() => {
    _node?.off("change:data");
    _node?.off("change:size");
  });

  return {
    d: computed(() => _d.value),
    w: computed(() => _w.value),
    h: computed(() => _h.value),
  };
}
