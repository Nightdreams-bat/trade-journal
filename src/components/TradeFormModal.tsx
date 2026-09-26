import { useEffect, useState, type CSSProperties } from 'react'
import { format } from 'date-fns'
import { Modal } from './Modal'
import { ConfirmDialog } from './ConfirmDialog'
import { Select } from './Select'
import { TagInput } from './TagInput'
import { ImageGallery } from './ImageGallery'
import { ConfluenceSelector } from './ConfluenceSelector'
import { NewsNearEntry } from './NewsNearEntry'
import type { Account, Confluence, ForwardSignal, Strategy, Trade } from '../types'
import { DIRECTIONS, SESSIONS } from '../types'
import { signalHint, signalLabel } from '../forwardTest'

export function TradeFormModal({
  trade,
  accounts,
  strategies,
  confluences,
  onConfluencesChanged,
  onClose,
  onSaved,
  onDeleted,
  defaultSource = 'manual',
}: {
  trade?: Trade
  accounts: Account[]
  strategies: Strategy[]
  confluences: Confluence[]
  onConfluencesChanged: () => void
  onClose: () => void
  onSaved: () => void
  onDeleted?: () => void
  /** Source tag for a brand-new trade created from this modal ('manual' from the Trades
   *  tab, 'agent' from the Backtest tab). Ignored when editing an existing trade — its
   *  own source is preserved. */
  defaultSource?: 'manual' | 'agent'
}) {
  const [savedTrade, setSavedTrade] = useState<Trade | undefined>(trade)
  const [name, setName] = useState(trade?.name ?? '')
  const [date, setDate] = useState(trade?.date ?? format(new Date(), 'yyyy-MM-dd'))
  const [entryTime, setEntryTime] = useState(trade?.entry_time ?? '')
  const [pair, setPair] = useState(trade?.pair ?? '')
  const [session, setSession] = useState(trade?.session ?? SESSIONS[1])
  const [direction, setDirection] = useState(trade?.direction ?? DIRECTIONS[0])
  const [riskPerTrade, setRiskPerTrade] = useState(trade?.risk_per_trade?.toString() ?? '')
  const [pnl, setPnl] = useState(trade?.pnl?.toString() ?? '')
  const [rMultiple, setRMultiple] = useState(trade?.r_multiple?.toString() ?? '')
  const [followedPlan, setFollowedPlan] = useState(trade?.followed_plan ?? false)
  const [breakEven, setBreakEven] = useState(trade?.break_even ?? false)
  const [entryWin, setEntryWin] = useState(trade?.entry_win ?? false)
  const [strategyId, setStrategyId] = useState<number | ''>(trade?.strategy_id ?? '')
  const [accountId, setAccountId] = useState<number | ''>(trade?.account_id ?? accounts[0]?.id ?? '')
  const [positiveTags, setPositiveTags] = useState<string[]>(trade?.positive_tags ?? [])
  const [negativeTags, setNegativeTags] = useState<string[]>(trade?.negative_tags ?? [])
  const [confluenceIds, setConfluenceIds] = useState<number[]>(trade?.confluence_ids ?? [])
  const [notes, setNotes] = useState(trade?.notes ?? '')
  // Forward-test link: the day's indicator signal(s) and the trader's own prices against it.
  const [signals, setSignals] = useState<ForwardSignal[]>([])
  const [signalId, setSignalId] = useState(trade?.signal_id ?? '')
  const [signalPx, setSignalPx] = useState(trade?.signal_px?.toString() ?? '')
  const [entryPx, setEntryPx] = useState(trade?.entry_px?.toString() ?? '')
  const [stopPx, setStopPx] = useState(trade?.stop_px?.toString() ?? '')
  const [exitPx, setExitPx] = useState(trade?.exit_px?.toString() ?? '')
  const [saving, setSaving] = useState(false)
  const [confirmingDelete, setConfirmingDelete] = useState(false)

  useEffect(() => {
    let cancelled = false
    const fetchSignals = window.api.forward?.getSignalsForDate
    if (!fetchSignals || !date) return
    fetchSignals(date, trade?.signal_id ?? null)
      .then((rows) => {
        if (!cancelled) setSignals(rows)
      })
      .catch(() => {
        /* forward-test data is optional */
      })
    return () => {
      cancelled = true
    }
  }, [date, trade?.signal_id])

  const linkSignal = (id: string) => {
    setSignalId(id)
    const s = signals.find((x) => x.id === id)
    if (!s) return
    if (s.sig_px !== null) setSignalPx(String(s.sig_px))
    if (s.dir) setDirection(s.dir === 'long' ? 'Long' : 'Short')
    if (!pair && s.sym) setPair(s.sym)
  }

  const num = (v: string) => (v.trim() === '' || Number.isNaN(parseFloat(v)) ? null : parseFloat(v))

  const save = async () => {
    setSaving(true)
    const payload = {
      name,
      date,
      entry_time: entryTime || null,
      pair,
      session,
      direction,
      risk_per_trade: riskPerTrade ? parseFloat(riskPerTrade) : null,
      pnl: pnl ? parseFloat(pnl) : 0,
      r_multiple: rMultiple ? parseFloat(rMultiple) : null,
      followed_plan: followedPlan,
      break_even: breakEven,
      entry_win: entryWin,
      strategy_id: strategyId || null,
      account_id: accountId || null,
      positive_tags: positiveTags,
      negative_tags: negativeTags,
      confluence_ids: confluenceIds,
      notes,
      source: trade?.source ?? defaultSource,
      signal_id: signalId || null,
      signal_px: signalId ? num(signalPx) : null,
      entry_px: num(entryPx),
      stop_px: num(stopPx),
      exit_px: num(exitPx),
    }
    try {
      if (savedTrade) {
        const updated = await window.api.trades.update(savedTrade.id, payload)
        setSavedTrade(updated)
      } else {
        const created = await window.api.trades.create(payload)
        setSavedTrade(created)
      }
      onSaved()
    } finally {
      setSaving(false)
    }
  }

  const del = async () => {
    if (!savedTrade) return
    await window.api.trades.delete(savedTrade.id)
    onDeleted?.()
    onClose()
  }

  const grid: CSSProperties = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--sp-3)' }

  return (
    <Modal
      title={savedTrade ? 'Edit Trade' : defaultSource === 'agent' ? 'New Backtest Trade' : 'New Trade'}
      onClose={onClose}
      wide
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-3)' }}>
        <div style={grid}>
          <label className="field">Name
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. EURUSD London breakout" />
          </label>
          <label className="field">Date
            <input className="input" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </label>
        </div>

        <div style={grid}>
          <label className="field">Pair / Instrument
            <input className="input" value={pair} onChange={(e) => setPair(e.target.value)} placeholder="EURUSD" />
          </label>
          <label className="field">Session
            <Select
              ariaLabel="Session"
              value={session}
              onChange={setSession}
              options={SESSIONS.map((s) => ({ value: s, label: s }))}
            />
          </label>
        </div>

        <div style={grid}>
          <label className="field">Entry time <span style={{ color: 'var(--text-dim)', fontWeight: 400 }}>(optional)</span>
            <input className="input" type="time" value={entryTime} onChange={(e) => setEntryTime(e.target.value)} />
          </label>
          <NewsNearEntry date={date} entryTime={entryTime} pair={pair} />
        </div>

        <div style={grid}>
          <label className="field">Direction
            <Select
              ariaLabel="Direction"
              value={direction}
              onChange={setDirection}
              options={DIRECTIONS.map((d) => ({ value: d, label: d }))}
            />
          </label>
          <label className="field">Account
            <Select
              ariaLabel="Account"
              value={accountId === '' ? '' : String(accountId)}
              onChange={(v) => setAccountId(v ? Number(v) : '')}
              options={[{ value: '', label: '—' }, ...accounts.map((a) => ({ value: String(a.id), label: a.name }))]}
            />
          </label>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 'var(--sp-3)' }}>
          <label className="field">Risk per Trade ($)
            <input className="input" type="number" step="any" value={riskPerTrade} onChange={(e) => setRiskPerTrade(e.target.value)} />
          </label>
          <label className="field">Profit / Loss ($)
            <input className="input" type="number" step="any" value={pnl} onChange={(e) => setPnl(e.target.value)} />
          </label>
          <label className="field">R Multiple
            <input className="input" type="number" step="any" value={rMultiple} onChange={(e) => setRMultiple(e.target.value)} />
          </label>
          <label className="field">Model / Strategy
            <Select
              ariaLabel="Model / Strategy"
              value={strategyId === '' ? '' : String(strategyId)}
              onChange={(v) => setStrategyId(v ? Number(v) : '')}
              options={[{ value: '', label: '—' }, ...strategies.map((s) => ({ value: String(s.id), label: s.name }))]}
            />
          </label>
        </div>

        {(signals.length > 0 || signalId) && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-3)' }}>
            <label className="field">Forward-test signal
              <Select
                ariaLabel="Forward-test signal"
                value={signalId}
                onChange={linkSignal}
                options={[
                  { value: '', label: 'Not linked' },
                  ...signals.map((s) => ({ value: s.id, label: signalLabel(s), hint: signalHint(s) })),
                ]}
              />
            </label>
            {signalId && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 'var(--sp-3)' }}>
                <label className="field">Signal price
                  <input className="input" type="number" step="any" value={signalPx} onChange={(e) => setSignalPx(e.target.value)} />
                </label>
                <label className="field">Your entry
                  <input className="input" type="number" step="any" value={entryPx} onChange={(e) => setEntryPx(e.target.value)} />
                </label>
                <label className="field">Your stop
                  <input className="input" type="number" step="any" value={stopPx} onChange={(e) => setStopPx(e.target.value)} />
                </label>
                <label className="field">Your exit
                  <input className="input" type="number" step="any" value={exitPx} onChange={(e) => setExitPx(e.target.value)} />
                </label>
              </div>
            )}
          </div>
        )}

        <div style={{ display: 'flex', gap: 20 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5 }}>
            <input type="checkbox" checked={followedPlan} onChange={(e) => setFollowedPlan(e.target.checked)} /> Followed Plan
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5 }}>
            <input type="checkbox" checked={breakEven} onChange={(e) => setBreakEven(e.target.checked)} /> Break Even
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5 }}>
            <input type="checkbox" checked={entryWin} onChange={(e) => setEntryWin(e.target.checked)} /> Entry Win
          </label>
        </div>

        <div style={grid}>
          <label className="field">Positive Tags
            <TagInput tags={positiveTags} onChange={setPositiveTags} variant="positive" />
          </label>
          <label className="field">Negative Tags
            <TagInput tags={negativeTags} onChange={setNegativeTags} variant="negative" />
          </label>
        </div>

        <ConfluenceSelector
          confluences={confluences}
          selectedIds={confluenceIds}
          onChange={setConfluenceIds}
          onConfluencesChanged={onConfluencesChanged}
        />

        <label className="field">Notes
          <textarea className="input" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </label>

        {savedTrade ? (
          <ImageGallery entityType="trade" entityId={savedTrade.id} />
        ) : (
          <div style={{ color: 'var(--text-dim)', fontSize: 11.5 }}>Save the trade once to unlock the image gallery.</div>
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
          <div>
            {savedTrade && <button className="btn btn-danger" onClick={() => setConfirmingDelete(true)}>Delete</button>}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn" onClick={onClose}>{savedTrade ? 'Done' : 'Cancel'}</button>
            <button className="btn btn-primary" onClick={save} disabled={saving || !date}>
              {saving ? 'Saving…' : savedTrade ? 'Save Changes' : 'Save Trade'}
            </button>
          </div>
        </div>
      </div>

      {confirmingDelete && (
        <ConfirmDialog
          title="Delete trade?"
          message="This trade and its screenshots will be permanently removed. This cannot be undone."
          onConfirm={() => {
            setConfirmingDelete(false)
            del()
          }}
          onCancel={() => setConfirmingDelete(false)}
        />
      )}
    </Modal>
  )
}
