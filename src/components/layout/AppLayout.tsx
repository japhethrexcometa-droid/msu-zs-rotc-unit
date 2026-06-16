import { useState, type ReactNode } from 'react'
import { useAuthStore } from '@/stores/auth.store'
import Sidebar from './Sidebar'
import MobileNav from './MobileNav'
import { Menu, Bell } from 'lucide-react'

interface AppLayoutProps {
  children: ReactNode
  title?: string
}

export default function AppLayout({ children, title }: AppLayoutProps) {
  const [drawerOpen, setDrawerOpen] = useState(false)
  const { session } = useAuthStore()

  return (
    <div className="min-h-screen bg-rotc-bg">
      {/* Sidebar — desktop fixed, mobile drawer */}
      <Sidebar open={drawerOpen} onClose={() => setDrawerOpen(false)} />

      {/* Main content area */}
      <div className="md:pl-64 flex flex-col min-h-screen">
        {/* Mobile top bar */}
        <header className="md:hidden sticky top-0 z-20 flex items-center justify-between px-4 py-3 bg-rotc-card/95 backdrop-blur-lg border-b border-rotc-border safe-top">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setDrawerOpen(true)}
              className="p-2 -ml-2 rounded-lg text-rotc-textMuted hover:text-rotc-text hover:bg-rotc-cardHover transition-colors"
              aria-label="Open menu"
            >
              <Menu className="h-5 w-5" />
            </button>
            {title && (
              <h1 className="text-base font-semibold text-rotc-text truncate">{title}</h1>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button className="p-2 rounded-lg text-rotc-textMuted hover:text-rotc-text hover:bg-rotc-cardHover transition-colors relative">
              <Bell className="h-5 w-5" />
            </button>
            {session && (
              <div className="w-8 h-8 rounded-full bg-rotc-accent/20 flex items-center justify-center">
                {session.photo_url ? (
                  <img src={session.photo_url} alt="" className="w-8 h-8 rounded-full object-cover" />
                ) : (
                  <span className="text-xs font-semibold text-rotc-accent">
                    {session.full_name.charAt(0).toUpperCase()}
                  </span>
                )}
              </div>
            )}
          </div>
        </header>

        {/* Desktop top bar */}
        {title && (
          <header className="hidden md:flex items-center justify-between px-8 py-5 border-b border-rotc-border/50">
            <h1 className="text-xl font-bold text-rotc-text">{title}</h1>
            <div className="flex items-center gap-3">
              <button className="p-2 rounded-lg text-rotc-textMuted hover:text-rotc-text hover:bg-rotc-cardHover transition-colors relative">
                <Bell className="h-5 w-5" />
              </button>
            </div>
          </header>
        )}

        {/* Page content */}
        <main className="flex-1 p-4 md:p-8 pb-20 md:pb-8">
          {children}
        </main>
      </div>

      {/* Mobile bottom nav */}
      <MobileNav />
    </div>
  )
}
