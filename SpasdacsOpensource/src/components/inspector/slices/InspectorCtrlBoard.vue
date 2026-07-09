<template>
  <section class="section">
    <h4 class="section-title">Controller Board</h4>

    <!-- Label -->
    <label class="field">
      <span>Label</span>
      <input class="input" type="text" placeholder="e.g. CTRL-A"
        :value="data.name ?? ''"
        @change="set('name', ($event.target as HTMLInputElement).value)" />
    </label>

    <!-- Accent color -->
    <label class="field">
      <span>Accent Color <small style="opacity:0.55">(LEDs · traces · chip glow)</small></span>
      <div class="color-row">
        <input type="color" class="color-picker"
          :value="data.statusColor || '#4a9eff'"
          @input="set('statusColor', ($event.target as HTMLInputElement).value)" />
        <input class="input" type="text"
          :value="data.statusColor || '#4a9eff'"
          @change="set('statusColor', ($event.target as HTMLInputElement).value)" />
      </div>
    </label>

    <div class="divider" />

    <!-- Operating status -->
    <div class="field">
      <span>Status</span>
      <div class="btn-group">
        <button
          v-for="opt in STATUS_OPTS" :key="opt.value"
          class="btn" :class="[{ active: currentStatus === opt.value }, `btn-${opt.value}`]"
          @click="set('status', opt.value)">
          {{ opt.label }}
        </button>
      </div>
      <span class="field-hint">Telemetry: nominal / standby / fault / off</span>
    </div>

    <!-- Signal animation override -->
    <div class="field">
      <span>Signal Traces</span>
      <button
        class="btn btn-sig" :class="{ active: signalActive }"
        @click="set('signalActive', signalActive ? 'false' : 'true')">
        {{ signalActive ? '⚡ Animated' : '⬜ Static' }}
      </button>
      <span class="field-hint">Telemetry: true / false — auto-on when status = nominal</span>
    </div>

    <!-- Title font size -->
    <div class="field">
      <span>Title Font Size <small style="opacity:0.55">px</small></span>
      <div class="font-size-row">
        <input class="input font-size-input" type="number" min="5" max="16" step="0.5"
          :value="data.titleFontSize ?? 7.5"
          @change="set('titleFontSize', Number(($event.target as HTMLInputElement).value))" />
        <input type="range" min="5" max="16" step="0.5" class="font-size-range"
          :value="data.titleFontSize ?? 7.5"
          @input="set('titleFontSize', Number(($event.target as HTMLInputElement).value))" />
      </div>
    </div>

    <!-- Live state preview -->
    <div class="preview-state">
      <span class="preview-label">State:</span>
      <span class="chip" :class="statusChipClass">{{ statusChipLabel }}</span>
      <span v-if="signalActive" class="chip chip-sig">⚡ signals</span>
      <span v-if="currentStatus === 'off'" class="chip chip-off">⬛ powered off</span>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from "vue";
import type { InspectorSetter } from "../inspectorTypes";

const props = defineProps<{
  data: Record<string, any>;
  set: InspectorSetter;
}>();

const STATUS_OPTS = [
  { value: "nominal",  label: "Nominal"  },
  { value: "standby",  label: "Standby"  },
  { value: "fault",    label: "Fault"    },
  { value: "off",      label: "Off"      },
];

const NOMINAL_KEYS = ["nominal","ok","active","on","1","true","yes","run","running"];
const FAULT_KEYS   = ["fault","error","fail","alarm","critical","err"];
const STANDBY_KEYS = ["standby","idle","sleep","waiting","ready","warm"];
const OFF_KEYS     = ["off","poweroff","power_off","shutdown","disabled","down","unpowered"];

const statusStr = computed(() => String(props.data.status ?? "").toLowerCase().trim());
const currentStatus = computed(() =>
  OFF_KEYS.includes(statusStr.value)     ? "off"     :
  NOMINAL_KEYS.includes(statusStr.value) ? "nominal" :
  FAULT_KEYS.includes(statusStr.value)   ? "fault"   :
  STANDBY_KEYS.includes(statusStr.value) ? "standby" : "standby");

