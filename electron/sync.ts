/**
 * Shared journal sync — mirrors this machine's accounts/strategies/trades/
 * missed trades into Supabase so a friend running the same app can see them
 * (each person keeps their own local journal; nothing here changes what any
 * existing page reads or writes — see db.ts, which stays untouched).
 *
 * Off by default (`sync_enabled` in the local `settings` table, same pattern
 * as calendar.ts's `calendar_enabled`). Every push is fire-and-forget from
 * the caller's point of view and never throws — a network hiccup here must
 * never break a local save.
 */
import { supabase, isConfigured } from './supabaseClient'
import { getSetting, setSetting } from './db'

const ENABLED_KEY = 'sync_enabled'
const LAST_SYNC_KEY = 'sync_last_sync'
const LAST_ERROR_KEY = 'sync_last_error'

export interface SyncStatus {
  configured: boolean
  signedIn: boolean
  email: string | null
  displayName: string | null
  enabled: boolean
  lastSync: string | null
  lastError: string | null
}

export interface SharedTrade {
  id: string
  date: string
  pair: string | null
  direction: string | null
  pnl: number
  r_multiple: number | null
  notes: string | null
  source: string
  ownerId: string
  ownerName: string
  isMine: boolean
  accountName: string | null
  strategyName: string | null
}

export function isEnabled(): boolean {
  return isConfigured() && getSetting(ENABLED_KEY) === '1'
}

async function currentUserId(): Promise<string | null> {
  if (!supabase) return null
  const { data } = await supabase.auth.getSession()
  return data.session?.user.id ?? null
}

export async function getStatus(): Promise<SyncStatus> {
  let email: string | null = null
  let displayName: string | null = null
  if (supabase) {
    const { data } = await supabase.auth.getSession()
    email = data.session?.user.email ?? null
    if (data.session) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('display_name')
        .eq('id', data.session.user.id)
        .maybeSingle()
      displayName = profile?.display_name ?? null
    }
  }
  return {
    configured: isConfigured(),
    signedIn: email !== null,
    email,
    displayName,
    enabled: isEnabled(),
    lastSync: getSetting(LAST_SYNC_KEY),
    lastError: getSetting(LAST_ERROR_KEY),
  }
}

export async function signUp(email: string, password: string, displayName: string): Promise<SyncStatus> {
  if (!supabase) throw new Error('Supabase is not configured.')
  const { data, error } = await supabase.auth.signUp({ email, password })
  if (error) throw error
  if (data.user) {
    await supabase.from('profiles').upsert({ id: data.user.id, display_name: displayName || email })
  }
  return getStatus()
}

