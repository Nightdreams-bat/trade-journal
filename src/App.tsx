import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { usePrefersReducedMotion } from './anim'
import { AnalyticsPage } from './pages/AnalyticsPage'
import { PlaybooksPage } from './pages/PlaybooksPage'
import { ReviewPage } from './pages/ReviewPage'
import { TradesDbPage } from './pages/TradesDbPage'
import { MissedTradesPage } from './pages/MissedTradesPage'
import { WhatsNewPage } from './pages/WhatsNewPage'
import { TradeFormModal } from './components/TradeFormModal'
import { AccountsModal } from './components/AccountsModal'
import { AmbientBackground } from './components/AmbientBackground'
import { CursorFollower } from './components/CursorFollower'
import { GlassRail } from './components/GlassRail'
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
  const reducedMotion = usePrefersReducedMotion()

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', position: 'relative' }}>
      <AmbientBackground />
      <CursorFollower />
      <header style={{ padding: '22px 32px 0', position: 'relative', zIndex: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 20 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            <span className="mono-label">// Trading Journal &middot; Analytics</span>
            <h1 style={{ fontSize: 34, margin: 0, fontWeight: 340, lineHeight: 1 }}>
              Trade <span className="accent-word">Journal</span>
            </h1>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn" onClick={() => setShowAccounts(true)}>Accounts</button>
            <button className="btn" onClick={() => { setReviewJumpDate(new Date().toISOString().slice(0, 10)); setTab('review') }}>
              + Daily Review
            </button>
            <button className="btn btn-primary" onClick={() => setShowNewTrade(true)}>+ Trade Entry</button>
          </div>
        </div>

        <GlassRail
          role="tablist"
          variant="flush"
          className="liquid-glass liquid-glass--hero"
          style={{ gap: 2, position: 'sticky', top: 0, zIndex: 20, padding: '0 8px' }}
        >
          {TABS.map((t, i) => (
            <button
              key={t.key}
              role="tab"
              aria-selected={tab === t.key}
              onClick={() => {
                setTab(t.key)
                if (t.key === 'whatsnew') setSeenVersion(LATEST_VERSION)
              }}
              className="btn"
              style={{
                position: 'relative',
                border: 'none',
                borderRadius: 0,
                borderBottom: '1px solid transparent',
                background: 'transparent',
                color: tab === t.key ? 'var(--text-strong)' : 'var(--text-muted)',
                fontWeight: 500,
                letterSpacing: '0.02em',
                padding: '10px 14px',
              }}
            >
              <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 9,
                  letterSpacing: '0.1em',
                  color: tab === t.key ? 'var(--accent)' : 'var(--text-dim)',
                  marginRight: 7,
                }}
              >
                {String(i + 1).padStart(2, '0')}
              </span>
              {t.label}
              {t.key === 'whatsnew' && seenVersion !== LATEST_VERSION && (
                <span
                  aria-label="new updates"
                  style={{
                    position: 'absolute',
                    top: 7,
                    right: 3,
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    background: 'var(--accent)',
                    boxShadow: '0 0 0 2px var(--accent-bg)',
                  }}
                />
              )}
              {tab === t.key &&
                (reducedMotion ? (
                  <span
                    style={{
                      position: 'absolute',
                      left: 0,
                      right: 0,
                      bottom: -1,
                      height: 1,
                      background: 'var(--accent)',
                    }}
                  />
                ) : (
                  <motion.span
                    layoutId="tab-underline"
                    style={{
                      position: 'absolute',
                      left: 0,
                      right: 0,
                      bottom: -1,
                      height: 1,
                      background: 'var(--accent)',
                    }}
                    transition={{ duration: 0.26, ease: [0.16, 1, 0.3, 1] }}
                  />
                ))}
            </button>
          ))}
        </GlassRail>
      </header>

      <main style={{ padding: 24, flex: 1, position: 'relative', zIndex: 1 }}>
        {(() => {
          const pages = (
            <>
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
            </>
          )
          return reducedMotion ? (
            pages
          ) : (
            <AnimatePresence mode="wait">
              <motion.div
                key={tab}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                style={{ position: 'relative', zIndex: 1 }}
              >
                {pages}
              </motion.div>
            </AnimatePresence>
          )
        })()}
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
