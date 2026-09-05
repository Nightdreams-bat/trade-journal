import { useEffect, useState } from 'react'
import { Stagger, Reveal } from '../anim'
import { RefreshCw, Users, TriangleAlert } from '../components/icons'
import { formatRatio } from '../format'
import type { SharedTrade, SyncStatus } from '../types'

type OwnerFilter = 'all' | 'mine' | 'theirs'

interface StrategyGroupStats {
  name: string
  tradeCount: number
  winRate: number
  riskReward: number
  avgRMultiple: number
  totalPnl: number
}

/** Quick client-side breakdown of the (already-filtered) shared trades by strategy — mirrors the
 * key numbers on the local Playbooks cards (win rate, R:R, avg R, P&L), just computed over
 * whatever's currently pulled from Supabase instead of the local SQLite trades table. */
function groupByStrategy(trades: SharedTrade[]): StrategyGroupStats[] {
  const groups = new Map<string, SharedTrade[]>()
  for (const t of trades) {
    const key = t.strategyName || 'No strategy'
    const list = groups.get(key)
    if (list) list.push(t)
    else groups.set(key, [t])
  }
  return Array.from(groups.entries())
    .map(([name, group]) => {
      const wins = group.filter((t) => t.pnl > 0)
      const losses = group.filter((t) => t.pnl < 0)
      const avgWin = wins.length ? wins.reduce((s, t) => s + t.pnl, 0) / wins.length : 0
      const avgLoss = losses.length ? Math.abs(losses.reduce((s, t) => s + t.pnl, 0) / losses.length) : 0
      const rTrades = group.filter((t) => t.r_multiple != null)
      const avgRMultiple = rTrades.length ? rTrades.reduce((s, t) => s + (t.r_multiple ?? 0), 0) / rTrades.length : 0
      return {
        name,
        tradeCount: group.length,
        winRate: group.length ? Math.round((wins.length / group.length) * 1000) / 10 : 0,
        riskReward: avgLoss === 0 ? (avgWin > 0 ? 5 : 0) : avgWin / avgLoss,
        avgRMultiple,
        totalPnl: group.reduce((s, t) => s + t.pnl, 0),
      }
    })
    .sort((a, b) => b.totalPnl - a.totalPnl)
}

/**
 * Combined trades view pulled straight from Supabase — each person's own
 * local SQLite journal stays untouched and authoritative; this only reads
 * whatever has been pushed up by whoever has sync turned on. See
 * electron/sync.ts.
 */
