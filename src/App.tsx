import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { usePrefersReducedMotion } from './anim'
import { HomePage } from './pages/HomePage'
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
import { TopNav } from './components/TopNav'
import { Ornament } from './components/Ornament'
import { LATEST_VERSION } from './changelog'
import { getLastSeenVersion } from './whatsNewSeen'
import type { Account, Confluence, Strategy } from './types'

const TABS = [
  { key: 'home', label: 'Home' },
  { key: 'analytics', label: 'Analytics' },
  { key: 'playbooks', label: 'Playbooks' },
  { key: 'review', label: 'Review' },
  { key: 'trades', label: 'Trades' },
  { key: 'missed', label: 'Missed' },
  { key: 'whatsnew', label: "What's New" },
] as const

type TabKey = (typeof TABS)[number]['key']

function App() {
  const [tab, setTab] = useState<TabKey>('home')
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

  const goTab = (k: string) => {
    setTab(k as TabKey)
    if (k === 'whatsnew') setSeenVersion(LATEST_VERSION)
  }

  const openDailyReview = () => {
    setReviewJumpDate(new Date().toISOString().slice(0, 10))
    setTab('review')
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', position: 'relative' }}>
      <AmbientBackground anchor={{ x: 200 + TABS.findIndex((t) => t.key === tab) * 90, y: 120 }} />
      <CursorFollower />

      <TopNav
        tabs={TABS}
        active={tab}
        onSelect={goTab}
        showWhatsNewDot={seenVersion !== LATEST_VERSION}
        onAccounts={() => setShowAccounts(true)}
        onDailyReview={openDailyReview}
        onTradeEntry={() => setShowNewTrade(true)}
      />

      <main
        style={{
          padding: 'calc(var(--sp-8) + 24px) var(--sp-5) calc(var(--sp-8) + 40px)',
          flex: 1,
          position: 'relative',
          zIndex: 1,
          maxWidth: 1180,
          margin: '0 auto',
          width: '100%',
        }}
      >
        {(() => {
          const pages = (
            <>
              {tab === 'home' && (
                <HomePage
                  accounts={accounts}
                  strategies={strategies}
                  confluences={confluences}
                  onConfluencesChanged={loadLookups}
                  refreshKey={refreshKey}
                  bumpRefresh={bumpRefresh}
                  onNavigate={goTab}
                  onNewTrade={() => setShowNewTrade(true)}
                />
              )}
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
                initial={{ opacity: 0, y: 10, filter: 'blur(8px)' }}
                animate={{
                  opacity: 1,
                  y: 0,
                  filter: 'blur(0px)',
                  transition: { duration: 0.34, ease: [0.16, 1, 0.3, 1] },
                }}
                exit={{
                  opacity: 0,
                  y: -8,
                  filter: 'blur(4px)',
                  transition: { duration: 0.16, ease: 'easeIn' },
                }}
                style={{ position: 'relative', zIndex: 1 }}
              >
                {pages}
              </motion.div>
            </AnimatePresence>
          )
        })()}
      </main>

      <Ornament
        active={tab}
        onHome={() => setTab('home')}
        onSearch={() => setTab('trades')}
        onAdd={() => setShowNewTrade(true)}
        onProfile={() => setShowAccounts(true)}
      />

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
