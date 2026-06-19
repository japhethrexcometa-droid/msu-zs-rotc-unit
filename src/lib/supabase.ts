import { createClient } from '@supabase/supabase-js'
import type { Database } from './database.types'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Check your .env file.')
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
    storageKey: 'rotc-auth-token',
  },
  global: {
    headers: {
      'x-app-version': import.meta.env.VITE_APP_VERSION ?? '2.0.0',
      'x-app-name': 'ROTC-MSU-ZS',
    },
  },
  db: {
    schema: 'public',
  },
})
