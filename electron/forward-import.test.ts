/**
 * Unit tests for the forward-test alert importer.
 * Run: node --test electron/forward-import.test.ts
 */
import test from 'node:test'
import assert from 'node:assert/strict'
import { DatabaseSync } from 'node:sqlite'
import { initSchema } from './schema.ts'
import { extractAlerts, importForwardAlerts, formatImportSummary } from './forward-import.ts'

const NOW = '2026-10-01T20:00:00.000Z'

function alert(fields: Record<string, unknown>): Record<string, unknown> {
  return {
    app: 'NQML', v: 1, rule: 'PREREG-005-PC', ev: 'ENTRY', id: '2026-10-01|MNQ1!', date: '2026-10-01', sym: 'MNQ1!',
    tf: '1', dir: 'long', sig_px: 21500.25, stop: 21300.0, risk_pts: 200.25, atr: 400.5, cost_pts: 1.5,
    exit_px: null, exit_reason: null, exit_time: null, pts_gross: null, R_gross: null, R_net: null, skip_reason: null,
    ...fields,
  }
}

const ENTRY = alert({})
const EXIT = alert({
  ev: 'EXIT', exit_px: 21600.25, exit_reason: 'time', exit_time: '15:55', pts_gross: 100, R_gross: 0.4994, R_net: 0.4919,
  msg: 'NQML EXIT {time} +0.49R',
})

const line = (o: Record<string, unknown>) => JSON.stringify(o)
/** A CSV cell the way TradingView's export writes it: quoted, inner quotes doubled. */
const csvCell = (s: string) => `"${s.replace(/"/g, '""')}"`

function freshDb(): DatabaseSync {
  const db = new DatabaseSync(':memory:')
  initSchema(db)
  return db
}

function allSignals(db: DatabaseSync) {
  return db.prepare('SELECT * FROM forward_signals ORDER BY id').all() as Record<string, unknown>[]
}

test('JSON lines: ENTRY then EXIT for the same id close one row', () => {
  const db = freshDb()
  const s = importForwardAlerts(db, [line(ENTRY), line(EXIT)].join('\n'), NOW)
  assert.equal(s.alerts, 2)
  assert.equal(s.inserted, 1)
  assert.equal(s.updated, 1)
  assert.equal(s.orphanExits, 0)
  const rows = allSignals(db)
  assert.equal(rows.length, 1)
  const r = rows[0]
  assert.equal(r.status, 'closed')
  assert.equal(r.dir, 'long')
  assert.equal(r.sig_px, 21500.25)
  assert.equal(r.exit_px, 21600.25)
  assert.equal(r.r_net, 0.4919)
  assert.equal(r.exit_reason, 'time')
  assert.equal(r.imported_at, NOW)
  const raw = JSON.parse(r.raw as string)
  assert.deepEqual(Object.keys(raw), ['ENTRY', 'EXIT'])
  assert.equal(raw.EXIT.msg, 'NQML EXIT {time} +0.49R') // msg (with braces) kept only in raw
})

test('TradingView CSV: JSON inside a quoted column, unknown column names, other alerts ignored', () => {
  const header = 'Alert ID,Ticker,Name,Description,Time'
  const rows = [
    `2911,CME_MINI:MNQ1!,NQML fwd,${csvCell(line(EXIT))},2026-10-01T19:55:00Z`, // newest first
    `2910,CME_MINI:MNQ1!,NQML fwd,${csvCell(line(ENTRY))},2026-10-01T13:45:00Z`,
    `2909,CME_MINI:MNQ1!,Other alert,"Crossing 21500, price moved",2026-10-01T13:00:00Z`,
    `2908,CME_MINI:MNQ1!,Other json,${csvCell('{"app":"OTHER","v":1}')},2026-10-01T12:00:00Z`,
  ]
  const db = freshDb()
  const s = importForwardAlerts(db, [header, ...rows].join('\r\n'), NOW)
  assert.equal(s.alerts, 2)
  assert.equal(s.entries, 1)
  assert.equal(s.exits, 1)
  assert.equal(s.orphanExits, 0, 'EXIT listed above its ENTRY still pairs up')
  assert.equal(s.ignored, 1)
  assert.equal(s.malformed, 0)
  const r = allSignals(db)
  assert.equal(r.length, 1)
  assert.equal(r[0].status, 'closed')
  assert.equal(r[0].sig_px, 21500.25)
})

