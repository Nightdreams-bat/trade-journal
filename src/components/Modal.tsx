import { useCallback, useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { motion } from 'motion/react'
import { modalOverlay, modalPanel, usePrefersReducedMotion } from '../anim'

const EXIT_MS = 160

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
  // Animate out before the parent unmounts us (every call site does
  // `{cond && <Modal/>}`, an immediate unmount). We drive the exit locally,
  // then call the real onClose once the animation has had time to play.
  const [closing, setClosing] = useState(false)
  const reduced = usePrefersReducedMotion()
  const panelRef = useRef<HTMLDivElement>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  const close = useCallback(() => {
    if (reduced) {
      onClose()
      return
    }
    setClosing(true)
    timer.current = setTimeout(onClose, EXIT_MS)
  }, [reduced, onClose])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [close])

  useEffect(() => {
    panelRef.current?.focus()
    return () => clearTimeout(timer.current)
  }, [])

  const state = closing ? 'exit' : 'show'
  const transition = reduced ? { duration: 0 } : undefined

  // Portalled to <body> so the fixed-position overlay always covers the real
  // viewport. A page-local `.center-panel` ancestor carries an animated
  // `transform` for its side-panel slide effect, and a `transform` on any
  // ancestor becomes the containing block for `position: fixed` descendants
  // — without the portal, a modal opened from inside a page gets boxed into
  // `.center-panel`'s bounds instead of overlaying the whole window.
  return createPortal(
    <motion.div
      className="modal-overlay"
      onMouseDown={(e) => e.target === e.currentTarget && close()}
      variants={modalOverlay}
      initial="hidden"
      animate={state}
      transition={transition}
    >
      <motion.div
        ref={panelRef}
        className={`modal-panel${wide ? ' wide' : ''}`}
        tabIndex={-1}
        variants={modalPanel}
        initial="hidden"
        animate={state}
        transition={transition}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h2 style={{ fontSize: 16, margin: 0 }}>{title}</h2>
          <button className="btn" onClick={close} aria-label="Close">✕</button>
        </div>
        {children}
      </motion.div>
    </motion.div>,
    document.body,
  )
}
