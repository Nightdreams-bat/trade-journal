import { useEffect, useRef } from 'react'
import { usePrefersReducedMotion } from '../anim'

/**
 * Smooth trailing cursor: a solid dot that tracks tightly and a ring that
 * lags behind and grows over interactive elements.
 *
 * Adapted from a user-supplied Next.js/Tailwind `SmoothFollower`:
 *  - no `"use client"`, no Tailwind — a `.cursor-follower` class with theme tokens
 *  - the rAF loop writes `transform` straight to the elements via refs; React
 *    state is never touched per frame (the original re-rendered 60x/s)
 *  - hover detection uses one delegated `mouseover`/`mouseout` on `document`
 *    so it also covers elements mounted later (modals, dynamic rows)
 *  - only mounts on a real fine pointer with motion allowed
 */
const DOT_SMOOTHNESS = 0.2
const RING_SMOOTHNESS = 0.1
const INTERACTIVE = 'a, button, input, textarea, select, [role="button"], .card--interactive'

export function CursorFollower() {
  const reducedMotion = usePrefersReducedMotion()
  const dotRef = useRef<HTMLDivElement>(null)
  const ringRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const finePointer =
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(pointer: fine)').matches
    if (!finePointer || reducedMotion) return

    const dot = dotRef.current
    const ring = ringRef.current
    if (!dot || !ring) return

    const mouse = { x: window.innerWidth / 2, y: window.innerHeight / 2 }
    const dotPos = { ...mouse }
    const ringPos = { ...mouse }
    let frame = 0

    const onMove = (e: MouseEvent) => {
      mouse.x = e.clientX
      mouse.y = e.clientY
    }
    const onOver = (e: MouseEvent) => {
      if ((e.target as Element | null)?.closest?.(INTERACTIVE)) {
        ring.classList.add('is-hovering')
      }
    }
    const onOut = (e: MouseEvent) => {
      if ((e.target as Element | null)?.closest?.(INTERACTIVE)) {
        ring.classList.remove('is-hovering')
      }
    }

    const lerp = (a: number, b: number, t: number) => a + (b - a) * t
    const tick = () => {
      dotPos.x = lerp(dotPos.x, mouse.x, DOT_SMOOTHNESS)
      dotPos.y = lerp(dotPos.y, mouse.y, DOT_SMOOTHNESS)
      ringPos.x = lerp(ringPos.x, mouse.x, RING_SMOOTHNESS)
      ringPos.y = lerp(ringPos.y, mouse.y, RING_SMOOTHNESS)
      dot.style.transform = `translate3d(${dotPos.x}px, ${dotPos.y}px, 0)`
      ring.style.transform = `translate3d(${ringPos.x}px, ${ringPos.y}px, 0)`
      frame = requestAnimationFrame(tick)
    }

    window.addEventListener('mousemove', onMove, { passive: true })
    document.addEventListener('mouseover', onOver)
    document.addEventListener('mouseout', onOut)
    document.body.classList.add('has-cursor-follower')
    frame = requestAnimationFrame(tick)

    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseover', onOver)
      document.removeEventListener('mouseout', onOut)
      document.body.classList.remove('has-cursor-follower')
    }
  }, [reducedMotion])

  if (reducedMotion) return null

  return (
    <div className="cursor-follower" aria-hidden="true">
      <div ref={ringRef} className="cursor-follower__ring" />
      <div ref={dotRef} className="cursor-follower__dot" />
    </div>
  )
}
