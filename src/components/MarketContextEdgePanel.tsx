import { marketContextEdge, MIN_CONTEXT_SAMPLE } from '../tradingPlan'
import type { Confluence, Trade } from '../types'

function money(n: number): string {
  const sign = n < 0 ? '-' : ''
  return `${sign}$${Math.abs(n).toFixed(0)}`
}

/**
 * Which market conditions your edge actually lives in. Ranked by dollar expectancy within each
 * condition group, so gap shapes are compared against gap shapes rather than against everything.
 */
export function MarketContextEdgePanel({ trades, confluences }: { trades: Trade[]; confluences: Confluence[] }) {
  const groups = marketContextEdge(trades, confluences)

  return (
    <div className="card" style={{ padding: 'var(--sp-4)' }}>
      <div style={{ color: 'var(--text-muted)', fontSize: 12, marginBottom: 2 }}>Edge by Market Context</div>
      <div style={{ color: 'var(--text-dim)', fontSize: 11, marginBottom: 12 }}>
        The conditions the market handed you, ranked by what each was worth per trade
      </div>

      {groups.length === 0 ? (
        <div style={{ color: 'var(--text-dim)', fontSize: 12, lineHeight: 1.5 }}>
          No market-context tags on these trades yet. Open any trade, then use “+ Add market-context pack”
          under Confluences to add the starter set — gap shape, relative volume, VWAP posture, event risk
          and regime — and tag trades with the conditions they happened in.
        </div>
      ) : (
        <div style={{ display: 'flex', gap: 'var(--sp-4)', flexWrap: 'wrap' }}>
          {groups.map((g) => (
            <div key={g.group} style={{ flex: 1, minWidth: 240 }}>
              <div className="mono-label" style={{ marginBottom: 6 }}>{g.group}</div>
              {g.tags.map((t) => (
                <div
                  key={t.id}
                  title={t.credible ? undefined : `Only ${t.count} trades — too few to trust`}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'baseline',
                    gap: 10,
                    padding: '7px 0',
                    borderBottom: '1px solid var(--border-soft)',
                    opacity: t.credible ? 1 : 0.45,
                  }}
                >
                  <span style={{ color: 'var(--text)', fontSize: 12 }}>
                    {t.name}
                    <span style={{ color: 'var(--text-dim)', fontSize: 10.5, marginLeft: 6 }}>
                      {t.count}× · {t.winRate}%{!t.credible && ` · under ${MIN_CONTEXT_SAMPLE}`}
                    </span>
                  </span>
                  <span
                    style={{
                      fontWeight: 600,
                      fontSize: 12.5,
                      whiteSpace: 'nowrap',
                      color: t.expectancy >= 0 ? 'var(--green)' : 'var(--red)',
                    }}
                  >
                    {money(t.expectancy)}
                  </span>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
