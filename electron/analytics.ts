import { getDb } from './db'

export interface SummaryFilters {
  accountId?: number | null
  strategyId?: number | null
  month: string // 'YYYY-MM'
}

interface TradeRow {
  id: number
  date: string
  pnl: number
  followed_plan: number
  session: string | null
}

function fetchTrades(filters: SummaryFilters, monthScoped: boolean): TradeRow[] {
  const db = getDb()
  const clauses: string[] = []
  const p: (string | number)[] = []
  if (filters.accountId) {
    clauses.push('account_id = ?')
    p.push(filters.accountId)
  }
  if (filters.strategyId) {
    clauses.push('strategy_id = ?')
    p.push(filters.strategyId)
  }
  if (monthScoped) {
    clauses.push('date LIKE ?')
    p.push(`${filters.month}%`)
  }
  const finalWhere = clauses.length ? `WHERE ${clauses.join(' AND ')}` : ''
  const stmt = db.prepare(`SELECT id, date, pnl, followed_plan, session FROM trades ${finalWhere} ORDER BY date ASC`)
  return stmt.all(...p) as unknown as TradeRow[]
}

function winRateOf(trades: TradeRow[]): number {
  if (!trades.length) return 0
  const wins = trades.filter((t) => t.pnl > 0).length
  return wins / trades.length
}

function profitFactorOf(trades: TradeRow[]): number {
  const grossProfit = trades.filter((t) => t.pnl > 0).reduce((s, t) => s + t.pnl, 0)
  const grossLoss = Math.abs(trades.filter((t) => t.pnl < 0).reduce((s, t) => s + t.pnl, 0))
  if (grossLoss === 0) return grossProfit > 0 ? 999 : 0
  return grossProfit / grossLoss
}

function planAdherenceOf(trades: TradeRow[]): number {
  if (!trades.length) return 0
  return trades.filter((t) => t.followed_plan).length / trades.length
}

function equityCurveOf(trades: TradeRow[]) {
  let cumulative = 0
  return trades.map((t) => {
    cumulative += t.pnl
    return { date: t.date, cumulativePnl: Math.round(cumulative * 100) / 100 }
  })
}

function drawdownOf(curve: { date: string; cumulativePnl: number }[]) {
  let peak = 0
  let maxDrawdown = 0
  const series = curve.map((p) => {
    peak = Math.max(peak, p.cumulativePnl)
    const dd = p.cumulativePnl - peak
    maxDrawdown = Math.min(maxDrawdown, dd)
    return { date: p.date, drawdown: Math.round(dd * 100) / 100 }
  })
  return { series, maxDrawdown: Math.abs(maxDrawdown) }
}

