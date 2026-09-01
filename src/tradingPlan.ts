import type { Trade } from './types'
import type { PayoutRules } from './propFirmPresets'

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
    const r = t.r_multiple != null ? t.r_multiple : t.risk_per_trade ? t.pnl / t.risk_per_trade : null
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
