import { useEffect, useState, type ReactNode } from 'react'
import { Stagger, Reveal } from '../anim'
import {
  Check,
  Download,
  ExternalLink,
  FolderOpen,
  RefreshCw,
  Settings as SettingsIcon,
  Sun,
  Moon,
  TriangleAlert,
  Users,
  Eye,
  EyeOff,
} from '../components/icons'
import type { ObsidianConfig } from '../global'
import type { ThemeMode } from '../themeMode'
import type { CalendarConfig, SyncStatus } from '../types'

const cardStyle = { padding: 'var(--sp-4)', display: 'flex', flexDirection: 'column', gap: 12 } as const
const rowStyle = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '10px 12px',
  border: '1px solid var(--border-soft)',
  borderRadius: 'var(--radius-control)',
  cursor: 'pointer',
} as const

function SectionHeader({ title, blurb, icon }: { title: string; blurb: string; icon?: ReactNode }) {
  return (
    <div>
      <div style={{ fontWeight: 600, fontSize: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
        {icon}
        {title}
      </div>
      <p style={{ color: 'var(--text-muted)', fontSize: 12, margin: '4px 0 0', lineHeight: 1.5 }}>{blurb}</p>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Profile — display name + theme
// ---------------------------------------------------------------------------

function ProfileSection({
  userName,
  onUserNameChange,
  themeMode,
  onToggleTheme,
}: {
  userName: string
  onUserNameChange: (name: string) => void
  themeMode: ThemeMode
  onToggleTheme: () => void
}) {
  const [nameDraft, setNameDraft] = useState(userName)

  return (
    <Reveal className="card" style={cardStyle}>
      <SectionHeader title="Profile" blurb="Local to this machine — no account, email, or password." />

      <div>
        <div style={{ fontSize: 13, marginBottom: 6 }}>Your name</div>
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            className="input"
            value={nameDraft}
            onChange={(e) => setNameDraft(e.target.value)}
            placeholder="e.g. Matei"
            style={{ flex: 1 }}
          />
          <button
            className="btn btn-primary"
            disabled={nameDraft.trim() === userName}
            onClick={() => onUserNameChange(nameDraft)}
          >
            Save
          </button>
        </div>
      </div>

      <label style={rowStyle}>
        <span style={{ fontSize: 13 }}>Theme</span>
        <button
          type="button"
          className="btn"
          onClick={(e) => {
            e.preventDefault()
            onToggleTheme()
          }}
          style={{ fontSize: 12 }}
        >
          {themeMode === 'dark' ? (
            <>
              <Moon size={14} strokeWidth={1.75} /> Dark
            </>
          ) : (
            <>
              <Sun size={14} strokeWidth={1.75} /> Light
            </>
          )}
        </button>
      </label>
    </Reveal>
  )
}

// ---------------------------------------------------------------------------
// Accounts — hands off to the existing Accounts modal
// ---------------------------------------------------------------------------

function AccountsSection({ onManageAccounts }: { onManageAccounts: () => void }) {
  return (
    <Reveal className="card" style={cardStyle}>
      <SectionHeader
        title="Accounts"
        blurb="Add, edit, or remove the trading accounts your trades and stats are grouped under."
      />
      <button className="btn btn-primary" style={{ alignSelf: 'flex-start' }} onClick={onManageAccounts}>
        Manage accounts
      </button>
    </Reveal>
  )
}

// ---------------------------------------------------------------------------
// Economic calendar
// ---------------------------------------------------------------------------

function CalendarSection() {
  const cal = window.api?.calendar
  const [config, setConfig] = useState<CalendarConfig | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [note, setNote] = useState<string | null>(null)

  useEffect(() => {
    if (!cal) return
    cal.getConfig().then(setConfig)
  }, [cal])

  if (!cal) return null

  const enabled = !!config?.enabled

  const toggle = async () => {
    setBusy('toggle')
    setNote(null)
    try {
      const next = await cal.setEnabled(!enabled)
      setConfig(next)
      if (next.enabled && next.eventCount === 0) {
        const result = await cal.sync()
        setNote(result.ok ? `Downloaded ${result.inserted} events.` : (result.error ?? 'Sync failed.'))
        setConfig(await cal.getConfig())
      }
    } finally {
      setBusy(null)
    }
  }

  const syncNow = async () => {
    setBusy('sync')
    setNote(null)
    try {
      const result = await cal.sync()
      setNote(result.ok ? `${result.inserted} new, ${result.updated} updated.` : (result.error ?? 'Sync failed.'))
      setConfig(await cal.getConfig())
    } finally {
      setBusy(null)
    }
  }

  const toggleLaunch = async () => {
    setBusy('launch')
    try {
      setConfig(await cal.setSyncOnLaunch(!config?.syncOnLaunch))
    } finally {
      setBusy(null)
    }
  }

  return (
    <Reveal className="card" style={cardStyle}>
      <SectionHeader
        title="Economic calendar"
        blurb={`Adds a News tab showing ForexFactory's weekly calendar and its red folders. This is one of the only two parts of Trade Journal that contact the internet, and it stays off until you turn it on. Events are cached locally, so the tab keeps working offline — only refreshing needs a connection.`}
      />

      <label style={rowStyle}>
        <span style={{ fontSize: 13 }}>{enabled ? 'Calendar enabled' : 'Calendar disabled'}</span>
        <input type="checkbox" checked={enabled} disabled={busy !== null} onChange={toggle} />
      </label>

      {enabled && (
        <>
          <label style={rowStyle}>
            <span style={{ fontSize: 13 }}>Refresh automatically when the app starts</span>
            <input type="checkbox" checked={!!config?.syncOnLaunch} disabled={busy !== null} onChange={toggleLaunch} />
          </label>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span className="mono-label">Source</span>
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
              {config?.sourceUrl}
            </code>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <button className="btn btn-primary" disabled={busy !== null} onClick={syncNow}>
              <RefreshCw size={14} /> {busy === 'sync' ? 'Syncing…' : 'Sync calendar now'}
            </button>
            <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>
              {config?.lastSync ? `Last synced ${new Date(config.lastSync).toLocaleString()}` : 'Never synced'}
              {config ? ` · ${config.eventCount} events cached` : ''}
            </span>
          </div>

          {(note || config?.lastError) && (
            <div style={{ fontSize: 12, color: config?.lastError && !note ? 'var(--red)' : 'var(--text-muted)', display: 'flex', gap: 6, alignItems: 'center' }}>
              {config?.lastError && !note ? <TriangleAlert size={14} /> : <Check size={14} />}
              {note ?? config?.lastError}
            </div>
          )}
        </>
      )}
    </Reveal>
  )
}

// ---------------------------------------------------------------------------
// Obsidian vault sync
// ---------------------------------------------------------------------------

function ObsidianSection() {
  const obs = window.api?.obsidian
  const [config, setConfig] = useState<ObsidianConfig | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    if (!obs) return
    obs.getConfig().then(setConfig)
  }, [obs])

  if (!obs) {
    return (
      <Reveal className="card" style={cardStyle}>
        <SectionHeader title="Obsidian vault sync" blurb="Only available in the desktop app." />
      </Reveal>
    )
  }

  const run = async (label: string, fn: () => Promise<unknown>, done?: (r: unknown) => string) => {
    setBusy(label)
    setMessage(null)
    try {
      const result = await fn()
      setConfig(await obs.getConfig())
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
    <Reveal className="card" style={cardStyle}>
      <SectionHeader
        title="Obsidian vault sync"
        blurb="One-way mirror. Trades, missed trades, daily reviews and your strategies / accounts / confluences are written into an Obsidian vault as linked markdown after every save. Editing notes inside Obsidian does not change the journal — the next sync overwrites them."
      />

      <label style={rowStyle}>
        <span style={{ fontSize: 13 }}>{enabled ? 'Sync enabled' : 'Sync disabled'}</span>
        <input type="checkbox" checked={enabled} disabled={busy !== null} onChange={toggle} />
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
            <button className="btn" style={{ fontSize: 11 }} disabled={busy !== null} onClick={() => run('choose', () => obs.chooseVault())}>
              <FolderOpen size={13} /> Change folder…
            </button>
            {config.vaultPath && (
              <button className="btn" style={{ fontSize: 11 }} disabled={busy !== null} onClick={() => run('default', () => obs.useDefaultVault())}>
                Use default
              </button>
            )}
            <button className="btn" style={{ fontSize: 11 }} disabled={busy !== null} onClick={() => obs.openInObsidian()}>
              <ExternalLink size={13} /> Open in Obsidian
            </button>
            <button className="btn" style={{ fontSize: 11 }} disabled={busy !== null} onClick={() => obs.showFolder()}>
              Show folder
            </button>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <button className="btn btn-primary" disabled={busy !== null || !enabled} onClick={rebuild}>
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
    </Reveal>
  )
}

// ---------------------------------------------------------------------------
// Shared journal (Supabase) — see electron/sync.ts
// ---------------------------------------------------------------------------

function SharingSection() {
  const auth = window.api?.auth
  const sync = window.api?.sync
  const [status, setStatus] = useState<SyncStatus | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [note, setNote] = useState<string | null>(null)
  const [mode, setMode] = useState<'signIn' | 'signUp'>('signIn')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [displayName, setDisplayName] = useState('')

  useEffect(() => {
    auth?.getStatus().then(setStatus)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- runs once, auth is a stable global
  }, [])

  if (!auth || !sync) return null

  const runAuth = async (fn: () => Promise<SyncStatus>) => {
    setBusy('auth')
    setNote(null)
    try {
      setStatus(await fn())
      setPassword('')
    } catch (err) {
      setNote(err instanceof Error ? err.message : String(err))
    } finally {
      setBusy(null)
    }
  }

  const toggle = async () => {
    setBusy('toggle')
    try {
      setStatus(await sync.setEnabled(!status?.enabled))
    } finally {
      setBusy(null)
    }
  }

  const syncNow = async () => {
    setBusy('sync')
    setNote(null)
    try {
      const result = await sync.pushAll()
      setNote(`Pushed ${result.count} records.`)
      setStatus(await auth.getStatus())
    } catch (err) {
      setNote(err instanceof Error ? err.message : String(err))
    } finally {
      setBusy(null)
    }
  }

  return (
    <Reveal className="card" style={cardStyle}>
      <SectionHeader
        icon={<Users size={15} strokeWidth={1.75} />}
        title="Shared journal"
        blurb="See a friend's trades alongside yours in the Shared tab. Each of you keeps your own local journal — this only mirrors it to Supabase for reading. Off by default, per device."
      />

      {!status?.configured && (
        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
          Not configured — add SUPABASE_URL and SUPABASE_ANON_KEY to <code>.env</code> and restart the app.
        </div>
      )}

      {status?.configured && !status.signedIn && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ display: 'flex', gap: 6 }}>
            <button
              className="btn"
              style={{ flex: 1, background: mode === 'signIn' ? 'var(--accent-bg)' : undefined }}
              onClick={() => setMode('signIn')}
            >
              Sign in
            </button>
            <button
              className="btn"
              style={{ flex: 1, background: mode === 'signUp' ? 'var(--accent-bg)' : undefined }}
              onClick={() => setMode('signUp')}
            >
              Create account
            </button>
          </div>
          {mode === 'signUp' && (
            <input
              className="input"
              placeholder="Your name (shown to your friend)"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
            />
          )}
          <input className="input" type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <div style={{ position: 'relative' }}>
            <input
              className="input"
              type={showPassword ? 'text' : 'password'}
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{ width: '100%', paddingRight: 34 }}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              style={{
                position: 'absolute',
                right: 8,
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'none',
                border: 'none',
                padding: 2,
                display: 'flex',
                color: 'var(--text-muted)',
                cursor: 'pointer',
              }}
            >
              {showPassword ? <EyeOff size={15} strokeWidth={1.75} /> : <Eye size={15} strokeWidth={1.75} />}
            </button>
          </div>
          <button
            className="btn btn-primary"
            disabled={busy !== null || !email || !password}
            onClick={() =>
              runAuth(() =>
                mode === 'signUp' ? auth.signUp({ email, password, displayName }) : auth.signIn({ email, password })
              )
            }
          >
            {busy === 'auth' ? 'Working…' : mode === 'signUp' ? 'Create account' : 'Sign in'}
          </button>
        </div>
      )}

      {status?.configured && status.signedIn && (
        <>
          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            Signed in as <strong>{status.displayName ?? status.email}</strong>
          </div>

          <label style={rowStyle}>
            <span style={{ fontSize: 13 }}>{status.enabled ? 'Sharing enabled on this device' : 'Sharing disabled'}</span>
            <input type="checkbox" checked={status.enabled} disabled={busy !== null} onChange={toggle} />
          </label>

          {status.enabled && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <button className="btn" disabled={busy !== null} onClick={syncNow}>
                <RefreshCw size={14} /> {busy === 'sync' ? 'Syncing…' : 'Sync everything now'}
              </button>
              <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>
                {status.lastSync ? `Last synced ${new Date(status.lastSync).toLocaleString()}` : 'Never synced'}
              </span>
            </div>
          )}

          <button className="btn" style={{ fontSize: 11, alignSelf: 'flex-start' }} disabled={busy !== null} onClick={() => runAuth(() => auth.signOut())}>
            Sign out
          </button>
        </>
      )}

      {(note || status?.lastError) && (
        <div style={{ fontSize: 12, color: status?.lastError && !note ? 'var(--red)' : 'var(--text-muted)', display: 'flex', gap: 6, alignItems: 'center' }}>
          {status?.lastError && !note ? <TriangleAlert size={14} /> : <Check size={14} />}
          {note ?? status?.lastError}
        </div>
      )}
    </Reveal>
  )
}

