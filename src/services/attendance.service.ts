import { supabase } from '@/lib/supabase'
import type { Database } from '@/lib/database.types'

type Session = Database['public']['Tables']['attendance_sessions']['Row']
type SessionInsert = Database['public']['Tables']['attendance_sessions']['Insert']
type Record_ = Database['public']['Tables']['attendance_records']['Row']

export interface SessionWithStats extends Session {
  total_present: number
  total_late: number
  total_absent: number
  total_excused: number
}

export async function getActiveSessions(): Promise<Session[]> {
  const { data, error } = await supabase
    .from('attendance_sessions')
    .select('*')
    .eq('is_active', true)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data ?? []
}

export async function getAllSessions(limit = 50): Promise<Session[]> {
  const { data, error } = await supabase
    .from('attendance_sessions')
    .select('*')
    .order('session_date', { ascending: false })
    .limit(limit)

  if (error) throw error
  return data ?? []
}

export async function getSessionById(id: string): Promise<Session | null> {
  const { data, error } = await supabase
    .from('attendance_sessions')
    .select('*')
    .eq('id', id)
    .single()

  if (error) throw error
  return data
}

export async function createSession(payload: Omit<SessionInsert, 'qr_code'>): Promise<Session> {
  const qrCode = `ROTC-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`
  const { data, error } = await supabase
    .from('attendance_sessions')
    .insert({ ...payload, qr_code: qrCode })
    .select()
    .single()

  if (error) throw error
  return data
}

export async function endSession(id: string): Promise<void> {
  const { error } = await supabase
    .from('attendance_sessions')
    .update({ is_active: false, ended_at: new Date().toISOString() })
    .eq('id', id)

  if (error) throw error
}

export async function deleteSession(id: string): Promise<void> {
  const { error } = await supabase
    .from('attendance_sessions')
    .delete()
    .eq('id', id)

  if (error) throw error
}

export async function scanQrCode(qrCode: string, userId: string): Promise<{ success: boolean; status: string; message: string }> {
  // 1. Find active session matching this QR
  const { data: session, error: sessionErr } = await supabase
    .from('attendance_sessions')
    .select('id, session_date')
    .eq('qr_code', qrCode)
    .eq('is_active', true)
    .single()

  if (sessionErr || !session) {
    return { success: false, status: 'error', message: 'Invalid or expired QR code.' }
  }

  // 2. Check if already recorded
  const { data: existing } = await supabase
    .from('attendance_records')
    .select('id, status')
    .eq('session_id', session.id)
    .eq('user_id', userId)
    .single()

  if (existing) {
    return { success: false, status: 'duplicate', message: `Already marked as ${existing.status}.` }
  }

  // 3. Determine late threshold (10 min after session creation)
  const now = new Date()
  const sessionStart = new Date(session.session_date)
  const minutesDiff = (now.getTime() - sessionStart.getTime()) / 60000
  const status = minutesDiff <= 10 ? 'present' : 'late'

  // 4. Insert record
  const { error: insertErr } = await supabase
    .from('attendance_records')
    .insert({
      session_id: session.id,
      user_id: userId,
      status,
      scanned_at: now.toISOString()
    })

  if (insertErr) throw insertErr

  return {
    success: true,
    status,
    message: status === 'present' ? 'Attendance recorded! Present.' : 'Attendance recorded! Marked as Late.'
  }
}

export async function getAttendanceBySession(sessionId: string): Promise<Record_[]> {
  const { data, error } = await supabase
    .from('attendance_records')
    .select('*, users:user_id(id_number, full_name, platoon, photo_url)')
    .eq('session_id', sessionId)
    .order('scanned_at', { ascending: true })

  if (error) throw error
  return data ?? []
}

export async function getAttendanceByUser(userId: string, startDate?: string, endDate?: string): Promise<Record_[]> {
  let query = supabase
    .from('attendance_records')
    .select('*, session:session_id(session_date, title, location)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (startDate) query = query.gte('created_at', startDate)
  if (endDate) query = query.lte('created_at', endDate)

  const { data, error } = await query
  if (error) throw error
  return data ?? []
}

export async function updateAttendanceStatus(
  recordId: string,
  status: 'present' | 'late' | 'absent' | 'excused',
  notes?: string
): Promise<void> {
  const { error } = await supabase
    .from('attendance_records')
    .update({ status, notes: notes ?? null })
    .eq('id', recordId)

  if (error) throw error
}

export async function markAbsentForSession(sessionId: string): Promise<void> {
  // Call RPC that marks all enrolled cadets not yet in attendance_records as absent
  const { error } = await supabase.rpc('mark_absent_for_session' as any, {
    p_session_id: sessionId
  })
  if (error) throw error
}

export async function getAttendanceSummary(userId: string) {
  const { data, error } = await supabase.rpc('get_attendance_summary', {
    p_user_id: userId
  })
  if (error) throw error
  return data?.[0] ?? null
}
