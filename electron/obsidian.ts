/**
 * Obsidian vault mirror — one-way sync of the Trade Journal SQLite DB into a
 * real Obsidian vault (a folder of markdown notes).
 *
 * Design:
 *  - SQLite is the source of truth. This module only ever WRITES the vault.
 *  - Every exported sync entry point is a no-op unless the user enabled it in
 *    Settings, and every one swallows its own errors — a vault problem must
 *    never break a journal save.
 *  - The app only writes / deletes inside the resolved vault folder, and only
 *    deletes files recorded in `.tradejournal-sync.json`.
 */

import { app, shell } from 'electron'
import fs from 'node:fs'
import path from 'node:path'
import { spawn } from 'node:child_process'
import { getDb, getSetting, setSetting, deleteSetting } from './db'
import * as fmt from './obsidian-format'
import type {
  TradeRow,
  MissedTradeRow,
  DailyReviewRow,
  StrategyRow,
  AccountRow,
  ConfluenceRow,
} from './obsidian-format'

const ENABLED_KEY = 'obsidian_enabled'
const PATH_KEY = 'obsidian_vault_path'
const LAST_SYNC_KEY = 'obsidian_last_sync'
const MANIFEST_FILE = '.tradejournal-sync.json'

// ---------------------------------------------------------------------------
// config
// ---------------------------------------------------------------------------

export function defaultVaultPath(): string {
  return path.join(app.getPath('documents'), 'TradeJournal Vault')
}

export function resolveVaultPath(): string {
  const custom = getSetting(PATH_KEY)
  return custom && custom.trim() ? custom : defaultVaultPath()
}

export function isEnabled(): boolean {
  return getSetting(ENABLED_KEY) === '1'
}

export interface ObsidianConfig {
  enabled: boolean
  vaultPath: string // custom override, '' when using the default
  resolvedPath: string
  defaultPath: string
  exists: boolean
  lastSync: string | null
  noteCount: number
}

export function getConfig(): ObsidianConfig {
  const resolvedPath = resolveVaultPath()
  let noteCount = 0
  try {
    noteCount = Object.values(loadManifest(resolvedPath)).reduce(
      (n, section) => n + (Array.isArray(section) ? section.length : Object.keys(section).length),
      0
    )
  } catch {
    /* ignore */
  }
  return {
    enabled: isEnabled(),
    vaultPath: getSetting(PATH_KEY) ?? '',
    resolvedPath,
    defaultPath: defaultVaultPath(),
    exists: fs.existsSync(resolvedPath),
    lastSync: getSetting(LAST_SYNC_KEY),
    noteCount,
  }
}

// ---------------------------------------------------------------------------
// manifest  (id -> relative note path; the only files we are allowed to delete)
// ---------------------------------------------------------------------------

interface Manifest {
  trades: Record<string, string>
  missed: Record<string, string>
  reviews: Record<string, string>
  strategies: Record<string, string>
  accounts: Record<string, string>
  confluences: Record<string, string>
  attachments: string[]
}

const emptyManifest = (): Manifest => ({
  trades: {},
  missed: {},
  reviews: {},
  strategies: {},
  accounts: {},
  confluences: {},
  attachments: [],
})

function loadManifest(vault: string): Manifest {
  try {
    const raw = fs.readFileSync(path.join(vault, MANIFEST_FILE), 'utf-8')
    return { ...emptyManifest(), ...(JSON.parse(raw) as Partial<Manifest>) }
  } catch {
    return emptyManifest()
  }
}

function saveManifest(vault: string, m: Manifest): void {
  writeFileAtomic(path.join(vault, MANIFEST_FILE), JSON.stringify(m, null, 2))
}

// ---------------------------------------------------------------------------
// safe filesystem primitives (all scoped to the vault root)
// ---------------------------------------------------------------------------

function insideVault(vault: string, target: string): boolean {
  const rel = path.relative(vault, target)
  return !!rel && !rel.startsWith('..') && !path.isAbsolute(rel)
}

function writeFileAtomic(absPath: string, content: string): void {
  fs.mkdirSync(path.dirname(absPath), { recursive: true })
  const tmp = `${absPath}.tmp-${process.pid}`
  fs.writeFileSync(tmp, content, 'utf-8')
  fs.renameSync(tmp, absPath)
}

function writeNote(vault: string, relPath: string, content: string): void {
  const abs = path.resolve(vault, relPath)
  if (!insideVault(vault, abs)) throw new Error(`refusing to write outside vault: ${relPath}`)
  writeFileAtomic(abs, content)
}

