import { useState } from 'react'
import { Outlet, useNavigate } from 'react-router-dom'
import Sidebar from '../components/Sidebar'
import { usePullToRefresh } from '../hooks/usePullToRefresh'

function AppLayout() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const navigate = useNavigate()

  // Pull to refresh: reload the current page
  const { pulling, progress } = usePullToRefresh(() => {
    navigate(0)  // React Router's equivalent of window.location.reload()
  })

  return (
    <div className="flex h-screen overflow-hidden bg-stone-100">
      <Sidebar mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} />

      <div className="flex flex-1 flex-col min-w-0">
        {/* Mobile top bar */}
        <header className="sticky top-0 z-40 flex items-center gap-3 border-b border-stone-600 bg-stone-500 px-4 py-3 md:hidden">
          <button
            onClick={() => setMobileOpen(true)}
            className="rounded-lg p-1.5 text-stone-200 hover:bg-stone-600"
            aria-label="Open menu"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <span className="font-serif text-base font-semibold text-white">☕ Roastic</span>

          {/* Pull-to-refresh spinner shown in the header when pulling */}
          {pulling && (
            <span className="ml-auto text-xs text-stone-300">
              {progress >= 1 ? '↑ Release to refresh' : '↓ Pull to refresh'}
            </span>
          )}
        </header>

        <main className="flex-1 overflow-y-auto bg-stone-800">
          <div className="px-4 py-6 md:px-8 md:py-8">
            <Outlet />
          </div>
        </main>
      </div>

      <button
        onClick={() => navigate(0)}
        className="fixed right-4 top-4 z-50 flex h-9 w-9 items-center justify-center rounded-full bg-stone-500 text-stone-100 shadow-sm transition-colors hover:bg-stone-600 hover:text-white"
        aria-label="Refresh"
        title="Refresh"
      >
        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2a8.001 8.001 0 00-15.356-2m0 0H9m11 5v-5h-.581m0 0a8.003 8.003 0 01-15.357 2m15.357-2H15" />
        </svg>
      </button>
    </div>
  )
}

export default AppLayout
