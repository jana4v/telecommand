import type { ConditionRule } from '@/components/tm/queryBuilderTypes'

export type LogicTokenType = 'LPAREN' | 'RPAREN' | 'AND' | 'OR' | 'NOT' | 'IDENT' | 'OP' | 'VALUE'

export interface LogicToken {
  type: LogicTokenType
  value: string
  quoted?: boolean  // true when the token was a quoted string literal in source
}

export function formatMnemonicRef(mnemonic: string): string {
  const raw = String(mnemonic || '').trim()
  if (!raw)
    return ''
  if (/^TM\[["'][^"']+["']\]$/.test(raw))
    return raw
  return `TM["${raw}"]`
}

export function tokenizeLogic(input: string): LogicToken[] {
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
      tokens.push({ type: 'VALUE', value, quoted: true })
      continue
    }

    const word = /^[\w:.+-]+/.exec(rest)?.[0]
    if (word) {
      const upper = word.toUpperCase()
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

export function parseLogicToRule(logic: string): ConditionRule | null {
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

    // Infer mnemonicType from how the value was written in source:
    //   quoted string → BINARY (digital state)
    //   bare number   → ANALOG
    //   bare word     → unknown (leave undefined; generator falls back to quoting)
    const mnemonicType = value.quoted
      ? 'BINARY'
      : /^-?\d+(?:\.\d+)?$/.test(value.value) ? 'ANALOG' : undefined

    return {
      id: nextId('rule'),
      type: 'rule',
      mnemonic: mnemonic.value,
      condition: operator.value,
      value: value.value,
      mnemonicType,
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

export function generateLogicFromRules(rule: ConditionRule, depth = 0): string {
  if (rule.type === 'rule') {
    if (!rule.mnemonic || !rule.condition)
      return ''
    const ref = formatMnemonicRef(rule.mnemonic)
    const rawValue = String(rule.value ?? '').trim()
    // Use mnemonicType when available (set by the visual builder and inferred
    // by the parser from quoted/unquoted tokens).  Fall back to quoting anything
    // that isn't a bare number only when the type is genuinely unknown.
    const isBinary = rule.mnemonicType
      ? rule.mnemonicType.toUpperCase() === 'BINARY'
      : !/^-?\d+(?:\.\d+)?$/.test(rawValue)
    const renderedValue = rawValue.length === 0
      ? '""'
      : isBinary ? `"${rawValue}"` : rawValue
    let result = `${ref} ${rule.condition} ${renderedValue}`
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
