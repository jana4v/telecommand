<script setup lang="ts">
import type { CellSelectionOptions, ColDef } from 'ag-grid-community'
import {

  colorSchemeDarkBlue,
  colorSchemeLightCold,
  ModuleRegistry,
  themeQuartz,
} from 'ag-grid-community'
import { AllEnterpriseModule } from 'ag-grid-enterprise'
import { AgGridVue } from 'ag-grid-vue3'
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import MonacoConditionEditor from '@/components/tm/MonacoConditionEditor.vue'
import QueryBuilder from '@/components/tm/QueryBuilder.vue'
import { initMenu } from '@/composables/tm/SideNav'
import { useColorModeStore } from '~/stores/colorMode'

ModuleRegistry.registerModules([AllEnterpriseModule])

definePageMeta({
  title: 'Telemetry - Dynamic Limits',
})
initMenu(5)

type ConditionEditorType = 'visualBuilder' | 'monacoEditor'
type LogicTokenType = 'LPAREN' | 'RPAREN' | 'AND' | 'OR' | 'NOT' | 'IDENT' | 'OP' | 'VALUE'

interface LogicToken {
  type: LogicTokenType
  value: string
}

interface ConditionRule {
  id: string
  type: 'rule' | 'group'
  condition?: string
  value?: string
  mnemonic?: string
  operator?: string
  rules?: ConditionRule[]
  negate?: boolean
}

interface MnemonicInfo {
  mnemonic: string
  type: string
  unit: string
  subsystem?: string
  pid?: string
  valueSuggestions?: string[]
  defaultValue?: string
  minValue?: number | null
  maxValue?: number | null
}

interface DynamicLimitRow {
  subsystem: string
  pid: string
  cdbMnemonic: string
  telemetryType: 'ANALOG' | 'BINARY'
  rangeOptions: string[]
  minValue: number | null
  maxValue: number | null
  lowerLimit: number | null
  upperLimit: number | null
  tolerance: number | null
  conditionLogic: string
  conditionType: ConditionEditorType
  conditionRule: ConditionRule | null
}

interface StoredCondition {
  logic: string
  type: ConditionEditorType
  rule: ConditionRule | null
}

const STORAGE_KEY = 'tm.dynamic-limits.conditions.v1'

const colorModeStore = useColorModeStore()
const { apiBase: gatewayBase } = useRuntimeConfig().public

const subsystems = ref<string[]>([])
const selectedSubsystems = ref<string[]>([])
const loading = ref(false)
const saving = ref(false)
const quickFilter = ref('')
const saveMessage = ref<{ type: 'success' | 'error', text: string } | null>(null)

const gridApi = ref<any>(null)
const rowData = ref<DynamicLimitRow[]>([])
const conditionTelemetryCatalog = ref<MnemonicInfo[]>([])
const changedFields = ref<Map<string, Set<string>>>(new Map())
const conditionStore = ref<Record<string, StoredCondition>>({})
const cellSelection = ref<boolean | CellSelectionOptions>({
  handle: { mode: 'fill' },
})

const showConditionEditor = ref(false)
const activeConditionRowKey = ref<string>('')
const conditionSubsystems = ref<string[]>([])
const conditionDraft = ref('')
const conditionRule = ref<ConditionRule | null>(null)
const conditionType = ref<ConditionEditorType>('visualBuilder')
let conditionSyncing = false

const gridTheme = computed(() =>
  colorModeStore.currentMode === 'dark'
    ? themeQuartz.withPart(colorSchemeDarkBlue)
    : themeQuartz.withPart(colorSchemeLightCold),
)

const conditionSubsystemOptions = computed<string[]>(() => {
  const options = Array.from(new Set(subsystems.value.filter(Boolean)))
  return options.sort((a, b) => a.localeCompare(b))
})