// ---------------------------------------------------------------------------
// Data — export, and a pointer to where import lives
// ---------------------------------------------------------------------------

function DataSection() {
  const [note, setNote] = useState<string | null>(null)

  const exportCsv = async () => {
    const path = await window.api.csv.export()
    setNote(path ? `Exported to ${path}` : null)
  }

  return (
    <Reveal className="card" style={cardStyle}>
      <SectionHeader title="Data" blurb="Everything is stored locally in a single SQLite file on this machine." />
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <button className="btn" onClick={exportCsv}>
          <Download size={14} /> Export trades to CSV
        </button>
        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
          Importing trades from a CSV happens from the Trades tab toolbar.
        </span>
      </div>
      {note && (
        <div style={{ fontSize: 12, color: 'var(--text-muted)', display: 'flex', gap: 6 }}>
          <Check size={14} /> {note}
        </div>
      )}
    </Reveal>
  )
}

// ---------------------------------------------------------------------------

export function SettingsPage({
  userName,
  onUserNameChange,
  themeMode,
  onToggleTheme,
  onManageAccounts,
}: {
  userName: string
  onUserNameChange: (name: string) => void
  themeMode: ThemeMode
  onToggleTheme: () => void
  onManageAccounts: () => void
}) {
  return (
    <Stagger style={{ display: 'flex', flexDirection: 'column', gap: 14, maxWidth: 640 }}>
      <Reveal style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <SettingsIcon size={18} strokeWidth={1.75} />
        <h2 style={{ fontSize: 16, margin: 0 }}>Settings</h2>
      </Reveal>
      <ProfileSection userName={userName} onUserNameChange={onUserNameChange} themeMode={themeMode} onToggleTheme={onToggleTheme} />
      <AccountsSection onManageAccounts={onManageAccounts} />
      <CalendarSection />
      <ObsidianSection />
      <SharingSection />
      <DataSection />
    </Stagger>
  )
}
