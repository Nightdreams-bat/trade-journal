// Local-only persistence for the Payout Calculator page — same pattern as
// userName.ts / themeMode.tsx (localStorage, never touches the SQLite backend).

import type { PropTier, PropVariantId } from './propFirmPresets'

const KEY = 'tj:payoutCalculator:v1'

export interface ManualEntry {
  id: string
  date: string
  pnl: number
}

export interface PayoutLogEntry {
  id: string
  date: string
  amount: number
}

export interface PayoutCalcState {
  variant: PropVariantId
  tier: PropTier
  mode: 'account' | 'manual'
  accountId: number | null
  paStartDate: string
  manualEntries: ManualEntry[]
  payoutLog: PayoutLogEntry[]
}

function defaultState(): PayoutCalcState {
  return {
    variant: 'apex_intraday',
    tier: 25000,
    mode: 'manual',
    accountId: null,
    paStartDate: new Date().toISOString().slice(0, 10),
    manualEntries: [],
    payoutLog: [],
  }
}

export function loadPayoutCalcState(): PayoutCalcState {
  const fallback = defaultState()
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return fallback
    const parsed = JSON.parse(raw)
    return {
      ...fallback,
      ...parsed,
      manualEntries: Array.isArray(parsed.manualEntries) ? parsed.manualEntries : [],
      payoutLog: Array.isArray(parsed.payoutLog) ? parsed.payoutLog : [],
    }
  } catch {
    return fallback
  }
}

export function savePayoutCalcState(state: PayoutCalcState): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(state))
  } catch {
    // private mode / storage disabled — the state just won't persist
  }
}

export function makeId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}
