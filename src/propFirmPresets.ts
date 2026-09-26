/**
 * Apex / Lucid rule presets feeding the payout calculator, the trading-plan projection and the
 * bootstrap evaluation simulator. Dollar figures are converted to % of account size at use time.
 *
 * Source for every value below: "The Prop Firm Rulebook · Apex & Lucid", verified 3 Sep 2026,
 * compiled from apextraderfunding.com/help-center (Part 2) and all 57 articles of
 * support.lucidtrading.com (Part 3). Section numbers (§x.y) refer to that book. Both firms change
 * rules without notice: re-check the live help centre before acting on any number here.
 */

export type PropVariantId = 'apex_intraday' | 'apex_eod' | 'lucid_pro' | 'lucid_flex'
export type PropTier = 25000 | 50000 | 100000 | 150000

export const PROP_FIRM_TIERS: PropTier[] = [25000, 50000, 100000, 150000]

/** Rule source shown in the UI. */
export const PROP_RULES_SOURCE = 'Prop Firm Rulebook, verified 3 Sep 2026'

/**
 * Funded-account max loss limit lock, both firms: the floor trails until the balance exceeds
 * start + max drawdown + $100, then locks at start + $100 (Apex §2.4 / §2.7, Lucid §3.4 / §3.5).
 * Documented for funded accounts only; the book documents no such lock for a Lucid evaluation.
 */
export const FUNDED_MLL_LOCK_OFFSET = 100

export interface PayoutRules {
  /** Net profit a day needs to count as a qualifying day, or null if the program has no qualifying-day gate. */
  minDailyProfit: number | null
  /** Qualifying days needed since the last payout, or null if the program has no qualifying-day gate. */
  minQualifyingDays: number | null
  /** Net profit required since the last payout (LucidPro "profit goal per cycle"). Null if there is no profit goal. */
  minProfitGoalPerCycle: number | null
  /**
   * Buffer / safety net: the balance that must stay in the account; only the excess above it is
   * withdrawable. Null when the program has no buffer at all (LucidFlex).
   */
  safetyNet: number | null
  /** Smallest payout amount that can be requested. */
  minPayoutRequest: number
  /**
   * A request is also capped at this % of the account's profit (balance − starting balance),
   * whichever of this and the $ cap is lower (LucidFlex: 50%). Null where no such cap exists.
   */
  maxRequestPctOfProfit: number | null
  /** Requesting a payout moves the max loss limit to the locked level, start + $100 (LucidFlex §3.5). */
  mllSnapsToLockOnPayout: boolean
}

export interface PropFirmPreset {
  firm: 'Apex' | 'Lucid'
  program: string
  /** Eval profit target, in dollars. */
  profitTarget: number
  /** Max (trailing or EOD) drawdown from peak, in dollars. Same figure in the evaluation and the funded account for every preset here. */
  maxDrawdown: number
  /** Daily loss limit in dollars, or null if the program has none / it's optional-off. */
  dailyLossLimit: number | null
  /** Funded / payout-stage consistency cap (largest day ÷ profit since the last payout), as a %. Null = no funded consistency rule. */
  consistencyPct: number | null
  /** Evaluation-stage consistency cap, as a %: the target counts as passed only once the best day is within it. Null = none. */
  evalConsistencyPct: number | null
  /** Eval access window in calendar days, or null if no stated max. */
  maxDays: number | null
  payout: PayoutRules
  /** % of an approved payout the trader keeps. */
  payoutSplitPct: number
  /** Total payouts on one funded account, or null if not capped. */
  maxPayouts: number | null
  /** What happens after the last allowed payout. */
  afterMaxPayouts: 'closed' | 'live_review'
  /**
   * $ cap per payout request, indexed by payout number (schedule[0] = 1st payout's cap). Requests past the end of
   * the schedule use its last entry, so [1000, 1500] means "payout 1: $1,000; payouts 2+: $1,500".
   * Null where no per-request cap is documented.
   */
  payoutCapSchedule: number[] | null
  /**
   * How the max-drawdown floor moves: 'intraday' trails every tick including open P&L (Apex Intraday);
   * 'eod' re-bases once per day from the closing balance (Apex EOD §2.6, Lucid §3.5). In both cases a
   * touch at any moment is a breach (§1.2).
   */
  drawdownMode: 'intraday' | 'eod'
  /**
   * How the daily loss limit (if any) is checked: 'intraday' liquidates/pauses the instant it's
   * hit mid-session (Apex EOD, §2.8); 'eod' only matters once a firm's DLL is enabled (Lucid's is
   * optional and modelled as off here, so this is moot for the current Lucid presets).
   */
  dailyLossMode: 'intraday' | 'eod'
  /** Caveat shown in the UI for this specific variant. */
  caveat?: string
}

