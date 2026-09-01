/**
 * Apex / Lucid evaluation-stage rule presets, sourced from the researched
 * RULES.md docs in the trading-skills project (checked against each firm's
 * own site 2026-09-01). Dollar figures are converted to % of account size at
 * use time so they can feed the existing bootstrap Monte Carlo simulator.
 */

export type PropVariantId = 'apex_intraday' | 'apex_eod' | 'lucid_pro' | 'lucid_flex'
export type PropTier = 25000 | 50000 | 100000 | 150000

export const PROP_FIRM_TIERS: PropTier[] = [25000, 50000, 100000, 150000]

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
  /** Caveat shown in the UI for this specific variant. */
  caveat?: string
}

type TierTable = Record<PropTier, Omit<PropFirmPreset, 'firm' | 'program'>>

const APEX_INTRADAY: TierTable = {
  25000: { profitTarget: 1500, maxDrawdown: 1000, dailyLossLimit: null, consistencyPct: 50, maxDays: 30 },
  50000: { profitTarget: 3000, maxDrawdown: 2000, dailyLossLimit: null, consistencyPct: 50, maxDays: 30 },
  100000: { profitTarget: 6000, maxDrawdown: 3000, dailyLossLimit: null, consistencyPct: 50, maxDays: 30 },
  150000: { profitTarget: 9000, maxDrawdown: 4000, dailyLossLimit: null, consistencyPct: 50, maxDays: 30 },
}

const APEX_EOD: TierTable = {
  25000: { profitTarget: 1500, maxDrawdown: 1000, dailyLossLimit: 500, consistencyPct: 50, maxDays: 30 },
  50000: { profitTarget: 3000, maxDrawdown: 2000, dailyLossLimit: 1000, consistencyPct: 50, maxDays: 30 },
  100000: { profitTarget: 6000, maxDrawdown: 3000, dailyLossLimit: 1500, consistencyPct: 50, maxDays: 30 },
  150000: { profitTarget: 9000, maxDrawdown: 4000, dailyLossLimit: 2000, consistencyPct: 50, maxDays: 30 },
}

const LUCID_PRO: TierTable = {
  25000: { profitTarget: 1250, maxDrawdown: 1000, dailyLossLimit: null, consistencyPct: 40, maxDays: null },
  50000: { profitTarget: 3000, maxDrawdown: 2000, dailyLossLimit: null, consistencyPct: 40, maxDays: null },
  100000: { profitTarget: 6000, maxDrawdown: 3000, dailyLossLimit: null, consistencyPct: 40, maxDays: null },
  150000: { profitTarget: 9000, maxDrawdown: 4500, dailyLossLimit: null, consistencyPct: 40, maxDays: null },
}

// LucidFlex's own eval profit-target/drawdown numbers weren't independently confirmed —
// approximated here from LucidPro's published figures (same tier sizing across Lucid's
// product line). LucidFlex's real differences are stage-specific: no funded-stage
// consistency cap, but a "5 profitable trading days per payout cycle" requirement instead.
const LUCID_FLEX: TierTable = {
  25000: { ...LUCID_PRO[25000], consistencyPct: 50 },
  50000: { ...LUCID_PRO[50000], consistencyPct: 50 },
  100000: { ...LUCID_PRO[100000], consistencyPct: 50 },
  150000: { ...LUCID_PRO[150000], consistencyPct: 50 },
}

export const PROP_FIRM_VARIANTS: Record<PropVariantId, { firm: 'Apex' | 'Lucid'; program: string; table: TierTable; caveat?: string }> = {
  apex_intraday: { firm: 'Apex', program: 'Intraday Trail', table: APEX_INTRADAY },
  apex_eod: { firm: 'Apex', program: 'EOD Trail', table: APEX_EOD },
  lucid_pro: { firm: 'Lucid', program: 'LucidPro', table: LUCID_PRO },
  lucid_flex: {
    firm: 'Lucid',
    program: 'LucidFlex',
    table: LUCID_FLEX,
    caveat: 'Eval profit target/drawdown approximated from LucidPro (not independently confirmed for LucidFlex). Funded-stage consistency cap shown here (50%) is a third-party figure — LucidFlex drops it entirely once funded but requires 5 profitable days/cycle instead.',
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
