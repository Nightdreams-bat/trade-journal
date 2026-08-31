import fs from 'node:fs'
import path from 'node:path'
import type { DatabaseSync } from 'node:sqlite'

// Mirrors trades and missed trades out to a folder in the user's Obsidian
// vault as one markdown note per entry (with embedded screenshots):
//   <vault>/TradeJournal/<Account>/<Strategy>/<date> - <pair>.md      (trades)
//   <vault>/TradeJournal/Missed Trades/<Strategy>/<date> - <pair>.md (missed trades)
//
// The journal's SQLite db is the source of truth; this is a one-way export
// that runs after every trade/missed-trade/image mutation (see ipc.ts).
// `trade_vault_sync` / `missed_trade_vault_sync` remember where each entry's
// note/images currently live on disk so a rename (date/pair/strategy/account
// change) cleans up the old location instead of leaving orphaned files behind.

const VAULT_KEY = 'obsidian_vault_path'
const ROOT_FOLDER = 'TradeJournal'

interface TradeRow {
  id: number
  name: string | null
  date: string
  pair: string | null
  session: string | null
  direction: string | null
  risk_per_trade: number | null
  pnl: number
  r_multiple: number | null
  followed_plan: number
  break_even: number
  entry_win: number
  strategy_id: number | null
  account_id: number | null
  positive_tags: string
  negative_tags: string
  notes: string | null
}

interface MissedTradeRow {
  id: number
  date: string
  pair: string | null
  direction: string | null
  would_be_pnl: number | null
  reason_missed: string | null
  strategy_id: number | null
  tags: string
  notes: string | null
}

interface VaultRecord {
  note_path: string
  images_dir: string
}

interface NoteTarget {
  dir: string
  notePath: string
  imagesDir: string
  imagesDirName: string
}

export function getVaultPath(db: DatabaseSync): string | null {
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(VAULT_KEY) as { value: string } | undefined
  return row?.value ?? null
}

export function setVaultPath(db: DatabaseSync, vaultPath: string | null) {
  if (vaultPath) {
    db.prepare(
      'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value'
    ).run(VAULT_KEY, vaultPath)
  } else {
    db.prepare('DELETE FROM settings WHERE key = ?').run(VAULT_KEY)
  }
}

