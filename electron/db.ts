import { DatabaseSync } from 'node:sqlite'
import { app } from 'electron'
import path from 'node:path'
import fs from 'node:fs'

let db: DatabaseSync | null = null

function columnExists(database: DatabaseSync, table: string, column: string): boolean {
  const rows = database.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[]
  return rows.some((r) => r.name === column)
}

function migrateTradesSchema(database: DatabaseSync) {
  const hasSize = columnExists(database, 'trades', 'size')
  const hasRisk = columnExists(database, 'trades', 'risk_per_trade')
  if (hasSize && !hasRisk) {
    database.exec('ALTER TABLE trades ADD COLUMN risk_per_trade REAL')
    database.exec('UPDATE trades SET risk_per_trade = size WHERE risk_per_trade IS NULL')
  }
  for (const col of ['entry_price', 'exit_price', 'size']) {
    if (columnExists(database, 'trades', col)) {
      try {
        database.exec(`ALTER TABLE trades DROP COLUMN ${col}`)
      } catch {
        /* older sqlite without DROP COLUMN support: leave the column, it's simply unused going forward */
      }
    }
  }
}

function migrateMissedTradesSchema(database: DatabaseSync) {
  if (!columnExists(database, 'missed_trades', 'tags')) {
    database.exec("ALTER TABLE missed_trades ADD COLUMN tags TEXT NOT NULL DEFAULT '[]'")
  }
}

// 'source' distinguishes trades Matei logged himself ('manual', the default) from
// trades an AI trading agent produced in shadow/backtest mode ('agent') — same shape,
// same table, just filtered into separate tabs (Trades vs Backtest) in the UI.
function migrateTradesSourceColumn(database: DatabaseSync) {
  if (!columnExists(database, 'trades', 'source')) {
    database.exec("ALTER TABLE trades ADD COLUMN source TEXT NOT NULL DEFAULT 'manual'")
  }
}

// Optional local entry time ('HH:MM') so a trade can be placed against the economic calendar to the
// minute. Nullable on purpose: every trade logged before this column existed keeps working, and news
// matching simply falls back to whole-day resolution for them.
function migrateTradesEntryTime(database: DatabaseSync) {
  if (!columnExists(database, 'trades', 'entry_time')) {
    database.exec('ALTER TABLE trades ADD COLUMN entry_time TEXT')
  }
}

function migrateAccountsSchema(database: DatabaseSync) {
  if (columnExists(database, 'accounts', 'account_type')) return
  database.exec("ALTER TABLE accounts ADD COLUMN account_type TEXT NOT NULL DEFAULT 'live'")
  const legacyPropRe = /ftmo|prop|funded|the5ers|the 5ers|mff|myff|fundingpips|e8|alpha capital|topstep|apex/i
  const rows = database.prepare('SELECT id, name, broker FROM accounts').all() as {
    id: number
    name: string
    broker: string | null
  }[]
  for (const r of rows) {
    if (legacyPropRe.test(`${r.name} ${r.broker ?? ''}`)) {
      database.prepare('UPDATE accounts SET account_type = ? WHERE id = ?').run('prop', r.id)
    }
  }
}

function migrateScreenshotsToImages(database: DatabaseSync) {
  if (!columnExists(database, 'trades', 'screenshot_path')) return
  const rows = database
    .prepare('SELECT id, screenshot_path FROM trades WHERE screenshot_path IS NOT NULL')
    .all() as { id: number; screenshot_path: string }[]
  for (const r of rows) {
    const existing = database
      .prepare('SELECT 1 FROM entity_images WHERE entity_type = ? AND entity_id = ? AND path = ?')
      .get('trade', r.id, r.screenshot_path)
    if (!existing) {
      database
        .prepare('INSERT INTO entity_images (entity_type, entity_id, path) VALUES (?, ?, ?)')
        .run('trade', r.id, r.screenshot_path)
    }
  }
  try {
    database.exec('ALTER TABLE trades DROP COLUMN screenshot_path')
  } catch {
    /* older sqlite: leave the column, it's simply unused going forward */
  }
}

