import { create } from 'zustand'
import { persist, subscribeWithSelector, createJSONStorage } from 'zustand/middleware'

export type UserRole = 'admin' | 'officer' | 'cadet'

export interface UserSession {
  id: string
  id_number: string
  full_name: string
  role: UserRole
  platoon: string | null
  designation: string | null
  photo_url: string | null
  is_active: boolean
  expires_at: number
  created_at: number
  last_activity: number
}

interface AuthState {
  session: UserSession | null
  isLoading: boolean
  error: string | null
  login: (session: UserSession) => void
  logout: () => void
  isExpired: () => boolean
  refreshActivity: () => void
  getRouteForRole: () => string
  setLoading: (v: boolean) => void
  setError: (e: string | null) => void
}

const SESSION_DURATION: Record<UserRole, number> = {
  admin:   12 * 60 * 60 * 1000,  // 12 hours (for long enrollment work)
  officer: 8 * 60 * 60 * 1000,   // 8 hours
  cadet:   4 * 60 * 60 * 1000,   // 4 hours
}

export const useAuthStore = create<AuthState>()(
  subscribeWithSelector(
    persist(
      (set, get) => ({
        session: null,
        isLoading: false,
        error: null,

        login: (sessionData) => {
          const now = Date.now()
          set({
            session: {
              ...sessionData,
              expires_at: now + SESSION_DURATION[sessionData.role],
              created_at: now,
              last_activity: now
            },
            error: null
          })
        },

        logout: () => set({ session: null, error: null }),

        isExpired: () => {
          const { session } = get()
          if (!session) return true
          return Date.now() > session.expires_at
        },

        refreshActivity: () => {
          const { session } = get()
          if (!session) return
          const now = Date.now()
          const timeLeft = session.expires_at - now
          if (timeLeft < 60 * 60 * 1000) {
            set({ session: { ...session, expires_at: now + SESSION_DURATION[session.role], last_activity: now } })
          } else {
            set({ session: { ...session, last_activity: now } })
          }
        },

        getRouteForRole: () => {
          const role = get().session?.role
          if (role === 'admin') return '/admin/dashboard'
          if (role === 'officer') return '/officer/dashboard'
          if (role === 'cadet') return '/cadet/dashboard'
          return '/'
        },

        setLoading: (v) => set({ isLoading: v }),
        setError: (e) => set({ error: e }),
      }),
      {
        name: 'rotc_user_session',
        partialize: (state) => ({ session: state.session }),
        storage: createJSONStorage(() => sessionStorage)
      }
    )
  )
)
