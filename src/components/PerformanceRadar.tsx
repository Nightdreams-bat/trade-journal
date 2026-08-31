import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Tooltip } from 'recharts'
import { COLORS } from '../colors'
import { TOOLTIP_STYLE, TOOLTIP_LABEL_STYLE, TOOLTIP_ITEM_STYLE, CHART_ANIM } from '../charts/chartTheme'

export function PerformanceRadar({ data }: { data: { metric: string; value: number }[] }) {
  return (
    <div className="card" style={{ padding: 'var(--sp-4)', flex: 1, minWidth: 320 }}>
      <div style={{ color: 'var(--text-muted)', fontSize: 12, marginBottom: 4 }}>Performance Profile</div>
      <ResponsiveContainer width="100%" height={280}>
        <RadarChart data={data} outerRadius="70%">
          <PolarGrid stroke={COLORS.border} />
          <PolarAngleAxis dataKey="metric" tick={{ fill: COLORS.textMuted, fontSize: 11 }} />
          <PolarRadiusAxis domain={[0, 100]} tick={{ fill: COLORS.textDim, fontSize: 9 }} axisLine={false} />
          <Tooltip
            contentStyle={TOOLTIP_STYLE}
            labelStyle={TOOLTIP_LABEL_STYLE}
            itemStyle={TOOLTIP_ITEM_STYLE}
            formatter={(v) => [v, 'Score']}
          />
          <Radar dataKey="value" stroke={COLORS.accent} fill={COLORS.accent} fillOpacity={0.28} {...CHART_ANIM} />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  )
}
