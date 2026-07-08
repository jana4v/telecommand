export default defineNuxtRouteMiddleware(async (to) => {
  if (!import.meta.client)
    return
  if (to.path === '/auth/callback')
    return

  const auth = useAuth()
  await auth.loadUser()

  if (!auth.isAuthenticated.value) {
    await auth.login(to.fullPath)
    // signinRedirect navigates away; abort this navigation.
    return abortNavigation()
  }
})
