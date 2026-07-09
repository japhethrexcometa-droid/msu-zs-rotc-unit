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
  searchQuery: string = '',
  sortBy?: string,
  sortOrder?: 'asc' | 'desc',
  school?: string
): Promise<{ data: EnrollmentRequest[], count: number, summary: any, duplicates: string[], existingAccounts: string[], statsBySchool: any, emailQueueCount: number }> {
  await ensureAuthSession();
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token;
  if (!token) throw new Error("Unauthorized");

  const params = new URLSearchParams({
    status,
    searchQuery,
    page: page.toString(),
    pageSize: pageSize.toString()
  });

  if (sortBy) params.append('sortBy', sortBy);
  if (sortOrder) params.append('sortOrder', sortOrder);
  if (school) params.append('school', school);

  const response = await fetch(`/api/admin/enrollment-requests?${params}`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });

  const result = await response.json();
  if (!response.ok || !result.success) {
    throw new Error(result.error || "Failed to fetch enrollment requests");
  }

  return {
    data: result.data,
    count: result.count,
    summary: result.summary,
    duplicates: result.duplicates || [],
    existingAccounts: result.existingAccounts || [],
    statsBySchool: result.statsBySchool || {},
    emailQueueCount: result.emailQueueCount || 0
  };
}

/**
 * @deprecated Use getPaginatedEnrollmentRequests() for paginated queries.
 * Fetches ALL enrollment requests (all statuses) — used by the admin dashboard.
 */
export async function getAllEnrollmentRequests(
  status?: string,
  searchQuery: string = ''
): Promise<EnrollmentRequest[]> {
  await ensureAuthSession();
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token;
  if (!token) throw new Error("Unauthorized");

  const params = new URLSearchParams();
  if (status) params.append('status', status);
  if (searchQuery) params.append('searchQuery', searchQuery);

  const response = await fetch(`/api/admin/enrollment-requests?${params}`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });

  const result = await response.json();
  if (!response.ok || !result.success) {
    throw new Error(result.error || "Failed to fetch enrollment requests");
  }

  return result.data;
}

export async function bulkApproveEnrollments(requestIds: string[]): Promise<any> {
  await ensureAuthSession();
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token;
  if (!token) throw new Error("Unauthorized");

  const response = await fetch('/api/admin/bulk-approve', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ requestIds })
  });

  const result = await response.json();
  if (!response.ok || !result.success) {
    throw new Error(result.error || "Failed to process bulk approval");
  }

  return result;
}

export async function bulkRejectEnrollments(requestIds: string[], reason: string): Promise<any> {
  await ensureAuthSession();
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token;
  if (!token) throw new Error("Unauthorized");

  const response = await fetch('/api/admin/bulk-reject', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ requestIds, reason })
  });

  const result = await response.json();
  if (!response.ok || !result.success) {
    throw new Error(result.error || "Failed to process bulk rejection");
  }

  return result;
}

export async function archiveEnrollments(payload: { requestIds?: string[], academicYear: string, archiveAllProcessed?: boolean }): Promise<any> {
  await ensureAuthSession();
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token;
  if (!token) throw new Error("Unauthorized");

  const response = await fetch('/api/admin/archive-enrollment', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(payload)
  });

  const result = await response.json();
  if (!response.ok || !result.success) {
    throw new Error(result.error || "Failed to archive records");
  }

  return result;
}

export async function getEnrollmentArchives(params: { searchQuery?: string, academicYear?: string, page?: number, pageSize?: number }): Promise<any> {
  await ensureAuthSession();
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token;
  if (!token) throw new Error("Unauthorized");

  const urlParams = new URLSearchParams();
  if (params.searchQuery) urlParams.append('searchQuery', params.searchQuery);
  if (params.academicYear) urlParams.append('academicYear', params.academicYear);
  if (params.page) urlParams.append('page', params.page.toString());
  if (params.pageSize) urlParams.append('pageSize', params.pageSize.toString());

  const response = await fetch(`/api/admin/enrollment-archives?${urlParams}`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });

  const result = await response.json();
  if (!response.ok || !result.success) {
    throw new Error(result.error || "Failed to fetch archives");
  }

  return result;
}

export async function importEnrollmentArchives(payload: { records: any[], academicYear: string }): Promise<any> {
  await ensureAuthSession();
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token;
  if (!token) throw new Error("Unauthorized");

  const response = await fetch('/api/admin/import-archives', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(payload)
  });

  const result = await response.json();
  if (!response.ok || !result.success) {
    throw new Error(result.error || "Failed to import archives");
  }

  return result;
}

export async function approveEnrollment(
  request: any,
  reviewerId: string
): Promise<void> {
  // Fetch the current user session so we can attach the JWT manually
  await ensureAuthSession();
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
  await ensureAuthSession();
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
