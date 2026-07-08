<script setup lang="ts">
import type { CellSelectionOptions, ColDef } from 'ag-grid-community'
import type { ConditionRule, QueryBuilderMnemonic } from '@/components/tm/queryBuilderTypes'
import {
  colorSchemeDarkBlue,
  ModuleRegistry,
  themeQuartz,
} from 'ag-grid-community'
import { AllEnterpriseModule } from 'ag-grid-enterprise'
import { AgGridVue } from 'ag-grid-vue3'
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import ConditionEditorWithBuilder from '@/components/tm/ConditionEditorWithBuilder.vue'
import { parseLogicToRule } from '@/composables/tm/conditionLogic'
import { initMenu } from '@/composables/tc/SideNav'
import { useColorModeStore } from '~/stores/colorMode'

const props = withDefaults(defineProps<{ embedMode?: boolean }>(), {
  embedMode: false,
})

ModuleRegistry.registerModules([AllEnterpriseModule])

definePageMeta({ title: 'Telecommand - Update TC DB' })
const route = useRoute()
if (String(route.path || '').startsWith('/tc'))
  initMenu(1)

type ConditionTargetField = 'preCondition' | 'postCondition'

interface TCRow {
  _id: string
  cmdId: string
  cmdDesc: string
  subsystem: string
  preCondition: string
  postCondition: string
  postConditionDelay: number
  priority: number
  cmdType: string
  format: string
  dataCodeMapName: string
  dataCodeMap: Record<string, any>
  inhibited: boolean
  exclude_in_expected: boolean
  exclude_in_procedure: boolean
}

interface DataCodeMapEntry {
  label: string
  code: string
  value: string
}

const colorModeStore = useColorModeStore()
const { apiBase: gatewayBase } = useRuntimeConfig().public

const subsystems = ref<string[]>([])
const selectedSubsystems = ref<string[]>([])
const cmdTypeOptions = ref<string[]>([])
const formatOptions = ref<string[]>([])
const dataMapNames = ref<string[]>([])
const conditionMnemonics = ref<QueryBuilderMnemonic[]>([])

const loading = ref(false)
const saving = ref(false)
const quickFilter = ref('')
const saveMessage = ref<{ type: 'success' | 'error', text: string } | null>(null)

const rowData = ref<TCRow[]>([])
const gridApi = ref<any>(null)
const changedIds = ref<Set<string>>(new Set())
const cellSelection = ref<boolean | CellSelectionOptions>({
  handle: { mode: 'fill' },
})

const showConditionEditor = ref(false)
const conditionTargetField = ref<ConditionTargetField>('preCondition')
const conditionRowId = ref('')
const conditionDraft = ref('')
const conditionRule = ref<ConditionRule | null>(null)

const showDataCodeMapEditor = ref(false)
const dataCodeMapRowId = ref('')
const dataCodeMapRows = ref<DataCodeMapEntry[]>([])
const dataCodeMapGridApi = ref<any>(null)

const gridTheme = computed(() =>
  themeQuartz.withPart(colorSchemeDarkBlue),
)

const conditionSubsystemOptions = computed(() => {
  const values = Array.from(new Set(selectedSubsystems.value.filter(Boolean)))
  return values.length > 0 ? values : subsystems.value
})
const conditionSubsystems = ref<string[]>([])

function isDataCommand(row?: TCRow | null): boolean {
  return String(row?.cmdType ?? '').trim().toLowerCase() === 'data'
}

function canEditDataFields(row?: TCRow | null): boolean {
  return isDataCommand(row)
}

function canEditNonDataFields(row?: TCRow | null): boolean {
  return !isDataCommand(row)
}

