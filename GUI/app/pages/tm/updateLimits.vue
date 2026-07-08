<script setup lang="ts">
import type { ColDef } from 'ag-grid-community'
import { colorSchemeDarkBlue, colorSchemeLightCold, ModuleRegistry, themeQuartz } from 'ag-grid-community'
import { AllEnterpriseModule } from 'ag-grid-enterprise'
import { AgGridVue } from 'ag-grid-vue3'
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { initMenu } from '@/composables/tm/SideNav'
import { useColorModeStore } from '~/stores/colorMode'

ModuleRegistry.registerModules([AllEnterpriseModule])

definePageMeta({
  title: 'Telemetry - Update Limits',
  middleware: [() => navigateTo('/tm/updateDb')],
})
initMenu(3)

interface TmRow {
  pid: string
  subsystem: string
  cdbMnemonic: string
  lowerLimit: number | null
  upperLimit: number | null
  description?: string
}

const colorModeStore = useColorModeStore()
const { apiBase: gatewayBase } = useRuntimeConfig().public

const subsystems = ref<string[]>([])
const selectedSubsystems = ref<string[]>([])
const loading = ref(false)
const saving = ref(false)
const quickFilter = ref('')
const saveMessage = ref<{ type: 'success' | 'error', text: string } | null>(null)

const gridApi = ref<any>(null)
const rowData = ref<TmRow[]>([])
const changedRows = ref<Set<string>>(new Set())

const gridTheme = computed(() =>
  colorModeStore.currentMode === 'dark'
    ? themeQuartz.withPart(colorSchemeDarkBlue)
    : themeQuartz.withPart(colorSchemeLightCold),
)

const columnDefs = ref<ColDef<TmRow>[]>([
  {
    headerName: '',
    width: 58,
    rowDrag: true,
    sortable: false,
    filter: false,
    suppressMovable: true,
    valueGetter: () => '::',
    cellStyle: { textAlign: 'center', cursor: 'grab', fontWeight: '700' },
  },
  {
    headerName: 'Mnemonic',
    field: 'cdbMnemonic',
    minWidth: 220,
    flex: 1,
    editable: false,
  },
  {
    headerName: 'Lower Limit',
    field: 'lowerLimit',
    minWidth: 170,
    editable: true,
    valueParser: params => parseNullableNumber(params.newValue),
    cellClass: 'limit-cell',
  },
  {
    headerName: 'Upper Limit',
    field: 'upperLimit',
    minWidth: 170,
    editable: true,
    valueParser: params => parseNullableNumber(params.newValue),
    cellClass: 'limit-cell',
  },
])

const defaultColDef = {
  sortable: true,
  filter: true,
  resizable: true,
}

onMounted(async () => {
  await loadSubsystems()
})

watch(selectedSubsystems, async (subs) => {
  if (subs.length === 0) {
    rowData.value = []
    changedRows.value.clear()
    return
  }
  await loadMnemonicRows(subs)
}, { deep: true })

watch(quickFilter, (value) => {
  if (gridApi.value) {
    gridApi.value.setGridOption('quickFilterText', value)
  }
})

