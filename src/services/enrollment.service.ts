import { supabase } from '@/lib/supabase'

// enrollment_requests is not in the generated database.types.ts yet.
// Using `any` until `npx supabase gen types` is re-run to include this table.
type EnrollmentRequest = any

/**
 * Ensures the Supabase auth session is fresh before any RLS-protected query.
 * Without this, the JWT can silently expire, causing auth.uid() → NULL in
 * Postgres RLS, which makes is_admin() return FALSE → empty result set.
 * This is the root cause of enrollment data randomly disappearing.
 */
export async function ensureAuthSession(): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return // Not logged in — let the query fail naturally

  // If the token expires within 120 seconds, force a refresh
  const expiresAt = session.expires_at ?? 0
  const nowSec = Math.floor(Date.now() / 1000)
  if (expiresAt - nowSec < 120) {
    const { error } = await supabase.auth.refreshSession()
    if (error) {
      // Retry once — network glitch or race condition
      const { error: retryError } = await supabase.auth.refreshSession()
      if (retryError) {
        console.error('[ensureAuthSession] Session refresh failed after retry:', retryError.message)
        // Don't throw — let the query attempt with current token
        // The RLS will return empty results but at least we log the cause
      }
    }
  }
}

export async function getPaginatedEnrollmentRequests(
  page: number,
  pageSize: number,
  status: 'pending' | 'approved' | 'rejected',
  searchQuery: string = ''
): Promise<{ data: EnrollmentRequest[], count: number }> {
  await ensureAuthSession()

  let query = supabase
    .from('enrollment_requests')
    .select('*', { count: 'exact' })
    .eq('status', status)

  if (searchQuery) {
    // Search by name or ID number
    query = query.or(`id_number.ilike.%${searchQuery}%,first_name.ilike.%${searchQuery}%,last_name.ilike.%${searchQuery}%`)
  }

  // Order based on status
  if (status === 'pending') {
    query = query.order('created_at', { ascending: true })
  } else {
    query = query.order('reviewed_at', { ascending: false })
  }

  // Pagination
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1
  query = query.range(from, to)

  const { data, error, count } = await query

  if (error) throw error
  return { data: data ?? [], count: count ?? 0 }
}

/**
 * @deprecated Use getPaginatedEnrollmentRequests() for paginated queries.
 * Fetches ALL enrollment requests (all statuses) — used by the admin dashboard.
 */
export async function getAllEnrollmentRequests(): Promise<EnrollmentRequest[]> {
  await ensureAuthSession()

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
