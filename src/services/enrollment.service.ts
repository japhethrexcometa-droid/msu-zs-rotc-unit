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
  // Fetch the current user session so we can attach the JWT manually
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token;
  if (!token) throw new Error("You must be logged in to approve requests.");

  // Call the Vercel Serverless Function instead of the Supabase Edge Function
  const response = await fetch('/api/process-enrollment', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      type: 'approve',
      requestId: request.id,
      email: request.email,
      firstName: request.first_name,
      idNumber: request.id_number,
      fullRequestData: request
    })
  });

  const result = await response.json();

  if (!response.ok || !result.success) {
    throw new Error("Failed to process enrollment: " + (result.error || response.statusText));
  }
}

export async function rejectEnrollment(
  request: any, 
  reviewerId: string,
  reason: string
): Promise<void> {
  const { data, error } = await supabase.functions.invoke('process-enrollment', {
    body: {
      type: 'reject',
      requestId: request.id,
      email: request.email,
      firstName: request.first_name,
      rejectionReason: reason
    }
  });

  if (error) throw new Error("Failed to reject enrollment: " + error.message);
  if (!data?.success) throw new Error(data?.error || "Failed to reject enrollment");
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
