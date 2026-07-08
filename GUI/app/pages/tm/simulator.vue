<script setup lang="ts">
import type { ColDef } from 'ag-grid-community'
import { colorSchemeDarkBlue, colorSchemeLightCold, ModuleRegistry, themeQuartz } from 'ag-grid-community'
import { AllEnterpriseModule } from 'ag-grid-enterprise'
import { AgGridVue } from 'ag-grid-vue3'
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import SimulatorValueEditor from '@/components/tm/SimulatorValueEditor.vue'
import { initMenu } from '@/composables/tm/SideNav'
import { useTmFiltersStore } from '@/stores/tmFilters'
import { useColorModeStore } from '~/stores/colorMode'

ModuleRegistry.registerModules([AllEnterpriseModule])

definePageMeta({ title: 'Telemetry - Simulator' })
initMenu(1)

type SimMode = 'RANDOM' | 'FIXED'

interface SimulatorMnemonic {
  subsystem: string
  cdbMnemonic: string
  range: unknown[]
  type: string
}

interface SimulatorValue {
  mnemonic: string
  value: string
}

interface FixedRow {
  subsystem: string
  mnemonic: string
  value: string
  rangeOptions: string[]
}

const { simulatorApiBase: simBase } = useRuntimeConfig().public

const colorModeStore = useColorModeStore()
const tmFilters = useTmFiltersStore()
const gridApi = ref<any>(null)

const currentMode = ref<SimMode>('FIXED')
const pendingMode = ref<SimMode>('FIXED')
const isRunning = ref(false)
const statusLoading = ref(true)
const actionLoading = ref(false)
const valueSaveLoading = ref(false)

const subsystems = ref<string[]>([])
const selectedSubsystems = ref<string[]>(tmFilters.simulatorSubsystems)
const quickFilter = ref(tmFilters.simulatorQuickFilter)
const fixedRows = ref<FixedRow[]>([])
const changedMnemonics = ref<Set<string>>(new Set())
const message = ref<{ type: 'success' | 'error', text: string } | null>(null)

const modeOptions: { label: string, value: SimMode, icon: string }[] = [
  { label: 'Random', value: 'RANDOM', icon: 'pi pi-random' },
  { label: 'Fixed', value: 'FIXED', icon: 'pi pi-lock' },
]

const gridTheme = computed(() =>
  colorModeStore.currentMode === 'dark'
    ? themeQuartz.withPart(colorSchemeDarkBlue)
    : themeQuartz.withPart(colorSchemeLightCold),
)

const showFixedGrid = computed(() => pendingMode.value === 'FIXED')

const columnDefs = ref<ColDef<FixedRow>[]>([
  {
    headerName: 'Mnemonic',
    field: 'mnemonic',
    minWidth: 260,
    flex: 1,
    editable: false,
  },
  {
    headerName: 'Value',
    field: 'value',
    minWidth: 220,
    editable: true,
    singleClickEdit: true,
    cellEditor: SimulatorValueEditor,
    cellEditorPopup: true,
  },
])

const defaultColDef = {
  sortable: true,
  filter: true,
  resizable: true,
}

onMounted(async () => {
  await Promise.all([loadStatus(), loadSubsystems()])
  if (selectedSubsystems.value.length) {
    await loadFixedRows(selectedSubsystems.value)
  }
})

watch(selectedSubsystems, async (values) => {
  tmFilters.simulatorSubsystems = values
  if (values.length === 0) {
    fixedRows.value = []
    changedMnemonics.value.clear()
    return
  }
  await loadFixedRows(values)
}, { deep: true })

watch(quickFilter, (value) => {
  tmFilters.simulatorQuickFilter = value
  if (gridApi.value) {
    gridApi.value.setGridOption('quickFilterText', value)
  }
})

watch(fixedRows, async (rows) => {
  if (!gridApi.value || rows.length === 0)
    return
  await nextTick()
  gridApi.value.autoSizeAllColumns()
})

async function loadStatus() {
  statusLoading.value = true
  try {
    const [modeData, statusData] = await Promise.all([
      $fetch<{ mode?: string }>(`${simBase}/simulator/mode`),
      $fetch<{ config?: Record<string, string> }>(`${simBase}/simulator-status`),
    ])
    const resolvedMode = String(modeData?.mode ?? 'FIXED').toUpperCase() === 'RANDOM' ? 'RANDOM' : 'FIXED'
    currentMode.value = resolvedMode
    pendingMode.value = resolvedMode
    isRunning.value = statusData?.config?.ENABLE === '1'
  }
  catch (error) {
    console.error('Failed to load simulator status', error)
  }
  finally {
    statusLoading.value = false
  }
}