function deleteManaged(vault: string, relPath: string | undefined): void {
  if (!relPath) return
  const abs = path.resolve(vault, relPath)
  if (!insideVault(vault, abs)) return
  try {
    fs.rmSync(abs, { force: true })
  } catch {
    /* ignore */
  }
}

// ---------------------------------------------------------------------------
// vault scaffolding + Obsidian app integration
// ---------------------------------------------------------------------------

export function ensureVault(): string {
  const vault = resolveVaultPath()
  fs.mkdirSync(vault, { recursive: true })
  for (const dir of fmt.VAULT_SUBDIRS) fs.mkdirSync(path.join(vault, dir), { recursive: true })

  const dotObsidian = path.join(vault, '.obsidian')
  fs.mkdirSync(dotObsidian, { recursive: true })
  writeIfAbsent(path.join(dotObsidian, 'app.json'), JSON.stringify(fmt.OBSIDIAN_APP_JSON, null, 2))
  writeIfAbsent(
    path.join(dotObsidian, 'core-plugins.json'),
    JSON.stringify(fmt.OBSIDIAN_CORE_PLUGINS, null, 2)
  )
  writeIfAbsent(path.join(vault, fmt.ROOT_DIR, 'README.md'), fmt.readmeContents())
  return vault
}

function writeIfAbsent(absPath: string, content: string): void {
  if (!fs.existsSync(absPath)) writeFileAtomic(absPath, content)
}

/** Add the vault to Obsidian's own registry so it shows up in the vault switcher. */
export function registerWithObsidian(): void {
  try {
    const vault = resolveVaultPath()
    const registryPath = path.join(app.getPath('appData'), 'obsidian', 'obsidian.json')
    let registry: { vaults?: Record<string, { path: string; ts: number; open?: boolean }> } = {}
    try {
      registry = JSON.parse(fs.readFileSync(registryPath, 'utf-8'))
    } catch {
      /* missing / empty / malformed — start fresh */
    }
    registry.vaults ??= {}
    const already = Object.values(registry.vaults).some(
      (v) => path.resolve(v.path) === path.resolve(vault)
    )
    if (!already) {
      const id = randomHexId()
      registry.vaults[id] = { path: vault, ts: Date.now() }
      fs.mkdirSync(path.dirname(registryPath), { recursive: true })
      writeFileAtomic(registryPath, JSON.stringify(registry, null, 2))
    }
  } catch (err) {
    console.error('[obsidian] registerWithObsidian failed:', err)
  }
}

function randomHexId(): string {
  let s = ''
  for (let i = 0; i < 16; i++) s += Math.floor(Math.random() * 16).toString(16)
  return s
}

/** Best-effort: open the vault in the Obsidian desktop app. */
export async function openInObsidian(): Promise<void> {
  const vault = resolveVaultPath()
  ensureVault()
  registerWithObsidian()
  const uri = `obsidian://open?path=${encodeURIComponent(vault)}`
  try {
    await shell.openExternal(uri)
    return
  } catch {
    /* no protocol handler — fall through to spawning the exe */
  }
  const exe = findObsidianExe()
  if (exe) {
    try {
      spawn(exe, [`obsidian://open?path=${vault}`], { detached: true, stdio: 'ignore' }).unref()
    } catch (err) {
      console.error('[obsidian] spawn failed:', err)
    }
  }
}

function findObsidianExe(): string | null {
  const candidates = [
    path.join(app.getPath('appData'), '..', 'Local', 'Programs', 'Obsidian', 'Obsidian.exe'),
    path.join(app.getPath('home'), 'AppData', 'Local', 'Programs', 'Obsidian', 'Obsidian.exe'),
  ]
  return candidates.find((p) => fs.existsSync(p)) ?? null
}

/** Reveal the vault folder in the OS file manager. */
export async function showVaultFolder(): Promise<void> {
  await shell.openPath(ensureVault())
}

// ---------------------------------------------------------------------------
// DB readers  (mirror the shapes ipc.ts returns to the renderer)
// ---------------------------------------------------------------------------

const parseJsonArray = (v: unknown): string[] => {
  try {
    const parsed = JSON.parse((v as string) || '[]')
    return Array.isArray(parsed) ? parsed.map(String) : []
  } catch {
    return []
  }
}

function readTrade(id: number): TradeRow | null {
  const row = getDb().prepare('SELECT * FROM trades WHERE id = ?').get(id) as
    | Record<string, unknown>
    | undefined
  if (!row) return null
  return {
    ...(row as unknown as TradeRow),
    positive_tags: parseJsonArray(row.positive_tags),
    negative_tags: parseJsonArray(row.negative_tags),
  }
}

