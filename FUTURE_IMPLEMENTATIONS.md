# Future Implementations

Research notes for features to add to TradeJournal. Sourced from scanning open-source
trading repos on GitHub (Aug 2026). Focus: **testing a strategy and storing its results
in the journal**, with a heavy **prop-firm** emphasis.

Everything listed here is **MIT-licensed and free** unless noted. "Effort" = porting cost
into this app (Vite + React 19 + TypeScript + Electron + better-sqlite3).

> **Order of work:** PART 0 (UI pass) is TOP priority — do it before PART 1 (prop-firm)
> and PART 2 (analytics).

---

## PART 0 — UI / polish pass  ✅ DONE (shipped 0.3.0, 2026-08-31)

Implemented on `feature/whats-new-tab`:
- **0.1 liquid glass** — ported the real ui-layouts `liquid-glass` layer model
  (frosted fill + inset edge highlight + outer glow + an SVG `feTurbulence` →
  `feDisplacementMap` "bend" layer). Shared `#liquid-glass-bend` filter lives in
  `index.html`; `.liquid-glass` / `.card` / `.glass` / `.glass-rail` / `.modal-panel`
  all compose the same tokens in `theme.css`, so it is now the **default surface
  treatment app-wide**. The displacement bend layer is applied only to the hero
  surfaces (nav + rails + standalone `.glass`) — not to every `.card` (15+ live
  displacement filters would jank on scroll) and not to `.modal-panel` (an
  `overflow-y:auto` scroll container). `<LiquidGlass>` component for one-offs.
- **0.2 cursor follower** — `CursorFollower.tsx`, refs + translate3d, delegated
  hover, gated on `(pointer: fine)` + reduced-motion.
- **0.3 rails** — shared `<GlassRail>`; App tab bar + AnalyticsPage section rail.
- **0.4 legibility** — fluid `clamp()` base font, `--text-muted` contrast bump,
  `text-rendering: optimizeLegibility`, Fraunces weight bump at small sizes.

Verified rendering in-app (frosted fill + edge light + subtle warp on rails;
content stays crisp above the bend layer).

Requested 2026-08-31. All of this lands on a dedicated branch and is committed early —
another Claude session concurrently reworks `polish/animations` and rebases/resets it,
which destroys uncommitted work. These items touch `theme.css` + `App.tsx` + the page
rails, so coordinate/merge with that branch.

### 0.1 — Liquid-glass surface, properly

- The user asked for `npx uilayouts@latest add liquid-glass`. **That command will not
  work as-is**: `uilayouts` is a shadcn-style registry that expects Next.js + Tailwind +
  the shadcn `components.json`. This app is **Vite + plain CSS**, no Tailwind, no shadcn.
- There is **already a `.glass` / `.glass--rail` utility** in `theme.css` (added by the
  `polish/animations` work — frosted `backdrop-filter: blur() saturate()`). Decide:
  extend that, or fetch the uilayouts source manually and translate its CSS.
- Approach: open the component at ui-layouts.com (or `npx uilayouts@latest add
  liquid-glass --help` to see the registry URL), read its CSS/SVG-filter technique
  (the "liquid" look is usually an SVG `feTurbulence` + `feDisplacementMap` displacement
  filter behind a translucent panel), and reimplement as a `.liquid-glass` class in
  `theme.css` using our tokens. Keep `prefers-reduced-motion` and a non-blur fallback.
- Performance: `backdrop-filter` + an animated SVG displacement filter is GPU-heavy if
  applied to many elements. Use it on **one or two hero surfaces** (nav rail, modal
  panels), not every card.

### 0.2 — Smooth cursor follower

User supplied a Next.js/Tailwind `SmoothFollower` component. **Adapt, don't paste** —
issues to fix:
- Strip `"use client"` and Tailwind classes (`dark:bg-white` etc.) → plain inline styles
  / a `.cursor-follower` class with our tokens (`--accent`, `--text-strong`).
- **Perf:** the original calls `setRenderPos` (React state) every rAF frame → a full
  re-render 60×/s. Instead write `transform: translate3d(x,y,0)` straight to the two
  dot elements via refs in the rAF loop; never touch React state per frame.