function consistencyScoreOf(trades: TradeRow[]): number {
  const byDay = new Map<string, number>()
  for (const t of trades) byDay.set(t.date, (byDay.get(t.date) ?? 0) + t.pnl)
  const daily = [...byDay.values()]
  if (daily.length < 2) return daily.length ? 100 : 0
  const mean = daily.reduce((s, v) => s + v, 0) / daily.length
  if (mean === 0) return 0
  const variance = daily.reduce((s, v) => s + (v - mean) ** 2, 0) / daily.length
  const stdev = Math.sqrt(variance)
  const score = (1 - Math.min(stdev / Math.abs(mean), 1)) * 100
  return Math.max(0, Math.min(100, score))
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function weekdayOf(dateStr: string): number {
  return new Date(`${dateStr}T00:00:00`).getDay()
}

function dailyBarsOf(trades: TradeRow[]) {
  const byWeekday = new Array(7).fill(0)
  for (const t of trades) byWeekday[weekdayOf(t.date)] += t.pnl
  return WEEKDAYS.map((day, i) => ({ day, pnl: Math.round(byWeekday[i] * 100) / 100 }))
}

function dayOfWeekBreakdownOf(trades: TradeRow[]) {
  const buckets: TradeRow[][] = Array.from({ length: 7 }, () => [])
  for (const t of trades) buckets[weekdayOf(t.date)].push(t)
  return WEEKDAYS.map((day, i) => {
    const b = buckets[i]
    const pnl = b.reduce((s, t) => s + t.pnl, 0)
    const wins = b.filter((t) => t.pnl > 0)
    const losses = b.filter((t) => t.pnl < 0)
    const avgWin = wins.length ? wins.reduce((s, t) => s + t.pnl, 0) / wins.length : 0
    const avgLoss = losses.length ? Math.abs(losses.reduce((s, t) => s + t.pnl, 0) / losses.length) : 0
    const best = b.length ? Math.max(...b.map((t) => t.pnl)) : 0
    return {
      day,
      trades: b.length,
      pnl: Math.round(pnl * 100) / 100,
      winRate: Math.round(winRateOf(b) * 1000) / 10,
      avgWin: round2(avgWin),
      avgLoss: round2(avgLoss),
      best: round2(best),
    }
  })
}

function calendarOf(trades: TradeRow[]) {
  const byDate = new Map<string, { pnl: number; count: number }>()
  for (const t of trades) {
    const entry = byDate.get(t.date) ?? { pnl: 0, count: 0 }
    entry.pnl += t.pnl
    entry.count += 1
    byDate.set(t.date, entry)
  }
  const result: Record<string, { pnl: number; count: number }> = {}
  for (const [date, v] of byDate) result[date] = { pnl: Math.round(v.pnl * 100) / 100, count: v.count }
  return result
}

function accountStartingBalance(accountId?: number | null): number {
  const db = getDb()
  if (accountId) {
    const row = db.prepare('SELECT starting_balance FROM accounts WHERE id = ?').get(accountId) as
      | { starting_balance: number }
      | undefined
    return row?.starting_balance ?? 0
  }
  const row = db.prepare('SELECT COALESCE(SUM(starting_balance),0) as total FROM accounts').get() as {
    total: number
  }
  return row.total
}

function buildInsights(allTrades: TradeRow[], dayOfWeek: ReturnType<typeof dayOfWeekBreakdownOf>) {
  const insights: string[] = []
  if (allTrades.length < 5) {
    insights.push('Log a few more trades to unlock reliable insights (aim for 20+ before trusting patterns).')
    return insights
  }

  const active = dayOfWeek.filter((d) => d.trades >= 3)
  if (active.length >= 2) {
    const best = active.reduce((a, b) => (b.pnl > a.pnl ? b : a))
    const worst = active.reduce((a, b) => (b.pnl < a.pnl ? b : a))
    if (best.day !== worst.day && best.pnl > 0) {
      insights.push(`${best.day} is your strongest day (${best.pnl >= 0 ? '+' : ''}$${best.pnl.toFixed(0)} total, ${best.winRate}% win rate).`)
    }
    if (worst.pnl < 0) {
      insights.push(`${worst.day} has cost you $${Math.abs(worst.pnl).toFixed(0)} total — worth reviewing what's different about setups you take that day.`)
    }
  }

  const adherence = planAdherenceOf(allTrades)
  const followed = allTrades.filter((t) => t.followed_plan)
  const notFollowed = allTrades.filter((t) => !t.followed_plan)
  if (followed.length >= 3 && notFollowed.length >= 3) {
    const wrFollowed = winRateOf(followed) * 100
    const wrNot = winRateOf(notFollowed) * 100
    if (wrFollowed - wrNot > 10) {
      insights.push(`Trades where you followed your plan win ${(wrFollowed - wrNot).toFixed(0)} pts more often (${wrFollowed.toFixed(0)}% vs ${wrNot.toFixed(0)}%). Plan adherence is currently ${(adherence * 100).toFixed(0)}%.`)
    }
  }

  const pf = profitFactorOf(allTrades)
  if (pf > 0 && pf < 1) {
    insights.push(`Profit factor is below 1.0 (${pf.toFixed(2)}) — losses are outweighing wins overall.`)
  } else if (pf >= 2.5) {
    insights.push(`Profit factor is strong at ${pf.toFixed(2)} — wins are outweighing losses by a healthy margin.`)
  }

  return insights.slice(0, 5)
}

export function getSummary(filters: SummaryFilters) {
  const monthTrades = fetchTrades(filters, true)
  const allTrades = fetchTrades(filters, false)

  const equityCurve = equityCurveOf(allTrades)
  const { series: drawdownSeries, maxDrawdown } = drawdownOf(equityCurve)
  const netProfitAllTime = allTrades.reduce((s, t) => s + t.pnl, 0)
  const recoveryFactor = maxDrawdown === 0 ? (netProfitAllTime > 0 ? 5 : 0) : netProfitAllTime / maxDrawdown

  const winRate = winRateOf(monthTrades)
  const totalPnl = monthTrades.reduce((s, t) => s + t.pnl, 0)
  const startingBalance = accountStartingBalance(filters.accountId)
  const returnsPct = startingBalance > 0 ? (totalPnl / startingBalance) * 100 : 0
  const allTimeReturnsPct = startingBalance > 0 ? (netProfitAllTime / startingBalance) * 100 : 0
  const profitFactor = profitFactorOf(monthTrades)

  const allTimeWinRate = winRateOf(allTrades)
  const allTimeProfitFactor = profitFactorOf(allTrades)
  const consistencyScore = consistencyScoreOf(allTrades)
  const allTimePlanAdherence = planAdherenceOf(allTrades)

  const dayPnls = [...calendarValues(monthTrades)]
  const bestDayPnl = dayPnls.length ? Math.max(...dayPnls) : 0
  const worstDayPnl = dayPnls.length ? Math.min(...dayPnls) : 0
  const avgDailyPnl = dayPnls.length ? dayPnls.reduce((s, v) => s + v, 0) / dayPnls.length : 0

  const wins = monthTrades.filter((t) => t.pnl > 0)
  const losses = monthTrades.filter((t) => t.pnl < 0)
  const avgWin = wins.length ? wins.reduce((s, t) => s + t.pnl, 0) / wins.length : 0
  const avgLoss = losses.length ? Math.abs(losses.reduce((s, t) => s + t.pnl, 0) / losses.length) : 0
  const riskReward = avgLoss === 0 ? (avgWin > 0 ? 5 : 0) : avgWin / avgLoss

  const dayOfWeek = dayOfWeekBreakdownOf(allTrades)

  const allWins = allTrades.filter((t) => t.pnl > 0)
  const allLosses = allTrades.filter((t) => t.pnl < 0)
  const allAvgWin = allWins.length ? allWins.reduce((s, t) => s + t.pnl, 0) / allWins.length : 0
  const allAvgLoss = allLosses.length ? Math.abs(allLosses.reduce((s, t) => s + t.pnl, 0) / allLosses.length) : 0

  return {
    kpis: {
      winRate: round1(winRate * 100),
      totalPnl: round2(totalPnl),
      returnsPct: round1(returnsPct),
      profitFactor: round2(profitFactor),
    },
    radar: [
      { metric: 'Win Rate', value: round1(allTimeWinRate * 100) },
      { metric: 'Recovery Factor', value: round1(Math.max(0, Math.min(recoveryFactor / 5, 1)) * 100) },
      { metric: 'Profit Factor', value: round1(Math.min(allTimeProfitFactor / 3, 1) * 100) },
      { metric: 'Consistency Score', value: round1(consistencyScore) },
      { metric: 'Plan Adherence', value: round1(allTimePlanAdherence * 100) },
    ],
    equityCurve,
    drawdown: { series: drawdownSeries, maxDrawdown: round2(maxDrawdown) },
    dailyBars: dailyBarsOf(monthTrades),
    dayOfWeek,
    calendar: calendarOf(monthTrades),
    monthlyStats: {
      winRate: round1(winRate * 100),
      riskReward: round2(riskReward),
      profitFactor: round2(profitFactor),
      bestDayPnl: round2(bestDayPnl),
      worstDayPnl: round2(worstDayPnl),
      avgDailyPnl: round2(avgDailyPnl),
      tradeCount: monthTrades.length,
    },
    insights: buildInsights(allTrades, dayOfWeek),
    overall: {
      winRate: round1(allTimeWinRate * 100),
      profitFactor: round2(allTimeProfitFactor),
      totalPnl: round2(netProfitAllTime),
      returnsPct: round1(allTimeReturnsPct),
      avgWin: round2(allAvgWin),
      avgLoss: round2(allAvgLoss),
      totalTrades: allTrades.length,
    },
  }
}

export interface MonthlyBreakdownFilters {
  accountId?: number | null
  strategyId?: number | null
  year: string // 'YYYY'
}

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

export function getMonthlyBreakdown(filters: MonthlyBreakdownFilters) {
  const db = getDb()
  const clauses: string[] = ['date LIKE ?']
  const p: (string | number)[] = [`${filters.year}%`]
  if (filters.accountId) {
    clauses.push('account_id = ?')
    p.push(filters.accountId)
  }
  if (filters.strategyId) {
    clauses.push('strategy_id = ?')
    p.push(filters.strategyId)
  }
  const rows = db.prepare(`SELECT date, pnl FROM trades WHERE ${clauses.join(' AND ')}`).all(...p) as {
    date: string
    pnl: number
  }[]
  const buckets = Array.from({ length: 12 }, () => ({ pnl: 0, count: 0, wins: 0 }))
  for (const r of rows) {
    const m = Number(r.date.slice(5, 7)) - 1
    if (m < 0 || m > 11) continue
    buckets[m].pnl += r.pnl
    buckets[m].count += 1
    if (r.pnl > 0) buckets[m].wins += 1
  }
  return buckets.map((b, i) => ({
    month: `${filters.year}-${String(i + 1).padStart(2, '0')}`,
    label: MONTH_LABELS[i],
    pnl: round2(b.pnl),
    tradeCount: b.count,
    winRate: b.count ? round1((b.wins / b.count) * 100) : 0,
  }))
}

export interface FundedChallengeParams {
  profitTargetPct: number
  maxDailyLossPct: number
  maxOverallDrawdownPct: number
  riskPerTradePct: number
  tradingDaysRemaining: number
  accountId?: number | null
  strategyId?: number | null
  /** How the drawdown ceiling is checked. 'intraday' trails every tick; 'eod' only re-bases at day close. Default 'intraday' (matches the old behavior / a manual, no-firm-picked run). */
  drawdownMode?: 'intraday' | 'eod'
  /** How the daily loss limit (if any) is checked. Default 'intraday'. */
  dailyLossMode?: 'intraday' | 'eod'
  /**
   * A firm's payout-stage consistency cap (largest single day's profit ÷ total profit, as a %),
   * if you want passing paths checked against it too. Not an eval-stage gate for any currently
   * modeled firm (RULES.md confirms consistency is only enforced at the funded/payout stage for
   * both Apex and LucidPro) — so it never blocks a 'pass' outcome here. It only feeds
   * `consistencyBreachRate`, which tells you how often a profit run that clears the eval would
   * *also* fail to be payout-eligible on day one of being funded. Omit to skip this check.
   */
  consistencyPct?: number | null
}

export interface FundedChallengeResult {
  sampleSize: number
  passRate: number
  dailyLossBreachRate: number
  maxDrawdownBreachRate: number
  ranOutOfDaysRate: number
  /** Probability a path ends in an actual rule violation (daily-loss or drawdown breach) — the "probability of ruin" figure risk analysts benchmark against (industry rule of thumb: keep it under ~5%). */
  riskOfRuin: number
  medianDaysToPass: number | null
  p10DaysToPass: number | null
  p90DaysToPass: number | null
  /** Real (non-simulated) expectancy per trade from the logged R-multiples. */
  expectancyR: number
  expectancyPct: number
  /** Real (non-simulated) profit factor / win rate from the logged trade history feeding the bootstrap. */
  historicalProfitFactor: number
  historicalWinRate: number
  /** Distribution of profit factor across the simulated paths that actually passed (null if none passed). */
  simProfitFactor: { p10: number; median: number; p90: number } | null
  /** Distribution of the worst intra-run drawdown reached across all simulated paths, win or lose. */
  simMaxDrawdownPct: { median: number; p90: number }
  medianEndingEquityPct: number
  /**
   * Of the paths that passed, the % whose profit was concentrated enough on one day that it
   * would immediately fail the firm's payout consistency cap the moment they're funded (only
   * computed when `consistencyPct` was supplied — null otherwise). A high pass rate alongside a
   * high consistencyBreachRate means "you'll clear the eval, but you won't be able to cash out
   * until you trade more days" — the pass alone overstates how done you actually are.
   */
  consistencyBreachRate: number | null
  insufficientData: boolean
}

export function simulateFundedChallenge(params: FundedChallengeParams): FundedChallengeResult {
  const db = getDb()
  const clauses: string[] = []
  const p: (string | number)[] = []
  if (params.accountId) {
    clauses.push('account_id = ?')
    p.push(params.accountId)
  }
  if (params.strategyId) {
    clauses.push('strategy_id = ?')
    p.push(params.strategyId)
  }
  const finalWhere = clauses.length ? `WHERE ${clauses.join(' AND ')}` : ''
  const rows = db
    .prepare(`SELECT id, pnl, r_multiple, risk_per_trade, date FROM trades ${finalWhere} ORDER BY date ASC, id ASC`)
    .all(...p) as {
    id: number
    pnl: number
    r_multiple: number | null
    risk_per_trade: number | null
    date: string
  }[]

  // Group into real historical trading days (preserving each day's actual trade count and
  // intraday sequence) so the bootstrap resamples whole days as blocks rather than individual
  // trades in isolation — this keeps win/loss clustering and day-to-day trade-count variance
  // intact, which a plain i.i.d. resample of single R-multiples throws away.
  const dayMap = new Map<string, number[]>()
  const pooled: number[] = []
  for (const r of rows) {
    let rOut: number | null = null
    if (r.r_multiple !== null && r.r_multiple !== undefined) rOut = r.r_multiple
    else if (r.risk_per_trade) rOut = r.pnl / r.risk_per_trade
    if (rOut === null) continue
    pooled.push(rOut)
    const arr = dayMap.get(r.date)
    if (arr) arr.push(rOut)
    else dayMap.set(r.date, [rOut])
  }

  const insufficientData = pooled.length < 10
  let historicalDays: number[][] = [...dayMap.values()]
  if (insufficientData) {
    // not enough R-multiple / risk-sized history to bootstrap from — fall back to a neutral
    // placeholder distribution (spread across a few synthetic days) so the tool still returns a
    // (clearly-flagged) estimate
    const placeholder = [1, 1, -1, -1, 2, -1, 1, -1, 1.5, -1]
    pooled.push(...placeholder)
    historicalDays = [[1, 1], [-1, -1], [2, -1], [1, -1], [1.5, -1]]
  }

  const wins = pooled.filter((r) => r > 0)
  const losses = pooled.filter((r) => r < 0)
  const grossWinR = wins.reduce((s, r) => s + r, 0)
  const grossLossR = Math.abs(losses.reduce((s, r) => s + r, 0))
  const historicalProfitFactor = grossLossR === 0 ? (grossWinR > 0 ? 999 : 0) : grossWinR / grossLossR
  const historicalWinRate = round1((wins.length / pooled.length) * 100)
  const expectancyR = pooled.reduce((s, r) => s + r, 0) / pooled.length
  const expectancyPct = expectancyR * params.riskPerTradePct

  const drawdownMode = params.drawdownMode ?? 'intraday'
  const dailyLossMode = params.dailyLossMode ?? 'intraday'

  const N = 10000
  const days = Math.max(1, Math.min(Math.round(params.tradingDaysRemaining) || 1, 365))
  let passes = 0
  let dailyLossBreaches = 0
  let maxDrawdownBreaches = 0
  let ranOutOfDays = 0
  const daysToPass: number[] = []
  const simProfitFactors: number[] = []
  const simMaxDrawdownPcts: number[] = []
  const endingEquityPcts: number[] = []
  let consistencyBreachesAmongPasses = 0

  for (let sim = 0; sim < N; sim++) {
    let equityPct = 0
    let peakEquityPct = 0
    let eodPeakEquityPct = 0
    let outcome: 'pass' | 'dailyLoss' | 'maxDrawdown' | 'ranOut' = 'ranOut'
    let passDay = 0
    let grossWinPct = 0
    let grossLossPct = 0
    let pathMaxDrawdownPct = 0
    let bestDayPct = 0

    dayLoop: for (let d = 1; d <= days; d++) {
      const dayTrades = historicalDays[Math.floor(Math.random() * historicalDays.length)]
      let dailyPnlPct = 0

      for (const r of dayTrades) {
        const pnlPct = r * params.riskPerTradePct
        equityPct += pnlPct
        dailyPnlPct += pnlPct
        if (pnlPct > 0) grossWinPct += pnlPct
        else grossLossPct += -pnlPct
        peakEquityPct = Math.max(peakEquityPct, equityPct)

        if (drawdownMode === 'intraday') {
          const drawdownPct = peakEquityPct - equityPct
          pathMaxDrawdownPct = Math.max(pathMaxDrawdownPct, drawdownPct)
          if (drawdownPct >= params.maxOverallDrawdownPct) {
            outcome = 'maxDrawdown'
            break dayLoop
          }
        }
        if (dailyLossMode === 'intraday' && -dailyPnlPct >= params.maxDailyLossPct) {
          outcome = 'dailyLoss'
          break dayLoop
        }
        if (equityPct >= params.profitTargetPct) {
          outcome = 'pass'
          passDay = d
          // The day (and the path) ends here — this trade's running total is that day's real close, not a peak to beat.
          bestDayPct = Math.max(bestDayPct, dailyPnlPct)
          break dayLoop
        }
      }
      // The day traded to completion without an early stop — dailyPnlPct is now that day's closing P&L.
      bestDayPct = Math.max(bestDayPct, dailyPnlPct)

      if (drawdownMode === 'eod') {
        eodPeakEquityPct = Math.max(eodPeakEquityPct, equityPct)
        const eodDrawdownPct = eodPeakEquityPct - equityPct
        pathMaxDrawdownPct = Math.max(pathMaxDrawdownPct, eodDrawdownPct)
        if (eodDrawdownPct >= params.maxOverallDrawdownPct) {
          outcome = 'maxDrawdown'
          break dayLoop
        }
      }
      if (dailyLossMode === 'eod' && -dailyPnlPct >= params.maxDailyLossPct) {
        outcome = 'dailyLoss'
        break dayLoop
      }
    }

    if (outcome === 'pass') {
      passes++
      daysToPass.push(passDay)
      simProfitFactors.push(grossLossPct === 0 ? (grossWinPct > 0 ? 999 : 0) : grossWinPct / grossLossPct)
      if (params.consistencyPct != null && equityPct > 0 && (bestDayPct / equityPct) * 100 > params.consistencyPct) {
        consistencyBreachesAmongPasses++
      }
    } else if (outcome === 'dailyLoss') dailyLossBreaches++
    else if (outcome === 'maxDrawdown') maxDrawdownBreaches++
    else ranOutOfDays++

    simMaxDrawdownPcts.push(pathMaxDrawdownPct)
    endingEquityPcts.push(equityPct)
  }

  daysToPass.sort((a, b) => a - b)
  simProfitFactors.sort((a, b) => a - b)
  simMaxDrawdownPcts.sort((a, b) => a - b)
  endingEquityPcts.sort((a, b) => a - b)

  const percentileOf = (sorted: number[], pct: number) =>
    sorted.length ? sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * pct))] : null

  return {
    sampleSize: pooled.length,
    passRate: round1((passes / N) * 100),
    dailyLossBreachRate: round1((dailyLossBreaches / N) * 100),
    maxDrawdownBreachRate: round1((maxDrawdownBreaches / N) * 100),
    ranOutOfDaysRate: round1((ranOutOfDays / N) * 100),
    riskOfRuin: round1(((dailyLossBreaches + maxDrawdownBreaches) / N) * 100),
    medianDaysToPass: percentileOf(daysToPass, 0.5),
    p10DaysToPass: percentileOf(daysToPass, 0.1),
    p90DaysToPass: percentileOf(daysToPass, 0.9),
    expectancyR: round2(expectancyR),
    expectancyPct: round2(expectancyPct),
    historicalProfitFactor: round2(historicalProfitFactor),
    historicalWinRate,
    simProfitFactor: simProfitFactors.length
      ? {
          p10: round2(percentileOf(simProfitFactors, 0.1)!),
          median: round2(percentileOf(simProfitFactors, 0.5)!),
          p90: round2(percentileOf(simProfitFactors, 0.9)!),
        }
      : null,
    simMaxDrawdownPct: {
      median: round2(percentileOf(simMaxDrawdownPcts, 0.5) ?? 0),
      p90: round2(percentileOf(simMaxDrawdownPcts, 0.9) ?? 0),
    },
    medianEndingEquityPct: round2(percentileOf(endingEquityPcts, 0.5) ?? 0),
    consistencyBreachRate: params.consistencyPct != null && passes > 0 ? round1((consistencyBreachesAmongPasses / passes) * 100) : null,
    insufficientData,
  }
}

