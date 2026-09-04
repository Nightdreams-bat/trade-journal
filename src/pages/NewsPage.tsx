import { useEffect, useMemo, useState } from 'react'
import { format } from 'date-fns'
import { Stagger, Reveal } from '../anim'
import { RefreshCw, TriangleAlert } from '../components/icons'
import { eventClock, relativeTime } from '../format'
import type { CalendarConfig, CalendarEvent, Impact } from '../types'

/** Red folder first — the whole point of the tab is spotting those. */
const IMPACT_COLOR: Record<Impact, string> = {
  High: 'var(--red)',
  Medium: 'var(--amber)',
  Low: 'var(--text-dim)',
  Holiday: 'var(--text-dim)',
}

function ImpactDot({ impact }: { impact: Impact }) {
  return (
    <span
      title={impact === 'High' ? 'High impact (red folder)' : `${impact} impact`}
      style={{
        display: 'inline-block',
        width: 8,
        height: 8,
        borderRadius: 999,
        flexShrink: 0,
        background: IMPACT_COLOR[impact],
        // A red folder should read as a red folder even for someone who can't separate the hues.
        outline: impact === 'High' ? '2px solid color-mix(in srgb, var(--red) 30%, transparent)' : 'none',
      }}
    />
  )
}

function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="card" style={{ padding: 'var(--sp-5)', textAlign: 'center' }}>
      <div style={{ fontWeight: 600, marginBottom: 6 }}>{title}</div>
      <div style={{ color: 'var(--text-muted)', fontSize: 13, lineHeight: 1.6, maxWidth: 460, margin: '0 auto' }}>
        {body}
      </div>
    </div>
  )
}

