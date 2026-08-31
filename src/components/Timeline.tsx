import { format, parseISO } from 'date-fns'
import { ArrowRight } from './icons'
import type { Trade } from '../types'

interface TimelineProps {
  trades: Trade[]
  onOpenTrade: (trade: Trade) => void
  onViewAll: () => void
}

function money(n: number): string {
  const sign = n < 0 ? '-' : ''
  return `${sign}$${Math.abs(Math.round(n)).toLocaleString('en-US')}`
}

function fmtDate(d: string): string {
  try {
    return format(parseISO(d), 'MMM d')
  } catch {
    return d
  }
}

/** Horizontal scroll strip of recent trades along a baseline rail. */
export function Timeline({ trades, onOpenTrade, onViewAll }: TimelineProps) {
  return (
    <div className="timeline">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <span className="mono-label">Recent trades</span>
        <button className="btn" style={{ padding: '4px 10px', fontSize: 11 }} onClick={onViewAll}>
          All trades <ArrowRight size={12} strokeWidth={2} />
        </button>
      </div>
      {trades.length === 0 ? (
        <div style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>
          Open the Trades tab to browse your history.
        </div>
      ) : (
        <div className="timeline-strip">
          {trades.map((t) => (
            <button key={t.id} className="timeline-card" onClick={() => onOpenTrade(t)} type="button">
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{fmtDate(t.date)}</span>
              <span style={{ fontWeight: 'var(--weight-medium)', color: 'var(--text-strong)', fontSize: 12.5 }}>
                {t.pair || t.name || 'Trade'}
              </span>
              {t.direction && (
                <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>{t.direction}</span>
              )}
              <span
                className={`tag-pill ${t.pnl >= 0 ? 'positive' : 'negative'}`}
                style={{ fontFamily: 'var(--font-body)', fontSize: 11.5, letterSpacing: 0, alignSelf: 'flex-start', marginTop: 2 }}
              >
                {money(t.pnl)}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