export async function signIn(email: string, password: string): Promise<SyncStatus> {
  if (!supabase) throw new Error('Supabase is not configured.')
  const { error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw error
  return getStatus()
}

export async function signOut(): Promise<SyncStatus> {
  if (supabase) await supabase.auth.signOut()
  setSetting(ENABLED_KEY, '0')
  return getStatus()
}

export async function setEnabled(enabled: boolean): Promise<SyncStatus> {
  setSetting(ENABLED_KEY, enabled ? '1' : '0')
  return getStatus()
}

// ---------------------------------------------------------------------------
// push (local -> Supabase)
// ---------------------------------------------------------------------------

type PushTable = 'accounts' | 'strategies' | 'trades' | 'missed_trades'

async function push(table: PushTable, localId: number, fields: Record<string, unknown> | null): Promise<void> {
  if (!supabase || !isEnabled()) return
  try {
    const userId = await currentUserId()
    if (!userId) return
    if (fields === null) {
      const { error } = await supabase.from(table).delete().eq('user_id', userId).eq('local_id', localId)
      if (error) throw error
    } else {
      const { error } = await supabase
        .from(table)
        .upsert({ ...fields, user_id: userId, local_id: localId }, { onConflict: 'user_id,local_id' })
      if (error) throw error
    }
    setSetting(LAST_SYNC_KEY, new Date().toISOString())
    setSetting(LAST_ERROR_KEY, '')
  } catch (err) {
    setSetting(LAST_ERROR_KEY, err instanceof Error ? err.message : String(err))
  }
}

export interface AccountRow {
  id: number
  name: string
  broker: string | null
  starting_balance: number
  currency: string
  account_type: string
}

export function pushAccount(row: AccountRow): Promise<void> {
  return push('accounts', row.id, {
    name: row.name,
    broker: row.broker ?? '',
    starting_balance: row.starting_balance,
    currency: row.currency,
    account_type: row.account_type,
  })
}

export function deleteAccount(localId: number): Promise<void> {
  return push('accounts', localId, null)
}

export interface StrategyRow {
  id: number
  name: string
  description: string | null
}

export function pushStrategy(row: StrategyRow): Promise<void> {
  return push('strategies', row.id, { name: row.name, description: row.description ?? '' })
}

export function deleteStrategy(localId: number): Promise<void> {
  return push('strategies', localId, null)
}

export interface TradeRow {
  id: number
  name: string | null
  date: string
  pair: string | null
  session: string | null
  direction: string | null
  risk_per_trade: number | null
  pnl: number
  r_multiple: number | null
  followed_plan: number | boolean
  break_even: number | boolean
  entry_win: number | boolean
  strategy_id: number | null
  account_id: number | null
  notes: string | null
  source: string
  created_at: string
}

export function pushTrade(row: TradeRow): Promise<void> {
  return push('trades', row.id, {
    name: row.name,
    date: row.date,
    pair: row.pair,
    session: row.session,
    direction: row.direction,
    risk_per_trade: row.risk_per_trade,
    pnl: row.pnl,
    r_multiple: row.r_multiple,
    followed_plan: !!row.followed_plan,
    break_even: !!row.break_even,
    entry_win: !!row.entry_win,
    strategy_local_id: row.strategy_id,
    account_local_id: row.account_id,
    notes: row.notes,
    source: row.source,
    created_at: row.created_at,
  })
}

export function deleteTrade(localId: number): Promise<void> {
  return push('trades', localId, null)
}

export interface MissedTradeRow {
  id: number
  date: string
  pair: string | null
  direction: string | null
  would_be_pnl: number | null
  reason_missed: string | null
  strategy_id: number | null
  notes: string | null
}

export function pushMissedTrade(row: MissedTradeRow): Promise<void> {
  return push('missed_trades', row.id, {
    date: row.date,
    pair: row.pair,
    direction: row.direction,
    would_be_pnl: row.would_be_pnl,
    reason_missed: row.reason_missed,
    strategy_local_id: row.strategy_id,
    notes: row.notes,
  })
}

export function deleteMissedTrade(localId: number): Promise<void> {
  return push('missed_trades', localId, null)
}

// ---------------------------------------------------------------------------
// pull (Supabase -> Shared tab)
// ---------------------------------------------------------------------------

export async function getShared(): Promise<SharedTrade[]> {
  if (!supabase) return []

  const [tradesRes, accountsRes, strategiesRes, profilesRes, sessionRes] = await Promise.all([
    supabase.from('trades').select('*').order('date', { ascending: false }),
    supabase.from('accounts').select('user_id, local_id, name'),
    supabase.from('strategies').select('user_id, local_id, name'),
    supabase.from('profiles').select('id, display_name'),
    supabase.auth.getSession(),
  ])
  if (tradesRes.error) throw tradesRes.error

  const accountName = new Map(
    (accountsRes.data ?? []).map((a) => [`${a.user_id}:${a.local_id}`, a.name as string])
  )
  const strategyName = new Map(
    (strategiesRes.data ?? []).map((s) => [`${s.user_id}:${s.local_id}`, s.name as string])
  )
  const displayName = new Map(
    (profilesRes.data ?? []).map((p) => [p.id as string, p.display_name as string])
  )
  const myId = sessionRes.data.session?.user.id ?? null

  return (tradesRes.data ?? []).map((t) => ({
    id: t.id,
    date: t.date,
    pair: t.pair,
    direction: t.direction,
    pnl: t.pnl,
    r_multiple: t.r_multiple,
    notes: t.notes,
    source: t.source,
    ownerId: t.user_id,
    ownerName: displayName.get(t.user_id) ?? 'Unknown',
    isMine: t.user_id === myId,
    accountName:
      t.account_local_id != null ? (accountName.get(`${t.user_id}:${t.account_local_id}`) ?? null) : null,
    strategyName:
      t.strategy_local_id != null ? (strategyName.get(`${t.user_id}:${t.strategy_local_id}`) ?? null) : null,
  }))
}
