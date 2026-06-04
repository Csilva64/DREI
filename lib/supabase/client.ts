import { createClient as _createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''

let _instance: ReturnType<typeof _createClient> | null = null

export function createClient() {
  if (!_instance) {
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      console.error('[supabase] Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY')
      // Return mock to prevent crash — app will show auth error gracefully
      return _createClient('https://placeholder.supabase.co', 'placeholder-key')
    }
    _instance = _createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  }
  return _instance
}
