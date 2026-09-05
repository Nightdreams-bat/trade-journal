/**
 * Supabase client for the opt-in "Shared journal" feature (see sync.ts).
 *
 * This is the only other thing in Trade Journal that touches the network,
 * alongside the economic calendar. Local SQLite (db.ts) stays the source of
 * truth for every existing page — this client is only ever used by sync.ts.
 * If SUPABASE_URL/SUPABASE_ANON_KEY aren't set, `supabase` is null and the
 * feature quietly reports itself as unconfigured rather than throwing.
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { getSetting, setSetting, deleteSetting } from './db'

// Supabase's auth storage adapter just needs get/set/remove for string
// values — the existing local key/value `settings` table (already used by
// calendar.ts and obsidian.ts for their own config) is a perfect fit, so the
// session survives app restarts without any new storage mechanism.
const authStorage = {
  getItem: (key: string) => getSetting(`sb:${key}`),
  setItem: (key: string, value: string) => setSetting(`sb:${key}`, value),
  removeItem: (key: string) => deleteSetting(`sb:${key}`),
}

function createSupabase(): SupabaseClient | null {
  const url = process.env.SUPABASE_URL
  const anonKey = process.env.SUPABASE_ANON_KEY
  if (!url || !anonKey) return null
  return createClient(url, anonKey, {
    auth: {
      storage: authStorage,
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false,
    },
  })
}

export const supabase = createSupabase()

export function isConfigured(): boolean {
  return supabase !== null
}
