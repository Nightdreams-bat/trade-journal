import { usePrefersReducedMotion } from '../anim'

// Warm "aurora glass" interior — a bright cream room with slow-moving pools of
// blush, warm gold and periwinkle, an iridescent wash rotating far behind, and
// a fine grain. The frosted slabs float on top of it.
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
          background: 'radial-gradient(circle at 50% 50%, rgba(255, 249, 238, 0.95), transparent 70%)',
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
          background: 'radial-gradient(circle at 50% 50%, rgba(248, 214, 197, 0.8), transparent 70%)',
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
          background: 'radial-gradient(circle at 50% 50%, rgba(213, 224, 244, 0.75), transparent 70%)',
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
          background: 'radial-gradient(circle at 50% 50%, rgba(243, 227, 196, 0.7), transparent 70%)',
          animation: anim,
        }}
      />
    </div>
  )
}
