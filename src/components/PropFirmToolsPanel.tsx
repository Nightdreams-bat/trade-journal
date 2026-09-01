import { useState } from 'react'
import { Select } from './Select'
import type { AnalyticsSummary, FundedChallengeResult } from '../types'

function StatBox({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div style={{ flex: 1, minWidth: 110 }}>
      <div style={{ color: 'var(--text-muted)', fontSize: 11, marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 18, fontWeight: 600, color: color ?? 'var(--text)' }}>{value}</div>
    </div>
  )
}

export function PropFirmToolsPanel({
  overall,
  accountId = null,
  strategyId = null,
}: {
  overall: AnalyticsSummary['overall']
  accountId?: number | null
  strategyId?: number | null
}) {
  const [profitTargetPct, setProfitTargetPct] = useState('8')
  const [maxDailyLossPct, setMaxDailyLossPct] = useState('5')
  const [maxOverallDrawdownPct, setMaxOverallDrawdownPct] = useState('10')
  const [riskPerTradePct, setRiskPerTradePct] = useState('1')
  const [tradingDaysRemaining, setTradingDaysRemaining] = useState('30')
  const [drawdownMode, setDrawdownMode] = useState<'intraday' | 'eod'>('intraday')
  const [dailyLossMode, setDailyLossMode] = useState<'intraday' | 'eod'>('intraday')
  const [consistencyPct, setConsistencyPct] = useState('')
  const [running, setRunning] = useState(false)
  const [result, setResult] = useState<FundedChallengeResult | null>(null)

  const runSimulation = async () => {
    setRunning(true)
    try {
      const consistency = parseFloat(consistencyPct)
      const res = await window.api.analytics.simulateFundedChallenge({
        profitTargetPct: parseFloat(profitTargetPct) || 0,
        maxDailyLossPct: parseFloat(maxDailyLossPct) || 0,
        maxOverallDrawdownPct: parseFloat(maxOverallDrawdownPct) || 0,
        riskPerTradePct: parseFloat(riskPerTradePct) || 0,
        tradingDaysRemaining: parseFloat(tradingDaysRemaining) || 1,
        accountId,
        strategyId,
        drawdownMode,
        dailyLossMode,
        consistencyPct: Number.isFinite(consistency) ? consistency : null,
      })
      setResult(res)
    } finally {
      setRunning(false)
    }
  }

  const payoffRatio = overall.avgLoss > 0 ? overall.avgWin / overall.avgLoss : 0
  const winRateFrac = overall.winRate / 100
  const kellyPct = payoffRatio > 0 ? Math.max(0, Math.min(1, winRateFrac - (1 - winRateFrac) / payoffRatio)) * 100 : 0

  return (
    <div className="card" style={{ padding: 'var(--sp-4)' }}>
      <div style={{ color: 'var(--text-muted)', fontSize: 12, marginBottom: 12 }}>
        Prop Firm Tools — estimates computed locally from your own trade history, block-bootstrapped by real trading day (preserves your actual win/loss clustering and trades-per-day) across 10,000 simulated challenge paths. Treat as a rough guide, not a guarantee.
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--sp-3)', marginBottom: 16 }}>
        <label className="field" style={{ minWidth: 130 }}>Profit Target %
          <input className="input" type="number" step="any" value={profitTargetPct} onChange={(e) => setProfitTargetPct(e.target.value)} />
        </label>
        <label className="field" style={{ minWidth: 130 }}>Max Daily Loss %
          <input className="input" type="number" step="any" value={maxDailyLossPct} onChange={(e) => setMaxDailyLossPct(e.target.value)} />
        </label>
        <label className="field" style={{ minWidth: 130 }}>Max Drawdown %
          <input className="input" type="number" step="any" value={maxOverallDrawdownPct} onChange={(e) => setMaxOverallDrawdownPct(e.target.value)} />
        </label>
        <label className="field" style={{ minWidth: 130 }}>Risk per Trade %
          <input className="input" type="number" step="any" value={riskPerTradePct} onChange={(e) => setRiskPerTradePct(e.target.value)} />
        </label>
        <label className="field" style={{ minWidth: 130 }}>Trading Days Left
          <input className="input" type="number" step="any" value={tradingDaysRemaining} onChange={(e) => setTradingDaysRemaining(e.target.value)} />
        </label>
        <label className="field" style={{ minWidth: 170 }}>
          Drawdown Check
          <Select
            ariaLabel="Drawdown check mode"
            width="100%"
            value={drawdownMode}
            onChange={(v) => setDrawdownMode(v as 'intraday' | 'eod')}
            options={[
              { value: 'intraday', label: 'Continuous (intraday)' },
              { value: 'eod', label: 'End-of-day only' },
            ]}
          />
        </label>
        <label className="field" style={{ minWidth: 170 }}>
          Daily-Loss Check
          <Select
            ariaLabel="Daily loss check mode"
            width="100%"
            value={dailyLossMode}
            onChange={(v) => setDailyLossMode(v as 'intraday' | 'eod')}
            options={[
              { value: 'intraday', label: 'Continuous (intraday)' },
              { value: 'eod', label: 'End-of-day only' },
            ]}
          />
        </label>
        <label className="field" style={{ minWidth: 150 }}>
          Consistency Cap % <span style={{ color: 'var(--text-dim)' }}>(optional)</span>
          <input className="input" type="number" step="any" placeholder="e.g. 50" value={consistencyPct} onChange={(e) => setConsistencyPct(e.target.value)} />
        </label>
        <div style={{ display: 'flex', alignItems: 'flex-end' }}>
          <button className="btn btn-primary" onClick={runSimulation} disabled={running}>
            {running ? 'Simulating…' : 'Run Simulation'}
          </button>
        </div>
      </div>

      {result && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
          {result.insufficientData && (
            <div style={{ color: 'var(--text-dim)', fontSize: 11.5 }}>
              Fewer than 10 trades have an R-multiple or risk value logged, so this estimate uses a neutral placeholder distribution — log risk-per-trade and R-multiple on more trades for an estimate based on your real edge.
            </div>
          )}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>
            <StatBox label="Pass Probability" value={`${result.passRate}%`} color="var(--green)" />
            <StatBox label="Risk of Ruin" value={`${result.riskOfRuin}%`} color="var(--red)" />
            <StatBox label="Daily-Loss Breach" value={`${result.dailyLossBreachRate}%`} color="var(--red)" />
            <StatBox label="Max-Drawdown Breach" value={`${result.maxDrawdownBreachRate}%`} color="var(--red)" />
            <StatBox label="Ran Out of Days" value={`${result.ranOutOfDaysRate}%`} />
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>
            <StatBox
              label="Median Days to Pass"
              value={
                result.medianDaysToPass !== null
                  ? `${result.medianDaysToPass}${result.p10DaysToPass !== null && result.p90DaysToPass !== null ? ` (P10–P90: ${result.p10DaysToPass}–${result.p90DaysToPass})` : ''}`
                  : '—'
              }
            />
            <StatBox label="Expectancy / Trade" value={`${result.expectancyR >= 0 ? '+' : ''}${result.expectancyR}R (${result.expectancyPct >= 0 ? '+' : ''}${result.expectancyPct}%)`} color={result.expectancyR >= 0 ? 'var(--green)' : 'var(--red)'} />
            <StatBox label="Historical Profit Factor" value={result.historicalProfitFactor.toFixed(2)} />
            <StatBox label="Sim. Profit Factor (of passes)" value={result.simProfitFactor ? `${result.simProfitFactor.median.toFixed(2)} (P10–P90: ${result.simProfitFactor.p10.toFixed(2)}–${result.simProfitFactor.p90.toFixed(2)})` : '—'} />
            <StatBox label="Worst Drawdown Reached" value={`${result.simMaxDrawdownPct.median.toFixed(1)}% (P90: ${result.simMaxDrawdownPct.p90.toFixed(1)}%)`} />
            {result.consistencyBreachRate !== null && (
              <StatBox
                label="Payout-Ready on Pass"
                value={`${Math.round(100 - result.consistencyBreachRate)}%`}
                color={result.consistencyBreachRate > 30 ? 'var(--red)' : undefined}
              />
            )}
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>
            Based on {result.sampleSize} logged trade outcomes ({result.historicalWinRate}% win rate), block-bootstrapped by real trading day across 10,000 simulated paths.
          </div>
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
