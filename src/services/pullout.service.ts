import { supabase } from '@/lib/supabase'
import type { Database } from '@/lib/database.types'

type PulloutRequest = Database['public']['Tables']['pull_out_requests']['Row']

export async function submitPulloutRequest(officerId: string, reason: string, dateRequested: string): Promise<void> {
  const { error } = await supabase
    .from('pull_out_requests')
    .insert({ officer_id: officerId, reason, date_requested: dateRequested, status: 'pending' })

  if (error) throw error
}

export async function getPulloutRequestsByOfficer(officerId: string): Promise<PulloutRequest[]> {
  const { data, error } = await supabase
    .from('pull_out_requests')
    .select('*')
    .eq('officer_id', officerId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data ?? []
}

export async function getAllPulloutRequests(): Promise<PulloutRequest[]> {
  const { data, error } = await supabase
    .from('pull_out_requests')
    .select('*, officer:officer_id(full_name, id_number, platoon)')
    .order('created_at', { ascending: false })

  if (error) throw error
  return data ?? []
}

export async function reviewPulloutRequest(
  requestId: string,
  status: 'approved' | 'rejected',
  reviewerId: string
): Promise<void> {
  const { error } = await supabase
    .from('pull_out_requests')
    .update({ status, reviewed_by: reviewerId, reviewed_at: new Date().toISOString() })
    .eq('id', requestId)

  if (error) throw error
}
