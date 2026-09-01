import { useEffect, useMemo, useState } from 'react'
import { Select } from './Select'
import {
  PROP_FIRM_TIERS,
  PROP_FIRM_VARIANTS,
  getPreset,
  presetToSimParams,
  money,
  type PropTier,
  type PropVariantId,
} from '../propFirmPresets'
import type { FundedChallengeResult, Trade } from '../types'

function StatBox({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div style={{ minWidth: 88 }}>
      <div style={{ color: 'var(--text-muted)', fontSize: 10.5, marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: 14, fontWeight: 600, color: color ?? 'var(--text)' }}>{value}</div>
    </div>
  )
}

const VARIANT_IDS = Object.keys(PROP_FIRM_VARIANTS) as PropVariantId[]

export function PropFirmFitPanel({ accountId, strategyId = null }: { accountId: number | null; strategyId?: number | null }) {
  const [tier, setTier] = useState<PropTier>(50000)
  const [riskPerTradePct, setRiskPerTradePct] = useState('1')
  const [tradingDaysBudget, setTradingDaysBudget] = useState('30')
  const [running, setRunning] = useState(false)
  const [results, setResults] = useState<Partial<Record<PropVariantId, FundedChallengeResult>>>({})
  const [trades, setTrades] = useState<Trade[] | null>(null)

  useEffect(() => {
    let cancelled = false
    setTrades(null)
    setResults({})
    window.api.trades.getAll({ accountId, strategyId }).then((t: Trade[]) => {
      if (!cancelled) setTrades(t)
    })
    return () => {
      cancelled = true
    }
  }, [accountId, strategyId])

  const consistency = useMemo(() => {
    if (!trades || trades.length === 0) return null
    const byDate = new Map<string, number>()
    for (const t of trades) byDate.set(t.date, (byDate.get(t.date) ?? 0) + t.pnl)
    const totalPnl = [...byDate.values()].reduce((s, v) => s + v, 0)
    const bestDay = Math.max(0, ...byDate.values())
    if (totalPnl <= 0) return { ratio: null, totalPnl, bestDay }
    return { ratio: (bestDay / totalPnl) * 100, totalPnl, bestDay }
  }, [trades])

  const runComparison = async () => {
    setRunning(true)
    try {
      const days = parseFloat(tradingDaysBudget) || 30
      const risk = parseFloat(riskPerTradePct) || 1
      const entries = await Promise.all(
        VARIANT_IDS.map(async (id) => {
          const preset = getPreset(id, tier)
          const sim = presetToSimParams(preset, tier)
          const res: FundedChallengeResult = await window.api.analytics.simulateFundedChallenge({
            profitTargetPct: sim.profitTargetPct,
            maxDailyLossPct: sim.maxDailyLossPct,
            maxOverallDrawdownPct: sim.maxOverallDrawdownPct,
            riskPerTradePct: risk,
            tradingDaysRemaining: preset.maxDays ? Math.min(days, preset.maxDays) : days,
            accountId,
            strategyId,
            drawdownMode: sim.drawdownMode,
            dailyLossMode: sim.dailyLossMode,
            consistencyPct: sim.consistencyPct,
          })
          return [id, res] as const
        }),
      )
      setResults(Object.fromEntries(entries))
    } finally {
      setRunning(false)
    }
  }

  return (
    <div className="card" style={{ padding: 'var(--sp-4)' }}>
      <div style={{ color: 'var(--text-muted)', fontSize: 12, marginBottom: 12 }}>
        Prop Firm Fit — simulates this account's own trade history against Apex's and Lucid's real
        published evaluation rules, side by side, so you can see which fits your edge before you pay
        for an eval. Each program's drawdown and daily-loss checks are modeled the way that firm
        actually enforces them (Apex Intraday checks continuously; Apex EOD and both Lucid programs
        only re-base at the day's close), block-bootstrapped from your real trading days.
        "Payout-Ready on Pass" checks the same simulated runs against that firm's payout-stage
        consistency cap — a high pass rate with a low payout-ready number means you'd clear the
        eval but still be blocked from your first payout until you trade more days. Not a
        guarantee.
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--sp-3)', alignItems: 'flex-end', marginBottom: 14 }}>
        <label className="field" style={{ minWidth: 140 }}>
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
        <label className="field" style={{ minWidth: 120 }}>
          Days to Simulate
          <input className="input" type="number" step="any" value={tradingDaysBudget} onChange={(e) => setTradingDaysBudget(e.target.value)} />
        </label>
        <button className="btn btn-primary" onClick={runComparison} disabled={running || !trades}>
          {running ? 'Simulating…' : 'Compare Apex vs Lucid'}
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {VARIANT_IDS.map((id) => {
          const preset = getPreset(id, tier)
          const res = results[id]
          return (
            <div
              key={id}
              style={{
                border: '1px solid var(--border-soft)',
                borderRadius: 'var(--radius-control)',
                padding: '10px 12px',
                display: 'flex',
                flexWrap: 'wrap',
                gap: 16,
                alignItems: 'center',
              }}
            >
              <div style={{ minWidth: 140 }}>
                <div style={{ fontWeight: 600, fontSize: 13 }}>
                  {preset.firm} — {preset.program}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>
                  Target {money(preset.profitTarget)} · Max DD {money(preset.maxDrawdown)}
                  {preset.dailyLossLimit != null ? ` · DLL ${money(preset.dailyLossLimit)}` : ' · no DLL'}
                </div>
                {preset.caveat && (
                  <div style={{ fontSize: 10.5, color: 'var(--text-dim)', marginTop: 3, maxWidth: 260 }}>{preset.caveat}</div>
                )}
              </div>
              {res ? (
                <>
                  <StatBox label="Pass Prob." value={`${res.passRate}%`} color="var(--green)" />
                  <StatBox label="Risk of Ruin" value={`${res.riskOfRuin}%`} color="var(--red)" />
                  <StatBox label="DLL Breach" value={`${res.dailyLossBreachRate}%`} color={preset.dailyLossLimit != null ? 'var(--red)' : undefined} />
                  <StatBox
                    label="Median Days"
                    value={
                      res.medianDaysToPass !== null
                        ? `${res.medianDaysToPass}${res.p10DaysToPass !== null && res.p90DaysToPass !== null ? ` (${res.p10DaysToPass}–${res.p90DaysToPass})` : ''}`
                        : '—'
                    }
                  />
                  <StatBox label="Sim. Profit Factor" value={res.simProfitFactor ? res.simProfitFactor.median.toFixed(2) : '—'} />
                  <StatBox
                    label="Payout-Ready on Pass"
                    value={res.consistencyBreachRate !== null ? `${Math.round(100 - res.consistencyBreachRate)}%` : '—'}
                    color={res.consistencyBreachRate !== null && res.consistencyBreachRate > 30 ? 'var(--red)' : undefined}
                  />
                </>
              ) : (
                <div style={{ fontSize: 11.5, color: 'var(--text-dim)' }}>Run the comparison to see results.</div>
              )}
            </div>
          )
        })}
      </div>

      <div style={{ borderTop: '1px solid var(--border-soft)', marginTop: 14, paddingTop: 12 }}>
        <div style={{ color: 'var(--text-muted)', fontSize: 12, marginBottom: 8 }}>
          Consistency check — payout-stage rule, computed from this account's real logged days
        </div>
        {!trades ? (
          <div style={{ fontSize: 11.5, color: 'var(--text-dim)' }}>Loading…</div>
        ) : !consistency || consistency.totalPnl <= 0 ? (
          <div style={{ fontSize: 11.5, color: 'var(--text-dim)' }}>
            Not enough net-positive history yet to compute a meaningful consistency ratio.
          </div>
        ) : (
          <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', alignItems: 'center' }}>
            <StatBox label="Best Day / Total" value={`${consistency.ratio!.toFixed(1)}%`} />
            {(['apex_intraday', 'lucid_pro'] as PropVariantId[]).map((id) => {
              const cap = getPreset(id, tier).consistencyPct
              const ok = consistency.ratio! <= cap
              return (
                <div
                  key={id}
                  style={{
                    fontSize: 11,
                    padding: '3px 8px',
                    borderRadius: 'var(--radius-pill)',
                    background: ok ? 'var(--green-bg, rgba(16,185,129,0.12))' : 'var(--red-bg, rgba(226,61,69,0.12))',
                    color: ok ? 'var(--green)' : 'var(--red)',
                  }}
                >
                  {PROP_FIRM_VARIANTS[id].firm} cap {cap}% — {ok ? 'within' : 'exceeds'}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
