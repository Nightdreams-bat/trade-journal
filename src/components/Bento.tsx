import type { CSSProperties, ReactNode } from 'react'
import { LiquidGlass } from './LiquidGlass'

/**
 * The bento container — a single big visionOS-style glass "window" that holds a
 * responsive 12-column grid of widget cards. Only this outer surface carries
 * the displacement "bend" layer (`--hero`); the individual `BentoItem`s are
 * plain frosted `.card`s so a screenful of widgets stays one live filter, not
 * a dozen (the same call the codebase already makes for `.card`).
 *
 * Grid track counts + the item spans collapse via `@container` queries defined
 * in the `.bento` / `.bento-item` block in theme.css.
 */
export function Bento({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return (
    <LiquidGlass
      className="liquid-glass--hero"
      radius="var(--radius-window)"
      style={{ boxShadow: 'var(--shadow-window)', ...style }}
    >
      <div className="bento">{children}</div>
    </LiquidGlass>
  )
}

interface BentoItemProps {
  /** column span on the 12-col grid (default 4) */
  col?: number
  /** row span (default 1) */
  row?: number
  /** don't render the frosted card frame — the child brings its own surface */
  bare?: boolean
  className?: string
  style?: CSSProperties
  children: ReactNode
}

export function BentoItem({ col = 4, row = 1, bare = false, className = '', style, children }: BentoItemProps) {
  return (
    <div
      className={`bento-item${bare ? '' : ' card'}${className ? ` ${className}` : ''}`}
      style={{
        // consumed by the @container rules in theme.css
        ['--c' as string]: col,
        ['--r' as string]: row,
        gap: 'var(--sp-2)',
        ...style,
      }}
    >
      {children}
    </div>
  )
}
