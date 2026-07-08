export default defineNuxtPlugin(() => {
  const original = globalThis.$fetch

  const authenticated = original.create({
    onRequest({ request, options }) {
      const url = typeof request === 'string' ? request : request.url
      // Only attach the token to same-origin, relative API paths — never to
      // absolute cross-origin URLs (e.g. Keycloak itself).
      if (url.startsWith('/')) {
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
