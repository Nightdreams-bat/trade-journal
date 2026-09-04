/**
 * Drawdown analysis — the peak-to-trough view of an equity curve.
 *
 * Deliberately separate from `analytics.ts` and free of any DB access, so both the account-wide
 * summary and the per-strategy detail can run the same math over their own slice of trades.
 *
 * Sign convention: every drawdown figure in here is **negative or zero**, matching the series the
 * charts plot. Magnitudes are taken where a ratio needs one. Percentages are percentage *points*
 * (-5.88 means -5.88%), consistent with `winRate` / `returnsPct` elsewhere in the app.
 */

/** Matches the credibility gate in `src/tradingPlan.ts` — below this, stats are noise dressed as signal. */
const MIN_TRADING_DAYS = 20
/** Annualising a return over a shorter span produces authoritative-looking nonsense. */
const MIN_CALENDAR_DAYS = 60
/** Sterling averages the worst drawdown of each year; one year of history can't support it. */
const MIN_STERLING_DAYS = 730

export interface DailyPnl {
  date: string // 'YYYY-MM-DD'
  pnl: number
}

export interface DrawdownPoint {
  date: string
  equity: number
  drawdownAbs: number
  drawdownPct: number
}

export interface DrawdownEpisode {
  peakDate: string
  troughDate: string
  recoveryDate: string | null
  depthAbs: number
  depthPct: number
  /** Calendar days from the high-water mark to the trough. */
  durationDays: number
  /** Calendar days from the trough back to a new high — null while still underwater. */
  recoveryDays: number | null
  ongoing: boolean
}

export interface DrawdownAnalysis {
  /** False when no starting balance is known — every `*Pct` field and every ratio is then null/0. */
  percentAvailable: boolean
  series: DrawdownPoint[]
  maxDrawdownAbs: number
  maxDrawdownPct: number
  peakDate: string | null
  troughDate: string | null
  recoveryDate: string | null
  episodes: DrawdownEpisode[]
  avgDepthPct: number
  avgDurationDays: number
  avgRecoveryDays: number
  depthPercentiles: { p50: number; p75: number; p90: number; p95: number }
  episodesOver: { pct5: number; pct10: number; pct20: number }
  currentDrawdown: {
    inDrawdown: boolean
    depthAbs: number
    depthPct: number
    daysInDrawdown: number
    peakDate: string | null
  }
  timeUnderwaterPct: number
  tradingDays: number
  calendarDays: number
  /** Null until there is enough history to annualise — see MIN_CALENDAR_DAYS / MIN_TRADING_DAYS. */
  annualisedReturnPct: number | null
  painIndex: number | null
  ulcerIndex: number | null
  calmar: number | null
  sterling: number | null
  burke: number | null
  martin: number | null
}

const round2 = (n: number) => Math.round(n * 100) / 100
const round1 = (n: number) => Math.round(n * 10) / 10

/** Parsed the same way as `weekdayOf` in analytics.ts, so a date never drifts across a timezone. */
function asDate(dateStr: string): Date {
  return new Date(`${dateStr}T00:00:00`)
}

function daysBetween(from: string, to: string): number {
  return Math.round((asDate(to).getTime() - asDate(from).getTime()) / 86_400_000)
}

/** Collapses trades into one row per trading day. Drawdown duration counted in trades is meaningless. */
function aggregateByDay(rows: DailyPnl[]): DailyPnl[] {
  const byDay = new Map<string, number>()
  for (const r of rows) byDay.set(r.date, (byDay.get(r.date) ?? 0) + r.pnl)
  return [...byDay.entries()]
    .map(([date, pnl]) => ({ date, pnl }))
    .sort((a, b) => a.date.localeCompare(b.date))
}

/** Linear-interpolated quantile over an ascending array. */
function quantile(sortedAsc: number[], q: number): number {
  if (!sortedAsc.length) return 0
  const pos = (sortedAsc.length - 1) * q
  const lo = Math.floor(pos)
  const hi = Math.ceil(pos)
  if (lo === hi) return sortedAsc[lo]
  return sortedAsc[lo] + (sortedAsc[hi] - sortedAsc[lo]) * (pos - lo)
}

