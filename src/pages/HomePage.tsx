import { useEffect, useMemo, useState } from 'react'
import { format } from 'date-fns'
import { Area, AreaChart, ResponsiveContainer, Tooltip, YAxis } from 'recharts'
import { RingStat } from '../components/RingStat'
import { Timeline } from '../components/Timeline'
import { TradeFormModal } from '../components/TradeFormModal'
import { CountUpValue, Reveal, Stagger } from '../anim'
import { useColors } from '../themeMode'
import { useChartTheme, CHART_ANIM } from '../charts/chartTheme'
import { formatRatio } from '../format'
import { ArrowRight, Sparkles } from '../components/icons'
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

function money(n: number): string {
  const sign = n < 0 ? '-' : ''
  return `${sign}$${Math.abs(Math.round(n)).toLocaleString('en-US')}`
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
  const colors = useColors()
  const { TOOLTIP_STYLE, TOOLTIP_LABEL_STYLE, TOOLTIP_ITEM_STYLE } = useChartTheme()
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
    () => (trades ? [...trades].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 8) : []),
    [trades],
  )

  const discipline = summary?.radar.find((r) => /disciplin|plan|adher/i.test(r.metric))?.value ?? null

  const loading = !summary || !trades
  const empty = !loading && trades!.length === 0 && summary!.overall.totalTrades === 0

  const skel = (h = 16, w = '70%') => (
    <div style={{ height: h, borderRadius: 10, background: 'rgba(var(--ink-rgb),0.06)', width: w }} />
  )

  const curve = useMemo(
    () => (summary ? summary.equityCurve.map((e) => ({ date: e.date, equity: e.cumulativePnl })) : []),
    [summary],
  )

  const daysTraded = useMemo(
    () => (summary ? Object.keys(summary.calendar ?? {}).length : 0),
    [summary],
  )

  const pnl = summary?.kpis.totalPnl ?? 0
  const pnlColor = pnl >= 0 ? 'var(--green)' : 'var(--red)'

  if (loading) {
    return (
      <div className="hero-content">
        <div className="hero-grid">
          <section className="analytics card" style={{ padding: 'var(--sp-5)', display: 'flex', flexDirection: 'column', gap: 14 }}>
            {skel(28, '40%')}
            {skel(180, '100%')}
          </section>
          <section className="home-stats card">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="stat-cell">{skel(24, '55%')}</div>
            ))}
          </section>
          <section className="home-rings card">{skel(90, '50%')}</section>
        </div>
      </div>
    )
  }

  if (empty) {
    return (
      <div className="hero-content">
        <div
          style={{
            minHeight: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div
            className="card"
            style={{
              maxWidth: 460,
              padding: 'var(--sp-7) var(--sp-6)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              textAlign: 'center',
              gap: 12,
            }}
          >
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: 'var(--radius-pill)',
                background: 'var(--accent-bg)',
                color: 'var(--accent)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Sparkles size={24} strokeWidth={1.75} />
            </div>
            <div style={{ fontSize: 20, fontWeight: 'var(--weight-title)', color: 'var(--text-strong)' }}>
              Your journal starts here
            </div>
            <div style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.6 }}>
              Log your first trade to build an equity curve, unlock analytics, and start
              tracking your edge and discipline.
            </div>
            <button className="btn btn-primary" onClick={onNewTrade} style={{ marginTop: 4 }}>
              Log your first trade
            </button>
          </div>
        </div>
      </div>
    )
  }

  const returnsUp = summary!.kpis.returnsPct >= 0
  const stats: { label: string; value: string; color?: string; arrow?: string }[] = [
    { label: 'Win rate', value: `${summary!.kpis.winRate}%` },
    {
      label: 'Returns',
      value: `${Math.abs(summary!.kpis.returnsPct)}%`,
      color: returnsUp ? 'var(--green)' : 'var(--red)',
      arrow: returnsUp ? '▲' : '▼',
    },
    { label: 'Profit factor', value: formatRatio(summary!.kpis.profitFactor) },
    { label: 'Max drawdown', value: money(summary!.drawdown.maxDrawdown) },
  ]

  return (
    <div className="hero-content">
      <Stagger className="hero-grid">
        {/* ---- Analytics: full-bleed equity curve + P&L overlay ---- */}
        <Reveal className="analytics card">
          <div className="analytics-overlay">
            <div style={{ fontSize: 12, color: 'var(--text-muted)', letterSpacing: '0.01em' }}>
              Total P&amp;L · {format(new Date(), 'MMMM')}
            </div>
            <div
              style={{
                fontSize: 34,
                fontWeight: 'var(--weight-title)',
                color: pnlColor,
                lineHeight: 1.1,
                textShadow: pnl >= 0 ? '0 2px 22px rgba(var(--green-rgb),0.38)' : '0 2px 22px rgba(226,61,69,0.34)',
              }}
            >
              <CountUpValue value={money(pnl)} />
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
              PF {formatRatio(summary!.kpis.profitFactor)} · {daysTraded} days traded
            </div>
          </div>

          <div className="analytics-chart">
            {curve.length < 2 ? (
              <div
                style={{
                  height: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--text-dim)',
                  fontSize: 12,
                }}
              >
                Not enough trades yet
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={curve} margin={{ top: 8, right: 0, bottom: 0, left: 0 }}>
                  <defs>
                    <linearGradient id="homeEquityFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={colors.greenBright} stopOpacity={0.42} />
                      <stop offset="55%" stopColor={colors.green} stopOpacity={0.16} />
                      <stop offset="100%" stopColor={colors.accent2} stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="homeEquityStroke" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor={colors.green} />
                      <stop offset="100%" stopColor={colors.greenBright} />
                    </linearGradient>
                  </defs>
                  <YAxis hide domain={['dataMin', 'dataMax']} />
                  <Tooltip
                    contentStyle={TOOLTIP_STYLE}
                    labelStyle={TOOLTIP_LABEL_STYLE}
                    itemStyle={TOOLTIP_ITEM_STYLE}
                    formatter={(v) => [`$${v}`, 'Cumulative P&L']}
                  />
                  <Area
                    type="monotone"
                    dataKey="equity"
                    stroke="url(#homeEquityStroke)"
                    strokeWidth={2.75}
                    fill="url(#homeEquityFill)"
                    style={{ filter: 'drop-shadow(0 6px 14px rgba(var(--green-rgb),0.3))' }}
                    {...CHART_ANIM}
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="analytics-footer">
            <span style={{ fontSize: 11.5, color: 'var(--text-dim)' }}>
              {summary!.overall.totalTrades} trades all-time
            </span>
            <button
              className="btn"
              style={{ padding: '4px 10px', fontSize: 11 }}
              onClick={() => onNavigate('analytics')}
            >
              Analytics <ArrowRight size={12} strokeWidth={2} />
            </button>
          </div>
        </Reveal>

        {/* ---- 2x2 KPI mini-grid ---- */}
        <Reveal className="home-stats card">
          {stats.map((s) => (
            <div key={s.label} className="stat-cell">
              <span className="stat-label">{s.label}</span>
              <span className="stat-value">
                {s.arrow && <span className="stat-arrow" style={{ color: s.color }}>{s.arrow}</span>}
                <span style={s.color ? { color: s.color } : undefined}>
                  <CountUpValue value={s.value} />
                </span>
              </span>
            </div>
          ))}
        </Reveal>

        {/* ---- Rings + insight ---- */}
        <Reveal className="home-rings card">
          <div className="rings-cluster">
            <RingStat percent={summary!.kpis.winRate} caption="win rate" size={96} />
            {discipline != null ? (
              <RingStat percent={discipline} caption="discipline" size={96} />
            ) : (
              <div style={{ fontSize: 12, color: 'var(--text-dim)', alignSelf: 'center', width: 96, textAlign: 'center' }}>
                No discipline data yet
              </div>
            )}
          </div>

          <div className="insight-body">
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-muted)', fontSize: 12 }}>
              <Sparkles size={13} strokeWidth={1.75} />
              <span>Insight</span>
            </div>
            <p style={{ fontSize: 13, lineHeight: 1.6, color: 'var(--text)', margin: '8px 0 0' }}>
              {summary!.insights[0] ?? 'Keep logging trades to unlock pattern insights.'}
            </p>
            <button
              className="btn"
              style={{ padding: '4px 10px', fontSize: 11, marginTop: 10, alignSelf: 'flex-start' }}
              onClick={() => onNavigate('analytics')}
            >
              See all insights <ArrowRight size={12} strokeWidth={2} />
            </button>
          </div>
        </Reveal>

        {/* ---- Timeline: full width ---- */}
        <Reveal className="timeline">
          <Timeline trades={recent} onOpenTrade={setOpenTrade} onViewAll={() => onNavigate('trades')} />
        </Reveal>
      </Stagger>

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
    </div>
  )
}
