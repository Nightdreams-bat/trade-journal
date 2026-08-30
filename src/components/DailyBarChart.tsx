import { Bar, BarChart, XAxis, YAxis, ResponsiveContainer, Cell, Tooltip } from 'recharts'
import { COLORS } from '../colors'
import { TOOLTIP_STYLE, TOOLTIP_LABEL_STYLE, TOOLTIP_ITEM_STYLE, CHART_ANIM, CHART_CURSOR } from '../charts/chartTheme'

export function DailyBarChart({ data }: { data: { day: string; pnl: number }[] }) {
  return (
    <div className="card" style={{ padding: 16, flex: 1, minWidth: 320 }}>
      <div style={{ color: 'var(--text-muted)', fontSize: 12, marginBottom: 4 }}>Daily Performance</div>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data}>
          <XAxis dataKey="day" tick={{ fill: COLORS.textMuted, fontSize: 11 }} axisLine={{ stroke: COLORS.border }} tickLine={false} />
          <YAxis tick={{ fill: COLORS.textMuted, fontSize: 11 }} axisLine={false} tickLine={false} />
          <Tooltip
            contentStyle={TOOLTIP_STYLE}
            labelStyle={TOOLTIP_LABEL_STYLE}
            itemStyle={TOOLTIP_ITEM_STYLE}
            cursor={CHART_CURSOR}
            formatter={(v) => [`$${v}`, 'P&L']}
          />
          <Bar dataKey="pnl" radius={[4, 4, 4, 4]} {...CHART_ANIM}>
            {data.map((d, i) => (
              <Cell key={i} fill={d.pnl >= 0 ? COLORS.green : COLORS.red} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
