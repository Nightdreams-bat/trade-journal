// The `.ts` extension lets `node --test` load this module directly (see payoutEligibility.test.ts).
import { FUNDED_MLL_LOCK_OFFSET, money, payoutCapFor, type PropFirmPreset } from './propFirmPresets.ts'

export interface DailyLedgerRow {
  date: string
  pnl: number
  /** Present for manually-entered rows so the UI can offer a per-row delete button. */
  id?: string
}

export interface LedgerRow extends DailyLedgerRow {
  /** Closing balance that day, net of payouts dated before it. */
  cumulativeBalance: number
  qualifies: boolean
}

export interface FundedMllState {
  /** Current max loss limit (balance floor), from the closing balances in the ledger. */
  level: number
  /** True once the floor has locked at start + $100. */
  locked: boolean
  /** The balance at which the floor locks (Lucid "Initial Trail Balance", Apex "peak that triggers the stop"). */
  lockTriggerBalance: number
  /** First date whose closing balance was at or below the floor, or null. */
  breachedOn: string | null
  /** Floor right after the next request is submitted (LucidFlex snaps it to the locked level). */
  afterRequest: number
  /**
   * True when the program trails intraday on open P&L (Apex Intraday): a daily ledger cannot see
   * intraday peaks, so the real floor may be higher than `level`.
   */
  estimatedFromCloses: boolean
}

export interface EligibilityResult {
  dailyRows: LedgerRow[]
  currentBalance: number
  /** Current balance − starting balance. */
  accountProfit: number
  totalPnlAllTime: number
  totalWithdrawn: number
  lastPayoutDate: string | null
  profitSinceLastPayout: number
  bestDaySinceLastPayout: number
  /** Net profit since the last payout is above $0 (needed on every program here). */
  cycleProfitOk: boolean
  consistencyRatioPct: number | null
  /** Null when the program has no funded consistency rule. */
  consistencyOk: boolean | null
  qualifyingDaysCount: number | null
  qualifyingDaysNeeded: number | null
  qualifyingOk: boolean | null
  /** Profit goal for the cycle (LucidPro), or null. */
  profitGoal: number | null
  profitGoalOk: boolean | null
  /** Null when the program has no buffer / safety net (LucidFlex). */
  safetyNetOk: boolean | null
  /** Lowest balance at which the minimum request becomes possible. */
  minBalanceToRequest: number
  minBalanceOk: boolean
  /** The largest request allowed right now reaches the program's minimum request. */
  minPayoutMet: boolean
  payoutsUsed: number
  nextPayoutNumber: number
  payoutsRemaining: number | null
  payoutCapForNextRequest: number | null
  /** % of profit cap in dollars (LucidFlex: 50% of account profit), or null. */
  pctOfProfitLimit: number | null
  maxRequestableNow: number
  mll: FundedMllState
  eligible: boolean
  blockers: string[]
}

/**
 * Checks a funded account's next payout against a preset's payout gates.
 *
 * Conventions: `tier` is the starting balance. A payout dated D is taken after D's close, so D's P&L
 * belongs to the cycle it pays out and the next cycle starts the following day. The ledger is daily,
 * so an intraday touch of the max loss limit that recovered by the close cannot be seen here.
 */
