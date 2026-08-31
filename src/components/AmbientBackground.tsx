import { usePrefersReducedMotion } from '../anim'

type Anchor = { x: number; y: number }

interface AmbientBackgroundProps {
  anchor?: Anchor
}

// Signal-green glow on near-black — the light the glass panels pick up.
const GLOW_COLORS = ['#5dd62c', '#337418', '#5dd62c', '#2a5f13']

function hexToRgba(hex: string, a: number): string {
  const n = parseInt(hex.slice(1), 16)
  const r = (n >> 16) & 255
  const g = (n >> 8) & 255
  const b = n & 255
  return `rgba(${r}, ${g}, ${b}, ${a})`
}

function blobBg(hex: string, alpha = 0.5): string {
  return `radial-gradient(circle at 50% 50%, ${hexToRgba(hex, alpha)}, transparent 70%)`
}

export function AmbientBackground({ anchor = { x: 240, y: 120 } }: AmbientBackgroundProps) {
  const reduced = usePrefersReducedMotion()
  const anim = reduced ? 'none' : undefined

  return (
    <div className="ambient-root" aria-hidden="true">
      {/* faint terminal grid — refraction surface for the glass */}
      <div className="ambient-photo" />

      {/* green glow pools, screen-blended over the black */}
      <div
        className="ambient-blob"
        style={{
          width: '70vw',
          height: '70vw',
          left: '50%',
          bottom: '-34vw',
          transform: 'translateX(-50%)',
          background: blobBg(GLOW_COLORS[0], 0.55),
          animation: anim,
        }}
      />
      <div
        className="ambient-blob b2"
        style={{
          width: '58vw',
          height: '58vw',
          left: '-20vw',
          top: '8vh',
          background: blobBg(GLOW_COLORS[1], 0.5),
          animation: anim,
        }}
      />
      <div
        className="ambient-blob b3"
        style={{
          width: '52vw',
          height: '52vw',
          right: '-18vw',
          top: '-14vw',
          background: blobBg(GLOW_COLORS[3], 0.42),
          animation: anim,
        }}
      />
      <div
        className="ambient-blob b4"
        style={{
          width: '26vw',
          height: '26vw',
          left: anchor.x,
          top: anchor.y,
          background: blobBg(GLOW_COLORS[2], 0.34),
          animation: anim,
        }}
      />

      {/* vignette + wash for legibility */}
      <div className="ambient-scrim" />
    </div>
  )
}