function* calendarValues(trades: TradeRow[]) {
  const byDate = new Map<string, number>()
  for (const t of trades) byDate.set(t.date, (byDate.get(t.date) ?? 0) + t.pnl)
  for (const v of byDate.values()) yield v
}

function round1(n: number) {
  return Math.round(n * 10) / 10
}
function round2(n: number) {
  return Math.round(n * 100) / 100
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

type StrategyTradeRow = TradeRow & { r_multiple: number | null; name: string; pair: string | null }

function strategyStats(trades: StrategyTradeRow[]) {
  const winRate = winRateOf(trades)
  const profitFactor = profitFactorOf(trades)
  const totalPnl = trades.reduce((s, t) => s + t.pnl, 0)
  const expectancy = trades.length ? totalPnl / trades.length : 0
  const wins = trades.filter((t) => t.pnl > 0)
  const losses = trades.filter((t) => t.pnl < 0)
  const avgWin = wins.length ? wins.reduce((s, t) => s + t.pnl, 0) / wins.length : 0
  const avgLoss = losses.length ? Math.abs(losses.reduce((s, t) => s + t.pnl, 0) / losses.length) : 0
  const rTrades = trades.filter((t) => t.r_multiple !== null && t.r_multiple !== undefined)
  const avgRMultiple = rTrades.length ? rTrades.reduce((s, t) => s + (t.r_multiple ?? 0), 0) / rTrades.length : 0
  return {
    tradeCount: trades.length,
    winRate: round1(winRate * 100),
    profitFactor: round2(profitFactor),
    expectancy: round2(expectancy),
    totalPnl: round2(totalPnl),
    avgRMultiple: round2(avgRMultiple),
    planAdherence: round1(planAdherenceOf(trades) * 100),
    avgWin: round2(avgWin),
    avgLoss: round2(avgLoss),
  }
}

export function getStrategyPerformance(): StrategyPerformance[] {
  const db = getDb()
  const strategies = db.prepare('SELECT id, name, description FROM strategies ORDER BY name ASC').all() as {
    id: number
    name: string
    description: string | null
  }[]
  return strategies.map((s) => {
    const trades = db
      .prepare('SELECT id, date, pnl, followed_plan, session, r_multiple, name, pair FROM trades WHERE strategy_id = ?')
      .all(s.id) as unknown as StrategyTradeRow[]
    return {
      id: s.id,
      name: s.name,
      description: s.description ?? '',
      ...strategyStats(trades),
    }
  })
}

export interface StrategyDetail {
  id: number
  name: string
  description: string
  stats: ReturnType<typeof strategyStats>
  equityCurve: { date: string; cumulativePnl: number }[]
  drawdown: { series: { date: string; drawdown: number }[]; maxDrawdown: number }
  dayOfWeek: ReturnType<typeof dayOfWeekBreakdownOf>
  trades: { id: number; date: string; name: string; pair: string | null; pnl: number; followed_plan: boolean }[]
}

export function getStrategyDetail(strategyId: number): StrategyDetail | null {
  const db = getDb()
  const strategy = db.prepare('SELECT id, name, description FROM strategies WHERE id = ?').get(strategyId) as
    | { id: number; name: string; description: string | null }
    | undefined
  if (!strategy) return null

  const trades = db
    .prepare(
      'SELECT id, date, pnl, followed_plan, session, r_multiple, name, pair FROM trades WHERE strategy_id = ? ORDER BY date ASC'
    )
    .all(strategyId) as unknown as StrategyTradeRow[]

  const equityCurve = equityCurveOf(trades)
  const { series: drawdownSeries, maxDrawdown } = drawdownOf(equityCurve)

  return {
    id: strategy.id,
    name: strategy.name,
    description: strategy.description ?? '',
    stats: strategyStats(trades),
    equityCurve,
    drawdown: { series: drawdownSeries, maxDrawdown: round2(maxDrawdown) },
    dayOfWeek: dayOfWeekBreakdownOf(trades),
    trades: trades
      .slice(-50)
      .reverse()
      .map((t) => ({ id: t.id, date: t.date, name: t.name, pair: t.pair, pnl: t.pnl, followed_plan: !!t.followed_plan })),
  }
}
