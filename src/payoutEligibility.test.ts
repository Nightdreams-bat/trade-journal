/**
 * Unit tests for the payout-eligibility gates and the Lucid presets.
 * Run: node --test src/payoutEligibility.test.ts   (Node 22.6+: add --experimental-strip-types if needed)
 *
 * Expected values come from the Prop Firm Rulebook, verified 3 Sep 2026: §3.3 (eval), §3.4–3.5 (funded MLL),
 * §3.7 (consistency), §3.8.1 (LucidPro payouts), §3.8.2 (LucidFlex payouts), §3.10 (5 payouts, then live).
 */
import test from 'node:test'
import assert from 'node:assert/strict'
import { computeEligibility, type DailyLedgerRow } from './payoutEligibility.ts'
import { getPreset, presetToSimParams, PROP_FIRM_TIERS, type PropTier } from './propFirmPresets.ts'

const START = '2026-01-01'

/** Consecutive trading days from 2026-01-02 with the given P&Ls. */
function days(pnls: number[], firstDay = 2): DailyLedgerRow[] {
  return pnls.map((pnl, i) => ({ date: `2026-01-${String(firstDay + i).padStart(2, '0')}`, pnl }))
}

const flex50 = getPreset('lucid_flex', 50000)
const pro50 = getPreset('lucid_pro', 50000)

// ---------------------------------------------------------------------------
// Presets
// ---------------------------------------------------------------------------

test('Lucid eval targets and MLL match §3.3, the same on Pro and Flex', () => {
  const expected: Record<PropTier, [number, number]> = {
    25000: [1250, 1000],
    50000: [3000, 2000],
    100000: [6000, 3000],
    150000: [9000, 4500],
  }
  for (const tier of PROP_FIRM_TIERS) {
    for (const v of ['lucid_pro', 'lucid_flex'] as const) {
      const p = getPreset(v, tier)
      assert.deepEqual([p.profitTarget, p.maxDrawdown], expected[tier], `${v} ${tier}`)
      assert.equal(p.maxDays, null)
      assert.equal(p.dailyLossLimit, null, 'DLL is optional and modelled as off')
      assert.equal(p.payoutSplitPct, 90)
      assert.equal(p.maxPayouts, 5)
      assert.equal(p.afterMaxPayouts, 'live_review')
      assert.equal(p.payout.minPayoutRequest, 500)
    }
  }
})

test('LucidFlex payout rules match §3.8.2', () => {
  const minDay: Record<PropTier, number> = { 25000: 100, 50000: 150, 100000: 200, 150000: 250 }
  const cap: Record<PropTier, number> = { 25000: 1000, 50000: 2000, 100000: 2500, 150000: 3000 }
  for (const tier of PROP_FIRM_TIERS) {
    const p = getPreset('lucid_flex', tier)
    assert.equal(p.payout.minDailyProfit, minDay[tier])
    assert.equal(p.payout.minQualifyingDays, 5)
    assert.equal(p.payout.safetyNet, null, 'no buffer')
    assert.equal(p.payout.minProfitGoalPerCycle, null)
    assert.equal(p.payout.maxRequestPctOfProfit, 50)
    assert.deepEqual(p.payoutCapSchedule, [cap[tier]], 'cap does not rise with payout number')
    assert.equal(p.payout.mllSnapsToLockOnPayout, true)
    assert.equal(p.consistencyPct, null, 'no funded consistency')
    assert.equal(p.evalConsistencyPct, 50)
  }
})

test('LucidPro payout rules match §3.8.1', () => {
  const goal: Record<PropTier, number> = { 25000: 250, 50000: 500, 100000: 750, 150000: 1000 }
  const buffer: Record<PropTier, number> = { 25000: 26100, 50000: 52100, 100000: 103100, 150000: 154600 }
  const caps: Record<PropTier, number[]> = { 25000: [1000, 1500], 50000: [2000, 2500], 100000: [2500, 3000], 150000: [3000, 3500] }
  for (const tier of PROP_FIRM_TIERS) {
    const p = getPreset('lucid_pro', tier)
    assert.equal(p.payout.minProfitGoalPerCycle, goal[tier])
    assert.equal(p.payout.safetyNet, buffer[tier])
    assert.deepEqual(p.payoutCapSchedule, caps[tier])
    assert.equal(p.payout.minQualifyingDays, null, 'no minimum trading days')
    assert.equal(p.payout.minDailyProfit, null)
    assert.equal(p.payout.maxRequestPctOfProfit, null)
    assert.equal(p.payout.mllSnapsToLockOnPayout, false)
    assert.equal(p.consistencyPct, 40)
    assert.equal(p.evalConsistencyPct, null)
  }
})

test('simulator params carry the eval consistency for Flex and the funded one for Pro', () => {
  assert.equal(presetToSimParams(flex50, 50000).evalConsistencyPct, 50)
  assert.equal(presetToSimParams(flex50, 50000).consistencyPct, null)
  assert.equal(presetToSimParams(pro50, 50000).evalConsistencyPct, null)
  assert.equal(presetToSimParams(pro50, 50000).consistencyPct, 40)
})

