import { useEffect, useMemo, useState } from 'react'
import { Select } from '../components/Select'
import {
  PROP_FIRM_TIERS,
  PROP_FIRM_VARIANTS,
  getPreset,
  presetToSimParams,
  money,
  type PropTier,
  type PropVariantId,
} from '../propFirmPresets'
import { normalizedDailyPnls, qualifyingDayStats, bootstrapCycleSuccess } from '../tradingPlan'
import type { FundedChallengeResult, Strategy, StrategyPerformance, Trade } from '../types'
import { formatRatio } from '../format'

function StatBox({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div style={{ minWidth: 96 }}>
      <div style={{ color: 'var(--text-muted)', fontSize: 10.5, marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: 14, fontWeight: 600, color: color ?? 'var(--text)' }}>{value}</div>
    </div>
  )
}

const VARIANT_IDS = Object.keys(PROP_FIRM_VARIANTS) as PropVariantId[]

export function TradingPlanPage({ strategies }: { strategies: Strategy[] }) {
  const [variant, setVariant] = useState<PropVariantId>('apex_intraday')
  const [tier, setTier] = useState<PropTier>(50000)
  const [riskPerTradePct, setRiskPerTradePct] = useState('0.5')
  const [performances, setPerformances] = useState<StrategyPerformance[] | null>(null)
  const [tradesByStrategy, setTradesByStrategy] = useState<Record<number, Trade[]>>({})
  const [simResults, setSimResults] = useState<Record<number, FundedChallengeResult>>({})
  const [running, setRunning] = useState(false)

  useEffect(() => {
    window.api.strategies.getPerformance().then(setPerformances)
  }, [])

  useEffect(() => {
    let cancelled = false
    setTradesByStrategy({})
    setSimResults({})
    Promise.all(
      strategies.map((s) => window.api.trades.getAll({ strategyId: s.id }).then((t: Trade[]) => [s.id, t] as const)),
    ).then((entries) => {
      if (!cancelled) setTradesByStrategy(Object.fromEntries(entries))
    })
    return () => {
      cancelled = true
    }
  }, [strategies])

  const preset = getPreset(variant, tier)
  const risk = parseFloat(riskPerTradePct) || 0.5

  const rows = useMemo(() => {
    return strategies.map((s) => {
      const perf = performances?.find((p) => p.id === s.id) ?? null
      const trades = tradesByStrategy[s.id] ?? []
      const dailyPnls = normalizedDailyPnls(trades, risk, tier)
      const qual = qualifyingDayStats(dailyPnls, preset.payout)
      const cycle = bootstrapCycleSuccess(dailyPnls, preset.payout, preset.consistencyPct)
      return { strategy: s, perf, dailyPnls, qual, cycle, sim: simResults[s.id] }
    })
  }, [strategies, performances, tradesByStrategy, preset, risk, tier, simResults])

  const buildPlan = async () => {
    setRunning(true)
    try {
      const sim = presetToSimParams(preset, tier)
      const entries = await Promise.all(
        strategies.map(async (s) => {
          const res: FundedChallengeResult = await window.api.analytics.simulateFundedChallenge({
            profitTargetPct: sim.profitTargetPct,
            maxDailyLossPct: sim.maxDailyLossPct,
            maxOverallDrawdownPct: sim.maxOverallDrawdownPct,
            riskPerTradePct: risk,
            tradingDaysRemaining: preset.maxDays ?? 60,
            strategyId: s.id,
          })
          return [s.id, res] as const
        }),
      )
      setSimResults(Object.fromEntries(entries))
    } finally {
      setRunning(false)
    }
  }

  if (strategies.length === 0) {
    return (
      <div className="card" style={{ padding: 'var(--sp-5)', color: 'var(--text-muted)' }}>
        Add a strategy in Playbooks first — the plan is built around your logged strategies' real stats.
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-4)' }}>
      <div className="card" style={{ padding: 'var(--sp-4)' }}>
        <div style={{ color: 'var(--text-muted)', fontSize: 12, marginBottom: 12 }}>
          Trading Plan — pick the firm, program, and account size you're planning to trade, and this
          projects each of your strategies onto it: your real trade history, replayed at the risk % you
          set, against that firm's actual eval and payout rules. It answers "how often will I actually get
          paid" — not just "will I pass."
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--sp-3)', alignItems: 'flex-end' }}>
          <label className="field" style={{ minWidth: 180 }}>
            Firm / Program
            <Select
              ariaLabel="Firm and program"
              width="100%"
              value={variant}
              onChange={(v) => setVariant(v as PropVariantId)}
              options={VARIANT_IDS.map((id) => ({ value: id, label: `${PROP_FIRM_VARIANTS[id].firm} — ${PROP_FIRM_VARIANTS[id].program}` }))}
            />
          </label>
          <label className="field" style={{ minWidth: 130 }}>
            Account Size
            <Select
              ariaLabel="Account size tier"
              width="100%"
              value={String(tier)}
              onChange={(v) => setTier(Number(v) as PropTier)}
              options={PROP_FIRM_TIERS.map((t) => ({ value: String(t), label: money(t) }))}
            />
          </label>
          <label className="field" style={{ minWidth: 120 }}>
            Risk per Trade %
            <input className="input" type="number" step="any" value={riskPerTradePct} onChange={(e) => setRiskPerTradePct(e.target.value)} />
          </label>
          <button className="btn btn-primary" onClick={buildPlan} disabled={running}>
            {running ? 'Building…' : 'Build My Plan'}
          </button>
        </div>
      </div>

      <div className="card" style={{ padding: 'var(--sp-4)' }}>
        <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 6 }}>
          {preset.firm} — {preset.program} · {money(tier)}
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>
          Eval: target {money(preset.profitTarget)} · max drawdown {money(preset.maxDrawdown)}
          {preset.dailyLossLimit != null ? ` · daily loss limit ${money(preset.dailyLossLimit)}` : ' · no daily loss limit'}
          {preset.maxDays ? ` · ${preset.maxDays}-day window` : ' · no stated day limit'}
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
          Payout:{' '}
          {preset.payout.cycleDays != null
            ? `${preset.payout.cycleDays}-day cycles, ${money(preset.payout.minProfitGoalPerCycle!)} profit goal per cycle, `
            : `${preset.payout.minQualifyingDays} qualifying days (≥ ${money(preset.payout.minDailyProfit!)} net) needed, `}
          consistency cap {preset.consistencyPct}% · min payout {money(preset.payout.minPayoutRequest)} · safety net {money(preset.payout.safetyNet)}
        </div>
        {preset.caveat && <div style={{ fontSize: 10.5, color: 'var(--text-dim)', marginTop: 6 }}>{preset.caveat}</div>}
      </div>

      {rows.map(({ strategy, perf, dailyPnls, qual, cycle, sim }) => (
        <div key={strategy.id} className="card" style={{ padding: 'var(--sp-4)' }}>
          <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>{strategy.name}</div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, marginBottom: 12 }}>
            <StatBox label="Trades Logged" value={perf ? String(perf.tradeCount) : '—'} />
            <StatBox label="Win Rate" value={perf ? `${perf.winRate}%` : '—'} />
            <StatBox label="Profit Factor" value={perf ? formatRatio(perf.profitFactor) : '—'} />
            <StatBox label="Avg R-Multiple" value={perf ? perf.avgRMultiple.toFixed(2) : '—'} />
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, marginBottom: 12, borderTop: '1px solid var(--border-soft)', paddingTop: 10 }}>
            {sim ? (
              <>
                <StatBox label="Eval Pass Prob." value={`${sim.passRate}%`} color="var(--green)" />
                <StatBox label="Median Days to Pass" value={sim.medianDaysToPass !== null ? String(sim.medianDaysToPass) : '—'} />
                <StatBox label="DD Breach" value={`${sim.maxDrawdownBreachRate}%`} color="var(--red)" />
              </>
            ) : (
              <div style={{ fontSize: 11.5, color: 'var(--text-dim)' }}>Click "Build My Plan" to estimate eval pass odds.</div>
            )}
          </div>

          <div style={{ borderTop: '1px solid var(--border-soft)', paddingTop: 10 }}>
            {dailyPnls.length < 5 ? (
              <div style={{ fontSize: 11.5, color: 'var(--text-dim)' }}>
                Not enough distinct trading days logged yet ({dailyPnls.length}) for a reliable cadence estimate.
              </div>
            ) : qual ? (
              <div style={{ fontSize: 12.5 }}>
                About <strong>{(qual.rate * 100).toFixed(0)}%</strong> of your trading days at {risk}% risk would clear{' '}
                {preset.firm}'s {money(preset.payout.minDailyProfit!)} qualifying-day bar on a {money(tier)} account. At that
                rate, expect to bank the {preset.payout.minQualifyingDays} qualifying days you need for a payout roughly every{' '}
                <strong>{qual.avgTradingDaysToPayout != null ? Math.ceil(qual.avgTradingDaysToPayout) : '—'} trading days</strong> you
                take — there's no fixed calendar cycle, it's purely a function of how often you trade and clear the bar.
              </div>
            ) : cycle ? (
              <div style={{ fontSize: 12.5 }}>
                Across {preset.payout.cycleDays}-day payout cycles, about <strong>{cycle.successRate.toFixed(0)}%</strong> of
                cycles would clear both the {money(preset.payout.minProfitGoalPerCycle!)} profit goal and the{' '}
                {preset.consistencyPct}% consistency cap at {risk}% risk on a {money(tier)} account — average cycle P&L{' '}
                {money(Math.round(cycle.avgPnlPerCycle))}.
              </div>
            ) : (
              <div style={{ fontSize: 11.5, color: 'var(--text-dim)' }}>Cadence rules not available for this program.</div>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
