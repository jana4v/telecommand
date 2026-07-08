<script setup lang="ts">
import type { ConditionRule, QueryBuilderMnemonic } from '@/components/tm/queryBuilderTypes'
import { computed, nextTick, ref, watch } from 'vue'
import MonacoConditionEditor from '@/components/tm/MonacoConditionEditor.vue'
import QueryBuilder from '@/components/tm/QueryBuilder.vue'
import { generateLogicFromRules, parseLogicToRule } from '@/composables/tm/conditionLogic'

type EditorType = 'visualBuilder' | 'monacoEditor'

const props = withDefaults(defineProps<{
  modelValue: string
  rule?: ConditionRule | null
  mnemonics?: QueryBuilderMnemonic[]
  subsystems?: string[]
  subsystemOptions?: string[]
  showSubsystemSelector?: boolean
  height?: string
  defaultType?: EditorType
}>(), {
  rule: null,
  mnemonics: () => [],
  subsystems: () => [],
  subsystemOptions: () => [],
  showSubsystemSelector: true,
  height: '42vh',
  defaultType: 'visualBuilder',
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
  'update:rule': [value: ConditionRule | null]
  'update:subsystems': [value: string[]]
}>()

const editorType = ref<EditorType>(
  props.defaultType
    || (props.modelValue && !parseLogicToRule(props.modelValue) ? 'monacoEditor' : 'visualBuilder'),
)

const logic = computed({
  get: () => props.modelValue,
  set: v => emit('update:modelValue', v),
})

const rule = computed({
  get: () => props.rule ?? null,
  set: v => emit('update:rule', v ?? null),
})

const subsystems = computed({
  get: () => props.subsystems,
  set: v => emit('update:subsystems', v),
})

const previewLogic = computed(() => {
  if (editorType.value === 'visualBuilder' && rule.value)
    return generateLogicFromRules(rule.value)
  return logic.value
})

let syncing = false

watch(rule, async (next) => {
  if (syncing || editorType.value !== 'visualBuilder')
    return
  const generated = next ? generateLogicFromRules(next) : ''
  if (generated === logic.value)
    return
  syncing = true
  logic.value = generated
  // Reset the guard only after Vue has flushed the resulting watcher cycle.
  // Resetting synchronously lets the next watcher fire while the guard is
  // already false, causing an update loop in deep-watched bidirectional v-models.
  await nextTick()
  syncing = false
}, { deep: true, immediate: true })

watch(logic, async (next) => {
  if (syncing || editorType.value !== 'monacoEditor')
    return
  const parsed = parseLogicToRule(next)
  if (!parsed)
    return
  syncing = true
  rule.value = parsed
  await nextTick()
  syncing = false
})

function switchType(next: EditorType) {
  if (next === editorType.value)
    return

  if (next === 'monacoEditor') {
    if (rule.value)
      logic.value = generateLogicFromRules(rule.value)
    editorType.value = next
    return
  }

  const draft = String(logic.value || '').trim()
  const parsed = draft ? parseLogicToRule(draft) : null
  if (draft && !parsed)
    return
  if (parsed)
    rule.value = parsed
  editorType.value = next
}
</script>

<template>
  <div class="cond-editor">
    <div class="cond-toolbar">
      <Button
        label="Visual Builder"
        size="small"
        :outlined="editorType !== 'visualBuilder'"
        @click="switchType('visualBuilder')"
      />
      <Button
        label="Monaco Editor"
        size="small"
        :outlined="editorType !== 'monacoEditor'"
        @click="switchType('monacoEditor')"
      />
    </div>

    <div class="cond-panel mt-3">
      <div v-if="editorType === 'visualBuilder'" class="builder-wrap">
        <div v-if="props.showSubsystemSelector" class="control-item condition-subsystems mb-3">
          <label class="label">Condition Subsystems</label>
          <MultiSelect
            v-model="subsystems"
            :options="props.subsystemOptions"
            placeholder="Select subsystem(s) for condition..."
            class="w-full"
            :filter="true"
            :max-selected-labels="3"
          />
        </div>
        <QueryBuilder
          v-model="rule"
          :mnemonics="props.mnemonics"
          mode="full"
        />
      </div>

      <div v-else class="monaco-wrap">
        <MonacoConditionEditor
          v-model="logic"
          :mnemonics="props.mnemonics"
          :height="props.height"
        />
      </div>
    </div>

    <div class="condition-preview mt-3">
      <label class="label">Formatted Preview</label>
      <div class="preview-box">
        {{ previewLogic || '(empty)' }}
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.cond-toolbar {
  display: flex;
  gap: 0.5rem;
}

.control-item {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.label {
  font-weight: 600;
  font-size: 0.9rem;
}

.preview-box {
  padding: 0.6rem 0.8rem;
  border-radius: 0.4rem;
  background: var(--surface-100, rgba(127, 127, 127, 0.1));
  font-family: var(--font-family-mono, monospace);
  white-space: pre-wrap;
  word-break: break-word;
}
</style>
