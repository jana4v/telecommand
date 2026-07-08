<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useIamApi } from '@/composables/iam/api'
import { useIamAuth } from '@/composables/iam/auth'
import { initMenu } from '@/composables/iam/SideNav'

definePageMeta({
  title: 'IAM - Roles',
})

initMenu(2)
const router = useRouter()
const iamApi = useIamApi()
const iamAuth = useIamAuth()

interface RoleRecord {
  id: string
  name: string
  description: string
  permissions: string[]
  permissionsCount: number
}

const roles = ref<RoleRecord[]>([])
const loading = ref(false)
const saving = ref(false)
const loadError = ref('')
const actionMessage = ref('')

const createDialogVisible = ref(false)
const editDialogVisible = ref(false)
const createForm = ref({
  name: '',
  description: '',
  permissions: [] as string[],
})
const editForm = ref({
  id: '',
  name: '',
  description: '',
  permissions: [] as string[],
})

const isSuperAdmin = computed(() => {
  const list: string[] = iamAuth.user.value?.roles ?? []
  return list.includes('super_admin')
})

// Built-in roles cannot be edited/deleted (matches the backend guard).
const BUILTIN_ROLES = new Set(['super_admin', 'admin'])

function isBuiltin(name: string) {
  return BUILTIN_ROLES.has(name)
}

async function loadRoles() {
  loadError.value = ''
  loading.value = true
  try {
    const data = await iamApi.request<any[]>('/roles').catch(() => [])
    roles.value = (data || []).map((r: any) => ({
      id: String(r.id ?? ''),
      name: String(r.name ?? ''),
      description: String(r.description ?? ''),
      permissions: Array.isArray(r.permissions) ? r.permissions.map(String) : [],
      permissionsCount: Array.isArray(r.permissions) ? r.permissions.length : 0,
    }))
  }
  catch (err: any) {
    const status = Number(err?.statusCode ?? err?.status ?? 0)
    if (status === 401 || status === 403) {
      iamAuth.clearSession()
      router.replace('/iam/login')
      return
    }
    loadError.value = iamApi.readErrorMessage(err, 'Failed to load roles')
  }
  finally {
    loading.value = false
  }
}

function resetCreateForm() {
  createForm.value = { name: '', description: '', permissions: [] }
}

function openCreateDialog() {
  actionMessage.value = ''
  resetCreateForm()
  createDialogVisible.value = true
}

function openEditDialog(role: RoleRecord) {
  actionMessage.value = ''
  editForm.value = {
    id: role.id,
    name: role.name,
    description: role.description,
    permissions: [...role.permissions],
  }
  editDialogVisible.value = true
}

async function createRole() {
  const name = createForm.value.name.trim()
  if (!name) {
    actionMessage.value = 'Role name is required.'
    return
  }
  saving.value = true
  loadError.value = ''
  actionMessage.value = ''
  try {
    await iamApi.request('/roles', {
      method: 'POST',
      body: {
        name,
        description: createForm.value.description.trim(),
        permissions: createForm.value.permissions,
      },
    })
    createDialogVisible.value = false
    actionMessage.value = `Role "${name}" created.`
    await loadRoles()
  }
  catch (err: any) {
    const status = Number(err?.statusCode ?? err?.status ?? 0)
    if (status === 401 || status === 403) {
      iamAuth.clearSession()
      router.replace('/iam/login')
      return
    }
    loadError.value = iamApi.readErrorMessage(err, 'Failed to create role')
  }
  finally {
    saving.value = false
  }
}

async function updateRole() {
  if (!editForm.value.id) return
  saving.value = true
  loadError.value = ''
  actionMessage.value = ''
  try {
    await iamApi.request(`/roles/${editForm.value.id}`, {
      method: 'PUT',
      body: {
        description: editForm.value.description.trim(),
        permissions: editForm.value.permissions,
      },
    })
    editDialogVisible.value = false
    actionMessage.value = `Role "${editForm.value.name}" updated.`
    await loadRoles()
  }
  catch (err: any) {
    const status = Number(err?.statusCode ?? err?.status ?? 0)
    if (status === 401 || status === 403) {
      iamAuth.clearSession()
      router.replace('/iam/login')
      return
    }
    loadError.value = iamApi.readErrorMessage(err, 'Failed to update role')
  }
  finally {
    saving.value = false
  }
}

async function removeRole(role: RoleRecord) {
  if (isBuiltin(role.name)) return
  if (!window.confirm(`Delete role "${role.name}"? Users with only this role will lose its permissions.`))
    return
  saving.value = true
  loadError.value = ''
  actionMessage.value = ''
  try {
    await iamApi.request(`/roles/${role.id}`, { method: 'DELETE' })
    actionMessage.value = `Role "${role.name}" deleted.`
    await loadRoles()
  }
  catch (err: any) {
    const status = Number(err?.statusCode ?? err?.status ?? 0)
    if (status === 401 || status === 403) {
      iamAuth.clearSession()
      router.replace('/iam/login')
      return
    }
    loadError.value = iamApi.readErrorMessage(err, 'Failed to delete role')
  }
  finally {
    saving.value = false
  }
}