function parseNullableNumber(value: unknown): number | null {
  if (value === '' || value === null || value === undefined)
    return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

function onGridReady(params: any) {
  gridApi.value = params.api
  params.api.setGridOption('quickFilterText', quickFilter.value)
  params.api.autoSizeAllColumns()
}

watch(rowData, async (rows) => {
  if (!gridApi.value || rows.length === 0)
    return
  await nextTick()
  gridApi.value.autoSizeAllColumns()
})

function onCellValueChanged(params: any) {
  if (!params?.data?.subsystem || !params?.data?.cdbMnemonic)
    return
  if (params.colDef.field === 'lowerLimit' || params.colDef.field === 'upperLimit') {
    changedRows.value.add(String(params.data.pid || ''))
  }
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
  saveMessage.value = null
  changedRows.value.clear()
  try {
    const responses = await Promise.all(
      targetSubsystems.map(subsystem =>
        $fetch<any[]>(`${gatewayBase}/get/tm/details/${encodeURIComponent(subsystem)}`)
          .then(rows => ({ subsystem, rows: Array.isArray(rows) ? rows : [] })),
      ),
    )

    const mapped: TmRow[] = responses.flatMap(({ subsystem, rows }) =>
      rows.map((m) => {
        return {
          pid: String(m.pid_no ?? m.pid ?? m._id ?? ''),
          subsystem,
          cdbMnemonic: String(m.mnemonic ?? m.cdbMnemonic ?? ''),
          lowerLimit: parseNullableNumber(m.lower_limit),
          upperLimit: parseNullableNumber(m.upper_limit),
          description: m.description ?? '',
        } as TmRow
      }),
    )

    rowData.value = mapped
  }
  catch (e) {
    console.error('Failed to load mnemonics', e)
    rowData.value = []
  }
  finally {
    loading.value = false
  }
}

async function saveChangedRows() {
  if (selectedSubsystems.value.length === 0)
    return
  if (changedRows.value.size === 0) {
    saveMessage.value = { type: 'success', text: 'No limit changes to save.' }
    return
  }

  saving.value = true
  saveMessage.value = null

  try {
    const rowsToSave = rowData.value.filter(row =>
      changedRows.value.has(row.pid),
    )

    const grouped = new Map<string, TmRow[]>()
    for (const row of rowsToSave) {
      const list = grouped.get(row.subsystem) ?? []
      list.push(row)
      grouped.set(row.subsystem, list)
    }

    let totalUpdated = 0
    const allRows = [...grouped.values()].flat()
    const response = await $fetch<any>(`${gatewayBase}/update/tm/limits`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: allRows.map(row => ({
        pid: row.pid,
        lower_limit: row.lowerLimit ?? 0,
        upper_limit: row.upperLimit ?? 0,
      })),
    })
    totalUpdated = Number(response?.updated ?? allRows.length)

    changedRows.value.clear()
    saveMessage.value = {
      type: 'success',
      text: `Saved limits for ${totalUpdated} mnemonic${totalUpdated > 1 ? 's' : ''}.`,
    }
  }
  catch (e: any) {
    saveMessage.value = {
      type: 'error',
      text: e?.data?.error ?? 'Failed to save updated limits',
    }
  }
  finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="content p-4">
    <AppName appname="Update TM Limits" />

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

      <div class="control-item grow">
        <label class="label">Quick Filter</label>
        <InputText
          v-model="quickFilter"
          placeholder="Filter by mnemonic..."
          class="w-full"
          size="small"
        />
      </div>

      <Button
        label="Save Changed Limits"
        icon="pi pi-save"
        :loading="saving"
        :disabled="selectedSubsystems.length === 0"
        @click="saveChangedRows"
      />
    </div>

    <Message v-if="saveMessage" :severity="saveMessage.type === 'success' ? 'success' : 'error'" class="mt-3">
      {{ saveMessage.text }}
    </Message>

    <div v-if="loading" class="loading-box mt-4">
      <i class="pi pi-spin pi-spinner" />
      <span>Loading mnemonics...</span>
    </div>

    <div v-else class="ag-wrapper mt-4">
      <AgGridVue
        :theme="gridTheme"
        class="ag-theme-local"
        :row-data="rowData"
        :column-defs="columnDefs"
        :default-col-def="defaultColDef"
        :row-drag-managed="true"
        :animate-rows="true"
        :suppress-move-when-row-dragging="false"
        @grid-ready="onGridReady"
        @cell-value-changed="onCellValueChanged"
      />
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
  min-width: 240px;
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
  min-height: 28rem;
  width: min(100%, 72rem);
  border: 1px solid var(--surface-border);
  border-radius: 8px;
  overflow: hidden;
}

.ag-theme-local {
  height: 100%;
  width: 100%;
}

@media (max-width: 1200px) {
  .ag-wrapper {
    width: 100%;
  }
}

@media (max-height: 900px) {
  .ag-wrapper {
    height: calc(100vh - 16rem);
  }
}
</style>
