import { useEffect, useMemo, useRef, useState } from 'react'
import { FilterBar } from '../components/FilterBar'
import { TradeFormModal } from '../components/TradeFormModal'
import { CsvImportModal } from '../components/CsvImportModal'
import { TradeImageGallery } from '../components/TradeImageGallery'
import { Upload, Download, Plus, Table2, LayoutGrid } from '../components/icons'
import type { Account, Confluence, Strategy, Trade } from '../types'

type SortKey = 'date' | 'pnl' | 'pair'
type ViewMode = 'table' | 'gallery'

export function TradesDbPage({
  accounts,
  strategies,
  confluences,
  onConfluencesChanged,
  refreshKey,
  bumpRefresh,
}: {
  accounts: Account[]
  strategies: Strategy[]
  confluences: Confluence[]
  onConfluencesChanged: () => void
  refreshKey: number
  bumpRefresh: () => void
}) {
  const [trades, setTrades] = useState<Trade[]>([])
  const [loading, setLoading] = useState(true)
  const [accountId, setAccountId] = useState<number | null>(null)
  const [strategyId, setStrategyId] = useState<number | null>(null)
  const [search, setSearch] = useState('')
  const [sortKey, setSortKey] = useState<SortKey>('date')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')
  const [editingTrade, setEditingTrade] = useState<Trade | null | undefined>(undefined)
  const [showImport, setShowImport] = useState(false)
  const [view, setView] = useState<ViewMode>('table')

  const strategyName = (id: number | null) => strategies.find((s) => s.id === id)?.name ?? '—'
  const accountName = (id: number | null) => accounts.find((a) => a.id === id)?.name ?? '—'

  const requestIdRef = useRef(0)
  const load = () => {
    const requestId = ++requestIdRef.current
    setLoading(true)
    window.api.trades.getAll({ accountId, strategyId, search: search || undefined }).then((t) => {
      if (requestId !== requestIdRef.current) return // a newer filter/search request has since superseded this one
      setTrades(t)
      setLoading(false)
    })
  }

  useEffect(load, [accountId, strategyId, refreshKey])

  const sorted = useMemo(() => {
    const copy = [...trades]
    copy.sort((a, b) => {
      let cmp = 0
      if (sortKey === 'date') cmp = a.date.localeCompare(b.date)
      else if (sortKey === 'pnl') cmp = a.pnl - b.pnl
      else if (sortKey === 'pair') cmp = (a.pair ?? '').localeCompare(b.pair ?? '')
      return sortDir === 'asc' ? cmp : -cmp
    })
    return copy
  }, [trades, sortKey, sortDir])

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    else {
      setSortKey(key)
      setSortDir('desc')
    }
  }

  const exportCsv = async () => {
    const path = await window.api.csv.export()
    if (path) alert(`Exported to ${path}`)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            className="input"
            placeholder="Search trades…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && load()}
            style={{ width: 220 }}
          />
          <FilterBar
            accounts={accounts}
            strategies={strategies}
            accountId={accountId}
            strategyId={strategyId}
            onAccountChange={setAccountId}
            onStrategyChange={setStrategyId}
          />
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
          <button className="btn" onClick={() => setShowImport(true)}><Upload size={16} style={{ marginRight: 4 }} />Import CSV</button>
          <button className="btn" onClick={exportCsv}><Download size={16} style={{ marginRight: 4 }} />Export CSV</button>
          <button className="btn btn-primary" onClick={() => setEditingTrade(null)}><Plus size={16} style={{ marginRight: 4 }} />New Trade</button>
        </div>
      </div>

      {view === 'gallery' ? (
        <TradeImageGallery trades={trades} accounts={accounts} onOpenTrade={setEditingTrade} />
      ) : (
      <div className="card" style={{ overflowX: 'auto', maxHeight: 640, overflowY: 'auto' }}>
        {loading ? (
          <div style={{ padding: 20, color: 'var(--text-muted)' }}>Loading trades…</div>
        ) : sorted.length === 0 ? (
          <div style={{ padding: 20, color: 'var(--text-muted)' }}>No trades yet. Click "+ New Trade" to log your first one.</div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Name</th>
                <th onClick={() => toggleSort('date')} style={{ cursor: 'pointer' }}>Date {sortKey === 'date' ? (sortDir === 'asc' ? '↑' : '↓') : ''}</th>
                <th onClick={() => toggleSort('pair')} style={{ cursor: 'pointer' }}>Pair {sortKey === 'pair' ? (sortDir === 'asc' ? '↑' : '↓') : ''}</th>
                <th>Session</th>
                <th>Direction</th>
                <th onClick={() => toggleSort('pnl')} style={{ cursor: 'pointer' }}>P/L {sortKey === 'pnl' ? (sortDir === 'asc' ? '↑' : '↓') : ''}</th>
                <th>Followed</th>
                <th>BE</th>
                <th>Entry Win</th>
                <th>Model</th>
                <th>Positive Tags</th>
                <th>Negative Tags</th>
                <th>Account</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((t) => (
                <tr key={t.id} onClick={() => setEditingTrade(t)}>
                  <td>{t.name || '—'}</td>
                  <td>{t.date}</td>
                  <td>{t.pair || '—'}</td>
                  <td>{t.session || '—'}</td>
                  <td>{t.direction || '—'}</td>
                  <td className={t.pnl >= 0 ? 'pnl-positive' : 'pnl-negative'}>{t.pnl >= 0 ? '+' : ''}{t.pnl.toFixed(2)}</td>
                  <td className="checkbox-cell">{t.followed_plan ? '✅' : '—'}</td>
                  <td className="checkbox-cell">{t.break_even ? '✅' : '—'}</td>
                  <td className="checkbox-cell">{t.entry_win ? '✅' : '—'}</td>
                  <td>{strategyName(t.strategy_id)}</td>
                  <td>{t.positive_tags.map((tag) => <span key={tag} className="tag-pill positive" style={{ marginRight: 4 }}>{tag}</span>)}</td>
                  <td>{t.negative_tags.map((tag) => <span key={tag} className="tag-pill negative" style={{ marginRight: 4 }}>{tag}</span>)}</td>
                  <td>{accountName(t.account_id)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      )}

      {editingTrade !== undefined && (
        <TradeFormModal
          trade={editingTrade ?? undefined}
          accounts={accounts}
          strategies={strategies}
          confluences={confluences}
          onConfluencesChanged={onConfluencesChanged}
          onClose={() => setEditingTrade(undefined)}
          onSaved={() => {
            load()
            bumpRefresh()
          }}
          onDeleted={() => {
            load()
            bumpRefresh()
          }}
        />
      )}

      {showImport && (
        <CsvImportModal
          accounts={accounts}
          onClose={() => setShowImport(false)}
          onImported={() => {
            load()
            bumpRefresh()
          }}
        />
      )}
    </div>
  )
}
