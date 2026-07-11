import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import { useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { 
  getAllEnrollmentRequests, 
  approveEnrollment, 
  rejectEnrollment 
} from '@/services/enrollment.service'

export const ENROLLMENT_KEYS = {
  all: ['enrollment'] as const,
  requests: () => [...ENROLLMENT_KEYS.all, 'requests'] as const,
}

/**
 * Fetches all enrollment requests with:
 * - refetchInterval: 15s polling → ensures data always appears even without Realtime
 * - Supabase Realtime subscription → instant updates when publication is configured
 * - refetchOnWindowFocus → picks up changes when admin returns to tab
 * - staleTime: 0 → always re-validates on mount
 * 
 * The auth session is refreshed before every query (in enrollment.service.ts)
 * to prevent RLS is_admin() from returning false due to stale JWT tokens.
 */
export function useEnrollmentRequests() {
  const queryClient = useQueryClient()

  // Realtime subscription — works if enrollment_requests is in supabase_realtime publication
  // Gracefully does nothing if not configured (polling covers it)
  useEffect(() => {
    const channel = supabase
      .channel('enrollment-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'enrollment_requests',
        },
        (_payload) => {
          queryClient.invalidateQueries({ queryKey: ENROLLMENT_KEYS.requests() })
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [queryClient])

  return useQuery({
    queryKey: ENROLLMENT_KEYS.requests(),
    queryFn: () => getAllEnrollmentRequests(),
    staleTime: 0,
    refetchOnWindowFocus: true,
    refetchOnMount: 'always',
    // Poll every 5 seconds — fast enough for live enrollment intake
    // When thousands of enrollees submit, admin sees new entries within 5s
    refetchInterval: 5_000,
    placeholderData: keepPreviousData,
  })
}

/**
 * Approve enrollment with optimistic update:
 * - Immediately moves the row from 'pending' to 'approved' in cache
 * - Rolls back if the server call fails
 * - Delays invalidation by 500ms to let DB write settle (Bug 3)
 */
export function useApproveEnrollment() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ request, adminId }: { request: any, adminId: string }) => 
      approveEnrollment(request, adminId),

    // Optimistic update: move row to 'approved' instantly in the cache
    onMutate: async ({ request }) => {
      await queryClient.cancelQueries({ queryKey: ENROLLMENT_KEYS.requests() })
      const previous = queryClient.getQueryData<any[]>(ENROLLMENT_KEYS.requests())

      queryClient.setQueryData<any[]>(ENROLLMENT_KEYS.requests(), (old) => {
        if (!old) return old
        return old.map((r) =>
          r.id === request.id
            ? { ...r, status: 'approved', reviewed_at: new Date().toISOString() }
            : r
        )
      })

      return { previous }
    },

    onError: (_err, _vars, context) => {
      // Rollback to previous cache on failure
      if (context?.previous) {
        queryClient.setQueryData(ENROLLMENT_KEYS.requests(), context.previous)
      }
    },

    onSettled: () => {
      // Delay re-fetch to let DB write fully propagate
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ENROLLMENT_KEYS.requests() })
      }, 500)
    },
  })
}

/**
 * Reject enrollment with optimistic update:
 * - Immediately moves the row from 'pending' to 'rejected' in cache
 * - Rolls back if the server call fails
 * - Delays invalidation by 500ms to let DB write settle (Bug 3)
 */
export function useRejectEnrollment() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ request, adminId, reason }: { request: any, adminId: string, reason: string }) => 
      rejectEnrollment(request, adminId, reason),

    // Optimistic update: move row to 'rejected' instantly in the cache
    onMutate: async ({ request, reason }) => {
      await queryClient.cancelQueries({ queryKey: ENROLLMENT_KEYS.requests() })
      const previous = queryClient.getQueryData<any[]>(ENROLLMENT_KEYS.requests())

      queryClient.setQueryData<any[]>(ENROLLMENT_KEYS.requests(), (old) => {
        if (!old) return old
        return old.map((r) =>
          r.id === request.id
            ? { 
                ...r, 
                status: 'rejected', 
                rejection_reason: reason,
                reviewed_at: new Date().toISOString() 
              }
            : r
        )
      })

      return { previous }
    },

    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(ENROLLMENT_KEYS.requests(), context.previous)
      }
    },

    onSettled: () => {
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ENROLLMENT_KEYS.requests() })
      }, 500)
    },
  })
}

