<script setup lang="ts">
import { ref } from 'vue'
import { useRoute } from 'vue-router'
import { initMenu } from '@/composables/tc/SideNav'

const props = withDefaults(defineProps<{ embedMode?: boolean }>(), {
  embedMode: false,
})

definePageMeta({ title: 'Telecommand - Upload TC' })
const route = useRoute()
if (String(route.path || '').startsWith('/tc'))
  initMenu(0)

const { apiBase } = useRuntimeConfig().public
const gatewayCandidates = import.meta.client ? [apiBase] : []

const selectedFile = ref<File | null>(null)
const uploading = ref(false)
const result = ref<{
  success: boolean
  message: string
  filename?: string
  total?: number
  inserted?: number
  updated?: number
  skipped?: number
  errors?: string[]
} | null>(null)

function onFileSelect(event: Event) {
  const input = event.target as HTMLInputElement
  selectedFile.value = input.files?.[0] ?? null
  result.value = null
}

function onFileDrop(event: DragEvent) {
  const file = event.dataTransfer?.files?.[0]
  selectedFile.value = file ?? null
  result.value = null
}

function clearFile() {
  selectedFile.value = null
  result.value = null
  const el = document.getElementById('tc-file-input') as HTMLInputElement | null
  if (el)
    el.value = ''
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const value = String(reader.result || '')
      const base64 = value.includes(',') ? value.split(',')[1] : value
      if (!base64) {
        reject(new Error('Unable to encode file to base64'))
        return
      }
      resolve(base64)
    }
    reader.onerror = () => reject(reader.error || new Error('Failed to read file'))
    reader.readAsDataURL(file)
  })
}

async function uploadFile() {
  if (!selectedFile.value)
    return

  if (!selectedFile.value.name.toLowerCase().endsWith('.out')) {
    result.value = {
      success: false,
      message: 'Please select a .out file',
    }
    return
  }

  uploading.value = true
  result.value = null

  try {
    const dataB64 = await fileToBase64(selectedFile.value)
    let data: any = null
    let lastError: any = null

    for (const gatewayBase of gatewayCandidates) {
      try {
        data = await $fetch<any>(`${gatewayBase}/telecommand/upload`, {
          method: 'POST',
          timeout: 15000,
          retry: 0,
          headers: { 'Content-Type': 'application/json' },
          body: {
            filename: selectedFile.value.name,
            data: dataB64,
            dataPart: [],
          },
        })
        break
      }
      catch (e: any) {
        lastError = e
        const msg = String(e?.message || '').toLowerCase()
        const isNetworkError = e?.name === 'TypeError' || msg.includes('failed to fetch') || msg.includes('network') || msg.includes('timeout')
        if (!isNetworkError)
          throw e
      }
    }

    if (!data)
      throw lastError || new Error('Unable to reach telecommand upload service')

    const stats = data?.stats || {}
    result.value = {
      success: true,
      message: data?.success ? 'Upload successful' : (data?.message || 'Upload completed'),
      filename: data?.filename,
      total: stats?.total,
      inserted: stats?.inserted,
      updated: stats?.updated,
      skipped: stats?.skipped,
      errors: Array.isArray(stats?.errors) ? stats.errors : [],
    }
  }
  catch (e: any) {
    const errMsg = String(e?.message || '').toLowerCase()
    const timedOut = errMsg.includes('timeout')
    result.value = {
      success: false,
      message: timedOut
        ? 'Upload request timed out while waiting for gateway response. Please check gateway service and try again.'
        : (e?.data?.error ?? e?.message ?? 'Upload failed'),
    }
  }
  finally {
    uploading.value = false
  }
}
</script>

<template>
  <div class="content p-4">
    <AppName v-if="!props.embedMode" appname="Upload TC File" />

    <div class="upload-panel" :class="props.embedMode ? 'mt-2' : 'mt-5'">
      <p class="hint">
        Select a <code>tc.out</code> file to seed or refresh the telecommand database.
      </p>

      <div
        class="drop-zone"
        :class="{ 'drop-zone--active': !!selectedFile }"
        @click="($refs.fileInput as HTMLInputElement).click()"
        @dragover.prevent
        @drop.prevent="onFileDrop"
      >
        <input
          id="tc-file-input"
          ref="fileInput"
          type="file"
          accept=".out,.txt"
          class="hidden-input"
          @change="onFileSelect"
        >
        <i class="pi pi-file-import drop-icon" />
        <template v-if="selectedFile">
          <span class="filename">{{ selectedFile.name }}</span>
          <span class="filesize">({{ (selectedFile.size / 1024).toFixed(1) }} KB)</span>
        </template>
        <span v-else class="hint-drop">Click or drag a tc.out file here...</span>
      </div>

      <div class="action-row mt-4">
        <Button
          label="Upload"
          icon="pi pi-upload"
          :loading="uploading"
          :disabled="!selectedFile"
          @click="uploadFile"
        />
        <Button
          v-if="selectedFile"
          label="Clear"
          icon="pi pi-times"
          severity="secondary"
          outlined
          @click="clearFile"
        />
      </div>

      <div v-if="result" class="result-block mt-5">
        <Message :severity="result.success ? 'success' : 'error'">
          {{ result.message }}
        </Message>

        <div v-if="result.success" class="stats mt-3">
          <Tag v-if="result.total != null" :value="`Total: ${result.total}`" severity="contrast" />
          <Tag v-if="result.inserted != null" :value="`Inserted: ${result.inserted}`" severity="success" />
          <Tag v-if="result.updated != null" :value="`Updated: ${result.updated}`" severity="info" />
          <Tag v-if="result.skipped != null" :value="`Skipped: ${result.skipped}`" severity="warning" />
        </div>

        <div v-if="result.errors && result.errors.length > 0" class="mt-3">
          <p class="font-semibold mb-2">
            Upload warnings/errors:
          </p>
          <ul class="error-list">
            <li v-for="(err, idx) in result.errors" :key="idx">
              {{ err }}
            </li>
          </ul>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.upload-panel { max-width: 680px; }
.hint { color: var(--text-color-secondary); margin-bottom: 1.25rem; }
.drop-zone {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  border: 2px dashed var(--surface-border);
  border-radius: 10px;
  padding: 2.5rem 1.5rem;
  cursor: pointer;
  transition: border-color 0.2s, background 0.2s;
  &:hover, &--active {
    border-color: var(--primary-color);
    background: var(--primary-50, rgba(var(--primary-color-rgb), 0.04));
  }
  .drop-icon { font-size: 2.5rem; color: var(--primary-color); }
  .filename { font-weight: 600; font-size: 1rem; }
  .filesize { color: var(--text-color-secondary); font-size: 0.85rem; }
  .hint-drop { color: var(--text-color-secondary); }
}
.hidden-input { display: none; }
.action-row { display: flex; gap: 0.75rem; }
.stats { display: flex; gap: 0.5rem; flex-wrap: wrap; }
.error-list {
  margin: 0;
  padding-left: 1rem;
  color: var(--red-500);
}
</style>
