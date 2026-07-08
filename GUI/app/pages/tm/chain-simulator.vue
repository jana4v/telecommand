<script setup lang="ts">
import type { CellClassParams, ColDef, EditableCallbackParams, ValueFormatterParams } from 'ag-grid-community'
import {

  colorSchemeDarkBlue,
  colorSchemeLightCold,

  ModuleRegistry,
  themeQuartz,

} from 'ag-grid-community'
import { AllEnterpriseModule } from 'ag-grid-enterprise'
import { AgGridVue } from 'ag-grid-vue3'
import { storeToRefs } from 'pinia'
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import SimulatorValueEditor from '@/components/tm/SimulatorValueEditor.vue'
import { initMenu } from '@/composables/tm/SideNav'
import { useColorModeStore } from '~/stores/colorMode'
import { useTmChainSimulatorStateStore } from '~/stores/tmChainSimulatorState'

ModuleRegistry.registerModules([AllEnterpriseModule])

definePageMeta({ title: 'Telemetry - Chain Simulator' })
initMenu(1)

// ─── types ────────────────────────────────────────────────────────────────────

type SimMode = 'FIXED' | 'RANDOM'
type ChainGroup = 'TM' | 'SMON' | 'ADC' | 'DTM' | 'UDTM'

interface SimRow {
  id: string // internal payload key (e.g. "12345_CPU_TEMP")
  pid: string // display PID — just the _id for TM rows, param name for SCOS
  mnemonic: string // display name
  subsystem: string // subsystem category (or chain name for SCOS)
  type: string // "ANALOG" | "BINARY"
  chainGroup: ChainGroup
  rangeOptions: string[] // fed to SimulatorValueEditor AutoComplete
  [key: string]: any // TM1_value, TM2_value, SMON1_value, value, …
}

// Raw API shapes
interface TmMnemonicRaw { pid_no?: string, _id?: string, pid?: string, mnemonic?: string, cdbMnemonic?: string, parameter_type?: string, type?: string, possible_states?: unknown[], lower_range?: number | null, upper_range?: number | null, lower_limit?: number | null, upper_limit?: number | null, range?: unknown[], limits?: unknown[], subsystem?: string }
interface SconItem { param: string, value: string }
interface DtmRow { mnemonic: string, type: string, range?: unknown[] }
interface UdtmRow { mnemonic: string, type: string, value?: string }

// ─── constants ────────────────────────────────────────────────────────────────

const TM_CHAINS = ['TM1', 'TM2', 'TM3', 'TM4'] as const
const SMON_CHAINS = ['SMON1', 'SMON2'] as const
const ADC_CHAINS = ['ADC1', 'ADC2'] as const

const CHAIN_OPTION_GROUPS = [
  { label: 'TM Chains', items: [...TM_CHAINS] },
  { label: 'SMON Chains', items: [...SMON_CHAINS] },
  { label: 'ADC Chains', items: [...ADC_CHAINS] },
  { label: 'Single', items: ['DTM', 'UDTM'] },
]

const MODE_OPTIONS: { label: string, value: SimMode, icon: string }[] = [
  { label: 'Fixed', value: 'FIXED', icon: 'pi pi-lock' },
  { label: 'Random', value: 'RANDOM', icon: 'pi pi-random' },
]

// ─── state ────────────────────────────────────────────────────────────────────

const colorModeStore = useColorModeStore()
const simStateStore = useTmChainSimulatorStateStore()
const { selectedChains, selectedSubsystems, mode, intervalMs, isRunning,
  changeFractionPct, minChange, maxChange, selectionMode } = storeToRefs(simStateStore)
const gridApi = ref<any>(null)

const allSubsystems = ref<string[]>([])
const simRows = ref<SimRow[]>([])

const loading = ref(false)
const message = ref<{ type: 'success' | 'error', text: string } | null>(null)
const hydratingState = ref(false)

let fixedTimer: ReturnType<typeof setInterval> | null = null

// ─── API base ─────────────────────────────────────────────────────────────────

const { apiBase } = useRuntimeConfig().public

// ─── derived chain sets ───────────────────────────────────────────────────────

