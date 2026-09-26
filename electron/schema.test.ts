/**
 * Migration tests: a fresh database and one created by an older version of the app.
 * Run: node --test electron/schema.test.ts
 */
import test from 'node:test'
import assert from 'node:assert/strict'
import { DatabaseSync } from 'node:sqlite'
import { initSchema, columnExists } from './schema.ts'

const NEW_TRADE_COLS = ['signal_id', 'signal_px', 'entry_px', 'stop_px', 'exit_px']
const NEW_MISSED_COLS = ['signal_id', 'would_be_r']

function assertForwardSchema(db: DatabaseSync) {
  for (const c of NEW_TRADE_COLS) assert.ok(columnExists(db, 'trades', c), `trades.${c}`)
  for (const c of NEW_MISSED_COLS) assert.ok(columnExists(db, 'missed_trades', c), `missed_trades.${c}`)
  for (const c of ['id', 'rule', 'date', 'status', 'r_net', 'skip_reason', 'imported_at', 'raw']) {
    assert.ok(columnExists(db, 'forward_signals', c), `forward_signals.${c}`)
  }
}

test('fresh database gets the forward-test schema, and re-running is a no-op', () => {
  const db = new DatabaseSync(':memory:')
  initSchema(db)
  assertForwardSchema(db)
  assert.doesNotThrow(() => initSchema(db))
  assertForwardSchema(db)
})

test('old-schema database keeps its rows and gains nullable columns', () => {
  const db = new DatabaseSync(':memory:')
  // Shape of an early install: size/entry_price/exit_price/screenshot_path, no source/entry_time,
  // missed_trades without tags, accounts without account_type.
  db.exec(`
    CREATE TABLE accounts (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, broker TEXT,
      starting_balance REAL NOT NULL DEFAULT 0, currency TEXT NOT NULL DEFAULT 'USD');
    CREATE TABLE strategies (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, description TEXT);
    CREATE TABLE trades (
      id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT, date TEXT NOT NULL, pair TEXT, session TEXT, direction TEXT,
      entry_price REAL, exit_price REAL, size REAL, pnl REAL NOT NULL DEFAULT 0, r_multiple REAL,
      followed_plan INTEGER NOT NULL DEFAULT 0, break_even INTEGER NOT NULL DEFAULT 0, entry_win INTEGER NOT NULL DEFAULT 0,
      strategy_id INTEGER, account_id INTEGER, positive_tags TEXT NOT NULL DEFAULT '[]',
      negative_tags TEXT NOT NULL DEFAULT '[]', notes TEXT, screenshot_path TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')));
    CREATE TABLE missed_trades (id INTEGER PRIMARY KEY AUTOINCREMENT, date TEXT NOT NULL, pair TEXT, direction TEXT,
      would_be_pnl REAL, reason_missed TEXT, strategy_id INTEGER, notes TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')));
    INSERT INTO accounts (name, broker) VALUES ('Apex 50k', 'Apex');
    INSERT INTO trades (date, pair, size, pnl, entry_price) VALUES ('2025-01-02', 'NQ', 250, 480, 21000);
    INSERT INTO missed_trades (date, pair, would_be_pnl, reason_missed) VALUES ('2025-01-03', 'NQ', 300, 'late');
  `)
  initSchema(db)
  assertForwardSchema(db)
  const t = db.prepare('SELECT * FROM trades').get() as Record<string, unknown>
  assert.equal(t.pnl, 480)
  assert.equal(t.risk_per_trade, 250) // existing migration still ran
  assert.equal(t.source, 'manual')
  for (const c of NEW_TRADE_COLS) assert.equal(t[c], null)
  const m = db.prepare('SELECT * FROM missed_trades').get() as Record<string, unknown>
  assert.equal(m.reason_missed, 'late')
  assert.equal(m.signal_id, null)
  assert.equal(m.would_be_r, null)
  const a = db.prepare('SELECT account_type FROM accounts').get() as { account_type: string }
  assert.equal(a.account_type, 'prop')
  assert.doesNotThrow(() => initSchema(db))
})
