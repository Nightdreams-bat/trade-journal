import { useState, type ReactNode } from 'react'
import type { DemoId } from '../../changelog'

// ============================================================
// Inline demos for the "What's New" tab.
//
// Built from CSS / SVG only — no images, GIFs or video. Each demo
// mounts only when its entry is expanded, so animation cost is paid on
// demand. Animations are CSS classes (see .wn-* in theme.css) so the
// prefers-reduced-motion media query neutralises all of them at once.
// ============================================================

function DemoShell({ children, onReplay }: { children: ReactNode; onReplay?: () => void }) {
  return (
    <div className="wn-demo">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <span className="mono-label" style={{ fontSize: 9.5 }}>// live preview</span>
        {onReplay && (
          <button className="btn" style={{ padding: '2px 8px', fontSize: 11 }} onClick={onReplay}>
            Replay
          </button>
        )}
      </div>
      {children}
    </div>
  )
}

// ---------- equity-curve: one-shot self-drawing SVG line ----------

const CURVE = 'M4 64 L26 58 L48 61 L70 44 L92 49 L114 33 L136 37 L158 20 L180 12'
const CURVE_LEN = 240

function EquityCurveDemo() {
  const [runKey, setRunKey] = useState(0)
  return (
    <DemoShell onReplay={() => setRunKey((k) => k + 1)}>
      <svg key={runKey} viewBox="0 0 184 72" width="100%" height="88" role="img" aria-label="Equity curve rising">
        <line x1="4" y1="64" x2="180" y2="64" stroke="var(--border)" strokeWidth="1" />
        <path
          className="wn-draw"
          d={CURVE}
          fill="none"
          stroke="var(--accent)"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ ['--wn-len' as string]: CURVE_LEN }}
        />
        <circle cx="180" cy="12" r="2.5" fill="var(--accent)" />
      </svg>
    </DemoShell>
  )
}

// ---------- calendar-heatmap: staggered fade-in P&L grid ----------

// Fixed illustrative pattern: >0 green, <0 red, 0 flat.
const HEAT: number[] = [
  1, 1, -1, 2, 1, 0, 0, -1, 1, 1, -2, 1, 0, 0, 1, 2, 1, 1, -1, 0, 0, 1, -1, 2, 1, 3,
]

function CalendarHeatmapDemo() {
  const [runKey, setRunKey] = useState(0)
  const cell = (v: number) => {
    if (v > 1) return 'var(--green)'
    if (v > 0) return 'var(--green-soft)'
    if (v < 0) return 'var(--red-soft)'
    return 'var(--border-soft)'
  }
  return (
    <DemoShell onReplay={() => setRunKey((k) => k + 1)}>
      <div key={runKey} style={{ display: 'grid', gridTemplateColumns: 'repeat(13, 1fr)', gap: 4, maxWidth: 280 }}>
        {HEAT.map((v, i) => (
          <div
            key={i}
            className="wn-cell"
            title={v === 0 ? 'no trades' : v > 0 ? 'green day' : 'red day'}
            style={{
              aspectRatio: '1',
              borderRadius: 2,
              background: cell(v),
              animationDelay: `${i * 0.02}s`,
            }}
          />
        ))}
      </div>
    </DemoShell>
  )
}

// ---------- tag-pills: pills popping in (reuses .tag-pill) ----------

const POS = ['patient entry', 'followed plan', 'good R:R']
const NEG = ['moved stop', 'revenge trade']

function TagPillsDemo() {
  const [runKey, setRunKey] = useState(0)
  const all = [
    ...POS.map((t) => ({ t, cls: 'positive', sign: '+' })),
    ...NEG.map((t) => ({ t, cls: 'negative', sign: '−' })),
  ]
  return (
    <DemoShell onReplay={() => setRunKey((k) => k + 1)}>
      <div key={runKey} style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {all.map((p, i) => (
          <span
            key={p.t}
            className={`tag-pill ${p.cls} wn-pop`}
            style={{ animationDelay: `${i * 0.06}s` }}
          >
            {p.sign} {p.t}
          </span>
        ))}
      </div>
    </DemoShell>
  )
}

// ---------- kpi-countup ----------

function KpiCountUpDemo() {
  return (
    <DemoShell>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        {[
          { label: 'Net P&L', value: '$1,240', color: 'var(--green)' },
          { label: 'Win Rate', value: '58.3%', color: 'var(--text)' },
          { label: 'Profit Factor', value: '1.84', color: 'var(--green)' },
        ].map((k) => (
          <div className="card" key={k.label} style={{ padding: '12px 14px', flex: 1, minWidth: 110 }}>
            <div style={{ color: 'var(--text-muted)', fontSize: 11, marginBottom: 5 }}>{k.label}</div>
            <div style={{ fontSize: 19, fontWeight: 600, color: k.color }}>{k.value}</div>
          </div>
        ))}
      </div>
    </DemoShell>
  )
}

// ---------- whats-new-tab: a stylised mini timeline ----------

function WhatsNewTabDemo() {
  return (
    <DemoShell>
      <div style={{ display: 'flex', gap: 12 }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 3 }}>
          <span
            style={{
              width: 11,
              height: 11,
              borderRadius: '50%',
              background: 'var(--accent)',
              boxShadow: '0 0 0 3px rgba(62, 207, 142, 0.14)',
            }}
          />
          <span style={{ flex: 1, width: 1, background: 'var(--border)', marginTop: 2 }} />
        </div>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <span className="mono-chip">v0.2.0</span>
            <span className="wn-chip new">new</span>
          </div>
          <div style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>
            Each release lands here with a “Show me” demo like this one.
          </div>
        </div>
      </div>
    </DemoShell>
  )
}

const REGISTRY: Record<DemoId, () => ReactNode> = {
  'whats-new-tab': WhatsNewTabDemo,
  'equity-curve': EquityCurveDemo,
  'calendar-heatmap': CalendarHeatmapDemo,
  'tag-pills': TagPillsDemo,
  'kpi-countup': KpiCountUpDemo,
}

export function Demo({ id }: { id: DemoId }) {
  const Cmp = REGISTRY[id]
  return Cmp ? <Cmp /> : null
}
