import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import { useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { 
  getPaginatedEnrollmentRequests,
  getEnrollmentStats,
  getAllEnrollmentRequests, 
  approveEnrollment, 
  rejectEnrollment,
  bulkApproveEnrollments,
  bulkRejectEnrollments,
  archiveEnrollments,
  getEnrollmentArchives,
  importEnrollmentArchives
} from '@/services/enrollment.service'

export const ENROLLMENT_KEYS = {
  all: ['enrollment'] as const,
  requests: (status?: string, search?: string, page?: number, sort?: any, school?: string) =>
    [...ENROLLMENT_KEYS.all, 'requests', { status, search, page, sort, school }] as const,
  stats: (status?: string) => [...ENROLLMENT_KEYS.all, 'stats', { status }] as const,
}

/**
 * Fetches enrollment requests with search and pagination support.
 * - refetchInterval: 15s polling → ensures data always appears even without Realtime
 * - Supabase Realtime subscription → instant updates when publication is configured
 * - refetchOnWindowFocus → picks up changes when admin returns to tab
 * - staleTime: 0 → always re-validates on mount
 * 
 * The auth session is refreshed before every query (in enrollment.service.ts)
 * to prevent RLS is_admin() from returning false due to stale JWT tokens.
 */
export function useEnrollmentRequests(
  status: 'pending' | 'approved' | 'rejected',
  searchQuery: string = '',
  page: number = 1,
  pageSize: number = 20,
  sortBy?: string,
  sortOrder?: 'asc' | 'desc',
  school?: string
) {
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
    queryKey: ENROLLMENT_KEYS.requests(status, searchQuery, page, { sortBy, sortOrder }, school),
    queryFn: () => getPaginatedEnrollmentRequests(page, pageSize, status, searchQuery, sortBy, sortOrder, school),
    staleTime: 5_000,
    refetchOnWindowFocus: true,
    refetchOnMount: 'always',
    // Poll every 30 seconds — Realtime subscription handles instant updates
    refetchInterval: 30_000,
    placeholderData: keepPreviousData,
  })
}

export function useEnrollmentStats(status: 'pending' | 'approved' | 'rejected') {
  return useQuery({
    queryKey: ENROLLMENT_KEYS.stats(status),
    queryFn: () => getEnrollmentStats(status),
    staleTime: 0,
    refetchOnWindowFocus: true,
    refetchOnMount: 'always',
    refetchInterval: 30_000,
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

    // Optimistic update: remove the row from pending cache so it disappears instantly
    onMutate: async ({ request }) => {
      await queryClient.cancelQueries({ queryKey: ENROLLMENT_KEYS.all })
      const previousQueries = queryClient.getQueriesData({ queryKey: ENROLLMENT_KEYS.requests() })

      // Remove the approved row from ALL cached request lists (pending tab)
      queryClient.setQueriesData<any>({ queryKey: ENROLLMENT_KEYS.requests() }, (old: any) => {
        if (!old?.data) return old
        return {
          ...old,
          data: old.data.filter((r: any) => r.id !== request.id),
          count: Math.max(0, (old.count || 0) - 1)
        }
      })

      return { previousQueries }
    },

    onError: (_err, _vars, context) => {
      // Rollback all cached queries on failure
      if (context?.previousQueries) {
        for (const [key, data] of context.previousQueries) {
          queryClient.setQueryData(key, data)
        }
      }
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ENROLLMENT_KEYS.all })
    },
  })
}

export function useExportEnrollments() {
  return useMutation({
    mutationFn: ({ status, search }: { status: string, search: string }) =>
      getAllEnrollmentRequests(status, search),
  })
}

export function useBulkRejectEnrollments() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ requestIds, reason }: { requestIds: string[], reason: string }) =>
      bulkRejectEnrollments(requestIds, reason),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ENROLLMENT_KEYS.all })
    },
  })
}

export function useBulkApproveEnrollments() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (requestIds: string[]) => bulkApproveEnrollments(requestIds),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ENROLLMENT_KEYS.all })
    },
  })
}

export function useArchiveEnrollments() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: { requestIds?: string[], academicYear: string, archiveAllProcessed?: boolean, status?: string }) =>
      archiveEnrollments(payload),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ENROLLMENT_KEYS.all })
    },
  })
}

export function useEnrollmentArchives(params: { searchQuery?: string, academicYear?: string, page?: number, pageSize?: number }) {
  return useQuery({
    queryKey: ['enrollment-archives', params],
    queryFn: () => getEnrollmentArchives(params),
    staleTime: 60_000,
  })
}

export function useImportEnrollmentArchives() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: { records: any[], academicYear: string }) =>
      importEnrollmentArchives(payload),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['enrollment-archives'] })
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

    // Optimistic update: remove the row from pending cache so it disappears instantly
    onMutate: async ({ request }) => {
      await queryClient.cancelQueries({ queryKey: ENROLLMENT_KEYS.all })
      const previousQueries = queryClient.getQueriesData({ queryKey: ENROLLMENT_KEYS.requests() })

      // Remove the rejected row from ALL cached request lists (pending tab)
      queryClient.setQueriesData<any>({ queryKey: ENROLLMENT_KEYS.requests() }, (old: any) => {
        if (!old?.data) return old
        return {
          ...old,
          data: old.data.filter((r: any) => r.id !== request.id),
          count: Math.max(0, (old.count || 0) - 1)
        }
      })

      return { previousQueries }
    },

    onError: (_err, _vars, context) => {
      // Rollback all cached queries on failure
      if (context?.previousQueries) {
        for (const [key, data] of context.previousQueries) {
          queryClient.setQueryData(key, data)
        }
      }
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ENROLLMENT_KEYS.all })
    },
  })
}

export function useDeleteEnrollmentRequests() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (requestIds: string[]) => {
      const { error } = await supabase.from('enrollment_requests').delete().in('id', requestIds)
      if (error) throw error
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ENROLLMENT_KEYS.all })
    },
  })
}
