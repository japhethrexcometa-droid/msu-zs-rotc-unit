import { supabase } from '@/lib/supabase'

export async function getEnrollmentOpenStatus(): Promise<boolean> {
  const { data, error } = await supabase
    .from('system_settings')
    .select('value')
    .eq('id', 'enrollment_open')
    .single()

  if (error && error.code !== 'PGRST116') {
    // Ignore PGRST116 (No rows found), as it means the setting isn't initialized yet
    throw error
  }
  
  return data?.value === true || data?.value === 'true'
}

export async function toggleEnrollmentStatus(isOpen: boolean): Promise<void> {
  const { error } = await supabase
    .from('system_settings')
    .upsert({ 
      id: 'enrollment_open', 
      value: isOpen, 
      description: 'Toggle to allow or block new enrollment requests' 
    })

  if (error) throw error
}
