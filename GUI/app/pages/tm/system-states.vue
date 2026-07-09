<script setup lang='ts'>
import type { ColDef, GridApi } from 'ag-grid-community'
import {
  colorSchemeDarkBlue,
  colorSchemeLightCold,
  ModuleRegistry,
  themeQuartz,
} from 'ag-grid-community'
import { AllEnterpriseModule } from 'ag-grid-enterprise'
import { AgGridVue } from 'ag-grid-vue3'
import { computed, onMounted, ref, shallowRef, watch } from 'vue'
import ConditionEditorWithBuilder from '@/components/tm/ConditionEditorWithBuilder.vue'
import MonacoConditionEditor from '@/components/tm/MonacoConditionEditor.vue'
import QueryBuilder from '@/components/tm/QueryBuilder.vue'
import { initMenu } from '@/composables/tm/SideNav'
import { generateLogicFromRules, parseLogicToRule } from '@/composables/tm/conditionLogic'
import { useConditionTelemetryCatalog } from '@/composables/tm/useConditionTelemetryCatalog'
import { useColorModeStore } from '~/stores/colorMode'

ModuleRegistry.registerModules([AllEnterpriseModule])

definePageMeta({ title: 'Telemetry - System States' })
initMenu(6)

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

interface StateCondition {
  type: 'visualBuilder' | 'monacoEditor'
  logic: string
  rule?: ConditionRule | null // for visual builder
}

interface MnemonicInfo {
  mnemonic: string
  type: string
  unit: string
  description?: string
  valueSuggestions?: string[]
  defaultValue?: string
  minValue?: number | null
  maxValue?: number | null
  pid?: string
  tolerance?: number | string | null
}

interface MnemonicLimitMapping {
  mnemonic: string
  limits: string[]
  lowerLimit?: string
  upperLimit?: string
  expectedValue?: string
  tolerance?: string
  active: boolean
}

interface SystemState {
  id: string
  name: string
  description: string
  condition: StateCondition
  mnemonics: MnemonicLimitMapping[]
  createdAt: number
}

const storageKey = 'tm.systemStates.v1'
const { apiBase: gatewayBase } = useRuntimeConfig().public

console.log('🔧 System States - Initialized')
console.log('   Gateway Base:', gatewayBase)
console.log('   Client Side:', import.meta.client)

// UI State
const states = ref<SystemState[]>([])
const editingState = ref<SystemState | null>(null)
const showStateDialog = ref(false)
const showConditionEditor = ref(false)
const showMnemonicsDialog = ref(false)
const message = ref<{ type: 'success' | 'error', text: string } | null>(null)
const confirm = useConfirm()
const selectedMnemonics = ref<string[]>([])
const conditionDraft = ref('')
const conditionRule = ref<ConditionRule | null>(null)
const conditionType = ref<'visualBuilder' | 'monacoEditor'>('visualBuilder')
const loadingMnemonics = ref(false)
let conditionSyncing = false

// Shared telemetry catalog (same source as UDTM / dynamic-limits)
const {
  subsystems: catalogSubsystems,
  selectedSubsystems: conditionSubsystems,
  subsystemOptions: conditionSubsystemOptions,
  mnemonics: allApiMnemonicsCatalog,
  loadSubsystems: loadCatalogSubsystems,
  loadCatalog: loadCatalog,
} = useConditionTelemetryCatalog(gatewayBase)

const allApiMnemonics = allApiMnemonicsCatalog
const subsystems = catalogSubsystems

