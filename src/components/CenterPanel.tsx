import type { ReactNode } from 'react'
import { motion } from 'motion/react'
import { usePrefersReducedMotion } from '../anim'
import { HERO_SHIFT, BLUR_PX } from '../anim/tokens'

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
 * No rotateY — the hero text must stay crisp.
 */
export function CenterPanel({ shift, children }: CenterPanelProps) {
  const reduced = usePrefersReducedMotion()

  return (
    <motion.div
      className="liquid-glass liquid-glass--hero center-panel"
      style={{ borderRadius: 'var(--radius-window)' }}
      initial={false}
      animate={
        reduced
          ? { x: 0, scale: 1 }
          : {
              x: shift.x,
              scale: shift.scale,
              filter: ['blur(0px)', `blur(${BLUR_PX}px)`, 'blur(0px)'],
            }
      }
      transition={
        reduced
          ? { duration: 0 }
          : { ...HERO_SHIFT, filter: { duration: HERO_SHIFT.duration, times: [0, 0.5, 1] } }
      }
    >
      {children}
    </motion.div>
  )
}
