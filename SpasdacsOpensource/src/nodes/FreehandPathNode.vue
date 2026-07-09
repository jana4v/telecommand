<template>
  <div style="width:100%;height:100%;overflow:visible;position:relative;">
    <svg
      :width="w" :height="h"
      :viewBox="`0 0 ${w} ${h}`"
      overflow="visible"
      style="position:absolute;top:0;left:0;pointer-events:none;"
    >
      <!-- Invisible hit-area so the node is selectable/draggable -->
      <rect x="0" y="0" :width="w" :height="h" fill="transparent" style="pointer-events:all;" />
      <path
        v-if="pathD"
        :d="pathD"
        :stroke="strokeColor"
        :stroke-width="strokeW"
        :style="flowStyle"
        fill="none"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
    </svg>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from "vue";
import { useNodeData } from "./useNodeData";

const { d, w, h } = useNodeData(100, 50);

const strokeColor = computed(() => (d.value.strokeColor as string) || "#60a5fa");
const strokeW     = computed(() => (d.value.strokeWidth as number) || 2);

// ── Flow animation ────────────────────────────────────────────────────────
function ensureFlowKeyframes() {
  const ID = "x6-nats-flow-keyframes";
  if (document.getElementById(ID)) return;
  const s = document.createElement("style");
  s.id = ID;
  s.textContent = `
    @keyframes x6FlowFwd { from { stroke-dashoffset: 0; } to { stroke-dashoffset: -12; } }
    @keyframes x6FlowBwd { from { stroke-dashoffset: 0; } to { stroke-dashoffset:  12; } }
  `;
  document.head.appendChild(s);
}
onMounted(ensureFlowKeyframes);

const flowActive = computed(() => {
  const v = d.value.flowActive;
  return v === true || v === 1 || v === "true";
});
const flowDir = computed(() => Number(d.value.flowDirection ?? 1) < 0 ? -1 : 1);

const flowStyle = computed(() => {
  const base = { pointerEvents: "none" as const };
  if (!flowActive.value) return base;
  const anim = flowDir.value >= 0 ? "x6FlowFwd" : "x6FlowBwd";
  return {
    ...base,
    strokeDasharray: "8 4",
    animation: `${anim} 0.4s linear infinite`,
  };
});

const pathD = computed(() => {
  const raw = (d.value.points as { x: number; y: number }[]) ?? [];
  if (!raw.length) return "";
  const pts = raw.map(p => ({ x: p.x * w.value, y: p.y * h.value }));
  if (pts.length < 2) return "";
  const type = (d.value.pathType as string) || "line";

  if (type === "curve") {
    const p0 = pts[0], p1 = pts[pts.length - 1];
    const bf = (d.value.bendFactor as number) ?? 0.3;
    const cpx = (p0.x + p1.x) / 2 - (p1.y - p0.y) * bf;
    const cpy = (p0.y + p1.y) / 2 + (p1.x - p0.x) * bf;
    return `M ${p0.x.toFixed(2)},${p0.y.toFixed(2)} Q ${cpx.toFixed(2)},${cpy.toFixed(2)} ${p1.x.toFixed(2)},${p1.y.toFixed(2)}`;
  }

  // line / ortho / polyline — straight segments through all stored points
  return "M " + pts.map(p => `${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(" L ");
});
</script>
