import { useState } from 'react'
import { ConfirmDialog } from './ConfirmDialog'
import { Check, Edit, X } from './icons'
import { MARKET_CONTEXT_NAMES } from '../marketContext'
import type { Confluence } from '../types'

export function ConfluenceSelector({
  confluences,
  selectedIds,
  onChange,
  onConfluencesChanged,
}: {
  confluences: Confluence[]
  selectedIds: number[]
  onChange: (ids: number[]) => void
  onConfluencesChanged: () => void
}) {
  const [draft, setDraft] = useState('')
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editDraft, setEditDraft] = useState('')
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const [seeding, setSeeding] = useState(false)

  const existingNames = new Set(confluences.map((c) => c.name.trim().toLowerCase()))
  const missingContext = MARKET_CONTEXT_NAMES.filter((n) => !existingNames.has(n.toLowerCase()))

  const toggle = (id: number) => {
    if (selectedIds.includes(id)) onChange(selectedIds.filter((x) => x !== id))
    else onChange([...selectedIds, id])
  }

  const addConfluence = async () => {
    const name = draft.trim()
    if (!name) return
    const created = await window.api.confluences.create({ name })
    setDraft('')
    onConfluencesChanged()
    if (created?.id) onChange([...selectedIds, created.id])
  }

  /**
   * Seeds the market-context pack. `confluences:create` is already idempotent (it returns the
   * existing row on a name match), but it does a SELECT-then-INSERT, so these run one at a time
   * rather than through Promise.all — concurrent calls could race the UNIQUE constraint on name.
   */
  const addMarketContextPack = async () => {
    setSeeding(true)
    try {
      for (const name of missingContext) await window.api.confluences.create({ name })
      onConfluencesChanged()
    } finally {
      setSeeding(false)
    }
  }

  const startEdit = (c: Confluence) => {
    setEditingId(c.id)
    setEditDraft(c.name)
  }

  const saveEdit = async () => {
    if (editingId == null) return
    const name = editDraft.trim()
    if (name) await window.api.confluences.update(editingId, { name })
    setEditingId(null)
    onConfluencesChanged()
  }

  const removeConfluence = async (id: number) => {
    await window.api.confluences.delete(id)
    onChange(selectedIds.filter((x) => x !== id))
    onConfluencesChanged()
  }

  return (
    <div className="field">
      <span>Confluences</span>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 6, marginBottom: 8 }}>
        {confluences.map((c) =>
          editingId === c.id ? (
            <span key={c.id} style={{ display: 'inline-flex', gap: 4 }}>
              <input
                className="input"
                autoFocus
                value={editDraft}
                onChange={(e) => setEditDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') saveEdit()
                  if (e.key === 'Escape') {
                    e.stopPropagation()
                    setEditingId(null)
                  }
                }}
                style={{ width: 130, padding: '2px 6px', fontSize: 11.5 }}
              />
              <button className="btn" style={{ padding: '2px 6px', fontSize: 11, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }} onClick={saveEdit}><Check size={12} /></button>
            </span>
          ) : (
            <span
              key={c.id}
              className={`tag-pill ${selectedIds.includes(c.id) ? 'positive' : ''}`}
              style={{
                cursor: 'pointer',
                border: selectedIds.includes(c.id) ? undefined : '1px solid var(--border)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <span onClick={() => toggle(c.id)}>{selectedIds.includes(c.id) ? <Check size={12} style={{ marginRight: 4 }} /> : ''}{c.name}</span>
              <span style={{ opacity: 0.6, cursor: 'pointer', fontSize: 10, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => startEdit(c)} title="Rename"><Edit size={12} /></span>
              <span style={{ opacity: 0.6, cursor: 'pointer', fontSize: 10, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => setDeletingId(c.id)} title="Delete"><X size={12} /></span>
            </span>
          )
        )}
        {confluences.length === 0 && (
          <span style={{ color: 'var(--text-dim)', fontSize: 11.5 }}>No confluences yet — add your first checklist item below.</span>
        )}
      </div>
      <div style={{ display: 'flex', gap: 6 }}>
        <input
          className="input"
          placeholder="e.g. Key level, Volume spike, HTF trend align…"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              addConfluence()
            }
          }}
        />
        <button className="btn" onClick={addConfluence} style={{ flexShrink: 0, display: 'inline-flex', alignItems: 'center', gap: 4 }}>+ Add</button>
      </div>

      {missingContext.length > 0 && (
        <button
          type="button"
          onClick={addMarketContextPack}
          disabled={seeding}
          title="Gap shape, relative volume, VWAP posture, event risk and regime — conditions to slice your edge by"
          style={{
            marginTop: 8,
            padding: 0,
            border: 'none',
            background: 'none',
            color: 'var(--accent)',
            fontSize: 11.5,
            cursor: seeding ? 'default' : 'pointer',
            textAlign: 'left',
          }}
        >
          {seeding ? 'Adding…' : `+ Add market-context pack (${missingContext.length})`}
        </button>
      )}

      {deletingId !== null && (
        <ConfirmDialog
          title="Delete confluence?"
          message="It will be removed from every trade that uses it. This cannot be undone."
          onConfirm={() => {
            const id = deletingId
            setDeletingId(null)
            removeConfluence(id)
          }}
          onCancel={() => setDeletingId(null)}
        />
      )}
    </div>
  )
}
