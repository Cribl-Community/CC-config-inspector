import { useState, useMemo } from 'react'
import type { ConfigEntry } from '../types'
import { flattenObject, highlightText, formatValue, getValueColor, sourceColor } from '../utils'

interface ConfigViewerProps {
  entries: ConfigEntry[]
  searchQuery: string
  category: string
  loading: boolean
  progressMsg: string
  onExportCurrent: () => void
}

type ViewMode = 'flat' | 'tree' | 'json'

export function ConfigViewer({ entries, searchQuery, category, loading, progressMsg, onExportCurrent }: ConfigViewerProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('flat')
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())
  const [selectedEntry, setSelectedEntry] = useState<ConfigEntry | null>(null)
  const [copyMsg, setCopyMsg] = useState('')

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const filteredEntries = useMemo(() => {
    if (!searchQuery.trim()) return entries
    const q = searchQuery.toLowerCase()
    return entries.filter((entry) => {
      const flat = flattenObject(entry.config)
      const idMatch = entry.id.toLowerCase().includes(q)
      const labelMatch = (entry.label ?? '').toLowerCase().includes(q)
      const typeMatch = (entry.type ?? '').toLowerCase().includes(q)
      const sourceMatch = entry.source.layer.toLowerCase().includes(q)
      const fieldMatch = Object.entries(flat).some(
        ([k, v]) =>
          k.toLowerCase().includes(q) ||
          formatValue(v).toLowerCase().includes(q)
      )
      return idMatch || labelMatch || typeMatch || sourceMatch || fieldMatch
    })
  }, [entries, searchQuery])

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopyMsg('Copied!')
      setTimeout(() => setCopyMsg(''), 1500)
    } catch {
      setCopyMsg('Failed')
    }
  }

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-3 text-cribl-muted">
        <svg className="animate-spin w-8 h-8 text-cribl-orange" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
        </svg>
        <div className="text-sm">{progressMsg || 'Loading configuration…'}</div>
      </div>
    )
  }

  if (filteredEntries.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-2 text-cribl-muted">
        <div className="text-4xl opacity-30">∅</div>
        <div className="text-sm">
          {searchQuery ? `No results for "${searchQuery}"` : `No ${category} configuration found`}
        </div>
        {searchQuery && (
          <div className="text-xs mt-1">Try a different search term or change the scope</div>
        )}
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Toolbar */}
      <div className="px-4 py-2 border-b border-cribl-border flex items-center gap-3 bg-cribl-panel shrink-0">
        <div className="text-xs text-cribl-muted">
          <span className="text-cribl-text font-medium">{filteredEntries.length}</span>
          {searchQuery && ` of ${entries.length}`} items
          {searchQuery && <span className="ml-2 text-cribl-orange">· filtered by "{searchQuery}"</span>}
        </div>
        <div className="flex-1" />
        {copyMsg && <span className="text-xs text-green-400 mono">{copyMsg}</span>}
        <button
          onClick={() => copyToClipboard(JSON.stringify(filteredEntries.map(e => e.config), null, 2))}
          className="text-xs text-cribl-muted hover:text-cribl-text border border-cribl-border hover:border-slate-500 rounded px-2 py-1 transition-colors"
        >
          Copy All JSON
        </button>
        <button
          onClick={onExportCurrent}
          className="flex items-center gap-1 text-xs text-cribl-muted hover:text-cribl-text border border-cribl-border hover:border-slate-500 rounded px-2 py-1 transition-colors"
        >
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          Export
        </button>
        <div className="flex rounded border border-cribl-border overflow-hidden">
          {(['flat', 'tree', 'json'] as ViewMode[]).map((m) => (
            <button
              key={m}
              onClick={() => setViewMode(m)}
              className={`text-xs px-2.5 py-1 transition-colors ${
                viewMode === m
                  ? 'bg-cribl-orange text-white'
                  : 'text-cribl-muted hover:text-cribl-text'
              }`}
            >
              {m}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {viewMode === 'flat' && (
          <FlatView entries={filteredEntries} searchQuery={searchQuery} onSelect={setSelectedEntry} selectedId={selectedEntry?.id ?? ''} />
        )}
        {viewMode === 'tree' && (
          <TreeView entries={filteredEntries} searchQuery={searchQuery} expandedIds={expandedIds} onToggle={toggleExpand} />
        )}
        {viewMode === 'json' && (
          <JsonView entries={filteredEntries} onCopy={copyToClipboard} />
        )}
      </div>

      {/* Detail panel */}
      {selectedEntry && viewMode === 'flat' && (
        <DetailPanel entry={selectedEntry} onClose={() => setSelectedEntry(null)} onCopy={copyToClipboard} />
      )}
    </div>
  )
}

// ─── Flat View ────────────────────────────────────────────────────────────────

function FlatView({
  entries,
  searchQuery,
  onSelect,
  selectedId,
}: {
  entries: ConfigEntry[]
  searchQuery: string
  onSelect: (e: ConfigEntry) => void
  selectedId: string
}) {
  return (
    <div className="divide-y divide-cribl-border/50">
      {entries.map((entry) => (
        <FlatRow
          key={`${entry.groupId ?? 'leader'}-${entry.id}`}
          entry={entry}
          searchQuery={searchQuery}
          isSelected={selectedId === entry.id}
          onClick={() => onSelect(entry)}
        />
      ))}
    </div>
  )
}

function FlatRow({
  entry,
  searchQuery,
  isSelected,
  onClick,
}: {
  entry: ConfigEntry
  searchQuery: string
  isSelected: boolean
  onClick: () => void
}) {
  const flat = useMemo(() => flattenObject(entry.config), [entry.config])

  const fields = useMemo(() => {
    const all = Object.entries(flat)
    if (!searchQuery.trim()) return all.slice(0, 12)
    const q = searchQuery.toLowerCase()
    const matched = all.filter(
      ([k, v]) =>
        k.toLowerCase().includes(q) ||
        formatValue(v).toLowerCase().includes(q)
    )
    return matched.length > 0 ? matched : all.slice(0, 6)
  }, [flat, searchQuery])

  const totalFields = Object.keys(flat).length

  return (
    <div
      className={`px-4 py-3 cursor-pointer transition-colors fade-in ${
        isSelected ? 'bg-cribl-orange/10 border-l-2 border-cribl-orange' : 'hover:bg-white/5 border-l-2 border-transparent'
      }`}
      onClick={onClick}
    >
      <div className="flex items-center gap-2 mb-2">
        <span
          className="text-xs font-semibold mono text-cribl-text"
          dangerouslySetInnerHTML={{ __html: highlightText(entry.id, searchQuery) }}
        />
        {entry.type && (
          <span className="text-xs mono bg-slate-700 text-slate-300 px-1.5 py-0.5 rounded">
            {entry.type}
          </span>
        )}
        {entry.label && (
          <span
            className="text-xs text-cribl-muted truncate max-w-xs"
            dangerouslySetInnerHTML={{ __html: highlightText(entry.label, searchQuery) }}
          />
        )}
        <div className="flex-1" />
        <span className={`text-xs px-2 py-0.5 rounded border ${sourceColor(entry.source.layer)} mono`}>
          {entry.source.layer}
        </span>
      </div>

      <div className="grid grid-cols-1 gap-0.5 ml-1">
        {fields.map(([key, val]) => (
          <div key={key} className="flex items-baseline gap-2 text-xs">
            <span
              className="text-cribl-muted mono shrink-0"
              dangerouslySetInnerHTML={{ __html: highlightText(key, searchQuery) }}
            />
            <span className="text-cribl-border">═</span>
            <span
              className={`mono truncate max-w-lg ${getValueColor(val)}`}
              dangerouslySetInnerHTML={{ __html: highlightText(formatValue(val), searchQuery) }}
            />
          </div>
        ))}
        {totalFields > fields.length && (
          <div className="text-xs text-cribl-muted italic mt-0.5">
            … {totalFields - fields.length} more fields — click to expand
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Tree View ────────────────────────────────────────────────────────────────

function TreeView({
  entries,
  searchQuery,
  expandedIds,
  onToggle,
}: {
  entries: ConfigEntry[]
  searchQuery: string
  expandedIds: Set<string>
  onToggle: (id: string) => void
}) {
  return (
    <div className="divide-y divide-cribl-border/50">
      {entries.map((entry) => {
        const uid = `${entry.groupId ?? 'leader'}-${entry.id}`
        const isOpen = expandedIds.has(uid)
        return (
          <div key={uid} className="fade-in">
            <button
              onClick={() => onToggle(uid)}
              className="w-full px-4 py-2.5 flex items-center gap-2 hover:bg-white/5 transition-colors text-left"
            >
              <span className={`text-xs transition-transform ${isOpen ? 'rotate-90' : ''} text-cribl-muted`}>▶</span>
              <span className="text-xs font-semibold mono text-cribl-text">{entry.id}</span>
              {entry.type && (
                <span className="text-xs mono bg-slate-700 text-slate-300 px-1.5 py-0.5 rounded">{entry.type}</span>
              )}
              <div className="flex-1" />
              <span className={`text-xs px-2 py-0.5 rounded border ${sourceColor(entry.source.layer)} mono`}>
                {entry.source.layer}
              </span>
            </button>

            {isOpen && (
              <div className="ml-8 mr-4 mb-3">
                <TreeNode obj={entry.config} depth={0} searchQuery={searchQuery} />
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

function TreeNode({
  obj,
  depth,
  searchQuery,
  keyName,
}: {
  obj: unknown
  depth: number
  searchQuery: string
  keyName?: string
}) {
  const [open, setOpen] = useState(depth < 2)

  if (obj === null || obj === undefined) {
    return (
      <div className="flex items-baseline gap-1.5 py-0.5">
        {keyName && <span className="text-xs mono text-cribl-muted">{keyName}:</span>}
        <span className="text-xs mono text-cribl-muted">null</span>
      </div>
    )
  }

  if (Array.isArray(obj)) {
    return (
      <div className="py-0.5">
        <button onClick={() => setOpen((o) => !o)} className="flex items-center gap-1 text-xs mono text-yellow-400 hover:text-yellow-300">
          {keyName && <span className="text-cribl-muted">{keyName}:</span>}
          <span>{open ? '▼' : '▶'} [{obj.length}]</span>
        </button>
        {open && (
          <div className="ml-4 border-l border-cribl-border/40 pl-3 mt-1">
            {obj.map((item, i) => (
              <TreeNode key={i} obj={item} depth={depth + 1} searchQuery={searchQuery} keyName={`[${i}]`} />
            ))}
          </div>
        )}
      </div>
    )
  }

  if (typeof obj === 'object') {
    const keys = Object.keys(obj as Record<string, unknown>)
    return (
      <div className="py-0.5">
        {keyName && (
          <button onClick={() => setOpen((o) => !o)} className="flex items-center gap-1 text-xs mono text-purple-400 hover:text-purple-300">
            <span className="text-cribl-muted">{keyName}:</span>
            <span>{open ? '▼' : '▶'} {'{'}…{'}'}</span>
          </button>
        )}
        {open && (
          <div className={`${keyName ? 'ml-4 border-l border-cribl-border/40 pl-3 mt-1' : ''}`}>
            {keys.map((k) => (
              <TreeNode
                key={k}
                obj={(obj as Record<string, unknown>)[k]}
                depth={depth + 1}
                searchQuery={searchQuery}
                keyName={k}
              />
            ))}
          </div>
        )}
      </div>
    )
  }

  const valStr = formatValue(obj)
  const matches = searchQuery && (
    keyName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    valStr.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className={`flex items-baseline gap-1.5 py-0.5 px-1 rounded ${matches ? 'bg-cribl-orange/10' : ''}`}>
      {keyName && (
        <span
          className="text-xs mono text-cribl-muted shrink-0"
          dangerouslySetInnerHTML={{ __html: highlightText(keyName, searchQuery) }}
        />
      )}
      {keyName && <span className="text-cribl-border text-xs">:</span>}
      <span
        className={`text-xs mono ${getValueColor(obj)}`}
        dangerouslySetInnerHTML={{ __html: highlightText(valStr, searchQuery) }}
      />
    </div>
  )
}

// ─── JSON View ────────────────────────────────────────────────────────────────

function JsonView({
  entries,
  onCopy,
}: {
  entries: ConfigEntry[]
  onCopy: (s: string) => void
}) {
  const json = JSON.stringify(
    entries.map((e) => ({
      id: e.id,
      category: e.category,
      source: e.source,
      config: e.config,
    })),
    null,
    2
  )

  return (
    <div className="relative">
      <button
        onClick={() => onCopy(json)}
        className="absolute top-3 right-3 z-10 text-xs text-cribl-muted hover:text-cribl-text border border-cribl-border hover:border-slate-500 rounded px-2 py-1 bg-cribl-dark transition-colors"
      >
        Copy
      </button>
      <pre className="text-xs mono text-cribl-text p-4 whitespace-pre-wrap break-all leading-relaxed">
        {json}
      </pre>
    </div>
  )
}

// ─── Detail Panel ─────────────────────────────────────────────────────────────

function DetailPanel({
  entry,
  onClose,
  onCopy,
}: {
  entry: ConfigEntry
  onClose: () => void
  onCopy: (s: string) => void
}) {
  const flat = flattenObject(entry.config)

  return (
    <div className="border-t border-cribl-border bg-cribl-dark shrink-0 max-h-72 overflow-y-auto">
      <div className="flex items-center gap-2 px-4 py-2 bg-cribl-panel border-b border-cribl-border sticky top-0">
        <span className="text-xs font-semibold text-cribl-text mono">{entry.id}</span>
        {entry.type && (
          <span className="text-xs bg-slate-700 text-slate-300 px-1.5 py-0.5 rounded mono">{entry.type}</span>
        )}
        <span className={`text-xs px-2 py-0.5 rounded border ${sourceColor(entry.source.layer)} mono`}>
          {entry.source.layer}
        </span>
        <div className="flex-1" />
        <button
          onClick={() => onCopy(JSON.stringify(entry.config, null, 2))}
          className="text-xs text-cribl-muted hover:text-cribl-text border border-cribl-border rounded px-2 py-1"
        >
          Copy JSON
        </button>
        <button onClick={onClose} className="text-cribl-muted hover:text-cribl-text text-lg leading-none ml-1">×</button>
      </div>
      <div className="p-4 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-6 gap-y-1.5">
        {Object.entries(flat).map(([key, val]) => (
          <div key={key} className="flex flex-col gap-0.5">
            <div className="text-xs text-cribl-muted mono truncate" title={key}>{key}</div>
            <div className={`text-xs mono truncate ${getValueColor(val)}`} title={formatValue(val)}>
              {formatValue(val)}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}