const selectedTmChains = computed(() => selectedChains.value.filter(c => (TM_CHAINS as readonly string[]).includes(c)))
const selectedSmonChains = computed(() => selectedChains.value.filter(c => (SMON_CHAINS as readonly string[]).includes(c)))
const selectedAdcChains = computed(() => selectedChains.value.filter(c => (ADC_CHAINS as readonly string[]).includes(c)))
const hasDtm = computed(() => selectedChains.value.includes('DTM'))
const hasUdtm = computed(() => selectedChains.value.includes('UDTM'))

// ─── grid ─────────────────────────────────────────────────────────────────────

const gridTheme = computed(() =>
  colorModeStore.currentMode === 'dark'
    ? themeQuartz.withPart(colorSchemeDarkBlue)
    : themeQuartz.withPart(colorSchemeLightCold),
)

const columnDefs = computed<ColDef<SimRow>[]>(() => {
  const cols: ColDef<SimRow>[] = [
    { headerName: 'PID', field: 'pid', flex: 1, minWidth: 160, sortable: true, filter: true, pinned: 'left' },
    { headerName: 'Mnemonic', field: 'mnemonic', flex: 1, minWidth: 160, sortable: true, filter: true },
    { headerName: 'Subsystem', field: 'subsystem', width: 140, sortable: true, filter: true },
    { headerName: 'Type', field: 'type', width: 110 },
  ]

  function makeValueCol(header: string, field: string, groups: ChainGroup[]): ColDef<SimRow> {
    return {
      headerName: header,
      field,
      flex: 1,
      minWidth: 130,
      editable: (p: EditableCallbackParams<SimRow>) => groups.includes(p.data?.chainGroup as ChainGroup),
      singleClickEdit: true,
      cellEditor: SimulatorValueEditor,
      cellEditorPopup: true,
      valueFormatter: (p: ValueFormatterParams<SimRow>) =>
        groups.includes(p.data?.chainGroup as ChainGroup) ? (p.value ?? '') : '—',
      cellStyle: (p: CellClassParams<SimRow>) =>
        groups.includes(p.data?.chainGroup as ChainGroup)
          ? null
          : {
              background: 'var(--surface-100)',
              color: 'var(--text-color-secondary)',
              pointerEvents: 'none',
              cursor: 'not-allowed',
            },
    }
  }

  for (const c of selectedTmChains.value)
    cols.push(makeValueCol(`${c} Value`, `${c}_value`, ['TM']))

  for (const c of selectedSmonChains.value)
    cols.push(makeValueCol(`${c} Value`, `${c}_value`, ['SMON']))

  for (const c of selectedAdcChains.value)
    cols.push(makeValueCol(`${c} Value`, `${c}_value`, ['ADC']))

  const singleGroups: ChainGroup[] = [
    ...(hasDtm.value ? ['DTM' as ChainGroup] : []),
    ...(hasUdtm.value ? ['UDTM' as ChainGroup] : []),
  ]
  if (singleGroups.length)
    cols.push(makeValueCol('Value', 'value', singleGroups))

  return cols
})

const filteredRows = computed<SimRow[]>(() =>
  selectedSubsystems.value.length === 0
    ? []
    : simRows.value.filter(r => selectedSubsystems.value.includes(r.subsystem)),
)

const rowData = computed(() => mode.value === 'FIXED' ? filteredRows.value : [])
const showGrid = computed(() => mode.value === 'FIXED' && filteredRows.value.length > 0)
const showSubsystemSelector = computed(() =>
  mode.value === 'FIXED' && allSubsystems.value.length > 0 && selectedChains.value.length > 0,
)
const configLocked = computed(() => isRunning.value)
const subsystemSelectorDisabled = computed(() => isRunning.value && mode.value !== 'FIXED')

const defaultColDef: ColDef = { resizable: true }

function onGridReady(params: any) {
  gridApi.value = params.api
  params.api.autoSizeAllColumns()
}

// ─── mnemonic loading ─────────────────────────────────────────────────────────

