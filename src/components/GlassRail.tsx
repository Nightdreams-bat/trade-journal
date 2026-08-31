import type { CSSProperties, ReactNode } from 'react'

interface GlassRailProps {
  children: ReactNode
  /** `flush` drops the rounded corners + side borders for a full-width top bar. */
  variant?: 'panel' | 'flush'
  className?: string
  style?: CSSProperties
  role?: string
}

/**
 * The single shared "liquid glass" rail. Every secondary nav / section-pill
 * strip in the app renders through this so the treatment is defined once
 * (see `.glass-rail` in theme.css) and every rail looks identical.
 */
export function GlassRail({ children, variant = 'panel', className = '', style, role }: GlassRailProps) {
  return (
    <div
      role={role}
      className={`glass-rail${variant === 'flush' ? ' glass-rail--flush' : ''}${className ? ` ${className}` : ''}`}
      style={style}
    >
      {children}
    </div>
  )
}
