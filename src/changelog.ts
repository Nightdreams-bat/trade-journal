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
    version: '0.10.0',
    date: '2026-09-01',
    title: 'Smarter prop-firm simulations, strategy edge stats, and bug fixes',
    summary: "The eval/risk simulator now models each firm's real drawdown and daily-loss timing and resamples whole trading days, and the Trading Plan tab surfaces Kelly sizing, SQN, streaks, and per-confluence edge for every strategy.",
    changes: [
      {
        kind: 'improved',
        text: 'Prop-firm eval simulator now block-bootstraps by real trading day',
        detail:
          "Resamples whole historical days (preserving each day's actual trade count and win/loss clustering) instead of individual R-multiples in isolation, across 10,000 simulated paths instead of 3,000. Drawdown and daily-loss checks are modeled the way each firm actually enforces them — continuous for Apex Intraday, end-of-day re-basing for Apex EOD and both Lucid programs.",
      },
      {
        kind: 'new',
        text: 'Risk of Ruin and Payout-Ready on Pass stats',
        detail:
          "The simulator now reports risk of ruin (probability of an outright rule breach), P10–P90 days-to-pass, historical and simulated profit factor, worst drawdown reached, and — when a consistency cap is supplied — what share of passing runs would still be blocked from their first payout by that firm's consistency rule.",
      },
      {
        kind: 'new',
        text: 'Prop Firm Fit panel now runs for every account type',
        detail: 'Previously only shown for prop accounts; now available for prop, live, and unset account types, alongside Live Account Risk where it applies.',
      },
      {
        kind: 'new',
        text: 'Trading Plan tab: Kelly sizing, SQN, streaks, and edge-by-confluence per strategy',
        detail:
          "Each strategy card now shows a Kelly-suggested risk %, a System Quality Number (edge consistency, not just average R) with an early-data flag under 20 trades, current and max win/loss streaks, and a ranked breakdown of dollar expectancy per confluence tag so you can see which parts of a strategy actually carry its edge.",
      },
      {
        kind: 'fixed',
        text: 'CSV import mishandled accounting-style negative numbers',
        detail: 'P&L values written as "(123.45)" — how many broker statements show a loss — now import as -123.45 instead of being parsed as positive.',
      },
      {
        kind: 'fixed',
        text: "Escape key inside the confluence editor or a dropdown could close more than intended",
        detail: 'Escape now stops propagating once it closes the confluence rename field or a Select dropdown, instead of also bubbling up to close a parent modal.',
      },
      {
        kind: 'fixed',
        text: 'Repeated "Log Today" clicks from Home no longer skip the jump to today’s date',
        detail: "Clicking through to the Daily Review for today's date now always re-applies the jump, even when the tab was already sitting on that same date.",
      },
      {
        kind: 'fixed',
        text: 'Best/Worst Day P&L on the monthly stats panel showed raw negative numbers without a minus sign',
        detail: 'Negative day totals now render as "-$X" and color red instead of an unsigned green figure.',
      },
      {
        kind: 'improved',
        text: 'Trades and Missed Trades search is now debounced',
        detail: "Typing in the search box no longer re-queries on every keystroke — search waits 250ms after you stop typing, while account/strategy filter changes and new trades still refresh instantly.",
      },
      {
        kind: 'improved',
        text: 'Trade image gallery refreshes after adding or editing a trade',
        detail: "The gallery view on the Trades tab previously only loaded once; it now picks up new or edited screenshots without needing a tab switch.",
      },
    ],
  },
  {
    version: '0.9.0',
    date: '2026-09-01',
    title: 'Payout Calculator',
    summary: "A new tab that checks exactly how much you can request in a payout right now, against Apex's and Lucid's real published rules.",
    changes: [
      {
        kind: 'new',
        text: 'Added the Payout Calculator tab',
        detail:
          "Pick a linked account or type in a manual day-by-day ledger, and see your current balance, profit since last payout, best single day, consistency ratio, qualifying-day progress, and the maximum you can request right now — checked against Apex Intraday/EOD and Lucid Pro/Flex's actual payout rules, including Apex's per-request payout-cap schedule.",
      },
      {
        kind: 'new',
        text: 'Payout log',
        detail: "Tracks payouts you've already withdrawn, so future eligibility checks account for them.",
      },
    ],
  },
  {
    version: '0.8.0',
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
    version: '0.7.0',
    date: '2026-09-01',
    title: 'Profile upgrades & a friendlier greeting',
    summary: 'The Profile panel now switches between accounts and shows your true all-time balance, and the app asks what to call you on first launch.',
    changes: [
      {
        kind: 'new',
        text: 'Ask for a display name on first launch',
        detail:
          'A one-time welcome prompt asks what the journal should call you — just a local name, not an account. Skippable, and editable or clearable later from Settings. Used in both the header and Profile panel greeting.',
      },
      {
        kind: 'new',
        text: 'Switch accounts right from the Profile panel',
        detail: 'Each account in the list is now a button — click one to switch the balance, P&L, currency, and broker chip shown on the profile card.',
      },
      {
        kind: 'improved',
        text: 'Profile card shows all-time balance, not month-to-date',
        detail: 'The main balance figure and its sub-line now come from all-time P&L instead of resetting in meaning every month, with a new "Balance" label above the figure.',
      },
    ],
  },
  {
    version: '0.6.0',
    date: '2026-09-01',
    title: 'Trading Plan tab and per-account-type risk analysis',
    summary: "New tools that project your real strategies onto a firm's actual eval and payout rules, plus a Prop Firm Fit / Live Account Risk panel tailored to each account type.",
    changes: [
      {
        kind: 'new',
        text: 'Trading Plan tab',
        detail:
          "Pick a firm/program/tier and every strategy you've logged gets projected onto it using its real trade history — an eval pass-probability run plus a plain-English payout-cadence sentence (qualifying-day rate for Apex, 3-day-cycle odds for Lucid Pro).",
      },
      {
        kind: 'new',
        text: 'Account and strategy filters on the Trading Plan page',
        detail: "Narrow the plan to one account and/or one strategy instead of always pooling every account a strategy has traded on.",
      },
      {
        kind: 'new',
        text: 'Firm & Risk panel per account type',
        detail:
          "Prop accounts get their trade history run through Apex's and Lucid's real eval rules (profit target, drawdown, daily loss limit) side by side, plus a consistency-ratio check against each firm's payout-stage cap. Live accounts get a risk-of-ruin simulation across a range of risk-per-trade sizes instead, next to the existing Kelly sizing.",
      },
    ],
  },
  {
    version: '0.5.0',
    date: '2026-09-01',
    title: 'Analytics deep-dive, trade gallery & Obsidian vault sync',
    summary: 'A deeper Analytics tab, account types with month-by-month navigation, a trade image gallery, and a proper Obsidian vault sync.',
    changes: [
      {
        kind: 'new',
        text: 'Analytics deep-dive',
        detail:
          'Month-by-month P&L, a calendar heatmap, the prop-firm Monte Carlo simulator, and Kelly sizing all moved into a fuller Analytics tab, with all-time P&L/returns on the overview and the recovery-factor radar clamped so it never goes negative.',
      },
      {
        kind: 'new',
        text: 'Account types',
        detail:
          'Accounts are now tagged live or prop, editable inline, with legacy prop accounts auto-tagged on migration. The utility panel calendar gained month navigation, an all-time vs. monthly stats toggle, and account/strategy filters.',
      },
      {
        kind: 'new',
        text: 'Trade image gallery',
        detail: 'Browse trade screenshots filtered by account and sorted by date or account.',
      },
      {
        kind: 'new',
        text: 'Obsidian vault sync',
        detail:
          'One-way local sync mirrors trades, missed trades, daily reviews, strategies, accounts, and confluences into an Obsidian vault — enable/disable toggle, default-or-custom vault path, registers the vault in Obsidian\'s own vault switcher, Open-in-Obsidian and Show-folder actions, and a dedicated Settings modal. Everything nests under a single "Trading Journal" folder in the vault instead of scattering at the root.',
      },
      {
        kind: 'fixed',
        text: 'CSV import date shifting a day for UTC+ users',
        detail: 'Dates were converted through UTC instead of reading local date components.',
      },
      {
        kind: 'fixed',
        text: 'Trades table checkbox cells breaking native table layout',
        detail: 'A checkbox cell used display:inline-flex on a <td>, which broke the row layout.',
      },
      {
        kind: 'fixed',
        text: 'Playbooks performance stats could show stale data',
        detail: 'Guarded the performance load against out-of-order responses when switching strategies quickly.',
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