async function loadMnemonics(preferredSubsystems?: string[]) {
  if (!selectedChains.value.length)
    return
  loading.value = true
  simRows.value = []
  allSubsystems.value = []
  message.value = null

  try {
    const hasTm = selectedTmChains.value.length > 0

    const tmDataPromise: Promise<TmMnemonicRaw[]> = hasTm
      ? (async () => {
          const subsystemResp = await $fetch<{ subsystems?: string[] }>(`${apiBase}/get/tm/subsystems`).catch(() => ({ subsystems: [] }))
          const subsystemList = Array.isArray(subsystemResp?.subsystems) ? subsystemResp.subsystems : []
          if (subsystemList.length === 0)
            return []

          const tmRowsBySubsystem = await Promise.all(
            subsystemList.map(subsystem =>
              $fetch<TmMnemonicRaw[]>(`${apiBase}/get/tm/details/${encodeURIComponent(subsystem)}`).catch(() => []),
            ),
          )
          return tmRowsBySubsystem.flat()
        })()
      : Promise.resolve([] as TmMnemonicRaw[])

    // Fetch all sources in parallel
    const sconChains = [...selectedSmonChains.value, ...selectedAdcChains.value]
    const [tmData, dtmData, udtmData, ...sconResults] = await Promise.all([
      tmDataPromise,
      hasDtm.value
        ? $fetch<{ rows?: DtmRow[] }>(`${apiBase}/dtm/procedures`)
        : Promise.resolve(null),
      hasUdtm.value
        ? $fetch<{ rows?: UdtmRow[] }>(`${apiBase}/ud-tm`)
        : Promise.resolve(null),
      ...sconChains.map(chain =>
        $fetch<SconItem[]>(`${apiBase}/maps/${chain.toLowerCase()}`)
          .then(data => ({ chain, data }))
          .catch(() => ({ chain, data: [] as SconItem[] })),
      ),
    ])

    const rows: SimRow[] = []
    const subSet = new Set<string>()

    // ── TM rows (shared mnemonic list across all selected TM chains) ──────────
    if (hasTm) {
      for (const m of (tmData as TmMnemonicRaw[]) ?? []) {
        const type = String(m.parameter_type ?? m.type ?? 'ANALOG').toUpperCase()
        const rangeArr = type === 'BINARY'
          ? (Array.isArray(m.possible_states) ? m.possible_states.map(String) : (Array.isArray(m.range) ? m.range.map(String) : []))
          : []
        const sub = m.subsystem ?? 'TM'
        const mnemonicName = String(m.mnemonic ?? m.cdbMnemonic ?? '').trim()
        const pid = String(m.pid_no ?? m.pid ?? m._id ?? mnemonicName).trim()
        if (!mnemonicName)
          continue
        subSet.add(sub)
        const row: SimRow = {
          id: `${pid}_${mnemonicName}`,
          pid,
          mnemonic: mnemonicName,
          subsystem: sub,
          type,
          chainGroup: 'TM',
          rangeOptions: rangeArr,
        }
        // Default-fill all selected TM chains with first range value
        for (const c of selectedTmChains.value) {
          row[`${c}_value`] = rangeArr[0] ?? '0'
        }
        rows.push(row)
      }
    }

    // ── SMON / ADC rows ───────────────────────────────────────────────────────
    for (const result of sconResults as { chain: string, data: SconItem[] }[]) {
      if (!result?.data)
        continue
      const { chain, data } = result
      const group: ChainGroup = (SMON_CHAINS as readonly string[]).includes(chain) ? 'SMON' : 'ADC'
      subSet.add(chain)
      for (const item of data) {
        const id = `${chain.toLowerCase()}_${item.param}`
        let row = rows.find(r => r.id === id)
        if (!row) {
          row = {
            id,
            pid: item.param,
            mnemonic: item.param,
            subsystem: chain,
            type: 'ANALOG',
            chainGroup: group,
            rangeOptions: [],
          }
          rows.push(row)
        }
        row[`${chain}_value`] = item.value || '0'
      }
    }

    // ── DTM rows ──────────────────────────────────────────────────────────────
    if (hasDtm.value) {
      subSet.add('DTM')
      for (const r of (dtmData as { rows?: DtmRow[] } | null)?.rows ?? []) {
        const rangeArr = Array.isArray(r.range) ? r.range.map(String) : []
        rows.push({
          id: `dtm_${r.mnemonic}`,
          pid: r.mnemonic,
          mnemonic: r.mnemonic,
          subsystem: 'DTM',
          type: r.type ?? 'ANALOG',
          chainGroup: 'DTM',
          rangeOptions: rangeArr,
          value: rangeArr[0] ?? '0',
        })
      }
    }

    // ── UDTM rows ─────────────────────────────────────────────────────────────
    if (hasUdtm.value) {
      subSet.add('UDTM')
      for (const r of (udtmData as { rows?: UdtmRow[] } | null)?.rows ?? []) {
        rows.push({
          id: `udtm_${r.mnemonic}`,
          pid: r.mnemonic,
          mnemonic: r.mnemonic,
          subsystem: 'UDTM',
          type: r.type ?? 'ANALOG',
          chainGroup: 'UDTM',
          rangeOptions: [],
          value: r.value ?? '0',
        })
      }
    }

    simRows.value = rows
    allSubsystems.value = [...subSet].sort()

    const keep = (preferredSubsystems ?? selectedSubsystems.value).filter(s => allSubsystems.value.includes(s))
    selectedSubsystems.value = keep

    message.value = {
      type: 'success',
      text: `Loaded ${rows.length} mnemonics for: ${selectedChains.value.join(', ')}`,
    }
  }
  catch (e: any) {
    console.error('Failed to load mnemonics', e)
    message.value = {
      type: 'error',
      text: `Failed to load mnemonics: ${e?.data?.error ?? e?.message ?? 'Unknown error'}`,
    }
  }
  finally {
    loading.value = false
  }
}

