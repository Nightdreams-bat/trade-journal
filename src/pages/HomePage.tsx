import { useEffect, useMemo, useState } from 'react'
import { format } from 'date-fns'
import { Area, AreaChart, ResponsiveContainer, Tooltip, YAxis } from 'recharts'
import { RingStat } from '../components/RingStat'
import { Timeline } from '../components/Timeline'
import { TradeFormModal } from '../components/TradeFormModal'
import { CountUpValue } from '../anim'
import { COLORS } from '../colors'
import { TOOLTIP_STYLE, TOOLTIP_LABEL_STYLE, TOOLTIP_ITEM_STYLE, CHART_ANIM } from '../charts/chartTheme'
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

  const skel = (h = 16) => (
    <div style={{ height: h, borderRadius: 8, background: 'rgba(60,50,38,0.06)', width: '70%' }} />
  )

  const curve = useMemo(
    () => (summary ? summary.equityCurve.map((e) => ({ date: e.date, equity: e.cumulativePnl })) : []),
    [summary],
  )

  const pnl = summary?.kpis.totalPnl ?? 0
  const pnlColor = pnl >= 0 ? 'var(--green)' : 'var(--red)'

  return (
    <div className="hero-content">
      <div className="hero-grid">
        {/* ---- Analytics: full-bleed equity curve + P&L overlay ---- */}
        <section className="analytics card">
          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: 'var(--sp-4)' }}>
              {skel(28)}
              {skel(160)}
            </div>
          ) : empty ? (
            <div
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-start',
                justifyContent: 'center',
                gap: 10,
                padding: 'var(--sp-5)',
              }}
            >
              <div style={{ fontSize: 18, fontWeight: 'var(--weight-title)', color: 'var(--text-strong)' }}>
                No trades yet
              </div>
              <div style={{ fontSize: 13, color: 'var(--text-muted)', maxWidth: 320 }}>
                Log your first trade to start building an equity curve and see your stats here.
              </div>
              <button className="btn btn-primary" onClick={onNewTrade}>
                Log your first trade
              </button>
            </div>
          ) : (
            <>
              <div className="analytics-overlay">
                <div style={{ fontSize: 12, color: 'var(--text-muted)', letterSpacing: '0.01em' }}>Total P&amp;L</div>
                <div style={{ fontSize: 32, fontWeight: 'var(--weight-title)', color: pnlColor, lineHeight: 1.1 }}>
                  <CountUpValue value={money(pnl)} />
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                  {summary!.kpis.returnsPct >= 0 ? '+' : ''}
                  {summary!.kpis.returnsPct}% · PF {formatRatio(summary!.kpis.profitFactor)}
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
                          <stop offset="0%" stopColor={COLORS.green} stopOpacity={0.32} />
                          <stop offset="100%" stopColor={COLORS.green} stopOpacity={0} />
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
                        stroke={COLORS.green}
                        strokeWidth={2}
                        fill="url(#homeEquityFill)"
                        {...CHART_ANIM}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </div>

              <div className="analytics-footer">
                <span style={{ fontSize: 11.5, color: 'var(--text-dim)' }}>
                  Max drawdown {money(summary!.drawdown.maxDrawdown)}
                </span>
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
        </section>

        {/* ---- Supporting block: rings + one insight ---- */}
        <section className="support card">
          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {skel(80)}
              {skel(20)}
            </div>
          ) : (
            <>
              <div className="support-rings">
                <RingStat percent={summary!.kpis.winRate} caption="win rate" size={84} />
                {discipline != null ? (
                  <RingStat
                    percent={discipline}
                    color="var(--accent-bright)"
                    caption="discipline"
                    size={84}
                  />
                ) : (
                  <div style={{ fontSize: 12, color: 'var(--text-dim)', alignSelf: 'center' }}>
                    No discipline data
                  </div>
                )}
              </div>

              <div className="support-insight">
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-muted)', fontSize: 12 }}>
                  <Sparkles size={13} strokeWidth={1.75} />
                  <span>Insight</span>
                </div>
                <p style={{ fontSize: 12.5, lineHeight: 1.5, color: 'var(--text)', margin: '6px 0 0' }}>
                  {summary!.insights[0] ?? 'Keep logging trades to unlock pattern insights.'}
                </p>
                <button
                  className="btn"
                  style={{ padding: '4px 10px', fontSize: 11, marginTop: 8, alignSelf: 'flex-start' }}
                  onClick={() => onNavigate('analytics')}
                >
                  See all <ArrowRight size={12} strokeWidth={2} />
                </button>
              </div>
            </>
          )}
        </section>

        {/* ---- Timeline: full width ---- */}
        <Timeline
          trades={recent}
          onOpenTrade={setOpenTrade}
          onViewAll={() => onNavigate('trades')}
        />
      </div>

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
