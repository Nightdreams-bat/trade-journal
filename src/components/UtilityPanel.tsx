import { useEffect, useState } from 'react'
import { format } from 'date-fns'
import { motion } from 'motion/react'
import { usePrefersReducedMotion } from '../anim'
import { PANEL, PANEL_OUT } from '../anim/tokens'
import { MiniCalendar } from './MiniCalendar'
import { ChallengeRing } from './ChallengeRing'
import { CalendarDays } from './icons'
import { greeting } from '../format'
import type { Account, AnalyticsSummary } from '../types'

interface UtilityPanelProps {
  open: boolean
  onClose: () => void
  section: 'calendar' | 'profile'
  accounts: Account[]
  refreshKey: number
}

const PROP_RE = /ftmo|prop|funded|the5ers|the 5ers|mff|myff|fundingpips|e8|alpha capital|topstep|apex/i

function money(n: number): string {
  const sign = n < 0 ? '-' : ''
  return `${sign}$${Math.abs(Math.round(n)).toLocaleString('en-US')}`
}

export function UtilityPanel({ open, onClose, section, accounts, refreshKey }: UtilityPanelProps) {
  const reduced = usePrefersReducedMotion()
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null)

  useEffect(() => {
    let cancelled = false
    const month = format(new Date(), 'yyyy-MM')
    window.api.analytics
      .getSummary({ accountId: null, strategyId: null, month })
      .then((s) => {
        if (!cancelled) setSummary(s)
      })
    return () => {
      cancelled = true
    }
  }, [refreshKey])

  const animate = reduced
    ? { opacity: open ? 1 : 0 }
    : {
        x: open ? 0 : 24,
        rotateY: -6,
        opacity: open ? 1 : 0,
        filter: open ? 'blur(0px)' : 'blur(6px)',
      }

  const primary = accounts[0]
  const propAccounts = accounts.filter((a) => PROP_RE.test(`${a.name} ${a.broker}`))
  const maxDd = summary ? Math.abs(summary.drawdown.maxDrawdown) : 0

  return (
    <motion.aside
      className="liquid-glass liquid-glass--hero utility-panel"
      aria-label="Profile and utilities"
      aria-hidden={!open}
      initial={false}
      animate={animate}
      transition={reduced ? { duration: 0 } : open ? PANEL : PANEL_OUT}
      style={{
        transformPerspective: 1800,
        backfaceVisibility: 'hidden',
        pointerEvents: open ? 'auto' : 'none',
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-4)', overflowY: 'auto', height: '100%' }}>
        <section data-section="profile" style={{ outline: section === 'profile' ? '1px solid var(--accent-border)' : 'none', borderRadius: 'var(--radius)', padding: section === 'profile' ? 8 : 0 }}>
          <div style={{ fontSize: 16, fontWeight: 'var(--weight-title)', color: 'var(--text-strong)' }}>
            {greeting()}
          </div>
          {primary ? (
            <>
              <div style={{ fontSize: 12.5, color: 'var(--text-muted)', marginTop: 2 }}>
                {primary.name} · {primary.currency}{' '}
                {money(primary.starting_balance + (summary?.kpis.totalPnl ?? 0))}
              </div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
                <span className="mono-chip">{primary.currency}</span>
                {primary.broker && <span className="mono-chip">{primary.broker}</span>}
              </div>
            </>
          ) : (
            <div style={{ fontSize: 12.5, color: 'var(--text-muted)', marginTop: 4 }}>No account yet</div>
          )}
        </section>

        <section
          data-section="calendar"
          style={{
            outline: section === 'calendar' ? '1px solid var(--accent-border)' : 'none',
            borderRadius: 'var(--radius)',
            padding: section === 'calendar' ? 8 : 0,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-muted)', fontSize: 12, marginBottom: 8 }}>
            <CalendarDays size={13} strokeWidth={1.75} />
            <span>{format(new Date(), 'MMMM')}</span>
          </div>
          {summary ? (
            <MiniCalendar calendar={summary.calendar} />
          ) : (
            <div style={{ height: 120, borderRadius: 8, background: 'rgba(60,50,38,0.06)' }} />
          )}
        </section>

        {propAccounts.length > 0 && summary && (
          <section style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--sp-4)', justifyContent: 'center' }}>
            {propAccounts.map((a) => {
              const limit = a.starting_balance * 0.1
              const pct = Math.max(0, Math.min(100, (maxDd / (limit || 1)) * 100))
              return (
                <ChallengeRing
                  key={a.id}
                  label={a.name}
                  percent={pct}
                  centerLabel={`${Math.round(pct)}%`}
                  caption={`DD ${money(maxDd)} / ${money(limit)}`}
                  tone="danger"
                />
              )
            })}
          </section>
        )}

        <div style={{ flex: 1 }} />
        <button type="button" className="btn" onClick={onClose} style={{ fontSize: 11, padding: '5px 8px' }}>
          Close
        </button>
      </div>
    </motion.aside>
  )
}
