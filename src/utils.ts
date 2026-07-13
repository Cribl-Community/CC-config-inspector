// Flatten a nested object to dot-notation paths
export function flattenObject(
  obj: Record<string, unknown>,
  prefix = '',
  result: Record<string, unknown> = {}
): Record<string, unknown> {
  for (const key of Object.keys(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key
    const val = obj[key]
    if (val !== null && typeof val === 'object' && !Array.isArray(val)) {
      flattenObject(val as Record<string, unknown>, fullKey, result)
    } else {
      result[fullKey] = val
    }
  }
  return result
}

// Highlight search term in a string (returns HTML)
export function highlightText(text: string, query: string): string {
  if (!query.trim()) return escapeHtml(text)
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const regex = new RegExp(`(${escaped})`, 'gi')
  return escapeHtml(text).replace(
    regex,
    '<span class="highlight-match">$1</span>'
  )
}

function escapeHtml(str: string): string {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export function formatValue(val: unknown): string {
  if (val === null) return 'null'
  if (val === undefined) return 'undefined'
  if (typeof val === 'string') return val
  if (typeof val === 'boolean') return val ? 'true' : 'false'
  if (typeof val === 'number') return String(val)
  if (Array.isArray(val)) {
    if (val.length === 0) return '[]'
    if (val.length <= 3 && val.every((v) => typeof v !== 'object')) {
      return `[${val.join(', ')}]`
    }
    return `[Array(${val.length})]`
  }
  if (typeof val === 'object') return JSON.stringify(val)
  return String(val)
}

export function getValueColor(val: unknown): string {
  if (typeof val === 'boolean') return val ? 'text-green-400' : 'text-red-400'
  if (typeof val === 'number') return 'text-blue-400'
  if (val === null || val === undefined) return 'text-cribl-muted'
  if (Array.isArray(val)) return 'text-yellow-400'
  if (typeof val === 'object') return 'text-purple-400'
  return 'text-emerald-300'
}

export function sourceColor(layer: string): string {
  if (layer.startsWith('Worker Group')) return 'bg-blue-900 text-blue-300 border-blue-700'
  if (layer.startsWith('Leader (System)')) return 'bg-purple-900 text-purple-300 border-purple-700'
  if (layer.startsWith('Leader')) return 'bg-orange-900 text-orange-300 border-orange-700'
  return 'bg-slate-700 text-slate-300 border-slate-500'
}