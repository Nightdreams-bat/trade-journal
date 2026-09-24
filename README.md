<div align="center">

<img src="assets/banner.png" alt="Trade Journal" width="100%">

<img src="docs/screenshots/home-dark.png" alt="Trade Journal dashboard" width="100%">

</div>

<table>
<tr><td><b>Problem</b></td><td>Prop-firm traders need two answers: why am I losing, and when can I get paid? A spreadsheet can't tell them, and most journals are subscriptions that upload your whole trade history to someone else's server.</td></tr>
<tr><td><b>Approach</b></td><td>A desktop app that keeps everything in one SQLite file on your PC. It splits your losses into drawdown episodes, replays your real trading days against Apex and Lucid evaluation rules, and flags the day you're payout-eligible.</td></tr>
<tr><td><b>Result</b></td><td>A Windows installer, now on version 1.3.3. It makes no network requests unless you turn on an optional feature.</td></tr>
</table>

## What it does

**Analytics.** Equity and underwater curves, a history of every drawdown from peak to
recovery, risk-adjusted ratios (Calmar, Ulcer, Martin and others), and your edge broken down
by session, setup and market conditions. It also writes plain insights, for example
*"Tuesday is your strongest day (+$8,425, 71% win rate)"*.

**Prop-firm tools.** A payout calculator with Apex and Lucid rules built in. An evaluation
simulator that resamples your own trading days to estimate your pass rate and risk of ruin.
A fit check that runs your history against each firm's rules.

**Journaling.** Quick trade entry with R-multiples and tags, screenshots pasted straight from
the clipboard, a separate log for trades you missed, and a backtest tab that stays out of your
live stats. CSV import and export.

**Optional, off by default.** An economic calendar with high-impact news matched to each trade,
a shared journal so two traders can see each other's trades (via Supabase), and a one-way sync
into an Obsidian vault.

## Screenshots

| Analytics | Calendar |
|---|---|
| <img src="docs/screenshots/analytics.png" alt="Analytics"> | <img src="docs/screenshots/calendar.png" alt="Calendar"> |
| Trades | Light theme |
| <img src="docs/screenshots/trades.png" alt="Trades table"> | <img src="docs/screenshots/home-light.png" alt="Light theme dashboard"> |

<sub>Screenshots use generated demo data.</sub>

## Download

Get the latest build from [Releases](https://github.com/Nightdreams-bat/trade-journal/releases/latest):
`Trade.Journal.Setup.<version>.exe` installs it, `Trade.Journal.<version>.exe` runs without
installing. Your journal lives in `%APPDATA%\tradejournal\tradejournal.db`, and updates keep it.

## Build from source

```bash
git clone https://github.com/Nightdreams-bat/trade-journal
cd trade-journal
npm ci
npm run dev    # Vite + Electron with hot reload
npm run dist   # installer and portable .exe into release/
```

Needs Node 22+ (it uses the built-in `node:sqlite`). For the shared journal, copy `.env.example`
to `.env`, add your Supabase URL and anon key, and apply `supabase/schema.sql`.

Built with Electron, React, TypeScript, SQLite and Recharts.
