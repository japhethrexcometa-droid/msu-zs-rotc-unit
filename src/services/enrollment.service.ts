import { supabase } from '@/lib/supabase'
import type { Database } from '@/lib/database.types'

type EnrollmentRequest = Database['public']['Tables']['enrollment_requests']['Row']
type EnrollmentInsert = Database['public']['Tables']['enrollment_requests']['Insert']

export async function submitEnrollmentRequest(
  payload: Omit<EnrollmentInsert, 'status' | 'reviewed_by' | 'reviewed_at'>
): Promise<void> {
  const { error } = await supabase
    .from('enrollment_requests')
    .insert({ ...payload, status: 'pending' })

  if (error) throw error
}

export async function getAllEnrollmentRequests(): Promise<EnrollmentRequest[]> {
  const { data, error } = await supabase
    .from('enrollment_requests')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) throw error
  return data ?? []
}

export async function getPendingEnrollments(): Promise<EnrollmentRequest[]> {
  const { data, error } = await supabase
    .from('enrollment_requests')
    .select('*')
    .eq('status', 'pending')
    .order('created_at', { ascending: true })

  if (error) throw error
  return data ?? []
}

export async function approveEnrollment(
  requestId: string,
  reviewerId: string,
  tempPassword: string
): Promise<void> {
  // This calls an RPC that creates the user + sets temp password + marks request approved
  const { error } = await supabase.rpc('approve_enrollment' as any, {
    p_request_id: requestId,
    p_reviewer_id: reviewerId,
    p_temp_password: tempPassword
  })
  if (error) throw error
}

export async function rejectEnrollment(requestId: string, reviewerId: string): Promise<void> {
  const { error } = await supabase
    .from('enrollment_requests')
    .update({
      status: 'rejected',
      reviewed_by: reviewerId,
      reviewed_at: new Date().toISOString()
    })
    .eq('id', requestId)

  if (error) throw error
}

export async function bulkImportCadets(rows: Omit<EnrollmentInsert, 'status'>[]): Promise<{ success: number; errors: string[] }> {
  const results = await Promise.allSettled(
    rows.map(row =>
      supabase.from('enrollment_requests').insert({ ...row, status: 'pending' })
    )
  )

  const errors: string[] = []
  let success = 0

  results.forEach((result, i) => {
    if (result.status === 'fulfilled' && !result.value.error) {
      success++
    } else {
      errors.push(`Row ${i + 1}: ${result.status === 'rejected' ? result.reason?.message : result.value.error?.message}`)
    }
  })

  return { success, errors }
}
