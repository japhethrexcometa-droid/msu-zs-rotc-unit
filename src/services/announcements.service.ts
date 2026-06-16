import { supabase } from '@/lib/supabase'
import type { Database } from '@/lib/database.types'

type Announcement = Database['public']['Tables']['announcements']['Row']
type AnnouncementInsert = Database['public']['Tables']['announcements']['Insert']

export async function getAnnouncements(role?: 'officer' | 'cadet'): Promise<Announcement[]> {
  let query = supabase
    .from('announcements')
    .select('*')
    .order('is_pinned', { ascending: false })
    .order('created_at', { ascending: false })

  if (role) {
    query = query.in('target_role', ['all', role])
  }

  const { data, error } = await query
  if (error) throw error
  return data ?? []
}

export async function createAnnouncement(payload: Omit<AnnouncementInsert, 'created_at' | 'updated_at'>): Promise<void> {
  const { error } = await supabase.from('announcements').insert(payload)
  if (error) throw error
}

export async function updateAnnouncement(id: string, updates: Partial<Announcement>): Promise<void> {
  const { error } = await supabase
    .from('announcements')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
  if (error) throw error
}

export async function deleteAnnouncement(id: string): Promise<void> {
  const { error } = await supabase.from('announcements').delete().eq('id', id)
  if (error) throw error
}

export async function togglePin(id: string, current: boolean): Promise<void> {
  const { error } = await supabase
    .from('announcements')
    .update({ is_pinned: !current })
    .eq('id', id)
  if (error) throw error
}
