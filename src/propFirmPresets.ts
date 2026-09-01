/**
 * Apex / Lucid evaluation-stage rule presets, sourced from the researched
 * RULES.md docs in the trading-skills project (checked against each firm's
 * own site 2026-09-01). Dollar figures are converted to % of account size at
 * use time so they can feed the existing bootstrap Monte Carlo simulator.
 */

export type PropVariantId = 'apex_intraday' | 'apex_eod' | 'lucid_pro' | 'lucid_flex'
export type PropTier = 25000 | 50000 | 100000 | 150000

export const PROP_FIRM_TIERS: PropTier[] = [25000, 50000, 100000, 150000]

export interface PayoutRules {
  /** Apex-style: net profit required on a day for it to count toward the qualifying-day total. Null for cycle-gated programs (Lucid Pro). */
  minDailyProfit: number | null
  /** Apex-style: number of qualifying days needed before a payout can be requested. Null for cycle-gated programs. */
  minQualifyingDays: number | null
  /** Lucid Pro-style: fixed calendar-day payout cycle length. Null if payouts are on-demand once other bars are cleared. */
  cycleDays: number | null
  /** Lucid Pro-style: net profit required within one cycle. Null if not cycle-based. */
  minProfitGoalPerCycle: number | null
  /** Balance that must be maintained before/after a payout (funded-account "safety net" / buffer). */
  safetyNet: number
  /** Smallest payout amount that can be requested. */
  minPayoutRequest: number
}

export interface PropFirmPreset {
  firm: 'Apex' | 'Lucid'
  program: string
  /** Eval profit target, in dollars. */
  profitTarget: number
  /** Max (trailing or EOD) drawdown from peak, in dollars. */
  maxDrawdown: number
  /** Daily loss limit in dollars, or null if the program has none / it's optional-off. */
  dailyLossLimit: number | null
  /** Payout-stage consistency cap (largest day / total profit), as a %. */
  consistencyPct: number
  /** Eval access window in calendar days, or null if no stated max. */
  maxDays: number | null
  payout: PayoutRules
  /** Caveat shown in the UI for this specific variant. */
  caveat?: string
}

type TierTable = Record<PropTier, Omit<PropFirmPreset, 'firm' | 'program'>>

const APEX_INTRADAY: TierTable = {
  25000: { profitTarget: 1500, maxDrawdown: 1000, dailyLossLimit: null, consistencyPct: 50, maxDays: 30, payout: { minDailyProfit: 100, minQualifyingDays: 5, cycleDays: null, minProfitGoalPerCycle: null, safetyNet: 26100, minPayoutRequest: 500 } },
  50000: { profitTarget: 3000, maxDrawdown: 2000, dailyLossLimit: null, consistencyPct: 50, maxDays: 30, payout: { minDailyProfit: 200, minQualifyingDays: 5, cycleDays: null, minProfitGoalPerCycle: null, safetyNet: 52100, minPayoutRequest: 500 } },
  100000: { profitTarget: 6000, maxDrawdown: 3000, dailyLossLimit: null, consistencyPct: 50, maxDays: 30, payout: { minDailyProfit: 250, minQualifyingDays: 5, cycleDays: null, minProfitGoalPerCycle: null, safetyNet: 103100, minPayoutRequest: 500 } },
  150000: { profitTarget: 9000, maxDrawdown: 4000, dailyLossLimit: null, consistencyPct: 50, maxDays: 30, payout: { minDailyProfit: 300, minQualifyingDays: 5, cycleDays: null, minProfitGoalPerCycle: null, safetyNet: 154100, minPayoutRequest: 500 } },
}

const APEX_EOD: TierTable = {
  25000: { profitTarget: 1500, maxDrawdown: 1000, dailyLossLimit: 500, consistencyPct: 50, maxDays: 30, payout: { minDailyProfit: 100, minQualifyingDays: 5, cycleDays: null, minProfitGoalPerCycle: null, safetyNet: 26100, minPayoutRequest: 500 } },
  50000: { profitTarget: 3000, maxDrawdown: 2000, dailyLossLimit: 1000, consistencyPct: 50, maxDays: 30, payout: { minDailyProfit: 250, minQualifyingDays: 5, cycleDays: null, minProfitGoalPerCycle: null, safetyNet: 52100, minPayoutRequest: 500 } },
  100000: { profitTarget: 6000, maxDrawdown: 3000, dailyLossLimit: 1500, consistencyPct: 50, maxDays: 30, payout: { minDailyProfit: 300, minQualifyingDays: 5, cycleDays: null, minProfitGoalPerCycle: null, safetyNet: 103100, minPayoutRequest: 500 } },
  150000: { profitTarget: 9000, maxDrawdown: 4000, dailyLossLimit: 2000, consistencyPct: 50, maxDays: 30, payout: { minDailyProfit: 350, minQualifyingDays: 5, cycleDays: null, minProfitGoalPerCycle: null, safetyNet: 154100, minPayoutRequest: 500 } },
}

