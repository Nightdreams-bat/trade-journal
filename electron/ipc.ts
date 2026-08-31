import { ipcMain, dialog, BrowserWindow } from 'electron'
import fs from 'node:fs'
import path from 'node:path'
import { app } from 'electron'
import { getDb } from './db'
import * as obsidian from './obsidian'
import {
  getSummary,
  getStrategyPerformance,
  getStrategyDetail,
  getMonthlyBreakdown,
  simulateFundedChallenge,
  type SummaryFilters,
  type MonthlyBreakdownFilters,
  type FundedChallengeParams,
} from './analytics'
import { readCsvFile, importTrades, tradesToCsv, type ColumnMapping } from './csv'

type EntityType = 'trade' | 'missed_trade'

interface TradeFilters {
  accountId?: number | null
  strategyId?: number | null
  search?: string
}

interface MissedTradeFilters {
  strategyId?: number | null
  search?: string
}

function tagsToJson(tags: unknown): string {
  if (Array.isArray(tags)) return JSON.stringify(tags)
  return '[]'
}

function rowToTrade(row: Record<string, unknown>) {
  return {
    ...row,
    followed_plan: !!row.followed_plan,
    break_even: !!row.break_even,
    entry_win: !!row.entry_win,
    positive_tags: JSON.parse((row.positive_tags as string) || '[]'),
    negative_tags: JSON.parse((row.negative_tags as string) || '[]'),
  }
}

function rowToMissedTrade(row: Record<string, unknown>) {
  return {
    ...row,
    tags: JSON.parse((row.tags as string) || '[]'),
  }
}

function deleteEntityImages(db: ReturnType<typeof getDb>, entityType: EntityType, entityId: number) {
  const rows = db
    .prepare('SELECT id, path FROM entity_images WHERE entity_type = ? AND entity_id = ?')
    .all(entityType, entityId) as { id: number; path: string }[]
  for (const r of rows) {
    if (fs.existsSync(r.path)) {
      try {
        fs.unlinkSync(r.path)
      } catch {
        /* ignore */
      }
    }
  }
  db.prepare('DELETE FROM entity_images WHERE entity_type = ? AND entity_id = ?').run(entityType, entityId)
}

function getConfluenceIds(db: ReturnType<typeof getDb>, entityType: EntityType, entityId: number): number[] {
  const rows = db
    .prepare('SELECT confluence_id FROM entity_confluences WHERE entity_type = ? AND entity_id = ?')
    .all(entityType, entityId) as { confluence_id: number }[]
  return rows.map((r) => r.confluence_id)
}

function getConfluenceIdsBulk(db: ReturnType<typeof getDb>, entityType: EntityType, entityIds: number[]): Map<number, number[]> {
  const map = new Map<number, number[]>()
  if (!entityIds.length) return map
  const placeholders = entityIds.map(() => '?').join(',')
  const rows = db
    .prepare(`SELECT entity_id, confluence_id FROM entity_confluences WHERE entity_type = ? AND entity_id IN (${placeholders})`)
    .all(entityType, ...entityIds) as { entity_id: number; confluence_id: number }[]
  for (const r of rows) {
    const list = map.get(r.entity_id) ?? []
    list.push(r.confluence_id)
    map.set(r.entity_id, list)
  }
  return map
}

function setEntityConfluences(db: ReturnType<typeof getDb>, entityType: EntityType, entityId: number, confluenceIds: unknown) {
  db.prepare('DELETE FROM entity_confluences WHERE entity_type = ? AND entity_id = ?').run(entityType, entityId)
  if (!Array.isArray(confluenceIds)) return
  for (const cid of confluenceIds) {
    if (typeof cid !== 'number') continue
    db.prepare('INSERT OR IGNORE INTO entity_confluences (entity_type, entity_id, confluence_id) VALUES (?, ?, ?)').run(
      entityType,
      entityId,
      cid
    )
  }
}

