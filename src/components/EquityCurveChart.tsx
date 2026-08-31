import { Area, AreaChart, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid } from 'recharts'
import { COLORS } from '../colors'
import { TOOLTIP_STYLE, TOOLTIP_LABEL_STYLE, TOOLTIP_ITEM_STYLE, CHART_ANIM } from '../charts/chartTheme'
import type { AnalyticsSummary } from '../types'

export function EquityCurveChart({
  equityCurve,
  drawdown,
  compact,
}: {
  equityCurve: AnalyticsSummary['equityCurve']
  drawdown: AnalyticsSummary['drawdown']
  compact?: boolean
}) {
  const merged = equityCurve.map((e, i) => ({
    date: e.date,
    equity: e.cumulativePnl,
    drawdown: drawdown.series[i]?.drawdown ?? 0,
  }))

  const chartHeight = compact ? 150 : 220

  return (
    <div className="card" style={{ padding: 'var(--sp-4)', flex: 2, minWidth: 420 }}>
      {!compact && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 }}>
          <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>Equity Curve (all-time)</div>
          <div style={{ color: 'var(--text-dim)', fontSize: 11 }}>Max drawdown: ${drawdown.maxDrawdown}</div>
        </div>
      )}
      {merged.length < 2 ? (
        <div style={{ height: chartHeight, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-dim)' }}>
          Not enough trades yet
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={chartHeight}>
          <AreaChart data={merged}>
            <defs>
              <linearGradient id="equityFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={COLORS.green} stopOpacity={0.35} />
                <stop offset="100%" stopColor={COLORS.green} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke={COLORS.border} strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="date" tick={{ fill: COLORS.textMuted, fontSize: 10 }} axisLine={{ stroke: COLORS.border }} tickLine={false} minTickGap={30} />
            <YAxis tick={{ fill: COLORS.textMuted, fontSize: 11 }} axisLine={false} tickLine={false} />
            <Tooltip
              contentStyle={TOOLTIP_STYLE}
              labelStyle={TOOLTIP_LABEL_STYLE}
              itemStyle={TOOLTIP_ITEM_STYLE}
              formatter={(v) => [`$${v}`, 'Cumulative P&L']}
            />
            <Area type="monotone" dataKey="equity" stroke={COLORS.green} strokeWidth={2} fill="url(#equityFill)" {...CHART_ANIM} />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}