// ---------------------------------------------------------------------------
// LucidFlex 50K eligibility
// ---------------------------------------------------------------------------

test('Flex 50K: five +$150 days give $750 profit; 50% = $375 < $500 minimum, not eligible', () => {
  const r = computeEligibility(days([150, 150, 150, 150, 150]), [], START, 50000, flex50)
  assert.equal(r.qualifyingDaysCount, 5)
  assert.equal(r.qualifyingOk, true)
  assert.equal(r.cycleProfitOk, true)
  assert.equal(r.pctOfProfitLimit, 375)
  assert.equal(r.maxRequestableNow, 375)
  assert.equal(r.minPayoutMet, false)
  assert.equal(r.minBalanceToRequest, 51000)
  assert.equal(r.minBalanceOk, false)
  assert.equal(r.safetyNetOk, null, 'no buffer on Flex')
  assert.equal(r.consistencyOk, null, 'no funded consistency on Flex')
  assert.equal(r.eligible, false)
  assert.equal(r.blockers.length, 1)
  assert.match(r.blockers[0], /\$500 minimum/)
})

test('Flex 50K: five +$150 days and one +$1,000 day: eligible for min(50% x 1,750, 2,000) = $875', () => {
  const r = computeEligibility(days([150, 150, 150, 150, 150, 1000]), [], START, 50000, flex50)
  assert.equal(r.accountProfit, 1750)
  assert.equal(r.payoutCapForNextRequest, 2000)
  assert.equal(r.maxRequestableNow, 875)
  assert.equal(r.eligible, true, r.blockers.join(' | '))
  // a 57% best day would block Apex or LucidPro; Flex has no funded consistency rule
  assert.equal(r.consistencyOk, null)
})

test('Flex 50K: a +$149 day does not count as a qualifying day', () => {
  const r = computeEligibility(days([150, 150, 150, 150, 149, 1000]), [], START, 50000, flex50)
  assert.equal(r.dailyRows[4].qualifies, false)
  assert.equal(r.qualifyingDaysCount, 5, 'four $150 days plus the $1,000 day')
  const short = computeEligibility(days([150, 150, 150, 149, 1000]), [], START, 50000, flex50)
  assert.equal(short.qualifyingDaysCount, 4)
  assert.equal(short.eligible, false)
  assert.ok(short.blockers.some((b) => /4\/5 qualifying/.test(b)))
})

test('Flex 50K: the $ cap binds above $4,000 of profit and does not rise with payout number', () => {
  const r1 = computeEligibility(days([1000, 1000, 1000, 1000, 1000]), [], START, 50000, flex50)
  assert.equal(r1.maxRequestableNow, 2000)
  const payouts = [{ date: '2026-01-06', amount: 2000 }]
  const r2 = computeEligibility(days([1000, 1000, 1000, 1000, 1000, 1000, 1000, 1000, 1000, 1000]), payouts, START, 50000, flex50)
  assert.equal(r2.nextPayoutNumber, 2)
  assert.equal(r2.payoutCapForNextRequest, 2000)
  assert.equal(r2.maxRequestableNow, 2000)
})

test('Flex 50K: net profit in the cycle must be above $0', () => {
  // five qualifying days, then a loss wiping out the cycle; account profit from an earlier cycle remains
  const entries = days([1000, 1000, 1000, 1000, 1000, 150, 150, 150, 150, 150, -800])
  const r = computeEligibility(entries, [{ date: '2026-01-06', amount: 2000 }], START, 50000, flex50)
  assert.equal(r.qualifyingDaysCount, 5)
  assert.equal(r.profitSinceLastPayout, -50)
  assert.equal(r.cycleProfitOk, false)
  assert.equal(r.eligible, false)
})

test('Flex 50K: requesting a payout snaps the MLL to start + $100', () => {
  // highest close 51,750: the trail sits at 49,750, below the 50,100 lock
  const before = computeEligibility(days([150, 150, 150, 150, 150, 1000]), [], START, 50000, flex50)
  assert.equal(before.mll.level, 51750 - 2000)
  assert.equal(before.mll.locked, false)
  assert.equal(before.mll.afterRequest, 50100)
  const after = computeEligibility(days([150, 150, 150, 150, 150, 1000, 150]), [{ date: '2026-01-07', amount: 875 }], START, 50000, flex50)
  assert.equal(after.mll.level, 50100)
  assert.equal(after.mll.locked, true)
})

test('Flex 5 payouts, then live review', () => {
  const payouts = [1, 2, 3, 4, 5].map((i) => ({ date: `2026-02-0${i}`, amount: 500 }))
  const r = computeEligibility(days([1000, 1000, 1000, 1000, 1000]), payouts, START, 50000, flex50)
  assert.equal(r.payoutsRemaining, 0)
  assert.ok(r.blockers.some((b) => /live review/.test(b)))
})

// ---------------------------------------------------------------------------
// LucidPro 50K eligibility
// ---------------------------------------------------------------------------

