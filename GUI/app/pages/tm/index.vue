<script setup lang="ts">
import type { ColDef, GridApi } from 'ag-grid-community'
import type { NatsConnection, Subscription } from 'nats.ws'
import {

  colorSchemeDarkBlue,
  colorSchemeLightCold,

  ModuleRegistry,
  themeQuartz,
} from 'ag-grid-community'
import { AllEnterpriseModule } from 'ag-grid-enterprise'
import { AgGridVue } from 'ag-grid-vue3'
import { connect, StringCodec } from 'nats.ws'
import { computed, onMounted, onUnmounted, ref, shallowRef, watch } from 'vue'
import { initMenu } from '@/composables/tm/SideNav'
import { useTmFiltersStore } from '@/stores/tmFilters'
import { useColorModeStore } from '~/stores/colorMode'

ModuleRegistry.registerModules([AllEnterpriseModule])

definePageMeta({ title: 'Telemetry' })
initMenu(0)

interface TmLiveRow {
  pid: string
  subsystem: string
  cdbMnemonic: string
  value: string | null
}

const colorModeStore = useColorModeStore()
const { apiBase: gatewayBase } = useRuntimeConfig().public

const tmFilters = useTmFiltersStore()
const subsystems = ref<string[]>([])
const selectedSubsystems = ref<string[]>(tmFilters.liveSubsystems)
const loading = ref(false)
const quickFilter = ref(tmFilters.liveQuickFilter)
const LOCAL_SUBSYSTEMS_KEY = 'tm.live.selectedSubsystems'
const LOCAL_QUICK_FILTER_KEY = 'tm.live.quickFilter'
const LOCAL_NATS_CHAIN_KEY = 'tm.live.natsChain'

const selectedNatsChain = ref<string>('UNIFIED')
const availableChains = ref<string[]>([])

// Map mnemonic → subsystem for fast lookup during NATS updates
const mnemonicSubsystemMap = ref<Map<string, string>>(new Map())
// Map id_mnemonic key (e.g. "ACM05521_ACMU_IP_CLK_STS") → short mnemonic name
// Used to match NATS delta payloads and UNIFIED_TM_MAP results back to grid rows.
const idKeyToMnemonicMap = ref<Map<string, string>>(new Map())
const rowData = ref<TmLiveRow[]>([])
const gridApi = shallowRef<GridApi<TmLiveRow> | null>(null)
let natsClient: NatsConnection | null = null
let natsSubTmMap: Subscription | null = null
let natsSubTmMapFull: Subscription | null = null

const natsChainOptions = computed(() => [
  { label: 'Unified TM', value: 'UNIFIED' },
  ...availableChains.value.map(chain => ({ label: chain, value: chain })),
])

const gridTheme = computed(() =>
  colorModeStore.currentMode === 'dark'
    ? themeQuartz.withPart(colorSchemeDarkBlue)
    : themeQuartz.withPart(colorSchemeLightCold),
)

const columnDefs: ColDef<TmLiveRow>[] = [
  {
    headerName: 'PID',
    field: 'pid',
    minWidth: 130,
    maxWidth: 180,
    pinned: 'left',
    editable: false,
    filter: true,
    cellStyle: { fontWeight: '600' },
  },
  {
    headerName: 'Mnemonic',
    field: 'cdbMnemonic',
    minWidth: 240,
    editable: false,
    filter: true,
  },
  {
    headerName: 'Subsystem',
    field: 'subsystem',
    minWidth: 120,
    maxWidth: 180,
    editable: false,
    filter: true,
  },
  {
    headerName: 'Value',
    field: 'value',
    flex: 1,
    editable: false,
    filter: true,
    cellDataType: 'text',
  },
]

const defaultColDef: ColDef<TmLiveRow> = {
  sortable: true,
  resizable: true,
}

async function fetchSubsystems() {
  try {
    const data = await $fetch<{ subsystems: string[] }>(`${gatewayBase}/get/tm/subsystems`)
    subsystems.value = data?.subsystems ?? []
  }
  catch {
    subsystems.value = []
  }
}

async function fetchAvailableChains() {
  try {
    const streams = await $fetch<Array<{ id?: string }>>(`${gatewayBase}/sim/streams`)
    const ids = (streams ?? [])
      .map(s => String(s?.id ?? '').trim().toUpperCase())
      .filter(v => v.length > 0)
      .sort()
    availableChains.value = [...new Set(ids)]
  }
  catch {
    availableChains.value = []
  }
}

