// JS mirrors of the CSS motion tokens in theme.css — keep in sync.
// Durations in seconds (motion's unit).

export const DUR = {
  fast: 0.12,
  base: 0.2,
  medium: 0.3,
} as const

export const EASE_OUT = [0.2, 0.8, 0.2, 1] as const
export const EASE_SIG = [0.16, 1, 0.3, 1] as const

// Per-child stagger, and a cap so long lists don't ripple for seconds.
export const STAGGER = 0.04
export const STAGGER_MAX = 12

// Recharts can't take a cubic-bezier — 'ease-out' is the closest of its presets.
export const RECHARTS = { duration: 600, easing: 'ease-out' } as const

// --- spatial shell motion (warm-glass redesign) ---
export const PANEL = { duration: 0.42, ease: EASE_SIG } as const // nav / utility open
export const PANEL_OUT = { duration: 0.3, ease: EASE_OUT } as const // close
export const HERO_SHIFT = { duration: 0.5, ease: EASE_SIG } as const // hero translate + scale
export const HOVER = { duration: 0.18, ease: EASE_OUT } as const
