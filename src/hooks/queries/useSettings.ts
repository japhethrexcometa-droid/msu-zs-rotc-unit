import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getEnrollmentOpenStatus, toggleEnrollmentStatus } from '@/services/settings.service'

export const SETTINGS_KEYS = {
  all: ['settings'] as const,
  enrollmentOpen: () => [...SETTINGS_KEYS.all, 'enrollment_open'] as const,
}

export function useEnrollmentOpen() {
  return useQuery({
    queryKey: SETTINGS_KEYS.enrollmentOpen(),
    queryFn: () => getEnrollmentOpenStatus(),
  })
}

export function useToggleEnrollment() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (isOpen: boolean) => toggleEnrollmentStatus(isOpen),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SETTINGS_KEYS.enrollmentOpen() })
    },
  })
}
