import type { Confluence, Trade } from './types'
import type { PayoutRules } from './propFirmPresets'
import { MARKET_CONTEXT_PACK, groupOf, type MarketContextGroup } from './marketContext'

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
  /** % of bootstrapped cycles that cleared the profit goal and the consistency cap within `horizonDays` trading days. */
  successRate: number
  /** Median trading days to clear them, among the cycles that did. */
  medianDaysToClear: number | null
  horizonDays: number
}

/**
 * LucidPro-style: a payout cycle has no fixed length and no minimum days (Prop Firm Rulebook §3.8.1), so this
 * bootstraps real daily outcomes day by day until the cycle's profit goal and the consistency cap are both met,
 * giving up after `horizonDays` trading days. The buffer (balance above the initial trail balance) is a separate
 * gate that this cadence estimate does not include.
 */
export function bootstrapCycleSuccess(
  dailyPnls: number[],
  payout: PayoutRules,
  consistencyCapPct: number | null,
  paths = 3000,
  horizonDays = 60,
): CycleStats | null {
  if (payout.minProfitGoalPerCycle == null || dailyPnls.length === 0) return null
  const goal = payout.minProfitGoalPerCycle
  const daysToClear: number[] = []
  for (let i = 0; i < paths; i++) {
    let cyclePnl = 0
    let bestDay = 0
    for (let d = 1; d <= horizonDays; d++) {
      const pnl = dailyPnls[Math.floor(Math.random() * dailyPnls.length)]
      cyclePnl += pnl
      bestDay = Math.max(bestDay, pnl)
      const consistencyOk = consistencyCapPct == null || (cyclePnl > 0 && bestDay / cyclePnl <= consistencyCapPct / 100)
      if (cyclePnl > 0 && cyclePnl >= goal && consistencyOk) {
        daysToClear.push(d)
        break
      }
    }
  }
  daysToClear.sort((a, b) => a - b)
  return {
    successRate: (daysToClear.length / paths) * 100,
    medianDaysToClear: daysToClear.length ? daysToClear[Math.floor(daysToClear.length / 2)] : null,
    horizonDays,
  }
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
    // Break-evens count toward the tag's trade count and expectancy, but not its win rate.
    const decided = ts.filter((t) => !t.break_even && t.pnl !== 0)
    const wins = decided.filter((t) => t.pnl > 0).length
    const expectancy = ts.reduce((s, t) => s + t.pnl, 0) / ts.length
    rows.push({
      id,
      name,
      count: ts.length,
      winRate: decided.length ? Math.round((wins / decided.length) * 1000) / 10 : 0,
      expectancy: Math.round(expectancy * 100) / 100,
    })
  }
  return rows.sort((a, b) => b.expectancy - a.expectancy)
}

export interface MarketContextEdge {
  group: MarketContextGroup
  /** The pack tags actually used on these trades, ranked by expectancy. */
  tags: (ConfluenceEdge & { credible: boolean })[]
}

/**
 * Below this a win rate is an anecdote, not an edge — a tag with two trades on it can read 100%.
 * Deliberately looser than `MIN_SAMPLE` (20): market-context tags fragment the sample across many
 * buckets, so demanding 20 per condition would hide everything, but they still get flagged.
 */
export const MIN_CONTEXT_SAMPLE = 8

/**
 * `confluenceEdgeBreakdown` restricted to the market-context pack and bucketed by condition group,
 * so the ranking compares like with like — gap shapes against gap shapes, not against a user's own
 * setup criteria. Groups with no tagged trades are dropped.
 */
export function marketContextEdge(trades: Trade[], confluences: Confluence[]): MarketContextEdge[] {
  const all = confluenceEdgeBreakdown(trades, confluences)
  const byGroup = new Map<MarketContextGroup, (ConfluenceEdge & { credible: boolean })[]>()

  for (const row of all) {
    const group = groupOf(row.name)
    if (!group) continue
    if (!byGroup.has(group)) byGroup.set(group, [])
    byGroup.get(group)!.push({ ...row, credible: row.count >= MIN_CONTEXT_SAMPLE })
  }

  return MARKET_CONTEXT_PACK.map((g) => ({ group: g.group, tags: byGroup.get(g.group) ?? [] })).filter(
    (g) => g.tags.length > 0
  )
}
