import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { getAccessCodes, generateAccessCodes, revokeAccessCode, wipeAccessCodes } from '@/services/accesscodes.service'

export const ACCESS_CODE_KEYS = {
  all: ['access_codes'] as const,
  list: () => [...ACCESS_CODE_KEYS.all, 'list'] as const,
}

export function useAccessCodes() {
  const queryClient = useQueryClient()

  // Realtime subscription for codes
  useEffect(() => {
    const channel = supabase
      .channel('access-codes-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'enrollment_access_codes',
        },
        (_payload) => {
          queryClient.invalidateQueries({ queryKey: ACCESS_CODE_KEYS.list() })
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [queryClient])

  return useQuery({
    queryKey: ACCESS_CODE_KEYS.list(),
    queryFn: () => getAccessCodes(),
    staleTime: 0,
    refetchOnWindowFocus: true,
    refetchOnMount: 'always',
    refetchInterval: 15_000,
  })
}

export function useGenerateAccessCodes() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (count: number) => generateAccessCodes(count),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ACCESS_CODE_KEYS.list() })
    },
  })
}

export function useRevokeAccessCode() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => revokeAccessCode(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ACCESS_CODE_KEYS.list() })
    },
  })
}

export function useWipeAccessCodes() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => wipeAccessCodes(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ACCESS_CODE_KEYS.list() })
    },
  })
}
