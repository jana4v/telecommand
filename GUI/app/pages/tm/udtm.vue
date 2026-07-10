<script setup lang='ts'>
import type { CellSelectionOptions, ColDef, GridApi } from 'ag-grid-community'
import {
  colorSchemeDarkBlue,
  colorSchemeLightCold,
  ModuleRegistry,
  themeQuartz,
} from 'ag-grid-community'
import { AllEnterpriseModule } from 'ag-grid-enterprise'
import { AgGridVue } from 'ag-grid-vue3'
import * as XLSX from 'xlsx'
import { computed, onMounted, ref, shallowRef } from 'vue'
import type { ConditionRule } from '@/components/tm/queryBuilderTypes'
import ConditionEditorWithBuilder from '@/components/tm/ConditionEditorWithBuilder.vue'
import { initMenu } from '@/composables/tm/SideNav'
import { parseLogicToRule } from '@/composables/tm/conditionLogic'
import { useConditionTelemetryCatalog } from '@/composables/tm/useConditionTelemetryCatalog'
import { useColorModeStore } from '~/stores/colorMode'

ModuleRegistry.registerModules([AllEnterpriseModule])

definePageMeta({ title: 'Telemetry - UDTM' })
initMenu(4)

interface UdtmUiRow {
  pid: string
  mnemonic: string
  type: string
  valueLogic: string
  resetLogic: string
  expectedValue: string
  ignoreChainComparision: boolean
  ignoreChangeDetection: boolean
  ignoreLimitCheck: boolean
  limitsText: string
  rangeText: string
  tolerance: string
}

interface UdtmBackendRow {
  row_index: number
  pid?: string
  mnemonic: string
  description: string
  type: string
  unit: string
  value: string
  valueLogic?: string
  resetLogic?: string
  expected_value?: string
  ignore_chain_comparision?: boolean
  ignore_change_detection?: boolean
  ignore_limit_check?: boolean
  limits?: string[]
  range?: string[]
  tolerance?: string
}

const storageKey = 'tm.udtm.rows.v2'
const { apiBase: gatewayBase } = useRuntimeConfig().public

const colorModeStore = useColorModeStore()
const gridApi = shallowRef<GridApi<UdtmUiRow> | null>(null)
const rowData = ref<UdtmUiRow[]>([])
const quickFilter = ref('')
const saving = ref(false)
const loading = ref(false)
const message = ref<{ type: 'success' | 'error', text: string } | null>(null)

const dslDialogVisible = ref(false)
const dslField = ref<'valueLogic' | 'resetLogic'>('valueLogic')
const dslDraft = ref('')
const dslRule = ref<ConditionRule | null>(null)
const editingRowPid = ref('')

const {
  selectedSubsystems: dslSubsystems,
  subsystemOptions: dslSubsystemOptions,
  mnemonics: dslMnemonics,
  loadSubsystems: loadDslSubsystems,
  loadCatalog: loadDslCatalog,
} = useConditionTelemetryCatalog(gatewayBase)
const listDialogVisible = ref(false)
const listField = ref<'limitsText' | 'rangeText'>('limitsText')
const listDraft = ref('')

const addRowCount = ref(1)
const importFileInputRef = ref<HTMLInputElement | null>(null)

const cellSelection = ref<boolean | CellSelectionOptions>({
  handle: { mode: 'fill' },
})

const defaultColDef: ColDef<UdtmUiRow> = {
  sortable: true,
  filter: true,
  resizable: true,
}

const gridTheme = computed(() =>
  colorModeStore.currentMode === 'dark'
    ? themeQuartz.withPart(colorSchemeDarkBlue)
    : themeQuartz.withPart(colorSchemeLightCold),
)

