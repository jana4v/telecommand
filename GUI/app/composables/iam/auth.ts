import { computed } from 'vue'

export interface IamUser {
  id: string
  username: string
  full_name?: string
  email?: string
  roles?: string[]
  is_active?: boolean
  last_login?: string | null
}

interface LoginResponse {
  access_token: string
  refresh_token: string
  expires_in: number
  token_type: string
  user: IamUser
}

interface RefreshResponse {
  access_token: string
  expires_in: number
  token_type: string
}

interface StoredSession {
  accessToken: string
  refreshToken: string
  expiresAt: number
  user: IamUser | null
}

const STORAGE_KEY = 'iam_auth_v1'

function readStorage(): StoredSession | null {
  if (!import.meta.client)
    return null
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw)
      return null
    const parsed = JSON.parse(raw) as StoredSession
    if (!parsed?.accessToken || !parsed?.refreshToken || !parsed?.expiresAt)
      return null
    return parsed
  }
  catch {
    return null
  }
}

function writeStorage(session: StoredSession | null) {
  if (!import.meta.client)
    return
  if (!session) {
    window.localStorage.removeItem(STORAGE_KEY)
    return
  }
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(session))
}

function baseUrl(): string {
  const cfg = useRuntimeConfig()
  const base = (cfg.public.iamBase as string | undefined) ?? '/iam'
  return base.replace(/\/+$/, '')
}

function joinUrl(path: string): string {
  const cleanPath = path.startsWith('/') ? path : `/${path}`
  return `${baseUrl()}${cleanPath}`
}

/**
 * Read the human-readable message out of an H3 / $fetch error.
 * Shared with the api composable so auth-specific errors look the same.
 */
function readErrorMessage(err: any, fallback = 'Request failed'): string {
  const data = err?.data ?? err?.response?._data
  if (data) {
    if (typeof data.detail === 'string') return data.detail
    if (Array.isArray(data.detail) && data.detail[0]?.msg) return data.detail[0].msg
    if (typeof data.error === 'string') return data.error
    if (typeof data.message === 'string') return data.message
  }
  if (typeof err?.statusMessage === 'string') return err.statusMessage
  if (typeof err?.message === 'string') return err.message
  if (typeof err === 'string') return err
  return fallback
}

export function useIamAuth() {
  const session = useState<StoredSession | null>('iam-auth-session', () => readStorage())

  const isLoggedIn = computed(() => Boolean(session.value?.accessToken))
  const user = computed(() => session.value?.user ?? null)
  const accessToken = computed(() => session.value?.accessToken ?? '')

  function setSession(next: StoredSession | null) {
    session.value = next
    writeStorage(next)
  }

  function clearSession() {
    setSession(null)
  }

  function tokenExpiringSoon() {
    if (!session.value?.expiresAt)
      return true
    return Date.now() + 20_000 >= session.value.expiresAt
  }

  async function login(username: string, password: string) {
    const resp = await $fetch<LoginResponse>(joinUrl('/auth/login'), {
      method: 'POST',
      body: { username, password },
    })

    setSession({
      accessToken: resp.access_token,
      refreshToken: resp.refresh_token,
      expiresAt: Date.now() + Math.max(5, resp.expires_in) * 1000,
      user: resp.user ?? null,
    })

    return resp.user
  }

  async function refreshIfNeeded(force = false) {
    if (!session.value?.refreshToken)
      return false
    if (!force && !tokenExpiringSoon())
      return true

    const resp = await $fetch<RefreshResponse>(joinUrl('/auth/refresh'), {
      method: 'POST',
      body: { refresh_token: session.value.refreshToken },
    })

    setSession({
      accessToken: resp.access_token,
      refreshToken: session.value.refreshToken,
      expiresAt: Date.now() + Math.max(5, resp.expires_in) * 1000,
      user: session.value.user,
    })

    return true
  }

  async function logout() {
    const refreshToken = session.value?.refreshToken
    const token = session.value?.accessToken

    if (refreshToken && token) {
      try {
        await $fetch(joinUrl('/auth/logout'), {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: { refresh_token: refreshToken },
        })
      }
      catch {
        // Ignore logout transport errors and clear local session anyway.
      }
    }

    clearSession()
  }

  async function changePassword(oldPassword: string, newPassword: string) {
    const token = session.value?.accessToken
    if (!token)
      throw new Error('Authentication required')
    await $fetch(joinUrl('/auth/change-password'), {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: { old_password: oldPassword, new_password: newPassword },
    })
  }

  async function fetchMe(): Promise<IamUser> {
    const token = session.value?.accessToken
    if (!token)
      throw new Error('Authentication required')
    const me = await $fetch<IamUser>(joinUrl('/auth/me'), {
      headers: { Authorization: `Bearer ${token}` },
    })
    // Refresh cached user details.
    setSession({
      accessToken: token,
      refreshToken: session.value?.refreshToken ?? '',
      expiresAt: session.value?.expiresAt ?? Date.now() + 60_000,
      user: me,
    })
    return me
  }

  return {
    session,
    user,
    accessToken,
    isLoggedIn,
    login,
    logout,
    clearSession,
    refreshIfNeeded,
    changePassword,
    fetchMe,
    readErrorMessage,
  }
}
