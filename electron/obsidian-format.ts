/**
 * Pure serializers + path builders for the Obsidian vault mirror.
 *
 * NOTHING in this file may import `electron` or touch the filesystem — it is
 * plain data-in / string-out so it can be unit-tested with `node --test`.
 * All vault I/O lives in `obsidian.ts`.
 */

// ---------------------------------------------------------------------------
// row shapes (subset of the DB columns we mirror)
// ---------------------------------------------------------------------------

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
  positive_tags: string[]
  negative_tags: string[]
  notes: string | null
  created_at: string
}

export interface MissedTradeRow {
  id: number
  date: string
  pair: string | null
  direction: string | null
  would_be_pnl: number | null
  reason_missed: string | null
  tags: string[]
  notes: string | null
  created_at: string
}

export interface DailyReviewRow {
  date: string
  notes: string | null
  emotion: string | null
  lessons_learned: string | null
}

export interface StrategyRow {
  id: number
  name: string
  description: string | null
}

export interface AccountRow {
  id: number
  name: string
  broker: string | null
  starting_balance: number
  currency: string
}

export interface ConfluenceRow {
  id: number
  name: string
}

/** Names resolved from the join tables, passed in by the sync engine. */
export interface TradeContext {
  strategyName: string | null
  accountName: string | null
  confluenceNames: string[]
  hasDailyReview: boolean
  screenshots: string[] // attachment basenames
}

export interface MissedTradeContext {
  strategyName: string | null
  confluenceNames: string[]
  screenshots: string[]
}

export interface DailyReviewContext {
  /** note basenames (no extension) of trades logged that day */
  tradeNotes: string[]
  missedNotes: string[]
}

// ---------------------------------------------------------------------------
// primitives
// ---------------------------------------------------------------------------

