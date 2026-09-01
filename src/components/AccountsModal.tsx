import { useState } from 'react'
import { Modal } from './Modal'
import { ConfirmDialog } from './ConfirmDialog'
import { Select } from './Select'
import { X, Pencil } from './icons'
import { ACCOUNT_TYPES, ACCOUNT_TYPE_LABELS, type Account, type AccountType } from '../types'

const TYPE_OPTIONS = ACCOUNT_TYPES.map((t) => ({ value: t, label: ACCOUNT_TYPE_LABELS[t] }))

function AccountFields({
  name,
  setName,
  broker,
  setBroker,
  startingBalance,
  setStartingBalance,
  currency,
  setCurrency,
  accountType,
  setAccountType,
}: {
  name: string
  setName: (v: string) => void
  broker: string
  setBroker: (v: string) => void
  startingBalance: string
  setStartingBalance: (v: string) => void
  currency: string
  setCurrency: (v: string) => void
  accountType: AccountType
  setAccountType: (v: AccountType) => void
}) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
      <label className="field">Name
        <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Prop Firm Account" />
      </label>
      <label className="field">Account Type
        <Select
          ariaLabel="Account type"
          width="100%"
          value={accountType}
          onChange={(v) => setAccountType(v as AccountType)}
          options={TYPE_OPTIONS}
        />
      </label>
      <label className="field">Broker / Firm
        <input className="input" value={broker} onChange={(e) => setBroker(e.target.value)} placeholder="FTMO, IC Markets…" />
      </label>
      <label className="field">Starting Balance
        <input className="input" type="number" step="any" value={startingBalance} onChange={(e) => setStartingBalance(e.target.value)} />
      </label>
      <label className="field">Currency
        <input className="input" value={currency} onChange={(e) => setCurrency(e.target.value)} />
      </label>
    </div>
  )
}

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
  const [accountType, setAccountType] = useState<AccountType>('live')

  const [editingId, setEditingId] = useState<number | null>(null)
  const [editName, setEditName] = useState('')
  const [editBroker, setEditBroker] = useState('')
  const [editBalance, setEditBalance] = useState('')
  const [editCurrency, setEditCurrency] = useState('USD')
  const [editType, setEditType] = useState<AccountType>('live')
  const [deletingId, setDeletingId] = useState<number | null>(null)

  const add = async () => {
    if (!name.trim()) return
    await window.api.accounts.create({
      name: name.trim(),
      broker,
      starting_balance: parseFloat(startingBalance) || 0,
      currency,
      account_type: accountType,
    })
    setName('')
    setBroker('')
    setStartingBalance('10000')
    setAccountType('live')
    onChanged()
  }

  const startEdit = (a: Account) => {
    setEditingId(a.id)
    setEditName(a.name)
    setEditBroker(a.broker ?? '')
    setEditBalance(String(a.starting_balance))
    setEditCurrency(a.currency)
    setEditType(a.account_type ?? 'live')
  }

  const cancelEdit = () => setEditingId(null)

  const saveEdit = async (id: number) => {
    if (!editName.trim()) return
    await window.api.accounts.update(id, {
      name: editName.trim(),
      broker: editBroker,
      starting_balance: parseFloat(editBalance) || 0,
      currency: editCurrency,
      account_type: editType,
    })
    setEditingId(null)
    onChanged()
  }

  const remove = async (id: number) => {
    await window.api.accounts.delete(id)
    onChanged()
  }

  return (
    <Modal title="Manage Accounts" onClose={onClose}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
        {accounts.map((a) =>
          editingId === a.id ? (
            <div
              key={a.id}
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 10,
                padding: '10px 10px 12px',
                border: '1px solid var(--accent-border)',
                borderRadius: 'var(--radius-control)',
                background: 'var(--accent-bg)',
              }}
            >
              <AccountFields
                name={editName}
                setName={setEditName}
                broker={editBroker}
                setBroker={setEditBroker}
                startingBalance={editBalance}
                setStartingBalance={setEditBalance}
                currency={editCurrency}
                setCurrency={setEditCurrency}
                accountType={editType}
                setAccountType={setEditType}
              />
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button className="btn" style={{ fontSize: 12 }} onClick={cancelEdit}>Cancel</button>
                <button className="btn btn-primary" style={{ fontSize: 12 }} disabled={!editName.trim()} onClick={() => saveEdit(a.id)}>
                  Save
                </button>
              </div>
            </div>
          ) : (
            <div
              key={a.id}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '8px 10px',
                border: '1px solid var(--border-soft)',
                borderRadius: 'var(--radius-control)',
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontWeight: 600 }}>{a.name}</span>
                  <span className="mono-chip" style={{ fontSize: 10 }}>
                    {ACCOUNT_TYPE_LABELS[a.account_type ?? 'live']}
                  </span>
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>
                  {a.broker || 'No broker set'} · {a.currency} {a.starting_balance.toLocaleString()}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <button className="btn" style={{ padding: '3px 6px', fontSize: 11 }} onClick={() => startEdit(a)}>
                  <Pencil size={14} />
                </button>
                <button className="btn btn-danger" style={{ padding: '3px 6px', fontSize: 11 }} onClick={() => setDeletingId(a.id)}>
                  <X size={14} />
                </button>
              </div>
            </div>
          ),
        )}
      </div>

      <div style={{ color: 'var(--text-muted)', fontSize: 12, marginBottom: 8 }}>Add Account</div>
      <div style={{ marginBottom: 10 }}>
        <AccountFields
          name={name}
          setName={setName}
          broker={broker}
          setBroker={setBroker}
          startingBalance={startingBalance}
          setStartingBalance={setStartingBalance}
          currency={currency}
          setCurrency={setCurrency}
          accountType={accountType}
          setAccountType={setAccountType}
        />
      </div>
      <button className="btn btn-primary" onClick={add} disabled={!name.trim()}>Add Account</button>

      {deletingId !== null && (
        <ConfirmDialog
          title="Delete account?"
          message="Trades linked to it will be unassigned, not deleted. This cannot be undone."
          onConfirm={() => {
            const id = deletingId
            setDeletingId(null)
            remove(id)
          }}
          onCancel={() => setDeletingId(null)}
        />
      )}
    </Modal>
  )
}
