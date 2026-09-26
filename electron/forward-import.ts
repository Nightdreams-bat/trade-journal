/**
 * Importer for the NQ Momentum Lab forward-test alerts (alert contract v1, app "NQML").
 *
 * Input is either TradingView's alert-log CSV export (the one-line JSON sits somewhere in a
 * message/description column, CSV-escaped with doubled quotes; the column names are not relied on)
 * or a plain file with one JSON object per line. Both are handled the same way: every physical line
 * is scanned for JSON objects, so the column layout never matters.
 *
 * Pure apart from the `DatabaseSync` handle it is given, so it runs under `node --test` against an
 * in-memory database (see forward-import.test.ts). Bad input never throws: it is counted in the
 * returned summary.
 */
import type { DatabaseSync } from 'node:sqlite'

export const FORWARD_APP = 'NQML'
export const FORWARD_VERSION = 1
export const FORWARD_RULE = 'PREREG-005-PC'

export type ForwardEvent = 'ENTRY' | 'EXIT' | 'SKIP' | 'NOSIGNAL'
export type ForwardStatus = 'open' | 'closed' | 'skipped_by_indicator' | 'closed_skipped' | 'nosignal'

const EVENTS: readonly ForwardEvent[] = ['NOSIGNAL', 'ENTRY', 'SKIP', 'EXIT']

/** One validated alert. Numeric fields are finite numbers or null. */
export interface ForwardAlert {
  ev: ForwardEvent
  id: string
  rule: string
  date: string
  sym: string | null
  tf: string | null
  dir: 'long' | 'short' | null
  sig_px: number | null
  stop: number | null
  risk_pts: number | null
  atr: number | null
  cost_pts: number | null
  exit_px: number | null
  exit_reason: string | null
  exit_time: string | null
  pts_gross: number | null
  r_gross: number | null
  r_net: number | null
  skip_reason: string | null
  /** The parsed object exactly as received (including the optional `msg`), kept for audit. */
  raw: Record<string, unknown>
}

export interface ExtractResult {
  alerts: ForwardAlert[]
  /** Non-empty lines read. */
  lines: number
  /** Lines mentioning NQML that held no parseable alert, plus NQML v1 alerts that failed validation. */
  malformed: number
  /** Well-formed JSON objects that are not this rule's alerts (other app, version or rule). */
  ignored: number
}

export interface ForwardImportSummary {
  lines: number
  alerts: number
  entries: number
  exits: number
  skips: number
  nosignals: number
  /** Alerts that created a new forward_signals row. */
  inserted: number
  /** Alerts that changed an existing row. */
  updated: number
  /** Alerts already fully recorded (re-imports, duplicate lines). */
  unchanged: number
  /** EXIT alerts whose id had no ENTRY or SKIP, neither stored nor in this file. The outcome is still stored. */
  orphanExits: number
  malformed: number
  ignored: number
}

// ---------------------------------------------------------------------------
// parsing
// ---------------------------------------------------------------------------

/**
 * Returns the index of the `}` closing the object that opens at `start`, or -1. String-aware, so
 * braces inside string values (e.g. a `msg`) do not unbalance the match.
 */
function matchObject(text: string, start: number): number {
  let depth = 0
  let inString = false
  for (let i = start; i < text.length; i++) {
    const ch = text[i]
    if (inString) {
      if (ch === '\\') i++
      else if (ch === '"') inString = false
      continue
    }
    if (ch === '"') inString = true
    else if (ch === '{') depth++
    else if (ch === '}') {
      depth--
      if (depth === 0) return i
    }
  }
  return -1
}

/** Every top-level JSON object found in one line of text. */
function objectsInLine(line: string): Record<string, unknown>[] {
  // Inside a quoted CSV cell the JSON's quotes are doubled ({""app"":""NQML""...}). Undo that for the
  // whole line first; the scan below starts at '{', so the rest of the CSV row does not matter.
  const text = /""app""\s*:/.test(line) ? line.replace(/""/g, '"') : line
  const found: Record<string, unknown>[] = []
  let i = text.indexOf('{')
  while (i !== -1) {
    const end = matchObject(text, i)
    if (end === -1) break
    let next = i + 1
    try {
      const value: unknown = JSON.parse(text.slice(i, end + 1))
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        found.push(value as Record<string, unknown>)
        next = end + 1
      }
    } catch {
      /* not JSON from here; try the next '{' */
    }
    i = text.indexOf('{', next)
  }
  return found
}

function num(v: unknown): number | null {
  if (typeof v === 'number') return Number.isFinite(v) ? v : null
  if (typeof v === 'string' && v.trim() !== '') {
    const n = Number(v)
    return Number.isFinite(n) ? n : null
  }
  return null
}

function str(v: unknown): string | null {
  if (typeof v === 'string') return v.trim() === '' ? null : v.trim()
  if (typeof v === 'number' && Number.isFinite(v)) return String(v)
  return null
}

