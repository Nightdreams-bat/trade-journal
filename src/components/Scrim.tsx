import { AnimatePresence, motion } from 'motion/react'

interface ScrimProps {
  show: boolean
  onClick: () => void
}

/** Dimming overlay behind panels on narrow viewports / reduced motion. */
export function Scrim({ show, onClick }: ScrimProps) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className="spatial-scrim"
          onClick={onClick}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.24 }}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 2,
            background: 'rgba(60,50,38,0.28)',
          }}
        />
      )}
    </AnimatePresence>
  )
}
