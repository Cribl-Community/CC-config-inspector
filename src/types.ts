export type ConfigCategory =
  | 'pipelines'
  | 'routes'
  | 'inputs'
  | 'outputs'
  | 'functions'
  | 'lookups'
  | 'parsers'
  | 'system'
  | 'groups'

export interface ConfigSource {
  layer: string        // e.g. "Worker Group: prod", "Leader Default", "System"
  scope: string        // e.g. group ID
  priority: number     // lower = higher priority
}

export interface ConfigEntry {
  id: string
  category: ConfigCategory
  type?: string
  label?: string
  config: Record<string, unknown>
  source: ConfigSource
  groupId?: string
}

export interface Group {
  id: string
  name?: string
  product?: string
  configVersion?: string
  workerCount?: number
  isSearch?: boolean
}

export interface FlatField {
  path: string
  value: unknown
  source: ConfigSource
}