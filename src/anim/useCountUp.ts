import { useEffect, useRef, useState } from 'react'
import { usePrefersReducedMotion } from './usePrefersReducedMotion'

// cubic-bezier(0.2, 0.8, 0.2, 1) approximated as an easing function.
function easeOut(t: number): number {
  return 1 - Math.pow(1 - t, 3)
}

/**
 * Tweens from 0 to `target` once, on mount. Returns `target` immediately when
 * reduced-motion is on or `enabled` is false. StrictMode-safe (runs once).
 */
export function useCountUp(
  target: number,
  { duration = 600, enabled = true }: { duration?: number; enabled?: boolean } = {},
): number {
  const reduced = usePrefersReducedMotion()
  const skip = reduced || !enabled || !Number.isFinite(target)
  const [value, setValue] = useState(skip ? target : 0)
  const ran = useRef(false)

  useEffect(() => {
    if (skip) {
      setValue(target)
      return
    }
    if (ran.current) return
    ran.current = true

    let raf = 0
    const start = performance.now()
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / duration)
      setValue(target * easeOut(p))
      if (p < 1) raf = requestAnimationFrame(tick)
      else setValue(target)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [skip, target, duration])

  return value
}
