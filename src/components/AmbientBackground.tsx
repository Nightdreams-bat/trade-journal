import { useEffect, useRef } from 'react'
import { usePrefersReducedMotion } from '../anim'

// Layer A blur strategy: draw blobs directly to the main context wrapped in
// ctx.filter='blur(40px)'. On a modern desktop GPU-accelerated 2D canvas this
// costs well under 1.5ms/frame for 4 small radial-gradient fills at 30fps, so
// the simpler direct approach is used rather than a quarter-res offscreen pass.

type Anchor = { x: number; y: number }

interface AmbientBackgroundProps {
  anchor?: Anchor
}

const BG = '#0d1828'
const AURORA_COLORS = ['#5bc2d8', '#3fe4e4', '#2a6f8a', '#3a4a8a']

interface Blob {
  cx: number
  cy: number
  baseR: number
  ax: number
  ay: number
  fx: number
  fy: number
  phase: number
  breathe: number
  color: string
}

interface Star {
  x: number
  y: number
  vx: number
  vy: number
  r: number
  tw: number
  twSpeed: number
  cyan: boolean
}

export function AmbientBackground({ anchor = { x: 240, y: 120 } }: AmbientBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const reduced = usePrefersReducedMotion()

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let raf = 0
    let running = false
    let last = 0
    const start = performance.now()

    let width = 0
    let height = 0
    let dpr = 1

    let blobs: Blob[] = []
    let stars: Star[] = []

    const rand = (a: number, b: number) => a + Math.random() * (b - a)

    function buildScene() {
      // Aurora blobs (Layer A): 4 soft drifting blobs.
      blobs = AURORA_COLORS.map((color, i) => ({
        cx: rand(0, width),
        cy: rand(0, height),
        baseR: rand(Math.min(width, height) * 0.28, Math.min(width, height) * 0.5),
        ax: rand(width * 0.1, width * 0.22),
        ay: rand(height * 0.1, height * 0.22),
        fx: rand(0.015, 0.04),
        fy: rand(0.015, 0.04),
        phase: (i / AURORA_COLORS.length) * Math.PI * 2,
        breathe: rand(0.03, 0.06),
        color,
      }))

      // Starfield (Layer B): scale to viewport area, hard cap 70.
      const target = Math.min(70, Math.max(40, Math.round((width * height) / 26000)))
      stars = Array.from({ length: target }, () => ({
        x: rand(0, width),
        y: rand(0, height),
        vx: rand(-6, 6),
        vy: rand(-6, 6),
        r: rand(1, 2),
        tw: rand(0, Math.PI * 2),
        twSpeed: rand(0.6, 1.8),
        cyan: Math.random() < 0.18,
      }))
    }

    function resize() {
      width = canvas!.clientWidth
      height = canvas!.clientHeight
      dpr = Math.min(window.devicePixelRatio || 1, 2)
      canvas!.width = Math.max(1, Math.round(width * dpr))
      canvas!.height = Math.max(1, Math.round(height * dpr))
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0)
      buildScene()
    }

    function hexToRgb(hex: string) {
      const n = parseInt(hex.slice(1), 16)
      return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
    }

    function drawAurora(t: number) {
      ctx!.save()
      ctx!.filter = 'blur(40px)'
      ctx!.globalCompositeOperation = 'lighter'
      for (const b of blobs) {
        const x = b.cx + b.ax * Math.sin(t * b.fx + b.phase)
        const y = b.cy + b.ay * Math.sin(t * b.fy * 1.3 + b.phase * 0.7)
        const r = b.baseR * (1 + b.breathe * Math.sin(t * 0.04 + b.phase))
        const [rr, gg, bb] = hexToRgb(b.color)
        const g = ctx!.createRadialGradient(x, y, 0, x, y, r)
        g.addColorStop(0, `rgba(${rr},${gg},${bb},0.16)`)
        g.addColorStop(1, `rgba(${rr},${gg},${bb},0)`)
        ctx!.fillStyle = g
        ctx!.beginPath()
        ctx!.arc(x, y, r, 0, Math.PI * 2)
        ctx!.fill()
      }
      ctx!.restore()
    }

    function drawStars(t: number, dt: number) {
      for (const s of stars) {
        s.x += s.vx * dt
        s.y += s.vy * dt
        if (s.x < -2) s.x = width + 2
        else if (s.x > width + 2) s.x = -2
        if (s.y < -2) s.y = height + 2
        else if (s.y > height + 2) s.y = -2
        const a = 0.25 + 0.45 * (0.5 + 0.5 * Math.sin(t * s.twSpeed + s.tw))
        ctx!.fillStyle = s.cyan
          ? `rgba(120,220,235,${a})`
          : `rgba(230,235,240,${a})`
        ctx!.beginPath()
        ctx!.arc(s.x, s.y, s.r, 0, Math.PI * 2)
        ctx!.fill()
      }
    }

    function drawRing(t: number) {
      const { x, y } = anchor
      const R0 = 46
      const R = R0 + 10 * Math.sin(t * 0.6)
      const pulseAlpha = 0.09 - 0.03 * Math.sin(t * 0.6)
      ctx!.strokeStyle = `rgba(63,228,228,${Math.max(0.04, pulseAlpha)})`
      ctx!.lineWidth = 1.25
      ctx!.beginPath()
      ctx!.arc(x, y, R, 0, Math.PI * 2)
      ctx!.stroke()

      // 2nd ring: expands + fades on a ~4s loop.
      const cycle = (t % 4) / 4
      const R2 = R0 + cycle * 90
      const a2 = 0.12 * (1 - cycle)
      ctx!.strokeStyle = `rgba(91,194,216,${a2})`
      ctx!.lineWidth = 1
      ctx!.beginPath()
      ctx!.arc(x, y, R2, 0, Math.PI * 2)
      ctx!.stroke()
    }

    function render(t: number, dt: number) {
      ctx!.globalCompositeOperation = 'source-over'
      ctx!.fillStyle = BG
      ctx!.fillRect(0, 0, width, height)
      drawAurora(t)
      ctx!.globalCompositeOperation = 'source-over'
      drawStars(t, dt)
      drawRing(t)
    }

    function loop() {
      const now = performance.now()
      if (now - last < 33) {
        raf = requestAnimationFrame(loop)
        return
      }
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now
      render((now - start) / 1000, dt)
      raf = requestAnimationFrame(loop)
    }

    function startLoop() {
      if (running || reduced) return
      running = true
      last = performance.now() - 34
      raf = requestAnimationFrame(loop)
    }

    function stopLoop() {
      running = false
      if (raf) cancelAnimationFrame(raf)
      raf = 0
    }

    let resizeTimer: ReturnType<typeof setTimeout> | undefined
    function onResize() {
      if (resizeTimer) clearTimeout(resizeTimer)
      resizeTimer = setTimeout(() => {
        resize()
        if (reduced) render((performance.now() - start) / 1000, 0)
      }, 150)
    }

    function onVisibility() {
      if (document.hidden) stopLoop()
      else startLoop()
    }

    resize()

    if (reduced) {
      // Reduced motion: paint one static frame, never start the loop.
      render(0, 0)
      window.addEventListener('resize', onResize)
      return () => {
        window.removeEventListener('resize', onResize)
        if (resizeTimer) clearTimeout(resizeTimer)
      }
    }

    window.addEventListener('resize', onResize)
    document.addEventListener('visibilitychange', onVisibility)
    window.addEventListener('blur', stopLoop)
    window.addEventListener('focus', startLoop)
    startLoop()

    return () => {
      stopLoop()
      window.removeEventListener('resize', onResize)
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('blur', stopLoop)
      window.removeEventListener('focus', startLoop)
      if (resizeTimer) clearTimeout(resizeTimer)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reduced, anchor.x, anchor.y])

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      style={{
        position: 'fixed',
        inset: 0,
        width: '100%',
        height: '100%',
        display: 'block',
        pointerEvents: 'none',
        zIndex: 0,
      }}
    />
  )
}