async function loadData(targets: string[]) {
  if (!targets.length) {
    rowData.value = []
    mnemonicSubsystemMap.value = new Map()
    idKeyToMnemonicMap.value = new Map()
    return
  }
  loading.value = true
  try {
    // Fetch mnemonic lists for all selected subsystems in parallel
    const results = await Promise.all(
      targets.map(sub =>
        $fetch<any[]>(`${gatewayBase}/get/tm/details/${sub}`).catch(() => []),
      ),
    )

    // Build mnemonic, subsystem and id maps.
    // Key convention: _id (CDB parameter ID) — same key the ingest StreamBuffer uses.
    // UI maps id → cdbMnemonic for display only.
    const allIds: string[] = []
    const subsysMap = new Map<string, string>() // cdbMnemonic → subsystem
    const idToMnemonicMap = new Map<string, string>() // _id          → cdbMnemonic
    const mnemonicToIdMap = new Map<string, string>() // cdbMnemonic  → _id (for value lookup)

    results.forEach((list, idx) => {
      const sub = targets[idx];
      (list || []).forEach((m: any) => {
        const name: string = m.mnemonic || m.cdbMnemonic || ''
        if (!name)
          return
        const id: string = m.pid_no || m.pid || m._id || name
        allIds.push(id)
        subsysMap.set(name, sub)
        idToMnemonicMap.set(id, name)
        mnemonicToIdMap.set(name, id)
      })
    })

    mnemonicSubsystemMap.value = subsysMap
    idKeyToMnemonicMap.value = idToMnemonicMap

    if (!allIds.length) {
      rowData.value = []
      return
    }

    // Batch-fetch current values from the ingest StreamStore via gateway get-telemetry.
    // The ingest service holds values by paramID (same as _id) in-memory — no Redis needed.
    const resp = await $fetch<{ results: Record<string, string | null> }>(
      `${gatewayBase}/get-telemetry`,
      {
        method: 'POST',
        body: { ids: allIds },
      },
    )

    const vals = resp?.results ?? {}

    // Build row data: map paramID results back to cdbMnemonic names for display.
    rowData.value = [...subsysMap.keys()].map((mn) => {
      const id = mnemonicToIdMap.get(mn) ?? mn
      return {
        pid: id,
        subsystem: subsysMap.get(mn) ?? '',
        cdbMnemonic: mn,
        value: vals[id] ?? null,
      }
    })
  }
  catch (e) {
    rowData.value = []
  }
  finally {
    loading.value = false
  }
}

watch(selectedSubsystems, (val) => {
  tmFilters.liveSubsystems = val
  if (import.meta.client) {
    window.localStorage.setItem(LOCAL_SUBSYSTEMS_KEY, JSON.stringify(val))
  }
  loadData(val)
})

watch(quickFilter, (val) => {
  tmFilters.liveQuickFilter = val
  if (import.meta.client) {
    window.localStorage.setItem(LOCAL_QUICK_FILTER_KEY, val)
  }
})

function restoreLocalState() {
  if (!import.meta.client)
    return

  const storedSubsystems = window.localStorage.getItem(LOCAL_SUBSYSTEMS_KEY)
  if (storedSubsystems) {
    try {
      const parsed = JSON.parse(storedSubsystems)
      if (Array.isArray(parsed)) {
        selectedSubsystems.value = parsed.filter((v): v is string => typeof v === 'string')
      }
    }
    catch {
      // ignore malformed session data
    }
  }

  const storedQuickFilter = window.localStorage.getItem(LOCAL_QUICK_FILTER_KEY)
  if (storedQuickFilter !== null) {
    quickFilter.value = storedQuickFilter
  }

  const storedChain = window.localStorage.getItem(LOCAL_NATS_CHAIN_KEY)
  if (storedChain) {
    selectedNatsChain.value = storedChain
  }
}

function onGridReady(params: { api: GridApi<TmLiveRow> }) {
  gridApi.value = params.api
  params.api.sizeColumnsToFit()
  if (quickFilter.value) {
    params.api.setGridOption('quickFilterText', quickFilter.value)
  }
}

function applyUpdates(payloadText: string) {
  try {
    const parsed = JSON.parse(payloadText)
    let updates: Record<string, unknown> = {}

    // Accept both array payload (legacy): [{"MNEMONIC":"value"}, ...]
    // and object payload: {"MNEMONIC":"value", ...}
    if (Array.isArray(parsed)) {
      parsed.forEach((entry: Record<string, unknown>) => Object.assign(updates, entry))
    }
    else {
      updates = parsed as Record<string, unknown>
    }

    const idMap = idKeyToMnemonicMap.value // paramID → cdbMnemonic
    const rows = rowData.value
    let changed = false

    Object.entries(updates).forEach(([key, rawValue]) => {
      const value = String(rawValue)

      // NATS delta payloads use paramID as key (e.g. "ACM05521").
      // Map to the display mnemonic name via the id→mnemonic catalog.
      const mnemonic = idMap.get(key)
      if (!mnemonic)
        return

      const row = rows.find(r => r.cdbMnemonic === mnemonic)
      if (!row)
        return
      row.value = value
      changed = true
    })

    if (changed && gridApi.value) {
      gridApi.value.refreshCells({ force: true })
    }
  }
  catch {
    // ignore malformed messages
  }
}