function readMissed(id: number): MissedTradeRow | null {
  const row = getDb().prepare('SELECT * FROM missed_trades WHERE id = ?').get(id) as
    | Record<string, unknown>
    | undefined
  if (!row) return null
  return { ...(row as unknown as MissedTradeRow), tags: parseJsonArray(row.tags) }
}

function nameById(table: 'strategies' | 'accounts', id: unknown): string | null {
  if (typeof id !== 'number') return null
  const row = getDb().prepare(`SELECT name FROM ${table} WHERE id = ?`).get(id) as
    | { name: string }
    | undefined
  return row?.name ?? null
}

function confluenceNamesFor(entityType: 'trade' | 'missed_trade', entityId: number): string[] {
  const rows = getDb()
    .prepare(
      `SELECT c.name FROM entity_confluences ec
       JOIN confluences c ON c.id = ec.confluence_id
       WHERE ec.entity_type = ? AND ec.entity_id = ?
       ORDER BY c.name ASC`
    )
    .all(entityType, entityId) as { name: string }[]
  return rows.map((r) => r.name)
}

// ---------------------------------------------------------------------------
// attachments
// ---------------------------------------------------------------------------

function copyAttachments(
  vault: string,
  manifest: Manifest,
  entityType: 'trade' | 'missed_trade',
  entityId: number
): string[] {
  const rows = getDb()
    .prepare(
      'SELECT path FROM entity_images WHERE entity_type = ? AND entity_id = ? ORDER BY id ASC'
    )
    .all(entityType, entityId) as { path: string }[]
  const attachDir = path.join(vault, fmt.ROOT_DIR, 'Attachments')
  const basenames: string[] = []
  for (const r of rows) {
    if (!r.path || !fs.existsSync(r.path)) continue
    const base = path.basename(r.path)
    const dest = path.join(attachDir, base)
    try {
      if (!fs.existsSync(dest)) {
        fs.mkdirSync(attachDir, { recursive: true })
        fs.copyFileSync(r.path, dest)
      }
      if (!manifest.attachments.includes(base)) manifest.attachments.push(base)
      basenames.push(base)
    } catch (err) {
      console.error('[obsidian] attachment copy failed:', err)
    }
  }
  return basenames
}

// ---------------------------------------------------------------------------
// per-entity sync   (internal, operate on a loaded manifest)
// ---------------------------------------------------------------------------

function syncTradeInto(vault: string, m: Manifest, id: number): void {
  const t = readTrade(id)
  if (!t) return removeFromManifest(vault, m, 'trades', id)
  const ctx: fmt.TradeContext = {
    strategyName: nameById('strategies', (t as unknown as Record<string, unknown>).strategy_id),
    accountName: nameById('accounts', (t as unknown as Record<string, unknown>).account_id),
    confluenceNames: confluenceNamesFor('trade', id),
    hasDailyReview: !!getDb().prepare('SELECT 1 FROM daily_reviews WHERE date = ?').get(t.date),
    screenshots: copyAttachments(vault, m, 'trade', id),
  }
  const relPath = fmt.tradeNotePath(t)
  replaceNote(vault, m, 'trades', id, relPath, fmt.tradeNote(t, ctx))
}

function syncMissedInto(vault: string, m: Manifest, id: number): void {
  const t = readMissed(id)
  if (!t) return removeFromManifest(vault, m, 'missed', id)
  const ctx: fmt.MissedTradeContext = {
    strategyName: nameById('strategies', (t as unknown as Record<string, unknown>).strategy_id),
    confluenceNames: confluenceNamesFor('missed_trade', id),
    screenshots: copyAttachments(vault, m, 'missed_trade', id),
  }
  const relPath = fmt.missedNotePath(t)
  replaceNote(vault, m, 'missed', id, relPath, fmt.missedTradeNote(t, ctx))
}