test('Pro 50K: payout 1 is capped at $2,000', () => {
  // 7 days of +$800: profit 5,600, best day 14% of profit, balance 55,600 = 3,500 above the 52,100 buffer
  const r = computeEligibility(days([800, 800, 800, 800, 800, 800, 800]), [], START, 50000, pro50)
  assert.equal(r.safetyNetOk, true)
  assert.equal(r.consistencyOk, true)
  assert.equal(r.profitGoalOk, true)
  assert.equal(r.qualifyingDaysNeeded, null, 'no minimum trading days')
  assert.equal(r.payoutCapForNextRequest, 2000)
  assert.equal(r.maxRequestableNow, 2000)
  assert.equal(r.eligible, true, r.blockers.join(' | '))
})

test('Pro 50K: payouts 2+ are capped at $2,500', () => {
  const entries = days([800, 800, 800, 800, 800, 800, 800, 800, 800, 800])
  const r = computeEligibility(entries, [{ date: '2026-01-08', amount: 2000 }], START, 50000, pro50)
  // balance 50,000 + 8,000 − 2,000 = 56,000 → 3,900 above the buffer; cycle profit 2,400 ≥ $500 goal
  assert.equal(r.nextPayoutNumber, 2)
  assert.equal(r.payoutCapForNextRequest, 2500)
  assert.equal(r.maxRequestableNow, 2500)
  assert.equal(r.eligible, true, r.blockers.join(' | '))
  const third = computeEligibility(entries, [{ date: '2026-01-05', amount: 500 }, { date: '2026-01-08', amount: 500 }], START, 50000, pro50)
  assert.equal(third.payoutCapForNextRequest, 2500)
})

test('Pro 50K: a best day over 40% of cycle profit blocks the payout', () => {
  // profit 3,000 with a 1,500 day = 50% > 40%; the buffer and goal are cleared
  const blocked = computeEligibility(days([1500, 500, 500, 500]), [], START, 50000, pro50)
  assert.equal(blocked.safetyNetOk, true)
  assert.equal(blocked.minBalanceOk, true)
  assert.equal(blocked.profitGoalOk, true)
  assert.equal(Math.round(blocked.consistencyRatioPct!), 50)
  assert.equal(blocked.consistencyOk, false)
  assert.equal(blocked.eligible, false)
  assert.ok(blocked.blockers.some((b) => /40% consistency/.test(b)))
  // add $750 more without a bigger day: 1,500 / 3,750 = 40% exactly → allowed
  const cleared = computeEligibility(days([1500, 500, 500, 500, 750]), [], START, 50000, pro50)
  assert.equal(cleared.consistencyRatioPct, 40)
  assert.equal(cleared.consistencyOk, true)
  assert.equal(cleared.eligible, true, cleared.blockers.join(' | '))
})

test('Pro 50K: the buffer and the $500 minimum set the first request at a $52,600 balance', () => {
  const below = computeEligibility(days([700, 700, 700, 400]), [], START, 50000, pro50)
  assert.equal(below.currentBalance, 52500)
  assert.equal(below.minBalanceToRequest, 52600)
  assert.equal(below.minBalanceOk, false)
  assert.equal(below.maxRequestableNow, 400)
  assert.equal(below.eligible, false)
  const at = computeEligibility(days([700, 700, 700, 500]), [], START, 50000, pro50)
  assert.equal(at.maxRequestableNow, 500)
  assert.equal(at.eligible, true, at.blockers.join(' | '))
})

test('Pro 50K: the profit goal is measured since the last payout', () => {
  const entries = days([800, 800, 800, 800, 800, 800, 800, 300])
  const r = computeEligibility(entries, [{ date: '2026-01-08', amount: 2000 }], START, 50000, pro50)
  assert.equal(r.profitSinceLastPayout, 300)
  assert.equal(r.profitGoalOk, false)
  assert.equal(r.eligible, false)
  assert.ok(r.blockers.some((b) => /\$500 profit goal/.test(b)))
})

// ---------------------------------------------------------------------------
// Funded max loss limit (§3.4–3.5)
// ---------------------------------------------------------------------------

test('funded MLL trails EOD until the balance passes start + MLL + $100, then locks at start + $100', () => {
  const trailing = computeEligibility(days([1000, 1000]), [], START, 50000, pro50)
  assert.equal(trailing.mll.level, 50000)
  assert.equal(trailing.mll.locked, false)
  assert.equal(trailing.mll.lockTriggerBalance, 52100)
  const locked = computeEligibility(days([1000, 1200, -500]), [], START, 50000, pro50)
  assert.equal(locked.mll.level, 50100)
  assert.equal(locked.mll.locked, true)
  assert.equal(locked.mll.breachedOn, null)
})

test('a close at or below the MLL is reported as a breach', () => {
  const r = computeEligibility(days([1000, -2000]), [], START, 50000, pro50)
  // floor after day 1 is 49,000; the day-2 close is exactly 49,000
  assert.equal(r.mll.breachedOn, '2026-01-03')
  assert.equal(r.eligible, false)
})
