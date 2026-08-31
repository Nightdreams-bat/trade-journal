import { useState } from 'react'
import { Modal } from './Modal'
import type { Account } from '../types'

type FieldKey = 'date' | 'pnl' | 'pair' | 'session' | 'direction' | 'risk_per_trade' | 'notes'

const FIELDS: { key: FieldKey; label: string; required?: boolean }[] = [
  { key: 'date', label: 'Date', required: true },
  { key: 'pnl', label: 'Profit / Loss', required: true },
  { key: 'pair', label: 'Pair / Instrument' },
  { key: 'session', label: 'Session' },
  { key: 'direction', label: 'Direction' },
  { key: 'risk_per_trade', label: 'Risk per Trade' },
  { key: 'notes', label: 'Notes' },
]

export function CsvImportModal({
  accounts,
  onClose,
  onImported,
}: {
  accounts: Account[]
  onClose: () => void
  onImported: () => void
}) {
  const [file, setFile] = useState<{ filePath: string; headers: string[]; sampleRows: string[][]; totalRows: number } | null>(null)
  const [mapping, setMapping] = useState<Partial<Record<FieldKey, number>>>({})
  const [accountId, setAccountId] = useState<number | ''>(accounts[0]?.id ?? '')
  const [importing, setImporting] = useState(false)
  const [result, setResult] = useState<number | null>(null)

  const pickFile = async () => {
    const picked = await window.api.csv.openForImport()
    if (!picked) return
    setFile(picked)
    // best-effort auto-map by matching header names
    const auto: Partial<Record<FieldKey, number>> = {}
    picked.headers.forEach((h, i) => {
      const norm = h.toLowerCase().replace(/[^a-z]/g, '')
      for (const f of FIELDS) {
        if (norm.includes(f.key.replace('_', ''))) auto[f.key] = i
      }
      if (norm.includes('profit') || norm === 'pl' || norm.includes('pnl')) auto.pnl = i
      if (norm.includes('symbol') || norm.includes('instrument')) auto.pair = i
    })
    setMapping(auto)
  }

  const runImport = async () => {
    if (!file || mapping.date === undefined || mapping.pnl === undefined) return
    setImporting(true)
    try {
      const count = await window.api.csv.import({
        filePath: file.filePath,
        mapping,
        accountId: accountId || null,
      })
      setResult(count)
      onImported()
    } finally {
      setImporting(false)
    }
  }

  return (
    <Modal title="Import Trades from CSV" onClose={onClose} wide>
      {!file ? (
        <div>
          <p style={{ color: 'var(--text-muted)', lineHeight: 1.6 }}>
            Export your trade history from your broker or prop firm as CSV, then pick the file below.
            You'll map its columns to fields on the next step.
          </p>
          <button className="btn btn-primary" onClick={pickFile}>Choose CSV file…</button>
        </div>
      ) : result !== null ? (
        <div>
          <p>Imported <strong>{result}</strong> of {file.totalRows} rows into <strong>trades</strong>.</p>
          <button className="btn btn-primary" onClick={onClose}>Done</button>
        </div>
      ) : (
        <div>
          <p style={{ color: 'var(--text-muted)', fontSize: 12, marginBottom: 10 }}>
            {file.filePath} — {file.totalRows} rows found. Map each field to a CSV column.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--sp-2)', marginBottom: 12 }}>
            {FIELDS.map((f) => (
              <label className="field" key={f.key}>
                {f.label}{f.required ? ' *' : ''}
                <select
                  className="select"
                  value={mapping[f.key] ?? ''}
                  onChange={(e) =>
                    setMapping((m) => ({ ...m, [f.key]: e.target.value === '' ? undefined : Number(e.target.value) }))
                  }
                >
                  <option value="">— skip —</option>
                  {file.headers.map((h, i) => (
                    <option key={i} value={i}>{h}</option>
                  ))}
                </select>
              </label>
            ))}
            <label className="field">Import into Account
              <select className="select" value={accountId} onChange={(e) => setAccountId(e.target.value ? Number(e.target.value) : '')}>
                <option value="">—</option>
                {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </label>
          </div>

          <div style={{ overflowX: 'auto', marginBottom: 12 }}>
            <table className="data-table">
              <thead>
                <tr>{file.headers.map((h, i) => <th key={i}>{h}</th>)}</tr>
              </thead>
              <tbody>
                {file.sampleRows.map((row, ri) => (
                  <tr key={ri}>{row.map((c, ci) => <td key={ci}>{c}</td>)}</tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <button className="btn" onClick={onClose}>Cancel</button>
            <button
              className="btn btn-primary"
              disabled={importing || mapping.date === undefined || mapping.pnl === undefined}
              onClick={runImport}
            >
              {importing ? 'Importing…' : `Import ${file.totalRows} rows`}
            </button>
          </div>
        </div>
      )}
    </Modal>
  )
}
