import { useEffect, useRef, useState } from 'react'
import { usePrefersReducedMotion } from './usePrefersReducedMotion'

// cubic-bezier(0.2, 0.8, 0.2, 1) approximated as an easing function.
function easeOut(t: number): number {
  return 1 - Math.pow(1 - t, 3)
}

const CHANGE_MS = 380

/**
 * Tweens toward `target`. On first mount it counts up from 0 over `duration`;
 * every later change to `target` glides from the currently displayed value to
 * the new one over a shorter beat. Returns `target` immediately when
 * reduced-motion is on, `enabled` is false, or `target` is not finite.
 * StrictMode-safe: the tween always resumes from the last emitted value, so it
 * can never get stuck.
 */
export function useCountUp(
  target: number,
  { duration = 600, enabled = true }: { duration?: number; enabled?: boolean } = {},
): number {
  const reduced = usePrefersReducedMotion()
  const skip = reduced || !enabled || !Number.isFinite(target)
  const [value, setValue] = useState(skip ? target : 0)
  // Last value we emitted — the start point for the next tween.
  const fromRef = useRef(skip ? target : 0)
  // Whether the intro count-up has already been kicked off.
  const startedRef = useRef(false)

  useEffect(() => {
    if (skip) {
      fromRef.current = target
      setValue(target)
      return
    }

    const from = fromRef.current
    if (from === target) {
      setValue(target)
      return
    }

    const dur = startedRef.current ? CHANGE_MS : duration
    startedRef.current = true

    let raf = 0
    const t0 = performance.now()
    const tick = (now: number) => {
      const p = Math.min(1, (now - t0) / dur)
      const v = from + (target - from) * easeOut(p)
      fromRef.current = v
      setValue(v)
      if (p < 1) {
        raf = requestAnimationFrame(tick)
      } else {
        fromRef.current = target
        setValue(target)
      }
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [skip, target, duration])

  return value
}
