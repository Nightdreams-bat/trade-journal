export const ACCOUNT_TYPES = ['live', 'demo', 'prop', 'backtest'] as const
export type AccountType = (typeof ACCOUNT_TYPES)[number]
export const ACCOUNT_TYPE_LABELS: Record<AccountType, string> = {
  live: 'Live',
  demo: 'Demo',
  prop: 'Prop Firm',
  backtest: 'Backtest',
}

export interface Account {
  id: number
  name: string
  broker: string
  starting_balance: number
  currency: string
  account_type: AccountType
}

export interface Strategy {
  id: number
  name: string
  description: string
}

export interface Confluence {
  id: number
  name: string
}

export interface Trade {
  id: number
  name: string
  date: string
  /** Local 'HH:MM'. Optional — null on every trade logged before entry times existed. */
  entry_time: string | null
  pair: string | null
  session: string | null
  direction: string | null
  risk_per_trade: number | null
  pnl: number
  r_multiple: number | null
  followed_plan: boolean
  break_even: boolean
  entry_win: boolean
  strategy_id: number | null
  account_id: number | null
  positive_tags: string[]
  negative_tags: string[]
  notes: string | null
  created_at: string
  confluence_ids: number[]
  source: 'manual' | 'agent'
}

export interface MissedTrade {
  id: number
  date: string
  pair: string | null
  direction: string | null
  would_be_pnl: number | null
  reason_missed: string | null
  strategy_id: number | null
  tags: string[]
  notes: string | null
  confluence_ids: number[]
}

export interface DailyReview {
  date: string
  notes: string
  emotion: string
  lessons_learned: string
}

export interface StrategyPerformance {
  id: number
  name: string
  description: string
  tradeCount: number
  winRate: number
  profitFactor: number
  expectancy: number
  totalPnl: number
  avgRMultiple: number
  planAdherence: number
  avgWin: number
  avgLoss: number
}

export interface DrawdownPoint {
  date: string
  equity: number
  drawdownAbs: number
  drawdownPct: number
}

export interface DrawdownEpisode {
  peakDate: string
  troughDate: string
  recoveryDate: string | null
  depthAbs: number
  depthPct: number
  durationDays: number
  recoveryDays: number | null
  ongoing: boolean
}

/**
 * High-water-mark drawdown, mirroring `electron/drawdown.ts`. Every drawdown figure is negative or
 * zero; percentages are percentage points. When `percentAvailable` is false the account has no
 * starting balance, so only the `*Abs` dollar figures are meaningful and every ratio is null.
 */
export interface DrawdownDetail {
  percentAvailable: boolean
  series: DrawdownPoint[]
  maxDrawdownAbs: number
  maxDrawdownPct: number
  peakDate: string | null
  troughDate: string | null
  recoveryDate: string | null
  episodes: DrawdownEpisode[]
  avgDepthPct: number
  avgDurationDays: number
  avgRecoveryDays: number
  depthPercentiles: { p50: number; p75: number; p90: number; p95: number }
  episodesOver: { pct5: number; pct10: number; pct20: number }
  currentDrawdown: {
    inDrawdown: boolean
    depthAbs: number
    depthPct: number
    daysInDrawdown: number
    peakDate: string | null
  }
  timeUnderwaterPct: number
  tradingDays: number
  calendarDays: number
  annualisedReturnPct: number | null
  painIndex: number | null
  ulcerIndex: number | null
  calmar: number | null
  sterling: number | null
  burke: number | null
  martin: number | null
  /** The same account with the strategy filter lifted — null unless a strategy filter is active. */
  benchmarkSeries: DrawdownPoint[] | null
}

