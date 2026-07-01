import { useAuthStore } from '@/stores/auth.store'

/**
 * Convenience hook to access the current user session.
 * Auth guards (expiry redirect, role checks) are handled by ProtectedRoute.
 */
export function useSession() {
  return useAuthStore((s) => s.session)
}
