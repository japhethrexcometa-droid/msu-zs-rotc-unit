import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { 
  getAllEnrollmentRequests, 
  approveEnrollment, 
  rejectEnrollment 
} from '@/services/enrollment.service'

export const ENROLLMENT_KEYS = {
  all: ['enrollment'] as const,
  requests: () => [...ENROLLMENT_KEYS.all, 'requests'] as const,
}

export function useEnrollmentRequests() {
  return useQuery({
    queryKey: ENROLLMENT_KEYS.requests(),
    queryFn: () => getAllEnrollmentRequests(),
  })
}

export function useApproveEnrollment() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ request, adminId }: { request: any, adminId: string }) => 
      approveEnrollment(request, adminId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ENROLLMENT_KEYS.requests() })
    },
  })
}

export function useRejectEnrollment() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ request, adminId, reason }: { request: any, adminId: string, reason: string }) => 
      rejectEnrollment(request, adminId, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ENROLLMENT_KEYS.requests() })
    },
  })
}