const columnDefs: ColDef<UdtmUiRow>[] = [
  {
    headerName: 'PID',
    field: 'pid',
    minWidth: 120,
    maxWidth: 180,
    editable: true,
    cellStyle: { fontWeight: '600' },
  },
  {
    headerName: 'Mnemonic',
    field: 'mnemonic',
    minWidth: 220,
    editable: true,
  },
  {
    headerName: 'Type',
    field: 'type',
    minWidth: 130,
    maxWidth: 150,
    editable: true,
    cellEditor: 'agSelectCellEditor',
    cellEditorParams: { values: ['ANALOG', 'BINARY'] },
  },
  {
    headerName: 'ValueLogic',
    field: 'valueLogic',
    minWidth: 360,
    editable: true,
    cellEditor: 'agLargeTextCellEditor',
    cellEditorPopup: true,
    valueFormatter: params => summarizeDsl(String(params.value ?? '')),
  },
  {
    headerName: 'ResetLogic',
    field: 'resetLogic',
    minWidth: 360,
    editable: true,
    cellEditor: 'agLargeTextCellEditor',
    cellEditorPopup: true,
    valueFormatter: params => summarizeDsl(String(params.value ?? '')),
  },
  {
    headerName: 'ExpectedValue',
    field: 'expectedValue',
    minWidth: 160,
    editable: true,
  },
  {
    headerName: 'Ignore Chain',
    field: 'ignoreChainComparision',
    minWidth: 140,
    maxWidth: 150,
    editable: true,
    cellDataType: 'boolean',
    cellRenderer: 'agCheckboxCellRenderer',
    cellEditor: 'agCheckboxCellEditor',
  },
  {
    headerName: 'Ignore Change',
    field: 'ignoreChangeDetection',
    minWidth: 150,
    maxWidth: 160,
    editable: true,
    cellDataType: 'boolean',
    cellRenderer: 'agCheckboxCellRenderer',
    cellEditor: 'agCheckboxCellEditor',
  },
  {
    headerName: 'Ignore Limit',
    field: 'ignoreLimitCheck',
    minWidth: 140,
    maxWidth: 150,
    editable: true,
    cellDataType: 'boolean',
    cellRenderer: 'agCheckboxCellRenderer',
    cellEditor: 'agCheckboxCellEditor',
  },
  {
    headerName: 'Limits',
    field: 'limitsText',
    minWidth: 220,
    editable: true,
    cellEditor: 'agLargeTextCellEditor',
    cellEditorPopup: true,
    valueFormatter: params => summarizeList(String(params.value ?? '')),
  },
  {
    headerName: 'Range',
    field: 'rangeText',
    minWidth: 220,
    editable: true,
    cellEditor: 'agLargeTextCellEditor',
    cellEditorPopup: true,
    valueFormatter: params => summarizeList(String(params.value ?? '')),
  },
  {
    headerName: 'Tolerance',
    field: 'tolerance',
    minWidth: 120,
    maxWidth: 150,
    editable: true,
  },
]

function summarizeDsl(input: string): string {
  const trimmed = input.trim()
  if (!trimmed)
    return ''
  const oneLine = trimmed.replace(/\s+/g, ' ')
  return oneLine.length > 90 ? `${oneLine.slice(0, 90)}...` : oneLine
}

function summarizeList(input: string): string {
  const values = splitMultiValueInput(input)
  if (values.length === 0)
    return ''
  if (values.length <= 3)
    return values.join(', ')
  return `${values.slice(0, 3).join(', ')} +${values.length - 3} more`
}

function rowTemplate(index: number): UdtmUiRow {
  return {
    pid: `UDTM${String(index + 1).padStart(4, '0')}`,
    mnemonic: '',
    type: 'BINARY',
    valueLogic: '',
    resetLogic: '',
    expectedValue: '',
    ignoreChainComparision: false,
    ignoreChangeDetection: false,
    ignoreLimitCheck: false,
    limitsText: '',
    rangeText: '',
    tolerance: '0',
  }
}

function splitMultiValueInput(input: string): string[] {
  return input
    .split(/[\n,]+/)
    .map(item => item.trim())
    .filter(Boolean)
}

function joinCsv(items: unknown): string {
  if (!Array.isArray(items))
    return ''
  return items.map(item => String(item ?? '').trim()).filter(Boolean).join(', ')
}

function normalizeRows(rows: unknown): UdtmUiRow[] {
  if (!Array.isArray(rows))
    return []

  return rows.map((row, idx) => {
    const r = row as Record<string, unknown>
    return {
      pid: String(r.pid ?? `UDTM${String(idx + 1).padStart(4, '0')}`),
      mnemonic: String(r.mnemonic ?? '').trim(),
      type: String(r.type ?? 'BINARY').toUpperCase(),
      valueLogic: String(r.valueLogic ?? ''),
      resetLogic: String(r.resetLogic ?? ''),
      expectedValue: String(r.expectedValue ?? r.expected_value ?? ''),
      ignoreChainComparision: Boolean(r.ignoreChainComparision ?? r.ignore_chain_comparision ?? false),
      ignoreChangeDetection: Boolean(r.ignoreChangeDetection ?? r.ignore_change_detection ?? false),
      ignoreLimitCheck: Boolean(r.ignoreLimitCheck ?? r.ignore_limit_check ?? false),
      limitsText: Array.isArray(r.limits) ? joinCsv(r.limits) : String(r.limitsText ?? ''),
      rangeText: Array.isArray(r.range) ? joinCsv(r.range) : String(r.rangeText ?? ''),
      tolerance: String(r.tolerance ?? '0'),
    }
  })
}

