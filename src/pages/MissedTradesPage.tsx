import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { MissedTradeFormModal } from '../components/MissedTradeFormModal'
import { MissedTradeImageGallery } from '../components/MissedTradeImageGallery'
import { Select } from '../components/Select'
import { Plus, Table2, LayoutGrid } from '../components/icons'
import { Stagger, Reveal, CountUpValue } from '../anim'
import type { Confluence, MissedTrade, Strategy } from '../types'

type SortKey = 'date' | 'would_be_pnl' | 'pair'
type ViewMode = 'table' | 'gallery'

export function MissedTradesPage({
  strategies,
  confluences,
  onConfluencesChanged,
  refreshKey,
  bumpRefresh,
}: {
  strategies: Strategy[]
  confluences: Confluence[]
  onConfluencesChanged: () => void
  refreshKey: number
  bumpRefresh: () => void
}) {
  const [rows, setRows] = useState<MissedTrade[]>([])
  const [loading, setLoading] = useState(true)
  const [strategyId, setStrategyId] = useState<number | null>(null)
  const [search, setSearch] = useState('')
  const [sortKey, setSortKey] = useState<SortKey>('date')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')
  const [editing, setEditing] = useState<MissedTrade | null | undefined>(undefined)
  const [view, setView] = useState<ViewMode>('table')

  const strategyName = (id: number | null) => strategies.find((s) => s.id === id)?.name ?? '—'

  const requestIdRef = useRef(0)
  const load = useCallback(() => {
    const requestId = ++requestIdRef.current
    setLoading(true)
    window.api.missedTrades.getAll({ strategyId, search: search || undefined }).then((r) => {
      if (requestId !== requestIdRef.current) return // a newer filter/search request has since superseded this one
      setRows(r)
      setLoading(false)
    })
  }, [strategyId, search])

  useEffect(() => {
    const timer = setTimeout(load, search ? 250 : 0)
    return () => clearTimeout(timer)
  }, [load, refreshKey, search])

  const sorted = useMemo(() => {
    const copy = [...rows]
    copy.sort((a, b) => {
      let cmp = 0
      if (sortKey === 'date') cmp = a.date.localeCompare(b.date)
      else if (sortKey === 'would_be_pnl') cmp = (a.would_be_pnl ?? 0) - (b.would_be_pnl ?? 0)
      else if (sortKey === 'pair') cmp = (a.pair ?? '').localeCompare(b.pair ?? '')
      return sortDir === 'asc' ? cmp : -cmp
    })
    return copy
  }, [rows, sortKey, sortDir])

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    else {
      setSortKey(key)
      setSortDir('desc')
    }
  }

  const totalMissedPnl = rows.reduce((s, r) => s + (r.would_be_pnl ?? 0), 0)

  return (
    <Stagger style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <Reveal style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <input
            className="input"
            placeholder="Search missed trades…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && load()}
            style={{ width: 220 }}
          />
          <Select
            ariaLabel="Filter by strategy"
            width={170}
            value={strategyId != null ? String(strategyId) : ''}
            onChange={(v) => setStrategyId(v ? Number(v) : null)}
            options={[
              { value: '', label: 'All Strategies' },
              ...strategies.map((s) => ({ value: String(s.id), label: s.name })),
            ]}
          />
          <div style={{ color: 'var(--text-muted)', fontSize: 12.5 }}>
            Missed opportunity cost:{' '}
            <span className={totalMissedPnl >= 0 ? 'pnl-positive' : 'pnl-negative'} style={{ fontWeight: 600 }}>
              <CountUpValue value={`$${totalMissedPnl.toFixed(0)}`} />
            </span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <div style={{ display: 'flex', gap: 2, background: 'var(--bg-elevated)', borderRadius: 'var(--radius-control)', padding: 2 }}>
            <button
              className="btn"
              title="Table view"
              onClick={() => setView('table')}
              style={{ padding: '6px 10px', background: view === 'table' ? 'var(--card)' : 'transparent', border: 'none' }}
            >
              <Table2 size={16} />
            </button>
            <button
              className="btn"
              title="Gallery view"
              onClick={() => setView('gallery')}
              style={{ padding: '6px 10px', background: view === 'gallery' ? 'var(--card)' : 'transparent', border: 'none' }}
            >
              <LayoutGrid size={16} />
            </button>
          </div>
          <button className="btn btn-primary" onClick={() => setEditing(null)}><Plus size={16} style={{ marginRight: 4 }} />Log Missed Trade</button>
        </div>
      </Reveal>

      {view === 'gallery' ? (
        <Reveal><MissedTradeImageGallery missedTrades={rows} strategies={strategies} onOpenTrade={setEditing} refreshKey={refreshKey} /></Reveal>
      ) : (
      <Reveal className="card" style={{ overflowX: 'auto', maxHeight: 640, overflowY: 'auto' }}>
        {loading ? (
          <div style={{ padding: 20, color: 'var(--text-muted)' }}>Loading…</div>
        ) : sorted.length === 0 ? (
          <div style={{ padding: 20, color: 'var(--text-muted)' }}>No missed trades logged. Track setups you spotted but didn't take here.</div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th onClick={() => toggleSort('date')} style={{ cursor: 'pointer' }}>Date {sortKey === 'date' ? (sortDir === 'asc' ? '↑' : '↓') : ''}</th>
                <th onClick={() => toggleSort('pair')} style={{ cursor: 'pointer' }}>Pair {sortKey === 'pair' ? (sortDir === 'asc' ? '↑' : '↓') : ''}</th>
                <th>Direction</th>
                <th onClick={() => toggleSort('would_be_pnl')} style={{ cursor: 'pointer' }}>Would-be P/L {sortKey === 'would_be_pnl' ? (sortDir === 'asc' ? '↑' : '↓') : ''}</th>
                <th>Model</th>
                <th>Reason Missed</th>
                <th>Tags</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((r) => (
                <tr key={r.id} onClick={() => setEditing(r)}>
                  <td>{r.date}</td>
                  <td>{r.pair || '—'}</td>
                  <td>{r.direction || '—'}</td>
                  <td className={(r.would_be_pnl ?? 0) >= 0 ? 'pnl-positive' : 'pnl-negative'}>
                    {r.would_be_pnl !== null ? `${r.would_be_pnl >= 0 ? '+' : ''}${r.would_be_pnl.toFixed(2)}` : '—'}
                  </td>
                  <td>{strategyName(r.strategy_id)}</td>
                  <td>{r.reason_missed || '—'}</td>
                  <td>{r.tags.map((tag) => <span key={tag} className="tag-pill negative" style={{ marginRight: 4 }}>{tag}</span>)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Reveal>
      )}

      {editing !== undefined && (
        <MissedTradeFormModal
          missedTrade={editing ?? undefined}
          strategies={strategies}
          confluences={confluences}
          onConfluencesChanged={onConfluencesChanged}
          onClose={() => setEditing(undefined)}
          onSaved={() => {
            load()
            bumpRefresh()
          }}
        />
      )}
    </Stagger>
  )
}