test('junk and malformed lines are counted, never thrown', () => {
  const text = [
    'hello world',
    '{not json at all',
    '{"app":"NQML","v":1,"rule":"PREREG-005-PC","ev":"ENTRY"', // truncated
    line(alert({ id: '', ev: 'ENTRY' })), // missing id
    line(alert({ ev: 'BOGUS' })),
    line(alert({ ev: 'EXIT', R_net: null })), // EXIT without an outcome
    line(alert({ v: 2 })), // other contract version: ignored
    line(alert({ rule: 'PREREG-999' })), // other rule: ignored
    '[1,2,3]',
    '',
    line(ENTRY),
  ].join('\n')
  const db = freshDb()
  let s!: ReturnType<typeof importForwardAlerts>
  assert.doesNotThrow(() => {
    s = importForwardAlerts(db, text, NOW)
  })
  assert.equal(s.lines, 10)
  assert.equal(s.alerts, 1)
  assert.equal(s.malformed, 4)
  assert.equal(s.ignored, 2)
  assert.equal(allSignals(db).length, 1)
  assert.match(formatImportSummary(s), /4 malformed lines skipped/)
})

test('importing the same file twice gives the same state (idempotent), duplicates are unchanged', () => {
  const text = [line(ENTRY), line(ENTRY), line(EXIT)].join('\n')
  const db = freshDb()
  importForwardAlerts(db, text, NOW)
  const before = allSignals(db)
  const s2 = importForwardAlerts(db, text, '2026-12-31T00:00:00.000Z')
  assert.deepEqual(allSignals(db), before)
  assert.equal(s2.inserted, 0)
  assert.equal(s2.updated, 0)
  assert.equal(s2.unchanged, 3)
})

test('EXIT before ENTRY across two imports: orphan counted, outcome kept, ENTRY does not reopen it', () => {
  const db = freshDb()
  const s1 = importForwardAlerts(db, line(EXIT), NOW)
  assert.equal(s1.orphanExits, 1)
  assert.equal(allSignals(db)[0].status, 'closed')
  const s2 = importForwardAlerts(db, line(ENTRY), NOW)
  assert.equal(s2.orphanExits, 0)
  const r = allSignals(db)[0]
  assert.equal(r.status, 'closed')
  assert.equal(r.r_net, 0.4919)
  assert.equal(r.exit_px, 21600.25)
  // Re-importing the exit now finds its entry.
  assert.equal(importForwardAlerts(db, line(EXIT), NOW).orphanExits, 0)
})

test('SKIP risk_too_large followed by EXIT stores the outcome on the skipped row', () => {
  const id = '2026-10-02|MNQ1!'
  const skip = alert({ ev: 'SKIP', id, date: '2026-10-02', dir: 'short', skip_reason: 'risk_too_large' })
  const exit = alert({ ev: 'EXIT', id, date: '2026-10-02', dir: 'short', exit_px: 21300, exit_reason: 'stop', exit_time: '11:02', pts_gross: -200.25, R_gross: -1, R_net: -1.0075 })
  const db = freshDb()
  // Newest-first order again: EXIT above its SKIP.
  const s = importForwardAlerts(db, [line(exit), line(skip)].join('\n'), NOW)
  assert.equal(s.orphanExits, 0, 'an EXIT whose id has a SKIP is not an orphan')
  const r = allSignals(db)[0]
  assert.equal(r.status, 'closed_skipped')
  assert.equal(r.skip_reason, 'risk_too_large')
  assert.equal(r.r_net, -1.0075)
  assert.equal(r.dir, 'short')
})

test('SKIP without an outcome and NOSIGNAL are stored with their own status', () => {
  const db = freshDb()
  importForwardAlerts(
    db,
    [
      line(alert({ ev: 'SKIP', id: '2026-10-03|MNQ1!', date: '2026-10-03', skip_reason: 'no_atr' })),
      line(alert({ ev: 'NOSIGNAL', id: '2026-10-04|MNQ1!', date: '2026-10-04', dir: null, sig_px: null, stop: null, risk_pts: null })),
    ].join('\n'),
    NOW,
  )
  const rows = allSignals(db)
  assert.deepEqual(rows.map((r) => r.status), ['skipped_by_indicator', 'nosignal'])
})

test('extractAlerts dedupes the same JSON repeated in two columns of one row', () => {
  const row = `1,MNQ1!,${csvCell(line(ENTRY))},${csvCell(line(ENTRY))}`
  const r = extractAlerts(row)
  assert.equal(r.alerts.length, 1)
})

test('a missed trade linked to a signal picks up the rule R_net once the EXIT is imported', () => {
  const db = freshDb()
  importForwardAlerts(db, line(ENTRY), NOW)
  db.prepare(`INSERT INTO missed_trades (date, signal_id, reason_missed) VALUES ('2026-10-01', '2026-10-01|MNQ1!', 'not_at_screen')`).run()
  db.prepare(`INSERT INTO missed_trades (date, reason_missed, would_be_pnl) VALUES ('2026-10-01', 'unlinked', 50)`).run()
  importForwardAlerts(db, line(EXIT), NOW)
  const rows = db.prepare('SELECT signal_id, would_be_r FROM missed_trades ORDER BY id').all() as { would_be_r: number | null }[]
  assert.equal(rows[0].would_be_r, 0.4919)
  assert.equal(rows[1].would_be_r, null)
})
