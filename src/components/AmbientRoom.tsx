import { usePrefersReducedMotion } from '../anim'

// "Aurora glass" interior — slow-moving colored pools, an iridescent wash
// rotating far behind, and a fine grain. Pool/room colors come from
// theme.css (--pool-1..4, .ambient-room, .ambient-aurora) so light mode
// stays a bright cream room and dark mode reads as a black room with a
// green glow. The frosted slabs float on top of it either way.
export function AmbientRoom() {
  const reduced = usePrefersReducedMotion()
  const anim = reduced ? 'none' : undefined

  return (
    <div className="ambient-root" aria-hidden="true">
      <div className="ambient-room" />
      <div className="ambient-aurora" style={{ animation: anim }} />
      <div
        className="ambient-pool"
        style={{
          width: '64vw',
          height: '64vw',
          left: '-20vw',
          top: '-12vh',
          background: 'radial-gradient(circle at 50% 50%, var(--pool-1), transparent 70%)',
          animation: anim,
        }}
      />
      <div
        className="ambient-pool p2"
        style={{
          width: '58vw',
          height: '58vw',
          right: '-16vw',
          top: '-10vh',
          background: 'radial-gradient(circle at 50% 50%, var(--pool-2), transparent 70%)',
          animation: anim,
        }}
      />
      <div
        className="ambient-pool p3"
        style={{
          width: '70vw',
          height: '70vw',
          right: '-24vw',
          bottom: '-30vw',
          background: 'radial-gradient(circle at 50% 50%, var(--pool-3), transparent 70%)',
          animation: anim,
        }}
      />
      <div
        className="ambient-pool p4"
        style={{
          width: '46vw',
          height: '46vw',
          left: '18vw',
          bottom: '-18vw',
          background: 'radial-gradient(circle at 50% 50%, var(--pool-4), transparent 70%)',
          animation: anim,
        }}
      />
    </div>
  )
}