// ─── FIXED mode helpers ───────────────────────────────────────────────────────

/** Build per-chain payloads from current simRows without sending. */
function buildPayloads(): { chain: string, payload: Record<string, string> }[] {
  const out: { chain: string, payload: Record<string, string> }[] = []

  // payload key is row.pid — the clean parameter ID:
  //   TM:        _id from MongoDB (CDB parameter ID, e.g. "ACM05521")
  //   SCOS/DTM/UDTM: param/mnemonic name (no chain prefix or composite suffix)
  for (const chain of selectedTmChains.value) {
    const payload: Record<string, string> = {}
    for (const row of simRows.value) {
      if (row.chainGroup === 'TM')
        payload[row.pid] = String(row[`${chain}_value`] ?? '0')
    }
    if (Object.keys(payload).length)
      out.push({ chain, payload })
  }

  for (const chain of selectedSmonChains.value) {
    const payload: Record<string, string> = {}
    for (const row of simRows.value) {
      if (row.chainGroup === 'SMON')
        payload[row.pid] = String(row[`${chain}_value`] ?? '0')
    }
    if (Object.keys(payload).length)
      out.push({ chain, payload })
  }

  for (const chain of selectedAdcChains.value) {
    const payload: Record<string, string> = {}
    for (const row of simRows.value) {
      if (row.chainGroup === 'ADC')
        payload[row.pid] = String(row[`${chain}_value`] ?? '0')
    }
    if (Object.keys(payload).length)
      out.push({ chain, payload })
  }

  for (const chain of ['DTM', 'UDTM'] as const) {
    if (!selectedChains.value.includes(chain))
      continue
    const payload: Record<string, string> = {}
    for (const row of simRows.value) {
      if (row.chainGroup === chain)
        payload[row.pid] = String(row.value ?? '0')
    }
    if (Object.keys(payload).length)
      out.push({ chain, payload })
  }

  return out
}

/** Send all chain payloads. Returns list of failed chain names (empty = all OK). */
async function sendPayloads(entries: { chain: string, payload: Record<string, string> }[]): Promise<string[]> {
  const results = await Promise.allSettled(
    entries.map(({ chain, payload }) =>
      $fetch(`${apiBase}/sim/streams/${chain}/values`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: payload,
      }),
    ),
  )

  const failedChains: string[] = []
  results.forEach((r, i) => {
    if (r.status === 'rejected') {
      const err = (r.reason as any)?.data?.error ?? (r.reason as any)?.message ?? 'unknown'
      console.error(`[chain-sim] ${entries[i].chain} PUT failed:`, err, r.reason)
      failedChains.push(`${entries[i].chain} (${err})`)
    }
  })
  return failedChains
}

