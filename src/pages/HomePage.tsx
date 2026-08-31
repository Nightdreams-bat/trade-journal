import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { format, parseISO } from 'date-fns'
import { Bento, BentoItem } from '../components/Bento'
import { RingStat } from '../components/RingStat'
import { TradeFormModal } from '../components/TradeFormModal'
import { CountUpValue } from '../anim'
import { COLORS } from '../colors'
import { formatRatio } from '../format'
import {
  ArrowRight,
  CalendarDays,
  Flame,
  Sparkles,
  Target,
  TrendingDown,
  TrendingUp,
  User,
} from '../components/icons'
import type { Account, AnalyticsSummary, Confluence, Strategy, Trade } from '../types'

interface HomePageProps {
  accounts: Account[]
  strategies: Strategy[]
  confluences: Confluence[]
  onConfluencesChanged: () => void
  refreshKey: number
  bumpRefresh: () => void
  onNavigate: (tab: string) => void
  onNewTrade: () => void
}

const PROP_RE = /ftmo|prop|funded|the5ers|the 5ers|mff|myff|fundingpips|e8|alpha capital|topstep|apex/i

function money(n: number): string {
  const sign = n < 0 ? '-' : ''
  return `${sign}$${Math.abs(Math.round(n)).toLocaleString('en-US')}`
}

function WidgetLabel({ icon, children }: { icon?: ReactNode; children: ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-muted)', fontSize: 12 }}>
      {icon}
      <span style={{ letterSpacing: '0.01em' }}>{children}</span>
    </div>
  )
}

function Sparkline({ values, color }: { values: number[]; color: string }) {
  if (values.length < 2) {
    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', color: 'var(--text-dim)', fontSize: 12 }}>
        Not enough trades yet
      </div>
    )
  }
  const w = 100
  const h = 34
  const min = Math.min(...values)
  const max = Math.max(...values)
  const span = max - min || 1
  const pts = values.map((v, i) => {
    const x = (i / (values.length - 1)) * w
    const y = h - ((v - min) / span) * h
    return `${x.toFixed(2)},${y.toFixed(2)}`
  })
  return (
    <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" style={{ width: '100%', height: 56, flex: 1 }}>
      <polygon points={`0,${h} ${pts.join(' ')} ${w},${h}`} fill={color} opacity={0.14} />
      <polyline points={pts.join(' ')} fill="none" stroke={color} strokeWidth={1.5} vectorEffect="non-scaling-stroke" />
    </svg>
  )
}

function MiniCalendar({ calendar }: { calendar: AnalyticsSummary['calendar'] }) {
  const today = new Date()
  const year = today.getFullYear()
  const month = today.getMonth()
  const first = new Date(year, month, 1)
  const startCol = (first.getDay() + 6) % 7 // Monday-first
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const cells: (number | null)[] = [
    ...Array.from({ length: startCol }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ]
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, flex: 1, alignContent: 'start' }}>
      {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => (
        <div key={i} style={{ textAlign: 'center', fontSize: 9, color: 'var(--text-dim)', letterSpacing: '0.08em' }}>
          {d}
        </div>
      ))}
      {cells.map((day, i) => {
        if (day == null) return <div key={i} />
        const key = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
        const entry = calendar[key]
        const bg = !entry
          ? 'rgba(255,255,255,0.04)'
          : entry.pnl >= 0
            ? 'var(--green-soft)'
            : 'var(--red-soft)'
        const fg = !entry ? 'var(--text-dim)' : entry.pnl >= 0 ? 'var(--green)' : 'var(--red)'
        return (
          <div
            key={i}
            title={entry ? `${key} · ${money(entry.pnl)}` : key}
            style={{
              aspectRatio: '1',
              borderRadius: 8,
              background: bg,
              color: fg,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 10,
            }}
          >
            {day}
          </div>
        )
      })}
    </div>
  )
}