const conditionEditorMnemonics = computed<MnemonicInfo[]>(() => {
  const allowedSubsystems = new Set(
    (conditionSubsystems.value.length ? conditionSubsystems.value : conditionSubsystemOptions.value)
      .filter(Boolean),
  )

  const unique = new Map<string, MnemonicInfo>()
  for (const telemetry of conditionTelemetryCatalog.value) {
    if (!telemetry.subsystem || !allowedSubsystems.has(telemetry.subsystem))
      continue

    const displayMnemonic = telemetry.pid ? `${telemetry.pid}_${telemetry.mnemonic}` : telemetry.mnemonic
    const uniqueKey = `${telemetry.subsystem}|${displayMnemonic}`
    if (!displayMnemonic || unique.has(uniqueKey))
      continue

    unique.set(uniqueKey, {
      mnemonic: displayMnemonic,
      type: telemetry.type,
      unit: telemetry.unit,
      subsystem: telemetry.subsystem,
      pid: telemetry.pid,
      valueSuggestions: telemetry.valueSuggestions,
      defaultValue: telemetry.defaultValue,
      minValue: telemetry.minValue,
      maxValue: telemetry.maxValue,
    })
  }

  return Array.from(unique.values())
})

const columnDefs = ref<ColDef<DynamicLimitRow>[]>([
  {
    headerName: 'PID',
    field: 'pid',
    minWidth: 130,
    maxWidth: 180,
    editable: false,
    suppressFillHandle: true,
    pinned: 'left',
  },
  {
    headerName: 'Mnemonic',
    field: 'cdbMnemonic',
    minWidth: 220,
    maxWidth: 340,
    editable: false,
    suppressFillHandle: true,
    cellStyle: { fontWeight: '600' },
  },
  {
    headerName: 'Lower Limit',
    field: 'lowerLimit',
    minWidth: 150,
    maxWidth: 180,
    editable: true,
    valueParser: params => parseNullableNumber(params.newValue),
  },
  {
    headerName: 'Upper Limit',
    field: 'upperLimit',
    minWidth: 150,
    maxWidth: 180,
    editable: true,
    valueParser: params => parseNullableNumber(params.newValue),
  },
  {
    headerName: 'Tolerance',
    field: 'tolerance',
    minWidth: 140,
    maxWidth: 170,
    editable: true,
    valueParser: params => parseNullableNumber(params.newValue),
  },
  {
    headerName: 'Condition',
    field: 'conditionLogic',
    width: 360,
    minWidth: 320,
    maxWidth: 420,
    editable: true,
    cellClass: 'condition-cell',
    tooltipValueGetter: params => String(params.data?.conditionLogic || 'Click to set condition'),
    valueFormatter: params => formatConditionCell(params.value),
  },
])

const defaultColDef: ColDef<DynamicLimitRow> = {
  sortable: true,
  filter: true,
  resizable: true,
}

onMounted(async () => {
  loadConditionStore()
  await loadSubsystems()
  await loadConditionTelemetryCatalog(subsystems.value)
})

watch(
  selectedSubsystems,
  async (subs) => {
    if (subs.length === 0) {
      rowData.value = []
      changedFields.value.clear()
      return
    }
    await loadMnemonicRows(subs)
  },
  { deep: true },
)

watch(quickFilter, (value) => {
  if (gridApi.value) {
    gridApi.value.setGridOption('quickFilterText', value)
  }
})

watch(rowData, async (rows) => {
  if (!gridApi.value || rows.length === 0)
    return
  await nextTick()
  gridApi.value.autoSizeAllColumns()
})

watch(
  conditionRule,
  (rule) => {
    if (conditionSyncing)
      return
    if (conditionType.value !== 'visualBuilder')
      return

    const generated = rule ? generateLogicFromRules(rule) : ''
    if (generated === conditionDraft.value)
      return

    conditionSyncing = true
    conditionDraft.value = generated
    conditionSyncing = false
  },
  { deep: true },
)

