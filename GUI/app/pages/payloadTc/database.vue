<script setup lang="ts">
import type { ColDef } from 'ag-grid-community'
import {
  colorSchemeDarkBlue,
  colorSchemeLightCold,
  ModuleRegistry,
  themeQuartz,
} from 'ag-grid-community'
import { AllEnterpriseModule } from 'ag-grid-enterprise'
import { AgGridVue } from 'ag-grid-vue3'
import { computed, onMounted, ref, watch } from 'vue'
import { initMenu } from '@/composables/PayloadTc/SideNav'
import TcDataCommandMapsPage from '@/pages/tc/dataCommandMaps.vue'
import TcUploadPage from '@/pages/tc/index.vue'
import TcUpdateDbPage from '@/pages/tc/updateDb.vue'
import { useColorModeStore } from '~/stores/colorMode'

ModuleRegistry.registerModules([AllEnterpriseModule])

definePageMeta({ title: 'Telecommand - Database' })
initMenu(5)

interface TelecommandEditorRow {
  command: string
  parameter: string
}

interface PLConfigBasedTCRow {
  cfgNo: number
  lable: string
  telecommands: TelecommandEditorRow[]
}

interface MacroCommandOption {
  value: string
  cmdId: string
  cmdDesc: string
  cmdType: string
  dataCodeMapName: string
}

interface MacroCommandRow {
  mnemonic: string
  value: string
}

interface MacroRow {
  id: string
  cmdId: string
  macroName: string
  commands: MacroCommandRow[]
  createdAt?: string
  updatedAt?: string
}

const colorModeStore = useColorModeStore()
const { apiBase: gatewayBase } = useRuntimeConfig().public

type SideNavKey = 'UploadTCFile' | 'UpdateTCDB' | 'DataCommandMaps' | 'Macros' | 'PLConfigBasedTC' | 'PayloadConfigBoa' | 'CfgTmToLog' | 'OnOffCommands' | 'PlTcFiles' | 'AddonCommands'
interface SideNavItem {
  key: SideNavKey
  label: string
  embedded?: boolean
}

const selectedTable = ref<SideNavKey>('PLConfigBasedTC')
const tableItems: SideNavItem[] = [
  { key: 'UploadTCFile', label: 'Upload TC File', embedded: true },
  { key: 'UpdateTCDB', label: 'Update TC DB', embedded: true },
  { key: 'DataCommandMaps', label: 'Data Command Maps', embedded: true },
  { key: 'Macros', label: 'Macros' },
  { key: 'PLConfigBasedTC', label: 'PLConfigBasedTC' },
  { key: 'PayloadConfigBoa', label: 'PayloadConfigBoa' },
  { key: 'CfgTmToLog', label: 'CfgTmToLog' },
  { key: 'OnOffCommands', label: 'On_Off_Commands' },
  { key: 'PlTcFiles', label: 'PL_TC_FILES' },
  { key: 'AddonCommands', label: 'ADDON_COMMANDS' },
]

const selectedEmbeddedComponent = computed(() => {
  if (selectedTable.value === 'UploadTCFile')
    return TcUploadPage
  if (selectedTable.value === 'UpdateTCDB')
    return TcUpdateDbPage
  if (selectedTable.value === 'DataCommandMaps')
    return TcDataCommandMapsPage
  return null
})

const loading = ref(false)
const saving = ref(false)
const message = ref<{ type: 'success' | 'error', text: string } | null>(null)
const quickFilter = ref('')
const rowData = ref<PLConfigBasedTCRow[]>([])
const changed = ref(false)
const gridApi = ref<any>(null)

const showTelecommandEditor = ref(false)
const telecommandEditRowCfgNo = ref<number | null>(null)
const telecommandRows = ref<TelecommandEditorRow[]>([])
const telecommandGridApi = ref<any>(null)

const subsystemOptions = ref<string[]>([])
const selectedSubsystems = ref<string[]>(['PLD', 'TTC'])
const commandOptions = ref<string[]>([])
const parameterOptions = ref<string[]>([])

const gridTheme = computed(() =>
  colorModeStore.currentMode === 'dark'
    ? themeQuartz.withPart(colorSchemeDarkBlue)
    : themeQuartz.withPart(colorSchemeLightCold),
)

const mainColumnDefs = ref<ColDef<PLConfigBasedTCRow>[]>([
  {
    headerName: 'CFG_NO',
    field: 'cfgNo',
    minWidth: 130,
    editable: true,
    valueParser: p => parseIntSafe(p.newValue, 0),
  },
  {
    headerName: 'LABLE',
    field: 'lable',
    minWidth: 260,
    editable: true,
  },
  {
    headerName: 'Telecommands',
    field: 'telecommands',
    minWidth: 260,
    editable: true,
    cellClass: 'link-cell',
    valueGetter: (params: any) => serializeTelecommands(params.data?.telecommands || []),
    valueSetter: (params: any) => {
      params.data.telecommands = parseTelecommandsText(String(params.newValue || ''))
      return true
    },
    valueFormatter: (p: any) => String(p.value || ''),
  },
])

const telecommandColumnDefs = ref<ColDef<TelecommandEditorRow>[]>([
  {
    headerName: 'command',
    field: 'command',
    minWidth: 700,
    editable: true,
    cellEditor: 'agRichSelectCellEditor',
    cellEditorPopup: false,
    cellEditorParams: () => ({
      values: commandOptions.value,
      allowTyping: true,
      filterList: true,
      searchType: 'matchAny',
      highlightMatch: true,
    }),
  },
  {
    headerName: 'parameter',
    field: 'parameter',
    minWidth: 280,
    editable: true,
    cellEditor: 'agRichSelectCellEditor',
    cellEditorPopup: false,
    cellEditorParams: () => ({
      values: parameterOptions.value,
      allowTyping: true,
      filterList: true,
      searchType: 'matchAny',
      highlightMatch: true,
    }),
  },
])

const defaultColDef: ColDef = {
  sortable: true,
  filter: true,
  resizable: true,
}

onMounted(async () => {
  await Promise.all([
    loadSubsystemOptions(),
    loadParameterOptions(),
    loadRows(),
  ])
  if (subsystemOptions.value.length > 0) {
    const validSelected = selectedSubsystems.value.filter(s => subsystemOptions.value.includes(s))
    if (validSelected.length === 0)
      selectedSubsystems.value = [...subsystemOptions.value]
  }
  await loadCommandOptions()
})

watch(quickFilter, (value) => {
  gridApi.value?.setGridOption('quickFilterText', value)
})

watch(selectedSubsystems, async () => {
  await loadCommandOptions()
})

function parseIntSafe(value: unknown, def: number): number {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? Math.trunc(parsed) : def
}

function parseFloatSafe(value: unknown, def: number): number {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : def
}

function cloneTelecommands(rows: TelecommandEditorRow[]): TelecommandEditorRow[] {
  return rows.map(row => ({ command: String(row.command || ''), parameter: String(row.parameter || '') }))
}

function serializeTelecommands(rows: TelecommandEditorRow[]): string {
  return cloneTelecommands(rows)
    .filter(row => row.command.trim() !== '' || row.parameter.trim() !== '')
    .map((row) => {
      const cmd = row.command.trim()
      const param = row.parameter.trim()
      return param ? `${cmd} ${param}` : cmd
    })
    .join('; ')
}

function parseTelecommandsText(raw: string): TelecommandEditorRow[] {
  return String(raw || '')
    .split(';')
    .map(token => token.trim())
    .filter(Boolean)
    .map((token) => {
      const parts = token.split(/\s+/, 2)
      return {
        command: String(parts[0] || '').trim(),
        parameter: String(parts[1] || '').trim(),
      }
    })
}

function onGridReady(params: any) {
  gridApi.value = params.api
  params.api.setGridOption('quickFilterText', quickFilter.value)
}

function onCellValueChanged() {
  changed.value = true
}

function onCellDoubleClicked(params: any) {
  const field = String(params?.colDef?.field || '')
  if (field !== 'telecommands')
    return
  const row = params?.data as PLConfigBasedTCRow | undefined
  if (!row)
    return
  openTelecommandsEditor(row)
}

async function loadRows() {
  loading.value = true
  message.value = null
  try {
    const res = await $fetch<{ success: boolean, items: PLConfigBasedTCRow[] }>(`${gatewayBase}/payloadtc/database/pl-config-based-tc`)
    rowData.value = (res?.items || []).map(item => ({
      cfgNo: Number(item.cfgNo || 0),
      lable: String(item.lable || ''),
      telecommands: Array.isArray(item.telecommands) ? cloneTelecommands(item.telecommands) : [],
    }))
    changed.value = false
  }
  catch (e: any) {
    rowData.value = []
    message.value = { type: 'error', text: e?.data?.error ?? 'Failed to load PLConfigBasedTC data' }
  }
  finally {
    loading.value = false
  }
}

async function loadSubsystemOptions() {
  try {
    const res = await $fetch<{ success: boolean, items: string[] }>(`${gatewayBase}/payloadtc/database/options/tc-subsystems`)
    subsystemOptions.value = res?.items || []
  }
  catch {
    subsystemOptions.value = []
  }
}

async function loadCommandOptions() {
  const selected = selectedSubsystems.value.filter(Boolean)
  const query = selected.length > 0 ? `?subsystems=${encodeURIComponent(selected.join(','))}` : ''
  try {
    const res = await $fetch<{ success: boolean, items: Array<{ value: string }> }>(`${gatewayBase}/payloadtc/database/options/tc-commands${query}`)
    commandOptions.value = (res?.items || []).map(item => String(item.value || '')).filter(Boolean)
  }
  catch {
    commandOptions.value = []
  }
}

