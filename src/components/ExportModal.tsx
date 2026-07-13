import { useState, useCallback } from 'react'
import type { ConfigCategory, ConfigEntry } from '../types'
import { flattenObject, formatValue } from '../utils'

const CATEGORY_LABELS: Record<ConfigCategory, string> = {
  pipelines: 'Pipelines',
  routes: 'Routes',
  inputs: 'Inputs',
  outputs: 'Outputs',
  functions: 'Functions',
  lookups: 'Lookups',
  parsers: 'Parsers',
  system: 'System Info',
  groups: 'Groups',
}

type ExportFormat = 'json' | 'csv' | 'txt'
type ExportScope = 'current' | 'all'

interface ExportModalProps {
  entries: ConfigEntry[]
  activeCategory: ConfigCategory
  selectedGroup: string
  allCategories: ConfigCategory[]
  loadForExport: (cat: ConfigCategory, group: string, onProgress: (msg: string) => void) => Promise<ConfigEntry[]>
  onClose: () => void
}

function downloadFile(content: string, filename: string, mime: string) {
  const blob = new Blob([content], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

function entriesToCsv(entries: ConfigEntry[]): string {
  const rows: string[] = []

  // Collect all unique flat keys across all entries for consistent columns
  const allKeys = new Set<string>()
  const flatMaps: Record<string, unknown>[] = []

  for (const entry of entries) {
    const flat = flattenObject(entry.config)
    flatMaps.push(flat)
    for (const k of Object.keys(flat)) allKeys.add(k)
  }

  const sortedKeys = Array.from(allKeys).sort()
  const header = ['__id', '__category', '__source_layer', '__source_scope', ...sortedKeys]
  rows.push(header.map(csvCell).join(','))

  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i]
    const flat = flatMaps[i]
    const row = [
      entry.id,
      entry.category,
      entry.source.layer,
      entry.source.scope,
      ...sortedKeys.map((k) => formatValue(flat[k])),
    ]
    rows.push(row.map(csvCell).join(','))
  }

  return rows.join('\n')
}

