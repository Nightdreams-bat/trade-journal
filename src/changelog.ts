// ============================================================
// Changelog — data source for the "What's New" tab.
//
// Add a new entry to the TOP of RELEASES on every shipped change.
// Keep entries factual and user-facing. `demo` is an optional key into
// the demo registry in src/components/whatsnew/demos.tsx — only add one
// where a small inline illustration genuinely helps.
// ============================================================

export type ChangeKind = 'new' | 'improved' | 'fixed'

export interface ChangeItem {
  kind: ChangeKind
  /** One line, present tense, user-facing. */
  text: string
  /** Optional longer explanation shown under the line. */
  detail?: string
  /** Optional demo id — see src/components/whatsnew/demos.tsx */
  demo?: DemoId
}

export interface Release {
  version: string
  /** ISO date, YYYY-MM-DD. */
  date: string
  /** Headline for the release. */
  title: string
  /** One-sentence summary shown under the title. */
  summary: string
  changes: ChangeItem[]
}

export type DemoId = 'whats-new-tab' | 'equity-curve' | 'tag-pills' | 'calendar-heatmap' | 'kpi-countup'

export const RELEASES: Release[] = [
  {
    version: '0.5.0',
    date: '2026-09-01',
    title: 'New app icon, cleaner header',
    summary: 'A new Trade Journal app icon, and a simpler greeting header with the account/strategy subtitle removed.',
    changes: [
      {
        kind: 'new',
        text: 'New app icon',
        detail: 'Replaced the plain candlestick favicon with the full Trade Journal mark — a notebook, green candles, and an upward arrow.',
      },
      {
        kind: 'improved',
        text: 'Simplified the top-left greeting',
        detail: 'Dropped the account/strategy subtitle under "Good evening" — just the greeting now, centered in its space.',
      },
    ],
  },
  {
    version: '0.4.0',
    date: '2026-08-31',
    title: 'visionOS redesign',
    summary: 'Rebuilt the interface as a visionOS-style glass terminal — frosted graphite panels on near-black, signal-green accents, and a new Home dashboard.',
    changes: [
      {
        kind: 'new',
        text: 'Rebuilt the whole interface as a frosted-glass trading terminal',
        detail: 'Graphite glass panels on a near-black backdrop with a soft green glow, deep-round corners, floating nav—a complete visual system overhaul.',
      },
      {
        kind: 'new',
        text: 'New Home tab: bento-grid dashboard',
        detail: 'Win rate, P&L, equity curve, calendar, prop-firm status, and recent trades at a glance—deep analytics moved to its own tab.',
      },
      {
        kind: 'new',
        text: 'Floating glass top nav + bottom quick-action ornament',
        detail: 'Home / Search / Add trade / Profile shortcuts always within reach.',
      },
      {
        kind: 'improved',
        text: 'Switched to heavier system-sans typeface with tabular numerals',
        detail: 'Dropped the Fraunces serif for a cleaner, more legible look at any size.',
      },
      {
        kind: 'improved',
        text: 'New dark palette — near-black surfaces, signal-green accents, off-white text',
        detail: 'Deeper-blur graphite glass with a bright specular edge and softer ambient shadows.',
      },
    ],
  },
  {
    version: '0.3.0',
    date: '2026-08-31',
    title: 'Liquid-glass UI pass',
    summary: 'A frosted "liquid glass" treatment across the navigation, a smooth trailing cursor, and type that stays legible at any window size.',
    changes: [
      {
        kind: 'new',
        text: 'Smooth cursor follower',
        detail:
          'A solid dot tracks the pointer tightly while a ring lags behind and grows over anything clickable. Runs entirely on the compositor and turns itself off for coarse pointers or when you\'ve asked for reduced motion.',
      },
      {
        kind: 'new',
        text: 'Liquid-glass interface over a photographic backdrop',
        detail:
          'The app now sits on a fixed landscape wallpaper. Every raised surface — cards, panels, the navigation, section rails and dialogs — is frosted "liquid glass": a blurred translucent fill with a lit inner edge and a soft outer glow. The navigation and large panels optically warp the scenery behind them (an SVG feTurbulence/feDisplacementMap of the blurred backdrop, ported from the ui-layouts liquid-glass component). A vignette scrim plus slightly more opaque cards keep dense tables and charts readable.',
      },
      {
        kind: 'improved',
        text: 'Font legibility at any size',
        detail:
          'Body text now scales fluidly with the window instead of sitting at a fixed size, never dropping below 13px. Muted text was darkened one step so it still meets contrast guidelines on the translucent panels.',
      },
    ],
  },
  {
    version: '0.2.0',
    date: '2026-08-31',
    title: 'Feature & Updates tab',
    summary: 'A place inside the app to see exactly what changed in each release, with small live demos of how new features work.',
    changes: [
      {
        kind: 'new',
        text: 'Added the "What\'s New" tab',
        detail:
          'Every release is listed on a timeline with its changes grouped as New / Improved / Fixed. Entries with a "Show me" button expand a small inline demo built from the app\'s own components — no images or video, so it stays fast and respects reduced-motion.',
        demo: 'whats-new-tab',
      },
      {
        kind: 'new',
        text: 'Unseen releases show a dot on the tab',
        detail: 'The app remembers the last version you opened here (stored locally on this machine). When a newer release ships, an accent dot appears on the tab until you visit it.',
      },
    ],
  },
  {
    version: '0.1.0',
    date: '2026-08-24',
    title: 'Initial release',
    summary: 'Local, offline trade journal and analytics — everything stored on your machine in a single SQLite file.',
    changes: [
      {
        kind: 'new',
        text: 'Analytics dashboard',
        detail: 'KPIs, equity curve, drawdown, day-of-week and monthly breakdowns, plus a calendar P&L heatmap and an automatic insights panel.',
        demo: 'equity-curve',
      },
      {
        kind: 'new',
        text: 'Calendar P&L heatmap',
        detail: 'Each day is coloured by net P&L so winning and losing streaks are obvious at a glance.',
        demo: 'calendar-heatmap',
      },
      {
        kind: 'new',
        text: 'KPI cards with animated counters',
        demo: 'kpi-countup',
      },
      {
        kind: 'new',
        text: 'Playbooks — track a strategy and its results over time',
        detail: 'Create a strategy, tag trades with it, and see win rate, profit factor, expectancy, average R and plan adherence per strategy.',
      },
      {
        kind: 'new',
        text: 'Positive / negative tags on every trade',
        detail: 'Label what you did well and what went wrong, then filter and analyse by tag.',
        demo: 'tag-pills',
      },
      { kind: 'new', text: 'Daily Review journal with emotion and lessons-learned fields' },
      { kind: 'new', text: 'Missed Trades log with would-be P&L' },
      { kind: 'new', text: 'Screenshot gallery on trades and missed trades' },
      { kind: 'new', text: 'CSV import with column mapping, and CSV export' },
      { kind: 'new', text: 'Multi-account support with per-account starting balance and currency' },
      {
        kind: 'new',
        text: 'Prop Firm tools',
        detail: 'A bootstrap Monte Carlo over your logged R-multiples estimates your pass probability, daily-loss and drawdown breach rates, and days-to-pass for a funded challenge — plus a Kelly criterion sizing suggestion.',
      },
    ],
  },
]

export const LATEST_VERSION = RELEASES[0]?.version ?? '0.0.0'