function deleteEntityConfluences(db: ReturnType<typeof getDb>, entityType: EntityType, entityId: number) {
  db.prepare('DELETE FROM entity_confluences WHERE entity_type = ? AND entity_id = ?').run(entityType, entityId)
}

export function registerIpcHandlers() {
  const db = getDb()

  // ---------- accounts ----------
  ipcMain.handle('accounts:getAll', () => {
    return db.prepare('SELECT * FROM accounts ORDER BY name ASC').all()
  })
  ipcMain.handle('accounts:create', (_e, payload: { name: string; broker?: string; starting_balance: number; currency: string }) => {
    const info = db
      .prepare('INSERT INTO accounts (name, broker, starting_balance, currency) VALUES (?, ?, ?, ?)')
      .run(payload.name, payload.broker ?? '', payload.starting_balance, payload.currency)
    void obsidian.syncAccount(info.lastInsertRowid as number)
    return db.prepare('SELECT * FROM accounts WHERE id = ?').get(info.lastInsertRowid)
  })
  ipcMain.handle('accounts:update', (_e, id: number, payload: Record<string, unknown>) => {
    db.prepare('UPDATE accounts SET name = ?, broker = ?, starting_balance = ?, currency = ? WHERE id = ?').run(
      payload.name, payload.broker ?? '', payload.starting_balance, payload.currency, id
    )
    void obsidian.syncAccount(id)
    return db.prepare('SELECT * FROM accounts WHERE id = ?').get(id)
  })
  ipcMain.handle('accounts:delete', (_e, id: number) => {
    db.prepare('DELETE FROM accounts WHERE id = ?').run(id)
    void obsidian.removeAccount(id)
    return true
  })

  // ---------- strategies ----------
  ipcMain.handle('strategies:getAll', () => {
    return db.prepare('SELECT * FROM strategies ORDER BY name ASC').all()
  })
  ipcMain.handle('strategies:create', (_e, payload: { name: string; description?: string }) => {
    const info = db.prepare('INSERT INTO strategies (name, description) VALUES (?, ?)').run(payload.name, payload.description ?? '')
    void obsidian.syncStrategy(info.lastInsertRowid as number)
    return db.prepare('SELECT * FROM strategies WHERE id = ?').get(info.lastInsertRowid)
  })
  ipcMain.handle('strategies:update', (_e, id: number, payload: { name: string; description?: string }) => {
    db.prepare('UPDATE strategies SET name = ?, description = ? WHERE id = ?').run(payload.name, payload.description ?? '', id)
    void obsidian.syncStrategy(id)
    return db.prepare('SELECT * FROM strategies WHERE id = ?').get(id)
  })
  ipcMain.handle('strategies:delete', (_e, id: number) => {
    db.prepare('DELETE FROM strategies WHERE id = ?').run(id)
    void obsidian.removeStrategy(id)
    return true
  })
  ipcMain.handle('strategies:getPerformance', () => {
    return getStrategyPerformance()
  })
  ipcMain.handle('strategies:getDetail', (_e, id: number) => {
    return getStrategyDetail(id)
  })

  // ---------- confluences ----------
  ipcMain.handle('confluences:getAll', () => {
    return db.prepare('SELECT * FROM confluences ORDER BY name ASC').all()
  })
  ipcMain.handle('confluences:create', (_e, payload: { name: string }) => {
    const name = (payload.name ?? '').trim()
    if (!name) return null
    const existing = db.prepare('SELECT * FROM confluences WHERE name = ?').get(name)
    if (existing) return existing
    const info = db.prepare('INSERT INTO confluences (name) VALUES (?)').run(name)
    void obsidian.syncConfluence(info.lastInsertRowid as number)
    return db.prepare('SELECT * FROM confluences WHERE id = ?').get(info.lastInsertRowid)
  })
  ipcMain.handle('confluences:update', (_e, id: number, payload: { name: string }) => {
    const name = (payload.name ?? '').trim()
    if (!name) return db.prepare('SELECT * FROM confluences WHERE id = ?').get(id)
    db.prepare('UPDATE confluences SET name = ? WHERE id = ?').run(name, id)
    void obsidian.syncConfluence(id)
    return db.prepare('SELECT * FROM confluences WHERE id = ?').get(id)
  })
  ipcMain.handle('confluences:delete', (_e, id: number) => {
    db.prepare('DELETE FROM confluences WHERE id = ?').run(id)
    void obsidian.removeConfluence(id)
    return true
  })

  // ---------- trades ----------
  ipcMain.handle('trades:getAll', (_e, filters: TradeFilters = {}) => {
    const clauses: string[] = []
    const params: (string | number)[] = []
    if (filters.accountId) {
      clauses.push('account_id = ?')
      params.push(filters.accountId)
    }
    if (filters.strategyId) {
      clauses.push('strategy_id = ?')
      params.push(filters.strategyId)
    }
    if (filters.search) {
      clauses.push('(name LIKE ? OR pair LIKE ? OR notes LIKE ?)')
      const like = `%${filters.search}%`
      params.push(like, like, like)
    }
    const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : ''
    const rows = db.prepare(`SELECT * FROM trades ${where} ORDER BY date DESC, id DESC`).all(...params) as Record<
      string,
      unknown
    >[]
    const confluenceMap = getConfluenceIdsBulk(db, 'trade', rows.map((r) => r.id as number))
    return rows.map((r) => ({ ...rowToTrade(r), confluence_ids: confluenceMap.get(r.id as number) ?? [] }))
  })

  ipcMain.handle('trades:create', (_e, payload: Record<string, unknown>) => {
    const info = db
      .prepare(
        `INSERT INTO trades (name, date, pair, session, direction, risk_per_trade, pnl, r_multiple,
          followed_plan, break_even, entry_win, strategy_id, account_id, positive_tags, negative_tags, notes)
         VALUES (@name, @date, @pair, @session, @direction, @risk_per_trade, @pnl, @r_multiple,
          @followed_plan, @break_even, @entry_win, @strategy_id, @account_id, @positive_tags, @negative_tags, @notes)`
      )
      .run({
        name: (payload.name as string) ?? '',
        date: payload.date as string,
        pair: (payload.pair as string) ?? null,
        session: (payload.session as string) ?? null,
        direction: (payload.direction as string) ?? null,
        risk_per_trade: (payload.risk_per_trade as number) ?? null,
        pnl: (payload.pnl as number) ?? 0,
        r_multiple: (payload.r_multiple as number) ?? null,
        followed_plan: payload.followed_plan ? 1 : 0,
        break_even: payload.break_even ? 1 : 0,
        entry_win: payload.entry_win ? 1 : 0,
        strategy_id: (payload.strategy_id as number) ?? null,
        account_id: (payload.account_id as number) ?? null,
        positive_tags: tagsToJson(payload.positive_tags),
        negative_tags: tagsToJson(payload.negative_tags),
        notes: (payload.notes as string) ?? null,
      })
    const id = info.lastInsertRowid as number
    setEntityConfluences(db, 'trade', id, payload.confluence_ids)
    void obsidian.syncTrade(id)
    const row = db.prepare('SELECT * FROM trades WHERE id = ?').get(id) as Record<string, unknown>
    return { ...rowToTrade(row), confluence_ids: getConfluenceIds(db, 'trade', id) }
  })

  ipcMain.handle('trades:update', (_e, id: number, payload: Record<string, unknown>) => {
    db.prepare(
      `UPDATE trades SET name=@name, date=@date, pair=@pair, session=@session, direction=@direction,
        risk_per_trade=@risk_per_trade, pnl=@pnl, r_multiple=@r_multiple,
        followed_plan=@followed_plan, break_even=@break_even, entry_win=@entry_win, strategy_id=@strategy_id,
        account_id=@account_id, positive_tags=@positive_tags, negative_tags=@negative_tags, notes=@notes
       WHERE id=@id`
    ).run({
      id,
      name: (payload.name as string) ?? '',
      date: payload.date as string,
      pair: (payload.pair as string) ?? null,
      session: (payload.session as string) ?? null,
      direction: (payload.direction as string) ?? null,
      risk_per_trade: (payload.risk_per_trade as number) ?? null,
      pnl: (payload.pnl as number) ?? 0,
      r_multiple: (payload.r_multiple as number) ?? null,
      followed_plan: payload.followed_plan ? 1 : 0,
      break_even: payload.break_even ? 1 : 0,
      entry_win: payload.entry_win ? 1 : 0,
      strategy_id: (payload.strategy_id as number) ?? null,
      account_id: (payload.account_id as number) ?? null,
      positive_tags: tagsToJson(payload.positive_tags),
      negative_tags: tagsToJson(payload.negative_tags),
      notes: (payload.notes as string) ?? null,
    })
    setEntityConfluences(db, 'trade', id, payload.confluence_ids)
    void obsidian.syncTrade(id)
    const row = db.prepare('SELECT * FROM trades WHERE id = ?').get(id) as Record<string, unknown>
    return { ...rowToTrade(row), confluence_ids: getConfluenceIds(db, 'trade', id) }
  })

  ipcMain.handle('trades:delete', (_e, id: number) => {
    const existing = db.prepare('SELECT date FROM trades WHERE id = ?').get(id) as { date: string } | undefined
    deleteEntityImages(db, 'trade', id)
    deleteEntityConfluences(db, 'trade', id)
    db.prepare('DELETE FROM trades WHERE id = ?').run(id)
    void obsidian.removeTrade(id, existing?.date)
    return true
  })

  // ---------- missed trades ----------
  ipcMain.handle('missedTrades:getAll', (_e, filters: MissedTradeFilters = {}) => {
    const clauses: string[] = []
    const params: (string | number)[] = []
    if (filters.strategyId) {
      clauses.push('strategy_id = ?')
      params.push(filters.strategyId)
    }
    if (filters.search) {
      clauses.push('(pair LIKE ? OR reason_missed LIKE ? OR notes LIKE ?)')
      const like = `%${filters.search}%`
      params.push(like, like, like)
    }
    const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : ''
    const rows = db.prepare(`SELECT * FROM missed_trades ${where} ORDER BY date DESC, id DESC`).all(...params) as Record<
      string,
      unknown
    >[]
    const confluenceMap = getConfluenceIdsBulk(db, 'missed_trade', rows.map((r) => r.id as number))
    return rows.map((r) => ({ ...rowToMissedTrade(r), confluence_ids: confluenceMap.get(r.id as number) ?? [] }))
  })
  ipcMain.handle('missedTrades:create', (_e, payload: Record<string, unknown>) => {
    const info = db
      .prepare(
        `INSERT INTO missed_trades (date, pair, direction, would_be_pnl, reason_missed, strategy_id, tags, notes)
         VALUES (@date, @pair, @direction, @would_be_pnl, @reason_missed, @strategy_id, @tags, @notes)`
      )
      .run({
        date: payload.date as string,
        pair: (payload.pair as string) ?? null,
        direction: (payload.direction as string) ?? null,
        would_be_pnl: (payload.would_be_pnl as number) ?? null,
        reason_missed: (payload.reason_missed as string) ?? null,
        strategy_id: (payload.strategy_id as number) ?? null,
        tags: tagsToJson(payload.tags),
        notes: (payload.notes as string) ?? null,
      })
    const id = info.lastInsertRowid as number
    setEntityConfluences(db, 'missed_trade', id, payload.confluence_ids)
    void obsidian.syncMissedTrade(id)
    const row = db.prepare('SELECT * FROM missed_trades WHERE id = ?').get(id) as Record<string, unknown>
    return { ...rowToMissedTrade(row), confluence_ids: getConfluenceIds(db, 'missed_trade', id) }
  })
  ipcMain.handle('missedTrades:update', (_e, id: number, payload: Record<string, unknown>) => {
    db.prepare(
      `UPDATE missed_trades SET date=@date, pair=@pair, direction=@direction, would_be_pnl=@would_be_pnl,
        reason_missed=@reason_missed, strategy_id=@strategy_id, tags=@tags, notes=@notes WHERE id=@id`
    ).run({
      id,
      date: payload.date as string,
      pair: (payload.pair as string) ?? null,
      direction: (payload.direction as string) ?? null,
      would_be_pnl: (payload.would_be_pnl as number) ?? null,
      reason_missed: (payload.reason_missed as string) ?? null,
      strategy_id: (payload.strategy_id as number) ?? null,
      tags: tagsToJson(payload.tags),
      notes: (payload.notes as string) ?? null,
    })
    setEntityConfluences(db, 'missed_trade', id, payload.confluence_ids)
    void obsidian.syncMissedTrade(id)
    const row = db.prepare('SELECT * FROM missed_trades WHERE id = ?').get(id) as Record<string, unknown>
    return { ...rowToMissedTrade(row), confluence_ids: getConfluenceIds(db, 'missed_trade', id) }
  })
  ipcMain.handle('missedTrades:delete', (_e, id: number) => {
    const existing = db.prepare('SELECT date FROM missed_trades WHERE id = ?').get(id) as { date: string } | undefined
    deleteEntityImages(db, 'missed_trade', id)
    deleteEntityConfluences(db, 'missed_trade', id)
    db.prepare('DELETE FROM missed_trades WHERE id = ?').run(id)
    void obsidian.removeMissedTrade(id, existing?.date)
    return true
  })

  // ---------- images (shared gallery for trades & missed trades) ----------
  ipcMain.handle('images:add', async (event, entityType: EntityType, entityId: number) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    const result = await dialog.showOpenDialog(win!, {
      title: 'Add images',
      properties: ['openFile', 'multiSelections'],
      filters: [{ name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'webp', 'gif'] }],
    })
    if (result.canceled || !result.filePaths.length) return []
    const destDir = path.join(app.getPath('userData'), 'screenshots')
    fs.mkdirSync(destDir, { recursive: true })
    for (const src of result.filePaths) {
      const destName = `${entityType}_${entityId}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}${path.extname(src)}`
      const dest = path.join(destDir, destName)
      fs.copyFileSync(src, dest)
      db.prepare('INSERT INTO entity_images (entity_type, entity_id, path) VALUES (?, ?, ?)').run(entityType, entityId, dest)
    }
    void obsidian.syncEntityImages(entityType, entityId)
    return true
  })

  ipcMain.handle('images:get', (_e, entityType: EntityType, entityId: number) => {
    const rows = db
      .prepare('SELECT id, path FROM entity_images WHERE entity_type = ? AND entity_id = ? ORDER BY id ASC')
      .all(entityType, entityId) as { id: number; path: string }[]
    return rows
      .filter((r) => fs.existsSync(r.path))
      .map((r) => {
        const buf = fs.readFileSync(r.path)
        const ext = path.extname(r.path).slice(1) || 'png'
        return { id: r.id, dataUrl: `data:image/${ext};base64,${buf.toString('base64')}` }
      })
  })

  ipcMain.handle('images:remove', (_e, imageId: number) => {
    const row = db.prepare('SELECT path, entity_type, entity_id FROM entity_images WHERE id = ?').get(imageId) as
      | { path: string; entity_type: EntityType; entity_id: number }
      | undefined
    if (row?.path && fs.existsSync(row.path)) {
      try {
        fs.unlinkSync(row.path)
      } catch {
        /* ignore */
      }
    }
    db.prepare('DELETE FROM entity_images WHERE id = ?').run(imageId)
    if (row) void obsidian.syncEntityImages(row.entity_type, row.entity_id)
    return true
  })

  // ---------- daily reviews ----------
  ipcMain.handle('reviews:getAll', () => {
    return db.prepare('SELECT * FROM daily_reviews ORDER BY date DESC').all()
  })
  ipcMain.handle('reviews:upsert', (_e, payload: { date: string; notes: string; emotion: string; lessons_learned: string }) => {
    db.prepare(
      `INSERT INTO daily_reviews (date, notes, emotion, lessons_learned) VALUES (@date, @notes, @emotion, @lessons_learned)
       ON CONFLICT(date) DO UPDATE SET notes=@notes, emotion=@emotion, lessons_learned=@lessons_learned`
    ).run(payload)
    void obsidian.syncDailyReview(payload.date)
    return db.prepare('SELECT * FROM daily_reviews WHERE date = ?').get(payload.date)
  })

  // ---------- analytics ----------
  ipcMain.handle('analytics:getSummary', (_e, filters: SummaryFilters) => {
    return getSummary(filters)
  })
  ipcMain.handle('analytics:getMonthlyBreakdown', (_e, filters: MonthlyBreakdownFilters) => {
    return getMonthlyBreakdown(filters)
  })
  ipcMain.handle('analytics:simulateFundedChallenge', (_e, params: FundedChallengeParams) => {
    return simulateFundedChallenge(params)
  })

  // ---------- csv ----------
  ipcMain.handle('csv:openForImport', async (event) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    const result = await dialog.showOpenDialog(win!, {
      title: 'Import trades from CSV',
      properties: ['openFile'],
      filters: [{ name: 'CSV', extensions: ['csv'] }],
    })
    if (result.canceled || !result.filePaths.length) return null
    const filePath = result.filePaths[0]
    const { headers, rows } = readCsvFile(filePath)
    return { filePath, headers, sampleRows: rows.slice(0, 5), totalRows: rows.length }
  })

  ipcMain.handle(
    'csv:import',
    (_e, args: { filePath: string; mapping: ColumnMapping; accountId: number | null }) => {
      const { rows } = readCsvFile(args.filePath)
      const count = importTrades(rows, args.mapping, args.accountId)
      void obsidian.rebuildAll()
      return count
    }
  )

  ipcMain.handle('csv:export', async (event) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    const result = await dialog.showSaveDialog(win!, {
      title: 'Export trades to CSV',
      defaultPath: 'trades-export.csv',
      filters: [{ name: 'CSV', extensions: ['csv'] }],
    })
    if (result.canceled || !result.filePath) return null
    fs.writeFileSync(result.filePath, tradesToCsv(), 'utf-8')
    return result.filePath
  })

  // ---------- obsidian vault sync ----------
  ipcMain.handle('obsidian:getConfig', () => obsidian.getConfig())

  ipcMain.handle('obsidian:setEnabled', (_e, enabled: boolean) => obsidian.setEnabled(!!enabled))

  ipcMain.handle('obsidian:chooseVault', async (event) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    const result = await dialog.showOpenDialog(win!, {
      title: 'Choose or create the Obsidian vault folder',
      properties: ['openDirectory', 'createDirectory'],
      defaultPath: obsidian.resolveVaultPath(),
    })
    if (result.canceled || !result.filePaths.length) return obsidian.getConfig()
    return obsidian.setVaultPath(result.filePaths[0])
  })

  ipcMain.handle('obsidian:useDefaultVault', () => obsidian.setVaultPath(null))

  ipcMain.handle('obsidian:rebuild', () => obsidian.rebuildAll())

  ipcMain.handle('obsidian:openInObsidian', () => obsidian.openInObsidian())

  ipcMain.handle('obsidian:showFolder', () => obsidian.showVaultFolder())
}