async function loadSubsystems() {
  try {
    const data = await $fetch<string[]>(`${simBase}/simulator/subsystems`)
    subsystems.value = Array.isArray(data) ? data : []
  }
  catch (error) {
    console.error('Failed to load simulator subsystems', error)
    subsystems.value = []
  }
}

async function loadFixedRows(targetSubsystems: string[]) {
  try {
    const subsystemQuery = encodeURIComponent(targetSubsystems.join(','))
    const [mnemonics, values] = await Promise.all([
      $fetch<SimulatorMnemonic[]>(`${simBase}/simulator/mnemonics?subsystem=${subsystemQuery}`),
      $fetch<SimulatorValue[]>(`${simBase}/simulator/values?subsystem=${subsystemQuery}`),
    ])

    const valueMap = new Map<string, string>()
    for (const item of Array.isArray(values) ? values : []) {
      valueMap.set(item.mnemonic, item.value)
    }

    fixedRows.value = (Array.isArray(mnemonics) ? mnemonics : [])
      .map(mnemonic => ({
        subsystem: mnemonic.subsystem,
        mnemonic: mnemonic.cdbMnemonic,
        value: valueMap.get(mnemonic.cdbMnemonic) ?? String(mnemonic.range?.[0] ?? ''),
        rangeOptions: Array.isArray(mnemonic.range) ? mnemonic.range.map(value => String(value ?? '')) : [],
      }))
      .sort((left, right) => left.mnemonic.localeCompare(right.mnemonic))

    changedMnemonics.value.clear()
  }
  catch (error) {
    console.error('Failed to load fixed simulator rows', error)
    fixedRows.value = []
  }
}

function onGridReady(params: any) {
  gridApi.value = params.api
  params.api.setGridOption('quickFilterText', quickFilter.value)
  params.api.autoSizeAllColumns()
}

function onCellValueChanged(params: any) {
  if (!params?.data?.mnemonic || params.colDef.field !== 'value') {
    return
  }
  changedMnemonics.value.add(params.data.mnemonic)
}

async function applyMode() {
  actionLoading.value = true
  message.value = null
  try {
    await $fetch(`${simBase}/simulator/mode`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: { mode: pendingMode.value },
    })
    currentMode.value = pendingMode.value
    message.value = { type: 'success', text: `Mode set to ${pendingMode.value}` }
  }
  catch (error: any) {
    message.value = { type: 'error', text: error?.data?.error ?? 'Failed to set mode' }
  }
  finally {
    actionLoading.value = false
  }
}

async function startSimulator() {
  actionLoading.value = true
  message.value = null
  try {
    await $fetch(`${simBase}/simulator/start`, { method: 'POST' })
    isRunning.value = true
    message.value = { type: 'success', text: 'Simulator started' }
  }
  catch (error: any) {
    message.value = { type: 'error', text: error?.data?.error ?? 'Failed to start simulator' }
  }
  finally {
    actionLoading.value = false
  }
}

async function stopSimulator() {
  actionLoading.value = true
  message.value = null
  try {
    await $fetch(`${simBase}/simulator/stop`, { method: 'POST' })
    isRunning.value = false
    message.value = { type: 'success', text: 'Simulator stopped' }
  }
  catch (error: any) {
    message.value = { type: 'error', text: error?.data?.error ?? 'Failed to stop simulator' }
  }
  finally {
    actionLoading.value = false
  }
}

async function resetSimulator() {
  actionLoading.value = true
  message.value = null
  try {
    await $fetch(`${simBase}/simulator/reset`, { method: 'POST' })
    message.value = { type: 'success', text: 'Simulator reset' }
    if (selectedSubsystems.value.length > 0) {
      await loadFixedRows(selectedSubsystems.value)
    }
  }
  catch (error: any) {
    message.value = { type: 'error', text: error?.data?.error ?? 'Failed to reset simulator' }
  }
  finally {
    actionLoading.value = false
  }
}

async function saveFixedValues() {
  if (selectedSubsystems.value.length === 0) {
    return
  }

  const changedRows = fixedRows.value.filter(row => changedMnemonics.value.has(row.mnemonic))
  if (changedRows.length === 0) {
    message.value = { type: 'success', text: 'No simulator value changes to apply.' }
    return
  }

  valueSaveLoading.value = true
  message.value = null
  try {
    await $fetch(`${simBase}/simulator/values`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: changedRows.map(row => ({ mnemonic: row.mnemonic, value: row.value })),
    })
    changedMnemonics.value.clear()
    message.value = { type: 'success', text: `Applied ${changedRows.length} simulator value${changedRows.length > 1 ? 's' : ''}.` }
  }
  catch (error: any) {
    message.value = { type: 'error', text: error?.data?.error ?? 'Failed to update simulator values' }
  }
  finally {
    valueSaveLoading.value = false
  }
}
</script>