// Debug function
async function testApiConnection() {
  console.clear()
  console.log('🔧 ===== API DEBUG TEST =====')
  console.log('Gateway Base:', gatewayBase)

  try {
    console.log('\n1️⃣ Testing /get/tm/subsystems endpoint...')
    const subsUrl = `${gatewayBase}/get/tm/subsystems`
    console.log(`   URL: ${subsUrl}`)
    const subsData = await $fetch(subsUrl)
    console.log(`   Response:`, subsData)
    console.log(`   Type: ${typeof subsData}`)
    console.log(`   Is Array: ${Array.isArray(subsData)}`)
    if (typeof subsData === 'object') {
      console.log(`   Keys: ${Object.keys(subsData).join(', ')}`)
    }

    // If we got subsystems, test mnemonics endpoint
    let testSubsystem = ''
    if (Array.isArray(subsData)) {
      testSubsystem = subsData[0]
    }
    else if (subsData?.subsystems && Array.isArray(subsData.subsystems)) {
      testSubsystem = subsData.subsystems[0]
    }

    if (testSubsystem) {
      console.log(`\n2️⃣ Testing /get/tm/details/{subsystem} endpoint...`)
      const mnemUrl = `${gatewayBase}/get/tm/details/${encodeURIComponent(testSubsystem)}`
      console.log(`   URL: ${mnemUrl}`)
      const mnemData = await $fetch(mnemUrl)
      console.log(`   Response Count: ${Array.isArray(mnemData) ? mnemData.length : 'not array'}`)
      console.log(`   First item:`, Array.isArray(mnemData) ? mnemData[0] : mnemData)
    }

    message.value = { type: 'success', text: '✅ API Debug info logged to console (F12)' }
  }
  catch (e: any) {
    console.error('❌ Error during debug:', e)
    message.value = { type: 'error', text: `❌ Debug Error: ${e?.message}` }
  }
}

const availableMnemonics = computed(() => {
  if (!editingState.value)
    return []
  return editingState.value.mnemonics.map(m => m.mnemonic)
})

const unselectedMnemonics = computed(() => {
  if (!editingState.value)
    return []
  const selected = new Set(editingState.value.mnemonics.map(m => m.mnemonic))
  return allApiMnemonics.value.filter(m => !selected.has(m.mnemonic))
})

const colorModeStore = useColorModeStore()
const mnemonicsGridApi = shallowRef<GridApi<MnemonicInfo> | null>(null)
const mnemonicsQuickFilter = ref('')
const showOnlySelected = ref(false)

const displayedMnemonics = computed<MnemonicInfo[]>(() => {
  const base = allApiMnemonics.value as MnemonicInfo[]
  if (!showOnlySelected.value)
    return base
  const sel = new Set(selectedMnemonics.value)
  return base.filter(m => sel.has(m.mnemonic))
})

const mnemonicsGridTheme = computed(() =>
  colorModeStore.currentMode === 'dark'
    ? themeQuartz.withPart(colorSchemeDarkBlue)
    : themeQuartz.withPart(colorSchemeLightCold),
)

const mnemonicsDefaultColDef: ColDef<MnemonicInfo> = {
  sortable: true,
  filter: true,
  resizable: true,
  flex: 1,
}

const mnemonicsColumnDefs: ColDef<MnemonicInfo>[] = [
  {
    headerName: '',
    minWidth: 60,
    maxWidth: 60,
    sortable: false,
    filter: false,
    pinned: 'left',
    cellRenderer: (params: { data?: MnemonicInfo }) => {
      const mnem = params.data?.mnemonic ?? ''
      const wrapper = document.createElement('div')
      wrapper.style.display = 'flex'
      wrapper.style.alignItems = 'center'
      wrapper.style.justifyContent = 'center'
      wrapper.style.height = '100%'
      const cb = document.createElement('input')
      cb.type = 'checkbox'
      cb.checked = selectedMnemonics.value.includes(mnem)
      cb.style.cursor = 'pointer'
      cb.onclick = (e) => {
        e.stopPropagation()
        if (!mnem)
          return
        if (cb.checked)
          selectedMnemonics.value = [...selectedMnemonics.value, mnem]
        else
          selectedMnemonics.value = selectedMnemonics.value.filter(m => m !== mnem)
      }
      wrapper.appendChild(cb)
      return wrapper
    },
  },
  { headerName: 'PID', field: 'pid', minWidth: 140, maxWidth: 200 },
  { headerName: 'Mnemonic', field: 'mnemonic', minWidth: 260, flex: 2 },
]

function onMnemonicsGridReady(params: { api: GridApi<MnemonicInfo> }) {
  mnemonicsGridApi.value = params.api
}

// Monitored mnemonics grid (inside State edit dialog)
const monitoredGridApi = shallowRef<GridApi<MnemonicLimitMapping> | null>(null)

const monitoredDefaultColDef: ColDef<MnemonicLimitMapping> = {
  sortable: true,
  filter: true,
  resizable: true,
  flex: 1,
}

