import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { FilterBar } from '../components/FilterBar'
import { TradeFormModal } from '../components/TradeFormModal'
import { CsvImportModal } from '../components/CsvImportModal'
import { TradeImageGallery } from '../components/TradeImageGallery'
import { Upload, Download, Plus, Table2, LayoutGrid } from '../components/icons'
import { Stagger, Reveal } from '../anim'
import type { Account, Confluence, SharedTrade, Strategy, Trade } from '../types'

type SortKey = 'date' | 'pnl' | 'pair'
type ViewMode = 'table' | 'gallery'
type Row = { kind: 'local'; t: Trade } | { kind: 'shared'; t: SharedTrade }

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
  // Friend's trades pulled from the shared Supabase journal — read-only, merged into the table
  // below. The local SQLite journal stays authoritative; this is best-effort and silently absent
  // when signed out or offline.
  const [shared, setShared] = useState<SharedTrade[]>([])
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
  // Real trades are logged against real (non-backtest) accounts — dedicated backtest accounts
  // only show up in the Backtest tab's own account picker (see BacktestPage).
  const selectableAccounts = useMemo(() => accounts.filter((a) => a.account_type !== 'backtest'), [accounts])

  const requestIdRef = useRef(0)
  const load = useCallback(() => {
    const requestId = ++requestIdRef.current
    setLoading(true)
    window.api.trades.getAll({ accountId, strategyId, search: search || undefined, source: 'manual' }).then((t) => {
      if (requestId !== requestIdRef.current) return // a newer filter/search request has since superseded this one
      setTrades(t)
      setLoading(false)
    })
  }, [accountId, strategyId, search])

  useEffect(() => {
    const timer = setTimeout(load, search ? 250 : 0)
    return () => clearTimeout(timer)
  }, [load, refreshKey, search])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const auth = window.api?.auth
      const sync = window.api?.sync
      if (!auth || !sync) return
      try {
        const s = await auth.getStatus()
        if (!s.signedIn) return
        const rows = await sync.getShared()
        // Same rule as the local query: only real (manual) trades belong on this tab.
        if (!cancelled) setShared(rows.filter((t) => !t.isMine && t.source === 'manual'))
      } catch {
        // shared trades are best-effort; the local journal is authoritative
      }
    })()
    return () => {
      cancelled = true
    }
  }, [refreshKey])

  // Shared trades carry names, not local ids, so match the active account/strategy filters by name
  // and the search box against the visible text fields.
  const sharedFiltered = useMemo(() => {
    const q = search.trim().toLowerCase()
    const accName = accountId != null ? accounts.find((a) => a.id === accountId)?.name ?? null : null
    const stratName = strategyId != null ? strategies.find((s) => s.id === strategyId)?.name ?? null : null
    return shared.filter((t) => {
      if (accName && t.accountName !== accName) return false
      if (stratName && t.strategyName !== stratName) return false
      if (q) {
        const hay = `${t.pair ?? ''} ${t.direction ?? ''} ${t.ownerName} ${t.strategyName ?? ''} ${t.notes ?? ''}`.toLowerCase()
        if (!hay.includes(q)) return false
      }
      return true
    })
  }, [shared, search, accountId, strategyId, accounts, strategies])

  const sorted = useMemo<Row[]>(() => {
    const combined: Row[] = [
      ...trades.map((t) => ({ kind: 'local' as const, t })),
      ...sharedFiltered.map((t) => ({ kind: 'shared' as const, t })),
    ]
    combined.sort((a, b) => {
      let cmp = 0
      if (sortKey === 'date') cmp = a.t.date.localeCompare(b.t.date)
      else if (sortKey === 'pnl') cmp = a.t.pnl - b.t.pnl
      else if (sortKey === 'pair') cmp = (a.t.pair ?? '').localeCompare(b.t.pair ?? '')
      return sortDir === 'asc' ? cmp : -cmp
    })
    return combined
  }, [trades, sharedFiltered, sortKey, sortDir])

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    else {
      setSortKey(key)
      setSortDir('desc')
    }
  }

  // Forward-test alerts (TradingView alert log or JSON lines) go into their own table; the
  // summary says what was new, updated, already recorded or unreadable.
  const importAlerts = async () => {
    const res = await window.api.forward?.importAlerts()
    if (!res) return
    alert(`Forward-test alerts imported.\n\n${res.message}`)
    bumpRefresh()
  }

  const exportCsv = async () => {
    const path = await window.api.csv.export()
    if (path) alert(`Exported to ${path}`)
  }

  return (
    <Stagger style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <Reveal style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
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
            accounts={selectableAccounts}
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
          {window.api.forward && (
            <button className="btn" onClick={importAlerts} title="Import the forward-test indicator's alerts (TradingView alert log CSV or JSON lines)">
              <Upload size={16} style={{ marginRight: 4 }} />Import Alerts
            </button>
          )}
          <button className="btn" onClick={exportCsv}><Download size={16} style={{ marginRight: 4 }} />Export CSV</button>
          <button className="btn btn-primary" onClick={() => setEditingTrade(null)}><Plus size={16} style={{ marginRight: 4 }} />New Trade</button>
        </div>
      </Reveal>

      {view === 'table' && sharedFiltered.length > 0 && (
        <Reveal style={{ fontSize: 12, color: 'var(--text-muted)' }}>
          Includes {sharedFiltered.length} shared trade{sharedFiltered.length === 1 ? '' : 's'} from your shared journal (read-only).
        </Reveal>
      )}

      {view === 'gallery' ? (
        <Reveal><TradeImageGallery trades={trades} accounts={accounts} onOpenTrade={setEditingTrade} refreshKey={refreshKey} /></Reveal>
      ) : (
      <Reveal className="card" style={{ overflowX: 'auto', maxHeight: 640, overflowY: 'auto' }}>
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
              {sorted.map((row) => row.kind === 'local' ? (
                <tr key={`l${row.t.id}`} onClick={() => setEditingTrade(row.t)}>
                  <td>{row.t.name || '—'}</td>
                  <td>{row.t.date}</td>
                  <td>{row.t.pair || '—'}</td>
                  <td>{row.t.session || '—'}</td>
                  <td>{row.t.direction || '—'}</td>
                  <td className={row.t.pnl >= 0 ? 'pnl-positive' : 'pnl-negative'}>{row.t.pnl >= 0 ? '+' : ''}{row.t.pnl.toFixed(2)}</td>
                  <td className="checkbox-cell">{row.t.followed_plan ? '✅' : '—'}</td>
                  <td className="checkbox-cell">{row.t.break_even ? '✅' : '—'}</td>
                  <td className="checkbox-cell">{row.t.entry_win ? '✅' : '—'}</td>
                  <td>{strategyName(row.t.strategy_id)}</td>
                  <td>{row.t.positive_tags.map((tag) => <span key={tag} className="tag-pill positive" style={{ marginRight: 4 }}>{tag}</span>)}</td>
                  <td>{row.t.negative_tags.map((tag) => <span key={tag} className="tag-pill negative" style={{ marginRight: 4 }}>{tag}</span>)}</td>
                  <td>{accountName(row.t.account_id)}</td>
                </tr>
              ) : (
                <tr key={`s${row.t.id}`} style={{ opacity: 0.7 }} title={`Shared by ${row.t.ownerName} — read-only`}>
                  <td>{row.t.ownerName} <span className="tag-pill" style={{ marginLeft: 4 }}>shared</span></td>
                  <td>{row.t.date}</td>
                  <td>{row.t.pair || '—'}</td>
                  <td>—</td>
                  <td>{row.t.direction || '—'}</td>
                  <td className={row.t.pnl >= 0 ? 'pnl-positive' : 'pnl-negative'}>{row.t.pnl >= 0 ? '+' : ''}{row.t.pnl.toFixed(2)}</td>
                  <td className="checkbox-cell">—</td>
                  <td className="checkbox-cell">—</td>
                  <td className="checkbox-cell">—</td>
                  <td>{row.t.strategyName || '—'}</td>
                  <td>—</td>
                  <td>—</td>
                  <td>{row.t.accountName || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Reveal>
      )}

      {editingTrade !== undefined && (
        <TradeFormModal
          trade={editingTrade ?? undefined}
          accounts={selectableAccounts}
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
          accounts={selectableAccounts}
          onClose={() => setShowImport(false)}
          onImported={() => {
            load()
            bumpRefresh()
          }}
        />
      )}
    </Stagger>
  )
}
