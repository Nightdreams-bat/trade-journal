import { useEffect, useMemo, useState } from 'react'
import { Modal } from './Modal'
import { ZoomableImage } from './ZoomableImage'
import { Search } from './icons'
import type { Trade } from '../types'

type GalleryImage = {
  id: number
  dataUrl: string
  tradeId: number
  date: string
  pair: string | null
  pnl: number
  direction: string | null
  name: string | null
}

export function TradeImageGallery({ trades, onOpenTrade }: { trades: Trade[]; onOpenTrade: (trade: Trade) => void }) {
  const [images, setImages] = useState<GalleryImage[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [outcome, setOutcome] = useState<'all' | 'win' | 'loss'>('all')
  const [active, setActive] = useState<GalleryImage | null>(null)

  const load = () => {
    setLoading(true)
    window.api.images.getAllForTrades().then((imgs) => {
      setImages(imgs)
      setLoading(false)
    })
  }

  useEffect(load, [trades])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return images.filter((img) => {
      if (outcome === 'win' && img.pnl <= 0) return false
      if (outcome === 'loss' && img.pnl >= 0) return false
      if (q && !(img.pair ?? '').toLowerCase().includes(q) && !(img.name ?? '').toLowerCase().includes(q)) return false
      return true
    })
  }, [images, search, outcome])

  const openFromGallery = (img: GalleryImage) => {
    const trade = trades.find((t) => t.id === img.tradeId)
    if (trade) onOpenTrade(trade)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <div style={{ position: 'relative' }}>
            <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }} />
            <input
              className="input"
              placeholder="Search by pair or name…"
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
                {k === 'all' ? 'All' : k === 'win' ? 'Wins' : 'Losses'}
              </button>
            ))}
          </div>
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
            {images.length === 0 ? 'No trade screenshots yet. Add images from a trade to see them here.' : 'No images match your filters.'}
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12 }}>
            {filtered.map((img) => (
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
                  alt={img.pair ?? 'trade screenshot'}
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
                  <span style={{ fontSize: 11, fontWeight: 600, color: img.pnl >= 0 ? '#5EEBB0' : '#F2545B' }}>
                    {img.pnl >= 0 ? '+' : ''}${img.pnl.toFixed(0)}
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {active && (
        <Modal title={`${active.pair || 'Trade'} — ${active.date}`} onClose={() => setActive(null)} wide>
          <ZoomableImage src={active.dataUrl} alt="trade screenshot full size" />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 14, flexWrap: 'wrap', gap: 10 }}>
            <div style={{ display: 'flex', gap: 14, fontSize: 12.5, color: 'var(--text-muted)' }}>
              <span>{active.name || 'Untitled trade'}</span>
              <span>{active.direction || '—'}</span>
              <span className={active.pnl >= 0 ? 'pnl-positive' : 'pnl-negative'}>
                {active.pnl >= 0 ? '+' : ''}${active.pnl.toFixed(2)}
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