async function loadParameterOptions() {
  try {
    const res = await $fetch<{ success: boolean, items: string[] }>(`${gatewayBase}/payloadtc/database/options/test-parameters`)
    parameterOptions.value = (res?.items || []).filter(Boolean)
  }
  catch {
    parameterOptions.value = []
  }
}

function addMainRow() {
  const nextCfg = Math.max(0, ...rowData.value.map(r => Number(r.cfgNo || 0))) + 1
  rowData.value = [...rowData.value, { cfgNo: nextCfg, lable: '', telecommands: [] }]
  changed.value = true
}

function deleteSelectedMainRows() {
  const selectedRows = gridApi.value?.getSelectedRows?.() || []
  if (!selectedRows.length)
    return
  const selectedSet = new Set(selectedRows)
  rowData.value = rowData.value.filter(row => !selectedSet.has(row))
  changed.value = true
}

async function saveMainRows() {
  saving.value = true
  message.value = null
  try {
    const items = rowData.value
      .filter(row => Number(row.cfgNo) > 0)
      .map(row => ({
        cfgNo: Number(row.cfgNo),
        lable: String(row.lable || '').trim(),
        telecommands: cloneTelecommands(row.telecommands || []),
      }))

    await $fetch(`${gatewayBase}/payloadtc/database/pl-config-based-tc`, {
      method: 'PUT',
      body: { items },
    })

    changed.value = false
    message.value = { type: 'success', text: `Saved ${items.length} row(s) in PLConfigBasedTC.` }
    await loadRows()
  }
  catch (e: any) {
    message.value = { type: 'error', text: e?.data?.error ?? 'Failed to save PLConfigBasedTC' }
  }
  finally {
    saving.value = false
  }
}

function openTelecommandsEditor(row: PLConfigBasedTCRow) {
  telecommandEditRowCfgNo.value = Number(row.cfgNo)
  telecommandRows.value = cloneTelecommands(row.telecommands || [])
  if (telecommandRows.value.length === 0)
    telecommandRows.value = [{ command: '', parameter: '' }]
  showTelecommandEditor.value = true
}

function onTelecommandGridReady(params: any) {
  telecommandGridApi.value = params.api
}

function addTelecommandRow() {
  telecommandRows.value = [...telecommandRows.value, { command: '', parameter: '' }]
}

function deleteSelectedTelecommandRows() {
  const selectedRows = telecommandGridApi.value?.getSelectedRows?.() || []
  if (!selectedRows.length)
    return
  const selectedSet = new Set(selectedRows)
  telecommandRows.value = telecommandRows.value.filter(row => !selectedSet.has(row))
}

function applyTelecommands() {
  const cfgNo = telecommandEditRowCfgNo.value
  if (cfgNo == null)
    return

  const row = rowData.value.find(item => Number(item.cfgNo) === Number(cfgNo))
  if (!row)
    return

  row.telecommands = cloneTelecommands(telecommandRows.value)
    .filter(item => item.command.trim() !== '' || item.parameter.trim() !== '')

  changed.value = true
  showTelecommandEditor.value = false
}

// ── Macros ───────────────────────────────────────────────────────────────────

const macroSubsystemOptions = ref<string[]>([])
const macroSelectedSubsystems = ref<string[]>(['PLD', 'TTC'])
const macroCommandOptions = ref<MacroCommandOption[]>([])
const macroDataMapValuesCache = ref<Record<string, string[]>>({})
const macroRowData = ref<MacroRow[]>([])
const macroLoading = ref(false)
const macroSaving = ref(false)
const macroChanged = ref(false)
const macroMessage = ref<{ type: 'success' | 'error', text: string } | null>(null)
const macroQuickFilter = ref('')
const macroGridApi = ref<any>(null)

const showMacroEditor = ref(false)
const macroEditorTargetID = ref('')
const macroEditorRows = ref<MacroCommandRow[]>([])
const macroEditorGridApi = ref<any>(null)

const macroColumnDefs = ref<ColDef<MacroRow>[]>([
  {
    headerName: 'MacroName',
    field: 'macroName',
    minWidth: 280,
    editable: true,
  },
  {
    headerName: 'commands',
    field: 'commands',
    minWidth: 260,
    cellClass: 'link-cell',
    editable: false,
    valueFormatter: p => `${Array.isArray(p.value) ? p.value.length : 0} item(s)`,
  },
])

const macroEditorColumnDefs = computed<ColDef<MacroCommandRow>[]>(() => [
  {
    headerName: 'mnemonic',
    field: 'mnemonic',
    minWidth: 720,
    editable: true,
    cellEditor: 'agRichSelectCellEditor',
    cellEditorPopup: false,
    cellEditorParams: () => ({
      values: macroCommandOptions.value.map(o => o.value),
      allowTyping: true,
      filterList: true,
      searchType: 'matchAny',
      highlightMatch: true,
    }),
  },
  {
    headerName: 'value',
    field: 'value',
    minWidth: 260,
    editable: true,
    cellEditor: 'agRichSelectCellEditor',
    cellEditorPopup: false,
    cellEditorParams: (params: any) => ({
      values: getMacroValueOptions(String(params.data?.mnemonic || '')),
      allowTyping: true,
      filterList: true,
      searchType: 'matchAny',
      highlightMatch: true,
    }),
  },
])

function findMacroCommandOption(mnemonicValue: string): MacroCommandOption | undefined {
  return macroCommandOptions.value.find(o => o.value === mnemonicValue)
}

function getMacroValueOptions(mnemonicValue: string): string[] {
  return macroDataMapValuesCache.value[mnemonicValue] || []
}

async function loadMacroSubsystemOptions() {
  try {
    const res = await $fetch<{ success: boolean, items: string[] }>(`${gatewayBase}/payloadtc/database/options/tc-subsystems`)
    macroSubsystemOptions.value = (res?.items || []).filter(item => item !== 'PLMACRO')
  }
  catch {
    macroSubsystemOptions.value = []
  }
}

async function loadMacroCommandOptions() {
  const selected = macroSelectedSubsystems.value.filter(Boolean)
  const query = selected.length > 0 ? `?subsystems=${encodeURIComponent(selected.join(','))}` : ''
  try {
    const res = await $fetch<{ success: boolean, items: MacroCommandOption[] }>(`${gatewayBase}/payloadtc/database/options/macro-commands${query}`)
    macroCommandOptions.value = res?.items || []
  }
  catch {
    macroCommandOptions.value = []
  }
}

async function fetchMacroDataMapValues(mnemonicValue: string) {
  if (!mnemonicValue || mnemonicValue in macroDataMapValuesCache.value)
    return
  const opt = findMacroCommandOption(mnemonicValue)
  if (!opt || opt.cmdType !== 'data' || !opt.dataCodeMapName) {
    macroDataMapValuesCache.value = { ...macroDataMapValuesCache.value, [mnemonicValue]: [] }
    return
  }
  try {
    const res = await $fetch<{ success: boolean, items: string[] }>(
      `${gatewayBase}/payloadtc/database/options/data-map-values?mapName=${encodeURIComponent(opt.dataCodeMapName)}`,
    )
    macroDataMapValuesCache.value = { ...macroDataMapValuesCache.value, [mnemonicValue]: res?.items || [] }
  }
  catch {
    macroDataMapValuesCache.value = { ...macroDataMapValuesCache.value, [mnemonicValue]: [] }
  }
}

async function loadMacroRows() {
  macroLoading.value = true
  macroMessage.value = null
  try {
    const res = await $fetch<{ success: boolean, items: MacroRow[] }>(`${gatewayBase}/payloadtc/database/macros`)
    macroRowData.value = (res?.items || []).map(item => ({
      id: String(item.id || item.cmdId || ''),
      cmdId: String(item.cmdId || item.id || ''),
      macroName: String(item.macroName || ''),
      commands: Array.isArray(item.commands)
        ? item.commands.map(c => ({ mnemonic: String(c?.mnemonic || ''), value: String(c?.value || '') }))
        : [],
      createdAt: String(item.createdAt || ''),
      updatedAt: String(item.updatedAt || ''),
    }))
    macroChanged.value = false
    const usedMnemonics = new Set<string>()
    for (const row of macroRowData.value) {
      for (const cmd of row.commands) {
        if (cmd.mnemonic)
          usedMnemonics.add(cmd.mnemonic)
      }
    }
    await Promise.all([...usedMnemonics].map(m => fetchMacroDataMapValues(m)))
  }
  catch (e: any) {
    macroRowData.value = []
    macroMessage.value = { type: 'error', text: e?.data?.error ?? 'Failed to load Macros' }
  }
  finally {
    macroLoading.value = false
  }
}

function onMacroGridReady(params: any) {
  macroGridApi.value = params.api
  params.api.setGridOption('quickFilterText', macroQuickFilter.value)
}

function onMacroCellValueChanged() {
  macroChanged.value = true
}

function onMacroCellDoubleClicked(params: any) {
  const field = String(params?.colDef?.field || '')
  if (field !== 'commands')
    return
  const row = params?.data as MacroRow | undefined
  if (!row)
    return
  openMacroEditor(row)
}

function addMacroRow() {
  macroRowData.value = [...macroRowData.value, { id: '', cmdId: '', macroName: '', commands: [] }]
  macroChanged.value = true
}

function deleteSelectedMacroRows() {
  const selectedRows = macroGridApi.value?.getSelectedRows?.() || []
  if (!selectedRows.length)
    return
  const selectedSet = new Set(selectedRows)
  macroRowData.value = macroRowData.value.filter(row => !selectedSet.has(row))
  macroChanged.value = true
}

