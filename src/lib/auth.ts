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
    const dummyEmail = `${idNumber.trim().toUpperCase()}@rotc.msubuug.edu.ph`
    
    // 1. Authenticate with Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: dummyEmail,
      password: password
    })

    if (authError) {
      if (authError.message?.includes('network')) {
        throw new AuthError('Network error. Check your connection.', 'NETWORK_ERROR')
      }
      throw new AuthError('Invalid ID number or password.', 'INVALID_CREDENTIALS')
    }

    if (!authData.user) {
      throw new AuthError('Login failed. Please try again.', 'SERVER_ERROR')
    }

    // 2. Fetch User Profile from public.users
    const { data: userProfile, error: profileError } = await supabase
      .from('users')
      .select('*')
      .eq('id', authData.user.id)
      .single()

    if (profileError || !userProfile) {
      // If profile doesn't exist but auth succeeded, something is broken. 
      // Force signout to prevent orphan sessions.
      await supabase.auth.signOut()
      throw new AuthError('User profile not found. Please contact an admin.', 'SERVER_ERROR')
    }

    if (!userProfile.is_active) {
      await supabase.auth.signOut()
      throw new AuthError('Account is deactivated. Please contact an admin.', 'ACCOUNT_INACTIVE')
    }

    const session: UserSession = {
      id: userProfile.id,
      id_number: userProfile.id_number,
      full_name: userProfile.full_name,
      role: userProfile.role as UserRole,
      platoon: userProfile.platoon,
      designation: userProfile.designation,
      photo_url: userProfile.photo_url,
      is_active: true,
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

export async function logoutUser(): Promise<void> {
  await supabase.auth.signOut()
  useAuthStore.getState().logout()
}

export async function changePassword(currentPassword: string, newPassword: string): Promise<void> {
  try {
    // 0. Prevent trivial password reuse (UX guardrail)
    if (currentPassword === newPassword) {
      throw new AuthError('New password must be different from your current password.', 'INVALID_CREDENTIALS')
    }

    // 1. Verify current password by re-authenticating with Supabase Auth.
    //    This ensures the user knows their current password before changing it.
    //    Note: signInWithPassword replaces the existing session token, which is
    //    acceptable since updateUser() uses the current active session.
    const { session } = useAuthStore.getState()
    if (!session) {
      throw new AuthError('You must be logged in to change your password.', 'SERVER_ERROR')
    }

    const dummyEmail = `${session.id_number.trim().toUpperCase()}@rotc.msubuug.edu.ph`
    
    const { error: verifyError } = await supabase.auth.signInWithPassword({
      email: dummyEmail,
      password: currentPassword
    })

    if (verifyError) {
      throw new AuthError('Current password is incorrect.', 'INVALID_CREDENTIALS')
    }

    // 2. Update password in Supabase Auth
    const { error: updateError } = await supabase.auth.updateUser({
      password: newPassword
    })

    if (updateError) {
      throw new AuthError('Failed to update password. Please try again.', 'SERVER_ERROR')
    }

  } catch (err) {
    if (err instanceof AuthError) throw err
    throw new AuthError('An unexpected error occurred.', 'SERVER_ERROR')
  }
}