function saveLocal(rows: UdtmUiRow[]) {
  if (!import.meta.client)
    return
  window.localStorage.setItem(storageKey, JSON.stringify(rows))
}

function loadLocal(): UdtmUiRow[] {
  if (!import.meta.client)
    return []

  const raw = window.localStorage.getItem(storageKey)
  if (!raw)
    return []

  try {
    return normalizeRows(JSON.parse(raw))
  }
  catch {
    return []
  }
}

async function loadFromBackend(): Promise<UdtmUiRow[]> {
  const data = await $fetch<{ rows?: UdtmBackendRow[] }>(`${gatewayBase}/ud-tm`)
  const rows = data?.rows ?? []
  return rows.map((r, idx) => ({
    pid: String(r.pid ?? `UDTM${String(r.row_index ?? idx + 1).padStart(4, '0')}`),
    mnemonic: String(r.mnemonic ?? '').trim(),
    type: String(r.type ?? 'BINARY').toUpperCase(),
    valueLogic: String(r.valueLogic ?? ''),
    resetLogic: String(r.resetLogic ?? ''),
    expectedValue: String(r.expected_value ?? ''),
    ignoreChainComparision: Boolean(r.ignore_chain_comparision ?? false),
    ignoreChangeDetection: Boolean(r.ignore_change_detection ?? false),
    ignoreLimitCheck: Boolean(r.ignore_limit_check ?? false),
    limitsText: joinCsv(r.limits ?? []),
    rangeText: joinCsv(r.range ?? []),
    tolerance: String(r.tolerance ?? '0'),
  }))
}

async function initializeRows() {
  loading.value = true
  try {
    const localRows = loadLocal()
    if (localRows.length > 0) {
      rowData.value = localRows
      return
    }

    const backendRows = await loadFromBackend()
    rowData.value = backendRows.length > 0 ? backendRows : [rowTemplate(0)]
    saveLocal(rowData.value)
  }
  catch {
    rowData.value = [rowTemplate(0)]
  }
  finally {
    loading.value = false
  }
}

function onGridReady(params: { api: GridApi<UdtmUiRow> }) {
  gridApi.value = params.api
  params.api.autoSizeAllColumns()
}

function onFilterChanged() {
  gridApi.value?.setGridOption('quickFilterText', quickFilter.value)
}

function onCellValueChanged() {
  saveLocal(rowData.value)
}

function addRow() {
  const count = Math.max(1, Math.floor(addRowCount.value) || 1)
  const newRows = Array.from({ length: count }, (_, i) => rowTemplate(rowData.value.length + i))
  rowData.value = [...rowData.value, ...newRows]
  saveLocal(rowData.value)
}

// Maps a case-insensitive Excel header to the matching grid field. Keys
// match the grid's displayed headerName values (see columnDefs above).
const EXCEL_HEADER_TO_FIELD: Record<string, keyof UdtmUiRow> = {
  pid: 'pid',
  mnemonic: 'mnemonic',
  type: 'type',
  valuelogic: 'valueLogic',
  resetlogic: 'resetLogic',
  expectedvalue: 'expectedValue',
  'ignore chain': 'ignoreChainComparision',
  'ignore change': 'ignoreChangeDetection',
  'ignore limit': 'ignoreLimitCheck',
  limits: 'limitsText',
  range: 'rangeText',
  tolerance: 'tolerance',
}

const UDTM_BOOLEAN_FIELDS = new Set<keyof UdtmUiRow>([
  'ignoreChainComparision',
  'ignoreChangeDetection',
  'ignoreLimitCheck',
])

function parseBooleanCell(value: unknown): boolean {
  if (typeof value === 'boolean')
    return value
  const normalized = String(value ?? '').trim().toLowerCase()
  return normalized === 'true' || normalized === '1' || normalized === 'yes'
}