onMounted(async () => {
  if (!iamAuth.isLoggedIn.value) {
    router.replace('/iam/login')
    return
  }
  await loadRoles()
})
</script>

<template>
  <div class="content iam-page">
    <AppName appname="IAM - Roles" />

    <div class="toolbar">
      <Button
        v-if="isSuperAdmin"
        label="Add Role"
        icon="pi pi-id-card"
        :disabled="loading"
        @click="openCreateDialog"
      />
      <Button label="Refresh" icon="pi pi-refresh" :loading="loading" @click="loadRoles" />
    </div>

    <Message v-if="loadError" severity="error" :closable="false" class="mb-3">
      {{ loadError }}
    </Message>
    <Message v-if="actionMessage" severity="success" :closable="false" class="mb-3">
      {{ actionMessage }}
    </Message>

    <DataTable :value="roles" striped-rows paginator :rows="10" size="small" :loading="loading">
      <Column field="name" header="Role" sortable>
        <template #body="slotProps">
          <span class="role-name">
            {{ slotProps.data.name }}
            <Tag
              v-if="isBuiltin(slotProps.data.name)"
              :value="isBuiltin(slotProps.data.name) ? 'built-in' : ''"
              severity="info"
              class="ml-2"
            />
          </span>
        </template>
      </Column>
      <Column field="description" header="Description" />
      <Column field="permissionsCount" header="Permissions" sortable />
      <Column v-if="isSuperAdmin" header="Actions" style="width: 9rem">
        <template #body="slotProps">
          <div class="row-actions">
            <Button
              size="small"
              text
              icon="pi pi-pencil"
              :disabled="isBuiltin(slotProps.data.name)"
              @click="openEditDialog(slotProps.data)"
            />
            <Button
              size="small"
              text
              severity="danger"
              icon="pi pi-trash"
              :disabled="isBuiltin(slotProps.data.name) || saving"
              @click="removeRole(slotProps.data)"
            />
          </div>
        </template>
      </Column>
    </DataTable>

    <Dialog v-model:visible="createDialogVisible" modal header="Add Role" :style="{ width: '32rem' }">
      <div class="form-grid">
        <label class="field">
          <span>Role Name</span>
          <InputText v-model="createForm.name" placeholder="e.g. analyst" />
        </label>
        <label class="field">
          <span>Description</span>
          <InputText v-model="createForm.description" />
        </label>
        <p class="hint">
          New roles start with no permissions. Grant endpoint access from the
          <NuxtLink to="/iam/permissions">Permissions</NuxtLink> page after creation.
        </p>
      </div>
      <template #footer>
        <Button label="Cancel" text @click="createDialogVisible = false" />
        <Button label="Create" icon="pi pi-check" :loading="saving" @click="createRole" />
      </template>
    </Dialog>

    <Dialog v-model:visible="editDialogVisible" modal header="Edit Role" :style="{ width: '32rem' }">
      <div class="form-grid">
        <label class="field">
          <span>Role Name</span>
          <InputText v-model="editForm.name" disabled />
        </label>
        <label class="field">
          <span>Description</span>
          <InputText v-model="editForm.description" />
        </label>
        <label class="field">
          <span>Permissions (raw list)</span>
          <MultiSelect
            v-model="editForm.permissions"
            :options="[]"
            placeholder="Manage permissions from the Permissions page"
            display="chip"
            disabled
          />
        </label>
        <p class="hint">
          Use the
          <NuxtLink to="/iam/permissions">Permissions</NuxtLink>
          page to toggle individual endpoint permissions for this role.
        </p>
      </div>
      <template #footer>
        <Button label="Cancel" text @click="editDialogVisible = false" />
        <Button label="Save" icon="pi pi-save" :loading="saving" @click="updateRole" />
      </template>
    </Dialog>
  </div>
</template>

<style scoped>
.iam-page {
  padding: 1rem;
}

.toolbar {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
  margin-bottom: 1rem;
}

.mb-3 {
  margin-bottom: 0.75rem;
}

.role-name {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
}

.ml-2 {
  margin-left: 0.5rem;
}

.row-actions {
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.form-grid {
  display: grid;
  gap: 0.9rem;
}

.field {
  display: grid;
  gap: 0.35rem;
}

.hint {
  margin: 0;
  font-size: 0.85rem;
  color: var(--p-text-muted-color);
}
</style>