watch(conditionDraft, (logic) => {
  if (conditionSyncing)
    return
  if (conditionType.value !== 'monacoEditor')
    return

  const parsed = parseLogicToRule(logic)
  if (!parsed)
    return

  conditionSyncing = true
  conditionRule.value = parsed
  conditionSyncing = false
})

function rowKey(row: Pick<DynamicLimitRow, 'subsystem' | 'cdbMnemonic'>): string {
  return `${row.subsystem}|${row.cdbMnemonic}`
}

function parseNullableNumber(value: unknown): number | null {
  if (value === '' || value === null || value === undefined)
    return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

function toStringArray(value: unknown): string[] {
  if (!Array.isArray(value))
    return []
  return value
    .map(v => String(v ?? '').trim())
    .filter(v => v.length > 0)
}

function buildRangeOptions(range: unknown, limits: unknown): string[] {
  const directRange = toStringArray(range)
  if (directRange.length > 0)
    return directRange
  return toStringArray(limits)
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

function normalizeLogic(logic: string): string {
  return logic.replace(/\s+/g, ' ').replace(/\(\s+/g, '(').replace(/\s+\)/g, ')').trim()
}

function formatConditionCell(value: unknown): string {
  const logic = normalizeLogic(String(value ?? ''))
  return logic || 'Click to edit condition'
}

function loadConditionStore() {
  if (!import.meta.client)
    return
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) {
      conditionStore.value = {}
      return
    }
    const parsed = JSON.parse(raw) as Record<string, StoredCondition>
    conditionStore.value = parsed && typeof parsed === 'object' ? parsed : {}
  }
  catch {
    conditionStore.value = {}
  }
}

function persistConditionStore() {
  if (!import.meta.client)
    return
  localStorage.setItem(STORAGE_KEY, JSON.stringify(conditionStore.value))
}

function onGridReady(params: any) {
  gridApi.value = params.api
  params.api.setGridOption('quickFilterText', quickFilter.value)
  params.api.autoSizeAllColumns()
}

function onCellValueChanged(params: any) {
  if (!params?.data?.subsystem || !params?.data?.cdbMnemonic || !params?.colDef?.field)
    return
  const key = rowKey(params.data as DynamicLimitRow)
  const fields = changedFields.value.get(key) ?? new Set<string>()
  fields.add(String(params.colDef.field))
  changedFields.value.set(key, fields)
}

function onCellDoubleClicked(params: any) {
  if (params?.colDef?.field !== 'conditionLogic')
    return
  if (!params?.data?.subsystem || !params?.data?.cdbMnemonic)
    return
  openConditionEditor(params.data as DynamicLimitRow)
}

function switchConditionType(newType: ConditionEditorType) {
  if (newType === conditionType.value)
    return

  if (newType === 'monacoEditor') {
    if (conditionRule.value) {
      conditionDraft.value = generateLogicFromRules(conditionRule.value)
    }
  }
  else {
    // Going monaco -> visualBuilder. If Monaco text isn't a clean condition
    // expression (e.g. user typed arbitrary JS), silently block the switch
    // so the code in Monaco isn't lost.
    const draft = String(conditionDraft.value || '').trim()
    const parsed = draft ? parseLogicToRule(draft) : null
    if (draft && !parsed)
      return
    if (parsed)
      conditionRule.value = parsed
  }

  conditionType.value = newType
}

function openConditionEditor(row: DynamicLimitRow) {
  activeConditionRowKey.value = rowKey(row)
  conditionSubsystems.value = [row.subsystem]
  conditionDraft.value = row.conditionLogic
  conditionRule.value = row.conditionRule || parseLogicToRule(row.conditionLogic) || null
  conditionType.value = row.conditionType
  showConditionEditor.value = true
}

