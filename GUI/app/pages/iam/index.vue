<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useIamApi } from '@/composables/iam/api'
import { useIamAuth } from '@/composables/iam/auth'
import { initMenu } from '@/composables/iam/SideNav'

definePageMeta({
  title: 'IAM - Overview',
})

initMenu(0)
const router = useRouter()
const iamApi = useIamApi()
const iamAuth = useIamAuth()

interface UserRecord {
  id: string
  username?: string
  email?: string
  full_name?: string
  last_login?: string
}

interface RoleRecord {
  id: string
  permissions?: string[]
}

const stats = ref({
  users: 0,
  roles: 0,
  permissions: 0,
  recentAudit: 0,
})

const loading = ref(false)
const loadError = ref('')
const refreshing = ref(false)

const changePasswordVisible = ref(false)
const passwordForm = ref({
  oldPassword: '',
  newPassword: '',
  confirmPassword: '',
})
const passwordSaving = ref(false)
const passwordError = ref('')
const passwordSuccess = ref('')

const isSuperAdmin = computed(() => {
  const list: string[] = iamAuth.user.value?.roles ?? []
  return list.includes('super_admin')
})

const lastLoginDisplay = computed(() => {
  const ts = iamAuth.user.value?.last_login
  if (!ts) return '—'
  const d = new Date(ts)
  return Number.isNaN(d.getTime()) ? ts : d.toLocaleString()
})

async function loadStats() {
  loadError.value = ''
  loading.value = true
  try {
    const [users, roles] = await Promise.all([
      iamApi.request<UserRecord[]>('/users').catch(() => []),
      iamApi.request<RoleRecord[]>('/roles').catch(() => []),
    ])

    const permissionsSet = new Set<string>()
    for (const role of roles || []) {
      for (const permission of role.permissions || []) {
        permissionsSet.add(permission)
      }
    }

    const now = Date.now()
    const last24Hours = 24 * 60 * 60 * 1000
    const recentSignIns = (users || []).filter((u) => {
      if (!u.last_login)
        return false
      const ts = new Date(u.last_login).getTime()
      return !Number.isNaN(ts) && now - ts <= last24Hours
    }).length

    stats.value = {
      users: users.length,
      roles: roles.length,
      permissions: permissionsSet.size,
      recentAudit: recentSignIns,
    }
  }
  catch (err: any) {
    const status = Number(err?.statusCode ?? err?.status ?? 0)
    if (status === 401 || status === 403) {
      iamAuth.clearSession()
      router.replace('/iam/login')
      return
    }
    loadError.value = iamApi.readErrorMessage(err, 'Failed to load IAM data')
  }
  finally {
    loading.value = false
  }
}

async function refreshProfile() {
  refreshing.value = true
  try {
    await iamAuth.fetchMe()
  }
  catch (err: any) {
    // Don't show this as a hard error — overview still works without it.
    console.warn('fetchMe failed', err)
  }
  finally {
    refreshing.value = false
  }
}

function openChangePassword() {
  passwordError.value = ''
  passwordSuccess.value = ''
  passwordForm.value = { oldPassword: '', newPassword: '', confirmPassword: '' }
  changePasswordVisible.value = true
}

async function submitChangePassword() {
  passwordError.value = ''
  passwordSuccess.value = ''
  const f = passwordForm.value
  if (!f.oldPassword || !f.newPassword) {
    passwordError.value = 'Old and new passwords are required.'
    return
  }
  if (f.newPassword.length < 8) {
    passwordError.value = 'New password must be at least 8 characters.'
    return
  }
  if (f.newPassword !== f.confirmPassword) {
    passwordError.value = 'New password and confirmation do not match.'
    return
  }
  passwordSaving.value = true
  try {
    await iamAuth.changePassword(f.oldPassword, f.newPassword)
    passwordSuccess.value = 'Password changed. You will be signed out shortly.'
    passwordForm.value = { oldPassword: '', newPassword: '', confirmPassword: '' }
    // Force re-login so the new credentials take effect on all sessions.
    setTimeout(async () => {
      await iamAuth.logout()
      router.replace('/iam/login')
    }, 1500)
  }
  catch (err: any) {
    passwordError.value = iamAuth.readErrorMessage(err, 'Failed to change password')
  }
  finally {
    passwordSaving.value = false
  }
}

async function doLogout() {
  await iamAuth.logout()
  router.replace('/iam/login')
}

onMounted(async () => {
  if (!iamAuth.isLoggedIn.value) {
    router.replace('/iam/login')
    return
  }
  await Promise.all([loadStats(), refreshProfile()])
})
</script>

