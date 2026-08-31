import type { ComponentType } from 'react'
import { motion } from 'motion/react'
import { usePrefersReducedMotion } from '../anim'
import { PANEL, PANEL_OUT, HOVER } from '../anim/tokens'
import type { TabKey } from '../tabs'
import {
  BookOpen,
  CandlestickChart,
  CalendarDays,
  Crosshair,
  House,
  LayoutGrid,
  NotebookPen,
  Settings,
  Sparkles,
  Table2,
} from './icons'

interface NavTab {
  key: string
  label: string
}

interface NavRailProps {
  open: boolean
  onClose: () => void
  tabs: readonly NavTab[]
  active: string
  onSelect: (key: string) => void
  showWhatsNewDot: boolean
  onAccounts: () => void
  onDailyReview: () => void
  onToggleTheme?: () => void
}

const TAB_ICONS: Record<TabKey, ComponentType<{ size?: number; strokeWidth?: number }>> = {
  home: House,
  analytics: LayoutGrid,
  playbooks: BookOpen,
  review: NotebookPen,
  trades: Table2,
  missed: Crosshair,
  whatsnew: Sparkles,
}

export function NavRail({
  open,
  onClose,
  tabs,
  active,
  onSelect,
  showWhatsNewDot,
  onAccounts,
  onDailyReview,
  onToggleTheme,
}: NavRailProps) {
  const reduced = usePrefersReducedMotion()

  const animate = reduced
    ? { opacity: open ? 1 : 0 }
    : {
        x: open ? 0 : -24,
        rotateY: 6,
        opacity: open ? 1 : 0,
        filter: open ? 'blur(0px)' : 'blur(6px)',
      }

  const bottomBtn = (label: string, onClick: () => void, node: React.ReactNode) => (
    <button
      type="button"
      className="btn"
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        width: '100%',
        justifyContent: 'flex-start',
        fontSize: 12,
        padding: '7px 9px',
      }}
    >
      {node}
      <span>{label}</span>
    </button>
  )

  return (
    <motion.nav
      className="liquid-glass liquid-glass--hero nav-rail"
      aria-label="Sections"
      aria-hidden={!open}
      initial={false}
      animate={animate}
      transition={reduced ? { duration: 0 } : open ? PANEL : PANEL_OUT}
      style={{
        transformPerspective: 1800,
        backfaceVisibility: 'hidden',
        pointerEvents: open ? 'auto' : 'none',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 6px 12px' }}>
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 28,
            height: 28,
            borderRadius: 'var(--radius-pill)',
            background: 'var(--accent-bg)',
            color: 'var(--accent)',
          }}
        >
          <CandlestickChart size={16} strokeWidth={1.75} />
        </span>
        <span style={{ fontWeight: 'var(--weight-title)', fontSize: 13.5 }}>
          Trade<span className="accent-word">Journal</span>
        </span>
      </div>

      <div role="tablist" style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {tabs.map((t) => {
          const isActive = active === t.key
          const Icon = TAB_ICONS[t.key as TabKey] ?? House
          return (
            <motion.button
              key={t.key}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => onSelect(t.key)}
              {...(reduced ? {} : { whileHover: { scale: 1.015 }, transition: HOVER })}
              style={{
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                height: 38,
                padding: '0 10px',
                border: 'none',
                background: 'transparent',
                borderRadius: 'var(--radius)',
                color: isActive ? 'var(--accent-deep)' : 'var(--text-muted)',
                fontSize: 12.5,
                fontWeight: 'var(--weight-medium)',
                textAlign: 'left',
                cursor: 'pointer',
              }}
            >
              {isActive &&
                (reduced ? (
                  <span
                    style={{
                      position: 'absolute',
                      inset: 0,
                      borderRadius: 'var(--radius)',
                      background: 'linear-gradient(135deg, var(--accent-bg), var(--accent-2-bg))',
                      border: '1px solid var(--accent-border)',
                      boxShadow: '0 6px 16px -8px rgba(61, 110, 232, 0.4)',
                      zIndex: -1,
                    }}
                  />
                ) : (
                  <motion.span
                    layoutId="nav-active"
                    style={{
                      position: 'absolute',
                      inset: 0,
                      borderRadius: 'var(--radius)',
                      background: 'linear-gradient(135deg, var(--accent-bg), var(--accent-2-bg))',
                      border: '1px solid var(--accent-border)',
                      boxShadow: '0 6px 16px -8px rgba(61, 110, 232, 0.4)',
                      zIndex: -1,
                    }}
                    transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                  />
                ))}
              <Icon size={16} strokeWidth={1.75} />
              <span style={{ position: 'relative' }}>
                {t.label}
                {t.key === 'whatsnew' && showWhatsNewDot && (
                  <span
                    aria-label="new updates"
                    style={{
                      position: 'absolute',
                      top: -2,
                      right: -10,
                      width: 6,
                      height: 6,
                      borderRadius: '50%',
                      background: 'var(--accent)',
                    }}
                  />
                )}
              </span>
            </motion.button>
          )
        })}
      </div>

      <div style={{ flex: 1 }} />

      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, paddingTop: 10, borderTop: '1px solid var(--border-soft)' }}>
        {bottomBtn('Daily Review', onDailyReview, <CalendarDays size={15} strokeWidth={1.75} />)}
        {bottomBtn('Accounts', onAccounts, <Settings size={15} strokeWidth={1.75} />)}
        {onToggleTheme && bottomBtn('Theme', onToggleTheme, <Sparkles size={15} strokeWidth={1.75} />)}
      </div>

      <button
        type="button"
        onClick={onClose}
        aria-label="Close navigation"
        className="btn"
        style={{ marginTop: 8, fontSize: 11, padding: '5px 8px' }}
      >
        Close
      </button>
    </motion.nav>
  )
}
