import type { CalendarEvent, Trade } from './types'

/**
 * Placing a trade against the economic calendar.
 *
 * Pure functions, no I/O — same convention as `tradingPlan.ts` and `marketContext.ts`, so the
 * matching rules can be exercised directly rather than only through the UI.
 */

/** How close to an event a trade has to be, when the trade records an entry time. */
export const DEFAULT_WINDOW_MINUTES = 30

/** Events tagged 'All' are global (G20, OPEC meetings) and are never filtered out by currency. */
const GLOBAL_COUNTRY = 'All'

/**
 * Symbols that carry currency exposure without spelling it out. Metals and the US indices are all
 * quoted in and driven by the dollar, so US releases matter to them.
 */
const SYMBOL_CURRENCIES: Record<string, string[]> = {
  XAUUSD: ['USD'],
  XAGUSD: ['USD'],
  GOLD: ['USD'],
  SILVER: ['USD'],
  US30: ['USD'],
  US100: ['USD'],
  US500: ['USD'],
  NAS100: ['USD'],
  SPX500: ['USD'],
  DJI: ['USD'],
  WTI: ['USD'],
  USOIL: ['USD'],
  BTCUSD: ['USD'],
  ETHUSD: ['USD'],
  GER40: ['EUR'],
  DAX: ['EUR'],
  UK100: ['GBP'],
  JP225: ['JPY'],
}

/** The currency codes the feed actually uses. */
const KNOWN_CURRENCIES = new Set([
  'USD', 'EUR', 'GBP', 'JPY', 'AUD', 'NZD', 'CAD', 'CHF', 'CNY',
])

/**
 * The currencies a symbol is exposed to.
 *
 * Returns `[]` for anything unrecognised, which callers treat as "don't filter by currency" rather
 * than "no events". Hiding a red folder because someone typed a ticker we don't know would be the
 * more damaging failure of the two.
 */
export function currenciesForPair(pair: string | null | undefined): string[] {
  if (!pair) return []
  const symbol = pair.toUpperCase().replace(/[^A-Z0-9]/g, '')
  if (!symbol) return []

  const mapped = SYMBOL_CURRENCIES[symbol]
  if (mapped) return mapped

  // Standard six-letter FX pair, e.g. EURUSD -> EUR + USD.
  if (symbol.length === 6) {
    const base = symbol.slice(0, 3)
    const quote = symbol.slice(3)
    if (KNOWN_CURRENCIES.has(base) && KNOWN_CURRENCIES.has(quote)) return [base, quote]
  }
  if (symbol.length === 3 && KNOWN_CURRENCIES.has(symbol)) return [symbol]

  return []
}

function matchesCurrency(event: CalendarEvent, currencies: string[]): boolean {
  if (event.country === GLOBAL_COUNTRY) return true
  // No recognised currency for the symbol: show everything rather than silently filtering to none.
  if (currencies.length === 0) return true
  return currencies.includes(event.country)
}

/**
 * Minutes between a trade's entry and an event. Null when the trade has no entry time.
 *
 * The trade's date and time are local wall-clock; the event carries its own UTC offset. Building a
 * Date from the trade's `YYYY-MM-DDTHH:MM` gives the machine's zone, which is the zone the user
 * typed the time in, so the two are directly comparable as instants.
 */
export function minutesFromEvent(trade: Trade, event: CalendarEvent): number | null {
  if (!trade.entry_time) return null
  const entry = Date.parse(`${trade.date}T${trade.entry_time}`)
  const start = Date.parse(event.starts_at)
  if (Number.isNaN(entry) || Number.isNaN(start)) return null
  return (start - entry) / 60_000
}

/**
 * The calendar events relevant to a trade.
 *
 * With an entry time, matching is to the minute against `windowMinutes` either side. Without one,
 * it falls back to every event on the trade's date — coarser, but it means trades logged before
 * entry times existed still get news context instead of nothing.
 */
export function eventsForTrade(
  trade: Trade,
  events: CalendarEvent[],
  windowMinutes: number = DEFAULT_WINDOW_MINUTES
): CalendarEvent[] {
  const currencies = currenciesForPair(trade.pair)
  const sameDay = events.filter((e) => e.date === trade.date && matchesCurrency(e, currencies))
  if (!trade.entry_time) return sameDay

  return sameDay.filter((e) => {
    // All-day entries (bank holidays) have no meaningful clock time, so a window can't apply.
    if (e.all_day) return true
    const delta = minutesFromEvent(trade, e)
    return delta != null && Math.abs(delta) <= windowMinutes
  })
}

/** Dates carrying at least one red folder — high-impact events. */
export function redFolderDates(events: CalendarEvent[]): Set<string> {
  const out = new Set<string>()
  for (const e of events) if (e.impact === 'High') out.add(e.date)
  return out
}

/** High-impact events only, in chronological order. */
export function redFolders(events: CalendarEvent[]): CalendarEvent[] {
  return events
    .filter((e) => e.impact === 'High')
    .sort((a, b) => a.starts_at.localeCompare(b.starts_at))
}
