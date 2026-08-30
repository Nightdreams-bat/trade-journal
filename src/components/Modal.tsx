import { useCallback, useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { modalOverlay, modalPanel, usePrefersReducedMotion } from '../anim'

export function Modal({
  title,
  onClose,
  children,
  wide,
}: {
  title: string
  onClose: () => void
  children: ReactNode
  wide?: boolean
}) {
  // Own the close lifecycle so the exit animation plays even though every call
  // site unmounts us synchronously via `{cond && <Modal/>}`.
  const [open, setOpen] = useState(true)
  const reduced = usePrefersReducedMotion()
  const panelRef = useRef<HTMLDivElement>(null)

  const close = useCallback(() => setOpen(false), [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [close])

  useEffect(() => {
    panelRef.current?.focus()
  }, [])

  const transition = reduced ? { duration: 0 } : undefined

  return (
    <AnimatePresence onExitComplete={onClose}>
      {open && (
        <motion.div
          className="modal-overlay"
          onMouseDown={(e) => e.target === e.currentTarget && close()}
          variants={modalOverlay}
          initial="hidden"
          animate="show"
          exit="exit"
          transition={transition}
        >
          <motion.div
            ref={panelRef}
            className={`modal-panel${wide ? ' wide' : ''}`}
            tabIndex={-1}
            variants={modalPanel}
            initial="hidden"
            animate="show"
            exit="exit"
            transition={transition}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h2 style={{ fontSize: 16, margin: 0 }}>{title}</h2>
              <button className="btn" onClick={close} aria-label="Close">✕</button>
            </div>
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
