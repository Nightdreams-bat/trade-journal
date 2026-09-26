import { DatabaseSync } from 'node:sqlite'
import { app } from 'electron'
import path from 'node:path'
import fs from 'node:fs'
import { initSchema } from './schema'

let db: DatabaseSync | null = null

export function getDb(): DatabaseSync {
  if (db) return db

  const userData = app.getPath('userData')
  fs.mkdirSync(userData, { recursive: true })
  fs.mkdirSync(path.join(userData, 'screenshots'), { recursive: true })
  const dbPath = path.join(userData, 'tradejournal.db')

  db = new DatabaseSync(dbPath)
  db.exec('PRAGMA foreign_keys = ON;')

  initSchema(db)

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
