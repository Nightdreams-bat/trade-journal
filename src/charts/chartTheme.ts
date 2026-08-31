import { COLORS } from '../colors'

export const TOOLTIP_STYLE = {
  background: 'rgba(16, 16, 16, 0.92)',
  border: '1px solid #333333',
  borderRadius: 16,
  fontSize: 12,
  color: COLORS.text,
  boxShadow: '0 12px 32px -12px rgba(0,0,0,0.7)',
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

export const CHART_CURSOR = { fill: 'rgba(93, 214, 44, 0.08)' }
