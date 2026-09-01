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
  /** % of an approved payout the trader keeps (Apex: 100 on Sim Funded PAs; Lucid: 90 flat across LucidPro/Flex/Direct). */
  payoutSplitPct: number
  /** Total payouts allowed before the funded account is closed for good, or null if not stated/capped. */
  maxPayouts: number | null
  /** $ cap per payout request, indexed by payout number (schedule[0] = 1st payout's cap). Null where no per-request cap is documented. */
  payoutCapSchedule: number[] | null
  /**
   * How the max-drawdown ceiling is evaluated: 'intraday' trails every tick (Apex Intraday);
   * 'eod' only re-bases once per day at the close (Apex EOD, both Lucid programs — RULES.md §2).
   */
  drawdownMode: 'intraday' | 'eod'
  /**
   * How the daily loss limit (if any) is checked: 'intraday' liquidates/pauses the instant it's
   * hit mid-session (Apex EOD, confirmed "still enforced intraday" in RULES.md §2); 'eod' only
   * matters once a firm's DLL is enabled (Lucid's is optional and off by default here, so this is
   * moot for the current Lucid presets — kept 'eod' as the closest-fit assumption, not confirmed).
   */
  dailyLossMode: 'intraday' | 'eod'
  /** Caveat shown in the UI for this specific variant. */
  caveat?: string
}

type TierTable = Record<PropTier, Omit<PropFirmPreset, 'firm' | 'program' | 'drawdownMode' | 'dailyLossMode'>>

// Payout $ cap per request, indexed by payout number (Apex "Payout Amount Cap Per Request" tables —
// grows with each successive approved payout, capped at 6 total per PA before it's closed for good).
const APEX_INTRADAY_CAPS: Record<PropTier, number[]> = {
  25000: [1000, 1000, 1000, 1000, 1000, 1000],
  50000: [1500, 2000, 2500, 2500, 3000, 3000],
  100000: [2000, 2500, 3000, 3000, 4000, 4000],
  150000: [2500, 3000, 3000, 4000, 4000, 5000],
}
const APEX_EOD_CAPS: Record<PropTier, number[]> = {
  25000: [1000, 1000, 1000, 1000, 1000, 1000],
  50000: [1500, 1500, 2000, 2500, 2500, 3000],
  100000: [2000, 2500, 2500, 3000, 4000, 4000],
  150000: [2500, 3000, 3000, 3000, 4000, 5000],
}

const APEX_INTRADAY: TierTable = {
  25000: { profitTarget: 1500, maxDrawdown: 1000, dailyLossLimit: null, consistencyPct: 50, maxDays: 30, payout: { minDailyProfit: 100, minQualifyingDays: 5, cycleDays: null, minProfitGoalPerCycle: null, safetyNet: 26100, minPayoutRequest: 500 }, payoutSplitPct: 100, maxPayouts: 6, payoutCapSchedule: APEX_INTRADAY_CAPS[25000] },
  50000: { profitTarget: 3000, maxDrawdown: 2000, dailyLossLimit: null, consistencyPct: 50, maxDays: 30, payout: { minDailyProfit: 200, minQualifyingDays: 5, cycleDays: null, minProfitGoalPerCycle: null, safetyNet: 52100, minPayoutRequest: 500 }, payoutSplitPct: 100, maxPayouts: 6, payoutCapSchedule: APEX_INTRADAY_CAPS[50000] },
  100000: { profitTarget: 6000, maxDrawdown: 3000, dailyLossLimit: null, consistencyPct: 50, maxDays: 30, payout: { minDailyProfit: 250, minQualifyingDays: 5, cycleDays: null, minProfitGoalPerCycle: null, safetyNet: 103100, minPayoutRequest: 500 }, payoutSplitPct: 100, maxPayouts: 6, payoutCapSchedule: APEX_INTRADAY_CAPS[100000] },
  150000: { profitTarget: 9000, maxDrawdown: 4000, dailyLossLimit: null, consistencyPct: 50, maxDays: 30, payout: { minDailyProfit: 300, minQualifyingDays: 5, cycleDays: null, minProfitGoalPerCycle: null, safetyNet: 154100, minPayoutRequest: 500 }, payoutSplitPct: 100, maxPayouts: 6, payoutCapSchedule: APEX_INTRADAY_CAPS[150000] },
}

