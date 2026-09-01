import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { usePrefersReducedMotion } from './anim'
import { HomePage } from './pages/HomePage'
import { AnalyticsPage } from './pages/AnalyticsPage'
import { TradingPlanPage } from './pages/TradingPlanPage'
import { PlaybooksPage } from './pages/PlaybooksPage'
import { ReviewPage } from './pages/ReviewPage'
import { TradesDbPage } from './pages/TradesDbPage'
import { MissedTradesPage } from './pages/MissedTradesPage'
import { WhatsNewPage } from './pages/WhatsNewPage'
import { TradeFormModal } from './components/TradeFormModal'
import { AccountsModal } from './components/AccountsModal'
import { SettingsModal } from './components/SettingsModal'
import { AmbientRoom } from './components/AmbientRoom'
import { SpatialStage } from './components/SpatialStage'
import { NavRail } from './components/NavRail'
import { UtilityPanel } from './components/UtilityPanel'
import { CenterPanel, type HeroShift } from './components/CenterPanel'
import { HeroHeader } from './components/HeroHeader'
import { EdgeHandle } from './components/EdgeHandle'
import { Scrim } from './components/Scrim'
import { LATEST_VERSION } from './changelog'
import { getLastSeenVersion } from './whatsNewSeen'
import { useThemeMode } from './themeMode'
import { TABS, type TabKey } from './tabs'
import { greeting } from './format'
import type { Account, Confluence, Strategy } from './types'

type UtilitySection = 'calendar' | 'profile'

const HERO_SHIFTS: Record<'none' | 'utility' | 'nav' | 'both', HeroShift> = {
  none: { x: 0, scale: 1 },
  utility: { x: -64, scale: 0.99 },
  nav: { x: 52, scale: 0.99 },
  both: { x: -18, scale: 0.98 },
}

function App() {
  const [tab, setTab] = useState<TabKey>('home')
  const [accounts, setAccounts] = useState<Account[]>([])
  const [strategies, setStrategies] = useState<Strategy[]>([])
  const [confluences, setConfluences] = useState<Confluence[]>([])
  const [refreshKey, setRefreshKey] = useState(0)
  const [showNewTrade, setShowNewTrade] = useState(false)
  const [showAccounts, setShowAccounts] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [reviewJumpDate, setReviewJumpDate] = useState<string | null>(null)
  const [seenVersion, setSeenVersion] = useState<string | null>(getLastSeenVersion)
  const [themeMode, toggleTheme] = useThemeMode()

  const [navOpen, setNavOpen] = useState(false)
  const [utilityOpen, setUtilityOpen] = useState(false)
  const [utilitySection, setUtilitySection] = useState<UtilitySection>('calendar')
  const [isNarrow, setIsNarrow] = useState(false)

  const loadLookups = () => {
    window.api.accounts.getAll().then(setAccounts)
    window.api.strategies.getAll().then(setStrategies)
    window.api.confluences.getAll().then(setConfluences)
  }

  useEffect(loadLookups, [])

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 1100px)')
    const sync = () => setIsNarrow(mq.matches)
    sync()
    mq.addEventListener('change', sync)
    return () => mq.removeEventListener('change', sync)
  }, [])

  const bumpRefresh = () => setRefreshKey((k) => k + 1)
  const reducedMotion = usePrefersReducedMotion()

  const closePanels = () => {
    setNavOpen(false)
    setUtilityOpen(false)
  }

  const openUtility = (section: UtilitySection) => {
    setUtilitySection(section)
    setUtilityOpen(true)
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closePanels()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const goTab = (k: string) => {
    setTab(k as TabKey)
    if (k === 'whatsnew') setSeenVersion(LATEST_VERSION)
  }

  const openDailyReview = () => {
    setReviewJumpDate(new Date().toISOString().slice(0, 10))
    setTab('review')
    closePanels()
  }

  const heroShift = reducedMotion
    ? HERO_SHIFTS.none
    : navOpen && utilityOpen
      ? HERO_SHIFTS.both
      : utilityOpen
        ? HERO_SHIFTS.utility
        : navOpen
          ? HERO_SHIFTS.nav
          : HERO_SHIFTS.none

  const accountLabel = accounts[0] ? `${accounts[0].name} · ${accounts[0].currency}` : 'No account yet'

  // Dim the rest of the scene whenever a side panel is open — the open panel
  // stays lit (it sits above the scrim), everything behind it recedes.
  const scrimShow = navOpen || utilityOpen

  return (
    <div className="app-root" style={{ minHeight: '100vh', position: 'relative' }}>
      <AmbientRoom />

      <SpatialStage navOpen={navOpen} utilityOpen={utilityOpen}>
        <NavRail
          open={navOpen}
          onClose={closePanels}
          tabs={TABS}
          active={tab}
          onSelect={(k) => {
            goTab(k)
            if (isNarrow) closePanels()
          }}
          showWhatsNewDot={seenVersion !== LATEST_VERSION}
          onAccounts={() => setShowAccounts(true)}
          onDailyReview={openDailyReview}
        />

        <EdgeHandle side="left" hidden={navOpen} onOpen={() => setNavOpen(true)} label="Open navigation" />

        <CenterPanel shift={heroShift}>
          <HeroHeader
            greeting={greeting()}
            accountLabel={accountLabel}
            showWhatsNewDot={seenVersion !== LATEST_VERSION}
            themeMode={themeMode}
            onToggleTheme={toggleTheme}
            onNewTrade={() => setShowNewTrade(true)}
            onOpenCalendar={() => openUtility('calendar')}
            onOpenProfile={() => openUtility('profile')}
          />

          <main className="hero-main">
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
                  {tab === 'plan' && <TradingPlanPage strategies={strategies} />}
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
                    initial={{ opacity: 0, y: 8 }}
                    animate={{
                      opacity: 1,
                      y: 0,
                      transition: { duration: 0.22, ease: [0.16, 1, 0.3, 1] },
                    }}
                    exit={{
                      opacity: 0,
                      y: -6,
                      transition: { duration: 0.1, ease: 'easeIn' },
                    }}
                    style={{ position: 'relative', zIndex: 1, willChange: 'transform, opacity' }}
                  >
                    {pages}
                  </motion.div>
                </AnimatePresence>
              )
            })()}
          </main>
        </CenterPanel>

        <UtilityPanel
          open={utilityOpen}
          onClose={closePanels}
          section={utilitySection}
          onSectionChange={setUtilitySection}
          onManageAccounts={() => setShowAccounts(true)}
          onOpenSettings={() => setShowSettings(true)}
          accounts={accounts}
          strategies={strategies}
          refreshKey={refreshKey}
        />

        <Scrim show={scrimShow} onClick={closePanels} />
      </SpatialStage>

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

      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}
    </div>
  )
}

export default App