async function openMacroEditor(row: MacroRow) {
  macroEditorTargetID.value = row.id || row.cmdId || ''
  macroEditorRows.value = (row.commands || []).map(item => ({
    mnemonic: String(item?.mnemonic || ''),
    value: String(item?.value || ''),
  }))
  if (macroEditorRows.value.length === 0)
    macroEditorRows.value = [{ mnemonic: '', value: '' }]
  if (macroCommandOptions.value.length === 0)
    await loadMacroCommandOptions()
  showMacroEditor.value = true
}

function onMacroEditorGridReady(params: any) {
  macroEditorGridApi.value = params.api
}

function addMacroEditorRow() {
  macroEditorRows.value = [...macroEditorRows.value, { mnemonic: '', value: '' }]
}

function deleteSelectedMacroEditorRows() {
  const selectedRows = macroEditorGridApi.value?.getSelectedRows?.() || []
  if (!selectedRows.length)
    return
  const selectedSet = new Set(selectedRows)
  macroEditorRows.value = macroEditorRows.value.filter(row => !selectedSet.has(row))
}

async function onMacroEditorCellValueChanged(params: any) {
  if (String(params?.colDef?.field || '') !== 'mnemonic')
    return
  const mnemonic = String(params?.newValue || '')
  const row = params?.data as MacroCommandRow
  if (!row)
    return
  row.value = ''
  if (mnemonic)
    await fetchMacroDataMapValues(mnemonic)
}

function applyMacroCommands() {
  const target = macroRowData.value.find(row => (row.id || row.cmdId || '') === macroEditorTargetID.value)
  if (!target)
    return

  const filtered = macroEditorRows.value
    .map(row => ({ mnemonic: String(row.mnemonic || '').trim(), value: String(row.value || '').trim() }))
    .filter(row => row.mnemonic !== '')

  for (const row of filtered) {
    const opt = findMacroCommandOption(row.mnemonic)
    if (opt?.cmdType === 'data' && !row.value) {
      macroMessage.value = { type: 'error', text: `Value is required for data mnemonic: ${row.mnemonic}` }
      return
    }
  }

  target.commands = filtered
  macroChanged.value = true
  showMacroEditor.value = false
}

async function saveMacroRows() {
  macroSaving.value = true
  macroMessage.value = null
  try {
    const items = macroRowData.value
      .map((row, index) => ({
        id: String(row.id || row.cmdId || ''),
        cmdId: String(row.cmdId || row.id || ''),
        macroName: String(row.macroName || '').trim(),
        commands: (row.commands || [])
          .map(cmd => ({ mnemonic: String(cmd?.mnemonic || '').trim(), value: String(cmd?.value || '').trim() }))
          .filter(cmd => cmd.mnemonic !== ''),
        createdAt: String(row.createdAt || ''),
        order: index,
      }))
      .filter(row => row.macroName !== '')

    for (const row of items) {
      for (const cmd of row.commands) {
        const opt = findMacroCommandOption(cmd.mnemonic)
        if (opt?.cmdType === 'data' && !cmd.value)
          throw new Error(`Value is required for data mnemonic: ${cmd.mnemonic}`)
      }
    }

    await $fetch(`${gatewayBase}/payloadtc/database/macros`, {
      method: 'PUT',
      body: {
        items: items.map(({ order, ...rest }) => rest),
      },
    })

    macroChanged.value = false
    macroMessage.value = { type: 'success', text: `Saved ${items.length} macro row(s).` }
    await loadMacroRows()
  }
  catch (e: any) {
    macroMessage.value = { type: 'error', text: e?.data?.error ?? e?.message ?? 'Failed to save macros' }
  }
  finally {
    macroSaving.value = false
  }
}

watch(macroSelectedSubsystems, async () => {
  await loadMacroCommandOptions()
})

watch(macroQuickFilter, (value) => {
  macroGridApi.value?.setGridOption('quickFilterText', value)
})

// ── PayloadConfigBoa ─────────────────────────────────────────────────────────

interface DataCommandOption {
  value: string
  cmdId: string
  cmdDesc: string
  dataCodeMapName: string
}

interface PayloadConfigBoaRow {
  cfgNo: number
  dataCommand: string
  residualBoa: string
  [key: string]: any
}

interface OnOffCommandRow {
  id?: number
  onCommand: string
  offCommand: string
  subsystems: string[]
  expectedCurrentWithRf?: number
  updatedAt?: string
}

interface CfgTmToLogRow {
  id?: number
  cfgOrChannel: string
  type: 'LOG' | 'AMPL_CAL' | 'AMPL_CAL_PTM'
  mnemonics: string[]
  subsystems: string[]
  updatedAt?: string
}

interface PlTcFileRow {
  id?: number
  fileName: string
  cfgOrChannelNo: string
  parameter: string
  updatedAt?: string
}

interface AddonCommandRow {
  sno?: number
  atStart: string
  atEnd: string
  updatedAt?: string
}

interface CfgTmToLogMnemonicRow {
  mnemonic: string
}

const boaSubsystemOptions = ref<string[]>([])
const boaSelectedSubsystems = ref<string[]>(['PLD', 'TTC'])
const boaColumnNames = ref<string[]>([])
const boaDataCommandOptions = ref<DataCommandOption[]>([])
const boaDataCommands = computed(() => boaDataCommandOptions.value.map(o => o.value))
const dataMapValuesCache = ref<Record<string, string[]>>({})
const boaRowData = ref<PayloadConfigBoaRow[]>([])
const boaLoading = ref(false)
const boaSaving = ref(false)
const boaChanged = ref(false)
const boaMessage = ref<{ type: 'success' | 'error', text: string } | null>(null)
const boaQuickFilter = ref('')
const boaGridApi = ref<any>(null)

function getDataMapValues(commandValue: string): string[] {
  return dataMapValuesCache.value[commandValue] || []
}

const boaColumnDefs = computed<ColDef<PayloadConfigBoaRow>[]>(() => [
  {
    headerName: 'CFG_NO',
    field: 'cfgNo',
    minWidth: 120,
    editable: true,
    valueParser: (p: any) => parseIntSafe(p.newValue, 0),
  },
  {
    headerName: 'DataCommand',
    field: 'dataCommand',
    minWidth: 450,
    editable: true,
    cellEditor: 'agRichSelectCellEditor',
    cellEditorPopup: false,
    cellEditorParams: () => ({
      values: boaDataCommands.value,
      allowTyping: true,
      filterList: true,
      searchType: 'matchAny',
      highlightMatch: true,
    }),
  },
  ...boaColumnNames.value.map(colName => ({
    headerName: colName,
    field: colName,
    minWidth: 180,
    editable: true,
    cellEditor: 'agRichSelectCellEditor',
    cellEditorPopup: false,
    cellEditorParams: (params: any) => ({
      values: getDataMapValues(String(params.data?.dataCommand || '')),
      allowTyping: true,
      filterList: true,
      searchType: 'matchAny',
      highlightMatch: true,
    }),
  } as ColDef<PayloadConfigBoaRow>)),
  {
    headerName: 'RESIDUAL_BOA',
    field: 'residualBoa',
    minWidth: 200,
    editable: true,
    cellEditor: 'agRichSelectCellEditor',
    cellEditorPopup: false,
    cellEditorParams: (params: any) => ({
      values: getDataMapValues(String(params.data?.dataCommand || '')),
      allowTyping: true,
      filterList: true,
      searchType: 'matchAny',
      highlightMatch: true,
    }),
  },
])

const boaDefaultColDef: ColDef = { sortable: true, filter: true, resizable: true }

// ── On_Off_Commands ───────────────────────────────────────────────────────────

const onOffSubsystemOptions = ref<string[]>([])
const onOffSelectedSubsystems = ref<string[]>(['PLD', 'TTC'])
const onOffCommandOptions = ref<string[]>([])
const onOffRowData = ref<OnOffCommandRow[]>([])
const onOffLoading = ref(false)
const onOffSaving = ref(false)
const onOffChanged = ref(false)
const onOffMessage = ref<{ type: 'success' | 'error', text: string } | null>(null)
const onOffQuickFilter = ref('')
const onOffGridApi = ref<any>(null)

const onOffColumnDefs = ref<ColDef<OnOffCommandRow>[]>([
  {
    headerName: 'ON_COMMAND',
    field: 'onCommand',
    minWidth: 350,
    editable: true,
    cellEditor: 'agRichSelectCellEditor',
    cellEditorPopup: false,
    cellEditorParams: () => ({
      values: onOffCommandOptions.value,
      allowTyping: true,
      filterList: true,
      searchType: 'matchAny',
      highlightMatch: true,
    }),
  },
  {
    headerName: 'OFF_COMMAND',
    field: 'offCommand',
    minWidth: 350,
    editable: true,
    cellEditor: 'agRichSelectCellEditor',
    cellEditorPopup: false,
    cellEditorParams: () => ({
      values: onOffCommandOptions.value,
      allowTyping: true,
      filterList: true,
      searchType: 'matchAny',
      highlightMatch: true,
    }),
  },
  {
    headerName: 'EXPECTED_CURRENT_WITH_RF(Amps)',
    field: 'expectedCurrentWithRf',
    minWidth: 250,
    editable: true,
    valueParser: (p: any) => parseFloatSafe(p.newValue, 0),
  },
])

const onOffDefaultColDef: ColDef = { sortable: true, filter: true, resizable: true }

// ── CfgTmToLog ───────────────────────────────────────────────────────────────

