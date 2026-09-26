/**
 * Unit tests for the forward-test statistics and the stop/continue decision.
 * Run: node --test electron/forward-stats.test.ts
 */
import test from 'node:test'
import assert from 'node:assert/strict'
import { DatabaseSync } from 'node:sqlite'
import { initSchema } from './schema.ts'
import { importForwardAlerts } from './forward-import.ts'
import { computeForwardStats, loadForwardStats, tStatistic, tradeSlippage } from './forward-stats.ts'

const base = { indicatorSkips: 0, missedSignals: 0, slippages: [] as number[] }
const repeat = (pattern: number[], n: number) => Array.from({ length: n }, (_, i) => pattern[i % pattern.length])

test('basic stats: N, mean, t, win rate, cumulative R, progress', () => {
  const s = computeForwardStats({ ...base, rNets: [1, -0.5, 0.5, -1, 2] })
  assert.equal(s.n, 5)
  assert.equal(s.avgR, 0.4)
  assert.equal(s.cumR, 2)
  assert.equal(s.winRate, 60)
  assert.equal(s.progress, 5 / 150)
  // sample variance = 5.7 / 4 = 1.425 -> t = 0.4 / sqrt(1.425 / 5)
  assert.ok(Math.abs((s.tStat ?? 0) - 0.4 / Math.sqrt(1.425 / 5)) < 1e-12)
  assert.equal(s.status, 'Collecting: 5/150')
  assert.equal(s.decision, 'collecting')
})

test('empty sample and degenerate t', () => {
  const s = computeForwardStats({ ...base, rNets: [] })
  assert.equal(s.n, 0)
  assert.equal(s.avgR, null)
  assert.equal(s.tStat, null)
  assert.equal(s.winRate, null)
  assert.equal(s.status, 'Collecting: 0/150')
  assert.equal(tStatistic([1]), null)
  assert.equal(tStatistic([0.5, 0.5, 0.5]), null)
})

test('STOP: edge likely absent at N >= 60 with average <= -0.10 (inclusive), not before 60', () => {
  assert.equal(computeForwardStats({ ...base, rNets: repeat([-0.1], 59) }).decision, 'collecting')
  const s = computeForwardStats({ ...base, rNets: repeat([0.9, -1.1], 60) }) // mean exactly -0.10
  assert.equal(s.status, 'STOP: edge likely absent')
  assert.equal(computeForwardStats({ ...base, rNets: repeat([0.91, -1.1], 60) }).decision, 'collecting')
})

test('STOP: execution when average slippage > 2 pt (strict), at any N', () => {
  assert.equal(computeForwardStats({ ...base, rNets: [1], slippages: [2, 2] }).decision, 'collecting')
  const s = computeForwardStats({ ...base, rNets: [1], slippages: [1, 3.5] })
  assert.equal(s.avgSlippage, 2.25)
  assert.equal(s.status, 'STOP: execution')
})

test('N >= 150: average <= 0 stops the research line, positive with t >= 2 passes, otherwise collecting', () => {
  assert.equal(computeForwardStats({ ...base, rNets: repeat([1, -1], 150) }).status, 'STOP: research line ends')
  const pass = computeForwardStats({ ...base, rNets: repeat([1.3, -0.9], 150) }) // mean 0.2, sd ~1.1
  assert.ok((pass.tStat ?? 0) >= 2)
  assert.equal(pass.status, 'Forward sample passes (not proof of profitability)')
  const weak = computeForwardStats({ ...base, rNets: repeat([1.05, -1], 150) }) // mean 0.025, t < 2
  assert.ok((weak.tStat ?? 0) < 2)
  assert.equal(weak.status, 'Collecting: 150/150')
  assert.equal(weak.progress, 1)
})

test('edge stop takes precedence over execution stop (rules applied in written order)', () => {
  const s = computeForwardStats({ ...base, rNets: repeat([-0.5], 60), slippages: [5] })
  assert.equal(s.decision, 'stop_edge')
})

