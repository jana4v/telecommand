import type { User } from 'oidc-client-ts'
import { UserManager, WebStorageStateStore } from 'oidc-client-ts'

export default defineNuxtPlugin(() => {
  const cfg = useRuntimeConfig()

  const userManager = new UserManager({
    authority: `${cfg.public.keycloakUrl}/realms/${cfg.public.keycloakRealm}`,
    client_id: cfg.public.keycloakClientId as string,
    redirect_uri: `${window.location.origin}/auth/callback`,
    post_logout_redirect_uri: window.location.origin,
    response_type: 'code',
    scope: 'openid profile email',
    userStore: new WebStorageStateStore({ store: window.sessionStorage }),
    automaticSilentRenew: true,
  })

  // Keep the reactive `user` state (read by useAuth().accessToken) in sync
  // with oidc-client-ts's internal store. addUserLoaded fires on initial
  // getUser(), on signinRedirectCallback(), and on successful silent renewal
  // -- wiring it here covers all three without a second source of truth.
  // Uses the same useState key as useAuth.ts directly (not useAuth() itself)
  // because $userManager isn't provided yet at this point in plugin init.
  const user = useState<User | null>('auth-user', () => null)
  userManager.events.addUserLoaded((loadedUser) => {
    user.value = loadedUser
  })
  userManager.events.addSilentRenewError((err) => {
    console.error('[Keycloak] Silent renew failed:', err)
  })

  return {
    provide: {
      userManager,
    },
  }
})