const cfgTmToLogRowData = ref<CfgTmToLogRow[]>([])
const cfgTmToLogLoading = ref(false)
const cfgTmToLogSaving = ref(false)
const cfgTmToLogChanged = ref(false)
const cfgTmToLogMessage = ref<{ type: 'success' | 'error', text: string } | null>(null)
const cfgTmToLogQuickFilter = ref('')
const cfgTmToLogGridApi = ref<any>(null)

const cfgTmSubsystemOptions = ref<string[]>([])
const cfgTmSelectedSubsystems = ref<string[]>([])
const cfgTmMnemonicOptions = ref<string[]>([])
const cfgTmTypeOptions: Array<'LOG' | 'AMPL_CAL' | 'AMPL_CAL_PTM'> = ['LOG', 'AMPL_CAL', 'AMPL_CAL_PTM']

function normalizeCfgTmType(value: string): 'LOG' | 'AMPL_CAL' | 'AMPL_CAL_PTM' {
  const normalized = String(value || '').trim().toUpperCase()
  if (cfgTmTypeOptions.includes(normalized as any))
    return normalized as 'LOG' | 'AMPL_CAL' | 'AMPL_CAL_PTM'
  return 'LOG'
}

const showCfgTmMnemonicEditor = ref(false)
const cfgTmEditorRowTarget = ref<string>('')
const cfgTmEditorRows = ref<CfgTmToLogMnemonicRow[]>([])
const cfgTmEditorGridApi = ref<any>(null)

const cfgTmToLogColumnDefs = ref<ColDef<CfgTmToLogRow>[]>([
  {
    headerName: 'CFG_OR_CHANNEL',
    field: 'cfgOrChannel',
    minWidth: 260,
    editable: true,
  },
  {
    headerName: 'Type',
    field: 'type',
    minWidth: 200,
    editable: true,
    valueSetter: (params: any) => {
      params.data.type = normalizeCfgTmType(String(params.newValue || ''))
      return true
    },
    cellEditor: 'agRichSelectCellEditor',
    cellEditorPopup: false,
    cellEditorParams: () => ({
      values: cfgTmTypeOptions,
      allowTyping: false,
      filterList: true,
      searchType: 'matchAny',
      highlightMatch: true,
    }),
  },
  {
    headerName: 'Mnemonics',
    field: 'mnemonics',
    minWidth: 260,
    editable: true,
    cellClass: 'link-cell',
    valueGetter: (params: any) => (Array.isArray(params.data?.mnemonics) ? params.data.mnemonics.join(', ') : ''),
    valueSetter: (params: any) => {
      const raw = String(params.newValue || '')
      params.data.mnemonics = raw
        .split(',')
        .map((v: string) => v.trim())
        .filter(Boolean)
      return true
    },
    valueFormatter: (p: any) => String(p.value || ''),
  },
])

const cfgTmMnemonicColumnDefs = ref<ColDef<CfgTmToLogMnemonicRow>[]>([
  {
    headerName: 'Mnemonics',
    field: 'mnemonic',
    minWidth: 760,
    editable: true,
    cellEditor: 'agRichSelectCellEditor',
    cellEditorPopup: false,
    cellEditorParams: () => ({
      values: cfgTmMnemonicOptions.value,
      allowTyping: true,
      filterList: true,
      searchType: 'matchAny',
      highlightMatch: true,
    }),
  },
])

const cfgTmToLogDefaultColDef: ColDef = { sortable: true, filter: true, resizable: true }

// ── PL_TC_FILES ───────────────────────────────────────────────────────────────

const plTcFilesRowData = ref<PlTcFileRow[]>([])
const plTcFilesLoading = ref(false)
const plTcFilesSaving = ref(false)
const plTcFilesChanged = ref(false)
const plTcFilesMessage = ref<{ type: 'success' | 'error', text: string } | null>(null)
const plTcFilesQuickFilter = ref('')
const plTcFilesGridApi = ref<any>(null)
const plTcParameterOptions = ref<string[]>([])

const plTcFilesColumnDefs = ref<ColDef<PlTcFileRow>[]>([
  {
    headerName: 'FileName',
    field: 'fileName',
    minWidth: 280,
    editable: true,
  },
  {
    headerName: 'CFG_OR_CHANNEL_NO',
    field: 'cfgOrChannelNo',
    minWidth: 220,
    editable: true,
  },
  {
    headerName: 'PARAMETER',
    field: 'parameter',
    minWidth: 220,
    editable: true,
    cellEditor: 'agRichSelectCellEditor',
    cellEditorPopup: false,
    cellEditorParams: () => ({
      values: plTcParameterOptions.value,
      allowTyping: true,
      filterList: true,
      searchType: 'matchAny',
      highlightMatch: true,
    }),
  },
])

const plTcFilesDefaultColDef: ColDef = { sortable: true, filter: true, resizable: true }

// ── ADDON_COMMANDS ────────────────────────────────────────────────────────────

const addonCommandsRowData = ref<AddonCommandRow[]>([])
const addonCommandsLoading = ref(false)
const addonCommandsSaving = ref(false)
const addonCommandsChanged = ref(false)
const addonCommandsMessage = ref<{ type: 'success' | 'error', text: string } | null>(null)
const addonCommandsQuickFilter = ref('')
const addonCommandsGridApi = ref<any>(null)

const addonCommandsColumnDefs = ref<ColDef<AddonCommandRow>[]>([
  {
    headerName: 'SNO',
    field: 'sno',
    minWidth: 100,
    editable: false,
    valueGetter: (params) => params.node?.rowIndex != null ? params.node.rowIndex + 1 : '',
  },
  {
    headerName: 'AT_START',
    field: 'atStart',
    minWidth: 300,
    editable: true,
  },
  {
    headerName: 'AT_END',
    field: 'atEnd',
    minWidth: 300,
    editable: true,
  },
])

const addonCommandsDefaultColDef: ColDef = { sortable: true, filter: true, resizable: true }

async function loadAddonCommandsRows() {
  addonCommandsLoading.value = true
  addonCommandsMessage.value = null
  try {
    const res = await $fetch<{ success: boolean, items: AddonCommandRow[] }>(`${gatewayBase}/payloadtc/database/addon-commands`)
    addonCommandsRowData.value = (res?.items || []).map(item => ({
      sno: Number(item.sno || 0),
      atStart: String(item.atStart || ''),
      atEnd: String(item.atEnd || ''),
      updatedAt: String(item.updatedAt || ''),
    }))
    addonCommandsChanged.value = false
  }
  catch (e: any) {
    addonCommandsRowData.value = []
    addonCommandsMessage.value = { type: 'error', text: e?.data?.error ?? 'Failed to load ADDON_COMMANDS' }
  }
  finally {
    addonCommandsLoading.value = false
  }
}

function onAddonCommandsGridReady(params: any) {
  addonCommandsGridApi.value = params.api
  params.api.setGridOption('quickFilterText', addonCommandsQuickFilter.value)
}

function onAddonCommandsCellValueChanged() {
  addonCommandsChanged.value = true
}

function addAddonCommandRow() {
  addonCommandsRowData.value = [...addonCommandsRowData.value, { atStart: '', atEnd: '' }]
  addonCommandsChanged.value = true
}

function deleteSelectedAddonCommandsRows() {
  const selectedRows = addonCommandsGridApi.value?.getSelectedRows?.() || []
  if (!selectedRows.length)
    return
  const selectedSet = new Set(selectedRows)
  addonCommandsRowData.value = addonCommandsRowData.value.filter(row => !selectedSet.has(row))
  addonCommandsChanged.value = true
}

async function saveAddonCommandsRows() {
  addonCommandsSaving.value = true
  addonCommandsMessage.value = null
  try {
    const items = addonCommandsRowData.value.map(row => ({
      atStart: String(row.atStart || '').trim(),
      atEnd: String(row.atEnd || '').trim(),
    }))

    await $fetch(`${gatewayBase}/payloadtc/database/addon-commands`, {
      method: 'PUT',
      body: { items },
    })

    addonCommandsChanged.value = false
    addonCommandsMessage.value = { type: 'success', text: `Saved ${items.length} row(s) in ADDON_COMMANDS.` }
    await loadAddonCommandsRows()
  }
  catch (e: any) {
    addonCommandsMessage.value = { type: 'error', text: e?.data?.error ?? 'Failed to save ADDON_COMMANDS' }
  }
  finally {
    addonCommandsSaving.value = false
  }
}

async function loadBoaColumnNames() {
  try {
    const res = await $fetch<{ success: boolean, items: string[] }>(`${gatewayBase}/payloadtc/database/boa-column-names`)
    boaColumnNames.value = res?.items || []
  }
  catch {
    boaColumnNames.value = []
  }
}

async function loadBoaSubsystems() {
  try {
    const res = await $fetch<{ success: boolean, items: string[] }>(`${gatewayBase}/payloadtc/database/options/tc-subsystems`)
    boaSubsystemOptions.value = res?.items || []
  }
  catch {
    boaSubsystemOptions.value = []
  }
}

async function loadDataCommandOptions() {
  const selected = boaSelectedSubsystems.value.filter(Boolean)
  const query = selected.length > 0 ? `?subsystems=${encodeURIComponent(selected.join(','))}` : ''
  try {
    const res = await $fetch<{ success: boolean, items: DataCommandOption[] }>(`${gatewayBase}/payloadtc/database/options/data-commands${query}`)
    boaDataCommandOptions.value = res?.items || []
  }
  catch {
    boaDataCommandOptions.value = []
  }
}

