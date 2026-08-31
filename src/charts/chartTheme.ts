import { COLORS } from '../colors'

export const TOOLTIP_STYLE = {
  background: 'rgba(252, 250, 246, 0.94)',
  border: '1px solid #D8CFC0',
  borderRadius: 16,
  fontSize: 12,
  color: COLORS.textStrong,
  boxShadow: '0 12px 32px -12px rgba(60,50,38,0.22)',
  backdropFilter: 'blur(12px)',
  WebkitBackdropFilter: 'blur(12px)',
}

export const TOOLTIP_LABEL_STYLE = { color: COLORS.textMuted }

export const TOOLTIP_ITEM_STYLE = { color: COLORS.textStrong }

export const CHART_ANIM = {
  isAnimationActive: true,
  animationDuration: 600,
  animationEasing: 'ease-out' as const,
}

export const CHART_CURSOR = { fill: 'rgba(60, 50, 38, 0.06)' }
