import { useEffect, useRef, useState } from 'react'
import { format } from 'date-fns'
import { KpiCard } from '../components/KpiCard'
import { PerformanceRadar } from '../components/PerformanceRadar'
import { EquityCurveChart } from '../components/EquityCurveChart'
import { UnderwaterChart } from '../components/UnderwaterChart'
import { DrawdownPanel } from '../components/DrawdownPanel'
import { DrawdownEpisodesTable } from '../components/DrawdownEpisodesTable'
import { MarketContextEdgePanel } from '../components/MarketContextEdgePanel'
import { DailyBarChart } from '../components/DailyBarChart'
import { DayOfWeekPanel } from '../components/DayOfWeekPanel'
import { CalendarHeatmap } from '../components/CalendarHeatmap'
import { MonthlyStatsPanel } from '../components/MonthlyStatsPanel'
import { MonthlyPnlPanel } from '../components/MonthlyPnlPanel'
import { PropFirmToolsPanel } from '../components/PropFirmToolsPanel'
import { PropFirmFitPanel } from '../components/PropFirmFitPanel'
import { LiveRiskPanel } from '../components/LiveRiskPanel'
import { InsightsPanel } from '../components/InsightsPanel'
import { GlassRail } from '../components/GlassRail'
import { FilterBar } from '../components/FilterBar'
import { TradeFormModal } from '../components/TradeFormModal'
import { formatRatio } from '../format'
import { Stagger, Reveal } from '../anim'
import type { Account, AnalyticsSummary, Confluence, Strategy, Trade } from '../types'

const SECTIONS = [
  { key: 'overview', label: 'Overview' },
  { key: 'equity', label: 'Equity & Radar' },
  { key: 'drawdown', label: 'Drawdown' },
  { key: 'daily', label: 'Daily / Weekly' },
  { key: 'context', label: 'Market Context' },
  { key: 'monthly', label: 'Monthly P&L' },
  { key: 'calendar', label: 'Calendar' },
  { key: 'propfirm', label: 'Firm & Risk' },
  { key: 'insights', label: 'Insights' },
] as const

