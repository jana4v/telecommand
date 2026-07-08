<script setup lang="ts">
import type { CellSelectionOptions, ColDef, GridApi } from 'ag-grid-community'
import {

  colorSchemeDarkBlue,
  colorSchemeLightCold,

  ModuleRegistry,
  themeQuartz,
} from 'ag-grid-community'
import { AllEnterpriseModule } from 'ag-grid-enterprise'
import { AgGridVue } from 'ag-grid-vue3'
import { computed, nextTick, onMounted, ref, shallowRef, watch } from 'vue'
import { initMenu } from '@/composables/tm/SideNav'
import { useTmFiltersStore } from '@/stores/tmFilters'
import { useColorModeStore } from '~/stores/colorMode'

ModuleRegistry.registerModules([AllEnterpriseModule])

definePageMeta({ title: 'Telemetry - Update TM DB' })
initMenu(3)

type TelemetryKind = 'ANALOG' | 'BINARY'

interface TmDbRow {
  pid: string
  subsystem: string
  cdbMnemonic: string
  type: TelemetryKind
  description: string
  unit: string
  lowerLimit: number | null
  upperLimit: number | null
  tolerance: number | null
  expectedValue: string
  rangeOptions: string[]
  ignore_limit_check: boolean
  ignore_change_detection: boolean
  ignore_chain_comparision: boolean
}

const colorModeStore = useColorModeStore()
const tmFilters = useTmFiltersStore()
const { apiBase: gatewayBase } = useRuntimeConfig().public

const subsystems = ref<string[]>([])
const selectedSubsystems = ref<string[]>(tmFilters.updateDbSubsystems)
const telemetryKind = ref<TelemetryKind>(tmFilters.updateDbTelemetryKind as TelemetryKind || 'ANALOG')
const telemetryKindOptions = [
  { label: 'Analog', value: 'ANALOG' },
  { label: 'Digital', value: 'BINARY' },
]

const rowData = ref<TmDbRow[]>([])
const loading = ref(false)
const saving = ref(false)
const quickFilter = ref(tmFilters.updateDbQuickFilter)
const message = ref<{ type: 'success' | 'error', text: string } | null>(null)

const gridApi = shallowRef<GridApi<TmDbRow> | null>(null)
const changedFields = ref<Map<string, Set<string>>>(new Map())

const gridTheme = computed(() =>
  colorModeStore.currentMode === 'dark'
    ? themeQuartz.withPart(colorSchemeDarkBlue)
    : themeQuartz.withPart(colorSchemeLightCold),
)

const cellSelection = ref<boolean | CellSelectionOptions>({
  handle: { mode: 'fill' },
})

const defaultColDef: ColDef<TmDbRow> = {
  sortable: true,
  filter: true,
  resizable: true,
}

