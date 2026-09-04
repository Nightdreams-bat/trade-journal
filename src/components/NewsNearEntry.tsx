import { useEffect, useState } from 'react'
import { eventClock } from '../format'
import { currenciesForPair, eventsForTrade, DEFAULT_WINDOW_MINUTES } from '../newsWindow'
import type { CalendarEvent, Trade } from '../types'

/**
 * What was on the economic calendar around this trade's entry.
 *
 * Read-only context shown while filling in the form — it never changes what gets saved. Renders
 * nothing unless the calendar is enabled and there are cached events for the day, so the form is
 * unchanged for anyone not using the feature.
 *
 * This is what earns the optional entry-time field its place: without a time the app can only say
 * "there was news that day", which is rarely actionable.
 */
export function NewsNearEntry({
  date,
  entryTime,
  pair,
}: {
  date: string
  entryTime: string
  pair: string
}) {
  const api = window.api?.calendar
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [enabled, setEnabled] = useState(false)

  useEffect(() => {
    if (!api || !date) return
    let cancelled = false
    api.getConfig().then((c) => {
      if (cancelled || !c.enabled) return
      setEnabled(true)
      api.getEvents({ from: date, to: date }).then((e) => {
        if (!cancelled) setEvents(e)
      })
    })
    return () => {
      cancelled = true
    }
  }, [api, date])

  if (!api || !enabled || events.length === 0) return null

  // Only the fields the matcher actually reads need to be real; the rest satisfy the Trade shape.
  const probe = { date, entry_time: entryTime || null, pair: pair || null } as Trade
  const matched = eventsForTrade(probe, events, DEFAULT_WINDOW_MINUTES)
  const highs = matched.filter((e) => e.impact === 'High')
  const currencies = currenciesForPair(pair)

  const scope = entryTime
    ? `within ${DEFAULT_WINDOW_MINUTES} min of entry`
    : 'on this day (add an entry time to narrow it down)'

  return (
    <div className="field" style={{ minWidth: 0 }}>
      <span>News near this trade</span>
      <div
        style={{
          border: '1px solid var(--border-soft)',
          borderRadius: 'var(--radius-control)',
          padding: '8px 10px',
          fontSize: 12,
          lineHeight: 1.55,
          color: 'var(--text-muted)',
          minHeight: 38,
        }}
      >
        {highs.length === 0 ? (
          <span>
            No high-impact events {scope}
            {currencies.length > 0 ? ` for ${currencies.join('/')}` : ''}.
          </span>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {highs.slice(0, 3).map((e) => (
              <div key={e.id} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span
                  style={{ width: 6, height: 6, borderRadius: 999, background: 'var(--red)', flexShrink: 0 }}
                />
                <span style={{ fontVariantNumeric: 'tabular-nums' }}>
                  {e.all_day ? 'All day' : eventClock(e.starts_at)}
                </span>
                <span style={{ fontWeight: 600 }}>{e.country}</span>
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {e.title}
                </span>
              </div>
            ))}
            {highs.length > 3 && <span>+{highs.length - 3} more</span>}
          </div>
        )}
      </div>
    </div>
  )
}
