export function formatRatio(n: number): string {
  return n >= 999 ? '∞' : n.toFixed(2)
}

/**
 * Clock time of a calendar event in the viewer's own timezone.
 *
 * The feed timestamps carry an explicit UTC offset (US Eastern), so this genuinely converts rather
 * than reprinting the source's wall clock — a 10:00 New York release reads 17:00 in Chisinau.
 */
export function eventClock(startsAt: string): string {
  const d = new Date(startsAt)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

/** Coarse 'in 2h 14m' / '15m ago' for an instant relative to now. */
export function relativeTime(iso: string, now: Date = new Date()): string {
  const t = new Date(iso).getTime()
  if (Number.isNaN(t)) return ''
  const mins = Math.round((t - now.getTime()) / 60_000)
  const abs = Math.abs(mins)
  const body =
    abs < 1 ? 'now' : abs < 60 ? `${abs}m` : `${Math.floor(abs / 60)}h ${abs % 60}m`
  if (body === 'now') return 'now'
  return mins > 0 ? `in ${body}` : `${body} ago`
}

/** Time-of-day greeting — shared by App / HeroHeader / UtilityPanel. */
export function greeting(d: Date = new Date()): string {
  const h = d.getHours()
  if (h < 5) return 'Late session'
  if (h < 12) return 'Good morning'
  if (h < 18) return 'Good afternoon'
  return 'Good evening'
}
