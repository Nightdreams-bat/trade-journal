import { useEffect, useState } from 'react'
import { format } from 'date-fns'
import { eventClock, relativeTime } from '../format'
import { redFolders } from '../newsWindow'
import type { CalendarEvent } from '../types'

/**
 * Today's red folders, for the dashboard.
 *
 * Renders nothing at all when the calendar is disabled or the app is running in the browser
 * harness — someone who leaves the feature off should never see a dead panel asking to be
 * switched on.
 */
export function TodayNewsStrip() {
  const api = window.api?.calendar
  const [events, setEvents] = useState<CalendarEvent[] | null>(null)
  const [enabled, setEnabled] = useState(false)
  // Held in state rather than read during render, so the countdown updates on a predictable tick
  // instead of shifting every time something unrelated re-renders this card.
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    if (!api) return
    const today = format(new Date(), 'yyyy-MM-dd')
    api.getConfig().then((c) => {
      setEnabled(c.enabled)
      if (!c.enabled) return
      api.getEvents({ from: today, to: today }).then(setEvents)
    })
  }, [api])

  useEffect(() => {
    // Keeps 'in 2h 14m' honest on a dashboard that stays open all session.
    const id = setInterval(() => setNow(Date.now()), 60_000)
    return () => clearInterval(id)
  }, [])

  if (!api || !enabled || events === null) return null

  const reds = redFolders(events)
  const upcoming = reds.filter((e) => new Date(e.starts_at).getTime() >= now - 30 * 60_000)
  const shown = (upcoming.length > 0 ? upcoming : reds).slice(0, 3)

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
        marginTop: 12,
        paddingTop: 10,
        borderTop: '1px solid var(--border-soft)',
      }}
    >
      <span className="mono-label" style={{ fontSize: 10 }}>Today’s red folders</span>
      {reds.length === 0 ? (
        <span style={{ fontSize: 12, color: 'var(--text-dim)' }}>
          {events.length === 0 ? 'No calendar data for today' : 'No red folders today'}
        </span>
      ) : (
        shown.map((e) => (
          <div
            key={e.id}
            style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12, lineHeight: 1.5 }}
          >
            <span
              style={{ width: 7, height: 7, borderRadius: 999, background: 'var(--red)', flexShrink: 0 }}
            />
            <span style={{ color: 'var(--text-muted)', fontVariantNumeric: 'tabular-nums' }}>
              {e.all_day ? 'All day' : eventClock(e.starts_at)}
            </span>
            <span style={{ fontWeight: 600 }}>{e.country}</span>
            <span
              style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
              title={e.title}
            >
              {e.title}
            </span>
            {!e.all_day && (
              <span style={{ marginLeft: 'auto', color: 'var(--text-dim)', fontSize: 11, flexShrink: 0 }}>
                {relativeTime(e.starts_at, new Date(now))}
              </span>
            )}
          </div>
        ))
      )}
      {reds.length > shown.length && (
        <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>
          +{reds.length - shown.length} more today
        </span>
      )}
    </div>
  )
}
