import type { Variants } from 'motion/react'
import { DUR, EASE_OUT, EASE_SIG, STAGGER } from './tokens'

export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0, transition: { duration: DUR.medium, ease: EASE_SIG } },
}

export const staggerContainer: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: STAGGER } },
}

export const modalOverlay: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { duration: DUR.base, ease: EASE_OUT } },
  exit: { opacity: 0, transition: { duration: DUR.fast, ease: EASE_OUT } },
}

export const modalPanel: Variants = {
  hidden: { opacity: 0, scale: 0.96, y: 4 },
  show: { opacity: 1, scale: 1, y: 0, transition: { duration: 0.18, ease: EASE_SIG } },
  exit: { opacity: 0, scale: 0.97, y: 2, transition: { duration: 0.14, ease: EASE_OUT } },
}

// Prop bag for a springy press feel — spread onto a motion element.
export const pressable = {
  whileHover: { y: -1 },
  whileTap: { scale: 0.97 },
  transition: { duration: DUR.fast, ease: EASE_OUT },
} as const