<template>
  <div class="content iam-page">
    <AppName appname="Identity &amp; Access Management" />

    <div class="iam-header">
      <p class="iam-subtitle">
        Manage users, assign roles, control permissions, and review audit trails.
      </p>
      <div class="header-actions">
        <Button label="Refresh" icon="pi pi-refresh" :loading="loading" @click="loadStats" />
        <Button label="Logout" icon="pi pi-sign-out" severity="secondary" @click="doLogout" />
      </div>
    </div>

    <Message v-if="loadError" severity="error" :closable="false" class="mb-3">
      {{ loadError }}
    </Message>

    <!-- ── Account summary ───────────────────────────────────────────── -->
    <Card class="profile-card mb-3">
      <template #title>
        <div class="profile-title">
          <span>Signed in as</span>
          <Button
            v-if="!isSuperAdmin"
            size="small"
            text
            icon="pi pi-key"
            label="Change password"
            @click="openChangePassword"
          />
        </div>
      </template>
      <template #content>
        <div class="profile-grid">
          <div class="profile-row">
            <span class="profile-label">Username</span>
            <span class="profile-value">{{ iamAuth.user.value?.username ?? '—' }}</span>
          </div>
          <div class="profile-row">
            <span class="profile-label">Email</span>
            <span class="profile-value">{{ iamAuth.user.value?.email ?? '—' }}</span>
          </div>
          <div class="profile-row">
            <span class="profile-label">Full name</span>
            <span class="profile-value">{{ iamAuth.user.value?.full_name ?? '—' }}</span>
          </div>
          <div class="profile-row">
            <span class="profile-label">Roles</span>
            <span class="profile-value">
              <Tag
                v-for="role in (iamAuth.user.value?.roles ?? [])"
                :key="role"
                :value="role"
                :severity="role === 'super_admin' ? 'danger' : role === 'admin' ? 'primary' : 'secondary'"
                class="role-chip"
              />
            </span>
          </div>
          <div class="profile-row">
            <span class="profile-label">Last sign-in</span>
            <span class="profile-value">{{ lastLoginDisplay }}</span>
          </div>
        </div>
        <Message
          v-if="isSuperAdmin"
          severity="warn"
          :closable="false"
          class="mt-3"
        >
          You are signed in as <strong>super_admin</strong>. The change-password
          self-service form is disabled for this account — use the Users page
          to reset another admin's password, or rotate the secret out-of-band.
        </Message>
      </template>
    </Card>

    <div class="iam-grid">
      <Card>
        <template #title>
          Total Users
        </template>
        <template #content>
          <div class="iam-stat">
            {{ stats.users }}
          </div>
        </template>
      </Card>

      <Card>
        <template #title>
          Total Roles
        </template>
        <template #content>
          <div class="iam-stat">
            {{ stats.roles }}
          </div>
        </template>
      </Card>

      <Card>
        <template #title>
          Total Permissions
        </template>
        <template #content>
          <div class="iam-stat">
            {{ stats.permissions }}
          </div>
        </template>
      </Card>

      <Card>
        <template #title>
          Recent Sign-ins (24h)
        </template>
        <template #content>
          <div class="iam-stat">
            {{ stats.recentAudit }}
          </div>
        </template>
      </Card>
    </div>

    <Card class="iam-quick-actions">
      <template #title>
        Quick Actions
      </template>
      <template #content>
        <div class="action-row">
          <NuxtLink to="/iam/users">
            <Button label="Manage Users" icon="pi pi-users" />
          </NuxtLink>
          <NuxtLink to="/iam/roles">
            <Button label="Manage Roles" icon="pi pi-id-card" severity="secondary" />
          </NuxtLink>
          <NuxtLink to="/iam/permissions">
            <Button label="Manage Permissions" icon="pi pi-lock" severity="contrast" />
          </NuxtLink>
          <NuxtLink to="/iam/audit">
            <Button label="View Audit Logs" icon="pi pi-history" severity="help" />
          </NuxtLink>
        </div>
      </template>
    </Card>

    <Dialog
      v-model:visible="changePasswordVisible"
      modal
      header="Change Password"
      :style="{ width: '28rem' }"
    >
      <div class="form-grid">
        <label class="field">
          <span>Current password</span>
          <Password
            v-model="passwordForm.oldPassword"
            :feedback="false"
            toggle-mask
            autocomplete="current-password"
          />
        </label>
        <label class="field">
          <span>New password (≥ 8 characters)</span>
          <Password
            v-model="passwordForm.newPassword"
            :feedback="false"
            toggle-mask
            autocomplete="new-password"
          />
        </label>
        <label class="field">
          <span>Confirm new password</span>
          <Password
            v-model="passwordForm.confirmPassword"
            :feedback="false"
            toggle-mask
            autocomplete="new-password"
          />
        </label>
        <Message v-if="passwordError" severity="error" :closable="false" class="mt-1">
          {{ passwordError }}
        </Message>
        <Message v-if="passwordSuccess" severity="success" :closable="false" class="mt-1">
          {{ passwordSuccess }}
        </Message>
      </div>
      <template #footer>
        <Button label="Cancel" text :disabled="passwordSaving" @click="changePasswordVisible = false" />
        <Button
          label="Update Password"
          icon="pi pi-check"
          :loading="passwordSaving"
          @click="submitChangePassword"
        />
      </template>
    </Dialog>
  </div>
</template>

<style scoped>
.iam-page {
  padding: 1rem;
}

.iam-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 1rem;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.iam-subtitle {
  margin: 0;
  color: var(--p-text-muted-color);
}

.iam-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 1rem;
}

.iam-stat {
  font-size: 2rem;
  font-weight: 700;
  line-height: 1;
}

.iam-quick-actions {
  margin-top: 1rem;
}

.action-row {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
}

.mb-3 {
  margin-bottom: 0.75rem;
}

.mt-1 {
  margin-top: 0.5rem;
}

.mt-3 {
  margin-top: 0.75rem;
}

.profile-card {
  /* keeps profile section from feeling cramped on narrow viewports */
}

.profile-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
}

.profile-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 0.75rem 1.5rem;
}

.profile-row {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}

.profile-label {
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--p-text-muted-color);
}

.profile-value {
  font-weight: 500;
}

.role-chip {
  margin-right: 0.3rem;
  margin-bottom: 0.2rem;
}

.form-grid {
  display: grid;
  gap: 0.9rem;
}

.field {
  display: grid;
  gap: 0.35rem;
}
</style>