function syncReviewInto(vault: string, m: Manifest, date: string): void {
  const db = getDb()
  const row = db.prepare('SELECT * FROM daily_reviews WHERE date = ?').get(date) as
    | DailyReviewRow
    | undefined

  const tradeRows = db
    .prepare('SELECT id FROM trades WHERE date = ? ORDER BY id ASC')
    .all(date) as { id: number }[]
  const missedRows = db
    .prepare('SELECT id FROM missed_trades WHERE date = ? ORDER BY id ASC')
    .all(date) as { id: number }[]

  // Nothing on this day any more — drop the note.
  if (!row && !tradeRows.length && !missedRows.length) {
    return removeFromManifest(vault, m, 'reviews', date)
  }

  const ctx: fmt.DailyReviewContext = {
    tradeNotes: tradeRows.map((r) => {
      const t = readTrade(r.id)
      return t ? fmt.tradeNoteBasename(t) : ''
    }).filter(Boolean),
    missedNotes: missedRows.map((r) => {
      const t = readMissed(r.id)
      return t ? fmt.missedNoteBasename(t) : ''
    }).filter(Boolean),
  }
  const review: DailyReviewRow = row ?? { date, notes: null, emotion: null, lessons_learned: null }
  replaceNote(vault, m, 'reviews', date, fmt.dailyReviewPath(date), fmt.dailyReviewNote(review, ctx))
}

function syncStrategyInto(vault: string, m: Manifest, id: number): void {
  const row = getDb().prepare('SELECT * FROM strategies WHERE id = ?').get(id) as
    | StrategyRow
    | undefined
  if (!row) return removeFromManifest(vault, m, 'strategies', id)
  replaceNote(vault, m, 'strategies', id, fmt.strategyNotePath(row), fmt.strategyNote(row))
}

function syncAccountInto(vault: string, m: Manifest, id: number): void {
  const row = getDb().prepare('SELECT * FROM accounts WHERE id = ?').get(id) as AccountRow | undefined
  if (!row) return removeFromManifest(vault, m, 'accounts', id)
  replaceNote(vault, m, 'accounts', id, fmt.accountNotePath(row), fmt.accountNote(row))
}

function syncConfluenceInto(vault: string, m: Manifest, id: number): void {
  const row = getDb().prepare('SELECT * FROM confluences WHERE id = ?').get(id) as
    | ConfluenceRow
    | undefined
  if (!row) return removeFromManifest(vault, m, 'confluences', id)
  replaceNote(vault, m, 'confluences', id, fmt.confluenceNotePath(row), fmt.confluenceNote(row))
}

type ManifestMapKey = 'trades' | 'missed' | 'reviews' | 'strategies' | 'accounts' | 'confluences'

function replaceNote(
  vault: string,
  m: Manifest,
  key: ManifestMapKey,
  id: number | string,
  relPath: string,
  content: string
): void {
  const prev = m[key][String(id)]
  if (prev && prev !== relPath) deleteManaged(vault, prev)
  writeNote(vault, relPath, content)
  m[key][String(id)] = relPath
}

function removeFromManifest(
  vault: string,
  m: Manifest,
  key: ManifestMapKey,
  id: number | string
): void {
  deleteManaged(vault, m[key][String(id)])
  delete m[key][String(id)]
}

// ---------------------------------------------------------------------------
// public entry points  (guarded + error-swallowing + serialized)
// ---------------------------------------------------------------------------

let queue: Promise<unknown> = Promise.resolve()

/** Run `fn` after any in-flight vault work; never rejects. */
function enqueue<T>(label: string, fn: (vault: string, m: Manifest) => T): Promise<T | undefined> {
  const task = queue.then(() => {
    if (!isEnabled()) return undefined
    try {
      const vault = ensureVault()
      const m = loadManifest(vault)
      const result = fn(vault, m)
      saveManifest(vault, m)
      setSetting(LAST_SYNC_KEY, new Date().toISOString())
      return result
    } catch (err) {
      console.error(`[obsidian] ${label} failed:`, err)
      return undefined
    }
  })
  queue = task.catch(() => undefined)
  return task
}

export const syncTrade = (id: number) =>
  enqueue(`syncTrade(${id})`, (v, m) => {
    const t = readTrade(id)
    syncTradeInto(v, m, id)
    if (t) syncReviewInto(v, m, t.date)
  })

export const removeTrade = (id: number, date?: string) =>
  enqueue(`removeTrade(${id})`, (v, m) => {
    removeFromManifest(v, m, 'trades', id)
    if (date) syncReviewInto(v, m, date)
  })

export const syncMissedTrade = (id: number) =>
  enqueue(`syncMissedTrade(${id})`, (v, m) => {
    const t = readMissed(id)
    syncMissedInto(v, m, id)
    if (t) syncReviewInto(v, m, t.date)
  })

export const removeMissedTrade = (id: number, date?: string) =>
  enqueue(`removeMissedTrade(${id})`, (v, m) => {
    removeFromManifest(v, m, 'missed', id)
    if (date) syncReviewInto(v, m, date)
  })

