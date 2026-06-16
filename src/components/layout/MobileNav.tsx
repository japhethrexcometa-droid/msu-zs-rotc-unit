import { Link, useLocation } from 'react-router-dom'
import { useAuthStore } from '@/stores/auth.store'
import {
  LayoutDashboard, Users, QrCode, ClipboardList, BarChart3,
  Calendar, CreditCard, User
} from 'lucide-react'
import type { UserRole } from '@/stores/auth.store'
import type { ReactNode } from 'react'

interface MobileNavItem {
  label: string
  path: string
  icon: ReactNode
}

const adminMobile: MobileNavItem[] = [
  { label: 'Home',       path: '/admin/dashboard',  icon: <LayoutDashboard className="h-5 w-5" /> },
  { label: 'Cadets',     path: '/admin/cadets',     icon: <Users className="h-5 w-5" /> },
  { label: 'Scanner',    path: '/admin/scanner',    icon: <QrCode className="h-5 w-5" /> },
  { label: 'Attendance', path: '/admin/attendance',  icon: <ClipboardList className="h-5 w-5" /> },
  { label: 'Reports',    path: '/admin/reports',    icon: <BarChart3 className="h-5 w-5" /> },
]

const officerMobile: MobileNavItem[] = [
  { label: 'Home',       path: '/officer/dashboard', icon: <LayoutDashboard className="h-5 w-5" /> },
  { label: 'Scanner',    path: '/officer/scanner',   icon: <QrCode className="h-5 w-5" /> },
  { label: 'Platoon',    path: '/officer/platoon',   icon: <Users className="h-5 w-5" /> },
  { label: 'Attendance', path: '/officer/attendance', icon: <ClipboardList className="h-5 w-5" /> },
  { label: 'Calendar',   path: '/officer/calendar',  icon: <Calendar className="h-5 w-5" /> },
]

const cadetMobile: MobileNavItem[] = [
  { label: 'Home',       path: '/cadet/dashboard',  icon: <LayoutDashboard className="h-5 w-5" /> },
  { label: 'Attendance', path: '/cadet/attendance',  icon: <ClipboardList className="h-5 w-5" /> },
  { label: 'Calendar',   path: '/cadet/calendar',   icon: <Calendar className="h-5 w-5" /> },
  { label: 'Digital ID', path: '/cadet/digital-id',  icon: <CreditCard className="h-5 w-5" /> },
  { label: 'Profile',    path: '/cadet/profile',    icon: <User className="h-5 w-5" /> },
]

const mobileNavByRole: Record<UserRole, MobileNavItem[]> = {
  admin: adminMobile,
  officer: officerMobile,
  cadet: cadetMobile,
}

export default function MobileNav() {
  const { session } = useAuthStore()
  const location = useLocation()

  if (!session) return null

  const items = mobileNavByRole[session.role] ?? []

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-rotc-card/95 backdrop-blur-lg border-t border-rotc-border safe-bottom">
      <div className="flex items-center justify-around px-1 py-1.5">
        {items.map((item) => {
          const active = location.pathname === item.path
          return (
            <Link
              key={item.path}
              to={item.path}
              className={[
                'flex flex-col items-center justify-center gap-0.5 py-1.5 px-2 rounded-lg min-w-[56px]',
                'transition-all duration-150',
                active
                  ? 'text-rotc-accent'
                  : 'text-rotc-textMuted active:text-rotc-text',
              ].join(' ')}
            >
              <span className={active ? 'scale-110 transition-transform' : 'transition-transform'}>
                {item.icon}
              </span>
              <span className={[
                'text-[10px] font-medium leading-none',
                active ? 'text-rotc-accent' : '',
              ].join(' ')}>
                {item.label}
              </span>
              {active && (
                <span className="absolute -top-px left-1/2 -translate-x-1/2 w-8 h-0.5 bg-rotc-accent rounded-full" />
              )}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
