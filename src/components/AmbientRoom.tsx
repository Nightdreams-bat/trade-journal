import { usePrefersReducedMotion } from '../anim'

// Warm taupe interior with soft ambient light — the room the glass slabs float in.
export function AmbientRoom() {
  const reduced = usePrefersReducedMotion()
  const anim = reduced ? 'none' : undefined

  return (
    <div className="ambient-root" aria-hidden="true">
      <div className="ambient-room" />
      <div
        className="ambient-pool"
        style={{
          width: '58vw',
          height: '58vw',
          left: '-16vw',
          top: '4vh',
          background: 'radial-gradient(circle at 50% 50%, rgba(244, 233, 214, 0.6), transparent 70%)',
          animation: anim,
        }}
      />
      <div
        className="ambient-pool p2"
        style={{
          width: '64vw',
          height: '64vw',
          right: '-20vw',
          bottom: '-24vw',
          background: 'radial-gradient(circle at 50% 50%, rgba(231, 220, 201, 0.55), transparent 70%)',
          animation: anim,
        }}
      />
      <div
        className="ambient-pool p3"
        style={{
          width: '40vw',
          height: '40vw',
          left: '30vw',
          top: '28vh',
          background: 'radial-gradient(circle at 50% 50%, rgba(221, 227, 230, 0.45), transparent 70%)',
          animation: anim,
        }}
      />
    </div>
  )
}
