import { useIamAuth } from './auth'

/**
 * Resolve the IAM API base URL.
 *
 * In dev the Vite proxy forwards ``${iamBase}/*`` to the FastAPI backend, so
 * the GUI can call it as a same-origin request. In prod the same prefix is
 * routed by the reverse proxy (nginx) to FastAPI.
 *
 * Override via the ``NUXT_PUBLIC_IAM_BASE`` env var if you front the FastAPI
 * service on a different origin (e.g. ``https://api.example.com/iam``).
 */
function baseUrl(): string {
  const cfg = useRuntimeConfig()
  const base = (cfg.public.iamBase as string | undefined) ?? '/iam'
  return base.replace(/\/+$/, '') // strip trailing slash
}

function joinUrl(path: string): string {
  const cleanPath = path.startsWith('/') ? path : `/${path}`
  return `${baseUrl()}${cleanPath}`
}

/**
 * Read the human-readable message out of an H3 / $fetch error.
 *
 * FastAPI conventionally returns ``{"detail": "..."}``; older Go services
 * returned ``{"error": "..."}``; a few endpoints used ``{"message": "..."}``.
 * This helper tries each shape so the GUI surfaces a useful message
 * regardless of which backend answered.
 */
export function readErrorMessage(err: any, fallback = 'Request failed'): string {
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

export function useIamApi() {
  const auth = useIamAuth()

  async function withFallback<T>(path: string, options: any): Promise<T> {
    const url = joinUrl(path)
    try {
      return (await $fetch(url, options)) as T
    }
    catch (err) {
      throw err
    }
  }

  async function request<T>(path: string, options: any = {}): Promise<T> {
    await auth.refreshIfNeeded()

    const token = auth.accessToken.value
    if (!token) {
      throw new Error('Authentication required')
    }

    const headers = {
      ...(options.headers || {}),
      Authorization: `Bearer ${token}`,
    }

    try {
      return await withFallback<T>(path, { ...options, headers })
    }
    catch (err: any) {
      const status = Number(err?.statusCode ?? err?.status ?? 0)
      if (status !== 401)
        throw err

      // Token may be expired despite local timer; force refresh and retry once.
      await auth.refreshIfNeeded(true)
      const retriedToken = auth.accessToken.value
      if (!retriedToken)
        throw err

      return await withFallback<T>(path, {
        ...options,
        headers: {
          ...(options.headers || {}),
          Authorization: `Bearer ${retriedToken}`,
        },
      })
    }
  }

  return { request, baseUrl: baseUrl(), readErrorMessage }
}