type TierTable = Record<
  PropTier,
  Omit<PropFirmPreset, 'firm' | 'program' | 'drawdownMode' | 'dailyLossMode' | 'caveat' | 'afterMaxPayouts'>
>

// Apex payout $ cap per request, by payout number (§2.12). Six payouts, then the PA is closed.
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

// Apex (§2.3 eval, §2.4 PA, §2.10 payout gates, §2.11 consistency: funded only, none in the eval).
function apexPayout(minDailyProfit: number, safetyNet: number): PayoutRules {
  return {
    minDailyProfit,
    minQualifyingDays: 5,
    minProfitGoalPerCycle: null,
    safetyNet,
    minPayoutRequest: 500,
    maxRequestPctOfProfit: null,
    mllSnapsToLockOnPayout: false,
  }
}
const APEX_COMMON = { consistencyPct: 50, evalConsistencyPct: null, maxDays: 30, payoutSplitPct: 100, maxPayouts: 6 } as const

const APEX_INTRADAY: TierTable = {
  25000: { ...APEX_COMMON, profitTarget: 1500, maxDrawdown: 1000, dailyLossLimit: null, payout: apexPayout(100, 26100), payoutCapSchedule: APEX_INTRADAY_CAPS[25000] },
  50000: { ...APEX_COMMON, profitTarget: 3000, maxDrawdown: 2000, dailyLossLimit: null, payout: apexPayout(200, 52100), payoutCapSchedule: APEX_INTRADAY_CAPS[50000] },
  100000: { ...APEX_COMMON, profitTarget: 6000, maxDrawdown: 3000, dailyLossLimit: null, payout: apexPayout(250, 103100), payoutCapSchedule: APEX_INTRADAY_CAPS[100000] },
  150000: { ...APEX_COMMON, profitTarget: 9000, maxDrawdown: 4000, dailyLossLimit: null, payout: apexPayout(300, 154100), payoutCapSchedule: APEX_INTRADAY_CAPS[150000] },
}

const APEX_EOD: TierTable = {
  25000: { ...APEX_COMMON, profitTarget: 1500, maxDrawdown: 1000, dailyLossLimit: 500, payout: apexPayout(100, 26100), payoutCapSchedule: APEX_EOD_CAPS[25000] },
  50000: { ...APEX_COMMON, profitTarget: 3000, maxDrawdown: 2000, dailyLossLimit: 1000, payout: apexPayout(250, 52100), payoutCapSchedule: APEX_EOD_CAPS[50000] },
  100000: { ...APEX_COMMON, profitTarget: 6000, maxDrawdown: 3000, dailyLossLimit: 1500, payout: apexPayout(300, 103100), payoutCapSchedule: APEX_EOD_CAPS[100000] },
  150000: { ...APEX_COMMON, profitTarget: 9000, maxDrawdown: 4000, dailyLossLimit: 2000, payout: apexPayout(350, 154100), payoutCapSchedule: APEX_EOD_CAPS[150000] },
}

