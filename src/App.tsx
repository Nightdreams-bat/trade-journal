import { useEffect, useState } from 'react'
import { AnalyticsPage } from './pages/AnalyticsPage'
import { PlaybooksPage } from './pages/PlaybooksPage'
import { ReviewPage } from './pages/ReviewPage'
import { TradesDbPage } from './pages/TradesDbPage'
import { MissedTradesPage } from './pages/MissedTradesPage'
import { WhatsNewPage } from './pages/WhatsNewPage'
import { TradeFormModal } from './components/TradeFormModal'
import { AccountsModal } from './components/AccountsModal'
import { LATEST_VERSION } from './changelog'
import { getLastSeenVersion } from './whatsNewSeen'
import type { Account, Confluence, Strategy } from './types'

const TABS = [
  { key: 'analytics', label: 'Analytics' },
  { key: 'playbooks', label: 'Playbooks' },
  { key: 'review', label: 'Review' },
  { key: 'trades', label: 'Trades' },
  { key: 'missed', label: 'Missed Trades' },
  { key: 'whatsnew', label: "What's New" },
] as const

type TabKey = (typeof TABS)[number]['key']

function App() {
  const [tab, setTab] = useState<TabKey>('analytics')
  const [accounts, setAccounts] = useState<Account[]>([])
  const [strategies, setStrategies] = useState<Strategy[]>([])
  const [confluences, setConfluences] = useState<Confluence[]>([])
  const [refreshKey, setRefreshKey] = useState(0)
  const [showNewTrade, setShowNewTrade] = useState(false)
  const [showAccounts, setShowAccounts] = useState(false)
  const [reviewJumpDate, setReviewJumpDate] = useState<string | null>(null)
  const [seenVersion, setSeenVersion] = useState<string | null>(getLastSeenVersion)

  const loadLookups = () => {
    window.api.accounts.getAll().then(setAccounts)
    window.api.strategies.getAll().then(setStrategies)
    window.api.confluences.getAll().then(setConfluences)
  }

  useEffect(loadLookups, [])

  const bumpRefresh = () => setRefreshKey((k) => k + 1)

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <header style={{ padding: '20px 28px 0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 22 }}>📈</span>
            <h1 style={{ fontSize: 18, letterSpacing: 0.5, margin: 0, fontWeight: 700 }}>TRADE JOURNAL + ANALYTICS</h1>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn" onClick={() => setShowAccounts(true)}>Accounts</button>
            <button className="btn" onClick={() => { setReviewJumpDate(new Date().toISOString().slice(0, 10)); setTab('review') }}>
              + Daily Review
            </button>
            <button className="btn btn-primary" onClick={() => setShowNewTrade(true)}>+ Trade Entry</button>
          </div>
        </div>

        <nav style={{ display: 'flex', gap: 4, borderBottom: '1px solid var(--border)' }}>
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => {
                setTab(t.key)
                if (t.key === 'whatsnew') setSeenVersion(LATEST_VERSION)
              }}
              className="btn"
              style={{
                position: 'relative',
                border: 'none',
                borderRadius: 0,
                borderBottom: tab === t.key ? '2px solid var(--accent)' : '2px solid transparent',
                background: 'transparent',
                color: tab === t.key ? 'var(--text)' : 'var(--text-muted)',
                fontWeight: tab === t.key ? 600 : 400,
                padding: '10px 14px',
              }}
            >
              {t.label}
              {t.key === 'whatsnew' && seenVersion !== LATEST_VERSION && (
                <span
                  aria-label="new updates"
                  style={{
                    position: 'absolute',
                    top: 6,
                    right: 2,
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    background: 'var(--accent)',
                  }}
                />
              )}
            </button>
          ))}
        </nav>
      </header>

      <main style={{ padding: 24, flex: 1 }}>
        {tab === 'analytics' && (
          <AnalyticsPage
            accounts={accounts}
            strategies={strategies}
            confluences={confluences}
            onConfluencesChanged={loadLookups}
            refreshKey={refreshKey}
            bumpRefresh={bumpRefresh}
          />
        )}
        {tab === 'playbooks' && <PlaybooksPage refreshKey={refreshKey} onStrategiesChanged={loadLookups} />}
        {tab === 'review' && <ReviewPage jumpToDate={reviewJumpDate} />}
        {tab === 'trades' && (
          <TradesDbPage
            accounts={accounts}
            strategies={strategies}
            confluences={confluences}
            onConfluencesChanged={loadLookups}
            refreshKey={refreshKey}
            bumpRefresh={bumpRefresh}
          />
        )}
        {tab === 'missed' && (
          <MissedTradesPage
            strategies={strategies}
            confluences={confluences}
            onConfluencesChanged={loadLookups}
            refreshKey={refreshKey}
            bumpRefresh={bumpRefresh}
          />
        )}
        {tab === 'whatsnew' && <WhatsNewPage />}
      </main>

      {showNewTrade && (
        <TradeFormModal
          accounts={accounts}
          strategies={strategies}
          confluences={confluences}
          onConfluencesChanged={loadLookups}
          onClose={() => setShowNewTrade(false)}
          onSaved={bumpRefresh}
        />
      )}

      {showAccounts && (
        <AccountsModal
          accounts={accounts}
          onClose={() => setShowAccounts(false)}
          onChanged={loadLookups}
        />
      )}
    </div>
  )
}

export default App