/** Validates an NQML v1 object for this rule. Returns null when a required field is missing or wrong. */
function toAlert(o: Record<string, unknown>): ForwardAlert | null {
  const ev = typeof o.ev === 'string' ? (o.ev.toUpperCase() as ForwardEvent) : null
  if (!ev || !EVENTS.includes(ev)) return null
  const id = str(o.id)
  const date = str(o.date)
  if (!id || !date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return null
  const dirRaw = typeof o.dir === 'string' ? o.dir.toLowerCase() : null
  if (dirRaw !== null && dirRaw !== 'long' && dirRaw !== 'short') return null
  if ((ev === 'ENTRY' || ev === 'SKIP') && dirRaw === null) return null
  const alert: ForwardAlert = {
    ev,
    id,
    rule: String(o.rule),
    date,
    sym: str(o.sym),
    tf: str(o.tf),
    dir: dirRaw as 'long' | 'short' | null,
    sig_px: num(o.sig_px),
    stop: num(o.stop),
    risk_pts: num(o.risk_pts),
    atr: num(o.atr),
    cost_pts: num(o.cost_pts),
    exit_px: num(o.exit_px),
    exit_reason: str(o.exit_reason),
    exit_time: str(o.exit_time),
    pts_gross: num(o.pts_gross),
    r_gross: num(o.R_gross ?? o.r_gross),
    r_net: num(o.R_net ?? o.r_net),
    skip_reason: str(o.skip_reason),
    raw: o,
  }
  // An EXIT is only useful to the test if it carries the rule's net outcome.
  if (ev === 'EXIT' && alert.r_net === null) return null
  return alert
}

/** Finds this rule's alerts in CSV or JSON-lines text. Never throws. */
export function extractAlerts(text: string, rule: string = FORWARD_RULE): ExtractResult {
  const result: ExtractResult = { alerts: [], lines: 0, malformed: 0, ignored: 0 }
  const lines = text.replace(/^﻿/, '').split(/\r\n|\n|\r/)
  for (const line of lines) {
    if (!line.trim()) continue
    result.lines++
    let ours = 0
    let bad = 0
    const seen = new Set<string>()
    for (const o of objectsInLine(line)) {
      if (o.app !== FORWARD_APP) {
        result.ignored++
        continue
      }
      if (Number(o.v) !== FORWARD_VERSION || o.rule !== rule) {
        result.ignored++
        ours++
        continue
      }
      ours++
      const alert = toAlert(o)
      if (!alert) {
        bad++
        continue
      }
      // The same JSON can appear in two columns of one CSV row (message and description).
      const key = JSON.stringify(o)
      if (seen.has(key)) continue
      seen.add(key)
      result.alerts.push(alert)
    }
    result.malformed += bad
    if (ours === 0 && line.includes(FORWARD_APP)) result.malformed++
  }
  return result
}

// ---------------------------------------------------------------------------
// storage
// ---------------------------------------------------------------------------

export interface ForwardSignalRow {
  id: string
  rule: string
  date: string
  sym: string | null
  tf: string | null
  dir: string | null
  sig_px: number | null
  stop: number | null
  risk_pts: number | null
  atr: number | null
  cost_pts: number | null
  status: ForwardStatus
  exit_px: number | null
  exit_reason: string | null
  exit_time: string | null
  pts_gross: number | null
  r_gross: number | null
  r_net: number | null
  skip_reason: string | null
  imported_at: string
  raw: string
}

const MERGED_FIELDS = [
  'rule', 'date', 'sym', 'tf', 'dir', 'sig_px', 'stop', 'risk_pts', 'atr', 'cost_pts',
  'exit_px', 'exit_reason', 'exit_time', 'pts_gross', 'r_gross', 'r_net', 'skip_reason',
] as const

/**
 * Status follows from the set of events seen for the id, never from their order, so importing the
 * same events in any order or any number of times gives the same row.
 */
function statusFor(events: Set<string>): ForwardStatus {
  if (events.has('EXIT')) return events.has('SKIP') ? 'closed_skipped' : 'closed'
  if (events.has('ENTRY')) return 'open'
  if (events.has('SKIP')) return 'skipped_by_indicator'
  return 'nosignal'
}

function sameRow(a: ForwardSignalRow, b: ForwardSignalRow): boolean {
  for (const k of [...MERGED_FIELDS, 'status', 'raw'] as const) {
    if (a[k] !== b[k]) return false
  }
  return true
}

function parseRawMap(raw: string | null | undefined): Record<string, unknown> {
  try {
    const v: unknown = JSON.parse(raw || '{}')
    return v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : {}
  } catch {
    return {}
  }
}

/** Stable JSON (events always in the same order) so re-imports compare equal. */
function rawMapToString(map: Record<string, unknown>): string {
  const ordered: Record<string, unknown> = {}
  for (const ev of EVENTS) if (ev in map) ordered[ev] = map[ev]
  return JSON.stringify(ordered)
}

/**
 * Upserts the alerts found in `text` into forward_signals. Idempotent: a second import of the same
 * text reports every alert as unchanged and leaves the table identical. Within one import the
 * events are applied NOSIGNAL, ENTRY, SKIP, EXIT, so an alert log exported newest-first (EXIT above
 * its ENTRY) still pairs up.
 */
export function importForwardAlerts(
  db: DatabaseSync,
  text: string,
  now: string = new Date().toISOString(),
  rule: string = FORWARD_RULE,
): ForwardImportSummary {
  const extracted = extractAlerts(text, rule)
  const summary: ForwardImportSummary = {
    lines: extracted.lines,
    alerts: extracted.alerts.length,
    entries: 0,
    exits: 0,
    skips: 0,
    nosignals: 0,
    inserted: 0,
    updated: 0,
    unchanged: 0,
    orphanExits: 0,
    malformed: extracted.malformed,
    ignored: extracted.ignored,
  }
  const ordered = extracted.alerts
    .map((a, i) => ({ a, i }))
    .sort((x, y) => EVENTS.indexOf(x.a.ev) - EVENTS.indexOf(y.a.ev) || x.i - y.i)
    .map((x) => x.a)

  const select = db.prepare('SELECT * FROM forward_signals WHERE id = ?')
  const insert = db.prepare(
    `INSERT INTO forward_signals (id, rule, date, sym, tf, dir, sig_px, stop, risk_pts, atr, cost_pts, status,
       exit_px, exit_reason, exit_time, pts_gross, r_gross, r_net, skip_reason, imported_at, raw)
     VALUES (@id, @rule, @date, @sym, @tf, @dir, @sig_px, @stop, @risk_pts, @atr, @cost_pts, @status,
       @exit_px, @exit_reason, @exit_time, @pts_gross, @r_gross, @r_net, @skip_reason, @imported_at, @raw)`,
  )
  const update = db.prepare(
    `UPDATE forward_signals SET rule=@rule, date=@date, sym=@sym, tf=@tf, dir=@dir, sig_px=@sig_px, stop=@stop,
       risk_pts=@risk_pts, atr=@atr, cost_pts=@cost_pts, status=@status, exit_px=@exit_px, exit_reason=@exit_reason,
       exit_time=@exit_time, pts_gross=@pts_gross, r_gross=@r_gross, r_net=@r_net, skip_reason=@skip_reason, raw=@raw
     WHERE id=@id`,
  )

  db.exec('BEGIN')
  try {
    for (const a of ordered) {
      if (a.ev === 'ENTRY') summary.entries++
      else if (a.ev === 'EXIT') summary.exits++
      else if (a.ev === 'SKIP') summary.skips++
      else summary.nosignals++

      const existing = select.get(a.id) as ForwardSignalRow | undefined
      const rawMap = parseRawMap(existing?.raw)
      if (a.ev === 'EXIT' && !('ENTRY' in rawMap) && !('SKIP' in rawMap)) summary.orphanExits++
      rawMap[a.ev] = a.raw

      const next = (existing ? { ...existing } : { id: a.id, imported_at: now }) as ForwardSignalRow
      for (const k of MERGED_FIELDS) {
        const v = a[k]
        if (v !== null && v !== undefined) (next as unknown as Record<string, unknown>)[k] = v
        else if (!existing) (next as unknown as Record<string, unknown>)[k] = null
      }
      next.status = statusFor(new Set(Object.keys(rawMap)))
      next.raw = rawMapToString(rawMap)

      const params: Record<string, string | number | null> = {}
      for (const k of [...MERGED_FIELDS, 'id', 'status', 'raw'] as const) params[k] = next[k] ?? null
      if (!existing) {
        insert.run({ ...params, imported_at: now })
        summary.inserted++
      } else if (sameRow(existing, next)) {
        summary.unchanged++
      } else {
        update.run(params)
        summary.updated++
      }
    }
    // Missed trades linked to a signal carry the rule's R_net as their would-be result; an EXIT
    // imported after the missed trade was logged fills it in here.
    db.exec(
      `UPDATE missed_trades SET would_be_r = (SELECT f.r_net FROM forward_signals f WHERE f.id = missed_trades.signal_id)
       WHERE signal_id IS NOT NULL`,
    )
    db.exec('COMMIT')
  } catch (err) {
    db.exec('ROLLBACK')
    throw err
  }
  return summary
}

/** One-paragraph, human-readable version of the summary for the import dialog. */
export function formatImportSummary(s: ForwardImportSummary): string {
  const parts = [
    `${s.alerts} alert${s.alerts === 1 ? '' : 's'} found in ${s.lines} line${s.lines === 1 ? '' : 's'}`,
    `(${s.entries} entry, ${s.exits} exit, ${s.skips} skip, ${s.nosignals} no-signal).`,
    `${s.inserted} new, ${s.updated} updated, ${s.unchanged} already recorded.`,
  ]
  if (s.orphanExits) parts.push(`${s.orphanExits} exit${s.orphanExits === 1 ? '' : 's'} without an entry (outcome stored).`)
  if (s.malformed) parts.push(`${s.malformed} malformed line${s.malformed === 1 ? '' : 's'} skipped.`)
  if (s.ignored) parts.push(`${s.ignored} unrelated JSON object${s.ignored === 1 ? '' : 's'} ignored.`)
  return parts.join(' ')
}
