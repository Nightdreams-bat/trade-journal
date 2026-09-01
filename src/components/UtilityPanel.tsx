import { useEffect, useState } from 'react'
import { format } from 'date-fns'
import { motion } from 'motion/react'
import { usePrefersReducedMotion } from '../anim'
import { PANEL, PANEL_OUT } from '../anim/tokens'
import { MiniCalendar } from './MiniCalendar'
import { ChallengeRing } from './ChallengeRing'
import { Select } from './Select'
import { CalendarDays, Settings, User } from './icons'
import { greeting } from '../format'
import type { Account, AnalyticsSummary, Strategy } from '../types'

interface UtilityPanelProps {
  open: boolean
  onClose: () => void
  section: 'calendar' | 'profile'
  onSectionChange: (section: 'calendar' | 'profile') => void
  onManageAccounts: () => void
  onOpenSettings: () => void
  accounts: Account[]
  strategies: Strategy[]
  refreshKey: number
}

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
  strategies,
  refreshKey,
}: UtilityPanelProps) {
  const reduced = usePrefersReducedMotion()
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null)
  const [viewMonth, setViewMonth] = useState(() => format(new Date(), 'yyyy-MM'))
  const [statsMode, setStatsMode] = useState<'month' | 'all'>('month')
  const [accountId, setAccountId] = useState<number | null>(null)
  const [strategyId, setStrategyId] = useState<number | null>(null)
  const current = new Date(`${viewMonth}-01T00:00:00`)

  useEffect(() => {
    let cancelled = false
    window.api.analytics
      .getSummary({ accountId, strategyId, month: viewMonth })
      .then((s) => {
        if (!cancelled) setSummary(s)
      })
    return () => {
      cancelled = true
    }
  }, [refreshKey, viewMonth, accountId, strategyId])

  const shiftMonth = (delta: number) => {
    const d = new Date(`${viewMonth}-01T00:00:00`)
    d.setMonth(d.getMonth() + delta)
    setViewMonth(format(d, 'yyyy-MM'))
  }

  const animate = reduced
    ? { opacity: open ? 1 : 0 }
    : {
        x: open ? 0 : 24,
        rotateY: -6,
        opacity: open ? 1 : 0,
        filter: open ? 'blur(0px)' : 'blur(6px)',
      }

  const primary = (accountId != null ? accounts.find((a) => a.id === accountId) : null) ?? accounts[0]
  const visibleAccounts = accountId != null ? accounts.filter((a) => a.id === accountId) : accounts
  const propAccounts = visibleAccounts.filter((a) => a.account_type === 'prop' && a.starting_balance > 0)
  const zeroBalanceProp = visibleAccounts.filter((a) => a.account_type === 'prop' && a.starting_balance <= 0)
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
              <section style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <span className="mono-label">All accounts — tap to switch</span>
                {accounts.map((a) => {
                  const isActive = a.id === primary?.id
                  return (
                    <button
                      key={a.id}
                      type="button"
                      onClick={() => setAccountId(a.id)}
                      aria-pressed={isActive}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        fontSize: 12,
                        color: isActive ? 'var(--accent-deep)' : 'var(--text-muted)',
                        padding: '6px 8px',
                        borderRadius: 'var(--radius-control)',
                        border: '1px solid',
                        borderColor: isActive ? 'var(--accent-border)' : 'transparent',
                        background: isActive ? 'var(--accent-bg)' : 'transparent',
                        width: '100%',
                        textAlign: 'left',
                      }}
                    >
                      <span>{a.name}</span>
                      <span>{a.currency}</span>
                    </button>
                  )
                })}
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
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
              <button type="button" className="btn" onClick={() => shiftMonth(-1)} style={{ padding: '3px 8px' }}>
                ‹
              </button>
              <div className="mono-label">{format(current, 'MMMM yyyy')}</div>
              <button type="button" className="btn" onClick={() => shiftMonth(1)} style={{ padding: '3px 8px' }}>
                ›
              </button>
            </div>
            <section>
              {summary ? (
                <MiniCalendar calendar={summary.calendar} year={current.getFullYear()} month={current.getMonth()} />
              ) : (
                <div style={{ height: 120, borderRadius: 8, background: 'rgba(var(--ink-rgb),0.06)' }} />
              )}
            </section>

            <div
              style={{
                display: 'flex',
                gap: 4,
                padding: 4,
                borderRadius: 'var(--radius-control)',
                background: 'rgba(var(--ink-rgb),0.05)',
              }}
            >
              {(['month', 'all'] as const).map((k) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => setStatsMode(k)}
                  aria-pressed={statsMode === k}
                  style={{
                    flex: 1,
                    padding: '5px 8px',
                    borderRadius: 'var(--radius-control)',
                    border: '1px solid',
                    borderColor: statsMode === k ? 'var(--accent-border)' : 'transparent',
                    background: statsMode === k ? 'var(--accent-bg)' : 'transparent',
                    color: statsMode === k ? 'var(--accent-deep)' : 'var(--text-muted)',
                    fontSize: 11.5,
                    fontWeight: 'var(--weight-medium)',
                  }}
                >
                  {k === 'month' ? 'This month' : 'All-time'}
                </button>
              ))}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <Select
                ariaLabel="Filter by account"
                width="100%"
                value={accountId != null ? String(accountId) : ''}
                onChange={(v) => setAccountId(v ? Number(v) : null)}
                options={[
                  { value: '', label: 'All Accounts' },
                  ...accounts.map((a) => ({ value: String(a.id), label: a.name })),
                ]}
              />
              <Select
                ariaLabel="Filter by strategy"
                width="100%"
                value={strategyId != null ? String(strategyId) : ''}
                onChange={(v) => setStrategyId(v ? Number(v) : null)}
                options={[
                  { value: '', label: 'All Strategies' },
                  ...strategies.map((s) => ({ value: String(s.id), label: s.name })),
                ]}
              />
            </div>

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
                  <div className="mono-label">{statsMode === 'month' ? 'Month P&L' : 'All-time P&L'}</div>
                  <div
                    style={{
                      fontSize: 18,
                      fontWeight: 'var(--weight-title)',
                      color: (statsMode === 'month' ? summary.kpis.totalPnl : summary.overall.totalPnl) >= 0 ? 'var(--green)' : 'var(--red)',
                    }}
                  >
                    {money(statsMode === 'month' ? summary.kpis.totalPnl : summary.overall.totalPnl)}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div className="mono-label">Win rate</div>
                  <div style={{ fontSize: 18, fontWeight: 'var(--weight-title)', color: 'var(--text-strong)' }}>
                    {statsMode === 'month' ? summary.kpis.winRate : summary.overall.winRate}%
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

            {zeroBalanceProp.length > 0 && (
              <div style={{ fontSize: 11, color: 'var(--text-muted)', textAlign: 'center', lineHeight: 1.4 }}>
                Set a starting balance for {zeroBalanceProp.map((a) => a.name).join(', ')} to see a real drawdown-limit gauge — with $0 balance the % shown would always be maxed out.
              </div>
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