const APEX_EOD: TierTable = {
  25000: { profitTarget: 1500, maxDrawdown: 1000, dailyLossLimit: 500, consistencyPct: 50, maxDays: 30, payout: { minDailyProfit: 100, minQualifyingDays: 5, cycleDays: null, minProfitGoalPerCycle: null, safetyNet: 26100, minPayoutRequest: 500 }, payoutSplitPct: 100, maxPayouts: 6, payoutCapSchedule: APEX_EOD_CAPS[25000] },
  50000: { profitTarget: 3000, maxDrawdown: 2000, dailyLossLimit: 1000, consistencyPct: 50, maxDays: 30, payout: { minDailyProfit: 250, minQualifyingDays: 5, cycleDays: null, minProfitGoalPerCycle: null, safetyNet: 52100, minPayoutRequest: 500 }, payoutSplitPct: 100, maxPayouts: 6, payoutCapSchedule: APEX_EOD_CAPS[50000] },
  100000: { profitTarget: 6000, maxDrawdown: 3000, dailyLossLimit: 1500, consistencyPct: 50, maxDays: 30, payout: { minDailyProfit: 300, minQualifyingDays: 5, cycleDays: null, minProfitGoalPerCycle: null, safetyNet: 103100, minPayoutRequest: 500 }, payoutSplitPct: 100, maxPayouts: 6, payoutCapSchedule: APEX_EOD_CAPS[100000] },
  150000: { profitTarget: 9000, maxDrawdown: 4000, dailyLossLimit: 2000, consistencyPct: 50, maxDays: 30, payout: { minDailyProfit: 350, minQualifyingDays: 5, cycleDays: null, minProfitGoalPerCycle: null, safetyNet: 154100, minPayoutRequest: 500 }, payoutSplitPct: 100, maxPayouts: 6, payoutCapSchedule: APEX_EOD_CAPS[150000] },
}

const LUCID_PRO: TierTable = {
  25000: { profitTarget: 1250, maxDrawdown: 1000, dailyLossLimit: null, consistencyPct: 40, maxDays: null, payout: { minDailyProfit: null, minQualifyingDays: null, cycleDays: 3, minProfitGoalPerCycle: 250, safetyNet: 26100, minPayoutRequest: 500 }, payoutSplitPct: 90, maxPayouts: null, payoutCapSchedule: null },
  50000: { profitTarget: 3000, maxDrawdown: 2000, dailyLossLimit: null, consistencyPct: 40, maxDays: null, payout: { minDailyProfit: null, minQualifyingDays: null, cycleDays: 3, minProfitGoalPerCycle: 500, safetyNet: 52100, minPayoutRequest: 500 }, payoutSplitPct: 90, maxPayouts: null, payoutCapSchedule: null },
  100000: { profitTarget: 6000, maxDrawdown: 3000, dailyLossLimit: null, consistencyPct: 40, maxDays: null, payout: { minDailyProfit: null, minQualifyingDays: null, cycleDays: 3, minProfitGoalPerCycle: 750, safetyNet: 103100, minPayoutRequest: 500 }, payoutSplitPct: 90, maxPayouts: null, payoutCapSchedule: null },
  150000: { profitTarget: 9000, maxDrawdown: 4500, dailyLossLimit: null, consistencyPct: 40, maxDays: null, payout: { minDailyProfit: null, minQualifyingDays: null, cycleDays: 3, minProfitGoalPerCycle: 1000, safetyNet: 154600, minPayoutRequest: 500 }, payoutSplitPct: 90, maxPayouts: null, payoutCapSchedule: null },
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

export const PROP_FIRM_VARIANTS: Record<
  PropVariantId,
  { firm: 'Apex' | 'Lucid'; program: string; table: TierTable; drawdownMode: 'intraday' | 'eod'; dailyLossMode: 'intraday' | 'eod'; caveat?: string }
> = {
  apex_intraday: { firm: 'Apex', program: 'Intraday Trail', table: APEX_INTRADAY, drawdownMode: 'intraday', dailyLossMode: 'intraday' },
  apex_eod: { firm: 'Apex', program: 'EOD Trail', table: APEX_EOD, drawdownMode: 'eod', dailyLossMode: 'intraday' },
  lucid_pro: { firm: 'Lucid', program: 'LucidPro', table: LUCID_PRO, drawdownMode: 'eod', dailyLossMode: 'eod' },
  lucid_flex: {
    firm: 'Lucid',
    program: 'LucidFlex',
    table: LUCID_FLEX,
    drawdownMode: 'eod',
    dailyLossMode: 'eod',
    caveat: 'Eval profit target/drawdown approximated from LucidPro (not independently confirmed for LucidFlex). LucidFlex actually drops the consistency cap entirely once funded (shown here only as a stand-in) and instead requires 5 profitable trading days per cycle — cycle length and minimum payout size for LucidFlex were not confirmed in research, treat those as rough estimates.',
  },
}

export function getPreset(variant: PropVariantId, tier: PropTier): PropFirmPreset {
  const v = PROP_FIRM_VARIANTS[variant]
  return { firm: v.firm, program: v.program, caveat: v.caveat, drawdownMode: v.drawdownMode, dailyLossMode: v.dailyLossMode, ...v.table[tier] }
}

export function presetToSimParams(preset: PropFirmPreset, tier: PropTier) {
  return {
    profitTargetPct: (preset.profitTarget / tier) * 100,
    maxOverallDrawdownPct: (preset.maxDrawdown / tier) * 100,
    // No firm DLL → effectively disable the daily-loss check in the simulator.
    maxDailyLossPct: preset.dailyLossLimit != null ? (preset.dailyLossLimit / tier) * 100 : 1000,
    drawdownMode: preset.drawdownMode,
    dailyLossMode: preset.dailyLossMode,
    consistencyPct: preset.consistencyPct,
  }
}

export function money(n: number | null | undefined): string {
  if (n == null) return '—'
  return `$${n.toLocaleString('en-US')}`
}
