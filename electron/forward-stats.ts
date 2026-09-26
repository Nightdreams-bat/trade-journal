/**
 * Forward-test statistics and the pre-registered stop/continue decision (PREREG-005).
 *
 * The test statistic is the RULE's R_net from the indicator's EXIT alerts (forward_signals rows
 * with an outcome: 'closed', and 'closed_skipped' where the indicator vetoed the trade for account
 * size but still reported the rule's outcome). The trader's own fills only feed the execution
 * check (slippage). `computeForwardStats` is pure; `loadForwardStats` just gathers its inputs.
 */
import type { DatabaseSync } from 'node:sqlite'

export const FORWARD_TARGET_N = 150
export const FORWARD_EARLY_N = 60
export const FORWARD_EARLY_STOP_R = -0.1
export const FORWARD_MAX_SLIPPAGE_PTS = 2
export const FORWARD_PASS_T = 2

/** Absorbs floating-point noise so that an average of exactly -0.10 counts as "≤ -0.10". */
const EPS = 1e-9

export type ForwardDecision = 'stop_edge' | 'stop_execution' | 'stop_research' | 'pass' | 'continue_unvalidated' | 'collecting'

export interface ForwardStatsInput {
  /** R_net of every rule outcome, in date order. */
  rNets: number[]
  /** How many of those outcomes are indicator skips (SKIP risk_too_large + EXIT). */
  skippedWithOutcome?: number
  /** SKIP alerts, with or without an outcome. */
  indicatorSkips: number
  /** Signals the user logged as missed trades. */
  missedSignals: number
  /** ENTRY signals with neither a linked trade nor a linked missed trade. */
  unlogged?: number
  /** Round-trip slippage in points of every linked trade that has fills (positive = worse than the rule). */
  slippages: number[]
}

export interface ForwardStats {
  n: number
  skippedWithOutcome: number
  avgR: number | null
  tStat: number | null
  winRate: number | null
  cumR: number
  target: number
  progress: number
  indicatorSkips: number
  missedSignals: number
  unlogged: number
  linkedWithFills: number
  avgSlippage: number | null
  decision: ForwardDecision
  status: string
}

function mean(xs: number[]): number | null {
  return xs.length ? xs.reduce((s, x) => s + x, 0) / xs.length : null
}

/** One-sample t statistic of the mean against 0 (sample standard deviation). Null when undefined. */
export function tStatistic(xs: number[]): number | null {
  const n = xs.length
  if (n < 2) return null
  const m = xs.reduce((s, x) => s + x, 0) / n
  const variance = xs.reduce((s, x) => s + (x - m) ** 2, 0) / (n - 1)
  if (!(variance > 0)) return null
  return m / Math.sqrt(variance / n)
}

/**
 * Round-trip slippage of one linked trade, in points, positive when the trader did worse than the
 * rule: (entry − signal) × sign, plus (rule exit − own exit) × sign when both exits are known.
 * Null when the entry side can't be measured.
 */
export function tradeSlippage(args: {
  dir: string | null
  signalPx: number | null
  entryPx: number | null
  ruleExitPx?: number | null
  exitPx?: number | null
}): number | null {
  const { dir, signalPx, entryPx, ruleExitPx, exitPx } = args
  const d = dir?.toLowerCase()
  if (d !== 'long' && d !== 'short') return null
  if (signalPx == null || entryPx == null) return null
  const sign = d === 'long' ? 1 : -1
  let slip = (entryPx - signalPx) * sign
  if (exitPx != null && ruleExitPx != null) slip += (ruleExitPx - exitPx) * sign
  return slip
}

