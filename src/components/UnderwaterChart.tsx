import { Area, AreaChart, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid, ReferenceLine } from 'recharts'
import { useColors } from '../themeMode'
import { useChartTheme, CHART_ANIM } from '../charts/chartTheme'
import type { DrawdownDetail } from '../types'

/**
 * The underwater curve — how far below its high-water mark the account sat on every trading day.
 * The equity curve shows what you made; this shows what it cost you to make it.
 */
export function UnderwaterChart({ detail, compact }: { detail: DrawdownDetail; compact?: boolean }) {
  const colors = useColors()
  const { TOOLTIP_STYLE, TOOLTIP_LABEL_STYLE, TOOLTIP_ITEM_STYLE } = useChartTheme()

  const pct = detail.percentAvailable
  const benchmarkByDate = new Map((detail.benchmarkSeries ?? []).map((p) => [p.date, pct ? p.drawdownPct : p.drawdownAbs]))

  const data = detail.series.map((p) => ({
    date: p.date,
    drawdown: pct ? p.drawdownPct : p.drawdownAbs,
    benchmark: benchmarkByDate.get(p.date) ?? null,
  }))

  const chartHeight = compact ? 150 : 220
  const showBenchmark = benchmarkByDate.size > 0
  const fmt = (v: number) => (pct ? `${v.toFixed(2)}%` : `$${Math.round(v).toLocaleString()}`)

  return (
    <div className="card" style={{ padding: 'var(--sp-4)', flex: 2, minWidth: 420 }}>
      {!compact && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4, gap: 10, flexWrap: 'wrap' }}>
          <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>
            Underwater Curve {pct ? '(% below high-water mark)' : '($ below high-water mark)'}
          </div>
          <div style={{ color: 'var(--text-dim)', fontSize: 11 }}>
            {showBenchmark ? 'Solid: this strategy · Dashed: whole book' : `Time underwater: ${detail.timeUnderwaterPct}%`}
          </div>
        </div>
      )}
      {data.length < 2 ? (
        <div style={{ height: chartHeight, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-dim)' }}>
          Not enough trades yet
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={chartHeight}>
          <AreaChart data={data}>
            <defs>
              <linearGradient id="underwaterFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={colors.red} stopOpacity={0} />
                <stop offset="100%" stopColor={colors.red} stopOpacity={0.42} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke={colors.border} strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="date" tick={{ fill: colors.textMuted, fontSize: 10 }} axisLine={{ stroke: colors.border }} tickLine={false} minTickGap={30} />
            <YAxis
              tick={{ fill: colors.textMuted, fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v: number) => (pct ? `${v}%` : `$${v}`)}
            />
            <ReferenceLine y={0} stroke={colors.border} />
            <Tooltip
              contentStyle={TOOLTIP_STYLE}
              labelStyle={TOOLTIP_LABEL_STYLE}
              itemStyle={TOOLTIP_ITEM_STYLE}
              formatter={(v, name) => [fmt(Number(v)), name === 'benchmark' ? 'Whole book' : 'Drawdown']}
            />
            {showBenchmark && (
              <Area
                type="monotone"
                dataKey="benchmark"
                stroke={colors.textDim}
                strokeWidth={1.5}
                strokeDasharray="4 3"
                fill="none"
                connectNulls
                {...CHART_ANIM}
              />
            )}
            <Area type="monotone" dataKey="drawdown" stroke={colors.red} strokeWidth={2} fill="url(#underwaterFill)" {...CHART_ANIM} />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}
