import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getCadets, getOfficers, getUserById,
  getCadetsByPlatoon, updateUser, hardDeleteUsers,
  getArchivedUsers, getUserCountByRole,
  resetUserPassword
} from '@/services/users.service'

export const USER_KEYS = {
  all: ['users'] as const,
  cadets: () => [...USER_KEYS.all, 'cadets'] as const,
  cadetsPaginated: (page: number, pageSize: number, search: string, platoon: string) =>
    [...USER_KEYS.cadets(), 'paginated', page, pageSize, search, platoon] as const,
  officers: () => [...USER_KEYS.all, 'officers'] as const,
  officersPaginated: (page: number, pageSize: number, search: string) =>
    [...USER_KEYS.officers(), 'paginated', page, pageSize, search] as const,
  byId: (id: string) => [...USER_KEYS.all, id] as const,
  byPlatoon: (platoon: string) => [...USER_KEYS.cadets(), 'platoon', platoon] as const,
  archived: () => [...USER_KEYS.all, 'archived'] as const,
  counts: () => [...USER_KEYS.all, 'counts'] as const,
}

export function useAllCadets(page: number = 1, pageSize: number = 20, search: string = '', platoon: string = 'All') {
  return useQuery({
    queryKey: USER_KEYS.cadetsPaginated(page, pageSize, search, platoon),
    queryFn: () => getCadets(page, pageSize, search, platoon),
    placeholderData: (prev) => prev,
  })
}

export function useAllOfficers(page: number = 1, pageSize: number = 20, search: string = '') {
  return useQuery({
    queryKey: USER_KEYS.officersPaginated(page, pageSize, search),
    queryFn: () => getOfficers(page, pageSize, search),
    placeholderData: (prev) => prev,
  })
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

export function useHardDeleteUsers() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: hardDeleteUsers,
    onSuccess: () => qc.invalidateQueries({ queryKey: USER_KEYS.all })
  })
}

export function useResetUserPassword() {
  return useMutation({
    mutationFn: ({ id, newPassword }: { id: string; newPassword: string }) =>
      resetUserPassword(id, newPassword)
  })
}