const applyLoading = ref(false)

/** One-shot: send current table values immediately (no timer). */
async function applyValues() {
  if (!simRows.value.length) { message.value = { type: 'error', text: 'Load mnemonics first.' }; return }
  applyLoading.value = true
  message.value = null
  try {
    const entries = buildPayloads()
    if (!entries.length) { message.value = { type: 'error', text: 'No rows to send.' }; return }
    const failed = await sendPayloads(entries)
    if (failed.length) {
      message.value = { type: 'error', text: `Failed chains: ${failed.join(', ')}` }
    }
    else {
      message.value = { type: 'success', text: `Values sent to: ${entries.map(e => e.chain).join(', ')}` }
    }
  }
  finally {
    applyLoading.value = false
  }
}

async function sendFixedTick() {
  if (!simRows.value.length)
    return
  const entries = buildPayloads()
  if (!entries.length)
    return
  const failed = await sendPayloads(entries)
  if (failed.length === entries.length) {
    // All chains failed — stop the timer
    stopFixed()
    message.value = { type: 'error', text: `All chains failed — simulator stopped. Failed: ${failed.join(', ')}` }
  }
  else if (failed.length) {
    // Partial failure — keep running but warn
    message.value = { type: 'error', text: `Some chains failed: ${failed.join(', ')}` }
  }
}

function startFixed() {
  if (!simRows.value.length) {
    message.value = { type: 'error', text: 'Load mnemonics first.' }
    return
  }
  const ms = Math.max(100, intervalMs.value)
  isRunning.value = true
  message.value = {
    type: 'success',
    text: `Fixed simulator running — ${simRows.value.length} mnemonics @ ${ms} ms on: ${selectedChains.value.join(', ')}`,
  }
  sendFixedTick()
  fixedTimer = setInterval(sendFixedTick, ms)
}

function stopFixed() {
  if (fixedTimer) { clearInterval(fixedTimer); fixedTimer = null }
  isRunning.value = false
}

// ─── RANDOM mode helpers ──────────────────────────────────────────────────────

async function startRandom() {
  if (!selectedChains.value.length) {
    message.value = { type: 'error', text: 'Select at least one chain first.' }
    return
  }
  isRunning.value = true
  message.value = null
  const ms = Math.max(100, intervalMs.value)
  const body = {
    interval_ms: ms,
    change_fraction: changeFractionPct.value / 100,
    min_change: minChange.value,
    max_change: maxChange.value,
    selection_mode: selectionMode.value,
  }
  // SMON/ADC (SCOS) chains are only started via the Redis-hash-driven path
  // (GUI_STATE:tm/chain-simulator -> ingest SimConfigSync); the direct HTTP
  // start endpoint intentionally rejects them.
  const directStartChains = selectedChains.value.filter(
    chain => !(SMON_CHAINS as readonly string[]).includes(chain) && !(ADC_CHAINS as readonly string[]).includes(chain),
  )

  const failed: string[] = []
  await Promise.allSettled(
    directStartChains.map(chain =>
      $fetch(`${apiBase}/sim/streams/${chain}/start`, {
        method: 'POST',
        body,
      }).catch((e: any) => {
        failed.push(`${chain}: ${e?.data?.error ?? e?.message ?? 'unknown'}`)
      }),
    ),
  )
  if (failed.length && failed.length === directStartChains.length) {
    isRunning.value = false
    message.value = { type: 'error', text: `Random sim failed: ${failed.join('; ')}` }
  }
  else if (failed.length) {
    message.value = { type: 'error', text: `Some chains failed: ${failed.join('; ')}` }
  }
  else {
    message.value = { type: 'success', text: `Random simulator running @ ${ms} ms on: ${selectedChains.value.join(', ')}` }
  }
}

async function stopRandom() {
  isRunning.value = false
  await Promise.allSettled(
    selectedChains.value.map(chain =>
      $fetch(`${apiBase}/sim/streams/${chain}/stop`, { method: 'POST' }).catch(() => {}),
    ),
  )
  message.value = { type: 'success', text: 'Random simulator stopped.' }
}

