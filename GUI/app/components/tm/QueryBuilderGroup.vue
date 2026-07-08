<script setup lang="ts">
import { computed } from 'vue'
import type { ConditionRule, QueryBuilderMnemonic } from '@/components/tm/queryBuilderTypes'

defineOptions({ name: 'QueryBuilderGroup' })

const props = withDefaults(defineProps<{
  modelValue: ConditionRule
  mnemonics: QueryBuilderMnemonic[]
  isRoot?: boolean
  mode?: 'compact' | 'full'
}>(), {
  isRoot: false,
  mode: 'full',
})

const emit = defineEmits<{
  'update:modelValue': [value: ConditionRule]
}>()

const mnemonicMap = computed(() => {
  const map = new Map<string, QueryBuilderMnemonic>()
  for (const item of props.mnemonics) {
    map.set(item.mnemonic, item)
  }
  return map
})

const operatorsByType: Record<string, Array<{ label: string, value: string }>> = {
  analog: [
    { label: 'equal', value: '==' },
    { label: 'not equal', value: '!=' },
    { label: 'greater', value: '>' },
    { label: 'greater or equal', value: '>=' },
    { label: 'less', value: '<' },
    { label: 'less or equal', value: '<=' },
  ],
  discrete: [
    { label: 'equal', value: '==' },
    { label: 'not equal', value: '!=' },
    { label: 'contains', value: 'contains' },
    { label: 'not contains', value: '!contains' },
  ],
}

const group = computed({
  get: () => props.modelValue,
  set: value => emit('update:modelValue', value),
})

function cloneRule<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}