export function SharedPage({ onOpenSettings }: { onOpenSettings: () => void }) {
  const auth = window.api?.auth
  const sync = window.api?.sync
  const [status, setStatus] = useState<SyncStatus | null>(null)
  const [trades, setTrades] = useState<SharedTrade[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<OwnerFilter>('all')
  const [error, setError] = useState<string | null>(null)

  const load = async () => {
    if (!auth || !sync) {
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const s = await auth.getStatus()
      setStatus(s)
      if (s.signedIn) setTrades(await sync.getShared())
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps -- load reads window.api, a stable global
  }, [])

  if (!auth || !sync) {
    return (
      <div style={{ padding: 'var(--sp-5)', color: 'var(--text-muted)' }}>
        Shared journal is only available in the desktop app.
      </div>
    )
  }

  if (loading) {
    return <div style={{ padding: 'var(--sp-5)', color: 'var(--text-muted)' }}>Loading…</div>
  }

  if (!status?.configured) {
    return (
      <div className="card" style={{ padding: 'var(--sp-4)', maxWidth: 520 }}>
        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
          <Users size={20} strokeWidth={1.75} />
          <div>
            <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>Shared journal isn&rsquo;t set up yet</div>
            <p style={{ color: 'var(--text-muted)', fontSize: 13, lineHeight: 1.5, margin: 0 }}>
              This lets you and a friend see each other&rsquo;s trades side by side, each still logging into
              your own journal locally. It needs a Supabase project connected — see the <code>.env.example</code>{' '}
              file in the app folder for setup steps.
            </p>
          </div>
        </div>
      </div>
    )
  }

  if (!status.signedIn || !status.enabled) {
    return (
      <div className="card" style={{ padding: 'var(--sp-4)', maxWidth: 520 }}>
        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
          <Users size={20} strokeWidth={1.75} />
          <div>
            <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>
              {status.signedIn ? 'Sharing is turned off on this device' : 'Sign in to see shared trades'}
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: 13, lineHeight: 1.5, margin: '0 0 12px' }}>
              {status.signedIn
                ? 'You’re signed in, but this device isn’t sharing yet. Turn it on in Settings.'
                : 'Sign in (or create an account) in Settings to see your and your friend’s trades here.'}
            </p>
            <button className="btn btn-primary" onClick={onOpenSettings}>
              Open Settings
            </button>
          </div>
        </div>
      </div>
    )
  }

  const filtered = trades.filter((t) => (filter === 'all' ? true : filter === 'mine' ? t.isMine : !t.isMine))
  const strategyGroups = groupByStrategy(filtered)

  return (
    <Stagger style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <Reveal style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
        <div style={{ display: 'flex', gap: 6 }}>
          {(['all', 'mine', 'theirs'] as const).map((f) => (
            <button
              key={f}
              className="btn"
              onClick={() => setFilter(f)}
              style={{
                background: filter === f ? 'var(--accent-bg)' : undefined,
                color: filter === f ? 'var(--accent-deep)' : undefined,
              }}
            >
              {f === 'all' ? 'All' : f === 'mine' ? 'Mine' : 'Theirs'}
            </button>
          ))}
        </div>
        <button className="btn" onClick={load}>
          <RefreshCw size={14} /> Refresh
        </button>
      </Reveal>

      {error && (
        <div style={{ fontSize: 12, color: 'var(--red)', display: 'flex', gap: 6, alignItems: 'center' }}>
          <TriangleAlert size={14} /> {error}
        </div>
      )}

      {strategyGroups.length > 0 && (
        <Reveal style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 10 }}>
          {strategyGroups.map((s) => (
            <div key={s.name} className="card" style={{ padding: 'var(--sp-3)' }}>
              <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 2 }}>{s.name}</div>
              <div style={{ color: 'var(--text-dim)', fontSize: 11, marginBottom: 8 }}>{s.tradeCount} trades</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Win Rate</span><span>{s.winRate}%</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>R:R Ratio</span><span>1:{formatRatio(s.riskReward)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Avg R</span><span>{s.avgRMultiple.toFixed(2)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Total P&amp;L</span>
                  <span className={s.totalPnl >= 0 ? 'pnl-positive' : 'pnl-negative'}>
                    {s.totalPnl >= 0 ? '+' : ''}
                    {s.totalPnl.toFixed(0)}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </Reveal>
      )}

      <Reveal className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {filtered.length === 0 ? (
          <div style={{ padding: 'var(--sp-5)', color: 'var(--text-muted)', textAlign: 'center' }}>
            No shared trades yet. Once you or your friend log a trade with sharing turned on, it shows up here.
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Owner</th>
                <th>Date</th>
                <th>Pair</th>
                <th>Direction</th>
                <th>P/L</th>
                <th>R</th>
                <th>Account</th>
                <th>Strategy</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((t) => (
                <tr key={t.id}>
                  <td>{t.isMine ? 'Me' : t.ownerName}</td>
                  <td>{t.date}</td>
                  <td>{t.pair || '—'}</td>
                  <td>{t.direction || '—'}</td>
                  <td className={t.pnl >= 0 ? 'pnl-positive' : 'pnl-negative'}>
                    {t.pnl >= 0 ? '+' : ''}
                    {t.pnl.toFixed(2)}
                  </td>
                  <td>{t.r_multiple != null ? t.r_multiple.toFixed(2) : '—'}</td>
                  <td>{t.accountName || '—'}</td>
                  <td>{t.strategyName || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Reveal>
    </Stagger>
  )
}
