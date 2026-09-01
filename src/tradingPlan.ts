import type { Confluence, Trade } from './types'
import type { PayoutRules } from './propFirmPresets'

function rMultipleOf(t: Trade): number | null {
  return t.r_multiple != null ? t.r_multiple : t.risk_per_trade ? t.pnl / t.risk_per_trade : null
}

/**
 * Groups a strategy's real trades by date and converts each day's outcome into
 * a dollar P&L "as if" traded on the given account size at the given risk per
 * trade — the same normalization the app's existing bootstrap simulator uses
 * (R-multiple * risk% of account), so a backtested or small-size strategy can
 * be projected onto a real prop account size for planning purposes.
 */
export function normalizedDailyPnls(trades: Trade[], riskPerTradePct: number, tier: number): number[] {
  const byDate = new Map<string, number>()
  for (const t of trades) {
    const r = rMultipleOf(t)
    if (r == null) continue
    const dollarPnl = r * (riskPerTradePct / 100) * tier
    byDate.set(t.date, (byDate.get(t.date) ?? 0) + dollarPnl)
  }
  return [...byDate.values()]
}

export interface QualifyingDayStats {
  rate: number
  avgTradingDaysToPayout: number | null
}

/** Apex-style: how often a day clears the minimum-daily-profit bar, and how many trading days it typically takes to bank enough qualifying days for a payout. */
export function qualifyingDayStats(dailyPnls: number[], payout: PayoutRules): QualifyingDayStats | null {
  if (payout.minDailyProfit == null || payout.minQualifyingDays == null || dailyPnls.length === 0) return null
  const qualifying = dailyPnls.filter((p) => p >= payout.minDailyProfit!).length
  const rate = qualifying / dailyPnls.length
  return {
    rate,
    avgTradingDaysToPayout: rate > 0 ? payout.minQualifyingDays / rate : null,
  }
}

export interface CycleStats {
  successRate: number
  avgPnlPerCycle: number
}

/** Lucid Pro-style: bootstraps fixed-length payout cycles from real daily outcomes and checks profit-goal + consistency-cap together. */
export function bootstrapCycleSuccess(
  dailyPnls: number[],
  payout: PayoutRules,
  consistencyCapPct: number,
  paths = 3000,
): CycleStats | null {
  if (payout.cycleDays == null || payout.minProfitGoalPerCycle == null || dailyPnls.length === 0) return null
  let successes = 0
  let total = 0
  for (let i = 0; i < paths; i++) {
    const days: number[] = []
    for (let d = 0; d < payout.cycleDays; d++) {
      days.push(dailyPnls[Math.floor(Math.random() * dailyPnls.length)])
    }
    const cyclePnl = days.reduce((s, v) => s + v, 0)
    total += cyclePnl
    if (cyclePnl <= 0) continue
    const bestDay = Math.max(...days)
    const consistencyOk = bestDay / cyclePnl <= consistencyCapPct / 100
    if (cyclePnl >= payout.minProfitGoalPerCycle && consistencyOk) successes++
  }
  return { successRate: (successes / paths) * 100, avgPnlPerCycle: total / paths }
}

/** Minimum trade count before a stats-derived recommendation is trusted rather than shown as "still gathering data." */
export const MIN_SAMPLE = 20

/**
 * Kelly criterion suggested risk-per-trade %, derived from the strategy's own win rate and
 * payoff ratio (avgWin / avgLoss) rather than assumed numbers. Negative edge clamps to 0 —
 * Kelly never recommends risking money on a strategy with no statistical edge.
 */
export function kellyPercent(winRatePct: number, avgWin: number, avgLoss: number): number {
  if (avgLoss <= 0) return 0
  const w = winRatePct / 100
  const b = avgWin / avgLoss
  const kelly = w - (1 - w) / b
  return Math.max(0, kelly * 100)
}

export interface SqnResult {
  sqn: number
  n: number
  label: 'poor' | 'below average' | 'average' | 'good' | 'excellent' | 'superb'
}

/**
 * Van Tharp's System Quality Number: mean(R) / stdDev(R) * sqrt(n). Unlike raw expectancy,
 * SQN factors in *consistency* of R-multiples and sample size, so it separates "real edge"
 * from "a few lucky trades" — a high average R with wild variance scores lower than a
 * smaller, steadier edge.
 */
export function systemQualityNumber(trades: Trade[]): SqnResult | null {
  const rs = trades.map(rMultipleOf).filter((r): r is number => r != null)
  const n = rs.length
  if (n < 2) return null
  const mean = rs.reduce((s, r) => s + r, 0) / n
  const variance = rs.reduce((s, r) => s + (r - mean) ** 2, 0) / (n - 1)
  const stdDev = Math.sqrt(variance)
  const sqn = stdDev === 0 ? 0 : (mean / stdDev) * Math.sqrt(n)
  const label: SqnResult['label'] =
    sqn < 1.0 ? 'poor' : sqn < 1.6 ? 'below average' : sqn < 2.0 ? 'average' : sqn < 2.5 ? 'good' : sqn < 3.0 ? 'excellent' : 'superb'
  return { sqn: Math.round(sqn * 100) / 100, n, label }
}

export interface StreakStats {
  maxWinStreak: number
  maxLossStreak: number
  currentStreak: number
  currentType: 'win' | 'loss' | null
}

/** Longest and current win/loss streaks, in trade-date order. Break-even trades neither extend nor break a streak. */
export function streakStats(trades: Trade[]): StreakStats | null {
  const ordered = [...trades]
    .filter((t) => !t.break_even && t.pnl !== 0)
    .sort((a, b) => a.date.localeCompare(b.date) || a.id - b.id)
  if (ordered.length === 0) return null

  let maxWin = 0
  let maxLoss = 0
  let run = 0
  let runType: 'win' | 'loss' | null = null
  for (const t of ordered) {
    const type: 'win' | 'loss' = t.pnl > 0 ? 'win' : 'loss'
    if (type === runType) {
      run++
    } else {
      runType = type
      run = 1
    }
    if (type === 'win') maxWin = Math.max(maxWin, run)
    else maxLoss = Math.max(maxLoss, run)
  }
  return { maxWinStreak: maxWin, maxLossStreak: maxLoss, currentStreak: run, currentType: runType }
}

export interface ConfluenceEdge {
  id: number
  name: string
  count: number
  winRate: number
  expectancy: number
}

/**
 * Ranks the confluences actually tagged on these trades by dollar expectancy per trade —
 * this is what tells you which parts of a strategy carry its edge and which are along for
 * the ride. A trade tagged with multiple confluences counts toward each of them.
 */
export function confluenceEdgeBreakdown(trades: Trade[], confluences: Confluence[]): ConfluenceEdge[] {
  const byId = new Map(confluences.map((c) => [c.id, c.name]))
  const grouped = new Map<number, Trade[]>()
  for (const t of trades) {
    for (const cid of t.confluence_ids) {
      if (!grouped.has(cid)) grouped.set(cid, [])
      grouped.get(cid)!.push(t)
    }
  }
  const rows: ConfluenceEdge[] = []
  for (const [id, ts] of grouped) {
    const name = byId.get(id)
    if (!name) continue
    const wins = ts.filter((t) => t.pnl > 0).length
    const expectancy = ts.reduce((s, t) => s + t.pnl, 0) / ts.length
    rows.push({ id, name, count: ts.length, winRate: Math.round((wins / ts.length) * 1000) / 10, expectancy: Math.round(expectancy * 100) / 100 })
  }
  return rows.sort((a, b) => b.expectancy - a.expectancy)
}
