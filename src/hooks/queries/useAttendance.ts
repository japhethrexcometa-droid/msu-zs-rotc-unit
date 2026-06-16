import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getActiveSessions, getAllSessions, getSessionById,
  createSession, endSession, deleteSession,
  scanQrCode, getAttendanceBySession, getAttendanceByUser,
  updateAttendanceStatus, markAbsentForSession, getAttendanceSummary
} from '@/services/attendance.service'

export const ATTENDANCE_KEYS = {
  all: ['attendance'] as const,
  sessions: () => [...ATTENDANCE_KEYS.all, 'sessions'] as const,
  activeSessions: () => [...ATTENDANCE_KEYS.sessions(), 'active'] as const,
  sessionById: (id: string) => [...ATTENDANCE_KEYS.sessions(), id] as const,
  records: () => [...ATTENDANCE_KEYS.all, 'records'] as const,
  bySession: (id: string) => [...ATTENDANCE_KEYS.records(), 'session', id] as const,
  byUser: (uid: string) => [...ATTENDANCE_KEYS.records(), 'user', uid] as const,
  summary: (uid: string) => [...ATTENDANCE_KEYS.all, 'summary', uid] as const,
}

export function useActiveSessions() {
  return useQuery({
    queryKey: ATTENDANCE_KEYS.activeSessions(),
    queryFn: getActiveSessions,
    refetchInterval: 10000, // Poll every 10s
  })
}

export function useAllSessions(limit?: number) {
  return useQuery({
    queryKey: [...ATTENDANCE_KEYS.sessions(), 'all', limit],
    queryFn: () => getAllSessions(limit),
  })
}

export function useSessionById(id: string | null | undefined) {
  return useQuery({
    queryKey: ATTENDANCE_KEYS.sessionById(id ?? ''),
    queryFn: () => getSessionById(id!),
    enabled: !!id,
  })
}

export function useAttendanceBySession(sessionId: string | null | undefined) {
  return useQuery({
    queryKey: ATTENDANCE_KEYS.bySession(sessionId ?? ''),
    queryFn: () => getAttendanceBySession(sessionId!),
    enabled: !!sessionId,
    refetchInterval: 5000, // Poll every 5s for live updates
  })
}

export function useAttendanceByUser(userId: string | null | undefined, startDate?: string, endDate?: string) {
  return useQuery({
    queryKey: [...ATTENDANCE_KEYS.byUser(userId ?? ''), startDate, endDate],
    queryFn: () => getAttendanceByUser(userId!, startDate, endDate),
    enabled: !!userId,
  })
}

export function useAttendanceSummary(userId: string | null | undefined) {
  return useQuery({
    queryKey: ATTENDANCE_KEYS.summary(userId ?? ''),
    queryFn: () => getAttendanceSummary(userId!),
    enabled: !!userId,
  })
}

export function useCreateSession() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: createSession,
    onSuccess: () => qc.invalidateQueries({ queryKey: ATTENDANCE_KEYS.sessions() })
  })
}

export function useEndSession() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: endSession,
    onSuccess: (_, id) => {
      qc.invalidateQueries({ queryKey: ATTENDANCE_KEYS.activeSessions() })
      qc.invalidateQueries({ queryKey: ATTENDANCE_KEYS.sessionById(id) })
    }
  })
}

export function useDeleteSession() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: deleteSession,
    onSuccess: () => qc.invalidateQueries({ queryKey: ATTENDANCE_KEYS.sessions() })
  })
}

export function useScanQrCode() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ qrCode, userId }: { qrCode: string; userId: string }) => scanQrCode(qrCode, userId),
    onSuccess: (_, { userId }) => {
      qc.invalidateQueries({ queryKey: ATTENDANCE_KEYS.byUser(userId) })
      qc.invalidateQueries({ queryKey: ATTENDANCE_KEYS.summary(userId) })
      qc.invalidateQueries({ queryKey: ATTENDANCE_KEYS.records() })
    }
  })
}

export function useUpdateAttendanceStatus() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ recordId, status, notes }: { recordId: string; status: 'present' | 'late' | 'absent' | 'excused'; notes?: string }) => 
      updateAttendanceStatus(recordId, status, notes),
    onSuccess: () => qc.invalidateQueries({ queryKey: ATTENDANCE_KEYS.records() })
  })
}

export function useMarkAbsent() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: markAbsentForSession,
    onSuccess: (_, sessionId) => {
      qc.invalidateQueries({ queryKey: ATTENDANCE_KEYS.bySession(sessionId) })
    }
  })
}
