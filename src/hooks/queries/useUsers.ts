import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getAllCadets, getAllOfficers, getUserById,
  getCadetsByPlatoon, updateUser, deactivateUser,
  reactivateUser, getArchivedUsers, getUserCountByRole,
  resetUserPassword
} from '@/services/users.service'

export const USER_KEYS = {
  all: ['users'] as const,
  cadets: () => [...USER_KEYS.all, 'cadets'] as const,
  officers: () => [...USER_KEYS.all, 'officers'] as const,
  byId: (id: string) => [...USER_KEYS.all, id] as const,
  byPlatoon: (platoon: string) => [...USER_KEYS.cadets(), 'platoon', platoon] as const,
  archived: () => [...USER_KEYS.all, 'archived'] as const,
  counts: () => [...USER_KEYS.all, 'counts'] as const,
}

export function useAllCadets() {
  return useQuery({ queryKey: USER_KEYS.cadets(), queryFn: getAllCadets })
}

export function useAllOfficers() {
  return useQuery({ queryKey: USER_KEYS.officers(), queryFn: getAllOfficers })
}

export function useUserById(id: string | null | undefined) {
  return useQuery({
    queryKey: USER_KEYS.byId(id ?? ''),
    queryFn: () => getUserById(id!),
    enabled: !!id
  })
}

export function useCadetsByPlatoon(platoon: string | null | undefined) {
  return useQuery({
    queryKey: USER_KEYS.byPlatoon(platoon ?? ''),
    queryFn: () => getCadetsByPlatoon(platoon!),
    enabled: !!platoon
  })
}

export function useArchivedUsers() {
  return useQuery({ queryKey: USER_KEYS.archived(), queryFn: getArchivedUsers })
}

export function useUserCounts() {
  return useQuery({ queryKey: USER_KEYS.counts(), queryFn: getUserCountByRole })
}

export function useUpdateUser() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Parameters<typeof updateUser>[1] }) =>
      updateUser(id, updates),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: USER_KEYS.byId(id) })
      qc.invalidateQueries({ queryKey: USER_KEYS.all })
    }
  })
}

export function useDeactivateUser() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: deactivateUser,
    onSuccess: () => qc.invalidateQueries({ queryKey: USER_KEYS.all })
  })
}

export function useReactivateUser() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: reactivateUser,
    onSuccess: () => qc.invalidateQueries({ queryKey: USER_KEYS.all })
  })
}

export function useResetUserPassword() {
  return useMutation({
    mutationFn: ({ id, newPassword }: { id: string; newPassword: string }) =>
      resetUserPassword(id, newPassword)
  })
}
