# Future Implementations

Research notes for features to add to TradeJournal. Sourced from scanning open-source
trading repos on GitHub (Aug 2026). Focus: **testing a strategy and storing its results
in the journal**, with a heavy **prop-firm** emphasis.

Everything listed here is **MIT-licensed and free** unless noted. "Effort" = porting cost
into this app (Vite + React 19 + TypeScript + Electron + better-sqlite3).

---

## PART 1 — Prop-firm features (priority)

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

1. Prop gaps #1–#5 — one focused pass on `analytics.ts` + `PropFirmToolsPanel.tsx` (block bootstrap, trailing-DD variants, consistency rule, firm presets, credibility blend).
2. quantstats metrics pack in `analytics.ts` → surface per-strategy in `StrategyDetailModal`.
3. Prop gap #6 — per-strategy "Prop Firm" tab, persisted results.
4. Strategy rule-set + adherence tracking.
5. Strategy comparison view.
6. MFE/MAE capture + scatter.