async function fetchDataMapValues(commandValue: string) {
  if (!commandValue || commandValue in dataMapValuesCache.value)
    return
  const opt = boaDataCommandOptions.value.find(o => o.value === commandValue)
  const mapName = opt?.dataCodeMapName || ''
  if (!mapName) {
    dataMapValuesCache.value = { ...dataMapValuesCache.value, [commandValue]: [] }
    return
  }
  try {
    const res = await $fetch<{ success: boolean, items: string[] }>(
      `${gatewayBase}/payloadtc/database/options/data-map-values?mapName=${encodeURIComponent(mapName)}`,
    )
    dataMapValuesCache.value = { ...dataMapValuesCache.value, [commandValue]: res?.items || [] }
  }
  catch {
    dataMapValuesCache.value = { ...dataMapValuesCache.value, [commandValue]: [] }
  }
}

async function loadBoaRows() {
  boaLoading.value = true
  boaMessage.value = null
  try {
    const res = await $fetch<{ success: boolean, items: any[] }>(`${gatewayBase}/payloadtc/database/payload-config-boa`)
    const rows = (res?.items || []).map((item: any) => ({
      cfgNo: Number(item.cfgNo || 0),
      dataCommand: String(item.dataCommand || ''),
      residualBoa: String(item.residualBoa || ''),
      ...(item.boaValues || {}),
    } as PayloadConfigBoaRow))
    boaRowData.value = rows
    boaChanged.value = false
    const cmds = [...new Set(rows.map(r => r.dataCommand).filter(Boolean))]
    await Promise.all(cmds.map(cmd => fetchDataMapValues(cmd)))
  }
  catch (e: any) {
    boaRowData.value = []
    boaMessage.value = { type: 'error', text: e?.data?.error ?? 'Failed to load PayloadConfigBoa' }
  }
  finally {
    boaLoading.value = false
  }
}

function onBoaGridReady(params: any) {
  boaGridApi.value = params.api
  params.api.setGridOption('quickFilterText', boaQuickFilter.value)
}

async function onBoaCellValueChanged(params: any) {
  boaChanged.value = true
  if (params?.colDef?.field === 'dataCommand') {
    const cmd = String(params?.newValue || '')
    if (cmd)
      await fetchDataMapValues(cmd)
  }
}

function addBoaRow() {
  const nextCfg = Math.max(0, ...boaRowData.value.map(r => Number(r.cfgNo || 0))) + 1
  boaRowData.value = [...boaRowData.value, { cfgNo: nextCfg, dataCommand: '', residualBoa: '' }]
  boaChanged.value = true
}

function deleteSelectedBoaRows() {
  const selected = boaGridApi.value?.getSelectedRows?.() || []
  if (!selected.length)
    return
  const selectedSet = new Set(selected)
  boaRowData.value = boaRowData.value.filter(row => !selectedSet.has(row))
  boaChanged.value = true
}

async function saveBoaRows() {
  boaSaving.value = true
  boaMessage.value = null
  try {
    const items = boaRowData.value
      .filter(row => Number(row.cfgNo) > 0)
      .map((row) => {
        const boaValues: Record<string, string> = {}
        for (const col of boaColumnNames.value)
          boaValues[col] = String(row[col] || '')
        return {
          cfgNo: Number(row.cfgNo),
          dataCommand: String(row.dataCommand || '').trim(),
          residualBoa: String(row.residualBoa || '').trim(),
          boaValues,
        }
      })

    await $fetch(`${gatewayBase}/payloadtc/database/payload-config-boa`, {
      method: 'PUT',
      body: { items },
    })

    boaChanged.value = false
    boaMessage.value = { type: 'success', text: `Saved ${items.length} row(s) in PayloadConfigBoa.` }
    await loadBoaRows()
  }
  catch (e: any) {
    boaMessage.value = { type: 'error', text: e?.data?.error ?? 'Failed to save PayloadConfigBoa' }
  }
  finally {
    boaSaving.value = false
  }
}

// ── On_Off_Commands functions ────────────────────────────────────────────────

async function loadOnOffSubsystemOptions() {
  try {
    const res = await $fetch<{ success: boolean, items: string[] }>(`${gatewayBase}/payloadtc/database/options/tc-subsystems`)
    onOffSubsystemOptions.value = res?.items || []
  }
  catch {
    onOffSubsystemOptions.value = []
  }
}

async function loadOnOffCommandOptions() {
  const selected = onOffSelectedSubsystems.value.filter(Boolean)
  const query = selected.length > 0 ? `?subsystems=${encodeURIComponent(selected.join(','))}` : ''
  try {
    const res = await $fetch<{ success: boolean, items: Array<{ value: string, label: string }> }>(`${gatewayBase}/payloadtc/database/options/on-off-commands${query}`)
    onOffCommandOptions.value = (res?.items || []).map(item => String(item.value || '')).filter(Boolean)
  }
  catch {
    onOffCommandOptions.value = []
  }
}

async function loadOnOffRows() {
  onOffLoading.value = true
  onOffMessage.value = null
  try {
    const res = await $fetch<{ success: boolean, items: OnOffCommandRow[] }>(`${gatewayBase}/payloadtc/database/on-off-commands`)
    onOffRowData.value = (res?.items || []).map(item => ({
      id: Number(item.id || 0),
      onCommand: String(item.onCommand || ''),
      offCommand: String(item.offCommand || ''),
      subsystems: Array.isArray(item.subsystems) ? item.subsystems : [],
      expectedCurrentWithRf: parseFloatSafe(item.expectedCurrentWithRf, 0),
      updatedAt: String(item.updatedAt || ''),
    }))
    onOffChanged.value = false
  }
  catch (e: any) {
    onOffRowData.value = []
    onOffMessage.value = { type: 'error', text: e?.data?.error ?? 'Failed to load On_Off_Commands' }
  }
  finally {
    onOffLoading.value = false
  }
}

function onOnOffGridReady(params: any) {
  onOffGridApi.value = params.api
  params.api.setGridOption('quickFilterText', onOffQuickFilter.value)
}

function onOnOffCellValueChanged() {
  onOffChanged.value = true
}

function addOnOffRow() {
  onOffRowData.value = [...onOffRowData.value, { onCommand: '', offCommand: '', subsystems: [], expectedCurrentWithRf: 0 }]
  onOffChanged.value = true
}

function deleteSelectedOnOffRows() {
  const selectedRows = onOffGridApi.value?.getSelectedRows?.() || []
  if (!selectedRows.length)
    return
  const selectedSet = new Set(selectedRows)
  onOffRowData.value = onOffRowData.value.filter(row => !selectedSet.has(row))
  onOffChanged.value = true
}

async function saveOnOffRows() {
  onOffSaving.value = true
  onOffMessage.value = null
  try {
    const items = onOffRowData.value
      .filter(row => String(row.onCommand || '').trim() !== '' || String(row.offCommand || '').trim() !== '')
      .map(row => ({
        id: Number(row.id || 0),
        onCommand: String(row.onCommand || '').trim(),
        offCommand: String(row.offCommand || '').trim(),
        subsystems: onOffSelectedSubsystems.value.filter(Boolean),
        expectedCurrentWithRf: parseFloatSafe(row.expectedCurrentWithRf, 0),
      }))

    await $fetch(`${gatewayBase}/payloadtc/database/on-off-commands`, {
      method: 'PUT',
      body: { items },
    })

    onOffChanged.value = false
    onOffMessage.value = { type: 'success', text: `Saved ${items.length} row(s) in On_Off_Commands.` }
    await loadOnOffRows()
  }
  catch (e: any) {
    onOffMessage.value = { type: 'error', text: e?.data?.error ?? 'Failed to save On_Off_Commands' }
  }
  finally {
    onOffSaving.value = false
  }
}

// ── CfgTmToLog functions ─────────────────────────────────────────────────────

async function loadTmSubsystemOptions() {
  try {
    const res = await $fetch<{ success: boolean, items: string[] }>(`${gatewayBase}/payloadtc/database/options/tm-subsystems`)
    cfgTmSubsystemOptions.value = res?.items || []
  }
  catch {
    cfgTmSubsystemOptions.value = []
  }
}

async function loadTmMnemonicOptions() {
  const selected = cfgTmSelectedSubsystems.value.filter(Boolean)
  const query = selected.length > 0 ? `?subsystems=${encodeURIComponent(selected.join(','))}` : ''
  try {
    const res = await $fetch<{ success: boolean, items: Array<{ value: string }> }>(`${gatewayBase}/payloadtc/database/options/tm-mnemonics${query}`)
    cfgTmMnemonicOptions.value = (res?.items || []).map(item => String(item.value || '')).filter(Boolean)
  }
  catch {
    cfgTmMnemonicOptions.value = []
  }
}

async function loadCfgTmToLogRows() {
  cfgTmToLogLoading.value = true
  cfgTmToLogMessage.value = null
  try {
    const res = await $fetch<{ success: boolean, items: CfgTmToLogRow[] }>(`${gatewayBase}/payloadtc/database/cfg-tm-to-log`)
    cfgTmToLogRowData.value = (res?.items || []).map(item => ({
      id: Number(item.id || 0),
      cfgOrChannel: String(item.cfgOrChannel || ''),
      type: (['LOG', 'AMPL_CAL', 'AMPL_CAL_PTM'].includes(String((item as any).type || '').toUpperCase())
        ? String((item as any).type || '').toUpperCase()
        : 'LOG') as 'LOG' | 'AMPL_CAL' | 'AMPL_CAL_PTM',
      mnemonics: Array.isArray(item.mnemonics) ? item.mnemonics.map(v => String(v || '')).filter(Boolean) : [],
      subsystems: Array.isArray(item.subsystems) ? item.subsystems.map(v => String(v || '')).filter(Boolean) : [],
      updatedAt: String(item.updatedAt || ''),
    }))
    cfgTmToLogChanged.value = false
  }
  catch (e: any) {
    cfgTmToLogRowData.value = []
    cfgTmToLogMessage.value = { type: 'error', text: e?.data?.error ?? 'Failed to load CfgTmToLog' }
  }
  finally {
    cfgTmToLogLoading.value = false
  }
}

