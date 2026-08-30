import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { motion } from 'motion/react'
import { pressable } from './variants'
import { usePrefersReducedMotion } from './usePrefersReducedMotion'

type Props = Pick<
  ButtonHTMLAttributes<HTMLButtonElement>,
  'onClick' | 'className' | 'style' | 'disabled' | 'type' | 'title' | 'aria-label'
> & { children?: ReactNode }

/**
 * Springy press/hover feel for a key CTA button. Most buttons get press + hover
 * from theme.css instead — reach for this only where the extra bounce is wanted.
 */
export function Pressable({ children, ...props }: Props) {
  const reduced = usePrefersReducedMotion()
  if (reduced) return <button {...props}>{children}</button>
  return (
    <motion.button {...pressable} {...props}>
      {children}
    </motion.button>
  )
}
