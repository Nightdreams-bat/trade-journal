import { useColors } from '../themeMode'

export function useChartTheme() {
  const colors = useColors()
  return {
    TOOLTIP_STYLE: {
      background: colors.tooltipBg,
      border: `1px solid ${colors.border}`,
      borderRadius: 16,
      fontSize: 12,
      color: colors.textStrong,
      boxShadow: colors.tooltipShadow,
      backdropFilter: 'blur(12px)',
      WebkitBackdropFilter: 'blur(12px)',
    },
    TOOLTIP_LABEL_STYLE: { color: colors.textMuted },
    TOOLTIP_ITEM_STYLE: { color: colors.textStrong },
    CHART_CURSOR: { fill: colors.chartCursor },
  }
}

export const CHART_ANIM = {
  isAnimationActive: true,
  animationDuration: 600,
  animationEasing: 'ease-out' as const,
}