function onCfgTmToLogGridReady(params: any) {
  cfgTmToLogGridApi.value = params.api
  params.api.setGridOption('quickFilterText', cfgTmToLogQuickFilter.value)
}

function onCfgTmToLogCellValueChanged() {
  cfgTmToLogChanged.value = true
}

function onCfgTmToLogCellDoubleClicked(params: any) {
  const field = String(params?.colDef?.field || '')
  if (field !== 'mnemonics')
    return
  const row = params?.data as CfgTmToLogRow | undefined
  if (!row)
    return
  openCfgTmMnemonicEditor(row)
}

function addCfgTmToLogRow() {
  cfgTmToLogRowData.value = [...cfgTmToLogRowData.value, { cfgOrChannel: '', type: 'LOG', mnemonics: [], subsystems: [] }]
  cfgTmToLogChanged.value = true
}

function deleteSelectedCfgTmToLogRows() {
  const selectedRows = cfgTmToLogGridApi.value?.getSelectedRows?.() || []
  if (!selectedRows.length)
    return
  const selectedSet = new Set(selectedRows)
  cfgTmToLogRowData.value = cfgTmToLogRowData.value.filter(row => !selectedSet.has(row))
  cfgTmToLogChanged.value = true
}

function openCfgTmMnemonicEditor(row: CfgTmToLogRow) {
  cfgTmEditorRowTarget.value = String(row.cfgOrChannel || '')
  cfgTmSelectedSubsystems.value = Array.isArray(row.subsystems) ? [...row.subsystems] : []
  cfgTmEditorRows.value = (row.mnemonics || []).map(m => ({ mnemonic: String(m || '') }))
  if (cfgTmEditorRows.value.length === 0)
    cfgTmEditorRows.value = [{ mnemonic: '' }]
  loadTmMnemonicOptions()
  showCfgTmMnemonicEditor.value = true
}

function onCfgTmEditorGridReady(params: any) {
  cfgTmEditorGridApi.value = params.api
}

function addCfgTmMnemonicRow() {
  cfgTmEditorRows.value = [...cfgTmEditorRows.value, { mnemonic: '' }]
}

function deleteSelectedCfgTmMnemonicRows() {
  const selectedRows = cfgTmEditorGridApi.value?.getSelectedRows?.() || []
  if (!selectedRows.length)
    return
  const selectedSet = new Set(selectedRows)
  cfgTmEditorRows.value = cfgTmEditorRows.value.filter(row => !selectedSet.has(row))
}

function applyCfgTmMnemonics() {
  const key = cfgTmEditorRowTarget.value
  if (!key)
    return
  const row = cfgTmToLogRowData.value.find(item => String(item.cfgOrChannel || '') === key)
  if (!row)
    return

  row.subsystems = cfgTmSelectedSubsystems.value.filter(Boolean)
  row.mnemonics = cfgTmEditorRows.value
    .map(item => String(item.mnemonic || '').trim())
    .filter(Boolean)

  cfgTmToLogChanged.value = true
  showCfgTmMnemonicEditor.value = false
}

async function saveCfgTmToLogRows() {
  cfgTmToLogSaving.value = true
  cfgTmToLogMessage.value = null
  try {
    const items = cfgTmToLogRowData.value
      .filter(row => String(row.cfgOrChannel || '').trim() !== '')
      .map(row => ({
        id: Number(row.id || 0),
        cfgOrChannel: String(row.cfgOrChannel || '').trim(),
        type: cfgTmTypeOptions.includes(row.type) ? row.type : 'LOG',
        mnemonics: Array.isArray(row.mnemonics) ? row.mnemonics.map(v => String(v || '').trim()).filter(Boolean) : [],
        subsystems: Array.isArray(row.subsystems) ? row.subsystems.map(v => String(v || '').trim()).filter(Boolean) : [],
      }))

    await $fetch(`${gatewayBase}/payloadtc/database/cfg-tm-to-log`, {
      method: 'PUT',
      body: { items },
    })

    cfgTmToLogChanged.value = false
    cfgTmToLogMessage.value = { type: 'success', text: `Saved ${items.length} row(s) in CfgTmToLog.` }
    await loadCfgTmToLogRows()
  }
  catch (e: any) {
    cfgTmToLogMessage.value = { type: 'error', text: e?.data?.error ?? 'Failed to save CfgTmToLog' }
  }
  finally {
    cfgTmToLogSaving.value = false
  }
}

// ── PL_TC_FILES functions ─────────────────────────────────────────────────────

async function loadPlTcParameterOptions() {
  try {
    const res = await $fetch<{ success: boolean, items: string[] }>(`${gatewayBase}/payloadtc/database/options/test-parameters`)
    plTcParameterOptions.value = res?.items || []
  }
  catch {
    plTcParameterOptions.value = []
  }
}

async function loadPlTcFilesRows() {
  plTcFilesLoading.value = true
  plTcFilesMessage.value = null
  try {
    const res = await $fetch<{ success: boolean, items: PlTcFileRow[] }>(`${gatewayBase}/payloadtc/database/pl-tc-files`)
    plTcFilesRowData.value = (res?.items || []).map(item => ({
      id: Number(item.id || 0),
      fileName: String(item.fileName || ''),
      cfgOrChannelNo: String(item.cfgOrChannelNo || ''),
      parameter: String(item.parameter || ''),
      updatedAt: String(item.updatedAt || ''),
    }))
    plTcFilesChanged.value = false
  }
  catch (e: any) {
    plTcFilesRowData.value = []
    plTcFilesMessage.value = { type: 'error', text: e?.data?.error ?? 'Failed to load PL_TC_FILES' }
  }
  finally {
    plTcFilesLoading.value = false
  }
}

function onPlTcFilesGridReady(params: any) {
  plTcFilesGridApi.value = params.api
  params.api.setGridOption('quickFilterText', plTcFilesQuickFilter.value)
}

function onPlTcFilesCellValueChanged() {
  plTcFilesChanged.value = true
}

function addPlTcFileRow() {
  plTcFilesRowData.value = [...plTcFilesRowData.value, { fileName: '', cfgOrChannelNo: '', parameter: '' }]
  plTcFilesChanged.value = true
}

function deleteSelectedPlTcFilesRows() {
  const selectedRows = plTcFilesGridApi.value?.getSelectedRows?.() || []
  if (!selectedRows.length)
    return
  const selectedSet = new Set(selectedRows)
  plTcFilesRowData.value = plTcFilesRowData.value.filter(row => !selectedSet.has(row))
  plTcFilesChanged.value = true
}

async function savePlTcFilesRows() {
  plTcFilesSaving.value = true
  plTcFilesMessage.value = null
  try {
    const items = plTcFilesRowData.value
      .filter(row => String(row.fileName || '').trim() !== '')
      .map(row => ({
        id: Number(row.id || 0),
        fileName: String(row.fileName || '').trim(),
        cfgOrChannelNo: String(row.cfgOrChannelNo || '').trim(),
        parameter: String(row.parameter || '').trim(),
      }))

    await $fetch(`${gatewayBase}/payloadtc/database/pl-tc-files`, {
      method: 'PUT',
      body: { items },
    })

    plTcFilesChanged.value = false
    plTcFilesMessage.value = { type: 'success', text: `Saved ${items.length} row(s) in PL_TC_FILES.` }
    await loadPlTcFilesRows()
  }
  catch (e: any) {
    plTcFilesMessage.value = { type: 'error', text: e?.data?.error ?? 'Failed to save PL_TC_FILES' }
  }
  finally {
    plTcFilesSaving.value = false
  }
}

watch(onOffSelectedSubsystems, async () => {
  await loadOnOffCommandOptions()
})

watch(onOffQuickFilter, (v) => {
  onOffGridApi.value?.setGridOption('quickFilterText', v)
})

watch(cfgTmSelectedSubsystems, async () => {
  await loadTmMnemonicOptions()
})

watch(cfgTmToLogQuickFilter, (v) => {
  cfgTmToLogGridApi.value?.setGridOption('quickFilterText', v)
})

watch(plTcFilesQuickFilter, (v) => {
  plTcFilesGridApi.value?.setGridOption('quickFilterText', v)
})

watch(boaSelectedSubsystems, async () => {
  await loadDataCommandOptions()
})

watch(boaQuickFilter, (v) => {
  boaGridApi.value?.setGridOption('quickFilterText', v)
})

watch(selectedTable, async (table) => {
  if (table === 'Macros') {
    await loadMacroSubsystemOptions()
    // If the hardcoded defaults don't exist in the DB, use all available subsystems
    if (macroSubsystemOptions.value.length > 0) {
      const validSelected = macroSelectedSubsystems.value.filter(s => macroSubsystemOptions.value.includes(s))
      if (validSelected.length === 0)
        macroSelectedSubsystems.value = [...macroSubsystemOptions.value]
    }
    await loadMacroCommandOptions()
    await loadMacroRows()
    return
  }
  if (table === 'PayloadConfigBoa') {
    await Promise.all([loadBoaColumnNames(), loadBoaSubsystems(), loadDataCommandOptions()])
    await loadBoaRows()
    return
  }
  if (table === 'CfgTmToLog') {
    await loadTmSubsystemOptions()
    await loadCfgTmToLogRows()
    return
  }
  if (table === 'OnOffCommands') {
    await Promise.all([loadOnOffSubsystemOptions(), loadOnOffCommandOptions()])
    await loadOnOffRows()
  }
  if (table === 'PlTcFiles') {
    await loadPlTcParameterOptions()
    await loadPlTcFilesRows()
  }
  if (table === 'AddonCommands') {
    await loadAddonCommandsRows()
  }
})

