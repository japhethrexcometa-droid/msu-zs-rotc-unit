import { supabase } from './supabase'
import { useAuthStore, type UserSession, type UserRole } from '@/stores/auth.store'

export class AuthError extends Error {
  constructor(
    message: string,
    public code: 'INVALID_CREDENTIALS' | 'ACCOUNT_INACTIVE' | 'NETWORK_ERROR' | 'SERVER_ERROR'
  ) {
    super(message)
    this.name = 'AuthError'
  }
}

export async function loginUser(idNumber: string, password: string): Promise<UserSession> {
  try {
    const { data, error } = await supabase.rpc('verify_login', {
      p_id_number: idNumber.trim().toUpperCase(),
      p_password: password
    })

    if (error) {
      if (error.message?.includes('network') || error.code === 'PGRST') {
        throw new AuthError('Network error. Check your connection.', 'NETWORK_ERROR')
      }
      throw new AuthError('Login failed. Please try again.', 'SERVER_ERROR')
    }

    if (!data || data.length === 0) {
      throw new AuthError('Invalid ID number or password.', 'INVALID_CREDENTIALS')
    }

    const user = data[0]

    if (!user.is_active) {
      throw new AuthError('Your account has been deactivated. Contact your administrator.', 'ACCOUNT_INACTIVE')
    }

    const session: UserSession = {
      id: user.user_id,
      id_number: user.id_number,
      full_name: user.full_name,
      role: user.role as UserRole,
      platoon: user.platoon,
      designation: user.designation,
      photo_url: user.photo_url,
      is_active: user.is_active,
      expires_at: 0,      // set by store
      created_at: 0,      // set by store
      last_activity: 0    // set by store
    }

    useAuthStore.getState().login(session)
    return useAuthStore.getState().session!

  } catch (err) {
    if (err instanceof AuthError) throw err
    throw new AuthError('An unexpected error occurred.', 'SERVER_ERROR')
  }
}

export function logoutUser(): void {
  useAuthStore.getState().logout()
}