const ILLEGAL_FILENAME = /[\\/:*?"<>|#^[\]]/g

/** Make a string safe to use as a note filename (no extension). */
export function slugifyTitle(s: string): string {
  const cleaned = (s || '')
    .replace(/\r?\n/g, ' ')
    .replace(ILLEGAL_FILENAME, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  return (cleaned || 'untitled').slice(0, 120).trim()
}

/** Safe target for a `[[wikilink]]` — Obsidian also chokes on these chars. */
export function wikiName(s: string): string {
  return (s || '').replace(/[[\]#^|]/g, '').replace(/\s+/g, ' ').trim()
}

function needsYamlQuote(s: string): boolean {
  if (s === '') return true
  if (/^[\s'"]|[\s]$/.test(s)) return true
  if (/[:#\][{},&*!?|>%@`]/.test(s)) return true
  if (/^(-|\?|:)(\s|$)/.test(s)) return true
  if (/^(true|false|null|yes|no|~)$/i.test(s)) return true
  if (/^-?\d/.test(s) && /^-?\d+(\.\d+)?$/.test(s)) return true
  return false
}

function yamlScalar(v: unknown): string {
  if (v === null || v === undefined) return 'null'
  if (typeof v === 'boolean') return v ? 'true' : 'false'
  if (typeof v === 'number') return Number.isFinite(v) ? String(v) : 'null'
  const s = String(v)
  return needsYamlQuote(s) ? `"${s.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"` : s
}

/**
 * Build a YAML frontmatter block (including the `---` fences and trailing
 * newline). Keys whose value is `null`/`undefined`/`''` are dropped. Array
 * values render as block sequences; empty arrays are dropped.
 */
export function yamlFrontmatter(obj: Record<string, unknown>): string {
  const lines: string[] = ['---']
  for (const [key, raw] of Object.entries(obj)) {
    if (raw === null || raw === undefined || raw === '') continue
    if (Array.isArray(raw)) {
      const items = raw.filter((x) => x !== null && x !== undefined && x !== '')
      if (!items.length) continue
      lines.push(`${key}:`)
      for (const item of items) lines.push(`  - ${yamlScalar(item)}`)
    } else {
      lines.push(`${key}: ${yamlScalar(raw)}`)
    }
  }
  lines.push('---', '')
  return lines.join('\n')
}

const bool = (v: number | boolean): boolean => v === true || v === 1

function section(heading: string, body: string | null | undefined): string {
  const text = (body ?? '').trim()
  return text ? `\n## ${heading}\n\n${text}\n` : ''
}

function embeds(basenames: string[]): string {
  if (!basenames.length) return ''
  return `\n## Screenshots\n\n${basenames.map((b) => `![[${b}]]`).join('\n')}\n`
}

// ---------------------------------------------------------------------------
// paths  (relative to the vault root, always POSIX separators)
// ---------------------------------------------------------------------------

/** Everything the app manages lives inside this one folder in the vault. */
export const ROOT_DIR = 'Trading Journal'

const yearOf = (date: string): string => (/^\d{4}/.test(date) ? date.slice(0, 4) : 'undated')

export function tradeNoteBasename(t: TradeRow): string {
  const parts = [t.date, t.pair, t.direction].filter(Boolean).join(' ')
  return slugifyTitle(`${parts || t.name || 'trade'} (t${t.id})`)
}

export function tradeNotePath(t: TradeRow): string {
  return `${ROOT_DIR}/Trades/${yearOf(t.date)}/${tradeNoteBasename(t)}.md`
}

export function missedNoteBasename(t: MissedTradeRow): string {
  const parts = [t.date, t.pair, t.direction].filter(Boolean).join(' ')
  return slugifyTitle(`${parts || 'missed'} (m${t.id})`)
}

export function missedNotePath(t: MissedTradeRow): string {
  return `${ROOT_DIR}/Missed Trades/${yearOf(t.date)}/${missedNoteBasename(t)}.md`
}

export const dailyReviewBasename = (date: string): string => slugifyTitle(date)
export const dailyReviewPath = (date: string): string =>
  `${ROOT_DIR}/Daily Reviews/${dailyReviewBasename(date)}.md`

export const strategyNotePath = (s: StrategyRow): string => `${ROOT_DIR}/Strategies/${slugifyTitle(s.name)}.md`
export const accountNotePath = (a: AccountRow): string => `${ROOT_DIR}/Accounts/${slugifyTitle(a.name)}.md`
export const confluenceNotePath = (c: ConfluenceRow): string =>
  `${ROOT_DIR}/Confluences/${slugifyTitle(c.name)}.md`

// ---------------------------------------------------------------------------
// note bodies
// ---------------------------------------------------------------------------

export function tradeNote(t: TradeRow, ctx: TradeContext): string {
  const fm = yamlFrontmatter({
    type: 'trade',
    id: t.id,
    date: t.date,
    pair: t.pair,
    session: t.session,
    direction: t.direction,
    risk_per_trade: t.risk_per_trade,
    pnl: t.pnl,
    r_multiple: t.r_multiple,
    followed_plan: bool(t.followed_plan),
    break_even: bool(t.break_even),
    entry_win: bool(t.entry_win),
    strategy: ctx.strategyName,
    account: ctx.accountName,
    positive_tags: t.positive_tags,
    negative_tags: t.negative_tags,
    confluences: ctx.confluenceNames,
    pnl_result: t.pnl > 0 ? 'win' : t.pnl < 0 ? 'loss' : 'breakeven',
    created_at: t.created_at,
  })

  const title = [t.date, t.pair, t.direction].filter(Boolean).join(' ') || t.name || `Trade ${t.id}`
  const meta: string[] = []
  if (ctx.strategyName) meta.push(`**Strategy:** [[${wikiName(ctx.strategyName)}]]`)
  if (ctx.accountName) meta.push(`**Account:** [[${wikiName(ctx.accountName)}]]`)
  if (ctx.confluenceNames.length)
    meta.push(`**Confluences:** ${ctx.confluenceNames.map((c) => `[[${wikiName(c)}]]`).join(', ')}`)
  meta.push(`**Daily review:** [[${dailyReviewBasename(t.date)}]]`)
  const tagLine = [...t.positive_tags.map((x) => `+${x}`), ...t.negative_tags.map((x) => `−${x}`)]
    .join(' · ')

  return (
    fm +
    `\n# ${title}\n\n` +
    meta.join('  \n') +
    '\n' +
    (tagLine ? `\n> ${tagLine}\n` : '') +
    section('Notes', t.notes) +
    embeds(ctx.screenshots)
  )
}

export function missedTradeNote(t: MissedTradeRow, ctx: MissedTradeContext): string {
  const fm = yamlFrontmatter({
    type: 'missed_trade',
    id: t.id,
    date: t.date,
    pair: t.pair,
    direction: t.direction,
    would_be_pnl: t.would_be_pnl,
    reason_missed: t.reason_missed,
    strategy: ctx.strategyName,
    tags: t.tags,
    confluences: ctx.confluenceNames,
    created_at: t.created_at,
  })
  const title = [t.date, t.pair, t.direction].filter(Boolean).join(' ') || `Missed trade ${t.id}`
  const meta: string[] = []
  if (ctx.strategyName) meta.push(`**Strategy:** [[${wikiName(ctx.strategyName)}]]`)
  if (ctx.confluenceNames.length)
    meta.push(`**Confluences:** ${ctx.confluenceNames.map((c) => `[[${wikiName(c)}]]`).join(', ')}`)
  meta.push(`**Daily review:** [[${dailyReviewBasename(t.date)}]]`)

  return (
    fm +
    `\n# ${title}\n\n` +
    meta.join('  \n') +
    '\n' +
    section('Why it was missed', t.reason_missed) +
    section('Notes', t.notes) +
    embeds(ctx.screenshots)
  )
}

export function dailyReviewNote(r: DailyReviewRow, ctx: DailyReviewContext): string {
  const fm = yamlFrontmatter({
    type: 'daily_review',
    date: r.date,
    emotion: r.emotion,
  })
  const list = (items: string[]) =>
    items.length ? items.map((n) => `- [[${n}]]`).join('\n') + '\n' : '_none_\n'

  return (
    fm +
    `\n# ${r.date} — Daily Review\n\n` +
    (r.emotion ? `**State:** ${r.emotion}\n` : '') +
    section('Notes', r.notes) +
    section('Lessons learned', r.lessons_learned) +
    `\n## Trades this day\n\n${list(ctx.tradeNotes)}` +
    `\n## Missed this day\n\n${list(ctx.missedNotes)}`
  )
}

export function strategyNote(s: StrategyRow): string {
  return (
    yamlFrontmatter({ type: 'strategy', id: s.id, name: s.name }) +
    `\n# ${s.name}\n` +
    section('Description', s.description) +
    '\n## Trades\n\n```dataview\ntable pair, direction, pnl, r_multiple, followed_plan\n' +
    `from "Trades"\nwhere strategy = "${s.name.replace(/"/g, '')}"\nsort date desc\n\`\`\`\n`
  )
}

export function accountNote(a: AccountRow): string {
  return (
    yamlFrontmatter({
      type: 'account',
      id: a.id,
      name: a.name,
      broker: a.broker,
      starting_balance: a.starting_balance,
      currency: a.currency,
    }) +
    `\n# ${a.name}\n\n` +
    `Starting balance: ${a.starting_balance} ${a.currency}` +
    (a.broker ? ` · ${a.broker}` : '') +
    '\n\n## Trades\n\n```dataview\ntable pair, direction, pnl, r_multiple\n' +
    `from "Trades"\nwhere account = "${a.name.replace(/"/g, '')}"\nsort date desc\n\`\`\`\n`
  )
}

export function confluenceNote(c: ConfluenceRow): string {
  return (
    yamlFrontmatter({ type: 'confluence', id: c.id, name: c.name }) +
    `\n# ${c.name}\n\n` +
    'Trades and missed trades that link this confluence show up in the backlinks panel.\n'
  )
}

// ---------------------------------------------------------------------------
// vault scaffolding
// ---------------------------------------------------------------------------

export const VAULT_SUBDIRS = [
  `${ROOT_DIR}/Trades`,
  `${ROOT_DIR}/Missed Trades`,
  `${ROOT_DIR}/Daily Reviews`,
  `${ROOT_DIR}/Strategies`,
  `${ROOT_DIR}/Accounts`,
  `${ROOT_DIR}/Confluences`,
  `${ROOT_DIR}/Attachments`,
]

export const OBSIDIAN_APP_JSON = {
  attachmentFolderPath: `${ROOT_DIR}/Attachments`,
  newLinkFormat: 'shortest',
  useMarkdownLinks: false,
  alwaysUpdateLinks: true,
  promptDelete: false,
}

export const OBSIDIAN_CORE_PLUGINS = {
  'file-explorer': true,
  'global-search': true,
  graph: true,
  backlink: true,
  'tag-pane': true,
  'page-preview': true,
  'daily-notes': false,
  templates: false,
  'command-palette': true,
  'outline': true,
}

export function readmeContents(): string {
  return `# Trade Journal Vault

This vault is **generated and kept in sync by the Trade Journal desktop app**.
It is a one-way mirror of the app's database. Everything it manages lives inside
the \`${ROOT_DIR}/\` folder.

- \`${ROOT_DIR}/Trades/\` — one note per trade, foldered by year
- \`${ROOT_DIR}/Missed Trades/\` — trades you passed on ("fails")
- \`${ROOT_DIR}/Daily Reviews/\` — one note per day, links every trade logged that day
- \`${ROOT_DIR}/Strategies/\`, \`${ROOT_DIR}/Accounts/\`, \`${ROOT_DIR}/Confluences/\` — index notes so \`[[links]]\` resolve
- \`${ROOT_DIR}/Attachments/\` — trade screenshots

> **Do not rely on edits made here.** Changing a note in Obsidian does not update
> the Trade Journal database, and the next sync (or "Rebuild vault") will overwrite it.

\`.tradejournal-sync.json\` tracks which files the app manages — it only ever deletes
files listed there.
`
}
