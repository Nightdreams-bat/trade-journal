export function InsightsPanel({ insights }: { insights: string[] }) {
  if (!insights.length) return null
  return (
    <div className="card" style={{ padding: 'var(--sp-4)' }}>
      <div style={{ color: 'var(--text-muted)', fontSize: 12, marginBottom: 10 }}>Insights</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-2)' }}>
        {insights.map((text, i) => (
          <div key={i} style={{ display: 'flex', gap: 8, fontSize: 12.5, lineHeight: 1.5 }}>
            <span style={{ color: 'var(--accent)' }}>◆</span>
            <span>{text}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
