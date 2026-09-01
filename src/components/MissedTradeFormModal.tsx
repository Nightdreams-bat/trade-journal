import { useState } from 'react'
import { format } from 'date-fns'
import { Modal } from './Modal'
import { ConfirmDialog } from './ConfirmDialog'
import { Select } from './Select'
import { TagInput } from './TagInput'
import { ImageGallery } from './ImageGallery'
import { ConfluenceSelector } from './ConfluenceSelector'
import type { Confluence, MissedTrade, Strategy } from '../types'
import { DIRECTIONS } from '../types'

export function MissedTradeFormModal({
  missedTrade,
  strategies,
  confluences,
  onConfluencesChanged,
  onClose,
  onSaved,
}: {
  missedTrade?: MissedTrade
  strategies: Strategy[]
  confluences: Confluence[]
  onConfluencesChanged: () => void
  onClose: () => void
  onSaved: () => void
}) {
  const [saved, setSaved] = useState<MissedTrade | undefined>(missedTrade)
  const [date, setDate] = useState(missedTrade?.date ?? format(new Date(), 'yyyy-MM-dd'))
  const [pair, setPair] = useState(missedTrade?.pair ?? '')
  const [direction, setDirection] = useState(missedTrade?.direction ?? DIRECTIONS[0])
  const [wouldBePnl, setWouldBePnl] = useState(missedTrade?.would_be_pnl?.toString() ?? '')
  const [reason, setReason] = useState(missedTrade?.reason_missed ?? '')
  const [strategyId, setStrategyId] = useState<number | ''>(missedTrade?.strategy_id ?? '')
  const [tags, setTags] = useState<string[]>(missedTrade?.tags ?? [])
  const [confluenceIds, setConfluenceIds] = useState<number[]>(missedTrade?.confluence_ids ?? [])
  const [notes, setNotes] = useState(missedTrade?.notes ?? '')
  const [saving, setSaving] = useState(false)
  const [confirmingDelete, setConfirmingDelete] = useState(false)

  const save = async () => {
    setSaving(true)
    const payload = {
      date,
      pair,
      direction,
      would_be_pnl: wouldBePnl ? parseFloat(wouldBePnl) : null,
      reason_missed: reason,
      strategy_id: strategyId || null,
      tags,
      confluence_ids: confluenceIds,
      notes,
    }
    try {
      if (saved) {
        const updated = await window.api.missedTrades.update(saved.id, payload)
        setSaved(updated)
      } else {
        const created = await window.api.missedTrades.create(payload)
        setSaved(created)
      }
      onSaved()
    } finally {
      setSaving(false)
    }
  }

  const del = async () => {
    if (!saved) return
    await window.api.missedTrades.delete(saved.id)
    onSaved()
    onClose()
  }

  return (
    <Modal title={saved ? 'Edit Missed Trade' : 'Log Missed Trade'} onClose={onClose} wide>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-3)' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--sp-3)' }}>
          <label className="field">Date
            <input className="input" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </label>
          <label className="field">Pair
            <input className="input" value={pair} onChange={(e) => setPair(e.target.value)} />
          </label>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--sp-3)' }}>
          <label className="field">Direction
            <Select
              ariaLabel="Direction"
              value={direction}
              onChange={setDirection}
              options={DIRECTIONS.map((d) => ({ value: d, label: d }))}
            />
          </label>
          <label className="field">Would-be P&L ($)
            <input className="input" type="number" step="any" value={wouldBePnl} onChange={(e) => setWouldBePnl(e.target.value)} />
          </label>
        </div>
        <label className="field">Model / Strategy
          <Select
            ariaLabel="Model / Strategy"
            value={strategyId === '' ? '' : String(strategyId)}
            onChange={(v) => setStrategyId(v ? Number(v) : '')}
            options={[{ value: '', label: '—' }, ...strategies.map((s) => ({ value: String(s.id), label: s.name }))]}
          />
        </label>
        <label className="field">Reason Missed
          <input className="input" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Hesitated, missed alert, at work..." />
        </label>
        <label className="field">Tags
          <TagInput tags={tags} onChange={setTags} variant="negative" placeholder="Hesitation, FOMO, no setup confirmation…" />
        </label>

        <ConfluenceSelector
          confluences={confluences}
          selectedIds={confluenceIds}
          onChange={setConfluenceIds}
          onConfluencesChanged={onConfluencesChanged}
        />

        <label className="field">Notes
          <textarea className="input" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </label>

        {saved ? (
          <ImageGallery entityType="missed_trade" entityId={saved.id} />
        ) : (
          <div style={{ color: 'var(--text-dim)', fontSize: 11.5 }}>Save once to unlock the image gallery.</div>
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <div>{saved && <button className="btn btn-danger" onClick={() => setConfirmingDelete(true)}>Delete</button>}</div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn" onClick={onClose}>{saved ? 'Done' : 'Cancel'}</button>
            <button className="btn btn-primary" onClick={save} disabled={saving}>
              {saving ? 'Saving…' : saved ? 'Save Changes' : 'Save'}
            </button>
          </div>
        </div>
      </div>

      {confirmingDelete && (
        <ConfirmDialog
          title="Delete missed trade?"
          message="This missed trade and its notes will be permanently removed. This cannot be undone."
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
