import type { ComponentType, CSSProperties, ReactNode } from 'react'
import { motion } from 'motion/react'
import { usePrefersReducedMotion } from '../anim'
import { PANEL, PANEL_OUT, HOVER } from '../anim/tokens'
import { tabsNewSince, type TabKey } from '../tabs'
import {
  BookOpen,
  CandlestickChart,
  CalendarDays,
  ChevronRight,
  Crosshair,
  FlaskConical,
  House,
  LayoutGrid,
  NotebookPen,
  Settings,
  Sparkles,
  Sun,
  Table2,
  Target,
  User,
  Users,
  Wallet,
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
  /** Last release read in What's New — tabs added after it get a "New" badge. */
  seenVersion: string | null
  onAccounts: () => void
  onDailyReview: () => void
  onToggleTheme?: () => void
}

type IconComponent = ComponentType<{ size?: number; strokeWidth?: number }>

const TAB_ICONS: Record<TabKey, IconComponent> = {
  home: House,
  analytics: LayoutGrid,
  plan: Target,
  payout: Wallet,
  playbooks: BookOpen,
  review: NotebookPen,
  news: CalendarDays,
  trades: Table2,
  backtest: FlaskConical,
  missed: Crosshair,
  shared: Users,
  settings: Settings,
  whatsnew: Sparkles,
}

/**
 * Section layout for the rail. Keys are matched against the `tabs` prop; a tab
 * that appears in `tabs` but in none of these groups falls through to the first
 * (unlabelled) section rather than disappearing.
 */
const GROUPS: readonly { label?: string; keys: readonly string[] }[] = [
  { keys: ['home', 'analytics'] },
  { label: 'Journal', keys: ['trades', 'missed', 'backtest'] },
  { label: 'Plan', keys: ['plan', 'playbooks', 'payout'] },
  { label: 'Review', keys: ['review', 'news', 'shared'] },
]

const FOOTER_KEYS = ['settings', 'whatsnew'] as const

const ROW_HEIGHT = 32

export function NavRail({
  open,
  onClose,
  tabs,
  active,
  onSelect,
  showWhatsNewDot,
  seenVersion,
  onAccounts,
  onDailyReview,
  onToggleTheme,
}: NavRailProps) {
  const reduced = usePrefersReducedMotion()
  const newTabKeys = new Set(tabsNewSince(seenVersion).map((t) => t.key))

  const animate = reduced
    ? { opacity: open ? 1 : 0 }
    : {
        x: open ? 0 : -24,
        rotateY: 6,
        opacity: open ? 1 : 0,
        filter: open ? 'blur(0px)' : 'blur(6px)',
      }

  const byKey = new Map(tabs.map((t) => [t.key, t]))
  const placed = new Set<string>([...GROUPS.flatMap((g) => [...g.keys]), ...FOOTER_KEYS])
  const orphans = tabs.filter((t) => !placed.has(t.key))

  const sections = GROUPS.map((g, i) => ({
    label: g.label,
    tabs: [...(i === 0 ? orphans : []), ...g.keys.flatMap((k) => byKey.get(k) ?? [])],
  })).filter((s) => s.tabs.length > 0)

  const footerTabs = FOOTER_KEYS.flatMap((k) => byKey.get(k) ?? [])

  const rowStyle = (isActive: boolean): CSSProperties => ({
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    gap: 9,
    height: ROW_HEIGHT,
    padding: '0 10px',
    border: 'none',
    background: 'transparent',
    borderRadius: 'var(--radius)',
    color: isActive ? 'var(--accent-deep)' : 'var(--text-muted)',
    fontSize: 12.5,
    fontWeight: 'var(--weight-medium)',
    textAlign: 'left',
    cursor: 'pointer',
  })

  // Inactive glyphs sit a step below their labels so 14 icons don't all pull.
  const rowIcon = (Icon: IconComponent, isActive: boolean) => (
    <span
      style={{
        display: 'inline-flex',
        color: isActive ? 'var(--accent-deep)' : 'var(--text-dim)',
        flexShrink: 0,
      }}
    >
      <Icon size={15} strokeWidth={1.75} />
    </span>
  )

  const activePill = reduced ? (
    <span className="nav-active-pill" style={{ position: 'absolute', inset: 0, zIndex: -1 }} />
  ) : (
    <motion.span
      layoutId="nav-active"
      className="nav-active-pill"
      style={{ position: 'absolute', inset: 0, zIndex: -1 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
    />
  )

  const tabRow = (t: NavTab) => {
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
        style={rowStyle(isActive)}
      >
        {isActive && activePill}
        {rowIcon(Icon, isActive)}
        <span style={{ position: 'relative' }}>
          {t.label}
          {newTabKeys.has(t.key) && (
            <span
              className="nav-new-badge"
              aria-label={`${t.label} is new in this release`}
              style={{ marginLeft: 7 }}
            >
              New
            </span>
          )}
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
  }

  // Opens a modal rather than a tab, so it is never "selected" — same shape as a
  // tab row, no role="tab".
  const actionRow = (label: string, Icon: IconComponent, onClick: () => void) => (
    <motion.button
      key={label}
      type="button"
      onClick={onClick}
      {...(reduced ? {} : { whileHover: { scale: 1.015 }, transition: HOVER })}
      style={rowStyle(false)}
    >
      {rowIcon(Icon, false)}
      <span>{label}</span>
    </motion.button>
  )

  const footerRows = footerTabs.flatMap((t) =>
    t.key === 'settings' ? [tabRow(t), actionRow('Accounts', User, onAccounts)] : [tabRow(t)],
  )

  const iconButton = (label: string, onClick: () => void, node: ReactNode) => (
    <button type="button" className="nav-icon-btn" aria-label={label} onClick={onClick}>
      {node}
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
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 2px 10px' }}>
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
            flexShrink: 0,
          }}
        >
          <CandlestickChart size={16} strokeWidth={1.75} />
        </span>
        <span style={{ fontWeight: 'var(--weight-title)', fontSize: 13.5 }}>
          Trade<span className="accent-word">Journal</span>
        </span>
        <span style={{ flex: 1 }} />
        {onToggleTheme && iconButton('Toggle theme', onToggleTheme, <Sun size={14} strokeWidth={1.75} />)}
        {iconButton(
          'Close navigation',
          onClose,
          <span style={{ display: 'inline-flex', transform: 'rotate(180deg)' }}>
            <ChevronRight size={15} strokeWidth={1.75} />
          </span>,
        )}
      </div>

      <div className="nav-scroll" role="tablist" style={{ flex: 1, minHeight: 0 }}>
        {sections.map((s, i) => (
          <div
            key={s.label ?? 'top'}
            style={
              i === 0
                ? { display: 'flex', flexDirection: 'column', gap: 1 }
                : {
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 1,
                    marginTop: 12,
                    paddingTop: 10,
                    borderTop: '1px solid var(--border-soft)',
                  }
            }
          >
            {s.label && <div className="nav-section-label">{s.label}</div>}
            {s.tabs.map(tabRow)}
            {s.label === 'Journal' && actionRow('Daily Review', CalendarDays, onDailyReview)}
          </div>
        ))}
      </div>

      <div
        role="tablist"
        aria-label="More"
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 1,
          marginTop: 10,
          paddingTop: 8,
          borderTop: '1px solid var(--border-soft)',
        }}
      >
        {footerRows}
      </div>

    </motion.nav>
  )
}
