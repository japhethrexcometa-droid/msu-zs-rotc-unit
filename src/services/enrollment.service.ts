import { supabase } from '@/lib/supabase'

// enrollment_requests is not in the generated database.types.ts yet.
// Using `any` until `npx supabase gen types` is re-run to include this table.
type EnrollmentRequest = any

export async function getAllEnrollmentRequests(): Promise<EnrollmentRequest[]> {
  const { data, error } = await supabase
    .from('enrollment_requests')
    .select('*')
    .order('created_at', { ascending: false })

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
  // Use the same Vercel serverless API as approveEnrollment
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token;
  if (!token) throw new Error("You must be logged in to reject requests.");

  const response = await fetch('/api/process-enrollment', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      type: 'reject',
      requestId: request.id,
      email: request.email,
      firstName: request.first_name,
      rejectionReason: reason
    })
  });

  const result = await response.json();

  if (!response.ok || !result.success) {
    throw new Error("Failed to reject enrollment: " + (result.error || response.statusText));
  }
}
