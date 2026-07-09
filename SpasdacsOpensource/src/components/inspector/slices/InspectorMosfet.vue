<template>
  <section class="section">

    <!-- ══════════════════════════════════════════════════════
         STATE PREVIEW
    ══════════════════════════════════════════════════════════ -->
    <h4 class="section-title">State Preview</h4>

    <div class="mosfet-state-row">
      <button
        :class="['mosfet-state-btn', 'mosfet-btn-on', { active: isOn }]"
        @click="turnOn"
        title="Switch ON — shows the animation"
      >
        <span class="mosfet-indicator on"></span> ON
      </button>
      <button
        :class="['mosfet-state-btn', 'mosfet-btn-off', { active: !isOn }]"
        @click="turnOff"
        title="Switch OFF"
      >
        <span class="mosfet-indicator off"></span> OFF
      </button>
    </div>
    <p class="hint">Toggle in the editor to preview the ON animation.</p>

    <!-- ══════════════════════════════════════════════════════
         COLORS
    ══════════════════════════════════════════════════════════ -->
    <h4 class="section-title" style="margin-top:10px">Colors</h4>

    <!-- ON / Active color -->
    <label class="field">
      <span>ON Color</span>
      <div class="color-row">
        <input type="color" class="color-picker" :value="activeColor"
          @input="applyActiveColor(($event.target as HTMLInputElement).value)" />
        <input class="input" :value="activeColor"
          @change="applyActiveColor(($event.target as HTMLInputElement).value)" />
      </div>
    </label>

    <!-- Wire / Line color (OFF state) -->
    <label class="field">
      <span>Line Color (OFF)</span>
      <div class="color-row">
        <input type="color" class="color-picker" :value="lineColor"
          @input="set('lineColor', ($event.target as HTMLInputElement).value)" />
        <input class="input" :value="lineColor"
          @change="set('lineColor', ($event.target as HTMLInputElement).value)" />
      </div>
    </label>

    <!-- ══════════════════════════════════════════════════════
         MNEMONIC BINDING
    ══════════════════════════════════════════════════════════ -->
    <h4 class="section-title" style="margin-top:10px">Mnemonic Binding</h4>
    <p class="hint">
      Select a telemetry mnemonic to drive ON/OFF automatically.
      The binding is written to the node's telemetry list below.
    </p>

    <!-- Mnemonic input with datalist autocomplete -->
    <label class="field">
      <span>Mnemonic</span>
      <input
        class="input"
        v-model="mnemonicInput"
        placeholder="e.g. SW1_STATE"
        :list="`mfet-mn-${uid}`"
        autocomplete="off"
      />
      <datalist :id="`mfet-mn-${uid}`">
        <option v-for="m in mnemonicHints" :key="m" :value="m" />
      </datalist>
    </label>

    <!-- Value that means ON -->
    <label class="field">
      <span>Value → ON</span>
      <input class="input" v-model="onValueInput" placeholder="e.g. 1 or ON" />
    </label>

    <!-- Value that means OFF -->
    <label class="field">
      <span>Value → OFF</span>
      <input class="input" v-model="offValueInput" placeholder="e.g. 0 or OFF" />
    </label>

    <!-- Apply button -->
    <button
      class="mosfet-apply-btn"
      :disabled="!mnemonicInput.trim()"
      @click="applyBinding"
    >⚡ Apply Binding</button>

    <!-- Current binding chip (shows bound mnemonic + remove) -->
    <div v-if="currentTopic" class="mosfet-binding-chip">
      <span class="chip-icon">📡</span>
      <span class="chip-topic">{{ currentTopic }}</span>
      <span class="chip-arrow">→ statusColor</span>
      <button class="chip-remove" @click="removeStatusBinding" title="Remove">✕</button>
    </div>

  </section>
</template>

<script setup lang="ts">
import { ref, computed } from "vue";
import type { InspectorSetter } from "../inspectorTypes";
import type { TelemetryBinding } from "../../../types";

const props = defineProps<{
  data: Record<string, any>;
  set: InspectorSetter;
}>();

// ── Unique ID for datalist (prevents conflicts when multiple nodes selected) ─
const uid = Math.random().toString(36).slice(2, 7);

// ── Computed from node data ──────────────────────────────────────────────────
const activeColor = computed(() => (props.data.activeColor as string) || "#27ae60");
const lineColor   = computed(() => (props.data.lineColor   as string) || "#94a3b8");
const isOn        = computed(() => !!props.data.statusColor);

/** Mnemonic hints stored by the gateway connection (hover mnemonics). */
const mnemonicHints = computed<string[]>(() =>
  Array.isArray(props.data.hoverMnemonics) ? props.data.hoverMnemonics : []
);

/** Existing binding that targets statusColor (if any). */
const statusBinding = computed<TelemetryBinding | undefined>(() =>
  ((props.data.telemetryBindings ?? []) as TelemetryBinding[])
    .find((b) => b.targetProp === "statusColor")
);
const currentTopic = computed(() => statusBinding.value?.topic ?? "");

