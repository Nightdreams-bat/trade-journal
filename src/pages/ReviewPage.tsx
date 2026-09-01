import { useEffect, useState } from 'react'
import { format } from 'date-fns'
import { Select } from '../components/Select'
import { Stagger, Reveal } from '../anim'
import type { DailyReview } from '../types'

const EMOTIONS = ['Calm', 'Confident', 'Anxious', 'Frustrated', 'Excited', 'Tired', 'FOMO']

export function ReviewPage({ jumpToDate }: { jumpToDate?: { date: string; token: number } | null }) {
  const [reviews, setReviews] = useState<DailyReview[]>([])
  const [date, setDate] = useState(jumpToDate?.date ?? format(new Date(), 'yyyy-MM-dd'))
  const [notes, setNotes] = useState('')
  const [emotion, setEmotion] = useState(EMOTIONS[0])
  const [lessons, setLessons] = useState('')
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)

  const load = () => {
    window.api.reviews.getAll().then((r) => {
      setReviews(r)
      setLoading(false)
    })
  }

  useEffect(load, [])

  useEffect(() => {
    if (jumpToDate) setDate(jumpToDate.date)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fires once per click via the changing `token`, not `date`
  }, [jumpToDate?.token])

  useEffect(() => {
    const existing = reviews.find((r) => r.date === date)
    setNotes(existing?.notes ?? '')
    setEmotion(existing?.emotion ?? EMOTIONS[0])
    setLessons(existing?.lessons_learned ?? '')
  }, [date, reviews])

  const save = async () => {
    setSaving(true)
    try {
      await window.api.reviews.upsert({ date, notes, emotion, lessons_learned: lessons })
      load()
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div style={{ padding: 'var(--sp-5)', color: 'var(--text-muted)' }}>Loading reviews…</div>

  return (
    <Stagger style={{ display: 'flex', gap: 'var(--sp-4)', alignItems: 'flex-start' }}>
      <Reveal className="card" style={{ padding: 'var(--sp-4)', flex: 2 }}>
        <div style={{ display: 'flex', gap: 'var(--sp-3)', marginBottom: 14 }}>
          <label className="field" style={{ flex: 1 }}>Date
            <input className="input" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </label>
          <label className="field" style={{ flex: 1 }}>Emotion / State
            <Select
              ariaLabel="Emotion / State"
              value={emotion}
              onChange={setEmotion}
              options={EMOTIONS.map((e) => ({ value: e, label: e }))}
            />
          </label>
        </div>
        <label className="field" style={{ marginBottom: 14 }}>Review Notes
          <textarea className="input" rows={6} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="How did today go? What did the market give you? How did you execute?" />
        </label>
        <label className="field" style={{ marginBottom: 14 }}>Lessons Learned
          <textarea className="input" rows={4} value={lessons} onChange={(e) => setLessons(e.target.value)} placeholder="What will you do differently next time?" />
        </label>
        <button className="btn btn-primary" onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save Review'}</button>
      </Reveal>

      <Reveal className="card" style={{ padding: 'var(--sp-4)', flex: 1, maxHeight: 560, overflowY: 'auto' }}>
        <div style={{ color: 'var(--text-muted)', fontSize: 12, marginBottom: 10 }}>Past Reviews</div>
        {reviews.length === 0 && <div style={{ color: 'var(--text-dim)', fontSize: 12 }}>No reviews yet.</div>}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {reviews.map((r) => (
            <div
              key={r.date}
              onClick={() => setDate(r.date)}
              style={{
                padding: '8px 10px',
                borderRadius: 'var(--radius-control)',
                cursor: 'pointer',
                background: r.date === date ? 'var(--card-hover)' : 'transparent',
                border: '1px solid var(--border-soft)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                <span style={{ fontWeight: 600 }}>{r.date}</span>
                <span style={{ color: 'var(--text-dim)' }}>{r.emotion}</span>
              </div>
              {r.notes && <div style={{ color: 'var(--text-muted)', fontSize: 11, marginTop: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.notes}</div>}
            </div>
          ))}
        </div>
      </Reveal>
    </Stagger>
  )
}
