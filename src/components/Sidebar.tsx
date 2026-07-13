import type { ConfigCategory } from '../types'

interface CategoryMeta {
  id: ConfigCategory
  label: string
  icon: string
  description: string
  count?: number
}

const CATEGORIES: CategoryMeta[] = [
  { id: 'pipelines', label: 'Pipelines', icon: '⟶', description: 'Processing pipelines & functions' },
  { id: 'routes', label: 'Routes', icon: '⤳', description: 'Routing table rules' },
  { id: 'inputs', label: 'Inputs', icon: '↓', description: 'Data sources & collectors' },
  { id: 'outputs', label: 'Outputs', icon: '↑', description: 'Destinations & sinks' },
  { id: 'functions', label: 'Functions', icon: 'ƒ', description: 'Built-in & custom functions' },
  { id: 'lookups', label: 'Lookups', icon: '⊞', description: 'Lookup tables' },
  { id: 'parsers', label: 'Parsers', icon: '{ }', description: 'Event parsers & schemas' },
  { id: 'system', label: 'System Info', icon: 'ⓘ', description: 'Platform & version info' },
  { id: 'groups', label: 'Groups', icon: '◫', description: 'Config groups & fleets' },
]

interface SidebarProps {
  active: ConfigCategory
  onSelect: (c: ConfigCategory) => void
  counts: Partial<Record<ConfigCategory, number>>
}

export function Sidebar({ active, onSelect, counts }: SidebarProps) {
  return (
    <aside className="w-56 bg-cribl-panel border-r border-cribl-border flex flex-col shrink-0">
      <div className="px-4 py-3 border-b border-cribl-border">
        <div className="text-xs font-semibold text-cribl-muted uppercase tracking-widest">Config Types</div>
      </div>
      <nav className="flex-1 py-2 overflow-y-auto">
        {CATEGORIES.map((cat) => {
          const isActive = active === cat.id
          const count = counts[cat.id]
          return (
            <button
              key={cat.id}
              onClick={() => onSelect(cat.id)}
              className={`w-full text-left px-4 py-2.5 flex items-center justify-between group transition-colors ${
                isActive
                  ? 'bg-cribl-orange/15 border-r-2 border-cribl-orange text-cribl-text'
                  : 'hover:bg-white/5 text-cribl-muted hover:text-cribl-text border-r-2 border-transparent'
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <span className={`text-sm mono w-5 text-center shrink-0 ${isActive ? 'text-cribl-orange' : ''}`}>
                  {cat.icon}
                </span>
                <div className="min-w-0">
                  <div className="text-xs font-medium truncate">{cat.label}</div>
                </div>
              </div>
              {count !== undefined && (
                <span className={`text-xs mono ml-1 shrink-0 ${isActive ? 'text-cribl-orange' : 'text-cribl-muted'}`}>
                  {count}
                </span>
              )}
            </button>
          )
        })}
      </nav>

      {/* btool hint */}
      <div className="px-4 py-3 border-t border-cribl-border">
        <div className="text-xs text-cribl-muted">
          <div className="font-mono text-cribl-orange mb-1">$ cribl btool</div>
          <div>Inspect effective config across all layers</div>
        </div>
      </div>
    </aside>
  )
}