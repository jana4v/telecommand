<template>
  <section class="section">
    <h4 class="section-title">Text Box</h4>

    <!-- ── Static fallback text ─────────────────────────────────────── -->
    <label class="field">
      <span>Static Text <small class="hint-inline">(shown when no mnemonic bound)</small></span>
      <textarea class="input tb-textarea" rows="3"
        :value="data.staticText ?? ''"
        @change="set('staticText', ($event.target as HTMLTextAreaElement).value)"
        placeholder="Text to display…"
      />
    </label>

    <!-- ── Text mnemonic ─────────────────────────────────────────────── -->
    <label class="field">
      <span>Text Mnemonic <small class="hint-inline">(live TM overrides static)</small></span>
      <input class="input topic-input"
        :value="textTopic"
        @change="onTextTopicChange(($event.target as HTMLInputElement).value)"
        placeholder="e.g. SC_TELEMETRY_MSG" />
    </label>

    <div class="sep" />

    <!-- ── Colour mnemonic + conditions ─────────────────────────────── -->
    <label class="field">
      <span>Color Source Mnemonic</span>
      <input class="input topic-input"
        :value="colorTopic"
        @change="onColorTopicChange(($event.target as HTMLInputElement).value)"
        placeholder="e.g. SC_MODE (optional)" />
    </label>

    <!-- Condition rows -->
    <div v-if="colorTopic.trim()" class="cond-section">
      <div class="cond-header">
        <span class="cond-title">Colour Conditions</span>
        <small class="cond-hint">Evaluated top-to-bottom; first match wins</small>
      </div>

      <div v-for="(cond, i) in localConditions" :key="i" class="cond-row">
        <span class="cond-idx">{{ i + 1 }}</span>
        <div class="cond-fields">
          <input class="input cond-expr"
            :value="cond.condition"
            placeholder='e.g. v === "FAULT" or v > 100'
            @change="updateCondition(i, 'condition', ($event.target as HTMLInputElement).value)"
          />
          <div class="cond-color-row">
            <input type="color" class="color-picker"
              :value="cond.color || '#ffffff'"
              @input="updateCondition(i, 'color', ($event.target as HTMLInputElement).value)" />
            <input class="input color-hex"
              :value="cond.color || '#ffffff'"
              maxlength="7"
              @change="updateCondition(i, 'color', ($event.target as HTMLInputElement).value)" />
            <span class="cond-color-preview" :style="{ background: cond.color || '#ffffff' }" />
          </div>
        </div>
        <button class="btn-del" @click="removeCondition(i)" title="Remove">×</button>
      </div>

      <!-- Add condition -->
      <button class="btn-add-cond" @click="addCondition">+ Add Condition</button>
    </div>

    <div class="sep" />

    <!-- ── Text appearance ───────────────────────────────────────────── -->
    <label class="field">
      <span>Default Text Color</span>
      <div class="color-row">
        <input type="color" class="color-picker"
          :value="data.textColor || '#c9d1d9'"
          @input="set('textColor', ($event.target as HTMLInputElement).value)" />
        <input class="input color-hex"
          :value="data.textColor || '#c9d1d9'"
          maxlength="7"
          @change="set('textColor', ($event.target as HTMLInputElement).value)" />
      </div>
    </label>

    <label class="field">
      <span>Font Size ({{ data.fontSize ?? 13 }}px)</span>
      <div class="slider-row">
        <input class="slider" type="range" min="8" max="72" step="1"
          :value="data.fontSize ?? 13"
          @input="set('fontSize', Number(($event.target as HTMLInputElement).value))" />
        <span class="slider-val">{{ data.fontSize ?? 13 }}px</span>
      </div>
    </label>

    <label class="field">
      <span>Font Family</span>
      <select class="input"
        :value="data.fontFamily || 'system'"
        @change="set('fontFamily', fontFamilyMap[($event.target as HTMLSelectElement).value])">
        <option value="system">System UI (default)</option>
        <option value="mono">Monospace (Courier New)</option>
        <option value="serif">Serif (Georgia)</option>
        <option value="sans">Sans-serif (Arial)</option>
      </select>
    </label>

    <div class="sep" />

    <!-- ── Box appearance ────────────────────────────────────────────── -->
    <label class="field">
      <span>Background Color</span>
      <div class="color-row">
        <input type="color" class="color-picker"
          :value="data.bgColor || '#0d1117'"
          @input="set('bgColor', ($event.target as HTMLInputElement).value)" />
        <input class="input color-hex"
          :value="data.bgColor || '#0d1117'"
          maxlength="7"
          @change="set('bgColor', ($event.target as HTMLInputElement).value)" />
      </div>
    </label>

    <label class="field">
      <span>Border Color</span>
      <div class="color-row">
        <input type="color" class="color-picker"
          :value="data.borderColor || '#2a3a4a'"
          @input="set('borderColor', ($event.target as HTMLInputElement).value)" />
        <input class="input color-hex"
          :value="data.borderColor || '#2a3a4a'"
          maxlength="7"
          @change="set('borderColor', ($event.target as HTMLInputElement).value)" />
      </div>
    </label>

    <label class="field">
      <span>Title Bar Color</span>
      <div class="color-row">
        <input type="color" class="color-picker"
          :value="data.titleBarBg || '#0e1f30'"
          @input="set('titleBarBg', ($event.target as HTMLInputElement).value)" />
        <input class="input color-hex"
          :value="data.titleBarBg || '#0e1f30'"
          maxlength="7"
          @change="set('titleBarBg', ($event.target as HTMLInputElement).value)" />
      </div>
    </label>

    <label class="field">
      <span>Title Font ({{ data.titleFontSize ?? 12 }}px)</span>
      <div class="slider-row">
        <input class="slider" type="range" min="6" max="80" step="1"
          :value="data.titleFontSize ?? 12"
          @input="set('titleFontSize', Number(($event.target as HTMLInputElement).value))" />
        <span class="slider-val">{{ data.titleFontSize ?? 12 }}px</span>
      </div>
    </label>

  </section>
