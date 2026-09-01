import type { PropFirmPreset } from './propFirmPresets'

export interface DailyLedgerRow {
  date: string
  pnl: number
  /** Present for manually-entered rows so the UI can offer a per-row delete button. */
  id?: string
}

export interface LedgerRow extends DailyLedgerRow {
  cumulativeBalance: number
  qualifies: boolean
}

export interface EligibilityResult {
  dailyRows: LedgerRow[]
  currentBalance: number
  totalPnlAllTime: number
  totalWithdrawn: number
  lastPayoutDate: string | null
  profitSinceLastPayout: number
  bestDaySinceLastPayout: number
  consistencyRatioPct: number | null
  consistencyOk: boolean | null
  qualifyingDaysCount: number | null
  qualifyingDaysNeeded: number | null
  qualifyingOk: boolean | null
  cycleDaysElapsed: number | null
  cycleDaysNeeded: number | null
  cycleOk: boolean | null
  safetyNetOk: boolean
  minBalanceToRequest: number
  minBalanceOk: boolean
  minPayoutMet: boolean
  payoutsUsed: number
  nextPayoutNumber: number
  payoutsRemaining: number | null
  payoutCapForNextRequest: number | null
  maxRequestableNow: number
  eligible: boolean
  blockers: string[]
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10)
}

function daysBetween(a: string, b: string): number {
  const ms = new Date(`${b}T00:00:00`).getTime() - new Date(`${a}T00:00:00`).getTime()
  return Math.max(0, Math.round(ms / 86400000))
}

export function computeEligibility(
  entries: DailyLedgerRow[],
  payoutLog: { date: string; amount: number }[],
  paStartDate: string,
  tier: number,
  preset: PropFirmPreset,
): EligibilityResult {
  const sortedEntries = [...entries].filter((e) => e.date >= paStartDate).sort((a, b) => a.date.localeCompare(b.date))

  let running = tier
  const dailyRows: LedgerRow[] = sortedEntries.map((e) => {
    running += e.pnl
    const qualifies = preset.payout.minDailyProfit != null ? e.pnl >= preset.payout.minDailyProfit : e.pnl > 0
    return { ...e, cumulativeBalance: running, qualifies }
  })

  const totalPnlAllTime = sortedEntries.reduce((s, e) => s + e.pnl, 0)
  const totalWithdrawn = payoutLog.reduce((s, p) => s + p.amount, 0)
  const currentBalance = tier + totalPnlAllTime - totalWithdrawn

  const sortedPayouts = [...payoutLog].sort((a, b) => a.date.localeCompare(b.date))
  const lastPayoutDate = sortedPayouts.length ? sortedPayouts[sortedPayouts.length - 1].date : null

  const windowEntries = sortedEntries.filter((e) => (lastPayoutDate ? e.date > lastPayoutDate : true))
  const profitSinceLastPayout = windowEntries.reduce((s, e) => s + e.pnl, 0)
  const bestDaySinceLastPayout = windowEntries.length ? Math.max(0, ...windowEntries.map((e) => e.pnl)) : 0

  const consistencyRatioPct = profitSinceLastPayout > 0 ? (bestDaySinceLastPayout / profitSinceLastPayout) * 100 : null
  const consistencyOk = consistencyRatioPct == null ? null : consistencyRatioPct <= preset.consistencyPct

  let qualifyingDaysCount: number | null = null
  let qualifyingDaysNeeded: number | null = null
  let qualifyingOk: boolean | null = null
  if (preset.payout.minQualifyingDays != null) {
    qualifyingDaysNeeded = preset.payout.minQualifyingDays
    qualifyingDaysCount = windowEntries.filter((e) =>
      preset.payout.minDailyProfit != null ? e.pnl >= preset.payout.minDailyProfit : e.pnl > 0,
    ).length
    qualifyingOk = qualifyingDaysCount >= qualifyingDaysNeeded
  }

  let cycleDaysElapsed: number | null = null
  let cycleDaysNeeded: number | null = null
  let cycleOk: boolean | null = null
  if (preset.payout.cycleDays != null && preset.payout.minProfitGoalPerCycle != null) {
    const anchor = lastPayoutDate ?? paStartDate
    cycleDaysElapsed = daysBetween(anchor, todayIso())
    cycleDaysNeeded = preset.payout.cycleDays
    cycleOk = cycleDaysElapsed >= cycleDaysNeeded && profitSinceLastPayout >= preset.payout.minProfitGoalPerCycle
  }

  const safetyNetOk = currentBalance >= preset.payout.safetyNet
  const minBalanceToRequest = preset.payout.safetyNet + preset.payout.minPayoutRequest
  const minBalanceOk = currentBalance >= minBalanceToRequest
  const minPayoutMet = profitSinceLastPayout >= preset.payout.minPayoutRequest

  const payoutsUsed = payoutLog.length
  const nextPayoutNumber = payoutsUsed + 1
  const payoutsRemaining = preset.maxPayouts != null ? Math.max(0, preset.maxPayouts - payoutsUsed) : null
  const payoutCapForNextRequest =
    preset.payoutCapSchedule != null
      ? (preset.payoutCapSchedule[Math.min(nextPayoutNumber, preset.payoutCapSchedule.length) - 1] ?? null)
      : null

  const availableAboveSafetyNet = Math.max(0, currentBalance - preset.payout.safetyNet)
  const maxRequestableNow =
    payoutCapForNextRequest != null ? Math.min(availableAboveSafetyNet, payoutCapForNextRequest) : availableAboveSafetyNet

  const blockers: string[] = []
  if (!safetyNetOk) {
    blockers.push(`Balance is below the required safety net (need ${preset.payout.safetyNet}).`)
  } else if (!minBalanceOk) {
    blockers.push(`Balance needs to reach ${minBalanceToRequest} before a payout can be requested.`)
  }
  if (!minPayoutMet) {
    blockers.push(`Profit since the last payout (${Math.round(profitSinceLastPayout)}) is below the ${preset.payout.minPayoutRequest} minimum request.`)
  }
  if (consistencyRatioPct != null && !consistencyOk) {
    blockers.push(`Best single day is ${consistencyRatioPct.toFixed(0)}% of total profit — over the ${preset.consistencyPct}% consistency cap.`)
  }
  if (qualifyingOk === false) {
    blockers.push(`Only ${qualifyingDaysCount}/${qualifyingDaysNeeded} qualifying day(s) logged since the last payout.`)
  }
  if (cycleOk === false) {
    blockers.push(
      `Payout cycle not cleared yet (${cycleDaysElapsed}/${cycleDaysNeeded} days elapsed, ${Math.round(profitSinceLastPayout)}/${preset.payout.minProfitGoalPerCycle} profit goal).`,
    )
  }
  if (payoutsRemaining === 0) {
    blockers.push(`All ${preset.maxPayouts} payouts on this account have already been used — it would be closed.`)
  }

  return {
    dailyRows,
    currentBalance,
    totalPnlAllTime,
    totalWithdrawn,
    lastPayoutDate,
    profitSinceLastPayout,
    bestDaySinceLastPayout,
    consistencyRatioPct,
    consistencyOk,
    qualifyingDaysCount,
    qualifyingDaysNeeded,
    qualifyingOk,
    cycleDaysElapsed,
    cycleDaysNeeded,
    cycleOk,
    safetyNetOk,
    minBalanceToRequest,
    minBalanceOk,
    minPayoutMet,
    payoutsUsed,
    nextPayoutNumber,
    payoutsRemaining,
    payoutCapForNextRequest,
    maxRequestableNow,
    eligible: blockers.length === 0,
    blockers,
  }
}