const monitoredColumnDefs: ColDef<MnemonicLimitMapping>[] = [
  {
    headerName: '',
    field: 'active',
    minWidth: 70,
    maxWidth: 80,
    sortable: false,
    filter: false,
    editable: true,
    cellDataType: 'boolean',
    cellRenderer: 'agCheckboxCellRenderer',
    cellEditor: 'agCheckboxCellEditor',
    pinned: 'left',
  },
  { headerName: 'Mnemonic', field: 'mnemonic', minWidth: 240, flex: 2, pinned: 'left', editable: false },
  { headerName: 'Lower Limit', field: 'lowerLimit', minWidth: 120, editable: true },
  { headerName: 'Upper Limit', field: 'upperLimit', minWidth: 120, editable: true },
  { headerName: 'Expected', field: 'expectedValue', minWidth: 120, editable: true },
  { headerName: 'Tolerance', field: 'tolerance', minWidth: 120, editable: true },
  {
    headerName: '',
    minWidth: 60,
    maxWidth: 70,
    sortable: false,
    filter: false,
    pinned: 'right',
    cellRenderer: (params: { data?: MnemonicLimitMapping }) => {
      const mnem = params.data?.mnemonic ?? ''
      const btn = document.createElement('button')
      btn.className = 'p-link'
      btn.title = 'Remove'
      btn.innerHTML = '<i class="pi pi-trash" style="color: var(--red-500, #ef4444);"></i>'
      btn.onclick = (e) => {
        e.stopPropagation()
        if (!editingState.value)
          return
        editingState.value.mnemonics = editingState.value.mnemonics.filter(m => m.mnemonic !== mnem)
      }
      return btn
    },
  },
]

function onMonitoredGridReady(params: { api: GridApi<MnemonicLimitMapping> }) {
  monitoredGridApi.value = params.api
}

function loadStates() {
  try {
    const storedData = localStorage.getItem(storageKey)
    if (storedData) {
      states.value = JSON.parse(storedData)
    }
  }
  catch {
    states.value = []
  }
}

function saveStates() {
  try {
    localStorage.setItem(storageKey, JSON.stringify(states.value))
    message.value = { type: 'success', text: 'States saved successfully' }
  }
  catch (e: any) {
    message.value = { type: 'error', text: 'Failed to save states' }
  }
}

async function loadMnemonicsFromApi() {
  loadingMnemonics.value = true
  try {
    await loadCatalogSubsystems()
    await loadCatalog()
    if (allApiMnemonics.value.length === 0)
      message.value = { type: 'error', text: 'No mnemonics found in API' }
    else
      message.value = { type: 'success', text: `Loaded ${allApiMnemonics.value.length} mnemonics from API` }
  }
  catch (e: any) {
    console.error('Fatal error in loadMnemonicsFromApi:', e)
    message.value = { type: 'error', text: `Failed to load mnemonics: ${e?.message || e}` }
  }
  finally {
    loadingMnemonics.value = false
  }
}

function createNewState() {
  editingState.value = {
    id: `state_${Date.now()}`,
    name: '',
    description: '',
    condition: {
      type: 'visualBuilder',
      logic: '',
      rule: null,
    },
    mnemonics: [],
    createdAt: Date.now(),
  }
  showStateDialog.value = true
}

interface BackendStateLimit {
  mnemonic: string
  lower_limit: number | null
  upper_limit: number | null
  expected: string | null
  tolerance: number | null
  active: boolean
}

function toBackendItem(m: MnemonicLimitMapping) {
  const lowerNum = m.lowerLimit != null && m.lowerLimit !== '' ? Number(m.lowerLimit) : NaN
  const upperNum = m.upperLimit != null && m.upperLimit !== '' ? Number(m.upperLimit) : NaN
  const tolNum = m.tolerance != null && m.tolerance !== '' ? Number(m.tolerance) : NaN
  return {
    mnemonic: m.mnemonic,
    lower_limit: Number.isFinite(lowerNum) ? lowerNum : null,
    upper_limit: Number.isFinite(upperNum) ? upperNum : null,
    expected: (m.expectedValue ?? '').toString() || null,
    tolerance: Number.isFinite(tolNum) ? tolNum : null,
    active: m.active,
  }
}

