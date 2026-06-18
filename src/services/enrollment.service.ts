import { supabase } from '@/lib/supabase'

// Ensure we don't depend on strict generated types if they are not updated yet
export type EnrollmentRequest = any;

export async function submitEnrollmentRequest(
  payload: any
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
  request: any,
  reviewerId: string
): Promise<void> {
  // 1. Call RPC to approve and create user
  const { data: rpcData, error: rpcError } = await supabase.rpc('approve_enrollment' as any, {
    p_request_id: request.id,
    p_reviewer_id: reviewerId
  })
  
  if (rpcError) throw rpcError;
  if (!rpcData || !rpcData.success) throw new Error(rpcData?.error || "Failed to approve enrollment");

  // 2. Call Edge Function to send email
  if (request.email) {
    try {
      await supabase.functions.invoke('send-enrollment-email', {
        body: {
          type: 'approve',
          email: request.email,
          firstName: request.first_name,
          idNumber: request.id_number
        }
      });
      
      // Update email_sent flag
      await supabase.from('enrollment_requests').update({ email_sent: true }).eq('id', request.id);
    } catch (emailErr) {
      console.error("Failed to send approval email:", emailErr);
      // We don't throw here because the approval itself succeeded
    }
  }
}

export async function rejectEnrollment(
  request: any, 
  reviewerId: string,
  reason: string
): Promise<void> {
  // 1. Update status
  const { error } = await supabase
    .from('enrollment_requests')
    .update({
      status: 'rejected',
      rejection_reason: reason,
      reviewed_by: reviewerId,
      reviewed_at: new Date().toISOString()
    })
    .eq('id', request.id)

  if (error) throw error

  // 2. Call Edge Function to send email
  if (request.email) {
    try {
      await supabase.functions.invoke('send-enrollment-email', {
        body: {
          type: 'reject',
          email: request.email,
          firstName: request.first_name,
          rejectionReason: reason
        }
      });
      
      // Update email_sent flag
      await supabase.from('enrollment_requests').update({ email_sent: true }).eq('id', request.id);
    } catch (emailErr) {
      console.error("Failed to send rejection email:", emailErr);
    }
  }
}

export async function bulkImportCadets(rows: any[]): Promise<{ success: number; errors: string[] }> {
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
