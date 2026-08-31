import { useEffect, useState } from 'react'
import { format } from 'date-fns'
import { motion } from 'motion/react'
import { usePrefersReducedMotion } from '../anim'
import { PANEL, PANEL_OUT } from '../anim/tokens'
import { MiniCalendar } from './MiniCalendar'
import { ChallengeRing } from './ChallengeRing'
import { CalendarDays, Settings, User } from './icons'
import { greeting } from '../format'
import type { Account, AnalyticsSummary } from '../types'

interface UtilityPanelProps {
  open: boolean
  onClose: () => void
  section: 'calendar' | 'profile'
  onSectionChange: (section: 'calendar' | 'profile') => void
  onManageAccounts: () => void
  onOpenSettings: () => void
  accounts: Account[]
  refreshKey: number
}

const PROP_RE = /ftmo|prop|funded|the5ers|the 5ers|mff|myff|fundingpips|e8|alpha capital|topstep|apex/i

function money(n: number): string {
  const sign = n < 0 ? '-' : ''
  return `${sign}$${Math.abs(Math.round(n)).toLocaleString('en-US')}`
}

export function UtilityPanel({
  open,
  onClose,
  section,
  onSectionChange,
  onManageAccounts,
  onOpenSettings,
  accounts,
  refreshKey,
}: UtilityPanelProps) {
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

  const tab = (key: 'calendar' | 'profile', label: string, icon: React.ReactNode) => (
    <button
      type="button"
      onClick={() => onSectionChange(key)}
      aria-pressed={section === key}
      style={{
        flex: 1,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        padding: '6px 8px',
        borderRadius: 'var(--radius-control)',
        border: '1px solid',
        borderColor: section === key ? 'var(--accent-border)' : 'transparent',
        background: section === key ? 'var(--accent-bg)' : 'transparent',
        color: section === key ? 'var(--accent-deep)' : 'var(--text-muted)',
        fontSize: 11.5,
        fontWeight: 'var(--weight-medium)',
      }}
    >
      {icon}
      {label}
    </button>
  )

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
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--sp-4)',
          overflowY: 'auto',
          overflowX: 'hidden',
          height: '100%',
        }}
      >
        <div
          style={{
            display: 'flex',
            gap: 4,
            padding: 4,
            borderRadius: 'var(--radius-control)',
            background: 'rgba(var(--ink-rgb),0.05)',
          }}
        >
          {tab('calendar', 'Calendar', <CalendarDays size={13} strokeWidth={1.75} />)}
          {tab('profile', 'Profile', <User size={13} strokeWidth={1.75} />)}
        </div>

        {section === 'profile' ? (
          <>
            <div className="mono-label">Account</div>
            <section>
              <div style={{ fontSize: 16, fontWeight: 'var(--weight-title)', color: 'var(--text-strong)' }}>
                {greeting()}
              </div>
              {primary ? (
                <>
                  <div style={{ fontSize: 12.5, color: 'var(--text-muted)', marginTop: 2 }}>
                    {primary.name} · {primary.currency}
                  </div>
                  <div
                    style={{
                      fontSize: 24,
                      fontWeight: 'var(--weight-title)',
                      color: 'var(--text-strong)',
                      marginTop: 6,
                    }}
                  >
                    {money(primary.starting_balance + (summary?.kpis.totalPnl ?? 0))}
                  </div>
                  <div
                    style={{
                      fontSize: 12,
                      color: (summary?.kpis.totalPnl ?? 0) >= 0 ? 'var(--green)' : 'var(--red)',
                      marginTop: 2,
                    }}
                  >
                    {(summary?.kpis.totalPnl ?? 0) >= 0 ? '+' : ''}
                    {money(summary?.kpis.totalPnl ?? 0)} this month
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 10 }}>
                    <span className="mono-chip">{primary.currency}</span>
                    {primary.broker && <span className="mono-chip">{primary.broker}</span>}
                  </div>
                </>
              ) : (
                <div style={{ fontSize: 12.5, color: 'var(--text-muted)', marginTop: 4 }}>No account yet</div>
              )}
            </section>

            {accounts.length > 1 && (
              <section style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <span className="mono-label">All accounts</span>
                {accounts.map((a) => (
                  <div
                    key={a.id}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      fontSize: 12,
                      color: 'var(--text-muted)',
                      padding: '4px 0',
                      borderBottom: '1px solid var(--border-soft)',
                    }}
                  >
                    <span>{a.name}</span>
                    <span>{a.currency}</span>
                  </div>
                ))}
              </section>
            )}

            <button
              type="button"
              className="btn btn-primary"
              onClick={onManageAccounts}
              style={{ justifyContent: 'center' }}
            >
              <Settings size={14} strokeWidth={1.75} /> Manage accounts
            </button>

            <button
              type="button"
              className="btn"
              onClick={onOpenSettings}
              style={{ justifyContent: 'center' }}
            >
              <Settings size={14} strokeWidth={1.75} /> Settings &amp; Obsidian sync
            </button>
          </>
        ) : (
          <>
            <div className="mono-label">{format(new Date(), 'MMMM yyyy')}</div>
            <section>
              {summary ? (
                <MiniCalendar calendar={summary.calendar} />
              ) : (
                <div style={{ height: 120, borderRadius: 8, background: 'rgba(var(--ink-rgb),0.06)' }} />
              )}
            </section>

            {summary && (
              <section
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  gap: 'var(--sp-3)',
                  padding: 'var(--sp-3) 0',
                  borderTop: '1px solid var(--border-soft)',
                }}
              >
                <div>
                  <div className="mono-label">Month P&amp;L</div>
                  <div
                    style={{
                      fontSize: 18,
                      fontWeight: 'var(--weight-title)',
                      color: summary.kpis.totalPnl >= 0 ? 'var(--green)' : 'var(--red)',
                    }}
                  >
                    {money(summary.kpis.totalPnl)}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div className="mono-label">Win rate</div>
                  <div style={{ fontSize: 18, fontWeight: 'var(--weight-title)', color: 'var(--text-strong)' }}>
                    {summary.kpis.winRate}%
                  </div>
                </div>
              </section>
            )}

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
          </>
        )}

        <div style={{ flex: 1 }} />
        <button type="button" className="btn" onClick={onClose} style={{ fontSize: 11, padding: '5px 8px' }}>
          Close
        </button>
      </div>
    </motion.aside>
  )
}