async function loadStateLimitsFromBackend(stateName: string): Promise<Map<string, Partial<MnemonicLimitMapping>>> {
  const map = new Map<string, Partial<MnemonicLimitMapping>>()
  if (!stateName)
    return map
  try {
    const data = await $fetch<{ state: string, items: BackendStateLimit[] }>(
      `${gatewayBase}/system-state-limits/${encodeURIComponent(stateName)}`,
    )
    for (const item of data?.items ?? []) {
      map.set(item.mnemonic, {
        lowerLimit: item.lower_limit != null ? String(item.lower_limit) : '',
        upperLimit: item.upper_limit != null ? String(item.upper_limit) : '',
        expectedValue: item.expected ?? '',
        tolerance: item.tolerance != null ? String(item.tolerance) : '',
        active: Boolean(item.active),
      })
    }
  }
  catch (e) {
    console.warn(`Failed to load limits for state "${stateName}" from backend`, e)
  }
  return map
}

async function syncStateLimitsToBackend(stateName: string, mnemonics: MnemonicLimitMapping[]): Promise<void> {
  const items = mnemonics.map(toBackendItem)
  // Single atomic round trip — replace=true makes the backend drop any rows
  // for this state whose mnemonic is not in ``items``, then upsert the rest.
  await $fetch(`${gatewayBase}/system-state-limits`, {
    method: 'PUT',
    body: { state: stateName, items, replace: true },
  })
}

async function deleteStateLimitsFromBackend(stateName: string, mnemonics: MnemonicLimitMapping[]): Promise<void> {
  for (const m of mnemonics) {
    try {
      await $fetch(
        `${gatewayBase}/system-state-limits/${encodeURIComponent(stateName)}/${encodeURIComponent(m.mnemonic)}`,
        { method: 'DELETE' },
      )
    }
    catch (e) {
      console.warn(`Failed to delete limit for ${stateName}/${m.mnemonic}`, e)
    }
  }
}

async function editState(state: SystemState) {
  const copy = JSON.parse(JSON.stringify(state))
  // Hydrate limit values from the backend (DB is source of truth for limits)
  const limitsByMnemonic = await loadStateLimitsFromBackend(state.name)
  for (const m of copy.mnemonics) {
    const dbValues = limitsByMnemonic.get(m.mnemonic)
    if (!dbValues)
      continue
    if (dbValues.lowerLimit !== undefined)
      m.lowerLimit = dbValues.lowerLimit
    if (dbValues.upperLimit !== undefined)
      m.upperLimit = dbValues.upperLimit
    if (dbValues.expectedValue !== undefined)
      m.expectedValue = dbValues.expectedValue
    if (dbValues.tolerance !== undefined)
      m.tolerance = dbValues.tolerance
    if (dbValues.active !== undefined)
      m.active = dbValues.active
  }
  editingState.value = copy
  showStateDialog.value = true
}

function confirmDeleteState(state: SystemState) {
  const mnemonicCount = state.mnemonics?.length ?? 0
  const detail = mnemonicCount > 0
    ? `This will remove the state and its ${mnemonicCount} monitored mnemonic limit${mnemonicCount === 1 ? '' : 's'} from the database.`
    : 'This will remove the state.'
  confirm.require({
    header: 'Delete System State',
    message: `Delete "${state.name}"?`,
    detail,
    icon: 'pi pi-exclamation-triangle',
    acceptLabel: 'Delete',
    rejectLabel: 'Cancel',
    acceptProps: { severity: 'danger' },
    rejectProps: { severity: 'secondary', text: true },
    accept: () => deleteState(state),
  })
}

async function deleteState(state: SystemState) {
  states.value = states.value.filter(s => s.id !== state.id)
  saveStates()
  message.value = { type: 'success', text: 'State deleted' }

  // Clean up backend limits (best-effort, localStorage deletion is the source of truth for the state itself)
  if (state && state.mnemonics.length) {
    try {
      await deleteStateLimitsFromBackend(state.name, state.mnemonics)
    }
    catch (e: any) {
      console.warn('Failed to clean up backend limits for deleted state', e)
    }
  }
}

async function saveState() {
  if (!editingState.value)
    return

  if (!editingState.value.name.trim()) {
    message.value = { type: 'error', text: 'State name is required' }
    return
  }

  if (!editingState.value.condition.logic.trim()) {
    message.value = { type: 'error', text: 'Condition logic is required' }
    return
  }

  const newName = editingState.value.name
  const idx = states.value.findIndex(s => s.id === editingState.value!.id)
  const oldState = idx >= 0 ? states.value[idx] : null
  const oldName = oldState?.name
  const renamed = Boolean(oldName && oldName !== newName)

  if (idx >= 0) {
    states.value[idx] = { ...editingState.value }
  }
  else {
    states.value.push({ ...editingState.value })
  }

  saveStates()

  // Sync limits to backend
  try {
    if (renamed && oldState) {
      await deleteStateLimitsFromBackend(oldName!, oldState.mnemonics)
    }
    await syncStateLimitsToBackend(newName, editingState.value.mnemonics)
    message.value = { type: 'success', text: 'State saved successfully' }
  }
  catch (e: any) {
    message.value = {
      type: 'error',
      text: `State saved locally, but limits sync to backend failed: ${e?.message || e}`,
    }
  }

  showStateDialog.value = false
  editingState.value = null
}