// Lucid evaluations (§3.3): profit target and MLL identical across LucidPro, Flex, Daily and Maxx; no time limit.
// Funded MLL is the same figure (§3.4). DLL is optional at checkout on Pro and Flex (§3.6) and modelled as off here.
const LUCID_EVAL: Record<PropTier, { profitTarget: number; maxDrawdown: number }> = {
  25000: { profitTarget: 1250, maxDrawdown: 1000 },
  50000: { profitTarget: 3000, maxDrawdown: 2000 },
  100000: { profitTarget: 6000, maxDrawdown: 3000 },
  150000: { profitTarget: 9000, maxDrawdown: 4500 },
}

// LucidPro (§3.7: no eval consistency, 40% funded; §3.8.1: profit goal, buffer = initial trail balance,
// caps for payout 1 and payouts 2+, no minimum trading days, no fixed payout window; §3.10: 5 payouts, then live review).
function lucidPro(tier: PropTier, profitGoal: number, buffer: number, caps: [number, number]) {
  return {
    ...LUCID_EVAL[tier],
    dailyLossLimit: null,
    consistencyPct: 40,
    evalConsistencyPct: null,
    maxDays: null,
    payout: {
      minDailyProfit: null,
      minQualifyingDays: null,
      minProfitGoalPerCycle: profitGoal,
      safetyNet: buffer,
      minPayoutRequest: 500,
      maxRequestPctOfProfit: null,
      mllSnapsToLockOnPayout: false,
    },
    payoutSplitPct: 90,
    maxPayouts: 5,
    payoutCapSchedule: caps,
  }
}
const LUCID_PRO: TierTable = {
  25000: lucidPro(25000, 250, 26100, [1000, 1500]),
  50000: lucidPro(50000, 500, 52100, [2000, 2500]),
  100000: lucidPro(100000, 750, 103100, [2500, 3000]),
  150000: lucidPro(150000, 1000, 154600, [3000, 3500]),
}

// LucidFlex (§3.7: 50% eval consistency "with cushion", none funded; §3.8.2: 5 days each ≥ the minimum,
// net profit > 0 in the cycle, no buffer, request ≤ min(50% of profit, cap) and the cap does not rise;
// §3.5: requesting a payout snaps the MLL to start + $100; §3.10: 5 payouts, then live review).
function lucidFlex(tier: PropTier, minDailyProfit: number, cap: number) {
  return {
    ...LUCID_EVAL[tier],
    dailyLossLimit: null,
    consistencyPct: null,
    evalConsistencyPct: 50,
    maxDays: null,
    payout: {
      minDailyProfit,
      minQualifyingDays: 5,
      minProfitGoalPerCycle: null,
      safetyNet: null,
      minPayoutRequest: 500,
      maxRequestPctOfProfit: 50,
      mllSnapsToLockOnPayout: true,
    },
    payoutSplitPct: 90,
    maxPayouts: 5,
    payoutCapSchedule: [cap],
  }
}
const LUCID_FLEX: TierTable = {
  25000: lucidFlex(25000, 100, 1000),
  50000: lucidFlex(50000, 150, 2000),
  100000: lucidFlex(100000, 200, 2500),
  150000: lucidFlex(150000, 250, 3000),
}

export const PROP_FIRM_VARIANTS: Record<
  PropVariantId,
  {
    firm: 'Apex' | 'Lucid'
    program: string
    table: TierTable
    drawdownMode: 'intraday' | 'eod'
    dailyLossMode: 'intraday' | 'eod'
    afterMaxPayouts: 'closed' | 'live_review'
    caveat?: string
  }