/** Applies the pre-registered rules in the order they are written; the first match wins. */
export function forwardDecision(n: number, avgR: number | null, tStat: number | null, avgSlippage: number | null) {
  let decision: ForwardDecision = 'collecting'
  let status = `Collecting: ${n}/${FORWARD_TARGET_N}`
  if (n >= FORWARD_EARLY_N && avgR !== null && avgR <= FORWARD_EARLY_STOP_R + EPS) {
    decision = 'stop_edge'
    status = 'STOP: edge likely absent'
  } else if (avgSlippage !== null && avgSlippage > FORWARD_MAX_SLIPPAGE_PTS) {
    decision = 'stop_execution'
    status = 'STOP: execution'
  } else if (n >= FORWARD_TARGET_N && avgR !== null && avgR <= 0) {
    decision = 'stop_research'
    status = 'STOP: research line ends'
  } else if (n >= FORWARD_TARGET_N && avgR !== null && avgR > 0 && tStat !== null && tStat >= FORWARD_PASS_T) {
    decision = 'pass'
    status = 'Forward sample passes (not proof of profitability)'
  } else if (n >= FORWARD_TARGET_N && avgR !== null && avgR > 0) {
    // PREREG-003: after 150 trades with a positive but not significant average, keep going at 1 contract
    decision = 'continue_unvalidated'
    status = 'Continue at 1 contract: positive but not significant (still unvalidated)'
  }
  return { decision, status }
}

export function computeForwardStats(input: ForwardStatsInput): ForwardStats {
  const rs = input.rNets.filter((r) => Number.isFinite(r))
  const slips = input.slippages.filter((s) => Number.isFinite(s))
  const n = rs.length
  const avgR = mean(rs)
  const tStat = tStatistic(rs)
  const avgSlippage = mean(slips)
  const { decision, status } = forwardDecision(n, avgR, tStat, avgSlippage)
  return {
    n,
    skippedWithOutcome: input.skippedWithOutcome ?? 0,
    avgR,
    tStat,
    winRate: n ? (rs.filter((r) => r > 0).length / n) * 100 : null,
    cumR: rs.reduce((s, r) => s + r, 0),
    target: FORWARD_TARGET_N,
    progress: Math.min(1, n / FORWARD_TARGET_N),
    indicatorSkips: input.indicatorSkips,
    missedSignals: input.missedSignals,
    unlogged: input.unlogged ?? 0,
    linkedWithFills: slips.length,
    avgSlippage,
    decision,
    status,
  }
}

/** Gathers the inputs from the database and computes the stats. */
export function loadForwardStats(db: DatabaseSync, rule: string): ForwardStats {
  const outcomes = db
    .prepare(
      `SELECT r_net, status FROM forward_signals
       WHERE rule = ? AND status IN ('closed', 'closed_skipped') AND r_net IS NOT NULL
       ORDER BY date ASC, id ASC`,
    )
    .all(rule) as { r_net: number; status: string }[]
  const skips = db
    .prepare(`SELECT COUNT(*) AS c FROM forward_signals WHERE rule = ? AND status IN ('skipped_by_indicator', 'closed_skipped')`)
    .get(rule) as { c: number }
  const missed = db
    .prepare(
      `SELECT COUNT(DISTINCT m.signal_id) AS c FROM missed_trades m
       JOIN forward_signals f ON f.id = m.signal_id WHERE f.rule = ?`,
    )
    .get(rule) as { c: number }
  const unlogged = db
    .prepare(
      `SELECT COUNT(*) AS c FROM forward_signals f
       WHERE f.rule = ? AND f.status IN ('open', 'closed')
         AND NOT EXISTS (SELECT 1 FROM trades t WHERE t.signal_id = f.id)
         AND NOT EXISTS (SELECT 1 FROM missed_trades m WHERE m.signal_id = f.id)`,
    )
    .get(rule) as { c: number }
  const linked = db
    .prepare(
      `SELECT f.dir AS dir, COALESCE(t.signal_px, f.sig_px) AS signal_px, t.entry_px AS entry_px,
              f.exit_px AS rule_exit_px, t.exit_px AS exit_px
       FROM trades t JOIN forward_signals f ON f.id = t.signal_id
       WHERE f.rule = ?`,
    )
    .all(rule) as { dir: string | null; signal_px: number | null; entry_px: number | null; rule_exit_px: number | null; exit_px: number | null }[]
  const slippages: number[] = []
  for (const l of linked) {
    const s = tradeSlippage({ dir: l.dir, signalPx: l.signal_px, entryPx: l.entry_px, ruleExitPx: l.rule_exit_px, exitPx: l.exit_px })
    if (s !== null) slippages.push(s)
  }
  return computeForwardStats({
    rNets: outcomes.map((o) => o.r_net),
    skippedWithOutcome: outcomes.filter((o) => o.status === 'closed_skipped').length,
    indicatorSkips: skips.c,
    missedSignals: missed.c,
    unlogged: unlogged.c,
    slippages,
  })
}