function openConditionEditor() {
  if (!editingState.value)
    return
  conditionDraft.value = editingState.value.condition.logic
  conditionRule.value = editingState.value.condition.rule || parseLogicToRule(editingState.value.condition.logic) || null
  conditionType.value = editingState.value.condition.type
  showConditionEditor.value = true
}

function saveConditionEditor() {
  if (!editingState.value)
    return

  // For visual builder, generate logic from rules
  if (conditionType.value === 'visualBuilder' && conditionRule.value) {
    editingState.value.condition.logic = generateLogicFromRules(conditionRule.value)
    editingState.value.condition.rule = conditionRule.value
  }
  else {
    editingState.value.condition.logic = conditionDraft.value
    editingState.value.condition.rule = parseLogicToRule(conditionDraft.value) || null
  }

  editingState.value.condition.type = conditionType.value
  showConditionEditor.value = false
  message.value = { type: 'success', text: 'Condition updated' }
}

function openMnemonicsDialog() {
  if (!editingState.value)
    return
  selectedMnemonics.value = editingState.value.mnemonics.map(m => m.mnemonic)
  showMnemonicsDialog.value = true
}

function saveMnemonicsSelection() {
  if (!editingState.value)
    return

  // Keep existing mappings for selected mnemonics, create new ones for added
  const existing = new Map(editingState.value.mnemonics.map(m => [m.mnemonic, m]))
  const catalogByMnem = new Map(
    (allApiMnemonics.value as MnemonicInfo[]).map(m => [m.mnemonic, m]),
  )

  editingState.value.mnemonics = selectedMnemonics.value.map((mnemonic) => {
    const existing_mapping = existing.get(mnemonic)
    if (existing_mapping)
      return existing_mapping

    const info = catalogByMnem.get(mnemonic)
    const lower = info?.minValue != null ? String(info.minValue) : ''
    const upper = info?.maxValue != null ? String(info.maxValue) : ''
    const expected = info?.defaultValue ?? ''
    const tolerance = info?.tolerance != null && info.tolerance !== '' ? String(info.tolerance) : ''
    return {
      mnemonic,
      limits: [],
      lowerLimit: lower,
      upperLimit: upper,
      expectedValue: expected,
      tolerance,
      active: true,
    }
  })

  showMnemonicsDialog.value = false
  message.value = { type: 'success', text: 'Mnemonics updated' }
}

function updateMnemonicLimits(mnemonic: string, limits: string) {
  if (!editingState.value)
    return
  const mapping = editingState.value.mnemonics.find(m => m.mnemonic === mnemonic)
  if (mapping) {
    mapping.limits = limits.split(',').map(l => l.trim()).filter(l => l.length > 0)
  }
}

function updateMnemonicTolerance(mnemonic: string, tolerance: string) {
  if (!editingState.value)
    return
  const mapping = editingState.value.mnemonics.find(m => m.mnemonic === mnemonic)
  if (mapping) {
    mapping.tolerance = tolerance || undefined
  }
}

function toggleMnemonicActive(mnemonic: string) {
  if (!editingState.value)
    return
  const mapping = editingState.value.mnemonics.find(m => m.mnemonic === mnemonic)
  if (mapping) {
    mapping.active = !mapping.active
  }
}

onMounted(async () => {
  loadStates()
  await loadMnemonicsFromApi()
})
</script>

