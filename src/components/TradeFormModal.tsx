import { useState, type CSSProperties } from 'react'
import { format } from 'date-fns'
import { Modal } from './Modal'
import { TagInput } from './TagInput'
import { ImageGallery } from './ImageGallery'
import { ConfluenceSelector } from './ConfluenceSelector'
import type { Account, Confluence, Strategy, Trade } from '../types'
import { DIRECTIONS, SESSIONS } from '../types'

export function TradeFormModal({
  trade,
  accounts,
  strategies,
  confluences,
  onConfluencesChanged,
  onClose,
  onSaved,
  onDeleted,
}: {
  trade?: Trade
  accounts: Account[]
  strategies: Strategy[]
  confluences: Confluence[]
  onConfluencesChanged: () => void
  onClose: () => void
  onSaved: () => void
  onDeleted?: () => void
}) {
  const [savedTrade, setSavedTrade] = useState<Trade | undefined>(trade)
  const [name, setName] = useState(trade?.name ?? '')
  const [date, setDate] = useState(trade?.date ?? format(new Date(), 'yyyy-MM-dd'))
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
  const [saving, setSaving] = useState(false)

  const save = async () => {
    setSaving(true)
    const payload = {
      name,
      date,
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
    if (!confirm('Delete this trade? This cannot be undone.')) return
    await window.api.trades.delete(savedTrade.id)
    onDeleted?.()
    onClose()
  }

  const grid: CSSProperties = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--sp-3)' }

  return (
    <Modal title={savedTrade ? 'Edit Trade' : 'New Trade'} onClose={onClose} wide>
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
            <select className="select" value={session} onChange={(e) => setSession(e.target.value)}>
              {SESSIONS.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </label>
        </div>

        <div style={grid}>
          <label className="field">Direction
            <select className="select" value={direction} onChange={(e) => setDirection(e.target.value)}>
              {DIRECTIONS.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
          </label>
          <label className="field">Account
            <select className="select" value={accountId} onChange={(e) => setAccountId(e.target.value ? Number(e.target.value) : '')}>
              <option value="">—</option>
              {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
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
            <select className="select" value={strategyId} onChange={(e) => setStrategyId(e.target.value ? Number(e.target.value) : '')}>
              <option value="">—</option>
              {strategies.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </label>
        </div>

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
            {savedTrade && <button className="btn btn-danger" onClick={del}>Delete</button>}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn" onClick={onClose}>{savedTrade ? 'Done' : 'Cancel'}</button>
            <button className="btn btn-primary" onClick={save} disabled={saving || !date}>
              {saving ? 'Saving…' : savedTrade ? 'Save Changes' : 'Save Trade'}
            </button>
          </div>
        </div>
      </div>
    </Modal>
  )
}
