import type { CSSProperties, ReactNode } from 'react'
import { motion } from 'motion/react'
import { fadeUp } from './variants'
import { DUR, EASE_SIG, STAGGER, STAGGER_MAX } from './tokens'
import { usePrefersReducedMotion } from './usePrefersReducedMotion'

/**
 * A single fade-up item. Inside a <Stagger> it inherits the stagger timing; pass
 * `index` to self-delay when there is no <Stagger> parent (e.g. a plain grid).
 */
export function Reveal({
  children,
  className,
  style,
  index,
}: {
  children: ReactNode
  className?: string
  style?: CSSProperties
  index?: number
}) {
  const reduced = usePrefersReducedMotion()
  if (reduced) {
    return (
      <div className={className} style={style}>
        {children}
      </div>
    )
  }

  const animate =
    index === undefined
      ? 'show'
      : {
          opacity: 1,
          y: 0,
          transition: {
            duration: DUR.medium,
            ease: EASE_SIG,
            delay: Math.min(index, STAGGER_MAX) * STAGGER,
          },
        }

  return (
    <motion.div
      className={className}
      style={style}
      variants={fadeUp}
      initial="hidden"
      animate={animate}
    >
      {children}
    </motion.div>
  )
}
