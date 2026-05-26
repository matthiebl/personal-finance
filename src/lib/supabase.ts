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

export type DbImportSession = {
  id: string
  family_id: string
  created_at: string
  source: 'csv' | 'api'
  filename: string | null
  row_count: number
  column_map: Record<string, string>
  date_format: string
  negate_amount: boolean
}

export type DbImportRule = {
  id: string
  family_id: string
  created_at: string
  priority: number
  match_type: 'contains' | 'exact' | 'starts_with'
  match_value: string
  amount_min: string | null
  amount_max: string | null
  category_id: string
  tags: string
  rename_to: string
}

export type DbImportRow = {
  id: string
  session_id: string
  family_id: string
  row_index: number
  raw_data: Record<string, string>
  description: string
  amount: string
  category_id: string
  tags: string
  month_override: string | null
  parsed_date: string | null
}