const columnDefs = ref<ColDef<TCRow>[]>([
  { headerName: 'CID', field: 'cmdId', minWidth: 130, maxWidth: 170, pinned: 'left', editable: false, suppressFillHandle: true },
  { headerName: 'Mnemonic', field: 'cmdDesc', minWidth: 260, editable: false, suppressFillHandle: true, cellStyle: { fontWeight: '600' } },
  {
    headerName: 'preCondition',
    field: 'preCondition',
    minWidth: 230,
    editable: p => canEditNonDataFields(p.data),
    cellClass: p => (canEditNonDataFields(p.data) ? 'condition-cell' : 'readonly-cell'),
    valueFormatter: p => formatConditionCell(p.value),
  },
  {
    headerName: 'postCondition',
    field: 'postCondition',
    minWidth: 230,
    editable: p => canEditNonDataFields(p.data),
    cellClass: p => (canEditNonDataFields(p.data) ? 'condition-cell' : 'readonly-cell'),
    valueFormatter: p => formatConditionCell(p.value),
  },
  {
    headerName: 'postConditionDelay',
    field: 'postConditionDelay',
    minWidth: 170,
    editable: p => canEditNonDataFields(p.data),
    valueParser: p => parseIntSafe(p.newValue, 0),
  },
  {
    headerName: 'priority',
    field: 'priority',
    minWidth: 120,
    editable: p => canEditNonDataFields(p.data),
    valueParser: p => parseIntSafe(p.newValue, 0),
  },
  {
    headerName: 'cmdType',
    field: 'cmdType',
    minWidth: 140,
    editable: true,
    cellEditor: 'agSelectCellEditor',
    cellEditorParams: () => ({ values: withCurrentOption(cmdTypeOptions.value, rowData.value.map(r => r.cmdType)) }),
  },
  {
    headerName: 'format',
    field: 'format',
    minWidth: 130,
    editable: p => canEditNonDataFields(p.data),
    cellEditor: 'agSelectCellEditor',
    cellEditorParams: () => ({ values: withCurrentOption(formatOptions.value, rowData.value.map(r => r.format)) }),
  },
  {
    headerName: 'dataCodeMapName',
    field: 'dataCodeMapName',
    minWidth: 170,
    editable: p => canEditDataFields(p.data),
    cellEditor: 'agSelectCellEditor',
    cellEditorParams: () => ({ values: withCurrentOption(dataMapNames.value, rowData.value.map(r => r.dataCodeMapName)) }),
  },
  {
    headerName: 'dataCodeMap',
    field: 'dataCodeMap',
    minWidth: 160,
    editable: p => canEditDataFields(p.data),
    cellClass: p => (canEditDataFields(p.data) ? 'condition-cell' : 'readonly-cell'),
    valueFormatter: p => `${Object.keys((p.value || {}) as Record<string, any>).length} entries`,
  },
  {
    headerName: 'inhibited',
    field: 'inhibited',
    minWidth: 120,
    editable: p => canEditNonDataFields(p.data),
    cellRenderer: 'agCheckboxCellRenderer',
    cellEditor: 'agCheckboxCellEditor',
  },
  {
    headerName: 'exclude_in_expected',
    field: 'exclude_in_expected',
    minWidth: 180,
    editable: p => canEditNonDataFields(p.data),
    cellRenderer: 'agCheckboxCellRenderer',
    cellEditor: 'agCheckboxCellEditor',
  },
  {
    headerName: 'exclude_in_procedure',
    field: 'exclude_in_procedure',
    minWidth: 190,
    editable: p => canEditNonDataFields(p.data),
    cellRenderer: 'agCheckboxCellRenderer',
    cellEditor: 'agCheckboxCellEditor',
  },
])

const defaultColDef: ColDef<TCRow> = {
  sortable: true,
  filter: true,
  resizable: true,
}

const dataCodeMapColumnDefs = ref<ColDef<DataCodeMapEntry>[]>([
  { headerName: 'Label', field: 'label', editable: true, minWidth: 220 },
  { headerName: 'Code', field: 'code', editable: true, minWidth: 180 },
  { headerName: 'Value', field: 'value', editable: true, minWidth: 220 },
])

onMounted(async () => {
  await Promise.all([
    loadSubsystems(),
    loadCommandTypes(),
    loadCommandFormats(),
    loadDataMapNames(),
  ])
})