watch(addonCommandsQuickFilter, (v) => {
  addonCommandsGridApi.value?.setGridOption('quickFilterText', v)
})
</script>

<template>
  <div class="content p-4">
    <AppName appname="Telecommand Database" />

    <div class="layout mt-4">
      <aside class="subnav">
        <div class="subnav-title">
          Tables
        </div>
        <Button
          v-for="item in tableItems"
          :key="item.key"
          :label="item.label"
          class="w-full mb-2 justify-start"
          :severity="selectedTable === item.key ? 'info' : 'secondary'"
          :outlined="selectedTable !== item.key"
          @click="selectedTable = item.key"
        />
      </aside>

      <section class="table-panel">
        <div v-if="selectedTable === 'Macros'" class="panel-content">
          <div class="controls">
            <div class="control-item">
              <label class="label">TC Subsystems</label>
              <MultiSelect
                v-model="macroSelectedSubsystems"
                :options="macroSubsystemOptions"
                :filter="true"
                :max-selected-labels="4"
                placeholder="Select TC subsystems"
                class="w-72"
              />
            </div>
            <div class="control-item grow">
              <label class="label">Quick Filter</label>
              <InputText
                v-model="macroQuickFilter"
                class="w-full"
                placeholder="Filter macros..."
              />
            </div>

            <Button label="Add Row" icon="pi pi-plus" outlined @click="addMacroRow" />
            <Button label="Delete Selected" icon="pi pi-trash" severity="danger" outlined @click="deleteSelectedMacroRows" />
            <Button label="Save" icon="pi pi-save" :loading="macroSaving" :disabled="!macroChanged" @click="saveMacroRows" />
          </div>

          <Message v-if="macroMessage" :severity="macroMessage.type === 'success' ? 'success' : 'error'" class="mt-3">
            {{ macroMessage.text }}
          </Message>

          <div v-if="macroLoading" class="loading-box mt-4">
            <i class="pi pi-spin pi-spinner" />
            <span>Loading Macros...</span>
          </div>

          <div v-else class="ag-wrapper mt-4">
            <AgGridVue
              :theme="gridTheme"
              class="ag-theme-local"
              :row-data="macroRowData"
              :column-defs="macroColumnDefs"
              :default-col-def="defaultColDef"
              row-selection="multiple"
              :stop-editing-when-cells-lose-focus="true"
              @grid-ready="onMacroGridReady"
              @cell-value-changed="onMacroCellValueChanged"
              @cell-double-clicked="onMacroCellDoubleClicked"
            />
          </div>
        </div>

        <div v-else-if="selectedTable === 'PLConfigBasedTC'" class="panel-content">
          <div class="controls">
            <div class="control-item grow">
              <label class="label">Quick Filter</label>
              <InputText
                v-model="quickFilter"
                class="w-full"
                placeholder="Filter by CFG_NO / LABLE / telecommands..."
              />
            </div>

            <Button label="Add Row" icon="pi pi-plus" outlined @click="addMainRow" />
            <Button label="Delete Selected" icon="pi pi-trash" severity="danger" outlined @click="deleteSelectedMainRows" />
            <Button label="Save" icon="pi pi-save" :loading="saving" :disabled="!changed" @click="saveMainRows" />
          </div>

          <Message v-if="message" :severity="message.type === 'success' ? 'success' : 'error'" class="mt-3">
            {{ message.text }}
          </Message>

          <div v-if="loading" class="loading-box mt-4">
            <i class="pi pi-spin pi-spinner" />
            <span>Loading PLConfigBasedTC...</span>
          </div>

          <div v-else class="ag-wrapper mt-4">
            <AgGridVue
              :theme="gridTheme"
              class="ag-theme-local"
              :row-data="rowData"
              :column-defs="mainColumnDefs"
              :default-col-def="defaultColDef"
              :enable-range-selection="true"
              :cell-selection="{ handle: { mode: 'fill' } }"
              row-selection="multiple"
              :stop-editing-when-cells-lose-focus="true"
              @grid-ready="onGridReady"
              @cell-value-changed="onCellValueChanged"
              @cell-double-clicked="onCellDoubleClicked"
            />
          </div>
        </div>

        <div v-else-if="selectedEmbeddedComponent" class="panel-content embedded-panel">
          <component :is="selectedEmbeddedComponent" :embed-mode="true" />
        </div>

        <div v-else-if="selectedTable === 'PayloadConfigBoa'" class="panel-content">
          <div class="controls">
            <div class="control-item">
              <label class="label">TC Subsystems</label>
              <MultiSelect
                v-model="boaSelectedSubsystems"
                :options="boaSubsystemOptions"
                :filter="true"
                :max-selected-labels="4"
                placeholder="Select TC subsystems"
                class="w-72"
              />
            </div>
            <div class="control-item grow">
              <label class="label">Quick Filter</label>
              <InputText
                v-model="boaQuickFilter"
                class="w-full"
                placeholder="Filter rows..."
              />
            </div>
            <Button label="Add Row" icon="pi pi-plus" outlined @click="addBoaRow" />
            <Button label="Delete Selected" icon="pi pi-trash" severity="danger" outlined @click="deleteSelectedBoaRows" />
            <Button label="Save" icon="pi pi-save" :loading="boaSaving" :disabled="!boaChanged" @click="saveBoaRows" />
          </div>

          <Message v-if="boaMessage" :severity="boaMessage.type === 'success' ? 'success' : 'error'" class="mt-3">
            {{ boaMessage.text }}
          </Message>

          <div v-if="boaLoading" class="loading-box mt-4">
            <i class="pi pi-spin pi-spinner" />
            <span>Loading PayloadConfigBoa...</span>
          </div>

          <div v-else class="ag-wrapper mt-4">
            <AgGridVue
              :theme="gridTheme"
              class="ag-theme-local"
              :row-data="boaRowData"
              :column-defs="boaColumnDefs"
              :default-col-def="boaDefaultColDef"
              row-selection="multiple"
              :stop-editing-when-cells-lose-focus="true"
              @grid-ready="onBoaGridReady"
              @cell-value-changed="onBoaCellValueChanged"
            />
          </div>
        </div>

        <div v-else-if="selectedTable === 'OnOffCommands'" class="panel-content">
          <div class="controls">
            <div class="control-item">
              <label class="label">TC Subsystems</label>
              <MultiSelect
                v-model="onOffSelectedSubsystems"
                :options="onOffSubsystemOptions"
                :filter="true"
                :max-selected-labels="4"
                placeholder="Select TC subsystems"
                class="w-72"
              />
            </div>
            <div class="control-item grow">
              <label class="label">Quick Filter</label>
              <InputText
                v-model="onOffQuickFilter"
                class="w-full"
                placeholder="Filter rows..."
              />
            </div>
            <Button label="Add Row" icon="pi pi-plus" outlined @click="addOnOffRow" />
            <Button label="Delete Selected" icon="pi pi-trash" severity="danger" outlined @click="deleteSelectedOnOffRows" />
            <Button label="Save" icon="pi pi-save" :loading="onOffSaving" :disabled="!onOffChanged" @click="saveOnOffRows" />
          </div>

          <Message v-if="onOffMessage" :severity="onOffMessage.type === 'success' ? 'success' : 'error'" class="mt-3">
            {{ onOffMessage.text }}
          </Message>

          <div v-if="onOffLoading" class="loading-box mt-4">
            <i class="pi pi-spin pi-spinner" />
            <span>Loading On_Off_Commands...</span>
          </div>

          <div v-else class="ag-wrapper mt-4">
            <AgGridVue
              :theme="gridTheme"
              class="ag-theme-local"
              :row-data="onOffRowData"
              :column-defs="onOffColumnDefs"
              :default-col-def="onOffDefaultColDef"
              row-selection="multiple"
              :stop-editing-when-cells-lose-focus="true"
              @grid-ready="onOnOffGridReady"
              @cell-value-changed="onOnOffCellValueChanged"
            />
          </div>
        </div>

        <div v-else-if="selectedTable === 'CfgTmToLog'" class="panel-content">
          <div class="controls">
            <div class="control-item grow">
              <label class="label">Quick Filter</label>
              <InputText
                v-model="cfgTmToLogQuickFilter"
                class="w-full"
                placeholder="Filter rows..."
              />
            </div>

            <Button label="Add Row" icon="pi pi-plus" outlined @click="addCfgTmToLogRow" />
            <Button label="Delete Selected" icon="pi pi-trash" severity="danger" outlined @click="deleteSelectedCfgTmToLogRows" />
            <Button label="Save" icon="pi pi-save" :loading="cfgTmToLogSaving" :disabled="!cfgTmToLogChanged" @click="saveCfgTmToLogRows" />
          </div>

          <Message v-if="cfgTmToLogMessage" :severity="cfgTmToLogMessage.type === 'success' ? 'success' : 'error'" class="mt-3">
            {{ cfgTmToLogMessage.text }}
          </Message>

          <div v-if="cfgTmToLogLoading" class="loading-box mt-4">
            <i class="pi pi-spin pi-spinner" />
            <span>Loading CfgTmToLog...</span>
          </div>

          <div v-else class="ag-wrapper mt-4">
            <AgGridVue
              :theme="gridTheme"
              class="ag-theme-local"
              :row-data="cfgTmToLogRowData"
              :column-defs="cfgTmToLogColumnDefs"
              :default-col-def="cfgTmToLogDefaultColDef"
              :enable-range-selection="true"
              :cell-selection="{ handle: { mode: 'fill' } }"
              row-selection="multiple"
              :stop-editing-when-cells-lose-focus="true"
              @grid-ready="onCfgTmToLogGridReady"
              @cell-value-changed="onCfgTmToLogCellValueChanged"
              @cell-double-clicked="onCfgTmToLogCellDoubleClicked"
            />
          </div>
        </div>

        <div v-else-if="selectedTable === 'PlTcFiles'" class="panel-content">
          <div class="controls">
            <div class="control-item grow">
              <label class="label">Quick Filter</label>
              <InputText
                v-model="plTcFilesQuickFilter"
                class="w-full"
                placeholder="Filter rows..."
              />
            </div>
            <Button label="Add Row" icon="pi pi-plus" outlined @click="addPlTcFileRow" />
            <Button label="Delete Selected" icon="pi pi-trash" severity="danger" outlined @click="deleteSelectedPlTcFilesRows" />
            <Button label="Save" icon="pi pi-save" :loading="plTcFilesSaving" :disabled="!plTcFilesChanged" @click="savePlTcFilesRows" />
          </div>

          <Message v-if="plTcFilesMessage" :severity="plTcFilesMessage.type === 'success' ? 'success' : 'error'" class="mt-3">
            {{ plTcFilesMessage.text }}
          </Message>

          <div v-if="plTcFilesLoading" class="loading-box mt-4">
            <i class="pi pi-spin pi-spinner" />
            <span>Loading PL_TC_FILES...</span>
          </div>

          <div v-else class="ag-wrapper mt-4">
            <AgGridVue
              :theme="gridTheme"
              class="ag-theme-local"
              :row-data="plTcFilesRowData"
              :column-defs="plTcFilesColumnDefs"
              :default-col-def="plTcFilesDefaultColDef"
              :enable-range-selection="true"
              :cell-selection="{ handle: { mode: 'fill' } }"
              row-selection="multiple"
              :stop-editing-when-cells-lose-focus="true"
              @grid-ready="onPlTcFilesGridReady"
              @cell-value-changed="onPlTcFilesCellValueChanged"
            />
          </div>
        </div>

        <div v-else-if="selectedTable === 'AddonCommands'" class="panel-content">
          <div class="controls">
            <div class="control-item grow">
              <label class="label">Quick Filter</label>
              <InputText
                v-model="addonCommandsQuickFilter"
                class="w-full"
                placeholder="Filter rows..."
              />
            </div>
            <Button label="Add Row" icon="pi pi-plus" outlined @click="addAddonCommandRow" />
            <Button label="Delete Selected" icon="pi pi-trash" severity="danger" outlined @click="deleteSelectedAddonCommandsRows" />
            <Button label="Save" icon="pi pi-save" :loading="addonCommandsSaving" :disabled="!addonCommandsChanged" @click="saveAddonCommandsRows" />
          </div>

          <Message v-if="addonCommandsMessage" :severity="addonCommandsMessage.type === 'success' ? 'success' : 'error'" class="mt-3">
            {{ addonCommandsMessage.text }}
          </Message>

          <div v-if="addonCommandsLoading" class="loading-box mt-4">
            <i class="pi pi-spin pi-spinner" />
            <span>Loading ADDON_COMMANDS...</span>
          </div>

          <div v-else class="ag-wrapper mt-4">
            <AgGridVue
              :theme="gridTheme"
              class="ag-theme-local"
              :row-data="addonCommandsRowData"
              :column-defs="addonCommandsColumnDefs"
              :default-col-def="addonCommandsDefaultColDef"
              row-selection="multiple"
              :stop-editing-when-cells-lose-focus="true"
              @grid-ready="onAddonCommandsGridReady"
              @cell-value-changed="onAddonCommandsCellValueChanged"
            />
          </div>
        </div>
      </section>
    </div>

    <Dialog
      v-model:visible="showMacroEditor"
      modal
      header="Edit Macro Commands"
      :style="{ width: 'min(1100px, 96vw)' }"
    >
      <div class="controls mb-3">
        <div class="control-item grow">
          <label class="label">TC Subsystems</label>
          <MultiSelect
            v-model="macroSelectedSubsystems"
            :options="macroSubsystemOptions"
            :filter="true"
            :max-selected-labels="4"
            placeholder="Select TC subsystems"
            class="w-full"
          />
        </div>

        <Button label="Add Row" icon="pi pi-plus" outlined @click="addMacroEditorRow" />
        <Button label="Delete Selected" icon="pi pi-trash" severity="danger" outlined @click="deleteSelectedMacroEditorRows" />
      </div>

      <div class="inner-grid">
        <AgGridVue
          :theme="gridTheme"
          class="ag-theme-local"
          :row-data="macroEditorRows"
          :column-defs="macroEditorColumnDefs"
          :default-col-def="{ resizable: true, sortable: true }"
          row-selection="multiple"
          :stop-editing-when-cells-lose-focus="true"
          @grid-ready="onMacroEditorGridReady"
          @cell-value-changed="onMacroEditorCellValueChanged"
        />
      </div>

      <template #footer>
        <Button label="Cancel" severity="secondary" text @click="showMacroEditor = false" />
        <Button label="Apply" icon="pi pi-check" @click="applyMacroCommands" />
      </template>
    </Dialog>

    <Dialog
      v-model:visible="showTelecommandEditor"
      modal
      header="Edit Telecommands"
      :style="{ width: 'min(1100px, 96vw)' }"
    >
      <div class="controls mb-3">
        <div class="control-item grow">
          <label class="label">TC Subsystems</label>
          <MultiSelect
            v-model="selectedSubsystems"
            :options="subsystemOptions"
            :filter="true"
            :max-selected-labels="4"
            placeholder="Select TC subsystems"
            class="w-full"
          />
        </div>

        <Button label="Add Row" icon="pi pi-plus" outlined @click="addTelecommandRow" />
        <Button label="Delete Selected" icon="pi pi-trash" severity="danger" outlined @click="deleteSelectedTelecommandRows" />
      </div>

      <div class="inner-grid">
        <AgGridVue
          :theme="gridTheme"
          class="ag-theme-local"
          :row-data="telecommandRows"
          :column-defs="telecommandColumnDefs"
          :default-col-def="{ resizable: true, sortable: true }"
          :enable-range-selection="true"
          :cell-selection="{ handle: { mode: 'fill' } }"
          row-selection="multiple"
          :stop-editing-when-cells-lose-focus="true"
          @grid-ready="onTelecommandGridReady"
        />
      </div>

      <template #footer>
        <Button label="Cancel" severity="secondary" text @click="showTelecommandEditor = false" />
        <Button label="Apply" icon="pi pi-check" @click="applyTelecommands" />
      </template>
    </Dialog>

    <Dialog
      v-model:visible="showCfgTmMnemonicEditor"
      modal
      header="Edit Mnemonics"
      :style="{ width: 'min(1100px, 96vw)' }"
    >
      <div class="controls mb-3">
        <div class="control-item grow">
          <label class="label">TM Subsystems</label>
          <MultiSelect
            v-model="cfgTmSelectedSubsystems"
            :options="cfgTmSubsystemOptions"
            :filter="true"
            :max-selected-labels="4"
            placeholder="Select TM subsystems"
            class="w-full"
          />
        </div>

        <Button label="Add Row" icon="pi pi-plus" outlined @click="addCfgTmMnemonicRow" />
        <Button label="Delete Selected" icon="pi pi-trash" severity="danger" outlined @click="deleteSelectedCfgTmMnemonicRows" />
      </div>

      <div class="inner-grid">
        <AgGridVue
          :theme="gridTheme"
          class="ag-theme-local"
          :row-data="cfgTmEditorRows"
          :column-defs="cfgTmMnemonicColumnDefs"
          :default-col-def="{ resizable: true, sortable: true }"
          row-selection="multiple"
          :stop-editing-when-cells-lose-focus="true"
          @grid-ready="onCfgTmEditorGridReady"
        />
      </div>

      <template #footer>
        <Button label="Cancel" severity="secondary" text @click="showCfgTmMnemonicEditor = false" />
        <Button label="Apply" icon="pi pi-check" @click="applyCfgTmMnemonics" />
      </template>
    </Dialog>
  </div>
</template>

<style scoped lang="scss">
.layout {
  display: grid;
  grid-template-columns: 240px 1fr;
  gap: 1rem;
}

.subnav {
  border: 1px solid var(--surface-border);
  border-radius: 8px;
  padding: 0.75rem;
  background: var(--surface-card);
  height: fit-content;
}

.subnav-title {
  font-weight: 700;
  margin-bottom: 0.75rem;
}

.table-panel {
  min-width: 0;
}

.controls {
  display: flex;
  align-items: flex-end;
  gap: 0.75rem;
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

.loading-box {
  display: flex;
  align-items: center;
  gap: 0.6rem;
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

.embedded-panel {
  border: 1px solid var(--surface-border);
  border-radius: 8px;
  overflow: auto;
}

.inner-grid {
  height: 380px;
  border: 1px solid var(--surface-border);
  border-radius: 8px;
  overflow: hidden;
}

.ag-theme-local {
  height: 100%;
  width: 100%;
}

:deep(.link-cell) {
  cursor: pointer;
  color: var(--primary-color);
  text-decoration: underline;
  text-underline-offset: 2px;
}

@media (max-width: 1024px) {
  .layout {
    grid-template-columns: 1fr;
  }
}
</style>
