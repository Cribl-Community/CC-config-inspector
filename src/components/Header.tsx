interface HeaderProps {
  groups: { id: string; workerCount?: number }[]
  selectedGroup: string
  onGroupChange: (g: string) => void
  searchQuery: string
  onSearchChange: (q: string) => void
  loading: boolean
  onExport: () => void
}

export function Header({
  groups,
  selectedGroup,
  onGroupChange,
  searchQuery,
  onSearchChange,
  loading,
  onExport,
}: HeaderProps) {
  return (
    <header className="bg-cribl-panel border-b border-cribl-border px-6 py-3 flex items-center gap-4 sticky top-0 z-30">
      {/* Logo / Title */}
      <div className="flex items-center gap-3 mr-2">
        <div className="flex items-center justify-center w-8 h-8 rounded bg-cribl-orange">
          <span className="text-white font-bold text-sm mono">b</span>
        </div>
        <div>
          <div className="text-sm font-bold text-cribl-text leading-tight">Cribl btool</div>
          <div className="text-xs text-cribl-muted leading-tight">Configuration Inspector</div>
        </div>
      </div>

      {/* Divider */}
      <div className="w-px h-8 bg-cribl-border" />

      {/* Group selector */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-cribl-muted whitespace-nowrap">Scope:</span>
        <select
          value={selectedGroup}
          onChange={(e) => onGroupChange(e.target.value)}
          className="bg-cribl-dark border border-cribl-border text-cribl-text text-xs rounded px-2 py-1.5 focus:outline-none focus:border-cribl-orange mono"
        >
          <option value="__leader__">Leader (all groups)</option>
          <option value="__all__">All Worker Groups</option>
          {groups.map((g) => (
            <option key={g.id} value={g.id}>
              {g.id}{g.workerCount !== undefined ? ` (${g.workerCount} workers)` : ''}
            </option>
          ))}
        </select>
      </div>

      {/* Search */}
      <div className="flex-1 max-w-xl relative">
        <input
          type="text"
          placeholder='Search keys or values… e.g. "throttleRatePerSec" or "true"'
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full bg-cribl-dark border border-cribl-border text-cribl-text text-xs rounded px-3 py-1.5 pl-8 focus:outline-none focus:border-cribl-orange mono placeholder-cribl-muted"
        />
        <svg className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-cribl-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        {searchQuery && (
          <button
            onClick={() => onSearchChange('')}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-cribl-muted hover:text-cribl-text"
          >
            ×
          </button>
        )}
      </div>

      {/* Loading indicator */}
      {loading && (
        <div className="flex items-center gap-2 text-xs text-cribl-orange">
          <svg className="animate-spin w-3.5 h-3.5" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
          </svg>
          Loading…
        </div>
      )}

      {/* Export button */}
      <button
        onClick={onExport}
        className="flex items-center gap-1.5 text-xs bg-cribl-orange/10 hover:bg-cribl-orange/20 text-cribl-orange border border-cribl-orange/30 hover:border-cribl-orange/60 rounded px-3 py-1.5 transition-colors shrink-0"
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
        </svg>
        Export
      </button>
    </header>
  )
}