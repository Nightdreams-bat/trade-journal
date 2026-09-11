import { useState } from 'react'
import { Modal } from './Modal'
import { ZoomableImage } from './ZoomableImage'
import type { SharedTrade } from '../types'

function Row({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border-soft)' }}>
      <span style={{ color: 'var(--text-muted)' }}>{label}</span>
      <span style={{ fontWeight: 600, color: color ?? 'var(--text)' }}>{value}</span>
    </div>
  )
}

/**
 * Read-only — shared rows only mirror what electron/sync.ts pushes (see SharedTrade),
 * which doesn't include tags/confluences, so there's nothing to edit here.
 */
export function SharedTradeDetailModal({ trade, onClose }: { trade: SharedTrade; onClose: () => void }) {
  const [lightbox, setLightbox] = useState<string | null>(null)

  return (
    <Modal title={`${trade.pair || 'Trade'} · ${trade.date}`} onClose={onClose} wide={trade.imageUrls.length > 0}>
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <Row label="Owner" value={trade.isMine ? 'Me' : trade.ownerName} />
        <Row label="Direction" value={trade.direction || '—'} />
        <Row
          label="P/L"
          value={`${trade.pnl >= 0 ? '+' : ''}${trade.pnl.toFixed(2)}`}
          color={trade.pnl >= 0 ? 'var(--green)' : 'var(--red)'}
        />
        <Row label="R Multiple" value={trade.r_multiple != null ? trade.r_multiple.toFixed(2) : '—'} />
        <Row label="Account" value={trade.accountName || '—'} />
        <Row label="Strategy" value={trade.strategyName || '—'} />
        <Row label="Source" value={trade.source} />

        <div style={{ marginTop: 14 }}>
          <div style={{ color: 'var(--text-muted)', fontSize: 12, marginBottom: 6 }}>Notes</div>
          <div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.6, color: trade.notes ? 'var(--text)' : 'var(--text-dim)' }}>
            {trade.notes || 'No notes.'}
          </div>
        </div>

        {trade.imageUrls.length > 0 && (
          <div style={{ marginTop: 14 }}>
            <div style={{ color: 'var(--text-muted)', fontSize: 12, marginBottom: 6 }}>Images</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {trade.imageUrls.map((url) => (
                <img
                  key={url}
                  src={url}
                  onClick={() => setLightbox(url)}
                  alt="trade screenshot"
                  style={{
                    width: 96,
                    height: 96,
                    objectFit: 'cover',
                    borderRadius: 'var(--radius-card)',
                    border: '1px solid var(--border)',
                    cursor: 'pointer',
                    display: 'block',
                  }}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {lightbox && (
        <Modal title="Image" onClose={() => setLightbox(null)} wide>
          <ZoomableImage src={lightbox} alt="trade screenshot full size" />
        </Modal>
      )}
    </Modal>
  )
}
