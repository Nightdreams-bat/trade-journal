import type { DrawdownDetail } from '../types'

function money(n: number): string {
  const sign = n < 0 ? '-' : ''
  return `${sign}$${Math.abs(n).toLocaleString(undefined, { maximumFractionDigits: 0 })}`
}

function pct(n: number): string {
  return `${n.toFixed(2)}%`
}

function days(n: number): string {
  return `${n} day${n === 1 ? '' : 's'}`
}

function Row({ label, value, color, hint }: { label: string; value: string; color?: string; hint?: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 10, padding: '9px 0', borderBottom: '1px solid var(--border-soft)' }}>
      <span style={{ color: 'var(--text-muted)' }}>
        {label}
        {hint && <span style={{ color: 'var(--text-dim)', fontSize: 11, marginLeft: 6 }}>{hint}</span>}
      </span>
      <span style={{ fontWeight: 600, color: color ?? 'var(--text)', whiteSpace: 'nowrap' }}>{value}</span>
    </div>
  )
}

/**
 * A ratio tile. Ratios are suppressed by `electron/drawdown.ts` until there is enough history to
 * annualise a return, so a null here means "not enough data yet", never "zero".
 */
function RatioTile({ label, value, meaning }: { label: string; value: number | null; meaning: string }) {
  return (
    <div
      style={{
        flex: 1,
        minWidth: 118,
        padding: '12px 14px',
        borderRadius: 'var(--radius-control)',
        border: '1px solid var(--border-soft)',
        background: 'rgba(var(--ink-rgb),0.02)',
      }}
    >
      <div style={{ color: 'var(--text-muted)', fontSize: 11.5, marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 20, fontWeight: 600, color: value == null ? 'var(--text-dim)' : 'var(--text-strong)' }}>
        {value == null ? '—' : value.toFixed(2)}
      </div>
      <div style={{ color: 'var(--text-dim)', fontSize: 10.5, marginTop: 3, lineHeight: 1.35 }}>{meaning}</div>
    </div>
  )
}

export function DrawdownPanel({ detail }: { detail: DrawdownDetail }) {
  const { currentDrawdown: current, percentAvailable } = detail
  const ratiosSuppressed = detail.calmar == null

  return (
    <div className="card" style={{ padding: 'var(--sp-4)', flex: 1, minWidth: 300 }}>
      <div style={{ color: 'var(--text-muted)', fontSize: 12, marginBottom: 10 }}>Drawdown</div>

      {/* The one fact worth reading first: are you underwater right now? */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '10px 12px',
          marginBottom: 12,
          borderRadius: 'var(--radius-control)',
          border: `1px solid ${current.inDrawdown ? 'var(--red-soft)' : 'var(--green-soft)'}`,
          background: current.inDrawdown ? 'var(--red-soft)' : 'var(--green-soft)',
        }}
      >
        <span
          style={{
            width: 8,
            height: 8,
            borderRadius: 999,
            flexShrink: 0,
            background: current.inDrawdown ? 'var(--red)' : 'var(--green)',
          }}
        />
        <span style={{ fontSize: 12.5, fontWeight: 'var(--weight-medium)', color: 'var(--text-strong)' }}>
          {current.inDrawdown
            ? `In drawdown — ${percentAvailable ? pct(current.depthPct) : money(current.depthAbs)} for ${days(current.daysInDrawdown)}`
            : 'At new highs'}
        </span>
      </div>

      {!percentAvailable && (
        <div style={{ color: 'var(--text-dim)', fontSize: 11, marginBottom: 10, lineHeight: 1.4 }}>
          Set a starting balance on your account to see percentage drawdown and risk-adjusted ratios.
        </div>
      )}

      <Row
        label="Max drawdown"
        value={percentAvailable ? `${pct(detail.maxDrawdownPct)} · ${money(detail.maxDrawdownAbs)}` : money(detail.maxDrawdownAbs)}
        color="var(--red)"
      />
      {detail.peakDate && detail.troughDate && (
        <Row label="Peak → trough" value={`${detail.peakDate} → ${detail.troughDate}`} />
      )}
      <Row label="Recovered" value={detail.recoveryDate ?? (detail.episodes.length ? 'not yet' : '—')} />
      <Row label="Drawdowns" value={String(detail.episodes.length)} />
      {percentAvailable && <Row label="Average depth" value={pct(detail.avgDepthPct)} />}
      <Row label="Avg peak → trough" value={days(detail.avgDurationDays)} />
      <Row
        label="Avg recovery"
        value={detail.avgRecoveryDays > 0 ? days(detail.avgRecoveryDays) : '—'}
        hint={detail.avgRecoveryDays > 0 ? undefined : 'none recovered yet'}
      />
      <Row label="Time underwater" value={`${detail.timeUnderwaterPct}%`} />
      {percentAvailable && (
        <Row
          label="Episodes over"
          value={`5%: ${detail.episodesOver.pct5} · 10%: ${detail.episodesOver.pct10} · 20%: ${detail.episodesOver.pct20}`}
        />
      )}

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 14 }}>
        <RatioTile label="Calmar" value={detail.calmar} meaning="Return per unit of worst drawdown" />
        <RatioTile label="Ulcer" value={detail.ulcerIndex} meaning="Depth × duration of pain" />
        <RatioTile label="Martin" value={detail.martin} meaning="Return per unit of ulcer" />
        <RatioTile label="Pain" value={detail.painIndex} meaning="Average % underwater" />
        <RatioTile label="Burke" value={detail.burke} meaning="Return vs all drawdowns" />
        <RatioTile label="Sterling" value={detail.sterling} meaning="Return vs worst yearly drops" />
      </div>

      {ratiosSuppressed && (
        <div style={{ color: 'var(--text-dim)', fontSize: 10.5, marginTop: 10, lineHeight: 1.4 }}>
          Risk-adjusted ratios need at least 60 days and 20 trading days of history before they mean anything —
          currently {detail.calendarDays} days / {detail.tradingDays} trading days.
        </div>
      )}
    </div>
  )
}
