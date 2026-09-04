/**
 * One-time announcement that a release added a new tab.
 *
 * Driven entirely by `since`/`blurb` on the entries in src/tabs.ts, so shipping a
 * new tab only means tagging it there. It shows once per release, hides as soon as
 * the user reads that release in What's New, and never appears on a fresh install
 * (nothing is "new" when everything is).
 */
import { Sparkles, ArrowRight, X } from './icons'
import { tabsNewSince, type TabDef } from '../tabs'

interface NewFeatureToastProps {
  /** Last release read in What's New; null on a fresh install. */
  seenVersion: string | null
  /** Release the announcement was last dismissed for. */
  dismissedVersion: string | null
  onOpen: (tabKey: string) => void
  onDismiss: (version: string) => void
}

export function NewFeatureToast({ seenVersion, dismissedVersion, onOpen, onDismiss }: NewFeatureToastProps) {
  const newTabs = tabsNewSince(seenVersion)
  const feature: TabDef | undefined = newTabs[0]
  if (!feature?.since) return null
  if (dismissedVersion && dismissedVersion === feature.since) return null

  const version = feature.since
  const others = newTabs.length - 1

  return (
    <div className="card feature-toast" role="status" aria-live="polite">
      <span
        aria-hidden
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          flex: '0 0 auto',
          width: 30,
          height: 30,
          borderRadius: 'var(--radius-pill)',
          background: 'var(--accent-bg)',
          color: 'var(--accent)',
        }}
      >
        <Sparkles size={15} strokeWidth={1.75} />
      </span>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3, flexWrap: 'wrap' }}>
          <span className="wn-chip new">new</span>
          <strong style={{ fontSize: 13 }}>{feature.label}</strong>
          <span className="mono-label" style={{ fontSize: 10 }}>
            v{version}
          </span>
        </div>

        {feature.blurb && (
          <div style={{ color: 'var(--text-muted)', fontSize: 12, lineHeight: 1.5 }}>{feature.blurb}</div>
        )}

        <div style={{ display: 'flex', gap: 8, marginTop: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <button
            type="button"
            className="btn"
            style={{ padding: '4px 10px', fontSize: 11.5, display: 'inline-flex', alignItems: 'center', gap: 6 }}
            onClick={() => {
              onDismiss(version)
              onOpen(feature.key)
            }}
          >
            Take a look <ArrowRight size={13} strokeWidth={1.75} />
          </button>
          <button
            type="button"
            className="btn"
            style={{ padding: '4px 10px', fontSize: 11.5 }}
            onClick={() => {
              onDismiss(version)
              onOpen('whatsnew')
            }}
          >
            What&apos;s new{others > 0 ? ` (+${others} more)` : ''}
          </button>
        </div>
      </div>

      <button
        type="button"
        aria-label="Dismiss"
        onClick={() => onDismiss(version)}
        style={{
          all: 'unset',
          cursor: 'pointer',
          color: 'var(--text-dim)',
          flex: '0 0 auto',
          lineHeight: 0,
          padding: 2,
        }}
      >
        <X size={14} strokeWidth={1.75} />
      </button>
    </div>
  )
}