// ─── unified start / stop ─────────────────────────────────────────────────────

async function start() {
  if (mode.value === 'FIXED')
    startFixed()
  else await startRandom()
}

async function stop() {
  if (mode.value === 'FIXED')
    stopFixed()
  else await stopRandom()
}

// ─── watchers / lifecycle ─────────────────────────────────────────────────────

watch(selectedChains, async () => {
  if (hydratingState.value)
    return

  // In FIXED mode, chain changes require reloading rows and stopping the local timer.
  // In RANDOM mode, backend reacts via Redis pub/sub, so keep run state untouched.
  if (isRunning.value && mode.value === 'FIXED') {
    stopFixed()
  }

  const preferredSubsystems = [...selectedSubsystems.value]
  simRows.value = []
  allSubsystems.value = []
  if (selectedChains.value.length)
    await loadMnemonics(preferredSubsystems)
}, { deep: true })

watch(
  [selectedChains, selectedSubsystems, mode, intervalMs, isRunning,
    changeFractionPct, minChange, maxChange, selectionMode],
  () => { void simStateStore.saveToRedis() },
  { deep: true },
)

watch(mode, () => {
  if (isRunning.value) {
    if (mode.value === 'FIXED')
      stopRandom()
    else stopFixed()
    isRunning.value = false
  }
})

onMounted(async () => {
  initMenu(1)
  hydratingState.value = true
  await simStateStore.loadFromRedis()
  hydratingState.value = false

  if (selectedChains.value.length) {
    await loadMnemonics(selectedSubsystems.value)
  }
})

onBeforeUnmount(() => {
  if (fixedTimer) {
    clearInterval(fixedTimer)
    fixedTimer = null
  }

  // FIXED mode simulation runs only in-page; persist stopped state when leaving.
  // RANDOM mode is backend-driven and should keep its running state across navigation.
  if (mode.value === 'FIXED' && isRunning.value) {
    isRunning.value = false
    void simStateStore.saveToRedis()
  }
})
</script>

