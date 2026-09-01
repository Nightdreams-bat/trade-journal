import { useCallback, useEffect, useMemo, useState } from 'react'
import { Modal } from './Modal'
import { ZoomableImage } from './ZoomableImage'
import { Select } from './Select'
import { Search } from './icons'
import type { MissedTrade, Strategy } from '../types'

type GalleryImage = {
  id: number
  dataUrl: string
  missedTradeId: number
  date: string
  pair: string | null
  wouldBePnl: number | null
  direction: string | null
}

type SortMode = 'date' | 'model'

export function MissedTradeImageGallery({
  missedTrades,
  strategies,
  onOpenTrade,
  refreshKey,
}: {
  missedTrades: MissedTrade[]
  strategies: Strategy[]
  onOpenTrade: (missedTrade: MissedTrade) => void
  refreshKey?: number
}) {
  const [images, setImages] = useState<GalleryImage[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [outcome, setOutcome] = useState<'all' | 'win' | 'loss'>('all')
  const [sortMode, setSortMode] = useState<SortMode>('date')
  const [active, setActive] = useState<GalleryImage | null>(null)

  const load = () => {
    setLoading(true)
    window.api.images.getAllForMissedTrades().then((imgs) => {
      setImages(imgs)
      setLoading(false)
    })
  }

  useEffect(load, [refreshKey])

  const strategyNameById = useMemo(() => {
    const m = new Map<number | null, string>()
    for (const s of strategies) m.set(s.id, s.name)
    return m
  }, [strategies])

  const rowIds = useMemo(() => new Set(missedTrades.map((r) => r.id)), [missedTrades])
  const strategyByRow = useMemo(() => new Map(missedTrades.map((r) => [r.id, r.strategy_id])), [missedTrades])

  const nameFor = useCallback(
    (rowId: number) => strategyNameById.get(strategyByRow.get(rowId) ?? null) ?? 'No model',
    [strategyNameById, strategyByRow],
  )

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    const list = images.filter((img) => {
      if (!rowIds.has(img.missedTradeId)) return false // respect the strategy filter applied on the Missed Trades page
      const pnl = img.wouldBePnl ?? 0
      if (outcome === 'win' && pnl <= 0) return false
      if (outcome === 'loss' && pnl >= 0) return false
      if (q && !(img.pair ?? '').toLowerCase().includes(q)) return false
      return true
    })
    if (sortMode === 'model') {
      list.sort((a, b) => nameFor(a.missedTradeId).localeCompare(nameFor(b.missedTradeId)) || b.date.localeCompare(a.date))
    }
    return list
  }, [images, search, outcome, sortMode, rowIds, nameFor])

  const groups = useMemo(() => {
    if (sortMode !== 'model') return [{ label: null as string | null, items: filtered }]
    const byModel = new Map<string, GalleryImage[]>()
    for (const img of filtered) {
      const label = nameFor(img.missedTradeId)
      if (!byModel.has(label)) byModel.set(label, [])
      byModel.get(label)!.push(img)
    }
    return [...byModel.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([label, items]) => ({ label, items }))
  }, [filtered, sortMode, nameFor])

  const openFromGallery = (img: GalleryImage) => {
    const row = missedTrades.find((r) => r.id === img.missedTradeId)
    if (row) onOpenTrade(row)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <div style={{ position: 'relative' }}>
            <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }} />
            <input
              className="input"
              placeholder="Search by pair…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ width: 220, paddingLeft: 30 }}
            />
          </div>
          <div style={{ display: 'flex', gap: 4 }}>
            {(['all', 'win', 'loss'] as const).map((k) => (
              <button
                key={k}
                className="btn"
                onClick={() => setOutcome(k)}
                style={{
                  fontSize: 11.5,
                  padding: '5px 10px',
                  background: outcome === k ? 'var(--bg-elevated)' : undefined,
                  borderColor: outcome === k ? 'var(--accent)' : undefined,
                }}
              >
                {k === 'all' ? 'All' : k === 'win' ? 'Would-be Wins' : 'Would-be Losses'}
              </button>
            ))}
          </div>
          <Select
            ariaLabel="Sort gallery"
            width={150}
            value={sortMode}
            onChange={(v) => setSortMode(v as SortMode)}
            options={[
              { value: 'date', label: 'Sort: Newest' },
              { value: 'model', label: 'Sort: Model' },
            ]}
          />
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-muted)', alignSelf: 'center' }}>
          {filtered.length} image{filtered.length === 1 ? '' : 's'}
        </div>
      </div>

      <div className="card" style={{ padding: 'var(--sp-4)', minHeight: 200 }}>
        {loading ? (
          <div style={{ color: 'var(--text-muted)', padding: 20 }}>Loading images…</div>
        ) : filtered.length === 0 ? (
          <div style={{ color: 'var(--text-muted)', padding: 20 }}>
            {images.length === 0 ? 'No missed trade screenshots yet. Add images from a missed trade to see them here.' : 'No images match your filters.'}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          {groups.map((group) => (
            <div key={group.label ?? '__all'}>
              {group.label != null && (
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-strong)', marginBottom: 10 }}>
                  {group.label} <span style={{ fontWeight: 400, color: 'var(--text-dim)' }}>({group.items.length})</span>
                </div>
              )}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12 }}>
            {group.items.map((img) => (
              <button
                key={img.id}
                onClick={() => setActive(img)}
                style={{
                  position: 'relative',
                  padding: 0,
                  border: `1px solid var(--border)`,
                  borderRadius: 'var(--radius-card)',
                  overflow: 'hidden',
                  cursor: 'pointer',
                  background: 'var(--bg-elevated)',
                  aspectRatio: '1 / 1',
                  textAlign: 'left',
                }}
              >
                <img
                  src={img.dataUrl}
                  alt={img.pair ?? 'missed trade screenshot'}
                  style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                />
                <div
                  style={{
                    position: 'absolute',
                    left: 0,
                    right: 0,
                    bottom: 0,
                    padding: '6px 8px',
                    background: 'linear-gradient(0deg, rgba(0,0,0,0.72), rgba(0,0,0,0))',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: 6,
                  }}
                >
                  <span style={{ fontSize: 11, color: '#fff', fontWeight: 600 }}>{img.pair || '—'}</span>
                  <span style={{ fontSize: 11, fontWeight: 600, color: (img.wouldBePnl ?? 0) >= 0 ? '#5EEBB0' : '#F2545B' }}>
                    {img.wouldBePnl !== null ? `${img.wouldBePnl >= 0 ? '+' : ''}$${img.wouldBePnl.toFixed(0)}` : '—'}
                  </span>
                </div>
              </button>
            ))}
              </div>
            </div>
          ))}
          </div>
        )}
      </div>

      {active && (
        <Modal title={`${active.pair || 'Missed Trade'} — ${active.date}`} onClose={() => setActive(null)} wide>
          <ZoomableImage src={active.dataUrl} alt="missed trade screenshot full size" />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 14, flexWrap: 'wrap', gap: 10 }}>
            <div style={{ display: 'flex', gap: 14, fontSize: 12.5, color: 'var(--text-muted)' }}>
              <span>{active.direction || '—'}</span>
              <span className={(active.wouldBePnl ?? 0) >= 0 ? 'pnl-positive' : 'pnl-negative'}>
                {active.wouldBePnl !== null ? `${active.wouldBePnl >= 0 ? '+' : ''}$${active.wouldBePnl.toFixed(2)}` : '—'}
              </span>
            </div>
            <button className="btn btn-primary" onClick={() => openFromGallery(active)}>
              Open Trade
            </button>
          </div>
        </Modal>
      )}
    </div>
  )
}