</template>

<script setup lang="ts">
import { ref, watch, computed } from "vue";
import type { InspectorSetter } from "../inspectorTypes";
import { buildTextBoxBindings } from "../../../graph/textBoxUtils";

interface ColorCondition { condition: string; color: string; }

const props = defineProps<{
  data: Record<string, any>;
  set: InspectorSetter;
}>();

// ── Mnemonic topics ───────────────────────────────────────────────────────
const textTopic  = computed(() => (props.data.textTopic  as string) || "");
const colorTopic = computed(() => (props.data.colorTopic as string) || "");

function syncBindings(newText: string, newColor: string) {
  props.set("telemetryBindings",
    buildTextBoxBindings(newText, newColor, props.data.telemetryBindings ?? []));
}

function onTextTopicChange(v: string) {
  props.set("textTopic", v.trim());
  syncBindings(v.trim(), colorTopic.value);
}
function onColorTopicChange(v: string) {
  props.set("colorTopic", v.trim());
  syncBindings(textTopic.value, v.trim());
}

// ── Colour conditions ─────────────────────────────────────────────────────
const localConditions = ref<ColorCondition[]>(
  (props.data.colorConditions as ColorCondition[]) ?? []
);

watch(() => props.data.colorConditions, (v) => {
  localConditions.value = (v as ColorCondition[]) ?? [];
}, { immediate: true });

function commitConditions(conds: ColorCondition[]) {
  props.set("colorConditions", conds);
}
function addCondition() {
  commitConditions([...localConditions.value, { condition: "", color: "#00e5ff" }]);
}
function removeCondition(idx: number) {
  commitConditions(localConditions.value.filter((_, i) => i !== idx));
}
function updateCondition(idx: number, key: keyof ColorCondition, val: string) {
  commitConditions(localConditions.value.map((c, i) =>
    i === idx ? { ...c, [key]: val } : c
  ));
}

// ── Font family map (select value → CSS string) ───────────────────────────
const fontFamilyMap: Record<string, string> = {
  system: "'Segoe UI', system-ui, sans-serif",
  mono:   "'Courier New', monospace",
  serif:  "Georgia, serif",
  sans:   "Arial, Helvetica, sans-serif",
};
</script>

<style scoped>
.sep { height: 1px; background: #1c2430; margin: 8px 0; }

.tb-textarea {
  resize: vertical;
  min-height: 48px;
  font-size: 11px !important;
  font-family: monospace;
  line-height: 1.45;
}

.topic-input { color: #4a9eff !important; font-size: 10px !important; }

/* Colour conditions */
.cond-section {
  background: rgba(74,158,255,0.04);
  border: 1px solid rgba(74,158,255,0.12);
  border-radius: 5px;
  padding: 6px 8px;
  margin: 4px 0 6px;
}
.cond-header { display: flex; flex-direction: column; margin-bottom: 5px; }
.cond-title  { font-size: 10px; color: #4a9eff; font-weight: 600; text-transform: uppercase; letter-spacing: 0.06em; }
.cond-hint   { font-size: 9px; color: #4a5568; margin-top: 1px; }

.cond-row {
  display: flex; align-items: flex-start; gap: 4px;
  margin-bottom: 5px; padding-bottom: 5px;
  border-bottom: 1px solid rgba(255,255,255,0.04);
}
.cond-idx  { font-size: 9px; color: #4a5568; min-width: 12px; padding-top: 5px; }
.cond-fields { flex: 1; display: flex; flex-direction: column; gap: 3px; }
.cond-expr   { font-size: 9px !important; font-family: 'Courier New', monospace !important; }

.cond-color-row {
  display: flex; align-items: center; gap: 5px;
}
.cond-color-preview {
  width: 14px; height: 14px; border-radius: 2px;
  border: 1px solid rgba(255,255,255,0.15); flex-shrink: 0;
}

.btn-add-cond {
  width: 100%; padding: 4px;
  background: rgba(74,158,255,0.08); color: #4a9eff;
  border: 1px dashed rgba(74,158,255,0.25); border-radius: 4px;
  font-size: 10px; font-weight: 600; cursor: pointer; margin-top: 3px;
}
.btn-add-cond:hover { background: rgba(74,158,255,0.18); }

.btn-del {
  background: none; border: none; color: #4a5568;
  font-size: 14px; cursor: pointer; padding: 0 2px; flex-shrink: 0;
}
.btn-del:hover { color: #e74c3c; }

/* Color controls */
.color-row  { display: flex; align-items: center; gap: 6px; }
.color-picker { width: 28px; height: 22px; border: 1px solid #2a3a4a; border-radius: 3px; padding: 1px; cursor: pointer; background: transparent; }
.color-hex  { flex: 1; font-size: 10px !important; padding: 3px 5px !important; font-family: monospace; }

/* Sliders */
.slider-row { display: flex; align-items: center; gap: 6px; }
.slider     { flex: 1; accent-color: #4a9eff; }
.slider-val { font-size: 10px; color: #6a8898; min-width: 32px; text-align: right; font-family: monospace; }

.hint-inline { font-size: 9px; color: #4a5568; font-weight: 400; }
</style>