watch(quickFilter, (v) => {
  gridApi.value?.setGridOption('quickFilterText', v)
})

watch(selectedSubsystems, async (subs) => {
  if (subs.length === 0) {
    rowData.value = []
    changedIds.value.clear()
    return
  }
  await Promise.all([loadConditionMnemonics(subs), loadRows(subs)])
}, { deep: true })


function parseIntSafe(value: unknown, def: number): number {
  const n = Number(value)
  return Number.isFinite(n) ? Math.trunc(n) : def
}

function withCurrentOption(base: string[], currentValues: string[]): string[] {
  const all = new Set(base)
  for (const v of currentValues) {
    const n = String(v || '').trim()
    if (n)
      all.add(n)
  }
  return Array.from(all)
}

function normalizeLogic(v: string): string {
  return String(v || '').replace(/\s+/g, ' ').replace(/\(\s+/g, '(').replace(/\s+\)/g, ')').trim()
}

function formatConditionCell(value: unknown): string {
  const logic = normalizeLogic(String(value ?? ''))
  return logic || 'Double-click to edit'
}

async function loadSubsystems() {
  try {
    const res = await $fetch<{ subsystems: string[] }>(`${gatewayBase}/telecommand/subsystems`)
    subsystems.value = (res?.subsystems || []).filter(Boolean)
  }
  catch {
    subsystems.value = []
  }
}

async function loadCommandTypes() {
  try {
    const res = await $fetch<{ items: string[] }>(`${gatewayBase}/telecommand/options/cmd-types`)
    cmdTypeOptions.value = res?.items || []
  }
  catch {
    cmdTypeOptions.value = []
  }
}

async function loadCommandFormats() {
  try {
    const res = await $fetch<{ items: string[] }>(`${gatewayBase}/telecommand/options/formats`)
    formatOptions.value = res?.items || []
  }
  catch {
    formatOptions.value = []
  }
}

async function loadDataMapNames() {
  try {
    const res = await $fetch<{ items: string[] }>(`${gatewayBase}/telecommand/data-map-names`)
    dataMapNames.value = res?.items || []
  }
  catch {
    dataMapNames.value = []
  }
}

async function loadConditionMnemonics(targetSubsystems: string[]) {
  try {
    const responses = await Promise.all(
      targetSubsystems.map(sub =>
        $fetch<any[]>(`${gatewayBase}/get/tm/details/${encodeURIComponent(sub)}`).then(rows => ({
          subsystem: sub,
          rows: Array.isArray(rows) ? rows : [],
        })),
      ),
    )
    const merged = responses.flatMap(({ subsystem, rows }) =>
      rows.map((m) => {
        const pid = String(m.pid_no ?? '').trim()
        const mnemonic = String(m.mnemonic ?? '').trim()
        if (!mnemonic)
          return null
        const display = pid ? `${pid}_${mnemonic}` : mnemonic
        const rawType = String(m.parameter_type ?? '').toUpperCase()
        const hasPossibleStates = Array.isArray(m.possible_states) && m.possible_states.length > 0
        const type = (rawType === 'BINARY' || rawType === 'DIGITAL' || hasPossibleStates) ? 'BINARY' : 'ANALOG'
        const minValue = Number.isFinite(Number(m.lower_range ?? m.lower_limit)) ? Number(m.lower_range ?? m.lower_limit) : null
        const maxValue = Number.isFinite(Number(m.upper_range ?? m.upper_limit)) ? Number(m.upper_range ?? m.upper_limit) : null
        return {
          mnemonic: display,
          type,
          unit: '',
          subsystem,
          valueSuggestions: hasPossibleStates ? m.possible_states.map(String) : [],
          minValue,
          maxValue,
          defaultValue: hasPossibleStates ? m.possible_states[0] : (minValue !== null ? String(minValue) : ''),
        } as QueryBuilderMnemonic
      }).filter((x): x is QueryBuilderMnemonic => Boolean(x?.mnemonic)),
    )
    const dedup = new Map<string, QueryBuilderMnemonic>()
    for (const m of merged)
      dedup.set(m.mnemonic, m)
    conditionMnemonics.value = Array.from(dedup.values())
  }
  catch {
    conditionMnemonics.value = []
  }
}

