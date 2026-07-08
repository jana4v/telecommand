<script setup lang="ts">
import MonacoEditor, { loader } from '@guolao/vue-monaco-editor'
import * as monaco from 'monaco-editor'
import editorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker'
import cssWorker from 'monaco-editor/esm/vs/language/css/css.worker?worker'
import htmlWorker from 'monaco-editor/esm/vs/language/html/html.worker?worker'
import jsonWorker from 'monaco-editor/esm/vs/language/json/json.worker?worker'
import tsWorker from 'monaco-editor/esm/vs/language/typescript/ts.worker?worker'
import { onBeforeUnmount, onMounted } from 'vue'

// Use the bundled monaco instance so providers we register apply.
if (import.meta.client)
  loader.config({ monaco })

interface MnemonicItem {
  mnemonic: string
  valueSuggestions?: string[]
  defaultValue?: string
}

const props = withDefaults(defineProps<{
  modelValue: string
  mnemonics?: MnemonicItem[]
  height?: string
}>(), {
  height: '42vh',
  mnemonics: () => [],
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

interface SubsystemsResponse {
  subsystems?: string[]
}

const { tmApiBase } = useRuntimeConfig().public
const resolvedTmApiBase = String(tmApiBase || '/api/v1/tm').replace(/\/+$/, '')

const WORKER_KEY = '__tmConditionMonacoWorkerRegistered__'
const COMPLETION_DISPOSABLE_KEY = '__tmConditionCompletionDisposables__'
const LANGUAGE_ID = 'javascript'

const subsystemCache = new Map<string, string[]>()
const pidMnemonicCache = new Map<string, string[]>()
const rangeByPidCache = new Map<string, string[]>()
let subsystemInFlight: Promise<string[]> | null = null
const pidMnemonicInFlight = new Map<string, Promise<string[]>>()
const rangeByPidInFlight = new Map<string, Promise<string[]>>()
let editorInstance: monaco.editor.IStandaloneCodeEditor | null = null
let contentListener: monaco.IDisposable | null = null

const editorOptions: monaco.editor.IStandaloneEditorConstructionOptions = {
  minimap: { enabled: false },
  wordWrap: 'on',
  tabSize: 2,
  fontSize: 13,
  automaticLayout: true,
  scrollBeyondLastLine: false,
  suggestOnTriggerCharacters: true,
  quickSuggestions: {
    other: true,
    comments: false,
    strings: true,
  },
  wordBasedSuggestions: 'allDocuments',
}

function configureJavascriptDefaults() {
  try {
    const ts = monaco.languages.typescript
    if (!ts)
      return
    ts.javascriptDefaults.setCompilerOptions({
      ...ts.javascriptDefaults.getCompilerOptions(),
      target: ts.ScriptTarget.ESNext,
      module: ts.ModuleKind.ESNext,
      allowNonTsExtensions: true,
      noLib: false,
      allowJs: true,
      checkJs: false,
    })
    ts.javascriptDefaults.setDiagnosticsOptions({
      noSemanticValidation: false,
      noSyntaxValidation: false,
      noSuggestionDiagnostics: false,
    })
    ts.javascriptDefaults.setEagerModelSync?.(true)
    // Provide a TM ambient declaration so completions/typecheck recognize the symbol.
    const libUri = 'ts:filename/tm-globals.d.ts'
    const libSrc = 'declare const TM: Record<string, any> & { [subsystem: string]: Record<string, any> };'
    try { ts.javascriptDefaults.addExtraLib(libSrc, libUri) }
    catch {}
  }
  catch {}
}

function ensureMonacoWorkers() {
  if (!import.meta.client)
    return

  const g = globalThis as Record<string, any>
  if (g[WORKER_KEY])
    return

  const existing = g.MonacoEnvironment as { getWorker?: (moduleId: string, label: string) => Worker } | undefined

  if (!existing?.getWorker) {
    g.MonacoEnvironment = {
      ...existing,
      getWorker(_: string, label: string) {
        if (label === 'json')
          return new jsonWorker()
        if (label === 'css' || label === 'scss' || label === 'less')
          return new cssWorker()
        if (label === 'html' || label === 'handlebars' || label === 'razor')
          return new htmlWorker()
        if (label === 'typescript' || label === 'javascript')
          return new tsWorker()
        return new editorWorker()
      },
    }
  }

  g[WORKER_KEY] = true
}

function registerLanguage() {
  // Using built-in 'javascript' language — nothing to register.
}

function toStringArray(value: unknown): string[] {
  if (!Array.isArray(value))
    return []
  return value
    .map(v => String(v ?? '').trim())
    .filter(Boolean)
}

async function fetchSubsystems(): Promise<string[]> {
  if (subsystemCache.has('all'))
    return subsystemCache.get('all') || []

  if (subsystemInFlight)
    return subsystemInFlight

  subsystemInFlight = (async () => {
    try {
      const response = await $fetch<SubsystemsResponse>(`${resolvedTmApiBase}/telemetry/subsystems`)
      const subsystems = (response?.subsystems || []).map(v => String(v || '').trim()).filter(Boolean)
      subsystemCache.set('all', subsystems)
      return subsystems
    }
    catch {
      return []
    }
    finally {
      subsystemInFlight = null
    }
  })()

  return subsystemInFlight
}

async function fetchPidMnemonics(subsystem: string): Promise<string[]> {
  const key = subsystem.toUpperCase()
  if (pidMnemonicCache.has(key))
    return pidMnemonicCache.get(key) || []

  const inFlight = pidMnemonicInFlight.get(key)
  if (inFlight)
    return inFlight

  const request = (async () => {
    try {
      const response = await $fetch<string[]>(`${resolvedTmApiBase}/mnemonics/pid_mnemonics/${encodeURIComponent(key)}`)
      const values = (Array.isArray(response) ? response : [])
        .map(v => String(v || '').trim())
        .filter(Boolean)
      pidMnemonicCache.set(key, values)
      return values
    }
    catch {
      return []
    }
    finally {
      pidMnemonicInFlight.delete(key)
    }
  })()

  pidMnemonicInFlight.set(key, request)
  return request
}

async function fetchRangeForPidMnemonic(pidMnemonic: string, forceRefresh = false): Promise<string[]> {
  const key = pidMnemonic.trim().toUpperCase()
  if (!key)
    return []

  if (!forceRefresh && rangeByPidCache.has(key))
    return rangeByPidCache.get(key) || []

  if (!forceRefresh) {
    const inFlight = rangeByPidInFlight.get(key)
    if (inFlight)
      return inFlight
  }

  const request = (async () => {
    try {
      const url = `${resolvedTmApiBase}/telemetry/range/pid/${encodeURIComponent(key)}`
      const response = await $fetch<unknown>(url)
      const values = toStringArray(Array.isArray(response) ? response : [])
      if (values.length > 0)
        rangeByPidCache.set(key, values)
      return values
    }
    catch {
      return []
    }
    finally {
      rangeByPidInFlight.delete(key)
    }
  })()

  rangeByPidInFlight.set(key, request)
  return request
}

function makeRange(position: monaco.Position, model: monaco.editor.ITextModel): monaco.IRange {
  const word = model.getWordUntilPosition(position)
  return {
    startLineNumber: position.lineNumber,
    endLineNumber: position.lineNumber,
    startColumn: word.startColumn,
    endColumn: word.endColumn,
  }
}

function makeTmRange(position: monaco.Position, prefixLength: number): monaco.IRange {
  return {
    startLineNumber: position.lineNumber,
    endLineNumber: position.lineNumber,
    startColumn: Math.max(1, position.column - prefixLength),
    endColumn: position.column,
  }
}

function buildOperatorSuggestions(range: monaco.IRange): monaco.languages.CompletionItem[] {
  const operators = [
    { label: '&&', insertText: ' && ', kind: monaco.languages.CompletionItemKind.Keyword },
    { label: '||', insertText: ' || ', kind: monaco.languages.CompletionItemKind.Keyword },
    { label: '!', insertText: '!', kind: monaco.languages.CompletionItemKind.Keyword },
    { label: '==', insertText: ' == ', kind: monaco.languages.CompletionItemKind.Operator },
    { label: '!=', insertText: ' != ', kind: monaco.languages.CompletionItemKind.Operator },
    { label: '>=', insertText: ' >= ', kind: monaco.languages.CompletionItemKind.Operator },
    { label: '<=', insertText: ' <= ', kind: monaco.languages.CompletionItemKind.Operator },
    { label: '>', insertText: ' > ', kind: monaco.languages.CompletionItemKind.Operator },
    { label: '<', insertText: ' < ', kind: monaco.languages.CompletionItemKind.Operator },
  ]

  return operators.map((item, idx) => ({
    ...item,
    detail: 'Logical/operator token',
    range,
    sortText: `9_${String(idx).padStart(4, '0')}_${item.label}`,
  }))
}

function buildTmRootSuggestion(range: monaco.IRange): monaco.languages.CompletionItem[] {
  return [
    {
      label: 'TM',
      insertText: 'TM.',
      detail: 'Telemetry namespace',
      kind: monaco.languages.CompletionItemKind.Module,
      range,
      sortText: '0_TM',
    },
  ]
}

function buildSubsystemSuggestions(subsystems: string[], range: monaco.IRange): monaco.languages.CompletionItem[] {
  return subsystems.map((sub, idx) => ({
    label: sub,
    insertText: `TM.${sub}`,
    filterText: `TM.${sub}`,
    detail: 'TM subsystem',
    kind: monaco.languages.CompletionItemKind.EnumMember,
    range,
    sortText: `1_${String(idx).padStart(4, '0')}_${sub}`,
  }))
}

function buildPidMnemonicSuggestions(items: string[], range: monaco.IRange, subsystem: string): monaco.languages.CompletionItem[] {
  return items.map((item, idx) => ({
    label: item,
    insertText: `TM["${item}"]`,
    filterText: `TM.${subsystem}.${item}`,
    detail: 'PID_MNEMONIC',
    kind: monaco.languages.CompletionItemKind.Variable,
    range,
    sortText: `2_${String(idx).padStart(4, '0')}_${item}`,
  }))
}

function buildRangeValueSuggestions(values: string[], partial: string, quote: '"' | '\'' | '', range: monaco.IRange): monaco.languages.CompletionItem[] {
  const filtered = partial
    ? values.filter(v => v.toLowerCase().startsWith(partial.toLowerCase()))
    : values

  return filtered.map((value, idx) => {
    const isNumeric = /^-?\d+(?:\.\d+)?$/.test(value)
    const insertText = quote
      ? `${value}${quote}`
      : isNumeric
        ? value
        : `'${value}'`

    return {
      label: value,
      insertText,
      kind: monaco.languages.CompletionItemKind.Value,
      detail: 'Possible value from mnemonic range',
      range,
      sortText: `3_${String(idx).padStart(4, '0')}_${value}`,
    }
  })
}

async function provideTmSuggestions(model: monaco.editor.ITextModel, position: monaco.Position) {
  const range = makeRange(position, model)
  const linePrefix = model.getLineContent(position.lineNumber).slice(0, Math.max(0, position.column - 1))

  if (/\bTM$/i.test(linePrefix)) {
    return { suggestions: buildTmRootSuggestion(range) }
  }

  const subsystemCtx = linePrefix.match(/\bTM\.([A-Z0-9_]*)$/i)
  if (subsystemCtx) {
    const subsystems = await fetchSubsystems()
    const partial = String(subsystemCtx[1] || '').toUpperCase()
    const filtered = partial
      ? subsystems.filter(sub => sub.toUpperCase().startsWith(partial))
      : subsystems
    const prefixLength = 3 + (subsystemCtx[1]?.length || 0)
    const tmRange = makeTmRange(position, prefixLength)
    return { suggestions: buildSubsystemSuggestions(filtered, tmRange) }
  }

  const pidMnemonicCtx = linePrefix.match(/\bTM\.([A-Z0-9_]+)\.([\w.+-]*)$/i)
  if (pidMnemonicCtx) {
    const subsystem = (pidMnemonicCtx[1] || '').toUpperCase()
    const partial = (pidMnemonicCtx[2] || '').toUpperCase()
    const all = await fetchPidMnemonics(subsystem)
    const filtered = partial ? all.filter(v => v.toUpperCase().startsWith(partial)) : all
    const prefixLength = 3 + subsystem.length + 1 + (pidMnemonicCtx[2]?.length || 0)
    const tmRange = makeTmRange(position, prefixLength)
    return { suggestions: buildPidMnemonicSuggestions(filtered, tmRange, subsystem) }
  }

  const opCtxBracket = linePrefix.match(/\bTM\[["']([\w.+-]+)["']\]\s*(==|!=|>=|<=|>|<)\s*(?:(["'])([^"']*)|([\w.+-]*))$/i)
  const opCtxQuoted = linePrefix.match(/\bTM\.([A-Z0-9_]+)\.([\w.+-]+)\s*(==|!=|>=|<=|>|<)\s*(["'])([^"']*)$/i)
  const opCtxBare = linePrefix.match(/\bTM\.([A-Z0-9_]+)\.([\w.+-]+)\s*(==|!=|>=|<=|>|<)\s*([\w.+-]*)$/i)

  if (opCtxBracket || opCtxQuoted || opCtxBare) {
    let pidMnemonic = ''
    let partial = ''
    let quote: '"' | '\'' | '' = ''

    if (opCtxBracket) {
      pidMnemonic = String(opCtxBracket[1] || '').toUpperCase()
      partial = String(opCtxBracket[4] ?? opCtxBracket[5] ?? '')
      quote = (opCtxBracket[3] as '"' | '\'' | undefined) || ''
    }
    else {
      pidMnemonic = String(opCtxQuoted?.[2] || opCtxBare?.[2] || '').toUpperCase()
      partial = String(opCtxQuoted?.[5] || opCtxBare?.[4] || '')
      quote = (opCtxQuoted?.[4] as '"' | '\'' | undefined) || ''
    }

    if (pidMnemonic) {
      let values = await fetchRangeForPidMnemonic(pidMnemonic)
      if (values.length === 0)
        values = await fetchRangeForPidMnemonic(pidMnemonic, true)
      if (values.length > 0) {
        return { suggestions: buildRangeValueSuggestions(values, partial, quote, range) }
      }
    }
  }

  return { suggestions: buildOperatorSuggestions(range) }
}

function registerCompletions() {
  const g = globalThis as Record<string, any>
  const existingDisposables = g[COMPLETION_DISPOSABLE_KEY] as monaco.IDisposable[] | undefined
  for (const d of existingDisposables || [])
    d.dispose()

  const provider = {
    triggerCharacters: [' ', '.', '_', ':', '=', '!', '>', '<', '\'', '"'],
    provideCompletionItems(model: monaco.editor.ITextModel, position: monaco.Position) {
      return provideTmSuggestions(model, position)
    },
  }

  const disposables: monaco.IDisposable[] = [
    monaco.languages.registerCompletionItemProvider(LANGUAGE_ID, provider),
  ]

  g[COMPLETION_DISPOSABLE_KEY] = disposables
}

function handleEditorMount(editor: any) {
  editorInstance = editor as monaco.editor.IStandaloneCodeEditor

  const model = editorInstance.getModel()
  if (model)
    monaco.editor.setModelLanguage(model, LANGUAGE_ID)

  contentListener?.dispose()
  contentListener = editorInstance.onDidChangeModelContent(() => {
    if (!editorInstance)
      return

    const model = editorInstance.getModel()
    const position = editorInstance.getPosition()
    if (!model || !position)
      return

    const linePrefix = model.getLineContent(position.lineNumber).slice(0, Math.max(0, position.column - 1))

    if (
      /\bTM\.$/i.test(linePrefix)
      || /\bTM\.[A-Z0-9_]+\.$/i.test(linePrefix)
      || /\bTM\.[A-Z0-9_]+\.[\w.+-]+\s*(?:==|!=|>=|<=|>|<)\s*["']?$/i.test(linePrefix)
      || /\bTM\[["'][\w.+-]+["']\]\s*(?:==|!=|>=|<=|>|<)\s*["']?$/i.test(linePrefix)
    ) {
      editorInstance.trigger('keyboard', 'editor.action.triggerSuggest', {})
    }
  })
}

onMounted(() => {
  ensureMonacoWorkers()
  registerLanguage()
  configureJavascriptDefaults()
  registerCompletions()
  void fetchSubsystems()
})

onBeforeUnmount(() => {
  contentListener?.dispose()
  contentListener = null
  editorInstance = null
})
</script>

<template>
  <MonacoEditor
    :value="props.modelValue"
    :language="LANGUAGE_ID"
    path="condition.js"
    theme="vs-dark"
    :height="props.height"
    :options="editorOptions"
    @mount="handleEditorMount"
    @update:value="emit('update:modelValue', ($event ?? '') as string)"
  />
</template>