export function getDb(): DatabaseSync {
  if (db) return db

  const userData = app.getPath('userData')
  fs.mkdirSync(userData, { recursive: true })
  fs.mkdirSync(path.join(userData, 'screenshots'), { recursive: true })
  const dbPath = path.join(userData, 'tradejournal.db')

  db = new DatabaseSync(dbPath)
  db.exec('PRAGMA foreign_keys = ON;')

  db.exec(`
    CREATE TABLE IF NOT EXISTS accounts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      broker TEXT,
      starting_balance REAL NOT NULL DEFAULT 0,
      currency TEXT NOT NULL DEFAULT 'USD'
    );

    CREATE TABLE IF NOT EXISTS strategies (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT
    );

    CREATE TABLE IF NOT EXISTS trades (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT,
      date TEXT NOT NULL,
      pair TEXT,
      session TEXT,
      direction TEXT,
      risk_per_trade REAL,
      pnl REAL NOT NULL DEFAULT 0,
      r_multiple REAL,
      followed_plan INTEGER NOT NULL DEFAULT 0,
      break_even INTEGER NOT NULL DEFAULT 0,
      entry_win INTEGER NOT NULL DEFAULT 0,
      strategy_id INTEGER REFERENCES strategies(id) ON DELETE SET NULL,
      account_id INTEGER REFERENCES accounts(id) ON DELETE SET NULL,
      positive_tags TEXT NOT NULL DEFAULT '[]',
      negative_tags TEXT NOT NULL DEFAULT '[]',
      notes TEXT,
      source TEXT NOT NULL DEFAULT 'manual',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS missed_trades (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL,
      pair TEXT,
      direction TEXT,
      would_be_pnl REAL,
      reason_missed TEXT,
      strategy_id INTEGER REFERENCES strategies(id) ON DELETE SET NULL,
      tags TEXT NOT NULL DEFAULT '[]',
      notes TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS daily_reviews (
      date TEXT PRIMARY KEY,
      notes TEXT,
      emotion TEXT,
      lessons_learned TEXT
    );

    CREATE TABLE IF NOT EXISTS entity_images (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      entity_type TEXT NOT NULL,
      entity_id INTEGER NOT NULL,
      path TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_entity_images_owner ON entity_images(entity_type, entity_id);

    CREATE TABLE IF NOT EXISTS confluences (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS entity_confluences (
      entity_type TEXT NOT NULL,
      entity_id INTEGER NOT NULL,
      confluence_id INTEGER NOT NULL REFERENCES confluences(id) ON DELETE CASCADE,
      PRIMARY KEY (entity_type, entity_id, confluence_id)
    );
    CREATE INDEX IF NOT EXISTS idx_entity_confluences_owner ON entity_confluences(entity_type, entity_id);

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    -- Economic calendar events, cached from ForexFactory's published weekly export.
    -- The feed only ever publishes the current week, so this table IS the history: every sync
    -- upserts on event_key, which is why re-syncing a week refreshes forecast/previous in place
    -- instead of duplicating rows, and why the archive grows from the first sync onward.
    CREATE TABLE IF NOT EXISTS calendar_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      event_key TEXT NOT NULL UNIQUE,
      title TEXT NOT NULL,
      country TEXT NOT NULL,
      starts_at TEXT NOT NULL,
      date TEXT NOT NULL,
      impact TEXT NOT NULL,
      forecast TEXT,
      previous TEXT,
      all_day INTEGER NOT NULL DEFAULT 0,
      fetched_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_calendar_events_date ON calendar_events(date);

    DROP TABLE IF EXISTS milestones;
  `)

  migrateTradesSchema(db)
  migrateMissedTradesSchema(db)
  migrateTradesSourceColumn(db)
  migrateScreenshotsToImages(db)
  migrateAccountsSchema(db)
  migrateTradesEntryTime(db)

  const accountCount = db.prepare('SELECT COUNT(*) as c FROM accounts').get() as { c: number }
  if (accountCount.c === 0) {
    db.prepare(
      'INSERT INTO accounts (name, broker, starting_balance, currency) VALUES (?, ?, ?, ?)'
    ).run('Main Account', '', 10000, 'USD')
  }

  return db
}

// ---------------------------------------------------------------------------
// generic key/value settings
// ---------------------------------------------------------------------------

export function getSetting(key: string): string | null {
  const row = getDb().prepare('SELECT value FROM settings WHERE key = ?').get(key) as
    | { value: string }
    | undefined
  return row ? row.value : null
}

export function setSetting(key: string, value: string): void {
  getDb()
    .prepare(
      'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value'
    )
    .run(key, value)
}

export function deleteSetting(key: string): void {
  getDb().prepare('DELETE FROM settings WHERE key = ?').run(key)
}