function intToBool(v: unknown): boolean {
  return Number(v) === 1 || String(v).toLowerCase() === 'true'
}

async function loadRows(targetSubsystems: string[]) {
  loading.value = true
  saveMessage.value = null
  changedIds.value.clear()
  try {
    const res = await $fetch<{ items: any[] }>(`${gatewayBase}/telecommand/db/query`, {
      method: 'POST',
      body: { subsystems: targetSubsystems },
    })

    rowData.value = (res?.items || []).map((r: any) => ({
      _id: String(r._id ?? r.cmdId ?? ''),
      cmdId: String(r.cmdId ?? r._id ?? ''),
      cmdDesc: String(r.cmdDesc ?? ''),
      subsystem: String(r.subsystem ?? ''),
      preCondition: String(r.preCondition ?? ''),
      postCondition: String(r.postCondition ?? ''),
      postConditionDelay: parseIntSafe(r.postConditionDelay, 46),
      priority: parseIntSafe(r.priority, 0),
      cmdType: String(r.cmdType ?? 'normal'),
      format: String(r.format ?? 'send'),
      dataCodeMapName: String(r.dataCodeMapName ?? ''),
      dataCodeMap: typeof r.dataCodeMap === 'object' && r.dataCodeMap ? r.dataCodeMap : {},
      inhibited: intToBool(r.inhibited),
      exclude_in_expected: intToBool(r.exclude_in_expected),
      exclude_in_procedure: intToBool(r.exclude_in_procedure),
    }))

    await nextTick()
    gridApi.value?.autoSizeAllColumns()
  }
  catch (e: any) {
    saveMessage.value = { type: 'error', text: e?.data?.error ?? 'Failed to load TC records' }
    rowData.value = []
  }
  finally {
    loading.value = false
  }
}

function onGridReady(params: any) {
  gridApi.value = params.api
  params.api.setGridOption('quickFilterText', quickFilter.value)
}

function onCellValueChanged(params: any) {
  const id = String(params?.data?.cmdId || '')
  if (!id)
    return
  changedIds.value.add(id)
}

function onCellDoubleClicked(params: any) {
  const field = String(params?.colDef?.field || '')
  if (field === 'preCondition' || field === 'postCondition') {
    if (!canEditNonDataFields(params?.data as TCRow))
      return
    openConditionEditor(params.data as TCRow, field)
    return
  }
  if (field === 'dataCodeMap') {
    if (!canEditDataFields(params?.data as TCRow))
      return
    openDataCodeMapEditor(params.data as TCRow)
  }
}

function openConditionEditor(row: TCRow, field: ConditionTargetField) {
  conditionRowId.value = row.cmdId
  conditionTargetField.value = field
  conditionSubsystems.value = [row.subsystem]
  conditionDraft.value = field === 'preCondition' ? row.preCondition : row.postCondition
  conditionRule.value = parseLogicToRule(conditionDraft.value)
  showConditionEditor.value = true
}

function applyConditionEditor() {
  const row = rowData.value.find(r => r.cmdId === conditionRowId.value)
  if (!row)
    return

  if (conditionTargetField.value === 'preCondition')
    row.preCondition = normalizeLogic(conditionDraft.value)
  else
    row.postCondition = normalizeLogic(conditionDraft.value)

  changedIds.value.add(row.cmdId)
  showConditionEditor.value = false
}

function dataCodeMapToRows(value: Record<string, any>): DataCodeMapEntry[] {
  const rows: DataCodeMapEntry[] = []
  const map = value || {}
  for (const [label, raw] of Object.entries(map)) {
    if (raw && typeof raw === 'object') {
      rows.push({
        label,
        code: String((raw as any).code ?? ''),
        value: String((raw as any).value ?? ''),
      })
    }
    else {
      rows.push({
        label,
        code: '',
        value: String(raw ?? ''),
      })
    }
  }
  return rows
}