function emptyAnalysis(percentAvailable: boolean): DrawdownAnalysis {
  return {
    percentAvailable,
    series: [],
    maxDrawdownAbs: 0,
    maxDrawdownPct: 0,
    peakDate: null,
    troughDate: null,
    recoveryDate: null,
    episodes: [],
    avgDepthPct: 0,
    avgDurationDays: 0,
    avgRecoveryDays: 0,
    depthPercentiles: { p50: 0, p75: 0, p90: 0, p95: 0 },
    episodesOver: { pct5: 0, pct10: 0, pct20: 0 },
    currentDrawdown: { inDrawdown: false, depthAbs: 0, depthPct: 0, daysInDrawdown: 0, peakDate: null },
    timeUnderwaterPct: 0,
    tradingDays: 0,
    calendarDays: 0,
    annualisedReturnPct: null,
    painIndex: null,
    ulcerIndex: null,
    calmar: null,
    sterling: null,
    burke: null,
    martin: null,
  }
}

/**
 * The high-water-mark drawdown of an equity curve, plus the risk-adjusted ratios built on it.
 *
 * `startingBalance` anchors the wealth index. When it is 0 — no accounts configured, or balances
 * left unset — percentages are undefined, so the function reports dollar figures only and flags
 * `percentAvailable: false` rather than dividing by zero.
 */
