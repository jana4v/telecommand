<template>
  <section class="section">
    <h4 class="section-title">System Settings</h4>

    <!-- ── Status fill ────────────────────────────────────────────────── -->
    <label class="field">
      <span>Status Fill</span>
      <select class="input"
        :value="statusVal"
        @change="set('statusColor', ($event.target as HTMLSelectElement).value === 'on' ? '#27ae60' : '')">
        <option value="off">Hidden (always dark)</option>
        <option value="on">Visible (colour fill)</option>
      </select>
    </label>
    <label v-if="statusVal === 'on'" class="field">
      <span>Fill Color</span>
      <div class="color-row">
        <input type="color" class="color-picker"
          :value="data.statusColor || '#27ae60'"
          @input="set('statusColor', ($event.target as HTMLInputElement).value)" />
        <input class="input"
          :value="data.statusColor || ''"
          @change="set('statusColor', ($event.target as HTMLInputElement).value)"
          placeholder="#27ae60" />
      </div>
    </label>

    <!-- ── Border (inner glow ring) ───────────────────────────────────── -->
    <label class="field">
      <span>Border</span>
      <select class="input"
        :value="borderVal"
        @change="onBorderToggle(($event.target as HTMLSelectElement).value)">
        <option value="off">Hidden</option>
        <option value="on">Visible</option>
      </select>
    </label>
    <template v-if="borderVal === 'on'">
      <label class="field">
        <span>Border Color</span>
        <div class="color-row">
          <input type="color" class="color-picker"
            :value="data.stroke || '#bdd1c5'"
            @input="set('stroke', ($event.target as HTMLInputElement).value)" />
          <input class="input"
            :value="data.stroke || ''"
            @change="set('stroke', ($event.target as HTMLInputElement).value)"
            placeholder="#bdd1c5" />
        </div>
      </label>
      <label class="field">
        <span>Border Width (px)</span>
        <input class="input" type="number" min="1" max="8" step="0.5"
          :value="data.strokeWidth ?? 1.5"
          @change="set('strokeWidth', parseFloat(($event.target as HTMLInputElement).value))" />
      </label>
    </template>

    <!-- ── Temperature ────────────────────────────────────────────────── -->
    <label class="field">
      <span>Temperature Label</span>
      <select class="input"
        :value="tempEnabled ? 'on' : 'off'"
        @change="onTempToggle(($event.target as HTMLSelectElement).value)">
        <option value="off">Hidden</option>
        <option value="on">Visible</option>
      </select>
    </label>
    <label v-if="tempEnabled" class="field">
      <span>Temperature (°C)</span>
      <input class="input" type="number" step="0.1"
        :value="data.temperature ?? 20"
        @change="set('temperature', parseFloat(($event.target as HTMLInputElement).value))" />
    </label>
  </section>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useDaStatusVal, useBpfTempEnabled } from "../composables/useInspectorDerived";
import type { InspectorSetter } from "../inspectorTypes";

const props = defineProps<{
  data: Record<string, any>;
  set: InspectorSetter;
}>();

// ── Status fill ──────────────────────────────────────────────────────────────
const statusVal = useDaStatusVal(() => props.data);

// ── Border visibility (stroke is non-empty) ──────────────────────────────────
const borderVal = computed(() => {
  const s = props.data.stroke as string | undefined;
  return !!s && s !== "" && s !== "transparent" && s !== "none" ? "on" : "off";
});

function onBorderToggle(val: string) {
  if (val === "on") {
    const prev = props.data.stroke as string | undefined;
    const hadColor = typeof prev === "string" && prev !== "" && prev !== "transparent" && prev !== "none";
    props.set("stroke", hadColor ? prev : "#bdd1c5");
  } else {
    props.set("stroke", "");
  }
}

// ── Temperature ──────────────────────────────────────────────────────────────
const tempEnabled = useBpfTempEnabled(() => props.data);

function onTempToggle(val: string) {
  if (val === "on") {
    const t = props.data.temperature;
    const hadNum = t !== undefined && t !== null && typeof t === "number" && !Number.isNaN(t);
    props.set("temperature", hadNum ? t : 20.0);
  } else {
    props.set("temperature", null);
  }
}
</script>