export function NewsPage() {
  const api = window.api?.calendar
  const [config, setConfig] = useState<CalendarConfig | null>(null)
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [syncNote, setSyncNote] = useState<string | null>(null)
  const [redOnly, setRedOnly] = useState(false)
  const [currency, setCurrency] = useState<string>('All currencies')

  const load = () => {
    if (!api) {
      setLoading(false)
      return
    }
    Promise.all([api.getConfig(), api.getEvents()]).then(([c, e]) => {
      setConfig(c)
      setEvents(e)
      setLoading(false)
    })
  }

  useEffect(load, [api])

  const runSync = async () => {
    if (!api) return
    setSyncing(true)
    setSyncNote(null)
    try {
      const result = await api.sync()
      setSyncNote(
        result.ok
          ? `${result.inserted} new, ${result.updated} updated.`
          : (result.error ?? 'Sync failed.')
      )
      load()
    } finally {
      setSyncing(false)
    }
  }

  const currencies = useMemo(
    () => ['All currencies', ...[...new Set(events.map((e) => e.country))].sort()],
    [events]
  )

  const visible = useMemo(
    () =>
      events.filter(
        (e) =>
          (!redOnly || e.impact === 'High') &&
          (currency === 'All currencies' || e.country === currency)
      ),
    [events, redOnly, currency]
  )

  const byDay = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>()
    for (const e of visible) {
      if (!map.has(e.date)) map.set(e.date, [])
      map.get(e.date)!.push(e)
    }
    return [...map.entries()].sort((a, b) => b[0].localeCompare(a[0]))
  }, [visible])

  if (!api) {
    return (
      <EmptyState
        title="Desktop only"
        body="The economic calendar needs the desktop app — it is the one part of Trade Journal that fetches anything from the internet."
      />
    )
  }

  if (loading) return <div style={{ padding: 'var(--sp-5)', color: 'var(--text-muted)' }}>Loading calendar…</div>

  if (!config?.enabled) {
    return (
      <EmptyState
        title="Economic calendar is turned off"
        body="Trade Journal is offline by default. Turn the calendar on in Settings to let it fetch ForexFactory's published weekly calendar — it is the only outbound request the app ever makes, and every event is cached locally so this tab keeps working without a connection."
      />
    )
  }

  const today = format(new Date(), 'yyyy-MM-dd')

  return (
    <Stagger style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-4)' }}>
      <Reveal className="card" style={{ padding: 'var(--sp-3) var(--sp-4)' }}>
        <div style={{ display: 'flex', gap: 'var(--sp-3)', alignItems: 'center', flexWrap: 'wrap' }}>
          <button className="btn btn-primary" onClick={runSync} disabled={syncing}>
            <RefreshCw size={14} /> {syncing ? 'Syncing…' : 'Sync now'}
          </button>

          <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12.5, cursor: 'pointer' }}>
            <input type="checkbox" checked={redOnly} onChange={(e) => setRedOnly(e.target.checked)} />
            Red folders only
          </label>

          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
            {currencies.map((c) => (
              <button
                key={c}
                className="tag-pill"
                onClick={() => setCurrency(c)}
                style={{
                  cursor: 'pointer',
                  border: '1px solid var(--border-soft)',
                  background: currency === c ? 'var(--accent)' : 'transparent',
                  color: currency === c ? '#fff' : 'var(--text-muted)',
                  fontSize: 11,
                }}
              >
                {c}
              </button>
            ))}
          </div>

          <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--text-dim)' }}>
            {config.lastSync
              ? `Last synced ${new Date(config.lastSync).toLocaleString()}`
              : 'Never synced'}
            {` · ${config.eventCount} events cached`}
          </span>
        </div>

        {(syncNote || config.lastError) && (
          <div
            style={{
              marginTop: 10,
              fontSize: 12,
              color: config.lastError ? 'var(--red)' : 'var(--text-muted)',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            {config.lastError && <TriangleAlert size={13} />}
            {syncNote ?? config.lastError}
            {config.lastError && events.length > 0 && (
              <span style={{ color: 'var(--text-dim)' }}>· showing the last events that were downloaded</span>
            )}
          </div>
        )}
      </Reveal>

      {byDay.length === 0 ? (
        <EmptyState
          title={events.length === 0 ? 'Nothing downloaded yet' : 'Nothing matches these filters'}
          body={
            events.length === 0
              ? 'Hit Sync now to pull this week’s calendar. Only the current week is published, so the archive fills in from here on.'
              : 'Try clearing the red-folder filter or picking a different currency.'
          }
        />
      ) : (
        byDay.map(([date, dayEvents], i) => (
          <Reveal key={date} index={i} className="card" style={{ overflow: 'hidden' }}>
            <div
              style={{
                padding: 'var(--sp-2) var(--sp-3)',
                borderBottom: '1px solid var(--border-soft)',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                fontSize: 12.5,
                fontWeight: 600,
                color: date === today ? 'var(--accent)' : 'var(--text)',
              }}
            >
              {format(new Date(`${date}T00:00:00`), 'EEEE d MMMM')}
              {date === today && <span className="tag-pill">Today</span>}
              <span style={{ marginLeft: 'auto', fontWeight: 400, color: 'var(--text-dim)', fontSize: 11 }}>
                {dayEvents.filter((e) => e.impact === 'High').length} red folder
                {dayEvents.filter((e) => e.impact === 'High').length === 1 ? '' : 's'}
              </span>
            </div>
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: 84 }}>Time</th>
                  <th style={{ width: 64 }}>Cur.</th>
                  <th>Event</th>
                  <th style={{ width: 96 }}>Forecast</th>
                  <th style={{ width: 96 }}>Previous</th>
                </tr>
              </thead>
              <tbody>
                {dayEvents.map((e) => (
                  <tr key={e.id}>
                    <td style={{ color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                      {e.all_day ? 'All day' : eventClock(e.starts_at)}
                    </td>
                    <td style={{ fontWeight: 600 }}>{e.country}</td>
                    <td>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                        <ImpactDot impact={e.impact} />
                        <span style={{ fontWeight: e.impact === 'High' ? 600 : 400 }}>{e.title}</span>
                        {date === today && !e.all_day && (
                          <span style={{ fontSize: 10.5, color: 'var(--text-dim)' }}>
                            {relativeTime(e.starts_at)}
                          </span>
                        )}
                      </span>
                    </td>
                    <td style={{ color: 'var(--text-muted)' }}>{e.forecast ?? '—'}</td>
                    <td style={{ color: 'var(--text-muted)' }}>{e.previous ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Reveal>
        ))
      )}

      <div style={{ fontSize: 11, color: 'var(--text-dim)', textAlign: 'center', paddingBottom: 'var(--sp-3)' }}>
        Times shown in your local timezone · source {config.sourceUrl}
      </div>
    </Stagger>
  )
}