function saveConditionEditor() {
  const key = activeConditionRowKey.value
  if (!key)
    return

  const rowIdx = rowData.value.findIndex(item => rowKey(item) === key)
  if (rowIdx === -1)
    return
  const existing = rowData.value[rowIdx]
  if (!existing)
    return

  const finalLogic
    = conditionType.value === 'visualBuilder' && conditionRule.value
      ? generateLogicFromRules(conditionRule.value)
      : conditionDraft.value

  const nextRule
    = conditionType.value === 'visualBuilder'
      ? conditionRule.value
      : parseLogicToRule(conditionDraft.value) || null

  const updatedLogic = normalizeLogic(finalLogic)

  const updatedRow: DynamicLimitRow = {
    ...existing,
    conditionLogic: updatedLogic,
    conditionRule: nextRule,
    conditionType: conditionType.value,
  }

  // Replace in reactive array so Vue/AG-Grid notice.
  rowData.value.splice(rowIdx, 1, updatedRow)

  conditionStore.value[key] = {
    logic: updatedLogic,
    type: conditionType.value,
    rule: nextRule,
  }
  persistConditionStore()

  const fields = changedFields.value.get(key) ?? new Set<string>()
  fields.add('conditionLogic')
  changedFields.value.set(key, fields)

  // Force AG-Grid to pick up the new row reference + redraw the cell.
  if (gridApi.value) {
    try {
      gridApi.value.applyTransaction?.({ update: [updatedRow] })
    }
    catch {}
    let targetNode: any = null
    gridApi.value.forEachNode?.((node: any) => {
      if (!targetNode && node?.data && rowKey(node.data) === key)
        targetNode = node
    })
    if (targetNode) {
      try { targetNode.setData?.(updatedRow) }
      catch {}
      gridApi.value.refreshCells?.({ force: true, rowNodes: [targetNode], columns: ['conditionLogic'] })
      gridApi.value.redrawRows?.({ rowNodes: [targetNode] })
    }
    else {
      gridApi.value.refreshCells?.({ force: true, columns: ['conditionLogic'] })
    }
  }

  showConditionEditor.value = false
  saveMessage.value = {
    type: 'success',
    text: `Condition updated for ${updatedRow.cdbMnemonic}: ${updatedLogic || '(empty)'}`,
  }
}

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

async function loadConditionTelemetryCatalog(targetSubsystems: string[]) {
  if (targetSubsystems.length === 0) {
    conditionTelemetryCatalog.value = []
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

    conditionTelemetryCatalog.value = responses.flatMap(({ subsystem, rows }) =>
      rows
        .map((m) => {
          const telemetryType = String(m.parameter_type ?? m.type ?? '').toUpperCase() === 'BINARY' ? 'BINARY' : 'ANALOG'
          const mnemonic = String(m.mnemonic ?? m.cdbMnemonic ?? '').trim()
          if (!mnemonic)
            return null

          const rangeOptions = telemetryType === 'BINARY'
            ? toStringArray(m.possible_states ?? m.range)
            : []
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
          } as MnemonicInfo
        })
        .filter((row): row is MnemonicInfo => Boolean(row)),
    )
  }
  catch (e) {
    console.error('Failed to load condition telemetry catalog', e)
    conditionTelemetryCatalog.value = []
  }
}