function excelRowToUdtmRow(raw: Record<string, unknown>, fallbackIndex: number): UdtmUiRow {
  const row = rowTemplate(fallbackIndex)
  for (const [header, value] of Object.entries(raw)) {
    const field = EXCEL_HEADER_TO_FIELD[header.trim().toLowerCase()]
    if (!field)
      continue
    if (UDTM_BOOLEAN_FIELDS.has(field))
      (row as any)[field] = parseBooleanCell(value)
    else
      (row as any)[field] = String(value ?? '').trim()
  }
  row.type = row.type.toUpperCase()
  return row
}

function triggerImportFile() {
  importFileInputRef.value?.click()
}

async function onImportFileSelected(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = '' // allow re-selecting the same file next time
  if (!file)
    return

  try {
    const buffer = await file.arrayBuffer()
    const workbook = XLSX.read(buffer, { type: 'array' })
    const sheetName = workbook.SheetNames[0]
    if (!sheetName)
      return

    const sheet = workbook.Sheets[sheetName]
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' })
    const imported = rows.map((r, idx) => excelRowToUdtmRow(r, rowData.value.length + idx))
    if (imported.length === 0) {
      message.value = { type: 'error', text: 'No rows found in the selected file.' }
      return
    }

    rowData.value = [...rowData.value, ...imported]
    saveLocal(rowData.value)
    message.value = { type: 'success', text: `Imported ${imported.length} row(s) from Excel.` }
  }
  catch (e: any) {
    message.value = { type: 'error', text: e?.message ?? 'Failed to import Excel file' }
  }
}

function deleteSelectedRows() {
  const selected = gridApi.value?.getSelectedRows() ?? []
  if (selected.length === 0)
    return

  const selectedSet = new Set(selected.map(r => `${r.pid}|${r.mnemonic}`))
  rowData.value = rowData.value.filter(r => !selectedSet.has(`${r.pid}|${r.mnemonic}`))

  if (rowData.value.length === 0)
    rowData.value = [rowTemplate(0)]

  saveLocal(rowData.value)
}

function openDslEditor(row: UdtmUiRow, field: 'valueLogic' | 'resetLogic') {
  editingRowPid.value = row.pid
  dslField.value = field
  const initial = field === 'valueLogic' ? row.valueLogic : row.resetLogic
  dslDraft.value = initial
  dslRule.value = parseLogicToRule(initial) || null
  dslDialogVisible.value = true
}

function openListEditor(row: UdtmUiRow, field: 'limitsText' | 'rangeText') {
  editingRowPid.value = row.pid
  listField.value = field
  listDraft.value = splitMultiValueInput(field === 'limitsText' ? row.limitsText : row.rangeText).join('\n')
  listDialogVisible.value = true
}

function onCellDoubleClicked(params: any) {
  const field = String(params?.colDef?.field ?? '')
  if (!params?.data)
    return

  if (field === 'valueLogic' || field === 'resetLogic') {
    openDslEditor(params.data as UdtmUiRow, field as 'valueLogic' | 'resetLogic')
    return
  }

  if (field === 'limitsText' || field === 'rangeText')
    openListEditor(params.data as UdtmUiRow, field as 'limitsText' | 'rangeText')
}

function applyDslDialog() {
  const idx = rowData.value.findIndex(r => r.pid === editingRowPid.value)
  if (idx < 0) {
    dslDialogVisible.value = false
    return
  }

  const current = rowData.value[idx]
  if (!current) {
    dslDialogVisible.value = false
    return
  }
  const updated: UdtmUiRow = {
    pid: current.pid,
    mnemonic: current.mnemonic,
    type: current.type,
    valueLogic: dslField.value === 'valueLogic' ? dslDraft.value : current.valueLogic,
    resetLogic: dslField.value === 'resetLogic' ? dslDraft.value : current.resetLogic,
    expectedValue: current.expectedValue,
    ignoreChainComparision: current.ignoreChainComparision,
    ignoreChangeDetection: current.ignoreChangeDetection,
    ignoreLimitCheck: current.ignoreLimitCheck,
    limitsText: current.limitsText,
    rangeText: current.rangeText,
    tolerance: current.tolerance,
  }

  const next = [...rowData.value]
  next[idx] = updated
  rowData.value = next
  saveLocal(rowData.value)
  dslDialogVisible.value = false
}

