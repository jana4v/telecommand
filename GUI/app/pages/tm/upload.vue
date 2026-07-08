<script setup lang="ts">
import { ref } from 'vue'
import { initMenu } from '@/composables/tm/SideNav'

definePageMeta({ title: 'Telemetry - Upload TM' })
initMenu(2)

const { apiBase: gatewayBase } = useRuntimeConfig().public

// ── State ──────────────────────────────────────────────────────────────────
const selectedFile = ref<File | null>(null)
const uploading = ref(false)
const result = ref<{ success: boolean, message: string, inserted?: number, updated?: number } | null>(null)

// ── Handlers ───────────────────────────────────────────────────────────────
function onFileSelect(event: Event) {
  const input = event.target as HTMLInputElement
  selectedFile.value = input.files?.[0] ?? null
  result.value = null
}

function clearFile() {
  selectedFile.value = null
  result.value = null
  // reset the hidden input
  const el = document.getElementById('tm-file-input') as HTMLInputElement | null
  if (el)
    el.value = ''
}

async function uploadFile() {
  if (!selectedFile.value)
    return
  uploading.value = true
  result.value = null

  try {
    const arrayBuffer = await selectedFile.value.arrayBuffer()
    const bytes = new Uint8Array(arrayBuffer)
    let binary = ''
    const CHUNK = 8192
    for (let i = 0; i < bytes.byteLength; i += CHUNK)
      binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK))
    const base64 = btoa(binary)

    const resp = await fetch(`${gatewayBase}/update/tm/fileupload`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ filename: selectedFile.value.name, data: base64 }),
    })
    const data = await resp.json()
    if (!resp.ok)
      throw new Error(data?.error ?? `Server error ${resp.status}`)

    result.value = {
      success: true,
      message: data?.message ?? `Inserted: ${data?.stats?.inserted ?? 0}, Updated: ${data?.stats?.updated ?? 0}`,
      inserted: data?.stats?.inserted,
      updated: data?.stats?.updated,
    }
  }
  catch (e: any) {
    result.value = {
      success: false,
      message: e?.data?.error ?? e?.message ?? 'Upload failed',
    }
  }
  finally {
    uploading.value = false
  }
}
</script>

<template>
  <div class="content p-4">
    <AppName appname="Upload TM File" />

    <div class="upload-panel mt-5">
      <p class="hint">
        Select a <code>.out</code> TM definition file exported from the CDB to
        seed or refresh the telemetry mnemonic database.
      </p>

      <!-- Drop zone / file picker -->
      <div
        class="drop-zone"
        :class="{ 'drop-zone--active': !!selectedFile }"
        @click="($refs.fileInput as HTMLInputElement).click()"
        @dragover.prevent
        @drop.prevent="onFileSelect"
      >
        <input
          id="tm-file-input"
          ref="fileInput"
          type="file"
          accept=".out,.xlsx"
          class="hidden-input"
          @change="onFileSelect"
        >
        <i class="pi pi-file-import drop-icon" />
        <template v-if="selectedFile">
          <span class="filename">{{ selectedFile.name }}</span>
          <span class="filesize">({{ (selectedFile.size / 1024).toFixed(1) }} KB)</span>
        </template>
        <span v-else class="hint-drop">Click or drag a .out file here…</span>
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

      <!-- Result -->
      <div v-if="result" class="result-block mt-5">
        <Message :severity="result.success ? 'success' : 'error'">
          {{ result.message }}
        </Message>
        <div v-if="result.success && (result.inserted != null || result.updated != null)" class="stats mt-3">
          <Tag v-if="result.inserted != null" :value="`Inserted: ${result.inserted}`" severity="success" />
          <Tag v-if="result.updated != null" :value="`Updated: ${result.updated}`" severity="info" />
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.upload-panel { max-width: 620px; }
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
.stats { display: flex; gap: 0.5rem; }
</style>
