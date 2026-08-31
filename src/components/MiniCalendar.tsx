import type { AnalyticsSummary } from '../types'

function money(n: number): string {
  const sign = n < 0 ? '-' : ''
  return `${sign}$${Math.abs(Math.round(n)).toLocaleString('en-US')}`
}

/** Extracted from HomePage — current month, day P&L tints. */
export function MiniCalendar({ calendar }: { calendar: AnalyticsSummary['calendar'] }) {
  const today = new Date()
  const year = today.getFullYear()
  const month = today.getMonth()
  const first = new Date(year, month, 1)
  const startCol = (first.getDay() + 6) % 7 // Monday-first
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const cells: (number | null)[] = [
    ...Array.from({ length: startCol }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ]
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, flex: 1, alignContent: 'start' }}>
      {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => (
        <div key={i} style={{ textAlign: 'center', fontSize: 9, color: 'var(--text-dim)', letterSpacing: '0.08em' }}>
          {d}
        </div>
      ))}
      {cells.map((day, i) => {
        if (day == null) return <div key={i} />
        const key = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
        const entry = calendar[key]
        const bg = !entry
          ? 'rgba(var(--ink-rgb),0.06)'
          : entry.pnl >= 0
            ? 'var(--green-soft)'
            : 'var(--red-soft)'
        const fg = !entry ? 'var(--text-dim)' : entry.pnl >= 0 ? 'var(--green)' : 'var(--red)'
        return (
          <div
            key={i}
            title={entry ? `${key} · ${money(entry.pnl)}` : key}
            style={{
              aspectRatio: '1',
              borderRadius: 8,
              background: bg,
              color: fg,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 10,
            }}
          >
            {day}
          </div>
        )
      })}
    </div>
  )
}