function applyListDialog() {
  const idx = rowData.value.findIndex(r => r.pid === editingRowPid.value)
  if (idx < 0) {
    listDialogVisible.value = false
    return
  }

  const current = rowData.value[idx]
  if (!current) {
    listDialogVisible.value = false
    return
  }

  const normalized = splitMultiValueInput(listDraft.value).join(', ')
  const updated: UdtmUiRow = {
    pid: current.pid,
    mnemonic: current.mnemonic,
    type: current.type,
    valueLogic: current.valueLogic,
    resetLogic: current.resetLogic,
    expectedValue: current.expectedValue,
    ignoreChainComparision: current.ignoreChainComparision,
    ignoreChangeDetection: current.ignoreChangeDetection,
    ignoreLimitCheck: current.ignoreLimitCheck,
    limitsText: listField.value === 'limitsText' ? normalized : current.limitsText,
    rangeText: listField.value === 'rangeText' ? normalized : current.rangeText,
    tolerance: current.tolerance,
  }

  const next = [...rowData.value]
  next[idx] = updated
  rowData.value = next
  saveLocal(rowData.value)
  listDialogVisible.value = false
}

function toBackendRows(rows: UdtmUiRow[]): UdtmBackendRow[] {
  return rows
    .map((r, idx) => ({
      row_index: Number.parseInt(r.pid, 10) || idx + 1,
      pid: String(r.pid ?? '').trim(),
      mnemonic: String(r.mnemonic ?? '').trim(),
      description: String(r.mnemonic ?? '').trim(),
      type: (String(r.type ?? '').trim().toUpperCase() === 'ANALOG') ? 'ANALOG' : 'BINARY',
      unit: '',
      value: '',
      valueLogic: String(r.valueLogic ?? ''),
      resetLogic: String(r.resetLogic ?? ''),
      expected_value: String(r.expectedValue ?? '').trim(),
      ignore_chain_comparision: Boolean(r.ignoreChainComparision),
      ignore_change_detection: Boolean(r.ignoreChangeDetection),
      ignore_limit_check: Boolean(r.ignoreLimitCheck),
      limits: splitMultiValueInput(String(r.limitsText ?? '')),
      range: splitMultiValueInput(String(r.rangeText ?? '')),
      tolerance: String(r.tolerance ?? '0').trim() || '0',
    }))
    .filter(r => r.mnemonic.length > 0 && r.pid.length > 0)
}

async function saveChanges() {
  saving.value = true
  message.value = null
  try {
    saveLocal(rowData.value)

    const rows = toBackendRows(rowData.value)
    await $fetch(`${gatewayBase}/ud-tm`, {
      method: 'POST',
      body: {
        project: 'default',
        created_by: 'gui',
        change_message: 'udtm row update',
        rows,
      },
    })

    message.value = {
      type: 'success',
      text: 'UDTM rows saved to tm_mnemonics.',
    }
  }
  catch (e: any) {
    message.value = {
      type: 'error',
      text: e?.data?.error ?? 'Failed to save UDTM rows',
    }
  }
  finally {
    saving.value = false
  }
}

onMounted(async () => {
  await initializeRows()
  await loadDslSubsystems()
  await loadDslCatalog()
})
</script>

