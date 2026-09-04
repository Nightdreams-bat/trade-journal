/**
 * Pure parsing for the economic-calendar feed — no DB, no network, no electron imports, so it can
 * be exercised directly under `node --experimental-strip-types`. Same split as
 * `obsidian-format.ts` vs `obsidian.ts`.
 *
 * Feed shape, verified against live data:
 *   { "title": "ISM Manufacturing PMI", "country": "USD",
 *     "date": "2026-09-01T10:00:00-04:00", "impact": "High",
 *     "forecast": "55.2", "previous": "55.6" }
 *
 * Every timestamp carries an explicit UTC offset, so instants are unambiguous and the renderer can
 * format them in the viewer's own zone without guessing.
 */

export type Impact = 'High' | 'Medium' | 'Low' | 'Holiday'

export interface ParsedEvent {
  eventKey: string
  title: string
  country: string
  startsAt: string
  date: string
  impact: Impact
  forecast: string | null
  previous: string | null
  allDay: boolean
}

interface RawEvent {
  title?: unknown
  country?: unknown
  date?: unknown
  impact?: unknown
  forecast?: unknown
  previous?: unknown
}

const IMPACTS: readonly string[] = ['High', 'Medium', 'Low', 'Holiday']

/**
 * The calendar day the event belongs to, read straight off the feed's own offset rather than
 * converted into the machine's zone — a 10:00 New York release is a New York trading day, and
 * shifting it could file it under the wrong day for a user in another timezone.
 */
function localDateOf(iso: string): string {
  return iso.slice(0, 10)
}

function text(v: unknown): string | null {
  const s = typeof v === 'string' ? v.trim() : ''
  return s === '' ? null : s
}

/**
 * Parses the feed body into rows ready for `calendar_events`.
 *
 * Deliberately lenient on individual events and strict on the envelope: one malformed entry is
 * skipped, but a body that isn't an array throws, because a half-imported week is worse than a
 * failed sync the user can see and retry.
 */
export function parseFeed(body: unknown): ParsedEvent[] {
  if (!Array.isArray(body)) {
    throw new Error('Calendar feed did not return a list of events')
  }

  const out: ParsedEvent[] = []
  for (const raw of body as RawEvent[]) {
    if (!raw || typeof raw !== 'object') continue

    const title = typeof raw.title === 'string' ? raw.title.trim() : ''
    const country = typeof raw.country === 'string' ? raw.country.trim() : ''
    const startsAt = typeof raw.date === 'string' ? raw.date.trim() : ''
    // Without these three an event can't be placed on a calendar or matched to a trade.
    if (!title || !country || !startsAt) continue
    if (Number.isNaN(Date.parse(startsAt))) continue

    const rawImpact = typeof raw.impact === 'string' ? raw.impact.trim() : ''
    const impact = (IMPACTS.includes(rawImpact) ? rawImpact : 'Low') as Impact

    out.push({
      // Title + country + instant identifies an event across re-syncs. Forecast and previous are
      // excluded on purpose: they get revised, and a revision must update the row, not add one.
      eventKey: `${title}|${country}|${startsAt}`,
      title,
      country,
      startsAt,
      date: localDateOf(startsAt),
      impact,
      forecast: text(raw.forecast),
      previous: text(raw.previous),
      // The feed carries no all-day flag, and bank holidays are handed an arbitrary clock time
      // (03:00 in the sample week) that ordinary releases also use — so the time cannot tell us.
      // Impact can: 'Holiday' is the only category ForexFactory renders as all-day.
      allDay: impact === 'Holiday',
    })
  }
  return out
}
