import { useState } from 'react'
import { Modal } from './Modal'
import { greeting } from '../format'

export function WelcomeModal({ onSave, onSkip }: { onSave: (name: string) => void; onSkip: () => void }) {
  const [name, setName] = useState('')

  const save = () => {
    if (name.trim()) onSave(name.trim())
    else onSkip()
  }

  return (
    <Modal title={`${greeting()}!`} onClose={onSkip}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <p style={{ color: 'var(--text-muted)', fontSize: 13, margin: 0, lineHeight: 1.5 }}>
          What should the journal call you? This is just a local display name — no account, email, or
          password, nothing leaves this machine. You can change or clear it later in Settings.
        </p>
        <label className="field">
          Your name
          <input
            className="input"
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && save()}
            placeholder="e.g. Matei"
          />
        </label>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button className="btn" onClick={onSkip}>
            Maybe later
          </button>
          <button className="btn btn-primary" disabled={!name.trim()} onClick={save}>
            Save
          </button>
        </div>
      </div>
    </Modal>
  )
}
