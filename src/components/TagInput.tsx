import { useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { DUR, EASE_OUT, usePrefersReducedMotion } from '../anim'

export function TagInput({
  tags,
  onChange,
  variant,
  placeholder,
}: {
  tags: string[]
  onChange: (tags: string[]) => void
  variant: 'positive' | 'negative'
  placeholder?: string
}) {
  const [draft, setDraft] = useState('')
  const reduced = usePrefersReducedMotion()

  const addTag = () => {
    const t = draft.trim()
    if (t && !tags.includes(t)) onChange([...tags, t])
    setDraft('')
  }

  return (
    <div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 6 }}>
        <AnimatePresence initial={false}>
          {tags.map((t) => (
            <motion.span
              key={t}
              className={`tag-pill ${variant}`}
              layout={!reduced}
              initial={reduced ? false : { opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.8 }}
              transition={{ duration: DUR.fast, ease: EASE_OUT }}
            >
              {t}
              <span
                style={{ cursor: 'pointer', opacity: 0.7 }}
                onClick={() => onChange(tags.filter((x) => x !== t))}
              >
                ✕
              </span>
            </motion.span>
          ))}
        </AnimatePresence>
      </div>
      <input
        className="input"
        placeholder={placeholder ?? 'Type a tag and press Enter'}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault()
            addTag()
          }
        }}
      />
    </div>
  )
}