async function loadMnemonicRows(targetSubsystems: string[]) {
  loading.value = true
  saveMessage.value = null
  changedFields.value.clear()

  try {
    const responses = await Promise.all(
      targetSubsystems.map(subsystem =>
        $fetch<any[]>(`${gatewayBase}/get/tm/details/${encodeURIComponent(subsystem)}`).then(rows => ({
          subsystem,
          rows: Array.isArray(rows) ? rows : [],
        })),
      ),
    )

    const mapped: DynamicLimitRow[] = responses.flatMap(({ subsystem, rows }) =>
      rows
        .map((m) => {
          const type = String(m.parameter_type ?? m.type ?? '').toUpperCase()
          if (type && type !== 'ANALOG')
            return null

          const mnemonic = String(m.mnemonic ?? m.cdbMnemonic ?? '').trim()
          if (!mnemonic)
            return null

          const minValue = parseNullableNumber(m.lower_range ?? m.lower_limit)
          const maxValue = parseNullableNumber(m.upper_range ?? m.upper_limit)
          const rangeOptions: string[] = []
          const key = `${subsystem}|${mnemonic}`
          const stored = conditionStore.value[key]

          return {
            subsystem,
            pid: resolvePid(m.pid_no ?? m.pid ?? m._id ?? m.parameterId ?? m.id),
            cdbMnemonic: mnemonic,
            telemetryType: 'ANALOG',
            rangeOptions,
            minValue,
            maxValue,
            lowerLimit: minValue,
            upperLimit: maxValue,
            tolerance: parseNullableNumber(m.tolerance),
            conditionLogic: normalizeLogic(stored?.logic ?? ''),
            conditionType: stored?.type ?? 'visualBuilder',
            conditionRule: stored?.rule ?? null,
          } as DynamicLimitRow
        })
        .filter((row): row is DynamicLimitRow => Boolean(row)),
    )

    rowData.value = mapped
  }
  catch (e) {
    console.error('Failed to load dynamic limits rows', e)
    rowData.value = []
  }
  finally {
    loading.value = false
  }
}

async function saveChangedRows() {
  if (selectedSubsystems.value.length === 0)
    return
  if (changedFields.value.size === 0) {
    saveMessage.value = { type: 'success', text: 'No changes to save.' }
    return
  }

  saving.value = true
  saveMessage.value = null

  try {
    let updates = 0

    const rowsWithLimitChanges = rowData.value.filter((row) => {
      const fields = changedFields.value.get(rowKey(row))
      return Boolean(fields && (fields.has('lowerLimit') || fields.has('upperLimit')))
    })

    if (rowsWithLimitChanges.length > 0) {
      await $fetch(`${gatewayBase}/update/tm/limits`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: rowsWithLimitChanges.map(row => ({
          pid: row.pid,
          lower_limit: row.lowerLimit ?? 0,
          upper_limit: row.upperLimit ?? 0,
        })),
      })
      updates += rowsWithLimitChanges.length
    }

    for (const row of rowData.value) {
      const fields = changedFields.value.get(rowKey(row))
      if (!fields?.has('tolerance'))
        continue

      await $fetch(`${gatewayBase}/update/tm/tolerance`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: [{ pid: row.pid, value: row.tolerance ?? 0 }],
      })
      updates += 1
    }

    const localOnlyConditions = rowData.value.filter((row) => {
      const fields = changedFields.value.get(rowKey(row))
      return Boolean(fields?.has('conditionLogic'))
    }).length

    changedFields.value.clear()

    if (localOnlyConditions > 0) {
      saveMessage.value = {
        type: 'success',
        text: `Saved ${updates} backend update${updates === 1 ? '' : 's'} and ${localOnlyConditions} condition mapping${localOnlyConditions === 1 ? '' : 's'} locally.`,
      }
    }
    else {
      saveMessage.value = {
        type: 'success',
        text: `Saved ${updates} backend update${updates === 1 ? '' : 's'}.`,
      }
    }
  }
  catch (e: any) {
    saveMessage.value = {
      type: 'error',
      text: e?.data?.error ?? 'Failed to save dynamic limits',
    }
  }
  finally {
    saving.value = false
  }
}

