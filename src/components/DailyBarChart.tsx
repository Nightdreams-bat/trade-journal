import { Bar, BarChart, XAxis, YAxis, ResponsiveContainer, Cell, Tooltip } from 'recharts'
import { useColors } from '../themeMode'
import { useChartTheme, CHART_ANIM } from '../charts/chartTheme'
import { ANALYTICS_TWIN_PANEL_HEIGHT } from './analyticsPanelSize'

export function DailyBarChart({ data }: { data: { day: string; pnl: number }[] }) {
  const colors = useColors()
  const { TOOLTIP_STYLE, TOOLTIP_LABEL_STYLE, TOOLTIP_ITEM_STYLE, CHART_CURSOR } = useChartTheme()
  return (
    <div
      className="card"
      style={{
        padding: 'var(--sp-4)',
        flex: 1,
        minWidth: 320,
        height: ANALYTICS_TWIN_PANEL_HEIGHT,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <div style={{ color: 'var(--text-muted)', fontSize: 12, marginBottom: 4, flexShrink: 0 }}>Daily Performance (selected month)</div>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <XAxis dataKey="day" tick={{ fill: colors.textMuted, fontSize: 11 }} axisLine={{ stroke: colors.border }} tickLine={false} />
          <YAxis tick={{ fill: colors.textMuted, fontSize: 11 }} axisLine={false} tickLine={false} />
          <Tooltip
            contentStyle={TOOLTIP_STYLE}
            labelStyle={TOOLTIP_LABEL_STYLE}
            itemStyle={TOOLTIP_ITEM_STYLE}
            cursor={CHART_CURSOR}
            formatter={(v) => [`$${v}`, 'P&L']}
          />
          <Bar dataKey="pnl" radius={[8, 8, 0, 0]} {...CHART_ANIM}>
            {data.map((d, i) => (
              <Cell key={i} fill={d.pnl >= 0 ? colors.green : colors.red} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
