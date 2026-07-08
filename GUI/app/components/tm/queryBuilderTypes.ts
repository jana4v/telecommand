export interface ConditionRule {
  id: string
  type: 'rule' | 'group'
  condition?: string
  value?: string
  mnemonic?: string
  mnemonicType?: string   // 'BINARY' | 'ANALOG' — drives value quoting in code gen
  operator?: string
  rules?: ConditionRule[]
  negate?: boolean
}

export interface QueryBuilderMnemonic {
  mnemonic: string
  type: string
  unit: string
  subsystem?: string
  pid?: string
  valueSuggestions?: string[]
  defaultValue?: string
  minValue?: number | null
  maxValue?: number | null
  tolerance?: number | string | null
}
