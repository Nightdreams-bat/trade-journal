import { useEffect, useMemo, useState } from 'react'
import { Select } from '../components/Select'
import { Plus, X } from '../components/icons'
import { Stagger, Reveal, CountUpValue } from '../anim'
import { PROP_FIRM_TIERS, PROP_FIRM_VARIANTS, getPreset, money, type PropTier, type PropVariantId } from '../propFirmPresets'
import { computeEligibility, type DailyLedgerRow } from '../payoutEligibility'
import { loadPayoutCalcState, savePayoutCalcState, makeId, type PayoutCalcState } from '../payoutCalcStorage'
import type { Account, Trade } from '../types'

const VARIANT_IDS = Object.keys(PROP_FIRM_VARIANTS) as PropVariantId[]

function todayIso() {
  return new Date().toISOString().slice(0, 10)
}

function Stat({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div style={{ minWidth: 108 }}>
      <div style={{ color: 'var(--text-muted)', fontSize: 10.5, marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: 15, fontWeight: 600, color: color ?? 'var(--text)' }}>
        <CountUpValue value={value} />
      </div>
    </div>
  )
}

function Badge({ ok, text }: { ok: boolean | null; text: string }) {
  if (ok == null) {
    return (
      <span style={{ fontSize: 11, padding: '3px 8px', borderRadius: 'var(--radius-pill)', background: 'var(--border-soft)', color: 'var(--text-dim)' }}>
        {text}
      </span>
    )
  }
  return (
    <span
      style={{
        fontSize: 11,
        padding: '3px 8px',
        borderRadius: 'var(--radius-pill)',
        background: ok ? 'var(--green-soft)' : 'var(--red-soft)',
        color: ok ? 'var(--green)' : 'var(--red)',
        fontWeight: 600,
      }}
    >
      {text}
    </span>
  )
}

