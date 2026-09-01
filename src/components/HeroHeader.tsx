import { motion } from 'motion/react'
import { usePrefersReducedMotion } from '../anim'
import { HOVER } from '../anim/tokens'
import { CalendarDays, User, Sun, Moon } from './icons'
import type { ThemeMode } from '../themeMode'

interface HeroHeaderProps {
  greeting: string
  showWhatsNewDot: boolean
  themeMode: ThemeMode
  onToggleTheme: () => void
  onNewTrade: () => void
  onOpenCalendar: () => void
  onOpenProfile: () => void
}

export function HeroHeader({
  greeting,
  showWhatsNewDot,
  themeMode,
  onToggleTheme,
  onNewTrade,
  onOpenCalendar,
  onOpenProfile,
}: HeroHeaderProps) {
  const reduced = usePrefersReducedMotion()
  const hover = reduced ? {} : { whileHover: { scale: 1.015 }, transition: HOVER }

  const iconBtn = (label: string, onClick: () => void, node: React.ReactNode, dot = false) => (
    <motion.button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="btn"
      {...hover}
      style={{
        position: 'relative',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 34,
        height: 34,
        padding: 0,
      }}
    >
      {node}
      {dot && (
        <span
          aria-hidden
          style={{
            position: 'absolute',
            top: 6,
            right: 6,
            width: 6,
            height: 6,
            borderRadius: '50%',
            background: 'var(--accent)',
            boxShadow: '0 0 0 2px var(--card)',
          }}
        />
      )}
    </motion.button>
  )

  return (
    <header className="hero-header">
      <div style={{ minWidth: 0, display: 'flex', alignItems: 'center' }}>
        <div style={{ fontSize: 17, fontWeight: 'var(--weight-title)', color: 'var(--text-strong)' }}>
          {greeting}
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
        {iconBtn(
          themeMode === 'dark' ? 'Switch to light mode' : 'Switch to dark mode',
          onToggleTheme,
          themeMode === 'dark' ? (
            <Sun size={17} strokeWidth={1.75} absoluteStrokeWidth />
          ) : (
            <Moon size={17} strokeWidth={1.75} absoluteStrokeWidth />
          ),
        )}
        {iconBtn('Calendar', onOpenCalendar, <CalendarDays size={17} strokeWidth={1.75} absoluteStrokeWidth />)}
        {iconBtn('Profile & accounts', onOpenProfile, <User size={17} strokeWidth={1.75} absoluteStrokeWidth />, showWhatsNewDot)}
        <motion.button type="button" className="btn btn-primary" onClick={onNewTrade} {...hover}>
          + Trade Entry
        </motion.button>
      </div>
    </header>
  )
}