const signalActive = computed(() => {
  if (currentStatus.value === "off") return false;
  const v = props.data.signalActive;
  if (v == null) return currentStatus.value === "nominal";
  const s = String(v).toLowerCase().trim();
  return ["1","true","on","yes","active"].includes(s) || currentStatus.value === "nominal";
});

const statusChipClass = computed(() => ({
  "chip-nominal": currentStatus.value === "nominal",
  "chip-standby": currentStatus.value === "standby",
  "chip-fault":   currentStatus.value === "fault",
  "chip-off":     currentStatus.value === "off",
}));
const statusChipLabel = computed(() => ({
  nominal: "🟢 Nominal",
  standby: "🟡 Standby",
  fault:   "🔴 Fault",
  off:     "⬛ Off",
}[currentStatus.value] ?? "⬛ Off"));
</script>

<style scoped>
.divider { height: 1px; background: #21262d; margin: 8px 0; }

.field {
  display: flex; flex-direction: column; gap: 3px; margin-bottom: 8px;
}
.field > span:first-child {
  font-size: 10px; color: #8b949e; text-transform: uppercase; letter-spacing: 0.04em;
}
.field-hint { font-size: 10px; color: #4a5568; line-height: 1.4; }

.input {
  background: #0d1117; border: 1px solid #30363d; border-radius: 4px;
  color: #c9d1d9; font-size: 12px; padding: 4px 7px;
  width: 100%; outline: none; box-sizing: border-box;
}
.input:focus { border-color: #4a9eff; }

.color-row { display: flex; gap: 5px; align-items: center; }
.color-picker {
  width: 28px; height: 26px; padding: 0; border: 1px solid #30363d;
  border-radius: 4px; cursor: pointer; flex-shrink: 0;
}

.btn-group { display: flex; gap: 3px; }
.btn {
  flex: 1; padding: 4px 0; font-size: 11px; font-weight: 600;
  border: 1px solid #30363d; border-radius: 4px;
  background: #0d1117; color: #8b949e; cursor: pointer;
  transition: background 0.15s, color 0.15s, border-color 0.15s;
}
.btn:hover { background: #161b22; color: #c9d1d9; }
.btn.active { background: #1a3a5c; color: #4a9eff; border-color: #2a5090; }

/* Status-specific active colours */
.btn-nominal.active { background: #0d2a18; color: #30e060; border-color: #1a5030; }
.btn-standby.active { background: #2a2008; color: #ffa020; border-color: #604a10; }
.btn-fault.active   { background: #2a0810; color: #ff3040; border-color: #801020; }
.btn-off.active     { background: #161616; color: #6e7681; border-color: #30363d; }

.btn-sig { flex: none; width: 100%; padding: 5px 0; font-size: 12px; }
.btn-sig.active { background: #1a2a40; color: #4a9eff; border-color: #2a4888; }

/* Preview chips */
.preview-state {
  display: flex; align-items: center; gap: 5px; flex-wrap: wrap;
  margin-top: 6px; padding: 6px 8px;
  background: #0d1117; border: 1px solid #21262d; border-radius: 5px;
}
.preview-label { font-size: 10px; color: #4a5568; }
.chip {
  font-size: 10px; font-weight: 700; padding: 2px 7px;
  border-radius: 10px; border: 1px solid transparent;
}
.chip-nominal { background: #0d2218; color: #30e060; border-color: #1a5030; }
.chip-standby { background: #221808; color: #ffa020; border-color: #604a10; }
.chip-fault   { background: #220810; color: #ff3040; border-color: #801020; }
.chip-off     { background: #161616; color: #6e7681; border-color: #30363d; }
.chip-sig     { background: #1a2a40; color: #4a9eff; border-color: #2a4888; }

/* Font size row */
.font-size-row { display: flex; gap: 6px; align-items: center; }
.font-size-input { width: 62px; flex-shrink: 0; }
.font-size-range {
  flex: 1; accent-color: #4a9eff;
  height: 4px; cursor: pointer;
}
</style>
