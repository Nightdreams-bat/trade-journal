import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { motion } from 'motion/react'
import { modalOverlay, modalPanel, usePrefersReducedMotion } from '../anim'
import { TriangleAlert } from './icons'

const EXIT_MS = 160

/** Styled stand-in for `window.confirm` — matches the app's glass modal look instead of the native OS dialog. */
export function ConfirmDialog({
  title = 'Are you sure?',
  message,
  confirmLabel = 'Delete',
  cancelLabel = 'Cancel',
  onConfirm,
  onCancel,
}: {
  title?: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  onConfirm: () => void
  onCancel: () => void
}) {
  const [closing, setClosing] = useState(false)
  const reduced = usePrefersReducedMotion()
  const panelRef = useRef<HTMLDivElement>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  const finish = useCallback(
    (action: () => void) => {
      if (reduced) {
        action()
        return
      }
      setClosing(true)
      timer.current = setTimeout(action, EXIT_MS)
    },
    [reduced],
  )

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') finish(onCancel)
      if (e.key === 'Enter') finish(onConfirm)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [finish, onCancel, onConfirm])

  useEffect(() => {
    panelRef.current?.focus()
    return () => clearTimeout(timer.current)
  }, [])

  const state = closing ? 'exit' : 'show'
  const transition = reduced ? { duration: 0 } : undefined

  return createPortal(
    <motion.div
      className="modal-overlay confirm-overlay"
      onMouseDown={(e) => e.target === e.currentTarget && finish(onCancel)}
      variants={modalOverlay}
      initial="hidden"
      animate={state}
      transition={transition}
    >
      <motion.div
        ref={panelRef}
        className="modal-panel confirm-panel"
        tabIndex={-1}
        variants={modalPanel}
        initial="hidden"
        animate={state}
        transition={transition}
      >
        <div className="confirm-icon">
          <TriangleAlert size={20} />
        </div>
        <h2 className="confirm-title">{title}</h2>
        <p className="confirm-message">{message}</p>
        <div className="confirm-actions">
          <button className="btn" onClick={() => finish(onCancel)}>{cancelLabel}</button>
          <button className="btn btn-danger-solid" onClick={() => finish(onConfirm)}>{confirmLabel}</button>
        </div>
      </motion.div>
    </motion.div>,
    document.body,
  )
}
