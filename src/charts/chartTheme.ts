import { COLORS } from '../colors'

export const TOOLTIP_STYLE = {
  background: COLORS.card,
  border: '1px solid ' + COLORS.border,
  borderRadius: 3,
  fontSize: 12,
  color: COLORS.text,
  boxShadow: '0 8px 24px -12px rgba(0,0,0,0.6)',
}

export const TOOLTIP_LABEL_STYLE = { color: COLORS.textMuted }

export const TOOLTIP_ITEM_STYLE = { color: COLORS.text }

export const CHART_ANIM = {
  isAnimationActive: true,
  animationDuration: 600,
  animationEasing: 'ease-out' as const,
}

export const CHART_CURSOR = { fill: 'rgba(91,194,216,0.06)' }
