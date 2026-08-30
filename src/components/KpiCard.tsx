import { CountUpValue } from '../anim'

export function KpiCard({
  label,
  value,
  positive,
}: {
  label: string
  value: string
  positive?: boolean | null
}) {
  const color = positive === undefined || positive === null ? 'var(--text)' : positive ? 'var(--green)' : 'var(--red)'
  return (
    <div className="card" style={{ padding: '16px 18px', flex: 1, minWidth: 150 }}>
      <div style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 26, fontWeight: 600, color }}>
        <CountUpValue value={value} />
      </div>
    </div>
  )
}
