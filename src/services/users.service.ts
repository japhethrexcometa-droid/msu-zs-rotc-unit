import { supabase } from '@/lib/supabase'
import type { Database } from '@/lib/database.types'

type User = Database['public']['Tables']['users']['Row']
type UserUpdate = Database['public']['Tables']['users']['Update']

export async function getAllCadets(): Promise<User[]> {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('role', 'cadet')
    .order('platoon', { ascending: true })
    .order('full_name', { ascending: true })

  if (error) throw error
  return data ?? []
}

export async function getAllOfficers(): Promise<User[]> {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('role', 'officer')
    .order('full_name', { ascending: true })

  if (error) throw error
  return data ?? []
}

export async function getUserById(id: string): Promise<User | null> {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', id)
    .single()

  if (error) throw error
  return data
}

export async function getCadetsByPlatoon(platoon: string): Promise<User[]> {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('role', 'cadet')
    .eq('platoon', platoon)
    .eq('is_active', true)
    .order('full_name', { ascending: true })

  if (error) throw error
  return data ?? []
}

export async function updateUser(id: string, updates: UserUpdate): Promise<User> {
  const { data, error } = await supabase
    .from('users')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function hardDeleteUsers(userIds: string[]): Promise<{ deleted: number; message: string }> {
  const { data: sessionData } = await supabase.auth.getSession()
  const token = sessionData.session?.access_token
  if (!token) throw new Error('Not authenticated')

  const response = await fetch('/api/admin/hard-delete-users', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ userIds })
  })

  const result = await response.json()
  if (!response.ok || !result.success) {
    throw new Error(result.error || 'Failed to delete users')
  }
  return { deleted: result.deleted, message: result.message }
}

export async function getArchivedUsers(): Promise<User[]> {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('is_active', false)
    .order('updated_at', { ascending: false })

  if (error) throw error
  return data ?? []
}

export async function getUserCountByRole(): Promise<Record<string, number>> {
  const { data, error } = await supabase
    .from('users')
    .select('role')
    .eq('is_active', true)

  if (error) throw error

  return (data ?? []).reduce((acc, { role }) => {
    acc[role] = (acc[role] ?? 0) + 1
    return acc
  }, {} as Record<string, number>)
}

export async function resetUserPassword(targetUserId: string, newPassword: string): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession()
  
  if (!session) throw new Error('Not authenticated')

  const response = await fetch('/api/reset-password', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.access_token}`
    },
    body: JSON.stringify({
      targetUserId,
      newPassword
    })
  })

  const data = await response.json()
  
  if (!response.ok || !data.success) {
    throw new Error(data.error || 'Failed to reset password')
  }
}
