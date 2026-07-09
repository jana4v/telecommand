<template>
  <section class="section">

    <!-- ══════════════════════════════════════════════════════
         STATE PREVIEW
    ══════════════════════════════════════════════════════════ -->
    <h4 class="section-title">State Preview</h4>

    <div class="spst-state-row">
      <button
        :class="['spst-state-btn', 'spst-btn-close', { active: isClosed }]"
        @click="setClose"
        title="Switch CLOSE — blade moves to horizontal"
      >
        <span class="spst-indicator close-ind"></span> CLOSE
      </button>
      <button
        :class="['spst-state-btn', 'spst-btn-open', { active: !isClosed }]"
        @click="setOpen"
        title="Switch OPEN — blade swings up"
      >
        <span class="spst-indicator open-ind"></span> OPEN
      </button>
    </div>
    <p class="hint">Click to preview the 1 s blade animation.</p>

    <!-- ══════════════════════════════════════════════════════
         COLORS
    ══════════════════════════════════════════════════════════ -->
    <h4 class="section-title" style="margin-top:10px">Colors</h4>

    <label class="field">
      <span>Blade Color (CLOSE)</span>
      <div class="color-row">
        <input type="color" class="color-picker" :value="activeColor"
          @input="applyActiveColor(($event.target as HTMLInputElement).value)" />
        <input class="input" :value="activeColor"
          @change="applyActiveColor(($event.target as HTMLInputElement).value)" />
      </div>
    </label>

    <label class="field">
      <span>Wire Color (OPEN)</span>
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
      Bind a telemetry mnemonic to drive CLOSE/OPEN automatically.
    </p>

    <label class="field">
      <span>Mnemonic</span>
      <input
        class="input"
        v-model="mnemonicInput"
        placeholder="e.g. SW_STATE"
        :list="`spst-mn-${uid}`"
        autocomplete="off"
      />
      <datalist :id="`spst-mn-${uid}`">
        <option v-for="m in mnemonicHints" :key="m" :value="m" />
      </datalist>
    </label>

    <label class="field">
      <span>Value → CLOSE</span>
      <input class="input" v-model="closeValueInput" placeholder="e.g. 1 or CLOSE" />
    </label>

    <label class="field">
      <span>Value → OPEN</span>
      <input class="input" v-model="openValueInput" placeholder="e.g. 0 or OPEN" />
    </label>

    <button
      class="spst-apply-btn"
      :disabled="!mnemonicInput.trim()"
      @click="applyBinding"
    >⚡ Apply Binding</button>

    <div v-if="currentTopic" class="spst-binding-chip">
      <span class="chip-icon">📡</span>
      <span class="chip-topic">{{ currentTopic }}</span>
      <span class="chip-arrow">→ statusColor</span>
      <button class="chip-remove" @click="removeBinding" title="Remove">✕</button>
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

const uid = Math.random().toString(36).slice(2, 7);

// ── Computed from node data ──────────────────────────────────────────────────
const activeColor = computed(() => (props.data.activeColor as string) || "#9b59b6");
const lineColor   = computed(() => (props.data.lineColor   as string) || "#7a7a9a");
const isClosed    = computed(() => !!props.data.statusColor);

const mnemonicHints = computed<string[]>(() =>
  Array.isArray(props.data.hoverMnemonics) ? props.data.hoverMnemonics : []
);

const statusBinding = computed<TelemetryBinding | undefined>(() =>
  ((props.data.telemetryBindings ?? []) as TelemetryBinding[])
    .find((b) => b.targetProp === "statusColor")
);
const currentTopic = computed(() => statusBinding.value?.topic ?? "");

// ── Local form state ─────────────────────────────────────────────────────────
const mnemonicInput  = ref((props.data.onMnemonic  as string) || currentTopic.value || "");
const closeValueInput = ref((props.data.closeValue as string) || "1");
const openValueInput  = ref((props.data.openValue  as string) || "0");

// ── Actions ──────────────────────────────────────────────────────────────────
function setClose() { props.set("statusColor", activeColor.value); }
function setOpen()  { props.set("statusColor", ""); }

function applyActiveColor(color: string) {
  props.set("activeColor", color);
  if (isClosed.value) props.set("statusColor", color);
}

function applyBinding() {
  const mnem  = mnemonicInput.value.trim();
  if (!mnem) return;

  const closeVal = closeValueInput.value.trim() || "1";
  const openVal  = openValueInput.value.trim()  || "0";
  const col      = activeColor.value;

  const transform = `String(value) === '${closeVal}' ? '${col}' : ''`;

  const existing: TelemetryBinding[] =
    (props.data.telemetryBindings ?? []) as TelemetryBinding[];

  const newBinding: TelemetryBinding = {
    id:          `spst-${Date.now()}`,
    topic:       mnem,
    targetProp:  "statusColor",
    transform,
  };

  props.set("telemetryBindings", [
    ...existing.filter((b) => b.targetProp !== "statusColor"),
    newBinding,
  ]);

  props.set("onMnemonic",  mnem);
  props.set("closeValue",  closeVal);
  props.set("openValue",   openVal);
}

function removeBinding() {
  const existing: TelemetryBinding[] =
    (props.data.telemetryBindings ?? []) as TelemetryBinding[];
  props.set("telemetryBindings", existing.filter((b) => b.targetProp !== "statusColor"));
  props.set("onMnemonic", "");
  mnemonicInput.value = "";
}
</script>

<style scoped>
/* ── State toggle ─────────────────────────────────────────────────────────── */
.spst-state-row {
  display: flex;
  gap: 8px;
  margin-bottom: 4px;
}
.spst-state-btn {
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
.spst-state-btn:hover { border-color: #4a5568; color: #c0ccd8; }
.spst-btn-close.active { background: rgba(155,89,182,0.2); border-color: #9b59b6; color: #c39bd3; }
.spst-btn-open.active  { background: rgba(100,116,139,0.18); border-color: #64748b; color: #c0ccd8; }

.spst-indicator {
  width: 8px; height: 8px;
  border-radius: 50%;
}
.spst-indicator.close-ind { background: #9b59b6; box-shadow: 0 0 5px #9b59b6; }
.spst-indicator.open-ind  { background: #475569; }

/* ── Apply button ─────────────────────────────────────────────────────────── */
.spst-apply-btn {
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
.spst-apply-btn:hover:not(:disabled) {
  background: #243648;
  border-color: #7ec8e3;
  color: #b0e4f8;
}
.spst-apply-btn:disabled { opacity: 0.4; cursor: default; }

/* ── Binding chip ─────────────────────────────────────────────────────────── */
.spst-binding-chip {
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
.chip-icon  { font-size: 12px; }
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
