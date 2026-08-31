import { COLORS } from '../colors'

export const TOOLTIP_STYLE = {
  background: 'rgba(20, 28, 46, 0.9)',
  border: '1px solid #2a3a58',
  borderRadius: 16,
  fontSize: 12,
  color: COLORS.text,
  boxShadow: '0 12px 32px -12px rgba(3,6,14,0.6)',
  backdropFilter: 'blur(12px)',
  WebkitBackdropFilter: 'blur(12px)',
}

export const TOOLTIP_LABEL_STYLE = { color: COLORS.textMuted }

export const TOOLTIP_ITEM_STYLE = { color: COLORS.text }

export const CHART_ANIM = {
  isAnimationActive: true,
  animationDuration: 600,
  animationEasing: 'ease-out' as const,
}

export const CHART_CURSOR = { fill: 'rgba(95, 208, 230, 0.08)' }
