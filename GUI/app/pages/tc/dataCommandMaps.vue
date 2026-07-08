<script setup lang="ts">
import type { ColDef } from 'ag-grid-community'
import {
  colorSchemeDarkBlue,
  ModuleRegistry,
  themeQuartz,
} from 'ag-grid-community'
import { AllEnterpriseModule } from 'ag-grid-enterprise'
import { AgGridVue } from 'ag-grid-vue3'
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { initMenu } from '@/composables/tc/SideNav'
import { useColorModeStore } from '~/stores/colorMode'

const props = withDefaults(defineProps<{ embedMode?: boolean }>(), {
  embedMode: false,
})

ModuleRegistry.registerModules([AllEnterpriseModule])

definePageMeta({ title: 'Telecommand - Data Command Maps' })
const route = useRoute()
if (String(route.path || '').startsWith('/tc'))
  initMenu(2)

interface DataMapRow {
  id?: number
  mapName: string
  label: string
  code: string
  value: string
  __new?: boolean
}

const colorModeStore = useColorModeStore()
const { apiBase: gatewayBase } = useRuntimeConfig().public

const rowData = ref<DataMapRow[]>([])
const deletedIds = ref<number[]>([])
const changed = ref(false)
const loading = ref(false)
const saving = ref(false)
const quickFilter = ref('')
const message = ref<{ type: 'success' | 'error', text: string } | null>(null)
const gridApi = ref<any>(null)

const gridTheme = computed(() =>
  themeQuartz.withPart(colorSchemeDarkBlue),
)

const columnDefs = ref<ColDef<DataMapRow>[]>([
  { headerName: 'MapName', field: 'mapName', editable: true, minWidth: 180 },
  { headerName: 'Label', field: 'label', editable: true, minWidth: 220 },
  { headerName: 'Code', field: 'code', editable: true, minWidth: 180 },
  { headerName: 'Value', field: 'value', editable: true, minWidth: 220 },
])

const defaultColDef: ColDef<DataMapRow> = {
  sortable: true,
  filter: true,
  resizable: true,
}

onMounted(async () => {
  await loadDataMaps()
})

watch(quickFilter, (v) => {
  gridApi.value?.setGridOption('quickFilterText', v)
})

function onGridReady(params: any) {
  gridApi.value = params.api
  params.api.setGridOption('quickFilterText', quickFilter.value)
}

function onCellValueChanged() {
  changed.value = true
}

async function loadDataMaps() {
  loading.value = true
  message.value = null
  changed.value = false
  deletedIds.value = []
  try {
    const res = await $fetch<{ items: any[] }>(`${gatewayBase}/telecommand/data-maps`)
    rowData.value = (res?.items || []).map((item: any) => ({
      id: Number(item.id),
      mapName: String(item.mapName ?? ''),
      label: String(item.label ?? ''),
      code: String(item.code ?? ''),
      value: String(item.value ?? ''),
      __new: false,
    }))
  }
  catch (e: any) {
    message.value = { type: 'error', text: e?.data?.error ?? 'Failed to load data maps' }
    rowData.value = []
  }
  finally {
    loading.value = false
  }
}

function addRow() {
  rowData.value = [
    ...rowData.value,
    { mapName: '', label: '', code: '', value: '', __new: true },
  ]
  changed.value = true
}

function deleteSelectedRows() {
  const selected = gridApi.value?.getSelectedRows?.() || []
  if (!selected.length)
    return

  for (const row of selected) {
    if (row.id)
      deletedIds.value.push(Number(row.id))
  }

  const selectedSet = new Set(selected)
  rowData.value = rowData.value.filter(row => !selectedSet.has(row))
  changed.value = true
}

async function saveChanges() {
  saving.value = true
  message.value = null
  try {
    for (const id of deletedIds.value) {
      await $fetch(`${gatewayBase}/telecommand/data-maps/${id}`, { method: 'DELETE' })
    }

    for (const row of rowData.value) {
      const mapName = row.mapName.trim()
      if (!mapName)
        continue

      await $fetch(`${gatewayBase}/telecommand/data-maps`, {
        method: 'POST',
        body: {
          id: row.id,
          mapName,
          label: row.label.trim(),
          code: row.code.trim(),
          value: row.value.trim(),
        },
      })
    }

    await loadDataMaps()
    message.value = { type: 'success', text: 'Data command maps saved successfully.' }
  }
  catch (e: any) {
    message.value = { type: 'error', text: e?.data?.error ?? 'Failed to save data command maps' }
  }
  finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="content p-4">
    <AppName v-if="!props.embedMode" appname="Data Command Maps" />

    <div class="controls" :class="props.embedMode ? 'mt-2' : 'mt-4'">
      <div class="control-item grow">
        <label class="label">Quick Filter</label>
        <InputText
          v-model="quickFilter"
          class="w-full"
          placeholder="Filter by map name / label / code / value..."
        />
      </div>

      <Button label="Add Row" icon="pi pi-plus" outlined @click="addRow" />
      <Button label="Delete Selected" icon="pi pi-trash" severity="danger" outlined @click="deleteSelectedRows" />
      <Button label="Save Maps" icon="pi pi-save" :loading="saving" :disabled="!changed" @click="saveChanges" />
    </div>

    <Message v-if="message" :severity="message.type === 'success' ? 'success' : 'error'" class="mt-3">
      {{ message.text }}
    </Message>

    <div v-if="loading" class="loading-box mt-4">
      <i class="pi pi-spin pi-spinner" />
      <span>Loading data command maps...</span>
    </div>

    <div v-else class="ag-wrapper mt-4">
      <AgGridVue
        :theme="gridTheme"
        class="ag-theme-local"
        :row-data="rowData"
        :column-defs="columnDefs"
        :default-col-def="defaultColDef"
        row-selection="multiple"
        :stop-editing-when-cells-lose-focus="true"
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

.ag-wrapper {
  height: calc(100vh - 18rem);
  min-height: 30rem;
  width: 100%;
  border: 1px solid var(--surface-border);
  border-radius: 8px;
  overflow: hidden;
}

.ag-theme-local {
  height: 100%;
  width: 100%;
}
</style>
