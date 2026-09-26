import { useEffect, useState } from 'react'
import { ChallengeRing } from './ChallengeRing'
import { formatR } from '../forwardTest'
import type { ForwardDecision, ForwardStats } from '../types'

function StatBox({ label, value, color, hint }: { label: string; value: string; color?: string; hint?: string }) {
  return (
    <div style={{ minWidth: 110 }} title={hint}>
      <div style={{ color: 'var(--text-muted)', fontSize: 11, marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 18, fontWeight: 600, color: color ?? 'var(--text)' }}>{value}</div>
    </div>
  )
}

const DECISION_COLOR: Record<ForwardDecision, string> = {
  stop_edge: 'var(--red)',
  stop_execution: 'var(--red)',
  stop_research: 'var(--red)',
  pass: 'var(--green)',
  continue_unvalidated: 'var(--accent)',
  collecting: 'var(--accent)',
}

const signed = (v: number | null, digits = 2) => (v === null ? '—' : `${v > 0 ? '+' : ''}${v.toFixed(digits)}`)

/**
 * Read-only view of the pre-registered forward test: the RULE's outcomes as reported by the
 * TradingView indicator (not the trader's P&L), the execution check from linked trades, and the
 * stop/continue status line. All numbers come from `forward:getStats` (electron/forward-stats.ts).
 */
export function ForwardTestPanel({ refreshKey }: { refreshKey: number }) {
  const [stats, setStats] = useState<ForwardStats | null>(null)

  useEffect(() => {
    let cancelled = false
    window.api.forward
      ?.getStats()
      .then((s) => {
        if (!cancelled) setStats(s)
      })
      .catch(() => {
        /* forward-test data is optional */
      })
    return () => {
      cancelled = true
    }
  }, [refreshKey])

  if (!window.api.forward) return null

  const color = stats ? DECISION_COLOR[stats.decision] : 'var(--text-muted)'

  return (
    <div className="card" style={{ padding: 'var(--sp-4)' }}>
      <div style={{ color: 'var(--text-muted)', fontSize: 12, marginBottom: 12 }}>
        Forward Test — PREREG-005 opening-drive rule. Statistics use the rule's own R_net from the
        indicator's exit alerts (including trades the indicator skipped for account size), not your
        fills. Your linked trades only measure execution. Import the TradingView alert log from the
        Trades tab.
      </div>

      {!stats ? (
        <div style={{ color: 'var(--text-dim)', fontSize: 12 }}>Loading…</div>
      ) : (
        <>
          <div
            style={{
              display: 'inline-block',
              padding: '6px 12px',
              borderRadius: 'var(--radius-control)',
              border: `1px solid ${color}`,
              color,
              fontWeight: 600,
              fontSize: 13.5,
              marginBottom: 16,
            }}
          >
            {stats.status}
          </div>

          <div style={{ display: 'flex', gap: 'var(--sp-5)', flexWrap: 'wrap', alignItems: 'center' }}>
            <ChallengeRing
              label="Progress"
              percent={stats.progress * 100}
              centerLabel={`${stats.n}`}
              caption={`of ${stats.target}`}
              tone={stats.decision === 'pass' ? 'positive' : stats.decision.startsWith('stop') ? 'danger' : 'accent'}
            />
            <div style={{ display: 'flex', gap: 'var(--sp-4)', flexWrap: 'wrap', flex: 1 }}>
              <StatBox
                label="Trades (N)"
                value={String(stats.n)}
                hint={stats.skippedWithOutcome ? `${stats.skippedWithOutcome} skipped by the indicator but closed by the rule` : undefined}
              />
              <StatBox
                label="Avg R (net)"
                value={formatR(stats.avgR, 3)}
                color={stats.avgR === null ? undefined : stats.avgR > 0 ? 'var(--green)' : 'var(--red)'}
              />
              <StatBox label="t-stat" value={signed(stats.tStat)} />
              <StatBox label="Win rate" value={stats.winRate === null ? '—' : `${stats.winRate.toFixed(1)}%`} />
              <StatBox
                label="Cumulative R"
                value={formatR(stats.cumR)}
                color={stats.cumR > 0 ? 'var(--green)' : stats.cumR < 0 ? 'var(--red)' : undefined}
              />
              <StatBox
                label="Avg slippage"
                value={stats.avgSlippage === null ? '—' : `${stats.avgSlippage.toFixed(2)} pt`}
                color={stats.avgSlippage !== null && stats.avgSlippage > 2 ? 'var(--red)' : undefined}
                hint={`Round trip, from ${stats.linkedWithFills} linked trade${stats.linkedWithFills === 1 ? '' : 's'} with fills`}
              />
              <StatBox label="Indicator skips" value={String(stats.indicatorSkips)} />
              <StatBox label="Your missed signals" value={String(stats.missedSignals)} />
              <StatBox
                label="Not yet logged"
                value={String(stats.unlogged)}
                color={stats.unlogged > 0 ? 'var(--amber)' : undefined}
                hint="Entry signals with neither a linked trade nor a linked missed trade"
              />
            </div>
          </div>

          <div style={{ color: 'var(--text-dim)', fontSize: 11.5, marginTop: 14 }}>
            Stop rules: after 60 trades avg ≤ −0.10R · avg slippage &gt; 2 pt · after 150 trades avg ≤ 0. Passing
            (150 trades, avg &gt; 0, t ≥ 2) is not proof of profitability.
          </div>
        </>
      )}
    </div>
  )
}
