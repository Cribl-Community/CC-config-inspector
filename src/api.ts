import type { ConfigCategory, ConfigEntry, Group } from './types'

const BASE = CRIBL_API_URL

// ─── Groups ───────────────────────────────────────────────────────────────────

export async function fetchGroups(): Promise<Group[]> {
  const res = await fetch(`${BASE}/master/groups`)
  if (!res.ok) return []
  const text = await res.text()
  const data = JSON.parse(text)
  const items: Record<string, unknown>[] = data?.items ?? []
  return items.map((g: Record<string, unknown>) => ({
    id: g.id as string,
    name: (g.name as string) ?? (g.id as string),
    product: g.product as string | undefined,
    configVersion: g.configVersion as string | undefined,
    workerCount: g.workerCount as number | undefined,
    isSearch: (g.id as string) === 'default_search',
  }))
}

// ─── Generic fetcher for a group context ─────────────────────────────────────

async function fetchGroupResource(
  groupId: string,
  resource: string
): Promise<Record<string, unknown>[]> {
  const url = `${BASE}/m/${encodeURIComponent(groupId)}/${resource}`
  try {
    const res = await fetch(url)
    if (!res.ok) return []
    const text = await res.text()
    const data = JSON.parse(text)
    return (data?.items ?? []) as Record<string, unknown>[]
  } catch {
    return []
  }
}

// ─── Leader-level fetchers ────────────────────────────────────────────────────

async function fetchLeaderResource(
  resource: string
): Promise<Record<string, unknown>[]> {
  const url = `${BASE}/${resource}`
  try {
    const res = await fetch(url)
    if (!res.ok) return []
    const text = await res.text()
    const data = JSON.parse(text)
    return (data?.items ?? []) as Record<string, unknown>[]
  } catch {
    return []
  }
}

// ─── System Info ──────────────────────────────────────────────────────────────

export async function fetchSystemInfo(): Promise<Record<string, unknown>> {
  try {
    const res = await fetch(`${BASE}/system/info`)
    if (!res.ok) return {}
    const text = await res.text()
    const data = JSON.parse(text)
    return (data?.items?.[0] ?? {}) as Record<string, unknown>
  } catch {
    return {}
  }
}

// ─── Config loaders per category ─────────────────────────────────────────────

const RESOURCE_MAP: Record<ConfigCategory, string> = {
  pipelines: 'pipelines',
  routes: 'routes',
  inputs: 'inputs',
  outputs: 'outputs',
  functions: 'functions',
  lookups: 'lookups',
  parsers: 'parsers',
  system: '',   // special case
  groups: '',   // special case
}

export async function fetchCategoryForGroup(
  category: ConfigCategory,
  group: Group
): Promise<ConfigEntry[]> {
  if (category === 'system' || category === 'groups') return []

  const resource = RESOURCE_MAP[category]
  if (!resource) return []

  const items = await fetchGroupResource(group.id, resource)

  return items.map((item) => ({
    id: (item.id as string) ?? (item.type as string) ?? 'unknown',
    category,
    type: item.type as string | undefined,
    label: (item.description as string) ?? (item.name as string) ?? undefined,
    config: item as Record<string, unknown>,
    source: {
      layer: `Worker Group: ${group.id}`,
      scope: group.id,
      priority: 1,
    },
    groupId: group.id,
  }))
}

export async function fetchCategoryLeader(
  category: ConfigCategory
): Promise<ConfigEntry[]> {
  if (category === 'system') {
    const info = await fetchSystemInfo()
    if (!info || Object.keys(info).length === 0) return []
    return [{
      id: 'system-info',
      category: 'system',
      label: 'System Information',
      config: info,
      source: {
        layer: 'Leader (System)',
        scope: 'leader',
        priority: 0,
      },
    }]
  }

  if (category === 'groups') {
    const groups = await fetchLeaderResource('master/groups')
    return groups.map((g) => ({
      id: (g.id as string) ?? 'unknown',
      category: 'groups',
      label: (g.name as string) ?? (g.id as string),
      config: g,
      source: {
        layer: 'Leader (Groups)',
        scope: 'leader',
        priority: 0,
      },
    }))
  }

  const resource = RESOURCE_MAP[category]
  if (!resource) return []

  const items = await fetchLeaderResource(resource)
  return items.map((item) => ({
    id: (item.id as string) ?? 'unknown',
    category,
    type: item.type as string | undefined,
    label: (item.description as string) ?? (item.name as string) ?? undefined,
    config: item as Record<string, unknown>,
    source: {
      layer: 'Leader (Default)',
      scope: 'leader',
      priority: 10,
    },
  }))
}

// ─── Full load for a category across all groups ───────────────────────────────

export async function loadCategory(
  category: ConfigCategory,
  groups: Group[],
  onProgress?: (msg: string) => void
): Promise<ConfigEntry[]> {
  const all: ConfigEntry[] = []

  // Leader-level
  onProgress?.('Loading leader config…')
  const leaderItems = await fetchCategoryLeader(category)
  all.push(...leaderItems)

  // Per-group (skip search group for non-search categories)
  for (const g of groups) {
    if (g.isSearch) continue
    onProgress?.(`Loading ${category} for group: ${g.id}…`)
    const items = await fetchCategoryForGroup(category, g)
    all.push(...items)
  }

  return all
}