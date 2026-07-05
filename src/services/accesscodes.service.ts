import { supabase } from '@/lib/supabase'

export interface AccessCode {
  id: string
  code: string
  status: 'active' | 'used' | 'expired' | 'revoked'
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

// For the public form
export async function verifyAccessCode(code: string): Promise<{ valid: boolean; message?: string }> {
  // Call an edge function or check directly via Supabase
  // We can do a direct select because RLS allows reading status
  const { data, error } = await supabase
    .from('enrollment_access_codes')
    .select('id, status, expires_at')
    .eq('code', code.toUpperCase())
    .maybeSingle()

  if (error) return { valid: false, message: 'Database error checking code.' }
  if (!data) return { valid: false, message: 'Invalid access code.' }

  if (data.status === 'used') return { valid: false, message: 'This access code has already been used.' }
  if (data.status === 'revoked') return { valid: false, message: 'This access code has been revoked.' }
  if (data.status === 'expired') return { valid: false, message: 'This access code has expired.' }

  if (new Date(data.expires_at) < new Date()) {
    return { valid: false, message: 'This access code has expired.' }
  }

  return { valid: true }
}