<template>
  <div class="content p-4">
    <AppName appname="System States Configuration" />

    <!-- Diagnostic Info (for debugging) -->
    <div class="mb-4 p-3 surface-section border-round border border-yellow-500 text-xs">
      <p class="m-0 mb-2">
        <strong>API Endpoint:</strong> <code>{{ gatewayBase || '(NOT CONFIGURED)' }}/get/tm/subsystems</code>
      </p>
      <p class="m-0">
        <strong>Status:</strong>
        <span v-if="loadingMnemonics" class="text-primary">🔄 Loading mnemonics...</span>
        <span v-else-if="allApiMnemonics.length > 0" class="text-green-500">✅ {{ allApiMnemonics.length }} mnemonics loaded</span>
        <span v-else-if="subsystems.length > 0" class="text-yellow-600">⚠️ Subsystems loaded but no mnemonics</span>
        <span v-else class="text-red-500">❌ No data loaded (see Debug button below)</span>
      </p>
    </div>

    <div class="intro-section mt-4 p-4 surface-section border-round">
      <h3 class="mt-0">
        How System States Work
      </h3>
      <p class="text-sm">
        Define system states based on telemetry conditions. Each state determines which telemetry
        mnemonics to monitor and what limits to apply. When the system enters a state, only the
        mnemonics defined for that state will be checked against their configured limits.
      </p>
      <ul class="text-sm">
        <li><strong>State Condition:</strong> A logical expression combining telemetry values that determines if the system is in this state</li>
        <li><strong>Mnemonics:</strong> Telemetry parameters to monitor when the system is in this state</li>
        <li><strong>Limits:</strong> Valid values or ranges for each mnemonic in this state</li>
      </ul>
    </div>

    <div class="controls mt-4">
      <Button label="Create New State" icon="pi pi-plus" @click="createNewState" />
      <Button
        v-tooltip="'Open DevTools Console (F12) to see detailed API responses'"
        label="Debug: Test API Connection"
        icon="pi pi-code"
        severity="secondary"
        text
        @click="testApiConnection"
      />
    </div>

    <Message v-if="message" :severity="message.type === 'success' ? 'success' : 'error'" class="mt-3">
      {{ message.text }}
    </Message>

    <div class="states-grid mt-4">
      <div
        v-for="state in states"
        :key="state.id"
        class="state-card surface-section border border-surface-border surface-border p-4 border-round"
      >
        <div class="flex justify-between align-items-start mb-3">
          <div class="flex-1">
            <h4 class="m-0 text-lg font-semibold">
              {{ state.name }}
            </h4>
            <p class="text-xs text-surface-500 mt-1">
              {{ state.description }}
            </p>
          </div>
          <div class="flex gap-2">
            <Button
              v-tooltip="'Edit State'"
              icon="pi pi-pencil"
              rounded
              text
              severity="info"
              @click="editState(state)"
            />
            <Button
              v-tooltip="'Delete State'"
              icon="pi pi-trash"
              rounded
              text
              severity="danger"
              @click="confirmDeleteState(state)"
            />
          </div>
        </div>

        <div class="state-info" />
      </div>

      <div v-if="states.length === 0" class="empty-state text-center py-8">
        <i class="pi pi-inbox text-surface-400 text-4xl block mb-3" />
        <p class="text-surface-500">
          No system states defined. Create one to get started.
        </p>
      </div>
    </div>
  </div>

  <!-- State Editor Dialog -->
  <Dialog
    v-model:visible="showStateDialog"
    modal
    maximizable
    :header="`${editingState?.id && states.some(s => s.id === editingState.id) ? 'Edit' : 'Create'} State`"
    :style="{ width: '98vw', height: '95vh' }"
    :content-style="{ height: 'calc(95vh - 8rem)', overflow: 'auto' }"
  >
    <div v-if="editingState" class="dialog-content">
      <!-- Basic Info -->
      <div class="field grid">
        <label for="stateName" class="col-12 mb-2 font-semibold">State Name *</label>
        <InputText
          id="stateName"
          v-model="editingState.name"
          class="col-12"
          placeholder="e.g., Pre-Launch, In-Orbit, Safe Mode"
        />
      </div>

      <div class="field grid">
        <label for="stateDesc" class="col-12 mb-2 font-semibold">Description</label>
        <Textarea
          id="stateDesc"
          v-model="editingState.description"
          class="col-12"
          rows="2"
          placeholder="Describe when this state is active..."
        />
      </div>

      <!-- Condition Section -->
      <Divider class="my-4" />
      <div class="mb-4">
        <div class="flex justify-between align-items-center mb-3">
          <h4 class="m-0">
            State Condition *
          </h4>
          <Button
            label="Edit Condition"
            icon="pi pi-pencil"
            size="small"
            severity="info"
            text
            @click="openConditionEditor"
          />
        </div>
        <div class="condition-preview surface-ground p-3 border-round text-xs">
          <code v-if="editingState.condition.logic">{{ editingState.condition.logic }}</code>
          <span v-else class="text-surface-400">No condition defined</span>
        </div>
      </div>

      <!-- Mnemonics Section -->
      <Divider class="my-4" />
      <div class="mb-4">
        <div class="flex justify-between align-items-center mb-3">
          <h4 class="m-0">
            Monitored Mnemonics ({{ editingState.mnemonics.length }})
          </h4>
          <Button
            label="Select Mnemonics"
            icon="pi pi-list"
            size="small"
            severity="info"
            text
            @click="openMnemonicsDialog"
          />
        </div>

        <div v-if="editingState.mnemonics.length > 0">
          <AgGridVue
            :row-data="editingState.mnemonics"
            :column-defs="monitoredColumnDefs"
            :default-col-def="monitoredDefaultColDef"
            :theme="mnemonicsGridTheme"
            :animate-rows="true"
            :stop-editing-when-cells-lose-focus="true"
            :single-click-edit="true"
            style="width: 100%; height: calc(95vh - 28rem); min-height: 320px;"
            @grid-ready="onMonitoredGridReady"
          />
        </div>
        <div v-else class="text-center text-surface-400 py-4">
          No mnemonics selected. Click "Select Mnemonics" to add them.
        </div>
      </div>
    </div>

    <template #footer>
      <Button label="Cancel" text @click="showStateDialog = false" />
      <Button label="Save State" icon="pi pi-check" @click="saveState" />
    </template>
  </Dialog>

  <!-- Condition Editor Dialog -->
  <Dialog
    v-model:visible="showConditionEditor"
    modal
    header="Edit State Condition"
    :style="{ width: '90vw', maxWidth: '1400px', maxHeight: '90vh' }"
    class="condition-editor-dialog"
  >
    <div v-if="editingState">
      <div v-if="loadingMnemonics" class="flex align-items-center gap-2 mb-4 text-surface-500">
        <i class="pi pi-spin pi-spinner" />
        Loading {{ allApiMnemonics.length }} mnemonics from API...
      </div>

      <ConditionEditorWithBuilder
        v-model="conditionDraft"
        v-model:rule="conditionRule"
        v-model:subsystems="conditionSubsystems"
        :subsystem-options="conditionSubsystemOptions"
        :mnemonics="allApiMnemonics"
        :default-type="conditionType"
        height="42vh"
      />

      <p class="text-xs text-surface-400 mt-2">
        <i class="pi pi-info-circle mr-1" />
        Mnemonics available: {{ allApiMnemonics.length }} total (PID_Mnemonic format)
      </p>
    </div>

    <template #footer>
      <Button label="Cancel" text @click="showConditionEditor = false" />
      <Button label="Save" icon="pi pi-check" @click="saveConditionEditor" />
    </template>
  </Dialog>

  <!-- Mnemonics Selection Dialog -->
  <Dialog
    v-model:visible="showMnemonicsDialog"
    modal
    header="Select Mnemonics to Monitor"
    maximizable
    :style="{ width: '98vw', height: '95vh' }"
    :content-style="{ height: 'calc(95vh - 8rem)', overflow: 'auto' }"
  >
    <div v-if="editingState">
      <p class="text-sm mb-4">
        Select which telemetry mnemonics should be monitored when the system is in this state.
        Mnemonics are loaded from your satellite's telemetry system in PID_Mnemonic format.
      </p>

      <div class="mnemonics-selector">
        <div class="available-mnemonics">
          <div class="flex align-items-center justify-content-between mb-3 gap-2 flex-wrap">
            <h5 class="text-xs font-semibold m-0">
              Mnemonics ({{ selectedMnemonics.length }} / {{ displayedMnemonics.length }} shown)
            </h5>
            <div class="flex align-items-center gap-2 flex-wrap">
              <MultiSelect
                v-model="conditionSubsystems"
                :options="conditionSubsystemOptions"
                placeholder="Filter subsystems..."
                display="chip"
                filter
                class="p-inputtext-sm"
                style="min-width: 240px; max-width: 360px;"
              />
              <ToggleButton
                v-model="showOnlySelected"
                on-label="Selected only"
                off-label="Show all"
                on-icon="pi pi-check-square"
                off-icon="pi pi-list"
                class="p-button-sm"
              />
              <div class="search-box">
                <i class="pi pi-search search-box__icon" />
                <InputText
                  v-model="mnemonicsQuickFilter"
                  placeholder="Search mnemonics..."
                  class="search-box__input p-inputtext-sm"
                />
              </div>
            </div>
          </div>
          <div v-if="loadingMnemonics" class="flex align-items-center gap-2 text-surface-500">
            <i class="pi pi-spin pi-spinner" />
            <span class="text-xs">Loading mnemonics...</span>
          </div>
          <div v-else-if="displayedMnemonics.length === 0" class="text-xs text-surface-400 py-3">
            No mnemonics to display
          </div>
          <AgGridVue
            v-else
            :row-data="displayedMnemonics"
            :column-defs="mnemonicsColumnDefs"
            :default-col-def="mnemonicsDefaultColDef"
            :theme="mnemonicsGridTheme"
            :quick-filter-text="mnemonicsQuickFilter"
            :row-selection="'single'"
            :animate-rows="true"
            style="width: 100%; height: calc(95vh - 22rem); min-height: 360px;"
            @grid-ready="onMnemonicsGridReady"
          />
        </div>
      </div>
    </div>

    <template #footer>
      <Button label="Cancel" text @click="showMnemonicsDialog = false" />
      <Button label="Apply" icon="pi pi-check" @click="saveMnemonicsSelection" />
    </template>
  </Dialog>
