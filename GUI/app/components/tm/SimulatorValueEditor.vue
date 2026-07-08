<script setup lang="ts">
import { nextTick, ref } from 'vue'

const props = defineProps<{ params: any }>()

const autoCompleteRef = ref<any>(null)
const editorValue = ref(String(props.params?.value ?? ''))
const suggestions = ref<string[]>([])

function getRangeOptions(query = '') {
  const options = Array.isArray(props.params?.data?.rangeOptions)
    ? props.params.data.rangeOptions.map((value: unknown) => String(value ?? ''))
    : []

  if (!query) {
    return options
  }

  const normalized = query.toLowerCase()
  return options.filter(option => option.toLowerCase().includes(normalized))
}

function onComplete(event: { query: string }) {
  suggestions.value = getRangeOptions(event.query)
}

function onDropdownClick() {
  suggestions.value = getRangeOptions('')
}

function commitEdit() {
  props.params?.stopEditing?.()
}

function onItemSelect(event: { value?: unknown }) {
  if (event?.value !== undefined && event?.value !== null) {
    editorValue.value = String(event.value)
  }
  void nextTick(() => commitEdit())
}

function getValue() {
  return String(editorValue.value ?? '')
}

async function afterGuiAttached() {
  await nextTick()
  suggestions.value = getRangeOptions('')
  const input = autoCompleteRef.value?.$el?.querySelector('input')
  input?.focus()
  input?.select?.()
}

defineExpose({ getValue, afterGuiAttached })
</script>

<template>
  <div class="editor-shell">
    <AutoComplete
      ref="autoCompleteRef"
      v-model="editorValue"
      :suggestions="suggestions"
      :dropdown="true"
      append-to="self"
      :force-selection="true"
      class="w-full"
      @complete="onComplete"
      @dropdown-click="onDropdownClick"
      @option-select="onItemSelect"
      @keydown.enter.prevent="commitEdit"
      @keydown.tab="commitEdit"
    />
  </div>
</template>

<style scoped lang="scss">
.editor-shell {
  min-width: 12rem;
}
</style>