<template>
  <div class="content p-4">
    <AppName appname="UDTM (User Defined Telemetry)" />

    <div class="controls mt-4">
      <InputNumber v-model="addRowCount" :min="1" show-buttons button-layout="horizontal" class="add-row-count" />
      <Button label="Add Row" icon="pi pi-plus" @click="addRow" />
      <Button label="Import from Excel" icon="pi pi-file-excel" outlined @click="triggerImportFile" />
      <input
        ref="importFileInputRef"
        type="file"
        accept=".xlsx,.xls"
        class="hidden-file-input"
        @change="onImportFileSelected"
      >
      <Button label="Delete Selected" icon="pi pi-trash" severity="danger" outlined @click="deleteSelectedRows" />
      <Button label="Save Changes" icon="pi pi-save" :loading="saving" @click="saveChanges" />

      <InputText
        v-model="quickFilter"
        placeholder="Quick filter..."
        class="quick-filter"
        @input="onFilterChanged"
      />
    </div>

    <Message v-if="message" :severity="message.type === 'success' ? 'success' : 'error'" class="mt-3">
      {{ message.text }}
    </Message>

    <div v-if="loading" class="flex align-items-center gap-2 mt-4 text-muted">
      <i class="pi pi-spin pi-spinner" /> Loading UDTM rows...
    </div>

    <div v-else class="ag-wrapper mt-4">
      <AgGridVue
        :theme="gridTheme"
        class="ag-theme-local"
        :row-data="rowData"
        :column-defs="columnDefs"
        :default-col-def="defaultColDef"
        :cell-selection="cellSelection"
        row-selection="multiple"
        :stop-editing-when-cells-lose-focus="true"
        :animate-rows="true"
        @grid-ready="onGridReady"
        @cell-value-changed="onCellValueChanged"
        @cell-double-clicked="onCellDoubleClicked"
      />
    </div>

    <Dialog
      v-model:visible="dslDialogVisible"
      modal
      :header="dslField === 'valueLogic' ? 'Edit ValueLogic DSL' : 'Edit ResetLogic DSL'"
      :style="{ width: '70vw', maxWidth: '1100px' }"
    >
      <ConditionEditorWithBuilder
        v-model="dslDraft"
        v-model:rule="dslRule"
        v-model:subsystems="dslSubsystems"
        :subsystem-options="dslSubsystemOptions"
        :mnemonics="dslMnemonics"
        height="55vh"
      />

      <div class="hint mt-2">
        Keep ValueLogic blank if this telemetry is injected by another service.
      </div>

      <template #footer>
        <Button label="Cancel" text @click="dslDialogVisible = false" />
        <Button label="Apply" icon="pi pi-check" @click="applyDslDialog" />
      </template>
    </Dialog>

    <Dialog
      v-model:visible="listDialogVisible"
      modal
      :header="listField === 'limitsText' ? 'Edit Limits' : 'Edit Range'"
      :style="{ width: '42rem', maxWidth: '92vw' }"
    >
      <div class="list-editor-copy mb-3">
        Enter one value per line. Commas are also accepted and will be normalized automatically.
      </div>

      <Textarea
        v-model="listDraft"
        rows="12"
        class="w-full list-editor-input"
        auto-resize
        placeholder="Example:\nPRESENT\nABSENT"
      />

      <div class="list-preview mt-3">
        <div class="list-preview-label">
          Preview
        </div>
        <div class="list-preview-values">
          <span
            v-for="item in splitMultiValueInput(listDraft)"
            :key="item"
            class="list-preview-chip"
          >
            {{ item }}
          </span>
          <span v-if="splitMultiValueInput(listDraft).length === 0" class="list-preview-empty">
            No values entered
          </span>
        </div>
      </div>

      <template #footer>
        <Button label="Cancel" text @click="listDialogVisible = false" />
        <Button label="Apply" icon="pi pi-check" @click="applyListDialog" />
      </template>
    </Dialog>
  </div>
</template>

<style scoped lang='scss'>
.controls {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.quick-filter {
  margin-left: auto;
  min-width: 260px;
}

.add-row-count {
  width: 6rem;
}

.hidden-file-input {
  display: none;
}

.ag-wrapper {
  height: calc(100vh - 19rem);
  min-height: 26rem;
  width: 100%;
  border: 1px solid var(--surface-border);
  border-radius: 8px;
  overflow: hidden;
}

.ag-theme-local {
  height: 100%;
  width: 100%;
}

.hint {
  color: var(--text-color-secondary);
  font-size: 0.88rem;
}

.list-editor-copy {
  color: var(--text-color-secondary);
  font-size: 0.92rem;
}

.list-editor-input {
  font-family: var(--font-family);
}

.list-preview-label {
  font-size: 0.9rem;
  font-weight: 600;
  margin-bottom: 0.5rem;
}

.list-preview-values {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  min-height: 2.5rem;
  padding: 0.75rem;
  border: 1px solid var(--surface-border);
  border-radius: 8px;
  background: var(--surface-ground);
}

.list-preview-chip {
  display: inline-flex;
  align-items: center;
  padding: 0.3rem 0.65rem;
  border-radius: 999px;
  background: color-mix(in srgb, var(--primary-color) 14%, transparent);
  color: var(--text-color);
  font-size: 0.9rem;
  border: 1px solid color-mix(in srgb, var(--primary-color) 30%, transparent);
}

.list-preview-empty {
  color: var(--text-color-secondary);
  font-size: 0.9rem;
}

.text-muted {
  color: var(--text-color-secondary);
}
</style>