// ── Local form state (pre-filled from existing binding / data) ───────────────
const mnemonicInput = ref((props.data.onMnemonic as string) || currentTopic.value || "");
const onValueInput  = ref((props.data.onValue    as string) || "1");
const offValueInput = ref((props.data.offValue   as string) || "0");

// ── Actions ──────────────────────────────────────────────────────────────────

function turnOn() {
  props.set("statusColor", activeColor.value);
}

function turnOff() {
  props.set("statusColor", "");
}

/** Change the active color; also keep the live preview in sync if currently ON. */
function applyActiveColor(color: string) {
  props.set("activeColor", color);
  if (isOn.value) props.set("statusColor", color);
}

/**
 * Create (or replace) a statusColor telemetry binding using a JS transform
 * that maps the mnemonic's raw value to a color string:
 *   ON value  → activeColor  (e.g. "#27ae60")
 *   OFF value → ""           (empty = no glow = OFF state)
 */
function applyBinding() {
  const mnem   = mnemonicInput.value.trim();
  if (!mnem) return;

  const onVal  = onValueInput.value.trim()  || "1";
  const offVal = offValueInput.value.trim() || "0";
  const col    = activeColor.value;

  // Works for both string "1" and numeric 1 from telemetry feeds
  const transform = `String(value) === '${onVal}' ? '${col}' : ''`;

  const existing: TelemetryBinding[] =
    (props.data.telemetryBindings ?? []) as TelemetryBinding[];

  // Replace any existing statusColor binding; keep all others
  const others = existing.filter((b) => b.targetProp !== "statusColor");
  const newBinding: TelemetryBinding = {
    id:          `mfet-${Date.now()}`,
    topic:       mnem,
    targetProp:  "statusColor",
    transform,
  };

  props.set("telemetryBindings", [...others, newBinding]);

  // Persist form values so they survive re-selection of the node
  props.set("onMnemonic", mnem);
  props.set("onValue",    onVal);
  props.set("offValue",   offVal);
}

function removeStatusBinding() {
  const existing: TelemetryBinding[] =
    (props.data.telemetryBindings ?? []) as TelemetryBinding[];
  props.set("telemetryBindings", existing.filter((b) => b.targetProp !== "statusColor"));
  props.set("onMnemonic", "");
  mnemonicInput.value = "";
}
</script>

<style scoped>
/* ── State toggle ─────────────────────────────────────────────────────────── */
.mosfet-state-row {
  display: flex;
  gap: 8px;
  margin-bottom: 4px;
}
.mosfet-state-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 6px 10px;
  border-radius: 5px;
  border: 1.5px solid #2d3748;
  background: #1a2535;
  color: #7a8a9a;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s, color 0.15s;
}
.mosfet-state-btn:hover { border-color: #4a5568; color: #c0ccd8; }
.mosfet-btn-on.active  { background: rgba(39,174,96,0.18); border-color: #27ae60; color: #4ade80; }
.mosfet-btn-off.active { background: rgba(100,116,139,0.18); border-color: #64748b; color: #c0ccd8; }

.mosfet-indicator {
  width: 8px; height: 8px;
  border-radius: 50%;
}
.mosfet-indicator.on  { background: #27ae60; box-shadow: 0 0 5px #27ae60; }
.mosfet-indicator.off { background: #475569; }

/* ── Apply button ─────────────────────────────────────────────────────────── */
.mosfet-apply-btn {
  margin-top: 8px;
  width: 100%;
  padding: 6px 12px;
  border-radius: 5px;
  border: 1.5px solid #4a5568;
  background: #1e2d40;
  color: #7ec8e3;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s;
}
.mosfet-apply-btn:hover:not(:disabled) {
  background: #243648;
  border-color: #7ec8e3;
  color: #b0e4f8;
}
.mosfet-apply-btn:disabled { opacity: 0.4; cursor: default; }

/* ── Binding chip ─────────────────────────────────────────────────────────── */
.mosfet-binding-chip {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 8px;
  padding: 5px 8px;
  border-radius: 5px;
  background: rgba(78,158,207,0.12);
  border: 1px solid #2a4a6a;
  font-size: 11px;
}
.chip-icon { font-size: 12px; }
.chip-topic { font-weight: 700; color: #7ec8e3; flex: 1; overflow: hidden; text-overflow: ellipsis; }
.chip-arrow { color: #4a6a8a; white-space: nowrap; }
.chip-remove {
  background: none; border: none; color: #e74c3c; cursor: pointer;
  font-size: 11px; padding: 0 2px; line-height: 1;
}
.chip-remove:hover { color: #ff6b6b; }

/* ── Hint ─────────────────────────────────────────────────────────────────── */
.hint { font-size: 11px; color: #7a8a9a; line-height: 1.45; margin: 2px 0 6px 0; }
</style>
