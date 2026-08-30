import { useEffect, useState } from 'react'
import { RELEASES, LATEST_VERSION, type ChangeItem, type Release } from '../changelog'
import { Demo } from '../components/whatsnew/demos'
import { setLastSeenVersion } from '../whatsNewSeen'

const KIND_LABEL: Record<ChangeItem['kind'], string> = {
  new: 'new',
  improved: 'improved',
  fixed: 'fixed',
}

function formatDate(iso: string) {
  const d = new Date(iso + 'T00:00:00')
  return Number.isNaN(d.getTime())
    ? iso
    : d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
}

function ChangeRow({ change }: { change: ChangeItem }) {
  const [showDemo, setShowDemo] = useState(false)
  return (
    <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
      <span className={`wn-chip ${change.kind}`} style={{ marginTop: 2 }}>
        {KIND_LABEL[change.kind]}
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13 }}>{change.text}</div>
        {change.detail && (
          <div style={{ color: 'var(--text-muted)', fontSize: 12, lineHeight: 1.5, marginTop: 3 }}>
            {change.detail}
          </div>
        )}
        {change.demo && (
          <>
            <button
              className="btn"
              style={{ padding: '3px 9px', fontSize: 11, marginTop: 8 }}
              onClick={() => setShowDemo((v) => !v)}
              aria-expanded={showDemo}
            >
              {showDemo ? 'Hide demo' : 'Show me'}
            </button>
            <div className={`wn-collapsible${showDemo ? ' open' : ''}`}>
              <div className="wn-collapsible-inner">{showDemo && <Demo id={change.demo} />}</div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function ReleaseCard({ release, defaultOpen }: { release: Release; defaultOpen: boolean }) {
  const [open, setOpen] = useState(defaultOpen)
  const isLatest = release.version === LATEST_VERSION
  return (
    <div style={{ position: 'relative', marginBottom: 18 }}>
      <span className={`wn-node${isLatest ? ' latest' : ''}`} />
      <div className="card" style={{ padding: 16 }}>
        <button
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          style={{
            all: 'unset',
            cursor: 'pointer',
            display: 'flex',
            width: '100%',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            gap: 12,
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
              <span className="mono-chip">v{release.version}</span>
              <span className="mono-label" style={{ fontSize: 10 }}>
                {formatDate(release.date)}
              </span>
              {isLatest && <span className="wn-chip new">latest</span>}
            </div>
            <h3 style={{ margin: 0, fontSize: 18 }}>{release.title}</h3>
            <div style={{ color: 'var(--text-muted)', fontSize: 12.5, lineHeight: 1.5, marginTop: 4 }}>
              {release.summary}
            </div>
          </div>
          <span
            aria-hidden
            style={{
              color: 'var(--text-dim)',
              fontFamily: 'ui-monospace, monospace',
              fontSize: 12,
              transform: open ? 'rotate(90deg)' : 'none',
              transition: 'transform 0.18s ease',
              marginTop: 4,
            }}
          >
            ▸
          </span>
        </button>

        <div className={`wn-collapsible${open ? ' open' : ''}`}>
          <div className="wn-collapsible-inner">
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 12,
                marginTop: 14,
                paddingTop: 14,
                borderTop: '1px solid var(--border-soft)',
              }}
            >
              {release.changes.map((c, i) => (
                <ChangeRow key={i} change={c} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export function WhatsNewPage() {
  useEffect(() => {
    setLastSeenVersion(LATEST_VERSION)
  }, [])

  return (
    <div style={{ maxWidth: 760 }}>
      <div className="card" style={{ padding: 16, marginBottom: 18 }}>
        <span className="mono-label">// changelog</span>
        <h2 style={{ margin: '6px 0 4px', fontSize: 22 }}>
          What&apos;s <span className="accent-word">New</span>
        </h2>
        <div style={{ color: 'var(--text-muted)', fontSize: 12.5, lineHeight: 1.5 }}>
          Everything that shipped, newest first. Open a release for the details, and hit “Show me” on an
          entry to see a small live preview of how it works.
        </div>
      </div>

      <div className="wn-timeline">
        {RELEASES.map((r, i) => (
          <div key={r.version} className="wn-item" style={{ animationDelay: `${Math.min(i, 8) * 0.05}s` }}>
            <ReleaseCard release={r} defaultOpen={i === 0} />
          </div>
        ))}
      </div>
    </div>
  )
}