</template>

<style scoped lang="scss">
.search-box {
  position: relative;
  display: inline-flex;
  align-items: center;
  min-width: 260px;

  &__icon {
    position: absolute;
    left: 0.75rem;
    top: 50%;
    transform: translateY(-50%);
    color: var(--text-color-secondary, #94a3b8);
    pointer-events: none;
    font-size: 0.875rem;
    z-index: 1;
  }

  &__input {
    width: 100%;
    padding-left: 2.25rem !important;
  }
}

.intro-section {
  background: linear-gradient(135deg, rgba(66, 165, 245, 0.05) 0%, rgba(156, 39, 176, 0.05) 100%);
  border: 1px solid rgba(66, 165, 245, 0.2);

  h3 {
    color: var(--primary-color);
  }

  ul {
    list-style: none;
    padding: 0;

    li {
      padding: 0.5rem 0;
      border-bottom: 1px solid rgba(0, 0, 0, 0.05);

      &:last-child {
        border-bottom: none;
      }
    }
  }
}

.states-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 1.5rem;

  .state-card {
    transition: all 0.3s ease;
    cursor: pointer;

    &:hover {
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
      transform: translateY(-2px);
    }

    .state-info {
      .info-item {
        margin-bottom: 1rem;

        label {
          font-size: 0.75rem;
          font-weight: 600;
          color: var(--surface-500);
          display: block;
          margin-bottom: 0.25rem;
        }

        code {
          background: var(--surface-ground);
          padding: 0.25rem 0.5rem;
          border-radius: 4px;
          color: var(--primary-color);
          word-break: break-all;
        }
      }
    }
  }

  .empty-state {
    grid-column: 1 / -1;
  }
}