export const syncDailyReview = (date: string) =>
  enqueue(`syncDailyReview(${date})`, (v, m) => syncReviewInto(v, m, date))

export const syncStrategy = (id: number) =>
  enqueue(`syncStrategy(${id})`, (v, m) => syncStrategyInto(v, m, id))
export const removeStrategy = (id: number) =>
  enqueue(`removeStrategy(${id})`, (v, m) => removeFromManifest(v, m, 'strategies', id))

export const syncAccount = (id: number) =>
  enqueue(`syncAccount(${id})`, (v, m) => syncAccountInto(v, m, id))
export const removeAccount = (id: number) =>
  enqueue(`removeAccount(${id})`, (v, m) => removeFromManifest(v, m, 'accounts', id))

export const syncConfluence = (id: number) =>
  enqueue(`syncConfluence(${id})`, (v, m) => syncConfluenceInto(v, m, id))
export const removeConfluence = (id: number) =>
  enqueue(`removeConfluence(${id})`, (v, m) => removeFromManifest(v, m, 'confluences', id))

/** Re-sync the trade/missed note that owns an image after images change. */
export const syncEntityImages = (entityType: 'trade' | 'missed_trade', entityId: number) =>
  entityType === 'trade' ? syncTrade(entityId) : syncMissedTrade(entityId)

// ---------------------------------------------------------------------------
// full rebuild
// ---------------------------------------------------------------------------

export interface RebuildResult {
  ok: boolean
  count: number
  error?: string
}

export function rebuildAll(): Promise<RebuildResult> {
  const task = queue.then((): RebuildResult => {
    try {
      const vault = ensureVault()
      registerWithObsidian()

      // wipe everything we previously managed
      const old = loadManifest(vault)
      for (const key of ['trades', 'missed', 'reviews', 'strategies', 'accounts', 'confluences'] as const) {
        for (const rel of Object.values(old[key])) deleteManaged(vault, rel)
      }

      const m = emptyManifest()
      const db = getDb()
      for (const { id } of db.prepare('SELECT id FROM strategies').all() as { id: number }[])
        syncStrategyInto(vault, m, id)
      for (const { id } of db.prepare('SELECT id FROM accounts').all() as { id: number }[])
        syncAccountInto(vault, m, id)
      for (const { id } of db.prepare('SELECT id FROM confluences').all() as { id: number }[])
        syncConfluenceInto(vault, m, id)
      for (const { id } of db.prepare('SELECT id FROM trades').all() as { id: number }[])
        syncTradeInto(vault, m, id)
      for (const { id } of db.prepare('SELECT id FROM missed_trades').all() as { id: number }[])
        syncMissedInto(vault, m, id)

      const dates = new Set<string>()
      for (const r of db.prepare('SELECT date FROM daily_reviews').all() as { date: string }[])
        dates.add(r.date)
      for (const r of db.prepare('SELECT DISTINCT date FROM trades').all() as { date: string }[])
        dates.add(r.date)
      for (const r of db.prepare('SELECT DISTINCT date FROM missed_trades').all() as { date: string }[])
        dates.add(r.date)
      for (const date of dates) syncReviewInto(vault, m, date)

      saveManifest(vault, m)
      setSetting(LAST_SYNC_KEY, new Date().toISOString())

      const count = (['trades', 'missed', 'reviews', 'strategies', 'accounts', 'confluences'] as const)
        .reduce((n, k) => n + Object.keys(m[k]).length, 0)
      return { ok: true, count }
    } catch (err) {
      console.error('[obsidian] rebuildAll failed:', err)
      return { ok: false, count: 0, error: err instanceof Error ? err.message : String(err) }
    }
  })
  queue = task.catch(() => undefined)
  return task
}

// ---------------------------------------------------------------------------
// enable / disable / path management
// ---------------------------------------------------------------------------

export async function setEnabled(enabled: boolean): Promise<ObsidianConfig> {
  setSetting(ENABLED_KEY, enabled ? '1' : '0')
  if (enabled) {
    ensureVault()
    registerWithObsidian()
    await rebuildAll()
  }
  return getConfig()
}

export async function setVaultPath(newPath: string | null): Promise<ObsidianConfig> {
  if (newPath && newPath.trim()) setSetting(PATH_KEY, newPath.trim())
  else deleteSetting(PATH_KEY)
  if (isEnabled()) {
    ensureVault()
    registerWithObsidian()
    await rebuildAll()
  }
  return getConfig()
}