export function computeEligibility(
  entries: DailyLedgerRow[],
  payoutLog: { date: string; amount: number }[],
  paStartDate: string,
  tier: number,
  preset: PropFirmPreset,
): EligibilityResult {
  const rules = preset.payout
  const dayQualifies = (pnl: number) => (rules.minDailyProfit != null ? pnl >= rules.minDailyProfit : pnl > 0)

  const sortedEntries = [...entries].filter((e) => e.date >= paStartDate).sort((a, b) => a.date.localeCompare(b.date))
  const sortedPayouts = [...payoutLog].sort((a, b) => a.date.localeCompare(b.date))

  // Walk the closes once: balance net of payouts, and the funded max loss limit (EOD trail, then lock at start + $100).
  const lock = tier + FUNDED_MLL_LOCK_OFFSET
  const lockTriggerBalance = tier + preset.maxDrawdown + FUNDED_MLL_LOCK_OFFSET
  let floor = tier - preset.maxDrawdown
  let highWater = tier
  let balance = tier
  let breachedOn: string | null = null
  let payoutIdx = 0
  const applyPayoutsBefore = (date: string | null) => {
    while (payoutIdx < sortedPayouts.length && (date == null || sortedPayouts[payoutIdx].date < date)) {
      balance -= sortedPayouts[payoutIdx].amount
      if (rules.mllSnapsToLockOnPayout) floor = Math.max(floor, lock)
      payoutIdx++
    }
  }
  const dailyRows: LedgerRow[] = []
  for (const e of sortedEntries) {
    applyPayoutsBefore(e.date)
    balance += e.pnl
    if (breachedOn == null && balance <= floor) breachedOn = e.date
    highWater = Math.max(highWater, balance)
    if (floor < lock) floor = Math.min(Math.max(floor, highWater - preset.maxDrawdown), lock)
    dailyRows.push({ ...e, cumulativeBalance: balance, qualifies: dayQualifies(e.pnl) })
  }
  applyPayoutsBefore(null)

  const totalPnlAllTime = sortedEntries.reduce((s, e) => s + e.pnl, 0)
  const totalWithdrawn = payoutLog.reduce((s, p) => s + p.amount, 0)
  const currentBalance = tier + totalPnlAllTime - totalWithdrawn
  const accountProfit = currentBalance - tier

  const lastPayoutDate = sortedPayouts.length ? sortedPayouts[sortedPayouts.length - 1].date : null
  const windowEntries = sortedEntries.filter((e) => (lastPayoutDate ? e.date > lastPayoutDate : true))
  const profitSinceLastPayout = windowEntries.reduce((s, e) => s + e.pnl, 0)
  const bestDaySinceLastPayout = windowEntries.length ? Math.max(0, ...windowEntries.map((e) => e.pnl)) : 0
  const cycleProfitOk = profitSinceLastPayout > 0

  // Consistency: largest day ÷ net profit since the last payout (Apex §2.11, Lucid §3.7). Undefined — so not met — without net profit.
  // (best × 100) / profit rather than (best / profit) × 100, so an exact boundary such as 1,500 / 3,750 = 40% stays exact.
  const consistencyRatioPct = cycleProfitOk ? (bestDaySinceLastPayout * 100) / profitSinceLastPayout : null
  const consistencyOk =
    preset.consistencyPct == null ? null : consistencyRatioPct != null && consistencyRatioPct <= preset.consistencyPct + 1e-9

  let qualifyingDaysCount: number | null = null
  let qualifyingDaysNeeded: number | null = null
  let qualifyingOk: boolean | null = null
  if (rules.minQualifyingDays != null) {
    qualifyingDaysNeeded = rules.minQualifyingDays
    qualifyingDaysCount = windowEntries.filter((e) => dayQualifies(e.pnl)).length
    qualifyingOk = qualifyingDaysCount >= qualifyingDaysNeeded
  }

  const profitGoal = rules.minProfitGoalPerCycle
  const profitGoalOk = profitGoal == null ? null : profitSinceLastPayout >= profitGoal

  const safetyNetOk = rules.safetyNet == null ? null : currentBalance >= rules.safetyNet

  const payoutsUsed = payoutLog.length
  const nextPayoutNumber = payoutsUsed + 1
  const payoutsRemaining = preset.maxPayouts != null ? Math.max(0, preset.maxPayouts - payoutsUsed) : null
  const payoutCapForNextRequest = payoutCapFor(preset, nextPayoutNumber)

  // Request size: the lowest of the balance above the buffer, the % of profit cap and the $ cap for this payout number.
  const pctOfProfitLimit = rules.maxRequestPctOfProfit != null ? Math.max(0, (rules.maxRequestPctOfProfit / 100) * accountProfit) : null
  const limits: number[] = []
  if (rules.safetyNet != null) limits.push(Math.max(0, currentBalance - rules.safetyNet))
  if (pctOfProfitLimit != null) limits.push(pctOfProfitLimit)
  if (payoutCapForNextRequest != null) limits.push(payoutCapForNextRequest)
  const maxRequestableNow = limits.length ? Math.min(...limits) : Math.max(0, accountProfit)

  const minReq = rules.minPayoutRequest
  const balanceFloors: number[] = []
  if (rules.safetyNet != null) balanceFloors.push(rules.safetyNet + minReq)
  if (rules.maxRequestPctOfProfit != null) balanceFloors.push(tier + minReq / (rules.maxRequestPctOfProfit / 100))
  const minBalanceToRequest = balanceFloors.length ? Math.max(...balanceFloors) : tier + minReq
  const minBalanceOk = currentBalance >= minBalanceToRequest
  const minPayoutMet = maxRequestableNow >= minReq

  const mll: FundedMllState = {
    level: floor,
    locked: floor >= lock,
    lockTriggerBalance,
    breachedOn,
    afterRequest: rules.mllSnapsToLockOnPayout ? Math.max(floor, lock) : floor,
    estimatedFromCloses: preset.drawdownMode === 'intraday',
  }

  const blockers: string[] = []
  if (breachedOn != null) {
    blockers.push(`The closing balance on ${breachedOn} was at or below the max loss limit: the account would have been closed.`)
  }
  if (payoutsRemaining === 0) {
    blockers.push(
      preset.afterMaxPayouts === 'closed'
        ? `All ${preset.maxPayouts} payouts on this account have been used: it would be closed.`
        : `All ${preset.maxPayouts} sim-funded payouts have been used: the account moves to Lucid's live review.`,
    )
  }
  if (safetyNetOk === false) {
    blockers.push(`Balance ${money(Math.round(currentBalance))} is below the ${money(rules.safetyNet)} buffer.`)
  } else if (!minBalanceOk) {
    blockers.push(
      rules.safetyNet == null && rules.maxRequestPctOfProfit != null
        ? `${rules.maxRequestPctOfProfit}% of profit must reach the ${money(minReq)} minimum request: balance needs to reach ${money(Math.ceil(minBalanceToRequest))}.`
        : `Balance needs to reach ${money(Math.ceil(minBalanceToRequest))} before a ${money(minReq)} request is possible.`,
    )
  } else if (!minPayoutMet) {
    blockers.push(`The largest request allowed now (${money(Math.floor(maxRequestableNow))}) is below the ${money(minReq)} minimum.`)
  }
  if (!cycleProfitOk) {
    blockers.push(`Net profit since the last payout (${money(Math.round(profitSinceLastPayout))}) must be above $0.`)
  }
  if (profitGoalOk === false) {
    blockers.push(`Profit since the last payout (${money(Math.round(profitSinceLastPayout))}) is below the ${money(profitGoal)} profit goal for the cycle.`)
  }
  if (consistencyRatioPct != null && consistencyOk === false) {
    blockers.push(`Best single day is ${consistencyRatioPct.toFixed(0)}% of profit since the last payout: over the ${preset.consistencyPct}% consistency cap.`)
  }
  if (qualifyingOk === false) {
    blockers.push(
      `Only ${qualifyingDaysCount}/${qualifyingDaysNeeded} qualifying day(s)${rules.minDailyProfit != null ? ` of ${money(rules.minDailyProfit)}+` : ''} since the last payout.`,
    )
  }

  return {
    dailyRows,
    currentBalance,
    accountProfit,
    totalPnlAllTime,
    totalWithdrawn,
    lastPayoutDate,
    profitSinceLastPayout,
    bestDaySinceLastPayout,
    cycleProfitOk,
    consistencyRatioPct,
    consistencyOk,
    qualifyingDaysCount,
    qualifyingDaysNeeded,
    qualifyingOk,
    profitGoal,
    profitGoalOk,
    safetyNetOk,
    minBalanceToRequest,
    minBalanceOk,
    minPayoutMet,
    payoutsUsed,
    nextPayoutNumber,
    payoutsRemaining,
    payoutCapForNextRequest,
    pctOfProfitLimit,
    maxRequestableNow,
    mll,
    eligible: blockers.length === 0,
    blockers,
  }
}