function csvCell(val: string): string {
  if (val === undefined || val === null) return ''
  const str = String(val)
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

function entriesToTxt(entries: ConfigEntry[]): string {
  const lines: string[] = []
  lines.push('# Cribl btool — Configuration Export')
  lines.push(`# Generated: ${new Date().toISOString()}`)
  lines.push('')

  for (const entry of entries) {
    lines.push(`[${'─'.repeat(72)}]`)
    lines.push(`# ${entry.category} :: ${entry.id}`)
    lines.push(`# Source: ${entry.source.layer} (scope: ${entry.source.scope})`)
    if (entry.type) lines.push(`# Type: ${entry.type}`)
    if (entry.label) lines.push(`# Label: ${entry.label}`)
    lines.push('')

    const flat = flattenObject(entry.config)
    const maxKeyLen = Math.max(...Object.keys(flat).map((k) => k.length), 0)
    for (const [key, val] of Object.entries(flat)) {
      const padded = key.padEnd(maxKeyLen)
      lines.push(`  ${padded}  =  ${formatValue(val)}`)
    }
    lines.push('')
  }

  return lines.join('\n')
}

function scopeLabel(selectedGroup: string): string {
  if (selectedGroup === '__leader__') return 'leader'
  if (selectedGroup === '__all__') return 'all-groups'
  return selectedGroup
}

export function ExportModal({
  entries,
  activeCategory,
  selectedGroup,
  allCategories,
  loadForExport,
  onClose,
}: ExportModalProps) {
  const [format, setFormat] = useState<ExportFormat>('json')
  const [scope, setScope] = useState<ExportScope>('current')
  const [selectedCats, setSelectedCats] = useState<Set<ConfigCategory>>(
    new Set(allCategories)
  )
  const [exporting, setExporting] = useState(false)
  const [exportProgress, setExportProgress] = useState('')
  const [done, setDone] = useState(false)
  const [exportedFilename, setExportedFilename] = useState('')

  const toggleCat = (cat: ConfigCategory) => {
    setSelectedCats((prev) => {
      const next = new Set(prev)
      if (next.has(cat)) {
        if (next.size === 1) return prev // keep at least one
        next.delete(cat)
      } else {
        next.add(cat)
      }
      return next
    })
  }

  const selectAll = () => setSelectedCats(new Set(allCategories))
  const selectNone = () => setSelectedCats(new Set([activeCategory]))

  const handleExport = useCallback(async () => {
    setExporting(true)
    setDone(false)
    setExportProgress('Preparing…')

    try {
      let allEntries: ConfigEntry[] = []

      if (scope === 'current') {
        // Use already-loaded entries, filtered to selected categories
        allEntries = entries
        setExportProgress('Using current view…')
      } else {
        // Load each selected category
        const cats = Array.from(selectedCats)
        for (let i = 0; i < cats.length; i++) {
          const cat = cats[i]
          setExportProgress(`Loading ${CATEGORY_LABELS[cat]} (${i + 1}/${cats.length})…`)
          const catEntries = await loadForExport(cat, selectedGroup, (msg) => setExportProgress(msg))
          allEntries.push(...catEntries)
        }
      }

      setExportProgress('Generating file…')
      const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
      const scopePart = scopeLabel(selectedGroup)
      const catPart = scope === 'current' ? activeCategory : 'all'

      let content = ''
      let filename = ''
      let mime = 'text/plain'

      if (format === 'json') {
        const exportObj = {
          meta: {
            exportedAt: new Date().toISOString(),
            scope: scopePart,
            categories: scope === 'current' ? [activeCategory] : Array.from(selectedCats),
            totalItems: allEntries.length,
          },
          items: allEntries.map((e) => ({
            id: e.id,
            category: e.category,
            type: e.type,
            label: e.label,
            source: e.source,
            groupId: e.groupId,
            config: e.config,
          })),
          // Also provide a by-category view
          byCategory: Object.fromEntries(
            (scope === 'current' ? [activeCategory] : Array.from(selectedCats)).map((cat) => [
              cat,
              allEntries.filter((e) => e.category === cat).map((e) => ({
                id: e.id,
                source: e.source,
                config: e.config,
              })),
            ])
          ),
        }
        content = JSON.stringify(exportObj, null, 2)
        filename = `cribl-btool-${scopePart}-${catPart}-${ts}.json`
        mime = 'application/json'
      } else if (format === 'csv') {
        content = entriesToCsv(allEntries)
        filename = `cribl-btool-${scopePart}-${catPart}-${ts}.csv`
        mime = 'text/csv'
      } else {
        content = entriesToTxt(allEntries)
        filename = `cribl-btool-${scopePart}-${catPart}-${ts}.txt`
        mime = 'text/plain'
      }

      downloadFile(content, filename, mime)
      setExportedFilename(filename)
      setDone(true)
      setExportProgress('')
    } catch (err) {
      console.error('Export failed:', err)
      setExportProgress('Export failed — check console for details')
    } finally {
      setExporting(false)
    }
  }, [scope, format, selectedCats, entries, activeCategory, selectedGroup, loadForExport])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-cribl-panel border border-cribl-border rounded-lg shadow-2xl w-full max-w-lg mx-4 flex flex-col max-h-[90vh] overflow-hidden">

        {/* Modal header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-cribl-border shrink-0">
          <div className="flex items-center justify-center w-7 h-7 rounded bg-cribl-orange/20">
            <svg className="w-4 h-4 text-cribl-orange" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
          </div>
          <div>
            <div className="text-sm font-semibold text-cribl-text">Export Configuration</div>
            <div className="text-xs text-cribl-muted">Download config as JSON, CSV, or plain text</div>
          </div>
          <div className="flex-1" />
          <button onClick={onClose} className="text-cribl-muted hover:text-cribl-text text-xl leading-none">×</button>
        </div>

        {/* Modal body */}
        <div className="px-5 py-4 space-y-5 overflow-y-auto flex-1">

          {/* Format selector */}
          <div>
            <label className="block text-xs font-semibold text-cribl-muted uppercase tracking-widest mb-2">
              Format
            </label>
            <div className="flex gap-2">
              {(['json', 'csv', 'txt'] as ExportFormat[]).map((f) => (
                <button
                  key={f}
                  onClick={() => setFormat(f)}
                  className={`flex-1 py-2 rounded border text-xs mono font-medium transition-colors ${
                    format === f
                      ? 'bg-cribl-orange text-white border-cribl-orange'
                      : 'bg-cribl-dark border-cribl-border text-cribl-muted hover:text-cribl-text hover:border-slate-500'
                  }`}
                >
                  {f.toUpperCase()}
                  <div className={`text-xs font-normal mt-0.5 ${format === f ? 'text-orange-200' : 'text-cribl-muted'}`}>
                    {f === 'json' && 'Structured'}
                    {f === 'csv' && 'Spreadsheet'}
                    {f === 'txt' && 'btool-style'}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Scope selector */}
          <div>
            <label className="block text-xs font-semibold text-cribl-muted uppercase tracking-widest mb-2">
              What to export
            </label>
            <div className="flex gap-2">
              <button
                onClick={() => setScope('current')}
                className={`flex-1 py-2 px-3 rounded border text-xs transition-colors ${
                  scope === 'current'
                    ? 'bg-cribl-orange/15 border-cribl-orange text-cribl-orange'
                    : 'bg-cribl-dark border-cribl-border text-cribl-muted hover:text-cribl-text hover:border-slate-500'
                }`}
              >
                <div className="font-medium">Current View</div>
                <div className={`text-xs mt-0.5 ${scope === 'current' ? 'text-orange-300' : 'text-cribl-muted'}`}>
                  {CATEGORY_LABELS[activeCategory]} — {entries.length} items loaded
                </div>
              </button>
              <button
                onClick={() => setScope('all')}
                className={`flex-1 py-2 px-3 rounded border text-xs transition-colors ${
                  scope === 'all'
                    ? 'bg-cribl-orange/15 border-cribl-orange text-cribl-orange'
                    : 'bg-cribl-dark border-cribl-border text-cribl-muted hover:text-cribl-text hover:border-slate-500'
                }`}
              >
                <div className="font-medium">All Categories</div>
                <div className={`text-xs mt-0.5 ${scope === 'all' ? 'text-orange-300' : 'text-cribl-muted'}`}>
                  Load & export selected types
                </div>
              </button>
            </div>
          </div>

          {/* Category checkboxes (only for "all" scope) */}
          {scope === 'all' && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-semibold text-cribl-muted uppercase tracking-widest">
                  Categories
                </label>
                <div className="flex gap-2">
                  <button onClick={selectAll} className="text-xs text-cribl-orange hover:underline">All</button>
                  <span className="text-cribl-border">·</span>
                  <button onClick={selectNone} className="text-xs text-cribl-orange hover:underline">None</button>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-1.5">
                {allCategories.map((cat) => {
                  const checked = selectedCats.has(cat)
                  return (
                    <label
                      key={cat}
                      className={`flex items-center gap-2 px-2.5 py-1.5 rounded border cursor-pointer transition-colors text-xs ${
                        checked
                          ? 'bg-cribl-orange/10 border-cribl-orange/40 text-cribl-text'
                          : 'bg-cribl-dark border-cribl-border text-cribl-muted hover:border-slate-500'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleCat(cat)}
                        className="accent-orange-500 w-3 h-3"
                      />
                      <span className="mono">{CATEGORY_LABELS[cat]}</span>
                    </label>
                  )
                })}
              </div>
            </div>
          )}

          {/* Format description */}
          <div className="bg-cribl-dark border border-cribl-border rounded p-3 text-xs text-cribl-muted">
            {format === 'json' && (
              <>
                <span className="text-cribl-orange font-semibold">JSON</span> — Full structured export with metadata, flat items array, and a <span className="mono">byCategory</span> index. Best for programmatic use or re-importing.
              </>
            )}
            {format === 'csv' && (
              <>
                <span className="text-cribl-orange font-semibold">CSV</span> — Flat key=value table. All nested config keys are dot-notation columns. Best for spreadsheets or diff tools. One row per config item.
              </>
            )}
            {format === 'txt' && (
              <>
                <span className="text-cribl-orange font-semibold">TXT</span> — btool-style plain text output. Each item is a labelled block with aligned key = value rows. Best for reading, sharing, or pasting into tickets.
              </>
            )}
          </div>
        </div>

        {/* Modal footer */}
        <div className="px-5 py-4 border-t border-cribl-border shrink-0 flex items-center gap-3">
          {/* Progress / done message */}
          <div className="flex-1 text-xs">
            {exporting && (
              <div className="flex items-center gap-2 text-cribl-orange">
                <svg className="animate-spin w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                {exportProgress}
              </div>
            )}
            {done && !exporting && (
              <div className="flex items-center gap-2 text-green-400">
                <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span className="mono truncate">{exportedFilename}</span>
              </div>
            )}
          </div>

          <button
            onClick={onClose}
            className="text-xs text-cribl-muted hover:text-cribl-text border border-cribl-border hover:border-slate-500 rounded px-3 py-1.5 transition-colors"
          >
            {done ? 'Close' : 'Cancel'}
          </button>
          <button
            onClick={handleExport}
            disabled={exporting}
            className="flex items-center gap-1.5 text-xs bg-cribl-orange hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded px-4 py-1.5 font-medium transition-colors"
          >
            {exporting ? (
              <>
                <svg className="animate-spin w-3.5 h-3.5" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                Exporting…
              </>
            ) : (
              <>
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Download {format.toUpperCase()}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}