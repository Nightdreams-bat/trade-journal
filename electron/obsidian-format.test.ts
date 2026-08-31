/**
 * Unit tests for the pure Obsidian serializers.
 * Run: node --test electron/obsidian-format.test.ts
 */
import test from 'node:test'
import assert from 'node:assert/strict'
import {
  yamlFrontmatter,
  slugifyTitle,
  wikiName,
  tradeNotePath,
  tradeNoteBasename,
  missedNotePath,
  dailyReviewPath,
  tradeNote,
  dailyReviewNote,
  type TradeRow,
} from './obsidian-format.ts'

test('yamlFrontmatter quotes values that need it and drops empties', () => {
  const fm = yamlFrontmatter({
    type: 'trade',
    pair: 'EUR:USD',
    note: '# hash start',
    ratio: 2.5,
    won: true,
    empty: '',
    missing: null,
    tags: ['clean, patient', 'FVG'],
    none: [],
  })
  assert.match(fm, /^---\n/)
  assert.match(fm, /\n---\n$/)
  assert.match(fm, /type: trade\n/)
  assert.match(fm, /pair: "EUR:USD"\n/)
  assert.match(fm, /note: "# hash start"\n/)
  assert.match(fm, /ratio: 2\.5\n/)
  assert.match(fm, /won: true\n/)
  assert.doesNotMatch(fm, /empty:/)
  assert.doesNotMatch(fm, /missing:/)
  assert.doesNotMatch(fm, /none:/)
  assert.match(fm, /tags:\n {2}- "clean, patient"\n {2}- FVG\n/)
})

test('slugifyTitle strips illegal filename characters', () => {
  assert.equal(slugifyTitle('EUR/USD: London #1'), 'EUR USD London 1')
  assert.equal(slugifyTitle(''), 'untitled')
  assert.equal(slugifyTitle('a\nb\tc'), 'a b c')
})

test('wikiName strips link-breaking characters', () => {
  assert.equal(wikiName('Silver [Bullet] #ict'), 'Silver Bullet ict')
})

const baseTrade: TradeRow = {
  id: 42,
  name: null,
  date: '2026-08-31',
  pair: 'EURUSD',
  session: 'London',
  direction: 'Long',
  risk_per_trade: 1,
  pnl: 250,
  r_multiple: 2.5,
  followed_plan: 1,
  break_even: 0,
  entry_win: 1,
  positive_tags: ['patient'],
  negative_tags: [],
  notes: 'Clean FVG entry.',
  created_at: '2026-08-31T10:00:00',
}

test('note paths are year-foldered and id-suffixed', () => {
  assert.equal(tradeNoteBasename(baseTrade), '2026-08-31 EURUSD Long (t42)')
  assert.equal(tradeNotePath(baseTrade), 'Trades/2026/2026-08-31 EURUSD Long (t42).md')
  assert.equal(
    missedNotePath({ ...baseTrade, id: 7 } as never),
    'Missed Trades/2026/2026-08-31 EURUSD Long (m7).md'
  )
  assert.equal(dailyReviewPath('2026-08-31'), 'Daily Reviews/2026-08-31.md')
})

test('note paths degrade gracefully when fields are missing', () => {
  const sparse: TradeRow = { ...baseTrade, pair: null, direction: null }
  assert.equal(tradeNotePath(sparse), 'Trades/2026/2026-08-31 (t42).md')
})

test('tradeNote emits frontmatter, wikilinks and screenshot embeds', () => {
  const md = tradeNote(baseTrade, {
    strategyName: 'ICT Silver Bullet',
    accountName: 'Main Account',
    confluenceNames: ['FVG', 'OB'],
    hasDailyReview: true,
    screenshots: ['trade_42_a.png'],
  })
  assert.match(md, /type: trade/)
  assert.match(md, /strategy: ICT Silver Bullet/)
  assert.match(md, /\*\*Strategy:\*\* \[\[ICT Silver Bullet\]\]/)
  assert.match(md, /\*\*Confluences:\*\* \[\[FVG\]\], \[\[OB\]\]/)
  assert.match(md, /\*\*Daily review:\*\* \[\[2026-08-31\]\]/)
  assert.match(md, /## Notes\n\nClean FVG entry\./)
  assert.match(md, /## Screenshots\n\n!\[\[trade_42_a\.png\]\]/)
})

test('dailyReviewNote lists linked trades and handles an empty day', () => {
  const withTrades = dailyReviewNote(
    { date: '2026-08-31', notes: 'Solid day.', emotion: 'Calm', lessons_learned: 'Wait for London.' },
    { tradeNotes: ['2026-08-31 EURUSD Long (t42)'], missedNotes: [] }
  )
  assert.match(withTrades, /## Trades this day\n\n- \[\[2026-08-31 EURUSD Long \(t42\)\]\]/)
  assert.match(withTrades, /## Missed this day\n\n_none_/)
  assert.match(withTrades, /\*\*State:\*\* Calm/)
})
