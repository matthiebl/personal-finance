import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export type DbFamily = {
  id: string
  name: string
  owner_id: string
  invite_code: string
  created_at: string
}

export type DbUserProfile = {
  id: string
  display_name: string | null
  family_id: string | null
  created_at: string
}
