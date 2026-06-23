import { createClient } from '@supabase/supabase-js'
import type { Database } from './database.types'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Missing Supabase environment variables. Features may be broken.')
}

// Ensure edge functions don't accidentally get called on 127.0.0.1 in production
if (supabaseUrl && supabaseUrl.includes('127.0.0.1') && typeof window !== 'undefined' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
  console.error("CRITICAL: App is hosted remotely but trying to connect to a local Supabase instance (127.0.0.1). Edge functions will fail.")
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
