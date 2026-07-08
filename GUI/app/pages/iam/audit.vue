<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useIamApi } from '@/composables/iam/api'
import { useIamAuth } from '@/composables/iam/auth'
import { initMenu } from '@/composables/iam/SideNav'

definePageMeta({
  title: 'IAM - Audit Logs',
})

initMenu(4)
const router = useRouter()
const iamApi = useIamApi()
const iamAuth = useIamAuth()

interface AuditRecord {
  id: string
  actor: string
  action: string
  target: string
  createdAt: string
}

const logs = ref<AuditRecord[]>([])
const loading = ref(false)
const loadError = ref('')

function fmtDate(value: string) {
  if (!value)
    return '-'
  const d = new Date(value)
  if (Number.isNaN(d.getTime()))
    return value
  return d.toLocaleString()
}

async function loadLogs() {
  loadError.value = ''
  loading.value = true
  try {
    // The current IAM service exposes user/role APIs only; a real audit log
    // endpoint is on the roadmap. For now, derive a lightweight activity view
    // from the user records (last_login + updated_at).
    const users = await iamApi.request<any[]>('/users').catch(() => [])
    const derived: AuditRecord[] = []

    for (const u of users || []) {
      const actor = String(u.username ?? u.email ?? 'unknown')
      const id = String(u.id ?? actor)

      if (u.last_login) {
        derived.push({
          id: `login-${id}`,
          actor,
          action: 'LOGIN',
          target: 'IAM',
          createdAt: String(u.last_login),
        })
      }

      if (u.updated_at) {
        derived.push({
          id: `update-${id}`,
          actor,
          action: 'PROFILE_UPDATE',
          target: 'IAM',
          createdAt: String(u.updated_at),
        })
      }
    }

    logs.value = derived
      .filter(item => item.createdAt)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  }
  catch (err: any) {
    const status = Number(err?.statusCode ?? err?.status ?? 0)
    if (status === 401 || status === 403) {
      iamAuth.clearSession()
      router.replace('/iam/login')
      return
    }
    loadError.value = iamApi.readErrorMessage(err, 'Failed to load activity')
  }
  finally {
    loading.value = false
  }
}

onMounted(async () => {
  if (!iamAuth.isLoggedIn.value) {
    router.replace('/iam/login')
    return
  }
  await loadLogs()
})
</script>

<template>
  <div class="content iam-page">
    <AppName appname="IAM - Audit Logs" />

    <Message severity="info" :closable="false" class="mb-3">
      A dedicated audit-log endpoint is not yet exposed by the IAM service. Showing derived user activity until then.
    </Message>

    <div class="toolbar">
      <Button label="Refresh" icon="pi pi-refresh" :loading="loading" @click="loadLogs" />
    </div>

    <Message v-if="loadError" severity="error" :closable="false" class="mb-3">
      {{ loadError }}
    </Message>

    <DataTable :value="logs" striped-rows paginator :rows="15" size="small" :loading="loading">
      <Column field="actor" header="Actor" sortable />
      <Column field="action" header="Action" sortable />
      <Column field="target" header="Target" sortable />
      <Column field="createdAt" header="Timestamp" sortable>
        <template #body="slotProps">
          <span>{{ fmtDate(slotProps.data.createdAt) }}</span>
        </template>
      </Column>
    </DataTable>
  </div>
</template>

<style scoped>
.iam-page {
  padding: 1rem;
}

.toolbar {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 1rem;
}
</style>