<template>
  <div class="content p-4">
    <AppName appname="Chain Simulator" />

    <!-- ── Toolbar Row 1: chains, mode, interval, actions, status ──────────── -->
    <div class="toolbar mt-4">
      <!-- Multi-chain selector -->
      <div class="field-block" style="min-width:16rem">
        <label class="field-label">Chains</label>
        <MultiSelect
          v-model="selectedChains"
          :options="CHAIN_OPTION_GROUPS"
          option-group-label="label"
          option-group-children="items"
          placeholder="Select chain(s)…"
          :max-selected-labels="4"
          :filter="true"
          :disabled="configLocked"
          class="w-full"
        />
      </div>

      <!-- Mode chips -->
      <div class="field-block">
        <label class="field-label">Mode</label>
        <div class="mode-row">
          <div
            v-for="opt in MODE_OPTIONS"
            :key="opt.value"
            class="mode-chip" :class="[{ 'mode-chip--active': mode === opt.value, 'mode-chip--disabled': configLocked }]"
            @click="!configLocked && (mode = opt.value)"
          >
            <i :class="opt.icon" />
            <span>{{ opt.label }}</span>
          </div>
        </div>
      </div>

      <!-- Interval -->
      <div class="field-block" style="min-width:9rem">
        <label class="field-label">Interval (ms)</label>
        <InputNumber v-model="intervalMs" :min="100" :max="60000" :step="100" :disabled="configLocked" class="w-full" />
      </div>

      <!-- Start / Stop / Apply / Reload -->
      <div class="field-block actions">
        <Button
          v-if="!isRunning"
          label="Start simulation"
          icon="pi pi-play"
          severity="success"
          :loading="loading"
          :disabled="mode === 'FIXED' ? (selectedChains.length === 0 || simRows.length === 0) : false"
          @click="start"
        />
        <Button
          v-else
          label="Stop simulation"
          icon="pi pi-stop"
          severity="danger"
          @click="stop"
        />
        <Button
          v-if="mode === 'FIXED'"
          label="Apply"
          icon="pi pi-send"
          severity="info"
          outlined
          :loading="applyLoading"
          :disabled="simRows.length === 0 || selectedSubsystems.length === 0"
          @click="applyValues"
        />
        <Button
          label="Reload"
          icon="pi pi-refresh"
          severity="secondary"
          outlined
          :loading="loading"
          :disabled="isRunning || selectedChains.length === 0"
          @click="loadMnemonics"
        />
      </div>

      <!-- Status badge -->
      <div class="field-block" style="align-self:flex-end">
        <Tag :value="isRunning ? 'RUNNING' : 'STOPPED'" :severity="isRunning ? 'success' : 'secondary'" />
      </div>
    </div>

    <!-- ── Toolbar Row 2: subsystem filter ─────────────────────────────────── -->
    <div v-if="showSubsystemSelector" class="toolbar mt-3">
      <div class="field-block" style="min-width:20rem">
        <label class="field-label">Subsystems</label>
        <MultiSelect
          v-model="selectedSubsystems"
          :options="allSubsystems"
          placeholder="All subsystems (no filter)"
          :filter="true"
          :max-selected-labels="5"
          :disabled="subsystemSelectorDisabled"
          class="w-full"
        />
      </div>
    </div>

    <!-- ── RANDOM mode generation settings ──────────────────────────────────── -->
    <div v-if="mode === 'RANDOM'" class="toolbar mt-3">
      <!-- Change % per tick -->
      <div class="field-block" style="min-width:14rem">
        <label class="field-label">Change % per tick</label>
        <div class="fraction-row">
          <Slider v-model="changeFractionPct" :min="1" :max="80" :step="1"
            :disabled="configLocked" class="fraction-slider" />
          <span class="fraction-val">{{ changeFractionPct }}%</span>
        </div>
        <small class="field-hint">Fraction of catalogue regenerated each tick</small>
      </div>

      <!-- Min params / tick -->
      <div class="field-block" style="min-width:8rem">
        <label class="field-label">Min params / tick</label>
        <InputNumber v-model="minChange" :min="0" :max="10000" :step="100"
          :disabled="configLocked" class="w-full" />
      </div>

      <!-- Max params / tick -->
      <div class="field-block" style="min-width:8rem">
        <label class="field-label">Max params / tick</label>
        <InputNumber v-model="maxChange" :min="0" :max="10000" :step="100"
          :disabled="configLocked" class="w-full" />
      </div>

      <!-- Selection mode -->
      <div class="field-block">
        <label class="field-label">Param selection</label>
        <div class="mode-row">
          <div
            class="mode-chip"
            :class="[{ 'mode-chip--active': selectionMode === 'sequential', 'mode-chip--disabled': configLocked }]"
            @click="!configLocked && (selectionMode = 'sequential')"
          >
            <i class="pi pi-sort-amount-down" />
            <span>Sequential</span>
          </div>
          <div
            class="mode-chip"
            :class="[{ 'mode-chip--active': selectionMode === 'random', 'mode-chip--disabled': configLocked }]"
            @click="!configLocked && (selectionMode = 'random')"
          >
            <i class="pi pi-random" />
            <span>Random</span>
          </div>
        </div>
        <small class="field-hint">
          <b>Sequential</b>: walks params in order (round-robin).<br>
          <b>Random</b>: picks N params at random each tick.
        </small>
      </div>
    </div>

    <!-- ── RANDOM info banner ────────────────────────────────────────────────── -->
    <div v-if="mode === 'RANDOM'" class="random-info mt-3">
      <i class="pi pi-info-circle" />
      <span>
        <b>Random mode:</b> simulation is controlled by persisted Redis config. Start/stop, mode,
        and interval are saved to hash state and consumed by ingest via Redis Pub/Sub.
        Telemetry values/types are loaded from backend databases, not from GUI rows.
      </span>
    </div>

    <!-- ── Message ──────────────────────────────────────────────────────────── -->
    <Message
      v-if="message"
      :severity="message.type === 'success' ? 'success' : 'error'"
      class="mt-3"
      :closable="true"
      @close="message = null"
    >
      {{ message.text }}
    </Message>

    <!-- ── Grid (FIXED mode only) ───────────────────────────────────────────── -->
    <div v-if="showGrid" class="grid-shell mt-4">
      <AgGridVue
        :theme="gridTheme"
        class="sim-grid"
        :row-data="rowData"
        :column-defs="columnDefs"
        :default-col-def="defaultColDef"
        :stop-editing-when-cells-lose-focus="false"
        @grid-ready="onGridReady"
      />
    </div>

    <!-- ── Empty state hint ─────────────────────────────────────────────────── -->
    <div v-else-if="mode === 'FIXED' && selectedChains.length === 0" class="empty-hint mt-4">
      <i class="pi pi-arrow-up" />
      <span>Select one or more chains above to load mnemonics.</span>
    </div>
    <div v-else-if="mode === 'FIXED' && simRows.length > 0 && selectedSubsystems.length === 0" class="empty-hint mt-4">
      <i class="pi pi-filter" />
      <span>Select one or more subsystems above to display mnemonics.</span>
    </div>

    <!-- ── Legend ────────────────────────────────────────────────────────────── -->
    <p v-if="simRows.length > 0" class="legend mt-2">
      <template v-if="mode === 'FIXED'">
        Values sent every {{ intervalMs }} ms to
        <code>PUT /api/go/v1/sim/streams/{chain}/values</code>
        for each selected chain.
      </template>
      <template v-else>
        Backend loops are controlled by Redis hash state
        <code>GUI_STATE:tm/chain-simulator</code>
        and Pub/Sub notifications on the same channel name.
      </template>
    </p>
  </div>
