import { useEffect, useId, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'motion/react'
import { usePrefersReducedMotion } from '../anim'
import { Check, ChevronDown } from './icons'

export interface SelectOption {
  value: string
  label: string
  hint?: string
}

interface SelectProps {
  value: string
  onChange: (value: string) => void
  options: SelectOption[]
  placeholder?: string
  ariaLabel?: string
  leftIcon?: ReactNode
  width?: number | string
  disabled?: boolean
  className?: string
}

/**
 * Styled dropdown that replaces every native <select> in the app. The menu is
 * rendered through a body portal with fixed positioning so it escapes the
 * `overflow: hidden` on `.hero-main` and the `overflow-y: auto` on `.modal-panel`.
 */
export function Select({
  value,
  onChange,
  options,
  placeholder = 'Select…',
  ariaLabel,
  leftIcon,
  width,
  disabled,
  className,
}: SelectProps) {
  const reduced = usePrefersReducedMotion()
  const listId = useId()
  const btnRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)
  const [rect, setRect] = useState<{ left: number; top: number; width: number; below: boolean } | null>(null)
  const [activeIdx, setActiveIdx] = useState(0)

  const selected = options.find((o) => o.value === value) ?? null

  const place = () => {
    const el = btnRef.current
    if (!el) return
    const r = el.getBoundingClientRect()
    const below = window.innerHeight - r.bottom > 260 || r.top < 260
    setRect({ left: r.left, top: below ? r.bottom + 6 : r.top - 6, width: r.width, below })
  }

  useLayoutEffect(() => {
    if (open) place()
  }, [open])

  useEffect(() => {
    if (!open) return
    const onScroll = () => place()
    const onDown = (e: MouseEvent) => {
      if (btnRef.current?.contains(e.target as Node)) return
      if (menuRef.current?.contains(e.target as Node)) return
      setOpen(false)
    }
    window.addEventListener('scroll', onScroll, true)
    window.addEventListener('resize', onScroll)
    window.addEventListener('mousedown', onDown)
    return () => {
      window.removeEventListener('scroll', onScroll, true)
      window.removeEventListener('resize', onScroll)
      window.removeEventListener('mousedown', onDown)
    }
  }, [open])

  useEffect(() => {
    if (open) setActiveIdx(Math.max(0, options.findIndex((o) => o.value === value)))
  }, [open, value, options])

  const commit = (v: string) => {
    onChange(v)
    setOpen(false)
    btnRef.current?.focus()
  }

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return
    if (!open) {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
        e.preventDefault()
        setOpen(true)
      }
      return
    }
    if (e.key === 'Escape') {
      e.preventDefault()
      e.stopPropagation()
      setOpen(false)
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIdx((i) => Math.min(options.length - 1, i + 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIdx((i) => Math.max(0, i - 1))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      const opt = options[activeIdx]
      if (opt) commit(opt.value)
    } else if (e.key === 'Home') {
      e.preventDefault()
      setActiveIdx(0)
    } else if (e.key === 'End') {
      e.preventDefault()
      setActiveIdx(options.length - 1)
    }
  }

  return (
    <div className={`tj-select${className ? ` ${className}` : ''}`} style={{ width }}>
      <button
        ref={btnRef}
        type="button"
        className="tj-select-trigger"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel}
        disabled={disabled}
        onClick={() => !disabled && setOpen((o) => !o)}
        onKeyDown={onKeyDown}
      >
        {leftIcon && <span className="tj-select-icon">{leftIcon}</span>}
        <span className={`tj-select-value${selected ? '' : ' is-placeholder'}`}>
          {selected ? selected.label : placeholder}
        </span>
        <ChevronDown
          size={15}
          strokeWidth={2}
          className="tj-select-chevron"
          style={{ transform: open ? 'rotate(180deg)' : 'none' }}
        />
      </button>

      {createPortal(
        <AnimatePresence>
          {open && rect && (
            <motion.div
              ref={menuRef}
              id={listId}
              role="listbox"
              className="tj-select-menu"
              initial={reduced ? { opacity: 0 } : { opacity: 0, y: rect.below ? -4 : 4, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={reduced ? { opacity: 0 } : { opacity: 0, y: rect.below ? -4 : 4, scale: 0.98 }}
              transition={{ duration: reduced ? 0 : 0.14, ease: [0.16, 1, 0.3, 1] }}
              style={{
                position: 'fixed',
                left: rect.left,
                width: Math.max(rect.width, 168),
                ...(rect.below ? { top: rect.top } : { bottom: window.innerHeight - rect.top }),
              }}
            >
              {options.map((opt, i) => {
                const isSel = opt.value === value
                return (
                  <button
                    key={opt.value || `__${i}`}
                    type="button"
                    role="option"
                    aria-selected={isSel}
                    className={`tj-select-option${isSel ? ' is-selected' : ''}${i === activeIdx ? ' is-active' : ''}`}
                    onMouseEnter={() => setActiveIdx(i)}
                    onClick={() => commit(opt.value)}
                  >
                    <span className="tj-select-option-label">
                      {opt.label}
                      {opt.hint && <span className="tj-select-option-hint">{opt.hint}</span>}
                    </span>
                    {isSel && <Check size={14} strokeWidth={2.5} />}
                  </button>
                )
              })}
            </motion.div>
          )}
        </AnimatePresence>,
        document.body,
      )}
    </div>
  )
}