> = {
  apex_intraday: { firm: 'Apex', program: 'Intraday Trail', table: APEX_INTRADAY, drawdownMode: 'intraday', dailyLossMode: 'intraday', afterMaxPayouts: 'closed' },
  apex_eod: { firm: 'Apex', program: 'EOD Trail', table: APEX_EOD, drawdownMode: 'eod', dailyLossMode: 'intraday', afterMaxPayouts: 'closed' },
  lucid_pro: {
    firm: 'Lucid',
    program: 'LucidPro',
    table: LUCID_PRO,
    drawdownMode: 'eod',
    dailyLossMode: 'eod',
    afterMaxPayouts: 'live_review',
    caveat:
      `Source: ${PROP_RULES_SOURCE}, §3.3–3.8.1 (support.lucidtrading.com). Modelled with the daily loss limit off; ` +
      'the optional fixed DLL is none / $1,200 / $1,800 / $2,700 (25K–150K), replaced by LucidScale (60% of peak ' +
      'end-of-day profit) once the account closes above its initial trail balance. 40% funded consistency applies to ' +
      'accounts bought or reset on or after 28 Nov 2025 3:00 pm EST; older accounts keep 35%. No evaluation consistency, ' +
      'no minimum trading days and no fixed payout window. Rules change without notice.',
  },
  lucid_flex: {
    firm: 'Lucid',
    program: 'LucidFlex',
    table: LUCID_FLEX,
    drawdownMode: 'eod',
    dailyLossMode: 'eod',
    afterMaxPayouts: 'live_review',
    caveat:
      `Source: ${PROP_RULES_SOURCE}, §3.3–3.8.2 (support.lucidtrading.com). Eval target and max loss limit are the ` +
      "same as LucidPro's. The 50% consistency applies in the evaluation only; Lucid adds a cushion it does not " +
      'quantify, so the simulator applies a strict 50% (conservative). Funded: no consistency, no buffer; requesting ' +
      'a payout snaps the max loss limit to start + $100. The optional daily loss limit (amount not documented) is ' +
      'modelled as off, and the funded contract scaling plan (§3.9) is not modelled. Rules change without notice.',
  },
}

export function getPreset(variant: PropVariantId, tier: PropTier): PropFirmPreset {
  const v = PROP_FIRM_VARIANTS[variant]
  return {
    firm: v.firm,
    program: v.program,
    caveat: v.caveat,
    drawdownMode: v.drawdownMode,
    dailyLossMode: v.dailyLossMode,
    afterMaxPayouts: v.afterMaxPayouts,
    ...v.table[tier],
  }
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
    evalConsistencyPct: preset.evalConsistencyPct,
  }
}

/** Payout cap ($) for a given 1-based payout number, or null when the program has no per-request $ cap. */
export function payoutCapFor(preset: PropFirmPreset, payoutNumber: number): number | null {
  const s = preset.payoutCapSchedule
  if (s == null || s.length === 0) return null
  return s[Math.min(Math.max(1, payoutNumber), s.length) - 1]
}

/** One-line description of the per-request cap rule. */
export function describePayoutCaps(preset: PropFirmPreset): string {
  const s = preset.payoutCapSchedule
  const parts: string[] = []
  if (s && s.length > 0) {
    if (s.every((c) => c === s[0])) {
      parts.push(`${money(s[0])} per request, the same for every payout`)
    } else {
      const open = preset.maxPayouts == null || preset.maxPayouts > s.length
      parts.push(s.map((c, i) => `#${i + 1}${open && i === s.length - 1 ? '+' : ''} ${money(c)}`).join(' · '))
    }
  }
  if (preset.payout.maxRequestPctOfProfit != null) {
    parts.push(`and no more than ${preset.payout.maxRequestPctOfProfit}% of profit, whichever is lower`)
  }
  return parts.join(' ')
}

/** What happens after the final payout, as UI text ('' when uncapped). */
export function afterMaxPayoutsText(preset: PropFirmPreset): string {
  if (preset.maxPayouts == null) return ''
  return preset.afterMaxPayouts === 'closed'
    ? `the account closes after payout ${preset.maxPayouts}`
    : `after payout ${preset.maxPayouts} the account goes to Lucid's live review (all other sim accounts close)`
}

export function money(n: number | null | undefined): string {
  if (n == null) return '—'
  return `$${n.toLocaleString('en-US')}`
}
