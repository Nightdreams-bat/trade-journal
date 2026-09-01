import { useEffect, useMemo, useState } from 'react'
import type { AnalyticsSummary, Trade } from '../types'

function StatBox({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div style={{ minWidth: 100 }}>
      <div style={{ color: 'var(--text-muted)', fontSize: 11, marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 18, fontWeight: 600, color: color ?? 'var(--text)' }}>{value}</div>
    </div>
  )
}

const RISK_LEVELS = [0.25, 0.5, 1, 1.5, 2, 3]

function simulateRuin(rOutcomes: number[], riskPct: number, numTrades: number, ruinThresholdPct: number, paths = 2000) {
  let ruinCount = 0
  const finals: number[] = []
  for (let p = 0; p < paths; p++) {
    let equity = 0
    let peak = 0
    let ruined = false
    for (let t = 0; t < numTrades; t++) {
      const r = rOutcomes[Math.floor(Math.random() * rOutcomes.length)]
      equity += r * riskPct
      peak = Math.max(peak, equity)
      if (peak - equity >= ruinThresholdPct) {
        ruined = true
        break
      }
    }
    if (ruined) ruinCount++
    finals.push(equity)
  }
  finals.sort((a, b) => a - b)
  const median = finals[Math.floor(finals.length / 2)]
  return { ruinProbPct: (ruinCount / paths) * 100, medianReturnPct: median }
}

export function LiveRiskPanel({ accountId, overall }: { accountId: number | null; overall: AnalyticsSummary['overall'] }) {
  const [trades, setTrades] = useState<Trade[] | null>(null)
  const [numTrades, setNumTrades] = useState('100')
  const [ruinThresholdPct, setRuinThresholdPct] = useState('50')
  const [rows, setRows] = useState<{ riskPct: number; ruinProbPct: number; medianReturnPct: number }[] | null>(null)
  const [running, setRunning] = useState(false)

  useEffect(() => {
    let cancelled = false
    setTrades(null)
    setRows(null)
    window.api.trades.getAll({ accountId }).then((t: Trade[]) => {
      if (!cancelled) setTrades(t)
    })
    return () => {
      cancelled = true
    }
  }, [accountId])

  const rOutcomes = useMemo(() => {
    if (!trades) return []
    const outcomes: number[] = []
    for (const t of trades) {
      if (t.r_multiple != null) outcomes.push(t.r_multiple)
      else if (t.risk_per_trade) outcomes.push(t.pnl / t.risk_per_trade)
    }
    return outcomes
  }, [trades])

  const insufficientData = rOutcomes.length < 10
  const effectiveOutcomes = insufficientData ? [1, 1, -1, -1, 2, -1, 1, -1, 1.5, -1] : rOutcomes

  const run = () => {
    setRunning(true)
    const n = parseFloat(numTrades) || 100
    const threshold = parseFloat(ruinThresholdPct) || 50
    // yield to the UI before the synchronous simulation loop
    setTimeout(() => {
      setRows(RISK_LEVELS.map((riskPct) => ({ riskPct, ...simulateRuin(effectiveOutcomes, riskPct, n, threshold) })))
      setRunning(false)
    }, 0)
  }

  const payoffRatio = overall.avgLoss > 0 ? overall.avgWin / overall.avgLoss : 0
  const winRateFrac = overall.winRate / 100
  const kellyPct = payoffRatio > 0 ? Math.max(0, Math.min(1, winRateFrac - (1 - winRateFrac) / payoffRatio)) * 100 : 0

  return (
    <div className="card" style={{ padding: 'var(--sp-4)' }}>
      <div style={{ color: 'var(--text-muted)', fontSize: 12, marginBottom: 12 }}>
        Live Account Risk — no firm rules to comply with here, so this models risk against your own
        capital instead: how likely a given risk-per-trade size is to draw your account down by a
        threshold you choose, bootstrapped from this account's own logged R-multiples.
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--sp-3)', alignItems: 'flex-end', marginBottom: 14 }}>
        <label className="field" style={{ minWidth: 140 }}>
          Trades to Simulate
          <input className="input" type="number" step="any" value={numTrades} onChange={(e) => setNumTrades(e.target.value)} />
        </label>
        <label className="field" style={{ minWidth: 140 }}>
          Ruin Threshold (drawdown %)
          <input className="input" type="number" step="any" value={ruinThresholdPct} onChange={(e) => setRuinThresholdPct(e.target.value)} />
        </label>
        <button className="btn btn-primary" onClick={run} disabled={running || !trades}>
          {running ? 'Simulating…' : 'Run Risk-of-Ruin'}
        </button>
      </div>

      {insufficientData && (
        <div style={{ color: 'var(--text-dim)', fontSize: 11.5, marginBottom: 10 }}>
          Fewer than 10 trades on this account have an R-multiple or risk value logged, so this uses a
          neutral placeholder distribution — log risk-per-trade and R-multiple on more trades for an
          estimate based on your real edge.
        </div>
      )}

      {rows && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 16 }}>
          {rows.map((r) => (
            <div
              key={r.riskPct}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 16,
                padding: '6px 10px',
                borderRadius: 'var(--radius-control)',
                background: 'rgba(var(--ink-rgb),0.04)',
              }}
            >
              <div style={{ minWidth: 70, fontWeight: 600, fontSize: 12.5 }}>{r.riskPct}% risk</div>
              <div style={{ fontSize: 12, color: r.ruinProbPct >= 20 ? 'var(--red)' : 'var(--text-muted)' }}>
                Ruin prob. {r.ruinProbPct.toFixed(1)}%
              </div>
              <div style={{ fontSize: 12, color: r.medianReturnPct >= 0 ? 'var(--green)' : 'var(--red)' }}>
                Median return {r.medianReturnPct >= 0 ? '+' : ''}
                {r.medianReturnPct.toFixed(1)}%
              </div>
            </div>
          ))}
        </div>
      )}

      <div style={{ borderTop: '1px solid var(--border-soft)', paddingTop: 12 }}>
        <div style={{ color: 'var(--text-muted)', fontSize: 12, marginBottom: 8 }}>Kelly Criterion — suggested risk per trade</div>
        <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
          <StatBox label="Full Kelly" value={overall.totalTrades >= 10 ? `${kellyPct.toFixed(1)}%` : '—'} />
          <StatBox label="Half Kelly (safer)" value={overall.totalTrades >= 10 ? `${(kellyPct / 2).toFixed(1)}%` : '—'} color="var(--accent)" />
          <StatBox label="Your Win Rate / Payoff" value={overall.totalTrades >= 10 ? `${overall.winRate}% / ${payoffRatio.toFixed(2)}` : '—'} />
        </div>
        {overall.totalTrades < 10 && (
          <div style={{ color: 'var(--text-dim)', fontSize: 11.5, marginTop: 8 }}>Log at least 10 trades to unlock a Kelly sizing suggestion.</div>
        )}
      </div>
    </div>
  )
}
