import { useState, type ReactNode } from 'react'
import Sidebar from './Sidebar'
import { Menu } from 'lucide-react'
import { useLayoutStore } from '@/stores/layout.store'

interface AppLayoutProps {
  title: string
  children: ReactNode
}

export default function AppLayout({ title, children }: AppLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const isCollapsed = useLayoutStore((state) => state.isSidebarCollapsed)

  return (
    <div className="min-h-screen bg-rotc-bg">
      {/* Sidebar */}
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main content area — offset by sidebar width on desktop */}
      <div className={`flex flex-col min-h-screen transition-all duration-300 ${isCollapsed ? 'md:pl-20' : 'md:pl-64'}`}>
        {/* Top bar */}
        <header className="sticky top-0 z-20 bg-rotc-bg/80 backdrop-blur-md border-b border-rotc-border px-4 sm:px-6 h-14 flex items-center gap-3">
          {/* Mobile menu toggle */}
          <button
            onClick={() => setSidebarOpen(true)}
            className="md:hidden p-2 -ml-2 rounded-lg text-rotc-textMuted hover:text-rotc-text hover:bg-rotc-cardHover transition-colors"
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </button>

          <h1 className="text-lg font-semibold text-rotc-text truncate">{title}</h1>
        </header>

        {/* Page content */}
        <main className="flex-1 p-4 sm:p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
