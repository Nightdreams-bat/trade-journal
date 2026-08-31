import { useColors } from '../themeMode'
import { usePrefersReducedMotion } from '../anim'
import type { AnalyticsSummary } from '../types'

const RANK_RING = ['#F5A623', '#C7CAD1', '#B87A4A'] // gold / silver / bronze

export function DayOfWeekPanel({ data }: { data: AnalyticsSummary['dayOfWeek'] }) {
  const colors = useColors()
  const reducedMotion = usePrefersReducedMotion()

  const active = data.filter((d) => d.trades > 0).sort((a, b) => b.pnl - a.pnl)
  const idle = data.filter((d) => d.trades === 0)

  return (
    <div className="card" style={{ padding: 'var(--sp-4)', flex: 1, minWidth: 320 }}>
      <div style={{ color: 'var(--text-muted)', fontSize: 12, marginBottom: 10 }}>
        Performance by Day of Week (all-time)
      </div>

      {active.length === 0 ? (
        <div style={{ color: 'var(--text-dim)', fontSize: 12.5, padding: '20px 0', textAlign: 'center' }}>
          Not enough trades yet to rank your days.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {active.map((d, i) => {
            const ring = RANK_RING[i]
            return (
              <div
                key={d.day}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 6,
                  padding: '9px 10px',
                  borderRadius: 'var(--radius-card)',
                  background: 'var(--bg-elevated)',
                  border: `1px solid ${i === 0 ? 'var(--accent)' : 'transparent'}`,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span
                      className="mono-label"
                      style={{
                        width: 20,
                        height: 20,
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 10.5,
                        color: ring ?? 'var(--text-dim)',
                        border: `1px solid ${ring ?? 'var(--border)'}`,
                        flexShrink: 0,
                      }}
                    >
                      {i + 1}
                    </span>
                    <span style={{ fontWeight: 600, fontSize: 13.5 }}>{d.day}</span>
                  </div>
                  <span className={d.pnl >= 0 ? 'pnl-positive' : 'pnl-negative'} style={{ fontWeight: 700, fontSize: 14 }}>
                    {d.pnl >= 0 ? '+' : ''}${d.pnl.toFixed(0)}
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ flex: 1, height: 6, borderRadius: 999, background: 'var(--border)', overflow: 'hidden' }}>
                    <div
                      style={{
                        height: '100%',
                        width: `${d.winRate}%`,
                        background: d.winRate >= 50 ? colors.green : colors.red,
                        transition: reducedMotion ? 'none' : 'width var(--dur-medium) var(--ease-sig)',
                      }}
                    />
                  </div>
                  <span className="mono-label" style={{ fontSize: 10.5, color: 'var(--text-dim)', flexShrink: 0 }}>
                    {d.winRate}% WR
                  </span>
                </div>

                <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>
                  {d.trades} trade{d.trades === 1 ? '' : 's'}
                  {d.avgWin > 0 && <> · avg win <span style={{ color: 'var(--green)' }}>+${d.avgWin.toFixed(0)}</span></>}
                  {d.avgLoss > 0 && <> · avg loss <span style={{ color: 'var(--red)' }}>-${d.avgLoss.toFixed(0)}</span></>}
                </div>
              </div>
            )
          })}

          {idle.length > 0 && (
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', paddingTop: 2 }}>
              {idle.map((d) => (
                <span
                  key={d.day}
                  className="mono-label"
                  style={{ fontSize: 10.5, color: 'var(--text-dim)', border: '1px solid var(--border)', borderRadius: 999, padding: '3px 9px' }}
                >
                  {d.day} — no trades
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
