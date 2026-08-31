import { RingStat } from './RingStat'

interface ChallengeRingProps {
  label: string
  percent: number
  centerLabel?: string
  caption?: string
  tone?: 'accent' | 'positive' | 'danger'
}

const TONE: Record<NonNullable<ChallengeRingProps['tone']>, string> = {
  accent: 'var(--accent)',
  positive: 'var(--green)',
  danger: 'var(--red)',
}

/** A labelled progress ring for a prop-firm challenge metric. */
export function ChallengeRing({ label, percent, centerLabel, caption, tone = 'accent' }: ChallengeRingProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
      <span className="mono-label">{label}</span>
      <RingStat percent={percent} centerLabel={centerLabel} caption={caption} color={TONE[tone]} size={84} />
    </div>
  )
}
