import type { ReactNode } from 'react'

interface SpatialStageProps {
  children: ReactNode
  navOpen: boolean
  utilityOpen: boolean
}

/**
 * Fixed, flex-centred stage that the floating glass slabs live in.
 *
 * Per §0: this element must NEVER carry transform / perspective / filter /
 * will-change / contain / container-type — any of those blank the
 * `backdrop-filter` on the hero slabs nested inside it. Each slab owns its own
 * transform on its own root element.
 */
export function SpatialStage({ children, navOpen, utilityOpen }: SpatialStageProps) {
  return (
    <div
      className="spatial-stage"
      data-nav-open={navOpen || undefined}
      data-utility-open={utilityOpen || undefined}
      style={{
        position: 'fixed',
        inset: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1,
      }}
    >
      {children}
    </div>
  )
}