test('tradeSlippage: entry and exit sides, both directions', () => {
  assert.equal(tradeSlippage({ dir: 'long', signalPx: 100, entryPx: 101 }), 1)
  assert.equal(tradeSlippage({ dir: 'short', signalPx: 100, entryPx: 99.5 }), 0.5)
  assert.equal(tradeSlippage({ dir: 'long', signalPx: 100, entryPx: 100.5, ruleExitPx: 120, exitPx: 119.25 }), 1.25)
  assert.equal(tradeSlippage({ dir: 'short', signalPx: 100, entryPx: 100, ruleExitPx: 90, exitPx: 90.5 }), 0.5)
  assert.equal(tradeSlippage({ dir: 'long', signalPx: 100, entryPx: 99 }), -1) // price improvement
  assert.equal(tradeSlippage({ dir: 'long', signalPx: null, entryPx: 99 }), null)
  assert.equal(tradeSlippage({ dir: null, signalPx: 100, entryPx: 99 }), null)
})

test('loadForwardStats: rule outcomes incl. SKIP->EXIT, skips, missed, slippage from linked trades', () => {
  const db = new DatabaseSync(':memory:')
  initSchema(db)
  const a = (f: Record<string, unknown>) =>
    JSON.stringify({ app: 'NQML', v: 1, rule: 'PREREG-005-PC', sym: 'MNQ1!', tf: '1', cost_pts: 1.5, ...f })
  const text = [
    a({ ev: 'ENTRY', id: 'd1|MNQ1!', date: '2026-10-01', dir: 'long', sig_px: 100, stop: 90, risk_pts: 10 }),
    a({ ev: 'EXIT', id: 'd1|MNQ1!', date: '2026-10-01', dir: 'long', sig_px: 100, exit_px: 110, R_net: 0.85 }),
    a({ ev: 'SKIP', id: 'd2|MNQ1!', date: '2026-10-02', dir: 'short', sig_px: 200, skip_reason: 'risk_too_large' }),
    a({ ev: 'EXIT', id: 'd2|MNQ1!', date: '2026-10-02', dir: 'short', exit_px: 210, R_net: -1.15 }),
    a({ ev: 'SKIP', id: 'd3|MNQ1!', date: '2026-10-03', dir: 'long', skip_reason: 'no_atr' }),
    a({ ev: 'ENTRY', id: 'd4|MNQ1!', date: '2026-10-04', dir: 'long', sig_px: 300, stop: 290, risk_pts: 10 }),
    a({ ev: 'EXIT', id: 'd4|MNQ1!', date: '2026-10-04', dir: 'long', exit_px: 305, R_net: 0.35 }),
    a({ ev: 'ENTRY', id: 'd5|MNQ1!', date: '2026-10-05', dir: 'long', sig_px: 400, stop: 390, risk_pts: 10 }),
    a({ ev: 'NOSIGNAL', id: 'd6|MNQ1!', date: '2026-10-06', dir: null }),
  ].join('\n')
  importForwardAlerts(db, text)
  // d1 taken with 1 pt worse entry and 0.5 pt worse exit; d4 missed; d5 not logged yet.
  db.prepare(
    `INSERT INTO trades (date, pnl, signal_id, signal_px, entry_px, exit_px) VALUES ('2026-10-01', 10, 'd1|MNQ1!', 100, 101, 109.5)`,
  ).run()
  db.prepare(`INSERT INTO missed_trades (date, signal_id, would_be_r, reason_missed) VALUES ('2026-10-04', 'd4|MNQ1!', 0.35, 'not_at_screen')`).run()

  const s = loadForwardStats(db, 'PREREG-005-PC')
  assert.equal(s.n, 3, 'd1, d2 (skipped by indicator, with outcome) and d4')
  assert.equal(s.skippedWithOutcome, 1)
  assert.ok(Math.abs((s.avgR ?? 0) - (0.85 - 1.15 + 0.35) / 3) < 1e-12)
  assert.equal(s.indicatorSkips, 2)
  assert.equal(s.missedSignals, 1)
  assert.equal(s.unlogged, 1, 'd5 has neither a trade nor a missed trade')
  assert.equal(s.linkedWithFills, 1)
  assert.equal(s.avgSlippage, 1.5)
  assert.equal(s.status, 'Collecting: 3/150')
})
