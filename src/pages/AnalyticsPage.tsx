import { useEffect, useRef, useState } from 'react'
import { format } from 'date-fns'
import { KpiCard } from '../components/KpiCard'
import { PerformanceRadar } from '../components/PerformanceRadar'
import { EquityCurveChart } from '../components/EquityCurveChart'
import { DailyBarChart } from '../components/DailyBarChart'
import { DayOfWeekChart } from '../components/DayOfWeekChart'
import { CalendarHeatmap } from '../components/CalendarHeatmap'
import { MonthlyStatsPanel } from '../components/MonthlyStatsPanel'
import { MonthlyPnlPanel } from '../components/MonthlyPnlPanel'
import { PropFirmToolsPanel } from '../components/PropFirmToolsPanel'
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
  { key: 'daily', label: 'Daily / Weekly' },
  { key: 'monthly', label: 'Monthly P&L' },
  { key: 'calendar', label: 'Calendar' },
  { key: 'propfirm', label: 'Prop Firm Tools' },
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
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [openTrade, setOpenTrade] = useState<Trade | null>(null)

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
        <FilterBar
          accounts={accounts}
          strategies={strategies}
          accountId={accountId}
          strategyId={strategyId}
          onAccountChange={setAccountId}
          onStrategyChange={setStrategyId}
        />
      </div>

      <div ref={(el) => { sectionRefs.current.overview = el }}>
        <Stagger style={{ display: 'flex', gap: 'var(--sp-3)', flexWrap: 'wrap' }}>
          <Reveal><KpiCard label="Win Rate" value={`${summary.kpis.winRate}%`} /></Reveal>
          <Reveal><KpiCard label="Total P&L" value={`$${summary.kpis.totalPnl.toLocaleString()}`} positive={summary.kpis.totalPnl >= 0} /></Reveal>
          <Reveal><KpiCard label="Returns" value={`${summary.kpis.returnsPct}%`} positive={summary.kpis.returnsPct >= 0} /></Reveal>
          <Reveal><KpiCard label="Profit Factor" value={formatRatio(summary.kpis.profitFactor)} positive={summary.kpis.profitFactor >= 1} /></Reveal>
        </Stagger>
      </div>

      <Reveal index={0}>
        <div ref={(el) => { sectionRefs.current.equity = el }} style={{ display: 'flex', gap: 'var(--sp-4)', flexWrap: 'wrap' }}>
          <PerformanceRadar data={summary.radar} />
          <EquityCurveChart equityCurve={summary.equityCurve} drawdown={summary.drawdown} />
        </div>
      </Reveal>

      <Reveal index={1}>
        <div ref={(el) => { sectionRefs.current.daily = el }} style={{ display: 'flex', gap: 'var(--sp-4)', flexWrap: 'wrap' }}>
          <DailyBarChart data={summary.dailyBars} />
          <DayOfWeekChart data={summary.dayOfWeek} />
        </div>
      </Reveal>

      <Reveal index={2}>
        <div ref={(el) => { sectionRefs.current.monthly = el }}>
          <MonthlyPnlPanel accountId={accountId} strategyId={strategyId} refreshKey={refreshKey} />
        </div>
      </Reveal>

      <Reveal index={3}>
        <div ref={(el) => { sectionRefs.current.calendar = el }} style={{ display: 'flex', gap: 'var(--sp-4)', alignItems: 'flex-start', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 420 }}>
            <CalendarHeatmap month={month} onMonthChange={setMonth} calendar={summary.calendar} onOpenTrade={setOpenTrade} />
          </div>
          <MonthlyStatsPanel stats={summary.monthlyStats} />
        </div>
      </Reveal>

      <Reveal index={4}>
        <div ref={(el) => { sectionRefs.current.propfirm = el }}>
          <PropFirmToolsPanel overall={summary.overall} />
        </div>
      </Reveal>

      <Reveal index={5}>
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
