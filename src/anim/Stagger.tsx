import type { CSSProperties, ReactNode } from 'react'
import { motion } from 'motion/react'
import { staggerContainer } from './variants'
import { usePrefersReducedMotion } from './usePrefersReducedMotion'

/** Container that reveals its <Reveal> children in a fade-up stagger on mount. */
export function Stagger({
  children,
  className,
  style,
}: {
  children: ReactNode
  className?: string
  style?: CSSProperties
}) {
  const reduced = usePrefersReducedMotion()
  if (reduced) {
    return (
      <div className={className} style={style}>
        {children}
      </div>
    )
  }
  return (
    <motion.div
      className={className}
      style={style}
      variants={staggerContainer}
      initial="hidden"
      animate="show"
    >
      {children}
    </motion.div>
  )
}
