<script setup lang="ts">
import { computed, defineEmits, defineProps } from 'vue'

interface ConditionRule {
  id: string
  type: 'rule' | 'group'
  condition?: string
  value?: string
  mnemonic?: string
  operator?: string
  rules?: ConditionRule[]
  negate?: boolean
}

interface Props {
  rule: ConditionRule
  mnemonics: Array<{ mnemonic: string, type: string, unit: string }>
  depth?: number
}

const props = withDefaults(defineProps<Props>(), {
  depth: 0,
})

const emit = defineEmits<{
  'remove': [rule: ConditionRule]
  'update-operator': [ruleId: string, operator: string]
  'toggle-negate': [ruleId: string]
}>()

const logicalOperators = ['AND', 'OR']
const paddingLeft = computed(() => `${props.depth * 20}px`)

function updateMnemonicValue(ruleId: string, value: string) {
  // This would need to propagate up via emit
  console.log('Update:', ruleId, value)
}
</script>

<template>
  <div class="rule-renderer" :style="{ paddingLeft }">
    <!-- Rule Item -->
    <div v-if="rule.type === 'rule'" class="rule-item mb-2 p-3 surface-ground border-round border border-surface-border">
      <div class="flex gap-2 align-items-center mb-2">
        <!-- Negate Toggle -->
        <Button
          v-tooltip="rule.negate ? 'Negated (NOT)' : 'Click to negate'"
          icon="pi pi-ban"
          :severity="rule.negate ? 'danger' : 'secondary'"
          text
          rounded
          size="small"
          @click="$emit('toggle-negate', rule.id)"
        />

        <!-- Display Rule -->
        <div class="flex-1 grid gap-2 grid-cols-3">
          <Tag
            :value="rule.mnemonic"
            icon="pi pi-tag"
            class="justify-content-center"
            severity="info"
            style="width: 100%"
          />
          <Tag
            :value="rule.condition"
            icon="pi pi-equals"
            class="justify-content-center"
            severity="primary"
            style="width: 100%"
          />
          <InputText
            :model-value="rule.value"
            class="text-xs"
            placeholder="Value"
            @input="(e: any) => updateMnemonicValue(rule.id, e.target.value)"
          />
        </div>

        <!-- Remove Button -->
        <Button
          icon="pi pi-trash"
          severity="danger"
          text
          rounded
          size="small"
          @click="$emit('remove', rule)"
        />
      </div>
    </div>

    <!-- Group -->
    <div v-else class="rule-group mb-3 p-3 surface-section border-round border-2 border-primary-200">
      <!-- Group Operator -->
      <div class="group-header mb-2 flex gap-2 align-items-center">
        <i class="pi pi-sitemap text-primary" style="font-size: 0.75rem" />
        <Select
          :model-value="rule.operator || 'AND'"
          :options="logicalOperators"
          class="w-8rem"
          size="small"
          style="font-size: 0.75rem"
          @update:model-value="(op: any) => $emit('update-operator', rule.id, op)"
        />
        <span class="text-xs text-surface-500 flex-1">Combine conditions with {{ rule.operator || 'AND' }}</span>

        <!-- Remove Group -->
        <Button
          icon="pi pi-times"
          severity="danger"
          text
          rounded
          size="small"
          class="ml-auto"
          @click="$emit('remove', rule)"
        />
      </div>

      <!-- Rules within Group -->
      <div class="group-rules pl-3 border-left-2 border-primary-200">
        <div v-if="rule.rules && rule.rules.length === 0" class="text-center py-3 text-surface-400 text-xs">
          <i class="pi pi-inbox block mb-2" />
          No rules in this group
        </div>

        <template v-for="(subRule, index) in rule.rules" :key="subRule.id">
          <!-- Logical Operator between rules -->
          <div v-if="index > 0" class="my-1 text-center text-xs font-semibold text-primary-500">
            {{ rule.operator || 'AND' }}
          </div>

          <!-- Recursive rule rendering -->
          <TmQueryBuilderRuleRenderer
            :rule="subRule"
            :mnemonics="mnemonics"
            :depth="depth + 1"
            @remove="$emit('remove', subRule)"
            @update-operator="(id: string, op: string) => $emit('update-operator', id, op)"
            @toggle-negate="(id: string) => $emit('toggle-negate', id)"
          />
        </template>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.rule-renderer {
  transition: padding-left 0.3s ease;

  .rule-item {
    transition: all 0.2s ease;

    &:hover {
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    }
  }

  .rule-group {
    background: var(--surface-card);
    border-left: 3px solid var(--primary-color);

    .group-header {
      padding-bottom: 0.75rem;
      border-bottom: 1px solid var(--surface-border);
    }

    .group-rules {
      padding-top: 0.75rem;
    }
  }
}
</style>