export function drawdownAnalysis(rows: DailyPnl[], startingBalance: number): DrawdownAnalysis {
  const percentAvailable = startingBalance > 0
  const days = aggregateByDay(rows)
  if (!days.length) return emptyAnalysis(percentAvailable)

  const base = percentAvailable ? startingBalance : 0
  const firstDate = days[0].date
  const lastDate = days[days.length - 1].date

  const series: DrawdownPoint[] = []
  const episodes: DrawdownEpisode[] = []

  let cumulative = 0
  let peak = base
  let peakDate: string | null = null // null = the balance the account opened at
  let open: {
    peakDate: string
    troughDate: string
    depthAbs: number
    depthPct: number
  } | null = null

  for (const day of days) {
    cumulative += day.pnl
    const equity = base + cumulative

    if (equity >= peak) {
      if (open) {
        episodes.push({
          peakDate: open.peakDate,
          troughDate: open.troughDate,
          recoveryDate: day.date,
          depthAbs: round2(open.depthAbs),
          depthPct: round2(open.depthPct),
          durationDays: daysBetween(open.peakDate, open.troughDate),
          recoveryDays: daysBetween(open.troughDate, day.date),
          ongoing: false,
        })
        open = null
      }
      peak = equity
      peakDate = day.date
      series.push({ date: day.date, equity: round2(equity), drawdownAbs: 0, drawdownPct: 0 })
      continue
    }

    const drawdownAbs = equity - peak
    // `peak >= base > 0` whenever percentAvailable, so this never divides by zero.
    const drawdownPct = percentAvailable ? (drawdownAbs / peak) * 100 : 0

    if (!open) {
      open = { peakDate: peakDate ?? firstDate, troughDate: day.date, depthAbs: drawdownAbs, depthPct: drawdownPct }
    } else if (drawdownAbs < open.depthAbs) {
      open.troughDate = day.date
      open.depthAbs = drawdownAbs
      open.depthPct = drawdownPct
    }

    series.push({
      date: day.date,
      equity: round2(equity),
      drawdownAbs: round2(drawdownAbs),
      drawdownPct: round2(drawdownPct),
    })
  }

  if (open) {
    episodes.push({
      peakDate: open.peakDate,
      troughDate: open.troughDate,
      recoveryDate: null,
      depthAbs: round2(open.depthAbs),
      depthPct: round2(open.depthPct),
      durationDays: daysBetween(open.peakDate, open.troughDate),
      recoveryDays: null,
      ongoing: true,
    })
  }

  const worst = episodes.reduce<DrawdownEpisode | null>(
    (a, b) => (a === null || b.depthAbs < a.depthAbs ? b : a),
    null
  )

  const recovered = episodes.filter((e) => e.recoveryDays != null)
  const magnitudesAsc = episodes.map((e) => Math.abs(e.depthPct)).sort((a, b) => a - b)
  const underwaterPoints = series.filter((p) => p.drawdownAbs < 0)

  const tradingDays = days.length
  const calendarDays = daysBetween(firstDate, lastDate) + 1

  // ---- risk-adjusted ratios ----
  const endEquity = base + cumulative
  const ratiosAvailable =
    percentAvailable && calendarDays >= MIN_CALENDAR_DAYS && tradingDays >= MIN_TRADING_DAYS

  let annualisedReturnPct: number | null = null
  if (ratiosAvailable) {
    annualisedReturnPct =
      endEquity <= 0 ? -100 : (Math.pow(endEquity / base, 365 / calendarDays) - 1) * 100
  }

  const ddPcts = series.map((p) => Math.abs(p.drawdownPct))
  const painIndex = percentAvailable ? ddPcts.reduce((s, v) => s + v, 0) / ddPcts.length : null
  const ulcerIndex = percentAvailable
    ? Math.sqrt(ddPcts.reduce((s, v) => s + v * v, 0) / ddPcts.length)
    : null

  const maxDdPct = worst ? Math.abs(worst.depthPct) : 0
  const burkeDenominator = Math.sqrt(episodes.reduce((s, e) => s + e.depthPct * e.depthPct, 0))

  const ratio = (numerator: number | null, denominator: number | null): number | null => {
    if (numerator == null || denominator == null || denominator <= 0) return null
    return round2(numerator / denominator)
  }

  return {
    percentAvailable,
    series,
    maxDrawdownAbs: worst ? worst.depthAbs : 0,
    maxDrawdownPct: worst ? worst.depthPct : 0,
    peakDate: worst?.peakDate ?? null,
    troughDate: worst?.troughDate ?? null,
    recoveryDate: worst?.recoveryDate ?? null,
    episodes,
    avgDepthPct: episodes.length
      ? round2(episodes.reduce((s, e) => s + e.depthPct, 0) / episodes.length)
      : 0,
    avgDurationDays: episodes.length
      ? round1(episodes.reduce((s, e) => s + e.durationDays, 0) / episodes.length)
      : 0,
    avgRecoveryDays: recovered.length
      ? round1(recovered.reduce((s, e) => s + (e.recoveryDays ?? 0), 0) / recovered.length)
      : 0,
    depthPercentiles: {
      p50: -round2(quantile(magnitudesAsc, 0.5)),
      p75: -round2(quantile(magnitudesAsc, 0.75)),
      p90: -round2(quantile(magnitudesAsc, 0.9)),
      p95: -round2(quantile(magnitudesAsc, 0.95)),
    },
    episodesOver: {
      pct5: episodes.filter((e) => Math.abs(e.depthPct) >= 5).length,
      pct10: episodes.filter((e) => Math.abs(e.depthPct) >= 10).length,
      pct20: episodes.filter((e) => Math.abs(e.depthPct) >= 20).length,
    },
    currentDrawdown: open
      ? {
          inDrawdown: true,
          depthAbs: round2(open.depthAbs),
          depthPct: round2(open.depthPct),
          daysInDrawdown: daysBetween(open.peakDate, lastDate),
          peakDate: open.peakDate,
        }
      : { inDrawdown: false, depthAbs: 0, depthPct: 0, daysInDrawdown: 0, peakDate: null },
    timeUnderwaterPct: round1((underwaterPoints.length / series.length) * 100),
    tradingDays,
    calendarDays,
    annualisedReturnPct: annualisedReturnPct == null ? null : round2(annualisedReturnPct),
    painIndex: painIndex == null ? null : round2(painIndex),
    ulcerIndex: ulcerIndex == null ? null : round2(ulcerIndex),
    calmar: ratio(annualisedReturnPct, maxDdPct),
    sterling: calendarDays >= MIN_STERLING_DAYS
      ? ratio(annualisedReturnPct, meanOfWorstAnnualDrawdowns(episodes, 3))
      : null,
    burke: ratio(annualisedReturnPct, burkeDenominator),
    martin: ratio(annualisedReturnPct, ulcerIndex),
  }
}

/**
 * Sterling's denominator: the deepest drawdown of each calendar year, averaged over the worst
 * `take` years. Episodes are attributed to the year of their trough.
 */
function meanOfWorstAnnualDrawdowns(episodes: DrawdownEpisode[], take: number): number | null {
  if (!episodes.length) return null
  const worstByYear = new Map<string, number>()
  for (const e of episodes) {
    const year = e.troughDate.slice(0, 4)
    const depth = Math.abs(e.depthPct)
    if (depth > (worstByYear.get(year) ?? 0)) worstByYear.set(year, depth)
  }
  const worst = [...worstByYear.values()].sort((a, b) => b - a).slice(0, take)
  if (!worst.length) return null
  return worst.reduce((s, v) => s + v, 0) / worst.length
}