export function AnalyticsPage({
  accounts,
  strategies,
  confluences,
  onConfluencesChanged,
  refreshKey,
  bumpRefresh,
}: {
  accounts: Account[]
  strategies: Strategy[]
  confluences: Confluence[]
  onConfluencesChanged: () => void
  refreshKey: number
  bumpRefresh: () => void
}) {
  const [month, setMonth] = useState(format(new Date(), 'yyyy-MM'))
  const [accountId, setAccountId] = useState<number | null>(null)
  const [strategyId, setStrategyId] = useState<number | null>(null)
  const [statsMode, setStatsMode] = useState<'month' | 'all'>('month')
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [openTrade, setOpenTrade] = useState<Trade | null>(null)
  // Market-context edge is computed in the renderer from the trades themselves, the same way
  // TradingPlanPage does it — the summary payload carries aggregates, not per-trade confluences.
  const [trades, setTrades] = useState<Trade[]>([])

  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({})

  useEffect(() => {
    let cancelled = false
    setRefreshing(true)
    window.api.analytics.getSummary({ accountId, strategyId, month }).then((s) => {
      if (!cancelled) {
        setSummary(s)
        setRefreshing(false)
      }
    })
    return () => {
      cancelled = true
    }
  }, [month, accountId, strategyId, refreshKey])

  useEffect(() => {
    let cancelled = false
    window.api.trades.getAll({ accountId, strategyId }).then((t: Trade[]) => {
      if (!cancelled) setTrades(t)
    })
    return () => {
      cancelled = true
    }
  }, [accountId, strategyId, refreshKey])

  const selectedAccount = accountId != null ? accounts.find((a) => a.id === accountId) ?? null : null

  const scrollTo = (key: string) => {
    sectionRefs.current[key]?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  if (!summary) {
    return <div style={{ padding: 'var(--sp-5)', color: 'var(--text-muted)' }}>Loading analytics…</div>
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-4)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
        <GlassRail style={{ gap: 6 }}>
          {SECTIONS.map((s) => (
            <button key={s.key} className="btn" style={{ fontSize: 11.5, padding: '5px 10px' }} onClick={() => scrollTo(s.key)}>
              {s.label}
            </button>
          ))}
        </GlassRail>
        {refreshing && (
          <span className="mono-label" style={{ color: 'var(--accent)', alignSelf: 'center' }}>// updating…</span>
        )}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
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
                  padding: '5px 10px',
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
          <FilterBar
            accounts={accounts}
            strategies={strategies}
            accountId={accountId}
            strategyId={strategyId}
            onAccountChange={setAccountId}
            onStrategyChange={setStrategyId}
          />
        </div>
      </div>

      <div ref={(el) => { sectionRefs.current.overview = el }}>
        <Stagger style={{ display: 'flex', gap: 'var(--sp-3)', flexWrap: 'wrap' }}>
          <Reveal><KpiCard label="Win Rate" value={`${statsMode === 'month' ? summary.kpis.winRate : summary.overall.winRate}%`} /></Reveal>
          <Reveal><KpiCard label={statsMode === 'month' ? 'Total P&L' : 'All-time P&L'} value={`$${(statsMode === 'month' ? summary.kpis.totalPnl : summary.overall.totalPnl).toLocaleString()}`} positive={(statsMode === 'month' ? summary.kpis.totalPnl : summary.overall.totalPnl) >= 0} /></Reveal>
          <Reveal><KpiCard label="Returns" value={`${statsMode === 'month' ? summary.kpis.returnsPct : summary.overall.returnsPct}%`} positive={(statsMode === 'month' ? summary.kpis.returnsPct : summary.overall.returnsPct) >= 0} /></Reveal>
          <Reveal><KpiCard label="Profit Factor" value={formatRatio(statsMode === 'month' ? summary.kpis.profitFactor : summary.overall.profitFactor)} positive={(statsMode === 'month' ? summary.kpis.profitFactor : summary.overall.profitFactor) >= 1} /></Reveal>
        </Stagger>
      </div>

      <Reveal index={0}>
        <div ref={(el) => { sectionRefs.current.equity = el }} style={{ display: 'flex', gap: 'var(--sp-4)', flexWrap: 'wrap' }}>
          <PerformanceRadar data={summary.radar} />
          <EquityCurveChart equityCurve={summary.equityCurve} drawdown={summary.drawdown} />
        </div>
      </Reveal>

      <Reveal index={1}>
        <div ref={(el) => { sectionRefs.current.drawdown = el }} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-4)' }}>
          <div style={{ display: 'flex', gap: 'var(--sp-4)', flexWrap: 'wrap' }}>
            <UnderwaterChart detail={summary.drawdownDetail} />
            <DrawdownPanel detail={summary.drawdownDetail} />
          </div>
          <DrawdownEpisodesTable detail={summary.drawdownDetail} />
        </div>
      </Reveal>

      <Reveal index={2}>
        <div ref={(el) => { sectionRefs.current.daily = el }} style={{ display: 'flex', gap: 'var(--sp-4)', flexWrap: 'wrap' }}>
          <DailyBarChart data={summary.dailyBars} />
          <DayOfWeekPanel data={summary.dayOfWeek} />
        </div>
      </Reveal>

      <Reveal index={3}>
        <div ref={(el) => { sectionRefs.current.context = el }}>
          <MarketContextEdgePanel trades={trades} confluences={confluences} />
        </div>
      </Reveal>

      <Reveal index={4}>
        <div ref={(el) => { sectionRefs.current.monthly = el }}>
          <MonthlyPnlPanel accountId={accountId} strategyId={strategyId} refreshKey={refreshKey} />
        </div>
      </Reveal>

      <Reveal index={5}>
        <div ref={(el) => { sectionRefs.current.calendar = el }} style={{ display: 'flex', gap: 'var(--sp-4)', alignItems: 'flex-start', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 420 }}>
            <CalendarHeatmap
              month={month}
              onMonthChange={setMonth}
              calendar={summary.calendar}
              onOpenTrade={setOpenTrade}
              accountId={accountId}
              strategyId={strategyId}
            />
          </div>
          <MonthlyStatsPanel stats={summary.monthlyStats} />
        </div>
      </Reveal>

      <Reveal index={6}>
        <div ref={(el) => { sectionRefs.current.propfirm = el }} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-4)' }}>
          {selectedAccount?.account_type === 'prop' ? (
            <>
              <PropFirmFitPanel accountId={selectedAccount.id} strategyId={strategyId} />
              <PropFirmToolsPanel overall={summary.overall} accountId={accountId} strategyId={strategyId} />
            </>
          ) : selectedAccount?.account_type === 'live' ? (
            <LiveRiskPanel accountId={selectedAccount.id} overall={summary.overall} />
          ) : (
            <>
              <PropFirmFitPanel accountId={accountId} strategyId={strategyId} />
              <LiveRiskPanel accountId={accountId} overall={summary.overall} />
              <PropFirmToolsPanel overall={summary.overall} accountId={accountId} strategyId={strategyId} />
            </>
          )}
        </div>
      </Reveal>

      <Reveal index={7}>
        <div ref={(el) => { sectionRefs.current.insights = el }}>
          <InsightsPanel insights={summary.insights} />
        </div>
      </Reveal>

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
