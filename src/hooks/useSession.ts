import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/auth.store'

/** Call this once at the top of any protected page to auto-redirect if expired. */
export function useSession() {
  const { session, isExpired, logout, getRouteForRole } = useAuthStore()
  const navigate = useNavigate()

  useEffect(() => {
    if (!session || isExpired()) {
      logout()
      navigate('/?expired=1', { replace: true })
    }
  }, [])

  return session
}
