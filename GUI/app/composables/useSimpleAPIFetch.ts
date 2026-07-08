// ponytail: no WAMP layer in this app anymore (replaced by NATS) — errors just log,
// unlike the old FastAPI-era version which published them to a WAMP topic.
export async function useSimpleAPIFetch(
  path: string,
  options: Record<string, any> = {},
  errorSummary = 'API Request Failed',
) {
  const { apiBase } = useRuntimeConfig().public
  try {
    return await $fetch(path, { baseURL: apiBase, ...options })
  }
  catch (err: any) {
    console.error(`${errorSummary}:`, err?.data?.error ?? err?.message ?? 'Backend service is not available')
    return null
  }
}