export function PayoutCalculatorPage({ accounts }: { accounts: Account[] }) {
  const [state, setState] = useState<PayoutCalcState>(loadPayoutCalcState)
  const [trades, setTrades] = useState<Trade[] | null>(null)
  const [newEntryDate, setNewEntryDate] = useState(todayIso)
  const [newEntryPnl, setNewEntryPnl] = useState('')
  const [newPayoutDate, setNewPayoutDate] = useState(todayIso)
  const [newPayoutAmount, setNewPayoutAmount] = useState('')

  useEffect(() => {
    savePayoutCalcState(state)
  }, [state])

  useEffect(() => {
    if (state.mode !== 'account' || state.accountId == null) {
      setTrades(null)
      return
    }
    let cancelled = false
    window.api.trades.getAll({ accountId: state.accountId }).then((t: Trade[]) => {
      if (!cancelled) setTrades(t)
    })
    return () => {
      cancelled = true
    }
  }, [state.mode, state.accountId])

  const update = (patch: Partial<PayoutCalcState>) => setState((s) => ({ ...s, ...patch }))

  const preset = getPreset(state.variant, state.tier)

  const dailyEntries = useMemo<DailyLedgerRow[]>(() => {
    if (state.mode === 'account') {
      if (!trades) return []
      const byDate = new Map<string, number>()
      for (const t of trades) byDate.set(t.date, (byDate.get(t.date) ?? 0) + t.pnl)
      return [...byDate.entries()].map(([date, pnl]) => ({ date, pnl }))
    }
    return state.manualEntries.map((e) => ({ date: e.date, pnl: e.pnl, id: e.id }))
  }, [state.mode, state.manualEntries, trades])

  const result = useMemo(
    () => computeEligibility(dailyEntries, state.payoutLog, state.paStartDate, state.tier, preset),
    [dailyEntries, state.payoutLog, state.paStartDate, state.tier, preset],
  )

  const addManualEntry = () => {
    const pnl = parseFloat(newEntryPnl)
    if (!newEntryDate || Number.isNaN(pnl)) return
    update({ manualEntries: [...state.manualEntries, { id: makeId(), date: newEntryDate, pnl }] })
    setNewEntryPnl('')
  }
  const removeManualEntry = (id: string) => update({ manualEntries: state.manualEntries.filter((e) => e.id !== id) })

  const addPayout = () => {
    const amount = parseFloat(newPayoutAmount)
    if (!newPayoutDate || Number.isNaN(amount) || amount <= 0) return
    update({ payoutLog: [...state.payoutLog, { id: makeId(), date: newPayoutDate, amount }] })
    setNewPayoutAmount('')
  }
  const removePayout = (id: string) => update({ payoutLog: state.payoutLog.filter((p) => p.id !== id) })

  const sortedPayoutLog = [...state.payoutLog].sort((a, b) => a.date.localeCompare(b.date))

  return (
    <Stagger style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-4)' }}>
      <Reveal className="card" style={{ padding: 'var(--sp-4)' }}>
        <div style={{ color: 'var(--text-muted)', fontSize: 12, marginBottom: 12 }}>
          Payout Calculator — checks a funded account's eligibility for its next payout against Apex's and Lucid's
          actual current rules (verified against each firm's own site, 2026-09-01): safety net, consistency cap,
          qualifying days or payout cycle, and the per-request payout cap. Pull real daily P&amp;L from a linked
          journal account, or log it manually — the same idea as a spreadsheet payout tracker, updated to the
          current rules instead of an old 30% consistency rule.
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--sp-3)', alignItems: 'flex-end' }}>
          <label className="field" style={{ minWidth: 200 }}>
            Firm / Program
            <Select
              ariaLabel="Firm and program"
              width="100%"
              value={state.variant}
              onChange={(v) => update({ variant: v as PropVariantId })}
              options={VARIANT_IDS.map((id) => ({ value: id, label: `${PROP_FIRM_VARIANTS[id].firm} — ${PROP_FIRM_VARIANTS[id].program}` }))}
            />
          </label>
          <label className="field" style={{ minWidth: 130 }}>
            Account Size
            <Select
              ariaLabel="Account size tier"
              width="100%"
              value={String(state.tier)}
              onChange={(v) => update({ tier: Number(v) as PropTier })}
              options={PROP_FIRM_TIERS.map((t) => ({ value: String(t), label: money(t) }))}
            />
          </label>
          <label className="field" style={{ minWidth: 170 }}>
            Data Source
            <Select
              ariaLabel="Data source"
              width="100%"
              value={state.mode}
              onChange={(v) => update({ mode: v as 'account' | 'manual' })}
              options={[
                { value: 'manual', label: 'Manual Entry' },
                { value: 'account', label: 'Journal Account' },
              ]}
            />
          </label>
          {state.mode === 'account' && (
            <label className="field" style={{ minWidth: 170 }}>
              Account
              <Select
                ariaLabel="Linked account"
                width="100%"
                placeholder="Pick an account"
                value={state.accountId != null ? String(state.accountId) : ''}
                onChange={(v) => update({ accountId: v ? Number(v) : null })}
                options={accounts.map((a) => ({ value: String(a.id), label: a.name }))}
              />
            </label>
          )}
          <label className="field" style={{ minWidth: 150 }}>
            PA Start Date
            <input className="input" type="date" value={state.paStartDate} onChange={(e) => update({ paStartDate: e.target.value })} />
          </label>
        </div>
        {preset.caveat && <div style={{ fontSize: 10.5, color: 'var(--text-dim)', marginTop: 10 }}>{preset.caveat}</div>}
      </Reveal>

      <Reveal className="card" style={{ padding: 'var(--sp-4)' }}>
        <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 10 }}>
          {preset.firm} — {preset.program} · {money(state.tier)} rules
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, marginBottom: 10 }}>
          <Stat label="Profit Target" value={money(preset.profitTarget)} />
          <Stat label="Max Drawdown" value={money(preset.maxDrawdown)} />
          <Stat label="Daily Loss Limit" value={preset.dailyLossLimit != null ? money(preset.dailyLossLimit) : 'None'} />
          <Stat label="Consistency Cap" value={`${preset.consistencyPct}%`} />
          <Stat label="Safety Net" value={money(preset.payout.safetyNet)} />
          <Stat label="Min Balance to Request" value={money(preset.payout.safetyNet + preset.payout.minPayoutRequest)} />
          <Stat label="Min Payout Request" value={money(preset.payout.minPayoutRequest)} />
          <Stat label="Payout Split" value={`${preset.payoutSplitPct}% to you`} />
          <Stat label="Max Payouts" value={preset.maxPayouts != null ? String(preset.maxPayouts) : 'Not capped'} />
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
          {preset.payout.cycleDays != null && preset.payout.minProfitGoalPerCycle != null
            ? `Payout cycle: ${preset.payout.cycleDays} calendar days, ${money(preset.payout.minProfitGoalPerCycle)} profit goal per cycle.`
            : preset.payout.minQualifyingDays != null
              ? `Qualifying days: ${preset.payout.minQualifyingDays} day(s)${
                  preset.payout.minDailyProfit != null ? ` with net profit ≥ ${money(preset.payout.minDailyProfit)}` : ' with any net-positive P&L'
                } needed since the last payout.`
              : 'Payout gating rules for this program are not fully documented — treat the safety net and consistency cap below as the reliable checks.'}
        </div>
        {preset.payoutCapSchedule ? (
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6 }}>
            Payout cap by request #: {preset.payoutCapSchedule.map((c, i) => `#${i + 1} ${money(c)}`).join(' · ')} — the PA closes after the 6th.
          </div>
        ) : (
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6 }}>
            No per-request payout cap documented for this program — limited by balance above the safety net only.
          </div>
        )}
      </Reveal>

      <Reveal className="card" style={{ padding: 'var(--sp-4)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Eligibility for payout #{result.nextPayoutNumber}</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: result.eligible ? 'var(--green)' : 'var(--red)' }}>
              {result.eligible ? (
                <>
                  Eligible — request up to <CountUpValue value={money(Math.round(result.maxRequestableNow))} />
                </>
              ) : (
                'Not yet eligible'
              )}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap' }}>
            <Stat label="Current Balance" value={money(Math.round(result.currentBalance))} />
            <Stat
              label="Profit Since Last Payout"
              value={money(Math.round(result.profitSinceLastPayout))}
              color={result.profitSinceLastPayout >= 0 ? 'var(--green)' : 'var(--red)'}
            />
            <Stat label="Best Day (window)" value={money(Math.round(result.bestDaySinceLastPayout))} />
            <Stat label="Total Withdrawn" value={money(Math.round(result.totalWithdrawn))} />
          </div>
        </div>

        {!result.eligible && result.blockers.length > 0 && (
          <ul style={{ margin: '12px 0 0', paddingLeft: 18, fontSize: 12.5, color: 'var(--text-muted)' }}>
            {result.blockers.map((b, i) => (
              <li key={i} style={{ marginBottom: 4 }}>
                {b}
              </li>
            ))}
          </ul>
        )}

        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 10,
            marginTop: 14,
            borderTop: '1px solid var(--border-soft)',
            paddingTop: 12,
            alignItems: 'center',
          }}
        >
          <Badge ok={result.safetyNetOk} text={`Safety net ${result.safetyNetOk ? 'held' : 'breached'}`} />
          <Badge ok={result.minBalanceOk} text={`Balance to request ${result.minBalanceOk ? 'met' : 'short'}`} />
          <Badge
            ok={result.consistencyOk}
            text={`Consistency ${result.consistencyRatioPct != null ? result.consistencyRatioPct.toFixed(0) + '%' : '—'} / cap ${preset.consistencyPct}%`}
          />
          {result.qualifyingDaysNeeded != null && (
            <Badge ok={result.qualifyingOk} text={`Qualifying days ${result.qualifyingDaysCount}/${result.qualifyingDaysNeeded}`} />
          )}
          {result.cycleDaysNeeded != null && (
            <Badge ok={result.cycleOk} text={`Payout cycle ${result.cycleDaysElapsed}/${result.cycleDaysNeeded}d`} />
          )}
          <Badge ok={result.minPayoutMet} text={`Min payout ${result.minPayoutMet ? 'met' : 'not met'}`} />
          {result.payoutsRemaining != null && <Badge ok={result.payoutsRemaining > 0} text={`Payouts left ${result.payoutsRemaining}`} />}
        </div>
      </Reveal>

      <Reveal className="card" style={{ padding: 'var(--sp-4)' }}>
        <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 10 }}>Payout Log</div>
        <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <label className="field" style={{ minWidth: 140 }}>
            Date
            <input className="input" type="date" value={newPayoutDate} onChange={(e) => setNewPayoutDate(e.target.value)} />
          </label>
          <label className="field" style={{ minWidth: 120 }}>
            Amount
            <input className="input" type="number" step="any" value={newPayoutAmount} onChange={(e) => setNewPayoutAmount(e.target.value)} />
          </label>
          <button className="btn btn-primary" onClick={addPayout}>
            <Plus size={14} style={{ marginRight: 4 }} />
            Log Payout
          </button>
        </div>
        {sortedPayoutLog.length === 0 ? (
          <div style={{ fontSize: 12, color: 'var(--text-dim)' }}>No payouts logged yet.</div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Date</th>
                <th>Amount</th>
                <th>You Keep ({preset.payoutSplitPct}%)</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {sortedPayoutLog.map((p, i) => (
                <tr key={p.id}>
                  <td>{i + 1}</td>
                  <td>{p.date}</td>
                  <td>{money(p.amount)}</td>
                  <td>{money(Math.round((p.amount * preset.payoutSplitPct) / 100))}</td>
                  <td>
                    <button className="btn btn-danger" style={{ padding: '2px 8px' }} onClick={() => removePayout(p.id)}>
                      <X size={12} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Reveal>

      <Reveal className="card" style={{ padding: 'var(--sp-4)' }}>
        <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 10 }}>
          Daily P&amp;L Ledger {state.mode === 'account' ? '(from linked account trades)' : '(manual)'}
        </div>
        {state.mode === 'manual' && (
          <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <label className="field" style={{ minWidth: 140 }}>
              Date
              <input className="input" type="date" value={newEntryDate} onChange={(e) => setNewEntryDate(e.target.value)} />
            </label>
            <label className="field" style={{ minWidth: 120 }}>
              Net P&amp;L
              <input className="input" type="number" step="any" value={newEntryPnl} onChange={(e) => setNewEntryPnl(e.target.value)} />
            </label>
            <button className="btn btn-primary" onClick={addManualEntry}>
              <Plus size={14} style={{ marginRight: 4 }} />
              Add Day
            </button>
          </div>
        )}
        {state.mode === 'account' && !state.accountId ? (
          <div style={{ fontSize: 12, color: 'var(--text-dim)' }}>Pick an account above to pull its trade history.</div>
        ) : result.dailyRows.length === 0 ? (
          <div style={{ fontSize: 12, color: 'var(--text-dim)' }}>No days logged on/after the PA start date yet.</div>
        ) : (
          <div style={{ maxHeight: 360, overflowY: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Net P&amp;L</th>
                  <th>Balance</th>
                  <th>Qualifying Day</th>
                  {state.mode === 'manual' && <th></th>}
                </tr>
              </thead>
              <tbody>
                {result.dailyRows.map((r, i) => (
                  <tr key={r.id ?? `${r.date}-${i}`}>
                    <td>{r.date}</td>
                    <td className={r.pnl >= 0 ? 'pnl-positive' : 'pnl-negative'}>
                      {r.pnl >= 0 ? '+' : ''}
                      {r.pnl.toFixed(2)}
                    </td>
                    <td>{money(Math.round(r.cumulativeBalance))}</td>
                    <td className="checkbox-cell">{r.qualifies ? '✅' : '—'}</td>
                    {state.mode === 'manual' && (
                      <td>
                        {r.id && (
                          <button className="btn btn-danger" style={{ padding: '2px 8px' }} onClick={() => removeManualEntry(r.id!)}>
                            <X size={12} />
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Reveal>
    </Stagger>
  )
}