function tokenizeLogic(input: string): LogicToken[] {
  const tokens: LogicToken[] = []
  let i = 0

  const push = (type: LogicTokenType, value: string) => {
    tokens.push({ type, value })
  }

  while (i < input.length) {
    const ch = input[i]
    if (!ch)
      break

    if (/\s/.test(ch)) {
      i += 1
      continue
    }

    const rest = input.slice(i)

    if (rest.startsWith('&&')) {
      push('AND', 'AND')
      i += 2
      continue
    }

    if (rest.startsWith('||')) {
      push('OR', 'OR')
      i += 2
      continue
    }

    if (rest.startsWith('===')) {
      push('OP', '==')
      i += 3
      continue
    }

    if (rest.startsWith('!==')) {
      push('OP', '!=')
      i += 3
      continue
    }

    if (rest.startsWith('==') || rest.startsWith('!=') || rest.startsWith('>=') || rest.startsWith('<=') || rest.startsWith('>') || rest.startsWith('<')) {
      const op = /^(==|!=|>=|<=|>|<)/.exec(rest)?.[1]
      if (op) {
        push('OP', op)
        i += op.length
        continue
      }
    }

    if (ch === '(') {
      push('LPAREN', ch)
      i += 1
      continue
    }

    if (ch === ')') {
      push('RPAREN', ch)
      i += 1
      continue
    }

    if (ch === '!') {
      push('NOT', '!')
      i += 1
      continue
    }

    if (ch === '\'' || ch === '"') {
      const quote = ch
      let value = ''
      i += 1
      while (i < input.length) {
        const curr = input[i]
        if (!curr)
          break
        if (curr === '\\' && i + 1 < input.length) {
          value += input[i + 1] || ''
          i += 2
          continue
        }
        if (curr === quote) {
          i += 1
          break
        }
        value += curr
        i += 1
      }
      push('VALUE', value)
      continue
    }

    const word = /^[\w:.+-]+/.exec(rest)?.[0]
    if (word) {
      const upper = word.toUpperCase()
      // Special-case TM["..."] / TM['...'] -> single IDENT token with inner mnemonic
      if (upper === 'TM') {
        const bracketMatch = /^TM\[\s*(["'])([^"']+)\1\s*\]/.exec(rest)
        if (bracketMatch) {
          push('IDENT', bracketMatch[2] || '')
          i += bracketMatch[0].length
          continue
        }
      }
      if (upper === 'AND') {
        push('AND', 'AND')
      }
      else if (upper === 'OR') {
        push('OR', 'OR')
      }
      else if (upper === 'NOT') {
        push('NOT', 'NOT')
      }
      else if (/^-?\d+(?:\.\d+)?$/.test(word)) {
        push('VALUE', word)
      }
      else {
        push('IDENT', word)
      }
      i += word.length
      continue
    }

    return []
  }

  return tokens
}

function parseLogicToRule(logic: string): ConditionRule | null {
  const tokens = tokenizeLogic(logic)
  if (!tokens.length)
    return null

  let index = 0
  let idCounter = 0

  const nextId = (prefix: 'rule' | 'group') => `${prefix}_parsed_${Date.now()}_${idCounter++}`
  const peek = () => tokens[index]
  const consume = () => tokens[index++]

  const parseRule = (): ConditionRule | null => {
    const mnemonic = consume()
    const operator = consume()
    const value = consume()
    if (!mnemonic || mnemonic.type !== 'IDENT')
      return null
    if (!operator || operator.type !== 'OP')
      return null
    if (!value || (value.type !== 'VALUE' && value.type !== 'IDENT'))
      return null

    return {
      id: nextId('rule'),
      type: 'rule',
      mnemonic: mnemonic.value,
      condition: operator.value,
      value: value.value,
    }
  }

  const combine = (left: ConditionRule, right: ConditionRule, op: 'AND' | 'OR'): ConditionRule => {
    if (left.type === 'group' && left.operator === op && !left.negate) {
      return {
        ...left,
        rules: [...(left.rules || []), right],
      }
    }

    return {
      id: nextId('group'),
      type: 'group',
      operator: op,
      rules: [left, right],
    }
  }

  let parseOr: () => ConditionRule | null = () => null

  const parsePrimary = (): ConditionRule | null => {
    const token = peek()
    if (!token)
      return null

    if (token.type === 'LPAREN') {
      consume()
      const expr = parseOr()
      const close = consume()
      if (!expr || !close || close.type !== 'RPAREN')
        return null
      return expr
    }

    return parseRule()
  }

  const parseUnary = (): ConditionRule | null => {
    const token = peek()
    if (!token)
      return null

    if (token.type === 'NOT') {
      consume()
      const node = parsePrimary()
      if (!node)
        return null
      if (node.type !== 'rule')
        return null
      return {
        ...node,
        negate: true,
      }
    }

    return parsePrimary()
  }

  const parseAnd = (): ConditionRule | null => {
    let left = parseUnary()
    if (!left)
      return null

    while (peek()?.type === 'AND') {
      consume()
      const right = parseUnary()
      if (!right)
        return null
      left = combine(left, right, 'AND')
    }

    return left
  }

  parseOr = (): ConditionRule | null => {
    let left = parseAnd()
    if (!left)
      return null

    while (peek()?.type === 'OR') {
      consume()
      const right = parseAnd()
      if (!right)
        return null
      left = combine(left, right, 'OR')
    }

    return left
  }

  const parsed = parseOr()
  if (!parsed)
    return null
  if (index !== tokens.length)
    return null

  return parsed
}

function formatMnemonicRef(mnemonic: string): string {
  const raw = String(mnemonic || '').trim()
  if (!raw)
    return ''
  if (/^TM\[["'][^"']+["']\]$/.test(raw))
    return raw
  return `TM["${raw}"]`
}

function generateLogicFromRules(rule: ConditionRule, depth = 0): string {
  if (rule.type === 'rule') {
    if (!rule.mnemonic || !rule.condition)
      return ''
    const ref = formatMnemonicRef(rule.mnemonic)
    let result = `${ref} ${rule.condition} ${rule.value}`
    if (rule.negate)
      result = `!(${result})`
    return result
  }

  if (rule.type === 'group' && rule.rules && rule.rules.length > 0) {
    const op = (rule.operator || 'AND') === 'OR' ? '||' : '&&'
    const parts = rule.rules.map(r => generateLogicFromRules(r, depth + 1)).filter(s => s.length > 0)
    const grouped = parts.join(` ${op} `)

    if (depth === 0)
      return grouped
    return `(${grouped})`
  }

  return ''
}
</script>

<template>
  <div class="content p-4">
    <AppName appname="Dynamic Limits" />

    <div class="controls mt-4">
      <div class="control-item">
        <label class="label">Subsystems</label>
        <MultiSelect
          v-model="selectedSubsystems"
          :options="subsystems"
          placeholder="Select subsystem(s)..."
          class="w-64"
          :filter="true"
          :max-selected-labels="3"
        />
      </div>

      <div class="control-item grow">
        <label class="label">Quick Filter</label>
        <InputText
          v-model="quickFilter"
          placeholder="Filter by PID / mnemonic / condition..."
          class="w-full"
          size="small"
        />
      </div>

      <Button
        label="Save Dynamic Limits"
        icon="pi pi-save"
        :loading="saving"
        :disabled="selectedSubsystems.length === 0"
        @click="saveChangedRows"
      />
    </div>

    <Message v-if="saveMessage" :severity="saveMessage.type === 'success' ? 'success' : 'error'" class="mt-3">
      {{ saveMessage.text }}
    </Message>

    <div v-if="loading" class="loading-box mt-4">
      <i class="pi pi-spin pi-spinner" />
      <span>Loading dynamic limits...</span>
    </div>

    <div v-else-if="rowData.length > 0" class="ag-wrapper mt-4">
      <AgGridVue
        :theme="gridTheme"
        class="ag-theme-local"
        :row-data="rowData"
        :column-defs="columnDefs"
        :default-col-def="defaultColDef"
        :cell-selection="cellSelection"
        :suppress-click-edit="true"
        :stop-editing-when-cells-lose-focus="true"
        :animate-rows="true"
        @grid-ready="onGridReady"
        @cell-value-changed="onCellValueChanged"
        @cell-double-clicked="onCellDoubleClicked"
      />
    </div>

    <div v-else-if="selectedSubsystems.length > 0 && !loading" class="no-data mt-4">
      <i class="pi pi-inbox text-3xl" />
      <p>No analog mnemonics found for selected subsystem(s).</p>
    </div>

    <Dialog
      v-model:visible="showConditionEditor"
      modal
      header="Edit Condition"
      :style="{ width: 'min(1100px, 96vw)' }"
    >
      <div class="condition-dialog">
        <div class="condition-toolbar">
          <Button
            label="Visual Builder"
            size="small"
            :outlined="conditionType !== 'visualBuilder'"
            @click="switchConditionType('visualBuilder')"
          />
          <Button
            label="Monaco Editor"
            size="small"
            :outlined="conditionType !== 'monacoEditor'"
            @click="switchConditionType('monacoEditor')"
          />
        </div>

        <div class="condition-panel mt-3">
          <div v-if="conditionType === 'visualBuilder'" class="builder-wrap">
            <div class="control-item condition-subsystems mb-3">
              <label class="label">Condition Subsystems</label>
              <MultiSelect
                v-model="conditionSubsystems"
                :options="conditionSubsystemOptions"
                placeholder="Select subsystem(s) for condition..."
                class="w-full"
                :filter="true"
                :max-selected-labels="3"
              />
            </div>
            <QueryBuilder
              v-model="conditionRule"
              :mnemonics="conditionEditorMnemonics"
              mode="full"
              @generate="conditionDraft = $event"
            />
          </div>

          <div v-else class="monaco-wrap">
            <MonacoConditionEditor
              v-model="conditionDraft"
              :mnemonics="conditionEditorMnemonics"
              height="42vh"
            />
          </div>
        </div>

        <div class="condition-preview mt-3">
          <label class="label">Formatted Preview</label>
          <div class="preview-box">
            {{ formatConditionCell(conditionDraft) }}
          </div>
        </div>
      </div>

      <template #footer>
        <Button label="Cancel" severity="secondary" text @click="showConditionEditor = false" />
        <Button label="Apply Condition" icon="pi pi-check" @click="saveConditionEditor" />
      </template>
    </Dialog>
  </div>
</template>

<style scoped lang="scss">
.controls {
  display: flex;
  align-items: flex-end;
  gap: 1rem;
  flex-wrap: wrap;
}

.control-item {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.control-item.grow {
  flex: 1;
  min-width: 280px;
}

.label {
  font-weight: 600;
  font-size: 0.9rem;
}

.loading-box {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  color: var(--text-color-secondary);
}

.no-data {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  color: var(--text-color-secondary);
}

.ag-wrapper {
  height: calc(100vh - 18rem);
  min-height: 28rem;
  width: 100%;
  border: 1px solid var(--surface-border);
  border-radius: 8px;
  overflow: hidden;
}

.ag-theme-local {
  height: 100%;
  width: 100%;
}

:deep(.condition-cell) {
  cursor: pointer;
  color: var(--primary-color);
  text-decoration: underline;
  text-underline-offset: 2px;
}

.condition-dialog {
  display: flex;
  flex-direction: column;
}

.condition-toolbar {
  display: flex;
  gap: 0.5rem;
}

.builder-wrap,
.monaco-wrap {
  border: 1px solid var(--surface-border);
  border-radius: 8px;
  padding: 0.75rem;
  min-height: 20rem;
}

.preview-box {
  border: 1px solid var(--surface-border);
  border-radius: 8px;
  background: var(--surface-ground);
  padding: 0.75rem;
  white-space: pre-wrap;
  word-break: break-word;
  min-height: 3rem;
}

@media (max-width: 1200px) {
  .ag-wrapper {
    width: 100%;
  }
}

@media (max-height: 900px) {
  .ag-wrapper {
    height: calc(100vh - 16rem);
  }
}
</style>
