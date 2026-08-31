import { motion } from 'motion/react'
import { usePrefersReducedMotion } from '../anim'
import { ChevronRight } from './icons'

interface EdgeHandleProps {
  side: 'left' | 'right'
  hidden: boolean
  onOpen: () => void
  label?: string
}

/**
 * A faint edge affordance that reveals a hidden side panel. Sits flush against
 * the viewport edge, fades out while its panel is open.
 */
export function EdgeHandle({ side, hidden, onOpen, label = 'Open panel' }: EdgeHandleProps) {
  const reduced = usePrefersReducedMotion()
  const isLeft = side === 'left'

  return (
    <motion.button
      type="button"
      aria-label={label}
      onClick={onOpen}
      initial={false}
      animate={{ opacity: hidden ? 0 : 1, x: hidden ? (isLeft ? -12 : 12) : 0 }}
      transition={reduced ? { duration: 0 } : { duration: 0.3 }}
      style={{
        position: 'fixed',
        top: 'calc(50% - 44px)',
        [isLeft ? 'left' : 'right']: 0,
        zIndex: 3,
        pointerEvents: hidden ? 'none' : 'auto',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 22,
        height: 88,
        border: '1px solid var(--glass-border)',
        borderLeft: isLeft ? 'none' : undefined,
        borderRight: isLeft ? undefined : 'none',
        borderRadius: isLeft ? '0 12px 12px 0' : '12px 0 0 12px',
        background: 'rgba(255,253,250,0.55)',
        color: 'var(--text-dim)',
        boxShadow: 'var(--shadow-lift)',
        cursor: 'pointer',
      }}
    >
      <ChevronRight size={14} strokeWidth={2} style={{ transform: isLeft ? 'none' : 'rotate(180deg)' }} />
    </motion.button>
  )
}