<template>
  <div class="content p-4">
    <AppName appname="TM Simulator" />

    <div class="simulator-toolbar mt-4">
      <div class="status-row">
        <Tag v-if="!statusLoading" :value="isRunning ? 'RUNNING' : 'STOPPED'" :severity="isRunning ? 'success' : 'danger'" class="status-tag" />
        <Tag v-if="!statusLoading" :value="`Mode: ${currentMode}`" severity="info" class="status-tag" />
        <i v-if="statusLoading" class="pi pi-spin pi-spinner" />
      </div>

      <div class="control-buttons">
        <Button label="Start" icon="pi pi-play" severity="success" :loading="actionLoading" @click="startSimulator" />
        <Button label="Stop" icon="pi pi-stop" severity="danger" :loading="actionLoading" @click="stopSimulator" />
        <Button label="Reset" icon="pi pi-refresh" severity="secondary" outlined :loading="actionLoading" @click="resetSimulator" />
      </div>

      <div class="mode-inline">
        <div
          v-for="opt in modeOptions"
          :key="opt.value"
          class="mode-option" :class="[{ 'mode-option--active': pendingMode === opt.value }]"
          @click="pendingMode = opt.value"
        >
          <i :class="opt.icon" />
          <span>{{ opt.label }}</span>
        </div>
        <Button label="Apply Mode" icon="pi pi-check" :loading="actionLoading" :disabled="pendingMode === currentMode" @click="applyMode" />
      </div>
    </div>

    <div v-if="showFixedGrid" class="fixed-panel mt-4">
      <div class="toolbar">
        <div class="field-block subsystems-block">
          <label class="field-label">Subsystems</label>
          <MultiSelect
            v-model="selectedSubsystems"
            :options="subsystems"
            placeholder="Select subsystem(s)..."
            class="w-full"
            :filter="true"
            :max-selected-labels="3"
          />
        </div>

        <div class="field-block grow-block">
          <label class="field-label">Quick Filter</label>
          <InputText v-model="quickFilter" placeholder="Filter by mnemonic..." class="w-full" />
        </div>

        <Button label="Apply Fixed Values" icon="pi pi-send" :loading="valueSaveLoading" :disabled="selectedSubsystems.length === 0" @click="saveFixedValues" />
      </div>

      <div class="grid-shell mt-4">
        <AgGridVue
          :theme="gridTheme"
          class="sim-grid"
          :row-data="fixedRows"
          :column-defs="columnDefs"
          :default-col-def="defaultColDef"
          :single-click-edit="true"
          :stop-editing-when-cells-lose-focus="false"
          @grid-ready="onGridReady"
          @cell-value-changed="onCellValueChanged"
        />
      </div>
    </div>

    <Message v-if="message" :severity="message.type === 'success' ? 'success' : 'error'" class="mt-4">
      {{ message.text }}
    </Message>
  </div>
</template>

<style scoped lang="scss">
.status-row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.status-tag {
  font-size: 0.85rem;
}

.simulator-toolbar {
  display: flex;
  align-items: center;
  gap: 1rem;
  flex-wrap: wrap;
}

.control-buttons {
  display: flex;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.mode-inline {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.mode-option {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.55rem 0.85rem;
  border-radius: 6px;
  cursor: pointer;
  border: 1px solid transparent;
  transition: background 0.15s, border-color 0.15s;

  &:hover {
    background: var(--surface-hover);
  }

  &--active {
    background: var(--primary-50, rgba(var(--primary-color-rgb), 0.08));
    border-color: var(--primary-color);
    font-weight: 600;
    color: var(--primary-color);
  }
}

.fixed-panel {
  width: min(100%, 76rem);
}

.toolbar {
  display: flex;
  gap: 1rem;
  align-items: flex-end;
  flex-wrap: wrap;
}

.field-block {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.subsystems-block {
  min-width: 20rem;
}

.grow-block {
  flex: 1;
  min-width: 16rem;
}

.field-label {
  display: block;
  font-size: 0.85rem;
  font-weight: 600;
}

.grid-shell {
  height: calc(100vh - 23rem);
  min-height: 26rem;
  border: 1px solid var(--surface-border);
  border-radius: 8px;
  overflow: hidden;
}

.sim-grid {
  width: 100%;
  height: 100%;
}
</style>
