import { useEffect, useState } from 'react'
import type { MonthlyBreakdownEntry } from '../types'
import { usePrefersReducedMotion } from '../anim'

export function MonthlyPnlPanel({ accountId, strategyId, refreshKey }: { accountId: number | null; strategyId: number | null; refreshKey: number }) {
  const [year, setYear] = useState(new Date().getFullYear())
  const [rows, setRows] = useState<MonthlyBreakdownEntry[]>([])
  const [loading, setLoading] = useState(true)
  const prefersReducedMotion = usePrefersReducedMotion()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    const id = requestAnimationFrame(() => setMounted(true))
    return () => cancelAnimationFrame(id)
  }, [])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    window.api.analytics.getMonthlyBreakdown({ accountId, strategyId, year: String(year) }).then((r) => {
      if (!cancelled) {
        setRows(r)
        setLoading(false)
      }
    })
    return () => {
      cancelled = true
    }
  }, [accountId, strategyId, year, refreshKey])

  const yearTotal = rows.reduce((s, r) => s + r.pnl, 0)
  const yearTrades = rows.reduce((s, r) => s + r.tradeCount, 0)
  const maxAbs = Math.max(1, ...rows.map((r) => Math.abs(r.pnl)))

  return (
    <div className="card" style={{ padding: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button className="btn" onClick={() => setYear((y) => y - 1)}>‹</button>
          <div style={{ fontWeight: 600, minWidth: 60, textAlign: 'center' }}>{year}</div>
          <button className="btn" onClick={() => setYear((y) => y + 1)}>›</button>
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
          Year P&L: <span className={yearTotal >= 0 ? 'pnl-positive' : 'pnl-negative'}>${yearTotal.toFixed(0)}</span>
          {'  '}Trades: {yearTrades}
        </div>
      </div>

      {loading ? (
        <div style={{ color: 'var(--text-muted)', padding: 12 }}>Loading…</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {rows.map((r) => (
            <div key={r.month} style={{ display: 'grid', gridTemplateColumns: '46px 1fr 90px 60px', gap: 10, alignItems: 'center' }}>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{r.label}</div>
              <div style={{ background: 'var(--bg-elevated)', borderRadius: 'var(--radius-sm)', height: 10, overflow: 'hidden', position: 'relative' }}>
                {r.pnl !== 0 && (() => {
                  const animateFromCenter = !prefersReducedMotion && !mounted
                  const finalLeft = r.pnl >= 0 ? '50%' : `${50 - (Math.abs(r.pnl) / maxAbs) * 50}%`
                  const finalWidth = `${(Math.abs(r.pnl) / maxAbs) * 50}%`
                  return (
                  <div
                    style={{
                      position: 'absolute',
                      top: 0,
                      bottom: 0,
                      left: animateFromCenter ? '50%' : finalLeft,
                      width: animateFromCenter ? 0 : finalWidth,
                      background: r.pnl >= 0 ? 'var(--green)' : 'var(--red)',
                      opacity: 0.7,
                      transition: 'width var(--dur-medium) var(--ease-sig), left var(--dur-medium) var(--ease-sig)',
                    }}
                  />
                  )
                })()}
                <div style={{ position: 'absolute', left: '50%', top: 0, bottom: 0, width: 1, background: 'var(--border)' }} />
              </div>
              <div className={r.pnl >= 0 ? 'pnl-positive' : 'pnl-negative'} style={{ fontSize: 12.5, fontWeight: 600, textAlign: 'right' }}>
                {r.pnl >= 0 ? '+' : ''}${r.pnl.toFixed(0)}
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-dim)', textAlign: 'right' }}>{r.tradeCount} trades</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