export interface StrategyDetail {
  id: number
  name: string
  description: string
  stats: {
    tradeCount: number
    winRate: number
    profitFactor: number
    expectancy: number
    totalPnl: number
    avgRMultiple: number
    planAdherence: number
    avgWin: number
    avgLoss: number
  }
  equityCurve: { date: string; cumulativePnl: number }[]
  drawdown: { series: { date: string; drawdown: number }[]; maxDrawdown: number }
  drawdownDetail: DrawdownDetail
  dayOfWeek: { day: string; trades: number; pnl: number; winRate: number; avgWin: number; avgLoss: number; best: number }[]
  trades: { id: number; date: string; name: string; pair: string | null; pnl: number; followed_plan: boolean }[]
}

export interface AnalyticsSummary {
  kpis: { winRate: number; totalPnl: number; returnsPct: number; profitFactor: number }
  radar: { metric: string; value: number }[]
  equityCurve: { date: string; cumulativePnl: number }[]
  drawdown: { series: { date: string; drawdown: number }[]; maxDrawdown: number }
  drawdownDetail: DrawdownDetail
  dailyBars: { day: string; pnl: number }[]
  dayOfWeek: { day: string; trades: number; pnl: number; winRate: number; avgWin: number; avgLoss: number; best: number }[]
  calendar: Record<string, { pnl: number; count: number }>
  monthlyStats: {
    winRate: number
    riskReward: number
    profitFactor: number
    bestDayPnl: number
    worstDayPnl: number
    avgDailyPnl: number
    tradeCount: number
  }
  insights: string[]
  overall: {
    winRate: number
    profitFactor: number
    totalPnl: number
    returnsPct: number
    avgWin: number
    avgLoss: number
    totalTrades: number
  }
}

export interface MonthlyBreakdownEntry {
  month: string
  label: string
  pnl: number
  tradeCount: number
  winRate: number
}

export interface FundedChallengeParams {
  profitTargetPct: number
  maxDailyLossPct: number
  maxOverallDrawdownPct: number
  riskPerTradePct: number
  tradingDaysRemaining: number
  accountId?: number | null
  strategyId?: number | null
  drawdownMode?: 'intraday' | 'eod'
  dailyLossMode?: 'intraday' | 'eod'
  consistencyPct?: number | null
}

export interface FundedChallengeResult {
  sampleSize: number
  passRate: number
  dailyLossBreachRate: number
  maxDrawdownBreachRate: number
  ranOutOfDaysRate: number
  riskOfRuin: number
  medianDaysToPass: number | null
  p10DaysToPass: number | null
  p90DaysToPass: number | null
  expectancyR: number
  expectancyPct: number
  historicalProfitFactor: number
  historicalWinRate: number
  simProfitFactor: { p10: number; median: number; p90: number } | null
  simMaxDrawdownPct: { median: number; p90: number }
  medianEndingEquityPct: number
  consistencyBreachRate: number | null
  insufficientData: boolean
}

export const SESSIONS = ['Asia', 'London', 'New York', 'London/NY Overlap'] as const
export const DIRECTIONS = ['Long', 'Short'] as const

// ---------------------------------------------------------------------------
// economic calendar
// ---------------------------------------------------------------------------

/** ForexFactory's impact rating. 'High' is the red folder. */
export type Impact = 'High' | 'Medium' | 'Low' | 'Holiday'

export interface CalendarEvent {
  id: number
  title: string
  /** Currency code ('USD', 'EUR', …) or 'All' for global events. */
  country: string
  /** ISO 8601 with the source's UTC offset, e.g. '2026-09-01T10:00:00-04:00'. */
  starts_at: string
  /** Calendar day of `starts_at` in the source's offset, for joining against `trades.date`. */
  date: string
  impact: Impact
  forecast: string | null
  previous: string | null
  /** 1 for bank holidays, which have no meaningful clock time. */
  all_day: number
}

export interface CalendarConfig {
  enabled: boolean
  syncOnLaunch: boolean
  lastSync: string | null
  lastError: string | null
  eventCount: number
  sourceUrl: string
}

export interface CalendarSyncResult {
  ok: boolean
  inserted: number
  updated: number
  error?: string
}