function rowsToDataCodeMap(rows: DataCodeMapEntry[]): Record<string, any> {
  const out: Record<string, any> = {}
  for (const row of rows) {
    const label = String(row.label || '').trim()
    if (!label)
      continue
    out[label] = {
      code: String(row.code || '').trim(),
      value: String(row.value || '').trim(),
    }
  }
  return out
}

function openDataCodeMapEditor(row: TCRow) {
  dataCodeMapRowId.value = row.cmdId
  dataCodeMapRows.value = dataCodeMapToRows(row.dataCodeMap)
  showDataCodeMapEditor.value = true
}

function onDataCodeMapGridReady(params: any) {
  dataCodeMapGridApi.value = params.api
}

function addDataCodeMapRow() {
  dataCodeMapRows.value = [...dataCodeMapRows.value, { label: '', code: '', value: '' }]
}

function deleteSelectedDataCodeMapRows() {
  const selected = dataCodeMapGridApi.value?.getSelectedRows?.() || []
  if (!selected.length)
    return
  const selectedSet = new Set(selected)
  dataCodeMapRows.value = dataCodeMapRows.value.filter(row => !selectedSet.has(row))
}

function applyDataCodeMapEditor() {
  const row = rowData.value.find(r => r.cmdId === dataCodeMapRowId.value)
  if (!row)
    return
  row.dataCodeMap = rowsToDataCodeMap(dataCodeMapRows.value)
  changedIds.value.add(row.cmdId)
  showDataCodeMapEditor.value = false
}

async function saveChanges() {
  if (changedIds.value.size === 0) {
    saveMessage.value = { type: 'success', text: 'No changes to save.' }
    return
  }

  saving.value = true
  saveMessage.value = null
  try {
    const items = rowData.value
      .filter(r => changedIds.value.has(r.cmdId))
      .map(r => ({
        cmdId: r.cmdId,
        preCondition: r.preCondition,
        postCondition: r.postCondition,
        postConditionDelay: r.postConditionDelay,
        priority: r.priority,
        cmdType: r.cmdType,
        format: r.format,
        dataCodeMapName: r.dataCodeMapName,
        dataCodeMap: r.dataCodeMap,
        inhibited: r.inhibited ? 1 : 0,
        exclude_in_expected: r.exclude_in_expected ? 1 : 0,
        exclude_in_procedure: r.exclude_in_procedure ? 1 : 0,
      }))

    const res = await $fetch<{ updated: number }>(`${gatewayBase}/telecommand/db/bulk`, {
      method: 'PUT',
      body: { items },
    })

    changedIds.value.clear()
    saveMessage.value = { type: 'success', text: `Saved ${res?.updated ?? items.length} TC record(s).` }
  }
  catch (e: any) {
    saveMessage.value = { type: 'error', text: e?.data?.error ?? 'Failed to save TC updates' }
  }
  finally {
    saving.value = false
  }
}


</script>