function createId(prefix: 'group' | 'rule'): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2, 8)}`
}

function firstMnemonic(): QueryBuilderMnemonic | undefined {
  return props.mnemonics[0]
}

function firstOperator(item?: QueryBuilderMnemonic): string {
  if (!item)
    return '=='
  const kind = item.type.toUpperCase() === 'ANALOG' ? 'analog' : 'discrete'
  return operatorsByType[kind][0]?.value || '=='
}

function defaultValue(item?: QueryBuilderMnemonic): string {
  if (!item)
    return ''
  if (item.defaultValue)
    return item.defaultValue
  if (item.valueSuggestions?.length)
    return item.valueSuggestions[0] || ''
  if (typeof item.minValue === 'number')
    return String(item.minValue)
  return ''
}

function createRule(): ConditionRule {
  const item = firstMnemonic()
  return {
    id: createId('rule'),
    type: 'rule',
    mnemonic: item?.mnemonic || '',
    mnemonicType: item?.type || '',
    condition: firstOperator(item),
    value: defaultValue(item),
    negate: false,
  }
}

function createGroup(): ConditionRule {
  return {
    id: createId('group'),
    type: 'group',
    operator: 'AND',
    rules: [createRule()],
  }
}

function updateGroup(updater: (draft: ConditionRule) => void) {
  const draft = cloneRule(group.value)
  updater(draft)
  group.value = draft
}

function addRule() {
  updateGroup((draft) => {
    draft.rules = [...(draft.rules || []), createRule()]
  })
}

function addGroup() {
  updateGroup((draft) => {
    draft.rules = [...(draft.rules || []), createGroup()]
  })
}

function removeChild(childId: string) {
  updateGroup((draft) => {
    draft.rules = (draft.rules || []).filter(rule => rule.id !== childId)
  })
}

function updateChild(nextChild: ConditionRule) {
  updateGroup((draft) => {
    draft.rules = (draft.rules || []).map(rule => rule.id === nextChild.id ? nextChild : rule)
  })
}

function updateGroupOperator(operator: 'AND' | 'OR') {
  updateGroup((draft) => {
    draft.operator = operator
  })
}

function updateRuleField(ruleId: string, patch: Partial<ConditionRule>) {
  updateGroup((draft) => {
    draft.rules = (draft.rules || []).map((rule) => {
      if (rule.id !== ruleId)
        return rule

      const nextRule = { ...rule, ...patch }
      if (patch.mnemonic !== undefined) {
        const item = mnemonicMap.value.get(String(patch.mnemonic))
        nextRule.mnemonicType = item?.type || ''
        nextRule.condition = firstOperator(item)
        nextRule.value = defaultValue(item)
      }
      return nextRule
    })
  })
}

function operatorOptions(rule: ConditionRule) {
  const item = mnemonicMap.value.get(rule.mnemonic || '')
  const kind = item?.type.toUpperCase() === 'ANALOG' ? 'analog' : 'discrete'
  return operatorsByType[kind]
}

function usesSelect(item?: QueryBuilderMnemonic): boolean {
  return Boolean(item?.valueSuggestions?.length)
}

function usesSlider(item?: QueryBuilderMnemonic): boolean {
  return item?.type.toUpperCase() === 'ANALOG'
    && typeof item.minValue === 'number'
    && typeof item.maxValue === 'number'
    && item.minValue < item.maxValue
}

function sliderStep(item?: QueryBuilderMnemonic): number {
  if (!item || typeof item.minValue !== 'number' || typeof item.maxValue !== 'number')
    return 1
  const span = Math.abs(item.maxValue - item.minValue)
  if (span >= 1000)
    return 1
  if (span >= 100)
    return 0.5
  if (span >= 10)
    return 0.1
  return 0.01
}

function sliderValue(rule: ConditionRule, item?: QueryBuilderMnemonic): number {
  const raw = Number(rule.value)
  if (!item || typeof item.minValue !== 'number' || typeof item.maxValue !== 'number')
    return Number.isFinite(raw) ? raw : 0
  if (Number.isFinite(raw) && raw >= item.minValue && raw <= item.maxValue)
    return raw
  return item.minValue
}

function formatNumeric(value: number | null | undefined): string {
  return typeof value === 'number' ? String(value) : ''
}

function onSliderInput(ruleId: string, value: string) {
  updateRuleField(ruleId, { value })
}
</script>

<template>
  <div class="qb-group" :class="[{ 'qb-root': isRoot }, `qb-${mode}`]">
    <div class="qb-group-header">
      <div v-if="!isRoot" class="qb-branch" />
      <div class="qb-toolbar">
        <button type="button" class="qb-btn qb-btn-success" @click="addRule">
          Add rule
        </button>
        <button type="button" class="qb-btn qb-btn-success" @click="addGroup">
          Add group
        </button>
        <button
          type="button"
          class="qb-btn qb-btn-primary"
          :class="{ 'is-active': (group.operator || 'AND') === 'AND' }"
          @click="updateGroupOperator('AND')"
        >
          &amp;&amp;
        </button>
        <button
          type="button"
          class="qb-btn qb-btn-primary"
          :class="{ 'is-active': (group.operator || 'AND') === 'OR' }"
          @click="updateGroupOperator('OR')"
        >
          ||
        </button>
      </div>
    </div>

    <div class="qb-group-body">
      <div
        v-for="child in group.rules || []"
        :key="child.id"
        class="qb-item"
      >
        <QueryBuilderGroup
          v-if="child.type === 'group'"
          :model-value="child"
          :mnemonics="mnemonics"
          :mode="mode"
          @update:model-value="updateChild"
        />

        <div v-else class="qb-rule">
          <div class="qb-rule-actions">
            <button type="button" class="qb-btn qb-btn-danger" @click="removeChild(child.id)">
              Delete
            </button>
          </div>

          <div class="qb-rule-grid">
            <select
              class="qb-select qb-mnemonic"
              :value="child.mnemonic"
              @change="updateRuleField(child.id, { mnemonic: ($event.target as HTMLSelectElement).value })"
            >
              <option v-for="item in mnemonics" :key="item.mnemonic" :value="item.mnemonic">
                {{ item.mnemonic }}
              </option>
            </select>

            <select
              class="qb-select qb-operator"
              :value="child.condition"
              @change="updateRuleField(child.id, { condition: ($event.target as HTMLSelectElement).value })"
            >
              <option v-for="option in operatorOptions(child)" :key="option.value" :value="option.value">
                {{ option.label }}
              </option>
            </select>

            <template v-if="usesSlider(mnemonicMap.get(child.mnemonic || ''))">
              <div class="qb-slider-wrap">
                <span class="qb-slider-min">{{ formatNumeric(mnemonicMap.get(child.mnemonic || '')?.minValue) }}</span>
                <input
                  class="qb-slider"
                  type="range"
                  :min="mnemonicMap.get(child.mnemonic || '')?.minValue ?? 0"
                  :max="mnemonicMap.get(child.mnemonic || '')?.maxValue ?? 0"
                  :step="sliderStep(mnemonicMap.get(child.mnemonic || ''))"
                  :value="sliderValue(child, mnemonicMap.get(child.mnemonic || ''))"
                  @input="onSliderInput(child.id, String(($event.target as HTMLInputElement).value))"
                >
                <input
                  class="qb-input qb-slider-number"
                  type="number"
                  :min="mnemonicMap.get(child.mnemonic || '')?.minValue ?? 0"
                  :max="mnemonicMap.get(child.mnemonic || '')?.maxValue ?? 0"
                  :step="sliderStep(mnemonicMap.get(child.mnemonic || ''))"
                  :value="sliderValue(child, mnemonicMap.get(child.mnemonic || ''))"
                  @input="onSliderInput(child.id, String(($event.target as HTMLInputElement).value))"
                >
                <span class="qb-slider-max">{{ formatNumeric(mnemonicMap.get(child.mnemonic || '')?.maxValue) }}</span>
              </div>
            </template>

            <select
              v-else-if="usesSelect(mnemonicMap.get(child.mnemonic || ''))"
              class="qb-select qb-value"
              :value="child.value"
              @change="updateRuleField(child.id, { value: ($event.target as HTMLSelectElement).value })"
            >
              <option
                v-for="value in mnemonicMap.get(child.mnemonic || '')?.valueSuggestions || []"
                :key="value"
                :value="value"
              >
                {{ value }}
              </option>
            </select>

            <input
              v-else
              class="qb-input qb-value"
              type="text"
              :value="child.value || ''"
              @input="updateRuleField(child.id, { value: ($event.target as HTMLInputElement).value })"
            >

            <label class="qb-negate">
              <input
                type="checkbox"
                :checked="Boolean(child.negate)"
                @change="updateRuleField(child.id, { negate: ($event.target as HTMLInputElement).checked })"
              >
              NOT
            </label>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.qb-group {
  position: relative;
}

.qb-root {
  padding-top: 0.25rem;
}

.qb-group-header {
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
  margin-bottom: 0.75rem;
}

.qb-branch {
  width: 12px;
  min-height: 54px;
  border-left: 2px solid rgba(255, 255, 255, 0.6);
  border-bottom: 2px solid rgba(255, 255, 255, 0.6);
  border-bottom-left-radius: 4px;
  margin-top: -0.5rem;
}

.qb-toolbar {
  display: inline-flex;
  flex-wrap: wrap;
  gap: 0.35rem;
}

.qb-group-body {
  display: grid;
  gap: 0.75rem;
}

.qb-item {
  position: relative;
}

.qb-rule,
.qb-group:not(.qb-root) {
  background: rgba(255, 255, 255, 0.88);
  border: 1px solid #d8d8d8;
  border-radius: 6px;
  padding: 0.4rem;
}

.qb-rule-actions {
  margin-bottom: 0.35rem;
}

.qb-rule-grid {
  display: grid;
  grid-template-columns: minmax(260px, 1.8fr) minmax(140px, 0.8fr) minmax(260px, 1.6fr) auto;
  gap: 0.6rem;
  align-items: center;
}

.qb-btn {
  border: 0;
  border-radius: 4px;
  padding: 0.55rem 0.9rem;
  font-size: 0.95rem;
  line-height: 1;
  cursor: pointer;
  color: #fff;
}

.qb-btn-success {
  background: #27ae60;
}

.qb-btn-primary {
  background: #1e73be;
}

.qb-btn-primary.is-active {
  background: #145c98;
}

.qb-btn-danger {
  background: #e74c3c;
}

.qb-select,
.qb-input {
  width: 100%;
  min-height: 40px;
  border: 1px solid #c9cdd3;
  border-radius: 4px;
  padding: 0.45rem 0.7rem;
  background: #fff;
  color: #4b5563;
}

.qb-slider-wrap {
  display: grid;
  grid-template-columns: 52px minmax(160px, 1fr) 96px 52px;
  gap: 0.5rem;
  align-items: center;
}

.qb-slider {
  width: 100%;
}

.qb-slider-min,
.qb-slider-max {
  color: #6b7280;
  font-size: 0.75rem;
  text-align: center;
}

.qb-negate {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  color: #374151;
  font-size: 0.9rem;
  white-space: nowrap;
}

@media (max-width: 980px) {
  .qb-rule-grid {
    grid-template-columns: 1fr;
  }

  .qb-slider-wrap {
    grid-template-columns: 52px minmax(100px, 1fr) 96px 52px;
  }
}
</style>
