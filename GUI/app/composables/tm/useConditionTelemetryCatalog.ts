import type { QueryBuilderMnemonic } from '@/components/tm/queryBuilderTypes'
import { computed, ref } from 'vue'

function toStringArray(value: unknown): string[] {
  if (!Array.isArray(value))
    return []
  return value.map(v => String(v ?? '').trim()).filter(v => v.length > 0)
}

function buildRangeOptions(range: unknown, limits: unknown): string[] {
  const direct = toStringArray(range)
  if (direct.length > 0)
    return direct
  return toStringArray(limits)
}

function parseNullableNumber(value: unknown): number | null {
  if (value === '' || value === null || value === undefined)
    return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

function resolvePid(value: unknown): string {
  if (value === null || value === undefined)
    return ''
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean')
    return String(value)
  if (typeof value === 'object') {
    const doc = value as Record<string, unknown>
    if (typeof doc.$oid === 'string')
      return doc.$oid
    if (typeof doc.oid === 'string')
      return doc.oid
    if (typeof doc.id === 'string' || typeof doc.id === 'number')
      return String(doc.id)
  }
  return ''
}

export function useConditionTelemetryCatalog(gatewayBase: string) {
  const subsystems = ref<string[]>([])
  const selectedSubsystems = ref<string[]>([])
  const catalog = ref<QueryBuilderMnemonic[]>([])

  const subsystemOptions = computed<string[]>(() =>
    Array.from(new Set(subsystems.value.filter(Boolean))).sort((a, b) => a.localeCompare(b)),
  )

  const mnemonics = computed<QueryBuilderMnemonic[]>(() => {
    const allowed = new Set(
      (selectedSubsystems.value.length ? selectedSubsystems.value : subsystemOptions.value)
        .filter(Boolean),
    )

    const unique = new Map<string, QueryBuilderMnemonic>()
    for (const t of catalog.value) {
      if (!t.subsystem || !allowed.has(t.subsystem))
        continue
      const displayMnemonic = t.pid ? `${t.pid}_${t.mnemonic}` : t.mnemonic
      const key = `${t.subsystem}|${displayMnemonic}`
      if (!displayMnemonic || unique.has(key))
        continue
      unique.set(key, { ...t, mnemonic: displayMnemonic })
    }
    return Array.from(unique.values())
  })

  async function loadSubsystems() {
    try {
      const data = await $fetch<{ subsystems: string[] }>(`${gatewayBase}/get/tm/subsystems`)
      subsystems.value = data?.subsystems ?? []
    }
    catch (e) {
      console.error('Failed to load subsystems', e)
      subsystems.value = []
    }
  }

  async function loadCatalog(targetSubsystems: string[] = subsystems.value) {
    if (!targetSubsystems.length) {
      catalog.value = []
      return
    }
    try {
      const responses = await Promise.all(
        targetSubsystems.map(subsystem =>
          $fetch<any[]>(`${gatewayBase}/get/tm/details/${encodeURIComponent(subsystem)}`).then(rows => ({
            subsystem,
            rows: Array.isArray(rows) ? rows : [],
          })),
        ),
      )

      catalog.value = responses.flatMap(({ subsystem, rows }) =>
        rows.map((m) => {
          const mnemonic = String(m.mnemonic ?? m.cdbMnemonic ?? '').trim()
          if (!mnemonic)
            return null

          const rawType = String(m.parameter_type ?? m.type ?? '').toUpperCase()
          const hasPossibleStates = Array.isArray(m.possible_states) && m.possible_states.length > 0
          const telemetryType = (rawType === 'BINARY' || rawType === 'DIGITAL' || hasPossibleStates) ? 'BINARY' : 'ANALOG'

          const rangeOptions = telemetryType === 'BINARY'
            ? toStringArray(m.possible_states ?? m.range)
            : buildRangeOptions(m.range, m.limits)
          const minValue = parseNullableNumber(m.lower_range ?? m.lower_limit)
          const maxValue = parseNullableNumber(m.upper_range ?? m.upper_limit)

          return {
            mnemonic,
            type: telemetryType,
            unit: String(m.unit ?? ''),
            subsystem,
            pid: resolvePid(m.pid_no ?? m.pid ?? m._id ?? m.parameterId ?? m.id),
            valueSuggestions: rangeOptions,
            defaultValue: rangeOptions[0] ?? (minValue !== null ? String(minValue) : undefined),
            minValue,
            maxValue,
            tolerance: m.tolerance ?? null,
          } as QueryBuilderMnemonic
        }).filter((row): row is QueryBuilderMnemonic => Boolean(row)),
      )
    }
    catch (e) {
      console.error('Failed to load condition telemetry catalog', e)
      catalog.value = []
    }
  }

  return {
    subsystems,
    selectedSubsystems,
    subsystemOptions,
    catalog,
    mnemonics,
    loadSubsystems,
    loadCatalog,
  }
}