<template>
  <div class="content p-4">
    <AppName v-if="!props.embedMode" appname="Update TC DB" />

    <div class="controls" :class="props.embedMode ? 'mt-2' : 'mt-4'">
      <div class="control-item">
        <label class="label">Subsystems</label>
        <MultiSelect
          v-model="selectedSubsystems"
          :options="subsystems"
          :filter="true"
          :max-selected-labels="3"
          placeholder="Select subsystem(s)..."
          class="w-72"
        />
      </div>

      <div class="control-item grow">
        <label class="label">Quick Filter</label>
        <InputText
          v-model="quickFilter"
          placeholder="Filter by CID / mnemonic / conditions..."
          class="w-full"
        />
      </div>

      <Button
        label="Save TC Updates"
        icon="pi pi-save"
        :loading="saving"
        :disabled="changedIds.size === 0"
        @click="saveChanges"
      />
    </div>

    <Message v-if="saveMessage" :severity="saveMessage.type === 'success' ? 'success' : 'error'" class="mt-3">
      {{ saveMessage.text }}
    </Message>

    <div v-if="loading" class="loading-box mt-4">
      <i class="pi pi-spin pi-spinner" />
      <span>Loading telecommand records...</span>
    </div>

    <div v-else-if="rowData.length > 0" class="ag-wrapper mt-4">
      <AgGridVue
        :theme="gridTheme"
        class="ag-theme-local"
        :row-data="rowData"
        :column-defs="columnDefs"
        :default-col-def="defaultColDef"
        :cell-selection="cellSelection"
        :suppress-click-edit="false"
        :stop-editing-when-cells-lose-focus="true"
        :animate-rows="true"
        @grid-ready="onGridReady"
        @cell-value-changed="onCellValueChanged"
        @cell-double-clicked="onCellDoubleClicked"
      />
    </div>

    <div v-else-if="selectedSubsystems.length > 0" class="no-data mt-4">
      <i class="pi pi-inbox text-3xl" />
      <p>No telecommand records found for selected subsystem(s).</p>
    </div>

    <Dialog
      v-model:visible="showConditionEditor"
      modal
      :header="`Edit ${conditionTargetField}`"
      :style="{ width: 'min(1100px, 96vw)' }"
    >
      <ConditionEditorWithBuilder
        v-model="conditionDraft"
        v-model:rule="conditionRule"
        :mnemonics="conditionMnemonics.filter(m => conditionSubsystems.length === 0 || conditionSubsystems.includes(String(m.subsystem || '')))"
        :subsystem-options="conditionSubsystemOptions"
        :subsystems="conditionSubsystems"
        :show-subsystem-selector="true"
        @update:subsystems="conditionSubsystems = $event"
      />

      <template #footer>
        <Button label="Cancel" severity="secondary" text @click="showConditionEditor = false" />
        <Button label="Apply Condition" icon="pi pi-check" @click="applyConditionEditor" />
      </template>
    </Dialog>

    <Dialog
      v-model:visible="showDataCodeMapEditor"
      modal
      header="Edit dataCodeMap"
      :style="{ width: 'min(900px, 94vw)' }"
    >
      <div class="controls mb-3">
        <Button label="Add Row" icon="pi pi-plus" size="small" @click="addDataCodeMapRow" />
        <Button label="Delete Selected" icon="pi pi-trash" severity="danger" outlined size="small" @click="deleteSelectedDataCodeMapRows" />
      </div>

      <div class="inner-grid">
        <AgGridVue
          :theme="gridTheme"
          class="ag-theme-local"
          :row-data="dataCodeMapRows"
          :column-defs="dataCodeMapColumnDefs"
          :default-col-def="{ resizable: true }"
          row-selection="multiple"
          @grid-ready="onDataCodeMapGridReady"
        />
      </div>

      <template #footer>
        <Button label="Cancel" severity="secondary" text @click="showDataCodeMapEditor = false" />
        <Button label="Apply" icon="pi pi-check" @click="applyDataCodeMapEditor" />
      </template>
    </Dialog>
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
  min-width: 280px;
}

.label {
  font-weight: 600;
  font-size: 0.9rem;
}

.loading-box {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  color: var(--text-color-secondary);
}

.no-data {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  color: var(--text-color-secondary);
}

.ag-wrapper {
  height: calc(100vh - 18rem);
  min-height: 30rem;
  width: 100%;
  border: 1px solid var(--surface-border);
  border-radius: 8px;
  overflow: hidden;
}

.inner-grid {
  height: 360px;
  border: 1px solid var(--surface-border);
  border-radius: 8px;
  overflow: hidden;
}

.ag-theme-local {
  height: 100%;
  width: 100%;
}

:deep(.condition-cell) {
  cursor: pointer;
  color: var(--primary-color);
  text-decoration: underline;
  text-underline-offset: 2px;
}

:deep(.readonly-cell) {
  opacity: 0.7;
  cursor: default;
}

</style>
