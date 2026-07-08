import type { User } from 'oidc-client-ts'

export function useAuth() {
  const { $userManager } = useNuxtApp()
  const userManager = $userManager as import('oidc-client-ts').UserManager

  const user = useState<User | null>('auth-user', () => null)

  const isAuthenticated = computed(() => Boolean(user.value && !user.value.expired))
  const accessToken = computed(() => user.value?.access_token ?? '')

  async function loadUser() {
    if (!import.meta.client)
      return null
    user.value = await userManager.getUser()
    return user.value
  }

  async function login(returnPath?: string) {
    if (!import.meta.client)
      return
    await userManager.signinRedirect({
      state: { returnPath: returnPath ?? window.location.pathname },
    })
  }

  async function handleCallback() {
    const result = await userManager.signinRedirectCallback()
    user.value = await userManager.getUser()
    const state = result.state as { returnPath?: string } | undefined
    return state?.returnPath ?? '/'
  }

  async function logout() {
    await userManager.signoutRedirect()
  }

  return {
    user,
    isAuthenticated,
    accessToken,
    loadUser,
    login,
    handleCallback,
    logout,
  }
}
