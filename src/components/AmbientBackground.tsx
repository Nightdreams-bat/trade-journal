import { usePrefersReducedMotion } from '../anim'
import backdrop from '../assets/backdrop.jpg'

type Anchor = { x: number; y: number }

interface AmbientBackgroundProps {
  anchor?: Anchor
}

const AURORA_COLORS = ['#5bc2d8', '#3fe4e4', '#7b6bd8', '#2f7fae']

function hexToRgba(hex: string, a: number): string {
  const n = parseInt(hex.slice(1), 16)
  const r = (n >> 16) & 255
  const g = (n >> 8) & 255
  const b = n & 255
  return `rgba(${r}, ${g}, ${b}, ${a})`
}

function blobBg(hex: string, alpha = 0.36): string {
  return `radial-gradient(circle at 50% 50%, ${hexToRgba(hex, alpha)}, transparent 70%)`
}

export function AmbientBackground({ anchor = { x: 240, y: 120 } }: AmbientBackgroundProps) {
  const reduced = usePrefersReducedMotion()
  const anim = reduced ? 'none' : undefined

  return (
    <div className="ambient-root" aria-hidden="true">
      {/* photographic wallpaper — the surface the liquid-glass panels refract */}
      <div className="ambient-photo" style={{ backgroundImage: `url(${backdrop})` }} />
      {/* scrim: keeps dense tables / muted text legible over the photo */}
      <div className="ambient-scrim" />
      <div
        className="ambient-blob"
        style={{
          width: '64vw',
          height: '64vw',
          left: '-14vw',
          top: '-16vw',
          background: blobBg(AURORA_COLORS[0]),
          animation: anim,
        }}
      />
      <div
        className="ambient-blob b2"
        style={{
          width: '70vw',
          height: '70vw',
          right: '-18vw',
          bottom: '-20vw',
          background: blobBg(AURORA_COLORS[3]),
          animation: anim,
        }}
      />
      <div
        className="ambient-blob b3"
        style={{
          width: '52vw',
          height: '52vw',
          right: '-10vw',
          top: '18vh',
          background: blobBg(AURORA_COLORS[2]),
          animation: anim,
        }}
      />
      <div
        className="ambient-blob b4"
        style={{
          width: '30vw',
          height: '30vw',
          left: anchor.x,
          top: anchor.y,
          background: blobBg(AURORA_COLORS[1], 0.42),
          animation: anim,
        }}
      />
    </div>
  )
}
