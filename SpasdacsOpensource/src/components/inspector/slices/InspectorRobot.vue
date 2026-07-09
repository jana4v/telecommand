<template>
  <section class="section">
    <h4 class="section-title">Robot Settings</h4>

    <!-- Label -->
    <label class="field">
      <span>Label</span>
      <input class="input" type="text" placeholder="e.g. ASTRO-1"
        :value="data.name ?? ''"
        @change="set('name', ($event.target as HTMLInputElement).value)" />
    </label>

    <!-- Accent / eye color -->
    <label class="field">
      <span>Accent Color <small style="opacity:0.55">(eyes · reactor · LEDs)</small></span>
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

    <!-- Posture -->
    <div class="field">
      <span>Posture</span>
      <div class="btn-group">
        <button
          v-for="opt in POSTURE_OPTS" :key="opt.value"
          class="btn" :class="{ active: currentPosture === opt.value }"
          @click="set('posture', opt.value)">
          {{ opt.label }}
        </button>
      </div>
      <span class="field-hint">Lift-off posture is Reclined (looking up to overhead monitor). Upright uses front monitor.</span>
    </div>

    <div class="divider" />
    <p class="sub-title">Arm Control</p>

    <!-- Right arm -->
    <div class="field">
      <span>Right Hand Command</span>
      <div class="btn-group">
        <button
          v-for="opt in ARM_OPTS" :key="opt.value"
          class="btn" :class="{ active: currentRightArm === opt.value }"
          @click="set('rightArm', opt.value)">
          {{ opt.label }}
        </button>
      </div>
      <span class="field-hint">Presses RIGHT monitor button with right hand when active.</span>
    </div>

    <!-- Left arm -->
    <div class="field">
      <span>Left Hand Command</span>
      <div class="btn-group">
        <button
          v-for="opt in ARM_OPTS" :key="opt.value"
          class="btn" :class="{ active: currentLeftArm === opt.value }"
          @click="set('leftArm', opt.value)">
          {{ opt.label }}
        </button>
      </div>
      <span class="field-hint">Presses LEFT monitor button with left hand when active.</span>
    </div>

    <!-- Namaste (overrides both arms) -->
    <div class="field">
      <span>Namaste <small style="opacity:0.55">(overrides arm states)</small></span>
      <button
        class="btn btn-namaste" :class="{ active: isNameste }"
        @click="toggleNameste">
        🙏 {{ isNameste ? 'Active' : 'Inactive' }}
      </button>
      <span class="field-hint">Telemetry: true / false — both hands in prayer position</span>
    </div>

    <!-- Live preview hint -->
    <div class="preview-state">
      <span class="preview-label">Current state:</span>
      <span class="chip" :class="isNameste ? 'chip-accent' : 'chip-dim'">
        {{ isNameste ? '🙏 Namaste' : (currentPosture === 'upright' ? '🧍 Upright' : '🪑 Reclined') }}
      </span>
      <span v-if="!isNameste && currentRightArm === 'forward'" class="chip chip-arm">R→</span>
      <span v-if="!isNameste && currentLeftArm  === 'forward'" class="chip chip-arm">←L</span>
    </div>    <label class="field">
      <span>Title Font Size ({{ data.titleFontSize ?? 'auto' }}{{ data.titleFontSize ? 'px' : '' }})</span>
      <div class="slider-row">
        <input class="slider" type="range" min="6" max="24" step="1"
          :value="data.titleFontSize ?? 9"
          @input="set('titleFontSize', Number(($event.target as HTMLInputElement).value))" />
        <span class="slider-val">{{ data.titleFontSize ?? 'auto' }}{{ data.titleFontSize ? 'px' : '' }}</span>
      </div>
    </label>  </section>
</template>

<script setup lang="ts">
import { computed } from "vue";
import type { InspectorSetter } from "../inspectorTypes";

const props = defineProps<{
  data: Record<string, any>;
  set: InspectorSetter;
}>();

const POSTURE_OPTS = [
  { value: "reclined", label: "Reclined" },
  { value: "upright",  label: "Upright"  },
];
const ARM_OPTS = [
  { value: "down",    label: "Idle"  },
  { value: "forward", label: "Press" },
];

const TRUTHY = ["1","true","on","yes","upright","up","forward","fwd","extend","namaste","pray","standing"];

function normalize(val: any, trueWord: string, falseWord: string): string {
  if (val == null) return falseWord;
  return TRUTHY.includes(String(val).toLowerCase().trim()) ? trueWord : falseWord;
}

const currentPosture  = computed(() => normalize(props.data.posture,  "upright",  "reclined"));
const currentRightArm = computed(() => normalize(props.data.rightArm, "forward", "down"));
const currentLeftArm  = computed(() => normalize(props.data.leftArm,  "forward", "down"));
const isNameste       = computed(() => {
  const v = props.data.namaste;
  if (v == null) return false;
  return ["1","true","on","yes","namaste","pray"].includes(String(v).toLowerCase().trim());
});

function toggleNameste() {
  props.set("namaste", isNameste.value ? "false" : "true");
}
</script>

<style scoped>
.sub-title {
  font-size: 10px; font-weight: 700; color: #7090a8;
  text-transform: uppercase; letter-spacing: 0.06em;
  margin: 2px 0 6px 0;
}
.divider { height: 1px; background: #21262d; margin: 8px 0; }

.field {
  display: flex; flex-direction: column; gap: 3px; margin-bottom: 8px;
}
.field > span:first-child {
  font-size: 10px; color: #8b949e; text-transform: uppercase; letter-spacing: 0.04em;
}
.field-hint {
  font-size: 10px; color: #4a5568; line-height: 1.4;
}

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

/* Button group (segmented control) */
.btn-group { display: flex; gap: 3px; }
.btn {
  flex: 1; padding: 4px 0; font-size: 11px; font-weight: 600;
  border: 1px solid #30363d; border-radius: 4px;
  background: #0d1117; color: #8b949e; cursor: pointer;
  transition: background 0.15s, color 0.15s, border-color 0.15s;
}
.btn:hover { background: #161b22; color: #c9d1d9; }
.btn.active { background: #1a3a5c; color: #4a9eff; border-color: #2a5090; }

.btn-namaste {
  flex: none; width: 100%; padding: 5px 0; font-size: 12px;
}
.btn-namaste.active { background: #2a1a3c; color: #c890ff; border-color: #6030a0; }

/* Live state preview chips */
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
.chip-accent { background: #1a2a3a; color: #4a9eff; border-color: #2a4a6a; }
.chip-dim    { background: #161b22; color: #6a7a8a; border-color: #21262d; }
.chip-arm    { background: #1a3020; color: #40c070; border-color: #204030; font-family: monospace; }
</style>
