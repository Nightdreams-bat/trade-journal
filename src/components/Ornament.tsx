import { motion } from 'motion/react'
import { usePrefersReducedMotion } from '../anim'
import { LiquidGlass } from './LiquidGlass'
import { House, Search, Plus, User } from './icons'

interface OrnamentProps {
  active: string
  onHome: () => void
  onSearch: () => void
  onAdd: () => void
  onProfile: () => void
}

/**
 * The floating bottom "ornament" — a small glass toolbar that hovers below the
 * content, visionOS-style. Global actions only: Home, Search, add a trade,
 * profile / accounts.
 */
export function Ornament({ active, onHome, onSearch, onAdd, onProfile }: OrnamentProps) {
  const reduced = usePrefersReducedMotion()

  const item = (
    label: string,
    Icon: typeof House,
    onClick: () => void,
    opts: { primary?: boolean; activeKey?: string } = {},
  ) => {
    const isActive = opts.activeKey != null && active === opts.activeKey
    const Btn = reduced ? 'button' : motion.button
    return (
      <Btn
        aria-label={label}
        onClick={onClick}
        {...(reduced ? {} : { whileHover: { scale: 1.08 }, whileTap: { scale: 0.94 } })}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 40,
          height: 40,
          borderRadius: 'var(--radius-pill)',
          border: 'none',
          background: opts.primary
            ? 'var(--accent)'
            : isActive
              ? 'var(--accent-bg)'
              : 'transparent',
          color: opts.primary
            ? 'var(--ink)'
            : isActive
              ? 'var(--accent)'
              : 'var(--text-muted)',
        }}
      >
        <Icon size={19} strokeWidth={2} absoluteStrokeWidth />
      </Btn>
    )
  }

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 'var(--sp-5)',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 40,
      }}
    >
      <LiquidGlass
        className="liquid-glass--hero"
        radius="var(--radius-pill)"
        role="toolbar"
        aria-label="Quick actions"
        style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-2)', padding: '10px 14px' }}
      >
        {item('Home', House, onHome, { activeKey: 'home' })}
        {item('Search trades', Search, onSearch)}
        {item('Add trade', Plus, onAdd, { primary: true })}
        {item('Profile & accounts', User, onProfile)}
      </LiquidGlass>
    </div>
  )
}
