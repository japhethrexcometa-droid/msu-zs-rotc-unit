import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getAnnouncements, createAnnouncement,
  updateAnnouncement, deleteAnnouncement, togglePin
} from '@/services/announcements.service'

export const ANNOUNCEMENT_KEYS = {
  all: ['announcements'] as const,
  byRole: (role?: 'officer' | 'cadet') => [...ANNOUNCEMENT_KEYS.all, role ?? 'all'] as const,
}

export function useAnnouncements(role?: 'officer' | 'cadet') {
  return useQuery({
    queryKey: ANNOUNCEMENT_KEYS.byRole(role),
    queryFn: () => getAnnouncements(role),
  })
}

export function useCreateAnnouncement() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: createAnnouncement,
    onSuccess: () => qc.invalidateQueries({ queryKey: ANNOUNCEMENT_KEYS.all })
  })
}

export function useUpdateAnnouncement() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Parameters<typeof updateAnnouncement>[1] }) =>
      updateAnnouncement(id, updates),
    onSuccess: () => qc.invalidateQueries({ queryKey: ANNOUNCEMENT_KEYS.all })
  })
}

export function useDeleteAnnouncement() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: deleteAnnouncement,
    onSuccess: () => qc.invalidateQueries({ queryKey: ANNOUNCEMENT_KEYS.all })
  })
}

export function useTogglePin() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, current }: { id: string; current: boolean }) => togglePin(id, current),
    onSuccess: () => qc.invalidateQueries({ queryKey: ANNOUNCEMENT_KEYS.all })
  })
}