export function HomePage({
  accounts,
  strategies,
  confluences,
  onConfluencesChanged,
  refreshKey,
  bumpRefresh,
  onNavigate,
  onNewTrade,
}: HomePageProps) {
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null)
  const [trades, setTrades] = useState<Trade[] | null>(null)
  const [openTrade, setOpenTrade] = useState<Trade | null>(null)

  useEffect(() => {
    let cancelled = false
    const month = format(new Date(), 'yyyy-MM')
    Promise.all([
      window.api.analytics.getSummary({ accountId: null, strategyId: null, month }),
      window.api.trades.getAll(),
    ]).then(([s, t]) => {
      if (cancelled) return
      setSummary(s)
      setTrades(t)
    })
    return () => {
      cancelled = true
    }
  }, [refreshKey])

  const recent = useMemo(
    () => (trades ? [...trades].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 6) : []),
    [trades],
  )

  const propAccount = accounts.find((a) => PROP_RE.test(`${a.name} ${a.broker}`))
  const discipline = summary?.radar.find((r) => /disciplin|plan|adher/i.test(r.metric))?.value ?? null

  const greeting = (() => {
    const h = new Date().getHours()
    if (h < 5) return 'Late session'
    if (h < 12) return 'Good morning'
    if (h < 18) return 'Good afternoon'
    return 'Good evening'
  })()

  const loading = !summary || !trades
  const empty = !loading && trades!.length === 0

  const skel = (h = 16) => (
    <div style={{ height: h, borderRadius: 8, background: 'rgba(255,255,255,0.05)', width: '70%' }} />
  )

  return (
    <>
      <Bento>
        {/* Welcome / profile */}
        <BentoItem col={5} row={1}>
          <WidgetLabel icon={<User size={13} strokeWidth={1.75} />}>Welcome</WidgetLabel>
          {loading ? (
            skel(28)
          ) : (
            <>
              <div style={{ fontSize: 22, fontWeight: 'var(--weight-title)', color: 'var(--text-strong)' }}>
                {greeting}
              </div>
              <div style={{ fontSize: 12.5, color: 'var(--text-muted)', marginTop: 2 }}>
                {accounts[0]
                  ? `${accounts[0].name} · ${accounts[0].currency} ${money(
                      accounts[0].starting_balance + summary!.kpis.totalPnl,
                    )}`
                  : 'No account yet'}
              </div>
              {empty ? (
                <button className="btn btn-primary" style={{ marginTop: 'auto', alignSelf: 'flex-start' }} onClick={onNewTrade}>
                  Log your first trade
                </button>
              ) : (
                <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-muted)' }}>
                  <Flame size={13} strokeWidth={1.75} color="var(--accent)" />
                  {trades!.length} trades logged
                </div>
              )}
            </>
          )}
        </BentoItem>

        {/* Win rate ring */}
        <BentoItem col={3} row={1} style={{ alignItems: 'center', justifyContent: 'center' }}>
          <WidgetLabel>Win rate</WidgetLabel>
          {loading ? skel(60) : <RingStat percent={summary!.kpis.winRate} caption={`${summary!.overall.totalTrades} trades`} />}
        </BentoItem>

        {/* Total P&L */}
        <BentoItem col={4} row={1}>
          <WidgetLabel
            icon={
              loading || summary!.kpis.totalPnl >= 0 ? (
                <TrendingUp size={13} strokeWidth={1.75} color="var(--green)" />
              ) : (
                <TrendingDown size={13} strokeWidth={1.75} color="var(--red)" />
              )
            }
          >
            Total P&amp;L
          </WidgetLabel>
          {loading ? (
            skel(32)
          ) : (
            <>
              <div
                style={{
                  fontSize: 30,
                  fontWeight: 'var(--weight-title)',
                  color: summary!.kpis.totalPnl >= 0 ? 'var(--green)' : 'var(--red)',
                }}
              >
                <CountUpValue value={money(summary!.kpis.totalPnl)} />
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 'auto' }}>
                {summary!.kpis.returnsPct >= 0 ? '+' : ''}
                {summary!.kpis.returnsPct}% return · PF {formatRatio(summary!.kpis.profitFactor)}
              </div>
            </>
          )}
        </BentoItem>

        {/* Equity curve */}
        <BentoItem col={7} row={2}>
          <WidgetLabel icon={<TrendingUp size={13} strokeWidth={1.75} />}>Equity curve</WidgetLabel>
          {loading ? (
            skel(120)
          ) : (
            <>
              <Sparkline values={summary!.equityCurve.map((e) => e.cumulativePnl)} color={COLORS.green} />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-dim)' }}>
                <span>Max drawdown {money(summary!.drawdown.maxDrawdown)}</span>
                <button
                  className="btn"
                  style={{ padding: '4px 10px', fontSize: 11 }}
                  onClick={() => onNavigate('analytics')}
                >
                  Analytics <ArrowRight size={12} strokeWidth={2} />
                </button>
              </div>
            </>
          )}
        </BentoItem>

        {/* Mini calendar */}
        <BentoItem col={5} row={2}>
          <WidgetLabel icon={<CalendarDays size={13} strokeWidth={1.75} />}>{format(new Date(), 'MMMM')}</WidgetLabel>
          {loading ? skel(120) : <MiniCalendar calendar={summary!.calendar} />}
        </BentoItem>

        {/* Prop-firm status */}
        <BentoItem col={4} row={1}>
          <WidgetLabel icon={<Target size={13} strokeWidth={1.75} />}>Prop firm</WidgetLabel>
          {loading ? (
            skel(28)
          ) : propAccount ? (
            <>
              <div style={{ fontSize: 13, color: 'var(--text-strong)', fontWeight: 'var(--weight-medium)' }}>
                {propAccount.name}
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                Drawdown used {money(summary!.drawdown.maxDrawdown)} of{' '}
                {money(propAccount.starting_balance * 0.1)} limit
              </div>
              <div style={{ height: 6, borderRadius: 999, background: 'rgba(255,255,255,0.08)', marginTop: 'auto' }}>
                <div
                  style={{
                    height: '100%',
                    borderRadius: 999,
                    width: `${Math.min(100, (summary!.drawdown.maxDrawdown / (propAccount.starting_balance * 0.1)) * 100)}%`,
                    background: 'var(--red)',
                  }}
                />
              </div>
            </>
          ) : (
            <div style={{ fontSize: 12.5, color: 'var(--text-muted)', marginTop: 4 }}>
              No prop-firm account. Add one from Accounts to track drawdown limits here.
            </div>
          )}
        </BentoItem>

        {/* Discipline */}
        <BentoItem col={3} row={1} style={{ alignItems: 'center', justifyContent: 'center' }}>
          <WidgetLabel>Discipline</WidgetLabel>
          {loading ? (
            skel(60)
          ) : discipline != null ? (
            <RingStat percent={discipline} color="var(--accent-bright)" caption="plan adherence" />
          ) : (
            <div style={{ fontSize: 12, color: 'var(--text-dim)' }}>—</div>
          )}
        </BentoItem>

        {/* Insights */}
        <BentoItem col={5} row={1}>
          <WidgetLabel icon={<Sparkles size={13} strokeWidth={1.75} />}>Insights</WidgetLabel>
          {loading ? (
            skel(28)
          ) : summary!.insights.length ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {summary!.insights.slice(0, 2).map((t, i) => (
                <div key={i} style={{ display: 'flex', gap: 8, fontSize: 12, lineHeight: 1.45 }}>
                  <span style={{ color: 'var(--accent)' }}>◆</span>
                  <span>{t}</span>
                </div>
              ))}
              {summary!.insights.length > 2 && (
                <button
                  className="btn"
                  style={{ padding: '4px 10px', fontSize: 11, alignSelf: 'flex-start' }}
                  onClick={() => onNavigate('analytics')}
                >
                  See all
                </button>
              )}
            </div>
          ) : (
            <div style={{ fontSize: 12, color: 'var(--text-dim)' }}>No insights yet</div>
          )}
        </BentoItem>

        {/* Recent trades */}
        <BentoItem col={12} row={1}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <WidgetLabel>Recent trades</WidgetLabel>
            <button className="btn" style={{ padding: '4px 10px', fontSize: 11 }} onClick={() => onNavigate('trades')}>
              All trades <ArrowRight size={12} strokeWidth={2} />
            </button>
          </div>
          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
              {skel(14)}
              {skel(14)}
              {skel(14)}
            </div>
          ) : recent.length === 0 ? (
            <div style={{ fontSize: 12.5, color: 'var(--text-muted)', marginTop: 6 }}>Nothing logged yet.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', marginTop: 4 }}>
              {recent.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setOpenTrade(t)}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1.4fr 1fr auto',
                    gap: 12,
                    alignItems: 'center',
                    padding: '9px 6px',
                    background: 'transparent',
                    border: 'none',
                    borderBottom: '1px solid var(--border-soft)',
                    textAlign: 'left',
                    color: 'var(--text)',
                    fontSize: 12.5,
                  }}
                >
                  <span style={{ fontWeight: 'var(--weight-medium)', color: 'var(--text-strong)', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {t.pair || t.name || 'Trade'}
                    {t.direction ? <span style={{ color: 'var(--text-dim)', fontWeight: 400 }}> · {t.direction}</span> : null}
                  </span>
                  <span style={{ color: 'var(--text-muted)' }}>
                    {(() => {
                      try {
                        return format(parseISO(t.date), 'MMM d')
                      } catch {
                        return t.date
                      }
                    })()}
                  </span>
                  <span
                    className={`tag-pill ${t.pnl >= 0 ? 'positive' : 'negative'}`}
                    style={{ fontFamily: 'var(--font-body)', fontSize: 11.5, letterSpacing: 0 }}
                  >
                    {money(t.pnl)}
                  </span>
                </button>
              ))}
            </div>
          )}
        </BentoItem>
      </Bento>

      {openTrade && (
        <TradeFormModal
          trade={openTrade}
          accounts={accounts}
          strategies={strategies}
          confluences={confluences}
          onConfluencesChanged={onConfluencesChanged}
          onClose={() => setOpenTrade(null)}
          onSaved={bumpRefresh}
          onDeleted={bumpRefresh}
        />
      )}
    </>
  )
}
