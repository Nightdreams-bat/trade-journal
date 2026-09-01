import type { AnalyticsSummary } from '../types'
import { formatRatio } from '../format'

function money(n: number): string {
  const sign = n < 0 ? '-' : ''
  return `${sign}$${Math.abs(n).toFixed(1)}`
}

function Row({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '9px 0', borderBottom: '1px solid var(--border-soft)' }}>
      <span style={{ color: 'var(--text-muted)' }}>{label}</span>
      <span style={{ fontWeight: 600, color: color ?? 'var(--text)' }}>{value}</span>
    </div>
  )
}

export function MonthlyStatsPanel({ stats }: { stats: AnalyticsSummary['monthlyStats'] }) {
  return (
    <div className="card" style={{ padding: 'var(--sp-4)', width: 240, flexShrink: 0 }}>
      <div style={{ color: 'var(--text-muted)', fontSize: 12, marginBottom: 4 }}>Monthly Stats</div>
      <Row label="Win Rate" value={`${stats.winRate}%`} />
      <Row label="Risk/Reward" value={formatRatio(stats.riskReward)} />
      <Row label="Profit Factor" value={formatRatio(stats.profitFactor)} />
      <Row label="Best Day P&L" value={money(stats.bestDayPnl)} color={stats.bestDayPnl >= 0 ? 'var(--green)' : 'var(--red)'} />
      <Row label="Worst Day P&L" value={money(stats.worstDayPnl)} color={stats.worstDayPnl < 0 ? 'var(--red)' : undefined} />
      <Row label="Avg Daily P&L" value={money(stats.avgDailyPnl)} />
      <Row label="Trades" value={String(stats.tradeCount)} />
    </div>
  )
}
