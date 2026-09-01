import { useEffect, useMemo, useState } from 'react'
import { Select } from '../components/Select'
import { FilterBar } from '../components/FilterBar'
import { Stagger, Reveal, CountUpValue } from '../anim'
import {
  PROP_FIRM_TIERS,
  PROP_FIRM_VARIANTS,
  getPreset,
  presetToSimParams,
  money,
  type PropTier,
  type PropVariantId,
} from '../propFirmPresets'
import {
  normalizedDailyPnls,
  qualifyingDayStats,
  bootstrapCycleSuccess,
  kellyPercent,
  systemQualityNumber,
  streakStats,
  confluenceEdgeBreakdown,
  MIN_SAMPLE,
} from '../tradingPlan'
import type { Account, Confluence, FundedChallengeResult, Strategy, StrategyPerformance, Trade } from '../types'
import { formatRatio } from '../format'

function StatBox({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div style={{ minWidth: 96 }}>
      <div style={{ color: 'var(--text-muted)', fontSize: 10.5, marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: 14, fontWeight: 600, color: color ?? 'var(--text)' }}>
        <CountUpValue value={value} />
      </div>
    </div>
  )
}

const VARIANT_IDS = Object.keys(PROP_FIRM_VARIANTS) as PropVariantId[]

export function TradingPlanPage({
  strategies,
  accounts,
  confluences,
}: {
  strategies: Strategy[]
  accounts: Account[]
  confluences: Confluence[]
}) {
  const [variant, setVariant] = useState<PropVariantId>('apex_intraday')
  const [tier, setTier] = useState<PropTier>(50000)
  const [riskPerTradePct, setRiskPerTradePct] = useState('0.5')
  const [accountId, setAccountId] = useState<number | null>(null)
  const [strategyId, setStrategyId] = useState<number | null>(null)
  const [performances, setPerformances] = useState<StrategyPerformance[] | null>(null)
  const [tradesByStrategy, setTradesByStrategy] = useState<Record<number, Trade[]>>({})
  const [simResults, setSimResults] = useState<Record<number, FundedChallengeResult>>({})
  const [running, setRunning] = useState(false)

  const visibleStrategies = strategyId != null ? strategies.filter((s) => s.id === strategyId) : strategies

  useEffect(() => {
    window.api.strategies.getPerformance().then(setPerformances)
  }, [])

  useEffect(() => {
    let cancelled = false
    setTradesByStrategy({})
    setSimResults({})
    Promise.all(
      visibleStrategies.map((s) =>
        window.api.trades.getAll({ strategyId: s.id, accountId }).then((t: Trade[]) => [s.id, t] as const),
      ),
    ).then((entries) => {
      if (!cancelled) setTradesByStrategy(Object.fromEntries(entries))
    })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visibleStrategies.map((s) => s.id).join(','), accountId])

  const preset = getPreset(variant, tier)
  const risk = parseFloat(riskPerTradePct) || 0.5

  const rows = useMemo(() => {
    return visibleStrategies.map((s) => {
      const perf = performances?.find((p) => p.id === s.id) ?? null
      const trades = tradesByStrategy[s.id] ?? []
      const dailyPnls = normalizedDailyPnls(trades, risk, tier)
      const qual = qualifyingDayStats(dailyPnls, preset.payout)
      const cycle = bootstrapCycleSuccess(dailyPnls, preset.payout, preset.consistencyPct)
      const kelly = perf ? kellyPercent(perf.winRate, perf.avgWin, perf.avgLoss) : null
      const sqn = systemQualityNumber(trades)
      const streaks = streakStats(trades)
      const confluenceEdges = confluenceEdgeBreakdown(trades, confluences)
      return { strategy: s, perf, dailyPnls, qual, cycle, sim: simResults[s.id], kelly, sqn, streaks, confluenceEdges }
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visibleStrategies.map((s) => s.id).join(','), performances, tradesByStrategy, preset, risk, tier, simResults, confluences])

  const buildPlan = async () => {
    setRunning(true)
    try {
      const sim = presetToSimParams(preset, tier)
      const entries = await Promise.all(
        visibleStrategies.map(async (s) => {
          const res: FundedChallengeResult = await window.api.analytics.simulateFundedChallenge({
            profitTargetPct: sim.profitTargetPct,
            maxDailyLossPct: sim.maxDailyLossPct,
            maxOverallDrawdownPct: sim.maxOverallDrawdownPct,
            riskPerTradePct: risk,
            tradingDaysRemaining: preset.maxDays ?? 60,
            strategyId: s.id,
            accountId,
            drawdownMode: sim.drawdownMode,
            dailyLossMode: sim.dailyLossMode,
            consistencyPct: sim.consistencyPct,
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
    <Stagger style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-4)' }}>
      <Reveal className="card" style={{ padding: 'var(--sp-4)' }}>
        <div style={{ color: 'var(--text-muted)', fontSize: 12, marginBottom: 12 }}>
          Trading Plan — pick the firm, program, and account size you're planning to trade, and this
          projects each of your strategies onto it: your real trade history, replayed at the risk % you
          set, against that firm's actual eval and payout rules. It answers "how often will I actually get
          paid" — not just "will I pass."
        </div>

        <div style={{ marginBottom: 12 }}>
          <FilterBar
            accounts={accounts}
            strategies={strategies}
            accountId={accountId}
            strategyId={strategyId}
            onAccountChange={setAccountId}
            onStrategyChange={setStrategyId}
          />
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
      </Reveal>

      <Reveal className="card" style={{ padding: 'var(--sp-4)' }}>
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
            : preset.payout.minDailyProfit != null
              ? `${preset.payout.minQualifyingDays} qualifying days (≥ ${money(preset.payout.minDailyProfit)} net) needed, `
              : `${preset.payout.minQualifyingDays} profitable trading days needed, `}
          consistency cap {preset.consistencyPct}% · min payout {money(preset.payout.minPayoutRequest)} · safety net {money(preset.payout.safetyNet)}
        </div>
        {preset.caveat && <div style={{ fontSize: 10.5, color: 'var(--text-dim)', marginTop: 6 }}>{preset.caveat}</div>}
      </Reveal>

      {rows.map(({ strategy, perf, dailyPnls, qual, cycle, sim, kelly, sqn, streaks, confluenceEdges }) => (
        <Reveal key={strategy.id} className="card" style={{ padding: 'var(--sp-4)' }}>
          <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>{strategy.name}</div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, marginBottom: 12 }}>
            <StatBox label="Trades Logged" value={perf ? String(perf.tradeCount) : '—'} />
            <StatBox label="Win Rate" value={perf ? `${perf.winRate}%` : '—'} />
            <StatBox label="Profit Factor" value={perf ? formatRatio(perf.profitFactor) : '—'} />
            <StatBox label="Avg R-Multiple" value={perf ? perf.avgRMultiple.toFixed(2) : '—'} />
            <StatBox
              label="Expectancy / Trade"
              value={perf ? `${perf.expectancy >= 0 ? '+' : ''}$${perf.expectancy.toFixed(2)}` : '—'}
              color={perf ? (perf.expectancy >= 0 ? 'var(--green)' : 'var(--red)') : undefined}
            />
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, marginBottom: 12, borderTop: '1px solid var(--border-soft)', paddingTop: 10 }}>
            {sim ? (
              <>
                <StatBox label="Eval Pass Prob." value={`${sim.passRate}%`} color="var(--green)" />
                <StatBox label="Risk of Ruin" value={`${sim.riskOfRuin}%`} color="var(--red)" />
                <StatBox label="Median Days to Pass" value={sim.medianDaysToPass !== null ? String(sim.medianDaysToPass) : '—'} />
                <StatBox label="Expectancy / Trade (sim)" value={`${sim.expectancyR >= 0 ? '+' : ''}${sim.expectancyR}R`} color={sim.expectancyR >= 0 ? 'var(--green)' : 'var(--red)'} />
                <StatBox
                  label="Payout-Ready on Pass"
                  value={sim.consistencyBreachRate !== null ? `${Math.round(100 - sim.consistencyBreachRate)}%` : '—'}
                  color={sim.consistencyBreachRate !== null && sim.consistencyBreachRate > 30 ? 'var(--red)' : undefined}
                />
              </>
            ) : (
              <div style={{ fontSize: 11.5, color: 'var(--text-dim)' }}>Click "Build My Plan" to estimate eval pass odds.</div>
            )}
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, marginBottom: 12, borderTop: '1px solid var(--border-soft)', paddingTop: 10 }}>
            <StatBox
              label="Kelly-Suggested Risk %"
              value={kelly != null ? (perf && perf.tradeCount < MIN_SAMPLE ? `~${kelly.toFixed(2)}%` : `${kelly.toFixed(2)}%`) : '—'}
              color={kelly != null ? (kelly > 0 ? 'var(--green)' : 'var(--red)') : undefined}
            />
            <StatBox
              label="SQN (edge confidence)"
              value={sqn ? `${sqn.sqn.toFixed(2)} — ${sqn.label}${sqn.n < MIN_SAMPLE ? ' (early)' : ''}` : '—'}
              color={sqn ? (sqn.sqn >= 2 ? 'var(--green)' : sqn.sqn < 1 ? 'var(--red)' : undefined) : undefined}
            />
            <StatBox
              label="Max Loss Streak"
              value={streaks ? String(streaks.maxLossStreak) : '—'}
              color={streaks && streaks.maxLossStreak >= 5 ? 'var(--red)' : undefined}
            />
            <StatBox
              label="Current Streak"
              value={streaks && streaks.currentType ? `${streaks.currentStreak} ${streaks.currentType === 'win' ? 'W' : 'L'}` : '—'}
              color={streaks?.currentType === 'win' ? 'var(--green)' : streaks?.currentType === 'loss' ? 'var(--red)' : undefined}
            />
          </div>

          {perf && perf.tradeCount > 0 && (
            <div style={{ borderTop: '1px solid var(--border-soft)', paddingTop: 10, marginBottom: 12 }}>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6 }}>
                Edge by confluence — which tags this strategy's wins actually come from
              </div>
              {confluenceEdges.length === 0 ? (
                <div style={{ fontSize: 11.5, color: 'var(--text-dim)' }}>
                  No confluences tagged on this strategy's trades yet — tag trades with confluences to see which ones carry the edge.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {confluenceEdges.map((c) => (
                    <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 12 }}>
                      <span style={{ minWidth: 140, color: 'var(--text)' }}>{c.name}</span>
                      <span style={{ color: 'var(--text-muted)', minWidth: 90 }}>{c.count} trade{c.count === 1 ? '' : 's'}</span>
                      <span style={{ color: 'var(--text-muted)', minWidth: 70 }}>{c.winRate}% win</span>
                      <span style={{ color: c.expectancy >= 0 ? 'var(--green)' : 'var(--red)', fontWeight: 600 }}>
                        {c.expectancy >= 0 ? '+' : ''}${c.expectancy.toFixed(2)}/trade
                      </span>
                      {c.count < MIN_SAMPLE && (
                        <span style={{ fontSize: 10, color: 'var(--text-dim)' }}>· small sample</span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

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
        </Reveal>
      ))}
    </Stagger>
  )
}