.dialog-content {
  .field {
    margin-bottom: 1.5rem;

    &:last-child {
      margin-bottom: 0;
    }
  }

  .condition-preview {
    background: var(--surface-ground);
    border: 1px solid var(--surface-border);
    min-height: 60px;
    display: flex;
    align-items: center;
    overflow-x: auto;

    code {
      color: var(--primary-color);
    }
  }

  .mnemonics-list {
    max-height: 400px;
    overflow-y: auto;
  }

  .mnemonic-item {
    transition: all 0.2s ease;

    &:hover {
      background: var(--surface-card);
    }
  }
}

.visual-builder-section {
  .builder-example {
    background: var(--surface-ground);

    code {
      color: var(--primary-color);
      word-break: break-all;
    }
  }

  .builder-help {
    background: rgba(0, 0, 0, 0.02);
    padding: 1rem;
    border-radius: 4px;

    ul {
      margin: 0;
    }
  }
}

.monaco-section {
  textarea {
    font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', 'Droid Sans Mono', monospace;
    background: var(--surface-ground);
    color: var(--text-color);
  }
}

.mnemonics-selector {
  .selected-mnemonics,
  .available-mnemonics {
    padding: 1rem;
    background: var(--surface-ground);
    border-radius: 4px;
  }

  .available-mnemonics {
    background: rgba(0, 0, 0, 0.02);
  }
}
</style>