async function subscribeLoop(sub: Subscription) {
  const sc = StringCodec()
  for await (const msg of sub) {
    applyUpdates(sc.decode(msg.data))
  }
}

function resubscribeNats() {
  if (!natsClient)
    return

  // Tear down existing subscriptions
  if (natsSubTmMap) {
    natsSubTmMap.unsubscribe()
    natsSubTmMap = null
  }
  if (natsSubTmMapFull) {
    natsSubTmMapFull.unsubscribe()
    natsSubTmMapFull = null
  }

  const chain = selectedNatsChain.value
  // Backend ingest dispatcher publishes deltas to:
  //   tm.tm_map          (unified — all chains merged)
  //   tm.tm_map.<CHAIN>  (per-chain, e.g. tm.tm_map.TM1)
  const subject = chain === 'UNIFIED'
    ? 'tm.tm_map'
    : `tm.tm_map.${chain}`

  natsSubTmMap = natsClient.subscribe(subject)
  void subscribeLoop(natsSubTmMap)
}

  async function connectNats() {
    if (!import.meta.client)
      return

    try {
      // In development, connect directly to NATS WS (port 4223) to avoid routing
      // through the Nuxt dev server, which crashes Nitro on failed WS upgrades.
      // In production, traffic goes through the reverse proxy (Kong) at /nats.
      const natsWsUrl = import.meta.dev
        ? 'ws://localhost:4223'
        : `ws://${window.location.host}/nats`
      natsClient = await connect({ servers: natsWsUrl })
      resubscribeNats()
    }
    catch {
      // keep page usable even when broker is unavailable
      natsClient = null
    }
  }

  function disconnectNats() {
    if (natsSubTmMap) {
      natsSubTmMap.unsubscribe()
      natsSubTmMap = null
    }
    if (natsSubTmMapFull) {
      natsSubTmMapFull.unsubscribe()
      natsSubTmMapFull = null
    }
    if (natsClient) {
      void natsClient.close()
      natsClient = null
    }
  }

onMounted(() => {
  restoreLocalState()
  fetchSubsystems()
  fetchAvailableChains()
  void connectNats()
  // Restore previously selected subsystems
  if (selectedSubsystems.value.length) {
    loadData(selectedSubsystems.value)
  }
})

onUnmounted(() => {
  disconnectNats()
})

function onFilterChanged() {
  gridApi.value?.setGridOption('quickFilterText', quickFilter.value)
}

watch(selectedNatsChain, (val) => {
  if (import.meta.client) {
    window.localStorage.setItem(LOCAL_NATS_CHAIN_KEY, val)
  }
  resubscribeNats()
})

watch(availableChains, (chains) => {
  if (selectedNatsChain.value === 'UNIFIED')
    return
  if (!chains.includes(selectedNatsChain.value)) {
    selectedNatsChain.value = 'UNIFIED'
  }
})
</script>

<template>
  <div class="live-tm-page mt-25">
    <!-- Toolbar -->
    <div class="toolbar mb-2 flex align-items-center gap-3 flex-wrap">
      <Select
        v-model="selectedNatsChain"
        :options="natsChainOptions"
        option-label="label"
        option-value="value"
        placeholder="Telemetry Source"
        class="chain-select"
      />
      <MultiSelect
        v-model="selectedSubsystems"
        :options="subsystems"
        placeholder="Select Subsystem(s)"
        :filter="true"
        :max-selected-labels="3"
        class="subsystem-select"
      />
      <span v-if="loading" class="text-sm text-color-secondary">Loading...</span>
      <InputText
        v-model="quickFilter"
        placeholder="Quick filter..."
        class="quick-filter"
        @input="onFilterChanged"
      />
    </div>

    <!-- Grid -->
    <AgGridVue
      :style="{ width: '100%', height: 'calc(100vh - 140px)' }"
      :theme="gridTheme"
      :column-defs="columnDefs"
      :default-col-def="defaultColDef"
      :row-data="rowData"
      :animate-rows="true"
      @grid-ready="onGridReady"
    />
  </div>
</template>

<style lang="scss" scoped>
.live-tm-page {
  padding: 0 12px;
  display: flex;
  flex-direction: column;
}

.toolbar {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.subsystem-select {
  min-width: 280px;
}

.chain-select {
  min-width: 220px;
}

.quick-filter {
  width: 220px;
}
</style>
