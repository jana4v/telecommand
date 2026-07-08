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

  return {
    provide: {
      userManager,
    },
  }
})
