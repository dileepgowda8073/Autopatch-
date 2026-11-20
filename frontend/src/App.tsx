import React, { Suspense, useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { ErrorBoundary } from '@/components/common/ErrorBoundary'
import { useUiStore } from '@/store/uiStore'

// Layout
import { Sidebar }  from '@/components/layout/Sidebar'
import { TopBar }   from '@/components/layout/TopBar'

// Pages — lazy-loaded for performance
const LandingPage    = React.lazy(() => import('@/pages/LandingPage'))
const UploadPage     = React.lazy(() => import('@/pages/UploadPage'))
const ScanPage       = React.lazy(() => import('@/pages/ScanPage'))
const FindingPage    = React.lazy(() => import('@/pages/FindingPage'))
const PatchPage      = React.lazy(() => import('@/pages/PatchPage'))
const ValidationPage = React.lazy(() => import('@/pages/ValidationPage'))
const HistoryPage    = React.lazy(() => import('@/pages/HistoryPage'))
const HealthPage     = React.lazy(() => import('@/pages/HealthPage'))
const DashboardPage  = React.lazy(() => import('@/pages/DashboardPage'))

// Chat drawer (always rendered, toggled via store)
const ChatDrawer = React.lazy(() =>
  import('@/components/chat/ChatDrawer').then(m => ({ default: m.ChatDrawer }))
)

/** Full-screen spinner shown while lazy chunks load */
function PageLoader() {
  return (
    <div className="flex items-center justify-center h-screen bg-base">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 rounded-full border-2 border-cyan/30 border-t-cyan animate-spin" />
        <p className="text-text-secondary text-sm font-mono">Loading AutoPatch…</p>
      </div>
    </div>
  )
}

/** Wrapper for authenticated/dashboard pages with sidebar + topbar */
function DashboardShell({ children }: { children: React.ReactNode }) {
  const { sidebarOpen, chatDrawerOpen, activeFindingId } = useUiStore()

  return (
    <div className="flex h-screen overflow-hidden bg-base">
      {/* Sidebar */}
      <Sidebar />

      {/* Main content */}
      <div
        className="flex-1 flex flex-col overflow-hidden transition-all duration-300"
        style={{ marginLeft: sidebarOpen ? '16rem' : '0' }}
      >
        <TopBar />
        <main
          id="main-content"
          className="flex-1 overflow-y-auto pt-14 focus:outline-none"
          tabIndex={-1}
        >
          <ErrorBoundary>
            <Suspense fallback={<PageLoader />}>
              {children}
            </Suspense>
          </ErrorBoundary>
        </main>
      </div>

      {/* Chat drawer */}
      <Suspense fallback={null}>
        <ChatDrawer
          findingId={activeFindingId}
          isOpen={chatDrawerOpen}
          onClose={() => useUiStore.getState().setChatDrawerOpen(false)}
        />
      </Suspense>
    </div>
  )
}

export default function App() {
  const { setReducedMotion, setIsMobile } = useUiStore()

  // Track system preferences
  useEffect(() => {
    const motionMql  = window.matchMedia('(prefers-reduced-motion: reduce)')
    const mobileMql  = window.matchMedia('(max-width: 768px)')

    setReducedMotion(motionMql.matches)
    setIsMobile(mobileMql.matches)

    const onMotion = (e: MediaQueryListEvent) => setReducedMotion(e.matches)
    const onMobile = (e: MediaQueryListEvent) => setIsMobile(e.matches)

    motionMql.addEventListener('change', onMotion)
    mobileMql.addEventListener('change', onMobile)
    return () => {
      motionMql.removeEventListener('change', onMotion)
      mobileMql.removeEventListener('change', onMobile)
    }
  }, [setReducedMotion, setIsMobile])

  return (
    <BrowserRouter>
      {/* Global toast notifications */}
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: '#0F1117',
            color: '#F1F5F9',
            border: '1px solid rgba(255,255,255,0.08)',
            fontFamily: 'Inter, sans-serif',
            fontSize: '14px',
          },
          success: { iconTheme: { primary: '#10B981', secondary: '#0F1117' } },
          error:   { iconTheme: { primary: '#EF4444', secondary: '#0F1117' } },
        }}
      />

      <Routes>
        {/* Landing page — no shell */}
        <Route
          path="/"
          element={
            <ErrorBoundary>
              <Suspense fallback={<PageLoader />}>
                <LandingPage />
              </Suspense>
            </ErrorBoundary>
          }
        />

        {/* Dashboard shell pages */}
        <Route
          path="/dashboard"
          element={<DashboardShell><DashboardPage /></DashboardShell>}
        />
        <Route
          path="/upload"
          element={<DashboardShell><UploadPage /></DashboardShell>}
        />
        <Route
          path="/scan"
          element={<DashboardShell><ScanPage /></DashboardShell>}
        />
        <Route
          path="/findings"
          element={<DashboardShell><FindingPage /></DashboardShell>}
        />
        <Route
          path="/findings/:findingId"
          element={<DashboardShell><FindingPage /></DashboardShell>}
        />
        <Route
          path="/patch/:patchId?"
          element={<DashboardShell><PatchPage /></DashboardShell>}
        />
        <Route
          path="/validate/:patchId?"
          element={<DashboardShell><ValidationPage /></DashboardShell>}
        />
        <Route
          path="/history"
          element={<DashboardShell><HistoryPage /></DashboardShell>}
        />
        <Route
          path="/health"
          element={<DashboardShell><HealthPage /></DashboardShell>}
        />

        {/* Catch-all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
