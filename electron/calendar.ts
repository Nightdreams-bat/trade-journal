/**
 * Economic calendar — ForexFactory's published weekly export, cached locally.
 *
 * This module is the only place in TradeJournal that touches the network, and it is opt-in: with
 * `calendar_enabled` unset (the default) nothing here ever opens a socket. Everything the UI reads
 * comes out of SQLite, so the calendar tab keeps working with the machine offline; only refreshing
 * it needs a connection.
 *
 * Why this source rather than scraping the site: https://www.forexfactory.com/calendar answers a
 * plain request with 403 (Cloudflare), which is why the Python tools in this space drive a real
 * browser through Selenium. None of that can ship inside an Electron .exe. ForexFactory's own JSON
 * export answers an ordinary GET and carries the same fields, so we parse that instead.
 *
 * Feed shape, verified against live data:
 *   { "title": "ISM Manufacturing PMI", "country": "USD",
 *     "date": "2026-09-01T10:00:00-04:00", "impact": "High",
 *     "forecast": "55.2", "previous": "55.6" }
 *
 * Every timestamp carries an explicit UTC offset, so instants are unambiguous and the renderer can
 * format them in the viewer's own zone without guessing.
 */

import { getDb, getSetting, setSetting } from './db'
import { parseFeed, type Impact, type ParsedEvent } from './calendar-parse'

export { parseFeed }
export type { Impact, ParsedEvent }

const ENABLED_KEY = 'calendar_enabled'
const SYNC_ON_LAUNCH_KEY = 'calendar_sync_on_launch'
const LAST_SYNC_KEY = 'calendar_last_sync'
const LAST_ERROR_KEY = 'calendar_last_error'

/** The single host this app is ever allowed to contact. Shown verbatim in Settings. */
export const SOURCE_URL = 'https://nfs.faireconomy.media/ff_calendar_thisweek.json'

const FETCH_TIMEOUT_MS = 10_000

export interface CalendarEvent {
  id: number
  title: string
  country: string
  /** ISO 8601 with the feed's offset, e.g. '2026-09-01T10:00:00-04:00'. */
  starts_at: string
  /** Local calendar day of `starts_at`, for joining against `trades.date`. */
  date: string
  impact: Impact
  forecast: string | null
  previous: string | null
  all_day: number
}

export interface CalendarConfig {
  enabled: boolean
  syncOnLaunch: boolean
  lastSync: string | null
  lastError: string | null
  eventCount: number
  sourceUrl: string
}

export interface SyncResult {
  ok: boolean
  inserted: number
  updated: number
  error?: string
}

// ---------------------------------------------------------------------------
// config
// ---------------------------------------------------------------------------

export function isEnabled(): boolean {
  return getSetting(ENABLED_KEY) === '1'
}

export function shouldSyncOnLaunch(): boolean {
  return isEnabled() && getSetting(SYNC_ON_LAUNCH_KEY) === '1'
}

export function getConfig(): CalendarConfig {
  const row = getDb().prepare('SELECT COUNT(*) AS c FROM calendar_events').get() as { c: number }
  return {
    enabled: isEnabled(),
    syncOnLaunch: getSetting(SYNC_ON_LAUNCH_KEY) === '1',
    lastSync: getSetting(LAST_SYNC_KEY),
    lastError: getSetting(LAST_ERROR_KEY),
    eventCount: row.c,
    sourceUrl: SOURCE_URL,
  }
}

export function setEnabled(enabled: boolean): CalendarConfig {
  setSetting(ENABLED_KEY, enabled ? '1' : '0')
  // Clear a stale failure so turning the feature back on doesn't greet the user with an old error.
  if (!enabled) setSetting(LAST_ERROR_KEY, '')
  return getConfig()
}

export function setSyncOnLaunch(value: boolean): CalendarConfig {
  setSetting(SYNC_ON_LAUNCH_KEY, value ? '1' : '0')
  return getConfig()
}

// ---------------------------------------------------------------------------
// sync
// ---------------------------------------------------------------------------

async function fetchFeed(): Promise<unknown> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)
  try {
    const res = await fetch(SOURCE_URL, {
      signal: controller.signal,
      headers: { Accept: 'application/json', 'User-Agent': 'TradeJournal' },
    })
    if (!res.ok) throw new Error(`Calendar feed returned HTTP ${res.status}`)
    return await res.json()
  } finally {
    clearTimeout(timer)
  }
}

/** Writes parsed events, upserting on `event_key`. Returns how many rows were new vs refreshed. */
export function storeEvents(events: ParsedEvent[]): { inserted: number; updated: number } {
  const db = getDb()
  const fetchedAt = new Date().toISOString()
  const existing = db.prepare('SELECT event_key FROM calendar_events WHERE event_key = ?')
  const upsert = db.prepare(`
    INSERT INTO calendar_events
      (event_key, title, country, starts_at, date, impact, forecast, previous, all_day, fetched_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(event_key) DO UPDATE SET
      impact = excluded.impact,
      forecast = excluded.forecast,
      previous = excluded.previous,
      all_day = excluded.all_day,
      fetched_at = excluded.fetched_at
  `)

  let inserted = 0
  let updated = 0
  for (const e of events) {
    const seen = existing.get(e.eventKey) != null
    upsert.run(
      e.eventKey,
      e.title,
      e.country,
      e.startsAt,
      e.date,
      e.impact,
      e.forecast,
      e.previous,
      e.allDay ? 1 : 0,
      fetchedAt
    )
    if (seen) updated++
    else inserted++
  }
  return { inserted, updated }
}

/**
 * Refreshes the cache from the feed.
 *
 * Never throws: a failure is recorded and returned so the UI can say what went wrong while still
 * showing the events it already has. Refuses outright when the feature is disabled, so the
 * offline-by-default promise can't be broken by a stray caller.
 */
export async function sync(): Promise<SyncResult> {
  if (!isEnabled()) {
    return { ok: false, inserted: 0, updated: 0, error: 'Economic calendar is turned off in Settings' }
  }
  try {
    const events = parseFeed(await fetchFeed())
    const { inserted, updated } = storeEvents(events)
    setSetting(LAST_SYNC_KEY, new Date().toISOString())
    setSetting(LAST_ERROR_KEY, '')
    return { ok: true, inserted, updated }
  } catch (err) {
    const message =
      err instanceof Error
        ? err.name === 'AbortError'
          ? 'Timed out reaching the calendar feed'
          : err.message
        : 'Could not reach the calendar feed'
    setSetting(LAST_ERROR_KEY, message)
    return { ok: false, inserted: 0, updated: 0, error: message }
  }
}

// ---------------------------------------------------------------------------
// reads  (pure SQLite — these work with no network at all)
// ---------------------------------------------------------------------------

export function getEvents(range?: { from?: string; to?: string }): CalendarEvent[] {
  const where: string[] = []
  const params: string[] = []
  if (range?.from) {
    where.push('date >= ?')
    params.push(range.from)
  }
  if (range?.to) {
    where.push('date <= ?')
    params.push(range.to)
  }
  const sql = `SELECT id, title, country, starts_at, date, impact, forecast, previous, all_day
               FROM calendar_events
               ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
               ORDER BY starts_at ASC`
  return getDb().prepare(sql).all(...params) as unknown as CalendarEvent[]
}
