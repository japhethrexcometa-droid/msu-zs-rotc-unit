import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useEffect } from 'react'
import { useAuthStore } from '@/stores/auth.store'
import { supabase } from './supabase'
import type { UserRole } from '@/stores/auth.store'

interface ProtectedRouteProps {
  allowedRoles: UserRole[]
}

const ROLE_HOME: Record<UserRole, string> = {
  admin: '/admin/dashboard',
  officer: '/officer/dashboard',
  cadet: '/cadet/dashboard',
}

export default function ProtectedRoute({ allowedRoles }: ProtectedRouteProps) {
  const { session, isExpired, logout, refreshActivity } = useAuthStore()
  const location = useLocation()

  useEffect(() => {
    if (!session || isExpired()) return

    supabase.rpc('set_session_context', {
      p_user_id: session.id,
      p_role: session.role
    }).catch(console.error)

    refreshActivity()
  }, [location.pathname])

  if (!session) {
    return <Navigate to="/" state={{ from: location }} replace />
  }

  if (isExpired()) {
    logout()
    return <Navigate to="/?expired=1" replace />
  }

  if (!allowedRoles.includes(session.role)) {
    return <Navigate to={ROLE_HOME[session.role]} replace />
  }

  return <Outlet />
}
