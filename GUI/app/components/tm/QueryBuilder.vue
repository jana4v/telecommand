<script setup lang="ts">
import type { ConditionRule, QueryBuilderMnemonic } from '@/components/tm/queryBuilderTypes'
import { computed, nextTick, ref, watch } from 'vue'
import QueryBuilderGroup from '@/components/tm/QueryBuilderGroup.vue'

const props = withDefaults(defineProps<{
  modelValue: ConditionRule | null
  mnemonics: QueryBuilderMnemonic[]
  mode?: 'compact' | 'full'
}>(), {
  mode: 'full',
})

const emit = defineEmits<{
  'update:modelValue': [value: ConditionRule | null]
  'generate': [logic: string]
}>()

const syncingFromParent = ref(false)
const rootGroup = ref<ConditionRule>(normalizeRoot(props.modelValue))

function cloneRule<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}

function isStructurallyEqual(a: unknown, b: unknown): boolean {
  try {
    return JSON.stringify(a) === JSON.stringify(b)
  }
  catch {
    return false
  }
}

function createId(prefix: 'group' | 'rule'): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2, 8)}`
}

function firstMnemonic(): QueryBuilderMnemonic | undefined {
  return props.mnemonics[0]
}

function defaultCondition(item?: QueryBuilderMnemonic): string {
  return item?.type.toUpperCase() === 'ANALOG' ? '==' : '=='
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
    condition: defaultCondition(item),
    value: defaultValue(item),
    negate: false,
  }
}

function normalizeNode(node: ConditionRule | null | undefined): ConditionRule {
  if (!node) {
    return {
      id: createId('group'),
      type: 'group',
      operator: 'AND',
      rules: props.mnemonics.length ? [createRule()] : [],
    }
  }

  if (node.type === 'rule') {
    const item = props.mnemonics.find(entry => entry.mnemonic === node.mnemonic)
    return {
      id: node.id || createId('rule'),
      type: 'rule',
      mnemonic: node.mnemonic || item?.mnemonic || firstMnemonic()?.mnemonic || '',
      // Prefer the catalog type; fall back to whatever was inferred by the parser.
      mnemonicType: item?.type || node.mnemonicType || '',
      condition: node.condition || defaultCondition(item),
      value: node.value ?? defaultValue(item),
      negate: Boolean(node.negate),
    }
  }

  return {
    id: node.id || createId('group'),
    type: 'group',
    operator: node.operator || 'AND',
    rules: (node.rules || []).map(child => normalizeNode(child)),
  }
}

function normalizeRoot(node: ConditionRule | null): ConditionRule {
  const normalized = normalizeNode(node)
  if (normalized.type === 'group')
    return normalized
  return {
    id: createId('group'),
    type: 'group',
    operator: 'AND',
    rules: [normalized],
  }
}

function isNumeric(value: string): boolean {
  return /^-?\d+(?:\.\d+)?$/.test(value.trim())
}

function generateLogic(node: ConditionRule, depth = 0): string {
  if (node.type === 'rule') {
    if (!node.mnemonic || !node.condition)
      return ''
    const rawValue = String(node.value ?? '').trim()
    const isBinary = node.mnemonicType
      ? node.mnemonicType.toUpperCase() === 'BINARY'
      : !isNumeric(rawValue)
    const renderedValue = rawValue.length === 0
      ? '""'
      : isBinary ? `"${rawValue}"` : rawValue
    let expression = `${node.mnemonic} ${node.condition} ${renderedValue}`
    if (node.negate)
      expression = `NOT (${expression})`
    return expression
  }

  const parts = (node.rules || []).map(child => generateLogic(child, depth + 1)).filter(Boolean)
  if (!parts.length)
    return ''
  const joined = parts.join(` ${node.operator || 'AND'} `)
  return depth === 0 ? joined : `(${joined})`
}

const normalizedGroup = computed(() => normalizeRoot(rootGroup.value))

watch(
  () => props.modelValue,
  (value) => {
    // If the incoming modelValue is structurally identical to the current
    // rootGroup, skip the re-normalize. This breaks the emit → prop → emit
    // loop that fires whenever our own update:modelValue re-enters as a prop.
    if (isStructurallyEqual(value, rootGroup.value)) {
      return
    }
    syncingFromParent.value = true
    rootGroup.value = normalizeRoot(value)
    nextTick(() => {
      syncingFromParent.value = false
    })
  },
  { deep: true },
)

watch(
  () => props.mnemonics,
  () => {
    rootGroup.value = normalizeRoot(rootGroup.value)
  },
  { deep: true },
)

watch(
  normalizedGroup,
  (value) => {
    if (syncingFromParent.value)
      return
    const output = cloneRule(value)
    emit('update:modelValue', output)
    emit('generate', generateLogic(output))
  },
  { deep: true, immediate: true },
)
</script>

<template>
  <div class="jqb-wrapper">
    <QueryBuilderGroup
      v-model="rootGroup"
      :mnemonics="mnemonics"
      :mode="mode"
      :is-root="true"
    />
  </div>
</template>

<style scoped lang="scss">
.jqb-wrapper {
  border: 1px solid var(--surface-border);
  border-radius: 8px;
  padding: 12px;
  background: var(--surface-card);
}
</style>
