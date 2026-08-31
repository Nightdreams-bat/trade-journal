import type { CSSProperties, ElementType, ReactNode } from 'react'

interface LiquidGlassProps {
  children: ReactNode
  /** Element to render as. Default `div`. */
  as?: ElementType
  /** Extra classes appended after `liquid-glass`. */
  className?: string
  style?: CSSProperties
  /** Corner radius; defaults to the theme `--radius`. */
  radius?: number | string
  role?: string
  'aria-label'?: string
}

/**
 * The liquid-glass surface as a component, for one-off use.
 *
 * The look is a straight port of ui-layouts' `liquid-glass`
 * (`npx uilayouts@latest add liquid-glass`) adapted to this app's plain-CSS
 * stack: the frosted fill + inset edge highlight + outer glow + the SVG
 * displacement "bend" layer all live in `.liquid-glass` in theme.css and
 * reference the shared `#liquid-glass-bend` filter in index.html. The drag /
 * expand behaviour from the original is intentionally dropped — surfaces in
 * this app don't move.
 *
 * Most surfaces already get this automatically (`.card`, `.glass`,
 * `<GlassRail>`, `.modal-panel`); reach for this component only when you need
 * a glass container that isn't one of those.
 */
export function LiquidGlass({
  children,
  as: Tag = 'div',
  className = '',
  style,
  radius,
  ...rest
}: LiquidGlassProps) {
  return (
    <Tag
      className={`liquid-glass${className ? ` ${className}` : ''}`}
      style={{ borderRadius: radius, ...style }}
      {...rest}
    >
      {children}
    </Tag>
  )
}