</template>

<style scoped lang="scss">
.toolbar {
  display: flex;
  align-items: flex-start;
  gap: 1rem;
  flex-wrap: wrap;
}

.field-block {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}

.field-label {
  font-size: 0.82rem;
  font-weight: 600;
}

.actions {
  flex-direction: row;
  align-items: flex-end;
  gap: 0.5rem;
}

.mode-row {
  display: flex;
  gap: 0.5rem;
}

.mode-chip {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.4rem 0.75rem;
  border-radius: 6px;
  cursor: pointer;
  border: 1px solid transparent;
  font-size: 0.9rem;
  transition: background 0.15s, border-color 0.15s;

  &:hover { background: var(--surface-hover); }

  &--active {
    background: var(--primary-50, rgba(var(--primary-color-rgb), 0.08));
    border-color: var(--primary-color);
    font-weight: 600;
    color: var(--primary-color);
  }

  &--disabled {
    opacity: 0.6;
    cursor: not-allowed;
    pointer-events: none;
  }
}

.random-info {
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
  padding: 0.6rem 0.9rem;
  border-radius: 6px;
  background: var(--blue-50, rgba(59, 130, 246, 0.07));
  border: 1px solid var(--blue-200, rgba(59, 130, 246, 0.25));
  font-size: 0.87rem;
  color: var(--text-color);

  code {
    background: var(--surface-100);
    padding: 0.1rem 0.3rem;
    border-radius: 3px;
    font-size: 0.82rem;
  }
}

.empty-hint {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 2rem;
  border: 1px dashed var(--surface-border);
  border-radius: 8px;
  color: var(--text-color-secondary);
  font-size: 0.9rem;
  justify-content: center;
}

.grid-shell {
  height: calc(100vh - 24rem);
  min-height: 22rem;
  border: 1px solid var(--surface-border);
  border-radius: 8px;
  overflow: hidden;
}

.sim-grid {
  width: 100%;
  height: 100%;
}

.legend {
  font-size: 0.78rem;
  color: var(--text-color-secondary);

  code {
    background: var(--surface-100);
    padding: 0.1rem 0.3rem;
    border-radius: 3px;
    font-size: 0.76rem;
  }
}

.fraction-row {
  display: flex;
  align-items: center;
  gap: 0.6rem;
}

.fraction-slider {
  flex: 1;
}

.fraction-val {
  font-size: 0.88rem;
  font-weight: 600;
  min-width: 2.8rem;
  text-align: right;
  font-variant-numeric: tabular-nums;
}

.field-hint {
  font-size: 0.75rem;
  color: var(--text-color-secondary);
  line-height: 1.4;
  margin-top: 0.1rem;
}
</style>
