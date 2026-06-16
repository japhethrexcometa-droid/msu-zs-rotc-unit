import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  submitPulloutRequest, getPulloutRequestsByOfficer,
  getAllPulloutRequests, reviewPulloutRequest
} from '@/services/pullout.service'

export const PULLOUT_KEYS = {
  all: ['pullout'] as const,
  byOfficer: (id: string) => [...PULLOUT_KEYS.all, 'officer', id] as const,
}

export function usePulloutByOfficer(officerId: string | null | undefined) {
  return useQuery({
    queryKey: PULLOUT_KEYS.byOfficer(officerId ?? ''),
    queryFn: () => getPulloutRequestsByOfficer(officerId!),
    enabled: !!officerId,
  })
}

export function useAllPulloutRequests() {
  return useQuery({
    queryKey: PULLOUT_KEYS.all,
    queryFn: getAllPulloutRequests,
  })
}

export function useSubmitPullout() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ officerId, reason, dateRequested }: { officerId: string; reason: string; dateRequested: string }) =>
      submitPulloutRequest(officerId, reason, dateRequested),
    onSuccess: (_, { officerId }) => {
      qc.invalidateQueries({ queryKey: PULLOUT_KEYS.byOfficer(officerId) })
      qc.invalidateQueries({ queryKey: PULLOUT_KEYS.all })
    }
  })
}

export function useReviewPullout() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ requestId, status, reviewerId }: { requestId: string; status: 'approved' | 'rejected'; reviewerId: string }) =>
      reviewPulloutRequest(requestId, status, reviewerId),
    onSuccess: () => qc.invalidateQueries({ queryKey: PULLOUT_KEYS.all })
  })
}
