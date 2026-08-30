import { Fragment, useMemo, useState } from 'react'
import { addDays, addMonths, endOfMonth, format, isSameMonth, startOfMonth, startOfWeek } from 'date-fns'
import type { AnalyticsSummary, Trade } from '../types'
import { AnimatePresence, motion } from 'motion/react'
import { Modal } from './Modal'
import { Reveal, usePrefersReducedMotion } from '../anim'

const WEEKDAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

export function CalendarHeatmap({
  month,
  onMonthChange,
  calendar,
  onOpenTrade,
}: {
  month: string
  onMonthChange: (month: string) => void
  calendar: AnalyticsSummary['calendar']
  onOpenTrade: (trade: Trade) => void
}) {
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [dayTrades, setDayTrades] = useState<Trade[]>([])
  const [loadingDay, setLoadingDay] = useState(false)
  const reduced = usePrefersReducedMotion()

  const current = useMemo(() => new Date(`${month}-01T00:00:00`), [month])
  const monthStart = startOfMonth(current)
  const monthEnd = endOfMonth(current)

  const weeks = useMemo(() => {
    const result: Date[][] = []
    let weekStart = startOfWeek(monthStart, { weekStartsOn: 1 })
    while (weekStart <= monthEnd) {
      result.push([0, 1, 2, 3, 4, 5, 6].map((i) => addDays(weekStart, i)))
      weekStart = addDays(weekStart, 7)
    }
    return result
  }, [monthStart, monthEnd])

  const totalPnl = Object.values(calendar).reduce((s, d) => s + d.pnl, 0)
  const totalTrades = Object.values(calendar).reduce((s, d) => s + d.count, 0)

  const openDay = async (dateStr: string) => {
    setSelectedDate(dateStr)
    setLoadingDay(true)
    try {
      const all: Trade[] = await window.api.trades.getAll()
      setDayTrades(all.filter((t) => t.date === dateStr))
    } finally {
      setLoadingDay(false)
    }
  }

  return (
    <div className="card" style={{ padding: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button className="btn" onClick={() => onMonthChange(format(addMonths(current, -1), 'yyyy-MM'))}>‹</button>
          <div style={{ fontWeight: 600, minWidth: 130, textAlign: 'center' }}>{format(current, 'MMMM yyyy')}</div>
          <button className="btn" onClick={() => onMonthChange(format(addMonths(current, 1), 'yyyy-MM'))}>›</button>
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
          P&L: <span className={totalPnl >= 0 ? 'pnl-positive' : 'pnl-negative'}>${totalPnl.toFixed(0)}</span>
          {'  '}Trades: {totalTrades}
        </div>
      </div>

      {(() => {
        const grid = (
        <Reveal key={month} style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr) 1.1fr', gap: 6 }}>
        {WEEKDAY_LABELS.map((d) => (
          <div key={d} style={{ color: 'var(--text-dim)', fontSize: 11, textAlign: 'left', paddingLeft: 4 }}>{d}</div>
        ))}
        <div style={{ color: 'var(--text-dim)', fontSize: 11 }}>Summary</div>

        {weeks.map((week, wi) => {
          let weekPnl = 0
          let weekTrades = 0
          week.forEach((d) => {
            const key = format(d, 'yyyy-MM-dd')
            const entry = calendar[key]
            if (entry) {
              weekPnl += entry.pnl
              weekTrades += entry.count
            }
          })
          return (
            <Fragment key={wi}>
              {week.map((d) => {
                const key = format(d, 'yyyy-MM-dd')
                const entry = calendar[key]
                const inMonth = isSameMonth(d, current)
                const hasData = !!entry && inMonth
                return (
                  <div
                    key={key}
                    className={hasData ? 'card--interactive' : undefined}
                    onClick={() => hasData && openDay(key)}
                    style={{
                      minHeight: 58,
                      borderRadius: 'var(--radius-sm)',
                      padding: '6px 8px',
                      cursor: hasData ? 'pointer' : 'default',
                      background: hasData ? (entry!.pnl >= 0 ? 'var(--green-soft)' : 'var(--red-soft)') : 'transparent',
                      border: `1px solid ${hasData ? 'transparent' : 'var(--border-soft)'}`,
                      opacity: inMonth ? 1 : 0.35,
                    }}
                  >
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{format(d, 'd')}</div>
                    {hasData && (
                      <div style={{ marginTop: 6 }}>
                        <div style={{ fontSize: 10, color: 'var(--text-dim)' }}>{entry!.count} trade{entry!.count > 1 ? 's' : ''}</div>
                        <div className={entry!.pnl >= 0 ? 'pnl-positive' : 'pnl-negative'} style={{ fontSize: 12, fontWeight: 600 }}>
                          {entry!.pnl >= 0 ? '+' : ''}{entry!.pnl.toFixed(0)}
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
              <div
                key={`summary-${wi}`}
                style={{
                  minHeight: 58,
                  borderRadius: 'var(--radius-sm)',
                  padding: '6px 8px',
                  background: 'var(--bg-elevated)',
                  border: '1px solid var(--border-soft)',
                }}
              >
                {weekTrades > 0 ? (
                  <>
                    <div style={{ fontSize: 10, color: 'var(--text-dim)' }}>{weekTrades} trades</div>
                    <div className={weekPnl >= 0 ? 'pnl-positive' : 'pnl-negative'} style={{ fontSize: 12, fontWeight: 600 }}>
                      {weekPnl >= 0 ? '+' : ''}{weekPnl.toFixed(0)}
                    </div>
                  </>
                ) : (
                  <div style={{ fontSize: 10, color: 'var(--text-dim)' }}>—</div>
                )}
              </div>
            </Fragment>
          )
        })}
        </Reveal>
        )
        return reduced ? (
          <div key={month}>{grid}</div>
        ) : (
          <AnimatePresence mode="wait">
            <motion.div
              key={month}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.16, ease: [0.2, 0.8, 0.2, 1] }}
            >
              {grid}
            </motion.div>
          </AnimatePresence>
        )
      })()}

      {selectedDate && (
        <Modal title={`Trades on ${selectedDate}`} onClose={() => setSelectedDate(null)}>
          {loadingDay ? (
            <div>Loading…</div>
          ) : dayTrades.length === 0 ? (
            <div style={{ color: 'var(--text-muted)' }}>No trades found.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {dayTrades.map((t) => (
                <div
                  key={t.id}
                  className="card"
                  onClick={() => {
                    setSelectedDate(null)
                    onOpenTrade(t)
                  }}
                  style={{ padding: 10, display: 'flex', justifyContent: 'space-between', cursor: 'pointer' }}
                >
                  <div>
                    <div style={{ fontWeight: 600 }}>{t.name || t.pair || 'Trade'}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{t.pair} · {t.session} · {t.direction}</div>
                  </div>
                  <div className={t.pnl >= 0 ? 'pnl-positive' : 'pnl-negative'} style={{ fontWeight: 600 }}>
                    {t.pnl >= 0 ? '+' : ''}{t.pnl.toFixed(2)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Modal>
      )}
    </div>
  )
}
