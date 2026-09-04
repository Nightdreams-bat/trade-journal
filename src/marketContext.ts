/**
 * A starter taxonomy of *market conditions* to tag trades with, so the existing confluence edge
 * machinery can answer "which conditions actually carry my edge?" rather than only "which of my
 * setup criteria were present".
 *
 * The vocabulary is lifted from the feature set a news-impact trading bot scores each setup on —
 * gap shape, relative volume, VWAP posture, event risk, and regime. These are conditions the market
 * hands you, not choices you make, which is exactly what makes them worth slicing performance by.
 *
 * They are plain `confluences` rows: nothing here needs a schema change, and a user can rename or
 * delete any of them like any other confluence.
 */
export const MARKET_CONTEXT_PACK = [
  { group: 'Gap', names: ['Gap up', 'Gap down', 'No gap', 'Gap filled', 'Gap continuation'] },
  { group: 'Volume', names: ['Relative volume high', 'Relative volume low', 'Volume climax'] },
  { group: 'VWAP', names: ['Above VWAP', 'Below VWAP', 'VWAP reclaim', 'VWAP rejection', 'Extended from VWAP'] },
  { group: 'Event risk', names: ['High-impact news window', 'Post-news', 'Earnings nearby'] },
  { group: 'Regime', names: ['Trending', 'Ranging', 'Choppy'] },
] as const

export type MarketContextGroup = (typeof MARKET_CONTEXT_PACK)[number]['group']

export const MARKET_CONTEXT_NAMES: string[] = MARKET_CONTEXT_PACK.flatMap((g) => [...g.names])

const GROUP_BY_NAME = new Map<string, MarketContextGroup>(
  MARKET_CONTEXT_PACK.flatMap((g) => g.names.map((n) => [n.toLowerCase(), g.group] as const))
)

/** The pack group a confluence belongs to, or null for a user's own confluences. */
export function groupOf(name: string): MarketContextGroup | null {
  return GROUP_BY_NAME.get(name.trim().toLowerCase()) ?? null
}
