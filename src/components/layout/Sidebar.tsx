import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/auth.store'
import { logoutUser } from '@/lib/auth'
import {
  LayoutDashboard, Users, UserCheck, QrCode, CalendarCheck,
  ClipboardList, BarChart3, CreditCard, Megaphone, UserPlus,
  Settings, Archive, Calendar, LogOut, User, Shield, X, ChevronLeft, Lock, Key
} from 'lucide-react'
import type { UserRole } from '@/stores/auth.store'
import type { ReactNode } from 'react'

interface NavItem {
  label: string
  path: string
  icon: ReactNode
}

const adminNav: NavItem[] = [
  { label: 'Dashboard',     path: '/admin/dashboard',     icon: <LayoutDashboard className="h-5 w-5" /> },
  { label: 'Cadets',        path: '/admin/cadets',        icon: <Users className="h-5 w-5" /> },
  { label: 'Officers',      path: '/admin/officers',      icon: <UserCheck className="h-5 w-5" /> },
  { label: 'QR Scanner',    path: '/admin/scanner',       icon: <QrCode className="h-5 w-5" /> },
  { label: 'Sessions',      path: '/admin/sessions',      icon: <CalendarCheck className="h-5 w-5" /> },
  { label: 'Attendance',    path: '/admin/attendance',     icon: <ClipboardList className="h-5 w-5" /> },
  { label: 'Reports',       path: '/admin/reports',       icon: <BarChart3 className="h-5 w-5" /> },
  { label: 'Digital IDs',   path: '/admin/digital-ids',   icon: <CreditCard className="h-5 w-5" /> },
  { label: 'Announcements', path: '/admin/announcements', icon: <Megaphone className="h-5 w-5" /> },
  { label: 'Enrollment',    path: '/admin/enrollment',    icon: <UserPlus className="h-5 w-5" /> },
  { label: 'Access Codes',  path: '/admin/access-codes',  icon: <Key className="h-5 w-5" /> },
  { label: 'Settings',      path: '/admin/settings',      icon: <Settings className="h-5 w-5" /> },
  { label: 'Archives',      path: '/admin/archives',      icon: <Archive className="h-5 w-5" /> },
  { label: 'Change Password', path: '/admin/change-password', icon: <Lock className="h-5 w-5" /> },
]

const officerNav: NavItem[] = [
  { label: 'Dashboard',     path: '/officer/dashboard',   icon: <LayoutDashboard className="h-5 w-5" /> },
  { label: 'QR Scanner',    path: '/officer/scanner',     icon: <QrCode className="h-5 w-5" /> },
  { label: 'My Platoon',    path: '/officer/platoon',     icon: <Users className="h-5 w-5" /> },
  { label: 'Attendance',    path: '/officer/attendance',   icon: <ClipboardList className="h-5 w-5" /> },
  { label: 'Calendar',      path: '/officer/calendar',    icon: <Calendar className="h-5 w-5" /> },
  { label: 'Pull-out',      path: '/officer/pullout',     icon: <LogOut className="h-5 w-5" /> },
  { label: 'Digital ID',    path: '/officer/digital-id',  icon: <CreditCard className="h-5 w-5" /> },
  { label: 'Profile',       path: '/officer/profile',     icon: <User className="h-5 w-5" /> },
  { label: 'Change Password', path: '/officer/change-password', icon: <Lock className="h-5 w-5" /> },
]

const cadetNav: NavItem[] = [
  { label: 'Dashboard',     path: '/cadet/dashboard',     icon: <LayoutDashboard className="h-5 w-5" /> },
  { label: 'My Attendance', path: '/cadet/attendance',     icon: <ClipboardList className="h-5 w-5" /> },
  { label: 'Calendar',      path: '/cadet/calendar',       icon: <Calendar className="h-5 w-5" /> },
  { label: 'Digital ID',    path: '/cadet/digital-id',     icon: <CreditCard className="h-5 w-5" /> },
  { label: 'Profile',       path: '/cadet/profile',        icon: <User className="h-5 w-5" /> },
  { label: 'Change Password', path: '/cadet/change-password', icon: <Lock className="h-5 w-5" /> },
]

const navByRole: Record<UserRole, NavItem[]> = {
  admin: adminNav,
  officer: officerNav,
  cadet: cadetNav,
}

interface SidebarProps {
  open?: boolean
  onClose?: () => void
}

export default function Sidebar({ open, onClose }: SidebarProps) {
  const { session } = useAuthStore()
  const location = useLocation()
  const navigate = useNavigate()

  if (!session) return null

  const navItems = navByRole[session.role] ?? []

  const handleLogout = () => {
    logoutUser()
    navigate('/', { replace: true })
  }

  const isActive = (path: string) => location.pathname === path

  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* Logo area */}
      <div className="px-4 py-5 border-b border-rotc-border flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-rotc-accent/20 flex items-center justify-center flex-shrink-0">
          <Shield className="h-6 w-6 text-rotc-accent" />
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="text-base font-bold text-rotc-text tracking-tight">MSU-ZS ROTC</h1>
          <p className="text-[11px] text-rotc-textMuted uppercase tracking-widest">Attendance System</p>
        </div>
        {/* Close button for mobile drawer */}
        {onClose && (
          <button
            onClick={onClose}
            className="md:hidden p-1.5 rounded-lg text-rotc-textMuted hover:text-rotc-text hover:bg-rotc-cardHover transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-3 px-3 space-y-0.5">
        {navItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            onClick={onClose}
            className={[
              'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium',
              'transition-all duration-150',
              isActive(item.path)
                ? 'bg-rotc-accent/15 text-rotc-accent border-l-2 border-rotc-accent ml-0'
                : 'text-rotc-textMuted hover:text-rotc-text hover:bg-rotc-cardHover',
            ].join(' ')}
          >
            <span className={isActive(item.path) ? 'text-rotc-accent' : ''}>{item.icon}</span>
            <span>{item.label}</span>
          </Link>
        ))}
      </nav>

      {/* User section at bottom */}
      <div className="border-t border-rotc-border p-4 space-y-3">
        {/* User info */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-rotc-accent/20 flex items-center justify-center flex-shrink-0">
            {session.photo_url ? (
              <img src={session.photo_url} alt="" className="w-9 h-9 rounded-full object-cover" />
            ) : (
              <span className="text-sm font-semibold text-rotc-accent">
                {session.full_name.charAt(0).toUpperCase()}
              </span>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-rotc-text truncate">{session.full_name}</p>
            <p className="text-xs text-rotc-textMuted capitalize">{session.role}</p>
          </div>
        </div>

        {/* Sign out */}
        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-rotc-textMuted hover:text-rotc-danger hover:bg-red-900/20 transition-all duration-150"
        >
          <ChevronLeft className="h-4 w-4" />
          <span>Sign Out</span>
        </button>
      </div>
    </div>
  )

  return (
    <>
      {/* Desktop sidebar — always visible on md+ */}
      <aside className="hidden md:flex md:flex-col md:w-64 md:fixed md:inset-y-0 bg-rotc-card border-r border-rotc-border z-30">
        {sidebarContent}
      </aside>

      {/* Mobile drawer overlay */}
      {open && (
        <div className="md:hidden fixed inset-0 z-40">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
          <aside className="relative w-72 h-full bg-rotc-card border-r border-rotc-border animate-slide-in">
            {sidebarContent}
          </aside>
        </div>
      )}
    </>
  )
}
