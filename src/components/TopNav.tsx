import { useState } from 'react'
import { motion } from 'motion/react'
import { usePrefersReducedMotion } from '../anim'
import { LiquidGlass } from './LiquidGlass'
import { CandlestickChart, MoreHorizontal } from './icons'

export interface NavTab {
  key: string
  label: string
}

interface TopNavProps {
  tabs: readonly NavTab[]
  active: string
  onSelect: (key: string) => void
  /** show the "new updates" dot on the What's New tab */
  showWhatsNewDot: boolean
  onAccounts: () => void
  onDailyReview: () => void
  onTradeEntry: () => void
}

/**
 * Floating glass top navigation — a visionOS-style pill that hovers over the
 * content and refracts the ambient backdrop. Brand mark at the leading edge,
 * the section tablist in the centre, primary actions at the trailing edge
 * (collapsed into a menu on narrow windows).
 */
export function TopNav({
  tabs,
  active,
  onSelect,
  showWhatsNewDot,
  onAccounts,
  onDailyReview,
  onTradeEntry,
}: TopNavProps) {
  const reduced = usePrefersReducedMotion()
  const [menuOpen, setMenuOpen] = useState(false)

  const actions = (
    <>
      <button className="btn" onClick={onAccounts}>Accounts</button>
      <button className="btn" onClick={onDailyReview}>+ Daily Review</button>
      <button className="btn btn-primary" onClick={onTradeEntry}>+ Trade Entry</button>
    </>
  )

  return (
    <div
      style={{
        position: 'sticky',
        top: 'var(--sp-4)',
        zIndex: 30,
        maxWidth: 'min(1180px, calc(100vw - 48px))',
        margin: '0 auto',
      }}
    >
      <LiquidGlass
        as="nav"
        className="liquid-glass--hero"
        radius="var(--radius-pill)"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--sp-4)',
          padding: '8px 10px 8px 16px',
        }}
      >
        {/* brand */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 30,
              height: 30,
              borderRadius: 'var(--radius-pill)',
              background: 'var(--accent-bg)',
              color: 'var(--accent)',
            }}
          >
            <CandlestickChart size={17} strokeWidth={1.75} absoluteStrokeWidth />
          </span>
          <span style={{ fontWeight: 'var(--weight-title)', fontSize: 15, letterSpacing: '-0.01em' }}>
            Trade<span className="accent-word">Journal</span>
          </span>
        </div>

        {/* section tablist */}
        <div
          role="tablist"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 2,
            flex: 1,
            justifyContent: 'center',
            flexWrap: 'wrap',
          }}
        >
          {tabs.map((t) => {
            const isActive = active === t.key
            return (
              <button
                key={t.key}
                role="tab"
                aria-selected={isActive}
                onClick={() => onSelect(t.key)}
                className="btn"
                style={{
                  position: 'relative',
                  border: 'none',
                  background: 'transparent',
                  boxShadow: 'none',
                  color: isActive ? 'var(--accent-bright)' : 'var(--text-muted)',
                  fontWeight: 'var(--weight-medium)',
                  padding: '7px 13px',
                }}
              >
                {isActive &&
                  (reduced ? (
                    <span
                      style={{
                        position: 'absolute',
                        inset: 0,
                        borderRadius: 'var(--radius-pill)',
                        background: 'var(--accent-bg)',
                        border: '1px solid var(--accent-border)',
                        boxShadow: '0 6px 18px -8px rgba(76,111,165,0.28)',
                        zIndex: -1,
                      }}
                    />
                  ) : (
                    <motion.span
                      layoutId="nav-pill"
                      style={{
                        position: 'absolute',
                        inset: 0,
                        borderRadius: 'var(--radius-pill)',
                        background: 'var(--accent-bg)',
                        border: '1px solid var(--accent-border)',
                        boxShadow: '0 6px 18px -8px rgba(76,111,165,0.28)',
                        zIndex: -1,
                      }}
                      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                    />
                  ))}
                {t.label}
                {t.key === 'whatsnew' && showWhatsNewDot && (
                  <span
                    aria-label="new updates"
                    style={{
                      position: 'absolute',
                      top: 4,
                      right: 2,
                      width: 6,
                      height: 6,
                      borderRadius: '50%',
                      background: 'var(--accent)',
                      boxShadow: '0 0 0 2px var(--accent-bg)',
                    }}
                  />
                )}
              </button>
            )
          })}
        </div>

        {/* actions */}
        <div style={{ flexShrink: 0, position: 'relative' }}>
          <div className="topnav-actions" style={{ display: 'flex', gap: 8 }}>
            {actions}
          </div>
          <button
            className="btn topnav-actions-toggle"
            aria-label="Actions"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((v) => !v)}
            style={{ display: 'none' }}
          >
            <MoreHorizontal size={18} strokeWidth={1.75} absoluteStrokeWidth />
          </button>
          {menuOpen && (
            <div
              className="card"
              style={{
                position: 'absolute',
                right: 0,
                top: 'calc(100% + 10px)',
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
                padding: 'var(--sp-3)',
                minWidth: 180,
                zIndex: 40,
              }}
              onClick={() => setMenuOpen(false)}
            >
              {actions}
            </div>
          )}
        </div>
      </LiquidGlass>
    </div>
  )
}
