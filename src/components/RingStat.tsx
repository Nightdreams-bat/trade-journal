import { CountUpValue, usePrefersReducedMotion } from '../anim'

interface RingStatProps {
  /** 0–100 */
  percent: number
  /** big centre text; defaults to `${Math.round(percent)}%` */
  centerLabel?: string
  caption?: string
  color?: string
  size?: number
}

/**
 * A small circular progress ring for a single KPI (win rate, discipline…).
 * Pure SVG + `stroke-dasharray`; the sweep animates once on mount unless the
 * viewer prefers reduced motion.
 */
export function RingStat({
  percent,
  centerLabel,
  caption,
  color = 'var(--accent)',
  size = 92,
}: RingStatProps) {
  const reduced = usePrefersReducedMotion()
  const clamped = Math.max(0, Math.min(100, percent))
  const stroke = 8
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const offset = c * (1 - clamped / 100)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
      <div style={{ position: 'relative', width: size, height: size }}>
        <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth={stroke} />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={color}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={c}
            strokeDashoffset={offset}
            style={{
              filter: `drop-shadow(0 0 6px ${color === 'var(--accent)' ? 'rgba(93,214,44,0.55)' : color})`,
              ...(reduced
                ? null
                : { transition: 'stroke-dashoffset 0.9s cubic-bezier(0.16,1,0.3,1)', strokeDashoffset: offset }),
            }}
          />
        </svg>
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 20,
            fontWeight: 'var(--weight-title)',
            color: 'var(--text-strong)',
          }}
        >
          <CountUpValue value={centerLabel ?? `${Math.round(clamped)}%`} />
        </div>
      </div>
      {caption && <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{caption}</div>}
    </div>
  )
}
