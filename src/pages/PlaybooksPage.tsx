import { useEffect, useState, type MouseEvent } from 'react'
import type { StrategyPerformance } from '../types'
import { formatRatio } from '../format'
import { StrategyDetailModal } from '../components/StrategyDetailModal'
import { Stagger, Reveal } from '../anim'

export function PlaybooksPage({ refreshKey, onStrategiesChanged }: { refreshKey: number; onStrategiesChanged: () => void }) {
  const [perf, setPerf] = useState<StrategyPerformance[]>([])
  const [loading, setLoading] = useState(true)
  const [newName, setNewName] = useState('')
  const [newDesc, setNewDesc] = useState('')
  const [adding, setAdding] = useState(false)
  const [openStrategyId, setOpenStrategyId] = useState<number | null>(null)

  const load = () => {
    setLoading(true)
    window.api.strategies.getPerformance().then((p) => {
      setPerf(p)
      setLoading(false)
    })
  }

  useEffect(load, [refreshKey])

  const addStrategy = async () => {
    if (!newName.trim()) return
    setAdding(true)
    try {
      await window.api.strategies.create({ name: newName.trim(), description: newDesc.trim() })
      setNewName('')
      setNewDesc('')
      onStrategiesChanged()
      load()
    } finally {
      setAdding(false)
    }
  }

  const removeStrategy = async (e: MouseEvent, id: number) => {
    e.stopPropagation()
    if (!confirm('Delete this playbook/strategy? Trades tagged with it will be untagged, not deleted.')) return
    await window.api.strategies.delete(id)
    onStrategiesChanged()
    load()
  }

  if (loading) return <div style={{ padding: 24, color: 'var(--text-muted)' }}>Loading playbooks…</div>

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div className="card" style={{ padding: 16 }}>
        <div style={{ color: 'var(--text-muted)', fontSize: 12, marginBottom: 10 }}>Add a Playbook / Strategy</div>
        <div style={{ display: 'flex', gap: 8 }}>
          <input className="input" placeholder="Name (e.g. London Breakout)" value={newName} onChange={(e) => setNewName(e.target.value)} style={{ flex: 1 }} />
          <input className="input" placeholder="Rules / description (optional)" value={newDesc} onChange={(e) => setNewDesc(e.target.value)} style={{ flex: 2 }} />
          <button className="btn btn-primary" onClick={addStrategy} disabled={adding || !newName.trim()}>Add</button>
        </div>
      </div>

      {perf.length === 0 ? (
        <div style={{ color: 'var(--text-muted)', padding: 12 }}>No playbooks yet. Add one above, then tag trades with it from the Trade Entry form.</div>
      ) : (
        <Stagger style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14 }}>
          {perf.map((s) => (
            <Reveal key={s.id}>
            <div
              className="card card--interactive"
              onClick={() => setOpenStrategyId(s.id)}
              style={{ padding: 16, cursor: 'pointer', display: 'flex', flexDirection: 'column' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{s.name}</div>
                <button className="btn btn-danger" style={{ padding: '3px 8px', fontSize: 11 }} onClick={(e) => removeStrategy(e, s.id)}>✕</button>
              </div>
              <div style={{ color: 'var(--text-dim)', fontSize: 11, marginBottom: 8 }}>{s.tradeCount} trades</div>
              {s.description && (
                <div
                  style={{
                    color: 'var(--text-muted)',
                    fontSize: 11.5,
                    lineHeight: 1.5,
                    marginBottom: 10,
                    overflow: 'hidden',
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                  }}
                >
                  {s.description}
                </div>
              )}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 12.5 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Win Rate</span><span>{s.winRate}%</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Profit Factor</span><span>{formatRatio(s.profitFactor)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Expectancy / trade</span><span>${s.expectancy.toFixed(2)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Avg R Multiple</span><span>{s.avgRMultiple.toFixed(2)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Plan Adherence</span><span>{s.planAdherence}%</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Total P&L</span>
                  <span className={s.totalPnl >= 0 ? 'pnl-positive' : 'pnl-negative'}>${s.totalPnl.toFixed(0)}</span>
                </div>
              </div>
            </div>
            </Reveal>
          ))}
        </Stagger>
      )}

      {openStrategyId !== null && (
        <StrategyDetailModal
          strategyId={openStrategyId}
          onClose={() => setOpenStrategyId(null)}
          onChanged={() => {
            load()
            onStrategiesChanged()
          }}
        />
      )}
    </div>
  )
}
