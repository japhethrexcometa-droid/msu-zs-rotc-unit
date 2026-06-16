import { supabase } from '@/lib/supabase'
import type { Database } from '@/lib/database.types'

type User = Database['public']['Tables']['users']['Row']
type UserUpdate = Database['public']['Tables']['users']['Update']

export async function getAllCadets(): Promise<User[]> {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('role', 'cadet')
    .eq('is_active', true)
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
    .eq('is_active', true)
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

export async function deactivateUser(id: string): Promise<void> {
  const { error } = await supabase
    .from('users')
    .update({ is_active: false })
    .eq('id', id)

  if (error) throw error
}

export async function reactivateUser(id: string): Promise<void> {
  const { error } = await supabase
    .from('users')
    .update({ is_active: true })
    .eq('id', id)

  if (error) throw error
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
