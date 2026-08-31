import { type ReactNode } from 'react'
import { motion } from 'motion/react'
import { usePrefersReducedMotion } from '../anim'
import { HERO_SHIFT } from '../anim/tokens'

export interface HeroShift {
  x: number
  scale: number
}

interface CenterPanelProps {
  shift: HeroShift
  children: ReactNode
}

/**
 * The focal hero slab. Owns its own transform (x / scale) per §0 so its
 * `backdrop-filter` keeps sampling the room even while a side panel is open.
 * No rotateY — the hero text must stay crisp. No blur/brightness pulse on open:
 * the `backdrop-filter` already re-samples the room as the slab slides, and any
 * extra `filter` on a surface this large reads as a luminosity flash.
 */
export function CenterPanel({ shift, children }: CenterPanelProps) {
  const reduced = usePrefersReducedMotion()

  return (
    <motion.div
      className="liquid-glass liquid-glass--hero center-panel"
      style={{ borderRadius: 'var(--radius-window)' }}
      initial={false}
      animate={reduced ? { x: 0, scale: 1 } : { x: shift.x, scale: shift.scale }}
      transition={reduced ? { duration: 0 } : HERO_SHIFT}
    >
      {children}
    </motion.div>
  )
}