const LUCID_PRO: TierTable = {
  25000: { profitTarget: 1250, maxDrawdown: 1000, dailyLossLimit: null, consistencyPct: 40, maxDays: null, payout: { minDailyProfit: null, minQualifyingDays: null, cycleDays: 3, minProfitGoalPerCycle: 250, safetyNet: 26100, minPayoutRequest: 500 } },
  50000: { profitTarget: 3000, maxDrawdown: 2000, dailyLossLimit: null, consistencyPct: 40, maxDays: null, payout: { minDailyProfit: null, minQualifyingDays: null, cycleDays: 3, minProfitGoalPerCycle: 500, safetyNet: 52100, minPayoutRequest: 500 } },
  100000: { profitTarget: 6000, maxDrawdown: 3000, dailyLossLimit: null, consistencyPct: 40, maxDays: null, payout: { minDailyProfit: null, minQualifyingDays: null, cycleDays: 3, minProfitGoalPerCycle: 750, safetyNet: 103100, minPayoutRequest: 500 } },
  150000: { profitTarget: 9000, maxDrawdown: 4500, dailyLossLimit: null, consistencyPct: 40, maxDays: null, payout: { minDailyProfit: null, minQualifyingDays: null, cycleDays: 3, minProfitGoalPerCycle: 1000, safetyNet: 154600, minPayoutRequest: 500 } },
}

// LucidFlex's own eval profit-target/drawdown numbers weren't independently confirmed —
// approximated here from LucidPro's published figures (same tier sizing across Lucid's
// product line). LucidFlex's real differences are stage-specific: no funded-stage
// consistency cap, but a "5 profitable trading days per payout cycle" requirement instead.
const LUCID_FLEX_PAYOUT: PayoutRules = { minDailyProfit: null, minQualifyingDays: 5, cycleDays: null, minProfitGoalPerCycle: null, safetyNet: 0, minPayoutRequest: 500 }
const LUCID_FLEX: TierTable = {
  25000: { ...LUCID_PRO[25000], consistencyPct: 50, payout: { ...LUCID_FLEX_PAYOUT, safetyNet: LUCID_PRO[25000].payout.safetyNet } },
  50000: { ...LUCID_PRO[50000], consistencyPct: 50, payout: { ...LUCID_FLEX_PAYOUT, safetyNet: LUCID_PRO[50000].payout.safetyNet } },
  100000: { ...LUCID_PRO[100000], consistencyPct: 50, payout: { ...LUCID_FLEX_PAYOUT, safetyNet: LUCID_PRO[100000].payout.safetyNet } },
  150000: { ...LUCID_PRO[150000], consistencyPct: 50, payout: { ...LUCID_FLEX_PAYOUT, safetyNet: LUCID_PRO[150000].payout.safetyNet } },
}

export const PROP_FIRM_VARIANTS: Record<PropVariantId, { firm: 'Apex' | 'Lucid'; program: string; table: TierTable; caveat?: string }> = {
  apex_intraday: { firm: 'Apex', program: 'Intraday Trail', table: APEX_INTRADAY },
  apex_eod: { firm: 'Apex', program: 'EOD Trail', table: APEX_EOD },
  lucid_pro: { firm: 'Lucid', program: 'LucidPro', table: LUCID_PRO },
  lucid_flex: {
    firm: 'Lucid',
    program: 'LucidFlex',
    table: LUCID_FLEX,
    caveat: 'Eval profit target/drawdown approximated from LucidPro (not independently confirmed for LucidFlex). LucidFlex actually drops the consistency cap entirely once funded (shown here only as a stand-in) and instead requires 5 profitable trading days per cycle — cycle length and minimum payout size for LucidFlex were not confirmed in research, treat those as rough estimates.',
  },
}

export function getPreset(variant: PropVariantId, tier: PropTier): PropFirmPreset {
  const v = PROP_FIRM_VARIANTS[variant]
  return { firm: v.firm, program: v.program, caveat: v.caveat, ...v.table[tier] }
}

export function presetToSimParams(preset: PropFirmPreset, tier: PropTier) {
  return {
    profitTargetPct: (preset.profitTarget / tier) * 100,
    maxOverallDrawdownPct: (preset.maxDrawdown / tier) * 100,
    // No firm DLL → effectively disable the daily-loss check in the simulator.
    maxDailyLossPct: preset.dailyLossLimit != null ? (preset.dailyLossLimit / tier) * 100 : 1000,
  }
}

export function money(n: number): string {
  return `$${n.toLocaleString('en-US')}`
}
