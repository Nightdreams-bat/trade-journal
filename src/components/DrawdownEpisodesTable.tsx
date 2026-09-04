import type { DrawdownDetail } from '../types'

function money(n: number): string {
  const sign = n < 0 ? '-' : ''
  return `${sign}$${Math.abs(n).toLocaleString(undefined, { maximumFractionDigits: 0 })}`
}

/** Every drawdown the account has been through, worst first. */
export function DrawdownEpisodesTable({ detail }: { detail: DrawdownDetail }) {
  const episodes = [...detail.episodes].sort((a, b) => a.depthAbs - b.depthAbs)
  const pct = detail.percentAvailable

  return (
    <div className="card" style={{ padding: 'var(--sp-4)', flex: 1, minWidth: 420 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8, gap: 10, flexWrap: 'wrap' }}>
        <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>Drawdown Episodes — worst first</div>
        {pct && episodes.length > 1 && (
          <div style={{ color: 'var(--text-dim)', fontSize: 11 }}>
            Median {detail.depthPercentiles.p50.toFixed(2)}% · 90th pct {detail.depthPercentiles.p90.toFixed(2)}%
          </div>
        )}
      </div>

      {episodes.length === 0 ? (
        <div style={{ color: 'var(--text-dim)', fontSize: 12, padding: '18px 0' }}>
          No drawdowns yet — the account has never closed a day below a previous high.
        </div>
      ) : (
        <div style={{ overflowX: 'auto', maxHeight: 320, overflowY: 'auto' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Peak</th>
                <th>Trough</th>
                <th>Depth</th>
                <th>To trough</th>
                <th>To recover</th>
              </tr>
            </thead>
            <tbody>
              {episodes.map((e) => (
                <tr key={`${e.peakDate}-${e.troughDate}`}>
                  <td>{e.peakDate}</td>
                  <td>{e.troughDate}</td>
                  <td style={{ color: 'var(--red)', fontWeight: 600 }}>
                    {pct ? `${e.depthPct.toFixed(2)}%` : money(e.depthAbs)}
                  </td>
                  <td>{e.durationDays}d</td>
                  <td>
                    {e.ongoing ? (
                      <span className="tag-pill negative" style={{ fontSize: 10.5 }}>ongoing</span>
                    ) : (
                      `${e.recoveryDays}d`
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
