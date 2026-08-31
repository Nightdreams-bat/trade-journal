import { useState } from 'react'
import { Modal } from './Modal'
import { X } from './icons'
import type { Account } from '../types'

export function AccountsModal({
  accounts,
  onClose,
  onChanged,
}: {
  accounts: Account[]
  onClose: () => void
  onChanged: () => void
}) {
  const [name, setName] = useState('')
  const [broker, setBroker] = useState('')
  const [startingBalance, setStartingBalance] = useState('10000')
  const [currency, setCurrency] = useState('USD')

  const add = async () => {
    if (!name.trim()) return
    await window.api.accounts.create({
      name: name.trim(),
      broker,
      starting_balance: parseFloat(startingBalance) || 0,
      currency,
    })
    setName('')
    setBroker('')
    setStartingBalance('10000')
    onChanged()
  }

  const remove = async (id: number) => {
    if (!confirm('Delete this account? Trades linked to it will be unassigned, not deleted.')) return
    await window.api.accounts.delete(id)
    onChanged()
  }

  return (
    <Modal title="Manage Accounts" onClose={onClose}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
        {accounts.map((a) => (
          <div key={a.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 10px', border: '1px solid var(--border-soft)', borderRadius: 'var(--radius-control)' }}>
            <div>
              <div style={{ fontWeight: 600 }}>{a.name}</div>
              <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>{a.broker || 'No broker set'} · {a.currency} {a.starting_balance.toLocaleString()}</div>
            </div>
            <button className="btn btn-danger" style={{ padding: '3px 6px', fontSize: 11 }} onClick={() => remove(a.id)}><X size={14} /></button>
          </div>
        ))}
      </div>

      <div style={{ color: 'var(--text-muted)', fontSize: 12, marginBottom: 8 }}>Add Account</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
        <label className="field">Name
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Prop Firm Account" />
        </label>
        <label className="field">Broker / Firm
          <input className="input" value={broker} onChange={(e) => setBroker(e.target.value)} />
        </label>
        <label className="field">Starting Balance
          <input className="input" type="number" step="any" value={startingBalance} onChange={(e) => setStartingBalance(e.target.value)} />
        </label>
        <label className="field">Currency
          <input className="input" value={currency} onChange={(e) => setCurrency(e.target.value)} />
        </label>
      </div>
      <button className="btn btn-primary" onClick={add} disabled={!name.trim()}>Add Account</button>
    </Modal>
  )
}
