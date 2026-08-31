import { useEffect, useRef, useState, type ReactNode } from 'react'
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
 *
 * The brief blur pulse (`blur(0)->blur(4px)->blur(0)`) must fire ONLY on a real
 * shift, never on mount. We compare against the previous `x` during render: the
 * keyframe array is emitted only on the render where `x` actually changed.
 */
export function CenterPanel({ shift, children }: CenterPanelProps) {
  const reduced = usePrefersReducedMotion()
  const prevX = useRef(shift.x)
  const [isShift, setIsShift] = useState(false)

  useEffect(() => {
    if (shift.x === prevX.current) return
    prevX.current = shift.x
    setIsShift(true)
    const id = window.setTimeout(() => setIsShift(false), HERO_SHIFT.duration * 1000 + 60)
    return () => window.clearTimeout(id)
  }, [shift.x])

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
              filter:
                isShift && !reduced
                  ? ['blur(0px)', `blur(${BLUR_PX}px)`, 'blur(0px)']
                  : 'blur(0px)',
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
