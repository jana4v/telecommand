export default defineNuxtPlugin(() => {
  const original = globalThis.$fetch

  // The app's own API origins: same-origin in prod (relative apiBase → page
  // origin) and the absolute dev-mode host (e.g. http://127.0.0.1:21000) in
  // dev, where the API isn't served from the Nuxt dev-server's own port.
  // Built once from the values nuxt.config.ts already exposes — no new
  // source of truth, and never includes Keycloak's origin (not in this list).
  const config = useRuntimeConfig().public
  const allowedOrigins = new Set([
    window.location.origin,
    ...[config.apiBase, config.tmApiBase, config.restApiBase, config.simulatorApiBase]
      .map(base => new URL(base as string, window.location.origin).origin),
  ])

  const authenticated = original.create({
    onRequest({ request, options }) {
      const url = typeof request === 'string' ? request : request.url
      // Only attach the token to requests targeting the app's own known API
      // origins — never to genuinely cross-origin URLs (e.g. Keycloak itself).
      const origin = new URL(url, window.location.origin).origin
      if (allowedOrigins.has(origin)) {
        const auth = useAuth()
        const token = auth.accessToken.value
        if (token) {
          options.headers = new Headers(options.headers)
          options.headers.set('Authorization', `Bearer ${token}`)
        }
      }
    },
  })

  globalThis.$fetch = authenticated as typeof globalThis.$fetch
})