const columnDefs = computed<ColDef<TmDbRow>[]>(() => {
  const common: ColDef<TmDbRow>[] = [
    {
      headerName: 'PID',
      field: 'pid',
      minWidth: 140,
      pinned: 'left',
      editable: false,
      cellStyle: { fontWeight: '600' },
    },
    {
      headerName: 'Mnemonic',
      field: 'cdbMnemonic',
      minWidth: 240,
      editable: false,
    },
  ]

  const ignoreCols: ColDef<TmDbRow>[] = [
    {
      headerName: 'Limit Check',
      field: 'ignore_limit_check',
      minWidth: 150,
      editable: true,
      cellRenderer: 'agCheckboxCellRenderer',
      cellEditor: 'agCheckboxCellEditor',
      cellStyle: { textAlign: 'center' },
    },
    {
      headerName: 'Change Det.',
      field: 'ignore_change_detection',
      minWidth: 155,
      editable: true,
      cellRenderer: 'agCheckboxCellRenderer',
      cellEditor: 'agCheckboxCellEditor',
      cellStyle: { textAlign: 'center' },
    },
    {
      headerName: 'Chain Cmp.',
      field: 'ignore_chain_comparision',
      minWidth: 155,
      editable: true,
      cellRenderer: 'agCheckboxCellRenderer',
      cellEditor: 'agCheckboxCellEditor',
      cellStyle: { textAlign: 'center' },
    },
  ]

  if (telemetryKind.value === 'ANALOG') {
    return [
      ...common,
      {
        headerName: 'Lower Limit',
        field: 'lowerLimit',
        minWidth: 140,
        editable: true,
        valueParser: params => parseNullableNumber(params.newValue),
      },
      {
        headerName: 'Upper Limit',
        field: 'upperLimit',
        minWidth: 140,
        editable: true,
        valueParser: params => parseNullableNumber(params.newValue),
      },
      {
        headerName: 'Tolerance',
        field: 'tolerance',
        minWidth: 130,
        editable: true,
        valueParser: params => parseNullableNumber(params.newValue),
      },
      ...ignoreCols,
    ]
  }

  return [
    ...common,
    {
      headerName: 'Possible Values',
      field: 'rangeOptions',
      minWidth: 220,
      editable: false,
      valueFormatter: params => (Array.isArray(params.value) ? params.value.join(' | ') : ''),
    },
    {
      headerName: 'Expected',
      field: 'expectedValue',
      minWidth: 180,
      editable: true,
      cellEditor: 'agRichSelectCellEditor',
      cellEditorParams: (params: any) => ({ values: params.data?.rangeOptions ?? [] }),
    },
    ...ignoreCols,
  ]
})

onMounted(async () => {
  await loadSubsystems()
  if (selectedSubsystems.value.length) {
    await loadMnemonicRows(selectedSubsystems.value)
  }
})

watch(selectedSubsystems, async (subs) => {
  tmFilters.updateDbSubsystems = subs
  rowData.value = []
  message.value = null
  changedFields.value.clear()
  if (subs.length === 0)
    return
  await loadMnemonicRows(subs)
}, { deep: true })

watch(telemetryKind, async (kind) => {
  tmFilters.updateDbTelemetryKind = kind
  changedFields.value.clear()
  if (gridApi.value)
    gridApi.value.setGridOption('columnDefs', columnDefs.value)
  if (selectedSubsystems.value.length > 0)
    await loadMnemonicRows(selectedSubsystems.value)
})

watch(quickFilter, (value) => {
  tmFilters.updateDbQuickFilter = value
  if (gridApi.value) {
    gridApi.value.setGridOption('quickFilterText', value)
  }
})

watch(rowData, async (rows) => {
  if (!gridApi.value || rows.length === 0)
    return
  await nextTick()
  gridApi.value.autoSizeAllColumns()
})

function rowKey(row: Pick<TmDbRow, 'subsystem' | 'cdbMnemonic'>): string {
  return `${row.subsystem}|${row.cdbMnemonic}`
}

