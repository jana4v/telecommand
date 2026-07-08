<script setup lang="ts">
import { initMenu } from '@/composables/tm/SideNav'

definePageMeta({ title: 'Telemetry - Delete TM Data' })
initMenu(7)

const { apiBase: gatewayBase } = useRuntimeConfig().public

const subsystems = ref<string[]>([])
const selected = ref<string[]>([])
const loading = ref(false)
const deleting = ref(false)

// two-step confirm state
const step = ref<'idle' | 'confirm1' | 'confirm2'>('idle')
const deleteResult = ref<{ deleted: number, subsystems: string[] } | null>(null)
const errorMsg = ref<string | null>(null)

async function loadSubsystems() {
  loading.value = true
  try {
    const data = await $fetch<{ subsystems: string[] }>(`${gatewayBase}/get/tm/subsystems`)
    subsystems.value = data?.subsystems ?? []
  }
  catch {
    subsystems.value = []
  }
  finally {
    loading.value = false
  }
}

function requestDelete() {
  errorMsg.value = null
  deleteResult.value = null
  step.value = 'confirm1'
}

function cancelDelete() {
  step.value = 'idle'
}

function proceedToFinal() {
  step.value = 'confirm2'
}

async function executeDelete() {
  deleting.value = true
  errorMsg.value = null
  try {
    const result = await $fetch<{ success: boolean, deleted: number, subsystems: string[] }>(
      `${gatewayBase}/delete/tm/subsystems`,
      { method: 'DELETE', body: selected.value },
    )
    deleteResult.value = { deleted: result.deleted, subsystems: result.subsystems }
    selected.value = []
    step.value = 'idle'
    await loadSubsystems()
  }
  catch (e: any) {
    errorMsg.value = e?.data?.error ?? 'Delete failed'
    step.value = 'idle'
  }
  finally {
    deleting.value = false
  }
}

onMounted(loadSubsystems)
</script>

<template>
  <div class="delete-page">
    <div class="page-header">
      <h2>Delete TM Mnemonics</h2>
      <p class="subtitle">
        Permanently remove all mnemonics for the selected subsystems from the database.
      </p>
    </div>

    <!-- Subsystem selector -->
    <div class="card-panel">
      <label class="field-label">Select Subsystems</label>
      <MultiSelect
        v-model="selected"
        :options="subsystems"
        :loading="loading"
        placeholder="Select one or more subsystems…"
        filter
        :max-selected-labels="5"
        class="w-full"
        display="chip"
      />
      <p class="hint">
        {{ subsystems.length }} subsystem(s) available in database
      </p>
    </div>

    <!-- Step 1: initial delete request -->
    <div v-if="step === 'idle'" class="actions">
      <Button
        label="Delete Selected"
        icon="pi pi-trash"
        severity="danger"
        :disabled="selected.length === 0"
        @click="requestDelete"
      />
    </div>

    <!-- Step 2: first confirmation -->
    <div v-else-if="step === 'confirm1'" class="confirm-panel confirm-panel--warn">
      <div class="confirm-header">
        <i class="pi pi-exclamation-triangle" />
        <span>First Confirmation</span>
      </div>
      <p>
        You are about to <strong>permanently delete all mnemonics</strong> for
        <strong>{{ selected.length }}</strong> subsystem(s):
      </p>
      <div class="chip-list">
        <Tag v-for="s in selected" :key="s" :value="s" severity="warning" />
      </div>
      <p class="warn-note">
        This cannot be undone. Re-upload the TM file to restore the data.
      </p>
      <div class="confirm-actions">
        <Button label="Cancel" icon="pi pi-times" severity="secondary" @click="cancelDelete" />
        <Button label="Yes, continue" icon="pi pi-arrow-right" severity="danger" @click="proceedToFinal" />
      </div>
    </div>

    <!-- Step 3: final confirmation -->
    <div v-else-if="step === 'confirm2'" class="confirm-panel confirm-panel--danger">
      <div class="confirm-header">
        <i class="pi pi-exclamation-circle" />
        <span>Final Confirmation — Irreversible Action</span>
      </div>
      <p>
        Click <strong>Confirm Delete</strong> to permanently erase all mnemonics for
        <strong>{{ selected.join(', ') }}</strong>.
      </p>
      <div class="confirm-actions">
        <Button label="Cancel" icon="pi pi-times" severity="secondary" @click="cancelDelete" />
        <Button
          label="Confirm Delete"
          icon="pi pi-trash"
          severity="danger"
          :loading="deleting"
          @click="executeDelete"
        />
      </div>
    </div>

    <!-- Success result -->
    <div v-if="deleteResult" class="result-panel result-panel--success">
      <i class="pi pi-check-circle" />
      <span>
        Deleted <strong>{{ deleteResult.deleted }}</strong> mnemonic(s) from
        subsystem(s): {{ deleteResult.subsystems.join(', ') }}
      </span>
    </div>

    <!-- Error -->
    <div v-if="errorMsg" class="result-panel result-panel--error">
      <i class="pi pi-times-circle" />
      <span>{{ errorMsg }}</span>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.delete-page {
  padding: 2rem;
  max-width: 720px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.page-header {
  h2 {
    font-size: 1.5rem;
    font-weight: 700;
    color: var(--p-text-color);
    margin: 0 0 0.25rem;
  }
  .subtitle {
    color: var(--p-text-secondary-color);
    font-size: 0.9rem;
    margin: 0;
  }
}

.card-panel {
  background: var(--p-content-background);
  border: 1px solid var(--p-surface-border);
  border-radius: 12px;
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.field-label {
  font-weight: 600;
  color: var(--p-text-color);
}

.hint {
  font-size: 0.8rem;
  color: var(--p-text-secondary-color);
  margin: 0;
}

.actions {
  display: flex;
  justify-content: flex-start;
}

.confirm-panel {
  border-radius: 12px;
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;

  &--warn {
    background: color-mix(in srgb, var(--p-yellow-500), transparent 90%);
    border: 1px solid var(--p-yellow-400);
  }

  &--danger {
    background: color-mix(in srgb, var(--p-red-500), transparent 88%);
    border: 2px solid var(--p-red-400);
  }
}

.confirm-header {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  font-weight: 700;
  font-size: 1rem;

  i {
    font-size: 1.25rem;
    color: var(--p-yellow-500);
  }

  .confirm-panel--danger & i {
    color: var(--p-red-400);
  }
}

.chip-list {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
}

.warn-note {
  font-size: 0.85rem;
  color: var(--p-text-secondary-color);
  margin: 0;
}

.confirm-actions {
  display: flex;
  gap: 0.75rem;
  justify-content: flex-end;
}

.result-panel {
  border-radius: 10px;
  padding: 1rem 1.25rem;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  font-size: 0.95rem;

  i {
    font-size: 1.25rem;
    flex-shrink: 0;
  }

  &--success {
    background: color-mix(in srgb, var(--p-green-500), transparent 88%);
    border: 1px solid var(--p-green-400);
    color: var(--p-green-300);
  }

  &--error {
    background: color-mix(in srgb, var(--p-red-500), transparent 88%);
    border: 1px solid var(--p-red-400);
    color: var(--p-red-300);
  }
}
</style>
