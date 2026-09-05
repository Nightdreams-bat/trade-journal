import { compareVersions } from './changelog'

export const TABS = [
  { key: 'home', label: 'Home' },
  { key: 'analytics', label: 'Analytics' },
  { key: 'plan', label: 'Trading Plan' },
  { key: 'payout', label: 'Payout Calculator' },
  { key: 'playbooks', label: 'Playbooks' },
  { key: 'review', label: 'Review' },
  {
    key: 'news',
    label: 'News',
    since: '1.3.0',
    blurb:
      'This week’s ForexFactory calendar with its red folders, today’s high-impact events on the dashboard, and an optional entry time that matches a trade to the news around it.',
  },
  { key: 'trades', label: 'Trades' },
  {
    key: 'backtest',
    label: 'Backtest',
    since: '1.1.1',
    blurb: 'Backtested and agent-generated trades get their own tab, kept out of your live record.',
  },
  { key: 'missed', label: 'Missed' },
  {
    key: 'shared',
    label: 'Shared',
    since: '1.4.0',
    blurb:
      'See a friend’s trades alongside your own — each of you keeps your own local journal, this just mirrors both into one shared view. Opt-in, off until you sign in and turn it on in Settings.',
  },
  {
    key: 'settings',
    label: 'Settings',
    since: '1.3.1',
    blurb:
      'Everything that used to live in the Settings popup — profile, accounts, theme, economic calendar, Obsidian sync, shared journal, and CSV export — now has its own tab.',
  },
  { key: 'whatsnew', label: "What's New" },
] as const

export type TabKey = (typeof TABS)[number]['key']

export interface TabDef {
  key: string
  label: string
  /** Release that introduced this tab — drives the "New" badge and the announcement. */
  since?: string
  /** One-line pitch shown in the new-feature announcement. */
  blurb?: string
}

/**
 * Tabs introduced after the last release the user has actually read about in
 * What's New, newest first. Returns nothing when `seenVersion` is null — a fresh
 * install has no "new" to point at, everything is new.
 */
export function tabsNewSince(seenVersion: string | null): TabDef[] {
  if (!seenVersion) return []
  return (TABS as readonly TabDef[])
    .filter((t) => t.since && compareVersions(t.since, seenVersion) > 0)
    .sort((a, b) => compareVersions(b.since!, a.since!))
}