function parseNullableNumber(value: unknown): number | null {
  if (value === '' || value === null || value === undefined)
    return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

function toOptionalBool(value: unknown): boolean | undefined {
  if (typeof value === 'boolean')
    return value
  if (typeof value === 'string') {
    const v = value.trim().toLowerCase()
    if (v === 'true')
      return true
    if (v === 'false')
      return false
  }
  return undefined
}

function resolveIgnoreValue(ignoreValue: unknown, enableFlag: unknown): boolean {
  const direct = toOptionalBool(ignoreValue)
  if (direct !== undefined)
    return direct
  const enabled = toOptionalBool(enableFlag)
  return enabled === undefined ? false : !enabled
}

function toStringArray(value: unknown): string[] {
  if (!Array.isArray(value))
    return []
  return value
    .map(v => String(v ?? '').trim())
    .filter(v => v.length > 0)
}

function onGridReady(params: any) {
  gridApi.value = params.api
  params.api.setGridOption('quickFilterText', quickFilter.value)
  params.api.autoSizeAllColumns()
}

function onCellValueChanged(params: any) {
  if (!params?.data?.subsystem || !params?.data?.cdbMnemonic || !params?.colDef?.field)
    return
  const key = rowKey(params.data as TmDbRow)
  const set = changedFields.value.get(key) ?? new Set<string>()
  const field = String(params.colDef.field)
  if (field === 'expectedValue') {
    const values: string[] = (params.data?.rangeOptions ?? []) as string[]
    if (values.length > 0 && !values.includes(String(params.newValue ?? ''))) {
      params.node.setDataValue('expectedValue', values[0])
    }
  }
  set.add(field)
  changedFields.value.set(key, set)
}

async function loadSubsystems() {
  try {
    const data = await $fetch<{ subsystems: string[] }>(`${gatewayBase}/get/tm/subsystems`)
    subsystems.value = data?.subsystems ?? []
  }
  catch (e) {
    console.error('Failed to load subsystems', e)
    subsystems.value = []
  }
}

async function loadMnemonicRows(targetSubsystems: string[]) {
  loading.value = true
  message.value = null
  changedFields.value.clear()
  try {
    const subsystemParam = targetSubsystems.join(',')
    const kind = telemetryKind.value
    const isBinary = kind === 'BINARY'
    const raw = await $fetch<any[]>(
      `${gatewayBase}/get/tm/details/${subsystemParam}?type=${kind}`,
    )

    rowData.value = (Array.isArray(raw) ? raw : []).map((m): TmDbRow => {
      const rangeOptions = isBinary ? toStringArray(m.possible_states) : []
      const expectedValue = String(m.expected_value ?? '').trim() || (rangeOptions[0] ?? '')
      return {
        pid: String(m.pid_no ?? ''),
        subsystem: String(m.subsystem ?? ''),
        cdbMnemonic: String(m.mnemonic ?? ''),
        type: kind,
        description: '',
        unit: '',
        lowerLimit: parseNullableNumber(m.lower_limit),
        upperLimit: parseNullableNumber(m.upper_limit),
        tolerance: parseNullableNumber(m.tolerance),
        expectedValue,
        rangeOptions,
        ignore_limit_check: !(m.limit_check ?? false),
        ignore_change_detection: !(m.change_detection ?? false),
        ignore_chain_comparision: !(m.chain_comparison ?? false),
      }
    }).filter(row => row.cdbMnemonic)
  }
  catch (e) {
    console.error('Failed to load mnemonics', e)
    rowData.value = []
  }
  finally {
    loading.value = false
  }
}

async function putGeneric(pid: string, patch: Record<string, unknown>) {
  await $fetch(`${gatewayBase}/update/tm`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: [{ pid, ...patch }],
  })
}

