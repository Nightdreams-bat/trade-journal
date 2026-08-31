import { Select } from './Select'
import type { Account, Strategy } from '../types'

export function FilterBar({
  accounts,
  strategies,
  accountId,
  strategyId,
  onAccountChange,
  onStrategyChange,
}: {
  accounts: Account[]
  strategies: Strategy[]
  accountId: number | null
  strategyId: number | null
  onAccountChange: (id: number | null) => void
  onStrategyChange: (id: number | null) => void
}) {
  return (
    <div style={{ display: 'flex', gap: 8 }}>
      <Select
        ariaLabel="Filter by account"
        width={170}
        value={accountId != null ? String(accountId) : ''}
        onChange={(v) => onAccountChange(v ? Number(v) : null)}
        options={[
          { value: '', label: 'All Accounts' },
          ...accounts.map((a) => ({ value: String(a.id), label: a.name })),
        ]}
      />
      <Select
        ariaLabel="Filter by strategy"
        width={170}
        value={strategyId != null ? String(strategyId) : ''}
        onChange={(v) => onStrategyChange(v ? Number(v) : null)}
        options={[
          { value: '', label: 'All Strategies' },
          ...strategies.map((s) => ({ value: String(s.id), label: s.name })),
        ]}
      />
    </div>
  )
}
