import { useState, useEffect, useCallback } from 'react'
import type { ConfigCategory, ConfigEntry, Group } from './types'
import { fetchGroups, loadCategory } from './api'
import { Header } from './components/Header'
import { Sidebar } from './components/Sidebar'
import { ConfigViewer } from './components/ConfigViewer'
import { ExportModal } from './components/ExportModal'

const ALL_CATEGORIES: ConfigCategory[] = [
  'pipelines', 'routes', 'inputs', 'outputs', 'functions',
  'lookups', 'parsers', 'system', 'groups',
]

export default function App() {
  const [groups, setGroups] = useState<Group[]>([])
  const [selectedGroup, setSelectedGroup] = useState<string>('__leader__')
  const [activeCategory, setActiveCategory] = useState<ConfigCategory>('pipelines')
  const [searchQuery, setSearchQuery] = useState('')
  const [entries, setEntries] = useState<ConfigEntry[]>([])
  const [loading, setLoading] = useState(false)
  const [progressMsg, setProgressMsg] = useState('')
  const [counts, setCounts] = useState<Partial<Record<ConfigCategory, number>>>({})
  const [cache, setCache] = useState<Map<string, ConfigEntry[]>>(new Map())
  const [showExport, setShowExport] = useState(false)

  useEffect(() => {
    fetchGroups().then((gs) => {
      setGroups(gs.filter((g) => !g.isSearch))
    })
  }, [])

  const cacheKey = useCallback(
    (cat: ConfigCategory, grp: string) => `${cat}::${grp}`,
    []
  )

  const loadEntries = useCallback(
    async (category: ConfigCategory, groupScope: string) => {
      const key = cacheKey(category, groupScope)
      if (cache.has(key)) {
        const cached = cache.get(key)!
        setEntries(cached)
        setCounts((prev) => ({ ...prev, [category]: cached.length }))
        return
      }

      setLoading(true)
      setEntries([])
      setProgressMsg('Initializing…')

      try {
        let scopedGroups: Group[] = []
        if (groupScope === '__leader__') {
          scopedGroups = []
        } else if (groupScope === '__all__') {
          scopedGroups = groups
        } else {
          scopedGroups = groups.filter((g) => g.id === groupScope)
        }

        const result = await loadCategory(category, scopedGroups, (msg) => setProgressMsg(msg))
        setEntries(result)
        setCounts((prev) => ({ ...prev, [category]: result.length }))
        setCache((prev) => new Map(prev).set(key, result))
      } catch (err) {
        console.error('Failed to load config:', err)
        setEntries([])
      } finally {
        setLoading(false)
        setProgressMsg('')
      }
    },
    [groups, cache, cacheKey]
  )

  useEffect(() => {
    loadEntries(activeCategory, selectedGroup)
  }, [activeCategory, selectedGroup, groups]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleCategorySelect = (cat: ConfigCategory) => {
    setActiveCategory(cat)
    setSearchQuery('')
  }

  const handleGroupChange = (g: string) => {
    setSelectedGroup(g)
    setCache(new Map())
  }

  // Load a category for export, using cache if available
  const loadForExport = useCallback(
    async (category: ConfigCategory, groupScope: string, onProgress: (msg: string) => void): Promise<ConfigEntry[]> => {
      const key = cacheKey(category, groupScope)
      if (cache.has(key)) return cache.get(key)!

      let scopedGroups: Group[] = []
      if (groupScope === '__leader__') {
        scopedGroups = []
      } else if (groupScope === '__all__') {
        scopedGroups = groups
      } else {
        scopedGroups = groups.filter((g) => g.id === groupScope)
      }

      const result = await loadCategory(category, scopedGroups, onProgress)
      setCache((prev) => new Map(prev).set(key, result))
      return result
    },
    [groups, cache, cacheKey]
  )

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-cribl-dark text-cribl-text">
      <Header
        groups={groups}
        selectedGroup={selectedGroup}
        onGroupChange={handleGroupChange}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        loading={loading}
        onExport={() => setShowExport(true)}
      />
      <div className="flex flex-1 min-h-0">
        <Sidebar
          active={activeCategory}
          onSelect={handleCategorySelect}
          counts={counts}
        />
        <main className="flex-1 flex flex-col min-w-0 min-h-0">
          {/* Breadcrumb */}
          <div className="px-4 py-2 border-b border-cribl-border bg-cribl-panel/50 flex items-center gap-2 text-xs text-cribl-muted shrink-0">
            <span className="mono text-cribl-orange">cribl btool</span>
            <span>›</span>
            <span className="mono">{activeCategory}</span>
            <span>›</span>
            <span className="mono">
              {selectedGroup === '__leader__'
                ? 'leader'
                : selectedGroup === '__all__'
                ? 'all-groups'
                : selectedGroup}
            </span>
            {searchQuery && (
              <>
                <span>›</span>
                <span className="mono text-cribl-orange">search: {searchQuery}</span>
              </>
            )}
          </div>
          <ConfigViewer
            entries={entries}
            searchQuery={searchQuery}
            category={activeCategory}
            loading={loading}
            progressMsg={progressMsg}
            onExportCurrent={() => setShowExport(true)}
          />
        </main>
      </div>

      {showExport && (
        <ExportModal
          entries={entries}
          activeCategory={activeCategory}
          selectedGroup={selectedGroup}
          allCategories={ALL_CATEGORIES}
          loadForExport={loadForExport}
          onClose={() => setShowExport(false)}
        />
      )}
    </div>
  )
}