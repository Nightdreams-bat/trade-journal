import { useEffect, useState } from 'react'
import { Modal } from './Modal'
import { Check, ExternalLink, FolderOpen, RefreshCw } from './icons'
import type { ObsidianConfig } from '../global'

export function SettingsModal({
  onClose,
  userName,
  onUserNameChange,
}: {
  onClose: () => void
  userName: string
  onUserNameChange: (name: string) => void
}) {
  const obs = window.api?.obsidian
  const [config, setConfig] = useState<ObsidianConfig | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [nameDraft, setNameDraft] = useState(userName)

  useEffect(() => {
    if (!obs) return
    obs.getConfig().then(setConfig)
  }, [obs])

  const nameField = (
    <div>
      <div style={{ fontWeight: 600, fontSize: 14 }}>Your name</div>
      <p style={{ color: 'var(--text-muted)', fontSize: 12, margin: '4px 0 8px', lineHeight: 1.5 }}>
        Local display name only, used for the greeting — no account, email, or password.
      </p>
      <div style={{ display: 'flex', gap: 8 }}>
        <input
          className="input"
          value={nameDraft}
          onChange={(e) => setNameDraft(e.target.value)}
          placeholder="e.g. Matei"
          style={{ flex: 1 }}
        />
        <button className="btn btn-primary" disabled={nameDraft.trim() === userName} onClick={() => onUserNameChange(nameDraft)}>
          Save
        </button>
      </div>
    </div>
  )

  if (!obs) {
    return (
      <Modal title="Settings" onClose={onClose}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {nameField}
          <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>
            Obsidian vault sync is only available in the desktop app.
          </div>
        </div>
      </Modal>
    )
  }

  const run = async (label: string, fn: () => Promise<unknown>, done?: (r: unknown) => string) => {
    setBusy(label)
    setMessage(null)
    try {
      const result = await fn()
      const fresh = await obs.getConfig()
      setConfig(fresh)
      if (done) setMessage(done(result))
    } catch (err) {
      setMessage(err instanceof Error ? err.message : String(err))
    } finally {
      setBusy(null)
    }
  }

  const toggle = () =>
    run(
      'toggle',
      () => obs.setEnabled(!config?.enabled),
      () => (config?.enabled ? 'Sync turned off.' : 'Vault created and synced.')
    )

  const rebuild = () =>
    run('rebuild', () => obs.rebuild(), (r) => {
      const res = r as { ok: boolean; count: number; error?: string }
      return res.ok ? `${res.count} notes written.` : `Rebuild failed: ${res.error ?? 'unknown error'}`
    })

  const enabled = !!config?.enabled

  return (
    <Modal title="Settings" onClose={onClose}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {nameField}

        <div style={{ borderTop: '1px solid var(--border-soft)', paddingTop: 14 }}>
          <div style={{ fontWeight: 600, fontSize: 14 }}>Obsidian vault sync</div>
          <p style={{ color: 'var(--text-muted)', fontSize: 12, margin: '4px 0 0', lineHeight: 1.5 }}>
            One-way mirror. Trades, missed trades, daily reviews and your strategies /
            accounts / confluences are written into an Obsidian vault as linked markdown
            after every save. Editing notes inside Obsidian does <strong>not</strong> change
            the journal &mdash; the next sync overwrites them.
          </p>
        </div>

        <label
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '10px 12px',
            border: '1px solid var(--border-soft)',
            borderRadius: 'var(--radius-control)',
            cursor: 'pointer',
          }}
        >
          <span style={{ fontSize: 13 }}>{enabled ? 'Sync enabled' : 'Sync disabled'}</span>
          <input
            type="checkbox"
            checked={enabled}
            disabled={busy !== null}
            onChange={toggle}
          />
        </label>

        {config && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span className="mono-label">Vault folder</span>
            <code
              style={{
                fontSize: 11.5,
                color: 'var(--text-muted)',
                wordBreak: 'break-all',
                padding: '6px 8px',
                background: 'rgba(60,50,38,0.06)',
                borderRadius: 6,
              }}
            >
              {config.resolvedPath}
            </code>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 4 }}>
              <button
                className="btn"
                style={{ fontSize: 11 }}
                disabled={busy !== null}
                onClick={() => run('choose', () => obs.chooseVault())}
              >
                <FolderOpen size={13} /> Change folder…
              </button>
              {config.vaultPath && (
                <button
                  className="btn"
                  style={{ fontSize: 11 }}
                  disabled={busy !== null}
                  onClick={() => run('default', () => obs.useDefaultVault())}
                >
                  Use default
                </button>
              )}
              <button
                className="btn"
                style={{ fontSize: 11 }}
                disabled={busy !== null}
                onClick={() => obs.openInObsidian()}
              >
                <ExternalLink size={13} /> Open in Obsidian
              </button>
              <button
                className="btn"
                style={{ fontSize: 11 }}
                disabled={busy !== null}
                onClick={() => obs.showFolder()}
              >
                Show folder
              </button>
            </div>
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button
            className="btn btn-primary"
            disabled={busy !== null || !enabled}
            onClick={rebuild}
          >
            <RefreshCw size={14} /> {busy === 'rebuild' ? 'Rebuilding…' : 'Rebuild vault now'}
          </button>
          {config?.lastSync && (
            <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>
              Last sync {new Date(config.lastSync).toLocaleString()}
              {typeof config.noteCount === 'number' ? ` · ${config.noteCount} notes` : ''}
            </span>
          )}
        </div>

        {message && (
          <div style={{ fontSize: 12, color: 'var(--text-muted)', display: 'flex', gap: 6 }}>
            <Check size={14} /> {message}
          </div>
        )}
        {busy === 'toggle' && !enabled && (
          <div style={{ fontSize: 12, color: 'var(--text-dim)' }}>Creating vault…</div>
        )}
      </div>
    </Modal>
  )
}