- Interactive-element detection: it queries `a, button, img, input…` **once on mount**,
  so it misses everything rendered later (every modal, every dynamically added row).
  Use event delegation: one `mouseover`/`mouseout` on `document`, check
  `e.target.closest('a,button,input,textarea,select,[role="button"],.card--interactive')`.
- Gate on a real pointer + not reduced-motion:
  `window.matchMedia('(pointer: fine)').matches && !usePrefersReducedMotion()`.
  Hide the OS cursor only while the follower is active (`* { cursor: none }` is risky —
  scope it, and keep text inputs showing the caret).
- Mount once in `App.tsx` (Electron desktop only — it's always a fine pointer there).
- lerp factors from the user's code: dot `0.2`, ring `0.1`. Ring grows 28→44px on hover.

### 0.3 — All sub-tab / section rails use liquid glass

- Inventory every secondary nav in the app and give them one shared glass rail component:
  - top tab bar in `App.tsx` (already `.glass glass--rail`)
  - AnalyticsPage section-pill rail ("glass section-pill rail" per the polish commit)
  - `WhatsNewPage` — currently plain; align it
  - any filter bars (`FilterBar.tsx`), modal tab strips (`StrategyDetailModal`)
- Extract a `<GlassRail>` / `.glass-rail` so the treatment is defined once and every
  rail is visually identical. Watch contrast of active vs inactive items on the
  translucent background (see 0.4).

### 0.4 — Font legibility at any screen size

- The Electron window is freely resizable and runs at arbitrary DPI. Current body is a
  flat 14px Inter Variable (bumped from 13px in the polish commit).
- Do:
  - Set a **fluid base**: `font-size: clamp(13px, 0.8vw + 9px, 15px)` on `:root`, or a
    couple of breakpoints on window width — verify at a ~900px-wide window and at 4K.
  - Enforce **minimum sizes**: nothing below 11px for real content; the 9–10.5px
    `mono-label` / `mono-chip` are decorative only — audit that none carry essential text.
  - Check contrast on glass surfaces: `--text-muted` (#8e97a8) on a blurred translucent
    panel can drop below WCAG AA. Bump muted text one step where it sits on glass.
  - `-webkit-font-smoothing: antialiased` is already set; also set
    `text-rendering: optimizeLegibility` and test the Fraunces display weight (340) —
    it can look thin/blurry at small sizes on Windows, may need weight 400 under ~20px.
  - Respect an optional user zoom (`Ctrl +/-` in Electron `webFrame.setZoomFactor`) —
    make sure layouts don't break at 125–150%.

### Order within PART 0
0.4 (legibility) and 0.1 (define `.liquid-glass`) first — they set the foundation —
then 0.3 (roll the rail out everywhere), then 0.2 (cursor follower, independent).

---

## PART 1 — Prop-firm features

### Current state
`electron/analytics.ts :: simulateFundedChallenge()` + `src/components/PropFirmToolsPanel.tsx`
already do a bootstrap Monte Carlo of the user's logged R-multiples against: profit target %,
max daily loss %, max overall drawdown %, risk per trade %, days remaining. Also a Kelly
criterion box.

### Gaps to close (ranked)

| # | Gap | Fix / source | Effort |
|---|-----|--------------|--------|
| 1 | IID resampling ignores losing streaks → pass rate too optimistic | **Block bootstrap** (sample contiguous blocks of trades, not single trades) — LuxAlgo/prop-firm-sim | Small |
| 2 | Drawdown trails on every intraday tick and never locks | Add **trailing-drawdown variants**: static / trailing-EOD / trailing-intraday, plus lock-at-breakeven once cleared — whaleclap/propfirm-risk-guard, jalv92/FundedPath | Small |
| 3 | No **consistency rule** (the #1 reason people fail the *payout*, not the challenge) | Add `maxDayPct` check: no single day > 30–40% of total profit — whaleclap, LuxAlgo | Small |
| 4 | User types every firm number by hand | **Per-firm presets** dropdown: FTMO, Topstep, Apex, MyFundedFutures, The5ers, E8 — whaleclap ships Apex/Topstep/FFN as TOML; SLClub01 ships FTMO/The5ers/E8 | Small |
| 5 | Hard "10 trades or placeholder distribution" cliff | **Credibility-blended EV**: weight real results by `logged / (logged + 4)` — SheikhMohammadTalha01/PropPath | XS |
| 6 | Simulator is global, not tied to a strategy | **Run the simulator per `strategy_id`.** Add a "Prop Firm" tab to `StrategyDetailModal` that simulates only that strategy's trades vs a chosen firm preset, and persists the result so pass-probability can be tracked over time as more trades are logged. | Medium |
| 7 | No payout view | **Payout-eligibility checker**: profit target + min winning days + consistency → pass/fail + list of blockers — shootingallday/propfirm-calc | Small |
| 8 | No risk sizing guidance beyond Kelly | **Risk-% optimization sweep**: simulate across risk levels, show the % that maximizes pass probability (≠ the one that maximizes EV) — LuxAlgo, gabrielee5/prop-firm-simulator | Medium |

**#6 is the keystone** — it unifies strategy testing + prop rules + journal storage in one view.

### Prop-firm source repos (tier list)

- **S — LuxAlgo/prop-firm-sim** (TS, MIT) — block bootstrap, trailing-DD variants, consistency + payout gating, risk-% sweep, 95% CI. Already TypeScript = easiest to lift from.
- **S — whaleclap/propfirm-risk-guard** (Py, MIT) — real per-firm presets as TOML (Apex 50K, Topstep 50K, FFN 50K); consistency formula "no day > 40% of total profit"; dual trailing styles + freeze threshold.
- **A — shootingallday/propfirm-calc** (Py, MIT) — tiny dependency-free trailing-DD floor + payout-eligibility checker.
- **A — SLClub01/prop-firm-calculator-core** (TS, MIT) — FTMO/The5ers/E8 presets; `DailyLimit = MidnightBalance * (1 - MaxDD%)`; pip-value / position-size math (forex side).
- **A — gabrielee5/prop-firm-simulator** (Py, MIT) — "find optimal challenge structure for a given strategy"; R:R sweep, fees, payout-% vs account-growth, zero-edge coin-flip baseline.
- **B — SheikhMohammadTalha01/PropPath** (JS, MIT) — credibility-blended EV, liquidation-room calc, days-to-payout, win-streak auto-sizing, P&L calendar.
- **B — jalv92/FundedPath** (C#, MIT) — UX concept: "while you review a trade, show still-passing? / what breaks first?". Only Lucid presets built.
- **B — 2023ai/ftmo-risk-control** (Py, MIT, 70*) — live guardrail (position sizing, daily-loss, news windows, frequency limits); reference for a pre-trade checklist.
- Skip: PropForge (gamified trainer), Indemos/Terminal (full terminal), QuantX / TopstepX-API (live API), MQL5/EA bots, "prop firm review 2026" SEO repos.

---

## PART 2 — Strategy analytics & general features

### S — do first

- **ranaroussi/quantstats** (Apache-2.0, Py) — metric formulas to port into `analytics.ts` and show **per strategy** in `StrategyDetailModal` (currently only win rate / profit factor / expectancy / avg win-loss):
  - Sharpe, Sortino, Calmar
  - Recovery factor, Ulcer index, gain-to-pain ratio
  - Max consecutive wins/losses, outlier win/loss
  - **System Quality Number (SQN)** — best single "is this strategy real yet?" number for a strategy still in testing
  - R-multiple distribution histogram + skew / kurtosis
  - Effort: ~1 day, pure formulas.

- **Bilovodskyi/ai-trading-journal** (Apache-2.0, React/TS) — pattern to copy: **strategy = a rule set**; per trade, check which rules were followed; then "strategy is +1.2R when all rules followed, -0.4R when not." Answers "is the strategy bad or is my execution bad?"
  - Implementation: extend `Strategy` type with `rules: string[]`; add rule checkboxes to `TradeFormModal`; slice strategy stats by adherence.

- **cinar/indicatorts** (MIT, TS) — 53 indicators, pure client-side. Only once price context is stored. Then capture RSI/ATR at entry and slice strategy results by regime.

### A — high value

- **Cursivez/journalit** (source-available, ideas only) — **side-by-side setup/strategy comparison** view = strategy A/B testing. Pure UI over existing data. Put 2–4 strategies' equity curves + metric tables next to each other.
- **apatel85/tradegenie** (no license, ideas only) — **MFE/MAE scatter plot** per strategy; playbook performance cards. Add nullable `mae_r` / `mfe_r` to `Trade` (types.ts + db migration + TradeFormModal), plot exit efficiency. Tells you if a strategy's targets/stops are wrong vs the edge itself.
- **tradingview/lightweight-charts** (Apache-2.0, TS) — candlestick chart with entry/exit **markers** (`createSeriesMarkers` — it does support them). Needs an OHLC data source (not currently stored).

### B

- **hugodemenez/deltalytix** (CC BY-NC 4.0 — ideas only, we ship builds) — AI "which setups cost you money" analysis; AI-assisted CSV column mapping on import.
- **klinecharts/KLineChart** (Apache-2.0, 40 KB) — alt to lightweight-charts, better built-in drawing/annotation tools.

### C — reference only

- **Eleven-Trading/TradeNote** (GPL-3.0) — copyleft, can't borrow code; Mongo stack. Mature journal, feature reference only.
- **Simple-Rich-Trading-Journal** (CC BY-NC-ND) — no-derivatives; thin strategy features.

### D — indexes to mine later

- wilsonfreitas/awesome-quant (29k), paperswithbacktest/awesome-systematic-trading (14k) — catalogs.

---

## Suggested order of work

0. **PART 0 — UI pass (legibility → `.liquid-glass` → roll rails out → cursor follower).**
1. Prop gaps #1–#5 — one focused pass on `analytics.ts` + `PropFirmToolsPanel.tsx` (block bootstrap, trailing-DD variants, consistency rule, firm presets, credibility blend).
2. quantstats metrics pack in `analytics.ts` → surface per-strategy in `StrategyDetailModal`.
3. Prop gap #6 — per-strategy "Prop Firm" tab, persisted results.
4. Strategy rule-set + adherence tracking.
5. Strategy comparison view.
6. MFE/MAE capture + scatter.

---

## PART 3 — AI trading agents (NQ/MNQ analysis + eventual execution)

Research notes from scanning GitHub for multi-agent LLM trading frameworks (Sep 2026).
Goal per Matei: agents that read NQ/MNQ futures charts, get taught his own strategy and
thinking, and — once proven — help him pass a prop-firm evaluation. Not yet built; this
is the plan, not shipped code.

### Candidates evaluated

| Repo | Stars | Architecture | Verdict |
|---|---|---|---|
| **TauricResearch/TradingAgents** (MIT) | ~79k / 15.4k forks | 5-stage pipeline: 4 parallel analysts (fundamentals, sentiment, news, technical) → bull/bear researcher debate → trader → risk-management committee → fund-manager approval. Config-driven LLM choice per agent, adjustable debate rounds, persistent memory across runs, CLI + Python API (`TradingAgentsGraph`). | **Chosen as the base.** Far more mature/extensible than anything else in the space; the persistent-memory + per-agent-prompt design is exactly the mechanism for "teach it my approach" — it's prompt/config driven, not a black-box trained model. |
| Y-Research-SBU/QuantAgent (aka QuantHarness — same repo/team, near-identical stars) | ~2.8k / ~610 forks | 4 agents: Indicator, Pattern, Trend, Risk → Decision agent. Operates purely on OHLC price data, no news/sentiment. Zero-shot-tested specifically against Nasdaq futures + BTC on 4-hour bars, beat rule-based and neural baselines. | Not adopted wholesale (too small/unsupported vs TradingAgents), but its **analyst decomposition is the better fit for pure price-action futures trading** than TradingAgents' stock-flavored default analysts (fundamentals/Reddit sentiment don't apply to NQ). |

### The gap: TradingAgents ships stock-shaped, not futures-shaped

Default analyst team assumes equities (company fundamentals, Reddit/news sentiment).
It also has **no built-in broker execution** — it outputs a reasoned decision, it doesn't
place an order. Two things to build before this is useful for NQ/MNQ:

1. **Swap the analyst team** — replace fundamentals/sentiment analysts with
   QuantAgent-style price-action analysts (indicator, chart-pattern, trend/channel),
   keep or drop the news analyst depending on whether Matei wants macro-news awareness.
2. **Bridge decision → execution** — TradingAgents' final Fund Manager output needs to
   go somewhere. Two real options for the futures/prop side: **Tradovate API** (most
   prop firms run on Tradovate or Rithmic) or NinjaTrader's Partner API. Start with
   *no live execution* — log the agent's call as a shadow/paper entry.

### Where it plugs into this app

- Agent's proposed trade (symbol, direction, entry, stop, target, reasoning) gets
  written into the existing `trades` table (`electron/db.ts`) as a new trade **tagged
  as agent-originated** (needs a `source: 'manual' | 'agent'` column) rather than a
  separate system — so it shows up in the same journal, same per-strategy stats, same
  prop-firm simulator as Matei's own trades, and the two can be compared head-to-head.
- Agent's memory gets seeded from Matei's own logged trades + strategy rule sets
  (PART 2's `rules: string[]` work) so it's learning from his actual journal, not a
  generic prompt.
- Risk-manager agent's limits get wired to the same per-firm presets from PART 1
  (Apex/Topstep/etc. daily-loss %, trailing drawdown, consistency rule) so it can never
  propose a trade that would blow the eval, before execution is ever turned on.

### Phased build (matches [[Prop Trading]]'s journal-phase → prop-firm-phase timeline)

1. **Stand up TradingAgents locally**, point it at NQ/MNQ price data, strip/replace the
   stock-flavored analysts for price-action ones. No journal or execution wiring yet —
   just confirm it produces sane, explainable calls on futures data.
2. **Wire in Matei's playbook** — turn his three existing journaled strategies into the
   agent prompts + memory seed. Add the `source` column and start writing every agent
   call into the journal as a shadow trade, right next to his real trades.
3. **Validate in shadow mode** for enough logged trades to trust the edge stats (same
   credibility-blended EV gate as PART 1 gap #5) — compare agent shadow performance
   against Matei's own, strategy by strategy.
4. **Bridge to Tradovate** for real order placement, gated hard behind the risk-manager
   agent + prop-firm preset limits, starting on a prop-firm evaluation account, not live
   capital.

### Sources
- github.com/TauricResearch/TradingAgents
- github.com/Y-Research-SBU/QuantAgent (= QuantHarness)
- arxiv.org/abs/2412.20138 (TradingAgents paper), arxiv.org/abs/2509.09995 (QuantAgent paper)

### Phase 1 progress (2026-09-02)

Setup work done, blocked only on an Anthropic API key (Matei's collaborator holds it,
not available this session):

- Cloned `TauricResearch/TradingAgents` into `C:\Users\Lenovo\my-agent\TradingAgents`,
  isolated venv at `TradingAgents\.venv`.
- Confirmed Yahoo Finance (the framework's default, free, keyless data vendor) serves
  live NQ=F and MNQ=F futures data fine via `yfinance` — no paid data vendor needed to
  get this running.
- Turns out no code surgery is needed to drop the stock-flavored analysts — the
  framework already takes a `selected_analysts` list. `run_nq_agent.py` (new, repo
  root) configures `selected_analysts=("market", "news")`, dropping
  fundamentals/social/sentiment (equity-only) and keeping market (pure price/indicator
  analyst — the QuantAgent-equivalent piece) plus news (macro like Fed/CPI, which
  genuinely moves NQ). LLM split: Haiku for the frequent calls, Sonnet only for the
  trader/risk/research reasoning, to keep run cost down.
- Wrote `TradingAgents/pine/nq_agent_view.pine` — a TradingView Pine Script v5
  indicator plotting the same signal set the market analyst can choose from (50/200
  SMA, 10 EMA, MACD, RSI w/ 70·30 zones, Bollinger Bands, ATR) so Matei sees the same
  read on his actual TradingView chart that the agent is reasoning over. Paste into
  TradingView's Pine Editor to use.
- Full dependency install (`pip install -e .`) running.

**Still open, needs the key:** first real `run_nq_agent.py` call to confirm the agent
produces sane output on NQ. **Still open, needs a decision before touching it:** wiring
agent decisions into this app's `trades` table (`electron/db.ts`) — that's a schema
change to the live journal database, flagged for an explicit go-ahead before editing,
not done yet.

### Three agencies, not one (2026-09-02)

Matei wants three separate, isolated agent instances — one per existing strategy —
each with its own memory so they never blend into each other:

- `TradingAgents/profiles/orb/strategy.md` — 15-min ORB, **London + NY sessions
  merged into one agency** (was two separate accounts in the journal). Seeded from
  existing vault research (StudyVault "Max Way ORB" strategy + its trading plan +
  Pine Script) rather than re-taught from scratch — has open questions for Matei to
  confirm (exact stop/target numbers) before first run.
- `TradingAgents/profiles/high-rr/strategy.md` — "High R:R - Supply/Demand Zone
  Reversal (NQ)." No prior vault research existed for this one; extracted by reading
  Matei's own trade screenshots in `TradeJournal/Attachments` (trades t68, t12) and
  confirmed with him directly: mark a supply/demand zone as an area (not a line) on
  the 5-min chart, enter on rejection when price fails to continue through it, tight
  stop beyond the zone, target at the opposite zone — this is what produces the large
  R multiples (4R and 10R confirmed in his own logged trades).
- `TradingAgents/profiles/jj-simon-fair-pricing/strategy.md` — fully pre-researched in
  the vault already (strategy writeup, prop-firm sizing plan, and a working Pine
  Script v6 indicator), most ready-to-go of the three.
- `TradingAgents/profiles/_shared/base-doctrine.md` — house style all three agencies
  share on top of their own rules: top-down analysis (daily → 1-4h → entry timeframe
  bias) and break-of-structure reading, before applying the strategy-specific entry.
  Overlaps naturally with ORB's structural-confirmation step and JJ Simon's "A+"
  trigger, which are themselves BOS applications.

Not wired into the actual agent prompts/config in code yet — these are the seed docs;
turning them into the `TradingAgentsGraph` config per agency is the next build step
once the API key is available.

### Backtest tab — shipped (2026-09-02)

Built the actual app-side landing spot for agent trades, ahead of the agents
themselves being wired up (so it's ready the moment they are):

- `trades` table gained a `source TEXT NOT NULL DEFAULT 'manual'` column
  (`electron/db.ts`, migration + fresh-install schema) — `'manual'` = Matei's own
  logged trades, `'agent'` = an AI trading agent's shadow/backtest call. Same table,
  same shape (pair, direction, pnl, r_multiple, strategy, screenshots, confluences),
  just filtered apart — reused the existing trade record instead of standing up a
  parallel table, so strategy analytics and comparisons work across both for free.
- `electron/ipc.ts`: `trades:getAll` takes an optional `source` filter;
  `trades:create`/`trades:update` persist it (defaults to `'manual'` if omitted).
- `TradeFormModal` takes a new `defaultSource` prop so a trade created from the
  Backtest tab is tagged `'agent'` without touching the Trades tab's behavior; editing
  an existing trade always preserves its own `source`.
- New `src/pages/BacktestPage.tsx` — same table/gallery UI as `TradesDbPage.tsx`,
  filtered to `source: 'agent'`. New "Backtest" nav tab (`FlaskConical` icon) between
  Trades and Missed.
- Three new accounts created directly in the live DB (app was already open — added
  via a short-lived `node:sqlite` connection with `busy_timeout` set, not by touching
  the app's own runtime state, to avoid a lock conflict): **15-min ORB (Backtest)**,
  **High RR (Backtest)**, **JJ Simon (Backtest)**, `account_type: 'backtest'` (a value
  the app's `ACCOUNT_TYPES` already supported). Kept fully separate from the real
  accounts (15Min ORB NY, 15Min ORB London, High RR) so agent shadow trades never mix
  into real account balances/stats.
- `npx tsc -b` passes clean after all of the above.

Not done yet: nothing writes to this table automatically — that happens once an
agency's `TradingAgentsGraph` run is wired to call `trades:create` with the matching
backtest account + strategy + `source: 'agent'`, which depends on the API key (see
above). Obsidian vault sync (`electron/obsidian.ts`) wasn't extended to mirror
backtest trades into the vault — worth doing once the volume of agent trades is high
enough to want them reviewable there too, not before.