async function saveChanges() {
  if (selectedSubsystems.value.length === 0)
    return
  if (changedFields.value.size === 0) {
    message.value = { type: 'success', text: 'No changes to save.' }
    return
  }

  saving.value = true
  message.value = null
  try {
    let updates = 0
    for (const row of rowData.value) {
      const key = rowKey(row)
      const fields = changedFields.value.get(key)
      if (!fields || fields.size === 0)
        continue

      if (row.type === 'ANALOG' && (fields.has('lowerLimit') || fields.has('upperLimit'))) {
        await $fetch(`${gatewayBase}/update/tm/limits`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: [{ pid: row.pid, lower_limit: row.lowerLimit ?? 0, upper_limit: row.upperLimit ?? 0 }],
        })
        updates++
      }

      if (row.type === 'ANALOG' && fields.has('tolerance')) {
        await $fetch(`${gatewayBase}/update/tm/tolerance`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: [{ pid: row.pid, value: row.tolerance ?? 0 }],
        })
        updates++
      }

      if (row.type === 'BINARY' && fields.has('expectedValue')) {
        await $fetch(`${gatewayBase}/update/tm/expected_value`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: [{ pid: row.pid, value: String(row.expectedValue ?? '') }],
        })
        updates++
      }

      if (fields.has('ignore_limit_check')) {
        await putGeneric(row.pid, { limit_check: !row.ignore_limit_check })
        updates++
      }
      if (fields.has('ignore_change_detection')) {
        await putGeneric(row.pid, { change_detection: !row.ignore_change_detection })
        updates++
      }
      if (fields.has('ignore_chain_comparision')) {
        await putGeneric(row.pid, { chain_comparison: !row.ignore_chain_comparision })
        updates++
      }
    }

    changedFields.value.clear()
    message.value = { type: 'success', text: `Saved ${updates} update${updates === 1 ? '' : 's'}.` }
    await loadMnemonicRows(selectedSubsystems.value)
  }
  catch (e: any) {
    message.value = { type: 'error', text: e?.data?.error ?? 'Failed to save updates' }
  }
  finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="content p-4">
    <AppName appname="Update TM Database" />

    <div class="controls mt-4">
      <div class="control-item">
        <label class="label">Subsystems</label>
        <MultiSelect
          v-model="selectedSubsystems"
          :options="subsystems"
          placeholder="Select subsystem(s)..."
          class="w-64"
          :filter="true"
          :max-selected-labels="3"
        />
      </div>

      <div class="control-item">
        <label class="label">Telemetry Type</label>
        <Select
          v-model="telemetryKind"
          :options="telemetryKindOptions"
          option-label="label"
          option-value="value"
          class="w-56"
        />
      </div>

      <div class="control-item grow">
        <label class="label">Quick Filter</label>
        <InputText
          v-model="quickFilter"
          placeholder="Filter by mnemonic / description..."
          class="w-full"
          size="small"
        />
      </div>

      <Button
        label="Save Changes"
        icon="pi pi-save"
        :loading="saving"
        :disabled="selectedSubsystems.length === 0"
        @click="saveChanges"
      />
    </div>

    <Message v-if="message" :severity="message.type === 'success' ? 'success' : 'error'" class="mt-3">
      {{ message.text }}
    </Message>

    <div v-if="loading" class="flex align-items-center gap-2 mt-4 text-muted">
      <i class="pi pi-spin pi-spinner" /> Loading mnemonics...
    </div>

    <div v-else-if="rowData.length > 0" class="ag-wrapper mt-4">
      <AgGridVue
        :theme="gridTheme"
        class="ag-theme-local"
        :row-data="rowData"
        :column-defs="columnDefs"
        :default-col-def="defaultColDef"
        :cell-selection="cellSelection"
        :stop-editing-when-cells-lose-focus="true"
        :animate-rows="true"
        @grid-ready="onGridReady"
        @cell-value-changed="onCellValueChanged"
      />
    </div>

    <div v-else-if="selectedSubsystems.length > 0 && !loading" class="no-data mt-4">
      <i class="pi pi-inbox text-3xl" />
      <p>No {{ telemetryKind === 'ANALOG' ? 'analog' : 'digital' }} mnemonics found for selected subsystem(s)</p>
    </div>
  </div>
</template>

<style scoped lang="scss">
.controls {
  display: flex;
  align-items: flex-end;
  gap: 1rem;
  flex-wrap: wrap;
}

.control-item {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.control-item.grow {
  flex: 1;
  min-width: 260px;
}

.label {
  font-weight: 600;
  font-size: 0.9rem;
}

.no-data {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  padding: 3rem;
  color: var(--text-color-secondary);
}

.ag-wrapper {
  height: calc(100vh - 18rem);
  min-height: 28rem;
  width: 100%;
  border: 1px solid var(--surface-border);
  border-radius: 8px;
  overflow: hidden;
}

.ag-theme-local {
  height: 100%;
  width: 100%;
}

.text-muted { color: var(--text-color-secondary); }
</style>