function sanitize(name: string): string {
  const cleaned = name.replace(/[\\/:*?"<>|]/g, '-').replace(/\s+/g, ' ').trim()
  return cleaned || 'Untitled'
}

function yamlString(v: string): string {
  return JSON.stringify(v)
}

function yamlList(values: string[]): string {
  if (!values.length) return '[]'
  return `[${values.map((v) => yamlString(v)).join(', ')}]`
}

function buildNoteTarget(vaultRoot: string, segments: string[], noteBase: string): NoteTarget {
  const dir = path.join(vaultRoot, ROOT_FOLDER, ...segments.map(sanitize))
  const notePath = path.join(dir, `${noteBase}.md`)
  const imagesDirName = `${noteBase}_images`
  const imagesDir = path.join(dir, imagesDirName)
  return { dir, notePath, imagesDir, imagesDirName }
}

function removeVaultArtifacts(prev?: VaultRecord) {
  if (!prev) return
  try {
    if (fs.existsSync(prev.note_path)) fs.rmSync(prev.note_path, { force: true })
  } catch {
    /* ignore */
  }
  try {
    if (fs.existsSync(prev.images_dir)) fs.rmSync(prev.images_dir, { recursive: true, force: true })
  } catch {
    /* ignore */
  }
}

/** Creates target.dir, wipes+rewrites target.imagesDir from imageSrcPaths, returns the copied file names. */
function prepareImages(target: NoteTarget, imageSrcPaths: string[]): string[] {
  fs.mkdirSync(target.dir, { recursive: true })
  if (fs.existsSync(target.imagesDir)) fs.rmSync(target.imagesDir, { recursive: true, force: true })
  const imageFileNames: string[] = []
  if (imageSrcPaths.length) {
    fs.mkdirSync(target.imagesDir, { recursive: true })
    imageSrcPaths.forEach((src, i) => {
      if (!fs.existsSync(src)) return
      const ext = path.extname(src) || '.png'
      const fileName = `img-${i + 1}${ext}`
      fs.copyFileSync(src, path.join(target.imagesDir, fileName))
      imageFileNames.push(fileName)
    })
  }
  return imageFileNames
}

function tradeFrontmatter(trade: TradeRow, accountName: string, strategyName: string, confluenceNames: string[]): string {
  const positiveTags = JSON.parse(trade.positive_tags || '[]') as string[]
  const negativeTags = JSON.parse(trade.negative_tags || '[]') as string[]
  const lines = [
    '---',
    `trade_id: ${trade.id}`,
    `date: ${trade.date}`,
    `pair: ${yamlString(trade.pair ?? '')}`,
    `session: ${yamlString(trade.session ?? '')}`,
    `direction: ${yamlString(trade.direction ?? '')}`,
    `risk_per_trade: ${trade.risk_per_trade ?? 'null'}`,
    `pnl: ${trade.pnl}`,
    `r_multiple: ${trade.r_multiple ?? 'null'}`,
    `followed_plan: ${!!trade.followed_plan}`,
    `break_even: ${!!trade.break_even}`,
    `entry_win: ${!!trade.entry_win}`,
    `account: ${yamlString(accountName)}`,
    `strategy: ${yamlString(strategyName)}`,
    `confluences: ${yamlList(confluenceNames)}`,
    `positive_tags: ${yamlList(positiveTags)}`,
    `negative_tags: ${yamlList(negativeTags)}`,
    'tags: [tradejournal]',
    '---',
    '',
  ]
  return lines.join('\n')
}

function tradeBody(trade: TradeRow, imageFileNames: string[], imagesDirName: string): string {
  const title = `${trade.pair || trade.name || 'Trade'} — ${trade.date}`
  const meta = `**P&L:** ${trade.pnl}  **R:** ${trade.r_multiple ?? '—'}  **Session:** ${trade.session ?? '—'}  **Direction:** ${trade.direction ?? '—'}`
  const notes = trade.notes?.trim() ? trade.notes.trim() : '_No notes._'
  const images = imageFileNames.length
    ? imageFileNames.map((f) => `![[${imagesDirName}/${f}]]`).join('\n')
    : '_No screenshots._'
  return `# ${title}\n\n${meta}\n\n## Notes\n\n${notes}\n\n## Screenshots\n\n${images}\n`
}

function missedTradeFrontmatter(mt: MissedTradeRow, strategyName: string, confluenceNames: string[]): string {
  const tags = JSON.parse(mt.tags || '[]') as string[]
  const lines = [
    '---',
    `missed_trade_id: ${mt.id}`,
    `date: ${mt.date}`,
    `pair: ${yamlString(mt.pair ?? '')}`,
    `direction: ${yamlString(mt.direction ?? '')}`,
    `would_be_pnl: ${mt.would_be_pnl ?? 'null'}`,
    `reason_missed: ${yamlString(mt.reason_missed ?? '')}`,
    `strategy: ${yamlString(strategyName)}`,
    `confluences: ${yamlList(confluenceNames)}`,
    `tags: ${yamlList([...tags, 'tradejournal', 'missed-trade'])}`,
    '---',
    '',
  ]
  return lines.join('\n')
}

function missedTradeBody(mt: MissedTradeRow, imageFileNames: string[], imagesDirName: string): string {
  const title = `Missed — ${mt.pair || 'Trade'} — ${mt.date}`
  const meta = `**Would-be P&L:** ${mt.would_be_pnl ?? '—'}  **Direction:** ${mt.direction ?? '—'}  **Reason missed:** ${mt.reason_missed ?? '—'}`
  const notes = mt.notes?.trim() ? mt.notes.trim() : '_No notes._'
  const images = imageFileNames.length
    ? imageFileNames.map((f) => `![[${imagesDirName}/${f}]]`).join('\n')
    : '_No screenshots._'
  return `# ${title}\n\n${meta}\n\n## Notes\n\n${notes}\n\n## Screenshots\n\n${images}\n`
}

function getPrevTradeSync(db: DatabaseSync, tradeId: number): VaultRecord | undefined {
  return db.prepare('SELECT note_path, images_dir FROM trade_vault_sync WHERE trade_id = ?').get(tradeId) as
    | VaultRecord
    | undefined
}

function getPrevMissedSync(db: DatabaseSync, missedTradeId: number): VaultRecord | undefined {
  return db
    .prepare('SELECT note_path, images_dir FROM missed_trade_vault_sync WHERE missed_trade_id = ?')
    .get(missedTradeId) as VaultRecord | undefined
}

export function syncTradeToVault(db: DatabaseSync, tradeId: number) {
  const vaultRoot = getVaultPath(db)
  if (!vaultRoot) return

  const trade = db.prepare('SELECT * FROM trades WHERE id = ?').get(tradeId) as TradeRow | undefined
  const prev = getPrevTradeSync(db, tradeId)

  if (!trade) {
    removeVaultArtifacts(prev)
    db.prepare('DELETE FROM trade_vault_sync WHERE trade_id = ?').run(tradeId)
    return
  }

  const account = trade.account_id
    ? (db.prepare('SELECT name FROM accounts WHERE id = ?').get(trade.account_id) as { name: string } | undefined)
    : undefined
  const strategy = trade.strategy_id
    ? (db.prepare('SELECT name FROM strategies WHERE id = ?').get(trade.strategy_id) as { name: string } | undefined)
    : undefined
  const confluenceNames = (
    db
      .prepare(
        `SELECT c.name as name FROM entity_confluences ec JOIN confluences c ON c.id = ec.confluence_id
         WHERE ec.entity_type = 'trade' AND ec.entity_id = ?`
      )
      .all(tradeId) as { name: string }[]
  ).map((r) => r.name)
  const images = db
    .prepare('SELECT path FROM entity_images WHERE entity_type = ? AND entity_id = ? ORDER BY id ASC')
    .all('trade', tradeId) as { path: string }[]

  const accountName = account?.name ?? 'No Account'
  const strategyName = strategy?.name ?? 'No Strategy'
  const noteBase = sanitize(`${trade.date} - ${trade.pair || trade.name || `trade-${trade.id}`}`)
  const target = buildNoteTarget(vaultRoot, [accountName, strategyName], noteBase)

  if (prev && (prev.note_path !== target.notePath || prev.images_dir !== target.imagesDir)) {
    removeVaultArtifacts(prev)
  }

  const imageFileNames = prepareImages(target, images.map((i) => i.path))
  const content = tradeFrontmatter(trade, accountName, strategyName, confluenceNames) + tradeBody(trade, imageFileNames, target.imagesDirName)
  fs.writeFileSync(target.notePath, content, 'utf-8')

  db.prepare(
    `INSERT INTO trade_vault_sync (trade_id, note_path, images_dir) VALUES (?, ?, ?)
     ON CONFLICT(trade_id) DO UPDATE SET note_path = excluded.note_path, images_dir = excluded.images_dir`
  ).run(tradeId, target.notePath, target.imagesDir)
}

export function deleteTradeFromVault(db: DatabaseSync, tradeId: number) {
  const prev = getPrevTradeSync(db, tradeId)
  removeVaultArtifacts(prev)
  db.prepare('DELETE FROM trade_vault_sync WHERE trade_id = ?').run(tradeId)
}

export function syncMissedTradeToVault(db: DatabaseSync, missedTradeId: number) {
  const vaultRoot = getVaultPath(db)
  if (!vaultRoot) return

  const mt = db.prepare('SELECT * FROM missed_trades WHERE id = ?').get(missedTradeId) as MissedTradeRow | undefined
  const prev = getPrevMissedSync(db, missedTradeId)

  if (!mt) {
    removeVaultArtifacts(prev)
    db.prepare('DELETE FROM missed_trade_vault_sync WHERE missed_trade_id = ?').run(missedTradeId)
    return
  }

  const strategy = mt.strategy_id
    ? (db.prepare('SELECT name FROM strategies WHERE id = ?').get(mt.strategy_id) as { name: string } | undefined)
    : undefined
  const confluenceNames = (
    db
      .prepare(
        `SELECT c.name as name FROM entity_confluences ec JOIN confluences c ON c.id = ec.confluence_id
         WHERE ec.entity_type = 'missed_trade' AND ec.entity_id = ?`
      )
      .all(missedTradeId) as { name: string }[]
  ).map((r) => r.name)
  const images = db
    .prepare('SELECT path FROM entity_images WHERE entity_type = ? AND entity_id = ? ORDER BY id ASC')
    .all('missed_trade', missedTradeId) as { path: string }[]

  const strategyName = strategy?.name ?? 'No Strategy'
  const noteBase = sanitize(`${mt.date} - ${mt.pair || `missed-${mt.id}`}`)
  const target = buildNoteTarget(vaultRoot, ['Missed Trades', strategyName], noteBase)

  if (prev && (prev.note_path !== target.notePath || prev.images_dir !== target.imagesDir)) {
    removeVaultArtifacts(prev)
  }

  const imageFileNames = prepareImages(target, images.map((i) => i.path))
  const content = missedTradeFrontmatter(mt, strategyName, confluenceNames) + missedTradeBody(mt, imageFileNames, target.imagesDirName)
  fs.writeFileSync(target.notePath, content, 'utf-8')

  db.prepare(
    `INSERT INTO missed_trade_vault_sync (missed_trade_id, note_path, images_dir) VALUES (?, ?, ?)
     ON CONFLICT(missed_trade_id) DO UPDATE SET note_path = excluded.note_path, images_dir = excluded.images_dir`
  ).run(missedTradeId, target.notePath, target.imagesDir)
}

export function deleteMissedTradeFromVault(db: DatabaseSync, missedTradeId: number) {
  const prev = getPrevMissedSync(db, missedTradeId)
  removeVaultArtifacts(prev)
  db.prepare('DELETE FROM missed_trade_vault_sync WHERE missed_trade_id = ?').run(missedTradeId)
}

export function resyncAll(db: DatabaseSync) {
  const tradeIds = (db.prepare('SELECT id FROM trades').all() as { id: number }[]).map((r) => r.id)
  for (const id of tradeIds) syncTradeToVault(db, id)
  const missedIds = (db.prepare('SELECT id FROM missed_trades').all() as { id: number }[]).map((r) => r.id)
  for (const id of missedIds) syncMissedTradeToVault(db, id)
}
