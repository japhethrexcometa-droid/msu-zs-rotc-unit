import { supabase } from '@/lib/supabase'

export interface AccessCode {
  id: string
  code: string
  status: 'active' | 'used' | 'expired' | 'revoked' | 'claimed'
  batch_id: string | null
  created_by: string
  used_by_id_number: string | null
  used_at: string | null
  expires_at: string
  created_at: string
}

export async function getAccessCodes(): Promise<AccessCode[]> {
  const { data, error } = await supabase
    .from('enrollment_access_codes')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) throw error
  return data ?? []
}

export async function generateAccessCodes(count: number): Promise<AccessCode[]> {
  const { data: sessionData } = await supabase.auth.getSession()
  const userId = sessionData.session?.user.id
  if (!userId) throw new Error('Not authenticated')

  // Generate unique codes (6 chars alphanumeric uppercase)
  const generateCode = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
    let result = ''
    for (let i = 0; i < 6; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return result
  }

  // Generate batch ID based on current timestamp
  const batchId = `BATCH-${new Date().getTime().toString().slice(-6)}`

  const codesToInsert = Array.from({ length: count }).map(() => ({
    code: generateCode(),
    batch_id: batchId,
    created_by: userId,
  }))

  const { data, error } = await supabase
    .from('enrollment_access_codes')
    .insert(codesToInsert)
    .select('*')

  if (error) throw error
  return data ?? []
}

export async function revokeAccessCode(id: string): Promise<void> {
  const { error } = await supabase
    .from('enrollment_access_codes')
    .update({ status: 'revoked' })
    .eq('id', id)
    .eq('status', 'active')

  if (error) throw error
}

export async function wipeAccessCodes(): Promise<void> {
  // Use a catch-all condition to bypass the 'missing filter' warning and delete all rows
  const { error } = await supabase
    .from('enrollment_access_codes')
    .delete()
    .neq('code', 'IMPOSSIBLE_CODE_WIPE')

  if (error) throw error
}

function readAccessCodeStatus(row: { status: string; expires_at: string } | null): { valid: boolean; message?: string } {
  if (!row) return { valid: false, message: 'Invalid access code.' }
  if (row.status === 'used') return { valid: false, message: 'This access code has already been used.' }
  if (row.status === 'revoked') return { valid: false, message: 'This access code has been revoked.' }
  if (row.status === 'expired') return { valid: false, message: 'This access code has expired.' }
  if (row.status === 'claimed') return { valid: false, message: 'This code is currently reserved by someone else. Please try again in 15 minutes.' }
  if (new Date(row.expires_at) < new Date()) return { valid: false, message: 'This access code has expired.' }
  return { valid: true }
}

// For the public form
export async function verifyAccessCode(code: string): Promise<{ valid: boolean; message?: string }> {
  const normalizedCode = code.toUpperCase()
  const { data, error } = await supabase.rpc('verify_enrollment_access_code', {
    p_access_code: normalizedCode,
  })

  if (!error) return data ?? { valid: false, message: 'Invalid access code.' }

  // Temporary compatibility path for deployments before the hardening migration is applied.
  const { data: legacyData, error: legacyError } = await supabase
    .from('enrollment_access_codes')
    .select('status, expires_at')
    .eq('code', normalizedCode)
    .maybeSingle()

  if (legacyError) return { valid: false, message: 'Database error checking code.' }
  return readAccessCodeStatus(legacyData)
}
